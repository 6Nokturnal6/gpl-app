const jwt = require('jsonwebtoken');

const ROLES = {
  superadmin:         4,
  director_gpl:       3,
  chefe_departamento: 2,
  institution:        1, // legacy
  admin:              1, // legacy
};

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }
  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: `Required role: ${roles.join(' or ')}` });
    }
    next();
  };
}

const requireAdmin    = requireRole('superadmin');
const requireDirector = requireRole('superadmin', 'director_gpl');
const requireChefe    = requireRole('superadmin', 'director_gpl', 'chefe_departamento');

module.exports = { authenticate, requireRole, requireAdmin, requireDirector, requireChefe };
