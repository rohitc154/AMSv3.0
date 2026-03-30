const express = require('express');
const multer = require('multer');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
});

const router = express.Router();

router.post('/register', upload.array('images', 10), authController.register);
router.post('/register-admin', authController.registerAdmin);
router.post('/login', authController.login);
router.get('/me', authenticate, authController.me);

module.exports = router;
