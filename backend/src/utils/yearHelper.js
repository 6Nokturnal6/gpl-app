// yearHelper.js
// Helpers to determine current/next year and middleware to normalize ?year param

function currentYear() {
  return new Date().getFullYear();
}

function nextYear() {
  return currentYear() + 1;
}

function parseYearParam(q) {
  if (!q) return null;
  const y = parseInt(q, 10);
  if (Number.isNaN(y)) return null;
  if (y < 1900 || y > 3000) return null;
  return y;
}

function yearMiddleware(req, res, next) {
  const y = parseYearParam(req.query.year);
  req.year = y || currentYear();
  res.locals.year = req.year;
  next();
}

module.exports = { currentYear, nextYear, parseYearParam, yearMiddleware };
