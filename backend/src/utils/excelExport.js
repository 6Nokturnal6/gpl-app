const ExcelJS = require('exceljs');

const BLUE = '185FA5';
const LIGHT_BLUE = 'E6F1FB';
const GREEN = '3B6D11';
const LIGHT_GREEN = 'EAF3DE';
const GRAY = 'F1EFE8';

function headerStyle(bg = BLUE) {
  return {
    font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bg } },
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    }
  };
}

function cellStyle(bg = null) {
  return {
    font: { size: 10 },
    fill: bg ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bg } } : undefined,
    alignment: { vertical: 'middle' },
    border: {
      top: { style: 'hair' }, bottom: { style: 'hair' },
      left: { style: 'hair' }, right: { style: 'hair' }
    }
  };
}

function titleStyle() {
  return {
    font: { bold: true, size: 12, color: { argb: 'FF' + BLUE } },
    alignment: { horizontal: 'left', vertical: 'middle' }
  };
}

async function buildExcel(data) {
  const YEAR = new Date().getFullYear();
  const NEXT_YEAR = YEAR + 1;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'aGPLúrio';
  wb.created = new Date();

  // ── Sheet 1: ID IES ────────────────────────────────────────────────────────
  const wsId = wb.addWorksheet('ID IES');
  wsId.columns = [
    { width: 30 }, { width: 12 }, { width: 18 }, { width: 20 },
    { width: 18 }, { width: 18 }, { width: 28 }, { width: 25 }, { width: 20 }
  ];
  const titleRow = wsId.addRow(['A. Identificação da Entidade']);
  titleRow.getCell(1).style = titleStyle();
  wsId.mergeCells('A1:I1');
  wsId.addRow([]);
  const hdrs = wsId.addRow(['Nome','Sigla','NUIT','Ano início','Província','Distrito','Website','Contacto','Email']);
  hdrs.eachCell(c => Object.assign(c, { style: headerStyle() }));
  const d = data.idies || {};
  const dataRow = wsId.addRow([d.nome, d.sigla, d.nuit, d.ano_inicio, d.provincia, d.distrito, d.website, d.contacto, d.email]);
  dataRow.eachCell(c => { c.style = cellStyle(); });
  wsId.addRow([]);
  wsId.addRow(['Responsável pelo preenchimento']).getCell(1).style = { font: { bold: true, size: 10 } };
  const rHdrs = wsId.addRow(['Nome','Função','Email']);
  rHdrs.eachCell(c => { c.style = headerStyle(GRAY.replace('#','')) });
  wsId.addRow([d.responsavel, d.funcao, d.email_resp]);

  // ── Sheet 2: Estudantes ────────────────────────────────────────────────────
  const wsEst = wb.addWorksheet('Estudantes');
  wsEst.columns = [
    {width:28},{width:10},{width:22},{width:22},{width:14},{width:16},{width:18},{width:10},{width:10},{width:10}
  ];
  const estTitle = wsEst.addRow([`FOLHAS DE CÁLCULO PARA REPORTAGEM DE ESTATÍSTICA DAS IES — ANO ${YEAR}`]);
  estTitle.getCell(1).style = titleStyle();
  wsEst.mergeCells('A1:J1');
  wsEst.addRow(['1. ESTATÍSTICA SOBRE CORPO DISCENTE']).getCell(1).style = { font: { bold: true, size: 11 } };
  wsEst.mergeCells('A2:J2');
  wsEst.addRow([]);
  const estHdr = wsEst.addRow(['Nome do curso','Duração (anos)','Área ISCED','Sub-área','Regime','Província','Grau','Homens','Mulheres','Total']);
  estHdr.eachCell(c => { c.style = headerStyle(); });

  let totalH = 0, totalM = 0;
  (data.estudantes || []).forEach(r => {
    const t = (r.homens||0) + (r.mulheres||0);
    totalH += r.homens||0; totalM += r.mulheres||0;
    const row = wsEst.addRow([r.curso, r.duracao, r.area, r.subarea, r.regime, r.provincia, r.grau, r.homens||0, r.mulheres||0, t]);
    row.eachCell(c => { c.style = cellStyle(); });
    row.getCell(10).style = { ...cellStyle(LIGHT_BLUE), font: { bold: true } };
  });
  const totRow = wsEst.addRow(['TOTAL','','','','','','', totalH, totalM, totalH+totalM]);
  totRow.eachCell(c => { c.style = headerStyle(LIGHT_GREEN.replace('#','')); c.font = { bold: true, size: 10, color: { argb: 'FF' + GREEN } }; });

  // ── Sheet 3: Docentes ──────────────────────────────────────────────────────
  const wsDoc = wb.addWorksheet('Docentes');
  wsDoc.columns = [{width:18},{width:16},{width:16},{width:9},{width:9},{width:9},{width:9},{width:9},{width:9},{width:9},{width:9}];
  wsDoc.addRow(['Estatística sobre Corpo Docente']).getCell(1).style = titleStyle();
  wsDoc.mergeCells('A1:K1');
  ['tempo_inteiro','tempo_parcial'].forEach((regime, ri) => {
    wsDoc.addRow([]);
    wsDoc.addRow([ri === 0 ? 'Tempo Inteiro' : 'Tempo Parcial']).getCell(1).style = { font: { bold: true, size: 10 } };
    const dHdr = wsDoc.addRow(['Província','Distrito','Nacionalidade','Lic. H','Lic. M','Mest. H','Mest. M','Dout. H','Dout. M','Total H','Total M']);
    dHdr.eachCell(c => { c.style = headerStyle(); });
    (data.docentes || []).filter(r => r.regime === regime).forEach(r => {
      const row = wsDoc.addRow([r.provincia, r.distrito, r.nacionalidade,
        r.lic_h, r.lic_m, r.mest_h, r.mest_m, r.dout_h, r.dout_m,
        (r.lic_h||0)+(r.mest_h||0)+(r.dout_h||0),
        (r.lic_m||0)+(r.mest_m||0)+(r.dout_m||0)
      ]);
      row.eachCell(c => { c.style = cellStyle(); });
    });
  });

  // ── Sheet 4: Investigadores ────────────────────────────────────────────────
  const wsInv = wb.addWorksheet('Investigadores');
  wsInv.columns = [{width:18},{width:9},{width:9},{width:9},{width:9},{width:9},{width:9}];
  wsInv.addRow(['C - Dados sobre Investigação YEAR']).getCell(1).style = titleStyle();
  wsInv.mergeCells('A1:G1');
  ['tempo_inteiro','tempo_parcial'].forEach((regime, ri) => {
    wsInv.addRow([]);
    wsInv.addRow([ri === 0 ? 'Tempo Inteiro' : 'Tempo Parcial']).getCell(1).style = { font: { bold: true, size: 10 } };
    const iHdr = wsInv.addRow(['Nacionalidade','Lic. H','Lic. M','Mest. H','Mest. M','Dout. H','Dout. M']);
    iHdr.eachCell(c => { c.style = headerStyle(); });
    (data.investigadores || []).filter(r => r.regime === regime).forEach(r => {
      const row = wsInv.addRow([r.nacionalidade, r.lic_h, r.lic_m, r.mest_h, r.mest_m, r.dout_h, r.dout_m]);
      row.eachCell(c => { c.style = cellStyle(); });
    });
  });

  // ── Sheet 5: Finanças ──────────────────────────────────────────────────────
  const wsFin = wb.addWorksheet('Finanças');
  wsFin.columns = [{ width: 40 }, { width: 22 }];
  wsFin.addRow(['Dados sobre Recursos Financeiros']).getCell(1).style = titleStyle();
  wsFin.addRow([]);
  wsFin.addRow(['Quadro 2 — Financiamento por fonte']).getCell(1).style = { font: { bold: true, size: 10 } };
  const fHdr = wsFin.addRow(['Fonte', 'Valor em MT (×10³)']);
  fHdr.eachCell(c => { c.style = headerStyle(); });
  const fin = data.financas || {};
  [
    ['OGE (Orçamento Geral do Estado)', fin.oge],
    ['Doações (internas e externas)', fin.doacoes],
    ['Créditos', fin.creditos],
    ['Receitas próprias', fin.proprias],
  ].forEach(([label, val]) => {
    const row = wsFin.addRow([label, val || 0]);
    row.eachCell(c => { c.style = cellStyle(); });
    row.getCell(2).numFmt = '#,##0';
  });
  const fTot = wsFin.addRow(['Total', (fin.oge||0)+(fin.doacoes||0)+(fin.creditos||0)+(fin.proprias||0)]);
  fTot.eachCell(c => { c.style = headerStyle(LIGHT_BLUE); c.font = { bold: true, size: 10, color: { argb: 'FF' + BLUE } }; });
  fTot.getCell(2).numFmt = '#,##0';
  wsFin.addRow([]);
  wsFin.addRow(['Quadro 3 — Despesas correntes']).getCell(1).style = { font: { bold: true, size: 10 } };
  const dHdr2 = wsFin.addRow(['Categoria', 'Valor em MT (×10³)']);
  dHdr2.eachCell(c => { c.style = headerStyle(); });
  [
    ['Ensino', fin.func_ensino],['Investigação', fin.func_investig],
    ['Administração', fin.func_admin],['Salários – Docentes', fin.sal_docentes],
    ['Salários – Técnicos Administrativos', fin.sal_tecnicos],
  ].forEach(([label, val]) => {
    const row = wsFin.addRow([label, val || 0]);
    row.eachCell(c => { c.style = cellStyle(); });
    row.getCell(2).numFmt = '#,##0';
  });
  const totalDesp = (parseFloat(fin.func_ensino)||0)+(parseFloat(fin.func_investig)||0)+(parseFloat(fin.func_admin)||0)+(parseFloat(fin.sal_docentes)||0)+(parseFloat(fin.sal_tecnicos)||0);
  const dTot = wsFin.addRow(['Total despesas', totalDesp]);
  dTot.eachCell(c => { c.style = headerStyle(LIGHT_BLUE); c.font = { bold: true, size: 10, color: { argb: 'FF' + BLUE } }; });
  dTot.getCell(2).numFmt = '#,##0';

  // ── Sheet 6: Infraestrutura ────────────────────────────────────────────────
  const wsInfra = wb.addWorksheet('Infraestrutura');
  wsInfra.columns = [{width:32},{width:22},{width:22},{width:16},{width:16},{width:12}];
  wsInfra.addRow(['D - Infraestruturas']).getCell(1).style = titleStyle();
  wsInfra.addRow(['Quadro 1.1 — Laboratórios em funcionamento']).getCell(1).style = { font: { bold: true, size: 10 } };
  const lHdr = wsInfra.addRow(['Nome do laboratório','Área','Sub-área','Província','Distrito','N.º labs']);
  lHdr.eachCell(c => { c.style = headerStyle(); });
  (data.infra?.labs || []).forEach(r => {
    const row = wsInfra.addRow([r.nome, r.area, r.subarea, r.provincia, r.distrito, r.num_labs||0]);
    row.eachCell(c => { c.style = cellStyle(); });
  });
  wsInfra.addRow([]);
  wsInfra.addRow(['Quadro 1.2 — Salas de aulas']).getCell(1).style = { font: { bold: true, size: 10 } };
  const sHdr = wsInfra.addRow(['Unidade Orgânica','Província','Distrito','Grau','N.º salas']);
  sHdr.eachCell(c => { c.style = headerStyle(); });
  (data.infra?.salas || []).forEach(r => {
    const row = wsInfra.addRow([r.unidade, r.provincia, r.distrito, r.grau, r.num_salas||0]);
    row.eachCell(c => { c.style = cellStyle(); });
  });

  // ── Sheet 7: Previsão — individual courses ─────────────────────────────────
  const wsPrev = wb.addWorksheet('Previsão');
  wsPrev.columns = [{width:28},{width:10},{width:22},{width:18},{width:16},{width:10},{width:10},{width:10}];
  wsPrev.addRow([`PREVISÃO / PRELIMINAR PARA ${NEXT_YEAR}`]).getCell(1).style = titleStyle();
  wsPrev.mergeCells('A1:H1');
  const pHdr = wsPrev.addRow(['Nome do curso','Duração','Área','Grau','Província','Homens','Mulheres','Total']);
  pHdr.eachCell(c => { c.style = headerStyle(); });
  let ptH=0, ptM=0;
  (data.previsao || []).forEach(r => {
    const t=(r.homens||0)+(r.mulheres||0);
    ptH+=r.homens||0; ptM+=r.mulheres||0;
    const row=wsPrev.addRow([r.curso,r.duracao,r.area,r.grau,r.provincia,r.homens||0,r.mulheres||0,t]);
    row.eachCell(c=>{c.style=cellStyle();});
  });
  const ptRow=wsPrev.addRow(['TOTAL','','','','',ptH,ptM,ptH+ptM]);
  ptRow.eachCell(c=>{c.style=headerStyle(LIGHT_GREEN);c.font={bold:true,size:10,color:{argb:'FF'+GREEN}};});

  // ── Sheet 8: Sumário Geral — computed from all sections ────────────────────
  const { computePrevisao } = require('./previsaoSummary');
  const summary = computePrevisao(data);
  const wsSum = wb.addWorksheet('Sumário Geral');
  wsSum.columns = [{width:36},{width:14},{width:14},{width:14},{width:14},{width:14},{width:14}];

  function addSumTitle(text) {
    const r = wsSum.addRow([text]);
    r.getCell(1).style = titleStyle();
    wsSum.mergeCells(`A${r.number}:G${r.number}`);
    wsSum.addRow([]);
  }
  function addSumHdr(cols) {
    const r = wsSum.addRow(cols);
    r.eachCell(c=>{c.style=headerStyle();});
  }
  function addSumRow(vals, shade, isTotal) {
    const r = wsSum.addRow(vals);
    r.eachCell((c,i)=>{
      c.style = isTotal
        ? {font:{bold:true,size:10,color:{argb:'FF'+GREEN}},fill:{type:'pattern',pattern:'solid',fgColor:{argb:'FF'+LIGHT_GREEN}},alignment:{horizontal:i>1?'center':'left'},border:{top:{style:'thin'},bottom:{style:'thin'},left:{style:'thin'},right:{style:'thin'}}}
        : cellStyle(shade ? GRAY : null);
      if(i>1) c.alignment={horizontal:'center'};
    });
  }

  // Students 2024 vs 2025
  addSumTitle(`I. Estudantes — Comparação ${YEAR} vs ${NEXT_YEAR}`);
  addSumHdr([`Grau`,`H ${YEAR}`,`M ${YEAR}`,`Total ${YEAR}`,`H ${NEXT_YEAR}`,`M ${NEXT_YEAR}`,`Total ${NEXT_YEAR}`]);
  summary.studentsByGrau.forEach((r,i)=>addSumRow([r.grau,r.h2024,r.m2024,r.total2024,r.h2025,r.m2025,r.total2025],i%2===1));
  const st=summary.studentTotals;
  addSumRow(['TOTAL',st.h2024,st.m2024,st.total2024,st.h2025,st.m2025,st.total2025],false,true);
  wsSum.addRow([]);

  // Staff
  addSumTitle('II. Corpo Docente');
  addSumHdr(['Regime','Homens','Mulheres','Total','','','']);
  addSumRow(['Tempo Inteiro',summary.docentes.ti.h,summary.docentes.ti.m,summary.docentes.ti.h+summary.docentes.ti.m,'','',''],false);
  addSumRow(['Tempo Parcial',summary.docentes.tp.h,summary.docentes.tp.m,summary.docentes.tp.h+summary.docentes.tp.m,'','',''],true);
  addSumRow(['TOTAL',summary.docentes.total.h,summary.docentes.total.m,summary.docentes.total.h+summary.docentes.total.m,'','',''],false,true);
  wsSum.addRow([]);

  // Researchers
  addSumTitle('III. Investigadores');
  addSumHdr(['Regime','Homens','Mulheres','Total','','','']);
  addSumRow(['Tempo Inteiro',summary.investigadores.ti.h,summary.investigadores.ti.m,summary.investigadores.ti.h+summary.investigadores.ti.m,'','',''],false);
  addSumRow(['Tempo Parcial',summary.investigadores.tp.h,summary.investigadores.tp.m,summary.investigadores.tp.h+summary.investigadores.tp.m,'','',''],true);
  addSumRow(['TOTAL',summary.investigadores.total.h,summary.investigadores.total.m,summary.investigadores.total.h+summary.investigadores.total.m,'','',''],false,true);
  wsSum.addRow([]);

  // Finances
  addSumTitle('IV. Recursos Financeiros (MT × 10³)');
  addSumHdr(['Fonte / Categoria','Valor','','','','','']);
  [['OGE',summary.financas.oge],['Doações',summary.financas.doacoes],['Créditos',summary.financas.creditos],['Rec. próprias',summary.financas.proprias]]
    .forEach(([l,v],i)=>{ const r=wsSum.addRow([l,v,'','','','','']); r.eachCell((c,j)=>{c.style=cellStyle(i%2===1?GRAY:null);if(j===2){c.numFmt='#,##0';}}); });
  addSumRow(['Total Financiamento',summary.financas.totalFunding,'','','','',''],false,true);
  wsSum.addRow([]);
  [['Ensino',summary.financas.func_ensino],['Investigação',summary.financas.func_investig],['Administração',summary.financas.func_admin],['Sal. Docentes',summary.financas.sal_docentes],['Sal. Técnicos',summary.financas.sal_tecnicos]]
    .forEach(([l,v],i)=>{ const r=wsSum.addRow([l,v,'','','','','']); r.eachCell((c,j)=>{c.style=cellStyle(i%2===1?GRAY:null);if(j===2){c.numFmt='#,##0';}}); });
  addSumRow(['Total Despesas',summary.financas.totalDesp,'','','','',''],false,true);
  wsSum.addRow([]);

  // Infrastructure
  addSumTitle('V. Infraestrutura');
  addSumHdr(['Tipo','Total','','','','','']);
  addSumRow(['Laboratórios em funcionamento',summary.infraestrutura.totalLabs,'','','','',''],false);
  addSumRow(['Salas de aulas',summary.infraestrutura.totalSalas,'','','','',''],true);

  return wb;
}

module.exports = { buildExcel };
