const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title:     { type: String, required: true },
  slug:      { type: String, required: true, unique: true },
  category:  { type: String, required: true },
  excerpt:   { type: String, required: true },
  content:   { type: String, required: true },
  emoji:     { type: String, default: '🤖' },
  readTime:  { type: String, default: '5 min read' },
  status:    { type: String, enum: ['draft', 'published'], default: 'draft' },
  aiGenerated: { type: Boolean, default: false },
  publishedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

blogSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  if (this.status === 'published' && !this.publishedAt) {
    this.publishedAt = Date.now();
  }
  next();
});

module.exports = mongoose.model('Blog', blogSchema);
