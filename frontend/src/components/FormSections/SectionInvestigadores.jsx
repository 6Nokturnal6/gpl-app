import { Card, TableWrap, Th, Td, AddRowBtn, SectionTitle } from '../Layout/FormComponents';
import { emptyInvestigador } from '../../hooks/useSubmission';
import { CURRENT_YEAR } from '../../utils/appConfig';
import {
  computeC13, emptyPubsPares, emptyPesquisa, emptyExtensaoNivel,
} from '../../utils/investigadoresStats';

const NACS = ['Moçambicana', 'Estrangeira'];
const PROVINCIAS = ['Maputo','Gaza','Inhambane','Sofala','Manica','Tete','Zambézia','Nampula','Cabo Delgado','Niassa','Cidade de Maputo'];
const NIVEIS = ['Licenciatura', 'Mestrado', 'Doutoramento', 'Pós-Graduação'];
const ORIENT_LABELS = { dissertacao: 'Dissertações', monografia: 'Monografias', tese: 'Teses' };

const td = { border: '0.5px solid var(--color-border-tertiary)', padding: '3px 6px' };
const numInp = (value, onChange, width = 44) => (
  <input type="number" min="0" value={value ?? ''} onChange={(e) => onChange(parseInt(e.target.value) || 0)}
    style={{ border: 'none', background: 'transparent', width, fontSize: 12, textAlign: 'center' }} />
);

function thStyle(center) {
  return {
    border: '0.5px solid var(--color-border-tertiary)',
    padding: '6px 8px',
    fontSize: 11,
    fontWeight: 500,
    color: 'var(--color-text-secondary)',
    background: 'var(--color-background-secondary)',
    textAlign: center ? 'center' : 'left',
  };
}

function InvTable({ rows, onSet, onAdd, onRemove }) {
  return (
    <>
      <TableWrap>
        <thead>
          <tr>
            <Th>Nacionalidade</Th>
            <Th center>Lic. H</Th><Th center>Lic. M</Th>
            <Th center>Mest. H</Th><Th center>Mest. M</Th>
            <Th center>Dout. H</Th><Th center>Dout. M</Th>
            <Th center>Pós-G. H</Th><Th center>Pós-G. M</Th>
            <Th center>Total</Th><Th></Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const tot = (r.lic_h || 0) + (r.lic_m || 0) + (r.mest_h || 0) + (r.mest_m || 0) + (r.dout_h || 0) + (r.dout_m || 0) + (r.pos_h || 0) + (r.pos_m || 0);
            return (
              <tr key={i}>
                <td style={td}>
                  <select value={r.nacionalidade || 'Moçambicana'} onChange={(e) => onSet(i, 'nacionalidade', e.target.value)} style={{ border: 'none', background: 'transparent', fontSize: 12 }}>
                    {NACS.map((n) => <option key={n}>{n}</option>)}
                  </select>
                </td>
                {['lic_h', 'lic_m', 'mest_h', 'mest_m', 'dout_h', 'dout_m', 'pos_h', 'pos_m'].map((k) => (
                  <td key={k} style={{ ...td, textAlign: 'center' }}>{numInp(r[k], (v) => onSet(i, k, v))}</td>
                ))}
                <Td total>{tot}</Td>
                <td style={{ ...td, textAlign: 'center' }}>
                  <button onClick={() => onRemove(i)} style={{ fontSize: 11, color: 'var(--color-text-danger)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </TableWrap>
      <AddRowBtn onClick={onAdd} />
    </>
  );
}

function C13Table({ rows }) {
  const degrees = [
    { h: 'lic_h', m: 'lic_m', label: 'Licenciatura' },
    { h: 'mest_h', m: 'mest_m', label: 'Mestrado' },
    { h: 'dout_h', m: 'dout_m', label: 'Doutoramento' },
    { h: 'pos_h', m: 'pos_m', label: 'Pós-Graduação' },
  ];
  return (
    <TableWrap>
      <thead>
        <tr>
          <th style={thStyle()}>Tipo de Contrato</th>
          {degrees.map((d) => (
            <th key={d.label} colSpan={3} style={thStyle(true)}>{d.label}</th>
          ))}
        </tr>
        <tr>
          <th style={thStyle()}></th>
          {degrees.flatMap((d) => [
            <th key={`${d.label}-h`} style={thStyle(true)}>H</th>,
            <th key={`${d.label}-m`} style={thStyle(true)}>M</th>,
            <th key={`${d.label}-t`} style={thStyle(true)}>Total</th>,
          ])}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={{ background: i % 2 === 1 ? 'var(--color-background-secondary)' : 'transparent' }}>
            <td style={{ ...td, fontWeight: i === rows.length - 1 ? 600 : 400 }}>{r.tipo_contrato}</td>
            {degrees.map((d) => {
              const h = r[d.h] || 0, m = r[d.m] || 0;
              return [
                <td key={`${d.h}-v`} style={{ ...td, textAlign: 'center' }}>{h}</td>,
                <td key={`${d.m}-v`} style={{ ...td, textAlign: 'center' }}>{m}</td>,
                <td key={`${d.label}-tot`} style={{ ...td, textAlign: 'center', fontWeight: 500 }}>{h + m}</td>,
              ];
            })}
          </tr>
        ))}
      </tbody>
    </TableWrap>
  );
}

