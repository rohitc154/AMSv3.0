const Joi = require('joi');

const createOrganizationSchema = Joi.object({
  orgName: Joi.string().min(2).max(200).required(),
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  radiusAllowed: Joi.number().min(1).max(10000000).required(),
});

const updateOrganizationSchema = Joi.object({
  orgName: Joi.string().min(2).max(200),
  latitude: Joi.number().min(-90).max(90),
  longitude: Joi.number().min(-180).max(180),
  radiusAllowed: Joi.number().min(1).max(10000000),
}).min(1);

module.exports = { createOrganizationSchema, updateOrganizationSchema };
