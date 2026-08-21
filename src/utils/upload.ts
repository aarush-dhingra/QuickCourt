import multer from "multer";
import path from "path";
import fs from "fs";

// ---------------------------------------------------------------------------
// Upload directory setup
// ---------------------------------------------------------------------------
const uploadDir = path.join(process.cwd(), "uploads", "facilities");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ---------------------------------------------------------------------------
// Multer disk storage — unique filename per upload
// ---------------------------------------------------------------------------
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(
      null,
      `facility-${uniqueSuffix}${path.extname(file.originalname).toLowerCase()}`
    );
  },
});

// ---------------------------------------------------------------------------
// File type whitelist: images only
// ---------------------------------------------------------------------------
const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void => {
  const allowedMimes = /^image\/(jpeg|jpg|png|webp)$/;
  const allowedExt = /\.(jpeg|jpg|png|webp)$/i;

  if (
    allowedMimes.test(file.mimetype) &&
    allowedExt.test(file.originalname)
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only jpeg, jpg, png, or webp images are accepted."
      )
    );
  }
};

// ---------------------------------------------------------------------------
// Exported upload instance
// ---------------------------------------------------------------------------

/** Max photos per facility: from env or default 10 */
const MAX_PHOTOS = parseInt(process.env.MAX_PHOTOS_PER_FACILITY ?? "10", 10);
/** Max file size in bytes: from env (MB) or default 5 MB */
const MAX_FILE_BYTES =
  parseFloat(process.env.MAX_FILE_SIZE_MB ?? "5") * 1024 * 1024;

/**
 * Multer middleware for facility photo uploads.
 * Use as: `facilityPhotoUpload.array("photos", MAX_PHOTOS)`
 */
export const facilityPhotoUpload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_BYTES,
    files: MAX_PHOTOS,
  },
  fileFilter,
});

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Converts an absolute disk path to a public URL path.
 * e.g. /Users/x/project/uploads/facilities/img.jpg → /uploads/facilities/img.jpg
 */
export const toPublicUrl = (absolutePath: string): string => {
  const relative = path.relative(process.cwd(), absolutePath);
  return "/" + relative.split(path.sep).join("/");
};
