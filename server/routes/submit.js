const express = require('express');
const multer = require('multer');
const { evaluateCode } = require('../controllers/judgeController');
const path = require('path');

const router = express.Router();

// Storage setup for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({ storage });

// POST /api/submit
router.post('/', upload.single('file'), async (req, res) => {
  const { language } = req.body;
  const filePath = path.join(__dirname, '..', req.file.path);

  try {
    const result = await evaluateCode(language, filePath);
    res.json({ status: 'Success', result });
  } catch (err) {
    res.status(500).json({ status: 'Error', message: err.message });
  }
});

module.exports = router;
