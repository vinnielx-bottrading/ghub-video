const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { requireAdminApi } = require('../middleware/adminAuth');
const {
  getHeroBanners,
  createHeroBanner,
  updateHeroBanner,
  deleteHeroBanner
} = require('../controllers/heroBannerController');

// Dùng field "thumbnail" (không phải "image") khi tải file lên để tận dụng
// đúng bộ lọc định dạng ảnh + thư mục lưu uploads/thumbnails đã có sẵn trong
// middleware/upload.js — req.file trong controller không quan tâm tên field
// gốc, nên không ảnh hưởng gì tới logic xử lý.
router.route('/')
  .get(getHeroBanners)
  .post(requireAdminApi, upload.single('thumbnail'), createHeroBanner);

router.route('/:id')
  .put(requireAdminApi, upload.single('thumbnail'), updateHeroBanner)
  .delete(requireAdminApi, deleteHeroBanner);

module.exports = router;
