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
};

export const SECTION_KEYS = Object.keys(SECTION_LABELS);
