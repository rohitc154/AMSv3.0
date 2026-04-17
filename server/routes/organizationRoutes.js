const express = require("express");
const organizationController = require("../controllers/organizationController");
const {
  authenticate,
  requireSuperAdmin,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Public endpoint to list organizations (for member registration)
router.get("/", organizationController.listOrganizations);

// FIX #6: Specific named routes MUST come before /:orgId
// Otherwise Express matches "admin" as an orgId and hits getOrganization instead.
router.get(
  "/admin/list",
  authenticate,
  requireSuperAdmin,
  organizationController.listOrganizationsForAdmin,
);

// Super admin endpoints
router.post(
  "/",
  authenticate,
  requireSuperAdmin,
  organizationController.createOrganization,
);
router.put(
  "/:orgId",
  authenticate,
  requireSuperAdmin,
  organizationController.updateOrganization,
);
router.get(
  "/:orgId",
  authenticate,
  requireSuperAdmin,
  organizationController.getOrganization,
);

module.exports = router;
