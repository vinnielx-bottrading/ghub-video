const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { requireAdminApi } = require('../middleware/adminAuth');
const {
  getVideos,
  getVideoById,
  createVideo,
  updateVideo,
  deleteVideo,
  likeVideo,
  addComment,
  getCategories,
  detectVideoSource,
  bulkCreateVideos,
  uploadThumbnailSnip
} = require('../controllers/videoController');

// Routes danh mục. (Hero Banner giờ có route riêng: /api/hero-banners — xem
// heroBannerRoutes.js — không còn gắn vào từng video nữa.)
router.get('/categories', getCategories);

// Nhận diện & xem trước nguồn video (link/mã nhúng) trước khi tạo — chỉ Admin.
// Đặt trước router.route('/:id') để không bị hiểu nhầm là 1 ID.
router.post('/detect-source', requireAdminApi, detectVideoSource);

// Thêm hàng loạt video: mỗi dòng trong ô "sources" là 1 video — chỉ Admin.
// Đặt trước router.route('/:id') để không bị hiểu nhầm "bulk" là 1 ID.
router.post('/bulk', requireAdminApi, bulkCreateVideos);

// Công cụ "quét màn hình" (snipping tool) trong Admin: nhận 1 ảnh đã crop sẵn
// ở trình duyệt, lưu lại và trả về URL để dùng làm thumbnail — chỉ Admin.
router.post('/thumbnail-snip', requireAdminApi, upload.single('thumbnail'), uploadThumbnailSnip);

// Routes CRUD video — đọc (GET) công khai cho người xem; ghi (POST/PUT/DELETE)
// chỉ dành cho Admin đã đăng nhập.
router.route('/')
  .get(getVideos)
  .post(
    requireAdminApi,
    upload.fields([
      { name: 'video', maxCount: 1 },
      { name: 'thumbnail', maxCount: 1 }
    ]),
    createVideo
  );

router.route('/:id')
  .get(getVideoById)
  .put(requireAdminApi, updateVideo)
  .delete(requireAdminApi, deleteVideo);

// Routes tương tác
router.post('/:id/like', likeVideo);
router.post('/:id/comments', addComment);

module.exports = router;
