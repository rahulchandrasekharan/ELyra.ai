require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const { startBlogScheduler } = require('./agents/blogAgent');

const app = express();
app.set('trust proxy', 1);

// ── Connect DB ──
connectDB();

// ── Middleware ──
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..')));

// Serve uploaded resumes
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: 'Too many requests' });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: 'Too many login attempts' });
app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

// ── Routes ──
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/blogs',        require('./routes/blogs'));
app.use('/api/jobs',         require('./routes/jobs'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/admin',        require('./routes/admin'));
app.use('/api/contact',      require('./routes/contact'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// Root → intro page
app.get('/', (req, res) => res.redirect('/intro.html'));

// ── Global error handler ──
app.use((err, req, res, next) => {
  console.error(err);
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ error: errors.join(', ') });
  }
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

// ── Start ──
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Elyra API running on port ${PORT}`);
  startBlogScheduler();
});

// ── Seed admin (recreates if email changed) ──
async function seedAdmin() {
  const User = require('./models/User');
  const exists = await User.findOne({ email: process.env.ADMIN_EMAIL });
  if (!exists) {
    await User.deleteMany({});
    await User.create({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
    console.log(`Admin seeded: ${process.env.ADMIN_EMAIL}`);
  }
}
seedAdmin().catch(console.error);
