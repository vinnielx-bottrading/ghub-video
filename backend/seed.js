const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

require('dotenv').config();
const mongoose = require('mongoose');
const Video = require('./models/Video');

const SAMPLE_VIDEOS = [
  {
    title: "Vũ Trụ Vô Tận: Hành Trình Khám Phá Hố Đen và Chiều Không Gian Thứ 4",
    description: "Bộ phim tài liệu khoa học 4K 60FPS ghi lại những bí ẩn sâu thẳm nhất của vũ trụ, từ sự hình thành của các thiên hà sơ khai đến kỳ dị không thời gian bên trong lỗ đen siêu khối lượng.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    thumbnail: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=85",
    durationFormatted: "48:15",
    views: 1800000,
    quality: "4K 60fps",
    category: "Khoa học & Vũ trụ",
    tags: ["universe", "blackhole", "science", "4k"],
    isHeroSpotlight: true,
    badges: ["4K ULTRA HD", "60 FPS", "THỊNH HÀNH #1"],
    likes: 125000,
    channel: {
      name: "Cosmos Odyssey",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
      subscribers: "2.4M người theo dõi",
      verified: true
    }
  },
  {
    title: "Kiến Trúc Video Streaming Quy Mô Triệu Người Dùng: Node.js, Go, HLS & Cloudflare R2",
    description: "Khám phá cách các ông lớn công nghệ tối ưu hóa đường truyền video độ trễ thấp, chia nhỏ gói tin HLS .m3u8, cơ chế caching phân tán qua CDN và thiết kế MongoDB chống thắt cổ chai.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    thumbnail: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=85",
    durationFormatted: "34:20",
    views: 245000,
    quality: "4K 60fps",
    category: "Lập trình",
    tags: ["system-design", "streaming", "mongodb", "nodejs"],
    likes: 12400,
    channel: {
      name: "TechLead Vietnam",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
      subscribers: "450K người theo dõi",
      verified: true
    },
    comments: [
      {
        user: "Quốc Huy Dev",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80",
        content: "Giải thích phần HLS playlist và chunking cực kỳ chi tiết, cảm ơn kênh rất nhiều!",
        likes: 142
      }
    ]
  },
  {
    title: "Khám Phá Cực Quang Na Uy 4K HDR: Bản Giao Hưởng Ánh Sáng Kỳ Ảo",
    description: "Thước phim điện ảnh ghi lại vẻ đẹp rực rỡ của cực quang nhảy múa trên bầu trời đêm bắc cực vùng Tromsø, Na Uy.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    thumbnail: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=1200&q=85",
    durationFormatted: "18:45",
    views: 920000,
    quality: "4K HDR",
    category: "Thiên nhiên",
    tags: ["aurora", "norway", "cinematic", "4k"],
    likes: 48900,
    channel: {
      name: "Earth Cinema",
      avatar: "https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?auto=format&fit=crop&w=150&q=80",
      subscribers: "1.8M người theo dõi",
      verified: true
    }
  },
  {
    title: "Xu Hướng Thiết Kế Giao Diện 2026: Spatial UI, Glassmorphism & AI Micro-interactions",
    description: "Phân tích các chuẩn mực thiết kế mới giúp nâng tầm sản phẩm số: tạo chiều sâu với ánh sáng động, phân cấp thị giác và trải nghiệm mượt mà không độ trễ.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    thumbnail: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=85",
    durationFormatted: "21:10",
    views: 115000,
    quality: "1080p 60fps",
    category: "Thiết kế",
    tags: ["uiux", "figma", "spatial", "design"],
    likes: 9200,
    channel: {
      name: "Design Masterclass",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
      subscribers: "210K người theo dõi",
      verified: true
    }
  },
  {
    title: "Midnight Cyberpunk Lofi 🌌 Âm Nhạc Thư Giãn, Học Tập & Lập Trình Về Đêm",
    description: "Không gian âm thanh synthwave và lofi retro hòa quyện cùng ánh đèn neon thành phố tương lai. Giúp bạn tập trung 100% khi làm việc.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    thumbnail: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=85",
    durationFormatted: "1:45:00",
    views: 3120000,
    quality: "4K Hi-Res",
    category: "Âm nhạc",
    tags: ["lofi", "cyberpunk", "synthwave", "chill"],
    likes: 184000,
    channel: {
      name: "Neo Tokyo Radio",
      avatar: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=150&q=80",
      subscribers: "1.2M người theo dõi",
      verified: true
    }
  },
  {
    title: "Chung Kết Thế Giới Esports 2026: Những Khoảnh Khắc Xuất Thần và Đỉnh Cao Chiến Thuật",
    description: "Tổng hợp các pha thi đấu đồng đội đỉnh cao, combo kỹ năng chuẩn xác từng mili-giây và cuộc lật đổ lịch sử tại trận chung kết.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    thumbnail: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=85",
    durationFormatted: "28:15",
    views: 890000,
    quality: "1080p 120fps",
    category: "Gaming",
    tags: ["gaming", "esports", "epic", "highlights"],
    likes: 67000,
    channel: {
      name: "Pro Gaming League",
      avatar: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=150&q=80",
      subscribers: "890K người theo dõi",
      verified: true
    }
  }
];

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
    console.log('✅ Đã kết nối MongoDB Atlas thành công!');

    await Video.deleteMany();
    console.log('🗑️  Đã dọn dẹp các video cũ trong DB');

    await Video.insertMany(SAMPLE_VIDEOS);
    console.log('🎉 Đã nạp thành công toàn bộ video mẫu chất lượng cao vào MongoDB Atlas của bạn!');

    process.exit();
  } catch (error) {
    console.error(`❌ Lỗi khi nạp dữ liệu: ${error.message}`);
    process.exit(1);
  }
};

seedData();
