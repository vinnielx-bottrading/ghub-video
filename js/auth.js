// ==========================================================================
// GHUB X - Đăng ký / Đăng nhập người xem + CAPTCHA tự sinh (không API key)
// ==========================================================================
(function () {
  const API_BASE_URL = `${window.location.origin}/api`;

  function toast(message, type) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'toast';
    const icon = type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-exclamation' : 'fa-sparkles';
    const color = type === 'success' ? '#10b981' : type === 'error' ? 'var(--accent-primary)' : 'var(--accent-primary)';
    el.innerHTML = `<i class="fa-solid ${icon}" style="color:${color};"></i> <span>${message}</span>`;
    container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(100%)';
      el.style.transition = 'all 0.3s ease';
      setTimeout(() => el.remove(), 300);
    }, 3500);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const headerAuthSlot = document.getElementById('headerAuthSlot');
    const authModal = document.getElementById('authModal');
    const authModalClose = document.getElementById('authModalClose');
    const tabLoginBtn = document.getElementById('authTabLogin');
    const tabRegisterBtn = document.getElementById('authTabRegister');
    const loginForm = document.getElementById('loginFormViewer');
    const registerForm = document.getElementById('registerFormViewer');
    const captchaImg = document.getElementById('captchaImg');
    const captchaRefreshBtn = document.getElementById('captchaRefreshBtn');

    if (!headerAuthSlot || !authModal) return; // trang không có auth UI (vd: admin.html)

    let currentUser = null;

    function openModal(tab) {
      authModal.classList.add('active');
      switchTab(tab || 'login');
      refreshCaptcha();
    }

    function closeModal() {
      authModal.classList.remove('active');
    }

    function switchTab(tab) {
      const isLogin = tab === 'login';
      tabLoginBtn.classList.toggle('active', isLogin);
      tabRegisterBtn.classList.toggle('active', !isLogin);
      loginForm.style.display = isLogin ? 'flex' : 'none';
      registerForm.style.display = isLogin ? 'none' : 'flex';
    }

    function refreshCaptcha() {
      if (captchaImg) captchaImg.src = `${API_BASE_URL}/auth/captcha?t=${Date.now()}`;
    }

    function renderAuthSlot() {
      if (currentUser) {
        headerAuthSlot.innerHTML = `
          <div class="user-session-pill" title="${currentUser.username}">
            <div class="user-avatar-ring"><i class="fa-solid fa-circle-user"></i></div>
            <span class="user-session-name">${currentUser.username}</span>
            <button class="btn-logout-mini" id="logoutBtnViewer" title="Đăng xuất">
              <i class="fa-solid fa-right-from-bracket"></i>
            </button>
          </div>`;
        const logoutBtn = document.getElementById('logoutBtnViewer');
        if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
      } else {
        headerAuthSlot.innerHTML = `
          <button class="btn-login-header" id="openLoginBtnViewer">
            <i class="fa-solid fa-right-to-bracket"></i>
            <span>Đăng nhập</span>
          </button>`;
        const openBtn = document.getElementById('openLoginBtnViewer');
        if (openBtn) openBtn.addEventListener('click', () => openModal('login'));
      }
    }

    async function checkSession() {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, { credentials: 'same-origin' });
        if (res.ok) {
          const json = await res.json();
          if (json.success) currentUser = { username: json.username };
        }
      } catch (error) {
        // Coi như chưa đăng nhập nếu không gọi được API
      }
      renderAuthSlot();
    }

    async function handleLogout() {
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST', credentials: 'same-origin' });
      } catch (error) {
        // ignore
      }
      currentUser = null;
      renderAuthSlot();
      toast('Đã đăng xuất.', 'info');
    }

    if (authModalClose) authModalClose.addEventListener('click', closeModal);
    if (authModal) {
      authModal.addEventListener('click', (e) => {
        if (e.target === authModal) closeModal();
      });
    }
    if (tabLoginBtn) tabLoginBtn.addEventListener('click', () => switchTab('login'));
    if (tabRegisterBtn) tabRegisterBtn.addEventListener('click', () => switchTab('register'));
    if (captchaRefreshBtn) captchaRefreshBtn.addEventListener('click', refreshCaptcha);

    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('loginSubmitBtnViewer');
        const errBox = document.getElementById('loginErrorViewer');
        errBox.style.display = 'none';
        btn.disabled = true;
        try {
          const res = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
              username: document.getElementById('loginUsernameViewer').value.trim(),
              password: document.getElementById('loginPasswordViewer').value,
            }),
          });
          const json = await res.json();
          if (res.ok && json.success) {
            currentUser = { username: json.username };
            renderAuthSlot();
            closeModal();
            loginForm.reset();
            toast(`Chào mừng trở lại, ${json.username}!`, 'success');
          } else {
            errBox.textContent = json.message || 'Đăng nhập thất bại.';
            errBox.style.display = 'block';
          }
        } catch (error) {
          errBox.textContent = 'Không thể kết nối tới server. Vui lòng thử lại.';
          errBox.style.display = 'block';
        } finally {
          btn.disabled = false;
        }
      });
    }

    if (registerForm) {
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('registerSubmitBtnViewer');
        const errBox = document.getElementById('registerErrorViewer');
        errBox.style.display = 'none';
        btn.disabled = true;
        try {
          const res = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
              username: document.getElementById('regUsername').value.trim(),
              email: document.getElementById('regEmail').value.trim(),
              password: document.getElementById('regPassword').value,
              confirmPassword: document.getElementById('regPasswordConfirm').value,
              captcha: document.getElementById('regCaptchaInput').value.trim(),
            }),
          });
          const json = await res.json();
          if (res.ok && json.success) {
            currentUser = { username: json.username };
            renderAuthSlot();
            closeModal();
            registerForm.reset();
            toast(`Đăng ký thành công! Chào mừng ${json.username}!`, 'success');
          } else {
            errBox.textContent = json.message || 'Đăng ký thất bại.';
            errBox.style.display = 'block';
            refreshCaptcha();
            document.getElementById('regCaptchaInput').value = '';
          }
        } catch (error) {
          errBox.textContent = 'Không thể kết nối tới server. Vui lòng thử lại.';
          errBox.style.display = 'block';
          refreshCaptcha();
        } finally {
          btn.disabled = false;
        }
      });
    }

    checkSession();
  });
})();
