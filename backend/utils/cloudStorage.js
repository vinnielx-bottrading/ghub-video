// Lưu trữ ảnh/video lên 1 dịch vụ lưu trữ ngoài — GIẢI QUYẾT vấn đề ổ đĩa
// Render bị xoá sạch mỗi lần deploy/restart (ephemeral filesystem). Hỗ trợ 3
// nhà cung cấp, chỉ cần cấu hình ĐỦ 1 bộ biến môi trường bên dưới (nếu nhiều
// hơn 1 cùng được cấu hình, thứ tự ưu tiên là Cloudinary → Backblaze B2 →
// Cloudflare R2 — 2 cái đầu đều KHÔNG cần thẻ thanh toán):
//
//  • Cloudinary (khuyên dùng — KHÔNG cần thẻ, dễ cấu hình nhất) — CDN ảnh/
//    video chuyên dụng, 25 credit miễn phí/tháng (~25GB lưu trữ hoặc băng
//    thông). Ảnh có URL công khai NGAY khi tải lên, không cần bước "bật chế
//    độ Public" như 2 lựa chọn dưới. Biến môi trường: CLOUDINARY_URL (dán
//    nguyên chuỗi trong Dashboard → Product Environment Credentials), HOẶC 3
//    biến riêng CLOUDINARY_CLOUD_NAME/CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET.
//
//  • Backblaze B2 — 10GB lưu trữ miễn phí vĩnh viễn, egress miễn phí gấp 3
//    lần dung lượng đang lưu/tháng. Tài khoản không cần thẻ, NHƯNG bật "Files
//    in Bucket are Public" (bắt buộc để phục vụ ảnh trực tiếp) yêu cầu có
//    lịch sử thanh toán hoặc trả 1 lần $1 — tức vẫn cần thẻ ở bước này. Biến
//    môi trường: B2_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET_NAME, B2_REGION.
//
//  • Cloudflare R2 — 10GB miễn phí, egress miễn phí không giới hạn, NHƯNG bắt
//    buộc liên kết thẻ thanh toán để kích hoạt R2 (không bị trừ tiền nếu
//    không vượt hạn mức 10GB). Biến môi trường: R2_ACCOUNT_ID,
//    R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL.
//
// Nếu KHÔNG cấu hình cái nào, hệ thống tự động rơi về hành vi cũ: lưu file
// cục bộ trong backend/uploads/ (mất khi deploy lại) — để app không bao giờ
// bị vỡ chỉ vì thiếu cấu hình lưu trữ ngoài. Xem README.md để biết hướng dẫn
// đăng ký & lấy từng giá trị.
const fs = require('fs');
const path = require('path');
const { S3Client, DeleteObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const cloudinary = require('cloudinary').v2;

const {
  CLOUDINARY_URL,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  B2_KEY_ID,
  B2_APPLICATION_KEY,
  B2_BUCKET_NAME,
  B2_REGION,
  B2_PUBLIC_URL,
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME,
  R2_PUBLIC_URL
} = process.env;

const CLOUDINARY_READY = Boolean(CLOUDINARY_URL) || Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET);
const B2_READY = Boolean(B2_KEY_ID && B2_APPLICATION_KEY && B2_BUCKET_NAME && B2_REGION);
const R2_READY = Boolean(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME && R2_PUBLIC_URL);

// Ưu tiên Cloudinary (không cần thẻ, dễ cấu hình nhất) → B2 (không cần thẻ
// cho tài khoản, chỉ cần cho bước bật Public) → R2 (cần thẻ).
function activeProvider() {
  if (CLOUDINARY_READY) return 'cloudinary';
  if (B2_READY) return 'b2';
  if (R2_READY) return 'r2';
  return null;
}

function isCloudStorageConfigured() {
  return activeProvider() !== null;
}

function providerLabel() {
  const provider = activeProvider();
  if (provider === 'cloudinary') return 'Cloudinary';
  if (provider === 'b2') return 'Backblaze B2';
  if (provider === 'r2') return 'Cloudflare R2';
  return null;
}

let cloudinaryConfigured = false;
function ensureCloudinaryConfigured() {
  if (cloudinaryConfigured) return;
  if (CLOUDINARY_URL) {
    // SDK tự đọc CLOUDINARY_URL từ process.env khi gọi .config() không tham số.
    cloudinary.config({ secure: true });
  } else {
    cloudinary.config({
      cloud_name: CLOUDINARY_CLOUD_NAME,
      api_key: CLOUDINARY_API_KEY,
      api_secret: CLOUDINARY_API_SECRET,
      secure: true
    });
  }
  cloudinaryConfigured = true;
}

// key có dạng "<subdir>/<tênfile>.<ext>" (vd "thumbnails/auto-123.jpg" hoặc
// "videos/video-456.mp4") — subdir quyết định resource_type Cloudinary dùng.
function cloudinaryResourceTypeForKey(key) {
  return key.startsWith('videos/') ? 'video' : 'image';
}

