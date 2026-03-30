const Joi = require('joi');

const markAttendanceSchema = Joi.object({
  memberId: Joi.string().required(),
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  timestamp: Joi.date().required(),
});

module.exports = { markAttendanceSchema };