/** Shared Moz/Estr H/M table (C.2 / C.3) */
function MozEstrTable({ rows, labelKey, labelHeader, onSet }) {
  return (
    <TableWrap>
      <thead>
        <tr>
          <th style={thStyle()}>{labelHeader}</th>
          <th colSpan={3} style={thStyle(true)}>Moçambicanos</th>
          <th colSpan={3} style={thStyle(true)}>Estrangeiros</th>
          <th colSpan={3} style={thStyle(true)}>Todos</th>
        </tr>
        <tr>
          <th style={thStyle()}></th>
          {['H', 'M', 'Total', 'H', 'M', 'Total', 'H', 'M', 'Total'].map((label, i) => (
            <th key={i} style={thStyle(true)}>{label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const mozT = (r.moz_h || 0) + (r.moz_m || 0);
          const estrT = (r.estr_h || 0) + (r.estr_m || 0);
          const todosH = (r.moz_h || 0) + (r.estr_h || 0);
          const todosM = (r.moz_m || 0) + (r.estr_m || 0);
          return (
            <tr key={i} style={{ background: i % 2 === 1 ? 'var(--color-background-secondary)' : 'transparent' }}>
              <td style={{ ...td, fontSize: 12 }}>{r[labelKey]}</td>
              <td style={{ ...td, textAlign: 'center' }}>{numInp(r.moz_h, (v) => onSet(i, 'moz_h', v))}</td>
              <td style={{ ...td, textAlign: 'center' }}>{numInp(r.moz_m, (v) => onSet(i, 'moz_m', v))}</td>
              <td style={{ ...td, textAlign: 'center', fontWeight: 500 }}>{mozT}</td>
              <td style={{ ...td, textAlign: 'center' }}>{numInp(r.estr_h, (v) => onSet(i, 'estr_h', v))}</td>
              <td style={{ ...td, textAlign: 'center' }}>{numInp(r.estr_m, (v) => onSet(i, 'estr_m', v))}</td>
              <td style={{ ...td, textAlign: 'center', fontWeight: 500 }}>{estrT}</td>
              <td style={{ ...td, textAlign: 'center', fontWeight: 500 }}>{todosH}</td>
              <td style={{ ...td, textAlign: 'center', fontWeight: 500 }}>{todosM}</td>
              <td style={{ ...td, textAlign: 'center', fontWeight: 500 }}>{todosH + todosM}</td>
            </tr>
          );
        })}
      </tbody>
    </TableWrap>
  );
}

/** Degree × sex editable table (C.4.1, C.4.4, C.4.5, C.5) */
function DegreeSexTable({ rows, labelKey, labelHeader, onSet, withPos = false, bandLabel }) {
  const degrees = [
    { h: 'lic_h', m: 'lic_m', label: 'Licenciatura' },
    { h: 'mest_h', m: 'mest_m', label: 'Mestrado' },
    { h: 'dout_h', m: 'dout_m', label: 'Doutoramento' },
  ];
  if (withPos) degrees.push({ h: 'pos_h', m: 'pos_m', label: 'Pós-Graduação' });
  return (
    <TableWrap>
      <thead>
        <tr>
          <th style={thStyle()}>{labelHeader}</th>
          {degrees.map((d) => (
            <th key={d.label} colSpan={3} style={thStyle(true)}>{d.label}</th>
          ))}
        </tr>
        <tr>
          <th style={thStyle()}></th>
          {degrees.flatMap((d) => [
            <th key={`${d.label}-h`} style={thStyle(true)}>H</th>,
            <th key={`${d.label}-m`} style={thStyle(true)}>M</th>,
            <th key={`${d.label}-t`} style={thStyle(true)}>Tot</th>,
          ])}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={{ background: i % 2 === 1 ? 'var(--color-background-secondary)' : 'transparent' }}>
            <td style={{ ...td, fontSize: 12 }}>{bandLabel ? `${bandLabel}: ${r[labelKey]}` : r[labelKey]}</td>
            {degrees.map((d) => {
              const h = r[d.h] || 0, m = r[d.m] || 0;
              return [
                <td key={`${d.h}-v`} style={{ ...td, textAlign: 'center' }}>{numInp(r[d.h], (v) => onSet(i, d.h, v))}</td>,
                <td key={`${d.m}-v`} style={{ ...td, textAlign: 'center' }}>{numInp(r[d.m], (v) => onSet(i, d.m, v))}</td>,
                <td key={`${d.label}-tot`} style={{ ...td, textAlign: 'center', fontWeight: 500 }}>{h + m}</td>,
              ];
            })}
          </tr>
        ))}
      </tbody>
    </TableWrap>
  );
}

