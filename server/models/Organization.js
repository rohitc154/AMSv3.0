const mongoose = require("mongoose");

const organizationSchema = new mongoose.Schema(
  {
    orgName: { type: String, required: true, unique: true, trim: true },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    radiusAllowed: { type: Number, required: true, min: 1 },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Organization", organizationSchema);
