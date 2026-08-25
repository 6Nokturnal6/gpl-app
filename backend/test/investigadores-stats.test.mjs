import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const {
  computeC13, ensureGrupoEtario, ensureAreaFormacao, ensureConferencias,
  ensureProducao, ensurePubsPorDocente, ensurePubsTipo, ensureOrientacoes,
  ensureExtensao, CLASSES_IDADE, AREAS_FORMACAO, TIPOS_CONFERENCIA,
  TIPOS_PUBLICACAO, NUM_BANDS, TIPOS_ORIENTACAO, ACOES_EXTENSAO,
} = require('../src/utils/investigadoresStats.js');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const inv = [
  { regime: 'tempo_inteiro', nacionalidade: 'Moçambicana', lic_h: 2, lic_m: 1, mest_h: 3, mest_m: 0, dout_h: 1, dout_m: 1, pos_h: 0, pos_m: 0 },
  { regime: 'tempo_parcial', nacionalidade: 'Estrangeira', lic_h: 1, lic_m: 0, mest_h: 0, mest_m: 2, dout_h: 0, dout_m: 0, pos_h: 1, pos_m: 1 },
];

const c13 = computeC13(inv);
assert(c13.length === 3, 'C.1.3 should have 3 rows');
assert(c13[0].tipo_contrato === 'Tempo Inteiro' && c13[0].lic_h === 2, 'TI lic_h');
assert(c13[1].mest_m === 2, 'TP mest_m');
assert(c13[2].lic_h === 3 && c13[2].pos_m === 1, 'Total aggregation');

const etario = ensureGrupoEtario([]);
assert(etario.length === CLASSES_IDADE.length * 2, 'should seed all age bands x2 regimes');
assert(etario[0].classe_idade === CLASSES_IDADE[0], 'first age band');

const areas = ensureAreaFormacao([]);
assert(areas.length === AREAS_FORMACAO.length * 2, 'C.3 seed all areas x2');
assert(areas[0].area_formacao === AREAS_FORMACAO[0], 'first area');
assert(areas[AREAS_FORMACAO.length].regime === 'tempo_parcial', 'second half is TP');

const conf = ensureConferencias([]);
assert(conf.length === TIPOS_CONFERENCIA.length, 'C.4.1 seed');
assert(conf[0].tipo_conferencia === 'Internacional', 'internacional first');

const prod = ensureProducao([]);
assert(prod.length === AREAS_FORMACAO.length, 'C.4.2 seed');
assert('artigos_h' in prod[0] && 'conf_int_m' in prod[0], 'C.4.2 fields');

const pubsDoc = ensurePubsPorDocente([]);
assert(pubsDoc.length === NUM_BANDS.length, 'C.4.4 seed');
assert(pubsDoc[5].num_publicacoes === '6', 'band 6');

const pubsTipo = ensurePubsTipo([]);
assert(pubsTipo.length === TIPOS_PUBLICACAO.length, 'C.4.5 seed');

const orient = ensureOrientacoes([]);
assert(orient.length === TIPOS_ORIENTACAO.length * NUM_BANDS.length, 'C.5 seed');
assert(orient.filter((r) => r.tipo === 'tese').length === 6, 'C.5.3 has 6 bands');

const ext = ensureExtensao([]);
assert(ext.length === ACOES_EXTENSAO.length, 'C.6 extensao seed');
assert(ext[4].accao === 'Inovações', 'inovacoes row');

// preserve existing values
const existing = [{ regime: 'tempo_inteiro', area_formacao: 'Educação', moz_h: 5, moz_m: 2, estr_h: 1, estr_m: 0, sort_order: 0 }];
const merged = ensureAreaFormacao(existing);
assert(merged[0].moz_h === 5, 'preserves existing C.3 values');

console.log('All investigadores stats tests passed');
