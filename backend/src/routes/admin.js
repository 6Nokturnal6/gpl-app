const express = require('express');
const db = require('../models/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, requireAdmin);

// GET /api/admin/submissions — list all with summary stats
router.get('/submissions', async (req, res, next) => {
  try {
    const { status, year = 2024 } = req.query;
    let query = `
      SELECT
        s.id, s.status, s.year, s.submitted_at, s.created_at, s.updated_at,
        u.email, u.institution,
        i.nome, i.sigla, i.provincia,
        (SELECT COUNT(*) FROM estudantes e WHERE e.submission_id = s.id) AS num_cursos,
        (SELECT COALESCE(SUM(homens + mulheres),0) FROM estudantes e WHERE e.submission_id = s.id) AS total_estudantes,
        (SELECT COALESCE(SUM(homens + mulheres),0) FROM previsao p WHERE p.submission_id = s.id) AS total_previsao,
        (SELECT COALESCE(oge+doacoes+creditos+proprias,0) FROM financas f WHERE f.submission_id = s.id) AS total_financiamento
      FROM submissions s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN id_ies i ON i.submission_id = s.id
      WHERE s.year = $1
    `;
    const params = [year];
    if (status) { query += ` AND s.status = $2`; params.push(status); }
    query += ` ORDER BY s.submitted_at DESC NULLS LAST, s.updated_at DESC`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) { next(err); }
});

// GET /api/admin/submissions/:id — full detail of one submission
router.get('/submissions/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const [sub, idies, estudantes, docentes, investigadores, financas, labs, salas, previsao] =
      await Promise.all([
        db.query('SELECT s.*,u.email,u.institution FROM submissions s JOIN users u ON u.id=s.user_id WHERE s.id=$1', [id]),
        db.query('SELECT * FROM id_ies WHERE submission_id=$1', [id]),
        db.query('SELECT * FROM estudantes WHERE submission_id=$1 ORDER BY sort_order', [id]),
        db.query('SELECT * FROM docentes WHERE submission_id=$1 ORDER BY regime,sort_order', [id]),
        db.query('SELECT * FROM investigadores WHERE submission_id=$1 ORDER BY regime,sort_order', [id]),
        db.query('SELECT * FROM financas WHERE submission_id=$1', [id]),
        db.query('SELECT * FROM infra_labs WHERE submission_id=$1 ORDER BY sort_order', [id]),
        db.query('SELECT * FROM infra_salas WHERE submission_id=$1 ORDER BY sort_order', [id]),
        db.query('SELECT * FROM previsao WHERE submission_id=$1 ORDER BY sort_order', [id]),
      ]);
    if (!sub.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({
      submission: sub.rows[0],
      idies: idies.rows[0] || null,
      estudantes: estudantes.rows,
      docentes: docentes.rows,
      investigadores: investigadores.rows,
      financas: financas.rows[0] || null,
      infra: { labs: labs.rows, salas: salas.rows },
      previsao: previsao.rows,
    });
  } catch (err) { next(err); }
});

// PATCH /api/admin/submissions/:id/status — approve or reject
router.patch('/submissions/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;
    if (!['approved','rejected','draft'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    await db.query(
      'UPDATE submissions SET status=$1, review_note=$2, reviewed_at=NOW(), reviewed_by=$3 WHERE id=$4',
      [status, note || null, req.user.id, id]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// GET /api/admin/stats — aggregate stats across all institutions
router.get('/stats', async (req, res, next) => {
  try {
    const { year = 2024 } = req.query;
    const [overview, byProvincia, byStatus, financials] = await Promise.all([
      db.query(`
        SELECT
          COUNT(DISTINCT s.id) AS total_submissions,
          COUNT(DISTINCT s.id) FILTER (WHERE s.status='submitted') AS submitted,
          COUNT(DISTINCT s.id) FILTER (WHERE s.status='approved') AS approved,
          COUNT(DISTINCT s.id) FILTER (WHERE s.status='draft') AS draft,
          COALESCE(SUM(e.homens + e.mulheres),0) AS total_estudantes,
          COALESCE(SUM(e.homens),0) AS total_homens,
          COALESCE(SUM(e.mulheres),0) AS total_mulheres
        FROM submissions s
        LEFT JOIN estudantes e ON e.submission_id = s.id
        WHERE s.year=$1
      `, [year]),

      db.query(`
        SELECT i.provincia,
          COUNT(DISTINCT s.id) AS instituicoes,
          COALESCE(SUM(e.homens + e.mulheres),0) AS estudantes
        FROM submissions s
        JOIN id_ies i ON i.submission_id = s.id
        LEFT JOIN estudantes e ON e.submission_id = s.id
        WHERE s.year=$1
        GROUP BY i.provincia ORDER BY estudantes DESC
      `, [year]),

      db.query(`
        SELECT status, COUNT(*) AS count FROM submissions WHERE year=$1 GROUP BY status
      `, [year]),

      db.query(`
        SELECT
          COALESCE(SUM(f.oge),0) AS total_oge,
          COALESCE(SUM(f.doacoes),0) AS total_doacoes,
          COALESCE(SUM(f.creditos),0) AS total_creditos,
          COALESCE(SUM(f.proprias),0) AS total_proprias
        FROM financas f
        JOIN submissions s ON s.id = f.submission_id
        WHERE s.year=$1
      `, [year]),
    ]);

    res.json({
      overview: overview.rows[0],
      byProvincia: byProvincia.rows,
      byStatus: byStatus.rows,
      financials: financials.rows[0],
    });
  } catch (err) { next(err); }
});

// GET /api/admin/users — list all institution accounts
router.get('/users', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.email, u.institution, u.role, u.created_at,
        s.status AS submission_status, s.submitted_at
       FROM users u
       LEFT JOIN submissions s ON s.user_id = u.id AND s.year = 2024
       ORDER BY u.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

module.exports = router;
