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

    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      bufferPages: true
    });

    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width - 80;

    function resetX() { doc.x = 40; }

    function drawHeader() {
      doc.save();
      doc.rect(40, 30, W, 46).fill(BLUE);
      doc.fillColor('#fff').fontSize(12).font('Helvetica-Bold')
        .text(`${APP} — Formulário de Recolha Estatística ${YEAR}`, 52, 36, { width: W - 24 });
      doc.fillColor('#B5D4F4').fontSize(8).font('Helvetica')
        .text('Sistema de Recolha de Dados do Ensino Superior de Moçambique', 52, 52);
      doc.restore();

      doc.y = 90;
      resetX();
    }

    function newPage() {
      doc.addPage();
      drawHeader();
    }

    function ensureSpace(lines = 3) {
      if (doc.y > doc.page.height - 120 - (lines * 14)) {
        newPage();
      }
    }

    function startNewSection(title) {
      newPage();   // ← Always new page for major sections
      doc.fillColor(BLUE).fontSize(11).font('Helvetica-Bold').text(title, 40, doc.y);
      doc.moveDown(0.3);
      doc.rect(40, doc.y, W, 1).fill(BLUE);
      doc.moveDown(0.7);
      doc.fillColor(DARK).font('Helvetica').fontSize(10);
      resetX();
    }

    function subTitle(text) {
      ensureSpace();
      doc.moveDown(0.4);
      resetX();
      doc.fillColor(MID).fontSize(9).font('Helvetica-Bold').text(text);
      doc.moveDown(0.3);
      doc.fillColor(DARK).font('Helvetica').fontSize(10);
      resetX();
    }

    function infoRow(label, value) {
      ensureSpace(2);
      const y = doc.y;
      doc.fillColor(MID).fontSize(9).font('Helvetica').text(label + ':', 40, y, { width: 140 });
      doc.fillColor(DARK).fontSize(9).font('Helvetica-Bold')
        .text(String(value || '—'), 185, y, { width: W - 145 });
      doc.y = y + 16;
      resetX();
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
      resetX();
    }

    function tableRow(cols, values, shade = false) {
      ensureSpace(2);
      const y = doc.y;
      if (shade) doc.rect(40, y, W, 14).fill(GRAY);
      doc.rect(40, y, W, 14).stroke(BORDER);

      let x = 40;
      cols.forEach((col, i) => {
        doc.fillColor(col.total ? BLUE : DARK)
          .fontSize(7.5)
          .font(col.total ? 'Helvetica-Bold' : 'Helvetica')
          .text(String(values[i] ?? '—'), x + 2, y + 3, {
            width: col.w - 4,
            align: col.align || 'left'
          });
        x += col.w;
      });
      doc.y = y + 14;
      resetX();
    }

    function totalRow(cols, values) {
      ensureSpace(2);
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

    function finRow(label, value, isTotal = false) {
      ensureSpace(2);
      const y = doc.y;
      const h = isTotal ? 18 : 15;
      const num = parseFloat(value) || 0;
      const formatted = num.toLocaleString('pt-MZ') + ' MT×10³';

      if (isTotal) doc.rect(40, y, W, h).fill(LIGHT_BLUE);
      else doc.rect(40, y, W, h).stroke(BORDER);

      doc.fillColor(isTotal ? BLUE : DARK).fontSize(9)
        .font(isTotal ? 'Helvetica-Bold' : 'Helvetica')
        .text(label, 44, y + (isTotal ? 5 : 3), { width: W - 120 });

      doc.fillColor(isTotal ? BLUE : DARK).font('Helvetica-Bold').fontSize(9)
        .text(formatted, 40 + W - 115, y + (isTotal ? 5 : 3), { width: 110, align: 'right' });

      doc.y = y + h + 2;
      resetX();
    }

    // ====================== COVER ======================
    drawHeader();

    const d = data.idies || {};
    const campusNome = data.campusNome || null;

    doc.fillColor(BLUE).fontSize(20).font('Helvetica-Bold')
      .text(d.nome || 'Instituição de Ensino Superior', 40, doc.y, { width: W });

    if (d.sigla) doc.fillColor(MID).fontSize(13).font('Helvetica').text(d.sigla, { width: W });
    if (campusNome) doc.fillColor(DARK).fontSize(12).font('Helvetica').text('Campus: ' + campusNome, { width: W });

    doc.moveDown(1);
    doc.rect(40, doc.y, W, 0.5).fill(BORDER);
    doc.moveDown(0.6);

    [['NUIT', d.nuit], ['Ano de início', d.ano_inicio], ['Província', d.provincia],
     ['Distrito', d.distrito], ['Website', d.website], ['Contacto', d.contacto],
     ['Email', d.email]]
      .forEach(([l, v]) => infoRow(l, v));

    doc.moveDown(0.8);
    doc.fillColor(MID).fontSize(9).font('Helvetica-Bold').text('Responsável pelo preenchimento');
    doc.moveDown(0.3);

    [['Nome', d.responsavel], ['Função', d.funcao], ['Email', d.email_resp]]
      .forEach(([l, v]) => infoRow(l, v));

    doc.moveDown(2);
    doc.fillColor('#aaa').fontSize(8).font('Helvetica')
      .text(`Gerado em ${DATE_STR} via ${APP}`, { align: 'center', width: W });

    // ====================== CONTENT SECTIONS ======================
    // Estudantes
    startNewSection('1. Estatística sobre Corpo Discente — ' + YEAR);
    subTitle('Estudantes por curso, género, regime e grau');
    const estCols = [{ label: 'Nome do curso', w: 118 }, { label: 'Dur.', w: 26, align: 'center' }, { label: 'Área', w: 70 }, { label: 'Regime', w: 55 }, { label: 'Grau', w: 72 }, { label: 'H', w: 26, align: 'center' }, { label: 'M', w: 26, align: 'center' }, { label: 'Total', w: 42, align: 'center', total: true }];
    tableHeader(estCols);
    let tH = 0, tM = 0;
    (data.estudantes || []).forEach((r, i) => { const h = parseInt(r.homens) || 0, m = parseInt(r.mulheres) || 0; tH += h; tM += m; tableRow(estCols, [r.curso, r.duracao, r.area, r.regime, r.grau, h, m, h + m], i % 2 === 1); });
    totalRow(estCols, ['TOTAL', '', '', '', '', tH, tM, tH + tM]);
    subTitle('Quadro 1.2 — Número de vagas preenchidas');
    const vagaCols = [{ label: 'Curso', w: 92 }, { label: 'Dur.', w: 22, align: 'center' }, { label: 'Área', w: 48 }, { label: 'Sub-área', w: 48 }, { label: 'Regime', w: 43 }, { label: 'Nac.', w: 42 }, { label: 'Prov.', w: 42 }, { label: 'Dist.', w: 42 }, { label: 'Grau', w: 55 }, { label: 'Preench.', w: 42, align: 'center' }, { label: 'Não preench.', w: 48, align: 'center' }, { label: 'Total', w: 38, align: 'center', total: true }];
    tableHeader(vagaCols);
    let filled = 0, open = 0;
    (data.estudantesVagas || []).forEach((r, i) => {
      const f = parseInt(r.vagas_preenchidas) || 0, o = parseInt(r.vagas_nao_preenchidas) || 0;
      filled += f; open += o;
      tableRow(vagaCols, [r.curso, r.duracao, r.area, r.subarea, r.regime, r.nacionalidade, r.provincia, r.distrito, r.grau, f, o, f + o], i % 2 === 1);
    });
    totalRow(vagaCols, ['TOTAL', '', '', '', '', '', '', '', '', filled, open, filled + open]);
    const studentResults = data.estudantesResultados || {};
    const statKeys = [['ingresso_h','Ing.H'],['ingresso_m','Ing.M'],['matriculado_h','Mat.H'],['matriculado_m','Mat.M'],['graduado_h','Grad.H'],['graduado_m','Grad.M']];
    const addStudentTable = (title, columns, rows, fields) => {
      subTitle(title);
      const cols = [...columns.map(([, label, w]) => ({ label, w })), ...fields.map(([, label]) => ({ label, w: 38, align: 'center' }))];
      tableHeader(cols);
      (rows || []).forEach((r, i) => tableRow(cols, [...columns.map(([key]) => r[key] || ''), ...fields.map(([key]) => r[key] || 0)], i % 2 === 1));
    };
    addStudentTable('Quadro 1.3 — Novos ingressos, matriculados e graduados', [['curso','Curso',65],['area','Área',38],['subarea','Sub-área',38],['regime','Regime',38],['provincia','Prov.',36],['distrito','Dist.',36],['grau','Grau',45]], studentResults.cursoEstatistica, statKeys);
    addStudentTable('Quadro 1.4 — Novos ingressos, matriculados e graduados por nacionalidade', [['nacionalidade','Nacionalidade',100]], studentResults.nacionalidadeEstatistica, statKeys);
    addStudentTable('Quadro 1.5 — Estudantes estrangeiros por curso, país e grau', [['curso','Curso',62],['area','Área',36],['subarea','Sub-área',36],['regime','Regime',38],['pais','País',48],['grau','Grau',45]], studentResults.estrangeiros, statKeys);
    addStudentTable('Quadro 1.6 — Estudantes com necessidades especiais', [['curso','Curso',58],['area','Área',32],['subarea','Sub-área',32],['regime','Regime',36],['provincia','Prov.',34],['distrito','Dist.',34],['grau','Grau',42]], studentResults.necessidadesEspeciais, [
      ['cadeirante_h','Cad.H'],['cadeirante_m','Cad.M'],['visual_h','Vis.H'],['visual_m','Vis.M'],
      ['auditiva_h','Aud.H'],['auditiva_m','Aud.M'],['outros_h','Out.H'],['outros_m','Out.M'],
    ]);
    addStudentTable('Quadro 1.7 — Outras necessidades especiais', [['curso','Curso',48],['area','Área',28],['subarea','Sub-área',28],['regime','Regime',32],['provincia','Prov.',30],['distrito','Dist.',30],['grau','Grau',38],['tipo_necessidade','Tipo',55]], studentResults.outrasNecessidades, [['homens','H'],['mulheres','M']]);
    addStudentTable('Quadro 1.8 — Por província de conclusão da 12.ª classe', [['provincia','Província',100]], studentResults.provinciaConclusao, statKeys);
    addStudentTable('Quadro 1.9 — Por província de naturalidade', [['provincia','Província',100]], studentResults.provinciaNaturalidade, statKeys);
    addStudentTable('Quadro 1.10 — Por faixa etária', [['classe_idade','Classe de idade',100]], studentResults.faixaEtaria, statKeys);
    addStudentTable('Quadro 1.11 — Graduados por ano da primeira matrícula', [['curso','Curso',48],['area','Área',28],['subarea','Sub-área',28],['regime','Regime',32],['provincia','Prov.',30],['distrito','Dist.',30],['grau','Grau',38],['ano_primeira_matricula','Ano 1.ª matr.',50]], studentResults.graduadosMatricula, [
      ['antes_2016','<2016'],['ano_2016','2016'],['ano_2017','2017'],['ano_2018','2018'],['ano_2019','2019'],['ano_2020','2020'],['ano_2021','2021'],['ano_2022','2022'],['ano_2023','2023'],
    ]);

    // Docentes
    startNewSection('A. Corpo Docente — ' + YEAR);
    subTitle('Docentes por regime, grau académico e género');
    const docCols = [{ label: 'Regime', w: 65 }, { label: 'Província', w: 58 }, { label: 'Nac.', w: 60 }, { label: 'Lic.H', w: 30, align: 'center' }, { label: 'Lic.M', w: 30, align: 'center' }, { label: 'Mest.H', w: 32, align: 'center' }, { label: 'Mest.M', w: 32, align: 'center' }, { label: 'Dout.H', w: 32, align: 'center' }, { label: 'Dout.M', w: 32, align: 'center' }, { label: 'Total', w: 44, align: 'center', total: true }];
    tableHeader(docCols);
    (data.docentes || []).forEach((r, i) => {
      const tot = (parseInt(r.lic_h) || 0) + (parseInt(r.lic_m) || 0) + (parseInt(r.mest_h) || 0) + (parseInt(r.mest_m) || 0) + (parseInt(r.dout_h) || 0) + (parseInt(r.dout_m) || 0);
      tableRow(docCols, [r.regime === 'tempo_inteiro' ? 'T.Inteiro' : 'T.Parcial', r.provincia, r.nacionalidade, r.lic_h || 0, r.lic_m || 0, r.mest_h || 0, r.mest_m || 0, r.dout_h || 0, r.dout_m || 0, tot], i % 2 === 1);
    });

    const addDocExtraTable = (title, cols, rows, valueFn) => {
      subTitle(title);
      tableHeader(cols);
      (rows || []).forEach((r, i) => tableRow(cols, valueFn(r), i % 2 === 1));
    };
    const ageDocCols = [
      { label: 'Classe de idade', w: 90 }, { label: 'Moz TI', w: 50, align: 'center' },
      { label: 'Moz TP', w: 50, align: 'center' }, { label: 'Estr TI', w: 50, align: 'center' },
      { label: 'Estr TP', w: 50, align: 'center' }, { label: 'Total TI', w: 70, align: 'center', total: true },
      { label: 'Total TP', w: 70, align: 'center', total: true },
    ];
    const ageValues = (r) => [
      r.classe_idade,
      (parseInt(r.moz_ti_h) || 0) + (parseInt(r.moz_ti_m) || 0),
      (parseInt(r.moz_tp_h) || 0) + (parseInt(r.moz_tp_m) || 0),
      (parseInt(r.estr_ti_h) || 0) + (parseInt(r.estr_ti_m) || 0),
      (parseInt(r.estr_tp_h) || 0) + (parseInt(r.estr_tp_m) || 0),
      (parseInt(r.moz_ti_h) || 0) + (parseInt(r.moz_ti_m) || 0) + (parseInt(r.estr_ti_h) || 0) + (parseInt(r.estr_ti_m) || 0),
      (parseInt(r.moz_tp_h) || 0) + (parseInt(r.moz_tp_m) || 0) + (parseInt(r.estr_tp_h) || 0) + (parseInt(r.estr_tp_m) || 0),
    ];
    addDocExtraTable('A2 — Docentes por grupo etário, nacionalidade e regime', ageDocCols, data.docentesResultados?.grupoEtario, ageValues);

    const degreeKeys = [
      ['lic_h', 'Lic.H'], ['lic_m', 'Lic.M'], ['mest_h', 'Mest.H'], ['mest_m', 'Mest.M'],
      ['dout_h', 'Dout.H'], ['dout_m', 'Dout.M'],
    ];
    const degreeCols = [{ label: 'Descrição', w: 155 }, ...degreeKeys.map(([, label]) => ({ label, w: 50, align: 'center' }))];
    const ageDegreeKeys = [
      ['lic_ti_h','Lic.TI H'],['lic_ti_m','Lic.TI M'],['lic_tp_h','Lic.TP H'],['lic_tp_m','Lic.TP M'],
      ['mest_ti_h','Mest.TI H'],['mest_ti_m','Mest.TI M'],['mest_tp_h','Mest.TP H'],['mest_tp_m','Mest.TP M'],
      ['dout_ti_h','Dout.TI H'],['dout_ti_m','Dout.TI M'],['dout_tp_h','Dout.TP H'],['dout_tp_m','Dout.TP M'],
      ['pos_ti_h','Pós.TI H'],['pos_ti_m','Pós.TI M'],['pos_tp_h','Pós.TP H'],['pos_tp_m','Pós.TP M'],
    ];
    const ageDegreeCols = [{ label: 'Classe de idade', w: 95 }, ...ageDegreeKeys.map(([, label]) => ({ label, w: 34, align: 'center' }))];
    addDocExtraTable('A3 — Docentes por grupo etário, grau e regime', ageDegreeCols, data.docentesResultados?.grupoEtarioGrau,
      (r) => [r.classe_idade, ...ageDegreeKeys.map(([key]) => r[key] || 0)]);
    addDocExtraTable('A4 — Docentes por área de formação, grau e sexo', degreeCols, data.docentesResultados?.areaFormacao, (r) => [r.area_formacao, ...degreeKeys.map(([key]) => r[key] || 0)]);
    addDocExtraTable('A5 — Docentes por curso de formação, grau e sexo', degreeCols, data.docentesResultados?.cursoFormacao, (r) => [r.curso_formacao, ...degreeKeys.map(([key]) => r[key] || 0)]);
    const categoryCols = [{ label: 'Categoria', w: 300 }, { label: 'Homens', w: 70, align: 'center' }, { label: 'Mulheres', w: 70, align: 'center' }];
    addDocExtraTable('A6 — Docentes por regime, categoria e sexo', categoryCols, data.docentesResultados?.categoria, (r) => [
      `${r.regime === 'tempo_inteiro' ? 'Tempo inteiro' : 'Tempo parcial'} — ${r.categoria || ''}`, r.homens || 0, r.mulheres || 0,
    ]);
    addDocExtraTable('A7 — Docentes por relação contratual, grau e sexo', degreeCols, data.docentesResultados?.relacao, (r) => [r.relacao, ...degreeKeys.map(([key]) => r[key] || 0)]);
    const ctaKeys = [
      ['ensino_primario_h', 'Prim.H'], ['ensino_primario_m', 'Prim.M'], ['secundario_1_h', 'Sec1.H'], ['secundario_1_m', 'Sec1.M'],
      ['secundario_2_h', 'Sec2.H'], ['secundario_2_m', 'Sec2.M'], ['bacharel_h', 'Bach.H'], ['bacharel_m', 'Bach.M'],
      ['lic_h', 'Lic.H'], ['lic_m', 'Lic.M'], ['mest_h', 'Mest.H'], ['mest_m', 'Mest.M'], ['dout_h', 'Dout.H'], ['dout_m', 'Dout.M'],
    ];
    const ctaCols = [{ label: 'Descrição', w: 105 }, ...ctaKeys.map(([, label]) => ({ label, w: 29, align: 'center' }))];
    addDocExtraTable('B1 — CTA por nível de formação, sexo e regime', ctaCols, data.cta?.nivelFormacao, (r) => [r.regime, ...ctaKeys.map(([key]) => r[key] || 0)]);
    addDocExtraTable('B3 — CTA por relação contratual, nível e sexo', ctaCols, data.cta?.relacao, (r) => [r.relacao, ...ctaKeys.map(([key]) => r[key] || 0)]);
    addDocExtraTable('B4 — CTA por grupo etário, nacionalidade e regime', ageDocCols, data.cta?.grupoEtario, ageValues);

    // Investigadores
    const { computeC13 } = require('./investigadoresStats');
    startNewSection('C. Investigadores — ' + YEAR);
    subTitle('C.1 — Por nacionalidade, regime, formação e sexo');
    const invCols = [{ label: 'Regime', w: 62 }, { label: 'Nac.', w: 72 }, { label: 'Lic.H', w: 32, align: 'center' }, { label: 'Lic.M', w: 32, align: 'center' }, { label: 'Mest.H', w: 34, align: 'center' }, { label: 'Mest.M', w: 34, align: 'center' }, { label: 'Dout.H', w: 34, align: 'center' }, { label: 'Dout.M', w: 34, align: 'center' }, { label: 'Pós.H', w: 32, align: 'center' }, { label: 'Pós.M', w: 32, align: 'center' }, { label: 'Tot.', w: 38, align: 'center', total: true }];
    tableHeader(invCols);
    (data.investigadores || []).forEach((r, i) => {
      const tot = (parseInt(r.lic_h) || 0) + (parseInt(r.lic_m) || 0) + (parseInt(r.mest_h) || 0) + (parseInt(r.mest_m) || 0) + (parseInt(r.dout_h) || 0) + (parseInt(r.dout_m) || 0) + (parseInt(r.pos_h) || 0) + (parseInt(r.pos_m) || 0);
      tableRow(invCols, [r.regime === 'tempo_inteiro' ? 'T.Inteiro' : 'T.Parcial', r.nacionalidade, r.lic_h || 0, r.lic_m || 0, r.mest_h || 0, r.mest_m || 0, r.dout_h || 0, r.dout_m || 0, r.pos_h || 0, r.pos_m || 0, tot], i % 2 === 1);
    });

    subTitle('C.1.3 — Por tipo de contrato, formação e sexo');
    const c13Cols = [{ label: 'Contrato', w: 80 }, { label: 'Lic.H', w: 36, align: 'center' }, { label: 'Lic.M', w: 36, align: 'center' }, { label: 'Mest.H', w: 38, align: 'center' }, { label: 'Mest.M', w: 38, align: 'center' }, { label: 'Dout.H', w: 38, align: 'center' }, { label: 'Dout.M', w: 38, align: 'center' }, { label: 'Pós.H', w: 36, align: 'center' }, { label: 'Pós.M', w: 36, align: 'center' }];
    tableHeader(c13Cols);
    computeC13(data.investigadores).forEach((r, i) => {
      tableRow(c13Cols, [r.tipo_contrato, r.lic_h, r.lic_m, r.mest_h, r.mest_m, r.dout_h, r.dout_m, r.pos_h, r.pos_m], i % 2 === 1);
    });

    subTitle('C.2 — Por grupo etário, nacionalidade e sexo');
    const etCols = [{ label: 'Idade', w: 88 }, { label: 'Moz.H', w: 38, align: 'center' }, { label: 'Moz.M', w: 38, align: 'center' }, { label: 'Estr.H', w: 38, align: 'center' }, { label: 'Estr.M', w: 38, align: 'center' }, { label: 'Tot.H', w: 40, align: 'center' }, { label: 'Tot.M', w: 40, align: 'center' }, { label: 'Tot.', w: 42, align: 'center', total: true }];
    ['tempo_inteiro', 'tempo_parcial'].forEach((regime) => {
      doc.moveDown(0.3);
      doc.fillColor(MID).fontSize(9).font('Helvetica-Bold').text(regime === 'tempo_inteiro' ? 'Quadro C.2.1 — Tempo Inteiro' : 'Quadro C.2.2 — Tempo Parcial');
      doc.moveDown(0.2);
      doc.fillColor(DARK).font('Helvetica').fontSize(10);
      tableHeader(etCols);
      (data.investigadoresGrupoEtario || []).filter((r) => r.regime === regime).forEach((r, i) => {
        const th = (parseInt(r.moz_h) || 0) + (parseInt(r.estr_h) || 0);
        const tm = (parseInt(r.moz_m) || 0) + (parseInt(r.estr_m) || 0);
        tableRow(etCols, [r.classe_idade, r.moz_h || 0, r.moz_m || 0, r.estr_h || 0, r.estr_m || 0, th, tm, th + tm], i % 2 === 1);
      });
    });

    subTitle('C.3 — Por área de formação, sexo e nacionalidade');
    const areaCols = [{ label: 'Área', w: 140 }, { label: 'Moz.H', w: 32, align: 'center' }, { label: 'Moz.M', w: 32, align: 'center' }, { label: 'Estr.H', w: 32, align: 'center' }, { label: 'Estr.M', w: 32, align: 'center' }, { label: 'Tot.', w: 36, align: 'center', total: true }];
    ['tempo_inteiro', 'tempo_parcial'].forEach((regime) => {
      doc.moveDown(0.3);
      doc.fillColor(MID).fontSize(9).font('Helvetica-Bold').text(regime === 'tempo_inteiro' ? 'Quadro C.3.1 — Tempo Inteiro' : 'Quadro C.3.2 — Tempo Parcial');
      doc.moveDown(0.2);
      doc.fillColor(DARK).font('Helvetica').fontSize(10);
      tableHeader(areaCols);
      (data.investigadoresAreaFormacao || []).filter((r) => r.regime === regime).forEach((r, i) => {
        const tot = (parseInt(r.moz_h) || 0) + (parseInt(r.moz_m) || 0) + (parseInt(r.estr_h) || 0) + (parseInt(r.estr_m) || 0);
        tableRow(areaCols, [r.area_formacao, r.moz_h || 0, r.moz_m || 0, r.estr_h || 0, r.estr_m || 0, tot], i % 2 === 1);
      });
    });

    const res = data.investigadoresResultados || {};

    subTitle('C.4.1 — Conferências');
    const confCols = [{ label: 'Tipo', w: 70 }, { label: 'Lic.H', w: 34, align: 'center' }, { label: 'Lic.M', w: 34, align: 'center' }, { label: 'Mest.H', w: 36, align: 'center' }, { label: 'Mest.M', w: 36, align: 'center' }, { label: 'Dout.H', w: 36, align: 'center' }, { label: 'Dout.M', w: 36, align: 'center' }, { label: 'Pós.H', w: 34, align: 'center' }, { label: 'Pós.M', w: 34, align: 'center' }];
    tableHeader(confCols);
    (res.conferencias || []).forEach((r, i) => {
      tableRow(confCols, [r.tipo_conferencia, r.lic_h || 0, r.lic_m || 0, r.mest_h || 0, r.mest_m || 0, r.dout_h || 0, r.dout_m || 0, r.pos_h || 0, r.pos_m || 0], i % 2 === 1);
    });

    subTitle('C.4.2 — Produção científica');
    const prodCols = [{ label: 'Área', w: 100 }, { label: 'Art', w: 28, align: 'center' }, { label: 'Liv', w: 28, align: 'center' }, { label: 'Cap', w: 28, align: 'center' }, { label: 'CNac', w: 32, align: 'center' }, { label: 'CInt', w: 32, align: 'center' }];
    tableHeader(prodCols);
    (res.producao || []).forEach((r, i) => {
      const art = (r.artigos_h || 0) + (r.artigos_m || 0);
      const liv = (r.livros_h || 0) + (r.livros_m || 0);
      const cap = (r.capitulos_h || 0) + (r.capitulos_m || 0);
      const cn = (r.conf_nac_h || 0) + (r.conf_nac_m || 0);
      const ci = (r.conf_int_h || 0) + (r.conf_int_m || 0);
      tableRow(prodCols, [r.area_formacao, art, liv, cap, cn, ci], i % 2 === 1);
    });

    subTitle('C.4.3 — Pubs. revisão por pares');
    tableHeader(confCols);
    (res.pubsPares || []).forEach((r, i) => {
      tableRow(confCols, [r.provincia || '—', r.lic_h || 0, r.lic_m || 0, r.mest_h || 0, r.mest_m || 0, r.dout_h || 0, r.dout_m || 0, r.pos_h || 0, r.pos_m || 0], i % 2 === 1);
    });

    subTitle('C.4.4 — Publicações por docente');
    const bandCols = [{ label: 'N.º', w: 40, align: 'center' }, { label: 'Lic.H', w: 40, align: 'center' }, { label: 'Lic.M', w: 40, align: 'center' }, { label: 'Mest.H', w: 42, align: 'center' }, { label: 'Mest.M', w: 42, align: 'center' }, { label: 'Dout.H', w: 42, align: 'center' }, { label: 'Dout.M', w: 42, align: 'center' }];
    tableHeader(bandCols);
    (res.pubsPorDocente || []).forEach((r, i) => {
      tableRow(bandCols, [r.num_publicacoes, r.lic_h || 0, r.lic_m || 0, r.mest_h || 0, r.mest_m || 0, r.dout_h || 0, r.dout_m || 0], i % 2 === 1);
    });

    subTitle('C.4.5 — Publicações por tipo');
    const tipoCols = [{ label: 'Tipo', w: 160 }, { label: 'Lic.H', w: 36, align: 'center' }, { label: 'Lic.M', w: 36, align: 'center' }, { label: 'Mest.H', w: 38, align: 'center' }, { label: 'Mest.M', w: 38, align: 'center' }, { label: 'Dout.H', w: 38, align: 'center' }, { label: 'Dout.M', w: 38, align: 'center' }];
    tableHeader(tipoCols);
    (res.pubsTipo || []).forEach((r, i) => {
      tableRow(tipoCols, [r.tipo_publicacao, r.lic_h || 0, r.lic_m || 0, r.mest_h || 0, r.mest_m || 0, r.dout_h || 0, r.dout_m || 0], i % 2 === 1);
    });

    subTitle('C.5 — Orientações');
    const orientLabels = { dissertacao: 'Dissertações', monografia: 'Monografias', tese: 'Teses' };
    ['dissertacao', 'monografia', 'tese'].forEach((tipo) => {
      doc.moveDown(0.3);
      doc.fillColor(MID).fontSize(9).font('Helvetica-Bold').text(orientLabels[tipo]);
      doc.moveDown(0.2);
      doc.fillColor(DARK).font('Helvetica').fontSize(10);
      tableHeader(bandCols);
      (res.orientacoes || []).filter((r) => r.tipo === tipo).forEach((r, i) => {
        tableRow(bandCols, [r.num_orientacoes, r.lic_h || 0, r.lic_m || 0, r.mest_h || 0, r.mest_m || 0, r.dout_h || 0, r.dout_m || 0], i % 2 === 1);
      });
    });

    subTitle('C.6.1 — Pesquisas');
    const pesqCols = [{ label: 'N.º', w: 40, align: 'center' }, { label: 'Em curso', w: 70, align: 'center' }, { label: 'Concluídas', w: 70, align: 'center' }];
    tableHeader(pesqCols);
    (res.pesquisas || []).forEach((r, i) => {
      tableRow(pesqCols, [i + 1, r.em_curso || 0, r.concluidas || 0], i % 2 === 1);
    });

    subTitle('Actividades de Extensão');
    const extCols = [{ label: 'Acção', w: 280 }, { label: 'Qtd', w: 50, align: 'center' }];
    tableHeader(extCols);
    (res.extensao || []).forEach((r, i) => {
      tableRow(extCols, [r.accao, r.quantidade || 0], i % 2 === 1);
    });

    subTitle('C.6.2 — Extensão por nível');
    const enCols = [{ label: 'N.º', w: 40, align: 'center' }, { label: 'Nível', w: 120 }, { label: 'Qtd', w: 50, align: 'center' }];
    tableHeader(enCols);
    (res.extensaoNivel || []).forEach((r, i) => {
      tableRow(enCols, [i + 1, r.nivel || '—', r.quantidade || 0], i % 2 === 1);
    });

    // Finanças
    startNewSection('Recursos Financeiros — ' + YEAR);
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
    finRow('Salários – Outros', fin.sal_outros);
    const totalDespCorrente = (parseFloat(fin.func_ensino) || 0) + (parseFloat(fin.func_investig) || 0) + (parseFloat(fin.func_admin) || 0) + (parseFloat(fin.sal_docentes) || 0) + (parseFloat(fin.sal_tecnicos) || 0) + (parseFloat(fin.sal_outros) || 0);
    finRow('Subtotal despesas correntes', totalDespCorrente, true);
    doc.moveDown(0.4);
    subTitle('Despesa de investimento');
    finRow('Investimento', fin.desp_invest);
    finRow('Depreciação', fin.desp_deprec);
    finRow('Outros', fin.desp_invest_outros);
    finRow('Reembolso de capital', fin.desp_reembolso);
    finRow('Grande total', totalDespCorrente + (parseFloat(fin.desp_invest) || 0) + (parseFloat(fin.desp_deprec) || 0) + (parseFloat(fin.desp_invest_outros) || 0) + (parseFloat(fin.desp_reembolso) || 0), true);

    // Infraestruturas
    startNewSection('D. Infraestruturas — ' + YEAR);
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
    doc.moveDown(0.6);
    subTitle('Quadro 1.3 – Bibliotecas em funcionamento');
    const bibCols = [{ label: 'Unidade Orgânica', w: 175 }, { label: 'Província', w: 78 }, { label: 'Distrito', w: 78 }, { label: 'Físicas', w: 50, align: 'center', total: true }, { label: 'Virtuais', w: 50, align: 'center', total: true }];
    tableHeader(bibCols);
    (data.infra?.bibliotecas || []).forEach((r, i) => tableRow(bibCols, [r.unidade, r.provincia, r.distrito, r.num_fisicas || 0, r.num_virtuais || 0], i % 2 === 1));
    totalRow(bibCols, ['Total', '', '', (data.infra?.bibliotecas || []).reduce((a, r) => a + (parseInt(r.num_fisicas) || 0), 0), (data.infra?.bibliotecas || []).reduce((a, r) => a + (parseInt(r.num_virtuais) || 0), 0)]);
    doc.moveDown(0.6);
    subTitle('Quadro 1.4 – Computadores para estudantes');
    const compCols = [{ label: 'Unidade Orgânica', w: 200 }, { label: 'Província', w: 90 }, { label: 'Distrito', w: 90 }, { label: 'N.º', w: 55, align: 'center', total: true }];
    tableHeader(compCols);
    (data.infra?.computadores || []).forEach((r, i) => tableRow(compCols, [r.unidade, r.provincia, r.distrito, r.num_computadores || 0], i % 2 === 1));
    totalRow(compCols, ['Total', '', '', (data.infra?.computadores || []).reduce((a, r) => a + (parseInt(r.num_computadores) || 0), 0)]);

    // Previsão
    startNewSection('Previsão / Preliminar para ' + NEXT_YEAR);
    subTitle('Estudantes previstos por curso, grau e género');
    const prevCols = [{ label: 'Nome do curso', w: 128 }, { label: 'Dur.', w: 36, align: 'center' }, { label: 'Área', w: 78 }, { label: 'Grau', w: 76 }, { label: 'Província', w: 62 }, { label: 'H', w: 28, align: 'center' }, { label: 'M', w: 28, align: 'center' }, { label: 'Total', w: 39, align: 'center', total: true }];
    tableHeader(prevCols);
    let ptH = 0, ptM = 0;
    (data.previsao || []).forEach((r, i) => { const h = parseInt(r.homens) || 0, m = parseInt(r.mulheres) || 0; ptH += h; ptM += m; tableRow(prevCols, [r.curso, r.duracao, r.area, r.grau, r.provincia, h, m, h + m], i % 2 === 1); });
    totalRow(prevCols, ['TOTAL', '', '', '', '', ptH, ptM, ptH + ptM]);

    // Desporto e Cultura
    const cultData = data.cultura || {};
    const partTotal = (r) => (parseInt(r.estudantes_h) || 0) + (parseInt(r.estudantes_m) || 0) + (parseInt(r.docentes_h) || 0) + (parseInt(r.docentes_m) || 0);
    const cultCols = [{ label: 'Descrição', w: 200 }, { label: 'Detalhe', w: 120 }, { label: 'Est. H', w: 40, align: 'center' }, { label: 'Est. M', w: 40, align: 'center' }, { label: 'Total', w: 50, align: 'center', total: true }];

    startNewSection('E. Desporto e Cultura — ' + YEAR);

    subTitle('1. Eventos desportivos organizados');
    tableHeader(cultCols);
    (cultData.desportoOrganizado || []).forEach((r, i) => tableRow(cultCols, [r.nome_atividade, r.modalidade, r.estudantes_h || 0, r.estudantes_m || 0, partTotal(r)], i % 2 === 1));

    subTitle('2. Participação em eventos desportivos');
    tableHeader(cultCols);
    (cultData.desportoParticipacao || []).forEach((r, i) => tableRow(cultCols, [r.nome_atividade, r.entidade_org, r.estudantes_h || 0, r.estudantes_m || 0, partTotal(r)], i % 2 === 1));

    subTitle('3. Atividades culturais organizadas');
    tableHeader(cultCols);
    (cultData.culturaOrganizada || []).forEach((r, i) => tableRow(cultCols, [r.nome_atividade, r.tipo_atividade, r.estudantes_h || 0, r.estudantes_m || 0, partTotal(r)], i % 2 === 1));

    subTitle('4. Participação em atividades culturais');
    tableHeader(cultCols);
    (cultData.culturaParticipacao || []).forEach((r, i) => tableRow(cultCols, [r.nome_evento, r.entidade_org, r.estudantes_h || 0, r.estudantes_m || 0, partTotal(r)], i % 2 === 1));

    subTitle('5. Grupos culturais');
    tableHeader(cultCols);
    (cultData.grupos || []).forEach((r, i) => tableRow(cultCols, [r.nome_grupo, r.expressao_artistica, r.estudantes_h || 0, r.estudantes_m || 0, partTotal(r)], i % 2 === 1));

    subTitle('6. Tuna académica');
    const tunaCols = [{ label: 'Nome membro', w: 160 }, { label: 'Cargo', w: 120 }, { label: 'Ano ingresso', w: 80, align: 'center' }, { label: 'Distinções', w: 160 }];
    tableHeader(tunaCols);
    (cultData.tuna || []).forEach((r, i) => tableRow(tunaCols, [r.nome_membro, r.cargo, r.ano_ingresso || '—', r.distincoes || '—'], i % 2 === 1));

    subTitle('7. Estudantes em atividades');
    const estActCols = [{ label: 'Nome', w: 130 }, { label: 'Curso', w: 90 }, { label: 'Sexo', w: 40, align: 'center' }, { label: 'Atividade', w: 110 }, { label: 'Evento', w: 110 }];
    tableHeader(estActCols);
    (cultData.estudantesAtividades || []).forEach((r, i) => tableRow(estActCols, [r.nome_completo, r.curso, r.sexo || '—', r.atividade, r.evento], i % 2 === 1));

    // Sumário Geral
    const { computePrevisao } = require('./previsaoSummary');
    const summary = computePrevisao(data);
    startNewSection('Sumário Geral — ' + YEAR);
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
    [['Ensino', summary.financas.func_ensino], ['Investigação', summary.financas.func_investig], ['Administração', summary.financas.func_admin], ['Salário Docentes', summary.financas.sal_docentes], ['Salário Técnicos', summary.financas.sal_tecnicos], ['Salário Outros', summary.financas.sal_outros]].forEach(([l, v], i) => tableRow(finSumCols, [l, (parseFloat(v) || 0).toLocaleString('pt-MZ')], i % 2 === 1));
    totalRow(finSumCols, ['Subtotal correntes', (parseFloat(summary.financas.totalDespCorrente) || 0).toLocaleString('pt-MZ')]);
    [['Investimento', summary.financas.desp_invest], ['Depreciação', summary.financas.desp_deprec], ['Outros invest.', summary.financas.desp_invest_outros], ['Reembolso', summary.financas.desp_reembolso]].forEach(([l, v], i) => tableRow(finSumCols, [l, (parseFloat(v) || 0).toLocaleString('pt-MZ')], i % 2 === 1));
    totalRow(finSumCols, ['Grande total despesas', (parseFloat(summary.financas.totalDesp) || 0).toLocaleString('pt-MZ')]);

    subTitle('V. Infraestrutura');
    const infCols = [{ label: 'Tipo', w: 320 }, { label: 'Total', w: 135, align: 'center', total: true }];
    tableHeader(infCols);
    tableRow(infCols, ['Laboratórios', summary.infraestrutura.totalLabs], false);
    tableRow(infCols, ['Salas de aulas', summary.infraestrutura.totalSalas], true);
    tableRow(infCols, ['Bibliotecas físicas', summary.infraestrutura.totalBibFisicas], false);
    tableRow(infCols, ['Bibliotecas virtuais', summary.infraestrutura.totalBibVirtuais], true);
    tableRow(infCols, ['Computadores para estudantes', summary.infraestrutura.totalComputadores], false);

    subTitle('VI. Desporto e Cultura');
    const cult = summary.cultura || {};
    const cultSummaryCols = [{ label: 'Indicador', w: 320 }, { label: 'Total', w: 135, align: 'center', total: true }];
    tableHeader(cultSummaryCols);
    tableRow(cultSummaryCols, ['N.º de eventos desportivos', cult.totalEventosDesportivos || 0], false);
    tableRow(cultSummaryCols, ['N.º de eventos culturais', cult.totalEventosCulturais || 0], true);
    tableRow(cultSummaryCols, ['Grupos culturais existentes', cult.totalGruposCulturais || 0], false);
    tableRow(cultSummaryCols, ['Membros da tuna académica', cult.totalTunaAcademica || 0], true);
    tableRow(cultSummaryCols, ['Estudantes envolvidos em eventos desportivos', cult.totalEstudantesDesporto || 0], false);
    tableRow(cultSummaryCols, ['Estudantes envolvidos em eventos culturais', cult.totalEstudantesCultura || 0], true);
    totalRow(cultSummaryCols, ['Total geral de estudantes envolvidos', (cult.totalEstudantesDesporto || 0) + (cult.totalEstudantesCultura || 0)]);

    // ==================== FINAL PAGE NUMBERING ====================
    const range = doc.bufferedPageRange();

    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);

      // Draw footer
      doc.save();
      doc.fillColor('#999').fontSize(7).font('Helvetica')
         .text(
           `${APP} · Página ${i + 1} de ${range.count}`,
           40,
           doc.page.height - 25,
           { width: W, align: 'center' }
         );
      doc.restore();
    }

    // Ensure buffered pages are flushed into the output exactly once
    if (typeof doc.flushPages === 'function') {
      try { doc.flushPages(); } catch (e) { /* ignore if unavailable */ }
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
