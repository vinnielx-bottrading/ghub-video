const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { requireAdminApi } = require('../middleware/adminAuth');
const {
  getTopics,
  getPhotos,
  bulkCreatePhotos,
  deletePhoto,
  deleteTopic
} = require('../controllers/galleryController');

// Đọc (GET) công khai cho người xem trang Bộ sưu tập ảnh; ghi (POST/DELETE)
// chỉ dành cho Admin đã đăng nhập.
router.get('/topics', getTopics);
router.get('/photos', getPhotos);

router.post('/photos/bulk', requireAdminApi, upload.array('images', 40), bulkCreatePhotos);
router.delete('/photos/:id', requireAdminApi, deletePhoto);
router.delete('/topics/:topic', requireAdminApi, deleteTopic);

module.exports = router;
