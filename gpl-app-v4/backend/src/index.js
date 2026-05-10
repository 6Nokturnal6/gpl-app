require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes       = require('./routes/auth');
const submissionRoutes = require('./routes/submissions');
const exportRoutes     = require('./routes/export');
const adminRoutes      = require('./routes/admin');
const campusRoutes     = require('./routes/campuses');
const universityRoutes = require('./routes/universities');
const lockRoutes       = require('./routes/locks');
const auditRoutes      = require('./routes/auditlog');
const userRoutes       = require('./routes/users');

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

app.use('/api/auth',         authRoutes);
app.use('/api/submissions',  submissionRoutes);
app.use('/api/export',       exportRoutes);
app.use('/api/admin',        adminRoutes);
app.use('/api/campuses',     campusRoutes);
app.use('/api/universities', universityRoutes);
app.use('/api/locks',        lockRoutes);
app.use('/api/audit',        auditRoutes);
app.use('/api/users',        userRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', version: 4, app: 'aGPLúrio' }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`aGPLúrio API v4 running on port ${PORT}`));
