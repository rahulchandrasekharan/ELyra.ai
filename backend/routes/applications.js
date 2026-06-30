const router = require('express').Router();
const Application = require('../models/Application');
const Job = require('../models/Job');
const upload = require('../middleware/upload');
const { protect } = require('../middleware/auth');
const { screenResume } = require('../agents/resumeAgent');
const nodemailer = require('nodemailer');

const STATUS_MESSAGES = {
  shortlisted: { subject: '🎉 Great News — You\'ve Been Shortlisted!', body: 'Congratulations! After reviewing your application, we are pleased to inform you that you have been shortlisted for the next stage of our hiring process. Our team will be in touch with further details shortly.' },
  rejected:    { subject: 'Update on Your Application — Elyra AI Solutions', body: 'Thank you for your interest in joining Elyra AI Solutions and for the time you invested in your application. After careful consideration, we have decided to move forward with other candidates whose experience more closely matches our current requirements. We wish you the very best in your career journey.' },
  reviewing:   { subject: '👀 Your Application is Under Review', body: 'We wanted to let you know that your application is currently being reviewed by our hiring team. We appreciate your patience and will get back to you with an update soon.' }
};

async function sendStatusEmail(app, status) {
  const tpl = STATUS_MESSAGES[status];
  if (!tpl) return;
  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST, port: Number(process.env.MAIL_PORT), secure: false,
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }
  });
  await transporter.sendMail({
    from: `"Elyra AI Solutions" <${process.env.MAIL_USER}>`,
    to: app.email,
    subject: tpl.subject,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#04050a;color:#e0e0e0;padding:32px;border-radius:8px;border:1px solid rgba(0,200,150,.2)">
      <h2 style="color:#00e676;margin:0 0 4px">Elyra AI Solutions</h2>
      <p style="color:#00c896;font-size:12px;margin:0 0 24px">Application Update — ${app.jobTitle}</p>
      <p style="font-size:13px;line-height:1.8;color:#ccc">Dear ${app.name},</p>
      <p style="font-size:13px;line-height:1.8;color:#ccc">${tpl.body}</p>
      <p style="font-size:13px;line-height:1.8;color:#ccc;margin-top:16px">Best regards,<br><strong style="color:#00c896">Elyra AI Solutions HR Team</strong></p>
      <p style="font-size:11px;color:#444;margin-top:28px">This is an automated message. Please do not reply to this email.</p>
    </div>`
  });
  console.log(`[Applications] Status email (${status}) sent to ${app.email}`);
}

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
    resumePath: `uploads/resumes/${req.file.filename}`
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
  sendStatusEmail(app, status).catch(err => console.error('[Applications] Email error:', err.message));
  res.json({ application: app });
});

// DELETE /api/applications/:id
router.delete('/:id', protect, async (req, res) => {
  const app = await Application.findByIdAndDelete(req.params.id);
  if (!app) return res.status(404).json({ error: 'Application not found' });
  res.json({ message: 'Application deleted' });
});

module.exports = router;
