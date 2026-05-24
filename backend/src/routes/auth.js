const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const db = require('../models/db');
const { authenticate } = require('../middleware/auth');
const audit = require('../utils/audit');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
const bcryptCompare = bcrypt.compare;
const bcryptHash = bcrypt.hash;
const redisClientUtil = require('../utils/redisClient');
const speakeasy = require('speakeasy');

const VALID_ROLES = ['superadmin','director_gpl','chefe_departamento'];

function jwtVerifyOptions() {
  const opts = {};
  if (process.env.JWT_ISSUER) opts.issuer = process.env.JWT_ISSUER;
  if (process.env.JWT_AUDIENCE) opts.audience = process.env.JWT_AUDIENCE;
  return opts;
}

function signAccessToken(payload) {
  const jti = uuidv4();
  const signOpts = { jwtid: jti, expiresIn: '8h', ...jwtVerifyOptions() };
  const token = jwt.sign(payload, process.env.JWT_SECRET, signOpts);
  return { token, jti };
}

const registerSchema = Joi.object({
  email:         Joi.string().email().required(),
  password:      Joi.string().min(8).required(),
  nome:          Joi.string().max(200).allow('','',null),
  institution:   Joi.string().min(2).max(200).required(),
  role:          Joi.string().valid(...VALID_ROLES).default('chefe_departamento'),
  university_id: Joi.string().uuid().allow(null,''),
  campus_id:     Joi.string().uuid().allow(null,''),
});

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    // Only superadmin can create director_gpl or superadmin accounts
    if (['superadmin','director_gpl'].includes(value.role)) {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(403).json({ error: 'Admin token required to create this role' });
      try {
        const caller = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET, jwtVerifyOptions());
        if (caller.role !== 'superadmin') return res.status(403).json({ error: 'Only superadmin can create this role' });
      } catch { return res.status(401).json({ error: 'Invalid token' }); }
    }

    const existing = await db.query('SELECT id FROM users WHERE email=$1', [value.email]);
    if (existing.rows.length) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(value.password, 12);
    const result = await db.query(
      `INSERT INTO users (email,password,nome,institution,role,university_id,campus_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id,email,nome,institution,role,university_id,campus_id`,
      [value.email, hash, value.nome||null, value.institution,
       value.role, value.university_id||null, value.campus_id||null]
    );

    const user = result.rows[0];
    const { token, jti } = signAccessToken({
      id: user.id, role: user.role, university_id: user.university_id, campus_id: user.campus_id,
    });
    // record issued jti for auditing
    try {
      await db.query("INSERT INTO issued_jtis (jti, user_id, issued_at, expires_at) VALUES ($1, $2, now(), now() + INTERVAL '8 hours') ON CONFLICT (jti) DO NOTHING", [jti, user.id]);
    } catch (e) { console.error('Failed to insert issued_jtis:', e); }

    // create refresh token (id:value) and store hashed
    try {
      const refreshId = uuidv4();
      const refreshValue = uuidv4();
      const refreshHash = await bcryptHash(refreshValue, 10);
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days
      await db.query('INSERT INTO refresh_tokens (token_id, token_hash, user_id, issued_at, expires_at) VALUES ($1,$2,$3,now(),$4)', [refreshId, refreshHash, user.id, expiresAt]);
      // set cookie
      res.cookie('gpl_refresh', `${refreshId}:${refreshValue}`, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', expires: expiresAt });
    } catch (e) { console.error('Failed to create refresh token', e); }

    res.status(201).json({ token, user });
  } catch (err) { next(err); }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const result = await db.query('SELECT * FROM users WHERE email=$1', [email]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (user.is_active === false) {
      return res.status(403).json({ error: 'Conta desactivada. Contacte o Director GPL.' });
    }
    // If user has MFA enabled, require a totp code in the login request
    if (user.mfa_enabled) {
      const totp = req.body?.totp;
      if (!totp) return res.status(401).json({ error: 'TOTP required' });
      const verified = speakeasy.totp.verify({ secret: user.mfa_secret, encoding: 'base32', token: totp, window: 1 });
      if (!verified) return res.status(401).json({ error: 'Invalid TOTP' });
    }

    const { token, jti } = signAccessToken({
      id: user.id, role: user.role, university_id: user.university_id, campus_id: user.campus_id,
    });
    // record issued jti for auditing
    try {
      await db.query("INSERT INTO issued_jtis (jti, user_id, issued_at, expires_at) VALUES ($1, $2, now(), now() + INTERVAL '8 hours') ON CONFLICT (jti) DO NOTHING", [jti, user.id]);
    } catch (e) { console.error('Failed to insert issued_jtis:', e); }

    // create refresh token and set cookie
    try {
      const refreshId = uuidv4();
      const refreshValue = uuidv4();
      const refreshHash = await bcryptHash(refreshValue, 10);
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
      await db.query('INSERT INTO refresh_tokens (token_id, token_hash, user_id, issued_at, expires_at) VALUES ($1,$2,$3,now(),$4)', [refreshId, refreshHash, user.id, expiresAt]);
      res.cookie('gpl_refresh', `${refreshId}:${refreshValue}`, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', expires: expiresAt });
    } catch (e) { console.error('Failed to create refresh token', e); }

    // Log login
    audit.log({ userId: user.id, userEmail: user.email, userRole: user.role,
      action: 'login', ip: audit.getIp(req) });
    res.json({ token, user: {
      id: user.id, email: user.email, nome: user.nome,
      institution: user.institution, role: user.role,
      university_id: user.university_id, campus_id: user.campus_id
    }});
  } catch (err) { next(err); }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const cookie = req.headers.cookie || '';
    const match = cookie.split(';').map(c=>c.trim()).find(c=>c.startsWith('gpl_refresh='));
    if (!match) return res.status(401).json({ error: 'No refresh token' });
    const val = decodeURIComponent(match.split('=')[1] || '');
    const [tokenId, tokenValue] = (val || '').split(':');
    if (!tokenId || !tokenValue) return res.status(401).json({ error: 'Invalid refresh token' });
    const r = await db.query('SELECT token_id, token_hash, user_id, expires_at, revoked FROM refresh_tokens WHERE token_id=$1', [tokenId]);
    if (!r.rows.length) return res.status(401).json({ error: 'Unknown refresh token' });
    const row = r.rows[0];
    if (row.revoked) return res.status(401).json({ error: 'Refresh token revoked' });
    if (row.expires_at && new Date(row.expires_at) < new Date()) return res.status(401).json({ error: 'Refresh token expired' });
    const ok = await bcryptCompare(tokenValue, row.token_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid refresh token' });

    // rotate: revoke current and issue a new one
    await db.query('UPDATE refresh_tokens SET revoked=true WHERE token_id=$1', [tokenId]);
    const newId = uuidv4(); const newVal = uuidv4(); const newHash = await bcryptHash(newVal, 10);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    await db.query('INSERT INTO refresh_tokens (token_id, token_hash, user_id, issued_at, expires_at) VALUES ($1,$2,$3,now(),$4)', [newId, newHash, row.user_id, expiresAt]);
    res.cookie('gpl_refresh', `${newId}:${newVal}`, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', expires: expiresAt });

    // issue new access token
    const userRes = await db.query('SELECT id,role,university_id,campus_id FROM users WHERE id=$1', [row.user_id]);
    if (!userRes.rows.length) return res.status(404).json({ error: 'User not found' });
    const u = userRes.rows[0];
    const { token, jti } = signAccessToken({
      id: u.id, role: u.role, university_id: u.university_id, campus_id: u.campus_id,
    });
    try { await db.query("INSERT INTO issued_jtis (jti, user_id, issued_at, expires_at) VALUES ($1,$2,now(),now()+INTERVAL '8 hours') ON CONFLICT DO NOTHING", [jti, u.id]); } catch(e){console.error('issued_jtis insert failed',e);}    
    res.json({ token });
  } catch (e) { console.error('refresh failed', e); res.status(500).json({ error: 'Refresh failed' }); }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    const cookie = req.headers.cookie || '';
    const match = cookie.split(';').map(c=>c.trim()).find(c=>c.startsWith('gpl_refresh='));
    if (match) {
      const val = decodeURIComponent(match.split('=')[1] || '');
      const [tokenId] = (val || '').split(':');
      if (tokenId) await db.query('UPDATE refresh_tokens SET revoked=true WHERE token_id=$1', [tokenId]);
    }
    // clear cookie
    res.cookie('gpl_refresh', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', expires: new Date(0) });
    res.json({ ok: true });
  } catch (e) { console.error('logout failed', e); res.status(500).json({ error: 'Logout failed' }); }
});

