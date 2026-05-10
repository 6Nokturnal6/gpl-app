import { Card, TableWrap, Th, Td, AddRowBtn } from '../Layout/FormComponents';
import { emptyPrevisao } from '../../hooks/useSubmission';

const GRAUS = ['Licenciatura','Mestrado','Doutoramento','Pós-Graduação','Diploma de Especialização'];
const td = { border:'0.5px solid var(--color-border-tertiary)', padding:'3px 6px' };

export default function SectionPrevisao({ data, update }) {
  const rows = data.previsao || [];

  const set = (i, k, v) => update('previsao', rows.map((r, idx) => idx === i ? { ...r, [k]: v } : r));
  const addRow = () => update('previsao', [...rows, emptyPrevisao()]);
  const removeRow = (i) => { if (rows.length > 1) update('previsao', rows.filter((_, idx) => idx !== i)); };

  const totalH = rows.reduce((a, r) => a + (parseInt(r.homens)||0), 0);
  const totalM = rows.reduce((a, r) => a + (parseInt(r.mulheres)||0), 0);

  return (
    <Card title="Previsão / Preliminar para 2025" desc="Estudantes previstos por curso, grau e género (estimativa até novembro 2024)">
      <TableWrap>
        <thead>
          <tr>
            <Th>Nome do curso</Th><Th>Dur.</Th><Th>Área</Th><Th>Grau</Th>
            <Th>Província</Th><Th center>Homens</Th><Th center>Mulheres</Th><Th center>Total</Th><Th></Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const tot = (parseInt(r.homens)||0)+(parseInt(r.mulheres)||0);
            return (
              <tr key={i} style={{ background: i%2===0?'transparent':'var(--color-background-secondary)' }}>
                <td style={td}><input value={r.curso||''} onChange={e=>set(i,'curso',e.target.value)} style={{border:'none',background:'transparent',width:'100%',fontSize:12,minWidth:130}} placeholder="Nome do curso" /></td>
                <td style={td}><input type="number" min="1" max="10" value={r.duracao||''} onChange={e=>set(i,'duracao',e.target.value)} style={{border:'none',background:'transparent',width:36,fontSize:12}} /></td>
                <td style={td}><input value={r.area||''} onChange={e=>set(i,'area',e.target.value)} style={{border:'none',background:'transparent',width:'100%',fontSize:12,minWidth:100}} placeholder="Área" /></td>
                <td style={td}>
                  <select value={r.grau||'Licenciatura'} onChange={e=>set(i,'grau',e.target.value)} style={{border:'none',background:'transparent',fontSize:12}}>
                    {GRAUS.map(g=><option key={g}>{g}</option>)}
                  </select>
                </td>
                <td style={td}><input value={r.provincia||''} onChange={e=>set(i,'provincia',e.target.value)} style={{border:'none',background:'transparent',width:70,fontSize:12}} placeholder="Prov." /></td>
                <td style={{...td,textAlign:'center'}}><input type="number" min="0" value={r.homens??''} onChange={e=>set(i,'homens',parseInt(e.target.value)||0)} style={{border:'none',background:'transparent',width:50,fontSize:12,textAlign:'center'}} /></td>
                <td style={{...td,textAlign:'center'}}><input type="number" min="0" value={r.mulheres??''} onChange={e=>set(i,'mulheres',parseInt(e.target.value)||0)} style={{border:'none',background:'transparent',width:50,fontSize:12,textAlign:'center'}} /></td>
                <Td total>{tot}</Td>
                <td style={{...td,textAlign:'center'}}><button onClick={()=>removeRow(i)} style={{fontSize:11,color:'var(--color-text-danger)',background:'none',border:'none',cursor:'pointer'}}>✕</button></td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={5} style={{...td,textAlign:'right',fontWeight:500,fontSize:12,background:'var(--color-background-secondary)'}}>Total previsto 2025</td>
            <Td total>{totalH}</Td><Td total>{totalM}</Td><Td total>{totalH+totalM}</Td>
            <td style={td}></td>
          </tr>
        </tfoot>
      </TableWrap>
      <AddRowBtn onClick={addRow} label="+ Adicionar curso" />
    </Card>
  );
}