function ProducaoTable({ rows, onSet }) {
  const groups = [
    { h: 'artigos_h', m: 'artigos_m', label: 'Artigos' },
    { h: 'livros_h', m: 'livros_m', label: 'Livros' },
    { h: 'capitulos_h', m: 'capitulos_m', label: 'Capítulos' },
    { h: 'conf_nac_h', m: 'conf_nac_m', label: 'Conf. Nac.' },
    { h: 'conf_int_h', m: 'conf_int_m', label: 'Conf. Int.' },
  ];
  return (
    <TableWrap>
      <thead>
        <tr>
          <th style={thStyle()}>Área de formação</th>
          {groups.map((g) => (
            <th key={g.label} colSpan={3} style={thStyle(true)}>{g.label}</th>
          ))}
        </tr>
        <tr>
          <th style={thStyle()}></th>
          {groups.flatMap((g) => [
            <th key={`${g.label}-h`} style={thStyle(true)}>H</th>,
            <th key={`${g.label}-m`} style={thStyle(true)}>M</th>,
            <th key={`${g.label}-t`} style={thStyle(true)}>Tot</th>,
          ])}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={{ background: i % 2 === 1 ? 'var(--color-background-secondary)' : 'transparent' }}>
            <td style={{ ...td, fontSize: 11 }}>{r.area_formacao}</td>
            {groups.map((g) => {
              const h = r[g.h] || 0, m = r[g.m] || 0;
              return [
                <td key={`${g.h}-v`} style={{ ...td, textAlign: 'center' }}>{numInp(r[g.h], (v) => onSet(i, g.h, v), 36)}</td>,
                <td key={`${g.m}-v`} style={{ ...td, textAlign: 'center' }}>{numInp(r[g.m], (v) => onSet(i, g.m, v), 36)}</td>,
                <td key={`${g.label}-tot`} style={{ ...td, textAlign: 'center', fontWeight: 500, fontSize: 11 }}>{h + m}</td>,
              ];
            })}
          </tr>
        ))}
      </tbody>
    </TableWrap>
  );
}

