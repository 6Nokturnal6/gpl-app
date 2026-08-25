CREATE TABLE IF NOT EXISTS estudantes_cursos_curta_duracao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  curso TEXT, area TEXT, subarea TEXT, regime TEXT, provincia TEXT, distrito TEXT, duracao_meses INTEGER, grau TEXT,
  matriculado_h INTEGER DEFAULT 0, matriculado_m INTEGER DEFAULT 0, graduado_h INTEGER DEFAULT 0, graduado_m INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS estudantes_desistencias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  curso TEXT, area TEXT, subarea TEXT, regime TEXT, provincia TEXT, distrito TEXT, grau TEXT, causa TEXT,
  homens INTEGER DEFAULT 0, mulheres INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS estudantes_bolseiros_curso (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  curso TEXT, area TEXT, subarea TEXT, regime TEXT, nacionalidade TEXT, provincia TEXT, distrito TEXT, pais TEXT, tipo_bolsa TEXT, financiador TEXT, grau TEXT,
  ingresso_h INTEGER DEFAULT 0, ingresso_m INTEGER DEFAULT 0, matriculado_h INTEGER DEFAULT 0, matriculado_m INTEGER DEFAULT 0, graduado_h INTEGER DEFAULT 0, graduado_m INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS estudantes_bolseiros_faixa_etaria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  classe_idade TEXT NOT NULL, ingresso_h INTEGER DEFAULT 0, ingresso_m INTEGER DEFAULT 0, matriculado_h INTEGER DEFAULT 0, matriculado_m INTEGER DEFAULT 0, graduado_h INTEGER DEFAULT 0, graduado_m INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS estudantes_bolseiros_provincia (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  provincia TEXT NOT NULL, ingresso_h INTEGER DEFAULT 0, ingresso_m INTEGER DEFAULT 0, matriculado_h INTEGER DEFAULT 0, matriculado_m INTEGER DEFAULT 0, graduado_h INTEGER DEFAULT 0, graduado_m INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0
);
