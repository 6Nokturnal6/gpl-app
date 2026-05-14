const express = require('express');
const db = require('../models/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, requireAdmin);

// POST /api/admin/revoke-token
// Body: { jti } OR { token }
router.post('/revoke-token', async (req, res) => {
  if (!req.user || req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
  const { jti, token, reason } = req.body || {};
  try {
    let resolvedJti = jti;
    if (!resolvedJti && token) {
      try { const decoded = require('jsonwebtoken').decode(token); resolvedJti = decoded?.jti; } catch(e){}
    }
    if (resolvedJti) {
      await db.query('INSERT INTO revoked_jtis (jti, revoked_at, reason) VALUES ($1, now(), $2) ON CONFLICT (jti) DO UPDATE SET revoked_at=EXCLUDED.revoked_at, reason=EXCLUDED.reason', [resolvedJti, reason||null]);
      try { const redisClient = require('../utils/redisClient'); await redisClient.cacheRevokedJti(resolvedJti); } catch(e){console.error('Redis cache set failed', e);}      
      return res.json({ ok: true, revoked: 'jti', jti: resolvedJti });
    }
    if (token) {
      await db.query('INSERT INTO revoked_tokens (token, revoked_at, reason) VALUES ($1, now(), $2) ON CONFLICT (token) DO UPDATE SET revoked_at=EXCLUDED.revoked_at, reason=EXCLUDED.reason', [token, reason||null]);
      return res.json({ ok: true, revoked: 'token' });
    }
    return res.status(400).json({ error: 'No jti or token provided' });
  } catch (err) { console.error('Failed to revoke token:', err); return res.status(500).json({ error: 'Failed to revoke token' }); }
});

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

// New endpoints: issued-jtis and revoked-jtis
// GET /api/admin/issued-jtis?q=...&limit=100
router.get('/issued-jtis', async (req, res) => {
  const q = (req.query.q || '').trim();
  const limit = Math.min(parseInt(req.query.limit || '200', 10), 1000);
  try {
    if (q) {
      const r = await db.query("SELECT jti,user_id,issued_at,expires_at FROM issued_jtis WHERE jti ILIKE $1 OR user_id::text ILIKE $1 ORDER BY issued_at DESC LIMIT $2", [`%${q}%`, limit]);
      return res.json(r.rows);
    }
    const r = await db.query('SELECT jti,user_id,issued_at,expires_at FROM issued_jtis ORDER BY issued_at DESC LIMIT $1', [limit]);
    res.json(r.rows);
  } catch (err) {
    console.error('Failed to list issued_jtis:', err);
    res.status(500).json({ error: 'Failed to list' });
  }
});

// GET /api/admin/revoked-jtis?q=...&limit=100
router.get('/revoked-jtis', async (req, res) => {
  const q = (req.query.q || '').trim();
  const limit = Math.min(parseInt(req.query.limit || '200', 10), 1000);
  try {
    if (q) {
      const r = await db.query("SELECT jti,revoked_at,reason FROM revoked_jtis WHERE jti ILIKE $1 OR reason ILIKE $1 ORDER BY revoked_at DESC LIMIT $2", [`%${q}%`, limit]);
      return res.json(r.rows);
    }
    const r = await db.query('SELECT jti,revoked_at,reason FROM revoked_jtis ORDER BY revoked_at DESC LIMIT $1', [limit]);
    res.json(r.rows);
  } catch (err) {
    console.error('Failed to list revoked_jtis:', err);
    res.status(500).json({ error: 'Failed to list' });
  }
});

// DELETE /api/admin/revoked-jtis/:jti — allow superadmin to remove revoked marker (test/ops)
router.delete('/revoked-jtis/:jti', async (req, res) => {
  try {
    const { jti } = req.params;
    await db.query('DELETE FROM revoked_jtis WHERE jti=$1', [jti]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to delete revoked_jti:', err);
    res.status(500).json({ error: 'Failed to delete' });
  }
});

// DELETE /api/admin/issued-jtis/:jti — remove recorded issued jti (test/ops)
router.delete('/issued-jtis/:jti', async (req, res) => {
  try {
    const { jti } = req.params;
    await db.query('DELETE FROM issued_jtis WHERE jti=$1', [jti]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to delete issued_jti:', err);
    res.status(500).json({ error: 'Failed to delete' });
  }
});

module.exports = router;
