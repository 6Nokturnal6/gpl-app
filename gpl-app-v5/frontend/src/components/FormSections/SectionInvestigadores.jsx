// SectionInvestigadores.jsx
import { Card, TableWrap, Th, Td, AddRowBtn, SectionTitle } from '../Layout/FormComponents';
import { emptyInvestigador } from '../../hooks/useSubmission';

const NACS = ['Moçambicana','Estrangeira'];

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
            <Th center>Total</Th><Th></Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const tot = (r.lic_h||0)+(r.lic_m||0)+(r.mest_h||0)+(r.mest_m||0)+(r.dout_h||0)+(r.dout_m||0);
            const inp = (k) => <input type="number" min="0" value={r[k]??''} onChange={e=>onSet(i,k,parseInt(e.target.value)||0)} style={{border:'none',background:'transparent',width:44,fontSize:12,textAlign:'center'}} />;
            return (
              <tr key={i}>
                <td style={{border:'0.5px solid var(--color-border-tertiary)',padding:'3px 8px'}}>
                  <select value={r.nacionalidade||'Moçambicana'} onChange={e=>onSet(i,'nacionalidade',e.target.value)} style={{border:'none',background:'transparent',fontSize:12}}>
                    {NACS.map(n=><option key={n}>{n}</option>)}
                  </select>
                </td>
                {['lic_h','lic_m','mest_h','mest_m','dout_h','dout_m'].map(k=>(
                  <td key={k} style={{border:'0.5px solid var(--color-border-tertiary)',textAlign:'center'}}>{inp(k)}</td>
                ))}
                <Td total>{tot}</Td>
                <td style={{border:'0.5px solid var(--color-border-tertiary)',textAlign:'center'}}><button onClick={()=>onRemove(i)} style={{fontSize:11,color:'var(--color-text-danger)',background:'none',border:'none',cursor:'pointer'}}>✕</button></td>
              </tr>
            );
          })}
        </tbody>
      </TableWrap>
      <AddRowBtn onClick={onAdd} />
    </>
  );
}

export default function SectionInvestigadores({ data, update }) {
  const all = data.investigadores || [];
  const ti = all.filter(r => r.regime === 'tempo_inteiro');
  const tp = all.filter(r => r.regime === 'tempo_parcial');

  const setRow = (regime, i, k, v) => {
    const updated = (regime === 'tempo_inteiro' ? ti : tp).map((r, idx) => idx === i ? { ...r, [k]: v } : r);
    update('investigadores', [
      ...(regime === 'tempo_inteiro' ? updated : ti).map(r=>({...r,regime:'tempo_inteiro'})),
      ...(regime === 'tempo_parcial' ? updated : tp).map(r=>({...r,regime:'tempo_parcial'}))
    ]);
  };

  const addRow = (regime) => update('investigadores', [...all, { ...emptyInvestigador(regime), regime }]);

  const removeRow = (regime, i) => {
    const filtered = (regime === 'tempo_inteiro' ? ti : tp).filter((_, idx) => idx !== i);
    const other = regime === 'tempo_inteiro' ? tp : ti;
    update('investigadores', [
      ...filtered.map(r=>({...r,regime:'tempo_inteiro'})),
      ...other.map(r=>({...r,regime:'tempo_parcial'}))
    ]);
  };

  return (
    <Card title="C. Dados sobre Investigação" desc="C.1 – Investigadores por nacionalidade, nível de formação e sexo (2024)">
      <SectionTitle>Tempo Inteiro</SectionTitle>
      <InvTable rows={ti} onSet={(i,k,v)=>setRow('tempo_inteiro',i,k,v)} onAdd={()=>addRow('tempo_inteiro')} onRemove={(i)=>removeRow('tempo_inteiro',i)} />
      <SectionTitle>Tempo Parcial</SectionTitle>
      <InvTable rows={tp} onSet={(i,k,v)=>setRow('tempo_parcial',i,k,v)} onAdd={()=>addRow('tempo_parcial')} onRemove={(i)=>removeRow('tempo_parcial',i)} />
    </Card>
  );
}
