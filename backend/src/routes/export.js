const express = require('express');
const db = require('../models/db');
const { authenticate } = require('../middleware/auth');
const { buildExcel } = require('../utils/excelExport');

const router = express.Router();
router.use(authenticate);

// GET /api/export/xlsx
router.get('/xlsx', async (req, res, next) => {
  try {
    const subResult = await db.query(
      'SELECT * FROM submissions WHERE user_id=$1 AND year=2024',
      [req.user.id]
    );
    if (!subResult.rows.length) {
      return res.status(404).json({ error: 'No submission found' });
    }
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

    const data = {
      idies: idies.rows[0] || {},
      estudantes: estudantes.rows,
      docentes: docentes.rows,
      investigadores: investigadores.rows,
      financas: financas.rows[0] || {},
      infra: { labs: labs.rows, salas: salas.rows },
      previsao: previsao.rows,
    };

    const wb = await buildExcel(data);
    const institution = (idies.rows[0]?.sigla || 'IES').replace(/\s+/g, '_');
    const filename = `Formulario_Recolha_2024_${institution}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
});

module.exports = router;
