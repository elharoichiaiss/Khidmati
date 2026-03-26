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
        // Sanitize filename - remove any path traversal characters
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, uniqueSuffix + "-" + safeName);
    },
});

// File filter with enhanced validation
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
    const allowedAudioTypes = /mp3|wav|webm|mpeg|ogg/;

    const extname = allowedImageTypes.test(path.extname(file.originalname).toLowerCase()) ||
        allowedAudioTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedImageTypes.test(file.mimetype) ||
        allowedAudioTypes.test(file.mimetype) ||
        file.mimetype.startsWith('audio/');

    // Block path traversal attempts
    if (file.originalname.includes('..') || file.originalname.includes('/')) {
        return cb(new Error("Invalid filename"));
    }

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error("Only images and audio files are allowed"));
    }
};

export const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 1, // Only one file per request
    },
    fileFilter: fileFilter
});

// Validate file magic bytes (file type detection)
export async function validateFile(filePath: string, allowedTypes: string[]): Promise<boolean> {
    try {
        const buffer = fs.readFileSync(filePath);
        // Simple magic byte detection for common types
        const magicBytes = buffer.slice(0, 12).toString('hex').toLowerCase();

        const signatures: Record<string, string[]> = {
            'jpg': ['ffd8ffe0', 'ffd8ffe1', 'ffd8ffe2'],
            'png': ['89504e47'],
            'gif': ['47494638'],
            'webp': ['52494646'], // RIFF header, need to check WEBP inside
            'mp3': ['494433', 'ffff', 'fffb', 'fff2', 'fff3'],
            'wav': ['52494646'], // RIFF
            'webm': ['1a45dfa3'], // EBML header
            'mp4': ['66747970'], // ftyp
        };

        for (const type of allowedTypes) {
            const sigs = signatures[type];
            if (sigs) {
                for (const sig of sigs) {
                    if (magicBytes.startsWith(sig)) {
                        return true;
                    }
                }
            }
        }

        return false;
    } catch (err) {
        console.error("File validation error:", err);
        return false;
    }
}
