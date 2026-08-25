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
