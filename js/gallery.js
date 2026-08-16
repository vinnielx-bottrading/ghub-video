// ==========================================================================
// GHUB X - Trang Bộ Sưu Tập Ảnh (Gallery): nút chủ đề, cửa sổ chủ đề (lưới
// tĩnh), thư viện ngẫu nhiên, slideshow toàn màn hình dùng chung 1 lightbox.
// ==========================================================================
const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? (window.location.port === '5000' ? '/api' : 'http://localhost:5000/api')
  : `${window.location.origin}/api`;

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const sidebar = document.getElementById('sidebar');
  const menuToggleBtn = document.getElementById('menuToggleBtn');

  const galleryTopicBar = document.getElementById('galleryTopicBar');
  const galleryTopicBarEmpty = document.getElementById('galleryTopicBarEmpty');

  const randomGalleryGrid = document.getElementById('randomGalleryGrid');
  const randomGalleryEmpty = document.getElementById('randomGalleryEmpty');
  const shuffleGalleryBtn = document.getElementById('shuffleGalleryBtn');

  const galleryTopicOverlay = document.getElementById('galleryTopicOverlay');
  const galleryTopicOverlayTitle = document.getElementById('galleryTopicOverlayTitle');
  const galleryTopicOverlayCount = document.getElementById('galleryTopicOverlayCount');
  const galleryTopicOverlayGrid = document.getElementById('galleryTopicOverlayGrid');
  const closeGalleryTopicBtn = document.getElementById('closeGalleryTopicBtn');

  const galleryLightbox = document.getElementById('galleryLightbox');
  const galleryLightboxImg = document.getElementById('galleryLightboxImg');
  const galleryLightboxCaption = document.getElementById('galleryLightboxCaption');
  const galleryLightboxCounter = document.getElementById('galleryLightboxCounter');
  const galleryLightboxPrev = document.getElementById('galleryLightboxPrev');
  const galleryLightboxNext = document.getElementById('galleryLightboxNext');
  const closeGalleryLightboxBtn = document.getElementById('closeGalleryLightboxBtn');

  const toastContainer = document.getElementById('toastContainer');

  let activePhotoSet = []; // Mảng ảnh đang mở trong lightbox (theo chủ đề HOẶC thư viện ngẫu nhiên)
  let activePhotoIndex = 0;

  // ------------------------------------------------------------------------
  // Tiện ích
  // ------------------------------------------------------------------------
  function toast(message, type) {
    if (!toastContainer) return;
    const el = document.createElement('div');
    el.className = 'toast';
    const icon = type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-exclamation' : 'fa-sparkles';
    const color = type === 'success' ? '#10b981' : 'var(--accent-primary)';
    el.innerHTML = `<i class="fa-solid ${icon}" style="color:${color};"></i> <span></span>`;
    el.querySelector('span').textContent = message;
    toastContainer.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(100%)';
      el.style.transition = 'all 0.3s ease';
      setTimeout(() => el.remove(), 300);
    }, 3500);
  }

  function photoThumbUrl(photo) {
    return photo && photo.imageUrl ? photo.imageUrl : '';
  }

  // ------------------------------------------------------------------------
  // Sidebar toggle (giống hệt logic trong js/app.js để đồng bộ hành vi)
  // ------------------------------------------------------------------------
  if (menuToggleBtn) {
    menuToggleBtn.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        sidebar.classList.toggle('mobile-open');
      } else {
        sidebar.classList.toggle('collapsed');
      }
    });
  }

  // ------------------------------------------------------------------------
  // Nút chủ đề (GET /api/gallery/topics)
  // ------------------------------------------------------------------------
  async function fetchTopics() {
    try {
      const res = await fetch(`${API_BASE_URL}/gallery/topics`);
      const json = await res.json();
      if (json.success) {
        renderTopics(json.data || []);
      }
    } catch (error) {
      console.warn('Không tải được danh sách chủ đề:', error);
      galleryTopicBar.innerHTML = '';
      galleryTopicBarEmpty.style.display = 'block';
      galleryTopicBarEmpty.textContent = 'Không kết nối được server để tải chủ đề.';
    }
  }

  function renderTopics(topics) {
    galleryTopicBar.innerHTML = '';
    if (!topics.length) {
      galleryTopicBarEmpty.style.display = 'block';
      return;
    }
    galleryTopicBarEmpty.style.display = 'none';
    topics.forEach(t => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'category-chip';
      chip.textContent = `${t.topic} (${t.count})`;
      chip.addEventListener('click', () => openTopic(t.topic));
      galleryTopicBar.appendChild(chip);
    });
  }

  // ------------------------------------------------------------------------
  // Cửa sổ chủ đề — lưới ảnh tĩnh, hiệu ứng nhẹ khi rê chuột
  // ------------------------------------------------------------------------
  async function openTopic(topic) {
    galleryTopicOverlayTitle.textContent = topic;
    galleryTopicOverlayCount.textContent = 'Đang tải...';
    galleryTopicOverlayGrid.innerHTML = '';
    galleryTopicOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    try {
      const res = await fetch(`${API_BASE_URL}/gallery/photos?topic=${encodeURIComponent(topic)}&limit=200`);
      const json = await res.json();
      const photos = json.success ? (json.data || []) : [];
      galleryTopicOverlayCount.textContent = `${photos.length} ảnh`;
      if (!photos.length) {
        galleryTopicOverlayGrid.innerHTML = '<div class="gallery-empty-note">Chủ đề này chưa có ảnh nào.</div>';
        return;
      }
      photos.forEach((photo, index) => {
        galleryTopicOverlayGrid.appendChild(buildPhotoTile(photo, () => openLightboxFor(photos, index)));
      });
    } catch (error) {
      galleryTopicOverlayCount.textContent = '';
      galleryTopicOverlayGrid.innerHTML = '<div class="gallery-empty-note">Không tải được ảnh của chủ đề này.</div>';
    }
  }

  function closeTopicOverlay() {
    galleryTopicOverlay.classList.remove('active');
    if (!galleryLightbox.classList.contains('active')) {
      document.body.style.overflow = '';
    }
  }

  if (closeGalleryTopicBtn) closeGalleryTopicBtn.addEventListener('click', closeTopicOverlay);
  galleryTopicOverlay.addEventListener('click', (e) => {
    if (e.target === galleryTopicOverlay) closeTopicOverlay();
  });

  // ------------------------------------------------------------------------
  // Thư viện ngẫu nhiên (GET /api/gallery/photos?random=true)
  // ------------------------------------------------------------------------
  async function fetchRandomGallery() {
    try {
      const res = await fetch(`${API_BASE_URL}/gallery/photos?random=true&limit=36`);
      const json = await res.json();
      const photos = json.success ? (json.data || []) : [];
      randomGalleryGrid.innerHTML = '';
      if (!photos.length) {
        randomGalleryEmpty.style.display = 'block';
        return;
      }
      randomGalleryEmpty.style.display = 'none';
      photos.forEach((photo, index) => {
        const tile = buildPhotoTile(photo, () => openLightboxFor(photos, index));
        if (photo.topic) {
          const badge = document.createElement('div');
          badge.className = 'gallery-photo-tile-topic-badge';
          badge.textContent = photo.topic;
          tile.appendChild(badge);
        }
        randomGalleryGrid.appendChild(tile);
      });
    } catch (error) {
      randomGalleryGrid.innerHTML = '';
      randomGalleryEmpty.style.display = 'block';
      randomGalleryEmpty.textContent = 'Không tải được thư viện ngẫu nhiên.';
    }
  }

  if (shuffleGalleryBtn) {
    shuffleGalleryBtn.addEventListener('click', () => {
      fetchRandomGallery();
    });
  }

  // ------------------------------------------------------------------------
  // Ô ảnh dùng chung cho cả cửa sổ chủ đề và thư viện ngẫu nhiên
  // ------------------------------------------------------------------------
  function buildPhotoTile(photo, onClick) {
    const tile = document.createElement('div');
    tile.className = 'gallery-photo-tile';
    const img = document.createElement('img');
    img.src = photoThumbUrl(photo);
    img.alt = photo.caption || photo.topic || 'Ảnh bộ sưu tập';
    img.loading = 'lazy';
    img.onerror = () => { tile.style.display = 'none'; };
    tile.appendChild(img);
    tile.addEventListener('click', onClick);
    return tile;
  }

  // ------------------------------------------------------------------------
  // Slideshow toàn màn hình (lightbox) — dùng chung cho mọi nguồn ảnh
  // ------------------------------------------------------------------------
  function openLightboxFor(photos, index) {
    activePhotoSet = photos;
    activePhotoIndex = index;
    showLightboxImage();
    galleryLightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function showLightboxImage() {
    const photo = activePhotoSet[activePhotoIndex];
    if (!photo) return;
    galleryLightboxImg.src = photoThumbUrl(photo);
    galleryLightboxImg.alt = photo.caption || photo.topic || 'Ảnh bộ sưu tập';
    galleryLightboxCaption.textContent = photo.caption || '';
    galleryLightboxCaption.style.display = photo.caption ? 'block' : 'none';
    galleryLightboxCounter.textContent = `${activePhotoIndex + 1} / ${activePhotoSet.length}`;
    const hasMultiple = activePhotoSet.length > 1;
    galleryLightboxPrev.style.display = hasMultiple ? 'flex' : 'none';
    galleryLightboxNext.style.display = hasMultiple ? 'flex' : 'none';
  }

  function lightboxNext() {
    if (!activePhotoSet.length) return;
    activePhotoIndex = (activePhotoIndex + 1) % activePhotoSet.length;
    showLightboxImage();
  }

  function lightboxPrev() {
    if (!activePhotoSet.length) return;
    activePhotoIndex = (activePhotoIndex - 1 + activePhotoSet.length) % activePhotoSet.length;
    showLightboxImage();
  }

  function closeLightbox() {
    galleryLightbox.classList.remove('active');
    galleryLightboxImg.src = '';
    if (!galleryTopicOverlay.classList.contains('active')) {
      document.body.style.overflow = '';
    }
  }

  if (closeGalleryLightboxBtn) closeGalleryLightboxBtn.addEventListener('click', closeLightbox);
  if (galleryLightboxNext) galleryLightboxNext.addEventListener('click', lightboxNext);
  if (galleryLightboxPrev) galleryLightboxPrev.addEventListener('click', lightboxPrev);
  galleryLightbox.addEventListener('click', (e) => {
    if (e.target === galleryLightbox) closeLightbox();
  });

  document.addEventListener('keydown', (e) => {
    if (galleryLightbox.classList.contains('active')) {
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowRight') lightboxNext();
      else if (e.key === 'ArrowLeft') lightboxPrev();
    } else if (galleryTopicOverlay.classList.contains('active') && e.key === 'Escape') {
      closeTopicOverlay();
    }
  });

  // Init
  fetchTopics();
  fetchRandomGallery();
});
