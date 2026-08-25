import { Card, TableWrap, Th, Td, AddRowBtn, ErrorBanner } from '../Layout/FormComponents';
import { emptyEstudante, emptyEstudanteVaga } from '../../hooks/useSubmission';
import { useState } from 'react';
import { NEXT_YEAR, CURRENT_YEAR } from '../../utils/appConfig';
import { validateEstudantes } from '../../utils/validation';

const GRAUS = ['Licenciatura','Mestrado','Doutoramento','Pós-Graduação','Diploma de Especialização'];
const REGIMES = ['Presencial','Distância','Misto'];
const NACIONALIDADES = ['Moçambicana','Estrangeira'];

export default function SectionEstudantes({ data, update }) {
  const rows = data.estudantes || [];
  const vagaRows = data.estudantesVagas || [emptyEstudanteVaga()];
  const [errors, setErrors] = useState({});

  const set = (i, k, v) => {
    const updated = rows.map((r, idx) => idx === i ? { ...r, [k]: v } : r);
    setErrors(validateEstudantes(updated).errors);
    update('estudantes', updated);
  };

  const addRow = () => {
    const updated = [...rows, emptyEstudante()];
    setErrors(validateEstudantes(updated).errors);
    update('estudantes', updated);
  };

  const removeRow = (i) => {
    if (rows.length <= 1) return;
    const updated = rows.filter((_, idx) => idx !== i);
    setErrors(validateEstudantes(updated).errors);
    update('estudantes', updated);
  };
  const setVaga = (i, k, v) => update('estudantesVagas', vagaRows.map((r, idx) => idx === i ? { ...r, [k]: v } : r));
  const totalPreenchidas = vagaRows.reduce((a, r) => a + (parseInt(r.vagas_preenchidas) || 0), 0);
  const totalNaoPreenchidas = vagaRows.reduce((a, r) => a + (parseInt(r.vagas_nao_preenchidas) || 0), 0);

  const totalH = rows.reduce((a, r) => a + (parseInt(r.homens) || 0), 0);
  const totalM = rows.reduce((a, r) => a + (parseInt(r.mulheres) || 0), 0);

  return (
    <Card title="1. Estatística sobre Corpo Discente" desc={`Quadro 1.1 – Estudantes por curso, género, regime e grau (ano lectivo ${CURRENT_YEAR})`}>
      <ErrorBanner message={errors._general} />
      <TableWrap>
        <thead>
          <tr>
            <Th>Nome do curso</Th>
            <Th>Dur.</Th>
            <Th>Área ISCED</Th>
            <Th>Sub-área</Th>
            <Th>Regime</Th>
            <Th>Nacionalidade</Th>
            <Th>Província</Th>
            <Th>Distrito</Th>
            <Th>Grau</Th>
            <Th center>Homens</Th>
            <Th center>Mulheres</Th>
            <Th center>Total</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const tot = (parseInt(r.homens) || 0) + (parseInt(r.mulheres) || 0);
            return (
              <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--color-background-secondary)' }}>
                <td style={{ border: '0.5px solid var(--color-border-tertiary)', padding: '3px 6px' }}>
                  <input value={r.curso || ''} onChange={e => set(i,'curso',e.target.value)} title={errors[`${i}_curso`]} style={{ border:'none',background:'transparent',width:'100%',fontSize:12,minWidth:130,borderBottom:errors[`${i}_curso`]?'1px solid #A32D2D':undefined }} placeholder="Nome do curso" />
                </td>
                <td style={{ border: '0.5px solid var(--color-border-tertiary)', padding: '3px 6px' }}>
                  <input type="number" min="1" max="10" value={r.duracao || ''} onChange={e => set(i,'duracao',e.target.value)} style={{ border:'none',background:'transparent',width:36,fontSize:12 }} />
                </td>
                <td style={{ border: '0.5px solid var(--color-border-tertiary)', padding: '3px 6px' }}>
                  <input value={r.area || ''} onChange={e => set(i,'area',e.target.value)} style={{ border:'none',background:'transparent',width:'100%',fontSize:12,minWidth:100 }} placeholder="Área" />
                </td>
                <td style={{ border: '0.5px solid var(--color-border-tertiary)', padding: '3px 6px' }}>
                  <input value={r.subarea || ''} onChange={e => set(i,'subarea',e.target.value)} style={{ border:'none',background:'transparent',width:'100%',fontSize:12,minWidth:100 }} placeholder="Sub-área" />
                </td>
                <td style={{ border: '0.5px solid var(--color-border-tertiary)', padding: '3px 6px' }}>
                  <select value={r.regime || 'Presencial'} onChange={e => set(i,'regime',e.target.value)} style={{ border:'none',background:'transparent',fontSize:12 }}>
                    {REGIMES.map(g => <option key={g}>{g}</option>)}
                  </select>
                </td>
                <td style={{ border: '0.5px solid var(--color-border-tertiary)', padding: '3px 6px' }}>
                  <select value={r.nacionalidade || 'Moçambicana'} onChange={e => set(i,'nacionalidade',e.target.value)} style={{ border:'none',background:'transparent',fontSize:12 }}>
                    {NACIONALIDADES.map(n => <option key={n}>{n}</option>)}
                  </select>
                </td>
                <td style={{ border: '0.5px solid var(--color-border-tertiary)', padding: '3px 6px' }}>
                  <input value={r.provincia || ''} onChange={e => set(i,'provincia',e.target.value)} style={{ border:'none',background:'transparent',width:70,fontSize:12 }} placeholder="Prov." />
                </td>
                <td style={{ border: '0.5px solid var(--color-border-tertiary)', padding: '3px 6px' }}>
                  <input value={r.distrito || ''} onChange={e => set(i,'distrito',e.target.value)} style={{ border:'none',background:'transparent',width:70,fontSize:12 }} placeholder="Dist." />
                </td>
                <td style={{ border: '0.5px solid var(--color-border-tertiary)', padding: '3px 6px' }}>
                  <select value={r.grau || 'Licenciatura'} onChange={e => set(i,'grau',e.target.value)} title={errors[`${i}_grau`]} style={{ border:'none',background:'transparent',fontSize:12,borderBottom:errors[`${i}_grau`]?'1px solid #A32D2D':undefined }}>
                    {GRAUS.map(g => <option key={g}>{g}</option>)}
                  </select>
                </td>
                <td style={{ border: '0.5px solid var(--color-border-tertiary)', padding: '3px 6px', textAlign:'center' }}>
                  <input type="number" min="0" value={r.homens ?? ''} onChange={e => set(i,'homens',parseInt(e.target.value)||0)} title={errors[`${i}_homens`]} style={{ border:'none',background:'transparent',width:50,fontSize:12,textAlign:'center',borderBottom:errors[`${i}_homens`]?'1px solid #A32D2D':undefined }} />
                </td>
                <td style={{ border: '0.5px solid var(--color-border-tertiary)', padding: '3px 6px', textAlign:'center' }}>
                  <input type="number" min="0" value={r.mulheres ?? ''} onChange={e => set(i,'mulheres',parseInt(e.target.value)||0)} title={errors[`${i}_mulheres`]} style={{ border:'none',background:'transparent',width:50,fontSize:12,textAlign:'center',borderBottom:errors[`${i}_mulheres`]?'1px solid #A32D2D':undefined }} />
                </td>
                <Td total>{tot}</Td>
                <td style={{ border: '0.5px solid var(--color-border-tertiary)', padding: '3px 6px', textAlign:'center' }}>
                  <button onClick={() => removeRow(i)} style={{ fontSize:11,color:'var(--color-text-danger)',background:'none',border:'none',cursor:'pointer',padding:'2px 4px' }} title="Remover linha">✕</button>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={9} style={{ padding:'6px 8px',fontWeight:500,fontSize:12,textAlign:'right',background:'var(--color-background-secondary)',border:'0.5px solid var(--color-border-tertiary)' }}>Total</td>
            <Td total>{totalH}</Td>
            <Td total>{totalM}</Td>
            <Td total>{totalH + totalM}</Td>
            <td style={{ border: '0.5px solid var(--color-border-tertiary)' }}></td>
          </tr>
        </tfoot>
      </TableWrap>
      <AddRowBtn onClick={addRow} label="+ Adicionar curso" />
      <h3 style={{ marginTop: 24 }}>Quadro 1.2 – Número de vagas preenchidas</h3>
      <TableWrap>
        <thead><tr><Th>Nome do curso</Th><Th>Regime</Th><Th>Nacionalidade</Th><Th>Província</Th><Th>Distrito</Th><Th>Grau</Th><Th center>Preenchidas</Th><Th center>Não preenchidas</Th><Th center>Total</Th></tr></thead>
        <tbody>{vagaRows.map((r, i) => <tr key={i}>
          <td style={{padding:'3px 6px'}}><input value={r.curso || ''} onChange={e => setVaga(i,'curso',e.target.value)} /></td>
          <td style={{padding:'3px 6px'}}><select value={r.regime || 'Presencial'} onChange={e => setVaga(i,'regime',e.target.value)}>{REGIMES.map(v => <option key={v}>{v}</option>)}</select></td>
          <td style={{padding:'3px 6px'}}><select value={r.nacionalidade || 'Moçambicana'} onChange={e => setVaga(i,'nacionalidade',e.target.value)}>{NACIONALIDADES.map(v => <option key={v}>{v}</option>)}</select></td>
          <td style={{padding:'3px 6px'}}><input value={r.provincia || ''} onChange={e => setVaga(i,'provincia',e.target.value)} /></td>
          <td style={{padding:'3px 6px'}}><input value={r.distrito || ''} onChange={e => setVaga(i,'distrito',e.target.value)} /></td>
          <td style={{padding:'3px 6px'}}><select value={r.grau || 'Licenciatura'} onChange={e => setVaga(i,'grau',e.target.value)}>{GRAUS.map(v => <option key={v}>{v}</option>)}</select></td>
          <td style={{padding:'3px 6px',textAlign:'center'}}><input type="number" min="0" value={r.vagas_preenchidas ?? 0} onChange={e => setVaga(i,'vagas_preenchidas',parseInt(e.target.value) || 0)} /></td>
          <td style={{padding:'3px 6px',textAlign:'center'}}><input type="number" min="0" value={r.vagas_nao_preenchidas ?? 0} onChange={e => setVaga(i,'vagas_nao_preenchidas',parseInt(e.target.value) || 0)} /></td>
          <Td total>{(parseInt(r.vagas_preenchidas) || 0) + (parseInt(r.vagas_nao_preenchidas) || 0)}</Td>
        </tr>)}</tbody>
        <tfoot><tr><td colSpan={6}>Total</td><Td total>{totalPreenchidas}</Td><Td total>{totalNaoPreenchidas}</Td><Td total>{totalPreenchidas + totalNaoPreenchidas}</Td></tr></tfoot>
      </TableWrap>
      <AddRowBtn onClick={() => update('estudantesVagas', [...vagaRows, emptyEstudanteVaga()])} label="+ Adicionar curso ao Quadro 1.2" />
    </Card>
  );
}
