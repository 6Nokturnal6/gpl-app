const express = require('express');
const db = require('../models/db');
const { authenticate } = require('../middleware/auth');
const { buildExcel } = require('../utils/excelExport');
const { buildPdf } = require('../utils/pdfExport');

const router = express.Router();
router.use(authenticate);

async function fetchSubmissionData(userId) {
  const subResult = await db.query(
    'SELECT * FROM submissions WHERE user_id=$1 AND year=2024', [userId]
  );
  if (!subResult.rows.length) return null;
  const sub = subResult.rows[0];
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

// GET /api/export/xlsx
router.get('/xlsx', async (req, res, next) => {
  try {
    const data = await fetchSubmissionData(req.user.id);
    if (!data) return res.status(404).json({ error: 'No submission found' });
    const institution = (data.idies?.sigla || 'IES').replace(/\s+/g, '_');
    const filename = `Formulario_Recolha_2024_${institution}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    const wb = await buildExcel(data);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
});

// GET /api/export/pdf
router.get('/pdf', async (req, res, next) => {
  try {
    const data = await fetchSubmissionData(req.user.id);
    if (!data) return res.status(404).json({ error: 'No submission found' });
    const institution = (data.idies?.sigla || 'IES').replace(/\s+/g, '_');
    const filename = `Formulario_Recolha_2024_${institution}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    buildPdf(data, res);
  } catch (err) { next(err); }
});

// GET /api/export/pdf/:submissionId  (admin — export any institution's PDF)
router.get('/pdf/:submissionId', async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const sub = req.params.submissionId;
    const [idies, estudantes, docentes, investigadores, financas, labs, salas, previsao] =
      await Promise.all([
        db.query('SELECT * FROM id_ies WHERE submission_id=$1', [sub]),
        db.query('SELECT * FROM estudantes WHERE submission_id=$1 ORDER BY sort_order', [sub]),
        db.query('SELECT * FROM docentes WHERE submission_id=$1 ORDER BY regime,sort_order', [sub]),
        db.query('SELECT * FROM investigadores WHERE submission_id=$1 ORDER BY regime,sort_order', [sub]),
        db.query('SELECT * FROM financas WHERE submission_id=$1', [sub]),
        db.query('SELECT * FROM infra_labs WHERE submission_id=$1 ORDER BY sort_order', [sub]),
        db.query('SELECT * FROM infra_salas WHERE submission_id=$1 ORDER BY sort_order', [sub]),
        db.query('SELECT * FROM previsao WHERE submission_id=$1 ORDER BY sort_order', [sub]),
      ]);
    const data = {
      idies: idies.rows[0] || {},
      estudantes: estudantes.rows,
      docentes: docentes.rows,
      investigadores: investigadores.rows,
      financas: financas.rows[0] || {},
      infra: { labs: labs.rows, salas: salas.rows },
      previsao: previsao.rows,
    };
    const institution = (data.idies?.sigla || 'IES').replace(/\s+/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Formulario_2024_${institution}.pdf"`);
    buildPdf(data, res);
  } catch (err) { next(err); }
});

module.exports = router;
