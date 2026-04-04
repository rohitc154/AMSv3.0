const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const Organization = require("../models/Organization");
const User = require("../models/User");
const PendingRegistration = require("../models/PendingRegistration");
const PasswordResetOtp = require("../models/PasswordResetOtp");
const { signToken } = require("../utils/jwt");
const { encodeFaces } = require("../services/pythonService");
const { sendOtpEmail } = require("../services/emailService");
const { generateNumericOtp } = require("../utils/otp");
const {
  registerSchema,
  verifyRegistrationOtpSchema,
  resendRegistrationOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  registerAdminSchema,
  loginSchema,
} = require("../validators/authValidator");

function adminSecretValid(secret) {
  const expected = process.env.ADMIN_REGISTRATION_SECRET;
  return expected && secret === expected;
}

function otpExpiryMs() {
  return Number(process.env.OTP_EXPIRES_MS || 10 * 60 * 1000);
}

function otpResendCooldownMs() {
  return Number(process.env.OTP_RESEND_COOLDOWN_MS || 60 * 1000);
}

async function me(req, res, next) {
  try {
    const user = await User.findById(req.user._id)
      .select("-password -faceEncodings")
      .lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    let organization = null;
    if (user.organizationId) {
      organization = await Organization.findById(user.organizationId).lean();
    }
    return res.json({ user, organization });
  } catch (err) {
    next(err);
  }
}

/** Platform admin account (no organization; no face enrollment). Uses ADMIN_REGISTRATION_SECRET. */
async function registerAdmin(req, res, next) {
  try {
    const { error, value } = registerAdminSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error) {
      return res
        .status(400)
        .json({ message: error.details.map((d) => d.message).join(", ") });
    }

    if (!adminSecretValid(value.adminSecret)) {
      return res.status(403).json({ message: "Invalid admin secret" });
    }

    const existingEmail = await User.findOne({
      email: value.email.toLowerCase(),
    });
    if (existingEmail) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashed = await bcrypt.hash(value.password, 12);

    const user = await User.create({
      name: value.name.trim(),
      email: value.email.toLowerCase().trim(),
      password: hashed,
      role: "admin",
      faceEncodings: [],
    });

    const token = signToken({ userId: user._id.toString(), role: user.role });

    return res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        memberId: null,
        organizationId: null,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

/** Member registration step-1: collect details + send OTP to email. */
async function register(req, res, next) {
  try {
    const { error, value } = registerSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error) {
      return res
        .status(400)
        .json({ message: error.details.map((d) => d.message).join(", ") });
    }

    const files = req.files;
    if (!files || files.length < 5 || files.length > 10) {
      return res.status(400).json({
        message:
          'Provide between 5 and 10 camera-captured images in field "images"',
      });
    }

    if (!mongoose.isValidObjectId(value.organizationId)) {
      return res.status(400).json({ message: "Invalid organization id" });
    }

    const org = await Organization.findById(value.organizationId);
    if (!org) {
      return res.status(400).json({
        message: "Organization not found. Ask an admin to create it first.",
      });
    }

    const existingEmail = await User.findOne({
      email: value.email.toLowerCase(),
    });
    if (existingEmail) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const dupMember = await User.findOne({
      memberId: value.memberId.trim(),
      organizationId: org._id,
      role: "member",
    });
    if (dupMember) {
      return res
        .status(409)
        .json({ message: "Member ID already used in this organization" });
    }

    const buffers = files.map((f) => f.buffer);
    const names = files.map((f) => f.originalname || "frame.jpg");

    let pythonResult;
    try {
      pythonResult = await encodeFaces(buffers, names);
    } catch (e) {
      const msg =
        e.response?.data?.detail || e.message || "Face encoding failed";
      return res
        .status(502)
        .json({ message: "Face encoding service error", detail: msg });
    }

    const embeddings = pythonResult.embeddings;
    if (!embeddings || !embeddings.length) {
      return res.status(400).json({ message: "No face encodings returned" });
    }

    const email = value.email.toLowerCase().trim();
    const existingPending = await PendingRegistration.findOne({ email })
      .select("lastSentAt")
      .lean();
    if (existingPending?.lastSentAt) {
      const since = Date.now() - new Date(existingPending.lastSentAt).getTime();
      if (since < otpResendCooldownMs()) {
        return res
          .status(429)
          .json({ message: "OTP recently sent. Please wait and try again." });
      }
    }

    const passwordHash = await bcrypt.hash(value.password, 12);
    const otp = generateNumericOtp(6);
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + otpExpiryMs());

    const pending = await PendingRegistration.findOneAndUpdate(
      { email },
      {
        $set: {
          name: value.name.trim(),
          email,
          passwordHash,
          memberId: value.memberId.trim(),
          organizationId: org._id,
          faceEncodings: embeddings,
          otpHash,
          expiresAt,
          attempts: 0,
          lastSentAt: new Date(),
        },
      },
      { upsert: true, new: true },
    );

    await sendOtpEmail({ to: email, otp, purpose: "register" });
    return res.status(201).json({
      message: "OTP sent to your email. Verify OTP to complete registration.",
      pendingId: pending._id,
      email,
      expiresAt,
    });
  } catch (err) {
    next(err);
  }
}

