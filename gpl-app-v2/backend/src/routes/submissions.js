const express = require('express');
const Joi = require('joi');
const db = require('../models/db');
const { authenticate } = require('../middleware/auth');
const { sendSubmissionConfirmation, sendAdminNewSubmission } = require('../utils/email');

const router = express.Router();
router.use(authenticate);

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getOrCreateSubmission(userId, year = 2024) {
  const existing = await db.query(
    'SELECT * FROM submissions WHERE user_id=$1 AND year=$2',
    [userId, year]
  );
  if (existing.rows.length) return existing.rows[0];
  const created = await db.query(
    'INSERT INTO submissions (user_id,year) VALUES ($1,$2) RETURNING *',
    [userId, year]
  );
  return created.rows[0];
}

// ── GET /api/submissions/current ─────────────────────────────────────────────
// Returns the full submission object with all sections
router.get('/current', async (req, res, next) => {
  try {
    const sub = await getOrCreateSubmission(req.user.id);
    const [idies, estudantes, docentes, investigadores, financas, labs, salas, previsao] =
      await Promise.all([
        db.query('SELECT * FROM id_ies WHERE submission_id=$1', [sub.id]),
        db.query('SELECT * FROM estudantes WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM docentes WHERE submission_id=$1 ORDER BY regime,sort_order', [sub.id]),
        db.query('SELECT * FROM investigadores WHERE submission_id=$1 ORDER BY regime,sort_order', [sub.id]),
        db.query('SELECT * FROM financas WHERE submission_id=$1', [sub.id]),
        db.query('SELECT * FROM infra_labs WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM infra_salas WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM previsao WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
      ]);

    res.json({
      submission: sub,
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

// ── PUT /api/submissions/idies ────────────────────────────────────────────────
router.put('/idies', async (req, res, next) => {
  try {
    const sub = await getOrCreateSubmission(req.user.id);
    const d = req.body;
    await db.query(`
      INSERT INTO id_ies (submission_id,nome,sigla,nuit,ano_inicio,provincia,distrito,website,contacto,email,responsavel,funcao,email_resp)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      ON CONFLICT (submission_id) DO UPDATE SET
        nome=$2,sigla=$3,nuit=$4,ano_inicio=$5,provincia=$6,distrito=$7,
        website=$8,contacto=$9,email=$10,responsavel=$11,funcao=$12,email_resp=$13
    `, [sub.id, d.nome, d.sigla, d.nuit, d.ano_inicio, d.provincia, d.distrito,
        d.website, d.contacto, d.email, d.responsavel, d.funcao, d.email_resp]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── PUT /api/submissions/estudantes ──────────────────────────────────────────
router.put('/estudantes', async (req, res, next) => {
  try {
    const sub = await getOrCreateSubmission(req.user.id);
    const rows = req.body; // array of course rows
    const schema = Joi.array().items(Joi.object({
      curso: Joi.string().max(200),
      duracao: Joi.number().integer().min(1).max(10),
      area: Joi.string().max(200).allow(''),
      subarea: Joi.string().max(200).allow(''),
      regime: Joi.string().valid('Presencial','Distância','Misto'),
      provincia: Joi.string().max(100).allow(''),
      grau: Joi.string().max(100),
      homens: Joi.number().integer().min(0).default(0),
      mulheres: Joi.number().integer().min(0).default(0),
    }));
    const { error, value } = schema.validate(rows);
    if (error) return res.status(400).json({ error: error.details[0].message });

    await db.query('DELETE FROM estudantes WHERE submission_id=$1', [sub.id]);
    for (let i = 0; i < value.length; i++) {
      const r = value[i];
      await db.query(
        'INSERT INTO estudantes (submission_id,curso,duracao,area,subarea,regime,provincia,grau,homens,mulheres,sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
        [sub.id, r.curso, r.duracao, r.area, r.subarea, r.regime, r.provincia, r.grau, r.homens||0, r.mulheres||0, i]
      );
    }
    res.json({ ok: true, saved: value.length });
  } catch (err) { next(err); }
});

// ── PUT /api/submissions/docentes ─────────────────────────────────────────────
router.put('/docentes', async (req, res, next) => {
  try {
    const sub = await getOrCreateSubmission(req.user.id);
    const rows = req.body;
    await db.query('DELETE FROM docentes WHERE submission_id=$1', [sub.id]);
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      await db.query(
        'INSERT INTO docentes (submission_id,regime,provincia,distrito,nacionalidade,lic_h,lic_m,mest_h,mest_m,dout_h,dout_m,sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
        [sub.id, r.regime, r.provincia, r.distrito, r.nacionalidade,
         r.lic_h||0, r.lic_m||0, r.mest_h||0, r.mest_m||0, r.dout_h||0, r.dout_m||0, i]
      );
    }
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── PUT /api/submissions/investigadores ──────────────────────────────────────
router.put('/investigadores', async (req, res, next) => {
  try {
    const sub = await getOrCreateSubmission(req.user.id);
    const rows = req.body;
    await db.query('DELETE FROM investigadores WHERE submission_id=$1', [sub.id]);
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      await db.query(
        'INSERT INTO investigadores (submission_id,regime,nacionalidade,lic_h,lic_m,mest_h,mest_m,dout_h,dout_m,sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
        [sub.id, r.regime, r.nacionalidade,
         r.lic_h||0, r.lic_m||0, r.mest_h||0, r.mest_m||0, r.dout_h||0, r.dout_m||0, i]
      );
    }
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── PUT /api/submissions/financas ─────────────────────────────────────────────
router.put('/financas', async (req, res, next) => {
  try {
    const sub = await getOrCreateSubmission(req.user.id);
    const d = req.body;
    await db.query(`
      INSERT INTO financas (submission_id,oge,doacoes,creditos,proprias,func_ensino,func_investig,func_admin,sal_docentes,sal_tecnicos,desp_invest)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (submission_id) DO UPDATE SET
        oge=$2,doacoes=$3,creditos=$4,proprias=$5,
        func_ensino=$6,func_investig=$7,func_admin=$8,
        sal_docentes=$9,sal_tecnicos=$10,desp_invest=$11
    `, [sub.id, d.oge||0, d.doacoes||0, d.creditos||0, d.proprias||0,
        d.func_ensino||0, d.func_investig||0, d.func_admin||0,
        d.sal_docentes||0, d.sal_tecnicos||0, d.desp_invest||0]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── PUT /api/submissions/infra ────────────────────────────────────────────────
router.put('/infra', async (req, res, next) => {
  try {
    const sub = await getOrCreateSubmission(req.user.id);
    const { labs, salas } = req.body;
    await db.query('DELETE FROM infra_labs WHERE submission_id=$1', [sub.id]);
    await db.query('DELETE FROM infra_salas WHERE submission_id=$1', [sub.id]);
    for (let i = 0; i < (labs||[]).length; i++) {
      const r = labs[i];
      await db.query(
        'INSERT INTO infra_labs (submission_id,nome,area,subarea,provincia,distrito,num_labs,sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [sub.id, r.nome, r.area, r.subarea, r.provincia, r.distrito, r.num_labs||0, i]
      );
    }
    for (let i = 0; i < (salas||[]).length; i++) {
      const r = salas[i];
      await db.query(
        'INSERT INTO infra_salas (submission_id,unidade,provincia,distrito,grau,num_salas,sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [sub.id, r.unidade, r.provincia, r.distrito, r.grau, r.num_salas||0, i]
      );
    }
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── PUT /api/submissions/previsao ─────────────────────────────────────────────
router.put('/previsao', async (req, res, next) => {
  try {
    const sub = await getOrCreateSubmission(req.user.id);
    const rows = req.body;
    await db.query('DELETE FROM previsao WHERE submission_id=$1', [sub.id]);
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      await db.query(
        'INSERT INTO previsao (submission_id,curso,duracao,area,grau,provincia,homens,mulheres,sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [sub.id, r.curso, r.duracao, r.area, r.grau, r.provincia, r.homens||0, r.mulheres||0, i]
      );
    }
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── POST /api/submissions/submit ──────────────────────────────────────────────
router.post('/submit', async (req, res, next) => {
  try {
    const sub = await getOrCreateSubmission(req.user.id);
    if (sub.status === 'submitted') {
      return res.status(400).json({ error: 'Already submitted' });
    }
    await db.query(
      "UPDATE submissions SET status='submitted', submitted_at=NOW() WHERE id=$1",
      [sub.id]
    );

    // Fetch extra info for email
    const [userRes, idiesRes, estRes] = await Promise.all([
      db.query('SELECT email FROM users WHERE id=$1', [req.user.id]),
      db.query('SELECT nome,sigla,provincia FROM id_ies WHERE submission_id=$1', [sub.id]),
      db.query('SELECT COALESCE(SUM(homens+mulheres),0) AS total FROM estudantes WHERE submission_id=$1', [sub.id]),
    ]);
    const userEmail = userRes.rows[0]?.email;
    const idies = idiesRes.rows[0] || {};
    const totalEstudantes = estRes.rows[0]?.total || 0;

    // Send emails (non-blocking — don't fail the request if email fails)
    Promise.all([
      sendSubmissionConfirmation({
        to: userEmail,
        institution: idies.nome || req.user.institution,
        sigla: idies.sigla,
        submittedAt: new Date(),
      }),
      sendAdminNewSubmission({
        institution: idies.nome || req.user.institution,
        sigla: idies.sigla,
        email: userEmail,
        provincia: idies.provincia,
        totalEstudantes,
      }),
    ]).catch(err => console.error('Email error (non-fatal):', err.message));

    res.json({ ok: true, message: 'Submission received' });
  } catch (err) { next(err); }
});

module.exports = router;
