import { Card, TableWrap, Th, Td, AddRowBtn, SectionTitle } from '../Layout/FormComponents';
import { emptyDocente, emptyDegreeRow, emptyAgeDocente, emptyDocentesResultados } from '../../hooks/useSubmission';

const NACS = ['Moçambicana', 'Estrangeira'];
const DEGREES = [
  ['lic_h', 'Lic. H'], ['lic_m', 'Lic. M'], ['mest_h', 'Mest. H'], ['mest_m', 'Mest. M'],
  ['dout_h', 'Dout. H'], ['dout_m', 'Dout. M'], ['pos_h', 'Pós-G. H'], ['pos_m', 'Pós-G. M'],
];
const A7_DEGREES = DEGREES.slice(0, 6);
const CTA_DEGREES = [
  ['ensino_primario_h', 'Prim. H'], ['ensino_primario_m', 'Prim. M'],
  ['secundario_1_h', 'Sec.1 H'], ['secundario_1_m', 'Sec.1 M'],
  ['secundario_2_h', 'Sec.2 H'], ['secundario_2_m', 'Sec.2 M'],
  ['bacharel_h', 'Bach. H'], ['bacharel_m', 'Bach. M'],
  ['lic_h', 'Lic. H'], ['lic_m', 'Lic. M'], ['mest_h', 'Mest. H'], ['mest_m', 'Mest. M'],
  ['dout_h', 'Dout. H'], ['dout_m', 'Dout. M'],
];
const td = { border: '0.5px solid var(--color-border-tertiary)', padding: '3px 6px' };
const input = { border: 'none', background: 'transparent', fontSize: 12 };

function num(value, set, width = 44) {
  return <input type="number" min="0" value={value ?? ''} onChange={(e) => set(parseInt(e.target.value, 10) || 0)} style={{ ...input, width, textAlign: 'center' }} />;
}

function EditableTable({ rows, labelKey, labelHeader, fields, onSet, onAdd, onRemove }) {
  return <><TableWrap><thead><tr><Th>{labelHeader}</Th>{fields.map(([, label]) => <Th key={label} center>{label}</Th>)}<Th></Th></tr></thead>
    <tbody>{rows.map((r, i) => <tr key={i}><td style={td}><input value={r[labelKey] || ''} onChange={(e) => onSet(i, labelKey, e.target.value)} style={{ ...input, width: 150 }} /></td>
      {fields.map(([key]) => <td key={key} style={{ ...td, textAlign: 'center' }}>{num(r[key], (v) => onSet(i, key, v))}</td>)}
      <td style={{ ...td, textAlign: 'center' }}><button onClick={() => onRemove(i)} style={{ color: 'var(--color-text-danger)', background: 'none', border: 0 }}>✕</button></td></tr>)}</tbody>
  </TableWrap><AddRowBtn onClick={onAdd} /></>;
}

function AgeTable({ rows, onSet, onAdd, onRemove }) {
  const fields = [['moz_ti_h','Moz TI H'],['moz_ti_m','Moz TI M'],['moz_tp_h','Moz TP H'],['moz_tp_m','Moz TP M'],['estr_ti_h','Estr TI H'],['estr_ti_m','Estr TI M'],['estr_tp_h','Estr TP H'],['estr_tp_m','Estr TP M']];
  return <EditableTable rows={rows} labelKey="classe_idade" labelHeader="Classe de idade" fields={fields} onSet={onSet} onAdd={onAdd} onRemove={onRemove} />;
}

