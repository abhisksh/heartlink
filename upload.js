const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const jwtAuth = require('../middleware/jwtAuth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.userId}_${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm'];
  cb(null, allowed.includes(file.mimetype));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// POST /api/upload — upload media file
router.post('/', jwtAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded or invalid type' });

  const isVideo = req.file.mimetype.startsWith('video/');
  const url = `/uploads/${req.file.filename}`;

  res.json({ url, type: isVideo ? 'video' : 'photo', filename: req.file.filename });
});

module.exports = router;
