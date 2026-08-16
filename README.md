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

---

## 🖼️ Lưu Trữ Ảnh Vĩnh Viễn (Khắc Phục Mất Ảnh Khi Deploy)

**Vấn đề**: Ổ đĩa của Render Web Service là **tạm thời (ephemeral)** — mọi file
trong `backend/uploads/` (thumbnail, ảnh GIF xem trước, video tải trực tiếp
lên server, ảnh Hero Banner...) sẽ **bị xoá sạch mỗi khi deploy lại hoặc
server khởi động lại**. Đây là lý do ảnh bìa hay bị mất/vỡ sau khi cập nhật
code.

**Giải pháp**: Kết nối ứng dụng với 1 dịch vụ lưu trữ file ngoài (miễn phí).
Khi đã cấu hình, mọi ảnh/video tải lên sẽ tự động được đẩy lên đó và lưu vĩnh
viễn — không còn phụ thuộc vào ổ đĩa của Render nữa. **Nếu chưa cấu hình, ứng
dụng vẫn chạy bình thường** — chỉ là ảnh sẽ tiếp tục bị mất khi deploy như
trước (hành vi cũ được giữ làm phương án dự phòng). Có 3 lựa chọn — chỉ cần
cấu hình **1 trong 3** (nếu cấu hình nhiều hơn 1, ứng dụng tự ưu tiên theo
thứ tự Cloudinary → Backblaze B2 → Cloudflare R2):

|                              | Cloudinary (khuyên dùng)        | Backblaze B2                     | Cloudflare R2                    |
|-------------------------------|-----------------------------------|-------------------------------------|--------------------------------------|
| Cần thẻ tín dụng/ngân hàng?   | **Không**                         | Tài khoản: Không. **Nhưng** bật chế độ Public cho bucket (bắt buộc để ảnh xem được) đòi hỏi lịch sử thanh toán hoặc trả $1 — **tức vẫn cần thẻ ở bước này** | **Có** — bắt buộc liên kết thẻ để kích hoạt, kể cả khi chỉ dùng trong hạn mức miễn phí |
| Miễn phí                      | 25 credit/tháng (~25GB lưu trữ HOẶC băng thông) | 10GB lưu trữ, vĩnh viễn            | 10GB lưu trữ, vĩnh viễn               |
| Băng thông tải xuống          | Trong hạn mức credit ở trên       | Miễn phí tới gấp 3 lần dung lượng đang lưu/tháng, sau đó ~$0.01/GB | Miễn phí, không giới hạn         |
| Độ phức tạp cấu hình          | Thấp nhất (1 chuỗi kết nối)       | Trung bình                          | Trung bình                            |

**Nếu bạn không có thẻ nào** (đúng như trường hợp hiện tại), dùng **Cloudinary**
ở phần A bên dưới — đây là lựa chọn duy nhất trong 3 cái hoàn toàn không đụng
tới thẻ ở bất kỳ bước nào. Phần B (Backblaze B2) và C (Cloudflare R2) chỉ nên
dùng nếu sau này bạn có thẻ. Có thể đổi qua lại giữa 3 lựa chọn bất cứ lúc nào
chỉ bằng cách đổi biến môi trường trên Render, không cần sửa code.

### A. Cloudinary (không cần thẻ — khuyên dùng) — làm 1 lần

