const express = require("express");
const reportController = require("../controllers/reportController");
const {
  authenticate,
  requirePlatformAdmin,
  requireRole,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Existing analytics endpoint (unchanged)
router.get(
  "/",
  authenticate,
  requirePlatformAdmin,
  reportController.getReports,
);

// New export endpoints — accessible by orgAdmin (their org only) and superAdmin
router.get(
  "/org/:orgId/csv",
  authenticate,
  requireRole("admin", "superAdmin"),
  reportController.exportCsv,
);

router.get(
  "/org/:orgId/pdf",
  authenticate,
  requireRole("admin", "superAdmin"),
  reportController.exportPdf,
);

module.exports = router;
