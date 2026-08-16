const mongoose = require('mongoose');

// Hero Banner giờ là 1 mục QUẢN LÝ RIÊNG trong Admin — KHÔNG còn gắn vào từng
// video (isHeroSpotlight) như trước. Admin tự thêm tối đa 10 slide, mỗi slide
// chỉ là 1 ảnh (dán link / tải lên / lấy thumbnail từ 1 video có sẵn), không
// có tiêu đề hay mô tả đè lên ảnh. Nếu slide có gắn video, bấm vào sẽ mở video
// đó; nếu chỉ là ảnh tĩnh (không gắn video), slide chỉ mang tính trang trí.
const HeroBannerSchema = new mongoose.Schema({
  image: {
    type: String,
    required: [true, 'Ảnh banner là bắt buộc']
  },
  // Video được gắn với slide này (tùy chọn) — bấm vào banner sẽ mở video này.
  video: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    default: null
  },
  // Thứ tự hiển thị trong slideshow — số nhỏ hơn hiện trước.
  order: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('HeroBanner', HeroBannerSchema);
