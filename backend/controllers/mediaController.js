const fs = require('fs');
const path = require('path');
const Video = require('../models/Video');
const HeroBanner = require('../models/HeroBanner');
const { isCloudStorageConfigured, listObjects, deleteFile, extractKeyFromPublicUrl } = require('../utils/cloudStorage');

// "Thư viện ảnh" (Media Library) — trang Admin: xem lại toàn bộ ảnh đã tải
// lên/quét màn hình, biết ảnh nào đang được dùng (bởi video hoặc slide Hero
// Banner nào) trước khi xoá. Trước đây xoá video sẽ tự xoá luôn file
// thumbnail — dễ làm vỡ ảnh nếu ảnh đó đang được 1 Hero Banner khác tham
// chiếu; giờ ảnh sống độc lập, chỉ xoá thủ công ở đây, có kiểm tra an toàn
// trước khi cho xoá.
//
// Ảnh giờ có thể nằm ở 1 trong 2 nơi tuỳ vào việc đã cấu hình dịch vụ lưu trữ
// ngoài hay chưa (xem backend/utils/cloudStorage.js): trên Cloudinary/
// Backblaze B2/Cloudflare R2 (ưu tiên, vĩnh viễn) hoặc trên ổ đĩa cục bộ
// backend/uploads/thumbnails (tạm thời, mất khi deploy lại). Trường
// "filename" trả về cho frontend LUÔN là 1 "key nội bộ" opaque — với lưu trữ
// cloud có thể không phải tên file thật (vd Cloudinary dùng public_id) —
// frontend chỉ dùng nó để tra cứu/gửi lại khi xoá, không hiển thị trực tiếp.
// Việc dò "ảnh này có đang được dùng không" và "xoá đúng file nào" đều dùng
// CHUNG 1 hàm suy khoá (localKeyFromUrl / extractKeyFromPublicUrl) để đảm bảo
// nhất quán giữa 2 thao tác.
const THUMBNAILS_DIR = path.join(__dirname, '..', 'uploads', 'thumbnails');
const IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif|avif|bmp)$/i;

// Suy "key" từ 1 URL ảnh cục bộ kiểu cũ (.../uploads/thumbnails/<filename>
// hoặc .../thumbnails/<filename>) — dùng khi CHƯA cấu hình lưu trữ ngoài.
function localKeyFromUrl(url) {
  if (!url) return null;
  const idx = url.lastIndexOf('/thumbnails/');
  if (idx === -1) return null;
  const name = url.slice(idx + '/thumbnails/'.length);
  return name || null;
}

function keyFromUrl(url, usingCloud) {
  return usingCloud ? extractKeyFromPublicUrl(url) : localKeyFromUrl(url);
}

