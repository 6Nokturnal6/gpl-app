const express = require('express');
const db = require('../models/db');
const { authenticate, requireDirector, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/campuses — list campuses for the caller's university
router.get('/', async (req, res, next) => {
  try {
    const univId = req.user.role === 'superadmin'
      ? req.query.university_id
      : req.user.university_id;
    if (!univId) return res.json([]);
    const r = await db.query(
      `SELECT c.*, 
        u.email AS chefe_email, u.nome AS chefe_nome, u.id AS chefe_id,
        s.status AS submission_status, s.id AS submission_id
       FROM campuses c
       LEFT JOIN users u ON u.campus_id = c.id AND u.role='chefe_departamento'
       LEFT JOIN submissions s ON s.campus_id = c.id AND s.year=2024
       WHERE c.university_id=$1 ORDER BY c.nome`, [univId]);
    res.json(r.rows);
  } catch (err) { next(err); }
});

// POST /api/campuses — create campus (director_gpl or superadmin)
router.post('/', requireDirector, async (req, res, next) => {
  try {
    const { nome, provincia, distrito } = req.body;
    if (!nome) return res.status(400).json({ error: 'Campus name required' });
    const university_id = req.user.role === 'superadmin'
      ? req.body.university_id
      : req.user.university_id;
    if (!university_id) return res.status(400).json({ error: 'university_id required' });
    const r = await db.query(
      'INSERT INTO campuses (university_id,nome,provincia,distrito) VALUES ($1,$2,$3,$4) RETURNING *',
      [university_id, nome, provincia||null, distrito||null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { next(err); }
});

// PUT /api/campuses/:id — update campus
router.put('/:id', requireDirector, async (req, res, next) => {
  try {
    const { nome, provincia, distrito } = req.body;
    await db.query(
      'UPDATE campuses SET nome=$1,provincia=$2,distrito=$3 WHERE id=$4',
      [nome, provincia||null, distrito||null, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /api/campuses/:id
router.delete('/:id', requireDirector, async (req, res, next) => {
  try {
    await db.query('DELETE FROM campuses WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /api/campuses/:id/assign — assign a chefe to a campus
router.post('/:id/assign', requireDirector, async (req, res, next) => {
  try {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    // Set campus_id on the user
    await db.query(
      'UPDATE users SET campus_id=$1, university_id=$2 WHERE id=$3',
      [req.params.id,
       req.user.role === 'superadmin' ? req.body.university_id : req.user.university_id,
       user_id]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// GET /api/campuses/unassigned-chefes — chefes with no campus yet
router.get('/unassigned', requireDirector, async (req, res, next) => {
  try {
    const univId = req.user.university_id;
    const r = await db.query(
      `SELECT id,email,nome FROM users
       WHERE role='chefe_departamento'
       AND (university_id=$1 OR university_id IS NULL)
       AND campus_id IS NULL`, [univId]);
    res.json(r.rows);
  } catch (err) { next(err); }
});

module.exports = router;
