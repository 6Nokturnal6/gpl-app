// Computes the Previsão / Sumário Geral from all other sections
// Returns structured summary rows for Excel and PDF

function hasText(...vals) {
  return vals.some((v) => v != null && String(v).trim() !== '');
}

function hasCounts(r, keys) {
  return keys.some((k) => (parseInt(r[k]) || 0) > 0);
}

/** Count only rows that look filled (ignore empty form seeds). */
function countFilled(arr, isFilled) {
  return (arr || []).filter(isFilled).length;
}

function isDesportoOrgFilled(r) {
  return hasText(r.nome_atividade, r.modalidade, r.data_local, r.objetivos)
    || hasCounts(r, ['estudantes_h', 'estudantes_m', 'docentes_h', 'docentes_m']);
}
function isDesportoPartFilled(r) {
  return hasText(r.nome_atividade, r.entidade_org, r.data_local, r.objetivos, r.classificacao)
    || hasCounts(r, ['estudantes_h', 'estudantes_m', 'docentes_h', 'docentes_m']);
}
function isCulturaOrgFilled(r) {
  return hasText(r.nome_atividade, r.tipo_atividade, r.data_local, r.objetivos)
    || hasCounts(r, ['estudantes_h', 'estudantes_m', 'docentes_h', 'docentes_m']);
}
function isCulturaPartFilled(r) {
  return hasText(r.nome_evento, r.entidade_org, r.data_local, r.objetivos, r.distincoes)
    || hasCounts(r, ['estudantes_h', 'estudantes_m', 'docentes_h', 'docentes_m']);
}
function isGrupoFilled(r) {
  return hasText(r.nome_grupo, r.expressao_artistica, r.objetivos, r.distincoes)
    || hasCounts(r, ['estudantes_h', 'estudantes_m', 'docentes_h', 'docentes_m']);
}
function isTunaFilled(r) {
  return hasText(r.nome_membro, r.cargo, r.ano_ingresso, r.objetivos, r.distincoes);
}

