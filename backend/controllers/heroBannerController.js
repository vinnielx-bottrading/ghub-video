const HeroBanner = require('../models/HeroBanner');
const Video = require('../models/Video');

const MAX_HERO_BANNERS = 10;

// GET /api/hero-banners — công khai, trang chủ dùng để dựng slideshow.
// Populate đầy đủ video được gắn (nếu có) để bấm vào banner mở được video
// luôn, không cần gọi thêm request nào khác.
exports.getHeroBanners = async (req, res) => {
  try {
    const banners = await HeroBanner.find().sort({ order: 1, createdAt: 1 }).populate('video');
    res.json({ success: true, count: banners.length, data: banners });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/hero-banners — chỉ Admin. Nhận 1 trong 3 nguồn ảnh:
//  1) Tải file ảnh lên (multipart, req.file / field "image")
//  2) req.body.imageUrl — dán sẵn 1 link ảnh
//  3) req.body.videoId — lấy thumbnail hiện có của 1 video làm ảnh banner,
//     đồng thời gắn video đó vào slide (bấm vào banner sẽ mở video này).
exports.createHeroBanner = async (req, res) => {
  try {
    const currentCount = await HeroBanner.countDocuments();
    if (currentCount >= MAX_HERO_BANNERS) {
      return res.status(400).json({
        success: false,
        message: `Đã đạt tối đa ${MAX_HERO_BANNERS} slide Hero Banner. Vui lòng xóa bớt slide cũ trước khi thêm mới.`
      });
    }

    let image = '';
    let videoRef = null;

    if (req.file) {
      const hostUrl = `${req.protocol}://${req.get('host')}`;
      image = `${hostUrl}/uploads/thumbnails/${req.file.filename}`;
    } else if (req.body.videoId) {
      const video = await Video.findById(req.body.videoId);
      if (!video) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy video đã chọn.' });
      }
      if (!video.thumbnail) {
        return res.status(400).json({
          success: false,
          message: 'Video này chưa có ảnh bìa nên không thể dùng làm Hero Banner. Hãy thêm ảnh bìa cho video đó trước (tải lên hoặc quét màn hình).'
        });
      }
      image = video.thumbnail;
      videoRef = video._id;
    } else if (req.body.imageUrl?.trim()) {
      image = req.body.imageUrl.trim();
    } else {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp ảnh banner: dán link ảnh, tải ảnh lên, hoặc chọn 1 video có sẵn.'
      });
    }

    const order = Number.isFinite(Number(req.body.order)) ? Number(req.body.order) : currentCount;

    const banner = await HeroBanner.create({ image, video: videoRef, order });
    const populated = await banner.populate('video');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// PUT /api/hero-banners/:id — chỉ Admin. Chủ yếu dùng để đổi thứ tự (order),
// nhưng cũng cho phép đổi ảnh/video gắn kèm nếu cần chỉnh lại 1 slide có sẵn.
exports.updateHeroBanner = async (req, res) => {
  try {
    const update = {};
    if (req.body.order !== undefined) {
      update.order = Number.isFinite(Number(req.body.order)) ? Number(req.body.order) : 0;
    }
    if (req.file) {
      const hostUrl = `${req.protocol}://${req.get('host')}`;
      update.image = `${hostUrl}/uploads/thumbnails/${req.file.filename}`;
    } else if (req.body.imageUrl?.trim()) {
      update.image = req.body.imageUrl.trim();
    }
    if (req.body.videoId) {
      const video = await Video.findById(req.body.videoId);
      if (!video) return res.status(404).json({ success: false, message: 'Không tìm thấy video đã chọn.' });
      if (!update.image && !video.thumbnail) {
        return res.status(400).json({
          success: false,
          message: 'Video này chưa có ảnh bìa nên không thể dùng làm Hero Banner. Hãy thêm ảnh bìa cho video đó trước.'
        });
      }
      update.video = video._id;
      if (!update.image) update.image = video.thumbnail;
    } else if (req.body.clearVideo === 'true' || req.body.clearVideo === true) {
      update.video = null;
    }

    const banner = await HeroBanner.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }).populate('video');
    if (!banner) return res.status(404).json({ success: false, message: 'Không tìm thấy slide Hero Banner' });
    res.json({ success: true, data: banner });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE /api/hero-banners/:id — chỉ Admin.
exports.deleteHeroBanner = async (req, res) => {
  try {
    const banner = await HeroBanner.findByIdAndDelete(req.params.id);
    if (!banner) return res.status(404).json({ success: false, message: 'Không tìm thấy slide Hero Banner' });
    res.json({ success: true, message: 'Đã xóa slide Hero Banner' });
  } catch (error) {
    res.status(400).json({ success: false, message: 'ID slide không hợp lệ' });
  }
};
