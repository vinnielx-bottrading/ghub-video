// CAPTCHA tự sinh hoàn toàn ở backend (SVG vẽ bằng string thuần) — KHÔNG
// dùng bất kỳ dịch vụ/API key bên ngoài nào (không reCAPTCHA, không hCaptcha).

// Bỏ các ký tự dễ gây nhầm lẫn: 0/O, 1/I/L
const CAPTCHA_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CAPTCHA_COLORS = ['#ff3358', '#ff5e7e', '#94a3b8', '#e2e8f0', '#64748b'];

function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

function generateCaptchaText(length = 5) {
  let text = '';
  for (let i = 0; i < length; i++) {
    text += CAPTCHA_CHARS[Math.floor(Math.random() * CAPTCHA_CHARS.length)];
  }
  return text;
}

// Vẽ text CAPTCHA thành 1 ảnh SVG có nhiễu (đường kẻ, chấm nhiễu) và mỗi ký
// tự được xoay/lệch/tô màu ngẫu nhiên riêng — đủ gây khó cho bot OCR đơn
// giản mà không cần thư viện canvas (native binding, khó cài trên Render).
function renderCaptchaSVG(text) {
  const width = 160;
  const height = 60;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  svg += `<rect width="100%" height="100%" fill="#191e2c"/>`;

  // Đường nhiễu
  for (let i = 0; i < 6; i++) {
    const x1 = randomInRange(0, width).toFixed(1);
    const y1 = randomInRange(0, height).toFixed(1);
    const x2 = randomInRange(0, width).toFixed(1);
    const y2 = randomInRange(0, height).toFixed(1);
    const color = CAPTCHA_COLORS[Math.floor(Math.random() * CAPTCHA_COLORS.length)];
    svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-opacity="0.25" stroke-width="1.5"/>`;
  }

  // Chấm nhiễu
  for (let i = 0; i < 30; i++) {
    const cx = randomInRange(0, width).toFixed(1);
    const cy = randomInRange(0, height).toFixed(1);
    const color = CAPTCHA_COLORS[Math.floor(Math.random() * CAPTCHA_COLORS.length)];
    svg += `<circle cx="${cx}" cy="${cy}" r="1" fill="${color}" fill-opacity="0.4"/>`;
  }

  // Từng ký tự: vị trí, xoay, cỡ chữ, màu ngẫu nhiên riêng
  const charSlot = width / (text.length + 1);
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const x = (charSlot * (i + 1)).toFixed(1);
    const y = (height / 2 + randomInRange(-6, 6)).toFixed(1);
    const rotate = randomInRange(-25, 25).toFixed(1);
    const fontSize = Math.round(randomInRange(26, 34));
    const color = CAPTCHA_COLORS[Math.floor(Math.random() * CAPTCHA_COLORS.length)];
    svg += `<text x="${x}" y="${y}" font-size="${fontSize}" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-weight="800" fill="${color}" text-anchor="middle" transform="rotate(${rotate} ${x} ${y})">${char}</text>`;
  }

  svg += `</svg>`;
  return svg;
}

module.exports = { generateCaptchaText, renderCaptchaSVG };
