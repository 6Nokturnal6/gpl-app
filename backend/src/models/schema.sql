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
  regime TEXT, nacionalidade TEXT, provincia TEXT, distrito TEXT, grau TEXT,
  homens INTEGER DEFAULT 0, mulheres INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0
);

-- Add missing columns if they don't exist
ALTER TABLE estudantes ADD COLUMN IF NOT EXISTS nacionalidade TEXT;
ALTER TABLE estudantes ADD COLUMN IF NOT EXISTS distrito TEXT;

CREATE TABLE IF NOT EXISTS estudantes_vagas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  curso TEXT, duracao INTEGER, area TEXT, subarea TEXT,
  regime TEXT, nacionalidade TEXT, provincia TEXT, distrito TEXT, grau TEXT,
  vagas_preenchidas INTEGER DEFAULT 0,
  vagas_nao_preenchidas INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS estudantes_curso_estatistica (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  curso TEXT, duracao INTEGER, area TEXT, subarea TEXT, regime TEXT,
  provincia TEXT, distrito TEXT, grau TEXT,
  ingresso_h INTEGER DEFAULT 0, ingresso_m INTEGER DEFAULT 0,
  matriculado_h INTEGER DEFAULT 0, matriculado_m INTEGER DEFAULT 0,
  graduado_h INTEGER DEFAULT 0, graduado_m INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS estudantes_nacionalidade_estatistica (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  nacionalidade TEXT NOT NULL,
  ingresso_h INTEGER DEFAULT 0, ingresso_m INTEGER DEFAULT 0,
  matriculado_h INTEGER DEFAULT 0, matriculado_m INTEGER DEFAULT 0,
  graduado_h INTEGER DEFAULT 0, graduado_m INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS estudantes_estrangeiros (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  curso TEXT, area TEXT, subarea TEXT, regime TEXT, pais TEXT, grau TEXT,
  ingresso_h INTEGER DEFAULT 0, ingresso_m INTEGER DEFAULT 0,
  matriculado_h INTEGER DEFAULT 0, matriculado_m INTEGER DEFAULT 0,
  graduado_h INTEGER DEFAULT 0, graduado_m INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS estudantes_necessidades_especiais (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  curso TEXT, area TEXT, subarea TEXT, regime TEXT, provincia TEXT, distrito TEXT, grau TEXT,
  cadeirante_h INTEGER DEFAULT 0, cadeirante_m INTEGER DEFAULT 0,
  visual_h INTEGER DEFAULT 0, visual_m INTEGER DEFAULT 0,
  auditiva_h INTEGER DEFAULT 0, auditiva_m INTEGER DEFAULT 0,
  outros_h INTEGER DEFAULT 0, outros_m INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS docentes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  regime TEXT, provincia TEXT, distrito TEXT, nacionalidade TEXT,
  lic_h INTEGER DEFAULT 0, lic_m INTEGER DEFAULT 0,
  mest_h INTEGER DEFAULT 0, mest_m INTEGER DEFAULT 0,
  dout_h INTEGER DEFAULT 0, dout_m INTEGER DEFAULT 0,
  pos_h INTEGER DEFAULT 0, pos_m INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0
);

-- Add Pós-Graduação columns if they don't exist
ALTER TABLE docentes ADD COLUMN IF NOT EXISTS pos_h INTEGER DEFAULT 0;
ALTER TABLE docentes ADD COLUMN IF NOT EXISTS pos_m INTEGER DEFAULT 0;

-- Docentes: quadros A2-A7 da folha "Docentes"
CREATE TABLE IF NOT EXISTS docentes_grupo_etario (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  classe_idade TEXT NOT NULL,
  moz_ti_h INTEGER DEFAULT 0, moz_ti_m INTEGER DEFAULT 0,
  moz_tp_h INTEGER DEFAULT 0, moz_tp_m INTEGER DEFAULT 0,
  estr_ti_h INTEGER DEFAULT 0, estr_ti_m INTEGER DEFAULT 0,
  estr_tp_h INTEGER DEFAULT 0, estr_tp_m INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS docentes_grupo_etario_grau (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  classe_idade TEXT NOT NULL,
  lic_ti_h INTEGER DEFAULT 0, lic_ti_m INTEGER DEFAULT 0,
  lic_tp_h INTEGER DEFAULT 0, lic_tp_m INTEGER DEFAULT 0,
  mest_ti_h INTEGER DEFAULT 0, mest_ti_m INTEGER DEFAULT 0,
  mest_tp_h INTEGER DEFAULT 0, mest_tp_m INTEGER DEFAULT 0,
  dout_ti_h INTEGER DEFAULT 0, dout_ti_m INTEGER DEFAULT 0,
  dout_tp_h INTEGER DEFAULT 0, dout_tp_m INTEGER DEFAULT 0,
  pos_ti_h INTEGER DEFAULT 0, pos_ti_m INTEGER DEFAULT 0,
  pos_tp_h INTEGER DEFAULT 0, pos_tp_m INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS docentes_area_formacao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  area_formacao TEXT NOT NULL,
  lic_h INTEGER DEFAULT 0, lic_m INTEGER DEFAULT 0,
  mest_h INTEGER DEFAULT 0, mest_m INTEGER DEFAULT 0,
  dout_h INTEGER DEFAULT 0, dout_m INTEGER DEFAULT 0,
  pos_h INTEGER DEFAULT 0, pos_m INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS docentes_curso_formacao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  curso_formacao TEXT NOT NULL,
  lic_h INTEGER DEFAULT 0, lic_m INTEGER DEFAULT 0,
  mest_h INTEGER DEFAULT 0, mest_m INTEGER DEFAULT 0,
  dout_h INTEGER DEFAULT 0, dout_m INTEGER DEFAULT 0,
  pos_h INTEGER DEFAULT 0, pos_m INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS docentes_categoria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  regime TEXT NOT NULL,
  categoria TEXT NOT NULL,
  homens INTEGER DEFAULT 0, mulheres INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS docentes_relacao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  relacao TEXT NOT NULL,
  lic_h INTEGER DEFAULT 0, lic_m INTEGER DEFAULT 0,
  mest_h INTEGER DEFAULT 0, mest_m INTEGER DEFAULT 0,
  dout_h INTEGER DEFAULT 0, dout_m INTEGER DEFAULT 0,
  pos_h INTEGER DEFAULT 0, pos_m INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

-- CTA: quadros B1-B4 da folha "Docentes"
CREATE TABLE IF NOT EXISTS cta_nivel_formacao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  regime TEXT NOT NULL,
  ensino_primario_h INTEGER DEFAULT 0, ensino_primario_m INTEGER DEFAULT 0,
  secundario_1_h INTEGER DEFAULT 0, secundario_1_m INTEGER DEFAULT 0,
  secundario_2_h INTEGER DEFAULT 0, secundario_2_m INTEGER DEFAULT 0,
  bacharel_h INTEGER DEFAULT 0, bacharel_m INTEGER DEFAULT 0,
  lic_h INTEGER DEFAULT 0, lic_m INTEGER DEFAULT 0,
  mest_h INTEGER DEFAULT 0, mest_m INTEGER DEFAULT 0,
  dout_h INTEGER DEFAULT 0, dout_m INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cta_nacionalidade (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  nacionalidade TEXT NOT NULL,
  ensino_primario_h INTEGER DEFAULT 0, ensino_primario_m INTEGER DEFAULT 0,
  secundario_1_h INTEGER DEFAULT 0, secundario_1_m INTEGER DEFAULT 0,
  secundario_2_h INTEGER DEFAULT 0, secundario_2_m INTEGER DEFAULT 0,
  bacharel_h INTEGER DEFAULT 0, bacharel_m INTEGER DEFAULT 0,
  lic_h INTEGER DEFAULT 0, lic_m INTEGER DEFAULT 0,
  mest_h INTEGER DEFAULT 0, mest_m INTEGER DEFAULT 0,
  dout_h INTEGER DEFAULT 0, dout_m INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cta_relacao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  relacao TEXT NOT NULL,
  ensino_primario_h INTEGER DEFAULT 0, ensino_primario_m INTEGER DEFAULT 0,
  secundario_1_h INTEGER DEFAULT 0, secundario_1_m INTEGER DEFAULT 0,
  secundario_2_h INTEGER DEFAULT 0, secundario_2_m INTEGER DEFAULT 0,
  bacharel_h INTEGER DEFAULT 0, bacharel_m INTEGER DEFAULT 0,
  lic_h INTEGER DEFAULT 0, lic_m INTEGER DEFAULT 0,
  mest_h INTEGER DEFAULT 0, mest_m INTEGER DEFAULT 0,
  dout_h INTEGER DEFAULT 0, dout_m INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cta_grupo_etario (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  classe_idade TEXT NOT NULL,
  moz_ti_h INTEGER DEFAULT 0, moz_ti_m INTEGER DEFAULT 0,
  moz_tp_h INTEGER DEFAULT 0, moz_tp_m INTEGER DEFAULT 0,
  estr_ti_h INTEGER DEFAULT 0, estr_ti_m INTEGER DEFAULT 0,
  estr_tp_h INTEGER DEFAULT 0, estr_tp_m INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS investigadores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  regime TEXT, nacionalidade TEXT,
  lic_h INTEGER DEFAULT 0, lic_m INTEGER DEFAULT 0,
  mest_h INTEGER DEFAULT 0, mest_m INTEGER DEFAULT 0,
  dout_h INTEGER DEFAULT 0, dout_m INTEGER DEFAULT 0,
  pos_h INTEGER DEFAULT 0, pos_m INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0
);

-- Add Pós-Graduação columns if they don't exist
ALTER TABLE investigadores ADD COLUMN IF NOT EXISTS pos_h INTEGER DEFAULT 0;
ALTER TABLE investigadores ADD COLUMN IF NOT EXISTS pos_m INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS investigadores_grupo_etario (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  regime TEXT NOT NULL,
  classe_idade TEXT NOT NULL,
  moz_h INTEGER DEFAULT 0,
  moz_m INTEGER DEFAULT 0,
  estr_h INTEGER DEFAULT 0,
  estr_m INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS investigadores_area_formacao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  regime TEXT NOT NULL,
  area_formacao TEXT NOT NULL,
  moz_h INTEGER DEFAULT 0,
  moz_m INTEGER DEFAULT 0,
  estr_h INTEGER DEFAULT 0,
  estr_m INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

-- C.4.1 Conferências
CREATE TABLE IF NOT EXISTS investigadores_conferencias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  tipo_conferencia TEXT NOT NULL,
  lic_h INTEGER DEFAULT 0, lic_m INTEGER DEFAULT 0,
  mest_h INTEGER DEFAULT 0, mest_m INTEGER DEFAULT 0,
  dout_h INTEGER DEFAULT 0, dout_m INTEGER DEFAULT 0,
  pos_h INTEGER DEFAULT 0, pos_m INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

-- C.4.2 Produção científica por área
CREATE TABLE IF NOT EXISTS investigadores_producao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  area_formacao TEXT NOT NULL,
  artigos_h INTEGER DEFAULT 0, artigos_m INTEGER DEFAULT 0,
  livros_h INTEGER DEFAULT 0, livros_m INTEGER DEFAULT 0,
  capitulos_h INTEGER DEFAULT 0, capitulos_m INTEGER DEFAULT 0,
  conf_nac_h INTEGER DEFAULT 0, conf_nac_m INTEGER DEFAULT 0,
  conf_int_h INTEGER DEFAULT 0, conf_int_m INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

-- C.4.3 Investigadores com publicações por pares (por província)
CREATE TABLE IF NOT EXISTS investigadores_pubs_pares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  provincia TEXT,
  lic_h INTEGER DEFAULT 0, lic_m INTEGER DEFAULT 0,
  mest_h INTEGER DEFAULT 0, mest_m INTEGER DEFAULT 0,
  dout_h INTEGER DEFAULT 0, dout_m INTEGER DEFAULT 0,
  pos_h INTEGER DEFAULT 0, pos_m INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

-- C.4.4 Publicações por docente (faixas 1–6)
CREATE TABLE IF NOT EXISTS investigadores_pubs_por_docente (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  num_publicacoes TEXT NOT NULL,
  lic_h INTEGER DEFAULT 0, lic_m INTEGER DEFAULT 0,
  mest_h INTEGER DEFAULT 0, mest_m INTEGER DEFAULT 0,
  dout_h INTEGER DEFAULT 0, dout_m INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

-- C.4.5 Publicações por tipo
CREATE TABLE IF NOT EXISTS investigadores_pubs_tipo (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  tipo_publicacao TEXT NOT NULL,
  lic_h INTEGER DEFAULT 0, lic_m INTEGER DEFAULT 0,
  mest_h INTEGER DEFAULT 0, mest_m INTEGER DEFAULT 0,
  dout_h INTEGER DEFAULT 0, dout_m INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

-- C.5 Orientações (dissertação / monografia / tese)
CREATE TABLE IF NOT EXISTS investigadores_orientacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  num_orientacoes TEXT NOT NULL,
  lic_h INTEGER DEFAULT 0, lic_m INTEGER DEFAULT 0,
  mest_h INTEGER DEFAULT 0, mest_m INTEGER DEFAULT 0,
  dout_h INTEGER DEFAULT 0, dout_m INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

-- C.6.1 Número de pesquisas
CREATE TABLE IF NOT EXISTS investigadores_pesquisas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  em_curso INTEGER DEFAULT 0,
  concluidas INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

-- C.6.1 Actividades de extensão (fixed actions)
CREATE TABLE IF NOT EXISTS investigadores_extensao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  accao TEXT NOT NULL,
  quantidade INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

-- C.6.2 Extensão por nível de formação
CREATE TABLE IF NOT EXISTS investigadores_extensao_nivel (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  nivel TEXT,
  quantidade INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS financas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  oge NUMERIC DEFAULT 0, doacoes NUMERIC DEFAULT 0,
  creditos NUMERIC DEFAULT 0, proprias NUMERIC DEFAULT 0,
  func_ensino NUMERIC DEFAULT 0, func_investig NUMERIC DEFAULT 0,
  func_admin NUMERIC DEFAULT 0, sal_docentes NUMERIC DEFAULT 0,
  sal_tecnicos NUMERIC DEFAULT 0, sal_outros NUMERIC DEFAULT 0, desp_invest NUMERIC DEFAULT 0,
  desp_deprec NUMERIC DEFAULT 0, desp_invest_outros NUMERIC DEFAULT 0, desp_reembolso NUMERIC DEFAULT 0,
  UNIQUE(submission_id)
);

-- Add administrative staff salary column if it doesn't exist
ALTER TABLE financas ADD COLUMN IF NOT EXISTS sal_tecnicos NUMERIC DEFAULT 0;
ALTER TABLE financas ADD COLUMN IF NOT EXISTS sal_outros NUMERIC DEFAULT 0;
ALTER TABLE financas ADD COLUMN IF NOT EXISTS desp_invest NUMERIC DEFAULT 0;
ALTER TABLE financas ADD COLUMN IF NOT EXISTS desp_deprec NUMERIC DEFAULT 0;
ALTER TABLE financas ADD COLUMN IF NOT EXISTS desp_invest_outros NUMERIC DEFAULT 0;
ALTER TABLE financas ADD COLUMN IF NOT EXISTS desp_reembolso NUMERIC DEFAULT 0;

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

CREATE TABLE IF NOT EXISTS infra_bibliotecas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  unidade TEXT, provincia TEXT, distrito TEXT,
  num_fisicas INTEGER DEFAULT 0, num_virtuais INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS infra_computadores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  unidade TEXT, provincia TEXT, distrito TEXT,
  num_computadores INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS previsao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  curso TEXT, duracao INTEGER, area TEXT, grau TEXT, provincia TEXT,
  homens INTEGER DEFAULT 0, mulheres INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0
);

-- Desporto e Cultura (8 sections)
CREATE TABLE IF NOT EXISTS desporto_organizado (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  nome_atividade TEXT, modalidade TEXT, data_local TEXT, objetivos TEXT,
  estudantes_h INTEGER DEFAULT 0, estudantes_m INTEGER DEFAULT 0,
  docentes_h INTEGER DEFAULT 0, docentes_m INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS desporto_participacao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  nome_atividade TEXT, entidade_org TEXT, data_local TEXT, objetivos TEXT,
  estudantes_h INTEGER DEFAULT 0, estudantes_m INTEGER DEFAULT 0,
  docentes_h INTEGER DEFAULT 0, docentes_m INTEGER DEFAULT 0,
  classificacao TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cultura_organizada (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  nome_atividade TEXT, tipo_atividade TEXT, data_local TEXT, objetivos TEXT,
  estudantes_h INTEGER DEFAULT 0, estudantes_m INTEGER DEFAULT 0,
  docentes_h INTEGER DEFAULT 0, docentes_m INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cultura_participacao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  nome_evento TEXT, entidade_org TEXT, data_local TEXT, objetivos TEXT,
  estudantes_h INTEGER DEFAULT 0, estudantes_m INTEGER DEFAULT 0,
  docentes_h INTEGER DEFAULT 0, docentes_m INTEGER DEFAULT 0,
  distincoes TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS grupos_culturais (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  nome_grupo TEXT, expressao_artistica TEXT, objetivos TEXT,
  estudantes_h INTEGER DEFAULT 0, estudantes_m INTEGER DEFAULT 0,
  docentes_h INTEGER DEFAULT 0, docentes_m INTEGER DEFAULT 0,
  distincoes TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tuna_academica (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  nome_membro TEXT, cargo TEXT, ano_ingresso INTEGER, objetivos TEXT,
  distincoes TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS estudantes_atividades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  nome_completo TEXT, num_estudante TEXT, curso TEXT, ano_frequencia TEXT, sexo TEXT,
  atividade TEXT, evento TEXT,
  sort_order INTEGER DEFAULT 0
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

-- Section locks (per section per submission)
CREATE TABLE IF NOT EXISTS section_locks (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  section       TEXT NOT NULL,  -- 'idies','estudantes','docentes', etc.
  locked_by     UUID REFERENCES users(id),
  locked_at     TIMESTAMPTZ DEFAULT NOW(),
  unlock_requested BOOLEAN DEFAULT FALSE,
  unlock_requested_at TIMESTAMPTZ,
  UNIQUE(submission_id, section)
);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id),
  user_email  TEXT,
  user_role   TEXT,
  action      TEXT NOT NULL,  -- 'login','logout','save_section','lock_section','unlock_section','submit','approve','reject','create_user','deactivate_user','request_unlock'
  entity_type TEXT,           -- 'submission','user','campus','university'
  entity_id   TEXT,
  section     TEXT,
  detail      JSONB,          -- full before/after for superadmin trail
  ip_address  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);

-- Users: add is_active flag
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deactivated_by UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret TEXT;

-- Token revocation and refresh-token tables
CREATE TABLE IF NOT EXISTS revoked_tokens (
  token TEXT PRIMARY KEY,
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT
);

CREATE TABLE IF NOT EXISTS revoked_jtis (
  jti TEXT PRIMARY KEY,
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT
);

CREATE TABLE IF NOT EXISTS issued_jtis (
  jti TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  token_id UUID PRIMARY KEY,
  token_hash TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  revoked BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_issued_jtis_issued_at ON issued_jtis(issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_revoked_jtis_revoked_at ON revoked_jtis(revoked_at DESC);

-- University-level ID IES (one per university, filled by Director GPL)
CREATE TABLE IF NOT EXISTS university_id_ies (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
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
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(university_id)
);

-- Section completion stored in DB (drives progress %)
-- section_locks already tracks this — we use locked=true as "concluido"
-- No new table needed; progress is computed from section_locks count

-- Ensure submissions always get university_id from user
-- (migration helper — update existing submissions that have null university_id)
UPDATE submissions s
SET university_id = u.university_id
FROM users u
WHERE s.user_id = u.id AND s.university_id IS NULL AND u.university_id IS NOT NULL;
