const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();

const AdminUser = require('../models/AdminUser');
const User = require('../models/User');

const { signAdminToken, ADMIN_COOKIE_NAME, requireAdminApi } = require('../middleware/adminAuth');
const {
  signUserToken,
  signCaptchaToken,
  verifyCaptchaToken,
  getCaptchaTokenFromRequest,
  requireUser,
  USER_COOKIE_NAME,
  CAPTCHA_COOKIE_NAME,
} = require('../middleware/userAuth');
const { generateCaptchaText, renderCaptchaSVG } = require('../utils/captcha');

const isProd = process.env.NODE_ENV === 'production';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ==========================================================================
// ADMIN
// ==========================================================================

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

// ==========================================================================
// VIEWER (người xem) — đăng ký / đăng nhập + CAPTCHA tự sinh, không dùng
// API key hay dịch vụ CAPTCHA bên ngoài nào.
// ==========================================================================

// GET /api/auth/captcha — trả về ảnh SVG captcha, đồng thời set cookie chứa
// mã đáp án đã ký (JWT, hết hạn sau 5 phút, dùng 1 lần).
router.get('/captcha', (req, res) => {
  const text = generateCaptchaText(5);
  const token = signCaptchaToken(text);

  res.cookie(CAPTCHA_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 5 * 60 * 1000,
  });
  res.set('Cache-Control', 'no-store');
  res.type('image/svg+xml').send(renderCaptchaSVG(text));
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, confirmPassword, captcha } = req.body;

    if (!username || !email || !password || !confirmPassword || !captcha) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin.' });
    }
    if (username.trim().length < 3) {
      return res.status(400).json({ success: false, message: 'Tên đăng nhập cần ít nhất 3 ký tự.' });
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'Email không hợp lệ.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu cần ít nhất 6 ký tự.' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Mật khẩu nhập lại không khớp.' });
    }

    // Xác thực CAPTCHA trước — dùng 1 lần, luôn xoá cookie captcha sau khi
    // kiểm tra (dù đúng hay sai) để buộc phải tải mã mới cho lần thử tiếp theo.
    const captchaToken = getCaptchaTokenFromRequest(req);
    const expectedCaptcha = captchaToken ? verifyCaptchaToken(captchaToken) : null;
    res.clearCookie(CAPTCHA_COOKIE_NAME);

    if (!expectedCaptcha) {
      return res.status(400).json({ success: false, message: 'Mã CAPTCHA đã hết hạn, vui lòng tải lại.' });
    }
    if (captcha.trim().toUpperCase() !== expectedCaptcha) {
      return res.status(400).json({ success: false, message: 'Mã CAPTCHA không đúng.' });
    }

    const existing = await User.findOne({
      $or: [{ username: username.trim() }, { email: email.trim().toLowerCase() }],
    });
    if (existing) {
      const isUsernameTaken = existing.username === username.trim();
      return res.status(409).json({
        success: false,
        message: isUsernameTaken ? 'Tên đăng nhập đã được sử dụng.' : 'Email đã được sử dụng.',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
    });

    const token = signUserToken(user);
    res.cookie(USER_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 ngày
    });
    res.status(201).json({ success: true, message: 'Đăng ký thành công!', username: user.username });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Tên đăng nhập hoặc email đã được sử dụng.' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/auth/login — đăng nhập bằng tên đăng nhập hoặc email
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên đăng nhập và mật khẩu.' });
    }

    const identifier = username.trim();
    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier.toLowerCase() }],
    });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Sai tên đăng nhập hoặc mật khẩu.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Sai tên đăng nhập hoặc mật khẩu.' });
    }

    const token = signUserToken(user);
    res.cookie(USER_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 ngày
    });
    res.json({ success: true, message: 'Đăng nhập thành công.', username: user.username });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie(USER_COOKIE_NAME);
  res.json({ success: true, message: 'Đã đăng xuất.' });
});

// GET /api/auth/me — kiểm tra phiên đăng nhập người xem hiện tại
router.get('/me', requireUser, (req, res) => {
  res.json({ success: true, username: req.user.username });
});

module.exports = router;
