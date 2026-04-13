const User = require("../models/User");
const { verifyToken } = require("../utils/jwt");

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const token = header.slice(7);
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    req.user = user;
    req.tokenPayload = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

/** Super Admin: creates organizations, assigns admins. No organization membership. */
function requireSuperAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (req.user.role !== "superAdmin" || req.user.organizationId) {
    return res
      .status(403)
      .json({ message: "Super administrator access required" });
  }
  next();
}

/** Organization Admin: manages their assigned organization. */
function requireOrgAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (req.user.role !== "admin" || !req.user.organizationId) {
    return res
      .status(403)
      .json({ message: "Organization administrator access required" });
  }
  next();
}

/** Legacy: Application administrator (for backward compatibility) */
function requirePlatformAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  // Support both superAdmin and old 'admin' without organization
  if (
    (req.user.role !== "superAdmin" && req.user.role !== "admin") ||
    (req.user.role === "admin" && req.user.organizationId)
  ) {
    return res
      .status(403)
      .json({ message: "Application administrator access required" });
  }
  next();
}

module.exports = {
  authenticate,
  requireRole,
  requireSuperAdmin,
  requireOrgAdmin,
  requirePlatformAdmin,
};
