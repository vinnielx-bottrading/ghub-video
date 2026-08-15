const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const AdminUser = require('../models/AdminUser');

// Tự động tạo 1 tài khoản Admin đầu tiên nếu database chưa có tài khoản nào.
// Ưu tiên lấy từ biến môi trường ADMIN_USERNAME / ADMIN_PASSWORD (đặt trên
// Render → Environment). Nếu không đặt, tự sinh mật khẩu ngẫu nhiên và IN RA
// LOG một lần duy nhất — bạn cần vào Render → Logs để lấy mật khẩu đó, hoặc
// (khuyến nghị) đặt sẵn ADMIN_USERNAME/ADMIN_PASSWORD trước khi deploy.
async function ensureDefaultAdmin() {
  try {
    const existingCount = await AdminUser.countDocuments();
    if (existingCount > 0) return;

    const username = process.env.ADMIN_USERNAME || 'admin';
    const generatedPassword = crypto.randomBytes(9).toString('base64url');
    const password = process.env.ADMIN_PASSWORD || generatedPassword;

    const passwordHash = await bcrypt.hash(password, 10);
    await AdminUser.create({ username, passwordHash });

    console.log('\n===================================================');
    console.log('🔐 Đã tạo tài khoản Admin đầu tiên:');
    console.log(`   Tên đăng nhập: ${username}`);
    if (!process.env.ADMIN_PASSWORD) {
      console.log(`   Mật khẩu (tự sinh, chỉ hiện 1 lần): ${password}`);
      console.log('   💡 Nên đặt ADMIN_USERNAME và ADMIN_PASSWORD trong Render → Environment rồi deploy lại để tự đặt mật khẩu theo ý bạn.');
    } else {
      console.log('   Mật khẩu: (lấy từ biến môi trường ADMIN_PASSWORD bạn đã đặt)');
    }
    console.log('===================================================\n');
  } catch (error) {
    console.error('❌ Lỗi khi tạo tài khoản Admin mặc định:', error.message);
  }
}

module.exports = ensureDefaultAdmin;
