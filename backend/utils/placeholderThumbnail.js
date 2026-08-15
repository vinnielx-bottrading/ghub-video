// Tạo ảnh bìa "placeholder" (SVG, nhúng thẳng dạng data URI — không cần lưu
// file, không cần gọi mạng ngoài, không cần thư viện canvas) cho các video
// KHÔNG có cách nào tự suy ra thumbnail thật (vd: nhúng iframe từ nguồn lạ
// như mixdrop/streamtape không có API công khai để lấy ảnh). Thay vì hiện
// 1 tấm ảnh chung chung không liên quan, ảnh này có tên video + màu sắc
// theo thương hiệu GHUB X.

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Bọc tiêu đề thành tối đa `maxLines` dòng, ước lượng theo số ký tự (không
// đo pixel thật vì không dùng canvas) — đủ dùng cho 1 ảnh bìa, không cần
// chính xác tuyệt đối.
function wrapTitle(title, charsPerLine, maxLines) {
  const words = (title || 'GHUB X').trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > charsPerLine && current) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    } else {
      current = candidate;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);

  const consumedWords = lines.join(' ').split(/\s+/).length;
  if (lines.length === maxLines && consumedWords < words.length) {
    let last = lines[maxLines - 1];
    if (last.length > charsPerLine - 1) last = last.slice(0, charsPerLine - 1);
    lines[maxLines - 1] = last.replace(/\s+\S*$/, '') + '…';
  }

  return lines.length ? lines : ['GHUB X'];
}

const GRADIENTS = [
  ['#ff3358', '#191e2c'],
  ['#7c3aed', '#191e2c'],
  ['#0ea5e9', '#191e2c'],
  ['#f59e0b', '#191e2c'],
  ['#10b981', '#191e2c'],
];

function pickGradient(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return GRADIENTS[hash % GRADIENTS.length];
}

function generatePlaceholderThumbnail(title) {
  const width = 800;
  const height = 450;
  const safeSeed = escapeXml(title || 'GHUB X');
  const lines = wrapTitle(title, 24, 2);
  const [c1, c2] = pickGradient(safeSeed);
  const gradId = 'g' + Math.abs([...safeSeed].reduce((a, c) => a + c.charCodeAt(0), 0));

  const lineHeight = 42;
  const startY = height / 2 - ((lines.length - 1) * lineHeight) / 2 + 62;

  const textLines = lines
    .map(
      (line, i) =>
        `<text x="50%" y="${startY + i * lineHeight}" text-anchor="middle" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="32" font-weight="800" fill="#ffffff">${escapeXml(line)}</text>`
    )
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#${gradId})"/>
  <circle cx="${width / 2}" cy="${height / 2 - 36}" r="42" fill="rgba(255,255,255,0.15)"/>
  <path d="M ${width / 2 - 12} ${height / 2 - 54} L ${width / 2 - 12} ${height / 2 - 18} L ${width / 2 + 20} ${height / 2 - 36} Z" fill="#ffffff"/>
  ${textLines}
  <text x="50%" y="${height - 24}" text-anchor="middle" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="16" font-weight="700" fill="rgba(255,255,255,0.55)" letter-spacing="2">GHUB X</text>
</svg>`;

  const base64 = Buffer.from(svg, 'utf8').toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

module.exports = { generatePlaceholderThumbnail };