// GET /api/media — chỉ Admin.
exports.getMediaLibrary = async (req, res) => {
  try {
    const hostUrl = `${req.protocol}://${req.get('host')}`;
    const usingCloud = isCloudStorageConfigured();
    let entries;

    if (usingCloud) {
      const objects = await listObjects('thumbnails/');
      entries = objects.map(obj => ({
        filename: obj.key,
        url: obj.url,
        size: obj.size,
        createdAt: obj.lastModified
      }));
    } else {
      if (!fs.existsSync(THUMBNAILS_DIR)) {
        return res.json({ success: true, count: 0, data: [] });
      }
      entries = fs.readdirSync(THUMBNAILS_DIR)
        .filter(f => IMAGE_EXT_RE.test(f))
        .map(filename => {
          const filePath = path.join(THUMBNAILS_DIR, filename);
          const stat = fs.statSync(filePath);
          return {
            filename,
            url: `${hostUrl}/uploads/thumbnails/${filename}`,
            size: stat.size,
            createdAt: stat.birthtime || stat.ctime
          };
        });
    }

    // Lấy toàn bộ URL ảnh đang được dùng bởi Video (thumbnail/previewGif) và
    // HeroBanner (image) trong 1 lần query, dùng Map để tra cứu nhanh thay vì
    // query lặp lại cho từng file.
    const [videosUsingThumb, videosUsingGif, banners] = await Promise.all([
      Video.find({ thumbnail: { $ne: '' } }).select('title thumbnail'),
      Video.find({ previewGif: { $ne: '' } }).select('title previewGif'),
      HeroBanner.find({ image: { $ne: '' } }).select('image')
    ]);

    const usageByKey = new Map();
    const addUsage = (url, label) => {
      const key = keyFromUrl(url, usingCloud);
      if (!key) return;
      if (!usageByKey.has(key)) usageByKey.set(key, []);
      usageByKey.get(key).push(label);
    };
    videosUsingThumb.forEach(v => addUsage(v.thumbnail, `Ảnh bìa video: ${v.title}`));
    videosUsingGif.forEach(v => addUsage(v.previewGif, `Ảnh xem trước (GIF) video: ${v.title}`));
    banners.forEach(b => addUsage(b.image, 'Ảnh trong Hero Banner'));

    const data = entries.map(entry => {
      const usedBy = usageByKey.get(entry.filename) || [];
      return { ...entry, inUse: usedBy.length > 0, usedBy };
    });

    data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, count: data.length, data, storage: usingCloud ? 'cloud' : 'local' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/media/:filename — chỉ Admin. Từ chối xoá nếu ảnh đang được
// video hoặc Hero Banner nào tham chiếu, để tránh làm vỡ ảnh đang hiển thị.
// ":filename" thực chất là "key" trả về từ getMediaLibrary — với lưu trữ cục
// bộ đó là tên file thật, với lưu trữ cloud có thể là 1 chuỗi mã hoá khác;
// route này không cần biết sự khác biệt đó, chỉ cần đối xử nó như 1 khoá.
exports.deleteMediaFile = async (req, res) => {
  try {
    const usingCloud = isCloudStorageConfigured();
    const rawKey = req.params.filename || '';

    let storageKey;
    let localFilePath = null;

    if (usingCloud) {
      storageKey = rawKey;
      if (!storageKey) {
        return res.status(400).json({ success: false, message: 'Thiếu thông tin ảnh cần xoá.' });
      }
    } else {
      // path.basename chặn path traversal (vd "../../server.js") — chỉ cho
      // phép xoá đúng 1 file nằm thẳng trong uploads/thumbnails.
      const filename = path.basename(rawKey);
      if (!filename || !IMAGE_EXT_RE.test(filename)) {
        return res.status(400).json({ success: false, message: 'Tên file không hợp lệ.' });
      }
      localFilePath = path.join(THUMBNAILS_DIR, filename);
      if (!fs.existsSync(localFilePath)) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy file ảnh này.' });
      }
      storageKey = filename;
    }

    const [videos, banners] = await Promise.all([
      Video.find({ $or: [{ thumbnail: { $ne: '' } }, { previewGif: { $ne: '' } }] }).select('title thumbnail previewGif'),
      HeroBanner.find({ image: { $ne: '' } }).select('image')
    ]);

    const videoUsing = videos.find(v => keyFromUrl(v.thumbnail, usingCloud) === storageKey || keyFromUrl(v.previewGif, usingCloud) === storageKey);
    const bannerUsing = !videoUsing && banners.find(b => keyFromUrl(b.image, usingCloud) === storageKey);

    if (videoUsing || bannerUsing) {
      return res.status(400).json({
        success: false,
        message: videoUsing
          ? `Ảnh này đang được dùng cho video "${videoUsing.title}" — hãy đổi ảnh bìa video đó trước khi xoá.`
          : 'Ảnh này đang được dùng trong 1 slide Hero Banner — hãy xoá hoặc đổi ảnh slide đó trước.'
      });
    }

    if (usingCloud) {
      await deleteFile(storageKey);
    } else {
      fs.unlinkSync(localFilePath);
    }
    res.json({ success: true, message: 'Đã xoá ảnh.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