// POST /api/auth/mfa/setup
router.post('/mfa/setup', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const secret = speakeasy.generateSecret({ length: 20, name: `GPL App (${userId})` });
    // return secret.base32 and otpAuthUrl
    res.json({ secret: secret.base32, otpauth_url: secret.otpauth_url });
  } catch (e) { console.error('mfa setup failed', e); res.status(500).json({ error: 'MFA setup failed' }); }
});

// POST /api/auth/mfa/verify
router.post('/mfa/verify', authenticate, async (req, res) => {
  try {
    const { secret, token } = req.body || {};
    if (!secret || !token) return res.status(400).json({ error: 'Missing secret or token' });
    const ok = speakeasy.totp.verify({ secret, encoding: 'base32', token, window: 1 });
    if (!ok) return res.status(400).json({ error: 'Invalid TOTP' });
    await db.query('UPDATE users SET mfa_enabled=true, mfa_secret=$1 WHERE id=$2', [secret, req.user.id]);
    res.json({ ok: true });
  } catch (e) { console.error('mfa verify failed', e); res.status(500).json({ error: 'MFA verify failed' }); }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const r = await db.query(
      `SELECT u.id,u.email,u.nome,u.institution,u.role,u.university_id,u.campus_id,
              c.nome AS campus_nome, univ.nome AS university_nome
       FROM users u
       LEFT JOIN campuses c ON c.id=u.campus_id
       LEFT JOIN universities univ ON univ.id=u.university_id
       WHERE u.id=$1`, [req.user.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(r.rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
