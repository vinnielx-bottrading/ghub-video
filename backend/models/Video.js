const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  user: {
    type: String,
    required: true,
    default: 'Anonymous Viewer'
  },
  avatar: {
    type: String,
    default: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
  },
  content: {
    type: String,
    required: true
  },
  likes: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const VideoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Vui lòng nhập tiêu đề video'],
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  videoUrl: {
    type: String,
    required: [true, 'Đường dẫn video là bắt buộc']
  },
  // Nguồn video: 'upload' (file tải lên server), 'direct' (link .mp4/.m3u8 trực
  // tiếp), 'youtube', 'vimeo', hoặc 'iframe' (mã nhúng từ trang streaming khác).
  sourceType: {
    type: String,
    enum: ['upload', 'direct', 'youtube', 'vimeo', 'iframe'],
    default: 'direct'
  },
  // Nền tảng gốc phát hiện được (youtube/vimeo/direct/other) — chỉ mang tính
  // hiển thị/thống kê, không ảnh hưởng cách phát video.
  platform: {
    type: String,
    default: 'direct'
  },
  // URL dùng để nhúng <iframe> khi sourceType là youtube/vimeo/iframe.
  // Rỗng với upload/direct (những loại này phát bằng thẻ <video>).
  embedUrl: {
    type: String,
    default: ''
  },
  thumbnail: {
    type: String,
    default: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=85'
  },
  // Ảnh xem trước dạng GIF ngắn (~3s, không tiếng) trích từ chính video —
  // chỉ có với sourceType 'upload'/'direct' (nơi ffmpeg đọc được file thật).
  // Hiển thị khi rê chuột vào thẻ video ở trang chủ, giống YouTube.
  previewGif: {
    type: String,
    default: ''
  },
  durationFormatted: {
    type: String,
    default: '10:00'
  },
  quality: {
    type: String,
    default: '4K 60fps'
  },
  views: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  dislikes: {
    type: Number,
    default: 0
  },
  category: {
    type: String,
    required: true,
    default: 'Lập trình'
  },
  tags: {
    type: [String],
    default: []
  },
  badges: {
    type: [String],
    default: []
  },
  channel: {
    name: {
      type: String,
      default: 'GHUB X Creator'
    },
    avatar: {
      type: String,
      default: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
    },
    subscribers: {
      type: String,
      default: '1.2K người theo dõi'
    },
    verified: {
      type: Boolean,
      default: false
    }
  },
  comments: [CommentSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual field: tính ngày đăng theo dạng tương đối (uploadedAt)
VideoSchema.virtual('uploadedAt').get(function () {
  const now = new Date();
  const diffTime = Math.abs(now - this.createdAt);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
  const diffMins = Math.floor(diffTime / (1000 * 60));

  if (diffMins < 60) return `${diffMins <= 0 ? 1 : diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} tuần trước`;
  return `${Math.floor(diffDays / 30)} tháng trước`;
});

module.exports = mongoose.model('Video', VideoSchema);