async function verifyRegistrationOtp(req, res, next) {
  try {
    const { error, value } = verifyRegistrationOtpSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error) {
      return res
        .status(400)
        .json({ message: error.details.map((d) => d.message).join(", ") });
    }

    if (!mongoose.isValidObjectId(value.pendingId)) {
      return res.status(400).json({ message: "Invalid pendingId" });
    }

    const pending = await PendingRegistration.findById(value.pendingId).select(
      "+otpHash +passwordHash",
    );
    if (!pending) {
      return res
        .status(404)
        .json({ message: "Pending registration not found or expired" });
    }
    if (pending.expiresAt.getTime() < Date.now()) {
      await PendingRegistration.deleteOne({ _id: pending._id });
      return res.status(400).json({ message: "OTP expired. Register again." });
    }
    if (pending.attempts >= 5) {
      return res
        .status(429)
        .json({ message: "Too many OTP attempts. Register again." });
    }

    const otpOk = await bcrypt.compare(value.otp, pending.otpHash);
    if (!otpOk) {
      pending.attempts += 1;
      await pending.save();
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const existingEmail = await User.findOne({ email: pending.email });
    if (existingEmail) {
      await PendingRegistration.deleteOne({ _id: pending._id });
      return res.status(409).json({ message: "Email already registered" });
    }

    const dupMember = await User.findOne({
      memberId: pending.memberId,
      organizationId: pending.organizationId,
      role: "member",
    });
    if (dupMember) {
      await PendingRegistration.deleteOne({ _id: pending._id });
      return res
        .status(409)
        .json({ message: "Member ID already used in this organization" });
    }

    const user = await User.create({
      name: pending.name,
      email: pending.email,
      password: pending.passwordHash,
      memberId: pending.memberId,
      organizationId: pending.organizationId,
      faceEncodings: pending.faceEncodings,
      role: "member",
    });

    await PendingRegistration.deleteOne({ _id: pending._id });
    const token = signToken({ userId: user._id.toString(), role: user.role });

    return res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        memberId: user.memberId,
        organizationId: user.organizationId,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function resendRegistrationOtp(req, res, next) {
  try {
    const { error, value } = resendRegistrationOtpSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error) {
      return res
        .status(400)
        .json({ message: error.details.map((d) => d.message).join(", ") });
    }
    if (!mongoose.isValidObjectId(value.pendingId)) {
      return res.status(400).json({ message: "Invalid pendingId" });
    }
    const pending = await PendingRegistration.findById(value.pendingId).select(
      "+otpHash",
    );
    if (!pending) {
      return res
        .status(404)
        .json({ message: "Pending registration not found or expired" });
    }
    const since = pending.lastSentAt
      ? Date.now() - pending.lastSentAt.getTime()
      : Infinity;
    if (since < otpResendCooldownMs()) {
      return res
        .status(429)
        .json({ message: "OTP recently sent. Please wait and try again." });
    }

    const otp = generateNumericOtp(6);
    pending.otpHash = await bcrypt.hash(otp, 10);
    pending.expiresAt = new Date(Date.now() + otpExpiryMs());
    pending.attempts = 0;
    pending.lastSentAt = new Date();
    await pending.save();
    await sendOtpEmail({ to: pending.email, otp, purpose: "register" });

    return res.json({
      message: "OTP resent successfully",
      pendingId: pending._id,
      email: pending.email,
      expiresAt: pending.expiresAt,
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { error, value } = loginSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error) {
      return res
        .status(400)
        .json({ message: error.details.map((d) => d.message).join(", ") });
    }

    const user = await User.findOne({
      email: value.email.toLowerCase(),
    }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const ok = await bcrypt.compare(value.password, user.password);
    if (!ok) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = signToken({ userId: user._id.toString(), role: user.role });

    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        memberId: user.memberId ?? null,
        organizationId: user.organizationId ?? null,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const { error, value } = forgotPasswordSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error) {
      return res
        .status(400)
        .json({ message: error.details.map((d) => d.message).join(", ") });
    }

    const email = value.email.toLowerCase().trim();
    const user = await User.findOne({ email }).select("_id email").lean();

    // Do not reveal if account exists.
    // if (!user) {
    //   return res.json({ message: 'If this email exists, an OTP has been sent.' });
    // }
    if (!user) {
      return res.status(404).json({ message: "User not registered" });
    }

    const existing = await PasswordResetOtp.findOne({ userId: user._id })
      .select("lastSentAt")
      .lean();
    if (existing?.lastSentAt) {
      const since = Date.now() - new Date(existing.lastSentAt).getTime();
      if (since < otpResendCooldownMs()) {
        return res
          .status(429)
          .json({ message: "OTP recently sent. Please wait and try again." });
      }
    }

    const otp = generateNumericOtp(6);
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + otpExpiryMs());

    await PasswordResetOtp.findOneAndUpdate(
      { userId: user._id },
      {
        $set: {
          userId: user._id,
          email,
          otpHash,
          expiresAt,
          attempts: 0,
          lastSentAt: new Date(),
        },
      },
      { upsert: true, new: true },
    );

    await sendOtpEmail({ to: email, otp, purpose: "reset_password" });
    // return res.json({ message: "If this email exists, an OTP has been sent." });
    return res.json({ message: "OTP sent successfully" });
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { error, value } = resetPasswordSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error) {
      return res
        .status(400)
        .json({ message: error.details.map((d) => d.message).join(", ") });
    }

    const email = value.email.toLowerCase().trim();
    const user = await User.findOne({ email }).select("_id");
    if (!user) {
      return res.status(400).json({ message: "Invalid email or OTP" });
    }

    const resetRow = await PasswordResetOtp.findOne({
      userId: user._id,
    }).select("+otpHash");
    if (!resetRow) {
      return res.status(400).json({ message: "Invalid email or OTP" });
    }
    if (resetRow.expiresAt.getTime() < Date.now()) {
      await PasswordResetOtp.deleteOne({ _id: resetRow._id });
      return res
        .status(400)
        .json({ message: "OTP expired. Request a new OTP." });
    }
    if (resetRow.attempts >= 5) {
      return res
        .status(429)
        .json({ message: "Too many attempts. Request a new OTP." });
    }

    const ok = await bcrypt.compare(value.otp, resetRow.otpHash);
    if (!ok) {
      resetRow.attempts += 1;
      await resetRow.save();
      return res.status(400).json({ message: "Invalid email or OTP" });
    }

    const newHash = await bcrypt.hash(value.newPassword, 12);
    await User.updateOne({ _id: user._id }, { $set: { password: newHash } });
    await PasswordResetOtp.deleteOne({ _id: resetRow._id });

    return res.json({ message: "Password reset successful. Please sign in." });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  verifyRegistrationOtp,
  resendRegistrationOtp,
  registerAdmin,
  login,
  me,
  forgotPassword,
  resetPassword,
};
