// yearlyRollover.js
// Stub job to generate next-year submissions from templates or previous-year drafts.
// Usage: require and schedule in server entry (see docs).

async function runYearlyRollover(db, opts = {}) {
  const logger = opts.logger || console;
  const dryRun = !!opts.dryRun;
  const now = new Date();
  const nextYear = now.getFullYear() + 1;

  logger.info(`Starting yearly rollover for ${nextYear} (dryRun=${dryRun})`);

  // Example Postgres queries — adapt to your schema
  try {
    // 1) Find campuses (or institutions) that need a submission for nextYear
    const campuses = await db.query("SELECT id FROM campuses");

    for (const row of campuses.rows) {
      const campusId = row.id;

      // Check if a submission exists for nextYear
      const exists = await db.query(
        'SELECT 1 FROM submissions WHERE campus_id = $1 AND submission_year = $2 LIMIT 1',
        [campusId, nextYear]
      );
      if (exists.rows.length) {
        logger.info(`Campus ${campusId} already has submission for ${nextYear}`);
        continue;
      }

      // Find template submission (is_template = true) or latest previous year
      const template = await db.query(
        `SELECT * FROM submissions WHERE campus_id = $1 AND is_template = TRUE ORDER BY updated_at DESC LIMIT 1`,
        [campusId]
      );

      let base = null;
      if (template.rows.length) base = template.rows[0];
      else {
        // Fallback: latest submission from previous year
        const fallback = await db.query(
          `SELECT * FROM submissions WHERE campus_id = $1 ORDER BY submission_year DESC, updated_at DESC LIMIT 1`,
          [campusId]
        );
        if (fallback.rows.length) base = fallback.rows[0];
      }

      if (!base) {
        logger.warn(`No base submission found for campus ${campusId}; skipping`);
        continue;
      }

      if (dryRun) {
        logger.info(`Would clone submission ${base.id} for campus ${campusId} -> year ${nextYear}`);
        continue;
      }

      // Clone relevant fields to create a draft for nextYear.
      // Adjust column list according to your schema.
      const insertSql = `
        INSERT INTO submissions (campus_id, submission_year, data, status, is_template, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, 'draft', FALSE, 'system', now(), now())
        RETURNING id`;

      const dataToCopy = base.data || {};
      const res = await db.query(insertSql, [campusId, nextYear, dataToCopy]);
      const newId = res.rows[0].id;

      // Record audit log
      await db.query(
        `INSERT INTO audit_log (user_id, user_email, user_role, action, entity_type, entity_id, detail, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,now())`,
        ['system', 'system@local', 'system', 'generate_year', 'submission', newId, JSON.stringify({from: base.id, year: nextYear})]
      );

      logger.info(`Created submission ${newId} for campus ${campusId} year ${nextYear}`);
    }

    logger.info('Yearly rollover finished');
  } catch (err) {
    logger.error('Yearly rollover failed', err);
    throw err;
  }
}

module.exports = { runYearlyRollover };

// Optional: cron scheduler example (use in your server startup if SCHEDULER_ACTIVE=true):
// const cron = require('node-cron');
// if (process.env.SCHEDULER_ACTIVE === 'true') {
//   cron.schedule('5 0 1 1 *', async () => { // At 00:05 on Jan 1
//     await runYearlyRollover(db, { logger: console, dryRun: false });
//   });
// }
