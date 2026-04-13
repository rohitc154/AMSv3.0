const Organization = require("../models/Organization");
const User = require("../models/User");
const {
  createOrganizationSchema,
  updateOrganizationSchema,
} = require("../validators/organizationValidator");

/** Public list for member registration dropdown */
async function listOrganizations(req, res, next) {
  try {
    const orgs = await Organization.find()
      .select("_id orgName location radiusAllowed adminId")
      .sort({ orgName: 1 })
      .populate("adminId", "name email")
      .lean();
    return res.json({ organizations: orgs });
  } catch (err) {
    next(err);
  }
}

/** List organizations for super admin (with admin details) */
async function listOrganizationsForAdmin(req, res, next) {
  try {
    const orgs = await Organization.find()
      .select("_id orgName location radiusAllowed adminId createdAt")
      .sort({ createdAt: -1 })
      .populate("adminId", "name email")
      .lean();
    return res.json({ organizations: orgs });
  } catch (err) {
    next(err);
  }
}

async function createOrganization(req, res, next) {
  try {
    const { error, value } = createOrganizationSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error) {
      return res
        .status(400)
        .json({ message: error.details.map((d) => d.message).join(", ") });
    }

    const existing = await Organization.findOne({
      orgName: value.orgName.trim(),
    });
    if (existing) {
      return res
        .status(409)
        .json({ message: "An organization with this name already exists" });
    }

    const org = await Organization.create({
      orgName: value.orgName.trim(),
      location: { lat: value.latitude, lng: value.longitude },
      radiusAllowed: value.radiusAllowed,
      adminId: null,
    });

    return res.status(201).json({ organization: org });
  } catch (err) {
    next(err);
  }
}

async function updateOrganization(req, res, next) {
  try {
    const { orgId } = req.params;
    const { error, value } = updateOrganizationSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error) {
      return res
        .status(400)
        .json({ message: error.details.map((d) => d.message).join(", ") });
    }

    const org = await Organization.findById(orgId);
    if (!org) {
      return res.status(404).json({ message: "Organization not found" });
    }

    if (value.orgName) {
      const clash = await Organization.findOne({
        orgName: value.orgName.trim(),
        _id: { $ne: org._id },
      });
      if (clash) {
        return res
          .status(409)
          .json({ message: "Another organization already uses this name" });
      }
      org.orgName = value.orgName.trim();
    }
    if (
      typeof value.latitude === "number" &&
      typeof value.longitude === "number"
    ) {
      org.location = { lat: value.latitude, lng: value.longitude };
    }
    if (typeof value.radiusAllowed === "number") {
      org.radiusAllowed = value.radiusAllowed;
    }

    await org.save();
    return res.json({ organization: org });
  } catch (err) {
    next(err);
  }
}

/** Get organization details with admin info */
async function getOrganization(req, res, next) {
  try {
    const { orgId } = req.params;
    const org = await Organization.findById(orgId)
      .populate("adminId", "name email")
      .lean();

    if (!org) {
      return res.status(404).json({ message: "Organization not found" });
    }

    return res.json({ organization: org });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listOrganizations,
  listOrganizationsForAdmin,
  createOrganization,
  updateOrganization,
  getOrganization,
};
