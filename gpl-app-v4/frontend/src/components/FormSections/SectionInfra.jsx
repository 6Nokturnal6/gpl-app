import { Card, TableWrap, Th, Td, AddRowBtn, SectionTitle } from '../Layout/FormComponents';
import { emptyLab, emptySala } from '../../hooks/useSubmission';

const GRAUS = ['Licenciatura','Mestrado','Doutoramento','Pós-Graduação'];

function inpStyle(w) { return { border:'none', background:'transparent', fontSize:12, width:w||'100%' }; }
const td = { border:'0.5px solid var(--color-border-tertiary)', padding:'3px 6px' };

export default function SectionInfra({ data, update }) {
  const labs = data.infra?.labs || [];
  const salas = data.infra?.salas || [];

  const setLab = (i, k, v) => update('infra', { labs: labs.map((r,idx)=>idx===i?{...r,[k]:v}:r), salas });
  const setSala = (i, k, v) => update('infra', { labs, salas: salas.map((r,idx)=>idx===i?{...r,[k]:v}:r) });
  const addLab = () => update('infra', { labs: [...labs, emptyLab()], salas });
  const addSala = () => update('infra', { labs, salas: [...salas, emptySala()] });
  const removeLab = (i) => update('infra', { labs: labs.filter((_,idx)=>idx!==i), salas });
  const removeSala = (i) => update('infra', { labs, salas: salas.filter((_,idx)=>idx!==i) });

  return (
    <Card title="D. Infraestruturas" desc="Laboratórios e salas de aula em funcionamento (2024)">
      <SectionTitle>Quadro 1.1 – Laboratórios em funcionamento</SectionTitle>
      <TableWrap>
        <thead>
          <tr>
            <Th>Nome do laboratório</Th><Th>Área</Th><Th>Sub-área</Th>
            <Th>Província</Th><Th>Distrito</Th><Th center>N.º labs</Th><Th></Th>
          </tr>
        </thead>
        <tbody>
          {labs.map((r, i) => (
            <tr key={i}>
              <td style={td}><input value={r.nome||''} onChange={e=>setLab(i,'nome',e.target.value)} style={{...inpStyle(),minWidth:160}} placeholder="Nome" /></td>
              <td style={td}><input value={r.area||''} onChange={e=>setLab(i,'area',e.target.value)} style={inpStyle(100)} placeholder="Área" /></td>
              <td style={td}><input value={r.subarea||''} onChange={e=>setLab(i,'subarea',e.target.value)} style={inpStyle(100)} placeholder="Sub-área" /></td>
              <td style={td}><input value={r.provincia||''} onChange={e=>setLab(i,'provincia',e.target.value)} style={inpStyle(70)} placeholder="Prov." /></td>
              <td style={td}><input value={r.distrito||''} onChange={e=>setLab(i,'distrito',e.target.value)} style={inpStyle(70)} placeholder="Dist." /></td>
              <td style={{...td,textAlign:'center'}}><input type="number" min="0" value={r.num_labs??''} onChange={e=>setLab(i,'num_labs',parseInt(e.target.value)||0)} style={{...inpStyle(44),textAlign:'center'}} /></td>
              <td style={{...td,textAlign:'center'}}><button onClick={()=>removeLab(i)} style={{fontSize:11,color:'var(--color-text-danger)',background:'none',border:'none',cursor:'pointer'}}>✕</button></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={5} style={{...td,textAlign:'right',fontWeight:500,fontSize:12}}>Total</td>
            <Td total>{labs.reduce((a,r)=>a+(parseInt(r.num_labs)||0),0)}</Td>
            <td style={td}></td>
          </tr>
        </tfoot>
      </TableWrap>
      <AddRowBtn onClick={addLab} label="+ Laboratório" />

      <SectionTitle>Quadro 1.2 – Salas de aulas</SectionTitle>
      <TableWrap>
        <thead>
          <tr>
            <Th>Unidade Orgânica</Th><Th>Província</Th><Th>Distrito</Th>
            <Th>Grau</Th><Th center>N.º salas</Th><Th></Th>
          </tr>
        </thead>
        <tbody>
          {salas.map((r, i) => (
            <tr key={i}>
              <td style={td}><input value={r.unidade||''} onChange={e=>setSala(i,'unidade',e.target.value)} style={{...inpStyle(),minWidth:160}} placeholder="Unidade" /></td>
              <td style={td}><input value={r.provincia||''} onChange={e=>setSala(i,'provincia',e.target.value)} style={inpStyle(70)} placeholder="Prov." /></td>
              <td style={td}><input value={r.distrito||''} onChange={e=>setSala(i,'distrito',e.target.value)} style={inpStyle(70)} placeholder="Dist." /></td>
              <td style={td}>
                <select value={r.grau||'Licenciatura'} onChange={e=>setSala(i,'grau',e.target.value)} style={{border:'none',background:'transparent',fontSize:12}}>
                  {GRAUS.map(g=><option key={g}>{g}</option>)}
                </select>
              </td>
              <td style={{...td,textAlign:'center'}}><input type="number" min="0" value={r.num_salas??''} onChange={e=>setSala(i,'num_salas',parseInt(e.target.value)||0)} style={{...inpStyle(44),textAlign:'center'}} /></td>
              <td style={{...td,textAlign:'center'}}><button onClick={()=>removeSala(i)} style={{fontSize:11,color:'var(--color-text-danger)',background:'none',border:'none',cursor:'pointer'}}>✕</button></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4} style={{...td,textAlign:'right',fontWeight:500,fontSize:12}}>Total</td>
            <Td total>{salas.reduce((a,r)=>a+(parseInt(r.num_salas)||0),0)}</Td>
            <td style={td}></td>
          </tr>
        </tfoot>
      </TableWrap>
      <AddRowBtn onClick={addSala} label="+ Sala de aula" />
    </Card>
  );
}
