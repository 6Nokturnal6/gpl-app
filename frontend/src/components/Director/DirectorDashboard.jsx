import { CURRENT_YEAR, NEXT_YEAR } from '../../utils/appConfig';

function MetricCard({ label, value, sub, color }) {
  return (
    <div style={{ background:'var(--color-background-secondary)', borderRadius:8, padding:'14px 16px' }}>
      <div style={{ fontSize:12, color:'var(--color-text-secondary)', marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:500, color:color||'var(--color-text-primary)' }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:'var(--color-text-secondary)', marginTop:2 }}>{sub}</div>}
    </div>
  );
}

function HBarChart({ title, rows, colorH='#185FA5', colorM='#5DCAA5', emptyMsg }) {
  const maxVal = Math.max(...(rows||[]).map(r => Math.max(parseInt(r.h)||0, parseInt(r.m)||0)), 1);
  if (!rows || rows.length === 0 || rows.every(r => !(parseInt(r.h)||0) && !(parseInt(r.m)||0)))
    return (
      <div>
        <div style={{ fontSize:13, fontWeight:500, marginBottom:10 }}>{title}</div>
        <div style={{ fontSize:13, color:'var(--color-text-secondary)', fontStyle:'italic' }}>{emptyMsg||'Sem dados'}</div>
      </div>
    );
  return (
    <div>
      <div style={{ fontSize:13, fontWeight:500, marginBottom:10 }}>{title}</div>
      <div style={{ display:'flex', gap:16, fontSize:11, color:'var(--color-text-secondary)', marginBottom:8 }}>
        <span><span style={{ width:10,height:10,borderRadius:'50%',background:colorH,display:'inline-block',marginRight:4 }}></span>Homens</span>
        <span><span style={{ width:10,height:10,borderRadius:'50%',background:colorM,display:'inline-block',marginRight:4 }}></span>Mulheres</span>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {rows.slice(0,10).map((r, i) => {
          const h=parseInt(r.h)||0, m=parseInt(r.m)||0;
          return (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12 }}>
              <div style={{ width:120, color:'var(--color-text-secondary)', textAlign:'right', flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.label}</div>
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:3 }}>
                <div style={{ height:14, background:'var(--color-background-secondary)', borderRadius:3, overflow:'hidden' }}><div style={{ height:'100%', width:`${Math.round((h/maxVal)*100)}%`, background:colorH, borderRadius:3 }} /></div>
                <div style={{ height:14, background:'var(--color-background-secondary)', borderRadius:3, overflow:'hidden' }}><div style={{ height:'100%', width:`${Math.round((m/maxVal)*100)}%`, background:colorM, borderRadius:3 }} /></div>
              </div>
              <div style={{ fontSize:11, color:'var(--color-text-secondary)', minWidth:32, textAlign:'right' }}>{h+m}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FundingBar({ finances }) {
  const f = finances || {};
  const items = [
    { label:'OGE', val:parseFloat(f.oge)||0, color:'#185FA5' },
    { label:'Doações', val:parseFloat(f.doacoes)||0, color:'#5DCAA5' },
    { label:'Créditos', val:parseFloat(f.creditos)||0, color:'#EF9F27' },
    { label:'Rec. próprias', val:parseFloat(f.proprias)||0, color:'#D85A30' },
  ];
  const total = items.reduce((a,i) => a+i.val, 0);
  if (!total) return <div style={{ fontSize:13, color:'var(--color-text-secondary)', fontStyle:'italic' }}>Sem dados financeiros</div>;
  return (
    <div>
      <div style={{ display:'flex', height:22, borderRadius:4, overflow:'hidden', marginBottom:10 }}>
        {items.map((item, i) => {
          const pct = (item.val/total*100).toFixed(1);
          return parseFloat(pct) > 0 ? <div key={i} style={{ width:`${pct}%`, background:item.color }} title={`${item.label}: ${item.val.toLocaleString('pt-MZ')} MT\u00d710\u00b3`} /> : null;
        })}
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:'6px 16px' }}>
        {items.map((item, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:5, fontSize:12 }}>
            <span style={{ width:10, height:10, borderRadius:2, background:item.color, display:'inline-block' }}></span>
            <span style={{ color:'var(--color-text-secondary)' }}>{item.label}:</span>
            <span style={{ fontWeight:500 }}>{item.val.toLocaleString('pt-MZ')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DirectorDashboard({ summary }) {
  if (!summary) return (
    <div style={{ color:'var(--color-text-secondary)', fontSize:13, fontStyle:'italic', padding:20 }}>
      A carregar dados consolidados...
    </div>
  );

  const students    = summary.students || [];
  const finances    = summary.finances || {};
  const staff       = summary.staff || {};
  const researchers = summary.researchers || {};
  const infra       = summary.infrastructure || {};

  const totalEstH = students.reduce((a,r) => a+(parseInt(r.h)||0), 0);
  const totalEstM = students.reduce((a,r) => a+(parseInt(r.m)||0), 0);
  const totalFunding = (parseFloat(finances.oge)||0)+(parseFloat(finances.doacoes)||0)
                      +(parseFloat(finances.creditos)||0)+(parseFloat(finances.proprias)||0);
  const totalDocentes = (parseInt(staff.homens)||0)+(parseInt(staff.mulheres)||0);

  // previsao rows from DB have 'homens'/'mulheres' columns, not 'h'/'m'
  const prevByGrau = (summary.previsao || []).reduce((acc, r) => {
    const k = r.grau || 'Outro';
    if (!acc[k]) acc[k] = { h:0, m:0 };
    acc[k].h += parseInt(r.homens) || 0;
    acc[k].m += parseInt(r.mulheres) || 0;
    return acc;
  }, {});
  const previsaoRows = Object.entries(prevByGrau).map(([label, v]) => ({ label, h:v.h, m:v.m }));
  const totalPrevH = previsaoRows.reduce((a,r) => a+r.h, 0);
  const totalPrevM = previsaoRows.reduce((a,r) => a+r.m, 0);

  const studentRows = students.map(r => ({ label:r.grau||'--', h:parseInt(r.h)||0, m:parseInt(r.m)||0 }));

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(145px,1fr))', gap:12, marginBottom:20 }}>
        <MetricCard label={`Estudantes ${CURRENT_YEAR}`} value={(totalEstH+totalEstM).toLocaleString('pt-MZ')} sub={`${totalEstH} H · ${totalEstM} M`} />
        <MetricCard label={`Previsão ${NEXT_YEAR}`} value={(totalPrevH+totalPrevM).toLocaleString('pt-MZ')} sub={`${totalPrevH} H · ${totalPrevM} M`} color='#3B6D11' />
        <MetricCard label="Docentes" value={totalDocentes.toLocaleString()} sub={`${parseInt(staff.homens)||0} H · ${parseInt(staff.mulheres)||0} M`} />
        <MetricCard label="Investigadores" value={(parseInt(researchers.total)||0).toLocaleString()} />
        <MetricCard label="Laboratórios" value={(parseInt(infra.labs?.total_labs)||0).toLocaleString()} />
        <MetricCard label="Salas de aulas" value={(parseInt(infra.salas?.total_salas)||0).toLocaleString()} />
        <MetricCard label="Financiamento (MT×10³)" value={totalFunding.toLocaleString('pt-MZ')} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:12, padding:20 }}>
          <HBarChart title={`Estudantes ${CURRENT_YEAR} por grau`} rows={studentRows} emptyMsg="Sem dados de estudantes ainda" />
        </div>
        <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:12, padding:20 }}>
          <HBarChart title={`Previsão ${NEXT_YEAR} por grau`} rows={previsaoRows} colorH='#3B6D11' colorM='#97C459' emptyMsg="Sem dados de previsão ainda" />
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:12, padding:20 }}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:14 }}>Paridade de género — {CURRENT_YEAR}</div>
          {(totalEstH+totalEstM) > 0 ? (
            <>
              <div style={{ display:'flex', height:28, borderRadius:6, overflow:'hidden', marginBottom:10 }}>
                <div style={{ width:`${Math.round(totalEstH/(totalEstH+totalEstM)*100)}%`, background:'#185FA5', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:11, fontWeight:500 }}>
                  {totalEstH > 0 && `${Math.round(totalEstH/(totalEstH+totalEstM)*100)}%`}
                </div>
                <div style={{ flex:1, background:'#5DCAA5', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:11, fontWeight:500 }}>
                  {totalEstM > 0 && `${Math.round(totalEstM/(totalEstH+totalEstM)*100)}%`}
                </div>
              </div>
              <div style={{ display:'flex', gap:16, fontSize:12 }}>
                <span style={{ display:'flex', alignItems:'center', gap:5 }}><span style={{ width:10,height:10,borderRadius:2,background:'#185FA5',display:'inline-block' }}></span>Homens: {totalEstH.toLocaleString()}</span>
                <span style={{ display:'flex', alignItems:'center', gap:5 }}><span style={{ width:10,height:10,borderRadius:2,background:'#5DCAA5',display:'inline-block' }}></span>Mulheres: {totalEstM.toLocaleString()}</span>
              </div>
            </>
          ) : <div style={{ fontSize:13, color:'var(--color-text-secondary)', fontStyle:'italic' }}>Sem dados</div>}
        </div>

        <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:12, padding:20 }}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:10 }}>Fontes de financiamento (MT×10³)</div>
          <FundingBar finances={finances} />
        </div>
      </div>

      {(summary.campuses||[]).length > 0 && (
        <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:12, padding:20 }}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:12 }}>Estado dos campi</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:8 }}>
            {summary.campuses.map((c, i) => {
              const ok = ['submitted','approved'].includes(c.status);
              return (
                <div key={i} style={{ fontSize:12, padding:'4px 12px', borderRadius:20, background:ok?'#EAF3DE':'var(--color-background-secondary)', color:ok?'#3B6D11':'var(--color-text-secondary)', border:`0.5px solid ${ok?'#C0DD97':'var(--color-border-tertiary)'}` }}>
                  {ok?'✓ ':''}{c.nome}{parseInt(c.locked_sections)>0&&<span style={{marginLeft:4,fontSize:10,opacity:0.7}}>({c.locked_sections}/6)</span>}
                </div>
              );
            })}
          </div>
          <div style={{ fontSize:12, color:'var(--color-text-secondary)' }}>
            {summary.campuses.filter(c=>['submitted','approved'].includes(c.status)).length} de {summary.campuses.length} campi submetidos
          </div>
        </div>
      )}
    </div>
  );
}
