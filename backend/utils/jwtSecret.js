// LƯU Ý BẢO MẬT: hãy đặt biến môi trường JWT_SECRET trên Render (một chuỗi
// ngẫu nhiên dài, bí mật) — dùng chung cho cả phiên đăng nhập Admin lẫn
// người xem. Nếu không đặt, server tự sinh 1 secret ngẫu nhiên mỗi lần khởi
// động — nghĩa là mọi phiên đăng nhập sẽ bị đăng xuất mỗi khi Render khởi
// động lại server (free tier hay bị "spin down" nên việc này sẽ xảy ra khá
// thường xuyên). Đặt JWT_SECRET cố định trên Render để tránh việc này.
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  console.warn('⚠️  Chưa đặt JWT_SECRET trong Environment — dùng secret ngẫu nhiên tạm thời (mọi phiên đăng nhập sẽ mất khi server khởi động lại). Hãy đặt JWT_SECRET trên Render để tránh việc này.');
  return require('crypto').randomBytes(48).toString('hex');
})();

module.exports = JWT_SECRET;
