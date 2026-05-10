const express = require('express');
const db = require('../models/db');
const { authenticate, requireChefe, requireDirector } = require('../middleware/auth');
const { sendSubmissionConfirmation, sendAdminNewSubmission } = require('../utils/email');
const audit = require('../utils/audit');

const router = express.Router();
router.use(authenticate, requireChefe);

const YEAR = () => new Date().getFullYear();

async function getOrCreateSubmission(userId, campusId, universityId) {
  const yr = YEAR();
  // Always ensure university_id is set — look it up if missing
  let univId = universityId;
  if (!univId && campusId) {
    const r = await db.query('SELECT university_id FROM campuses WHERE id=$1', [campusId]);
    univId = r.rows[0]?.university_id || null;
  }
  const existing = await db.query(
    'SELECT * FROM submissions WHERE user_id=$1 AND year=$2', [userId, yr]);
  if (existing.rows.length) {
    // Update university_id if it was null
    if (!existing.rows[0].university_id && univId) {
      await db.query('UPDATE submissions SET university_id=$1, campus_id=$2 WHERE id=$3',
        [univId, campusId, existing.rows[0].id]);
    }
    return { ...existing.rows[0], university_id: existing.rows[0].university_id || univId };
  }
  const created = await db.query(
    `INSERT INTO submissions (user_id,campus_id,university_id,year)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [userId, campusId||null, univId||null, yr]);
  return created.rows[0];
}

// GET /api/submissions/current
router.get('/current', async (req, res, next) => {
  try {
    const sub = await getOrCreateSubmission(req.user.id, req.user.campus_id, req.user.university_id);

    // Fetch university-level ID IES (not per-submission)
    let univIdIes = null;
    if (sub.university_id) {
      const r = await db.query('SELECT * FROM university_id_ies WHERE university_id=$1', [sub.university_id]);
      univIdIes = r.rows[0] || null;
    }

    const [estudantes, docentes, investigadores, financas, labs, salas, previsao, locks] =
      await Promise.all([
        db.query('SELECT * FROM estudantes WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM docentes WHERE submission_id=$1 ORDER BY regime,sort_order', [sub.id]),
        db.query('SELECT * FROM investigadores WHERE submission_id=$1 ORDER BY regime,sort_order', [sub.id]),
        db.query('SELECT * FROM financas WHERE submission_id=$1', [sub.id]),
        db.query('SELECT * FROM infra_labs WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM infra_salas WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM previsao WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM section_locks WHERE submission_id=$1', [sub.id]),
      ]);

    res.json({
      submission: sub,
      idies: univIdIes,          // university-level, read-only for chefes
      estudantes: estudantes.rows,
      docentes: docentes.rows,
      investigadores: investigadores.rows,
      financas: financas.rows[0] || null,
      infra: { labs: labs.rows, salas: salas.rows },
      previsao: previsao.rows,
      locks: locks.rows,         // section locks for progress %
    });
  } catch (err) { next(err); }
});

// Helper to check section is not locked (chefe cannot edit locked sections)
async function checkNotLocked(submissionId, section, userRole) {
  if (userRole === 'director_gpl' || userRole === 'superadmin') return; // directors can always edit
  const r = await db.query(
    'SELECT id FROM section_locks WHERE submission_id=$1 AND section=$2', [submissionId, section]);
  if (r.rows.length) throw Object.assign(new Error('Secção bloqueada. Solicite desbloqueio ao Director GPL.'), { status: 423 });
}

// PUT /api/submissions/idies — director_gpl only (university level)
router.put('/idies', requireDirector, async (req, res, next) => {
  try {
    const univId = req.user.university_id;
    if (!univId) return res.status(400).json({ error: 'Sem universidade atribuída' });
    const d = req.body;
    await db.query(`
      INSERT INTO university_id_ies
        (university_id,nome,sigla,nuit,ano_inicio,provincia,distrito,website,contacto,email,responsavel,funcao,email_resp,updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
      ON CONFLICT (university_id) DO UPDATE SET
        nome=$2,sigla=$3,nuit=$4,ano_inicio=$5,provincia=$6,distrito=$7,
        website=$8,contacto=$9,email=$10,responsavel=$11,funcao=$12,email_resp=$13,updated_at=NOW()`,
      [univId,d.nome,d.sigla,d.nuit,d.ano_inicio,d.provincia,d.distrito,
       d.website,d.contacto,d.email,d.responsavel,d.funcao,d.email_resp]);
    audit.log({ userId:req.user.id, userEmail:req.user.email, userRole:req.user.role,
      action:'save_section', entityType:'university', entityId:univId, section:'idies', ip:audit.getIp(req) });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

async function saveRows(subId, table, rows, fields, values) {
  await db.query(`DELETE FROM ${table} WHERE submission_id=$1`, [subId]);
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const vals = values(r, i);
    const placeholders = vals.map((_,j) => `$${j+1}`).join(',');
    await db.query(`INSERT INTO ${table} (${fields}) VALUES (${placeholders})`, vals);
  }
}

// PUT /api/submissions/estudantes
router.put('/estudantes', async (req, res, next) => {
  try {
    const sub = await getOrCreateSubmission(req.user.id, req.user.campus_id, req.user.university_id);
    await checkNotLocked(sub.id, 'estudantes', req.user.role);
    const rows = Array.isArray(req.body) ? req.body : [];
    await saveRows(sub.id, 'estudantes',
      'submission_id,curso,duracao,area,subarea,regime,provincia,grau,homens,mulheres,sort_order',
      rows, (r,i) => [sub.id,r.curso,r.duracao||null,r.area,r.subarea,r.regime,r.provincia,r.grau,r.homens||0,r.mulheres||0,i]);
    audit.log({ userId:req.user.id, userEmail:req.user.email, userRole:req.user.role,
      action:'save_section', entityType:'submission', entityId:sub.id, section:'estudantes',
      detail:{ rows_count:rows.length }, ip:audit.getIp(req) });
    res.json({ ok:true });
  } catch (err) { next(err); }
});

// PUT /api/submissions/docentes
router.put('/docentes', async (req, res, next) => {
  try {
    const sub = await getOrCreateSubmission(req.user.id, req.user.campus_id, req.user.university_id);
    await checkNotLocked(sub.id, 'docentes', req.user.role);
    const rows = Array.isArray(req.body) ? req.body : [];
    await saveRows(sub.id, 'docentes',
      'submission_id,regime,provincia,distrito,nacionalidade,lic_h,lic_m,mest_h,mest_m,dout_h,dout_m,sort_order',
      rows, (r,i) => [sub.id,r.regime,r.provincia,r.distrito,r.nacionalidade,r.lic_h||0,r.lic_m||0,r.mest_h||0,r.mest_m||0,r.dout_h||0,r.dout_m||0,i]);
    res.json({ ok:true });
  } catch (err) { next(err); }
});

// PUT /api/submissions/investigadores
router.put('/investigadores', async (req, res, next) => {
  try {
    const sub = await getOrCreateSubmission(req.user.id, req.user.campus_id, req.user.university_id);
    await checkNotLocked(sub.id, 'investigadores', req.user.role);
    const rows = Array.isArray(req.body) ? req.body : [];
    await saveRows(sub.id, 'investigadores',
      'submission_id,regime,nacionalidade,lic_h,lic_m,mest_h,mest_m,dout_h,dout_m,sort_order',
      rows, (r,i) => [sub.id,r.regime,r.nacionalidade,r.lic_h||0,r.lic_m||0,r.mest_h||0,r.mest_m||0,r.dout_h||0,r.dout_m||0,i]);
    res.json({ ok:true });
  } catch (err) { next(err); }
});

// PUT /api/submissions/financas
router.put('/financas', async (req, res, next) => {
  try {
    const sub = await getOrCreateSubmission(req.user.id, req.user.campus_id, req.user.university_id);
    await checkNotLocked(sub.id, 'financas', req.user.role);
    const d = req.body;
    await db.query(`
      INSERT INTO financas (submission_id,oge,doacoes,creditos,proprias,func_ensino,func_investig,func_admin,sal_docentes,sal_tecnicos,desp_invest)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (submission_id) DO UPDATE SET
        oge=$2,doacoes=$3,creditos=$4,proprias=$5,func_ensino=$6,func_investig=$7,
        func_admin=$8,sal_docentes=$9,sal_tecnicos=$10,desp_invest=$11`,
      [sub.id,d.oge||0,d.doacoes||0,d.creditos||0,d.proprias||0,
       d.func_ensino||0,d.func_investig||0,d.func_admin||0,d.sal_docentes||0,d.sal_tecnicos||0,d.desp_invest||0]);
    res.json({ ok:true });
  } catch (err) { next(err); }
});

// PUT /api/submissions/infra
router.put('/infra', async (req, res, next) => {
  try {
    const sub = await getOrCreateSubmission(req.user.id, req.user.campus_id, req.user.university_id);
    await checkNotLocked(sub.id, 'infra', req.user.role);
    const { labs, salas } = req.body;
    await db.query('DELETE FROM infra_labs WHERE submission_id=$1', [sub.id]);
    await db.query('DELETE FROM infra_salas WHERE submission_id=$1', [sub.id]);
    for (let i=0; i<(labs||[]).length; i++) {
      const r=labs[i];
      await db.query('INSERT INTO infra_labs (submission_id,nome,area,subarea,provincia,distrito,num_labs,sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [sub.id,r.nome,r.area,r.subarea,r.provincia,r.distrito,r.num_labs||0,i]);
    }
    for (let i=0; i<(salas||[]).length; i++) {
      const r=salas[i];
      await db.query('INSERT INTO infra_salas (submission_id,unidade,provincia,distrito,grau,num_salas,sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [sub.id,r.unidade,r.provincia,r.distrito,r.grau,r.num_salas||0,i]);
    }
    res.json({ ok:true });
  } catch (err) { next(err); }
});

// PUT /api/submissions/previsao
router.put('/previsao', async (req, res, next) => {
  try {
    const sub = await getOrCreateSubmission(req.user.id, req.user.campus_id, req.user.university_id);
    await checkNotLocked(sub.id, 'previsao', req.user.role);
    const rows = Array.isArray(req.body) ? req.body : [];
    await saveRows(sub.id, 'previsao',
      'submission_id,curso,duracao,area,grau,provincia,homens,mulheres,sort_order',
      rows, (r,i) => [sub.id,r.curso,r.duracao||null,r.area,r.grau,r.provincia,r.homens||0,r.mulheres||0,i]);
    res.json({ ok:true });
  } catch (err) { next(err); }
});

// POST /api/submissions/submit
router.post('/submit', async (req, res, next) => {
  try {
    const sub = await getOrCreateSubmission(req.user.id, req.user.campus_id, req.user.university_id);
    if (sub.status==='submitted') return res.status(400).json({ error:'Already submitted' });
    await db.query("UPDATE submissions SET status='submitted',submitted_at=NOW() WHERE id=$1", [sub.id]);
    const [userRes, estRes] = await Promise.all([
      db.query('SELECT email FROM users WHERE id=$1', [req.user.id]),
      db.query('SELECT COALESCE(SUM(homens+mulheres),0) AS total FROM estudantes WHERE submission_id=$1', [sub.id]),
    ]);
    const univIdIes = sub.university_id
      ? (await db.query('SELECT nome,sigla,provincia FROM university_id_ies WHERE university_id=$1', [sub.university_id])).rows[0] || {}
      : {};
    Promise.all([
      sendSubmissionConfirmation({ to:userRes.rows[0]?.email, institution:univIdIes.nome||req.user.institution, sigla:univIdIes.sigla, submittedAt:new Date() }),
      sendAdminNewSubmission({ institution:univIdIes.nome||req.user.institution, sigla:univIdIes.sigla, email:userRes.rows[0]?.email, provincia:univIdIes.provincia, totalEstudantes:estRes.rows[0]?.total||0 }),
    ]).catch(e => console.error('Email error:', e.message));
    res.json({ ok:true });
  } catch (err) { next(err); }
});

module.exports = router;

// Helper used above (inline)
async function saveRows(subId, table, fields, rows, valuesFn) {
  await db.query(`DELETE FROM ${table} WHERE submission_id=$1`, [subId]);
  for (let i=0; i<rows.length; i++) {
    const vals = valuesFn(rows[i], i);
    const ph = vals.map((_,j)=>`$${j+1}`).join(',');
    await db.query(`INSERT INTO ${table} (${fields}) VALUES (${ph})`, vals);
  }
}
