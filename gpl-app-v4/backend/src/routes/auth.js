const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const db = require('../models/db');
const { authenticate } = require('../middleware/auth');
const audit = require('../utils/audit');

const router = express.Router();

const VALID_ROLES = ['superadmin','director_gpl','chefe_departamento'];

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
        const caller = require('jsonwebtoken').verify(authHeader.slice(7), process.env.JWT_SECRET);
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
    const token = jwt.sign(
      { id: user.id, role: user.role, university_id: user.university_id, campus_id: user.campus_id },
      process.env.JWT_SECRET, { expiresIn: '8h' }
    );
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
    const token = jwt.sign(
      { id: user.id, role: user.role, university_id: user.university_id, campus_id: user.campus_id },
      process.env.JWT_SECRET, { expiresIn: '8h' }
    );
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
