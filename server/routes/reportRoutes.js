const express = require('express');
const reportController = require('../controllers/reportController');
const { authenticate, requirePlatformAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authenticate, requirePlatformAdmin, reportController.getReports);

module.exports = router;
