const express = require('express');
const db = require('../models/db');
const { authenticate, requireAdmin, requireDirector } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/audit — superadmin: full trail
router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const { user_id, action, limit = 100, offset = 0 } = req.query;
    let q = `SELECT a.*, u.nome as actor_nome
             FROM audit_log a LEFT JOIN users u ON u.id=a.user_id
             WHERE 1=1`;
    const params = [];
    if (user_id) { params.push(user_id); q += ` AND a.user_id=$${params.length}`; }
    if (action)  { params.push(action);  q += ` AND a.action=$${params.length}`; }
    params.push(limit); q += ` ORDER BY a.created_at DESC LIMIT $${params.length}`;
    params.push(offset); q += ` OFFSET $${params.length}`;
    const r = await db.query(q, params);
    res.json(r.rows);
  } catch (err) { next(err); }
});

// GET /api/audit/summary — director: summary with user names
router.get('/summary', requireDirector, async (req, res, next) => {
  try {
    const univId = req.user.university_id;
    const r = await db.query(
      `SELECT a.user_email, u.nome as user_nome, a.user_role, a.action, a.section,
              a.entity_id, a.created_at
       FROM audit_log a
       LEFT JOIN users u ON u.id=a.user_id
       WHERE (u.university_id=$1 OR a.user_id IN (
         SELECT id FROM users WHERE university_id=$1
       ))
         AND a.action IN ('login','save_section','lock_section','unlock_section','request_unlock','submit')
       ORDER BY a.created_at DESC LIMIT 200`,
      [univId]);
    res.json(r.rows);
  } catch (err) { next(err); }
});

module.exports = router;
