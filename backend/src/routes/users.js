const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../models/db');
const { authenticate, requireAdmin, requireDirector } = require('../middleware/auth');
const audit = require('../utils/audit');

const router = express.Router();
router.use(authenticate);

// GET /api/users — superadmin: all users; director: their university's chefes
router.get('/', async (req, res, next) => {
  try {
    let q, params = [];
    if (req.user.role === 'superadmin') {
      q = `SELECT u.id,u.email,u.nome,u.institution,u.role,u.is_active,u.created_at,u.deactivated_at,
                  c.nome AS campus_nome, univ.nome AS university_nome
           FROM users u
           LEFT JOIN campuses c ON c.id=u.campus_id
           LEFT JOIN universities univ ON univ.id=u.university_id
           ORDER BY u.created_at DESC`;
    } else if (req.user.role === 'director_gpl') {
      params = [req.user.university_id];
      q = `SELECT u.id,u.email,u.nome,u.institution,u.role,u.is_active,u.created_at,u.deactivated_at,
                  c.nome AS campus_nome,
                  s.status AS submission_status, s.updated_at AS last_activity
           FROM users u
           LEFT JOIN campuses c ON c.id=u.campus_id
           LEFT JOIN submissions s ON s.user_id=u.id AND s.year=EXTRACT(YEAR FROM NOW())
           WHERE u.university_id=$1 AND u.role='chefe_departamento'
           ORDER BY u.is_active DESC, u.created_at DESC`;
    } else {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const r = await db.query(q, params);
    res.json(r.rows);
  } catch (err) { next(err); }
});

// GET /api/users/stats — superadmin system stats
router.get('/stats', requireAdmin, async (req, res, next) => {
  try {
    const [users, subs, universities, campuses, recentActivity] = await Promise.all([
      db.query(`SELECT role, is_active, COUNT(*) as count FROM users GROUP BY role,is_active ORDER BY role`),
      db.query(`SELECT status, COUNT(*) as count FROM submissions WHERE year=EXTRACT(YEAR FROM NOW()) GROUP BY status`),
      db.query(`SELECT COUNT(*) as count FROM universities`),
      db.query(`SELECT COUNT(*) as count FROM campuses`),
      db.query(`SELECT action, COUNT(*) as count FROM audit_log WHERE created_at > NOW()-INTERVAL '7 days' GROUP BY action ORDER BY count DESC`),
    ]);
    res.json({
      users: users.rows,
      submissions: subs.rows,
      universities: universities.rows[0]?.count || 0,
      campuses: campuses.rows[0]?.count || 0,
      recentActivity: recentActivity.rows,
    });
  } catch (err) { next(err); }
});

// PATCH /api/users/:id/deactivate
router.patch('/:id/deactivate', requireDirector, async (req, res, next) => {
  try {
    const target = await db.query('SELECT * FROM users WHERE id=$1', [req.params.id]);
    if (!target.rows.length) return res.status(404).json({ error: 'User not found' });
    const t = target.rows[0];
    // Director can only deactivate chefes in their university
    if (req.user.role === 'director_gpl' && t.university_id !== req.user.university_id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await db.query(
      'UPDATE users SET is_active=FALSE, deactivated_at=NOW(), deactivated_by=$1 WHERE id=$2',
      [req.user.id, req.params.id]);
    audit.log({ userId:req.user.id, userEmail:req.user.email, userRole:req.user.role,
      action:'deactivate_user', entityType:'user', entityId:req.params.id,
      detail:{ target_email:t.email }, ip:audit.getIp(req) });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// PATCH /api/users/:id/reactivate
router.patch('/:id/reactivate', requireDirector, async (req, res, next) => {
  try {
    const target = await db.query('SELECT * FROM users WHERE id=$1', [req.params.id]);
    if (!target.rows.length) return res.status(404).json({ error: 'User not found' });
    const t = target.rows[0];
    if (req.user.role === 'director_gpl' && t.university_id !== req.user.university_id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await db.query(
      'UPDATE users SET is_active=TRUE, deactivated_at=NULL, deactivated_by=NULL WHERE id=$1',
      [req.params.id]);
    audit.log({ userId:req.user.id, userEmail:req.user.email, userRole:req.user.role,
      action:'reactivate_user', entityType:'user', entityId:req.params.id,
      detail:{ target_email:t.email }, ip:audit.getIp(req) });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// PATCH /api/users/:id/role — superadmin only
router.patch('/:id/role', requireAdmin, async (req, res, next) => {
  try {
    const { role } = req.body;
    const valid = ['superadmin','director_gpl','chefe_departamento'];
    if (!valid.includes(role)) return res.status(400).json({ error: 'Invalid role' });
    const before = await db.query('SELECT role,email FROM users WHERE id=$1', [req.params.id]);
    await db.query('UPDATE users SET role=$1 WHERE id=$2', [role, req.params.id]);
    audit.log({ userId:req.user.id, userEmail:req.user.email, userRole:req.user.role,
      action:'change_role', entityType:'user', entityId:req.params.id,
      detail:{ from: before.rows[0]?.role, to: role, target_email: before.rows[0]?.email },
      ip:audit.getIp(req) });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// PATCH /api/users/:id/reset-password — superadmin only
router.patch('/:id/reset-password', requireAdmin, async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 8) return res.status(400).json({ error: 'Min 8 chars' });
    const hash = await bcrypt.hash(password, 12);
    await db.query('UPDATE users SET password=$1 WHERE id=$2', [hash, req.params.id]);
    audit.log({ userId:req.user.id, userEmail:req.user.email, userRole:req.user.role,
      action:'reset_password', entityType:'user', entityId:req.params.id, ip:audit.getIp(req) });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /api/users/:id — superadmin only (hard delete)
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
    const before = await db.query('SELECT email,role FROM users WHERE id=$1', [req.params.id]);
    await db.query('DELETE FROM users WHERE id=$1', [req.params.id]);
    audit.log({ userId:req.user.id, userEmail:req.user.email, userRole:req.user.role,
      action:'delete_user', entityType:'user', entityId:req.params.id,
      detail: before.rows[0], ip:audit.getIp(req) });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
