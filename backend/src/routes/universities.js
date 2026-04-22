const express = require('express');
const db = require('../models/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/universities
router.get('/', async (req, res, next) => {
  try {
    const r = await db.query('SELECT * FROM universities ORDER BY nome');
    res.json(r.rows);
  } catch (err) { next(err); }
});

// POST /api/universities (superadmin only)
router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const { nome, sigla, nuit } = req.body;
    if (!nome) return res.status(400).json({ error: 'Nome required' });
    const r = await db.query(
      'INSERT INTO universities (nome,sigla,nuit) VALUES ($1,$2,$3) RETURNING *',
      [nome, sigla||null, nuit||null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { next(err); }
});

// GET /api/universities/:id/summary — aggregated data from all campuses
router.get('/:id/summary', async (req, res, next) => {
  try {
    const uid = req.params.id;
    // Only superadmin or the university's director can see this
    if (req.user.role !== 'superadmin' && req.user.university_id !== uid) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const [campuses, students, staff, researchers, finances, labs, salas] = await Promise.all([
      db.query(`SELECT c.nome, c.provincia, s.status, s.id as submission_id
                FROM campuses c LEFT JOIN submissions s ON s.campus_id=c.id AND s.year=2024
                WHERE c.university_id=$1`, [uid]),
      db.query(`SELECT e.grau, SUM(e.homens) AS h, SUM(e.mulheres) AS m
                FROM estudantes e
                JOIN submissions s ON s.id=e.submission_id
                WHERE s.university_id=$1 AND s.year=2024
                GROUP BY e.grau ORDER BY e.grau`, [uid]),
      db.query(`SELECT SUM(d.lic_h+d.lic_m+d.mest_h+d.mest_m+d.dout_h+d.dout_m) AS total,
                       SUM(d.lic_h+d.mest_h+d.dout_h) AS homens,
                       SUM(d.lic_m+d.mest_m+d.dout_m) AS mulheres
                FROM docentes d JOIN submissions s ON s.id=d.submission_id
                WHERE s.university_id=$1 AND s.year=2024`, [uid]),
      db.query(`SELECT SUM(i.lic_h+i.lic_m+i.mest_h+i.mest_m+i.dout_h+i.dout_m) AS total
                FROM investigadores i JOIN submissions s ON s.id=i.submission_id
                WHERE s.university_id=$1 AND s.year=2024`, [uid]),
      db.query(`SELECT SUM(f.oge) AS oge, SUM(f.doacoes) AS doacoes,
                       SUM(f.creditos) AS creditos, SUM(f.proprias) AS proprias,
                       SUM(f.func_ensino) AS func_ensino, SUM(f.func_investig) AS func_investig,
                       SUM(f.func_admin) AS func_admin, SUM(f.sal_docentes) AS sal_docentes,
                       SUM(f.sal_tecnicos) AS sal_tecnicos
                FROM financas f JOIN submissions s ON s.id=f.submission_id
                WHERE s.university_id=$1 AND s.year=2024`, [uid]),
      db.query(`SELECT SUM(il.num_labs) AS total_labs FROM infra_labs il
                JOIN submissions s ON s.id=il.submission_id
                WHERE s.university_id=$1 AND s.year=2024`, [uid]),
      db.query(`SELECT SUM(is2.num_salas) AS total_salas FROM infra_salas is2
                JOIN submissions s ON s.id=is2.submission_id
                WHERE s.university_id=$1 AND s.year=2024`, [uid]),
    ]);
    res.json({
      campuses: campuses.rows,
      students: students.rows,
      staff: staff.rows[0],
      researchers: researchers.rows[0],
      finances: finances.rows[0],
      infrastructure: { labs: labs.rows[0], salas: salas.rows[0] },
    });
  } catch (err) { next(err); }
});

module.exports = router;
