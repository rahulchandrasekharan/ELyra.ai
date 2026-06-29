const router = require('express').Router();
const Application = require('../models/Application');
const Job = require('../models/Job');
const upload = require('../middleware/upload');
const { protect } = require('../middleware/auth');
const { screenResume } = require('../agents/resumeAgent');

// ── Public ──

// POST /api/applications — submit application
router.post('/', upload.single('resume'), async (req, res) => {
  const { jobId, name, email, phone, coverLetter } = req.body;
  if (!req.file) return res.status(400).json({ error: 'Resume file is required' });

  const job = await Job.findById(jobId);
  if (!job || job.status !== 'open') return res.status(404).json({ error: 'Job not found or closed' });

  const existing = await Application.findOne({ job: jobId, email });
  if (existing) return res.status(409).json({ error: 'You have already applied for this position' });

  const app = await Application.create({
    job: jobId,
    jobTitle: job.title,
    name, email, phone, coverLetter,
    resumePath: req.file.path
  });

  // Screen resume in background (don't await — return response immediately)
  screenResume(app._id).catch(err => console.error('[ResumeAgent] Screening error:', err.message));

  res.status(201).json({
    message: 'Application submitted successfully. We will review your resume.',
    applicationId: app._id
  });
});

// GET /api/applications/status/:id — check own application status
router.get('/status/:id', async (req, res) => {
  const app = await Application.findById(req.params.id).select('name jobTitle status createdAt');
  if (!app) return res.status(404).json({ error: 'Application not found' });
  res.json({ application: app });
});

// ── Admin ──

// GET /api/applications — all applications
router.get('/', protect, async (req, res) => {
  const { job, status, matched } = req.query;
  const filter = {};
  if (job) filter.job = job;
  if (status) filter.status = status;
  if (matched !== undefined) filter.aiMatched = matched === 'true';
  const apps = await Application.find(filter)
    .populate('job', 'title department')
    .sort({ createdAt: -1 })
    .select('-resumeText');
  res.json({ applications: apps });
});

// GET /api/applications/:id
router.get('/:id', protect, async (req, res) => {
  const app = await Application.findById(req.params.id).populate('job');
  if (!app) return res.status(404).json({ error: 'Application not found' });
  res.json({ application: app });
});

// PUT /api/applications/:id/status
router.put('/:id/status', protect, async (req, res) => {
  const { status } = req.body;
  const app = await Application.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!app) return res.status(404).json({ error: 'Application not found' });
  res.json({ application: app });
});

module.exports = router;
