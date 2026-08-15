const jwt = require('jsonwebtoken');

// LƯU Ý BẢO MẬT: hãy đặt biến môi trường JWT_SECRET trên Render (một chuỗi
// ngẫu nhiên dài, bí mật). Nếu không đặt, server tự sinh 1 secret ngẫu nhiên
// mỗi lần khởi động — nghĩa là mọi phiên đăng nhập admin sẽ bị đăng xuất mỗi
// khi Render khởi động lại server (free tier hay bị "spin down" nên việc này
// sẽ xảy ra khá thường xuyên). Đặt JWT_SECRET cố định để tránh việc này.
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  console.warn('⚠️  Chưa đặt JWT_SECRET trong Environment — dùng secret ngẫu nhiên tạm thời (phiên đăng nhập admin sẽ mất khi server khởi động lại). Hãy đặt JWT_SECRET trên Render để tránh việc này.');
  return require('crypto').randomBytes(48).toString('hex');
})();

const ADMIN_COOKIE_NAME = 'ghubx_admin_token';
const TOKEN_TTL = '12h';

function signAdminToken(adminUser) {
  return jwt.sign(
    { sub: adminUser._id.toString(), username: adminUser.username, role: 'admin' },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

// Cookie parser thủ công tối giản (không cần thêm dependency cookie-parser).
function parseCookies(req) {
  const header = req.headers.cookie;
  const cookies = {};
  if (!header) return cookies;
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const value = decodeURIComponent(pair.slice(idx + 1).trim());
    cookies[key] = value;
  });
  return cookies;
}

function getTokenFromRequest(req) {
  const cookies = parseCookies(req);
  if (cookies[ADMIN_COOKIE_NAME]) return cookies[ADMIN_COOKIE_NAME];
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) return authHeader.slice(7);
  return null;
}

// Middleware bảo vệ API: trả JSON 401 nếu chưa đăng nhập.
function requireAdminApi(req, res, next) {
  const token = getTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ success: false, message: 'Cần đăng nhập Admin để thực hiện thao tác này.' });
  }
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Phiên đăng nhập Admin đã hết hạn hoặc không hợp lệ.' });
  }
}

// Middleware bảo vệ trang HTML: redirect sang trang login nếu chưa đăng nhập.
function requireAdminPage(req, res, next) {
  const token = getTokenFromRequest(req);
  if (!token) return res.redirect('/admin-login.html');
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    return res.redirect('/admin-login.html');
  }
}

module.exports = {
  signAdminToken,
  requireAdminApi,
  requireAdminPage,
  getTokenFromRequest,
  ADMIN_COOKIE_NAME,
};
