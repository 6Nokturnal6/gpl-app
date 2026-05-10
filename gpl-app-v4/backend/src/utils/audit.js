const db = require('../models/db');

async function log({ userId, userEmail, userRole, action, entityType, entityId, section, detail, ip }) {
  try {
    await db.query(
      `INSERT INTO audit_log (user_id,user_email,user_role,action,entity_type,entity_id,section,detail,ip_address)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [userId||null, userEmail||null, userRole||null, action,
       entityType||null, entityId||null, section||null,
       detail ? JSON.stringify(detail) : null, ip||null]
    );
  } catch (e) {
    console.error('Audit log error (non-fatal):', e.message);
  }
}

// Helper to extract IP from request
function getIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || null;
}

module.exports = { log, getIp };
