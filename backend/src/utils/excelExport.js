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
    {width:28},{width:10},{width:22},{width:22},{width:14},{width:16},{width:16},{width:12},{width:18},{width:10},{width:10},{width:10}
  ];
  const estTitle = wsEst.addRow([`FOLHAS DE CÁLCULO PARA REPORTAGEM DE ESTATÍSTICA DAS IES — ANO ${YEAR}`]);
  estTitle.getCell(1).style = titleStyle();
  wsEst.mergeCells('A1:L1');
  wsEst.addRow(['1. ESTATÍSTICA SOBRE CORPO DISCENTE']).getCell(1).style = { font: { bold: true, size: 11 } };
  wsEst.mergeCells('A2:L2');
  wsEst.addRow([]);
  const estHdr = wsEst.addRow(['Nome do curso','Duração (anos)','Área ISCED','Sub-área','Regime','Nacionalidade','Província','Distrito','Grau','Homens','Mulheres','Total']);
  estHdr.eachCell(c => { c.style = headerStyle(); });

  let totalH = 0, totalM = 0;
  (data.estudantes || []).forEach(r => {
    const t = (r.homens||0) + (r.mulheres||0);
    totalH += r.homens||0; totalM += r.mulheres||0;
    const row = wsEst.addRow([r.curso, r.duracao, r.area, r.subarea, r.regime, r.nacionalidade||'', r.provincia, r.distrito||'', r.grau, r.homens||0, r.mulheres||0, t]);
    row.eachCell(c => { c.style = cellStyle(); });
    row.getCell(12).style = { ...cellStyle(LIGHT_BLUE), font: { bold: true } };
  });
  const totRow = wsEst.addRow(['TOTAL','','','','','','','', '', totalH, totalM, totalH+totalM]);
  totRow.eachCell(c => { c.style = headerStyle(LIGHT_GREEN.replace('#','')); c.font = { bold: true, size: 10, color: { argb: 'FF' + GREEN } }; });

  // ── Sheet 3: Docentes ──────────────────────────────────────────────────────
  const wsDoc = wb.addWorksheet('Docentes');
  wsDoc.columns = [{width:18},{width:16},{width:16},{width:9},{width:9},{width:9},{width:9},{width:9},{width:9},{width:9},{width:9},{width:9},{width:9}];
  wsDoc.addRow(['Estatística sobre Corpo Docente']).getCell(1).style = titleStyle();
  wsDoc.mergeCells('A1:M1');
  ['tempo_inteiro','tempo_parcial'].forEach((regime, ri) => {
    wsDoc.addRow([]);
    wsDoc.addRow([ri === 0 ? 'Tempo Inteiro' : 'Tempo Parcial']).getCell(1).style = { font: { bold: true, size: 10 } };
    const dHdr = wsDoc.addRow(['Província','Distrito','Nacionalidade','Lic. H','Lic. M','Mest. H','Mest. M','Dout. H','Dout. M','Pós-G. H','Pós-G. M','Total H','Total M']);
    dHdr.eachCell(c => { c.style = headerStyle(); });
    (data.docentes || []).filter(r => r.regime === regime).forEach(r => {
      const row = wsDoc.addRow([r.provincia, r.distrito, r.nacionalidade,
        r.lic_h, r.lic_m, r.mest_h, r.mest_m, r.dout_h, r.dout_m, r.pos_h||0, r.pos_m||0,
        (r.lic_h||0)+(r.mest_h||0)+(r.dout_h||0)+(r.pos_h||0),
        (r.lic_m||0)+(r.mest_m||0)+(r.dout_m||0)+(r.pos_m||0)
      ]);
      row.eachCell(c => { c.style = cellStyle(); });
    });
  });
  const docExtra = data.docentesResultados || {};
  const cta = data.cta || {};
  const docDegreeFields = [
    ['lic_h','Lic. H'],['lic_m','Lic. M'],['mest_h','Mest. H'],['mest_m','Mest. M'],
    ['dout_h','Dout. H'],['dout_m','Dout. M'],['pos_h','Pós-G. H'],['pos_m','Pós-G. M'],
  ];
  const addExtraTable = (title, label, rows, fields) => {
    wsDoc.addRow([]);
    wsDoc.addRow([title]).getCell(1).style = { font: { bold: true, size: 10 } };
    const h = wsDoc.addRow([label, ...fields.map(([, name]) => name)]);
    h.eachCell(c => { c.style = headerStyle(); });
    (rows || []).forEach((r) => {
      const row = wsDoc.addRow([r[label === 'Área de formação' ? 'area_formacao' : label === 'Curso de formação' ? 'curso_formacao' : label === 'Relação' ? 'relacao' : label, ...fields.map(([key]) => r[key] || 0)]);
      row.eachCell(c => { c.style = cellStyle(); });
    });
  };
  addExtraTable('A3 — Área de formação', 'Área de formação', docExtra.areaFormacao, docDegreeFields);
  addExtraTable('A4 — Curso de formação', 'Curso de formação', docExtra.cursoFormacao, docDegreeFields);
  addExtraTable('A6 — Relação contratual', 'Relação', docExtra.relacao, docDegreeFields);
  addExtraTable('B2 — CTA por nacionalidade', 'nacionalidade', cta.nacionalidade, [
    ['ensino_primario_h','Prim. H'],['ensino_primario_m','Prim. M'],['secundario_1_h','Sec.1 H'],['secundario_1_m','Sec.1 M'],
    ['secundario_2_h','Sec.2 H'],['secundario_2_m','Sec.2 M'],['bacharel_h','Bach. H'],['bacharel_m','Bach. M'],
    ['lic_h','Lic. H'],['lic_m','Lic. M'],['mest_h','Mest. H'],['mest_m','Mest. M'],['dout_h','Dout. H'],['dout_m','Dout. M'],
  ]);

  // ── Sheet 4: Investigadores ────────────────────────────────────────────────
  const { computeC13 } = require('./investigadoresStats');
  const wsInv = wb.addWorksheet('Investigadores');
  wsInv.columns = [{width:22},{width:9},{width:9},{width:9},{width:9},{width:9},{width:9},{width:9},{width:9},{width:9},{width:9},{width:9},{width:9}];
  wsInv.addRow([`C - Dados sobre Investigação ${YEAR}`]).getCell(1).style = titleStyle();
  wsInv.mergeCells('A1:M1');

  function invDegreeHdr(rowNum) {
    const r = wsInv.addRow(['', 'Lic. H', 'Lic. M', 'Lic. Tot', 'Mest. H', 'Mest. M', 'Mest. Tot', 'Dout. H', 'Dout. M', 'Dout. Tot', 'Pós-G. H', 'Pós-G. M', 'Pós-G. Tot']);
    r.eachCell(c => { c.style = headerStyle(); });
    if (rowNum) wsInv.getCell(`A${rowNum}`).value = '';
  }
  function invDegreeRow(label, d, shade) {
    const vals = [
      label,
      d.lic_h, d.lic_m, (d.lic_h||0)+(d.lic_m||0),
      d.mest_h, d.mest_m, (d.mest_h||0)+(d.mest_m||0),
      d.dout_h, d.dout_m, (d.dout_h||0)+(d.dout_m||0),
      d.pos_h, d.pos_m, (d.pos_h||0)+(d.pos_m||0),
    ];
    const r = wsInv.addRow(vals);
    r.eachCell(c => { c.style = cellStyle(shade ? GRAY : null); if (c.col > 1) c.alignment = { horizontal: 'center' }; });
  }

  wsInv.addRow(['C.1 — Investigadores por nacionalidade, regime, formação e sexo']).getCell(1).style = { font: { bold: true, size: 10 } };
  ['tempo_inteiro','tempo_parcial'].forEach((regime, ri) => {
    wsInv.addRow([]);
    wsInv.addRow([ri === 0 ? 'Quadro C.1.1 — Tempo Inteiro' : 'Quadro C.1.2 — Tempo Parcial']).getCell(1).style = { font: { bold: true, size: 10 } };
    const iHdr = wsInv.addRow(['Nacionalidade','Lic. H','Lic. M','Mest. H','Mest. M','Dout. H','Dout. M','Pós-G. H','Pós-G. M']);
    iHdr.eachCell(c => { c.style = headerStyle(); });
    (data.investigadores || []).filter(r => r.regime === regime).forEach(r => {
      const row = wsInv.addRow([r.nacionalidade, r.lic_h, r.lic_m, r.mest_h, r.mest_m, r.dout_h, r.dout_m, r.pos_h||0, r.pos_m||0]);
      row.eachCell(c => { c.style = cellStyle(); });
    });
  });

  // C.1.3 — by contract type (computed)
  wsInv.addRow([]);
  wsInv.addRow(['Quadro C.1.3 — Por tipo de contrato, formação e sexo']).getCell(1).style = { font: { bold: true, size: 10 } };
  wsInv.addRow(['Tipo de Contrato', 'Licenciatura', '', '', 'Mestrado', '', '', 'Doutoramento', '', '', 'Pós-Graduação', '', '']);
  invDegreeHdr();
  computeC13(data.investigadores).forEach((r, i) => invDegreeRow(r.tipo_contrato, r, i % 2 === 1));

  // C.2 — age groups
  wsInv.addRow([]);
  wsInv.addRow(['C.2 — Investigadores por grupo etário, nacionalidade e sexo']).getCell(1).style = { font: { bold: true, size: 10 } };
  ['tempo_inteiro','tempo_parcial'].forEach((regime, ri) => {
    wsInv.addRow([]);
    wsInv.addRow([ri === 0 ? 'Quadro C.2.1 — Tempo Inteiro' : 'Quadro C.2.2 — Tempo Parcial']).getCell(1).style = { font: { bold: true, size: 10 } };
    const h = wsInv.addRow(['Classe de idade', 'Moz. H', 'Moz. M', 'Moz. Tot', 'Estr. H', 'Estr. M', 'Estr. Tot', 'Todos H', 'Todos M', 'Todos Tot']);
    h.eachCell(c => { c.style = headerStyle(); });
    (data.investigadoresGrupoEtario || []).filter(r => r.regime === regime).forEach((r, i) => {
      const mozT = (r.moz_h||0)+(r.moz_m||0), estrT = (r.estr_h||0)+(r.estr_m||0);
      const todosH = (r.moz_h||0)+(r.estr_h||0), todosM = (r.moz_m||0)+(r.estr_m||0);
      const row = wsInv.addRow([r.classe_idade, r.moz_h||0, r.moz_m||0, mozT, r.estr_h||0, r.estr_m||0, estrT, todosH, todosM, todosH+todosM]);
      row.eachCell(c => { c.style = cellStyle(i % 2 === 1 ? GRAY : null); if (c.col > 1) c.alignment = { horizontal: 'center' }; });
    });
  });

  // C.3 — area de formação
  wsInv.addRow([]);
  wsInv.addRow(['C.3 — Investigadores por área de formação, sexo e nacionalidade']).getCell(1).style = { font: { bold: true, size: 10 } };
  ['tempo_inteiro','tempo_parcial'].forEach((regime, ri) => {
    wsInv.addRow([]);
    wsInv.addRow([ri === 0 ? 'Quadro C.3.1 — Tempo Inteiro' : 'Quadro C.3.2 — Tempo Parcial']).getCell(1).style = { font: { bold: true, size: 10 } };
    const h = wsInv.addRow(['Área de formação', 'Moz. H', 'Moz. M', 'Moz. Tot', 'Estr. H', 'Estr. M', 'Estr. Tot', 'Todos H', 'Todos M', 'Todos Tot']);
    h.eachCell(c => { c.style = headerStyle(); });
    (data.investigadoresAreaFormacao || []).filter(r => r.regime === regime).forEach((r, i) => {
      const mozT = (r.moz_h||0)+(r.moz_m||0), estrT = (r.estr_h||0)+(r.estr_m||0);
      const todosH = (r.moz_h||0)+(r.estr_h||0), todosM = (r.moz_m||0)+(r.estr_m||0);
      const row = wsInv.addRow([r.area_formacao, r.moz_h||0, r.moz_m||0, mozT, r.estr_h||0, r.estr_m||0, estrT, todosH, todosM, todosH+todosM]);
      row.eachCell(c => { c.style = cellStyle(i % 2 === 1 ? GRAY : null); if (c.col > 1) c.alignment = { horizontal: 'center' }; });
    });
  });

  const res = data.investigadoresResultados || {};

  // C.4.1
  wsInv.addRow([]);
  wsInv.addRow(['C.4 — Resultados de Investigação']).getCell(1).style = { font: { bold: true, size: 10 } };
  wsInv.addRow(['Quadro C.4.1 — Trabalhos apresentados em conferências']).getCell(1).style = { font: { bold: true, size: 10 } };
  wsInv.addRow(['Tipo', 'Licenciatura', '', '', 'Mestrado', '', '', 'Doutoramento', '', '', 'Pós-Graduação', '', '']);
  invDegreeHdr();
  (res.conferencias || []).forEach((r, i) => invDegreeRow(r.tipo_conferencia, r, i % 2 === 1));

  // C.4.2
  wsInv.addRow([]);
  wsInv.addRow(['Quadro C.4.2 — Produção científica por área e sexo']).getCell(1).style = { font: { bold: true, size: 10 } };
  const pHdr = wsInv.addRow(['Área', 'Art.H', 'Art.M', 'Liv.H', 'Liv.M', 'Cap.H', 'Cap.M', 'CNac.H', 'CNac.M', 'CInt.H', 'CInt.M']);
  pHdr.eachCell(c => { c.style = headerStyle(); });
  (res.producao || []).forEach((r, i) => {
    const row = wsInv.addRow([r.area_formacao, r.artigos_h||0, r.artigos_m||0, r.livros_h||0, r.livros_m||0, r.capitulos_h||0, r.capitulos_m||0, r.conf_nac_h||0, r.conf_nac_m||0, r.conf_int_h||0, r.conf_int_m||0]);
    row.eachCell(c => { c.style = cellStyle(i % 2 === 1 ? GRAY : null); if (c.col > 1) c.alignment = { horizontal: 'center' }; });
  });

  // C.4.3
  wsInv.addRow([]);
  wsInv.addRow(['Quadro C.4.3 — Investigadores com publicações com revisão por pares']).getCell(1).style = { font: { bold: true, size: 10 } };
  wsInv.addRow(['Província', 'Licenciatura', '', '', 'Mestrado', '', '', 'Doutoramento', '', '', 'Pós-Graduação', '', '']);
  invDegreeHdr();
  (res.pubsPares || []).forEach((r, i) => invDegreeRow(r.provincia || '—', r, i % 2 === 1));

  // C.4.4
  wsInv.addRow([]);
  wsInv.addRow(['Quadro C.4.4 — Publicações por docente']).getCell(1).style = { font: { bold: true, size: 10 } };
  const d4Hdr = wsInv.addRow(['N.º pubs', 'Lic.H', 'Lic.M', 'Mest.H', 'Mest.M', 'Dout.H', 'Dout.M']);
  d4Hdr.eachCell(c => { c.style = headerStyle(); });
  (res.pubsPorDocente || []).forEach((r, i) => {
    const row = wsInv.addRow([r.num_publicacoes, r.lic_h||0, r.lic_m||0, r.mest_h||0, r.mest_m||0, r.dout_h||0, r.dout_m||0]);
    row.eachCell(c => { c.style = cellStyle(i % 2 === 1 ? GRAY : null); if (c.col > 1) c.alignment = { horizontal: 'center' }; });
  });

  // C.4.5
  wsInv.addRow([]);
  wsInv.addRow(['Quadro C.4.5 — Publicações por tipo']).getCell(1).style = { font: { bold: true, size: 10 } };
  const d5Hdr = wsInv.addRow(['Tipo', 'Lic.H', 'Lic.M', 'Mest.H', 'Mest.M', 'Dout.H', 'Dout.M']);
  d5Hdr.eachCell(c => { c.style = headerStyle(); });
  (res.pubsTipo || []).forEach((r, i) => {
    const row = wsInv.addRow([r.tipo_publicacao, r.lic_h||0, r.lic_m||0, r.mest_h||0, r.mest_m||0, r.dout_h||0, r.dout_m||0]);
    row.eachCell(c => { c.style = cellStyle(i % 2 === 1 ? GRAY : null); if (c.col > 1) c.alignment = { horizontal: 'center' }; });
  });

  // C.5
  wsInv.addRow([]);
  wsInv.addRow(['C.5 — Trabalhos de Conclusão do Curso']).getCell(1).style = { font: { bold: true, size: 10 } };
  const orientLabels = { dissertacao: 'C.5.1 Dissertações', monografia: 'C.5.2 Monografias', tese: 'C.5.3 Teses' };
  ['dissertacao', 'monografia', 'tese'].forEach((tipo) => {
    wsInv.addRow([]);
    wsInv.addRow([orientLabels[tipo]]).getCell(1).style = { font: { bold: true, size: 10 } };
    const oh = wsInv.addRow(['N.º/docente', 'Lic.H', 'Lic.M', 'Mest.H', 'Mest.M', 'Dout.H', 'Dout.M']);
    oh.eachCell(c => { c.style = headerStyle(); });
    (res.orientacoes || []).filter(r => r.tipo === tipo).forEach((r, i) => {
      const row = wsInv.addRow([r.num_orientacoes, r.lic_h||0, r.lic_m||0, r.mest_h||0, r.mest_m||0, r.dout_h||0, r.dout_m||0]);
      row.eachCell(c => { c.style = cellStyle(i % 2 === 1 ? GRAY : null); if (c.col > 1) c.alignment = { horizontal: 'center' }; });
    });
  });

  // C.6
  wsInv.addRow([]);
  wsInv.addRow(['C.6 — Pesquisas e Actividades de Extensão']).getCell(1).style = { font: { bold: true, size: 10 } };
  wsInv.addRow(['C.6.1 — Número de pesquisas']).getCell(1).style = { font: { bold: true, size: 10 } };
  const peHdr = wsInv.addRow(['N.º', 'Em curso', 'Concluídas']);
  peHdr.eachCell(c => { c.style = headerStyle(); });
  (res.pesquisas || []).forEach((r, i) => {
    const row = wsInv.addRow([i + 1, r.em_curso||0, r.concluidas||0]);
    row.eachCell(c => { c.style = cellStyle(i % 2 === 1 ? GRAY : null); c.alignment = { horizontal: 'center' }; });
  });
  wsInv.addRow([]);
  wsInv.addRow(['Actividades de Extensão']).getCell(1).style = { font: { bold: true, size: 10 } };
  const exHdr = wsInv.addRow(['Acção', 'Quantidade']);
  exHdr.eachCell(c => { c.style = headerStyle(); });
  (res.extensao || []).forEach((r, i) => {
    const row = wsInv.addRow([r.accao, r.quantidade||0]);
    row.eachCell(c => { c.style = cellStyle(i % 2 === 1 ? GRAY : null); });
  });
  wsInv.addRow([]);
  wsInv.addRow(['Quadro C.6.2 — Extensão por nível de formação']).getCell(1).style = { font: { bold: true, size: 10 } };
  const enHdr = wsInv.addRow(['N.º', 'Nível', 'Quantidade']);
  enHdr.eachCell(c => { c.style = headerStyle(); });
  (res.extensaoNivel || []).forEach((r, i) => {
    const row = wsInv.addRow([i + 1, r.nivel || '—', r.quantidade||0]);
    row.eachCell(c => { c.style = cellStyle(i % 2 === 1 ? GRAY : null); });
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
    ['Salários – Outros', fin.sal_outros],
  ].forEach(([label, val]) => {
    const row = wsFin.addRow([label, val || 0]);
    row.eachCell(c => { c.style = cellStyle(); });
    row.getCell(2).numFmt = '#,##0';
  });
  const totalDespCorrente = (parseFloat(fin.func_ensino)||0)+(parseFloat(fin.func_investig)||0)+(parseFloat(fin.func_admin)||0)+(parseFloat(fin.sal_docentes)||0)+(parseFloat(fin.sal_tecnicos)||0)+(parseFloat(fin.sal_outros)||0);
  const dTot = wsFin.addRow(['Subtotal despesas correntes', totalDespCorrente]);
  dTot.eachCell(c => { c.style = headerStyle(LIGHT_BLUE); c.font = { bold: true, size: 10, color: { argb: 'FF' + BLUE } }; });
  dTot.getCell(2).numFmt = '#,##0';
  wsFin.addRow([]);
  wsFin.addRow(['Despesa de investimento']).getCell(1).style = { font: { bold: true, size: 10 } };
  [
    ['Investimento', fin.desp_invest],
    ['Depreciação de edifícios e equipamentos', fin.desp_deprec],
    ['Outros', fin.desp_invest_outros],
    ['Reembolso de capital', fin.desp_reembolso],
  ].forEach(([label, val]) => {
    const row = wsFin.addRow([label, val || 0]);
    row.eachCell(c => { c.style = cellStyle(); });
    row.getCell(2).numFmt = '#,##0';
  });
  const totalGeral = totalDespCorrente + (parseFloat(fin.desp_invest)||0)+(parseFloat(fin.desp_deprec)||0)+(parseFloat(fin.desp_invest_outros)||0)+(parseFloat(fin.desp_reembolso)||0);
  const gTot = wsFin.addRow(['Grande total', totalGeral]);
  gTot.eachCell(c => { c.style = headerStyle(LIGHT_BLUE); c.font = { bold: true, size: 10, color: { argb: 'FF' + BLUE } }; });
  gTot.getCell(2).numFmt = '#,##0';

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
  wsInfra.addRow([]);
  wsInfra.addRow(['Quadro 1.3 — Bibliotecas em funcionamento']).getCell(1).style = { font: { bold: true, size: 10 } };
  const bHdr = wsInfra.addRow(['Unidade Orgânica','Província','Distrito','Físicas','Virtuais']);
  bHdr.eachCell(c => { c.style = headerStyle(); });
  (data.infra?.bibliotecas || []).forEach(r => {
    const row = wsInfra.addRow([r.unidade, r.provincia, r.distrito, r.num_fisicas||0, r.num_virtuais||0]);
    row.eachCell(c => { c.style = cellStyle(); });
  });
  wsInfra.addRow([]);
  wsInfra.addRow(['Quadro 1.4 — Computadores disponíveis para estudantes']).getCell(1).style = { font: { bold: true, size: 10 } };
  const cHdr = wsInfra.addRow(['Unidade Orgânica','Província','Distrito','N.º computadores']);
  cHdr.eachCell(c => { c.style = headerStyle(); });
  (data.infra?.computadores || []).forEach(r => {
    const row = wsInfra.addRow([r.unidade, r.provincia, r.distrito, r.num_computadores||0]);
    row.eachCell(c => { c.style = cellStyle(); });
  });

  // ── Sheet 7: Previsão — individual courses ─────────────────────────────────
  const wsPrev = wb.addWorksheet('Previsão');
  wsPrev.columns = [{width:28},{width:10},{width:22},{width:18},{width:16},{width:10},{width:10},{width:10}];
  wsPrev.addRow([`PREVISÃO / PRELIMINAR PARA ${NEXT_YEAR}`]).getCell(1).style = titleStyle();
  wsPrev.mergeCells('A1:H1');
  const prevHdr = wsPrev.addRow(['Nome do curso','Duração','Área','Grau','Província','Homens','Mulheres','Total']);
  prevHdr.eachCell(c => { c.style = headerStyle(); });
  let ptH=0, ptM=0;
  (data.previsao || []).forEach(r => {
    const t=(r.homens||0)+(r.mulheres||0);
    ptH+=r.homens||0; ptM+=r.mulheres||0;
    const row=wsPrev.addRow([r.curso,r.duracao,r.area,r.grau,r.provincia,r.homens||0,r.mulheres||0,t]);
    row.eachCell(c=>{c.style=cellStyle();});
  });
  const ptRow=wsPrev.addRow(['TOTAL','','','','',ptH,ptM,ptH+ptM]);
  ptRow.eachCell(c=>{c.style=headerStyle(LIGHT_GREEN);c.font={bold:true,size:10,color:{argb:'FF'+GREEN}};});

  // ── Sheet 8: Desporto e Cultura ────────────────────────────────────────────
  const cultData = data.cultura || {};
  const wsCult = wb.addWorksheet('Desporto e Cultura');
  wsCult.columns = [{width:26},{width:16},{width:16},{width:20},{width:9},{width:9},{width:9},{width:9},{width:10},{width:14}];

  function cultSection(title, headers, rows, mapRow) {
    wsCult.addRow([title]).getCell(1).style = { font: { bold: true, size: 10 } };
    const hdr = wsCult.addRow(headers);
    hdr.eachCell(c => { c.style = headerStyle(); });
    (rows || []).forEach((row, i) => {
      const r = wsCult.addRow(mapRow(row, i));
      r.eachCell(c => { c.style = cellStyle(i % 2 === 1 ? GRAY : null); });
    });
    wsCult.addRow([]);
  }

  wsCult.addRow(['E. Desporto e Cultura']).getCell(1).style = titleStyle();
  wsCult.mergeCells('A1:J1');
  wsCult.addRow([]);

  const partTotal = (r) => (r.estudantes_h||0)+(r.estudantes_m||0)+(r.docentes_h||0)+(r.docentes_m||0);

  cultSection('1. Eventos desportivos organizados',
    ['Nome atividade','Modalidade','Data e local','Objetivos','Est. H','Est. M','Doc. H','Doc. M','Total'],
    cultData.desportoOrganizado,
    (r) => [r.nome_atividade, r.modalidade, r.data_local, r.objetivos, r.estudantes_h||0, r.estudantes_m||0, r.docentes_h||0, r.docentes_m||0, partTotal(r)]
  );
  cultSection('2. Participação em eventos desportivos',
    ['Nome atividade','Entidade org.','Data e local','Classificação','Est. H','Est. M','Doc. H','Doc. M','Total'],
    cultData.desportoParticipacao,
    (r) => [r.nome_atividade, r.entidade_org, r.data_local, r.classificacao, r.estudantes_h||0, r.estudantes_m||0, r.docentes_h||0, r.docentes_m||0, partTotal(r)]
  );
  cultSection('3. Atividades culturais organizadas',
    ['Nome atividade','Tipo','Data e local','Objetivos','Est. H','Est. M','Doc. H','Doc. M','Total'],
    cultData.culturaOrganizada,
    (r) => [r.nome_atividade, r.tipo_atividade, r.data_local, r.objetivos, r.estudantes_h||0, r.estudantes_m||0, r.docentes_h||0, r.docentes_m||0, partTotal(r)]
  );
  cultSection('4. Participação em atividades culturais',
    ['Nome evento','Entidade org.','Data e local','Distinções','Est. H','Est. M','Doc. H','Doc. M','Total'],
    cultData.culturaParticipacao,
    (r) => [r.nome_evento, r.entidade_org, r.data_local, r.distincoes, r.estudantes_h||0, r.estudantes_m||0, r.docentes_h||0, r.docentes_m||0, partTotal(r)]
  );
  cultSection('5. Grupos culturais',
    ['Nome grupo','Expressão artística','Objetivos','Distinções','Est. H','Est. M','Doc. H','Doc. M','Total'],
    cultData.grupos,
    (r) => [r.nome_grupo, r.expressao_artistica, r.objetivos, r.distincoes, r.estudantes_h||0, r.estudantes_m||0, r.docentes_h||0, r.docentes_m||0, partTotal(r)]
  );
  cultSection('6. Tuna académica',
    ['Nome membro','Cargo/Função','Ano ingresso','Objetivos','Distinções'],
    cultData.tuna,
    (r) => [r.nome_membro, r.cargo, r.ano_ingresso, r.objetivos, r.distincoes]
  );
  cultSection('7. Estudantes em atividades',
    ['Nome completo','N.º estudante','Curso','Ano freq.','Sexo','Atividade','Evento'],
    cultData.estudantesAtividades,
    (r) => [r.nome_completo, r.num_estudante, r.curso, r.ano_frequencia, r.sexo, r.atividade, r.evento]
  );

  // ── Sheet 9: Sumário Geral — computed from all sections ────────────────────
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

  // Students ${YEAR} vs ${NEXT_YEAR}
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
  addSumRow(['Quadros adicionais A2-A6', Object.values(summary.docentesQuadros || {}).slice(0, 5).reduce((a, v) => a + v, 0), '', '', '', '', ''], false);
  addSumRow(['Quadros CTA B1-B4', Object.values(summary.docentesQuadros || {}).slice(5).reduce((a, v) => a + v, 0), '', '', '', '', ''], true);
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
  [['Ensino',summary.financas.func_ensino],['Investigação',summary.financas.func_investig],['Administração',summary.financas.func_admin],['Salário Docentes',summary.financas.sal_docentes],['Salário Técnicos',summary.financas.sal_tecnicos],['Salário Outros',summary.financas.sal_outros]]
    .forEach(([l,v],i)=>{ const r=wsSum.addRow([l,v,'','','','','']); r.eachCell((c,j)=>{c.style=cellStyle(i%2===1?GRAY:null);if(j===2){c.numFmt='#,##0';}}); });
  addSumRow(['Subtotal despesas correntes',summary.financas.totalDespCorrente,'','','','',''],false,true);
  wsSum.addRow([]);
  [['Investimento',summary.financas.desp_invest],['Depreciação',summary.financas.desp_deprec],['Outros investimento',summary.financas.desp_invest_outros],['Reembolso',summary.financas.desp_reembolso]]
    .forEach(([l,v],i)=>{ const r=wsSum.addRow([l,v,'','','','','']); r.eachCell((c,j)=>{c.style=cellStyle(i%2===1?GRAY:null);if(j===2){c.numFmt='#,##0';}}); });
  addSumRow(['Grande total despesas',summary.financas.totalDesp,'','','','',''],false,true);
  wsSum.addRow([]);

  // Infrastructure
  addSumTitle('V. Infraestrutura');
  addSumHdr(['Tipo','Total','','','','','']);
  addSumRow(['Laboratórios em funcionamento',summary.infraestrutura.totalLabs,'','','','',''],false);
  addSumRow(['Salas de aulas',summary.infraestrutura.totalSalas,'','','','',''],true);
  addSumRow(['Bibliotecas físicas',summary.infraestrutura.totalBibFisicas,'','','','',''],false);
  addSumRow(['Bibliotecas virtuais',summary.infraestrutura.totalBibVirtuais,'','','','',''],true);
  addSumRow(['Computadores para estudantes',summary.infraestrutura.totalComputadores,'','','','',''],false);
  wsSum.addRow([]);

  // Cultura
  const cult = summary.cultura || {};
  addSumTitle('VI. Desporto e Cultura');
  addSumHdr(['Indicador','Total','','','','','']);
  addSumRow(['N.º de eventos desportivos',cult.totalEventosDesportivos,'','','','',''],false);
  addSumRow(['N.º de eventos culturais',cult.totalEventosCulturais,'','','','',''],true);
  addSumRow(['Grupos culturais existentes',cult.totalGruposCulturais,'','','','',''],false);
  addSumRow(['Membros da tuna académica',cult.totalTunaAcademica,'','','','',''],true);
  addSumRow(['Estudantes envolvidos em eventos desportivos',cult.totalEstudantesDesporto,'','','','',''],false);
  addSumRow(['Estudantes envolvidos em eventos culturais',cult.totalEstudantesCultura,'','','','',''],true);
  addSumRow(['Total geral de estudantes envolvidos',(cult.totalEstudantesDesporto||0)+(cult.totalEstudantesCultura||0),'','','','',''],false,true);

  return wb;
}

module.exports = { buildExcel };