function DocenteTable({ rows, regime, onSet, onAdd, onRemove }) {
  return <><TableWrap><thead><tr><Th>Província</Th><Th>Distrito</Th><Th>Nacionalidade</Th>{DEGREES.map(([, label]) => <Th key={label} center>{label}</Th>)}<Th>Total</Th><Th></Th></tr></thead>
    <tbody>{rows.map((r, i) => { const total = DEGREES.reduce((a, [k]) => a + (parseInt(r[k], 10) || 0), 0);
      return <tr key={i}><td style={td}><input value={r.provincia || ''} onChange={(e) => onSet(i,'provincia',e.target.value)} style={{ ...input, width: 75 }} /></td><td style={td}><input value={r.distrito || ''} onChange={(e) => onSet(i,'distrito',e.target.value)} style={{ ...input, width: 75 }} /></td><td style={td}><select value={r.nacionalidade || 'Moçambicana'} onChange={(e) => onSet(i,'nacionalidade',e.target.value)} style={input}>{NACS.map((n) => <option key={n}>{n}</option>)}</select></td>
        {DEGREES.map(([k]) => <td key={k} style={{ ...td, textAlign: 'center' }}>{num(r[k], (v) => onSet(i,k,v))}</td>)}<Td total>{total}</Td><td style={td}><button onClick={() => onRemove(i)} style={{ color: 'var(--color-text-danger)', background: 'none', border: 0 }}>✕</button></td></tr>; })}</tbody>
  </TableWrap><AddRowBtn onClick={onAdd} /></>;
}

function CtaTable({ rows, labelKey, labelHeader, onSet, onAdd, onRemove }) {
  return <EditableTable rows={rows} labelKey={labelKey} labelHeader={labelHeader} fields={CTA_DEGREES} onSet={onSet} onAdd={onAdd} onRemove={onRemove} />;
}

