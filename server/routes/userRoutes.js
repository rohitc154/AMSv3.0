const express = require('express');
const userController = require('../controllers/userController');
const { authenticate, requirePlatformAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authenticate, requirePlatformAdmin, userController.listUsers);

module.exports = router;
