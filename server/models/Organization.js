const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema(
  {
    orgName: { type: String, required: true, unique: true, trim: true },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    radiusAllowed: { type: Number, required: true, min: 1 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Organization', organizationSchema);
