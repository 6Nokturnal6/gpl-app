CREATE TABLE IF NOT EXISTS estudantes_curso_estatistica (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  curso TEXT, duracao INTEGER, area TEXT, subarea TEXT, regime TEXT, provincia TEXT, distrito TEXT, grau TEXT,
  ingresso_h INTEGER DEFAULT 0, ingresso_m INTEGER DEFAULT 0, matriculado_h INTEGER DEFAULT 0, matriculado_m INTEGER DEFAULT 0,
  graduado_h INTEGER DEFAULT 0, graduado_m INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS estudantes_nacionalidade_estatistica (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  nacionalidade TEXT NOT NULL, ingresso_h INTEGER DEFAULT 0, ingresso_m INTEGER DEFAULT 0,
  matriculado_h INTEGER DEFAULT 0, matriculado_m INTEGER DEFAULT 0, graduado_h INTEGER DEFAULT 0, graduado_m INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS estudantes_estrangeiros (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  curso TEXT, area TEXT, subarea TEXT, regime TEXT, pais TEXT, grau TEXT,
  ingresso_h INTEGER DEFAULT 0, ingresso_m INTEGER DEFAULT 0, matriculado_h INTEGER DEFAULT 0, matriculado_m INTEGER DEFAULT 0,
  graduado_h INTEGER DEFAULT 0, graduado_m INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS estudantes_necessidades_especiais (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  curso TEXT, area TEXT, subarea TEXT, regime TEXT, provincia TEXT, distrito TEXT, grau TEXT,
  cadeirante_h INTEGER DEFAULT 0, cadeirante_m INTEGER DEFAULT 0, visual_h INTEGER DEFAULT 0, visual_m INTEGER DEFAULT 0,
  auditiva_h INTEGER DEFAULT 0, auditiva_m INTEGER DEFAULT 0, outros_h INTEGER DEFAULT 0, outros_m INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0
);