function computePrevisao(data) {
  const est = data.estudantes || [];
  const doc = data.docentes || [];
  const inv = data.investigadores || [];
  const fin = data.financas || {};
  const labs = data.infra?.labs || [];
  const salas = data.infra?.salas || [];
  const bibliotecas = data.infra?.bibliotecas || [];
  const computadores = data.infra?.computadores || [];
  const prev = data.previsao || [];
  const cult = data.cultura || {};
  const docRes = data.docentesResultados || {};
  const cta = data.cta || {};

  // 1. Students by degree (actual year)
  const byGrau = {};
  est.forEach(r => {
    const g = r.grau || 'Outro';
    if (!byGrau[g]) byGrau[g] = { h: 0, m: 0 };
    byGrau[g].h += parseInt(r.homens) || 0;
    byGrau[g].m += parseInt(r.mulheres) || 0;
  });

  // 2. Forecast by degree (next year)
  const prevByGrau = {};
  prev.forEach(r => {
    const g = r.grau || 'Outro';
    if (!prevByGrau[g]) prevByGrau[g] = { h: 0, m: 0 };
    prevByGrau[g].h += parseInt(r.homens) || 0;
    prevByGrau[g].m += parseInt(r.mulheres) || 0;
  });

  // Union of graus from both actual and forecast
  const allGraus = new Set([...Object.keys(byGrau), ...Object.keys(prevByGrau)]);
  const studentsByGrau = [...allGraus].sort().map((grau) => {
    const v = byGrau[grau] || { h: 0, m: 0 };
    const p = prevByGrau[grau] || { h: 0, m: 0 };
    return {
      grau,
      h2024: v.h, m2024: v.m, total2024: v.h + v.m,
      h2025: p.h, m2025: p.m, total2025: p.h + p.m,
    };
  });

  // 3. Staff totals
  const docTI = doc.filter(r => r.regime === 'tempo_inteiro');
  const docTP = doc.filter(r => r.regime === 'tempo_parcial');
  const sumDoc = (rows) => rows.reduce((a, r) => ({
    h: a.h + (parseInt(r.lic_h)||0) + (parseInt(r.mest_h)||0) + (parseInt(r.dout_h)||0) + (parseInt(r.pos_h)||0),
    m: a.m + (parseInt(r.lic_m)||0) + (parseInt(r.mest_m)||0) + (parseInt(r.dout_m)||0) + (parseInt(r.pos_m)||0),
  }), { h: 0, m: 0 });

  // 4. Researcher totals
  const invTI = inv.filter(r => r.regime === 'tempo_inteiro');
  const invTP = inv.filter(r => r.regime === 'tempo_parcial');
  const sumInv = (rows) => rows.reduce((a, r) => ({
    h: a.h + (parseInt(r.lic_h)||0) + (parseInt(r.mest_h)||0) + (parseInt(r.dout_h)||0) + (parseInt(r.pos_h)||0),
    m: a.m + (parseInt(r.lic_m)||0) + (parseInt(r.mest_m)||0) + (parseInt(r.dout_m)||0) + (parseInt(r.pos_m)||0),
  }), { h: 0, m: 0 });

  // 5. Finance totals
  const totalFunding = (parseFloat(fin.oge)||0) + (parseFloat(fin.doacoes)||0) +
                       (parseFloat(fin.creditos)||0) + (parseFloat(fin.proprias)||0);
  const totalDespCorrente = (parseFloat(fin.func_ensino)||0) + (parseFloat(fin.func_investig)||0) +
                    (parseFloat(fin.func_admin)||0) + (parseFloat(fin.sal_docentes)||0) +
                    (parseFloat(fin.sal_tecnicos)||0) + (parseFloat(fin.sal_outros)||0);
  const despInvest = (parseFloat(fin.desp_invest)||0) + (parseFloat(fin.desp_deprec)||0) +
                     (parseFloat(fin.desp_invest_outros)||0);
  const despReembolso = parseFloat(fin.desp_reembolso) || 0;
  // Quadro 1: funcionamento ≈ despesas correntes; investimento ≈ bloco investimento
  const despFuncionamento = totalDespCorrente;
  const totalDesp = totalDespCorrente + despInvest + despReembolso;

  // 6. Infra totals
  const totalLabs  = labs.reduce((a, r) => a + (parseInt(r.num_labs)||0), 0);
  const totalSalas = salas.reduce((a, r) => a + (parseInt(r.num_salas)||0), 0);
  const totalBibFisicas = bibliotecas.reduce((a, r) => a + (parseInt(r.num_fisicas)||0), 0);
  const totalBibVirtuais = bibliotecas.reduce((a, r) => a + (parseInt(r.num_virtuais)||0), 0);
  const totalComputadores = computadores.reduce((a, r) => a + (parseInt(r.num_computadores)||0), 0);

  // 7. Cultura totals (ignore empty seed rows)
  const countStudents = (arr) => arr.reduce((sum, r) => sum + ((parseInt(r.estudantes_h)||0) + (parseInt(r.estudantes_m)||0)), 0);
  const culturaDesportoOrgCount = countStudents(cult.desportoOrganizado || []);
  const culturaDesportoPartCount = countStudents(cult.desportoParticipacao || []);
  const culturaCulturaOrgCount = countStudents(cult.culturaOrganizada || []);
  const culturaCulturaPartCount = countStudents(cult.culturaParticipacao || []);
  const culturaGruposCount = countStudents(cult.grupos || []);
  const totalEventosDesportivos = countFilled(cult.desportoOrganizado, isDesportoOrgFilled)
    + countFilled(cult.desportoParticipacao, isDesportoPartFilled);
  const totalEventosCulturais = countFilled(cult.culturaOrganizada, isCulturaOrgFilled)
    + countFilled(cult.culturaParticipacao, isCulturaPartFilled);
  const totalGruposCulturais = countFilled(cult.grupos, isGrupoFilled);
  const totalTunaAcademica = countFilled(cult.tuna, isTunaFilled);
  const totalEstudantesDesporto = culturaDesportoOrgCount + culturaDesportoPartCount;
  const totalEstudantesCultura = culturaCulturaOrgCount + culturaCulturaPartCount + culturaGruposCount;

  const totalEst2024H = est.reduce((a, r) => a + (parseInt(r.homens)||0), 0);
  const totalEst2024M = est.reduce((a, r) => a + (parseInt(r.mulheres)||0), 0);
  const totalPrev2025H = prev.reduce((a, r) => a + (parseInt(r.homens)||0), 0);
  const totalPrev2025M = prev.reduce((a, r) => a + (parseInt(r.mulheres)||0), 0);

  const docTIr = sumDoc(docTI);
  const docTPr = sumDoc(docTP);
  const invTIr = sumInv(invTI);
  const invTPr = sumInv(invTP);

  return {
    studentsByGrau,
    studentTotals: { h2024: totalEst2024H, m2024: totalEst2024M, total2024: totalEst2024H + totalEst2024M, h2025: totalPrev2025H, m2025: totalPrev2025M, total2025: totalPrev2025H + totalPrev2025M },
    docentes: { ti: docTIr, tp: docTPr, total: { h: docTIr.h + docTPr.h, m: docTIr.m + docTPr.m } },
    investigadores: { ti: invTIr, tp: invTPr, total: { h: invTIr.h + invTPr.h, m: invTIr.m + invTPr.m } },
    financas: {
      oge: fin.oge||0, doacoes: fin.doacoes||0, creditos: fin.creditos||0, proprias: fin.proprias||0,
      totalFunding,
      totalDespCorrente,
      totalDesp,
      despFuncionamento,
      despInvest,
      desp_invest: fin.desp_invest||0,
      desp_deprec: fin.desp_deprec||0,
      desp_invest_outros: fin.desp_invest_outros||0,
      desp_reembolso: fin.desp_reembolso||0,
      func_ensino: fin.func_ensino||0, func_investig: fin.func_investig||0, func_admin: fin.func_admin||0,
      sal_docentes: fin.sal_docentes||0, sal_tecnicos: fin.sal_tecnicos||0, sal_outros: fin.sal_outros||0,
    },
    infraestrutura: {
      totalLabs, totalSalas,
      totalBibFisicas, totalBibVirtuais, totalComputadores,
    },
    cultura: {
      totalEventosDesportivos,
      totalEventosCulturais,
      totalGruposCulturais,
      totalTunaAcademica,
      totalEstudantesDesporto,
      totalEstudantesCultura,
      culturaDesportoOrgCount,
      culturaDesportoPartCount,
      culturaCulturaOrgCount,
      culturaCulturaPartCount,
      culturaGruposCount,
    },
    docentesQuadros: {
      a2GrupoEtario: (docRes.grupoEtario || []).length,
      a3AreaFormacao: (docRes.areaFormacao || []).length,
      a4CursoFormacao: (docRes.cursoFormacao || []).length,
      a5Categoria: (docRes.categoria || []).length,
      a7Relacao: (docRes.relacao || []).length,
      ctaB1Nivel: (cta.nivelFormacao || []).length,
      ctaB2Nacionalidade: (cta.nacionalidade || []).length,
      ctaB3Relacao: (cta.relacao || []).length,
      ctaB4GrupoEtario: (cta.grupoEtario || []).length,
    },
  };
}

