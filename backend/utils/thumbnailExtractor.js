// Tự động trích thumbnail tĩnh VÀ ảnh xem trước dạng GIF ngắn từ video (file
// cục bộ hoặc URL trực tiếp), dùng ffmpeg-static (binary ffmpeg đóng gói sẵn
// qua npm — không cần cài đặt hệ thống, hoạt động được trên Render).
const ffmpegPath = require('ffmpeg-static');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const THUMBNAIL_TIMEOUT_MS = 20000;
const GIF_TIMEOUT_MS = 30000; // dựng GIF nặng hơn trích 1 khung hình — cho thêm thời gian

// Chạy ffmpeg với danh sách args cho trước, chờ tối đa timeoutMs. Trả về
// true/false (thành công hay không) — KHÔNG throw, để 1 bước tối ưu thất bại
// không bao giờ làm chặn việc tạo video.
function runFfmpeg(args, timeoutMs) {
  return new Promise((resolve) => {
    if (!ffmpegPath || !fs.existsSync(ffmpegPath)) {
      console.warn('⚠️  Không tìm thấy binary ffmpeg-static — bỏ qua bước xử lý video này.');
      return resolve(false);
    }

    let settled = false;
    const proc = spawn(ffmpegPath, args);

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        proc.kill('SIGKILL');
      } catch (error) {
        /* ignore */
      }
      resolve(false);
    }, timeoutMs);

    proc.on('error', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(false);
    });

    proc.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(code === 0);
    });
  });
}

function ensureDir(dir) {
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return true;
  } catch (error) {
    return false;
  }
}

// Trả về TÊN FILE (không phải đường dẫn đầy đủ) của ảnh thumbnail tĩnh đã
// trích được, lưu trong outputDir. Trả về null nếu thất bại vì bất kỳ lý do
// gì (không có ffmpeg, video lỗi, quá thời gian chờ...).
async function extractThumbnailFromVideo(inputPathOrUrl, outputDir) {
  if (!ensureDir(outputDir)) return null;

  const outputFileName = `auto-${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
  const outputPath = path.join(outputDir, outputFileName);

  // -ss 2s: lấy khung hình ở giây thứ 2 (tránh khung hình đen đầu video)
  const args = ['-y', '-ss', '00:00:02', '-i', inputPathOrUrl, '-frames:v', '1', '-q:v', '3', outputPath];

  const ok = await runFfmpeg(args, THUMBNAIL_TIMEOUT_MS);
  return ok && fs.existsSync(outputPath) ? outputFileName : null;
}

// Trả về TÊN FILE của 1 đoạn GIF ngắn (~3 giây, không tiếng) trích từ video,
// dùng làm ảnh xem trước khi rê chuột vào thẻ video (giống YouTube). Dùng
// palettegen/paletteuse — kỹ thuật chuẩn của ffmpeg để GIF nhẹ mà vẫn rõ nét.
// Trả về null nếu thất bại (không chặn việc tạo video).
async function extractPreviewGif(inputPathOrUrl, outputDir) {
  if (!ensureDir(outputDir)) return null;

  const outputFileName = `preview-${Date.now()}-${Math.round(Math.random() * 1e9)}.gif`;
  const outputPath = path.join(outputDir, outputFileName);

  const filter = 'fps=8,scale=320:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse';
  const args = [
    '-y',
    '-ss', '00:00:02',
    '-t', '3',
    '-i', inputPathOrUrl,
    '-vf', filter,
    '-loop', '0',
    outputPath,
  ];

  const ok = await runFfmpeg(args, GIF_TIMEOUT_MS);
  return ok && fs.existsSync(outputPath) ? outputFileName : null;
}

module.exports = { extractThumbnailFromVideo, extractPreviewGif };
