const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const Organization = require('../models/Organization');
const User = require('../models/User');

async function getReports(req, res, next) {
  try {
    const { month, orgId } = req.query;

    if (!orgId || !mongoose.isValidObjectId(orgId)) {
      return res.status(400).json({ message: 'orgId query parameter is required' });
    }

    const org = await Organization.findById(orgId).lean();
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    const users = await User.find({ organizationId: orgId, role: 'member' })
      .select('_id name email memberId')
      .lean();
    const userIds = users.map((u) => u._id);

    const match = { userId: { $in: userIds } };
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      match.date = { $regex: `^${month}` };
    }

    const attendanceRows = await Attendance.find(match).lean();

    const daysInMonth = month
      ? new Date(
          parseInt(month.slice(0, 4), 10),
          parseInt(month.slice(5, 7), 10),
          0
        ).getDate()
      : null;

    const byUser = {};
    users.forEach((u) => {
      byUser[u._id.toString()] = {
        user: u,
        presentDays: 0,
        records: [],
      };
    });

    attendanceRows.forEach((row) => {
      const key = row.userId.toString();
      if (byUser[key]) {
        byUser[key].presentDays += 1;
        byUser[key].records.push(row);
      }
    });

    const analytics = Object.values(byUser).map((entry) => {
      const pct = daysInMonth ? (entry.presentDays / daysInMonth) * 100 : 100;
      return {
        userId: entry.user._id,
        name: entry.user.name,
        email: entry.user.email,
        memberId: entry.user.memberId,
        presentDays: entry.presentDays,
        attendancePercentage: Math.round(pct * 100) / 100,
      };
    });

    return res.json({
      organizationId: orgId,
      month: month || null,
      totalRecords: attendanceRows.length,
      analytics,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getReports };
