import { Card, TableWrap, Th, Td, AddRowBtn, ErrorBanner } from '../Layout/FormComponents';
import { emptyEstudante } from '../../hooks/useSubmission';
import { useState } from 'react';

const GRAUS = ['Licenciatura','Mestrado','Doutoramento','Pós-Graduação','Diploma de Especialização'];
const REGIMES = ['Presencial','Distância','Misto'];

export default function SectionEstudantes({ data, update }) {
  const rows = data.estudantes || [];
  const [errors, setErrors] = useState({});

  const set = (i, k, v) => {
    const updated = rows.map((r, idx) => idx === i ? { ...r, [k]: v } : r);
    update('estudantes', updated);
  };

  const addRow = () => update('estudantes', [...rows, emptyEstudante()]);

  const removeRow = (i) => {
    if (rows.length <= 1) return;
    update('estudantes', rows.filter((_, idx) => idx !== i));
  };

  const totalH = rows.reduce((a, r) => a + (parseInt(r.homens) || 0), 0);
  const totalM = rows.reduce((a, r) => a + (parseInt(r.mulheres) || 0), 0);

  return (
    <Card title="1. Estatística sobre Corpo Discente" desc="Quadro 1.1 – Estudantes por curso, género, regime e grau (ano lectivo 2024)">
      <ErrorBanner message={errors._general} />
      <TableWrap>
        <thead>
          <tr>
            <Th>Nome do curso</Th>
            <Th>Dur.</Th>
            <Th>Área ISCED</Th>
            <Th>Sub-área</Th>
            <Th>Regime</Th>
            <Th>Província</Th>
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
                  <input value={r.curso || ''} onChange={e => set(i,'curso',e.target.value)} style={{ border:'none',background:'transparent',width:'100%',fontSize:12,minWidth:130 }} placeholder="Nome do curso" />
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
                  <input value={r.provincia || ''} onChange={e => set(i,'provincia',e.target.value)} style={{ border:'none',background:'transparent',width:70,fontSize:12 }} placeholder="Prov." />
                </td>
                <td style={{ border: '0.5px solid var(--color-border-tertiary)', padding: '3px 6px' }}>
                  <select value={r.grau || 'Licenciatura'} onChange={e => set(i,'grau',e.target.value)} style={{ border:'none',background:'transparent',fontSize:12 }}>
                    {GRAUS.map(g => <option key={g}>{g}</option>)}
                  </select>
                </td>
                <td style={{ border: '0.5px solid var(--color-border-tertiary)', padding: '3px 6px', textAlign:'center' }}>
                  <input type="number" min="0" value={r.homens ?? ''} onChange={e => set(i,'homens',parseInt(e.target.value)||0)} style={{ border:'none',background:'transparent',width:50,fontSize:12,textAlign:'center' }} />
                </td>
                <td style={{ border: '0.5px solid var(--color-border-tertiary)', padding: '3px 6px', textAlign:'center' }}>
                  <input type="number" min="0" value={r.mulheres ?? ''} onChange={e => set(i,'mulheres',parseInt(e.target.value)||0)} style={{ border:'none',background:'transparent',width:50,fontSize:12,textAlign:'center' }} />
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
            <td colSpan={7} style={{ padding:'6px 8px',fontWeight:500,fontSize:12,textAlign:'right',background:'var(--color-background-secondary)',border:'0.5px solid var(--color-border-tertiary)' }}>Total</td>
            <Td total>{totalH}</Td>
            <Td total>{totalM}</Td>
            <Td total>{totalH + totalM}</Td>
            <td style={{ border: '0.5px solid var(--color-border-tertiary)' }}></td>
          </tr>
        </tfoot>
      </TableWrap>
      <AddRowBtn onClick={addRow} label="+ Adicionar curso" />
    </Card>
  );
}
