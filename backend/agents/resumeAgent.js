const Groq = require('groq-sdk');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const nodemailer = require('nodemailer');
const Application = require('../models/Application');

const GROQ_MODEL = 'llama-3.1-8b-instant';

async function extractText(filePath) {
  const ext = filePath.split('.').pop().toLowerCase();
  if (ext === 'pdf') {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text;
  }
  return `[File: ${filePath.split('/').pop()} — DOCX text extraction not supported yet]`;
}

async function screenResume(applicationId) {
  const app = await Application.findById(applicationId).populate('job');
  if (!app) throw new Error('Application not found');

  const resumeText = await extractText(app.resumePath);
  await Application.findByIdAndUpdate(applicationId, { resumeText });

  const job = app.job;
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const prompt = `You are an expert HR AI for Elyra AI Solutions.

JOB TITLE: ${job.title}
DEPARTMENT: ${job.department}
REQUIREMENTS:
${job.requirements.join('\n')}
SKILLS NEEDED: ${job.skills.join(', ')}

RESUME TEXT:
${resumeText.slice(0, 3000)}

CANDIDATE: ${app.name} (${app.email})

Analyse this resume against the job requirements.
Return ONLY valid JSON, no extra text:
{"score":75,"matched":true,"summary":"2-3 sentence evaluation of strengths and gaps"}

Score 0-100. matched is true if score >= 65.`;

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 400
  });

  const raw = completion.choices[0].message.content.trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  const analysis = JSON.parse(raw.slice(start, end + 1));

  await Application.findByIdAndUpdate(applicationId, {
    aiScore: analysis.score,
    aiSummary: analysis.summary,
    aiMatched: analysis.matched
  });

  console.log(`[ResumeAgent] ${app.name} — Score: ${analysis.score}/100 | Match: ${analysis.matched}`);

  if (analysis.matched) {
    await sendMatchNotification(app, job, analysis).catch(err =>
      console.error('[ResumeAgent] Email error:', err.message)
    );
  }

  return analysis;
}

async function sendMatchNotification(app, job, analysis) {
  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT),
    secure: false,
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }
  });

  await transporter.sendMail({
    from: `"Elyra HR System" <${process.env.MAIL_USER}>`,
    to: process.env.MAIL_TO,
    subject: `✅ Strong Match: ${app.name} for ${job.title}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#04050a;color:#e0e0e0;padding:32px;border-radius:8px;border:1px solid rgba(0,200,150,.2)">
        <h2 style="color:#00e676;margin:0 0 8px">New Resume Match — Elyra AI</h2>
        <p style="color:#00c896;margin:0 0 24px;font-size:13px">AI Match Score: <strong>${analysis.score}/100</strong></p>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <tr><td style="padding:6px 0;color:#888">Candidate</td><td><strong>${app.name}</strong></td></tr>
          <tr><td style="padding:6px 0;color:#888">Email</td><td>${app.email}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Phone</td><td>${app.phone || '—'}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Position</td><td>${job.title}</td></tr>
        </table>
        <div style="margin:20px 0;padding:16px;background:#0a1f14;border-radius:6px;border-left:3px solid #00c896">
          <p style="margin:0;font-size:13px;line-height:1.7;color:#ccc">${analysis.summary}</p>
        </div>
        <p style="font-size:11px;color:#444;margin-top:24px">Elyra AI Solutions — Automated HR System</p>
      </div>`
  });

  await Application.findByIdAndUpdate(app._id, { notified: true });
  console.log(`[ResumeAgent] Match email sent for ${app.name}`);
}

module.exports = { screenResume };
