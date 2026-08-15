const jwt = require('jsonwebtoken');
const JWT_SECRET = require('../utils/jwtSecret');
const { parseCookies } = require('../utils/cookies');

const USER_COOKIE_NAME = 'ghubx_user_token';
const CAPTCHA_COOKIE_NAME = 'ghubx_captcha_token';
const USER_TOKEN_TTL = '30d';
const CAPTCHA_TTL = '5m';

function signUserToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), username: user.username },
    JWT_SECRET,
    { expiresIn: USER_TOKEN_TTL }
  );
}

function signCaptchaToken(text) {
  return jwt.sign({ captcha: text.toUpperCase() }, JWT_SECRET, { expiresIn: CAPTCHA_TTL });
}

// Trả về mã captcha đúng (đã ký) nếu token còn hạn & hợp lệ, ngược lại null.
function verifyCaptchaToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.captcha || null;
  } catch (error) {
    return null;
  }
}

function getUserTokenFromRequest(req) {
  const cookies = parseCookies(req);
  return cookies[USER_COOKIE_NAME] || null;
}

function getCaptchaTokenFromRequest(req) {
  const cookies = parseCookies(req);
  return cookies[CAPTCHA_COOKIE_NAME] || null;
}

// Middleware bảo vệ API cần đăng nhập người xem: trả JSON 401 nếu chưa đăng nhập.
function requireUser(req, res, next) {
  const token = getUserTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ success: false, message: 'Cần đăng nhập để thực hiện thao tác này.' });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ.' });
  }
}

// Middleware không bắt buộc đăng nhập, chỉ gắn req.user nếu có token hợp lệ.
function optionalUser(req, res, next) {
  const token = getUserTokenFromRequest(req);
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      // token hết hạn/không hợp lệ — bỏ qua, coi như chưa đăng nhập
    }
  }
  next();
}

module.exports = {
  signUserToken,
  signCaptchaToken,
  verifyCaptchaToken,
  getUserTokenFromRequest,
  getCaptchaTokenFromRequest,
  requireUser,
  optionalUser,
  USER_COOKIE_NAME,
  CAPTCHA_COOKIE_NAME,
};
