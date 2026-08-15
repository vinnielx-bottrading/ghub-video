// Nhận diện & phân giải "nguồn video" mà admin dán vào ô Thêm Video:
// - Link YouTube (watch/share/short link)
// - Link Vimeo
// - Mã nhúng <iframe> từ bất kỳ trang streaming nào
// - Link trực tiếp .mp4 / .m3u8 / ...
// Không dùng bất kỳ API key nào — chỉ dùng oEmbed công khai của Vimeo và
// quy ước URL thumbnail công khai của YouTube.

const OEMBED_TIMEOUT_MS = 6000;

function detectSourceType(rawInput) {
  const input = (rawInput || '').trim();
  if (!input) return null;
  if (/<iframe[\s\S]*src\s*=/i.test(input)) return 'iframe';
  if (/(youtube\.com|youtu\.be)/i.test(input)) return 'youtube';
  if (/vimeo\.com/i.test(input)) return 'vimeo';
  if (/^https?:\/\//i.test(input)) return 'direct';
  return null;
}

function extractYouTubeId(input) {
  const match = input.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

function extractVimeoId(input) {
  const match = input.match(/vimeo\.com\/(?:video\/|external\/)?(\d+)/);
  return match ? match[1] : null;
}

// Trích src từ mã nhúng <iframe>. Chấp nhận cả trường hợp src không có
// ngoặc kép (hiếm nhưng vẫn hợp lệ HTML) và link dạng protocol-relative
// (//host/...) hay gặp ở các trang nhúng như mixdrop/streamtape/doodstream...
// Chỉ chấp nhận kết quả là link http/https để tránh chèn src kiểu
// "javascript:" hoặc "data:" độc hại qua ô dán mã nhúng.
function extractIframeSrc(html) {
  let match = html.match(/<iframe[^>]+src\s*=\s*["']([^"']+)["']/i);
  if (!match) {
    match = html.match(/<iframe[^>]+src\s*=\s*([^\s"'>]+)/i);
  }
  if (!match) return null;

  let src = match[1].trim();
  if (src.startsWith('//')) src = 'https:' + src; // chuẩn hoá link protocol-relative

  if (!/^https:\/\//i.test(src) && !/^http:\/\//i.test(src)) return null;
  return src;
}

async function fetchVimeoThumbnail(vimeoId) {
  try {
    const url = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent('https://vimeo.com/' + vimeoId)}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(OEMBED_TIMEOUT_MS) });
    if (!response.ok) return null;
    const data = await response.json();
    return data.thumbnail_url || null;
  } catch (error) {
    return null; // không lấy được thumbnail qua oEmbed — sẽ dùng ảnh mặc định
  }
}

// Phân giải 1 chuỗi nguồn (link hoặc mã nhúng) do admin dán vào, trả về đầy đủ
// thông tin cần thiết để lưu Video: sourceType, platform, embedUrl, videoUrl,
// thumbnail (có thể null nếu không tự suy ra được ở bước này).
async function resolveVideoSource(rawInput) {
  const input = (rawInput || '').trim();
  const sourceType = detectSourceType(input);

  if (!sourceType) {
    return { success: false, message: 'Không nhận diện được liên kết hoặc mã nhúng video.' };
  }

  if (sourceType === 'youtube') {
    const id = extractYouTubeId(input);
    if (!id) {
      return { success: false, message: 'Không tìm thấy ID video YouTube hợp lệ trong liên kết.' };
    }
    const embedUrl = `https://www.youtube.com/embed/${id}`;
    return {
      success: true,
      sourceType: 'youtube',
      platform: 'youtube',
      embedUrl,
      videoUrl: embedUrl,
      thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    };
  }

  if (sourceType === 'vimeo') {
    const id = extractVimeoId(input);
    if (!id) {
      return { success: false, message: 'Không tìm thấy ID video Vimeo hợp lệ trong liên kết.' };
    }
    const embedUrl = `https://player.vimeo.com/video/${id}`;
    const thumbnail = await fetchVimeoThumbnail(id);
    return {
      success: true,
      sourceType: 'vimeo',
      platform: 'vimeo',
      embedUrl,
      videoUrl: embedUrl,
      thumbnail,
    };
  }

  if (sourceType === 'iframe') {
    const src = extractIframeSrc(input);
    if (!src) {
      return { success: false, message: 'Không tìm thấy thuộc tính src trong mã nhúng iframe.' };
    }

    // Nếu src thực chất là YouTube/Vimeo thì vẫn tận dụng được cách suy thumbnail đã biết.
    if (/(youtube\.com|youtu\.be)/i.test(src)) {
      const id = extractYouTubeId(src);
      if (id) {
        return {
          success: true,
          sourceType: 'iframe',
          platform: 'youtube',
          embedUrl: src,
          videoUrl: src,
          thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
        };
      }
    }
    if (/vimeo\.com/i.test(src)) {
      const id = extractVimeoId(src);
      if (id) {
        return {
          success: true,
          sourceType: 'iframe',
          platform: 'vimeo',
          embedUrl: src,
          videoUrl: src,
          thumbnail: await fetchVimeoThumbnail(id),
        };
      }
    }

    return {
      success: true,
      sourceType: 'iframe',
      platform: 'other',
      embedUrl: src,
      videoUrl: src,
      thumbnail: null, // không có cách chung để tự suy — admin có thể nhập tay
    };
  }

  // Link trực tiếp (.mp4 / .m3u8 / ...): thumbnail sẽ được trích bằng ffmpeg
  // ở bước lưu video (không làm ở bước xem trước để tránh chậm/timeout).
  return {
    success: true,
    sourceType: 'direct',
    platform: 'direct',
    embedUrl: '',
    videoUrl: input,
    thumbnail: null,
  };
}

module.exports = {
  detectSourceType,
  extractYouTubeId,
  extractVimeoId,
  extractIframeSrc,
  fetchVimeoThumbnail,
  resolveVideoSource,
};
