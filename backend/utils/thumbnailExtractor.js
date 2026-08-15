// Tự động trích 1 khung hình từ video (file cục bộ hoặc URL trực tiếp) để làm
// thumbnail, dùng ffmpeg-static (binary ffmpeg đóng gói sẵn qua npm — không
// cần cài đặt hệ thống, hoạt động được trên Render).
const ffmpegPath = require('ffmpeg-static');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const EXTRACT_TIMEOUT_MS = 20000;

// Trả về TÊN FILE (không phải đường dẫn đầy đủ) của ảnh thumbnail đã trích
// được, lưu trong outputDir. Trả về null nếu thất bại vì bất kỳ lý do gì
// (không có ffmpeg, video lỗi, quá thời gian chờ...) — KHÔNG throw, để việc
// tạo video không bao giờ bị chặn chỉ vì bước tối ưu này thất bại.
function extractThumbnailFromVideo(inputPathOrUrl, outputDir) {
  return new Promise((resolve) => {
    if (!ffmpegPath || !fs.existsSync(ffmpegPath)) {
      console.warn('⚠️  Không tìm thấy binary ffmpeg-static — bỏ qua bước tự trích thumbnail.');
      return resolve(null);
    }

    try {
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    } catch (error) {
      return resolve(null);
    }

    const outputFileName = `auto-${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
    const outputPath = path.join(outputDir, outputFileName);

    // -ss 2s: lấy khung hình ở giây thứ 2 (tránh khung hình đen đầu video)
    const args = ['-y', '-ss', '00:00:02', '-i', inputPathOrUrl, '-frames:v', '1', '-q:v', '3', outputPath];

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
      resolve(null);
    }, EXTRACT_TIMEOUT_MS);

    proc.on('error', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(null);
    });

    proc.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code === 0 && fs.existsSync(outputPath)) {
        resolve(outputFileName);
      } else {
        resolve(null);
      }
    });
  });
}

module.exports = { extractThumbnailFromVideo };
