const mongoose = require('mongoose');

// Bộ sưu tập ảnh — mỗi ảnh gắn với 1 "chủ đề" (topic) do admin tự đặt tên tự
// do khi tải lên (không phải danh sách cứng cấu hình sẵn) — giống cách
// "category" của Video hoạt động: 1 chủ đề chỉ tồn tại khi có ít nhất 1 ảnh
// đang gắn nó, và tự động biến mất khỏi danh sách nút chủ đề khi ảnh cuối
// cùng của chủ đề đó bị xoá.
const GalleryPhotoSchema = new mongoose.Schema({
  topic: {
    type: String,
    required: [true, 'Chủ đề là bắt buộc'],
    trim: true
  },
  imageUrl: {
    type: String,
    required: [true, 'Ảnh là bắt buộc']
  },
  caption: {
    type: String,
    default: ''
  },
  // Thứ tự hiển thị trong lưới của riêng chủ đề đó — số nhỏ hơn hiện trước.
  order: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

GalleryPhotoSchema.index({ topic: 1, order: 1 });

module.exports = mongoose.model('GalleryPhoto', GalleryPhotoSchema);
