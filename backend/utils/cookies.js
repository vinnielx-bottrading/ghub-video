// Cookie parser thủ công tối giản, dùng chung cho cả admin & viewer auth
// (không cần thêm dependency cookie-parser).
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

module.exports = { parseCookies };
