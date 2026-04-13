const mongoose = require("mongoose");
const PDFDocument = require("pdfkit");
const Attendance = require("../models/Attendance");
const Organization = require("../models/Organization");
const User = require("../models/User");

// ─── Existing getReports (unchanged) ────────────────────────────────────────

async function getReports(req, res, next) {
  try {
    const { month, orgId } = req.query;

    if (!orgId || !mongoose.isValidObjectId(orgId)) {
      return res
        .status(400)
        .json({ message: "orgId query parameter is required" });
    }

    const org = await Organization.findById(orgId).lean();
    if (!org) {
      return res.status(404).json({ message: "Organization not found" });
    }

    const users = await User.find({ organizationId: orgId, role: "member" })
      .select("_id name email memberId")
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
          0,
        ).getDate()
      : null;

    const byUser = {};
    users.forEach((u) => {
      byUser[u._id.toString()] = { user: u, presentDays: 0, records: [] };
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

// ─── Shared helpers ──────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(iso);
  }
}

function fmtTime(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "";
  }
}

function escapeCsv(val) {
  const s = val == null ? "" : String(val);
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

async function buildRows(orgId, { date, month } = {}) {
  const members = await User.find({ organizationId: orgId, role: "member" })
    .select("_id name email memberId")
    .lean();

  const memberMap = Object.fromEntries(
    members.map((m) => [m._id.toString(), m]),
  );
  const memberIds = members.map((m) => m._id);

  const attFilter = { userId: { $in: memberIds } };
  if (date) {
    attFilter.date = date;
  } else if (month && /^\d{4}-\d{2}$/.test(month)) {
    attFilter.date = { $regex: `^${month}` };
  }

  const records = await Attendance.find(attFilter)
    .sort({ date: 1, checkInTime: 1 })
    .lean();

  return records.map((r) => {
    const member = memberMap[r.userId?.toString()] || {};
    return {
      date: r.date || fmtDate(r.checkInTime),
      checkInTime: fmtTime(r.checkInTime),
      name: member.name || "N/A",
      email: member.email || "N/A",
      memberId: member.memberId || "N/A",
      status: r.status || "Present",
      confidence:
        r.confidence != null ? `${(r.confidence * 100).toFixed(1)}%` : "N/A",
    };
  });
}

function canAccessOrg(requester, orgId) {
  if (requester.role === "superAdmin") return true;
  if (
    requester.role === "admin" &&
    requester.organizationId?.toString() === orgId
  )
    return true;
  return false;
}

// ─── CSV export ──────────────────────────────────────────────────────────────

async function exportCsv(req, res, next) {
  try {
    const { orgId } = req.params;
    if (!mongoose.isValidObjectId(orgId)) {
      return res.status(400).json({ message: "Invalid orgId" });
    }
    if (!canAccessOrg(req.user, orgId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const org = await Organization.findById(orgId).lean();
    if (!org)
      return res.status(404).json({ message: "Organization not found" });

    const { date, month } = req.query;
    const rows = await buildRows(orgId, { date, month });

    const headers = [
      "Date",
      "Check-in Time",
      "Name",
      "Email",
      "Member ID",
      "Status",
      "Confidence",
    ];
    const csvLines = [
      headers.map(escapeCsv).join(","),
      ...rows.map((r) =>
        [
          r.date,
          r.checkInTime,
          r.name,
          r.email,
          r.memberId,
          r.status,
          r.confidence,
        ]
          .map(escapeCsv)
          .join(","),
      ),
    ];

    const label = date || month || "all";
    const safeName = org.orgName.replace(/[^a-z0-9]/gi, "_");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="attendance_${safeName}_${label}.csv"`,
    );
    return res.send(csvLines.join("\r\n"));
  } catch (err) {
    next(err);
  }
}

// ─── PDF export ──────────────────────────────────────────────────────────────

async function exportPdf(req, res, next) {
  try {
    const { orgId } = req.params;
    if (!mongoose.isValidObjectId(orgId)) {
      return res.status(400).json({ message: "Invalid orgId" });
    }
    if (!canAccessOrg(req.user, orgId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const org = await Organization.findById(orgId).lean();
    if (!org)
      return res.status(404).json({ message: "Organization not found" });

    const { date, month } = req.query;
    const rows = await buildRows(orgId, { date, month });
    const label = date || month || "All time";
    const safeName = org.orgName.replace(/[^a-z0-9]/gi, "_");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="attendance_${safeName}_${date || month || "all"}.pdf"`,
    );

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    doc.pipe(res);

    // Header band
    doc.rect(0, 0, doc.page.width, 70).fill("#0f172a");
    doc
      .fillColor("#ffffff")
      .fontSize(18)
      .font("Helvetica-Bold")
      .text("Attendance Report", 40, 20);
    doc
      .fontSize(10)
      .font("Helvetica")
      .text(`${org.orgName}  ·  Period: ${label}`, 40, 46);

    // Summary bar
    doc
      .fillColor("#1e293b")
      .rect(40, 85, doc.page.width - 80, 36)
      .fill();
    doc
      .fillColor("#94a3b8")
      .fontSize(9)
      .font("Helvetica")
      .text(`Total records: ${rows.length}`, 52, 98)
      .text(`Generated: ${new Date().toLocaleString("en-GB")}`, 300, 98);

    if (rows.length === 0) {
      doc
        .fillColor("#64748b")
        .fontSize(12)
        .font("Helvetica")
        .text("No attendance records found for the selected period.", 40, 150, {
          align: "center",
        });
      doc.end();
      return;
    }

    // Table
    const tableTop = 140;
    const col = {
      date: 40,
      time: 105,
      name: 175,
      memberId: 335,
      status: 415,
      conf: 478,
    };
    const colW = {
      date: 60,
      time: 65,
      name: 155,
      memberId: 75,
      status: 58,
      conf: 55,
    };
    const rowH = 22;

    function drawHeader(y) {
      doc
        .fillColor("#1e40af")
        .rect(40, y, doc.page.width - 80, rowH)
        .fill();
      doc.fillColor("#ffffff").fontSize(8).font("Helvetica-Bold");
      doc.text("Date", col.date, y + 7, { width: colW.date });
      doc.text("Time", col.time, y + 7, { width: colW.time });
      doc.text("Name", col.name, y + 7, { width: colW.name });
      doc.text("Member ID", col.memberId, y + 7, { width: colW.memberId });
      doc.text("Status", col.status, y + 7, { width: colW.status });
      doc.text("Conf.", col.conf, y + 7, { width: colW.conf });
    }

    drawHeader(tableTop);
    let y = tableTop + rowH;

    rows.forEach((row, i) => {
      if (y + rowH > doc.page.height - 60) {
        doc.addPage();
        y = 40;
        drawHeader(y);
        y += rowH;
      }
      doc
        .fillColor(i % 2 === 0 ? "#f8fafc" : "#ffffff")
        .rect(40, y, doc.page.width - 80, rowH)
        .fill();
      doc
        .strokeColor("#e2e8f0")
        .lineWidth(0.5)
        .moveTo(40, y + rowH)
        .lineTo(doc.page.width - 40, y + rowH)
        .stroke();

      doc.fillColor("#1e293b").fontSize(8).font("Helvetica");
      doc.text(row.date, col.date, y + 7, { width: colW.date });
      doc.text(row.checkInTime, col.time, y + 7, { width: colW.time });
      doc.text(row.name, col.name, y + 7, { width: colW.name, ellipsis: true });
      doc.text(row.memberId, col.memberId, y + 7, { width: colW.memberId });
      doc
        .fillColor(row.status === "Present" ? "#16a34a" : "#dc2626")
        .text(row.status, col.status, y + 7, { width: colW.status });
      doc
        .fillColor("#64748b")
        .text(row.confidence, col.conf, y + 7, { width: colW.conf });
      y += rowH;
    });

    doc
      .fillColor("#94a3b8")
      .fontSize(8)
      .font("Helvetica")
      .text(`facelog  ·  ${org.orgName}`, 40, doc.page.height - 40, {
        align: "center",
        width: doc.page.width - 80,
      });

    doc.end();
  } catch (err) {
    next(err);
  }
}

module.exports = { getReports, exportCsv, exportPdf };
