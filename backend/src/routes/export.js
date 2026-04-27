const express = require('express');
const db = require('../models/db');
const { authenticate } = require('../middleware/auth');
const { buildExcel } = require('../utils/excelExport');
const { buildPdf } = require('../utils/pdfExport');

const router = express.Router();
router.use(authenticate);

const YEAR = () => new Date().getFullYear();

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getUnivIdIes(universityId) {
  if (!universityId) return {};
  const r = await db.query('SELECT * FROM university_id_ies WHERE university_id=$1', [universityId]);
  return r.rows[0] || {};
}

async function fetchBySubmissionId(subId) {
  const [subRes, estudantes, docentes, investigadores, financas, labs, salas, previsao] = await Promise.all([
    db.query('SELECT * FROM submissions WHERE id=$1', [subId]),
    db.query('SELECT * FROM estudantes WHERE submission_id=$1 ORDER BY sort_order', [subId]),
    db.query('SELECT * FROM docentes WHERE submission_id=$1 ORDER BY regime,sort_order', [subId]),
    db.query('SELECT * FROM investigadores WHERE submission_id=$1 ORDER BY regime,sort_order', [subId]),
    db.query('SELECT * FROM financas WHERE submission_id=$1', [subId]),
    db.query('SELECT * FROM infra_labs WHERE submission_id=$1 ORDER BY sort_order', [subId]),
    db.query('SELECT * FROM infra_salas WHERE submission_id=$1 ORDER BY sort_order', [subId]),
    db.query('SELECT * FROM previsao WHERE submission_id=$1 ORDER BY sort_order', [subId]),
  ]);
  const sub = subRes.rows[0];
  // university_id may be null — try to resolve via campus
  let univId = sub?.university_id;
  if (!univId && sub?.campus_id) {
    const camp = await db.query('SELECT university_id FROM campuses WHERE id=$1', [sub.campus_id]);
    univId = camp.rows[0]?.university_id || null;
  }
  const idies = await getUnivIdIes(univId);
  return {
    idies,
    estudantes: estudantes.rows,
    docentes: docentes.rows,
    investigadores: investigadores.rows,
    financas: financas.rows[0] || {},
    infra: { labs: labs.rows, salas: salas.rows },
    previsao: previsao.rows,
  };
}

async function fetchSubmissionByUserId(userId) {
  const yr = YEAR();
  const subRes = await db.query(
    'SELECT * FROM submissions WHERE user_id=$1 AND year=$2', [userId, yr]);
  if (!subRes.rows.length) return null;
  return fetchBySubmissionId(subRes.rows[0].id);
}

async function fetchUniversityData(universityId) {
  const yr = YEAR();
  const idies = await getUnivIdIes(universityId);

  // Resolve via campus_id as well — handles submissions with null university_id
  const campusRes = await db.query('SELECT id FROM campuses WHERE university_id=$1', [universityId]);
  const campusIds = campusRes.rows.map(r => r.id);

  let subIds = [];
  if (campusIds.length > 0) {
    const ph = campusIds.map((_,i) => `$${i+2}`).join(',');
    const subRes = await db.query(
      `SELECT DISTINCT id FROM submissions
       WHERE year=$1 AND (university_id=$${campusIds.length+2} OR campus_id IN (${ph}))`,
      [yr, ...campusIds, universityId]
    );
    subIds = subRes.rows.map(r => r.id);
  } else {
    const subRes = await db.query(
      'SELECT id FROM submissions WHERE university_id=$1 AND year=$2',
      [universityId, yr]);
    subIds = subRes.rows.map(r => r.id);
  }

  if (!subIds.length) {
    return { idies, estudantes:[], docentes:[], investigadores:[], financas:{}, infra:{labs:[],salas:[]}, previsao:[] };
  }

  const [estudantes, docentes, investigadores, financas, labs, salas, previsao] = await Promise.all([
    db.query(`SELECT * FROM estudantes WHERE submission_id = ANY($1::uuid[]) ORDER BY sort_order`, [subIds]),
    db.query(`SELECT * FROM docentes WHERE submission_id = ANY($1::uuid[]) ORDER BY regime,sort_order`, [subIds]),
    db.query(`SELECT * FROM investigadores WHERE submission_id = ANY($1::uuid[]) ORDER BY regime,sort_order`, [subIds]),
    db.query(`SELECT * FROM financas WHERE submission_id = ANY($1::uuid[])`, [subIds]),
    db.query(`SELECT * FROM infra_labs WHERE submission_id = ANY($1::uuid[]) ORDER BY sort_order`, [subIds]),
    db.query(`SELECT * FROM infra_salas WHERE submission_id = ANY($1::uuid[]) ORDER BY sort_order`, [subIds]),
    db.query(`SELECT * FROM previsao WHERE submission_id = ANY($1::uuid[]) ORDER BY sort_order`, [subIds]),
  ]);

  const finSum = financas.rows.reduce((acc, f) => ({
    oge:         (acc.oge||0)        + (parseFloat(f.oge)||0),
    doacoes:     (acc.doacoes||0)    + (parseFloat(f.doacoes)||0),
    creditos:    (acc.creditos||0)   + (parseFloat(f.creditos)||0),
    proprias:    (acc.proprias||0)   + (parseFloat(f.proprias)||0),
    func_ensino: (acc.func_ensino||0)+ (parseFloat(f.func_ensino)||0),
    func_investig:(acc.func_investig||0)+(parseFloat(f.func_investig)||0),
    func_admin:  (acc.func_admin||0) + (parseFloat(f.func_admin)||0),
    sal_docentes:(acc.sal_docentes||0)+(parseFloat(f.sal_docentes)||0),
    sal_tecnicos:(acc.sal_tecnicos||0)+(parseFloat(f.sal_tecnicos)||0),
  }), {});

  return {
    idies,
    estudantes: estudantes.rows,
    docentes: docentes.rows,
    investigadores: investigadores.rows,
    financas: finSum,
    infra: { labs: labs.rows, salas: salas.rows },
    previsao: previsao.rows,
  };
}

