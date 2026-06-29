const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = signToken(user._id);
  res.json({ token, user: { id: user._id, email: user.email, role: user.role } });
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => {
  res.json({ user: { id: req.user._id, email: req.user.email, role: req.user.role } });
});

module.exports = router;
