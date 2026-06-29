const router = require('express').Router();
const Blog = require('../models/Blog');
const { protect } = require('../middleware/auth');
const { generateBlog } = require('../agents/blogAgent');

// ── Public ──

// GET /api/blogs
router.get('/', async (req, res) => {
  const { category, limit = 10, page = 1 } = req.query;
  const filter = { status: 'published' };
  if (category) filter.category = category;
  const blogs = await Blog.find(filter)
    .sort({ publishedAt: -1 })
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit))
    .select('-content');
  const total = await Blog.countDocuments(filter);
  res.json({ blogs, total, page: Number(page) });
});

// GET /api/blogs/:slug
router.get('/:slug', async (req, res) => {
  const blog = await Blog.findOne({ slug: req.params.slug, status: 'published' });
  if (!blog) return res.status(404).json({ error: 'Blog not found' });
  res.json({ blog });
});

// ── Admin ──

// GET /api/blogs/admin/all
router.get('/admin/all', protect, async (req, res) => {
  const blogs = await Blog.find().sort({ createdAt: -1 });
  res.json({ blogs });
});

// POST /api/blogs — create manually
router.post('/', protect, async (req, res) => {
  const { title, slug, category, emoji, excerpt, content, readTime, status } = req.body;
  const blog = await Blog.create({ title, slug, category, emoji, excerpt, content, readTime, status });
  res.status(201).json({ blog });
});

// POST /api/blogs/generate — trigger AI generation
router.post('/generate', protect, async (req, res) => {
  try {
    const blog = await generateBlog();
    res.status(201).json({ blog, message: 'Blog generated and published' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/blogs/:id
router.put('/:id', protect, async (req, res) => {
  const blog = await Blog.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!blog) return res.status(404).json({ error: 'Blog not found' });
  res.json({ blog });
});

// DELETE /api/blogs/:id
router.delete('/:id', protect, async (req, res) => {
  await Blog.findByIdAndDelete(req.params.id);
  res.json({ message: 'Blog deleted' });
});

module.exports = router;
