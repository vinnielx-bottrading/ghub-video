// ==========================================================================
// GHUB X - Frontend Application Logic with MongoDB API Integration
// ==========================================================================

// Khi trang được phục vụ trực tiếp bởi backend Express (backend/server.js) —
// đây là cách deploy được khuyến nghị (1 service Render duy nhất) — frontend
// và API luôn nằm cùng origin, nên chỉ cần gọi "/api" tương đối. Điều này
// tránh hẳn lỗi lệch domain khi tên service Render khác với giá trị hard-code.
// Trường hợp local: chạy `node server.js` (port 3000, chỉ tĩnh) tách rời với
// `npm start` trong backend/ (port 5000) thì mới cần trỏ thẳng tới port 5000.
const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? (window.location.port === '5000' ? '/api' : 'http://localhost:5000/api')
  : `${window.location.origin}/api`;

document.addEventListener('DOMContentLoaded', () => {
  let videosData = [];
  let currentVideo = null;
  let activeCategory = "Tất cả";
  let isSubscribed = false;
  let isBackendConnected = false;

  // DOM Elements
  const videoGrid = document.getElementById('videoGrid');
  const categoryBar = document.getElementById('categoryBar');
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const sidebar = document.getElementById('sidebar');
  const menuToggleBtn = document.getElementById('menuToggleBtn');
  const navHomeBtn = document.getElementById('navHomeBtn');
  const sidebarCategoryList = document.getElementById('sidebarCategoryList');
  const toastContainer = document.getElementById('toastContainer');

  // Hero Banner Elements (slideshow ảnh thuần túy, không chữ — nội dung lấy
  // từ GET /api/hero-banners, do Admin toàn quyền quản lý trong trang quản
  // trị, xem initHero()/renderHeroSlideContent()).
  const heroSpotlight = document.getElementById('heroSpotlight');
  const heroBackdrop = document.getElementById('heroBackdrop');
  const heroSlideNav = document.getElementById('heroSlideNav');
  const heroPrevBtn = document.getElementById('heroPrevBtn');
  const heroNextBtn = document.getElementById('heroNextBtn');
  const heroDots = document.getElementById('heroDots');

  // Watch View Elements
  const watchOverlay = document.getElementById('watchOverlay');
  const closeWatchBtn = document.getElementById('closeWatchBtn');
  const mainVideoPlayer = document.getElementById('mainVideoPlayer');
  const embedVideoPlayer = document.getElementById('embedVideoPlayer');
  const playPauseBtn = document.getElementById('playPauseBtn');
  const progressBar = document.getElementById('progressBar');
  const progressContainer = document.getElementById('progressContainer');
  const timeDisplay = document.getElementById('timeDisplay');
  const volumeSlider = document.getElementById('volumeSlider');
  const muteBtn = document.getElementById('muteBtn');
  const speedSelect = document.getElementById('speedSelect');
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  const playerContainer = document.getElementById('playerContainer');
  const playerControls = document.getElementById('playerControls');

  const watchTitle = document.getElementById('watchTitle');
  const watchViewsDate = document.getElementById('watchViewsDate');
  const watchDesc = document.getElementById('watchDesc');
  const watchChannelAvatar = document.getElementById('watchChannelAvatar');
  const watchChannelName = document.getElementById('watchChannelName');
  const watchChannelSubs = document.getElementById('watchChannelSubs');
  const subscribeBtn = document.getElementById('subscribeBtn');
  const likeBtn = document.getElementById('likeBtn');
  const dislikeBtn = document.getElementById('dislikeBtn');
  const likeCountSpan = document.getElementById('likeCountSpan');
  const shareBtn = document.getElementById('shareBtn');
  const bookmarkBtn = document.getElementById('bookmarkBtn');
  const commentsList = document.getElementById('commentsList');
  const commentsCountTitle = document.getElementById('commentsCountTitle');
  const commentInput = document.getElementById('commentInput');
  const submitCommentBtn = document.getElementById('submitCommentBtn');
  const relatedVideosList = document.getElementById('relatedVideosList');

  // ==========================================================================
  // Helper Utilities
  // ==========================================================================
  function formatNumber(num) {
    if (typeof num === 'string') return num;
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    const icon = type === 'success' ? 'fa-circle-check' : 'fa-sparkles';
    const iconColor = type === 'success' ? 'style="color:#10b981;"' : 'style="color:var(--accent-primary);"';
    toast.innerHTML = `<i class="fa-solid ${icon}" ${iconColor}></i> <span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s var(--ease-cinematic)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // ==========================================================================
  // Backend API Integration (MongoDB)
  // ==========================================================================
  async function fetchVideosFromBackend() {
    try {
      const response = await fetch(`${API_BASE_URL}/videos`);
      if (response.ok) {
        const json = await response.json();
        // Đánh dấu đã kết nối MongoDB ngay khi API trả về hợp lệ — kể cả khi
        // DB đang trống (chưa seed) — để các thao tác like/comment/view sau
        // đó biết dùng backend thật thay vì rơi vào chế độ local mãi mãi.
        if (json.success) {
          isBackendConnected = true;
          if (json.data && json.data.length > 0) {
            videosData = json.data;
            console.log("✅ Đã tải dữ liệu từ MongoDB Server thành công:", videosData.length, "video");
            showToast(`Đã đồng bộ ${videosData.length} video trực tiếp từ MongoDB!`, 'success');
          } else {
            console.log("ℹ️ MongoDB đã kết nối nhưng chưa có video nào (DB trống).");
          }
        }
      } else {
        const json = await response.json().catch(() => null);
        console.warn("⚠️ Backend phản hồi lỗi, đang dùng dữ liệu cục bộ:", json?.message || response.status);
      }
    } catch (err) {
      console.log("ℹ️ Backend MongoDB offline, đang sử dụng dữ liệu cục bộ.");
    }
  }

  // Hero Banner giờ hoàn toàn tách biệt khỏi dữ liệu video — lấy từ mục quản
  // lý riêng trong trang Admin (GET /api/hero-banners, tối đa 10 slide).
  let heroBannersData = [];
  async function fetchHeroBanners() {
    try {
      const response = await fetch(`${API_BASE_URL}/hero-banners`);
      if (response.ok) {
        const json = await response.json();
        if (json.success && Array.isArray(json.data)) {
          heroBannersData = json.data;
        }
      }
    } catch (err) {
      console.log("ℹ️ Không tải được Hero Banner (backend offline hoặc chưa có dữ liệu).");
    }
  }

  // ==========================================================================
  // Hero Banner Slideshow — thuần ảnh, không chữ. Nội dung (ảnh + video liên
  // kết tùy chọn) hoàn toàn do Admin quyết định trong mục "Hero Banner" riêng
  // biệt của trang quản trị (tối đa 10 slide), KHÔNG còn gắn với dữ liệu
  // video như trước.
  // ==========================================================================
  let heroSlides = [];
  let heroSlideIndex = 0;
  let heroAutoTimer = null;
  const HERO_AUTO_ROTATE_MS = 6000;

  function stopHeroAutoRotate() {
    if (heroAutoTimer) {
      clearInterval(heroAutoTimer);
      heroAutoTimer = null;
    }
  }

  function startHeroAutoRotate() {
    stopHeroAutoRotate();
    if (heroSlides.length <= 1) return;
    heroAutoTimer = setInterval(() => goToHeroSlide(heroSlideIndex + 1), HERO_AUTO_ROTATE_MS);
  }

  function renderHeroDots() {
    if (!heroDots) return;
    heroDots.innerHTML = '';
    if (heroSlides.length <= 1) return;
    heroSlides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = `hero-dot ${i === heroSlideIndex ? 'active' : ''}`;
      dot.title = `Slide ${i + 1}`;
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        goToHeroSlide(i);
        startHeroAutoRotate();
      });
      heroDots.appendChild(dot);
    });
  }

  // Chuyển ảnh nền sang slide hiện tại với hiệu ứng crossfade nhẹ. Slide chỉ
  // có ảnh tĩnh (không gắn video) thì không có hành động khi bấm; slide có
  // gắn video thì bấm vào sẽ mở thẳng video đó.
  function renderHeroSlideContent() {
    const heroData = heroSlides[heroSlideIndex];
    if (!heroData) return;

    heroBackdrop.classList.add('fading');

    setTimeout(() => {
      heroBackdrop.style.backgroundImage = `url('${heroData.image}')`;
      heroBackdrop.classList.remove('fading');
    }, 220);

    if (heroData.video) {
      heroSpotlight.classList.add('is-clickable');
      heroSpotlight.onclick = () => openWatchView(heroData.video);
    } else {
      heroSpotlight.classList.remove('is-clickable');
      heroSpotlight.onclick = null;
    }

    renderHeroDots();
  }

  function goToHeroSlide(index) {
    if (!heroSlides.length) return;
    heroSlideIndex = ((index % heroSlides.length) + heroSlides.length) % heroSlides.length;
    renderHeroSlideContent();
  }

  function initHero() {
    // Hero Banner giờ lấy dữ liệu hoàn toàn từ heroBannersData (mục "Hero
    // Banner" riêng trong Admin), không còn liên quan tới isHeroSpotlight
    // hay video xem nhiều nhất như trước. Chưa có slide nào (Admin chưa
    // thêm) thì ẩn hẳn khu vực này — không hiển thị dữ liệu mẫu/giả.
    stopHeroAutoRotate();

    heroSlides = [...heroBannersData].sort((a, b) => (a.order || 0) - (b.order || 0));

    if (heroSlides.length === 0) {
      heroSpotlight.style.display = 'none';
      return;
    }

    heroSpotlight.style.display = 'flex';
    heroSlideIndex = 0;
    if (heroSlideNav) heroSlideNav.style.display = heroSlides.length > 1 ? 'flex' : 'none';
    renderHeroSlideContent();
    startHeroAutoRotate();
  }

  if (heroPrevBtn) {
    heroPrevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      goToHeroSlide(heroSlideIndex - 1);
      startHeroAutoRotate();
    });
  }
  if (heroNextBtn) {
    heroNextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      goToHeroSlide(heroSlideIndex + 1);
      startHeroAutoRotate();
    });
  }
  if (heroSpotlight) {
    heroSpotlight.addEventListener('mouseenter', stopHeroAutoRotate);
    heroSpotlight.addEventListener('mouseleave', startHeroAutoRotate);
  }

  // ==========================================================================
  // Render Categories & Filter
  // ==========================================================================

  // Đồng bộ danh sách CATEGORIES (dùng chung cho cả pill lọc phía trên lẫn
  // menu "Thể loại" ở sidebar) theo đúng các category thật đang có trong dữ
  // liệu video — để khi admin gõ thêm 1 thể loại mới lúc Thêm Video, nó tự
  // xuất hiện ở đây (không cần sửa code / danh sách cứng nữa).
  function syncCategoriesFromVideos() {
    const dynamicCats = Array.from(new Set(videosData.map(v => v.category).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, 'vi'));
    const merged = ['Tất cả', ...dynamicCats];
    CATEGORIES.length = 0;
    CATEGORIES.push(...merged);
  }

  // Điểm chọn category dùng chung cho cả pill lọc phía trên VÀ menu sidebar,
  // để 2 nơi này luôn đồng bộ trạng thái đang chọn với nhau.
  function selectCategory(cat) {
    activeCategory = cat;
    renderCategories();
    filterVideos();
    if (window.innerWidth <= 768) sidebar.classList.remove('mobile-open');
  }

  function renderCategories() {
    categoryBar.innerHTML = '';
    CATEGORIES.forEach(cat => {
      const chip = document.createElement('button');
      chip.className = `category-chip ${cat === activeCategory ? 'active' : ''}`;
      chip.textContent = cat;
      chip.addEventListener('click', () => selectCategory(cat));
      categoryBar.appendChild(chip);
    });

    renderSidebarCategories();
    updateSidebarNavActiveState();
  }

  // Menu "Thể loại" ở sidebar trái — 1 mục cho mỗi category thật (không lặp
  // lại "Tất cả" vì đã có sẵn ở nhóm "Khám phá" phía trên).
  function renderSidebarCategories() {
    if (!sidebarCategoryList) return;
    sidebarCategoryList.innerHTML = '';
    const dynamicCats = CATEGORIES.filter(c => c !== 'Tất cả');

    if (dynamicCats.length === 0) {
      sidebarCategoryList.innerHTML = '<div class="sidebar-empty-note">Chưa có thể loại nào</div>';
      return;
    }

    dynamicCats.forEach(cat => {
      const item = document.createElement('a');
      item.href = '#';
      item.className = `nav-item ${cat === activeCategory ? 'active' : ''}`;
      item.innerHTML = `<i class="fa-solid fa-hashtag"></i><span class="nav-text">${cat}</span>`;
      item.addEventListener('click', (e) => {
        e.preventDefault();
        selectCategory(cat);
      });
      sidebarCategoryList.appendChild(item);
    });
  }

  function updateSidebarNavActiveState() {
    if (navHomeBtn) navHomeBtn.classList.toggle('active', activeCategory === 'Tất cả');
  }

  // ==========================================================================
  // Render Video Grid
  // ==========================================================================
  function renderVideos(videos) {
    videoGrid.innerHTML = '';
    if (!videos || videos.length === 0) {
      videoGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 70px 20px; color: var(--text-secondary);">
          <i class="fa-solid fa-clapperboard" style="font-size: 3.5rem; margin-bottom: 16px; color: rgba(255,255,255,0.1);"></i>
          <h3 style="font-size: 1.2rem; color: #fff; font-weight: 700;">Không tìm thấy video nào</h3>
          <p style="margin-top: 8px; font-size: 0.9rem; color: var(--text-tertiary);">Hãy thử tìm kiếm với từ khóa khác hoặc danh mục khác.</p>
        </div>
      `;
      return;
    }

    videos.forEach(video => {
      const card = document.createElement('div');
      card.className = 'video-card';
      const channel = video.channel || { name: 'Creator', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80', verified: false };
      
      card.innerHTML = `
        <div class="thumbnail-wrapper">
          <img src="${video.thumbnail}" alt="${video.title}" class="thumbnail-img" loading="lazy">
          <span class="duration-pill-bottom">${video.durationFormatted || '10:00'}</span>
        </div>
        <div class="video-info-row">
          <div class="channel-avatar-wrapper">
            <img src="${channel.avatar}" alt="${channel.name}" class="channel-avatar-img">
          </div>
          <div class="video-meta-col">
            <h3 class="video-title" title="${video.title}">${video.title}</h3>
            <div class="video-stats">
              <span>${formatNumber(video.views)} lượt xem</span>
              <span>•</span>
              <span>${video.uploadedAt || 'Mới đây'}</span>
            </div>
          </div>
        </div>
      `;
      card.addEventListener('click', () => openWatchView(video));

      // Nếu video có ảnh xem trước GIF (trích từ chính video, chỉ có với file
      // tải lên/link trực tiếp), đổi ảnh thumbnail thành GIF này khi rê chuột
      // vào thẻ video — giống kiểu xem trước của YouTube.
      if (video.previewGif) {
        const thumbImg = card.querySelector('.thumbnail-img');
        card.addEventListener('mouseenter', () => {
          thumbImg.src = video.previewGif;
        });
        card.addEventListener('mouseleave', () => {
          thumbImg.src = video.thumbnail;
        });
      }

      videoGrid.appendChild(card);
    });
  }

  function filterVideos() {
    const query = searchInput.value.trim().toLowerCase();
    let filtered = videosData.filter(v => {
      const matchCat = activeCategory === "Tất cả" || v.category === activeCategory;
      const channelName = (v.channel && v.channel.name) ? v.channel.name.toLowerCase() : '';
      const matchQuery = !query || v.title.toLowerCase().includes(query) || 
                         (v.tags && v.tags.some(t => t.toLowerCase().includes(query))) ||
                         channelName.includes(query);
      return matchCat && matchQuery;
    });
    renderVideos(filtered);
  }

  // ==========================================================================
  // Watch View / Cinema Player Logic
  // ==========================================================================
  // Mở trang xem video luôn cập nhật URL thật (?v=<id>) bằng History API —
  // trước đây trang xem chỉ là 1 lớp overlay đè lên trang chủ, KHÔNG có URL
  // riêng, nên khi người xem bấm Refresh (F5) sẽ mất hết và quay về trang chủ.
  // Giờ refresh/mở lại link trực tiếp vẫn mở đúng video đang xem.
  function getVideoId(video) {
    return video && (video._id || video.id);
  }

  function updateWatchUrlForVideo(video) {
    const id = getVideoId(video);
    if (!id) return;
    const url = `${window.location.pathname}?v=${encodeURIComponent(id)}`;
    history.pushState({ videoId: id }, '', url);
  }

  function clearWatchUrl() {
    history.pushState({}, '', window.location.pathname);
  }

  // pushUrl=false khi được gọi từ popstate (nút Back/Forward trình duyệt)
  // hoặc khi khôi phục trạng thái lúc tải trang — tránh đẩy thêm 1 mục lịch
  // sử mới đè lên mục mà trình duyệt vừa điều hướng tới.
  async function openWatchView(video, { pushUrl = true } = {}) {
    currentVideo = video;
    isSubscribed = false;
    if (pushUrl) updateWatchUrlForVideo(video);

    // Tăng lượt view trên MongoDB nếu backend online
    if (isBackendConnected && video._id) {
      try {
        const res = await fetch(`${API_BASE_URL}/videos/${video._id}`);
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            video.views = json.data.views;
          }
        }
      } catch (e) {}
    } else {
      video.views = (video.views || 0) + 1;
    }

    const channel = video.channel || { name: 'Creator', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80', subscribers: '1.2K người theo dõi' };

    // Video nhúng từ YouTube/Vimeo/embed khác dùng <iframe> — không điều khiển
    // được bằng thanh công cụ tùy chỉnh (progress bar, tốc độ...) nên ẩn nó đi.
    const isEmbedded = video.sourceType && ['youtube', 'vimeo', 'iframe'].includes(video.sourceType) && video.embedUrl;

    if (isEmbedded) {
      mainVideoPlayer.pause();
      mainVideoPlayer.removeAttribute('src');
      mainVideoPlayer.style.display = 'none';
      const separator = video.embedUrl.includes('?') ? '&' : '?';
      embedVideoPlayer.src = `${video.embedUrl}${separator}autoplay=1`;
      embedVideoPlayer.style.display = 'block';
      if (playerControls) playerControls.style.display = 'none';
    } else {
      embedVideoPlayer.style.display = 'none';
      embedVideoPlayer.src = '';
      mainVideoPlayer.style.display = 'block';
      if (playerControls) playerControls.style.display = 'flex';
      mainVideoPlayer.src = video.videoUrl;
    }

    // Load Metadata
    watchTitle.textContent = video.title;
    watchViewsDate.textContent = `${formatNumber(video.views)} lượt xem • ${video.uploadedAt || 'Mới đây'} • Thể loại: ${video.category}`;
    watchDesc.textContent = video.description || 'Không có mô tả.';
    watchChannelAvatar.src = channel.avatar;
    watchChannelName.textContent = channel.name;
    watchChannelSubs.textContent = channel.subscribers || '1K người theo dõi';
    likeCountSpan.textContent = formatNumber(video.likes || 1200);

    subscribeBtn.className = 'btn-subscribe-pill';
    subscribeBtn.textContent = 'Theo dõi';
    likeBtn.classList.remove('active');
    dislikeBtn.classList.remove('active');

    renderComments();
    renderRelatedVideos();

    watchOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    if (!isEmbedded) {
      mainVideoPlayer.play().catch(() => {});
      playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    }
  }

  function closeWatchView({ updateHistory = true } = {}) {
    mainVideoPlayer.pause();
    mainVideoPlayer.src = '';
    embedVideoPlayer.src = ''; // dừng phát video nhúng (YouTube/Vimeo...) khi đóng
    watchOverlay.classList.remove('active');
    document.body.style.overflow = 'auto';
    currentVideo = null;
    if (updateHistory && new URLSearchParams(window.location.search).get('v')) {
      clearWatchUrl();
    }
  }

  // Nút Back/Forward trình duyệt: đọc lại ?v= trong URL và mở/đóng trang xem
  // tương ứng — KHÔNG tự đẩy thêm lịch sử mới (pushUrl/updateHistory: false)
  // vì trình duyệt đã tự điều hướng lịch sử rồi.
  window.addEventListener('popstate', () => {
    const id = new URLSearchParams(window.location.search).get('v');
    if (id) {
      const video = videosData.find(v => getVideoId(v) === id);
      if (video) {
        openWatchView(video, { pushUrl: false });
      } else {
        closeWatchView({ updateHistory: false });
      }
    } else {
      closeWatchView({ updateHistory: false });
    }
  });

  // Player Controls
  playPauseBtn.addEventListener('click', () => {
    if (mainVideoPlayer.paused) {
      mainVideoPlayer.play();
      playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    } else {
      mainVideoPlayer.pause();
      playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    }
  });

  mainVideoPlayer.addEventListener('timeupdate', () => {
    if (mainVideoPlayer.duration) {
      const percent = (mainVideoPlayer.currentTime / mainVideoPlayer.duration) * 100;
      progressBar.style.width = `${percent}%`;
      timeDisplay.textContent = `${formatTime(mainVideoPlayer.currentTime)} / ${formatTime(mainVideoPlayer.duration)}`;
    }
  });

  progressContainer.addEventListener('click', (e) => {
    const rect = progressContainer.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    if (mainVideoPlayer.duration) {
      mainVideoPlayer.currentTime = (clickX / width) * mainVideoPlayer.duration;
    }
  });

  volumeSlider.addEventListener('input', (e) => {
    mainVideoPlayer.volume = e.target.value;
    muteBtn.innerHTML = e.target.value == 0 ? '<i class="fa-solid fa-volume-xmark"></i>' : '<i class="fa-solid fa-volume-high"></i>';
  });

  muteBtn.addEventListener('click', () => {
    mainVideoPlayer.muted = !mainVideoPlayer.muted;
    muteBtn.innerHTML = mainVideoPlayer.muted ? '<i class="fa-solid fa-volume-xmark"></i>' : '<i class="fa-solid fa-volume-high"></i>';
  });

  speedSelect.addEventListener('change', (e) => {
    mainVideoPlayer.playbackRate = parseFloat(e.target.value);
  });

  fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      playerContainer.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  });

  closeWatchBtn.addEventListener('click', closeWatchView);

  // Likes Interaction
  likeBtn.addEventListener('click', async () => {
    likeBtn.classList.toggle('active');
    dislikeBtn.classList.remove('active');
    const isLiked = likeBtn.classList.contains('active');
    const baseLikes = typeof currentVideo.likes === 'number' ? currentVideo.likes : 1200;
    const newLikes = isLiked ? baseLikes + 1 : baseLikes;
    likeCountSpan.textContent = formatNumber(newLikes);

    if (isBackendConnected && currentVideo._id) {
      try {
        await fetch(`${API_BASE_URL}/videos/${currentVideo._id}/like`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: isLiked ? 'like' : 'unlike' })
        });
      } catch (e) {}
    }
    if (isLiked) showToast("Đã thêm vào danh sách video yêu thích!");
  });

  dislikeBtn.addEventListener('click', () => {
    dislikeBtn.classList.toggle('active');
    likeBtn.classList.remove('active');
    const baseLikes = typeof currentVideo.likes === 'number' ? currentVideo.likes : 1200;
    likeCountSpan.textContent = formatNumber(baseLikes);
  });

  subscribeBtn.addEventListener('click', () => {
    isSubscribed = !isSubscribed;
    const channelName = (currentVideo.channel && currentVideo.channel.name) || 'Creator';
    if (isSubscribed) {
      subscribeBtn.className = 'btn-subscribe-pill subscribed';
      subscribeBtn.textContent = 'Đã theo dõi ✓';
      showToast(`Đã thêm kênh ${channelName} vào danh sách theo dõi`, 'success');
    } else {
      subscribeBtn.className = 'btn-subscribe-pill';
      subscribeBtn.textContent = 'Theo dõi';
      showToast(`Đã hủy theo dõi kênh ${channelName}`);
    }
  });

  shareBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(window.location.href);
    showToast("Đã sao chép liên kết video vào bộ nhớ tạm!", "success");
  });

  bookmarkBtn.addEventListener('click', () => {
    bookmarkBtn.classList.toggle('active');
    showToast("Đã lưu video vào bộ sưu tập cá nhân!", "success");
  });

  // Comments
  function renderComments() {
    const comments = currentVideo.comments || [];
    commentsCountTitle.textContent = `${comments.length} Bình luận`;
    commentsList.innerHTML = '';

    if (comments.length === 0) {
      commentsList.innerHTML = `<p style="color: var(--text-tertiary); font-size: 0.88rem; padding: 14px 0;">Hãy là người đầu tiên chia sẻ cảm nghĩ về video này!</p>`;
      return;
    }

    comments.forEach(c => {
      const item = document.createElement('div');
      item.className = 'comment-item';
      item.innerHTML = `
        <img src="${c.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}" alt="${c.user}" class="channel-avatar-img">
        <div class="comment-body">
          <div class="comment-user-header">
            <span class="comment-author">${c.user}</span>
            <span class="comment-time">${c.time || 'Vừa xong'}</span>
          </div>
          <p class="comment-text">${c.content}</p>
        </div>
      `;
      commentsList.appendChild(item);
    });
  }

  submitCommentBtn.addEventListener('click', async () => {
    const text = commentInput.value.trim();
    if (!text) return;

    const newCommentObj = {
      user: "Bạn (Studio Creator)",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
      content: text,
      time: "Vừa xong"
    };

    if (isBackendConnected && currentVideo._id) {
      try {
        const res = await fetch(`${API_BASE_URL}/videos/${currentVideo._id}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newCommentObj)
        });
        if (res.ok) {
          const json = await res.json();
          currentVideo.comments = json.data;
        }
      } catch (e) {
        if (!currentVideo.comments) currentVideo.comments = [];
        currentVideo.comments.unshift(newCommentObj);
      }
    } else {
      if (!currentVideo.comments) currentVideo.comments = [];
      currentVideo.comments.unshift(newCommentObj);
    }

    commentInput.value = '';
    renderComments();
    showToast("Bình luận đã được lưu thành công!", "success");
  });

  function renderRelatedVideos() {
    relatedVideosList.innerHTML = '';
    const currentId = currentVideo._id || currentVideo.id;
    const related = videosData.filter(v => (v._id || v.id) !== currentId);
    related.forEach(v => {
      const channel = v.channel || { name: 'Creator' };
      const item = document.createElement('div');
      item.className = 'related-card-item';
      item.innerHTML = `
        <div class="related-thumb-box">
          <img src="${v.thumbnail}" alt="${v.title}">
        </div>
        <div class="related-text-col">
          <div class="related-title">${v.title}</div>
          <div class="related-author">${channel.name}</div>
          <div class="video-stats">${formatNumber(v.views)} lượt xem</div>
        </div>
      `;
      item.addEventListener('click', () => openWatchView(v));
      relatedVideosList.appendChild(item);
    });
  }

  // Search & Global Events
  searchInput.addEventListener('input', filterVideos);
  searchBtn.addEventListener('click', filterVideos);

  menuToggleBtn.addEventListener('click', () => {
    if (window.innerWidth <= 768) {
      sidebar.classList.toggle('mobile-open');
    } else {
      sidebar.classList.toggle('collapsed');
    }
  });

  if (navHomeBtn) {
    navHomeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      selectCategory('Tất cả');
    });
  }

  // Nếu URL đang mở sẵn ?v=<id> (do refresh trang xem hoặc mở link chia sẻ
  // trực tiếp), tự mở đúng video đó ngay sau khi có dữ liệu — KHÔNG đẩy thêm
  // lịch sử mới vì URL hiện tại đã đúng rồi.
  function openWatchViewFromUrlIfPresent() {
    const id = new URLSearchParams(window.location.search).get('v');
    if (!id) return;
    const video = videosData.find(v => getVideoId(v) === id);
    if (video) {
      openWatchView(video, { pushUrl: false });
    } else {
      console.log('ℹ️ Không tìm thấy video từ liên kết (?v=' + id + ') trong dữ liệu hiện có.');
    }
  }

  // Init App
  syncCategoriesFromVideos();
  renderCategories();
  renderVideos(videosData);
  initHero();

  // Thử kết nối MongoDB Backend khi vừa tải trang
  fetchVideosFromBackend().then(() => {
    syncCategoriesFromVideos();
    renderCategories();
    renderVideos(videosData);
    openWatchViewFromUrlIfPresent();
  });

  // Hero Banner tải riêng (độc lập với danh sách video) từ /api/hero-banners.
  fetchHeroBanners().then(() => {
    initHero();
  });
});
