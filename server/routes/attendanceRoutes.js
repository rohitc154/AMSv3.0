const express = require('express');
const multer = require('multer');
const attendanceController = require('../controllers/attendanceController');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const router = express.Router();

router.post(
  '/mark',
  authenticate,
  upload.single('image'),
  attendanceController.markAttendance
);
router.get('/user/:id', authenticate, attendanceController.getUserAttendance);
router.get(
  '/org/:orgId',
  authenticate,
  requireRole('admin'),
  attendanceController.getOrgAttendance
);

module.exports = router;