function sendFile(res, type, baseName) {
  const yr = YEAR();
  const safe = (baseName || 'export').replace(/[^a-zA-Z0-9_\-]/g, '_');
  res.setHeader('Content-Type', type === 'xlsx'
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : 'application/pdf');
  res.setHeader('Content-Disposition',
    `attachment; filename="${safe}_${yr}.${type === 'xlsx' ? 'xlsx' : 'pdf'}"`);
}

// ── Routes ───────────────────────────────────────────────────────────────────

// Chefe: own submission Excel
router.get('/xlsx', async (req, res, next) => {
  try {
    const data = await fetchSubmissionByUserId(req.user.id);
    if (!data) return res.status(404).json({ error: 'Sem submissão encontrada. Insira dados primeiro.' });
    sendFile(res, 'xlsx', `Formulario_${data.idies?.sigla||'IES'}`);
    const wb = await buildExcel(data);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
});

// Chefe: own submission PDF
router.get('/pdf', async (req, res, next) => {
  try {
    const data = await fetchSubmissionByUserId(req.user.id);
    if (!data) return res.status(404).json({ error: 'Sem submissão encontrada. Insira dados primeiro.' });
    sendFile(res, 'pdf', `Formulario_${data.idies?.sigla||'IES'}`);
    buildPdf(data, res);
  } catch (err) { next(err); }
});

// Director: aggregated university Excel
router.get('/university/xlsx', async (req, res, next) => {
  try {
    if (!['director_gpl','superadmin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const univId = req.user.university_id || req.query.university_id;
    if (!univId) return res.status(400).json({ error: 'Sem universidade atribuída' });
    const data = await fetchUniversityData(univId);
    sendFile(res, 'xlsx', `Consolidado_${data.idies?.sigla||'Univ'}`);
    const wb = await buildExcel(data);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
});

// Director: aggregated university PDF
router.get('/university/pdf', async (req, res, next) => {
  try {
    if (!['director_gpl','superadmin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const univId = req.user.university_id || req.query.university_id;
    if (!univId) return res.status(400).json({ error: 'Sem universidade atribuída' });
    const data = await fetchUniversityData(univId);
    sendFile(res, 'pdf', `Consolidado_${data.idies?.sigla||'Univ'}`);
    buildPdf(data, res);
  } catch (err) { next(err); }
});

// Director: single campus PDF by submission ID
router.get('/pdf/:submissionId', async (req, res, next) => {
  try {
    if (!['director_gpl','superadmin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const data = await fetchBySubmissionId(req.params.submissionId);
    sendFile(res, 'pdf', `Formulario_${data.idies?.sigla||'IES'}`);
    buildPdf(data, res);
  } catch (err) { next(err); }
});

// Director: single campus Excel by submission ID
router.get('/xlsx/:submissionId', async (req, res, next) => {
  try {
    if (!['director_gpl','superadmin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const data = await fetchBySubmissionId(req.params.submissionId);
    sendFile(res, 'xlsx', `Formulario_${data.idies?.sigla||'IES'}`);
    const wb = await buildExcel(data);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
});

module.exports = router;
