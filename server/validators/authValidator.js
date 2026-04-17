const Joi = require("joi");

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(120).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  organizationId: Joi.string().required(),
  memberId: Joi.string().min(2).max(64).required(),
});

const verifyRegistrationOtpSchema = Joi.object({
  pendingId: Joi.string().required(),
  otp: Joi.string()
    .pattern(/^\d{6}$/)
    .required(),
});

const resendRegistrationOtpSchema = Joi.object({
  pendingId: Joi.string().required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string()
    .pattern(/^\d{6}$/)
    .required(),
  newPassword: Joi.string().min(8).max(128).required(),
});

const registerAdminSchema = Joi.object({
  name: Joi.string().min(2).max(120).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  adminSecret: Joi.string().required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

module.exports = {
  registerSchema,
  verifyRegistrationOtpSchema,
  resendRegistrationOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  registerAdminSchema,
  loginSchema,
};
