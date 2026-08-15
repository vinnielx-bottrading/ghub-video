const dns = require('dns');
// Khắc phục lỗi phân giải DNS SRV trên Windows / mạng Việt Nam đối với MongoDB Atlas
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log(`✅ MongoDB Atlas đã kết nối thành công: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Lỗi kết nối MongoDB: ${error.message}`);
    console.log(`💡 Lưu ý: Hãy kiểm tra xem bạn đã thêm IP "0.0.0.0/0" trong phần Network Access trên MongoDB Atlas chưa.`);
  }
};

module.exports = connectDB;
