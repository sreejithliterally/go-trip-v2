require('dotenv').config();

const multer = require('multer');
const path   = require('path');

const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const DOC_MIMES   = [...IMAGE_MIMES, 'application/pdf'];

const fileFilter = (allowedMimes) => (req, file, cb) => {
  if (allowedMimes.includes(file.mimetype)) cb(null, true);
  else cb(new Error(`File type not allowed: ${file.mimetype}`), false);
};

const isS3Configured = () =>
  !!(process.env.AWS_ACCESS_KEY_ID &&
     process.env.AWS_SECRET_ACCESS_KEY &&
     (process.env.AWS_S3_BUCKET || process.env.S3_BUCKET_NAME));

const buildStorage = (folder) => {
  if (!isS3Configured()) {
    // Fallback to disk storage when S3 creds are absent (local dev)
    return multer.diskStorage({
      destination: (req, file, cb) => cb(null, '/tmp'),
      filename:    (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${folder}-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
      },
    });
  }

  const { S3Client }  = require('@aws-sdk/client-s3');
  const multerS3      = require('multer-s3');
  const bucket        = process.env.AWS_S3_BUCKET || process.env.S3_BUCKET_NAME;

  const s3 = new S3Client({
    region:      process.env.AWS_REGION || 'ap-south-1',
    credentials: {
      accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  return multerS3({
    s3,
    bucket,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const ext  = path.extname(file.originalname).toLowerCase();
      cb(null, `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  });
};

/**
 * Returns a Proxy that behaves like a multer instance but defers
 * storage construction until the first method call (.single / .array / etc.).
 * This prevents multer-s3 from throwing at module load when S3 env vars
 * are not yet set.
 */
const lazyMulter = (folder, mimes, limitBytes) => {
  let instance = null;
  const getInstance = () => {
    if (!instance) {
      instance = multer({
        storage:    buildStorage(folder),
        fileFilter: fileFilter(mimes),
        limits:     { fileSize: limitBytes },
      });
    }
    return instance;
  };

  return new Proxy({}, {
    get(_, prop) {
      return getInstance()[prop];
    },
  });
};

const uploadListingImage = lazyMulter('listings', IMAGE_MIMES, 10 * 1024 * 1024);
const uploadKyc          = lazyMulter('kyc',      DOC_MIMES,   20 * 1024 * 1024);
const uploadAvatar       = lazyMulter('avatars',  IMAGE_MIMES,  5 * 1024 * 1024);

/**
 * Resolves the public URL for an uploaded file.
 * multer-s3 sets f.location; if absent, constructs from bucket/key.
 * Falls back to f.path for local disk storage in dev.
 */
const resolveFileUrl = (f) => {
  if (f.location) return f.location;
  if (f.key) {
    const bucket = f.bucket || process.env.AWS_S3_BUCKET;
    const region = process.env.AWS_REGION || 'ap-south-1';
    return `https://${bucket}.s3.${region}.amazonaws.com/${f.key}`;
  }
  return f.path;
};

module.exports = { uploadListingImage, uploadKyc, uploadAvatar, resolveFileUrl };
