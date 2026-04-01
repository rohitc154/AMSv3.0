const nodemailer = require('nodemailer');

// Check if SMTP config exists
function hasSmtpConfig() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

// Build transporter
function buildTransport() {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // Verify SMTP connection (runs once when created)
  transporter.verify((error, success) => {
    if (error) {
      console.error("❌ SMTP connection failed:", error.message);
    } else {
      console.log("✅ SMTP server is ready to send emails");
    }
  });

  return transporter;
}

// Send OTP Email
async function sendOtpEmail({ to, otp, purpose = 'register' }) {
  const subject =
    purpose === 'reset_password'
      ? 'Reset your password (OTP)'
      : 'Verify your email (OTP)';

  const text =
    purpose === 'reset_password'
      ? `Your OTP for password reset is: ${otp}\n\nThis OTP will expire in 5 minutes.`
      : `Your OTP for registration is: ${otp}\n\nThis OTP will expire in 5 minutes.`;

  // Fallback if SMTP not configured
  if (!hasSmtpConfig()) {
    console.warn("⚠️ SMTP not configured. Logging OTP instead.");
    console.log(`[OTP:${purpose}] to=${to} otp=${otp}`);
    return;
  }

  const transporter = buildTransport();

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
    });

    console.log("📧 Email sent successfully:", info.response);
  } catch (err) {
    console.error("❌ Failed to send email:", err.message);

    // Optional fallback (log OTP)
    console.log(`[FALLBACK OTP:${purpose}] to=${to} otp=${otp}`);
  }
}

module.exports = { sendOtpEmail };