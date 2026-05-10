const express = require('express');
const db = require('../models/db');
const { authenticate, requireChefe, requireDirector } = require('../middleware/auth');
const audit = require('../utils/audit');

const router = express.Router();
router.use(authenticate);

// GET /api/locks/:submissionId — get all locks for a submission
router.get('/:submissionId', async (req, res, next) => {
  try {
    const r = await db.query(
      'SELECT * FROM section_locks WHERE submission_id=$1', [req.params.submissionId]);
    res.json(r.rows);
  } catch (err) { next(err); }
});

// POST /api/locks/:submissionId/:section — lock a section (chefe)
router.post('/:submissionId/:section', requireChefe, async (req, res, next) => {
  try {
    const { submissionId, section } = req.params;
    await db.query(
      `INSERT INTO section_locks (submission_id, section, locked_by)
       VALUES ($1,$2,$3)
       ON CONFLICT (submission_id,section) DO UPDATE
         SET locked_by=$3, locked_at=NOW(), unlock_requested=FALSE`,
      [submissionId, section, req.user.id]);
    await audit.log({
      userId: req.user.id, userEmail: req.user.email, userRole: req.user.role,
      action: 'lock_section', entityType: 'submission', entityId: submissionId,
      section, ip: audit.getIp(req)
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /api/locks/:submissionId/:section/request-unlock — chefe requests unlock
router.post('/:submissionId/:section/request-unlock', requireChefe, async (req, res, next) => {
  try {
    const { submissionId, section } = req.params;
    await db.query(
      `UPDATE section_locks
       SET unlock_requested=TRUE, unlock_requested_at=NOW()
       WHERE submission_id=$1 AND section=$2`,
      [submissionId, section]);
    await audit.log({
      userId: req.user.id, userEmail: req.user.email, userRole: req.user.role,
      action: 'request_unlock', entityType: 'submission', entityId: submissionId,
      section, ip: audit.getIp(req)
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /api/locks/:submissionId/:section — unlock (director or superadmin)
router.delete('/:submissionId/:section', requireDirector, async (req, res, next) => {
  try {
    const { submissionId, section } = req.params;
    await db.query(
      'DELETE FROM section_locks WHERE submission_id=$1 AND section=$2',
      [submissionId, section]);
    await audit.log({
      userId: req.user.id, userEmail: req.user.email, userRole: req.user.role,
      action: 'unlock_section', entityType: 'submission', entityId: submissionId,
      section, ip: audit.getIp(req)
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
