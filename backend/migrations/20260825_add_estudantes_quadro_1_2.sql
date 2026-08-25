CREATE TABLE IF NOT EXISTS estudantes_vagas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  curso TEXT, duracao INTEGER, area TEXT, subarea TEXT,
  regime TEXT, nacionalidade TEXT, provincia TEXT, distrito TEXT, grau TEXT,
  vagas_preenchidas INTEGER DEFAULT 0,
  vagas_nao_preenchidas INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);
