const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const AdminUser = require('../models/AdminUser');
const { signAdminToken, ADMIN_COOKIE_NAME, requireAdminApi } = require('../middleware/adminAuth');

const isProd = process.env.NODE_ENV === 'production';

// POST /api/auth/admin/login
router.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên đăng nhập và mật khẩu.' });
    }

    const admin = await AdminUser.findOne({ username: username.trim() });
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Sai tên đăng nhập hoặc mật khẩu.' });
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Sai tên đăng nhập hoặc mật khẩu.' });
    }

    const token = signAdminToken(admin);
    res.cookie(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 12 * 60 * 60 * 1000, // 12 giờ
    });
    res.json({ success: true, message: 'Đăng nhập thành công.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/auth/admin/logout
router.post('/admin/logout', (req, res) => {
  res.clearCookie(ADMIN_COOKIE_NAME);
  res.json({ success: true, message: 'Đã đăng xuất.' });
});

// GET /api/auth/admin/me — kiểm tra phiên đăng nhập hiện tại
router.get('/admin/me', requireAdminApi, (req, res) => {
  res.json({ success: true, username: req.admin.username });
});

module.exports = router;
