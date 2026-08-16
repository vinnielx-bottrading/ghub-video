const fs = require('fs');
const path = require('path');
const GalleryPhoto = require('../models/GalleryPhoto');
const { isCloudStorageConfigured, providerLabel, uploadLocalFile, deleteFile, extractKeyFromPublicUrl } = require('../utils/cloudStorage');

const MAX_BULK_ITEMS = 40;

// Với 1 file ảnh vừa được lưu tạm cục bộ bởi multer (field "images"), trả về
// URL công khai để lưu vào MongoDB — ưu tiên đẩy lên dịch vụ lưu trữ ngoài
// (Cloudinary/B2/R2) nếu đã cấu hình, nếu chưa hoặc lỗi thì rơi về URL cục bộ
// như cũ. Xem giải thích đầy đủ trong videoController.js#resolveMediaUrl.
async function resolveGalleryImageUrl(filename, hostUrl) {
  if (isCloudStorageConfigured()) {
    const localPath = path.join(__dirname, '..', 'uploads', 'gallery', filename);
    const cloudUrl = await uploadLocalFile(localPath, `gallery/${filename}`);
    if (cloudUrl) return cloudUrl;
    console.warn(`⚠️  Không đẩy được ảnh gallery "${filename}" lên ${providerLabel()} — tạm dùng URL cục bộ (có thể mất khi deploy lại).`);
  }
  return `${hostUrl}/uploads/gallery/${filename}`;
}

// GET /api/gallery/topics — công khai. Trả về danh sách chủ đề (suy ra trực
// tiếp từ dữ liệu ảnh, không phải bảng riêng) kèm số lượng ảnh + 1 ảnh đại
// diện (ảnh mới nhất) cho mỗi chủ đề, dùng để hiện nút chủ đề trên trang
// Bộ sưu tập ảnh.
exports.getTopics = async (req, res) => {
  try {
    const topics = await GalleryPhoto.aggregate([
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$topic', count: { $sum: 1 }, coverImage: { $first: '$imageUrl' } } },
      { $project: { _id: 0, topic: '$_id', count: 1, coverImage: 1 } },
      { $sort: { topic: 1 } }
    ]);
    res.json({ success: true, count: topics.length, data: topics });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/gallery/photos — công khai. Query params:
//  - topic: lọc theo 1 chủ đề (bỏ trống = tất cả)
//  - random=true: xáo trộn ngẫu nhiên (dùng cho khung "Thư viện ngẫu nhiên")
//  - limit: số ảnh tối đa trả về (mặc định 60, tối đa 200)
exports.getPhotos = async (req, res) => {
  try {
    const { topic, random } = req.query;
    const effectiveLimit = Math.min(parseInt(req.query.limit, 10) || 60, 200);

    if (random === 'true' || random === '1') {
      const pipeline = [];
      if (topic) pipeline.push({ $match: { topic } });
      pipeline.push({ $sample: { size: effectiveLimit } });
      const photos = await GalleryPhoto.aggregate(pipeline);
      return res.json({ success: true, count: photos.length, data: photos });
    }

    const query = {};
    if (topic) query.topic = topic;
    const photos = await GalleryPhoto.find(query).sort({ order: 1, createdAt: -1 }).limit(effectiveLimit);
    res.json({ success: true, count: photos.length, data: photos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/gallery/photos/bulk — chỉ Admin. Nhận 1 chủ đề dùng chung, cùng
// lúc cả 2 nguồn ảnh (có thể kết hợp cả 2 trong 1 lần gửi):
//  1) Tải file ảnh lên hàng loạt (multipart, field "images", tối đa 40 ảnh)
//  2) Dán nhiều link ảnh vào field "links", mỗi dòng 1 link
exports.bulkCreatePhotos = async (req, res) => {
  try {
    const topic = (req.body.topic || '').trim();
    if (!topic) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên chủ đề.' });
    }

    const files = req.files || [];
    const rawLinks = req.body.links || '';
    const links = rawLinks.split('\n').map(l => l.trim()).filter(Boolean);

    if (files.length === 0 && links.length === 0) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn ít nhất 1 ảnh để tải lên hoặc dán ít nhất 1 link ảnh.' });
    }
    if (files.length + links.length > MAX_BULK_ITEMS) {
      return res.status(400).json({
        success: false,
        message: `Chỉ hỗ trợ tối đa ${MAX_BULK_ITEMS} ảnh mỗi lần (đang có ${files.length} file + ${links.length} link). Vui lòng chia nhỏ ra.`
      });
    }

    const hostUrl = `${req.protocol}://${req.get('host')}`;
    const created = [];
    const failedItems = [];

    for (const file of files) {
      try {
        const imageUrl = await resolveGalleryImageUrl(file.filename, hostUrl);
        created.push(await GalleryPhoto.create({ topic, imageUrl }));
      } catch (error) {
        failedItems.push({ source: file.originalname, message: error.message || 'Lỗi không xác định' });
      }
    }

    for (const link of links) {
      try {
        created.push(await GalleryPhoto.create({ topic, imageUrl: link }));
      } catch (error) {
        failedItems.push({ source: link.slice(0, 160), message: error.message || 'Lỗi không xác định' });
      }
    }

    res.status(created.length ? 201 : 400).json({
      success: created.length > 0,
      summary: { total: files.length + links.length, succeeded: created.length, failed: failedItems.length },
      data: created,
      failedItems
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/gallery/photos/:id — chỉ Admin.
exports.deletePhoto = async (req, res) => {
  try {
    const photo = await GalleryPhoto.findByIdAndDelete(req.params.id);
    if (!photo) return res.status(404).json({ success: false, message: 'Không tìm thấy ảnh.' });

    if (photo.imageUrl) {
      const cloudKey = extractKeyFromPublicUrl(photo.imageUrl);
      if (cloudKey) {
        await deleteFile(cloudKey);
      } else if (photo.imageUrl.includes('/uploads/')) {
        const relative = photo.imageUrl.split('/uploads/')[1];
        const filePath = path.join(__dirname, '..', 'uploads', relative);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    }

    res.json({ success: true, message: 'Đã xoá ảnh.' });
  } catch (error) {
    res.status(400).json({ success: false, message: 'ID ảnh không hợp lệ' });
  }
};

// DELETE /api/gallery/topics/:topic — chỉ Admin. Xoá nguyên 1 chủ đề (toàn
// bộ ảnh thuộc chủ đề đó) — tiện dọn dẹp thay vì phải xoá từng ảnh 1.
exports.deleteTopic = async (req, res) => {
  try {
    const topic = (req.params.topic || '').trim();
    if (!topic) {
      return res.status(400).json({ success: false, message: 'Thiếu tên chủ đề.' });
    }

    const photos = await GalleryPhoto.find({ topic });
    if (photos.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy chủ đề này.' });
    }

    await Promise.all(photos.map(async (photo) => {
      const cloudKey = extractKeyFromPublicUrl(photo.imageUrl);
      if (cloudKey) {
        await deleteFile(cloudKey);
      } else if (photo.imageUrl && photo.imageUrl.includes('/uploads/')) {
        const relative = photo.imageUrl.split('/uploads/')[1];
        const filePath = path.join(__dirname, '..', 'uploads', relative);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    }));

    await GalleryPhoto.deleteMany({ topic });
    res.json({ success: true, message: `Đã xoá chủ đề "${topic}" và ${photos.length} ảnh.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
