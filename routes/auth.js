const express = require('express');
const bcrypt = require('bcryptjs');
const { dbGet, dbRun } = require('../database');
const { signToken, authMiddleware } = require('../middleware/auth');
const router = express.Router();

// Sanitize input
const sanitize = (s) => String(s || '').trim().slice(0, 200);

router.post('/signup', async (req, res) => {
  const name = sanitize(req.body.name);
  const email = sanitize(req.body.email).toLowerCase();
  const password = sanitize(req.body.password);

  if (!name || !email || !password)
    return res.status(400).json({ error: 'All fields are required' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: 'Invalid email format' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });

  try {
    if (dbGet('SELECT id FROM users WHERE email = ?', [email]))
      return res.status(409).json({ error: 'Email already registered' });
    const hash = await bcrypt.hash(password, 12);
    const result = dbRun(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hash, 'user']
    );
    const token = signToken({ id: result.id, name, email, role: 'user' });
    res.status(201).json({ token, user: { id: result.id, name, email, role: 'user' } });
  } catch (e) {
    console.error('Signup error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const email = sanitize(req.body.email).toLowerCase();
  const password = sanitize(req.body.password);

  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required' });

  try {
    const user = dbGet('SELECT * FROM users WHERE email = ?', [email]);
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ error: 'Invalid email or password' });

    const token = signToken({ id: user.id, name: user.name, email: user.email, role: user.role });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/me', authMiddleware, (req, res) => res.json({ user: req.user }));

module.exports = router;
