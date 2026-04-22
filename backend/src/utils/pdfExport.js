const PDFDocument = require('pdfkit');

const APP = 'aGPLúrio';
const BLUE = '#185FA5';
const LIGHT_BLUE = '#E6F1FB';
const GREEN = '#3B6D11';
const LIGHT_GREEN = '#EAF3DE';
const GRAY = '#F1EFE8';
const DARK = '#1a1a1a';
const MID = '#555';
const BORDER = '#d0d0d0';

function buildPdf(data, res) {
  const NOW = new Date();
  const YEAR = NOW.getFullYear();
  const NEXT_YEAR = YEAR + 1;
  const DATE_STR = NOW.toLocaleDateString('pt-MZ', { dateStyle: 'long' });

  // NO bufferPages — that caused the blank duplicate pages
  const doc = new PDFDocument({ size: 'A4', margin: 40, autoFirstPage: true });
  doc.pipe(res);

  const W = doc.page.width - 80;
  let pageNum = 0;

  function addPageNum() {
    pageNum++;
    doc.save();
    doc.fillColor('#aaa').fontSize(8)
      .text(`aGPLúrio  ·  Página ${pageNum}`, 40, doc.page.height - 28, { width: W, align: 'center' });
    doc.restore();
  }

  function drawHeader() {
    doc.save();
    doc.rect(40, 40, W, 48).fill(BLUE);
    doc.fillColor('#fff').fontSize(13).font('Helvetica-Bold')
      .text(`${APP} — Formulário de Recolha Estatística ${YEAR}`, 52, 48, { width: W - 24 });
    doc.fillColor('#B5D4F4').fontSize(9).font('Helvetica')
      .text('Sistema de Recolha de Dados do Ensino Superior de Moçambique', 52, 64);
    doc.restore();
    doc.moveDown(3.8);
  }

  function newSection(title) {
    doc.addPage();
    addPageNum();
    drawHeader();
    doc.fillColor(BLUE).fontSize(12).font('Helvetica-Bold').text(title, 40, doc.y);
    doc.moveDown(0.3);
    doc.rect(40, doc.y, W, 1).fill(BLUE);
    doc.moveDown(0.7);
    doc.fillColor(DARK).font('Helvetica').fontSize(10);
  }

  function subTitle(text) {
    doc.fillColor(MID).fontSize(10).font('Helvetica-Bold').text(text);
    doc.moveDown(0.3);
    doc.fillColor(DARK).font('Helvetica').fontSize(10);
  }

  function checkPage(neededPx = 30) {
    if (doc.y > doc.page.height - 60 - neededPx) {
      doc.addPage();
      addPageNum();
      drawHeader();
    }
  }

  function infoRow(label, value) {
    checkPage();
    const y = doc.y;
    doc.fillColor(MID).fontSize(9).text(label, 40, y, { width: 155 });
    doc.fillColor(DARK).fontSize(9).font('Helvetica-Bold').text(value || '—', 200, y, { width: W - 160 });
    doc.font('Helvetica');
    doc.moveDown(0.38);
  }

  function tableHeader(cols) {
    checkPage(20);
    const y = doc.y;
    doc.rect(40, y, W, 16).fill(BLUE);
    let x = 40;
    cols.forEach(col => {
      doc.fillColor('#fff').fontSize(8).font('Helvetica-Bold')
        .text(col.label, x + 3, y + 4, { width: col.w - 6, align: col.align || 'left' });
      x += col.w;
    });
    doc.y = y + 16;
    doc.fillColor(DARK).font('Helvetica');
  }

  function tableRow(cols, values, shade) {
    checkPage(16);
    const y = doc.y;
    if (shade) doc.rect(40, y, W, 14).fill(GRAY);
    doc.rect(40, y, W, 14).stroke(BORDER);
    let x = 40;
    cols.forEach((col, i) => {
      const val = String(values[i] ?? '—');
      doc.fillColor(col.total ? BLUE : DARK).fontSize(8)
        .font(col.total ? 'Helvetica-Bold' : 'Helvetica')
        .text(val, x + 3, y + 3, { width: col.w - 6, align: col.align || 'left' });
      x += col.w;
    });
    doc.y = y + 14;
  }

  function totalRow(cols, values) {
    checkPage(18);
    const y = doc.y;
    doc.rect(40, y, W, 16).fill(LIGHT_GREEN);
    let x = 40;
    cols.forEach((col, i) => {
      doc.fillColor(GREEN).fontSize(8).font('Helvetica-Bold')
        .text(String(values[i] ?? ''), x + 3, y + 4, { width: col.w - 6, align: col.align || 'left' });
      x += col.w;
    });
    doc.y = y + 18;
  }

  function finRow(label, value, isTotal) {
    checkPage(20);
    const y = doc.y;
    const h = isTotal ? 18 : 16;
    if (isTotal) doc.rect(40, y, W, h).fill(LIGHT_BLUE);
    else doc.rect(40, y, W, h).stroke(BORDER);
    doc.fillColor(isTotal ? BLUE : DARK).fontSize(9)
      .font(isTotal ? 'Helvetica-Bold' : 'Helvetica')
      .text(label, 44, y + (isTotal ? 5 : 4), { width: W - 115 });
    doc.fillColor(isTotal ? BLUE : DARK).font('Helvetica-Bold').fontSize(9)
      .text(Number(value || 0).toLocaleString('pt-MZ') + ' MT×10³', 40 + W - 110, y + (isTotal ? 5 : 4), { width: 100, align: 'right' });
    doc.y = y + h + 1;
    doc.font('Helvetica');
  }

  // ── Cover page ──────────────────────────────────────────────────────────────
  addPageNum();
  const d = data.idies || {};
  doc.rect(40, 40, W, 50).fill(BLUE);
  doc.fillColor('#fff').fontSize(16).font('Helvetica-Bold')
    .text(`Formulário de Recolha Estatística`, 52, 46, { width: W - 24 });
  doc.fillColor('#B5D4F4').fontSize(11).font('Helvetica')
    .text(`Ano Lectivo ${YEAR}`, 52, 66);

  doc.moveDown(4.5);
  doc.fillColor(BLUE).fontSize(18).font('Helvetica-Bold')
    .text(d.nome || 'Instituição de Ensino Superior', 40, doc.y, { width: W });
  doc.fillColor(MID).fontSize(12).font('Helvetica').text(d.sigla || '', { width: W });

  doc.moveDown(1.5);
  doc.rect(40, doc.y, W, 0.5).fill(BORDER);
  doc.moveDown(0.8);

  [['NUIT', d.nuit], ['Ano de início', d.ano_inicio], ['Província', d.provincia],
   ['Distrito', d.distrito], ['Website', d.website], ['Contacto', d.contacto], ['Email', d.email]]
    .forEach(([l, v]) => infoRow(l, v));

  doc.moveDown(0.8);
  doc.fillColor(MID).fontSize(9).font('Helvetica-Bold').text('Responsável pelo preenchimento');
  doc.moveDown(0.3);
  [['Nome', d.responsavel], ['Função', d.funcao], ['Email', d.email_resp]]
    .forEach(([l, v]) => infoRow(l, v));

  doc.moveDown(2);
  doc.fillColor('#aaa').fontSize(8)
    .text(`Gerado em ${DATE_STR} via ${APP}`, { align: 'center' });

  // ── Estudantes ──────────────────────────────────────────────────────────────
  newSection(`1. Estatística sobre Corpo Discente — ${YEAR}`);
  subTitle('Estudantes por curso, género, regime e grau');
  const estCols = [
    {label:'Nome do curso',w:120},{label:'Dur.',w:28,align:'center'},
    {label:'Área',w:72},{label:'Regime',w:55},{label:'Grau',w:72},
    {label:'H',w:26,align:'center'},{label:'M',w:26,align:'center'},
    {label:'Total',w:36,align:'center',total:true},
  ];
  tableHeader(estCols);
  let tH=0, tM=0;
  (data.estudantes||[]).forEach((r,i) => {
    const h=parseInt(r.homens)||0, m=parseInt(r.mulheres)||0;
    tH+=h; tM+=m;
    tableRow(estCols,[r.curso,r.duracao,r.area,r.regime,r.grau,h,m,h+m],i%2===1);
  });
  totalRow(estCols,['TOTAL','','','','',tH,tM,tH+tM]);

  // ── Docentes ────────────────────────────────────────────────────────────────
  newSection(`A. Corpo Docente — ${YEAR}`);
  subTitle('Docentes por regime, grau académico e género');
  const docCols = [
    {label:'Regime',w:68},{label:'Província',w:58},{label:'Nacionalidade',w:68},
    {label:'Lic.H',w:30,align:'center'},{label:'Lic.M',w:30,align:'center'},
    {label:'Mest.H',w:32,align:'center'},{label:'Mest.M',w:32,align:'center'},
    {label:'Dout.H',w:32,align:'center'},{label:'Dout.M',w:32,align:'center'},
    {label:'Tot.',w:33,align:'center',total:true},
  ];
  tableHeader(docCols);
  (data.docentes||[]).forEach((r,i) => {
    const tot=(r.lic_h||0)+(r.lic_m||0)+(r.mest_h||0)+(r.mest_m||0)+(r.dout_h||0)+(r.dout_m||0);
    tableRow(docCols,[r.regime==='tempo_inteiro'?'T. Inteiro':'T. Parcial',r.provincia,r.nacionalidade,r.lic_h,r.lic_m,r.mest_h,r.mest_m,r.dout_h,r.dout_m,tot],i%2===1);
  });

  // ── Investigadores ──────────────────────────────────────────────────────────
  newSection(`C. Investigadores — ${YEAR}`);
  subTitle('Investigadores por regime, nacionalidade e género');
  const invCols = [
    {label:'Regime',w:80},{label:'Nacionalidade',w:88},
    {label:'Lic.H',w:36,align:'center'},{label:'Lic.M',w:36,align:'center'},
    {label:'Mest.H',w:38,align:'center'},{label:'Mest.M',w:38,align:'center'},
    {label:'Dout.H',w:38,align:'center'},{label:'Dout.M',w:38,align:'center'},
    {label:'Total',w:43,align:'center',total:true},
  ];
  tableHeader(invCols);
  (data.investigadores||[]).forEach((r,i) => {
    const tot=(r.lic_h||0)+(r.lic_m||0)+(r.mest_h||0)+(r.mest_m||0)+(r.dout_h||0)+(r.dout_m||0);
    tableRow(invCols,[r.regime==='tempo_inteiro'?'T. Inteiro':'T. Parcial',r.nacionalidade,r.lic_h,r.lic_m,r.mest_h,r.mest_m,r.dout_h,r.dout_m,tot],i%2===1);
  });

  // ── Finanças ────────────────────────────────────────────────────────────────
  newSection(`Recursos Financeiros — ${YEAR}`);
  const fin = data.financas || {};
  subTitle('Financiamento por fonte');
  doc.moveDown(0.2);
  finRow('OGE (Orçamento Geral do Estado)', fin.oge);
  finRow('Doações (internas e externas)', fin.doacoes);
  finRow('Créditos', fin.creditos);
  finRow('Receitas próprias', fin.proprias);
  finRow('Total financiamento', (fin.oge||0)+(fin.doacoes||0)+(fin.creditos||0)+(fin.proprias||0), true);
  doc.moveDown(1);
  subTitle('Despesas correntes');
  doc.moveDown(0.2);
  finRow('Ensino', fin.func_ensino);
  finRow('Investigação', fin.func_investig);
  finRow('Administração', fin.func_admin);
  finRow('Salários – Docentes', fin.sal_docentes);
  finRow('Salários – Técnicos Administrativos', fin.sal_tecnicos);
  finRow('Total despesas', (fin.func_ensino||0)+(fin.func_investig||0)+(fin.func_admin||0)+(fin.sal_docentes||0)+(fin.sal_tecnicos||0), true);

  // ── Infraestrutura ──────────────────────────────────────────────────────────
  newSection(`D. Infraestruturas — ${YEAR}`);
  subTitle('Laboratórios em funcionamento');
  const labCols = [
    {label:'Nome do laboratório',w:150},{label:'Área',w:88},
    {label:'Província',w:68},{label:'Distrito',w:68},{label:'N.º',w:41,align:'center',total:true},
  ];
  tableHeader(labCols);
  (data.infra?.labs||[]).forEach((r,i) => tableRow(labCols,[r.nome,r.area,r.provincia,r.distrito,r.num_labs||0],i%2===1));
  totalRow(labCols,['Total','','','', (data.infra?.labs||[]).reduce((a,r)=>a+(parseInt(r.num_labs)||0),0)]);

  doc.moveDown(0.8);
  subTitle('Salas de aulas');
  const salaCols = [
    {label:'Unidade Orgânica',w:178},{label:'Província',w:78},
    {label:'Grau',w:98},{label:'N.º salas',w:61,align:'center',total:true},
  ];
  tableHeader(salaCols);
  (data.infra?.salas||[]).forEach((r,i) => tableRow(salaCols,[r.unidade,r.provincia,r.grau,r.num_salas||0],i%2===1));
  totalRow(salaCols,['Total','','',(data.infra?.salas||[]).reduce((a,r)=>a+(parseInt(r.num_salas)||0),0)]);

  // ── Previsão ────────────────────────────────────────────────────────────────
  newSection(`Previsão / Preliminar para ${NEXT_YEAR}`);
  subTitle(`Estudantes previstos por curso, grau e género`);
  const prevCols = [
    {label:'Nome do curso',w:130},{label:'Dur.',w:38,align:'center'},
    {label:'Área',w:78},{label:'Grau',w:76},{label:'Província',w:62},
    {label:'H',w:28,align:'center'},{label:'M',w:28,align:'center'},
    {label:'Total',w:35,align:'center',total:true},
  ];
  tableHeader(prevCols);
  let ptH=0, ptM=0;
  (data.previsao||[]).forEach((r,i) => {
    const h=parseInt(r.homens)||0, m=parseInt(r.mulheres)||0;
    ptH+=h; ptM+=m;
    tableRow(prevCols,[r.curso,r.duracao,r.area,r.grau,r.provincia,h,m,h+m],i%2===1);
  });
  totalRow(prevCols,['TOTAL','','','','',ptH,ptM,ptH+ptM]);

  // ── Sumário Geral ───────────────────────────────────────────────────────────
  const { computePrevisao } = require('./previsaoSummary');
  const summary = computePrevisao(data);

  newSection(`Sumário Geral — ${YEAR}`);

  subTitle(`I. Estudantes — Comparação ${YEAR} vs ${NEXT_YEAR}`);
  const sumStudCols = [
    {label:'Grau',w:100},
    {label:`H ${YEAR}`,w:52,align:'center'},{label:`M ${YEAR}`,w:52,align:'center'},{label:`Tot. ${YEAR}`,w:56,align:'center',total:true},
    {label:`H ${NEXT_YEAR}`,w:52,align:'center'},{label:`M ${NEXT_YEAR}`,w:52,align:'center'},{label:`Tot. ${NEXT_YEAR}`,w:51,align:'center',total:true},
  ];
  tableHeader(sumStudCols);
  summary.studentsByGrau.forEach((r,i) => tableRow(sumStudCols,[r.grau,r.h2024,r.m2024,r.total2024,r.h2025,r.m2025,r.total2025],i%2===1));
  const st=summary.studentTotals;
  totalRow(sumStudCols,['TOTAL',st.h2024,st.m2024,st.total2024,st.h2025,st.m2025,st.total2025]);

  doc.moveDown(0.8);
  subTitle('II. Corpo Docente');
  const sumDocCols = [{label:'Regime',w:120},{label:'Homens',w:90,align:'center'},{label:'Mulheres',w:90,align:'center'},{label:'Total',w:115,align:'center',total:true}];
  tableHeader(sumDocCols);
  tableRow(sumDocCols,['Tempo Inteiro',summary.docentes.ti.h,summary.docentes.ti.m,summary.docentes.ti.h+summary.docentes.ti.m],false);
  tableRow(sumDocCols,['Tempo Parcial',summary.docentes.tp.h,summary.docentes.tp.m,summary.docentes.tp.h+summary.docentes.tp.m],true);
  totalRow(sumDocCols,['TOTAL',summary.docentes.total.h,summary.docentes.total.m,summary.docentes.total.h+summary.docentes.total.m]);

  doc.moveDown(0.8);
  subTitle('III. Investigadores');
  tableHeader(sumDocCols);
  tableRow(sumDocCols,['Tempo Inteiro',summary.investigadores.ti.h,summary.investigadores.ti.m,summary.investigadores.ti.h+summary.investigadores.ti.m],false);
  tableRow(sumDocCols,['Tempo Parcial',summary.investigadores.tp.h,summary.investigadores.tp.m,summary.investigadores.tp.h+summary.investigadores.tp.m],true);
  totalRow(sumDocCols,['TOTAL',summary.investigadores.total.h,summary.investigadores.total.m,summary.investigadores.total.h+summary.investigadores.total.m]);

  doc.moveDown(0.8);
  subTitle('IV. Recursos Financeiros (MT × 10³)');
  finRow('Total Financiamento', summary.financas.totalFunding, true);
  finRow('Total Despesas', summary.financas.totalDesp, true);

  doc.moveDown(0.8);
  subTitle('V. Infraestrutura');
  const infCols = [{label:'Tipo',w:200},{label:'Total',w:215,align:'center',total:true}];
  tableHeader(infCols);
  tableRow(infCols,['Laboratórios',summary.infraestrutura.totalLabs],false);
  tableRow(infCols,['Salas de aulas',summary.infraestrutura.totalSalas],true);

  doc.end();
}

module.exports = { buildPdf };
