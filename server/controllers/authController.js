const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const User = require('../models/User');
const { signToken } = require('../utils/jwt');
const { encodeFaces } = require('../services/pythonService');
const {
  registerSchema,
  registerAdminSchema,
  loginSchema,
} = require('../validators/authValidator');

function adminSecretValid(secret) {
  const expected = process.env.ADMIN_REGISTRATION_SECRET;
  return expected && secret === expected;
}

async function me(req, res, next) {
  try {
    const user = await User.findById(req.user._id).select('-password -faceEncodings').lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
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
    const { error, value } = registerAdminSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({ message: error.details.map((d) => d.message).join(', ') });
    }

    if (!adminSecretValid(value.adminSecret)) {
      return res.status(403).json({ message: 'Invalid admin secret' });
    }

    const existingEmail = await User.findOne({ email: value.email.toLowerCase() });
    if (existingEmail) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const hashed = await bcrypt.hash(value.password, 12);

    const user = await User.create({
      name: value.name.trim(),
      email: value.email.toLowerCase().trim(),
      password: hashed,
      role: 'admin',
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

/** Member registration: must select an existing organization; face images required. */
async function register(req, res, next) {
  try {
    const { error, value } = registerSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({ message: error.details.map((d) => d.message).join(', ') });
    }

    const files = req.files;
    if (!files || files.length < 5 || files.length > 10) {
      return res.status(400).json({
        message: 'Provide between 5 and 10 camera-captured images in field "images"',
      });
    }

    if (!mongoose.isValidObjectId(value.organizationId)) {
      return res.status(400).json({ message: 'Invalid organization id' });
    }

    const org = await Organization.findById(value.organizationId);
    if (!org) {
      return res.status(400).json({ message: 'Organization not found. Ask an admin to create it first.' });
    }

    const existingEmail = await User.findOne({ email: value.email.toLowerCase() });
    if (existingEmail) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const dupMember = await User.findOne({
      memberId: value.memberId.trim(),
      organizationId: org._id,
      role: 'member',
    });
    if (dupMember) {
      return res.status(409).json({ message: 'Member ID already used in this organization' });
    }

    const buffers = files.map((f) => f.buffer);
    const names = files.map((f) => f.originalname || 'frame.jpg');

    let pythonResult;
    try {
      pythonResult = await encodeFaces(buffers, names);
    } catch (e) {
      const msg = e.response?.data?.detail || e.message || 'Face encoding failed';
      return res.status(502).json({ message: 'Face encoding service error', detail: msg });
    }

    const embeddings = pythonResult.embeddings;
    if (!embeddings || !embeddings.length) {
      return res.status(400).json({ message: 'No face encodings returned' });
    }

    const hashed = await bcrypt.hash(value.password, 12);

    const user = await User.create({
      name: value.name.trim(),
      email: value.email.toLowerCase().trim(),
      password: hashed,
      memberId: value.memberId.trim(),
      organizationId: org._id,
      faceEncodings: embeddings,
      role: 'member',
    });

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

async function login(req, res, next) {
  try {
    const { error, value } = loginSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({ message: error.details.map((d) => d.message).join(', ') });
    }

    const user = await User.findOne({ email: value.email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const ok = await bcrypt.compare(value.password, user.password);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid email or password' });
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

module.exports = { register, registerAdmin, login, me };
