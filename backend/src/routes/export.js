const express = require('express');
const db = require('../models/db');
const { authenticate } = require('../middleware/auth');
const { buildExcel } = require('../utils/excelExport');
const { buildPdf } = require('../utils/pdfExport');

const router = express.Router();
router.use(authenticate);

const YEAR = new Date().getFullYear();

// Fetch data for a single user's submission
async function fetchSubmissionData(userId) {
  const subResult = await db.query(
    'SELECT * FROM submissions WHERE user_id=$1 AND year=$2', [userId, YEAR]);
  if (!subResult.rows.length) return null;
  const sub = subResult.rows[0];
  return await fetchBySubmissionId(sub.id);
}

// Fetch full data by submission ID
async function fetchBySubmissionId(subId) {
  const [idies, estudantes, docentes, investigadores, financas, labs, salas, previsao] =
    await Promise.all([
      db.query('SELECT * FROM id_ies WHERE submission_id=$1', [subId]),
      db.query('SELECT * FROM estudantes WHERE submission_id=$1 ORDER BY sort_order', [subId]),
      db.query('SELECT * FROM docentes WHERE submission_id=$1 ORDER BY regime,sort_order', [subId]),
      db.query('SELECT * FROM investigadores WHERE submission_id=$1 ORDER BY regime,sort_order', [subId]),
      db.query('SELECT * FROM financas WHERE submission_id=$1', [subId]),
      db.query('SELECT * FROM infra_labs WHERE submission_id=$1 ORDER BY sort_order', [subId]),
      db.query('SELECT * FROM infra_salas WHERE submission_id=$1 ORDER BY sort_order', [subId]),
      db.query('SELECT * FROM previsao WHERE submission_id=$1 ORDER BY sort_order', [subId]),
    ]);
  return {
    idies: idies.rows[0] || {},
    estudantes: estudantes.rows,
    docentes: docentes.rows,
    investigadores: investigadores.rows,
    financas: financas.rows[0] || {},
    infra: { labs: labs.rows, salas: salas.rows },
    previsao: previsao.rows,
  };
}

// Fetch aggregated data for a university (all campuses combined)
async function fetchUniversityData(universityId) {
  // Get university info first
  const univRes = await db.query('SELECT * FROM universities WHERE id=$1', [universityId]);
  const univ = univRes.rows[0] || {};

  // Get all submissions for this university
  const subsRes = await db.query(
    'SELECT id FROM submissions WHERE university_id=$1 AND year=$2', [universityId, YEAR]);
  const subIds = subsRes.rows.map(r => r.id);
  if (!subIds.length) return null;

  // Aggregate all data
  const placeholders = subIds.map((_,i) => `$${i+1}`).join(',');
  const [estudantes, docentes, investigadores, financas, labs, salas, previsao] =
    await Promise.all([
      db.query(`SELECT * FROM estudantes WHERE submission_id IN (${placeholders}) ORDER BY sort_order`, subIds),
      db.query(`SELECT * FROM docentes WHERE submission_id IN (${placeholders}) ORDER BY regime,sort_order`, subIds),
      db.query(`SELECT * FROM investigadores WHERE submission_id IN (${placeholders}) ORDER BY regime,sort_order`, subIds),
      db.query(`SELECT oge,doacoes,creditos,proprias,func_ensino,func_investig,func_admin,sal_docentes,sal_tecnicos,desp_invest FROM financas WHERE submission_id IN (${placeholders})`, subIds),
      db.query(`SELECT * FROM infra_labs WHERE submission_id IN (${placeholders}) ORDER BY sort_order`, subIds),
      db.query(`SELECT * FROM infra_salas WHERE submission_id IN (${placeholders}) ORDER BY sort_order`, subIds),
      db.query(`SELECT * FROM previsao WHERE submission_id IN (${placeholders}) ORDER BY sort_order`, subIds),
    ]);

  // Sum all financas rows into one
  const finSum = financas.rows.reduce((acc, f) => ({
    oge: (acc.oge||0) + (parseFloat(f.oge)||0),
    doacoes: (acc.doacoes||0) + (parseFloat(f.doacoes)||0),
    creditos: (acc.creditos||0) + (parseFloat(f.creditos)||0),
    proprias: (acc.proprias||0) + (parseFloat(f.proprias)||0),
    func_ensino: (acc.func_ensino||0) + (parseFloat(f.func_ensino)||0),
    func_investig: (acc.func_investig||0) + (parseFloat(f.func_investig)||0),
    func_admin: (acc.func_admin||0) + (parseFloat(f.func_admin)||0),
    sal_docentes: (acc.sal_docentes||0) + (parseFloat(f.sal_docentes)||0),
    sal_tecnicos: (acc.sal_tecnicos||0) + (parseFloat(f.sal_tecnicos)||0),
    desp_invest: (acc.desp_invest||0) + (parseFloat(f.desp_invest)||0),
  }), {});

  return {
    idies: { nome: univ.nome, sigla: univ.sigla, nuit: univ.nuit },
    estudantes: estudantes.rows,
    docentes: docentes.rows,
    investigadores: investigadores.rows,
    financas: finSum,
    infra: { labs: labs.rows, salas: salas.rows },
    previsao: previsao.rows,
  };
}

