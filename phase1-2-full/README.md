# 🎬 GHUB X - Nền Tảng Video Fullstack (Express + MongoDB)

GHUB X là hệ thống chia sẻ video hoàn chỉnh gồm **Frontend chuẩn Cinema 4K** và **Backend RESTful API kết nối MongoDB**.

![Preview](https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80)

---

## 📂 Cấu Trúc Dự Án

```text
video-platform/
├── backend/                      # Máy chủ Node.js + Express + MongoDB
│   ├── config/db.js              # Kết nối Database
│   ├── models/Video.js           # Mongoose Schema
│   ├── controllers/videoController.js # CRUD API, View counter, Like, Comment
│   ├── middleware/upload.js      # Multer xử lý Upload file
│   ├── routes/videoRoutes.js     # API Endpoints
│   ├── seed.js                   # Nạp dữ liệu mẫu vào MongoDB
│   ├── server.js                 # Express server entry point
│   └── package.json
├── css/style.css                 # Giao diện Cinematic Obsidian & Glassmorphism
├── js/
│   ├── app.js                    # Logic Frontend & Kết nối Backend API
│   └── data.js                   # Mock data fallback
├── index.html                    # Giao diện chính
├── .gitignore                    # Bảo mật key và bỏ qua node_modules
└── README.md
```

---

## 🚀 Hướng Dẫn Chạy Toàn Bộ Dự Án

### 1. Khởi Động Backend & MongoDB
```bash
# Di chuyển vào thư mục backend
cd backend

# Cài đặt thư viện (nếu chưa cài)
npm install

# Nạp dữ liệu mẫu ban đầu vào MongoDB (chỉ cần chạy 1 lần)
npm run seed

# Khởi chạy Backend Server (Port 5000)
npm start
```

### 2. Mở Giao Diện Web
Mở file `index.html` trực tiếp trên trình duyệt hoặc chạy qua máy chủ tĩnh:
```bash
node server.js
```
👉 Truy cập: `http://localhost:3000`

---

## 🌐 Triển Khai Chạy Online Miễn Phí (Production)

1. **Database**: Tạo Cluster miễn phí tại [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. **Backend**: Liên kết Repository GitHub này với [Render.com](https://render.com) (Tạo Web Service miễn phí).
3. **Frontend**: Bật **GitHub Pages** (hoặc triển khai qua [Vercel](https://vercel.com)).
