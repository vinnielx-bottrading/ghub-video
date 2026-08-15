// Dữ liệu video của GHUB X luôn lấy trực tiếp từ MongoDB qua backend Express
// (xem js/app.js -> fetchVideosFromBackend()). File này KHÔNG còn chứa dữ
// liệu video/hero mẫu (demo) nữa — nếu backend chưa có video nào, trang chủ
// sẽ hiển thị trạng thái trống thay vì video giả.
//
// CATEGORIES chỉ giữ "Tất cả" làm mặc định — danh sách thể loại thật được
// đồng bộ tự động từ dữ liệu video thật ngay khi tải trang xong
// (xem syncCategoriesFromVideos() trong js/app.js).
const CATEGORIES = ["Tất cả"];