function keyToCloudinaryPublicId(key) {
  return key.replace(/\.[^./]+$/, '');
}

async function uploadLocalFileCloudinary(localPath, key) {
  ensureCloudinaryConfigured();
  try {
    const resourceType = cloudinaryResourceTypeForKey(key);
    const publicId = keyToCloudinaryPublicId(key);
    const result = await cloudinary.uploader.upload(localPath, {
      public_id: publicId,
      resource_type: resourceType,
      overwrite: true,
      unique_filename: false,
      use_filename: false
    });
    fs.promises.unlink(localPath).catch(() => {});
    return result.secure_url;
  } catch (error) {
    console.warn('⚠️  Lỗi khi tải file lên Cloudinary:', error.message);
    return null;
  }
}

// Trả về "key nội bộ" duy nhất dùng để tra cứu/xoá sau này — vì Cloudinary
// không có khái niệm "key" y hệt S3 (public_id không kèm resource_type), ta tự
// mã hoá thành "cloudinary:<resource_type>:<public_id>" để deleteFile() biết
// chính xác cần xoá gì.
function extractKeyFromCloudinaryUrl(url) {
  if (!url) return null;
  const match = url.match(/^https?:\/\/res\.cloudinary\.com\/[^/]+\/(image|video)\/upload\/(?:[^/]+\/)*?(?:v\d+\/)?(.+)$/);
  if (!match) return null;
  const resourceType = match[1];
  const publicId = match[2].replace(/\.[^./]+$/, '');
  return `cloudinary:${resourceType}:${publicId}`;
}

async function deleteFileCloudinary(key) {
  const parts = key.split(':');
  if (parts.length < 3 || parts[0] !== 'cloudinary') return false;
  const resourceType = parts[1];
  const publicId = parts.slice(2).join(':');
  ensureCloudinaryConfigured();
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    return true;
  } catch (error) {
    console.warn('⚠️  Lỗi khi xoá file trên Cloudinary:', error.message);
    return false;
  }
}

async function listObjectsCloudinary(prefix) {
  ensureCloudinaryConfigured();
  try {
    const result = await cloudinary.api.resources({
      type: 'upload',
      resource_type: 'image', // Thư viện ảnh (Media Library) chỉ liệt kê ảnh/thumbnail
      prefix,
      max_results: 500
    });
    return (result.resources || []).map(r => ({
      key: `cloudinary:image:${r.public_id}`,
      size: r.bytes,
      lastModified: r.created_at,
      url: r.secure_url
    }));
  } catch (error) {
    console.warn('⚠️  Lỗi khi lấy danh sách file trên Cloudinary:', error.message);
    return [];
  }
}

// ---- Cấu hình chung cho 2 nhà cung cấp tương thích S3 (B2/R2) ----
function s3ProviderConfig() {
  const provider = activeProvider();
  if (provider === 'b2') {
    // Public URL kiểu path-style theo đúng tài liệu B2: dùng chung endpoint
    // S3-compatible, thêm tên bucket vào path — hoạt động ngay cả khi chưa
    // gắn domain riêng. Có thể ghi đè bằng B2_PUBLIC_URL (vd nếu sau này gắn
    // CDN/Custom Domain riêng cho bucket).
    const endpointHost = `s3.${B2_REGION}.backblazeb2.com`;
    return {
      provider,
      endpoint: `https://${endpointHost}`,
      region: B2_REGION,
      accessKeyId: B2_KEY_ID,
      secretAccessKey: B2_APPLICATION_KEY,
      bucket: B2_BUCKET_NAME,
      publicUrlBase: (B2_PUBLIC_URL || `https://${endpointHost}/${B2_BUCKET_NAME}`).replace(/\/+$/, '')
    };
  }
  if (provider === 'r2') {
    return {
      provider,
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      region: 'auto',
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
      bucket: R2_BUCKET_NAME,
      publicUrlBase: (R2_PUBLIC_URL || '').replace(/\/+$/, '')
    };
  }
  return null;
}

let cachedClient = null;
let cachedProvider = null;
function getS3Client() {
  const cfg = s3ProviderConfig();
  if (!cfg) return null;
  if (!cachedClient || cachedProvider !== cfg.provider) {
    cachedClient = new S3Client({
      region: cfg.region,
      endpoint: cfg.endpoint,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey
      }
    });
    cachedProvider = cfg.provider;
  }
  return cachedClient;
}

function guessContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const map = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.avif': 'image/avif',
    '.bmp': 'image/bmp',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.webm': 'video/webm',
    '.mkv': 'video/x-matroska'
  };
  return map[ext] || 'application/octet-stream';
}

