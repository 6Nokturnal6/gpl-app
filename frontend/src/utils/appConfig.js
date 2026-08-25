export const APP_NAME = 'aGPLúrio';
export const CURRENT_YEAR = new Date().getFullYear();
export const NEXT_YEAR = CURRENT_YEAR + 1;
export const FORM_YEAR = CURRENT_YEAR;

export const SECTION_LABELS = {
  idies:          'ID IES',
  estudantes:     `Estudantes ${CURRENT_YEAR}`,
  docentes:       'Docentes',
  investigadores: 'Investigadores',
  financas:       'Finanças',
  infra:          'Infraestrutura',
  previsao:       `Previsão ${NEXT_YEAR}`,
  cultura:        'Desporto e Cultura',
};

export const SECTION_KEYS = Object.keys(SECTION_LABELS);

/** Sections chefes must mark as concluído (excludes idies — director's) */
export const LOCKABLE_SECTIONS = ['estudantes', 'docentes', 'investigadores', 'financas', 'infra', 'previsao', 'cultura'];
export const REQUIRED_LOCKS = LOCKABLE_SECTIONS.length;
