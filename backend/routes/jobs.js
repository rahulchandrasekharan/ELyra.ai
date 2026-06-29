const router = require('express').Router();
const Job = require('../models/Job');
const { protect } = require('../middleware/auth');

// ── Public ──

// GET /api/jobs
router.get('/', async (req, res) => {
  const { department, type } = req.query;
  const filter = { status: 'open' };
  if (department) filter.department = department;
  if (type) filter.type = type;
  const jobs = await Job.find(filter).sort({ createdAt: -1 });
  res.json({ jobs });
});

// GET /api/jobs/:id
router.get('/:id', async (req, res) => {
  const job = await Job.findOne({ _id: req.params.id, status: 'open' });
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json({ job });
});

// ── Admin ──

// GET /api/jobs/admin/all
router.get('/admin/all', protect, async (req, res) => {
  const jobs = await Job.find().sort({ createdAt: -1 });
  res.json({ jobs });
});

// POST /api/jobs
router.post('/', protect, async (req, res) => {
  const job = await Job.create(req.body);
  res.status(201).json({ job });
});

// PUT /api/jobs/:id
router.put('/:id', protect, async (req, res) => {
  const job = await Job.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json({ job });
});

// DELETE /api/jobs/:id
router.delete('/:id', protect, async (req, res) => {
  await Job.findByIdAndDelete(req.params.id);
  res.json({ message: 'Job deleted' });
});

module.exports = router;
