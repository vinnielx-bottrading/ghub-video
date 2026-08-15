const jwt = require('jsonwebtoken');
const JWT_SECRET = require('../utils/jwtSecret');
const { parseCookies } = require('../utils/cookies');

const ADMIN_COOKIE_NAME = 'ghubx_admin_token';
const TOKEN_TTL = '12h';

function signAdminToken(adminUser) {
  return jwt.sign(
    { sub: adminUser._id.toString(), username: adminUser.username, role: 'admin' },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );
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
