// ==========================================================================
// GHUB- Admin Dashboard Management Logic
// ==========================================================================

// Xem giải thích chi tiết trong js/app.js — dùng "/api" tương đối cùng origin
// với backend Express khi deploy gộp 1 service trên Render (khuyến nghị).
const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? (window.location.port === '5000' ? '/api' : 'http://localhost:5000/api')
  : `${window.location.origin}/api`;

document.addEventListener('DOMContentLoaded', () => {
  let allVideos = [];
  let currentEditingId = null;

  // DOM Elements
  const totalVideosEl = document.getElementById('totalVideos');
  const totalViewsEl = document.getElementById('totalViews');
  const totalLikesEl = document.getElementById('totalLikes');
  const totalCategoriesEl = document.getElementById('totalCategories');
  const videoTableBody = document.getElementById('videoTableBody');
  const searchInput = document.getElementById('searchAdminInput');
  const categoryFilter = document.getElementById('categoryFilter');
  const serverStatusText = document.getElementById('serverStatusText');
  const toastContainer = document.getElementById('adminToastContainer');
  const adminLogoutBtn = document.getElementById('adminLogoutBtn');

  // Edit Modal Elements
  const editModal = document.getElementById('editModal');
  const closeEditModalBtn = document.getElementById('closeEditModalBtn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  const editTitleInput = document.getElementById('editTitleInput');
  const editCategorySelect = document.getElementById('editCategorySelect');
  const editThumbnailInput = document.getElementById('editThumbnailInput');
  const editVideoUrlInput = document.getElementById('editVideoUrlInput');
  const editDescInput = document.getElementById('editDescInput');
  const editTagsInput = document.getElementById('editTagsInput');
  const editViewsInput = document.getElementById('editViewsInput');
  const editLikesInput = document.getElementById('editLikesInput');
  const editChannelNameInput = document.getElementById('editChannelNameInput');
  const editVerifiedCheckbox = document.getElementById('editVerifiedCheckbox');
  const editHeroCheckbox = document.getElementById('editHeroCheckbox');
  const saveEditBtn = document.getElementById('saveEditBtn');

  // Add Modal Elements
  const openAddModalBtn = document.getElementById('openAddModalBtn');
  const addModal = document.getElementById('addModal');
  const closeAddModalBtn = document.getElementById('closeAddModalBtn');
  const cancelAddBtn = document.getElementById('cancelAddBtn');
  const addTitleInput = document.getElementById('addTitleInput');
  const addCategorySelect = document.getElementById('addCategorySelect');
  const addThumbnailInput = document.getElementById('addThumbnailInput');
  const addVideoUrlInput = document.getElementById('addVideoUrlInput');
  const addDescInput = document.getElementById('addDescInput');
  const addTagsInput = document.getElementById('addTagsInput');
  const addChannelNameInput = document.getElementById('addChannelNameInput');
  const addHeroCheckbox = document.getElementById('addHeroCheckbox');
  const submitAddBtn = document.getElementById('submitAddBtn');

  // ==========================================================================
  // Helper Utilities
  // ==========================================================================
  function formatNumber(num) {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  }

  // Nếu phiên đăng nhập Admin hết hạn (401), chuyển ngay về trang login thay
  // vì rơi vào chế độ "dữ liệu cục bộ" gây hiểu nhầm là backend offline.
  function redirectIfSessionExpired(response) {
    if (response && response.status === 401) {
      window.location.href = '/admin-login.html';
      return true;
    }
    return false;
  }

  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'admin-toast';
    const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
    const color = type === 'success' ? 'style="color: #10b981;"' : 'style="color: #ef4444;"';
    toast.innerHTML = `<i class="fa-solid ${icon}" ${color}></i> <span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // ==========================================================================
  // Fetch Videos from MongoDB API
  // ==========================================================================
  async function loadVideos() {
    try {
      const response = await fetch(`${API_BASE_URL}/videos`);
      if (response.ok) {
        const json = await response.json();
        allVideos = json.data || [];
        serverStatusText.innerHTML = `<strong>MongoDB Atlas Live</strong> ${allVideos.length} video trong DB`;
        serverStatusText.style.color = '#10b981';
      } else {
        throw new Error('Không thể kết nối API');
      }
    } catch (error) {
      console.warn("MongoDB API offline, đang tải dữ liệu cục bộ.");
      allVideos = typeof SAMPLE_VIDEOS !== 'undefined' ? [...SAMPLE_VIDEOS] : [];
      serverStatusText.innerHTML = `<strong>Offline / Local</strong> Đang dùng dữ liệu tạm`;
      serverStatusText.style.color = '#f59e0b';
    }

    updateDashboardMetrics();
    populateCategoryDropdowns();
    renderTable();
  }

  // ==========================================================================
  // Update Metrics
  // ==========================================================================
  function updateDashboardMetrics() {
    totalVideosEl.textContent = allVideos.length;

    const totalViews = allVideos.reduce((acc, v) => acc + (Number(v.views) || 0), 0);
    totalViewsEl.textContent = formatNumber(totalViews);

    const totalLikes = allVideos.reduce((acc, v) => acc + (Number(v.likes) || 0), 0);
    totalLikesEl.textContent = formatNumber(totalLikes);

    const categories = new Set(allVideos.map(v => v.category).filter(Boolean));
    totalCategoriesEl.textContent = categories.size;
  }

  // Populate category filters
  function populateCategoryDropdowns() {
    const defaultCats = ["Lập trình", "Trí tuệ nhân tạo (AI)", "Thiết kế", "Gaming", "Âm nhạc", "Thiên nhiên", "Du lịch", "Khoa học & Vũ trụ", "Ẩm thực"];
    const existingCats = Array.from(new Set([...defaultCats, ...allVideos.map(v => v.category).filter(Boolean)]));

    // Category filter in toolbar
    categoryFilter.innerHTML = '<option value="all">Tất cả thể loại</option>';
    existingCats.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      categoryFilter.appendChild(opt);
    });

    // Modal category selects
    [editCategorySelect, addCategorySelect].forEach(select => {
      select.innerHTML = '';
      existingCats.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        select.appendChild(opt);
      });
    });
  }

  // ==========================================================================
  // Render Video Table
  // ==========================================================================
  function renderTable() {
    const query = searchInput.value.trim().toLowerCase();
    const selectedCat = categoryFilter.value;

    const filtered = allVideos.filter(v => {
      const matchCat = selectedCat === 'all' || v.category === selectedCat;
      const channelName = (v.channel && v.channel.name) ? v.channel.name.toLowerCase() : '';
      const matchQuery = !query || v.title.toLowerCase().includes(query) || channelName.includes(query);
      return matchCat && matchQuery;
    });

    videoTableBody.innerHTML = '';

    if (filtered.length === 0) {
      videoTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-tertiary);">
            <i class="fa-solid fa-folder-open" style="font-size: 2.5rem; margin-bottom: 12px; display: block; opacity: 0.3;"></i>
            Không có video nào phù hợp với tìm kiếm
          </td>
        </tr>
      `;
      return;
    }

    filtered.forEach((video, index) => {
      const tr = document.createElement('tr');
      const channelName = (video.channel && video.channel.name) || 'GHUB X Creator';
      const isHero = video.isHeroSpotlight || false;
      const id = video._id || video.id;

      tr.innerHTML = `
        <td style="color: var(--text-tertiary); font-weight: 600;">#${index + 1}</td>
        <td>
          <div class="video-cell">
            <img src="${video.thumbnail}" alt="${video.title}" class="table-thumb">
            <div>
              <div class="table-video-title" title="${video.title}">${video.title}</div>
              <div class="table-channel-name"><i class="fa-solid fa-user-circle"></i> ${channelName}</div>
            </div>
          </div>
        </td>
        <td><span class="category-tag-badge">${video.category || 'Chưa phân loại'}</span></td>
        <td style="font-weight: 600; color: #fff;">${formatNumber(video.views)}</td>
        <td style="color: #fff;"><i class="fa-regular fa-thumbs-up" style="color: var(--accent-primary);"></i> ${formatNumber(video.likes)}</td>
        <td style="text-align: center;">
          <button class="hero-star-btn ${isHero ? 'active' : ''}" data-id="${id}" title="${isHero ? 'Đang là Hero Banner' : 'Đặt làm Hero Banner'}">
            <i class="fa-solid fa-star"></i>
          </button>
        </td>
        <td>
          <div class="action-buttons-cell">
            <button class="btn-action-icon edit" data-id="${id}" title="Chỉnh sửa thông tin video">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="btn-action-icon delete" data-id="${id}" title="Xóa video khỏi database">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      `;

      // Event Listeners for action buttons
      tr.querySelector('.hero-star-btn').addEventListener('click', () => toggleHeroSpotlight(video));
      tr.querySelector('.btn-action-icon.edit').addEventListener('click', () => openEditModal(video));
      tr.querySelector('.btn-action-icon.delete').addEventListener('click', () => deleteVideo(video));

      videoTableBody.appendChild(tr);
    });
  }

  // ==========================================================================
  // Action: Toggle Hero Spotlight
  // ==========================================================================
  async function toggleHeroSpotlight(video) {
    const newHeroState = !video.isHeroSpotlight;
    const id = video._id || video.id;

    try {
      if (video._id) {
        const res = await fetch(`${API_BASE_URL}/videos/${id}`, {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isHeroSpotlight: newHeroState })
        });
        if (redirectIfSessionExpired(res)) return;
      }
      video.isHeroSpotlight = newHeroState;
      renderTable();
      showToast(newHeroState ? `Đã đặt "${video.title}" làm Hero Banner nổi bật!` : `Đã hủy Hero Banner`);
    } catch (e) {
      showToast("Lỗi khi cập nhật Hero Banner", "error");
    }
  }

  // ==========================================================================
  // Action: Edit Video (Modal)
  // ==========================================================================
  function openEditModal(video) {
    currentEditingId = video._id || video.id;
    const channel = video.channel || {};

    editTitleInput.value = video.title || '';
    editCategorySelect.value = video.category || 'Lập trình';
    editThumbnailInput.value = video.thumbnail || '';
    editVideoUrlInput.value = video.videoUrl || '';
    editDescInput.value = video.description || '';
    editTagsInput.value = Array.isArray(video.tags) ? video.tags.join(', ') : (video.tags || '');
    editViewsInput.value = video.views || 0;
    editLikesInput.value = video.likes || 0;
    editChannelNameInput.value = channel.name || 'GHUB X Creator';
    editVerifiedCheckbox.checked = channel.verified || false;
    editHeroCheckbox.checked = video.isHeroSpotlight || false;

    editModal.classList.add('active');
  }

  function closeEditModal() {
    editModal.classList.remove('active');
    currentEditingId = null;
  }

  closeEditModalBtn.addEventListener('click', closeEditModal);
  cancelEditBtn.addEventListener('click', closeEditModal);

  saveEditBtn.addEventListener('click', async () => {
    if (!editTitleInput.value.trim()) {
      showToast("Vui lòng nhập tiêu đề video!", "error");
      return;
    }

    const updatedData = {
      title: editTitleInput.value.trim(),
      category: editCategorySelect.value,
      thumbnail: editThumbnailInput.value.trim(),
      videoUrl: editVideoUrlInput.value.trim(),
      description: editDescInput.value.trim(),
      tags: editTagsInput.value.split(',').map(t => t.trim()).filter(Boolean),
      views: Number(editViewsInput.value) || 0,
      likes: Number(editLikesInput.value) || 0,
      isHeroSpotlight: editHeroCheckbox.checked,
      channel: {
        name: editChannelNameInput.value.trim() || 'GHUB X Creator',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        verified: editVerifiedCheckbox.checked
      }
    };

    saveEditBtn.disabled = true;
    saveEditBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang lưu...';

    try {
      if (currentEditingId.toString().length === 24) {
        // MongoDB ObjectId update
        const response = await fetch(`${API_BASE_URL}/videos/${currentEditingId}`, {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedData)
        });
        if (redirectIfSessionExpired(response)) return;
        if (response.ok) {
          const json = await response.json();
          const index = allVideos.findIndex(v => (v._id || v.id) === currentEditingId);
          if (index !== -1) allVideos[index] = json.data;
        }
      } else {
        const index = allVideos.findIndex(v => (v._id || v.id) === currentEditingId);
        if (index !== -1) allVideos[index] = { ...allVideos[index], ...updatedData };
      }

      updateDashboardMetrics();
      renderTable();
      closeEditModal();
      showToast("🎉 Đã cập nhật thông tin video thành công vào MongoDB!");
    } catch (e) {
      showToast("Có lỗi xảy ra khi lưu vào database", "error");
    } finally {
      saveEditBtn.disabled = false;
      saveEditBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> <span>Lưu Thay Đổi</span>';
    }
  });

  // ==========================================================================
  // Action: Add New Video (Modal)
  // ==========================================================================
  openAddModalBtn.addEventListener('click', () => {
    addModal.classList.add('active');
  });

  function closeAddModal() {
    addModal.classList.remove('active');
    addTitleInput.value = '';
    addThumbnailInput.value = '';
    addVideoUrlInput.value = '';
    addDescInput.value = '';
    addTagsInput.value = '';
    addChannelNameInput.value = '';
    addHeroCheckbox.checked = false;
  }

  closeAddModalBtn.addEventListener('click', closeAddModal);
  cancelAddBtn.addEventListener('click', closeAddModal);

  submitAddBtn.addEventListener('click', async () => {
    const title = addTitleInput.value.trim();
    const videoUrl = addVideoUrlInput.value.trim() || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
    const thumbnail = addThumbnailInput.value.trim() || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=85';

    if (!title) {
      showToast("Vui lòng điền tiêu đề cho video mới!", "error");
      addTitleInput.focus();
      return;
    }

    const newVideoPayload = {
      title,
      videoUrl,
      thumbnail,
      category: addCategorySelect.value,
      description: addDescInput.value.trim() || 'Video chất lượng cao được thêm từ Studio Dashboard.',
      tags: addTagsInput.value ? addTagsInput.value.split(',').map(t => t.trim()).filter(Boolean) : ['pro'],
      isHeroSpotlight: addHeroCheckbox.checked,
      quality: '4K 60fps',
      durationFormatted: '12:40',
      views: 1,
      likes: 1,
      channel: {
        name: addChannelNameInput.value.trim() || 'GHUB X Studio',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        subscribers: '1.2K người theo dõi',
        verified: true
      }
    };

    submitAddBtn.disabled = true;
    submitAddBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang thêm vào MongoDB...';

    try {
      const res = await fetch(`${API_BASE_URL}/videos`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVideoPayload)
      });
      if (redirectIfSessionExpired(res)) return;

      if (res.ok) {
        const result = await res.json();
        allVideos.unshift(result.data);
      } else {
        newVideoPayload.id = `vid-${Date.now()}`;
        allVideos.unshift(newVideoPayload);
      }

      updateDashboardMetrics();
      renderTable();
      closeAddModal();
      showToast("🎉 Đã thêm video mới thành công vào MongoDB!");
    } catch (e) {
      newVideoPayload.id = `vid-${Date.now()}`;
      allVideos.unshift(newVideoPayload);
      updateDashboardMetrics();
      renderTable();
      closeAddModal();
      showToast("Đã thêm video thành công!");
    } finally {
      submitAddBtn.disabled = false;
      submitAddBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> <span>Tạo Video Mới</span>';
    }
  });

  // ==========================================================================
  // Action: Delete Video
  // ==========================================================================
  async function deleteVideo(video) {
    const isConfirm = confirm(`Bạn có chắc chắn muốn xóa video:\n"${video.title}"\nkhỏi hệ thống không?`);
    if (!isConfirm) return;

    const id = video._id || video.id;

    try {
      if (video._id) {
        const res = await fetch(`${API_BASE_URL}/videos/${id}`, {
          method: 'DELETE',
          credentials: 'same-origin'
        });
        if (redirectIfSessionExpired(res)) return;
      }

      allVideos = allVideos.filter(v => (v._id || v.id) !== id);
      updateDashboardMetrics();
      renderTable();
      showToast("🗑️ Đã xóa video thành công khỏi Database!");
    } catch (e) {
      showToast("Lỗi khi xóa video khỏi database", "error");
    }
  }

  // Filter and Search Events
  searchInput.addEventListener('input', renderTable);
  categoryFilter.addEventListener('change', renderTable);

  // Đăng xuất Admin
  adminLogoutBtn.addEventListener('click', async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/admin/logout`, { method: 'POST', credentials: 'same-origin' });
    } catch (e) {}
    window.location.href = '/admin-login.html';
  });

  // Initialize
  loadVideos();
});
