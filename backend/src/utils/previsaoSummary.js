// Computes the Previsão sheet from all other sections
// Returns structured summary rows for Excel and PDF

function computePrevisao(data) {
  const est = data.estudantes || [];
  const doc = data.docentes || [];
  const inv = data.investigadores || [];
  const fin = data.financas || {};
  const labs = data.infra?.labs || [];
  const salas = data.infra?.salas || [];
  const prev = data.previsao || [];

  // 1. Students by degree (2024 actual)
  const byGrau = {};
  est.forEach(r => {
    const g = r.grau || 'Outro';
    if (!byGrau[g]) byGrau[g] = { h: 0, m: 0 };
    byGrau[g].h += parseInt(r.homens) || 0;
    byGrau[g].m += parseInt(r.mulheres) || 0;
  });

  // 2. Forecast by degree (2025)
  const prevByGrau = {};
  prev.forEach(r => {
    const g = r.grau || 'Outro';
    if (!prevByGrau[g]) prevByGrau[g] = { h: 0, m: 0 };
    prevByGrau[g].h += parseInt(r.homens) || 0;
    prevByGrau[g].m += parseInt(r.mulheres) || 0;
  });

  // 3. Staff totals
  const docTI = doc.filter(r => r.regime === 'tempo_inteiro');
  const docTP = doc.filter(r => r.regime === 'tempo_parcial');
  const sumDoc = (rows) => rows.reduce((a, r) => ({
    h: a.h + (r.lic_h||0) + (r.mest_h||0) + (r.dout_h||0),
    m: a.m + (r.lic_m||0) + (r.mest_m||0) + (r.dout_m||0),
  }), { h: 0, m: 0 });

  // 4. Researcher totals
  const invTI = inv.filter(r => r.regime === 'tempo_inteiro');
  const invTP = inv.filter(r => r.regime === 'tempo_parcial');
  const sumInv = (rows) => rows.reduce((a, r) => ({
    h: a.h + (r.lic_h||0) + (r.mest_h||0) + (r.dout_h||0),
    m: a.m + (r.lic_m||0) + (r.mest_m||0) + (r.dout_m||0),
  }), { h: 0, m: 0 });

  // 5. Finance totals
  const totalFunding = (parseFloat(fin.oge)||0) + (parseFloat(fin.doacoes)||0) +
                       (parseFloat(fin.creditos)||0) + (parseFloat(fin.proprias)||0);
  const totalDesp = (parseFloat(fin.func_ensino)||0) + (parseFloat(fin.func_investig)||0) +
                    (parseFloat(fin.func_admin)||0) + (parseFloat(fin.sal_docentes)||0) +
                    (parseFloat(fin.sal_tecnicos)||0);

  // 6. Infra totals
  const totalLabs  = labs.reduce((a, r) => a + (parseInt(r.num_labs)||0), 0);
  const totalSalas = salas.reduce((a, r) => a + (parseInt(r.num_salas)||0), 0);

  const totalEst2024H = est.reduce((a, r) => a + (parseInt(r.homens)||0), 0);
  const totalEst2024M = est.reduce((a, r) => a + (parseInt(r.mulheres)||0), 0);
  const totalPrev2025H = prev.reduce((a, r) => a + (parseInt(r.homens)||0), 0);
  const totalPrev2025M = prev.reduce((a, r) => a + (parseInt(r.mulheres)||0), 0);

  const docTIr = sumDoc(docTI);
  const docTPr = sumDoc(docTP);
  const invTIr = sumInv(invTI);
  const invTPr = sumInv(invTP);

  return {
    studentsByGrau: Object.entries(byGrau).map(([grau, v]) => ({
      grau,
      h2024: v.h, m2024: v.m, total2024: v.h + v.m,
      h2025: prevByGrau[grau]?.h || 0,
      m2025: prevByGrau[grau]?.m || 0,
      total2025: (prevByGrau[grau]?.h || 0) + (prevByGrau[grau]?.m || 0),
    })),
    studentTotals: { h2024: totalEst2024H, m2024: totalEst2024M, total2024: totalEst2024H + totalEst2024M, h2025: totalPrev2025H, m2025: totalPrev2025M, total2025: totalPrev2025H + totalPrev2025M },
    docentes: { ti: docTIr, tp: docTPr, total: { h: docTIr.h + docTPr.h, m: docTIr.m + docTPr.m } },
    investigadores: { ti: invTIr, tp: invTPr, total: { h: invTIr.h + invTPr.h, m: invTIr.m + invTPr.m } },
    financas: { oge: fin.oge||0, doacoes: fin.doacoes||0, creditos: fin.creditos||0, proprias: fin.proprias||0, totalFunding, totalDesp, func_ensino: fin.func_ensino||0, func_investig: fin.func_investig||0, func_admin: fin.func_admin||0, sal_docentes: fin.sal_docentes||0, sal_tecnicos: fin.sal_tecnicos||0 },
    infraestrutura: { totalLabs, totalSalas },
  };
}

module.exports = { computePrevisao };
