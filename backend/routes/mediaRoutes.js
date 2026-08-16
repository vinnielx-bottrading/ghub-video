const express = require('express');
const router = express.Router();
const { requireAdminApi } = require('../middleware/adminAuth');
const { getMediaLibrary, deleteMediaFile } = require('../controllers/mediaController');

// "Thư viện ảnh" — chỉ Admin, dùng để xem lại & dọn dẹp ảnh đã tải lên/quét
// màn hình (uploads/thumbnails), an toàn hơn việc tự động xoá ảnh khi xoá
// video (đã bỏ — xem ghi chú trong videoController.js#deleteVideo).
router.get('/', requireAdminApi, getMediaLibrary);
router.delete('/:filename', requireAdminApi, deleteMediaFile);

module.exports = router;
