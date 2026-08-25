export const CLASSES_IDADE = [
  'Inferior a 25 anos',
  '25 - 29',
  '30 - 34',
  '35 - 39',
  '40 - 44',
  '45 - 49',
  '50 - 54',
  '55 - 59',
  '60+',
];

export const AREAS_FORMACAO = [
  'Educação',
  'Artes e Humanidades',
  'Ciências Sociais, Jornalismo e Informação',
  'Negócios, Administração e Direito',
  'Ciências Naturais, Matemática e Estatística',
  'Tecnologias da Informação e Comunicação',
  'Engenharia, Produção e Construção',
  'Agricultura, recursos florestais,  pesqueiros e veterinária',
  'Saúde e Bem-Estar',
  'Serviços',
];

export const TIPOS_CONFERENCIA = ['Internacional', 'Nacional'];

export const TIPOS_PUBLICACAO = [
  'Artigos científicos com revisão de pares',
  'Livros',
  'Capítulos de livros',
  'Publicações em conferências',
];

export const NUM_BANDS = ['1', '2', '3', '4', '5', '6'];

export const TIPOS_ORIENTACAO = ['dissertacao', 'monografia', 'tese'];

export const ACOES_EXTENSAO = [
  'Divulgacao de actividade/ pesquisa na comunidade',
  'Prestacao de servicos a comunidade',
  'Prestacao de servicos a empresas',
  'Consultorias',
  'Inovações',
  'Outras',
];

function sumFields(rows) {
  return rows.reduce((a, r) => ({
    lic_h: a.lic_h + (parseInt(r.lic_h) || 0),
    lic_m: a.lic_m + (parseInt(r.lic_m) || 0),
    mest_h: a.mest_h + (parseInt(r.mest_h) || 0),
    mest_m: a.mest_m + (parseInt(r.mest_m) || 0),
    dout_h: a.dout_h + (parseInt(r.dout_h) || 0),
    dout_m: a.dout_m + (parseInt(r.dout_m) || 0),
    pos_h: a.pos_h + (parseInt(r.pos_h) || 0),
    pos_m: a.pos_m + (parseInt(r.pos_m) || 0),
  }), { lic_h: 0, lic_m: 0, mest_h: 0, mest_m: 0, dout_h: 0, dout_m: 0, pos_h: 0, pos_m: 0 });
}

export function computeC13(investigadores) {
  const rows = investigadores || [];
  const ti = sumFields(rows.filter((r) => r.regime === 'tempo_inteiro'));
  const tp = sumFields(rows.filter((r) => r.regime === 'tempo_parcial'));
  const total = sumFields(rows);
  return [
    { tipo_contrato: 'Tempo Inteiro', ...ti },
    { tipo_contrato: 'Tempo parcial', ...tp },
    { tipo_contrato: 'Total', ...total },
  ];
}

export function ensureGrupoEtario(rows) {
  const existing = rows || [];
  const result = [];
  ['tempo_inteiro', 'tempo_parcial'].forEach((regime) => {
    CLASSES_IDADE.forEach((classe_idade, i) => {
      const found = existing.find((r) => r.regime === regime && r.classe_idade === classe_idade);
      result.push(found || { regime, classe_idade, moz_h: 0, moz_m: 0, estr_h: 0, estr_m: 0, sort_order: i });
    });
  });
  return result;
}

export function ensureAreaFormacao(rows) {
  const existing = rows || [];
  const result = [];
  ['tempo_inteiro', 'tempo_parcial'].forEach((regime) => {
    AREAS_FORMACAO.forEach((area_formacao, i) => {
      const found = existing.find((r) => r.regime === regime && r.area_formacao === area_formacao);
      result.push(found || { regime, area_formacao, moz_h: 0, moz_m: 0, estr_h: 0, estr_m: 0, sort_order: i });
    });
  });
  return result;
}

export function ensureConferencias(rows) {
  const existing = rows || [];
  return TIPOS_CONFERENCIA.map((tipo_conferencia, i) => {
    const found = existing.find((r) => r.tipo_conferencia === tipo_conferencia);
    return found || {
      tipo_conferencia, lic_h: 0, lic_m: 0, mest_h: 0, mest_m: 0,
      dout_h: 0, dout_m: 0, pos_h: 0, pos_m: 0, sort_order: i,
    };
  });
}

export function ensureProducao(rows) {
  const existing = rows || [];
  return AREAS_FORMACAO.map((area_formacao, i) => {
    const found = existing.find((r) => r.area_formacao === area_formacao);
    return found || {
      area_formacao,
      artigos_h: 0, artigos_m: 0, livros_h: 0, livros_m: 0,
      capitulos_h: 0, capitulos_m: 0, conf_nac_h: 0, conf_nac_m: 0,
      conf_int_h: 0, conf_int_m: 0, sort_order: i,
    };
  });
}

export function ensurePubsPorDocente(rows) {
  const existing = rows || [];
  return NUM_BANDS.map((num_publicacoes, i) => {
    const found = existing.find((r) => String(r.num_publicacoes) === num_publicacoes);
    return found || {
      num_publicacoes, lic_h: 0, lic_m: 0, mest_h: 0, mest_m: 0,
      dout_h: 0, dout_m: 0, sort_order: i,
    };
  });
}

export function ensurePubsTipo(rows) {
  const existing = rows || [];
  return TIPOS_PUBLICACAO.map((tipo_publicacao, i) => {
    const found = existing.find((r) => r.tipo_publicacao === tipo_publicacao);
    return found || {
      tipo_publicacao, lic_h: 0, lic_m: 0, mest_h: 0, mest_m: 0,
      dout_h: 0, dout_m: 0, sort_order: i,
    };
  });
}

export function ensureOrientacoes(rows) {
  const existing = rows || [];
  const result = [];
  TIPOS_ORIENTACAO.forEach((tipo) => {
    NUM_BANDS.forEach((num_orientacoes, i) => {
      const found = existing.find((r) => r.tipo === tipo && String(r.num_orientacoes) === num_orientacoes);
      result.push(found || {
        tipo, num_orientacoes, lic_h: 0, lic_m: 0, mest_h: 0, mest_m: 0,
        dout_h: 0, dout_m: 0, sort_order: i,
      });
    });
  });
  return result;
}

export function ensureExtensao(rows) {
  const existing = rows || [];
  return ACOES_EXTENSAO.map((accao, i) => {
    const found = existing.find((r) => r.accao === accao);
    return found || { accao, quantidade: 0, sort_order: i };
  });
}

export function emptyPubsPares() {
  return { provincia: '', lic_h: 0, lic_m: 0, mest_h: 0, mest_m: 0, dout_h: 0, dout_m: 0, pos_h: 0, pos_m: 0 };
}

export function emptyPesquisa() {
  return { em_curso: 0, concluidas: 0 };
}

export function emptyExtensaoNivel() {
  return { nivel: '', quantidade: 0 };
}
