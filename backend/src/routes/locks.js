const express = require('express');
const db = require('../models/db');
const { authenticate, requireChefe, requireDirector } = require('../middleware/auth');
const audit = require('../utils/audit');

const router = express.Router();
router.use(authenticate);

// GET /api/locks/:submissionId
router.get('/:submissionId', async (req, res, next) => {
  try {
    const r = await db.query(
      `SELECT sl.*, u.email as locked_by_email, u.nome as locked_by_nome
       FROM section_locks sl
       LEFT JOIN users u ON u.id = sl.locked_by
       WHERE sl.submission_id=$1`, [req.params.submissionId]);
    res.json(r.rows);
  } catch (err) { next(err); }
});

// GET /api/locks/university/:universityId/requests — pending unlock requests for director
router.get('/university/:universityId/requests', requireDirector, async (req, res, next) => {
  try {
    const uid = req.params.universityId;
    const r = await db.query(`
      SELECT sl.*, s.campus_id, c.nome as campus_nome,
             u.email as requester_email, u.nome as requester_nome
      FROM section_locks sl
      JOIN submissions s ON s.id = sl.submission_id
      JOIN campuses c ON c.id = s.campus_id
      JOIN users u ON u.id = sl.locked_by
      WHERE s.university_id=$1 AND sl.unlock_requested=TRUE
      ORDER BY sl.unlock_requested_at DESC`, [uid]);
    res.json(r.rows);
  } catch (err) { next(err); }
});

// POST /api/locks/:submissionId/:section — lock (chefe marks as concluido)
router.post('/:submissionId/:section', requireChefe, async (req, res, next) => {
  try {
    const { submissionId, section } = req.params;
    await db.query(`
      INSERT INTO section_locks (submission_id,section,locked_by,locked_at,unlock_requested)
      VALUES ($1,$2,$3,NOW(),FALSE)
      ON CONFLICT (submission_id,section) DO UPDATE
        SET locked_by=$3, locked_at=NOW(), unlock_requested=FALSE, unlock_requested_at=NULL`,
      [submissionId, section, req.user.id]);
    audit.log({ userId:req.user.id, userEmail:req.user.email, userRole:req.user.role,
      action:'lock_section', entityType:'submission', entityId:submissionId,
      section, ip:audit.getIp(req) });
    res.json({ ok:true });
  } catch (err) { next(err); }
});

// POST /api/locks/:submissionId/:section/request-unlock
router.post('/:submissionId/:section/request-unlock', requireChefe, async (req, res, next) => {
  try {
    const { submissionId, section } = req.params;
    await db.query(`
      UPDATE section_locks SET unlock_requested=TRUE, unlock_requested_at=NOW()
      WHERE submission_id=$1 AND section=$2`, [submissionId, section]);
    audit.log({ userId:req.user.id, userEmail:req.user.email, userRole:req.user.role,
      action:'request_unlock', entityType:'submission', entityId:submissionId,
      section, ip:audit.getIp(req) });
    res.json({ ok:true });
  } catch (err) { next(err); }
});

// DELETE /api/locks/:submissionId/:section — director unlocks
router.delete('/:submissionId/:section', requireDirector, async (req, res, next) => {
  try {
    const { submissionId, section } = req.params;
    await db.query('DELETE FROM section_locks WHERE submission_id=$1 AND section=$2',
      [submissionId, section]);
    audit.log({ userId:req.user.id, userEmail:req.user.email, userRole:req.user.role,
      action:'unlock_section', entityType:'submission', entityId:submissionId,
      section, ip:audit.getIp(req) });
    res.json({ ok:true });
  } catch (err) { next(err); }
});

module.exports = router;
