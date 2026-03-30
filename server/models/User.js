const mongoose = require('mongoose');

const ROLES = ['admin', 'member'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    memberId: {
      type: String,
      trim: true,
      required: function memberIdRequired() {
        return this.role === 'member';
      },
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: function orgRequired() {
        return this.role === 'member';
      },
    },
    faceEncodings: {
      type: [[Number]],
      default: [],
    },
    role: { type: String, enum: ROLES, default: 'member' },
  },
  { timestamps: true }
);

userSchema.index(
  { memberId: 1, organizationId: 1 },
  {
    unique: true,
    partialFilterExpression: { role: 'member' },
  }
);

module.exports = mongoose.model('User', userSchema);
module.exports.ROLES = ROLES;
