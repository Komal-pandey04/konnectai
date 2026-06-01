const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'konnectapi-dev-secret-CHANGE-IN-PROD';

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ error: 'Authentication required' });

  try {
    req.user = jwt.verify(header.split(' ')[1], JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function adminMiddleware(req, res, next) {
  authMiddleware(req, res, () => {
    if (req.user.role !== 'admin')
      return res.status(403).json({ error: 'Admin access required' });
    next();
  });
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

module.exports = { authMiddleware, adminMiddleware, signToken };