1. Đăng ký tài khoản miễn phí tại [cloudinary.com](https://cloudinary.com) (trang giá của họ ghi rõ **"No credit card required"** cho gói Free) — chỉ cần email.
2. Sau khi đăng nhập, vào **Dashboard** (trang chính sau khi đăng nhập) — bạn sẽ thấy khung **"Product Environment Credentials"** hoặc **"API Environment variable"** hiện sẵn 1 chuỗi dạng `CLOUDINARY_URL=cloudinary://123456789012345:AbCdEfGhIjKlMnOpQrStUvWxYz@your_cloud_name`. Bấm copy nguyên chuỗi này.
3. Vào **Render Dashboard** → Web Service của bạn → **Environment** → thêm 1 biến sau rồi bấm **Save Changes** (Render sẽ tự deploy lại):

   | Biến môi trường   | Giá trị                                                              |
   |---------------------|-------------------------------------------------------------------------|
   | `CLOUDINARY_URL`    | Nguyên chuỗi đã copy ở bước 2 (bắt đầu bằng `cloudinary://...`)          |

   (Nếu Dashboard của bạn không hiện sẵn chuỗi này, dùng cách thay thế: lấy riêng 3 giá trị **Cloud Name**, **API Key**, **API Secret** rồi khai báo 3 biến `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` thay cho `CLOUDINARY_URL`.)

### B. Backblaze B2 (tài khoản không cần thẻ, nhưng bật Public cần) — tuỳ chọn

1. Đăng ký tài khoản miễn phí tại [backblaze.com/sign-up/cloud-storage](https://www.backblaze.com/sign-up/cloud-storage) — trang này ghi rõ **"No credit card required"** cho việc TẠO TÀI KHOẢN, chỉ cần email.
2. Vào **B2 Cloud Storage → Buckets → Create a Bucket** → đặt tên bất kỳ, DUY NHẤT trên toàn hệ thống Backblaze (vd `ghubx-media-<tên-của-bạn>`) → chọn **Public**. ⚠️ **Lưu ý**: bấm chọn Public sẽ hiện yêu cầu **"A payment history is required, or pay a one-time fee ($1.00 + tax)"** kèm form nhập thẻ — đây là bước cần thẻ (khác với việc tạo tài khoản ở bước 1). Nếu không có thẻ, bỏ qua phương án này, dùng phương án A (Cloudinary) ở trên.
3. Trong danh sách Buckets, bấm vào bucket vừa tạo — bạn sẽ thấy dòng **Endpoint**, dạng `s3.us-west-004.backblazeb2.com` (số/vùng có thể khác). Phần ở giữa (vd `us-west-004`) chính là giá trị cho `B2_REGION`.
4. Vào **Application Keys → Add a New Application Key** → đặt tên bất kỳ → **Allow access to Bucket(s)**: chọn đúng bucket vừa tạo → quyền **Read and Write** → Create New Key. Backblaze hiện ra **keyID** và **applicationKey** — chỉ hiện 1 lần, nhớ lưu lại ngay.
5. Vào **Render Dashboard** → Web Service của bạn → **Environment** → thêm đủ 4 biến sau rồi bấm **Save Changes** (Render sẽ tự deploy lại):

   | Biến môi trường     | Giá trị                                                        |
   |----------------------|------------------------------------------------------------------|
   | `B2_KEY_ID`          | Giá trị **keyID** vừa tạo ở bước 4                                |
   | `B2_APPLICATION_KEY` | Giá trị **applicationKey** vừa tạo ở bước 4                       |
   | `B2_BUCKET_NAME`     | Tên bucket đã tạo ở bước 2                                        |
   | `B2_REGION`          | Phần vùng lấy từ Endpoint ở bước 3 (vd `us-west-004`)             |

### C. Cloudflare R2 (cần thẻ, băng thông không giới hạn) — tuỳ chọn

1. Tạo tài khoản tại [dash.cloudflare.com](https://dash.cloudflare.com) — Cloudflare sẽ yêu cầu liên kết 1 thẻ thanh toán để bật R2 (dùng để xác minh/chống gian lận — sẽ không bị trừ tiền nếu không vượt hạn mức 10GB miễn phí).
2. Vào mục **R2 Object Storage** ở menu trái → **Create bucket** → đặt tên bất kỳ (vd `ghubx-media`) → Create.
3. Bật truy cập công khai cho bucket: vào bucket vừa tạo → tab **Settings** → mục **Public access** → **Allow Access** (sẽ được cấp 1 URL dạng `https://pub-xxxxxxxxxxxx.r2.dev`) — đây chính là giá trị cho `R2_PUBLIC_URL`.
4. Tạo API Token: vào **R2 Object Storage** → **Manage R2 API Tokens** → **Create API Token** → chọn quyền **Object Read & Write**, giới hạn vào đúng bucket vừa tạo → Create. Cloudflare sẽ hiện ra **Access Key ID** và **Secret Access Key** — chỉ hiện 1 lần, nhớ lưu lại ngay.
5. Lấy **Account ID**: hiện ở góc phải trang tổng quan R2, hoặc trong URL của Cloudflare Dashboard.
6. Vào **Render Dashboard** → Web Service của bạn → **Environment** → thêm đủ 5 biến sau rồi bấm **Save Changes** (Render sẽ tự deploy lại):

   | Biến môi trường        | Giá trị                                              |
   |-------------------------|-------------------------------------------------------|
   | `R2_ACCOUNT_ID`          | Account ID của Cloudflare                              |
   | `R2_ACCESS_KEY_ID`       | Access Key ID vừa tạo ở bước 4                         |
   | `R2_SECRET_ACCESS_KEY`   | Secret Access Key vừa tạo ở bước 4                     |
   | `R2_BUCKET_NAME`         | Tên bucket đã tạo ở bước 2 (vd `ghubx-media`)          |
   | `R2_PUBLIC_URL`          | URL công khai ở bước 3 (vd `https://pub-xxxx.r2.dev`), **không** có dấu `/` ở cuối |

Sau khi deploy lại (dù chọn phương án A, B hay C ở trên), log khởi động của
server sẽ báo dòng "✅ Đã cấu hình..." thay vì cảnh báo, và mọi ảnh/video tải
lên MỚI sẽ tự động lưu vĩnh viễn. Các ảnh cũ đã bị mất trước đó (do ổ đĩa tạm
thời) sẽ không tự khôi phục lại được — cần tải lại ảnh đó cho video/slide
tương ứng.
