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

    const doc = new PDFDocument({ size: 'A4', margin: 40 });

    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width - 80;

    let currentPageHasContent = false;
    let pageCount = 0;

    function markContent() {
      currentPageHasContent = true;
    }

    function resetX() {
      doc.x = 40;
    }

    function drawFooter() {
      doc.save();
      doc.fillColor('#999')
        .fontSize(7)
        .font('Helvetica')
        .text(
          APP + '  ·  Página ' + pageCount,
          40,
          doc.page.height - 20,
          { width: W, align: 'center' }
        );
      doc.restore();
    }

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
      markContent();
    }

    doc.on('pageAdded', () => {
      pageCount++;
      drawHeader();
      drawFooter();
      currentPageHasContent = false;
    });

    function forceNewPage() {
      if (currentPageHasContent) {
        doc.addPage();
      }
    }

    function ensureSpace(lines = 3) {
      const needed = lines * 14;
      if (doc.y > doc.page.height - 80 - needed) {
        if (currentPageHasContent) {
          doc.addPage();
        }
      }
    }

    function startNewSection(title) {
      if (!currentPageHasContent && doc.y <= 95) {
        // reuse page
      } else {
        forceNewPage();
      }

      doc.fillColor(BLUE).fontSize(11).font('Helvetica-Bold')
        .text(title, 40, doc.y);

      doc.moveDown(0.25);
      doc.rect(40, doc.y, W, 1).fill(BLUE);
      doc.moveDown(0.6);

      doc.fillColor(DARK).font('Helvetica').fontSize(10);
      resetX();
      markContent();
      ensureSpace(4);
    }

    function subTitle(text) {
      doc.moveDown(0.3);
      resetX();
      doc.fillColor(MID).fontSize(9).font('Helvetica-Bold').text(text);
      doc.moveDown(0.25);
      doc.fillColor(DARK).font('Helvetica').fontSize(10);
      resetX();
      markContent();
      ensureSpace(2);
    }

    function infoRow(label, value) {
      ensureSpace(2);
      const y = doc.y;

      doc.fillColor(MID).fontSize(9).font('Helvetica')
        .text(label + ':', 40, y, { width: 140 });

      doc.fillColor(DARK).fontSize(9).font('Helvetica-Bold')
        .text(String(value || '—'), 185, y, { width: W - 145 });

      doc.y = y + 16;
      resetX();
      markContent();
    }

    function tableHeader(cols) {
      ensureSpace(3);
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
      markContent();
    }

    function tableRow(cols, values, shade) {
      ensureSpace(2);
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
      markContent();
    }

    function totalRow(cols, values) {
      ensureSpace(2);
      const y = doc.y;

      doc.rect(40, y, W, 16).fill(LIGHT_GREEN);

      let x = 40;
      cols.forEach((col, i) => {
        doc.fillColor(GREEN).fontSize(7.5).font('Helvetica-Bold')
          .text(String(values[i] ?? ''), x + 2, y + 4, { width: col.w - 4 });
        x += col.w;
      });

      doc.y = y + 17;
      resetX();
      markContent();
    }

    function finRow(label, value, isTotal) {
      ensureSpace(2);
      const y = doc.y;
      const h = isTotal ? 18 : 15;

      const formatted = (parseFloat(value) || 0).toLocaleString('pt-MZ') + ' MT×10³';

      if (isTotal) doc.rect(40, y, W, h).fill(LIGHT_BLUE);
      else doc.rect(40, y, W, h).stroke(BORDER);

      doc.fillColor(isTotal ? BLUE : DARK).fontSize(9)
        .font(isTotal ? 'Helvetica-Bold' : 'Helvetica')
        .text(label, 44, y + 4, { width: W - 120 });

      doc.fillColor(isTotal ? BLUE : DARK)
        .font('Helvetica-Bold')
        .text(formatted, 40 + W - 115, y + 4, { width: 110, align: 'right' });

      doc.y = y + h + 1;
      resetX();
      markContent();
    }

    // FIRST PAGE
    pageCount = 1;
    drawHeader();
    drawFooter();

    const d = data.idies || {};

    doc.fillColor(BLUE).fontSize(20).font('Helvetica-Bold')
      .text(d.nome || 'Instituição de Ensino Superior', 40, doc.y, { width: W });

    markContent();

    doc.end();
  });
}

async function buildPdf(data, res) {
  const buffer = await buildPdfBuffer(data);
  res.end(buffer);
}

module.exports = { buildPdf };
