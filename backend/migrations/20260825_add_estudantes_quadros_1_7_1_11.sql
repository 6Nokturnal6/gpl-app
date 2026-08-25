CREATE TABLE IF NOT EXISTS estudantes_outras_necessidades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  curso TEXT, area TEXT, subarea TEXT, regime TEXT, provincia TEXT, distrito TEXT, grau TEXT, tipo_necessidade TEXT,
  homens INTEGER DEFAULT 0, mulheres INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS estudantes_provincia_conclusao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  provincia TEXT NOT NULL, ingresso_h INTEGER DEFAULT 0, ingresso_m INTEGER DEFAULT 0, matriculado_h INTEGER DEFAULT 0, matriculado_m INTEGER DEFAULT 0, graduado_h INTEGER DEFAULT 0, graduado_m INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS estudantes_provincia_naturalidade (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  provincia TEXT NOT NULL, ingresso_h INTEGER DEFAULT 0, ingresso_m INTEGER DEFAULT 0, matriculado_h INTEGER DEFAULT 0, matriculado_m INTEGER DEFAULT 0, graduado_h INTEGER DEFAULT 0, graduado_m INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS estudantes_faixa_etaria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  classe_idade TEXT NOT NULL, ingresso_h INTEGER DEFAULT 0, ingresso_m INTEGER DEFAULT 0, matriculado_h INTEGER DEFAULT 0, matriculado_m INTEGER DEFAULT 0, graduado_h INTEGER DEFAULT 0, graduado_m INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS estudantes_graduados_matricula (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  curso TEXT, area TEXT, subarea TEXT, regime TEXT, provincia TEXT, distrito TEXT, grau TEXT, ano_primeira_matricula TEXT, antes_2016 INTEGER DEFAULT 0,
  ano_2016 INTEGER DEFAULT 0, ano_2017 INTEGER DEFAULT 0, ano_2018 INTEGER DEFAULT 0, ano_2019 INTEGER DEFAULT 0, ano_2020 INTEGER DEFAULT 0, ano_2021 INTEGER DEFAULT 0, ano_2022 INTEGER DEFAULT 0, ano_2023 INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0
);
