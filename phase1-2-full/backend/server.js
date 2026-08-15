require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const videoRoutes = require('./routes/videoRoutes');
const authRoutes = require('./routes/authRoutes');
const { requireAdminPage } = require('./middleware/adminAuth');

connectDB();

const app = express();
const FRONTEND_ROOT = path.join(__dirname, '..');

const MONGO_STATE_LABELS = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting'
};

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Uploaded video/thumbnail files.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Chặn sớm mọi request tới /api/videos nếu MongoDB chưa sẵn sàng, để trả lỗi
// rõ ràng NGAY LẬP TỨC thay vì để request treo/timeout không rõ nguyên nhân
// (đây chính là lý do trước đây khó biết lỗi đến từ Render hay MongoDB).
app.use('/api/videos', (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Chưa kết nối được MongoDB Atlas. Kiểm tra biến môi trường MONGODB_URI trên Render và mục Network Access trên Atlas (cần cho phép 0.0.0.0/0).',
      mongoState: MONGO_STATE_LABELS[mongoose.connection.readyState] || 'unknown'
    });
  }
  next();
});

// REST API used by index.html and admin.html.
app.use('/api/videos', videoRoutes);

// Đăng nhập/đăng xuất Admin.
app.use('/api/auth', authRoutes);

// Health check — bao gồm cả trạng thái MongoDB để dễ chẩn đoán lỗi đến từ đâu.
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'ghubx-backend',
    timestamp: new Date().toISOString(),
    mongo: {
      state: MONGO_STATE_LABELS[mongoose.connection.readyState] || 'unknown',
      readyState: mongoose.connection.readyState
    }
  });
});

// Serve frontend pages with the API bridge injected before the application code.
function sendFrontendPage(fileName, res) {
  const filePath = path.join(FRONTEND_ROOT, fileName);
  fs.readFile(filePath, 'utf8', (error, html) => {
    if (error) return res.status(500).send('Không thể tải giao diện GHUB X.');
    const bridgeTag = '<script src="/js/api-bridge.js"></script>';
    const output = html.includes('js/api-bridge.js')
      ? html
      : html.replace(/<script src="js\/app\.js"><\/script>/, `${bridgeTag}\n  <script src="js/app.js"></script>`)
            .replace(/<script src="js\/admin\.js"><\/script>/, `${bridgeTag}\n  <script src="js/admin.js"></script>`);
    res.type('html').send(output);
  });
}

app.get('/', (req, res) => sendFrontendPage('index.html', res));
// Trang Admin yêu cầu đã đăng nhập — chưa đăng nhập sẽ tự chuyển tới trang login.
app.get(['/admin', '/admin.html'], requireAdminPage, (req, res) => sendFrontendPage('admin.html', res));

// Static assets after explicit HTML routes.
app.use(express.static(FRONTEND_ROOT));

// API 404s are JSON.
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint không tồn tại' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 GHUB X Server: http://localhost:${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api/videos`);
  console.log(`🛠️ Admin: http://localhost:${PORT}/admin\n`);
});
