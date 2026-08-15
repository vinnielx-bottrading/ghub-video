require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');
const videoRoutes = require('./routes/videoRoutes');

connectDB();

const app = express();
const FRONTEND_ROOT = path.join(__dirname, '..');

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Uploaded video/thumbnail files.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// REST API used by index.html and admin.html.
app.use('/api/videos', videoRoutes);

// Health check.
app.get('/api/health', (req, res) => {
  res.json({ status: 'online', service: 'vidflow-backend', timestamp: new Date().toISOString() });
});

// Serve frontend pages with the API bridge injected before the application code.
function sendFrontendPage(fileName, res) {
  const filePath = path.join(FRONTEND_ROOT, fileName);
  fs.readFile(filePath, 'utf8', (error, html) => {
    if (error) return res.status(500).send('Không thể tải giao diện VidFlow.');
    const bridgeTag = '<script src="/js/api-bridge.js"></script>';
    const output = html.includes('js/api-bridge.js')
      ? html
      : html.replace(/<script src="js\/app\.js"><\/script>/, `${bridgeTag}\n  <script src="js/app.js"></script>`)
            .replace(/<script src="js\/admin\.js"><\/script>/, `${bridgeTag}\n  <script src="js/admin.js"></script>`);
    res.type('html').send(output);
  });
}

app.get('/', (req, res) => sendFrontendPage('index.html', res));
app.get(['/admin', '/admin.html'], (req, res) => sendFrontendPage('admin.html', res));

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
  console.log(`\n🚀 VidFlow Server: http://localhost:${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api/videos`);
  console.log(`🛠️ Admin: http://localhost:${PORT}/admin\n`);
});
