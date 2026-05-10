import { Card, TableWrap, Th, Td, AddRowBtn, SectionTitle } from '../Layout/FormComponents';
import { emptyDocente } from '../../hooks/useSubmission';

const NACS = ['Moçambicana','Estrangeira'];

function DocenteTable({ rows, regime, onSet, onAdd, onRemove }) {
  return (
    <>
      <TableWrap>
        <thead>
          <tr>
            <Th>Província</Th><Th>Distrito</Th><Th>Nacionalidade</Th>
            <Th center>Lic. H</Th><Th center>Lic. M</Th>
            <Th center>Mest. H</Th><Th center>Mest. M</Th>
            <Th center>Dout. H</Th><Th center>Dout. M</Th>
            <Th center>Tot. H</Th><Th center>Tot. M</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const tH = (r.lic_h||0)+(r.mest_h||0)+(r.dout_h||0);
            const tM = (r.lic_m||0)+(r.mest_m||0)+(r.dout_m||0);
            const inp = (k) => <input type="number" min="0" value={r[k]??''} onChange={e=>onSet(i,k,parseInt(e.target.value)||0)} style={{border:'none',background:'transparent',width:44,fontSize:12,textAlign:'center'}} />;
            return (
              <tr key={i} style={{ background: i%2===0?'transparent':'var(--color-background-secondary)' }}>
                <td style={{border:'0.5px solid var(--color-border-tertiary)',padding:'3px 6px'}}><input value={r.provincia||''} onChange={e=>onSet(i,'provincia',e.target.value)} style={{border:'none',background:'transparent',width:80,fontSize:12}} placeholder="Prov." /></td>
                <td style={{border:'0.5px solid var(--color-border-tertiary)',padding:'3px 6px'}}><input value={r.distrito||''} onChange={e=>onSet(i,'distrito',e.target.value)} style={{border:'none',background:'transparent',width:80,fontSize:12}} placeholder="Dist." /></td>
                <td style={{border:'0.5px solid var(--color-border-tertiary)',padding:'3px 6px'}}><select value={r.nacionalidade||'Moçambicana'} onChange={e=>onSet(i,'nacionalidade',e.target.value)} style={{border:'none',background:'transparent',fontSize:12}}>{NACS.map(n=><option key={n}>{n}</option>)}</select></td>
                <td style={{border:'0.5px solid var(--color-border-tertiary)',textAlign:'center'}}>{inp('lic_h')}</td>
                <td style={{border:'0.5px solid var(--color-border-tertiary)',textAlign:'center'}}>{inp('lic_m')}</td>
                <td style={{border:'0.5px solid var(--color-border-tertiary)',textAlign:'center'}}>{inp('mest_h')}</td>
                <td style={{border:'0.5px solid var(--color-border-tertiary)',textAlign:'center'}}>{inp('mest_m')}</td>
                <td style={{border:'0.5px solid var(--color-border-tertiary)',textAlign:'center'}}>{inp('dout_h')}</td>
                <td style={{border:'0.5px solid var(--color-border-tertiary)',textAlign:'center'}}>{inp('dout_m')}</td>
                <Td total>{tH}</Td><Td total>{tM}</Td>
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

export default function SectionDocentes({ data, update }) {
  const all = data.docentes || [];
  const ti = all.filter(r => r.regime === 'tempo_inteiro');
  const tp = all.filter(r => r.regime === 'tempo_parcial');

  const setRow = (regime, i, k, v) => {
    const regimeRows = regime === 'tempo_inteiro' ? ti : tp;
    const otherRows = regime === 'tempo_inteiro' ? tp : ti;
    const updated = regimeRows.map((r, idx) => idx === i ? { ...r, [k]: v } : r);
    update('docentes', regime === 'tempo_inteiro'
      ? [...updated.map(r=>({...r,regime:'tempo_inteiro'})), ...otherRows.map(r=>({...r,regime:'tempo_parcial'}))]
      : [...ti.map(r=>({...r,regime:'tempo_inteiro'})), ...updated.map(r=>({...r,regime:'tempo_parcial'}))]
    );
  };

  const addRow = (regime) => {
    update('docentes', [...all, { ...emptyDocente(regime), regime }]);
  };

  const removeRow = (regime, i) => {
    const regimeRows = (regime === 'tempo_inteiro' ? ti : tp).filter((_, idx) => idx !== i);
    const other = regime === 'tempo_inteiro' ? tp : ti;
    update('docentes', [
      ...regimeRows.map(r=>({...r,regime:'tempo_inteiro'})),
      ...other.map(r=>({...r,regime:'tempo_parcial'}))
    ]);
  };

  return (
    <Card title="A. Corpo Docente" desc="A1 – Docentes por regime de contratação, grau académico e género">
      <SectionTitle>Tempo Inteiro</SectionTitle>
      <DocenteTable rows={ti} regime="tempo_inteiro"
        onSet={(i,k,v)=>setRow('tempo_inteiro',i,k,v)}
        onAdd={()=>addRow('tempo_inteiro')}
        onRemove={(i)=>removeRow('tempo_inteiro',i)} />
      <SectionTitle>Tempo Parcial</SectionTitle>
      <DocenteTable rows={tp} regime="tempo_parcial"
        onSet={(i,k,v)=>setRow('tempo_parcial',i,k,v)}
        onAdd={()=>addRow('tempo_parcial')}
        onRemove={(i)=>removeRow('tempo_parcial',i)} />
    </Card>
  );
}
