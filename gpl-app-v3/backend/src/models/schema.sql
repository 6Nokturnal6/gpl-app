-- GPL-App Database Schema v3
-- Roles: superadmin | director_gpl | chefe_departamento

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Universities (one per IES)
CREATE TABLE IF NOT EXISTS universities (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome       TEXT NOT NULL,
  sigla      TEXT,
  nuit       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campuses / Departments (belong to a university)
CREATE TABLE IF NOT EXISTS campuses (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  nome          TEXT NOT NULL,
  provincia     TEXT,
  distrito      TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT UNIQUE NOT NULL,
  password      TEXT NOT NULL,
  nome          TEXT,
  institution   TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'chefe_departamento',
  university_id UUID REFERENCES universities(id),
  campus_id     UUID REFERENCES campuses(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Submissions (one per campus/user per year)
CREATE TABLE IF NOT EXISTS submissions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campus_id     UUID REFERENCES campuses(id),
  university_id UUID REFERENCES universities(id),
  year          INTEGER NOT NULL DEFAULT 2024,
  status        TEXT NOT NULL DEFAULT 'draft',
  submitted_at  TIMESTAMPTZ,
  reviewed_at   TIMESTAMPTZ,
  reviewed_by   UUID REFERENCES users(id),
  review_note   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, year)
);

CREATE TABLE IF NOT EXISTS id_ies (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  nome TEXT, sigla TEXT, nuit TEXT, ano_inicio INTEGER,
  provincia TEXT, distrito TEXT, website TEXT, contacto TEXT,
  email TEXT, responsavel TEXT, funcao TEXT, email_resp TEXT,
  UNIQUE(submission_id)
);

CREATE TABLE IF NOT EXISTS estudantes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  curso TEXT, duracao INTEGER, area TEXT, subarea TEXT,
  regime TEXT, provincia TEXT, grau TEXT,
  homens INTEGER DEFAULT 0, mulheres INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS docentes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  regime TEXT, provincia TEXT, distrito TEXT, nacionalidade TEXT,
  lic_h INTEGER DEFAULT 0, lic_m INTEGER DEFAULT 0,
  mest_h INTEGER DEFAULT 0, mest_m INTEGER DEFAULT 0,
  dout_h INTEGER DEFAULT 0, dout_m INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS investigadores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  regime TEXT, nacionalidade TEXT,
  lic_h INTEGER DEFAULT 0, lic_m INTEGER DEFAULT 0,
  mest_h INTEGER DEFAULT 0, mest_m INTEGER DEFAULT 0,
  dout_h INTEGER DEFAULT 0, dout_m INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS financas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  oge NUMERIC DEFAULT 0, doacoes NUMERIC DEFAULT 0,
  creditos NUMERIC DEFAULT 0, proprias NUMERIC DEFAULT 0,
  func_ensino NUMERIC DEFAULT 0, func_investig NUMERIC DEFAULT 0,
  func_admin NUMERIC DEFAULT 0, sal_docentes NUMERIC DEFAULT 0,
  sal_tecnicos NUMERIC DEFAULT 0, desp_invest NUMERIC DEFAULT 0,
  UNIQUE(submission_id)
);

CREATE TABLE IF NOT EXISTS infra_labs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  nome TEXT, area TEXT, subarea TEXT, provincia TEXT, distrito TEXT,
  num_labs INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS infra_salas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  unidade TEXT, provincia TEXT, distrito TEXT, grau TEXT,
  num_salas INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS previsao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  curso TEXT, duracao INTEGER, area TEXT, grau TEXT, provincia TEXT,
  homens INTEGER DEFAULT 0, mulheres INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0
);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_submissions_updated ON submissions;
CREATE TRIGGER trg_submissions_updated BEFORE UPDATE ON submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_users_updated ON users;
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed superadmin (password: admin123)
INSERT INTO users (email, password, nome, institution, role)
VALUES (
  'admin@mined.gov.mz',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMlJbekRSselVggXte5cjpXK.e',
  'Super Administrador',
  'Ministério da Educação',
  'superadmin'
) ON CONFLICT (email) DO UPDATE SET role='superadmin';
