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

function buildPdfBuffer(data) {
  return new Promise((resolve, reject) => {
    const NOW = new Date();
    const YEAR = NOW.getFullYear();
    const NEXT_YEAR = YEAR + 1;
    const DATE_STR = NOW.toLocaleDateString('pt-MZ', { dateStyle: 'long' });
    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    const W = doc.page.width - 80;

    // ----- Helper: reset X to left margin (40) -----
    function resetX() {
      doc.x = 40;
    }

    // ----- Header (on every page except cover? Actually cover also uses it) -----
    function drawHeader() {
      doc.save();
      doc.rect(40, 30, W, 46).fill(BLUE);
      doc.fillColor('#fff').fontSize(12).font('Helvetica-Bold')
        .text(APP + ' — Formulário de Recolha Estatística ' + YEAR, 52, 36, { width: W - 24 });
      doc.fillColor('#B5D4F4').fontSize(8).font('Helvetica')
        .text('Sistema de Recolha de Dados do Ensino Superior de Moçambique', 52, 52);
      doc.restore();
      doc.y = 90;
      resetX();
    }

    // ----- Start a new major section on a fresh page -----
    function newSection(title) {
      doc.addPage();
      drawHeader();
      doc.fillColor(BLUE).fontSize(11).font('Helvetica-Bold').text(title, 40, doc.y);
      doc.moveDown(0.25);
      doc.rect(40, doc.y, W, 1).fill(BLUE);
      doc.moveDown(0.6);
      doc.fillColor(DARK).font('Helvetica').fontSize(10);
      resetX();
      // Reserve space for at least the first sub‑title / table header
      checkPage(40);
    }

    // ----- Subtitle fix: always start at left margin -----
    function subTitle(text) {
      doc.moveDown(0.3);
      resetX();                     // *** prevents indentation ***
      doc.fillColor(MID).fontSize(9).font('Helvetica-Bold').text(text);
      doc.moveDown(0.25);
      doc.fillColor(DARK).font('Helvetica').fontSize(10);
      resetX();
    }

    // ----- Page break helper (increased bottom margin to 80) -----
    function checkPage(px) {
      // Increased from 60 to 80 to reduce premature page breaks
      if (doc.y > doc.page.height - 80 - (px || 30)) {
        doc.addPage();
        drawHeader();
        resetX();
      }
    }

    function infoRow(label, value) {
      checkPage(16);
      const y = doc.y;
      doc.fillColor(MID).fontSize(9).font('Helvetica').text(label + ':', 40, y, { width: 140 });
      doc.fillColor(DARK).fontSize(9).font('Helvetica-Bold').text(String(value || '—'), 185, y, { width: W - 145 });
      doc.font('Helvetica');
      doc.y = y + 16;
      resetX();
    }

    function tableHeader(cols) {
      checkPage(22);
      const y = doc.y;
      doc.rect(40, y, W, 16).fill(BLUE);
      let x = 40;
      cols.forEach(col => {
        doc.fillColor('#fff').fontSize(7.5).font('Helvetica-Bold')
          .text(col.label, x + 2, y + 4, { width: col.w - 4, align: col.align || 'left' });
        x += col.w;
      });
      doc.y = y + 16;
      doc.fillColor(DARK).font('Helvetica');
      resetX();
    }

    function tableRow(cols, values, shade) {
      checkPage(15);
      const y = doc.y;
      if (shade) doc.rect(40, y, W, 14).fill(GRAY);
      doc.rect(40, y, W, 14).stroke(BORDER);
      let x = 40;
      cols.forEach((col, i) => {
        doc.fillColor(col.total ? BLUE : DARK).fontSize(7.5)
          .font(col.total ? 'Helvetica-Bold' : 'Helvetica')
          .text(String(values[i] ?? '—'), x + 2, y + 3, { width: col.w - 4, align: col.align || 'left' });
        x += col.w;
      });
      doc.y = y + 14;
      resetX();
    }

    function totalRow(cols, values) {
      checkPage(17);
      const y = doc.y;
      doc.rect(40, y, W, 16).fill(LIGHT_GREEN);
      let x = 40;
      cols.forEach((col, i) => {
        doc.fillColor(GREEN).fontSize(7.5).font('Helvetica-Bold')
          .text(String(values[i] ?? ''), x + 2, y + 4, { width: col.w - 4, align: col.align || 'left' });
        x += col.w;
      });
      doc.y = y + 17;
      resetX();
    }

    function finRow(label, value, isTotal) {
      checkPage(20);
      const y = doc.y;
      const h = isTotal ? 18 : 15;
      const formatted = (parseFloat(value) || 0).toLocaleString('pt-MZ') + ' MT\u00d710\u00b3';
      if (isTotal) doc.rect(40, y, W, h).fill(LIGHT_BLUE);
      else doc.rect(40, y, W, h).stroke(BORDER);
      doc.fillColor(isTotal ? BLUE : DARK).fontSize(9).font(isTotal ? 'Helvetica-Bold' : 'Helvetica')
        .text(label, 44, y + (isTotal ? 5 : 3), { width: W - 120 });
      doc.fillColor(isTotal ? BLUE : DARK).font('Helvetica-Bold').fontSize(9)
        .text(formatted, 40 + W - 115, y + (isTotal ? 5 : 3), { width: 110, align: 'right' });
      doc.y = y + h + 1;
      doc.font('Helvetica');
      resetX();
    }

    // ---------- COVER PAGE ----------
    drawHeader();
    const d = data.idies || {};
    const campusNome = data.campusNome || null;
    doc.fillColor(BLUE).fontSize(20).font('Helvetica-Bold').text(d.nome || 'Instituição de Ensino Superior', 40, doc.y, { width: W });
    if (d.sigla) doc.fillColor(MID).fontSize(13).font('Helvetica').text(d.sigla, { width: W });
    if (campusNome) doc.fillColor(DARK).fontSize(12).font('Helvetica').text('Campus: ' + campusNome, { width: W });
    doc.moveDown(0.8);
    doc.rect(40, doc.y, W, 0.5).fill(BORDER); doc.moveDown(0.6);
    [['NUIT', d.nuit], ['Ano de início', d.ano_inicio], ['Província', d.provincia], ['Distrito', d.distrito], ['Website', d.website], ['Contacto', d.contacto], ['Email', d.email]].forEach(([l, v]) => infoRow(l, v));
    doc.moveDown(0.6); doc.rect(40, doc.y, W, 0.5).fill(BORDER); doc.moveDown(0.4);
    doc.fillColor(MID).fontSize(9).font('Helvetica-Bold').text('Responsável pelo preenchimento'); doc.moveDown(0.3);
    [['Nome', d.responsavel], ['Função', d.funcao], ['Email', d.email_resp]].forEach(([l, v]) => infoRow(l, v));
    doc.moveDown(1.5);
    doc.fillColor('#aaa').fontSize(8).font('Helvetica').text('Gerado em ' + DATE_STR + ' via ' + APP, { align: 'center', width: W });

    // ---------- ESTUDANTES ----------
    newSection('1. Estatística sobre Corpo Discente — ' + YEAR);
    subTitle('Estudantes por curso, género, regime e grau');
    const estCols = [{ label: 'Nome do curso', w: 118 }, { label: 'Dur.', w: 26, align: 'center' }, { label: 'Área', w: 70 }, { label: 'Regime', w: 55 }, { label: 'Grau', w: 72 }, { label: 'H', w: 26, align: 'center' }, { label: 'M', w: 26, align: 'center' }, { label: 'Total', w: 42, align: 'center', total: true }];
    tableHeader(estCols);
    let tH = 0, tM = 0;
    (data.estudantes || []).forEach((r, i) => { const h = parseInt(r.homens) || 0, m = parseInt(r.mulheres) || 0; tH += h; tM += m; tableRow(estCols, [r.curso, r.duracao, r.area, r.regime, r.grau, h, m, h + m], i % 2 === 1); });
    totalRow(estCols, ['TOTAL', '', '', '', '', tH, tM, tH + tM]);

    // ---------- DOCENTES ----------
    newSection('A. Corpo Docente — ' + YEAR);
    subTitle('Docentes por regime, grau académico e género');
    const docCols = [{ label: 'Regime', w: 65 }, { label: 'Província', w: 58 }, { label: 'Nac.', w: 60 }, { label: 'Lic.H', w: 30, align: 'center' }, { label: 'Lic.M', w: 30, align: 'center' }, { label: 'Mest.H', w: 32, align: 'center' }, { label: 'Mest.M', w: 32, align: 'center' }, { label: 'Dout.H', w: 32, align: 'center' }, { label: 'Dout.M', w: 32, align: 'center' }, { label: 'Total', w: 44, align: 'center', total: true }];
    tableHeader(docCols);
    (data.docentes || []).forEach((r, i) => {
      const tot = (parseInt(r.lic_h) || 0) + (parseInt(r.lic_m) || 0) + (parseInt(r.mest_h) || 0) + (parseInt(r.mest_m) || 0) + (parseInt(r.dout_h) || 0) + (parseInt(r.dout_m) || 0);
      tableRow(docCols, [r.regime === 'tempo_inteiro' ? 'T.Inteiro' : 'T.Parcial', r.provincia, r.nacionalidade, r.lic_h || 0, r.lic_m || 0, r.mest_h || 0, r.mest_m || 0, r.dout_h || 0, r.dout_m || 0, tot], i % 2 === 1);
    });

    // ---------- INVESTIGADORES ----------
    newSection('C. Investigadores — ' + YEAR);
    subTitle('Investigadores por regime, nacionalidade e género');
    const invCols = [{ label: 'Regime', w: 80 }, { label: 'Nacionalidade', w: 86 }, { label: 'Lic.H', w: 36, align: 'center' }, { label: 'Lic.M', w: 36, align: 'center' }, { label: 'Mest.H', w: 38, align: 'center' }, { label: 'Mest.M', w: 38, align: 'center' }, { label: 'Dout.H', w: 38, align: 'center' }, { label: 'Dout.M', w: 38, align: 'center' }, { label: 'Total', w: 45, align: 'center', total: true }];
    tableHeader(invCols);
    (data.investigadores || []).forEach((r, i) => {
      const tot = (parseInt(r.lic_h) || 0) + (parseInt(r.lic_m) || 0) + (parseInt(r.mest_h) || 0) + (parseInt(r.mest_m) || 0) + (parseInt(r.dout_h) || 0) + (parseInt(r.dout_m) || 0);
      tableRow(invCols, [r.regime === 'tempo_inteiro' ? 'T.Inteiro' : 'T.Parcial', r.nacionalidade, r.lic_h || 0, r.lic_m || 0, r.mest_h || 0, r.mest_m || 0, r.dout_h || 0, r.dout_m || 0, tot], i % 2 === 1);
    });

    // ---------- FINANÇAS ----------
    newSection('Recursos Financeiros — ' + YEAR);
    const fin = data.financas || {};
    subTitle('Quadro 2 – Financiamento por fonte');
    finRow('OGE (Orçamento Geral do Estado)', fin.oge);
    finRow('Doações (internas e externas)', fin.doacoes);
    finRow('Créditos', fin.creditos);
    finRow('Receitas próprias', fin.proprias);
    finRow('Total financiamento', (parseFloat(fin.oge) || 0) + (parseFloat(fin.doacoes) || 0) + (parseFloat(fin.creditos) || 0) + (parseFloat(fin.proprias) || 0), true);
    doc.moveDown(0.8);
    subTitle('Quadro 3 – Despesas correntes');
    finRow('Ensino', fin.func_ensino);
    finRow('Investigação', fin.func_investig);
    finRow('Administração', fin.func_admin);
    finRow('Salários – Docentes', fin.sal_docentes);
    finRow('Salários – Técnicos Administrativos', fin.sal_tecnicos);
    finRow('Total despesas', (parseFloat(fin.func_ensino) || 0) + (parseFloat(fin.func_investig) || 0) + (parseFloat(fin.func_admin) || 0) + (parseFloat(fin.sal_docentes) || 0) + (parseFloat(fin.sal_tecnicos) || 0), true);

    // ---------- INFRAESTRUTURAS ----------
    newSection('D. Infraestruturas — ' + YEAR);
    subTitle('Quadro 1.1 – Laboratórios em funcionamento');
    const labCols = [{ label: 'Nome do laboratório', w: 148 }, { label: 'Área', w: 86 }, { label: 'Província', w: 68 }, { label: 'Distrito', w: 68 }, { label: 'N.º', w: 45, align: 'center', total: true }];
    tableHeader(labCols);
    (data.infra?.labs || []).forEach((r, i) => tableRow(labCols, [r.nome, r.area, r.provincia, r.distrito, r.num_labs || 0], i % 2 === 1));
    totalRow(labCols, ['Total', '', '', '', (data.infra?.labs || []).reduce((a, r) => a + (parseInt(r.num_labs) || 0), 0)]);
    doc.moveDown(0.6);
    subTitle('Quadro 1.2 – Salas de aulas');
    const salaCols = [{ label: 'Unidade Orgânica', w: 175 }, { label: 'Província', w: 78 }, { label: 'Grau', w: 100 }, { label: 'N.º salas', w: 62, align: 'center', total: true }];
    tableHeader(salaCols);
    (data.infra?.salas || []).forEach((r, i) => tableRow(salaCols, [r.unidade, r.provincia, r.grau, r.num_salas || 0], i % 2 === 1));
    totalRow(salaCols, ['Total', '', '', (data.infra?.salas || []).reduce((a, r) => a + (parseInt(r.num_salas) || 0), 0)]);

    // ---------- PREVISÃO ----------
    newSection('Previsão / Preliminar para ' + NEXT_YEAR);
    subTitle('Estudantes previstos por curso, grau e género');
    const prevCols = [{ label: 'Nome do curso', w: 128 }, { label: 'Dur.', w: 36, align: 'center' }, { label: 'Área', w: 78 }, { label: 'Grau', w: 76 }, { label: 'Província', w: 62 }, { label: 'H', w: 28, align: 'center' }, { label: 'M', w: 28, align: 'center' }, { label: 'Total', w: 39, align: 'center', total: true }];
    tableHeader(prevCols);
    let ptH = 0, ptM = 0;
    (data.previsao || []).forEach((r, i) => { const h = parseInt(r.homens) || 0, m = parseInt(r.mulheres) || 0; ptH += h; ptM += m; tableRow(prevCols, [r.curso, r.duracao, r.area, r.grau, r.provincia, h, m, h + m], i % 2 === 1); });
    totalRow(prevCols, ['TOTAL', '', '', '', '', ptH, ptM, ptH + ptM]);

    // ---------- SUMÁRIO GERAL ----------
    const { computePrevisao } = require('./previsaoSummary');
    const summary = computePrevisao(data);
    newSection('Sumário Geral — ' + YEAR);
    subTitle('I. Estudantes — Comparação ' + YEAR + ' vs ' + NEXT_YEAR);
    const sumStudCols = [{ label: 'Grau', w: 100 }, { label: 'H ' + YEAR, w: 50, align: 'center' }, { label: 'M ' + YEAR, w: 50, align: 'center' }, { label: 'Tot.' + YEAR, w: 58, align: 'center', total: true }, { label: 'H ' + NEXT_YEAR, w: 50, align: 'center' }, { label: 'M ' + NEXT_YEAR, w: 50, align: 'center' }, { label: 'Tot.' + NEXT_YEAR, w: 57, align: 'center', total: true }];
    tableHeader(sumStudCols);
    summary.studentsByGrau.forEach((r, i) => tableRow(sumStudCols, [r.grau, r.h2024, r.m2024, r.total2024, r.h2025, r.m2025, r.total2025], i % 2 === 1));
    const st = summary.studentTotals;
    totalRow(sumStudCols, ['TOTAL', st.h2024, st.m2024, st.total2024, st.h2025, st.m2025, st.total2025]);

    subTitle('II. Corpo Docente');
    const sumDocCols = [{ label: 'Regime', w: 120 }, { label: 'Homens', w: 90, align: 'center' }, { label: 'Mulheres', w: 90, align: 'center' }, { label: 'Total', w: 115, align: 'center', total: true }];
    tableHeader(sumDocCols);
    tableRow(sumDocCols, ['Tempo Inteiro', summary.docentes.ti.h, summary.docentes.ti.m, summary.docentes.ti.h + summary.docentes.ti.m], false);
    tableRow(sumDocCols, ['Tempo Parcial', summary.docentes.tp.h, summary.docentes.tp.m, summary.docentes.tp.h + summary.docentes.tp.m], true);
    totalRow(sumDocCols, ['TOTAL', summary.docentes.total.h, summary.docentes.total.m, summary.docentes.total.h + summary.docentes.total.m]);

    subTitle('III. Investigadores');
    tableHeader(sumDocCols);
    tableRow(sumDocCols, ['Tempo Inteiro', summary.investigadores.ti.h, summary.investigadores.ti.m, summary.investigadores.ti.h + summary.investigadores.ti.m], false);
    tableRow(sumDocCols, ['Tempo Parcial', summary.investigadores.tp.h, summary.investigadores.tp.m, summary.investigadores.tp.h + summary.investigadores.tp.m], true);
    totalRow(sumDocCols, ['TOTAL', summary.investigadores.total.h, summary.investigadores.total.m, summary.investigadores.total.h + summary.investigadores.total.m]);

    subTitle('IV. Recursos Financeiros (MT x 10^3)');
    const finSumCols = [{ label: 'Fonte / Categoria', w: 320 }, { label: 'Valor', w: 135, align: 'right', total: true }];
    tableHeader(finSumCols);
    [['OGE', summary.financas.oge], ['Doações', summary.financas.doacoes], ['Créditos', summary.financas.creditos], ['Rec. próprias', summary.financas.proprias]].forEach(([l, v], i) => tableRow(finSumCols, [l, (parseFloat(v) || 0).toLocaleString('pt-MZ')], i % 2 === 1));
    totalRow(finSumCols, ['Total Financiamento', (parseFloat(summary.financas.totalFunding) || 0).toLocaleString('pt-MZ')]);
    [['Ensino', summary.financas.func_ensino], ['Investigação', summary.financas.func_investig], ['Administração', summary.financas.func_admin], ['Salário Docentes', summary.financas.sal_docentes], ['Salário Técnicos', summary.financas.sal_tecnicos]].forEach(([l, v], i) => tableRow(finSumCols, [l, (parseFloat(v) || 0).toLocaleString('pt-MZ')], i % 2 === 1));
    totalRow(finSumCols, ['Total Despesas', (parseFloat(summary.financas.totalDesp) || 0).toLocaleString('pt-MZ')]);

    subTitle('V. Infraestrutura');
    const infCols = [{ label: 'Tipo', w: 320 }, { label: 'Total', w: 135, align: 'center', total: true }];
    tableHeader(infCols);
    tableRow(infCols, ['Laboratórios', summary.infraestrutura.totalLabs], false);
    tableRow(infCols, ['Salas de aulas', summary.infraestrutura.totalSalas], true);

    // ---------- PAGE NUMBERS (skip cover? currently numbers all pages, including cover) ----------
    // If you want NO number on the cover, change the loop to start from i=1
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      doc.save();
      doc.fillColor('#999').fontSize(7).font('Helvetica')
        .text(APP + '  ·  Página ' + (i + 1) + ' de ' + range.count, 40, doc.page.height - 20, { width: W, align: 'center' });
      doc.restore();
    }

    doc.end();
  });
}

async function buildPdf(data, res) {
  const buffer = await buildPdfBuffer(data);
  res.write(buffer);
  res.end();
}

module.exports = { buildPdf };
