// Nhận diện & phân giải "nguồn video" mà admin dán vào ô Thêm Video:
// - Link YouTube (watch/share/short link)
// - Link Vimeo
// - Link Dailymotion
// - Link TikTok
// - Mã nhúng <iframe> từ bất kỳ trang streaming nào (mixdrop, streamtape, doodstream...)
// - Link trực tiếp .mp4 / .m3u8 / ...
// Không dùng bất kỳ API key nào — chỉ dùng oEmbed công khai (Vimeo, TikTok)
// và quy ước URL thumbnail công khai (YouTube, Dailymotion).

const OEMBED_TIMEOUT_MS = 6000;

function detectSourceType(rawInput) {
  const input = (rawInput || '').trim();
  if (!input) return null;
  if (/<iframe[\s\S]*src\s*=/i.test(input)) return 'iframe';
  if (/(youtube\.com|youtu\.be)/i.test(input)) return 'youtube';
  if (/vimeo\.com/i.test(input)) return 'vimeo';
  if (/(dailymotion\.com|dai\.ly)/i.test(input)) return 'dailymotion';
  if (/tiktok\.com/i.test(input)) return 'tiktok';
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

function extractDailymotionId(input) {
  const match = input.match(/(?:dailymotion\.com\/(?:video|embed\/video)\/|dai\.ly\/)([a-zA-Z0-9]+)/);
  return match ? match[1].split('_')[0] : null;
}

function extractTikTokId(input) {
  const match = input.match(/tiktok\.com\/[^/]+\/video\/(\d+)/);
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

// TikTok có oEmbed công khai chính thức, không cần app token — nhận thẳng
// URL video gốc (không cần tự tách ID) và trả về thumbnail_url thật.
async function fetchTikTokThumbnail(originalUrl) {
  try {
    const url = `https://www.tiktok.com/oembed?url=${encodeURIComponent(originalUrl)}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(OEMBED_TIMEOUT_MS) });
    if (!response.ok) return null;
    const data = await response.json();
    return data.thumbnail_url || null;
  } catch (error) {
    return null;
  }
}

// Nhận diện các nền tảng có cách suy thumbnail công khai đã biết — dùng
// chung cho cả trường hợp dán link trực tiếp LẪN trường hợp src bên trong
// mã nhúng <iframe> hoá ra lại là 1 trong các nền tảng này.
async function resolveKnownPlatform(input) {
  if (/(youtube\.com|youtu\.be)/i.test(input)) {
    const id = extractYouTubeId(input);
    if (!id) return null;
    return {
      platform: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${id}`,
      thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    };
  }
  if (/vimeo\.com/i.test(input)) {
    const id = extractVimeoId(input);
    if (!id) return null;
    return {
      platform: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${id}`,
      thumbnail: await fetchVimeoThumbnail(id),
    };
  }
  if (/(dailymotion\.com|dai\.ly)/i.test(input)) {
    const id = extractDailymotionId(input);
    if (!id) return null;
    return {
      platform: 'dailymotion',
      embedUrl: `https://www.dailymotion.com/embed/video/${id}`,
      // Dailymotion có quy ước URL thumbnail công khai, không cần gọi API.
      thumbnail: `https://www.dailymotion.com/thumbnail/video/${id}`,
    };
  }
  if (/tiktok\.com/i.test(input)) {
    const id = extractTikTokId(input);
    if (!id) return null;
    return {
      platform: 'tiktok',
      embedUrl: `https://www.tiktok.com/embed/v2/${id}`,
      thumbnail: await fetchTikTokThumbnail(input),
    };
  }
  return null;
}

// Phân giải 1 chuỗi nguồn (link hoặc mã nhúng) do admin dán vào, trả về đầy đủ
// thông tin cần thiết để lưu Video: sourceType, platform, embedUrl, videoUrl,
// thumbnail (có thể null nếu không tự suy ra được ở bước này — khi đó
// videoController sẽ tự tạo ảnh bìa placeholder từ tiêu đề video).
async function resolveVideoSource(rawInput) {
  const input = (rawInput || '').trim();
  const sourceType = detectSourceType(input);

  if (!sourceType) {
    return { success: false, message: 'Không nhận diện được liên kết hoặc mã nhúng video.' };
  }

  if (['youtube', 'vimeo', 'dailymotion', 'tiktok'].includes(sourceType)) {
    const known = await resolveKnownPlatform(input);
    if (!known) {
      return { success: false, message: `Không tìm thấy ID video hợp lệ trong liên kết ${sourceType}.` };
    }
    return {
      success: true,
      sourceType,
      platform: known.platform,
      embedUrl: known.embedUrl,
      videoUrl: known.embedUrl,
      thumbnail: known.thumbnail,
    };
  }

  if (sourceType === 'iframe') {
    const src = extractIframeSrc(input);
    if (!src) {
      return { success: false, message: 'Không tìm thấy thuộc tính src trong mã nhúng iframe.' };
    }

    // Nếu src thực chất là 1 trong các nền tảng đã biết (YouTube/Vimeo/
    // Dailymotion/TikTok nhúng qua iframe) thì vẫn tận dụng được cách suy
    // thumbnail tương ứng.
    const known = await resolveKnownPlatform(src);
    if (known) {
      return {
        success: true,
        sourceType: 'iframe',
        platform: known.platform,
        embedUrl: src,
        videoUrl: src,
        thumbnail: known.thumbnail,
      };
    }

    return {
      success: true,
      sourceType: 'iframe',
      platform: 'other',
      embedUrl: src,
      videoUrl: src,
      thumbnail: null, // không có API công khai để tự suy — sẽ dùng ảnh placeholder
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
  extractDailymotionId,
  extractTikTokId,
  extractIframeSrc,
  fetchVimeoThumbnail,
  fetchTikTokThumbnail,
  resolveVideoSource,
};
