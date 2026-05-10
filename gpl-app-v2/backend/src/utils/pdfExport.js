const PDFDocument = require('pdfkit');

const BLUE = '#185FA5';
const LIGHT_BLUE = '#E6F1FB';
const GREEN = '#3B6D11';
const LIGHT_GREEN = '#EAF3DE';
const GRAY = '#F1EFE8';
const DARK = '#1a1a1a';
const MID = '#555';
const BORDER = '#d0d0d0';

function buildPdf(data, res) {
  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
  doc.pipe(res);

  const W = doc.page.width - 80; // usable width

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function header() {
    doc.rect(40, 40, W, 52).fill(BLUE);
    doc.fillColor('#fff').fontSize(14).font('Helvetica-Bold')
      .text('GPL App — Formulário de Recolha Estatística IES 2024', 52, 52, { width: W - 24 });
    doc.fillColor('#B5D4F4').fontSize(9).font('Helvetica')
      .text('Sistema de Recolha de Dados do Ensino Superior de Moçambique', 52, 70);
    doc.moveDown(3.5);
  }

  function sectionTitle(text) {
    doc.addPage();
    header();
    doc.fillColor(BLUE).fontSize(13).font('Helvetica-Bold').text(text, 40, doc.y);
    doc.moveDown(0.4);
    doc.rect(40, doc.y, W, 1).fill(BLUE);
    doc.moveDown(0.8);
    doc.fillColor(DARK).font('Helvetica').fontSize(10);
  }

  function subTitle(text) {
    doc.fillColor(MID).fontSize(10).font('Helvetica-Bold').text(text);
    doc.moveDown(0.3);
    doc.fillColor(DARK).font('Helvetica').fontSize(10);
  }

  function infoRow(label, value) {
    const y = doc.y;
    doc.fillColor(MID).fontSize(9).text(label, 40, y, { width: 160, continued: false });
    doc.fillColor(DARK).fontSize(9).font('Helvetica-Bold').text(value || '—', 205, y, { width: W - 165 });
    doc.font('Helvetica');
    doc.moveDown(0.35);
  }

  function tableHeader(cols) {
    const y = doc.y;
    const rowH = 16;
    doc.rect(40, y, W, rowH).fill(BLUE);
    let x = 40;
    cols.forEach(col => {
      doc.fillColor('#fff').fontSize(8).font('Helvetica-Bold')
        .text(col.label, x + 3, y + 4, { width: col.w - 6, align: col.align || 'left' });
      x += col.w;
    });
    doc.moveDown(0);
    doc.y = y + rowH;
    doc.fillColor(DARK).font('Helvetica');
  }

  function tableRow(cols, values, shade) {
    const y = doc.y;
    const rowH = 14;
    if (shade) doc.rect(40, y, W, rowH).fill(GRAY);
    doc.rect(40, y, W, rowH).stroke(BORDER);
    let x = 40;
    cols.forEach((col, i) => {
      const val = values[i] ?? '—';
      doc.fillColor(col.total ? BLUE : DARK).fontSize(8).font(col.total ? 'Helvetica-Bold' : 'Helvetica')
        .text(String(val), x + 3, y + 3, { width: col.w - 6, align: col.align || 'left' });
      x += col.w;
    });
    doc.y = y + rowH;
  }

  function totalRow(cols, values) {
    const y = doc.y;
    const rowH = 16;
    doc.rect(40, y, W, rowH).fill(LIGHT_GREEN);
    let x = 40;
    cols.forEach((col, i) => {
      doc.fillColor(GREEN).fontSize(8).font('Helvetica-Bold')
        .text(String(values[i] ?? ''), x + 3, y + 4, { width: col.w - 6, align: col.align || 'left' });
      x += col.w;
    });
    doc.y = y + rowH + 6;
  }

  function finRow(label, value, isTotal) {
    const y = doc.y;
    if (isTotal) doc.rect(40, y, W, 18).fill(LIGHT_BLUE);
    else doc.rect(40, y, W, 16).stroke(BORDER);
    doc.fillColor(isTotal ? BLUE : DARK).fontSize(9).font(isTotal ? 'Helvetica-Bold' : 'Helvetica')
      .text(label, 44, y + (isTotal ? 5 : 4), { width: W - 120 });
    doc.fillColor(isTotal ? BLUE : DARK).font('Helvetica-Bold').fontSize(9)
      .text(Number(value || 0).toLocaleString('pt-MZ') + ' MT×10³', 40 + W - 110, y + (isTotal ? 5 : 4), { width: 100, align: 'right' });
    doc.y = y + (isTotal ? 20 : 17);
    doc.font('Helvetica');
  }

  // ── Cover page ────────────────────────────────────────────────────────────────
  const d = data.idies || {};
  doc.rect(40, 40, W, 52).fill(BLUE);
  doc.fillColor('#fff').fontSize(16).font('Helvetica-Bold')
    .text('Formulário de Recolha Estatística', 52, 48, { width: W - 24 });
  doc.fillColor('#B5D4F4').fontSize(11).font('Helvetica')
    .text('Ano Lectivo 2024', 52, 68);

  doc.moveDown(4);
  doc.fillColor(BLUE).fontSize(18).font('Helvetica-Bold')
    .text(d.nome || 'Instituição de Ensino Superior', 40, doc.y, { width: W });
  doc.fillColor(MID).fontSize(12).font('Helvetica')
    .text(d.sigla || '', { width: W });

  doc.moveDown(2);
  doc.rect(40, doc.y, W, 0.5).fill(BORDER);
  doc.moveDown(1);

  [
    ['NUIT', d.nuit],
    ['Ano de início', d.ano_inicio],
    ['Província', d.provincia],
    ['Distrito', d.distrito],
    ['Website', d.website],
    ['Contacto', d.contacto],
    ['Email', d.email],
  ].forEach(([l, v]) => infoRow(l, v));

  doc.moveDown(1);
  doc.fillColor(MID).fontSize(9).font('Helvetica-Bold').text('Responsável pelo preenchimento');
  doc.moveDown(0.3);
  [
    ['Nome', d.responsavel],
    ['Função', d.funcao],
    ['Email', d.email_resp],
  ].forEach(([l, v]) => infoRow(l, v));

  doc.moveDown(1.5);
  doc.fillColor('#aaa').fontSize(8).text(`Gerado em ${new Date().toLocaleDateString('pt-MZ', { dateStyle: 'long' })} via GPL App`, { align: 'center' });

  // ── Estudantes ────────────────────────────────────────────────────────────────
  sectionTitle('1. Estatística sobre Corpo Discente');
  subTitle('Quadro 1.1 – Estudantes por curso, género, regime e grau (2024)');

  const estCols = [
    { label: 'Nome do curso', w: 130 },
    { label: 'Dur.', w: 28, align: 'center' },
    { label: 'Área', w: 80 },
    { label: 'Regime', w: 58 },
    { label: 'Grau', w: 72 },
    { label: 'H', w: 28, align: 'center' },
    { label: 'M', w: 28, align: 'center' },
    { label: 'Total', w: 36, align: 'center', total: true },
  ];
  tableHeader(estCols);
  let tH = 0, tM = 0;
  (data.estudantes || []).forEach((r, i) => {
    if (doc.y > 750) { doc.addPage(); header(); }
    const h = parseInt(r.homens) || 0, m = parseInt(r.mulheres) || 0;
    tH += h; tM += m;
    tableRow(estCols, [r.curso, r.duracao, r.area, r.regime, r.grau, h, m, h + m], i % 2 === 1);
  });
  totalRow(estCols, ['TOTAL', '', '', '', '', tH, tM, tH + tM]);

  // ── Docentes ──────────────────────────────────────────────────────────────────
  sectionTitle('A. Corpo Docente');
  subTitle('A1 – Docentes por regime, grau académico e género');

  const docCols = [
    { label: 'Regime', w: 70 },
    { label: 'Província', w: 62 },
    { label: 'Nacionalidade', w: 72 },
    { label: 'Lic.H', w: 30, align: 'center' },
    { label: 'Lic.M', w: 30, align: 'center' },
    { label: 'Mest.H', w: 34, align: 'center' },
    { label: 'Mest.M', w: 34, align: 'center' },
    { label: 'Dout.H', w: 34, align: 'center' },
    { label: 'Dout.M', w: 34, align: 'center' },
    { label: 'Tot', w: 36, align: 'center', total: true },
  ];
  tableHeader(docCols);
  (data.docentes || []).forEach((r, i) => {
    if (doc.y > 750) { doc.addPage(); header(); }
    const tot = (r.lic_h||0)+(r.lic_m||0)+(r.mest_h||0)+(r.mest_m||0)+(r.dout_h||0)+(r.dout_m||0);
    tableRow(docCols, [
      r.regime === 'tempo_inteiro' ? 'Tempo inteiro' : 'Tempo parcial',
      r.provincia, r.nacionalidade, r.lic_h, r.lic_m, r.mest_h, r.mest_m, r.dout_h, r.dout_m, tot
    ], i % 2 === 1);
  });

  // ── Investigadores ────────────────────────────────────────────────────────────
  sectionTitle('C. Dados sobre Investigação');
  subTitle('C.1 – Investigadores por regime, nacionalidade e género');

  const invCols = [
    { label: 'Regime', w: 80 },
    { label: 'Nacionalidade', w: 90 },
    { label: 'Lic.H', w: 36, align: 'center' },
    { label: 'Lic.M', w: 36, align: 'center' },
    { label: 'Mest.H', w: 40, align: 'center' },
    { label: 'Mest.M', w: 40, align: 'center' },
    { label: 'Dout.H', w: 40, align: 'center' },
    { label: 'Dout.M', w: 40, align: 'center' },
    { label: 'Total', w: 48, align: 'center', total: true },
  ];
  tableHeader(invCols);
  (data.investigadores || []).forEach((r, i) => {
    if (doc.y > 750) { doc.addPage(); header(); }
    const tot = (r.lic_h||0)+(r.lic_m||0)+(r.mest_h||0)+(r.mest_m||0)+(r.dout_h||0)+(r.dout_m||0);
    tableRow(invCols, [
      r.regime === 'tempo_inteiro' ? 'Tempo inteiro' : 'Tempo parcial',
      r.nacionalidade, r.lic_h, r.lic_m, r.mest_h, r.mest_m, r.dout_h, r.dout_m, tot
    ], i % 2 === 1);
  });

  // ── Finanças ──────────────────────────────────────────────────────────────────
  sectionTitle('Dados sobre Recursos Financeiros');
  const fin = data.financas || {};
  subTitle('Quadro 2 – Financiamento por fonte');
  doc.moveDown(0.3);
  finRow('OGE (Orçamento Geral do Estado)', fin.oge);
  finRow('Doações (internas e externas)', fin.doacoes);
  finRow('Créditos', fin.creditos);
  finRow('Receitas próprias', fin.proprias);
  finRow('Total', (fin.oge||0)+(fin.doacoes||0)+(fin.creditos||0)+(fin.proprias||0), true);

  doc.moveDown(1.2);
  subTitle('Quadro 3 – Despesas correntes');
  doc.moveDown(0.3);
  finRow('Ensino', fin.func_ensino);
  finRow('Investigação', fin.func_investig);
  finRow('Administração', fin.func_admin);
  finRow('Salários – Docentes', fin.sal_docentes);
  finRow('Salários – Técnicos Administrativos', fin.sal_tecnicos);
  finRow('Total de despesas', (fin.func_ensino||0)+(fin.func_investig||0)+(fin.func_admin||0)+(fin.sal_docentes||0)+(fin.sal_tecnicos||0), true);

  // ── Infraestrutura ────────────────────────────────────────────────────────────
  sectionTitle('D. Infraestruturas');
  subTitle('Quadro 1.1 – Laboratórios em funcionamento');

  const labCols = [
    { label: 'Nome do laboratório', w: 160 },
    { label: 'Área', w: 90 },
    { label: 'Província', w: 70 },
    { label: 'Distrito', w: 70 },
    { label: 'N.º labs', w: 60, align: 'center', total: true },
  ];
  tableHeader(labCols);
  (data.infra?.labs || []).forEach((r, i) => {
    if (doc.y > 750) { doc.addPage(); header(); }
    tableRow(labCols, [r.nome, r.area, r.provincia, r.distrito, r.num_labs || 0], i % 2 === 1);
  });
  totalRow(labCols, ['Total', '', '', '', (data.infra?.labs || []).reduce((a, r) => a + (parseInt(r.num_labs) || 0), 0)]);

  doc.moveDown(0.8);
  subTitle('Quadro 1.2 – Salas de aulas');
  const salaCols = [
    { label: 'Unidade Orgânica', w: 180 },
    { label: 'Província', w: 80 },
    { label: 'Grau', w: 100 },
    { label: 'N.º salas', w: 90, align: 'center', total: true },
  ];
  tableHeader(salaCols);
  (data.infra?.salas || []).forEach((r, i) => {
    if (doc.y > 750) { doc.addPage(); header(); }
    tableRow(salaCols, [r.unidade, r.provincia, r.grau, r.num_salas || 0], i % 2 === 1);
  });
  totalRow(salaCols, ['Total', '', '', (data.infra?.salas || []).reduce((a, r) => a + (parseInt(r.num_salas) || 0), 0)]);

  // ── Previsão 2025 ─────────────────────────────────────────────────────────────
  sectionTitle('Previsão / Preliminar para 2025');
  subTitle('Estudantes previstos por curso, grau e género');

  const prevCols = [
    { label: 'Nome do curso', w: 140 },
    { label: 'Duração', w: 42, align: 'center' },
    { label: 'Área', w: 80 },
    { label: 'Grau', w: 80 },
    { label: 'H', w: 30, align: 'center' },
    { label: 'M', w: 30, align: 'center' },
    { label: 'Total', w: 48, align: 'center', total: true },
  ];
  tableHeader(prevCols);
  let ptH = 0, ptM = 0;
  (data.previsao || []).forEach((r, i) => {
    if (doc.y > 750) { doc.addPage(); header(); }
    const h = parseInt(r.homens) || 0, m = parseInt(r.mulheres) || 0;
    ptH += h; ptM += m;
    tableRow(prevCols, [r.curso, r.duracao, r.area, r.grau, h, m, h + m], i % 2 === 1);
  });
  totalRow(prevCols, ['TOTAL', '', '', '', ptH, ptM, ptH + ptM]);

  // ── Page numbers ──────────────────────────────────────────────────────────────
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc.fillColor('#aaa').fontSize(8)
      .text(`Página ${i + 1} de ${pages.count}`, 40, doc.page.height - 30, { width: W, align: 'center' });
  }

  doc.end();
}

module.exports = { buildPdf };
