const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const {
  getVideos,
  getHeroVideo,
  getVideoById,
  createVideo,
  updateVideo,
  deleteVideo,
  likeVideo,
  addComment,
  getCategories
} = require('../controllers/videoController');

// Routes danh mục & Hero
router.get('/categories', getCategories);
router.get('/hero', getHeroVideo);

// Routes CRUD video
router.route('/')
  .get(getVideos)
  .post(
    upload.fields([
      { name: 'video', maxCount: 1 },
      { name: 'thumbnail', maxCount: 1 }
    ]),
    createVideo
  );

router.route('/:id')
  .get(getVideoById)
  .put(updateVideo)
  .delete(deleteVideo);

// Routes tương tác
router.post('/:id/like', likeVideo);
router.post('/:id/comments', addComment);

module.exports = router;