export default function SectionDocentes({ data, update }) {
  const all = data.docentes || [];
  const ti = all.filter((r) => r.regime === 'tempo_inteiro');
  const tp = all.filter((r) => r.regime === 'tempo_parcial');
  const defaults = emptyDocentesResultados();
  const loaded = data.docentesResultados || {};
  const result = { ...defaults, ...loaded,
    grupoEtario: loaded.grupoEtario?.length ? loaded.grupoEtario : defaults.grupoEtario,
    areaFormacao: loaded.areaFormacao?.length ? loaded.areaFormacao : defaults.areaFormacao,
    cursoFormacao: loaded.cursoFormacao?.length ? loaded.cursoFormacao : defaults.cursoFormacao,
    categoria: loaded.categoria?.length ? loaded.categoria : defaults.categoria,
    relacao: loaded.relacao?.length ? loaded.relacao : defaults.relacao,
  };
  const rawCta = result.cta || {};
  const ctaDefaults = { nivelFormacao: [{ regime: 'tempo_inteiro' }], nacionalidade: [{ nacionalidade: 'Moçambicana' }], relacao: [{ relacao: '' }], grupoEtario: [emptyAgeDocente()] };
  const cta = { ...ctaDefaults, ...rawCta,
    nivelFormacao: rawCta.nivelFormacao?.length ? rawCta.nivelFormacao : ctaDefaults.nivelFormacao,
    nacionalidade: rawCta.nacionalidade?.length ? rawCta.nacionalidade : ctaDefaults.nacionalidade,
    relacao: rawCta.relacao?.length ? rawCta.relacao : ctaDefaults.relacao,
    grupoEtario: rawCta.grupoEtario?.length ? rawCta.grupoEtario : ctaDefaults.grupoEtario,
  };
  const saveResults = (patch) => update('docentesResultados', { ...result, ...patch, cta });
  const setRows = (key, rows) => saveResults({ [key]: rows });
  const editRows = (key, labelKey) => ({
    onSet: (i, k, v) => setRows(key, (result[key] || []).map((r, idx) => idx === i ? { ...r, [k]: v } : r)),
    onAdd: () => setRows(key, [...(result[key] || []), emptyDegreeRow(labelKey)]),
    onRemove: (i) => setRows(key, (result[key] || []).filter((_, idx) => idx !== i)),
  });
  const editAge = (key) => ({
    onSet: (i, k, v) => setRows(key, (result[key] || []).map((r, idx) => idx === i ? { ...r, [k]: v } : r)),
    onAdd: () => setRows(key, [...(result[key] || []), emptyAgeDocente()]),
    onRemove: (i) => setRows(key, (result[key] || []).filter((_, idx) => idx !== i)),
  });
  const patchBase = (regime, rows) => update('docentes', [...rows.map((r) => ({ ...r, regime })), ...(regime === 'tempo_inteiro' ? tp : ti).map((r) => ({ ...r, regime: regime === 'tempo_inteiro' ? 'tempo_parcial' : 'tempo_inteiro' }))]);
  const setBase = (regime, rows, i, k, v) => patchBase(regime, rows.map((r, idx) => idx === i ? { ...r, [k]: v } : r));
  const ctaEdit = (key, labelKey) => ({
    onSet: (i, k, v) => saveResults({ cta: { ...cta, [key]: (cta[key] || []).map((r, idx) => idx === i ? { ...r, [k]: v } : r) } }),
    onAdd: () => saveResults({ cta: { ...cta, [key]: [...(cta[key] || []), labelKey === 'regime' ? { regime: 'tempo_inteiro' } : { [labelKey]: '' }] } }),
    onRemove: (i) => saveResults({ cta: { ...cta, [key]: (cta[key] || []).filter((_, idx) => idx !== i) } }),
  });

  return <Card title="A/B. Corpo Docente e CTA" desc="A1–A7: docentes; B1–B4: corpo técnico-administrativo">
    <SectionTitle>A1 – Docentes por regime</SectionTitle>
    <DocenteTable rows={ti} regime="tempo_inteiro" onSet={(i,k,v) => setBase('tempo_inteiro', ti, i, k, v)} onAdd={() => update('docentes', [...all, { ...emptyDocente('tempo_inteiro') }])} onRemove={(i) => update('docentes', all.filter((r) => !(r.regime === 'tempo_inteiro' && ti.indexOf(r) === i)))} />
    <SectionTitle>Tempo Parcial</SectionTitle>
    <DocenteTable rows={tp} regime="tempo_parcial" onSet={(i,k,v) => setBase('tempo_parcial', tp, i, k, v)} onAdd={() => update('docentes', [...all, { ...emptyDocente('tempo_parcial') }])} onRemove={(i) => update('docentes', all.filter((r) => !(r.regime === 'tempo_parcial' && tp.indexOf(r) === i)))} />
    <SectionTitle>A2 – Docentes por grupo etário</SectionTitle>
    <AgeTable rows={result.grupoEtario || []} {...editAge('grupoEtario')} />
    <SectionTitle>A4 – Área de formação</SectionTitle>
    <EditableTable rows={result.areaFormacao || []} labelKey="area_formacao" labelHeader="Área de formação" fields={DEGREES} {...editRows('areaFormacao','area_formacao')} />
    <SectionTitle>A5 – Curso de formação</SectionTitle>
    <EditableTable rows={result.cursoFormacao || []} labelKey="curso_formacao" labelHeader="Curso de formação" fields={DEGREES} {...editRows('cursoFormacao','curso_formacao')} />
    <SectionTitle>A6 – Categoria</SectionTitle>
    <EditableTable rows={result.categoria || []} labelKey="categoria" labelHeader="Categoria" fields={[['homens','H'],['mulheres','M']]} onSet={(i,k,v) => setRows('categoria', result.categoria.map((r, idx) => idx === i ? { ...r, [k]: v } : r))} onAdd={() => setRows('categoria', [...result.categoria, { regime: 'tempo_inteiro', categoria: '', homens: 0, mulheres: 0 }])} onRemove={(i) => setRows('categoria', result.categoria.filter((_, idx) => idx !== i))} />
    <SectionTitle>A7 – Tipo de relação contratual</SectionTitle>
    <EditableTable rows={result.relacao || []} labelKey="relacao" labelHeader="Tipo de relação contratual" fields={A7_DEGREES} {...editRows('relacao','relacao')} />
    <SectionTitle>B – CTA</SectionTitle>
    <CtaTable rows={cta.nivelFormacao || []} labelKey="regime" labelHeader="B1 – Regime / nível de formação" {...ctaEdit('nivelFormacao','regime')} />
    <CtaTable rows={cta.nacionalidade || []} labelKey="nacionalidade" labelHeader="B2 – Nacionalidade" {...ctaEdit('nacionalidade','nacionalidade')} />
    <CtaTable rows={cta.relacao || []} labelKey="relacao" labelHeader="B3 – Relação contratual" {...ctaEdit('relacao','relacao')} />
    <AgeTable rows={cta.grupoEtario || []} {...ctaEdit('grupoEtario','classe_idade')} />
  </Card>;
}
