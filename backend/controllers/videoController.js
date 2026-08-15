const Video = require('../models/Video');
const fs = require('fs');
const path = require('path');

// @desc    Lấy danh sách tất cả video (có hỗ trợ lọc danh mục & tìm kiếm)
// @route   GET /api/videos
exports.getVideos = async (req, res) => {
  try {
    const { category, search, sort } = req.query;
    let query = {};

    if (category && category !== 'Tất cả') {
      if (category === 'Thịnh hành 🔥') {
        query.views = { $gte: 100000 };
      } else {
        query.category = category;
      }
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
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
    res.status(200).json({ success: true, count: videos.length, data: videos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Lấy video nổi bật (Hero Spotlight)
// @route   GET /api/videos/hero
exports.getHeroVideo = async (req, res) => {
  try {
    let hero = await Video.findOne({ isHeroSpotlight: true });
    if (!hero) {
      hero = await Video.findOne().sort({ views: -1 });
    }
    res.status(200).json({ success: true, data: hero });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Lấy chi tiết 1 video theo ID & tự động tăng lượt xem (View Counter)
// @route   GET /api/videos/:id
exports.getVideoById = async (req, res) => {
  try {
    const video = await Video.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!video) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy video' });
    }

    res.status(200).json({ success: true, data: video });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Tạo mới / Upload Video
// @route   POST /api/videos
exports.createVideo = async (req, res) => {
  try {
    const hostUrl = `${req.protocol}://${req.get('host')}`;
    let videoUrl = req.body.videoUrl;
    let thumbnail = req.body.thumbnail;

    // Nếu người dùng upload file từ máy tính
    if (req.files) {
      if (req.files.video && req.files.video[0]) {
        videoUrl = `${hostUrl}/uploads/videos/${req.files.video[0].filename}`;
      }
      if (req.files.thumbnail && req.files.thumbnail[0]) {
        thumbnail = `${hostUrl}/uploads/thumbnails/${req.files.thumbnail[0].filename}`;
      }
    }

    if (!videoUrl) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp file video hoặc đường link videoUrl' });
    }

    const tagsArray = req.body.tags
      ? typeof req.body.tags === 'string'
        ? req.body.tags.split(',').map(t => t.trim())
        : req.body.tags
      : [];

    const newVideo = await Video.create({
      title: req.body.title,
      description: req.body.description || '',
      videoUrl: videoUrl,
      thumbnail: thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=85',
      durationFormatted: req.body.durationFormatted || '05:30',
      category: req.body.category || 'Lập trình',
      quality: req.body.quality || '4K 60fps',
      tags: tagsArray,
      isHeroSpotlight: req.body.isHeroSpotlight === 'true' || req.body.isHeroSpotlight === true,
      channel: {
        name: req.body.channelName || 'Kênh Của Tôi (Pro)',
        avatar: req.body.channelAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        subscribers: req.body.channelSubscribers || '1.5K người theo dõi',
        verified: req.body.channelVerified === 'true' || req.body.channelVerified === true
      }
    });

    res.status(201).json({ success: true, data: newVideo });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Cập nhật thông tin video (Sửa tiêu đề, mô tả, danh mục...)
// @route   PUT /api/videos/:id
exports.updateVideo = async (req, res) => {
  try {
    if (req.body.tags && typeof req.body.tags === 'string') {
      req.body.tags = req.body.tags.split(',').map(t => t.trim());
    }

    const video = await Video.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!video) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy video' });
    }

    res.status(200).json({ success: true, data: video });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Xóa 1 video
// @route   DELETE /api/videos/:id
exports.deleteVideo = async (req, res) => {
  try {
    const video = await Video.findByIdAndDelete(req.params.id);
    if (!video) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy video' });
    }
    res.status(200).json({ success: true, message: 'Đã xóa video thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Thích (Like) hoặc Bỏ thích video
// @route   POST /api/videos/:id/like
exports.likeVideo = async (req, res) => {
  try {
    const { action } = req.body; // 'like', 'unlike', 'dislike'
    const inc = action === 'unlike' ? -1 : 1;

    const video = await Video.findByIdAndUpdate(
      req.params.id,
      { $inc: { likes: inc } },
      { new: true }
    );

    res.status(200).json({ success: true, likes: video.likes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Thêm bình luận mới vào video
// @route   POST /api/videos/:id/comments
exports.addComment = async (req, res) => {
  try {
    const { content, user, avatar } = req.body;
    if (!content) {
      return res.status(400).json({ success: false, message: 'Nội dung bình luận là bắt buộc' });
    }

    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy video' });
    }

    const newComment = {
      user: user || 'Bạn (Viewer)',
      avatar: avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      content: content,
      likes: 0
    };

    video.comments.unshift(newComment);
    await video.save();

    res.status(201).json({ success: true, data: video.comments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Lấy danh sách các danh mục hiện có
// @route   GET /api/categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Video.distinct('category');
    res.status(200).json({ success: true, data: ['Tất cả', 'Thịnh hành 🔥', ...categories] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
