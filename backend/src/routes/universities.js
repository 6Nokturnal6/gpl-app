const express = require('express');
const db = require('../models/db');
const { authenticate, requireAdmin, requireDirector } = require('../middleware/auth');
const audit = require('../utils/audit');

const router = express.Router();
router.use(authenticate);

const YEAR = () => new Date().getFullYear();

// GET /api/universities
router.get('/', async (req, res, next) => {
  try {
    const r = await db.query('SELECT * FROM universities ORDER BY nome');
    res.json(r.rows);
  } catch (err) { next(err); }
});

// POST /api/universities (superadmin only)
router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const { nome, sigla, nuit } = req.body;
    if (!nome) return res.status(400).json({ error: 'Nome required' });
    const r = await db.query(
      'INSERT INTO universities (nome,sigla,nuit) VALUES ($1,$2,$3) RETURNING *',
      [nome, sigla||null, nuit||null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { next(err); }
});

// GET /api/universities/:id/idies — get university-level ID IES
router.get('/:id/idies', async (req, res, next) => {
  try {
    const uid = req.params.id;
    // Allow director of this university or superadmin or any chefe of this university
    if (req.user.role !== 'superadmin' && req.user.university_id !== uid) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const r = await db.query('SELECT * FROM university_id_ies WHERE university_id=$1', [uid]);
    res.json(r.rows[0] || null);
  } catch (err) { next(err); }
});

