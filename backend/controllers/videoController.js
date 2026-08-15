const Video = require('../models/Video');
const fs = require('fs');
const path = require('path');

const TRENDING_MIN_VIEWS = 300000;

// GET /api/videos
exports.getVideos = async (req, res) => {
  try {
    const { category, search, sort } = req.query;
    const query = {};

    if (category && category !== 'Tất cả') {
      if (category === 'Thịnh hành 🔥') query.views = { $gte: TRENDING_MIN_VIEWS };
      else query.category = category;
    }

    if (search) {
      const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { tags: searchRegex },
        { 'channel.name': searchRegex }
      ];
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'views') sortOption = { views: -1 };
    if (sort === 'likes') sortOption = { likes: -1 };

    const videos = await Video.find(query).sort(sortOption);
    res.json({ success: true, count: videos.length, data: videos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/videos/hero
exports.getHeroVideo = async (req, res) => {
  try {
    const hero = await Video.findOne({ isHeroSpotlight: true }).sort({ updatedAt: -1 })
      || await Video.findOne().sort({ views: -1 });
    res.json({ success: true, data: hero });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/videos/:id — detail + one view
exports.getVideoById = async (req, res) => {
  try {
    const video = await Video.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true, runValidators: true }
    );
    if (!video) return res.status(404).json({ success: false, message: 'Không tìm thấy video' });
    res.json({ success: true, data: video });
  } catch (error) {
    res.status(400).json({ success: false, message: 'ID video không hợp lệ' });
  }
};

// POST /api/videos — JSON URL payload or multipart upload
exports.createVideo = async (req, res) => {
  try {
    const hostUrl = `${req.protocol}://${req.get('host')}`;
    let videoUrl = req.body.videoUrl;
    let thumbnail = req.body.thumbnail;

    if (req.files) {
      if (req.files.video?.[0]) videoUrl = `${hostUrl}/uploads/videos/${req.files.video[0].filename}`;
      if (req.files.thumbnail?.[0]) thumbnail = `${hostUrl}/uploads/thumbnails/${req.files.thumbnail[0].filename}`;
    }

    if (!req.body.title?.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tiêu đề video' });
    }
    if (!videoUrl) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp videoUrl hoặc file video' });
    }

    const tagsArray = req.body.tags
      ? (typeof req.body.tags === 'string' ? req.body.tags.split(',') : req.body.tags).map(t => String(t).trim()).filter(Boolean)
      : [];

    const makeHero = req.body.isHeroSpotlight === 'true' || req.body.isHeroSpotlight === true;
    if (makeHero) await Video.updateMany({}, { $set: { isHeroSpotlight: false } });

    const newVideo = await Video.create({
      title: req.body.title.trim(),
      description: req.body.description || '',
      videoUrl,
      thumbnail: thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=85',
      durationFormatted: req.body.durationFormatted || '05:30',
      category: req.body.category || 'Lập trình',
      quality: req.body.quality || '4K 60fps',
      tags: tagsArray,
      isHeroSpotlight: makeHero,
      channel: {
        name: req.body.channelName || req.body.channel?.name || 'Kênh Của Tôi (Pro)',
        avatar: req.body.channelAvatar || req.body.channel?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        subscribers: req.body.channelSubscribers || req.body.channel?.subscribers || '1.5K người theo dõi',
        verified: req.body.channelVerified === 'true' || req.body.channelVerified === true || req.body.channel?.verified === true
      }
    });

    res.status(201).json({ success: true, data: newVideo });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// PUT /api/videos/:id
exports.updateVideo = async (req, res) => {
  try {
    const update = { ...req.body };
    if (typeof update.tags === 'string') update.tags = update.tags.split(',').map(t => t.trim()).filter(Boolean);

    if (update.isHeroSpotlight === true || update.isHeroSpotlight === 'true') {
      await Video.updateMany({ _id: { $ne: req.params.id } }, { $set: { isHeroSpotlight: false } });
      update.isHeroSpotlight = true;
    }

    const video = await Video.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!video) return res.status(404).json({ success: false, message: 'Không tìm thấy video' });
    res.json({ success: true, data: video });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE /api/videos/:id
exports.deleteVideo = async (req, res) => {
  try {
    const video = await Video.findByIdAndDelete(req.params.id);
    if (!video) return res.status(404).json({ success: false, message: 'Không tìm thấy video' });

    // Delete local uploaded assets when the video belongs to this server.
    for (const url of [video.videoUrl, video.thumbnail]) {
      if (!url || !url.includes('/uploads/')) continue;
      const relative = url.split('/uploads/')[1];
      const filePath = path.join(__dirname, '..', 'uploads', relative);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    res.json({ success: true, message: 'Đã xóa video thành công' });
  } catch (error) {
    res.status(400).json({ success: false, message: 'ID video không hợp lệ' });
  }
};

// POST /api/videos/:id/like
exports.likeVideo = async (req, res) => {
  try {
    const action = req.body.action;
    if (!['like', 'unlike'].includes(action)) {
      return res.status(400).json({ success: false, message: 'action phải là like hoặc unlike' });
    }

    const inc = action === 'unlike' ? -1 : 1;
    const video = await Video.findByIdAndUpdate(
      req.params.id,
      { $inc: { likes: inc } },
      { new: true, runValidators: true }
    );
    if (!video) return res.status(404).json({ success: false, message: 'Không tìm thấy video' });

    if (video.likes < 0) {
      video.likes = 0;
      await video.save();
    }
    res.json({ success: true, likes: video.likes });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Không thể cập nhật lượt thích' });
  }
};

// POST /api/videos/:id/comments
exports.addComment = async (req, res) => {
  try {
    const { content, user, avatar } = req.body;
    if (!content?.trim()) return res.status(400).json({ success: false, message: 'Nội dung bình luận là bắt buộc' });

    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ success: false, message: 'Không tìm thấy video' });

    video.comments.unshift({
      user: user || 'Bạn (Viewer)',
      avatar: avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      content: content.trim(),
      likes: 0
    });
    await video.save();
    res.status(201).json({ success: true, data: video.comments });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// GET /api/videos/categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Video.distinct('category');
    res.json({ success: true, data: ['Tất cả', 'Thịnh hành 🔥', ...categories] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
