const Attendance = require('../models/Attendance');
const Organization = require('../models/Organization');
const User = require('../models/User');
const { recognizeFace } = require('../services/pythonService');
const { isWithinRadius } = require('../services/geoService');
const { markAttendanceSchema } = require('../validators/attendanceValidator');

function utcDateString(d) {
  return d.toISOString().slice(0, 10);
}

function coerceMarkBody(body) {
  return {
    ...body,
    latitude: body.latitude != null ? Number(body.latitude) : undefined,
    longitude: body.longitude != null ? Number(body.longitude) : undefined,
  };
}

function isPlatformAdmin(user) {
  return user.role === 'admin' && !user.organizationId;
}

async function markAttendance(req, res, next) {
  try {
    const { error, value } = markAttendanceSchema.validate(coerceMarkBody(req.body), {
      abortEarly: false,
      convert: true,
    });
    if (error) {
      return res.status(400).json({ message: error.details.map((d) => d.message).join(', ') });
    }

    const file = req.file;
    if (!file || !file.buffer) {
      return res.status(400).json({ message: 'Camera image is required (field "image")' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.organizationId) {
      return res.status(403).json({
        message: 'Application administrators cannot mark attendance. Use a member account.',
      });
    }

    if (value.memberId.trim() !== user.memberId) {
      return res.status(403).json({ message: 'memberId does not match authenticated user' });
    }

    const org = await Organization.findById(user.organizationId);
    if (!org) {
      return res.status(400).json({ message: 'Organization not found' });
    }

    const inside = isWithinRadius(
      value.latitude,
      value.longitude,
      org.location.lat,
      org.location.lng,
      org.radiusAllowed
    );
    if (!inside) {
      return res.status(403).json({
        message: 'Location outside allowed area for your organization',
      });
    }

    if (!user.faceEncodings || user.faceEncodings.length === 0) {
      return res.status(400).json({ message: 'No face encodings on file. Re-register.' });
    }

    const minConf = parseFloat(process.env.MIN_CONFIDENCE || '0.55');

    let recognition;
    try {
      recognition = await recognizeFace(file.buffer, file.originalname, user.faceEncodings);
    } catch (e) {
      const msg = e.response?.data?.detail || e.message || 'Face recognition failed';
      return res.status(502).json({ message: 'Face recognition service error', detail: msg });
    }

    if (!recognition.match) {
      return res.status(403).json({
        message: 'Face does not match registered profile',
        confidence: recognition.confidence,
      });
    }

    if (recognition.confidence < minConf) {
      return res.status(403).json({
        message: 'Match confidence too low',
        confidence: recognition.confidence,
        minConfidence: minConf,
      });
    }

    const checkInTime = new Date(value.timestamp);
    const dateKey = utcDateString(checkInTime);

    try {
      const record = await Attendance.create({
        userId: user._id,
        date: dateKey,
        checkInTime,
        location: { latitude: value.latitude, longitude: value.longitude },
        confidence: recognition.confidence,
        status: 'Present',
      });
      return res.status(201).json({
        message: 'Attendance marked',
        attendance: record,
      });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ message: 'Attendance already marked for this date' });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

async function getUserAttendance(req, res, next) {
  try {
    const { id } = req.params;
    const requester = req.user;

    if (isPlatformAdmin(requester)) {
      const target = await User.findById(id).select('role').lean();
      if (!target || target.role !== 'member') {
        return res.status(403).json({ message: 'Forbidden' });
      }
    } else if (requester._id.toString() !== id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const list = await Attendance.find({ userId: id }).sort({ checkInTime: -1 }).lean();
    return res.json({ attendance: list });
  } catch (err) {
    next(err);
  }
}

async function getOrgAttendance(req, res, next) {
  try {
    const { orgId } = req.params;
    const requester = req.user;

    if (!isPlatformAdmin(requester)) {
      if (!requester.organizationId || requester.organizationId.toString() !== orgId) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const { date, userId } = req.query;
    const filter = {};
    const usersInOrg = await User.find({ organizationId: orgId, role: 'member' }).select('_id').lean();
    const ids = usersInOrg.map((u) => u._id);
    filter.userId = { $in: ids };

    if (date) {
      filter.date = date;
    }
    if (userId) {
      filter.userId = userId;
    }

    const list = await Attendance.find(filter).sort({ checkInTime: -1 }).lean();
    return res.json({ attendance: list });
  } catch (err) {
    next(err);
  }
}

module.exports = { markAttendance, getUserAttendance, getOrgAttendance };
