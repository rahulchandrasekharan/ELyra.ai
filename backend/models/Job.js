const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title:        { type: String, required: true },
  department:   { type: String, required: true },
  location:     { type: String, required: true },
  type:         { type: String, enum: ['Full-time', 'Part-time', 'Contract', 'Internship'], default: 'Full-time' },
  description:  { type: String, required: true },
  requirements: [{ type: String }],
  skills:       [{ type: String }],
  salaryRange:  { type: String },
  status:       { type: String, enum: ['open', 'closed'], default: 'open' },
  createdAt:    { type: Date, default: Date.now },
  updatedAt:    { type: Date, default: Date.now }
});

jobSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Job', jobSchema);
