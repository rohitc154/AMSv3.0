const express = require("express");
const multer = require("multer");
const authController = require("../controllers/authController");
const {
  authenticate,
  requireSuperAdmin,
} = require("../middleware/authMiddleware");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
});

const router = express.Router();

router.post("/register", upload.array("images", 10), authController.register);
router.post("/verify-registration-otp", authController.verifyRegistrationOtp);
router.post("/resend-registration-otp", authController.resendRegistrationOtp);
router.post("/register-admin", authController.registerAdmin); // Legacy endpoint for super admin registration
router.post("/register-super-admin", authController.registerSuperAdmin); // New super admin registration
router.post(
  "/create-org-admin",
  authenticate,
  requireSuperAdmin,
  authController.createOrganizationAdmin,
);
router.post("/login", authController.login);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.get("/me", authenticate, authController.me);

module.exports = router;
