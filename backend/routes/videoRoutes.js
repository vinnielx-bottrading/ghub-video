const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { requireAdminApi } = require('../middleware/adminAuth');
const {
  getVideos,
  getHeroVideo,
  getVideoById,
  createVideo,
  updateVideo,
  deleteVideo,
  likeVideo,
  addComment,
  getCategories,
  detectVideoSource
} = require('../controllers/videoController');

// Routes danh mục & Hero
router.get('/categories', getCategories);
router.get('/hero', getHeroVideo);

// Nhận diện & xem trước nguồn video (link/mã nhúng) trước khi tạo — chỉ Admin.
// Đặt trước router.route('/:id') để không bị hiểu nhầm là 1 ID.
router.post('/detect-source', requireAdminApi, detectVideoSource);

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
