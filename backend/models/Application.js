const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  job:          { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  jobTitle:     { type: String, required: true },
  name:         { type: String, required: true },
  email:        { type: String, required: true, lowercase: true },
  phone:        { type: String },
  coverLetter:  { type: String },
  resumePath:   { type: String, required: true },
  resumeText:   { type: String },
  aiScore:      { type: Number, min: 0, max: 100 },
  aiSummary:    { type: String },
  aiMatched:    { type: Boolean, default: false },
  status:       { type: String, enum: ['pending', 'reviewed', 'shortlisted', 'rejected'], default: 'pending' },
  notified:     { type: Boolean, default: false },
  createdAt:    { type: Date, default: Date.now }
});

module.exports = mongoose.model('Application', applicationSchema);
