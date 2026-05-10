const express = require('express');
const db = require('../models/db');
const { authenticate } = require('../middleware/auth');
const { buildExcel } = require('../utils/excelExport');
const { buildPdf } = require('../utils/pdfExport');

const router = express.Router();
router.use(authenticate);

const YEAR = () => new Date().getFullYear();

function safeName(str) {
  return (str || '').replace(/[^a-zA-Z0-9\u00C0-\u024F_\-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

async function getUnivIdIes(universityId) {
  if (!universityId) return {};
  const r = await db.query('SELECT * FROM university_id_ies WHERE university_id=$1', [universityId]);
  return r.rows[0] || {};
}

// Resolve university_id for a submission — handles null university_id via campus
async function resolveUnivId(sub) {
  if (sub.university_id) return sub.university_id;
  if (sub.campus_id) {
    const r = await db.query('SELECT university_id FROM campuses WHERE id=$1', [sub.campus_id]);
    return r.rows[0]?.university_id || null;
  }
  return null;
}

// Fetch all data for a single submission, including campus name
async function fetchBySubmissionId(subId) {
  const [subRes, estudantes, docentes, investigadores, financas, labs, salas, previsao] =
    await Promise.all([
      db.query(`SELECT s.*, c.nome as campus_nome
                FROM submissions s
                LEFT JOIN campuses c ON c.id = s.campus_id
                WHERE s.id=$1`, [subId]),
      db.query('SELECT * FROM estudantes WHERE submission_id=$1 ORDER BY sort_order', [subId]),
      db.query('SELECT * FROM docentes WHERE submission_id=$1 ORDER BY regime,sort_order', [subId]),
      db.query('SELECT * FROM investigadores WHERE submission_id=$1 ORDER BY regime,sort_order', [subId]),
      db.query('SELECT * FROM financas WHERE submission_id=$1', [subId]),
      db.query('SELECT * FROM infra_labs WHERE submission_id=$1 ORDER BY sort_order', [subId]),
      db.query('SELECT * FROM infra_salas WHERE submission_id=$1 ORDER BY sort_order', [subId]),
      db.query('SELECT * FROM previsao WHERE submission_id=$1 ORDER BY sort_order', [subId]),
    ]);

  const sub = subRes.rows[0];
  if (!sub) throw new Error(`Submission ${subId} not found`);

  const univId = await resolveUnivId(sub);
  const idies = await getUnivIdIes(univId);

  return {
    idies,
    campusNome: sub.campus_nome || null,   // passed to PDF cover page
    estudantes: estudantes.rows,
    docentes: docentes.rows,
    investigadores: investigadores.rows,
    financas: financas.rows[0] || {},
    infra: { labs: labs.rows, salas: salas.rows },
    previsao: previsao.rows,
  };
}

// Fetch submission for a chefe user
async function fetchSubmissionByUserId(userId) {
  const yr = YEAR();
  const subRes = await db.query(
    'SELECT * FROM submissions WHERE user_id=$1 AND year=$2', [userId, yr]);
  if (!subRes.rows.length) return null;
  return fetchBySubmissionId(subRes.rows[0].id);
}

// Fetch ALL submissions for a university, aggregated
async function fetchUniversityData(universityId) {
  const yr = YEAR();
  const idies = await getUnivIdIes(universityId);

  // Get campuses for this university
  const campusRes = await db.query('SELECT id FROM campuses WHERE university_id=$1', [universityId]);
  const campusIds = campusRes.rows.map(r => r.id);

  // Find ALL submission IDs — match by university_id OR campus_id
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
      'SELECT id FROM submissions WHERE university_id=$1 AND year=$2', [universityId, yr]);
    subIds = subRes.rows.map(r => r.id);
  }

  if (!subIds.length) {
    return { idies, estudantes:[], docentes:[], investigadores:[], financas:{}, infra:{labs:[],salas:[]}, previsao:[] };
  }

  const [estudantes, docentes, investigadores, financas, labs, salas, previsao] = await Promise.all([
    db.query('SELECT * FROM estudantes WHERE submission_id = ANY($1::uuid[]) ORDER BY sort_order', [subIds]),
    db.query('SELECT * FROM docentes WHERE submission_id = ANY($1::uuid[]) ORDER BY regime,sort_order', [subIds]),
    db.query('SELECT * FROM investigadores WHERE submission_id = ANY($1::uuid[]) ORDER BY regime,sort_order', [subIds]),
    db.query('SELECT * FROM financas WHERE submission_id = ANY($1::uuid[])', [subIds]),
    db.query('SELECT * FROM infra_labs WHERE submission_id = ANY($1::uuid[]) ORDER BY sort_order', [subIds]),
    db.query('SELECT * FROM infra_salas WHERE submission_id = ANY($1::uuid[]) ORDER BY sort_order', [subIds]),
    db.query('SELECT * FROM previsao WHERE submission_id = ANY($1::uuid[]) ORDER BY sort_order', [subIds]),
  ]);

  // Sum all financas rows into one
  const finSum = financas.rows.reduce((acc, f) => ({
    oge:          (acc.oge||0)         + (parseFloat(f.oge)||0),
    doacoes:      (acc.doacoes||0)     + (parseFloat(f.doacoes)||0),
    creditos:     (acc.creditos||0)    + (parseFloat(f.creditos)||0),
    proprias:     (acc.proprias||0)    + (parseFloat(f.proprias)||0),
    func_ensino:  (acc.func_ensino||0) + (parseFloat(f.func_ensino)||0),
    func_investig:(acc.func_investig||0)+(parseFloat(f.func_investig)||0),
    func_admin:   (acc.func_admin||0)  + (parseFloat(f.func_admin)||0),
    sal_docentes: (acc.sal_docentes||0)+ (parseFloat(f.sal_docentes)||0),
    sal_tecnicos: (acc.sal_tecnicos||0)+ (parseFloat(f.sal_tecnicos)||0),
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

function setHeaders(res, type, filename) {
  res.setHeader('Content-Type', type === 'xlsx'
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  // Ensure browsers don't cache the download
  res.setHeader('Cache-Control', 'no-cache, no-store');
  res.setHeader('Pragma', 'no-cache');
}

// ── CHEFE: own submission ─────────────────────────────────────────────────────

router.get('/xlsx', async (req, res, next) => {
  try {
    const data = await fetchSubmissionByUserId(req.user.id);
    if (!data) return res.status(404).json({ error: 'Sem submissão encontrada. Insira dados primeiro.' });
    const yr = YEAR();
    const sigla = safeName(data.idies?.sigla || 'IES');
    const campus = safeName(data.campusNome || '');
    const name = campus ? `Formulario_Recolha_${yr}_${sigla}_${campus}.xlsx` : `Formulario_Recolha_${yr}_${sigla}.xlsx`;
    setHeaders(res, 'xlsx', name);
    const wb = await buildExcel(data);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
});

router.get('/pdf', async (req, res, next) => {
  try {
    const data = await fetchSubmissionByUserId(req.user.id);
    if (!data) return res.status(404).json({ error: 'Sem submissão encontrada. Insira dados primeiro.' });
    const yr = YEAR();
    const sigla = safeName(data.idies?.sigla || 'IES');
    const campus = safeName(data.campusNome || '');
    const name = campus ? `Formulario_Recolha_${yr}_${sigla}_${campus}.pdf` : `Formulario_Recolha_${yr}_${sigla}.pdf`;
    setHeaders(res, 'pdf', name);
    buildPdf(data, res);
  } catch (err) { next(err); }
});

// ── DIRECTOR: aggregated university ─────────────────────────────────────────

router.get('/university/xlsx', async (req, res, next) => {
  try {
    if (!['director_gpl','superadmin'].includes(req.user.role)) return res.status(403).json({ error:'Forbidden' });
    const univId = req.user.university_id || req.query.university_id;
    if (!univId) return res.status(400).json({ error:'Sem universidade atribuída' });
    const data = await fetchUniversityData(univId);
    const yr = YEAR();
    const sigla = safeName(data.idies?.sigla || data.idies?.nome || 'IES');
    setHeaders(res, 'xlsx', `Formulario_Recolha_${yr}_${sigla}_Consolidado.xlsx`);
    const wb = await buildExcel(data);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
});

router.get('/university/pdf', async (req, res, next) => {
  try {
    if (!['director_gpl','superadmin'].includes(req.user.role)) return res.status(403).json({ error:'Forbidden' });
    const univId = req.user.university_id || req.query.university_id;
    if (!univId) return res.status(400).json({ error:'Sem universidade atribuída' });
    const data = await fetchUniversityData(univId);
    const yr = YEAR();
    const sigla = safeName(data.idies?.sigla || data.idies?.nome || 'IES');
    setHeaders(res, 'pdf', `Formulario_Recolha_${yr}_${sigla}_Consolidado.pdf`);
    buildPdf(data, res);
  } catch (err) { next(err); }
});

// ── DIRECTOR: per-campus by submission ID ─────────────────────────────────────

router.get('/pdf/:submissionId', async (req, res, next) => {
  try {
    if (!['director_gpl','superadmin'].includes(req.user.role)) return res.status(403).json({ error:'Forbidden' });
    const data = await fetchBySubmissionId(req.params.submissionId);
    const yr = YEAR();
    const sigla = safeName(data.idies?.sigla || 'IES');
    const campus = safeName(data.campusNome || '');
    const name = campus ? `Formulario_Recolha_${yr}_${sigla}_${campus}.pdf` : `Formulario_Recolha_${yr}_${sigla}.pdf`;
    setHeaders(res, 'pdf', name);
    buildPdf(data, res);
  } catch (err) { next(err); }
});

router.get('/xlsx/:submissionId', async (req, res, next) => {
  try {
    if (!['director_gpl','superadmin'].includes(req.user.role)) return res.status(403).json({ error:'Forbidden' });
    const data = await fetchBySubmissionId(req.params.submissionId);
    const yr = YEAR();
    const sigla = safeName(data.idies?.sigla || 'IES');
    const campus = safeName(data.campusNome || '');
    const name = campus ? `Formulario_Recolha_${yr}_${sigla}_${campus}.xlsx` : `Formulario_Recolha_${yr}_${sigla}.xlsx`;
    setHeaders(res, 'xlsx', name);
    const wb = await buildExcel(data);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
});

module.exports = router;