async function uploadLocalFileS3(localPath, key) {
  const client = getS3Client();
  const cfg = s3ProviderConfig();
  if (!client || !cfg) return null;

  try {
    const contentType = guessContentType(localPath);
    const body = fs.createReadStream(localPath);
    const uploader = new Upload({
      client,
      params: {
        Bucket: cfg.bucket,
        Key: key,
        Body: body,
        ContentType: contentType
      }
    });
    await uploader.done();
    fs.promises.unlink(localPath).catch(() => {});
    return `${cfg.publicUrlBase}/${key}`;
  } catch (error) {
    console.warn(`⚠️  Lỗi khi tải file lên ${providerLabel()}:`, error.message);
    return null;
  }
}

function extractKeyFromS3Url(url) {
  const cfg = s3ProviderConfig();
  if (!cfg || !url) return null;
  const base = cfg.publicUrlBase;
  if (!base || !url.startsWith(base + '/')) return null;
  return url.slice(base.length + 1);
}

async function deleteFileS3(key) {
  const client = getS3Client();
  const cfg = s3ProviderConfig();
  if (!client || !cfg) return false;
  try {
    await client.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }));
    return true;
  } catch (error) {
    console.warn(`⚠️  Lỗi khi xoá file trên ${providerLabel()}:`, error.message);
    return false;
  }
}

async function listObjectsS3(prefix) {
  const client = getS3Client();
  const cfg = s3ProviderConfig();
  if (!client || !cfg) return [];
  try {
    const result = await client.send(new ListObjectsV2Command({
      Bucket: cfg.bucket,
      Prefix: prefix,
      MaxKeys: 1000
    }));
    return (result.Contents || []).map(obj => ({
      key: obj.Key,
      size: obj.Size,
      lastModified: obj.LastModified,
      url: `${cfg.publicUrlBase}/${obj.Key}`
    }));
  } catch (error) {
    console.warn(`⚠️  Lỗi khi lấy danh sách file trên ${providerLabel()}:`, error.message);
    return [];
  }
}

// ---- API công khai (dùng chung cho mọi controller, không cần biết đang
// dùng nhà cung cấp nào bên dưới) ----

// Đẩy 1 file đang nằm trên ổ đĩa cục bộ (do multer hoặc ffmpeg tạo ra) lên
// nhà cung cấp đang cấu hình. key có dạng "<subdir>/<tênfile>.<ext>" (vd
// "thumbnails/auto-123.jpg"). CHỈ dọn file tạm cục bộ khi upload THÀNH CÔNG —
// nếu lỗi, giữ nguyên file để nơi gọi có thể rơi về dùng URL cục bộ tạm thời
// như cũ thay vì mất trắng. Trả về URL công khai, hoặc null nếu lỗi.
async function uploadLocalFile(localPath, key) {
  const provider = activeProvider();
  if (provider === 'cloudinary') return uploadLocalFileCloudinary(localPath, key);
  if (provider === 'b2' || provider === 'r2') return uploadLocalFileS3(localPath, key);
  return null;
}

// Nếu url thuộc nơi lưu trữ đang cấu hình, trả về 1 "key nội bộ" (định dạng
// tuỳ nhà cung cấp) để dùng cho xoá/tra cứu — LUÔN đưa cả 2 việc "khớp URL
// nào đang được dùng" và "xoá file nào" qua đúng 1 hàm này để đảm bảo nhất
// quán. Trả về null nếu url không thuộc nơi lưu trữ này (vd link ảnh ngoài do
// admin tự dán, hoặc URL cục bộ kiểu cũ).
function extractKeyFromPublicUrl(url) {
  const provider = activeProvider();
  if (provider === 'cloudinary') return extractKeyFromCloudinaryUrl(url);
  if (provider === 'b2' || provider === 'r2') return extractKeyFromS3Url(url);
  return null;
}

async function deleteFile(key) {
  if (!key) return false;
  const provider = activeProvider();
  if (provider === 'cloudinary' && key.startsWith('cloudinary:')) return deleteFileCloudinary(key);
  if (provider === 'b2' || provider === 'r2') return deleteFileS3(key);
  return false;
}

// Liệt kê toàn bộ file trong 1 "thư mục ảo" (prefix) — dùng cho Thư viện ảnh
// (Media Library) trong Admin. Mỗi entry có {key, url, size, lastModified} —
// "key" ở đây LUÔN dùng đúng định dạng mà deleteFile()/extractKeyFromPublicUrl()
// của nhà cung cấp tương ứng hiểu được.
async function listObjects(prefix) {
  const provider = activeProvider();
  if (provider === 'cloudinary') return listObjectsCloudinary(prefix);
  if (provider === 'b2' || provider === 'r2') return listObjectsS3(prefix);
  return [];
}

module.exports = {
  isCloudStorageConfigured,
  providerLabel,
  extractKeyFromPublicUrl,
  uploadLocalFile,
  deleteFile,
  listObjects
};
