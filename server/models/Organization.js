const mongoose = require('mongoose');
const { ORGANIZATION_TYPES } = require('../config/constants');
const { withBaseFields } = require('./shared');

const organizationSchema = withBaseFields({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 160 },
  organizationType: { type: String, enum: ORGANIZATION_TYPES, default: 'club' },
  sports: { type: [{ type: String, trim: true, maxlength: 80 }], default: [] },
  foundedYear: { type: Number, min: 1800, max: 2100 },
  activities: { type: [{ type: String, trim: true, maxlength: 120 }], default: [] },
  careerHistory: { type: [{ type: String, trim: true, maxlength: 500 }], default: [] },
});

organizationSchema.index({ 'location.coordinates': '2dsphere' });
organizationSchema.index({ sports: 1 });

module.exports = mongoose.model('Organization', organizationSchema);
