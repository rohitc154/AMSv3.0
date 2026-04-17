const express = require("express");
const userController = require("../controllers/userController");
const {
  authenticate,
  requireSuperAdmin,
  requireOrgAdmin,
  requireRole,
} = require("../middleware/authMiddleware");

const router = express.Router();

// List members (super admin can filter by org, org admin sees their org only)
router.get(
  "/",
  authenticate,
  requireRole("superAdmin", "admin"),
  userController.listUsers,
);

// List organization admins (super admin only)
router.get(
  "/admins",
  authenticate,
  requireSuperAdmin,
  userController.listAdmins,
);

// Remove admin from organization (super admin only)
router.delete(
  "/admin/:adminId",
  authenticate,
  requireSuperAdmin,
  userController.removeAdmin,
);

module.exports = router;
