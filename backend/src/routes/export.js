const express = require('express');
const db = require('../models/db');
const { authenticate } = require('../middleware/auth');
const { buildExcel } = require('../utils/excelExport');
const { buildPdf } = require('../utils/pdfExport');

const router = express.Router();
router.use(authenticate);

const YEAR = () => new Date().getFullYear();

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
  const idies = await getUnivIdIes(sub?.university_id);
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
  const subRes = await db.query('SELECT * FROM submissions WHERE user_id=$1 AND year=$2', [userId, yr]);
  if (!subRes.rows.length) return null;
  return fetchBySubmissionId(subRes.rows[0].id);
}

async function fetchUniversityData(universityId) {
  const yr = YEAR();
  const idies = await getUnivIdIes(universityId);
  const subsRes = await db.query(
    'SELECT id FROM submissions WHERE university_id=$1 AND year=$2', [universityId, yr]);
  const subIds = subsRes.rows.map(r => r.id);
  if (!subIds.length) return { idies, estudantes:[], docentes:[], investigadores:[], financas:{}, infra:{labs:[],salas:[]}, previsao:[] };

  const ph = subIds.map((_,i)=>`$${i+1}`).join(',');
  const [estudantes, docentes, investigadores, financas, labs, salas, previsao] = await Promise.all([
    db.query(`SELECT * FROM estudantes WHERE submission_id IN (${ph}) ORDER BY sort_order`, subIds),
    db.query(`SELECT * FROM docentes WHERE submission_id IN (${ph}) ORDER BY regime,sort_order`, subIds),
    db.query(`SELECT * FROM investigadores WHERE submission_id IN (${ph}) ORDER BY regime,sort_order`, subIds),
    db.query(`SELECT * FROM financas WHERE submission_id IN (${ph})`, subIds),
    db.query(`SELECT * FROM infra_labs WHERE submission_id IN (${ph}) ORDER BY sort_order`, subIds),
    db.query(`SELECT * FROM infra_salas WHERE submission_id IN (${ph}) ORDER BY sort_order`, subIds),
    db.query(`SELECT * FROM previsao WHERE submission_id IN (${ph}) ORDER BY sort_order`, subIds),
  ]);

  const finSum = financas.rows.reduce((acc, f) => ({
    oge: (acc.oge||0)+(parseFloat(f.oge)||0),
    doacoes: (acc.doacoes||0)+(parseFloat(f.doacoes)||0),
    creditos: (acc.creditos||0)+(parseFloat(f.creditos)||0),
    proprias: (acc.proprias||0)+(parseFloat(f.proprias)||0),
    func_ensino: (acc.func_ensino||0)+(parseFloat(f.func_ensino)||0),
    func_investig: (acc.func_investig||0)+(parseFloat(f.func_investig)||0),
    func_admin: (acc.func_admin||0)+(parseFloat(f.func_admin)||0),
    sal_docentes: (acc.sal_docentes||0)+(parseFloat(f.sal_docentes)||0),
    sal_tecnicos: (acc.sal_tecnicos||0)+(parseFloat(f.sal_tecnicos)||0),
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

function setFilename(res, type, name) {
  const yr = YEAR();
  const ext = type === 'xlsx' ? 'xlsx' : 'pdf';
  const mime = type === 'xlsx'
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : 'application/pdf';
  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Disposition', `attachment; filename="${name}_${yr}.${ext}"`);
}

// Chefe: own submission
router.get('/xlsx', async (req, res, next) => {
  try {
    const data = await fetchSubmissionByUserId(req.user.id);
    if (!data) return res.status(404).json({ error: 'Sem dados para exportar' });
    setFilename(res, 'xlsx', `Formulario_${data.idies?.sigla||'IES'}`);
    const wb = await buildExcel(data); await wb.xlsx.write(res); res.end();
  } catch (err) { next(err); }
});

router.get('/pdf', async (req, res, next) => {
  try {
    const data = await fetchSubmissionByUserId(req.user.id);
    if (!data) return res.status(404).json({ error: 'Sem dados para exportar' });
    setFilename(res, 'pdf', `Formulario_${data.idies?.sigla||'IES'}`);
    buildPdf(data, res);
  } catch (err) { next(err); }
});

// Director: aggregated university
router.get('/university/xlsx', async (req, res, next) => {
  try {
    if (!['director_gpl','superadmin'].includes(req.user.role)) return res.status(403).json({ error:'Forbidden' });
    const univId = req.user.university_id || req.query.university_id;
    if (!univId) return res.status(400).json({ error:'university_id required' });
    const data = await fetchUniversityData(univId);
    setFilename(res, 'xlsx', `Consolidado_${data.idies?.sigla||'Univ'}`);
    const wb = await buildExcel(data); await wb.xlsx.write(res); res.end();
  } catch (err) { next(err); }
});

router.get('/university/pdf', async (req, res, next) => {
  try {
    if (!['director_gpl','superadmin'].includes(req.user.role)) return res.status(403).json({ error:'Forbidden' });
    const univId = req.user.university_id || req.query.university_id;
    if (!univId) return res.status(400).json({ error:'university_id required' });
    const data = await fetchUniversityData(univId);
    setFilename(res, 'pdf', `Consolidado_${data.idies?.sigla||'Univ'}`);
    buildPdf(data, res);
  } catch (err) { next(err); }
});

// Admin: single campus by submission ID
router.get('/pdf/:submissionId', async (req, res, next) => {
  try {
    if (!['director_gpl','superadmin'].includes(req.user.role)) return res.status(403).json({ error:'Forbidden' });
    const data = await fetchBySubmissionId(req.params.submissionId);
    setFilename(res, 'pdf', `Formulario_${data.idies?.sigla||'IES'}`);
    buildPdf(data, res);
  } catch (err) { next(err); }
});

router.get('/xlsx/:submissionId', async (req, res, next) => {
  try {
    if (!['director_gpl','superadmin'].includes(req.user.role)) return res.status(403).json({ error:'Forbidden' });
    const data = await fetchBySubmissionId(req.params.submissionId);
    setFilename(res, 'xlsx', `Formulario_${data.idies?.sigla||'IES'}`);
    const wb = await buildExcel(data); await wb.xlsx.write(res); res.end();
  } catch (err) { next(err); }
});

module.exports = router;
