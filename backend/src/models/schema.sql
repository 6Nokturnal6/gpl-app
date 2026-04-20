-- GPL-App Database Schema
-- Higher Education Statistics Collection System

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users (one per institution)
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email       TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,
  institution TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'institution',  -- 'institution' | 'admin'
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Submissions (one per user per year)
CREATE TABLE IF NOT EXISTS submissions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year        INTEGER NOT NULL DEFAULT 2024,
  status      TEXT NOT NULL DEFAULT 'draft',       -- 'draft' | 'submitted' | 'approved'
  submitted_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, year)
);

-- Section: Institution Identity
CREATE TABLE IF NOT EXISTS id_ies (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  nome          TEXT,
  sigla         TEXT,
  nuit          TEXT,
  ano_inicio    INTEGER,
  provincia     TEXT,
  distrito      TEXT,
  website       TEXT,
  contacto      TEXT,
  email         TEXT,
  responsavel   TEXT,
  funcao        TEXT,
  email_resp    TEXT,
  UNIQUE(submission_id)
);

-- Section: Students (one row per course)
CREATE TABLE IF NOT EXISTS estudantes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  curso         TEXT,
  duracao       INTEGER,
  area          TEXT,
  subarea       TEXT,
  regime        TEXT,
  provincia     TEXT,
  grau          TEXT,
  homens        INTEGER DEFAULT 0,
  mulheres      INTEGER DEFAULT 0,
  sort_order    INTEGER DEFAULT 0
);

-- Section: Teaching Staff
CREATE TABLE IF NOT EXISTS docentes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  regime        TEXT,  -- 'tempo_inteiro' | 'tempo_parcial'
  provincia     TEXT,
  distrito      TEXT,
  nacionalidade TEXT,
  lic_h         INTEGER DEFAULT 0,
  lic_m         INTEGER DEFAULT 0,
  mest_h        INTEGER DEFAULT 0,
  mest_m        INTEGER DEFAULT 0,
  dout_h        INTEGER DEFAULT 0,
  dout_m        INTEGER DEFAULT 0,
  sort_order    INTEGER DEFAULT 0
);

-- Section: Researchers
CREATE TABLE IF NOT EXISTS investigadores (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  regime        TEXT,  -- 'tempo_inteiro' | 'tempo_parcial'
  nacionalidade TEXT,
  lic_h         INTEGER DEFAULT 0,
  lic_m         INTEGER DEFAULT 0,
  mest_h        INTEGER DEFAULT 0,
  mest_m        INTEGER DEFAULT 0,
  dout_h        INTEGER DEFAULT 0,
  dout_m        INTEGER DEFAULT 0,
  sort_order    INTEGER DEFAULT 0
);

-- Section: Finances
CREATE TABLE IF NOT EXISTS financas (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id   UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  oge             NUMERIC DEFAULT 0,
  doacoes         NUMERIC DEFAULT 0,
  creditos        NUMERIC DEFAULT 0,
  proprias        NUMERIC DEFAULT 0,
  func_ensino     NUMERIC DEFAULT 0,
  func_investig   NUMERIC DEFAULT 0,
  func_admin      NUMERIC DEFAULT 0,
  sal_docentes    NUMERIC DEFAULT 0,
  sal_tecnicos    NUMERIC DEFAULT 0,
  desp_invest     NUMERIC DEFAULT 0,
  UNIQUE(submission_id)
);

-- Section: Infrastructure - Labs
CREATE TABLE IF NOT EXISTS infra_labs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  nome          TEXT,
  area          TEXT,
  subarea       TEXT,
  provincia     TEXT,
  distrito      TEXT,
  num_labs      INTEGER DEFAULT 0,
  sort_order    INTEGER DEFAULT 0
);

-- Section: Infrastructure - Classrooms
CREATE TABLE IF NOT EXISTS infra_salas (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  unidade       TEXT,
  provincia     TEXT,
  distrito      TEXT,
  grau          TEXT,
  num_salas     INTEGER DEFAULT 0,
  sort_order    INTEGER DEFAULT 0
);

-- Section: 2025 Forecast
CREATE TABLE IF NOT EXISTS previsao (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  curso         TEXT,
  duracao       INTEGER,
  area          TEXT,
  grau          TEXT,
  provincia     TEXT,
  homens        INTEGER DEFAULT 0,
  mulheres      INTEGER DEFAULT 0,
  sort_order    INTEGER DEFAULT 0
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_submissions_updated BEFORE UPDATE ON submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed admin user (password: admin123 — change immediately)
INSERT INTO users (email, password, institution, role)
VALUES (
  'admin@mined.gov.mz',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMlJbekRSselVggXte5cjpXK.e',
  'Ministério da Educação',
  'admin'
) ON CONFLICT DO NOTHING;
