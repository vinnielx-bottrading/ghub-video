// Nhận diện & phân giải "nguồn video" mà admin dán vào ô Thêm Video:
// - Link YouTube (watch/share/short link)
// - Link Vimeo
// - Link Dailymotion
// - Link TikTok
// - Mã nhúng <iframe> từ bất kỳ trang streaming nào (mixdrop, streamtape, doodstream...)
// - Link trực tiếp .mp4 / .m3u8 / ...
// Không dùng bất kỳ API key nào — chỉ dùng oEmbed công khai (Vimeo, TikTok,
// Dailymotion, YouTube) và quy ước URL thumbnail công khai (YouTube, Dailymotion).

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

async function fetchOEmbed(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(OEMBED_TIMEOUT_MS) });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    return null; // hết giờ / lỗi mạng — bỏ qua, gọi nơi dùng tự có fallback
  }
}

async function fetchVimeoOEmbed(vimeoId) {
  return fetchOEmbed(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent('https://vimeo.com/' + vimeoId)}`);
}

// TikTok có oEmbed công khai chính thức, không cần app token — nhận thẳng
// URL video gốc (không cần tự tách ID).
async function fetchTikTokOEmbed(originalUrl) {
  return fetchOEmbed(`https://www.tiktok.com/oembed?url=${encodeURIComponent(originalUrl)}`);
}

async function fetchYouTubeOEmbed(youtubeId) {
  return fetchOEmbed(
    `https://www.youtube.com/oembed?url=${encodeURIComponent('https://www.youtube.com/watch?v=' + youtubeId)}&format=json`
  );
}

async function fetchDailymotionOEmbed(dailymotionId) {
  return fetchOEmbed(
    `https://www.dailymotion.com/services/oembed?url=${encodeURIComponent('https://www.dailymotion.com/video/' + dailymotionId)}`
  );
}

// Nhận diện các nền tảng có cách suy thumbnail công khai đã biết — dùng
// chung cho cả trường hợp dán link trực tiếp LẪN trường hợp src bên trong
// mã nhúng <iframe> hoá ra lại là 1 trong các nền tảng này.
//
// LƯU Ý: chỉ gọi oEmbed khi bản thân cách suy thumbnail đã cần gọi nó rồi
// (Vimeo, TikTok) — tiện thể lấy luôn `title` mà không tốn thêm request nào.
// YouTube/Dailymotion dùng quy ước URL (không cần gọi mạng) nên `title` để
// null ở bước này — muốn có tiêu đề thật cho 2 nền tảng này phải gọi riêng
// `fetchTitleForResolved()` (chỉ dùng khi thực sự cần, vd chế độ Thêm hàng
// loạt — để không làm chậm luồng Thêm 1 video bình thường).
async function resolveKnownPlatform(input) {
  if (/(youtube\.com|youtu\.be)/i.test(input)) {
    const id = extractYouTubeId(input);
    if (!id) return null;
    return {
      platform: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${id}`,
      thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
      title: null,
    };
  }
  if (/vimeo\.com/i.test(input)) {
    const id = extractVimeoId(input);
    if (!id) return null;
    const data = await fetchVimeoOEmbed(id);
    return {
      platform: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${id}`,
      thumbnail: data?.thumbnail_url || null,
      title: data?.title || null,
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
      title: null,
    };
  }
  if (/tiktok\.com/i.test(input)) {
    const id = extractTikTokId(input);
    if (!id) return null;
    const data = await fetchTikTokOEmbed(input);
    return {
      platform: 'tiktok',
      embedUrl: `https://www.tiktok.com/embed/v2/${id}`,
      thumbnail: data?.thumbnail_url || null,
      title: data?.title || null,
    };
  }
  return null;
}

// Phân giải 1 chuỗi nguồn (link hoặc mã nhúng) do admin dán vào, trả về đầy đủ
// thông tin cần thiết để lưu Video: sourceType, platform, embedUrl, videoUrl,
// thumbnail (có thể null nếu không tự suy ra được ở bước này — khi đó
// videoController sẽ tự tạo ảnh bìa placeholder từ tiêu đề video), title
// (thường null trừ Vimeo/TikTok — xem ghi chú ở resolveKnownPlatform).
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
      title: known.title,
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
        title: known.title,
      };
    }

    return {
      success: true,
      sourceType: 'iframe',
      platform: 'other',
      embedUrl: src,
      videoUrl: src,
      thumbnail: null, // không có API công khai để tự suy — sẽ dùng ảnh placeholder
      title: null,
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
    title: null,
  };
}

// Lấy tiêu đề THẬT cho 1 kết quả đã resolveVideoSource() nhưng chưa có sẵn
// title (YouTube/Dailymotion không tự gọi oEmbed ở bước resolve để giữ luồng
// Thêm 1 video nhanh). CHỈ gọi hàm này khi thực sự cần tiêu đề tự động —
// hiện dùng cho chế độ "Thêm hàng loạt" khi admin không tự đặt tiêu đề riêng.
async function fetchTitleForResolved(resolved) {
  if (!resolved) return null;
  if (resolved.title) return resolved.title;

  if (resolved.platform === 'youtube') {
    const id = extractYouTubeId(resolved.embedUrl) || extractYouTubeId(resolved.videoUrl);
    if (!id) return null;
    const data = await fetchYouTubeOEmbed(id);
    return data?.title || null;
  }
  if (resolved.platform === 'dailymotion') {
    const id = extractDailymotionId(resolved.embedUrl) || extractDailymotionId(resolved.videoUrl);
    if (!id) return null;
    const data = await fetchDailymotionOEmbed(id);
    return data?.title || null;
  }
  return null;
}

module.exports = {
  detectSourceType,
  extractYouTubeId,
  extractVimeoId,
  extractDailymotionId,
  extractTikTokId,
  extractIframeSrc,
  resolveVideoSource,
  fetchTitleForResolved,
};
