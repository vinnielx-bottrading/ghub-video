// ==========================================================================
// GHUB X - Admin Login Logic
// ==========================================================================
const API_BASE_URL = `${window.location.origin}/api`;

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const usernameInput = document.getElementById('usernameInput');
  const passwordInput = document.getElementById('passwordInput');
  const errorBox = document.getElementById('loginError');
  const submitBtn = document.getElementById('loginSubmitBtn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang đăng nhập...';

    try {
      const res = await fetch(`${API_BASE_URL}/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          username: usernameInput.value.trim(),
          password: passwordInput.value
        })
      });
      const json = await res.json();

      if (res.ok && json.success) {
        window.location.href = '/admin';
      } else {
        errorBox.textContent = json.message || 'Đăng nhập thất bại.';
        errorBox.style.display = 'block';
      }
    } catch (err) {
      errorBox.textContent = 'Không thể kết nối tới server. Vui lòng thử lại.';
      errorBox.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Đăng nhập';
    }
  });
});