/**
 * Merge numeric rows for university consolidation (e.g. C.2 / C.3 bands).
 * keyFn returns a stable string key; numericKeys are summed.
 */
function mergeNumericRows(rows, keyFn, numericKeys) {
  const map = new Map();
  (rows || []).forEach((r) => {
    const k = keyFn(r);
    if (!map.has(k)) {
      const copy = { ...r };
      numericKeys.forEach((nk) => { copy[nk] = parseInt(r[nk]) || 0; });
      map.set(k, copy);
    } else {
      const acc = map.get(k);
      numericKeys.forEach((nk) => { acc[nk] = (parseInt(acc[nk]) || 0) + (parseInt(r[nk]) || 0); });
    }
  });
  return [...map.values()];
}

const MOZ_ESTR_KEYS = ['moz_h', 'moz_m', 'estr_h', 'estr_m'];
const DEGREE_KEYS = ['lic_h', 'lic_m', 'mest_h', 'mest_m', 'dout_h', 'dout_m', 'pos_h', 'pos_m'];
const DEGREE3_KEYS = ['lic_h', 'lic_m', 'mest_h', 'mest_m', 'dout_h', 'dout_m'];
const PRODUCAO_KEYS = [
  'artigos_h', 'artigos_m', 'livros_h', 'livros_m', 'capitulos_h', 'capitulos_m',
  'conf_nac_h', 'conf_nac_m', 'conf_int_h', 'conf_int_m',
];

function consolidateInvestigadoresExtras(data) {
  const mozEstr = MOZ_ESTR_KEYS;
  const res = data.investigadoresResultados || {};
  const pesq = res.pesquisas || [];
  const pesqSum = pesq.reduce((a, r) => ({
    em_curso: a.em_curso + (parseInt(r.em_curso) || 0),
    concluidas: a.concluidas + (parseInt(r.concluidas) || 0),
  }), { em_curso: 0, concluidas: 0 });

  return {
    ...data,
    investigadoresGrupoEtario: mergeNumericRows(
      data.investigadoresGrupoEtario,
      (r) => `${r.regime}|${r.classe_idade}`,
      mozEstr
    ),
    investigadoresAreaFormacao: mergeNumericRows(
      data.investigadoresAreaFormacao,
      (r) => `${r.regime}|${r.area_formacao}`,
      mozEstr
    ),
    investigadoresResultados: {
      conferencias: mergeNumericRows(res.conferencias, (r) => r.tipo_conferencia, DEGREE_KEYS),
      producao: mergeNumericRows(res.producao, (r) => r.area_formacao, PRODUCAO_KEYS),
      pubsPares: mergeNumericRows(res.pubsPares, (r) => r.provincia || '', DEGREE_KEYS),
      pubsPorDocente: mergeNumericRows(res.pubsPorDocente, (r) => String(r.num_publicacoes), DEGREE3_KEYS),
      pubsTipo: mergeNumericRows(res.pubsTipo, (r) => r.tipo_publicacao, DEGREE3_KEYS),
      orientacoes: mergeNumericRows(res.orientacoes, (r) => `${r.tipo}|${r.num_orientacoes}`, DEGREE3_KEYS),
      pesquisas: (pesqSum.em_curso || pesqSum.concluidas) ? [{ ...pesqSum, sort_order: 0 }] : [],
      extensao: mergeNumericRows(res.extensao, (r) => r.accao, ['quantidade']),
      extensaoNivel: mergeNumericRows(res.extensaoNivel, (r) => r.nivel || '', ['quantidade']),
    },
  };
}

module.exports = {
  computePrevisao,
  mergeNumericRows,
  consolidateInvestigadoresExtras,
  isDesportoOrgFilled,
  isDesportoPartFilled,
  isCulturaOrgFilled,
  isCulturaPartFilled,
  isGrupoFilled,
  isTunaFilled,
  countFilled,
};