function PubsParesTable({ rows, onSet, onAdd, onRemove }) {
  const degrees = [
    { h: 'lic_h', m: 'lic_m', label: 'Lic.' },
    { h: 'mest_h', m: 'mest_m', label: 'Mest.' },
    { h: 'dout_h', m: 'dout_m', label: 'Dout.' },
    { h: 'pos_h', m: 'pos_m', label: 'Pós-G.' },
  ];
  return (
    <>
      <TableWrap>
        <thead>
          <tr>
            <th style={thStyle()}>Província</th>
            {degrees.map((d) => (
              <th key={d.label} colSpan={2} style={thStyle(true)}>{d.label}</th>
            ))}
            <th style={thStyle()}></th>
          </tr>
          <tr>
            <th style={thStyle()}></th>
            {degrees.flatMap((d) => [
              <th key={`${d.label}-h`} style={thStyle(true)}>H</th>,
              <th key={`${d.label}-m`} style={thStyle(true)}>M</th>,
            ])}
            <th style={thStyle()}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td style={td}>
                <select value={r.provincia || ''} onChange={(e) => onSet(i, 'provincia', e.target.value)} style={{ border: 'none', background: 'transparent', fontSize: 12, width: 120 }}>
                  <option value="">—</option>
                  {PROVINCIAS.map((p) => <option key={p}>{p}</option>)}
                </select>
              </td>
              {degrees.flatMap((d) => [
                <td key={`${d.h}-v`} style={{ ...td, textAlign: 'center' }}>{numInp(r[d.h], (v) => onSet(i, d.h, v))}</td>,
                <td key={`${d.m}-v`} style={{ ...td, textAlign: 'center' }}>{numInp(r[d.m], (v) => onSet(i, d.m, v))}</td>,
              ])}
              <td style={{ ...td, textAlign: 'center' }}>
                <button onClick={() => onRemove(i)} style={{ fontSize: 11, color: 'var(--color-text-danger)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
              </td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
      <AddRowBtn onClick={onAdd} />
    </>
  );
}

export default function SectionInvestigadores({ data, update }) {
  const all = data.investigadores || [];
  const grupoEtario = data.investigadoresGrupoEtario || [];
  const areaFormacao = data.investigadoresAreaFormacao || [];
  const res = data.investigadoresResultados || {};
  const ti = all.filter((r) => r.regime === 'tempo_inteiro');
  const tp = all.filter((r) => r.regime === 'tempo_parcial');
  const tiEtario = grupoEtario.filter((r) => r.regime === 'tempo_inteiro');
  const tpEtario = grupoEtario.filter((r) => r.regime === 'tempo_parcial');
  const tiArea = areaFormacao.filter((r) => r.regime === 'tempo_inteiro');
  const tpArea = areaFormacao.filter((r) => r.regime === 'tempo_parcial');
  const c13 = computeC13(all);

  const setRow = (regime, i, k, v) => {
    const updated = (regime === 'tempo_inteiro' ? ti : tp).map((r, idx) => idx === i ? { ...r, [k]: v } : r);
    update('investigadores', [
      ...(regime === 'tempo_inteiro' ? updated : ti).map((r) => ({ ...r, regime: 'tempo_inteiro' })),
      ...(regime === 'tempo_parcial' ? updated : tp).map((r) => ({ ...r, regime: 'tempo_parcial' })),
    ]);
  };

  const setEtarioRow = (regime, i, k, v) => {
    const regimeRows = regime === 'tempo_inteiro' ? tiEtario : tpEtario;
    const updated = regimeRows.map((r, idx) => idx === i ? { ...r, [k]: v } : r);
    update('investigadoresGrupoEtario', [
      ...(regime === 'tempo_inteiro' ? updated : tiEtario).map((r) => ({ ...r, regime: 'tempo_inteiro' })),
      ...(regime === 'tempo_parcial' ? updated : tpEtario).map((r) => ({ ...r, regime: 'tempo_parcial' })),
    ]);
  };

  const setAreaRow = (regime, i, k, v) => {
    const regimeRows = regime === 'tempo_inteiro' ? tiArea : tpArea;
    const updated = regimeRows.map((r, idx) => idx === i ? { ...r, [k]: v } : r);
    update('investigadoresAreaFormacao', [
      ...(regime === 'tempo_inteiro' ? updated : tiArea).map((r) => ({ ...r, regime: 'tempo_inteiro' })),
      ...(regime === 'tempo_parcial' ? updated : tpArea).map((r) => ({ ...r, regime: 'tempo_parcial' })),
    ]);
  };

  const setRes = (section, rows) => update('investigadoresResultados', { ...res, [section]: rows });
  const setResRow = (section, i, k, v) => {
    const rows = (res[section] || []).map((r, idx) => idx === i ? { ...r, [k]: v } : r);
    setRes(section, rows);
  };
  const setOrientRow = (tipo, i, k, v) => {
    let seen = -1;
    setRes('orientacoes', (res.orientacoes || []).map((r) => {
      if (r.tipo !== tipo) return r;
      seen += 1;
      return seen === i ? { ...r, [k]: v } : r;
    }));
  };

  const addRow = (regime) => update('investigadores', [...all, { ...emptyInvestigador(regime), regime }]);
  const removeRow = (regime, i) => {
    const filtered = (regime === 'tempo_inteiro' ? ti : tp).filter((_, idx) => idx !== i);
    const other = regime === 'tempo_inteiro' ? tp : ti;
    update('investigadores', [
      ...filtered.map((r) => ({ ...r, regime: 'tempo_inteiro' })),
      ...other.map((r) => ({ ...r, regime: 'tempo_parcial' })),
    ]);
  };

  return (
    <Card title="C. Dados sobre Investigação" desc={`Estatística sobre recursos humanos de investigação (${CURRENT_YEAR})`}>

      <SectionTitle>C.1 — Por nacionalidade, regime, formação e sexo</SectionTitle>
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 8 }}>Quadro C.1.1 — Tempo Inteiro</div>
      <InvTable rows={ti} onSet={(i, k, v) => setRow('tempo_inteiro', i, k, v)} onAdd={() => addRow('tempo_inteiro')} onRemove={(i) => removeRow('tempo_inteiro', i)} />

      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '16px 0 8px' }}>Quadro C.1.2 — Tempo Parcial</div>
      <InvTable rows={tp} onSet={(i, k, v) => setRow('tempo_parcial', i, k, v)} onAdd={() => addRow('tempo_parcial')} onRemove={(i) => removeRow('tempo_parcial', i)} />

      <SectionTitle style={{ marginTop: 24 }}>C.1.3 — Por tipo de contrato, formação e sexo</SectionTitle>
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
        Calculado automaticamente a partir dos quadros C.1.1 e C.1.2
      </div>
      <C13Table rows={c13} />

      <SectionTitle style={{ marginTop: 24 }}>C.2 — Por grupo etário, nacionalidade e sexo</SectionTitle>
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 8 }}>Quadro C.2.1 — Tempo Inteiro</div>
      <MozEstrTable rows={tiEtario} labelKey="classe_idade" labelHeader="Classe de idade" onSet={(i, k, v) => setEtarioRow('tempo_inteiro', i, k, v)} />

      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '16px 0 8px' }}>Quadro C.2.2 — Tempo Parcial</div>
      <MozEstrTable rows={tpEtario} labelKey="classe_idade" labelHeader="Classe de idade" onSet={(i, k, v) => setEtarioRow('tempo_parcial', i, k, v)} />

      <SectionTitle style={{ marginTop: 24 }}>C.3 — Por área de formação, sexo e nacionalidade</SectionTitle>
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 8 }}>Quadro C.3.1 — Tempo Inteiro</div>
      <MozEstrTable rows={tiArea} labelKey="area_formacao" labelHeader="Área de formação" onSet={(i, k, v) => setAreaRow('tempo_inteiro', i, k, v)} />

      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '16px 0 8px' }}>Quadro C.3.2 — Tempo Parcial</div>
      <MozEstrTable rows={tpArea} labelKey="area_formacao" labelHeader="Área de formação" onSet={(i, k, v) => setAreaRow('tempo_parcial', i, k, v)} />

      <SectionTitle style={{ marginTop: 24 }}>C.4 — Resultados de Investigação</SectionTitle>
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 8 }}>Quadro C.4.1 — Trabalhos apresentados em conferências</div>
      <DegreeSexTable rows={res.conferencias || []} labelKey="tipo_conferencia" labelHeader="Tipo de conferência" withPos onSet={(i, k, v) => setResRow('conferencias', i, k, v)} />

      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '16px 0 8px' }}>Quadro C.4.2 — Produção científica por área e sexo</div>
      <ProducaoTable rows={res.producao || []} onSet={(i, k, v) => setResRow('producao', i, k, v)} />

      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '16px 0 8px' }}>Quadro C.4.3 — Investigadores com publicações com revisão por pares</div>
      <PubsParesTable
        rows={res.pubsPares || []}
        onSet={(i, k, v) => setResRow('pubsPares', i, k, v)}
        onAdd={() => setRes('pubsPares', [...(res.pubsPares || []), emptyPubsPares()])}
        onRemove={(i) => setRes('pubsPares', (res.pubsPares || []).filter((_, idx) => idx !== i))}
      />

      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '16px 0 8px' }}>Quadro C.4.4 — Publicações por docente, nível e sexo</div>
      <DegreeSexTable rows={res.pubsPorDocente || []} labelKey="num_publicacoes" labelHeader="N.º publicações" bandLabel="N.º" onSet={(i, k, v) => setResRow('pubsPorDocente', i, k, v)} />

      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '16px 0 8px' }}>Quadro C.4.5 — Publicações por tipo</div>
      <DegreeSexTable rows={res.pubsTipo || []} labelKey="tipo_publicacao" labelHeader="Tipo de publicação" onSet={(i, k, v) => setResRow('pubsTipo', i, k, v)} />

      <SectionTitle style={{ marginTop: 24 }}>C.5 — Trabalhos de Conclusão do Curso</SectionTitle>
      {['dissertacao', 'monografia', 'tese'].map((tipo, qi) => {
        const rows = (res.orientacoes || []).filter((r) => r.tipo === tipo);
        return (
          <div key={tipo}>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: qi === 0 ? '0 0 8px' : '16px 0 8px' }}>
              Quadro C.5.{qi + 1} — {ORIENT_LABELS[tipo]} orientadas por docente
            </div>
            <DegreeSexTable
              rows={rows}
              labelKey="num_orientacoes"
              labelHeader={`${ORIENT_LABELS[tipo]}/docente`}
              onSet={(i, k, v) => setOrientRow(tipo, i, k, v)}
            />
          </div>
        );
      })}

      <SectionTitle style={{ marginTop: 24 }}>C.6 — Pesquisas e Actividades de Extensão</SectionTitle>
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 8 }}>C.6.1 — Número de pesquisas</div>
      <TableWrap>
        <thead>
          <tr>
            <Th center>N.º</Th>
            <Th center>Em curso</Th>
            <Th center>Concluídas</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody>
          {(res.pesquisas || []).map((r, i) => (
            <tr key={i}>
              <td style={{ ...td, textAlign: 'center' }}>{i + 1}</td>
              <td style={{ ...td, textAlign: 'center' }}>{numInp(r.em_curso, (v) => setResRow('pesquisas', i, 'em_curso', v))}</td>
              <td style={{ ...td, textAlign: 'center' }}>{numInp(r.concluidas, (v) => setResRow('pesquisas', i, 'concluidas', v))}</td>
              <td style={{ ...td, textAlign: 'center' }}>
                <button onClick={() => setRes('pesquisas', (res.pesquisas || []).filter((_, idx) => idx !== i))} style={{ fontSize: 11, color: 'var(--color-text-danger)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
              </td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
      <AddRowBtn onClick={() => setRes('pesquisas', [...(res.pesquisas || []), emptyPesquisa()])} />

      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '16px 0 8px' }}>Actividades de Extensão</div>
      <TableWrap>
        <thead>
          <tr>
            <Th>Acção de extensão / Produção</Th>
            <Th center>Quantidade</Th>
          </tr>
        </thead>
        <tbody>
          {(res.extensao || []).map((r, i) => (
            <tr key={i} style={{ background: i % 2 === 1 ? 'var(--color-background-secondary)' : 'transparent' }}>
              <td style={{ ...td, fontSize: 12 }}>{r.accao}</td>
              <td style={{ ...td, textAlign: 'center' }}>{numInp(r.quantidade, (v) => setResRow('extensao', i, 'quantidade', v))}</td>
            </tr>
          ))}
        </tbody>
      </TableWrap>

      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '16px 0 8px' }}>Quadro C.6.2 — Actividades de extensão por nível de formação</div>
      <TableWrap>
        <thead>
          <tr>
            <Th center>N.º</Th>
            <Th>Nível</Th>
            <Th center>Quantidade</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody>
          {(res.extensaoNivel || []).map((r, i) => (
            <tr key={i}>
              <td style={{ ...td, textAlign: 'center' }}>{i + 1}</td>
              <td style={td}>
                <select value={r.nivel || ''} onChange={(e) => setResRow('extensaoNivel', i, 'nivel', e.target.value)} style={{ border: 'none', background: 'transparent', fontSize: 12 }}>
                  <option value="">—</option>
                  {NIVEIS.map((n) => <option key={n}>{n}</option>)}
                </select>
              </td>
              <td style={{ ...td, textAlign: 'center' }}>{numInp(r.quantidade, (v) => setResRow('extensaoNivel', i, 'quantidade', v))}</td>
              <td style={{ ...td, textAlign: 'center' }}>
                <button onClick={() => setRes('extensaoNivel', (res.extensaoNivel || []).filter((_, idx) => idx !== i))} style={{ fontSize: 11, color: 'var(--color-text-danger)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
              </td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
      <AddRowBtn onClick={() => setRes('extensaoNivel', [...(res.extensaoNivel || []), emptyExtensaoNivel()])} />
    </Card>
  );
}
