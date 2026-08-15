// LƯU Ý: trước đây có ép dùng DNS công cộng (8.8.8.8 / 1.1.1.1) ở đây để né lỗi
// phân giải DNS SRV khi chạy LOCAL trên Windows / mạng Việt Nam. Đoạn đó đã bị
// gỡ vì khi deploy trên Render, nó gây lỗi bắt tay TLS với MongoDB Atlas
// ("SSL alert number 80" / tlsv1 alert internal error) do resolver bị ép sai
// tuyến mạng. Trên Render, dùng thẳng DNS resolver mặc định của hệ thống.
const mongoose = require('mongoose');
// Nếu chưa kết nối, để các query (Video.find(), v.v...) báo lỗi NGAY thay vì
// treo (hang) chờ trong im lặng — đây là nguyên nhân phổ biến khiến API bị
// timeout mà không rõ lỗi đến từ Render hay MongoDB.
mongoose.set('bufferCommands', false);

const RETRY_DELAY_MS = 5000;
let retryTimer = null;

const attemptConnect = () => {
  if (!process.env.MONGODB_URI) {
    console.error('❌ Thiếu biến môi trường MONGODB_URI. Hãy khai báo nó trong Render → Environment (hoặc file backend/.env khi chạy local).');
    retryTimer = setTimeout(attemptConnect, RETRY_DELAY_MS);
    return;
  }

  mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 8000,
  }).catch((error) => {
    console.error(`❌ Lỗi kết nối MongoDB: ${error.message}`);
    console.log(`💡 Lưu ý: Hãy kiểm tra xem bạn đã thêm IP "0.0.0.0/0" trong phần Network Access trên MongoDB Atlas chưa, cluster có bị pause không, và MONGODB_URI có đúng user/password không.`);
    console.log(`🔁 Sẽ tự động thử kết nối lại sau ${RETRY_DELAY_MS / 1000}s...`);
    retryTimer = setTimeout(attemptConnect, RETRY_DELAY_MS);
  });
};

const connectDB = () => {
  const conn = mongoose.connection;

  conn.on('connected', () => {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    console.log(`✅ MongoDB Atlas đã kết nối thành công: ${conn.host}`);
  });

  conn.on('disconnected', () => {
    console.warn('⚠️  Mất kết nối MongoDB. Sẽ tự động thử kết nối lại...');
    if (!retryTimer) retryTimer = setTimeout(attemptConnect, RETRY_DELAY_MS);
  });

  conn.on('error', (error) => {
    console.error(`❌ Lỗi MongoDB: ${error.message}`);
  });

  attemptConnect();
};

module.exports = connectDB;
