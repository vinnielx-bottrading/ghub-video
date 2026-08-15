// Dữ liệu video chất lượng cao với ảnh nền 4K, video mẫu và thông tin chi tiết
const FEATURED_HERO = {
  id: "hero-1",
  title: "Vũ Trụ Vô Tận: Hành Trình Khám Phá Hố Đen và Chiều Không Gian Thứ 4",
  description: "Bộ phim tài liệu khoa học 4K 60FPS ghi lại những bí ẩn sâu thẳm nhất của vũ trụ, từ sự hình thành của các thiên hà sơ khai đến kỳ dị không thời gian bên trong lỗ đen siêu khối lượng.",
  videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
  thumbnail: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=85",
  durationFormatted: "48:15",
  views: "1.8M",
  rating: "4.9 ★",
  badges: ["4K ULTRA HD", "60 FPS", "THỊNH HÀNH #1"],
  category: "Khoa học & Vũ trụ",
  channel: {
    name: "Cosmos Odyssey",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
    subscribers: "2.4M người đăng ký",
    verified: true
  }
};

const SAMPLE_VIDEOS = [
  {
    id: "vid-1",
    title: "Kiến Trúc Video Streaming Quy Mô Triệu Người Dùng: Node.js, Go, HLS & Cloudflare R2",
    description: "Khám phá cách các ông lớn công nghệ tối ưu hóa đường truyền video độ trễ thấp, chia nhỏ gói tin HLS .m3u8, cơ chế caching phân tán qua CDN và thiết kế PostgreSQL chống thắt cổ chai.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    thumbnail: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=85",
    durationFormatted: "34:20",
    views: 245000,
    uploadedAt: "2 ngày trước",
    category: "Lập trình",
    tags: ["system-design", "streaming", "postgresql", "cloudflare"],
    quality: "4K 60fps",
    likes: 12400,
    channel: {
      name: "TechLead Vietnam",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
      subscribers: "450K người đăng ký",
      verified: true
    },
    comments: [
      {
        user: "Quốc Huy Dev",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80",
        content: "Giải thích phần HLS playlist và chunking cực kỳ chi tiết, cảm ơn kênh rất nhiều!",
        likes: 142,
        time: "1 ngày trước"
      }
    ]
  },
  {
    id: "vid-2",
    title: "Khám Phá Cực Quang Na Uy 4K HDR: Bản Giao Hưởng Ánh Sáng Kỳ Ảo",
    description: "Thước phim điện ảnh ghi lại vẻ đẹp rực rỡ của cực quang nhảy múa trên bầu trời đêm bắc cực vùng Tromsø, Na Uy.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    thumbnail: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=1200&q=85",
    durationFormatted: "18:45",
    views: 920000,
    uploadedAt: "4 ngày trước",
    category: "Thiên nhiên",
    tags: ["aurora", "norway", "cinematic", "4k"],
    quality: "4K HDR",
    likes: 48900,
    channel: {
      name: "Earth Cinema",
      avatar: "https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?auto=format&fit=crop&w=150&q=80",
      subscribers: "1.8M người đăng ký",
      verified: true
    },
    comments: []
  },
  {
    id: "vid-3",
    title: "Xu Hướng Thiết Kế Giao Diện 2026: Spatial UI, Glassmorphism & AI Micro-interactions",
    description: "Phân tích các chuẩn mực thiết kế mới giúp nâng tầm sản phẩm số: tạo chiều sâu với ánh sáng động, phân cấp thị giác và trải nghiệm mượt mà không độ trễ.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    thumbnail: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=85",
    durationFormatted: "21:10",
    views: 115000,
    uploadedAt: "5 ngày trước",
    category: "Thiết kế",
    tags: ["uiux", "figma", "spatial", "design"],
    quality: "1080p 60fps",
    likes: 9200,
    channel: {
      name: "Design Masterclass",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
      subscribers: "210K người đăng ký",
      verified: true
    },
    comments: []
  },
  {
    id: "vid-4",
    title: "Midnight Cyberpunk Lofi 🌌 Âm Nhạc Thư Giãn, Học Tập & Lập Trình Về Đêm",
    description: "Không gian âm thanh synthwave và lofi retro hòa quyện cùng ánh đèn neon thành phố tương lai. Giúp bạn tập trung 100% khi làm việc.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    thumbnail: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=85",
    durationFormatted: "1:45:00",
    views: 3120000,
    uploadedAt: "1 tuần trước",
    category: "Âm nhạc",
    tags: ["lofi", "cyberpunk", "synthwave", "chill"],
    quality: "4K Hi-Res",
    likes: 184000,
    channel: {
      name: "Neo Tokyo Radio",
      avatar: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=150&q=80",
      subscribers: "1.2M người đăng ký",
      verified: true
    },
    comments: []
  },
  {
    id: "vid-5",
    title: "Chung Kết Thế Giới Esports 2026: Những Khoảnh Khắc Xuất Thần và Đỉnh Cao Chiến Thuật",
    description: "Tổng hợp các pha thi đấu đồng đội đỉnh cao, combo kỹ năng chuẩn xác từng mili-giây và cuộc lật đổ lịch sử tại trận chung kết.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    thumbnail: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=85",
    durationFormatted: "28:15",
    views: 890000,
    uploadedAt: "1 ngày trước",
    category: "Gaming",
    tags: ["gaming", "esports", "epic", "highlights"],
    quality: "1080p 120fps",
    likes: 67000,
    channel: {
      name: "Pro Gaming League",
      avatar: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=150&q=80",
      subscribers: "890K người đăng ký",
      verified: true
    },
    comments: []
  },
  {
    id: "vid-6",
    title: "Mô Hình AI Tự Trị (Autonomous Agents) & Tương Lai Ngành Phần Mềm Trong 5 Năm Tới",
    description: "Tìm hiểu kiến trúc Multi-Agent Systems, cách các AI Agent tự giao tiếp, phối hợp giải quyết bài toán phức tạp và tác động trực tiếp tới thị trường kỹ sư công nghệ.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4",
    thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=85",
    durationFormatted: "25:40",
    views: 189000,
    uploadedAt: "3 ngày trước",
    category: "Trí tuệ nhân tạo (AI)",
    tags: ["ai", "agents", "future", "tech"],
    quality: "4K 60fps",
    likes: 15400,
    channel: {
      name: "TechLead Vietnam",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
      subscribers: "450K người đăng ký",
      verified: true
    },
    comments: []
  },
  {
    id: "vid-7",
    title: "Khám Phá Cung Đèo Mã Pí Lèng & Hẻm Vực Tu Sản: Kỳ Quan Hùng Vĩ Của Núi Rừng Hà Giang",
    description: "Hành trình máy quay flycam 4K 60FPS len lỏi qua làn sương mây bồng bềnh và dòng sông Nho Quế xanh như ngọc bích.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    thumbnail: "https://images.unsplash.com/photo-1503220317375-aaad61436b1b?auto=format&fit=crop&w=1200&q=85",
    durationFormatted: "16:50",
    views: 430000,
    uploadedAt: "6 ngày trước",
    category: "Du lịch",
    tags: ["vietnam", "hagiang", "cinematic", "drone"],
    quality: "4K HDR",
    likes: 31000,
    channel: {
      name: "Vietnam Discovery",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80",
      subscribers: "520K người đăng ký",
      verified: false
    },
    comments: []
  },
  {
    id: "vid-8",
    title: "Nghệ Thuật Pha Cà Phê Thủ Công (Pour Over V60): Tinh Hoa Của Hương Vị và Độ Ẩm",
    description: "Chia sẻ kỹ thuật chiết xuất hoàn hảo từ tỷ lệ nước, nhiệt độ chuẩn 92°C, độ mịn hạt cà phê đến tốc độ rót nước theo vòng xoáy xoắn ốc.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
    thumbnail: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=85",
    durationFormatted: "14:10",
    views: 210000,
    uploadedAt: "1 tuần trước",
    category: "Ẩm thực",
    tags: ["coffee", "pourover", "barista", "lifestyle"],
    quality: "4K 60fps",
    likes: 18200,
    channel: {
      name: "Barista Life",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80",
      subscribers: "380K người đăng ký",
      verified: true
    },
    comments: []
  }
];

const CATEGORIES = [
  "Tất cả",
  "Thịnh hành 🔥",
  "Lập trình",
  "Trí tuệ nhân tạo (AI)",
  "Thiết kế",
  "Gaming",
  "Âm nhạc",
  "Thiên nhiên",
  "Du lịch",
  "Khoa học & Vũ trụ",
  "Ẩm thực"
];
