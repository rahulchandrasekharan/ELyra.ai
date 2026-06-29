const router = require('express').Router();
const nodemailer = require('nodemailer');

// POST /api/contact
router.post('/', async (req, res) => {
  const { name, email, service, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email and message are required.' });
  }

  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT),
    secure: false,
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }
  });

  await transporter.sendMail({
    from: `"Elyra Website" <${process.env.MAIL_USER}>`,
    to: process.env.MAIL_TO,
    replyTo: email,
    subject: `📩 New Enquiry: ${service || 'General'} — ${name}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#04050a;color:#e0e0e0;padding:32px;border-radius:8px;border:1px solid rgba(0,200,150,.2)">
        <h2 style="color:#00e676;margin:0 0 4px">New Website Enquiry</h2>
        <p style="color:#00c896;margin:0 0 24px;font-size:12px">Elyra AI Solutions — Contact Form</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <tr><td style="padding:7px 0;color:#888;width:120px">Name</td><td><strong>${name}</strong></td></tr>
          <tr><td style="padding:7px 0;color:#888">Email</td><td><a href="mailto:${email}" style="color:#00c896">${email}</a></td></tr>
          <tr><td style="padding:7px 0;color:#888">Service</td><td>${service || 'Not specified'}</td></tr>
        </table>
        <div style="margin:20px 0;padding:16px;background:#0a1f14;border-radius:6px;border-left:3px solid #00c896">
          <p style="margin:0;font-size:13px;line-height:1.75;color:#ccc;white-space:pre-wrap">${message}</p>
        </div>
        <p style="font-size:11px;color:#444;margin-top:24px">Elyra AI Solutions — Automated Contact System</p>
      </div>`
  });

  console.log(`[Contact] Enquiry from ${name} <${email}>`);
  res.json({ message: 'Message sent successfully.' });
});

module.exports = router;
