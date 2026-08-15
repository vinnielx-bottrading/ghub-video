require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
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

// Serve the frontend from the same Express service. This removes the old
// frontend/backend URL mismatch when the project is deployed together.
app.use(express.static(FRONTEND_ROOT, {
  index: 'index.html',
  extensions: ['html']
}));

app.get('/admin', (req, res) => {
  res.sendFile(path.join(FRONTEND_ROOT, 'admin.html'));
});

// API 404s are JSON; unknown browser routes return the main page.
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
