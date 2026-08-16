const fs = require('fs');
const path = require('path');
const Video = require('../models/Video');
const HeroBanner = require('../models/HeroBanner');

// "Thư viện ảnh" (Media Library) — trang Admin: xem lại toàn bộ ảnh đã tải
// lên/quét màn hình đang nằm trong uploads/thumbnails, biết ảnh nào đang
// được dùng (bởi video hoặc slide Hero Banner nào) trước khi xoá. Trước đây
// xoá video sẽ tự xoá luôn file thumbnail — dễ làm vỡ ảnh nếu ảnh đó đang
// được 1 Hero Banner khác tham chiếu; giờ ảnh sống độc lập, chỉ xoá thủ công
// ở đây, có kiểm tra an toàn trước khi cho xoá.
const THUMBNAILS_DIR = path.join(__dirname, '..', 'uploads', 'thumbnails');
const IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif|avif|bmp)$/i;

// GET /api/media — chỉ Admin.
exports.getMediaLibrary = async (req, res) => {
  try {
    if (!fs.existsSync(THUMBNAILS_DIR)) {
      return res.json({ success: true, count: 0, data: [] });
    }

    const hostUrl = `${req.protocol}://${req.get('host')}`;
    const filenames = fs.readdirSync(THUMBNAILS_DIR).filter(f => IMAGE_EXT_RE.test(f));

    // Lấy toàn bộ URL ảnh đang được dùng bởi Video (thumbnail/previewGif) và
    // HeroBanner (image) trong 1 lần query, dùng Set để tra cứu nhanh thay vì
    // query lặp lại cho từng file.
    const [videosUsingThumb, videosUsingGif, banners] = await Promise.all([
      Video.find({ thumbnail: { $regex: '/uploads/thumbnails/' } }).select('title thumbnail'),
      Video.find({ previewGif: { $regex: '/uploads/thumbnails/' } }).select('title previewGif'),
      HeroBanner.find({ image: { $regex: '/uploads/thumbnails/' } }).select('image')
    ]);

    const usageByFilename = new Map();
    const addUsage = (url, label) => {
      if (!url) return;
      const name = url.split('/uploads/thumbnails/')[1];
      if (!name) return;
      if (!usageByFilename.has(name)) usageByFilename.set(name, []);
      usageByFilename.get(name).push(label);
    };
    videosUsingThumb.forEach(v => addUsage(v.thumbnail, `Ảnh bìa video: ${v.title}`));
    videosUsingGif.forEach(v => addUsage(v.previewGif, `Ảnh xem trước (GIF) video: ${v.title}`));
    banners.forEach(b => addUsage(b.image, 'Ảnh trong Hero Banner'));

    const data = filenames.map(filename => {
      const filePath = path.join(THUMBNAILS_DIR, filename);
      const stat = fs.statSync(filePath);
      const usedBy = usageByFilename.get(filename) || [];
      return {
        filename,
        url: `${hostUrl}/uploads/thumbnails/${filename}`,
        size: stat.size,
        createdAt: stat.birthtime || stat.ctime,
        inUse: usedBy.length > 0,
        usedBy
      };
    });

    data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/media/:filename — chỉ Admin. Từ chối xoá nếu ảnh đang được
// video hoặc Hero Banner nào tham chiếu, để tránh làm vỡ ảnh đang hiển thị.
exports.deleteMediaFile = async (req, res) => {
  try {
    // path.basename chặn path traversal (vd "../../server.js") — chỉ cho
    // phép xoá đúng 1 file nằm thẳng trong uploads/thumbnails.
    const filename = path.basename(req.params.filename || '');
    if (!filename || !IMAGE_EXT_RE.test(filename)) {
      return res.status(400).json({ success: false, message: 'Tên file không hợp lệ.' });
    }

    const filePath = path.join(THUMBNAILS_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy file ảnh này.' });
    }

    const urlSuffix = `/uploads/thumbnails/${filename}`;
    const [videoUsing, bannerUsing] = await Promise.all([
      Video.findOne({ $or: [{ thumbnail: { $regex: urlSuffix } }, { previewGif: { $regex: urlSuffix } }] }).select('title'),
      HeroBanner.findOne({ image: { $regex: urlSuffix } })
    ]);

    if (videoUsing || bannerUsing) {
      return res.status(400).json({
        success: false,
        message: videoUsing
          ? `Ảnh này đang được dùng cho video "${videoUsing.title}" — hãy đổi ảnh bìa video đó trước khi xoá.`
          : 'Ảnh này đang được dùng trong 1 slide Hero Banner — hãy xoá hoặc đổi ảnh slide đó trước.'
      });
    }

    fs.unlinkSync(filePath);
    res.json({ success: true, message: 'Đã xoá ảnh.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
