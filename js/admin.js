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
  const categoryOptionsList = document.getElementById('categoryOptionsList');
  const channelOptionsList = document.getElementById('channelOptionsList');
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
  const saveEditBtn = document.getElementById('saveEditBtn');
  const editDetectSourceBtn = document.getElementById('editDetectSourceBtn');
  const editSourcePreview = document.getElementById('editSourcePreview');
  const editSourcePreviewImg = document.getElementById('editSourcePreviewImg');
  const editSourcePreviewBadge = document.getElementById('editSourcePreviewBadge');
  const editSourcePreviewNote = document.getElementById('editSourcePreviewNote');

  // Add Modal Elements
  const openAddModalBtn = document.getElementById('openAddModalBtn');
  const addModal = document.getElementById('addModal');
  const closeAddModalBtn = document.getElementById('closeAddModalBtn');
  const cancelAddBtn = document.getElementById('cancelAddBtn');
  const addTitleInput = document.getElementById('addTitleInput');
  const addCategorySelect = document.getElementById('addCategorySelect');
  const addThumbnailInput = document.getElementById('addThumbnailInput');
  const addDescInput = document.getElementById('addDescInput');
  const addTagsInput = document.getElementById('addTagsInput');
  const addChannelNameInput = document.getElementById('addChannelNameInput');
  const submitAddBtn = document.getElementById('submitAddBtn');

  // Add Modal — Nguồn video (tabs Link/Nhúng vs Tải file lên vs Thêm hàng loạt)
  const sourceTabLink = document.getElementById('sourceTabLink');
  const sourceTabUpload = document.getElementById('sourceTabUpload');
  const sourceTabBulk = document.getElementById('sourceTabBulk');
  const sourcePanelLink = document.getElementById('sourcePanelLink');
  const sourcePanelUpload = document.getElementById('sourcePanelUpload');
  const sourcePanelBulk = document.getElementById('sourcePanelBulk');
  const addSourceInput = document.getElementById('addSourceInput');
  const detectSourceBtn = document.getElementById('detectSourceBtn');
  const sourcePreview = document.getElementById('sourcePreview');
  const sourcePreviewImg = document.getElementById('sourcePreviewImg');
  const sourcePreviewBadge = document.getElementById('sourcePreviewBadge');
  const sourcePreviewNote = document.getElementById('sourcePreviewNote');
  const addVideoFileInput = document.getElementById('addVideoFileInput');
  const addVideoFileName = document.getElementById('addVideoFileName');
  const bulkSourceInput = document.getElementById('bulkSourceInput');
  const bulkResultsBox = document.getElementById('bulkResultsBox');

  // Các nhóm field chỉ áp dụng cho 1 video — ẩn đi khi ở chế độ Thêm hàng loạt
  // vì mỗi dòng tự có tiêu đề/thumbnail riêng (hoặc tự suy ra), không có 1
  // giá trị chung nào hợp lý cho cả lô.
  const addTitleGroup = document.getElementById('addTitleGroup');
  const addThumbnailGroup = document.getElementById('addThumbnailGroup');
  const addDescGroup = document.getElementById('addDescGroup');

  let addSourceMode = 'link'; // 'link' | 'upload' | 'bulk'
  let detectedSource = null; // kết quả gần nhất từ /videos/detect-source

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

    // Category filter in toolbar (giữ nguyên dạng select — chỉ lọc, không cần gõ tự do)
    categoryFilter.innerHTML = '<option value="all">Tất cả thể loại</option>';
    existingCats.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      categoryFilter.appendChild(opt);
    });

    // Datalist gợi ý cho ô Thể loại (Thêm/Sửa) — vẫn là <input> nên admin có
    // thể gõ tự do 1 giá trị hoàn toàn mới không nằm trong danh sách gợi ý.
    if (categoryOptionsList) {
      categoryOptionsList.innerHTML = '';
      existingCats.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        categoryOptionsList.appendChild(opt);
      });
    }

    // Datalist gợi ý Tên Kênh dựa trên các kênh đã dùng trước đó.
    if (channelOptionsList) {
      const existingChannels = Array.from(new Set(allVideos.map(v => v.channel?.name).filter(Boolean)));
      channelOptionsList.innerHTML = '';
      existingChannels.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        channelOptionsList.appendChild(opt);
      });
    }
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
      const id = video._id || video.id;

      const tableThumbHtml = video.thumbnail
        ? `<img src="${video.thumbnail}" alt="${video.title}" class="table-thumb">`
        : `<div class="table-thumb table-thumb-empty"><i class="fa-solid fa-clapperboard"></i></div>`;

      tr.innerHTML = `
        <td style="color: var(--text-tertiary); font-weight: 600;">#${index + 1}</td>
        <td>
          <div class="video-cell">
            ${tableThumbHtml}
            <div>
              <div class="table-video-title" title="${video.title}">${video.title}</div>
              <div class="table-channel-name"><i class="fa-solid fa-user-circle"></i> ${channelName}</div>
            </div>
          </div>
        </td>
        <td><span class="category-tag-badge">${video.category || 'Chưa phân loại'}</span></td>
        <td style="font-weight: 600; color: #fff;">${formatNumber(video.views)}</td>
        <td style="color: #fff;"><i class="fa-regular fa-thumbs-up" style="color: var(--accent-primary);"></i> ${formatNumber(video.likes)}</td>
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
      tr.querySelector('.btn-action-icon.edit').addEventListener('click', () => openEditModal(video));
      tr.querySelector('.btn-action-icon.delete').addEventListener('click', () => deleteVideo(video));

      videoTableBody.appendChild(tr);
    });
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
    editSourcePreview.style.display = 'none';

    editModal.classList.add('active');
  }

  function closeEditModal() {
    editModal.classList.remove('active');
    currentEditingId = null;
    editSourcePreview.style.display = 'none';
  }

  const EDIT_PLATFORM_LABELS = {
    youtube: 'YouTube',
    vimeo: 'Vimeo',
    direct: 'Link trực tiếp',
    upload: 'File tải lên',
    other: 'Nhúng (Embed)'
  };

  editDetectSourceBtn.addEventListener('click', async () => {
    const input = editVideoUrlInput.value.trim();
    if (!input) {
      showToast('Vui lòng nhập link hoặc mã nhúng trước khi nhận diện.', 'error');
      return;
    }

    editDetectSourceBtn.disabled = true;
    editDetectSourceBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang nhận diện...';

    try {
      const res = await fetch(`${API_BASE_URL}/videos/detect-source`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input })
      });
      if (redirectIfSessionExpired(res)) return;

      const json = await res.json();
      if (!res.ok || !json.success) {
        editSourcePreview.style.display = 'none';
        showToast(json.message || 'Không nhận diện được nguồn video.', 'error');
        return;
      }

      editSourcePreview.style.display = 'flex';
      editSourcePreviewBadge.textContent = EDIT_PLATFORM_LABELS[json.platform] || json.sourceType;
      editSourcePreviewImg.src = json.thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=85';

      if (json.thumbnail && !editThumbnailInput.value.trim()) {
        editThumbnailInput.value = json.thumbnail;
        editSourcePreviewNote.textContent = 'Đã tự điền ảnh bìa vào ô Thumbnail bên trên.';
      } else if (json.thumbnail) {
        editSourcePreviewNote.textContent = 'Đã tìm thấy ảnh bìa tự động (ô Thumbnail hiện có nội dung nên giữ nguyên).';
      } else if (json.sourceType === 'direct') {
        editSourcePreviewNote.textContent = 'Sẽ tự trích khung hình làm thumbnail khi lưu (nếu ô Thumbnail để trống).';
      } else {
        editSourcePreviewNote.textContent = 'Nguồn này không có cách lấy ảnh thật công khai — video sẽ chưa có ảnh bìa cho tới khi bạn tự nhập/tải/quét ảnh vào ô Thumbnail bên trên.';
      }

      showToast('Đã nhận diện nguồn video! Nhớ bấm "Lưu Thay Đổi" để áp dụng.', 'success');
    } catch (e) {
      showToast('Không thể kết nối tới server để nhận diện nguồn video.', 'error');
    } finally {
      editDetectSourceBtn.disabled = false;
      editDetectSourceBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Nhận diện &amp; Xem trước';
    }
  });

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

  function resetSourcePreview() {
    detectedSource = null;
    sourcePreview.style.display = 'none';
    sourcePreviewImg.src = '';
    sourcePreviewBadge.textContent = '—';
    sourcePreviewNote.textContent = '';
  }

  function switchSourceMode(mode) {
    addSourceMode = mode;
    const isLink = mode === 'link';
    const isUpload = mode === 'upload';
    const isBulk = mode === 'bulk';

    sourceTabLink.classList.toggle('active', isLink);
    sourceTabUpload.classList.toggle('active', isUpload);
    sourceTabBulk.classList.toggle('active', isBulk);
    sourcePanelLink.style.display = isLink ? 'flex' : 'none';
    sourcePanelUpload.style.display = isUpload ? 'flex' : 'none';
    sourcePanelBulk.style.display = isBulk ? 'flex' : 'none';

    // Chế độ Thêm hàng loạt: ẩn các field chỉ dùng cho 1 video (tiêu đề,
    // thumbnail, mô tả) — Thể loại/Kênh/Tags vẫn hiện vì áp dụng chung.
    addTitleGroup.style.display = isBulk ? 'none' : '';
    addThumbnailGroup.style.display = isBulk ? 'none' : '';
    addDescGroup.style.display = isBulk ? 'none' : '';

    submitAddBtn.innerHTML = isBulk
      ? '<i class="fa-solid fa-layer-group"></i> <span>Thêm Hàng Loạt</span>'
      : '<i class="fa-solid fa-cloud-arrow-up"></i> <span>Tạo Video Mới</span>';
  }

  sourceTabLink.addEventListener('click', () => switchSourceMode('link'));
  sourceTabUpload.addEventListener('click', () => switchSourceMode('upload'));
  sourceTabBulk.addEventListener('click', () => switchSourceMode('bulk'));

  addVideoFileInput.addEventListener('change', () => {
    const file = addVideoFileInput.files[0];
    addVideoFileName.textContent = file ? file.name : 'Chọn file video (MP4, WebM, MOV...)';
  });

  const PLATFORM_LABELS = {
    youtube: 'YouTube',
    vimeo: 'Vimeo',
    direct: 'Link trực tiếp',
    other: 'Nhúng (Embed)'
  };

  detectSourceBtn.addEventListener('click', async () => {
    const input = addSourceInput.value.trim();
    if (!input) {
      showToast('Vui lòng dán link hoặc mã nhúng trước khi nhận diện.', 'error');
      return;
    }

    detectSourceBtn.disabled = true;
    detectSourceBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang nhận diện...';

    try {
      const res = await fetch(`${API_BASE_URL}/videos/detect-source`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input })
      });
      if (redirectIfSessionExpired(res)) return;

      const json = await res.json();
      if (!res.ok || !json.success) {
        resetSourcePreview();
        showToast(json.message || 'Không nhận diện được nguồn video.', 'error');
        return;
      }

      detectedSource = json;
      sourcePreview.style.display = 'flex';
      sourcePreviewBadge.textContent = PLATFORM_LABELS[json.platform] || json.sourceType;
      sourcePreviewImg.src = json.thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=85';

      if (json.thumbnail) {
        sourcePreviewNote.textContent = 'Đã tự suy ra thumbnail — sẽ dùng ảnh này nếu bạn không nhập ảnh bìa riêng.';
        if (!addThumbnailInput.value.trim()) addThumbnailInput.placeholder = json.thumbnail;
      } else if (json.sourceType === 'direct') {
        sourcePreviewNote.textContent = 'Sẽ tự trích 1 khung hình làm thumbnail khi lưu video.';
      } else {
        sourcePreviewNote.textContent = 'Nguồn này không có cách lấy ảnh thật công khai (thường gặp ở link nhúng từ mixdrop/streamtape...) — video sẽ chưa có ảnh bìa cho tới khi bạn tự nhập link ảnh, tải ảnh lên, hoặc dùng công cụ quét màn hình bên dưới.';
      }

      showToast('Đã nhận diện nguồn video!', 'success');
    } catch (e) {
      showToast('Không thể kết nối tới server để nhận diện nguồn video.', 'error');
    } finally {
      detectSourceBtn.disabled = false;
      detectSourceBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Nhận diện &amp; Xem trước';
    }
  });

  addSourceInput.addEventListener('input', resetSourcePreview);

  function closeAddModal() {
    addModal.classList.remove('active');
    addTitleInput.value = '';
    addCategorySelect.value = '';
    addThumbnailInput.value = '';
    addThumbnailInput.placeholder = 'https://images.unsplash.com/photo-... (tùy chọn)';
    addSourceInput.value = '';
    addDescInput.value = '';
    addTagsInput.value = '';
    addChannelNameInput.value = '';
    addVideoFileInput.value = '';
    addVideoFileName.textContent = 'Chọn file video (MP4, WebM, MOV...)';
    bulkSourceInput.value = '';
    bulkResultsBox.style.display = 'none';
    bulkResultsBox.innerHTML = '';
    resetSourcePreview();
    switchSourceMode('link');
  }

  closeAddModalBtn.addEventListener('click', closeAddModal);
  cancelAddBtn.addEventListener('click', closeAddModal);

  // Hiển thị kết quả /videos/bulk (tổng số / thành công / thất bại + lý do
  // từng dòng lỗi) ngay trong modal để admin biết dòng nào cần dán lại.
  function renderBulkResults(json) {
    const { summary, failedItems } = json;
    bulkResultsBox.style.display = 'block';

    let html = `<div class="bulk-results-summary">
      Kết quả: <strong>${summary.succeeded}/${summary.total}</strong> video đã thêm thành công`
      + (summary.failed > 0 ? `, <strong style="color:#ff6b6b;">${summary.failed}</strong> thất bại.` : '.')
      + `</div>`;

    if (failedItems && failedItems.length) {
      html += '<ul class="bulk-results-errors">';
      failedItems.forEach(item => {
        const sourcePreviewText = (item.source || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        html += `<li><strong>Dòng ${item.line}:</strong> ${item.message} <span class="bulk-error-source">(${sourcePreviewText}${sourcePreviewText.length >= 160 ? '…' : ''})</span></li>`;
      });
      html += '</ul>';
    }

    bulkResultsBox.innerHTML = html;
  }

  submitAddBtn.addEventListener('click', async () => {
    if (addSourceMode === 'bulk') {
      const sources = bulkSourceInput.value.trim();
      if (!sources) {
        showToast('Vui lòng dán danh sách link/mã nhúng, mỗi dòng 1 video.', 'error');
        bulkSourceInput.focus();
        return;
      }

      const bulkPayload = {
        sources,
        category: addCategorySelect.value,
        tags: addTagsInput.value ? addTagsInput.value.split(',').map(t => t.trim()).filter(Boolean) : ['pro'],
        channelName: addChannelNameInput.value.trim() || 'GHUB X Studio'
      };

      submitAddBtn.disabled = true;
      submitAddBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang thêm hàng loạt...';
      bulkResultsBox.style.display = 'none';

      try {
        const res = await fetch(`${API_BASE_URL}/videos/bulk`, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bulkPayload)
        });
        if (redirectIfSessionExpired(res)) return;

        const json = await res.json().catch(() => null);

        if (json?.summary) {
          renderBulkResults(json);
        }

        if (res.ok && json?.success && Array.isArray(json.data) && json.data.length) {
          allVideos.unshift(...json.data);
          updateDashboardMetrics();
          renderTable();
          bulkSourceInput.value = '';
          showToast(`🎉 Đã thêm ${json.summary.succeeded}/${json.summary.total} video thành công!`);
        } else if (!json?.summary) {
          showToast(json?.message || 'Có lỗi xảy ra khi thêm hàng loạt video.', 'error');
        } else {
          showToast('Không có video nào được thêm — xem chi tiết lỗi bên dưới.', 'error');
        }
      } catch (e) {
        showToast('Không thể kết nối tới server để thêm hàng loạt video.', 'error');
      } finally {
        submitAddBtn.disabled = false;
        submitAddBtn.innerHTML = '<i class="fa-solid fa-layer-group"></i> <span>Thêm Hàng Loạt</span>';
      }
      return;
    }

    const title = addTitleInput.value.trim();
    if (!title) {
      showToast("Vui lòng điền tiêu đề cho video mới!", "error");
      addTitleInput.focus();
      return;
    }

    const commonFields = {
      title,
      category: addCategorySelect.value,
      description: addDescInput.value.trim(),
      tags: addTagsInput.value ? addTagsInput.value.split(',').map(t => t.trim()).filter(Boolean) : ['pro'],
      channelName: addChannelNameInput.value.trim() || 'GHUB X Studio'
    };
    const thumbnailOverride = addThumbnailInput.value.trim();

    let requestOptions;

    if (addSourceMode === 'upload') {
      const file = addVideoFileInput.files[0];
      if (!file) {
        showToast('Vui lòng chọn 1 file video để tải lên.', 'error');
        return;
      }
      const formData = new FormData();
      Object.entries(commonFields).forEach(([key, value]) => {
        if (key === 'tags') formData.append('tags', value.join(','));
        else formData.append(key, value);
      });
      if (thumbnailOverride) formData.append('thumbnail', thumbnailOverride);
      formData.append('video', file);
      // KHÔNG set 'Content-Type' thủ công — trình duyệt tự thêm boundary cho multipart/form-data.
      requestOptions = { method: 'POST', credentials: 'same-origin', body: formData };
    } else {
      const sourceInput = addSourceInput.value.trim();
      if (!sourceInput) {
        showToast('Vui lòng dán link hoặc mã nhúng video.', 'error');
        return;
      }
      const jsonPayload = { ...commonFields, sourceInput };
      if (thumbnailOverride) jsonPayload.thumbnail = thumbnailOverride;
      requestOptions = {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonPayload)
      };
    }

    submitAddBtn.disabled = true;
    submitAddBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang thêm vào MongoDB...';

    try {
      const res = await fetch(`${API_BASE_URL}/videos`, requestOptions);
      if (redirectIfSessionExpired(res)) return;

      const json = await res.json().catch(() => null);

      if (res.ok && json?.success) {
        allVideos.unshift(json.data);
        updateDashboardMetrics();
        renderTable();
        closeAddModal();
        showToast("🎉 Đã thêm video mới thành công vào MongoDB!");
      } else {
        showToast(json?.message || 'Có lỗi xảy ra khi thêm video.', 'error');
      }
    } catch (e) {
      showToast('Không thể kết nối tới server để thêm video.', 'error');
    } finally {
      submitAddBtn.disabled = false;
      submitAddBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> <span>Tạo Video Mới</span>';
    }
  });

  // ==========================================================================
  // Công cụ "Quét màn hình" (Snipping Tool) làm Thumbnail
  //
  // Ý tưởng: nếu 1 nguồn video không tự suy ra được thumbnail (vd mã nhúng từ
  // mixdrop/streamtape...), thay vì luôn dùng ảnh placeholder tự sinh, admin
  // có thể tự "quét" 1 khung hình ưng ý (từ chính video đang phát trên màn
  // hình, hoặc từ trang gốc của nguồn nhúng) để làm thumbnail thật.
  //
  // Cách hoạt động: dùng getDisplayMedia() để xin quyền chia sẻ màn
  // hình/cửa sổ/tab (trình duyệt tự hỏi quyền — không có cách nào chụp toàn
  // màn hình mà không qua bước xin quyền này). Sau khi có luồng hình, hiển
  // thị trực tiếp lên overlay toàn màn hình; admin kéo chuột chọn vùng cần
  // lấy — NGAY khi thả chuột ra, vùng đó được cắt và tải lên server làm
  // thumbnail, không cần thêm bước xác nhận nào khác.
  // ==========================================================================
  const snipOverlay = document.getElementById('snipOverlay');
  const snipVideo = document.getElementById('snipVideo');
  const snipCanvas = document.getElementById('snipCanvas');
  const snipCancelBtn = document.getElementById('snipCancelBtn');
  const addSnipThumbnailBtn = document.getElementById('addSnipThumbnailBtn');
  const editSnipThumbnailBtn = document.getElementById('editSnipThumbnailBtn');

  let snipStream = null;
  let snipTargetInput = null; // input Thumbnail (Add hoặc Edit) sẽ nhận URL sau khi chụp
  let snipDragStart = null;

  function stopSnipStream() {
    if (snipStream) {
      snipStream.getTracks().forEach(t => t.stop());
      snipStream = null;
    }
    snipOverlay.style.display = 'none';
    snipVideo.srcObject = null;
    snipDragStart = null;
  }

  function resizeSnipCanvas() {
    const rect = snipVideo.getBoundingClientRect();
    snipCanvas.width = rect.width;
    snipCanvas.height = rect.height;
    snipCanvas.style.left = `${rect.left}px`;
    snipCanvas.style.top = `${rect.top}px`;
  }

  async function startSnipTool(targetInput) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      showToast('Trình duyệt này không hỗ trợ quét màn hình — hãy dùng Chrome/Edge bản mới trên máy tính.', 'error');
      return;
    }

    let stream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: 'always' }, audio: false });
    } catch (e) {
      return; // Người dùng bấm Hủy trên hộp thoại chọn màn hình, hoặc bị chặn quyền — không làm gì thêm.
    }

    snipStream = stream;
    snipTargetInput = targetInput;
    snipVideo.srcObject = stream;
    snipOverlay.style.display = 'flex';

    // Nếu người dùng tự dừng chia sẻ màn hình từ thanh thông báo của trình
    // duyệt (thay vì nút Hủy trong overlay) thì cũng phải tự đóng overlay lại.
    stream.getVideoTracks()[0].addEventListener('ended', stopSnipStream);

    await new Promise(resolve => {
      if (snipVideo.readyState >= 2) return resolve();
      snipVideo.onloadedmetadata = () => resolve();
    });
    resizeSnipCanvas();
  }

  window.addEventListener('resize', () => {
    if (snipOverlay.style.display === 'flex') resizeSnipCanvas();
  });

  function drawSnipSelection(x0, y0, x1, y1) {
    const ctx = snipCanvas.getContext('2d');
    ctx.clearRect(0, 0, snipCanvas.width, snipCanvas.height);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(0, 0, snipCanvas.width, snipCanvas.height);
    const x = Math.min(x0, x1);
    const y = Math.min(y0, y1);
    const w = Math.abs(x1 - x0);
    const h = Math.abs(y1 - y0);
    ctx.clearRect(x, y, w, h);
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
  }

  // Ảnh hiển thị trên <video> có thể bị co giãn khác tỉ lệ thật của luồng
  // hình (videoWidth/videoHeight) — phải quy đổi toạ độ vùng chọn theo đúng
  // tỉ lệ thật trước khi crop, nếu không ảnh cắt ra sẽ bị lệch vùng đã chọn.
  async function captureSnipSelection(selX, selY, selW, selH) {
    const displayRect = snipVideo.getBoundingClientRect();
    const scaleX = snipVideo.videoWidth / displayRect.width;
    const scaleY = snipVideo.videoHeight / displayRect.height;

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = Math.max(1, Math.round(selW * scaleX));
    cropCanvas.height = Math.max(1, Math.round(selH * scaleY));
    const ctx = cropCanvas.getContext('2d');
    ctx.drawImage(
      snipVideo,
      selX * scaleX, selY * scaleY, selW * scaleX, selH * scaleY,
      0, 0, cropCanvas.width, cropCanvas.height
    );

    const blob = await new Promise(resolve => cropCanvas.toBlob(resolve, 'image/png'));
    const targetInput = snipTargetInput;
    stopSnipStream();

    if (!blob) {
      showToast('Không chụp được ảnh, thử lại nhé.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('thumbnail', blob, 'snip.png');

    try {
      const res = await fetch(`${API_BASE_URL}/videos/thumbnail-snip`, {
        method: 'POST',
        credentials: 'same-origin',
        body: formData
      });
      if (redirectIfSessionExpired(res)) return;
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && targetInput) {
        targetInput.value = json.url;
        showToast('Đã lưu ảnh quét màn hình làm thumbnail!', 'success');
      } else {
        showToast(json?.message || 'Không lưu được ảnh vừa quét.', 'error');
      }
    } catch (e) {
      showToast('Không thể kết nối tới server để lưu ảnh vừa quét.', 'error');
    }
  }

  snipCanvas.addEventListener('mousedown', (e) => {
    const rect = snipCanvas.getBoundingClientRect();
    snipDragStart = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  });

  snipCanvas.addEventListener('mousemove', (e) => {
    if (!snipDragStart) return;
    const rect = snipCanvas.getBoundingClientRect();
    drawSnipSelection(snipDragStart.x, snipDragStart.y, e.clientX - rect.left, e.clientY - rect.top);
  });

  snipCanvas.addEventListener('mouseup', (e) => {
    if (!snipDragStart) return;
    const rect = snipCanvas.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;
    const { x: startX, y: startY } = snipDragStart;
    snipDragStart = null;

    const selX = Math.min(startX, endX);
    const selY = Math.min(startY, endY);
    const selW = Math.abs(endX - startX);
    const selH = Math.abs(endY - startY);

    if (selW < 20 || selH < 20) {
      // Vùng chọn quá nhỏ (nhiều khả năng chỉ là 1 cú click nhầm) — bỏ qua, không lưu.
      const ctx = snipCanvas.getContext('2d');
      ctx.clearRect(0, 0, snipCanvas.width, snipCanvas.height);
      return;
    }

    captureSnipSelection(selX, selY, selW, selH);
  });

  snipCancelBtn.addEventListener('click', stopSnipStream);
  if (addSnipThumbnailBtn) addSnipThumbnailBtn.addEventListener('click', () => startSnipTool(addThumbnailInput));
  if (editSnipThumbnailBtn) editSnipThumbnailBtn.addEventListener('click', () => startSnipTool(editThumbnailInput));

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

  // ==========================================================================
  // Mục Hero Banner — quản lý RIÊNG (không còn gắn vào từng video như trước).
  // Tối đa 10 slide, chỉ ảnh (không chữ). Mỗi slide: dán link ảnh / tải ảnh
  // lên / chọn 1 video có sẵn (lấy thumbnail làm ảnh, bấm slide mở video đó).
  // ==========================================================================
  const navSectionVideos = document.getElementById('navSectionVideos');
  const navSectionHeroBanner = document.getElementById('navSectionHeroBanner');
  const navSectionMedia = document.getElementById('navSectionMedia');
  const videoManagementSection = document.getElementById('videoManagementSection');
  const heroBannerSection = document.getElementById('heroBannerSection');
  const mediaSection = document.getElementById('mediaSection');
  const openAddBannerBtn = document.getElementById('openAddBannerBtn');
  const heroBannerCount = document.getElementById('heroBannerCount');
  const heroBannerGrid = document.getElementById('heroBannerGrid');
  const refreshMediaBtn = document.getElementById('refreshMediaBtn');
  const mediaCount = document.getElementById('mediaCount');
  const mediaGrid = document.getElementById('mediaGrid');

  const addBannerModal = document.getElementById('addBannerModal');
  const closeAddBannerModalBtn = document.getElementById('closeAddBannerModalBtn');
  const cancelAddBannerBtn = document.getElementById('cancelAddBannerBtn');
  const submitAddBannerBtn = document.getElementById('submitAddBannerBtn');
  const bannerTabLink = document.getElementById('bannerTabLink');
  const bannerTabUpload = document.getElementById('bannerTabUpload');
  const bannerTabVideo = document.getElementById('bannerTabVideo');
  const bannerPanelLink = document.getElementById('bannerPanelLink');
  const bannerPanelUpload = document.getElementById('bannerPanelUpload');
  const bannerPanelVideo = document.getElementById('bannerPanelVideo');
  const bannerImageUrlInput = document.getElementById('bannerImageUrlInput');
  const bannerImageFileInput = document.getElementById('bannerImageFileInput');
  const bannerImageFileName = document.getElementById('bannerImageFileName');
  const bannerVideoSearchInput = document.getElementById('bannerVideoSearchInput');
  const bannerVideoPicker = document.getElementById('bannerVideoPicker');

  const MAX_HERO_BANNERS = 10;
  let heroBanners = [];
  let bannerMode = 'link'; // 'link' | 'upload' | 'video'
  let selectedBannerVideoId = null;

  function switchAdminSection(section) {
    navSectionVideos.classList.toggle('active', section === 'videos');
    navSectionHeroBanner.classList.toggle('active', section === 'hero');
    navSectionMedia.classList.toggle('active', section === 'media');
    videoManagementSection.style.display = section === 'videos' ? '' : 'none';
    heroBannerSection.style.display = section === 'hero' ? '' : 'none';
    mediaSection.style.display = section === 'media' ? '' : 'none';
  }
  navSectionVideos.addEventListener('click', (e) => { e.preventDefault(); switchAdminSection('videos'); });
  navSectionHeroBanner.addEventListener('click', (e) => {
    e.preventDefault();
    switchAdminSection('hero');
    loadHeroBanners();
  });
  navSectionMedia.addEventListener('click', (e) => {
    e.preventDefault();
    switchAdminSection('media');
    loadMediaLibrary();
  });

  async function loadHeroBanners() {
    try {
      const res = await fetch(`${API_BASE_URL}/hero-banners`);
      const json = await res.json().catch(() => null);
      heroBanners = (res.ok && json?.success) ? json.data : [];
    } catch (e) {
      heroBanners = [];
    }
    renderHeroBannerGrid();
  }

  function renderHeroBannerGrid() {
    heroBannerCount.textContent = `${heroBanners.length} / ${MAX_HERO_BANNERS} slide`;
    openAddBannerBtn.disabled = heroBanners.length >= MAX_HERO_BANNERS;
    heroBannerGrid.innerHTML = '';

    if (heroBanners.length === 0) {
      heroBannerGrid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color: var(--text-tertiary);">Chưa có slide nào — bấm "Thêm Slide" để bắt đầu.</div>`;
      return;
    }

    heroBanners.forEach(banner => {
      const card = document.createElement('div');
      card.className = 'hero-banner-card';
      const badgeText = banner.video ? `🎬 Gắn video: ${banner.video.title}` : 'Ảnh tĩnh (không gắn video)';
      card.innerHTML = `
        <img src="${banner.image}" class="hero-banner-card-img" alt="Hero Banner slide">
        <button class="hero-banner-card-delete" title="Xóa slide"><i class="fa-solid fa-trash"></i></button>
        <div class="hero-banner-card-info">
          <span class="hero-banner-card-badge" title="${badgeText}">${badgeText}</span>
          <input type="number" class="hero-banner-order-input" value="${banner.order || 0}" title="Thứ tự (số nhỏ hiện trước)">
        </div>
      `;
      card.querySelector('.hero-banner-card-delete').addEventListener('click', () => deleteHeroBanner(banner));
      card.querySelector('.hero-banner-order-input').addEventListener('change', (e) => updateHeroBannerOrder(banner, e.target.value));
      heroBannerGrid.appendChild(card);
    });
  }

  async function deleteHeroBanner(banner) {
    const isConfirm = confirm('Xóa slide Hero Banner này?');
    if (!isConfirm) return;
    try {
      const res = await fetch(`${API_BASE_URL}/hero-banners/${banner._id}`, { method: 'DELETE', credentials: 'same-origin' });
      if (redirectIfSessionExpired(res)) return;
      heroBanners = heroBanners.filter(b => b._id !== banner._id);
      renderHeroBannerGrid();
      showToast('Đã xóa slide Hero Banner');
    } catch (e) {
      showToast('Lỗi khi xóa slide', 'error');
    }
  }

  async function updateHeroBannerOrder(banner, newOrder) {
    try {
      const res = await fetch(`${API_BASE_URL}/hero-banners/${banner._id}`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: Number(newOrder) || 0 })
      });
      if (redirectIfSessionExpired(res)) return;
      const json = await res.json().catch(() => null);
      if (json?.success) {
        banner.order = json.data.order;
        showToast('Đã cập nhật thứ tự slide');
      }
    } catch (e) {
      showToast('Lỗi khi cập nhật thứ tự', 'error');
    }
  }

  function switchBannerMode(mode) {
    bannerMode = mode;
    bannerTabLink.classList.toggle('active', mode === 'link');
    bannerTabUpload.classList.toggle('active', mode === 'upload');
    bannerTabVideo.classList.toggle('active', mode === 'video');
    bannerPanelLink.style.display = mode === 'link' ? 'flex' : 'none';
    bannerPanelUpload.style.display = mode === 'upload' ? 'flex' : 'none';
    bannerPanelVideo.style.display = mode === 'video' ? 'flex' : 'none';
    if (mode === 'video') renderBannerVideoPicker();
  }
  bannerTabLink.addEventListener('click', () => switchBannerMode('link'));
  bannerTabUpload.addEventListener('click', () => switchBannerMode('upload'));
  bannerTabVideo.addEventListener('click', () => switchBannerMode('video'));

  bannerImageFileInput.addEventListener('change', () => {
    const file = bannerImageFileInput.files[0];
    bannerImageFileName.textContent = file ? file.name : 'Chọn ảnh banner (JPG, PNG, WebP...)';
  });

  // Danh sách video để chọn khi ở chế độ "Chọn từ Video" — tái dùng allVideos
  // đã tải sẵn cho bảng quản lý, không cần gọi API riêng. Chỉ hiện video ĐÃ
  // có ảnh bìa thật — video chưa có ảnh bìa (không còn tự tạo ảnh giả lập)
  // sẽ không dùng được làm Hero Banner cho tới khi admin tự thêm ảnh bìa.
  function renderBannerVideoPicker() {
    const query = bannerVideoSearchInput.value.trim().toLowerCase();
    const withThumb = allVideos.filter(v => !!v.thumbnail);
    const skippedCount = allVideos.length - withThumb.length;
    const filtered = withThumb.filter(v => !query || v.title.toLowerCase().includes(query));
    bannerVideoPicker.innerHTML = '';
    if (filtered.length === 0) {
      bannerVideoPicker.innerHTML = `<div style="padding:10px; color:var(--text-tertiary); font-size:0.84rem;">Không tìm thấy video nào có ảnh bìa.</div>`;
      return;
    }
    if (skippedCount > 0 && !query) {
      const note = document.createElement('div');
      note.style.cssText = 'padding:6px 10px; color:var(--text-tertiary); font-size:0.78rem;';
      note.textContent = `Đã ẩn ${skippedCount} video chưa có ảnh bìa.`;
      bannerVideoPicker.appendChild(note);
    }
    filtered.forEach(v => {
      const id = v._id || v.id;
      const item = document.createElement('div');
      item.className = `hero-banner-video-pick-item ${selectedBannerVideoId === id ? 'selected' : ''}`;
      item.innerHTML = `<img src="${v.thumbnail}" alt="">
        <span>${v.title}</span>`;
      item.addEventListener('click', () => {
        selectedBannerVideoId = id;
        renderBannerVideoPicker();
      });
      bannerVideoPicker.appendChild(item);
    });
  }
  bannerVideoSearchInput.addEventListener('input', renderBannerVideoPicker);

  function openAddBannerModal() {
    if (heroBanners.length >= MAX_HERO_BANNERS) {
      showToast(`Đã đạt tối đa ${MAX_HERO_BANNERS} slide Hero Banner.`, 'error');
      return;
    }
    bannerImageUrlInput.value = '';
    bannerImageFileInput.value = '';
    bannerImageFileName.textContent = 'Chọn ảnh banner (JPG, PNG, WebP...)';
    bannerVideoSearchInput.value = '';
    selectedBannerVideoId = null;
    switchBannerMode('link');
    addBannerModal.classList.add('active');
  }
  function closeAddBannerModal() {
    addBannerModal.classList.remove('active');
  }
  openAddBannerBtn.addEventListener('click', openAddBannerModal);
  closeAddBannerModalBtn.addEventListener('click', closeAddBannerModal);
  cancelAddBannerBtn.addEventListener('click', closeAddBannerModal);

  submitAddBannerBtn.addEventListener('click', async () => {
    let requestOptions;

    if (bannerMode === 'upload') {
      const file = bannerImageFileInput.files[0];
      if (!file) {
        showToast('Vui lòng chọn 1 ảnh để tải lên.', 'error');
        return;
      }
      const formData = new FormData();
      formData.append('thumbnail', file);
      requestOptions = { method: 'POST', credentials: 'same-origin', body: formData };
    } else if (bannerMode === 'video') {
      if (!selectedBannerVideoId) {
        showToast('Vui lòng chọn 1 video từ danh sách.', 'error');
        return;
      }
      requestOptions = {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: selectedBannerVideoId })
      };
    } else {
      const url = bannerImageUrlInput.value.trim();
      if (!url) {
        showToast('Vui lòng dán link ảnh banner.', 'error');
        return;
      }
      requestOptions = {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: url })
      };
    }

    submitAddBannerBtn.disabled = true;
    submitAddBannerBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang thêm...';

    try {
      const res = await fetch(`${API_BASE_URL}/hero-banners`, requestOptions);
      if (redirectIfSessionExpired(res)) return;
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        heroBanners.push(json.data);
        renderHeroBannerGrid();
        closeAddBannerModal();
        showToast('🎉 Đã thêm slide Hero Banner!');
      } else {
        showToast(json?.message || 'Có lỗi khi thêm slide.', 'error');
      }
    } catch (e) {
      showToast('Không thể kết nối tới server.', 'error');
    } finally {
      submitAddBannerBtn.disabled = false;
      submitAddBannerBtn.innerHTML = '<i class="fa-solid fa-plus"></i> <span>Thêm Slide</span>';
    }
  });

  // ==========================================================================
  // Mục Thư viện ảnh — xem lại & dọn dẹp ảnh đã tải lên/quét màn hình. Xoá
  // video giờ KHÔNG còn tự xoá ảnh thumbnail nữa (xem videoController.js#
  // deleteVideo), nên ảnh không dùng nữa cần dọn thủ công ở đây.
  // ==========================================================================
  let mediaFiles = [];

  function formatFileSize(bytes) {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function loadMediaLibrary() {
    mediaGrid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color: var(--text-tertiary);"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải...</div>`;
    try {
      const res = await fetch(`${API_BASE_URL}/media`, { credentials: 'same-origin' });
      if (redirectIfSessionExpired(res)) return;
      const json = await res.json().catch(() => null);
      mediaFiles = (res.ok && json?.success) ? json.data : [];
    } catch (e) {
      mediaFiles = [];
    }
    renderMediaGrid();
  }

  function renderMediaGrid() {
    mediaCount.textContent = `${mediaFiles.length} ảnh`;
    mediaGrid.innerHTML = '';

    if (mediaFiles.length === 0) {
      mediaGrid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color: var(--text-tertiary);">Chưa có ảnh nào được tải lên/quét màn hình.</div>`;
      return;
    }

    mediaFiles.forEach(file => {
      const card = document.createElement('div');
      card.className = 'hero-banner-card';
      const badgeText = file.inUse
        ? `🔒 Đang dùng: ${file.usedBy.join(', ')}`
        : 'Chưa dùng ở đâu';
      card.innerHTML = `
        <img src="${file.url}" class="hero-banner-card-img" alt="Ảnh trong thư viện">
        <button class="hero-banner-card-delete" title="${file.inUse ? 'Ảnh đang được dùng, không thể xoá' : 'Xoá ảnh'}" ${file.inUse ? 'disabled style="opacity:0.35; cursor:not-allowed;"' : ''}>
          <i class="fa-solid fa-trash"></i>
        </button>
        <div class="hero-banner-card-info">
          <span class="hero-banner-card-badge" title="${badgeText}">${badgeText}</span>
          <span style="font-size:0.72rem; color:var(--text-tertiary);">${formatFileSize(file.size)}</span>
        </div>
      `;
      if (!file.inUse) {
        card.querySelector('.hero-banner-card-delete').addEventListener('click', () => deleteMediaFileItem(file));
      }
      mediaGrid.appendChild(card);
    });
  }

  async function deleteMediaFileItem(file) {
    const isConfirm = confirm(`Xoá ảnh "${file.filename}"? Không thể hoàn tác.`);
    if (!isConfirm) return;
    try {
      const res = await fetch(`${API_BASE_URL}/media/${encodeURIComponent(file.filename)}`, { method: 'DELETE', credentials: 'same-origin' });
      if (redirectIfSessionExpired(res)) return;
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        mediaFiles = mediaFiles.filter(f => f.filename !== file.filename);
        renderMediaGrid();
        showToast('Đã xoá ảnh.');
      } else {
        showToast(json?.message || 'Không thể xoá ảnh này.', 'error');
      }
    } catch (e) {
      showToast('Lỗi khi xoá ảnh.', 'error');
    }
  }

  refreshMediaBtn.addEventListener('click', loadMediaLibrary);

  // Initialize
  loadVideos();
});
