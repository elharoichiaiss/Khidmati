import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    },
});

// File filter (images only)
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
    const allowedAudioTypes = /mp3|wav|webm|mpeg|ogg/;

    const extname = allowedImageTypes.test(path.extname(file.originalname).toLowerCase()) ||
        allowedAudioTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedImageTypes.test(file.mimetype) ||
        allowedAudioTypes.test(file.mimetype) ||
        file.mimetype.startsWith('audio/');

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error("Only images and audio files are allowed"));
    }
};

export const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: fileFilter
});