// PUT /api/universities/:id/idies — director fills university ID IES
router.put('/:id/idies', requireDirector, async (req, res, next) => {
  try {
    const uid = req.params.id;
    if (req.user.role !== 'superadmin' && req.user.university_id !== uid) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const d = req.body;
    const before = (await db.query('SELECT * FROM university_id_ies WHERE university_id=$1', [uid])).rows[0];
    await db.query(`
      INSERT INTO university_id_ies
        (university_id,nome,sigla,nuit,ano_inicio,provincia,distrito,website,contacto,email,responsavel,funcao,email_resp,updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
      ON CONFLICT (university_id) DO UPDATE SET
        nome=$2,sigla=$3,nuit=$4,ano_inicio=$5,provincia=$6,distrito=$7,
        website=$8,contacto=$9,email=$10,responsavel=$11,funcao=$12,email_resp=$13,updated_at=NOW()`,
      [uid,d.nome,d.sigla,d.nuit,d.ano_inicio,d.provincia,d.distrito,
       d.website,d.contacto,d.email,d.responsavel,d.funcao,d.email_resp]);
    audit.log({ userId:req.user.id, userEmail:req.user.email, userRole:req.user.role,
      action:'save_section', entityType:'university', entityId:uid,
      section:'idies', detail:{ before, after:d }, ip:audit.getIp(req) });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// GET /api/universities/:id/summary — aggregated stats from all campuses
router.get('/:id/summary', async (req, res, next) => {
  try {
    const uid = req.params.id;
    if (req.user.role !== 'superadmin' && req.user.university_id !== uid) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const yr = YEAR();

    // First: get all campus IDs for this university
    const campusRes = await db.query('SELECT id FROM campuses WHERE university_id=$1', [uid]);
    const campusIds = campusRes.rows.map(r => r.id);

    // Get all submission IDs for this university
    // Join via university_id OR via campus_id (handles submissions created before university_id was set)
    let subIds = [];
    if (campusIds.length > 0) {
      const campusPh = campusIds.map((_,i) => `$${i+2}`).join(',');
      const subRes = await db.query(
        `SELECT DISTINCT id FROM submissions
         WHERE year=$1 AND (university_id=$${campusIds.length+2} OR campus_id IN (${campusPh}))`,
        [yr, ...campusIds, uid]
      );
      subIds = subRes.rows.map(r => r.id);
    } else {
      const subRes = await db.query(
        'SELECT DISTINCT id FROM submissions WHERE year=$1 AND university_id=$2',
        [yr, uid]
      );
      subIds = subRes.rows.map(r => r.id);
    }

    // Fix: update any submissions missing university_id
    if (campusIds.length > 0) {
      const campusPh = campusIds.map((_,i) => `$${i+2}`).join(',');
      await db.query(
        `UPDATE submissions SET university_id=$1
         WHERE campus_id IN (${campusPh}) AND university_id IS NULL`,
        [uid, ...campusIds]
      );
    }

    const [campuses, students, staff, researchers, finances, labs, salas, previsao, idies] = await Promise.all([
      db.query(`
        SELECT c.id, c.nome, c.provincia, s.status, s.id as submission_id,
          (SELECT COUNT(*) FROM section_locks sl WHERE sl.submission_id=s.id) as locked_sections,
          (SELECT COUNT(*) FROM section_locks sl WHERE sl.submission_id=s.id AND sl.unlock_requested=TRUE) as unlock_requests
        FROM campuses c
        LEFT JOIN submissions s ON s.campus_id=c.id AND s.year=$2
        WHERE c.university_id=$1 ORDER BY c.nome`, [uid, yr]),

      subIds.length ? db.query(
        `SELECT e.grau,
                COALESCE(SUM(e.homens),0) AS h,
                COALESCE(SUM(e.mulheres),0) AS m
         FROM estudantes e
         WHERE e.submission_id = ANY($1::uuid[])
         GROUP BY e.grau ORDER BY e.grau`,
        [subIds]
      ) : Promise.resolve({ rows: [] }),

      subIds.length ? db.query(
        `SELECT COALESCE(SUM(d.lic_h+d.lic_m+d.mest_h+d.mest_m+d.dout_h+d.dout_m),0) AS total,
                COALESCE(SUM(d.lic_h+d.mest_h+d.dout_h),0) AS homens,
                COALESCE(SUM(d.lic_m+d.mest_m+d.dout_m),0) AS mulheres
         FROM docentes d WHERE d.submission_id = ANY($1::uuid[])`,
        [subIds]
      ) : Promise.resolve({ rows: [{ total:0, homens:0, mulheres:0 }] }),

      subIds.length ? db.query(
        `SELECT COALESCE(SUM(i.lic_h+i.lic_m+i.mest_h+i.mest_m+i.dout_h+i.dout_m),0) AS total
         FROM investigadores i WHERE i.submission_id = ANY($1::uuid[])`,
        [subIds]
      ) : Promise.resolve({ rows: [{ total:0 }] }),

      subIds.length ? db.query(
        `SELECT COALESCE(SUM(f.oge),0) AS oge, COALESCE(SUM(f.doacoes),0) AS doacoes,
                COALESCE(SUM(f.creditos),0) AS creditos, COALESCE(SUM(f.proprias),0) AS proprias,
                COALESCE(SUM(f.func_ensino),0) AS func_ensino, COALESCE(SUM(f.func_investig),0) AS func_investig,
                COALESCE(SUM(f.func_admin),0) AS func_admin, COALESCE(SUM(f.sal_docentes),0) AS sal_docentes,
                COALESCE(SUM(f.sal_tecnicos),0) AS sal_tecnicos
         FROM financas f WHERE f.submission_id = ANY($1::uuid[])`,
        [subIds]
      ) : Promise.resolve({ rows: [{}] }),

      subIds.length ? db.query(
        `SELECT COALESCE(SUM(il.num_labs),0) AS total_labs
         FROM infra_labs il WHERE il.submission_id = ANY($1::uuid[])`,
        [subIds]
      ) : Promise.resolve({ rows: [{ total_labs:0 }] }),

      subIds.length ? db.query(
        `SELECT COALESCE(SUM(is2.num_salas),0) AS total_salas
         FROM infra_salas is2 WHERE is2.submission_id = ANY($1::uuid[])`,
        [subIds]
      ) : Promise.resolve({ rows: [{ total_salas:0 }] }),

            // Aggregated previsao rows
      subIds.length ? db.query(
        'SELECT grau, homens, mulheres FROM previsao WHERE submission_id = ANY(\$1::uuid[]) ORDER BY grau',
        [subIds]
      ) : Promise.resolve({ rows: [] }),

      db.query('SELECT * FROM university_id_ies WHERE university_id=\$1', [uid]),
    ]);

    res.json({
      campuses: campuses.rows,
      students: students.rows,
      staff: staff.rows[0],
      researchers: researchers.rows[0],
      finances: finances.rows[0],
      infrastructure: { labs: labs.rows[0], salas: salas.rows[0] },
      previsao: previsao.rows,
      idies: idies.rows[0] || null,
    });
  } catch (err) { next(err); }
});

// POST /api/universities/:id/submit — director submits to Vice Reitor Admin
router.post('/:id/submit', async (req, res, next) => {
  try {
    const uid = req.params.id;
    if (req.user.role !== 'superadmin' && req.user.university_id !== uid) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const yr = YEAR();

    // Check all campuses have all 7 sections locked
    const campusCheck = await db.query(`
      SELECT c.nome, s.id as submission_id,
        (SELECT COUNT(*) FROM section_locks sl WHERE sl.submission_id=s.id) as locked_count
      FROM campuses c
      LEFT JOIN submissions s ON s.campus_id=c.id AND s.year=$2
      WHERE c.university_id=$1`, [uid, yr]);

    // Sections that chefes must lock: estudantes, docentes, investigadores, financas, infra, previsao (6 — idies is director's)
    const REQUIRED_LOCKS = 6;
    const incomplete = campusCheck.rows.filter(r => !r.submission_id || parseInt(r.locked_count) < REQUIRED_LOCKS);
    if (incomplete.length > 0) {
      const names = incomplete.map(r => r.nome).join(', ');
      return res.status(400).json({
        error: `Os seguintes campuses ainda não concluíram todas as secções: ${names}. Cada Chefe de Departamento deve marcar as 6 secções como "Concluído" antes da submissão.`,
        incomplete: incomplete.map(r => ({ nome: r.nome, locked: r.locked_count, required: REQUIRED_LOCKS }))
      });
    }

    // Mark all submissions as submitted
    await db.query(
      `UPDATE submissions SET status='submitted', submitted_at=NOW()
       WHERE university_id=$1 AND year=$2`,
      [uid, yr]
    );

    // Send email
    const univRes = await db.query('SELECT * FROM universities WHERE id=$1', [uid]);
    const univ = univRes.rows[0] || {};
    const VR_EMAIL = process.env.VR_EMAIL || 'vradmin@unilurio.ac.mz';
    const nodemailer = require('nodemailer');
    if (process.env.SMTP_HOST) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST, port: parseInt(process.env.SMTP_PORT||'587'),
        secure: process.env.SMTP_SECURE==='true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      transporter.sendMail({
        from: process.env.SMTP_FROM || 'aGPLúrio <noreply@unilurio.ac.mz>',
        to: VR_EMAIL,
        subject: `Dados estatísticos submetidos — ${univ.nome} (${yr})`,
        html: `<p>O Director GPL de <strong>${univ.nome}</strong> submeteu os dados estatísticos do ano ${yr} para revisão.</p><p>Por favor aceda ao sistema aGPLúrio para rever e aprovar os dados.</p>`,
      }).catch(e => console.error('Email error:', e.message));
    }

    audit.log({ userId:req.user.id, userEmail:req.user.email, userRole:req.user.role,
      action:'submit', entityType:'university', entityId:uid,
      detail:{ university:univ.nome, year:yr }, ip:audit.getIp(req) });

    res.json({ ok:true, message:`Dados de ${univ.nome} submetidos ao Vice Reitor Administrativo com sucesso` });
  } catch (err) { next(err); }
});

module.exports = router;

// POST /api/universities/backfill — fix submissions with null university_id
// Call this once after update to fix existing data
router.post('/backfill', requireAdmin, async (req, res, next) => {
  try {
    // Fix submissions where campus has a university but submission doesn't
    const r = await db.query(`
      UPDATE submissions s
      SET university_id = c.university_id
      FROM campuses c
      WHERE s.campus_id = c.id
        AND s.university_id IS NULL
        AND c.university_id IS NOT NULL
      RETURNING s.id`);

    // Fix submissions where user has a university but submission doesn't
    const r2 = await db.query(`
      UPDATE submissions s
      SET university_id = u.university_id
      FROM users u
      WHERE s.user_id = u.id
        AND s.university_id IS NULL
        AND u.university_id IS NOT NULL
      RETURNING s.id`);

    res.json({
      ok: true,
      fixed_via_campus: r.rows.length,
      fixed_via_user: r2.rows.length
    });
  } catch (err) { next(err); }
});
