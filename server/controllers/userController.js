const mongoose = require('mongoose');
const User = require('../models/User');

async function listUsers(req, res, next) {
  try {
    const filter = { role: 'member' };
    if (req.query.orgId) {
      if (!mongoose.isValidObjectId(req.query.orgId)) {
        return res.status(400).json({ message: 'Invalid orgId' });
      }
      filter.organizationId = req.query.orgId;
    }

    const users = await User.find(filter)
      .select('-password -faceEncodings')
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ users });
  } catch (err) {
    next(err);
  }
}

module.exports = { listUsers };
