import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { computePrevisao, consolidateInvestigadoresExtras } = require('../src/utils/previsaoSummary.js');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const data = {
  estudantes: [{ grau: 'Licenciatura', homens: 100, mulheres: 80 }],
  previsao: [
    { grau: 'Licenciatura', homens: 110, mulheres: 90 },
    { grau: 'Mestrado', homens: 20, mulheres: 15 }, // previsão-only grau
  ],
  financas: {
    oge: 100, doacoes: 0, creditos: 0, proprias: 0,
    func_ensino: 10, func_investig: 5, func_admin: 5,
    sal_docentes: 20, sal_tecnicos: 10, sal_outros: 5,
    desp_invest: 50, desp_deprec: 10, desp_invest_outros: 0, desp_reembolso: 5,
  },
  cultura: {
    desportoOrganizado: [
      { nome_atividade: '', modalidade: '', estudantes_h: 0, estudantes_m: 0 }, // empty seed
      { nome_atividade: 'Torneio', estudantes_h: 10, estudantes_m: 5 },
    ],
    desportoParticipacao: [{ estudantes_h: 3, estudantes_m: 2 }], // counts via students
    culturaOrganizada: [{ nome_atividade: 'Feira', estudantes_h: 8, estudantes_m: 4 }],
    culturaParticipacao: [{}, {}], // empty seeds
    grupos: [{ nome_grupo: 'Coral', estudantes_h: 6, estudantes_m: 3 }],
    tuna: [{ nome_membro: 'A' }, { nome_membro: '' }, {}], // 1 filled
  },
  infra: {
    labs: [{ num_labs: 2 }],
    salas: [{ num_salas: 5 }],
    bibliotecas: [{ num_fisicas: 1, num_virtuais: 2 }],
    computadores: [{ num_computadores: 40 }],
  },
};

const summary = computePrevisao(data);
const cult = summary.cultura;

assert(cult.totalEventosDesportivos === 2, `desporto events: expected 2 (1 filled org + 1 part with students), got ${cult.totalEventosDesportivos}`);
assert(cult.totalEventosCulturais === 1, `cultura events: expected 1, got ${cult.totalEventosCulturais}`);
assert(cult.totalGruposCulturais === 1, `grupos: expected 1, got ${cult.totalGruposCulturais}`);
assert(cult.totalTunaAcademica === 1, `tuna: expected 1 filled, got ${cult.totalTunaAcademica}`);
assert(cult.totalEstudantesDesporto === 20, `estudantes desporto: ${cult.totalEstudantesDesporto}`);
assert(cult.totalEstudantesCultura === 21, `estudantes cultura: ${cult.totalEstudantesCultura}`);

assert(summary.studentsByGrau.some((r) => r.grau === 'Mestrado' && r.total2025 === 35 && r.total2024 === 0), 'previsão-only Mestrado missing from studentsByGrau');
assert(summary.financas.totalDespCorrente === 55, `corrente ${summary.financas.totalDespCorrente}`);
assert(summary.financas.totalDesp === 120, `grande total ${summary.financas.totalDesp}`);
assert(summary.infraestrutura.totalBibFisicas === 1 && summary.infraestrutura.totalComputadores === 40, 'infra totals');

const merged = consolidateInvestigadoresExtras({
  investigadoresGrupoEtario: [
    { regime: 'tempo_inteiro', classe_idade: '25 - 29', moz_h: 1, moz_m: 0, estr_h: 0, estr_m: 0 },
    { regime: 'tempo_inteiro', classe_idade: '25 - 29', moz_h: 2, moz_m: 1, estr_h: 1, estr_m: 0 },
  ],
  investigadoresAreaFormacao: [],
  investigadoresResultados: { pesquisas: [{ em_curso: 2, concluidas: 1 }, { em_curso: 3, concluidas: 0 }], extensao: [], extensaoNivel: [] },
});
assert(merged.investigadoresGrupoEtario.length === 1, 'should merge age bands');
assert(merged.investigadoresGrupoEtario[0].moz_h === 3 && merged.investigadoresGrupoEtario[0].moz_m === 1, 'sum moz');
assert(merged.investigadoresResultados.pesquisas[0].em_curso === 5, 'sum pesquisas');

const root = join(__dirname, '..');
const excel = readFileSync(join(root, 'src/utils/excelExport.js'), 'utf8');
const pdf = readFileSync(join(root, 'src/utils/pdfExport.js'), 'utf8');
assert(excel.includes("addSumTitle('VI. Desporto e Cultura')"), 'excel missing section VI');
assert(pdf.includes("subTitle('VI. Desporto e Cultura')"), 'pdf missing section VI');
assert(excel.includes('Bibliotecas físicas'), 'excel sumário missing bibliotecas');
assert(excel.includes('desp_invest'), 'excel missing desp_invest');

console.log('All cultura/aggregation summary tests passed');
