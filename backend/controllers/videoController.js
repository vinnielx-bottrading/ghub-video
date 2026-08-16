const Video = require('../models/Video');
const fs = require('fs');
const path = require('path');
const { resolveVideoSource, detectSourceType, fetchTitleForResolved } = require('../utils/videoSource');
const { extractThumbnailFromVideo, extractPreviewGif } = require('../utils/thumbnailExtractor');
const { generatePlaceholderThumbnail } = require('../utils/placeholderThumbnail');

const THUMBNAILS_DIR = path.join(__dirname, '..', 'uploads', 'thumbnails');
const DEFAULT_THUMBNAIL = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=85';
const MAX_BULK_ITEMS = 50;
const BULK_CONCURRENCY = 4;

// POST /api/videos/detect-source — admin dán link/mã nhúng, trả về preview
// (platform, embedUrl, thumbnail tự suy nếu có) TRƯỚC khi tạo video thật.
exports.detectVideoSource = async (req, res) => {
  try {
    const input = req.body.input;
    if (!input || !input.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng dán liên kết hoặc mã nhúng video.' });
    }
    const resolved = await resolveVideoSource(input);
    if (!resolved.success) return res.status(400).json(resolved);
    res.json(resolved);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/videos/thumbnail-snip — dùng cho công cụ "quét màn hình" (snipping
// tool) trong Admin: nhận 1 ảnh đã được crop sẵn ngay trên trình duyệt (từ
// vùng người dùng kéo chọn khi quét màn hình/video), lưu vào uploads/thumbnails
// và trả về URL để gán thẳng vào ô Thumbnail.
exports.uploadThumbnailSnip = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Không nhận được ảnh đã chụp.' });
    }
    const hostUrl = `${req.protocol}://${req.get('host')}`;
    const url = `${hostUrl}/uploads/thumbnails/${req.file.filename}`;
    res.json({ success: true, url });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/videos
exports.getVideos = async (req, res) => {
  try {
    const { category, search, sort } = req.query;
    const query = {};

    if (category && category !== 'Tất cả') {
      query.category = category;
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

// POST /api/videos — hỗ trợ 3 cách nhập nguồn video:
//  1) Tải file lên (multipart, req.files.video) — có thể kèm file thumbnail
//  2) Dán link/mã nhúng vào req.body.sourceInput (YouTube/Vimeo/iframe/link trực tiếp)
//  3) (Tương thích ngược) req.body.videoUrl trực tiếp như cũ
// Nếu admin không cung cấp thumbnail, hệ thống tự suy ra: pattern URL cho
// YouTube, oEmbed cho Vimeo, hoặc trích 1 khung hình bằng ffmpeg cho file
// tải lên / link trực tiếp.
exports.createVideo = async (req, res) => {
  try {
    const hostUrl = `${req.protocol}://${req.get('host')}`;
    let videoUrl = req.body.videoUrl || '';
    let thumbnail = req.body.thumbnail?.trim() || '';
    let sourceType = 'direct';
    let platform = 'direct';
    let embedUrl = '';
    let previewGif = '';

    if (req.files?.video?.[0]) {
      // --- Cách 1: Tải file video lên server ---
      sourceType = 'upload';
      platform = 'upload';
      const uploadedVideoPath = req.files.video[0].path;
      videoUrl = `${hostUrl}/uploads/videos/${req.files.video[0].filename}`;

      if (req.files.thumbnail?.[0]) {
        thumbnail = `${hostUrl}/uploads/thumbnails/${req.files.thumbnail[0].filename}`;
      } else if (!thumbnail) {
        const autoFile = await extractThumbnailFromVideo(uploadedVideoPath, THUMBNAILS_DIR);
        if (autoFile) thumbnail = `${hostUrl}/uploads/thumbnails/${autoFile}`;
      }

      // File tải lên đọc được trực tiếp từ đĩa — luôn thử trích thêm 1 đoạn
      // GIF ngắn làm ảnh xem trước khi rê chuột (không chặn nếu thất bại).
      const gifFile = await extractPreviewGif(uploadedVideoPath, THUMBNAILS_DIR);
      if (gifFile) previewGif = `${hostUrl}/uploads/thumbnails/${gifFile}`;
    } else if (req.body.sourceInput?.trim()) {
      // --- Cách 2: Dán link / share link / mã nhúng iframe ---
      const resolved = await resolveVideoSource(req.body.sourceInput);
      if (!resolved.success) {
        return res.status(400).json({ success: false, message: resolved.message });
      }
      sourceType = resolved.sourceType;
      platform = resolved.platform;
      embedUrl = resolved.embedUrl || '';
      videoUrl = resolved.videoUrl;

      if (!thumbnail && resolved.thumbnail) thumbnail = resolved.thumbnail;

      // Link trực tiếp (.mp4/.m3u8...) chưa có thumbnail → thử trích bằng
      // ffmpeg. KHÔNG tự trích thêm GIF xem trước ở đây: link này thường ở
      // server ngoài, tốc độ không lường trước được — nếu server đó chậm,
      // request Thêm Video sẽ bị treo lâu hoặc time-out. GIF xem trước chỉ
      // tự làm cho video "Tải file lên" (đọc từ đĩa cục bộ, nhanh & ổn định).
      if (sourceType === 'direct' && !thumbnail) {
        const autoFile = await extractThumbnailFromVideo(videoUrl, THUMBNAILS_DIR);
        if (autoFile) thumbnail = `${hostUrl}/uploads/thumbnails/${autoFile}`;
      }
    } else if (videoUrl) {
      // --- Cách 3: Tương thích ngược — videoUrl gửi thẳng như phiên bản cũ ---
      const resolved = await resolveVideoSource(videoUrl);
      if (resolved.success) {
        sourceType = resolved.sourceType;
        platform = resolved.platform;
        embedUrl = resolved.embedUrl || '';
        videoUrl = resolved.videoUrl;
        if (!thumbnail && resolved.thumbnail) thumbnail = resolved.thumbnail;

        if (sourceType === 'direct' && !thumbnail) {
          const autoFile = await extractThumbnailFromVideo(videoUrl, THUMBNAILS_DIR);
          if (autoFile) thumbnail = `${hostUrl}/uploads/thumbnails/${autoFile}`;
        }
      }
    }

    if (!req.body.title?.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tiêu đề video' });
    }
    if (!videoUrl) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp video: dán liên kết/mã nhúng, hoặc tải file lên.'
      });
    }

    // Vẫn chưa có thumbnail nào (nguồn nhúng lạ không có API công khai để
    // suy ảnh, vd mixdrop/streamtape...) → tự tạo ảnh bìa placeholder có tên
    // video, thay vì dùng 1 ảnh chung chung không liên quan đến nội dung.
    if (!thumbnail) {
      try {
        thumbnail = generatePlaceholderThumbnail(req.body.title.trim());
      } catch (error) {
        thumbnail = DEFAULT_THUMBNAIL;
      }
    }

    const tagsArray = req.body.tags
      ? (typeof req.body.tags === 'string' ? req.body.tags.split(',') : req.body.tags).map(t => String(t).trim()).filter(Boolean)
      : [];

    const newVideo = await Video.create({
      title: req.body.title.trim(),
      description: req.body.description || '',
      videoUrl,
      sourceType,
      platform,
      embedUrl,
      thumbnail,
      previewGif,
      durationFormatted: req.body.durationFormatted || '05:30',
      category: req.body.category || 'Lập trình',
      quality: req.body.quality || '4K 60fps',
      tags: tagsArray,
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

// POST /api/videos/bulk — Thêm hàng loạt video: admin dán nhiều link/mã nhúng
// vào 1 ô, mỗi dòng được hiểu là 1 video riêng. Hỗ trợ đặt tiêu đề riêng cho
// từng dòng bằng cú pháp "Tiêu đề | link-hoặc-mã-nhúng"; nếu không có, tiêu đề
// được tự suy: có sẵn từ oEmbed (Vimeo/TikTok), gọi thêm 1 lần oEmbed cho
// YouTube/Dailymotion, hoặc dùng tên mặc định "Video nhập hàng loạt #N".
// Thể loại/kênh/tags dùng chung cho cả lô. Xử lý song song có giới hạn
// (BULK_CONCURRENCY) để cân bằng tốc độ và tránh quá tải/time-out server.
exports.bulkCreateVideos = async (req, res) => {
  try {
    const hostUrl = `${req.protocol}://${req.get('host')}`;
    const rawSources = req.body.sources;
    if (!rawSources || !rawSources.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng dán danh sách link/mã nhúng, mỗi dòng 1 video.' });
    }

    const lines = splitBulkSources(rawSources);
    if (!lines.length) {
      return res.status(400).json({ success: false, message: 'Không tìm thấy dòng nào hợp lệ.' });
    }
    if (lines.length > MAX_BULK_ITEMS) {
      return res.status(400).json({
        success: false,
        message: `Chỉ hỗ trợ tối đa ${MAX_BULK_ITEMS} video mỗi lần. Bạn đang dán ${lines.length} dòng — vui lòng chia nhỏ ra.`
      });
    }

    const tagsArray = req.body.tags
      ? (typeof req.body.tags === 'string' ? req.body.tags.split(',') : req.body.tags).map(t => String(t).trim()).filter(Boolean)
      : [];

    const sharedFields = {
      category: req.body.category || 'Lập trình',
      quality: req.body.quality || '4K 60fps',
      tags: tagsArray,
      channel: {
        name: req.body.channelName || 'Kênh Của Tôi (Pro)',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        subscribers: '1.5K người theo dõi',
        verified: false
      }
    };

    const results = new Array(lines.length).fill(null);
    const failedItems = [];

    let cursor = 0;
    async function worker() {
      while (cursor < lines.length) {
        const index = cursor++;
        try {
          results[index] = await processBulkLine(lines[index], index, sharedFields, hostUrl);
        } catch (error) {
          failedItems.push({ line: index + 1, source: lines[index].slice(0, 160), message: error.message || 'Lỗi không xác định' });
        }
      }
    }

    const workerCount = Math.min(BULK_CONCURRENCY, lines.length);
    await Promise.all(Array.from({ length: workerCount }, () => worker()));

    const created = results.filter(Boolean);
    failedItems.sort((a, b) => a.line - b.line);

    res.status(created.length ? 201 : 400).json({
      success: created.length > 0,
      summary: { total: lines.length, succeeded: created.length, failed: failedItems.length },
      data: created,
      failedItems
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Tách nội dung nhiều dòng thành từng mục "1 video" — thông thường mỗi dòng
// là 1 video, NHƯNG mã nhúng <iframe> khi copy từ trình duyệt thường tự xuống
// dòng giữa các thuộc tính (src, frameborder, allowfullscreen...). Nếu tách
// thô theo dòng sẽ cắt vụn 1 mã nhúng thành nhiều "video" rác. Cách xử lý:
// tìm & "khoá" toàn bộ khối <iframe ...>...</iframe> (hoặc chỉ thẻ mở nếu
// không có thẻ đóng) lại thành 1 token duy nhất trước khi tách dòng, sau đó
// trả token về nguyên văn — nhờ vậy khối iframe nhiều dòng luôn nằm gọn
// trong đúng 1 mục, dù bên trong nó có bao nhiêu dấu xuống dòng.
function splitBulkSources(rawSources) {
  const iframeBlocks = [];
  const withPlaceholders = rawSources.replace(/<iframe[^>]*>(?:[\s\S]*?<\/iframe\s*>)?/gi, (match) => {
    const token = 'IFRAME_BULK_TOKEN_' + iframeBlocks.length + '_END';
    iframeBlocks.push(match);
    return token;
  });

  return withPlaceholders
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(line => line.replace(/IFRAME_BULK_TOKEN_(\d+)_END/g, (_, i) => iframeBlocks[Number(i)]));
}

// Hỗ trợ cú pháp tuỳ chọn "Tiêu đề | link-hoặc-mã-nhúng" trên mỗi dòng. Chỉ
// tách khi vế phải rõ ràng là 1 nguồn video (link http(s) hoặc mã nhúng
// iframe) VÀ vế trái không tự nó là 1 nguồn — tránh hiểu nhầm dấu "|" nằm
// trong query string của URL (vd ?a=1|2) thành dấu phân tách tiêu đề.
function parseTitleAndSource(line) {
  const idx = line.indexOf('|');
  if (idx === -1) return { title: null, source: line.trim() };

  const left = line.slice(0, idx).trim();
  const right = line.slice(idx + 1).trim();
  const looksLikeSource = (s) => /^https?:\/\//i.test(s) || /<iframe/i.test(s);

  if (left && looksLikeSource(right) && !looksLikeSource(left)) {
    return { title: left, source: right };
  }
  return { title: null, source: line.trim() };
}

// Xử lý 1 dòng trong lô Thêm hàng loạt: phân giải nguồn, suy tiêu đề & ảnh
// bìa theo đúng thứ tự ưu tiên đã dùng cho luồng Thêm 1 video, rồi tạo video.
// Ném lỗi (throw) khi dòng này thất bại — bulkCreateVideos sẽ gom vào
// failedItems thay vì làm hỏng cả lô.
async function processBulkLine(rawLine, index, sharedFields, hostUrl) {
  const { title: customTitle, source } = parseTitleAndSource(rawLine);
  if (!source) throw new Error('Dòng trống hoặc không có nguồn video.');

  const resolved = await resolveVideoSource(source);
  if (!resolved.success) throw new Error(resolved.message);

  let title = customTitle || resolved.title;
  if (!title) title = await fetchTitleForResolved(resolved);
  if (!title) title = `Video nhập hàng loạt #${index + 1}`;

  let thumbnail = resolved.thumbnail || '';
  if (resolved.sourceType === 'direct' && !thumbnail) {
    const autoFile = await extractThumbnailFromVideo(resolved.videoUrl, THUMBNAILS_DIR);
    if (autoFile) thumbnail = `${hostUrl}/uploads/thumbnails/${autoFile}`;
  }
  if (!thumbnail) {
    try {
      thumbnail = generatePlaceholderThumbnail(title);
    } catch (error) {
      thumbnail = DEFAULT_THUMBNAIL;
    }
  }

  return Video.create({
    title,
    description: '',
    videoUrl: resolved.videoUrl,
    sourceType: resolved.sourceType,
    platform: resolved.platform,
    embedUrl: resolved.embedUrl || '',
    thumbnail,
    previewGif: '',
    durationFormatted: '05:30',
    category: sharedFields.category,
    quality: sharedFields.quality,
    tags: sharedFields.tags,
    channel: sharedFields.channel
  });
}

// PUT /api/videos/:id
exports.updateVideo = async (req, res) => {
  try {
    const update = { ...req.body };
    if (typeof update.tags === 'string') update.tags = update.tags.split(',').map(t => t.trim()).filter(Boolean);

    // Nếu ô "Đường dẫn Video URL" được sửa thành 1 link YouTube/Vimeo hoặc dán
    // nguyên mã nhúng <iframe> (thay vì link file .mp4/.m3u8 trực tiếp), tự
    // động phân giải lại thành sourceType/embedUrl đúng — nếu không, chuỗi
    // <iframe...> hoặc link share sẽ bị lưu thẳng vào videoUrl khiến thẻ
    // <video> ở trang xem không phát được gì (chính là lỗi vừa gặp).
    if (typeof update.videoUrl === 'string' && update.videoUrl.trim()) {
      const detected = detectSourceType(update.videoUrl);
      if (detected && detected !== 'direct') {
        const resolved = await resolveVideoSource(update.videoUrl);
        if (resolved.success) {
          update.sourceType = resolved.sourceType;
          update.platform = resolved.platform;
          update.embedUrl = resolved.embedUrl || '';
          update.videoUrl = resolved.videoUrl;
          if (!update.thumbnail?.trim() && resolved.thumbnail) update.thumbnail = resolved.thumbnail;
        }
      } else if (detected === 'direct') {
        // Link trực tiếp bình thường — đảm bảo không còn sót embedUrl/sourceType
        // nhúng từ trước (vd: sửa 1 video YouTube cũ thành link .mp4 trực tiếp).
        update.sourceType = 'direct';
        update.platform = 'direct';
        update.embedUrl = '';
      }
    }

    // Vẫn chưa có thumbnail (nguồn nhúng lạ không suy được ảnh) → tạo ảnh bìa
    // placeholder từ tiêu đề, ưu tiên tiêu đề mới nếu có sửa, không thì lấy
    // tiêu đề hiện tại trong DB.
    if (typeof update.thumbnail === 'string' && !update.thumbnail.trim()) {
      delete update.thumbnail; // chuỗi rỗng gửi lên nghĩa là "để trống", không phải "xoá"
    }
    if (!update.thumbnail) {
      try {
        const titleForPlaceholder = update.title?.trim() || (await Video.findById(req.params.id).select('title'))?.title;
        if (titleForPlaceholder) update.thumbnail = generatePlaceholderThumbnail(titleForPlaceholder);
      } catch (error) {
        // Không lấy được tiêu đề (vd ID sai) — bỏ qua, để findByIdAndUpdate bên dưới tự báo lỗi 404.
      }
    }

    // Hero Banner giờ được quản lý riêng ở mục Hero Banner trong Admin (xem
    // heroBannerController.js) — video không còn cờ isHeroSpotlight/heroOrder
    // riêng nữa, nên bỏ 2 field này khỏi update nếu client cũ còn gửi lên.
    delete update.isHeroSpotlight;
    delete update.heroOrder;

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
    for (const url of [video.videoUrl, video.thumbnail, video.previewGif]) {
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
    res.json({ success: true, data: ['Tất cả', ...categories] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
