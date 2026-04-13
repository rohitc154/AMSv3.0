const mongoose = require("mongoose");
const User = require("../models/User");
const Organization = require("../models/Organization");

async function listUsers(req, res, next) {
  try {
    const filter = { role: "member" };

    // If the user is an org admin, only show members of their organization
    if (req.user.role === "admin" && req.user.organizationId) {
      filter.organizationId = req.user.organizationId;
    } else if (req.query.orgId) {
      // Super admin can filter by organization
      if (req.user.role !== "superAdmin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      if (!mongoose.isValidObjectId(req.query.orgId)) {
        return res.status(400).json({ message: "Invalid orgId" });
      }
      filter.organizationId = req.query.orgId;
    }

    const users = await User.find(filter)
      .select("-password -faceEncodings")
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ users });
  } catch (err) {
    next(err);
  }
}

/** List organization admins (for super admin) */
async function listAdmins(req, res, next) {
  try {
    let filter = { role: "admin" };

    if (req.query.orgId) {
      if (!mongoose.isValidObjectId(req.query.orgId)) {
        return res.status(400).json({ message: "Invalid orgId" });
      }
      filter.organizationId = req.query.orgId;
    }

    const admins = await User.find(filter)
      .select("-password -faceEncodings")
      .populate("organizationId", "orgName")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ admins });
  } catch (err) {
    next(err);
  }
}

/** Remove admin from organization (super admin only) */
async function removeAdmin(req, res, next) {
  try {
    const { adminId } = req.params;

    if (!mongoose.isValidObjectId(adminId)) {
      return res.status(400).json({ message: "Invalid adminId" });
    }

    const admin = await User.findById(adminId);
    if (!admin || admin.role !== "admin") {
      return res.status(404).json({ message: "Admin not found" });
    }

    const orgId = admin.organizationId;

    // Remove admin from organization
    await User.deleteOne({ _id: adminId });

    // Clear adminId from organization
    if (orgId) {
      await Organization.updateOne({ _id: orgId }, { $set: { adminId: null } });
    }

    return res.json({ message: "Admin removed successfully" });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listUsers,
  listAdmins,
  removeAdmin,
};
