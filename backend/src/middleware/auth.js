const jwt = require('jsonwebtoken');

const ROLES = {
  superadmin:         4,
  director_gpl:       3,
  chefe_departamento: 2,
  institution:        1, // legacy
  admin:              1, // legacy
};

async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }
  const token = header.slice(7);

  const verifyOptions = {};
  if (process.env.JWT_ISSUER) verifyOptions.issuer = process.env.JWT_ISSUER;
  if (process.env.JWT_AUDIENCE) verifyOptions.audience = process.env.JWT_AUDIENCE;

  try {
    // Verify token with optional issuer/audience checks
    req.user = jwt.verify(token, process.env.JWT_SECRET, verifyOptions);

    // Prefer jti-based revocation if token includes jti claim (future tokens)
    try {
      const db = require('../models/db');
      const redisClient = require('../utils/redisClient');
      if (req.user && req.user.jti) {
        // Check Redis cache first
        const cached = await redisClient.isJtiRevoked(req.user.jti);
        if (cached) return res.status(401).json({ error: 'Token revoked' });
        // Fallback to DB
        const r = await db.query('SELECT 1 FROM revoked_jtis WHERE jti=$1 LIMIT 1', [req.user.jti]);
        if (r.rows.length) {
          // Cache the revoked jti
          await redisClient.cacheRevokedJti(req.user.jti);
          return res.status(401).json({ error: 'Token revoked' });
        }
      } else {
        // Fallback to legacy full-token revocation table for existing tokens
        const r = await db.query('SELECT 1 FROM revoked_tokens WHERE token=$1 LIMIT 1', [token]);
        if (r.rows.length) return res.status(401).json({ error: 'Token revoked' });
      }
    } catch (revErr) {
      // If revocation lookup fails, log and deny access to be safe
      console.error('Token revocation check failed:', revErr);
      return res.status(500).json({ error: 'Auth backend error' });
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
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
