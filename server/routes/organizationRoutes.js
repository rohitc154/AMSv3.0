const express = require('express');
const organizationController = require('../controllers/organizationController');
const { authenticate, requirePlatformAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', organizationController.listOrganizations);
router.post('/', authenticate, requirePlatformAdmin, organizationController.createOrganization);
router.put('/:orgId', authenticate, requirePlatformAdmin, organizationController.updateOrganization);

module.exports = router;
