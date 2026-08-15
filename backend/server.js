require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const videoRoutes = require('./routes/videoRoutes');

// Kết nối MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cung cấp file tĩnh từ thư mục uploads (để trình duyệt xem được video/ảnh đã upload)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes API
app.use('/api/videos', videoRoutes);

// Root API Health Check
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'VidFlow Pro RESTful API Server is running 🚀',
    endpoints: {
      videos: '/api/videos',
      hero: '/api/videos/hero',
      categories: '/api/videos/categories'
    }
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n🚀 VidFlow Backend Server đang chạy tại: http://localhost:${PORT}`);
  console.log(`📡 API Endpoints sẵn sàng tại: http://localhost:${PORT}/api/videos\n`);
});