// ── GET /api/export/xlsx — chefe: own data ─────────────────────────────────
router.get('/xlsx', async (req, res, next) => {
  try {
    const data = await fetchSubmissionData(req.user.id);
    if (!data) return res.status(404).json({ error: 'Sem dados para exportar' });
    const sigla = (data.idies?.sigla || 'IES').replace(/\s+/g,'_');
    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition',`attachment; filename="Formulario_${YEAR}_${sigla}.xlsx"`);
    const wb = await buildExcel(data);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
});

// ── GET /api/export/pdf — chefe: own data ─────────────────────────────────
router.get('/pdf', async (req, res, next) => {
  try {
    const data = await fetchSubmissionData(req.user.id);
    if (!data) return res.status(404).json({ error: 'Sem dados para exportar' });
    const sigla = (data.idies?.sigla || 'IES').replace(/\s+/g,'_');
    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition',`attachment; filename="Formulario_${YEAR}_${sigla}.pdf"`);
    buildPdf(data, res);
  } catch (err) { next(err); }
});

// ── GET /api/export/university/xlsx — director: all campuses aggregated ────
router.get('/university/xlsx', async (req, res, next) => {
  try {
    if (!['director_gpl','superadmin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const univId = req.user.university_id || req.query.university_id;
    if (!univId) return res.status(400).json({ error: 'university_id required' });
    const data = await fetchUniversityData(univId);
    if (!data) return res.status(404).json({ error: 'Sem dados para exportar' });
    const sigla = (data.idies?.sigla || 'Univ').replace(/\s+/g,'_');
    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition',`attachment; filename="Consolidado_${YEAR}_${sigla}.xlsx"`);
    const wb = await buildExcel(data);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
});

// ── GET /api/export/university/pdf — director: all campuses aggregated ─────
router.get('/university/pdf', async (req, res, next) => {
  try {
    if (!['director_gpl','superadmin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const univId = req.user.university_id || req.query.university_id;
    if (!univId) return res.status(400).json({ error: 'university_id required' });
    const data = await fetchUniversityData(univId);
    if (!data) return res.status(404).json({ error: 'Sem dados para exportar' });
    const sigla = (data.idies?.sigla || 'Univ').replace(/\s+/g,'_');
    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition',`attachment; filename="Consolidado_${YEAR}_${sigla}.pdf"`);
    buildPdf(data, res);
  } catch (err) { next(err); }
});

// ── GET /api/export/pdf/:submissionId — any admin: single campus ───────────
router.get('/pdf/:submissionId', async (req, res, next) => {
  try {
    if (!['director_gpl','superadmin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const data = await fetchBySubmissionId(req.params.submissionId);
    if (!data) return res.status(404).json({ error: 'Sem dados' });
    const sigla = (data.idies?.sigla || 'IES').replace(/\s+/g,'_');
    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition',`attachment; filename="Formulario_${YEAR}_${sigla}.pdf"`);
    buildPdf(data, res);
  } catch (err) { next(err); }
});

// ── GET /api/export/xlsx/:submissionId — any admin: single campus ──────────
router.get('/xlsx/:submissionId', async (req, res, next) => {
  try {
    if (!['director_gpl','superadmin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const data = await fetchBySubmissionId(req.params.submissionId);
    if (!data) return res.status(404).json({ error: 'Sem dados' });
    const sigla = (data.idies?.sigla || 'IES').replace(/\s+/g,'_');
    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition',`attachment; filename="Formulario_${YEAR}_${sigla}.xlsx"`);
    const wb = await buildExcel(data);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
});

module.exports = router;
