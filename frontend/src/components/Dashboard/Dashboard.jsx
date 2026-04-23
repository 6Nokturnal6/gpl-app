import { CURRENT_YEAR, NEXT_YEAR } from '../../utils/appConfig';

const SECTIONS = ['ID IES','Estudantes','Docentes','Investigadores','Finanças','Infraestrutura',`Previsão ${NEXT_YEAR}`];

function MetricCard({ label, value, sub }) {
  return (
    <div style={{ background:'var(--color-background-secondary)', borderRadius:8, padding:'14px 16px' }}>
      <div style={{ fontSize:12, color:'var(--color-text-secondary)', marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:500 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:'var(--color-text-secondary)', marginTop:2 }}>{sub}</div>}
    </div>
  );
}

function BarChart({ title, rows, maxVal, colorH='#185FA5', colorM='#5DCAA5' }) {
  if (!rows || rows.length === 0) return (
    <div>
      <div style={{ fontSize:13, fontWeight:500, marginBottom:10 }}>{title}</div>
      <div style={{ fontSize:13, color:'var(--color-text-secondary)' }}>Sem dados inseridos ainda</div>
    </div>
  );
  return (
    <div>
      <div style={{ fontSize:13, fontWeight:500, marginBottom:10 }}>{title}</div>
      <div style={{ display:'flex', gap:16, fontSize:11, color:'var(--color-text-secondary)', marginBottom:8 }}>
        <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:10, height:10, borderRadius:'50%', background:colorH, display:'inline-block' }}></span>Homens</span>
        <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:10, height:10, borderRadius:'50%', background:colorM, display:'inline-block' }}></span>Mulheres</span>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12 }}>
            <div style={{ width:110, color:'var(--color-text-secondary)', textAlign:'right', flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={r.label}>{r.label}</div>
            <div style={{ flex:1, display:'flex', flexDirection:'column', gap:3 }}>
              <div style={{ height:14, background:'var(--color-background-secondary)', borderRadius:3, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${Math.round(((r.h||0)/maxVal)*100)}%`, background:colorH, borderRadius:3, transition:'width 0.5s' }} />
              </div>
              <div style={{ height:14, background:'var(--color-background-secondary)', borderRadius:3, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${Math.round(((r.m||0)/maxVal)*100)}%`, background:colorM, borderRadius:3, transition:'width 0.5s' }} />
              </div>
            </div>
            <div style={{ fontSize:11, color:'var(--color-text-secondary)', minWidth:28, textAlign:'right' }}>{(r.h||0)+(r.m||0)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FundingBar({ data }) {
  const items = [
    { label:'OGE', val:parseFloat(data.oge)||0, color:'#185FA5' },
    { label:'Doações', val:parseFloat(data.doacoes)||0, color:'#5DCAA5' },
    { label:'Créditos', val:parseFloat(data.creditos)||0, color:'#EF9F27' },
    { label:'Rec. próprias', val:parseFloat(data.proprias)||0, color:'#D85A30' },
  ];
  const total = items.reduce((a,i) => a + i.val, 0) || 1;
  return (
    <div>
      <div style={{ fontSize:13, fontWeight:500, marginBottom:10 }}>Fontes de financiamento</div>
      <div style={{ display:'flex', height:20, borderRadius:4, overflow:'hidden', marginBottom:8 }}>
        {items.map((item, i) => (
          item.val > 0 && <div key={i} style={{ width:`${(item.val/total*100).toFixed(1)}%`, background:item.color }} title={`${item.label}: ${item.val.toLocaleString()}`} />
        ))}
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:'6px 16px' }}>
        {items.map((item, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:5, fontSize:12 }}>
            <span style={{ width:10, height:10, borderRadius:2, background:item.color, display:'inline-block', flexShrink:0 }}></span>
            <span style={{ color:'var(--color-text-secondary)' }}>{item.label}:</span>
            <span style={{ fontWeight:500 }}>{item.val.toLocaleString('pt-MZ')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard({ data, sectionsDone }) {
  const estudanteRows = (data.estudantes||[]).map(r => ({
    label: r.curso || '—',
    h: parseInt(r.homens)||0,
    m: parseInt(r.mulheres)||0,
  }));
  const previsaoRows = (data.previsao||[]).map(r => ({
    label: r.curso || '—',
    h: parseInt(r.homens)||0,
    m: parseInt(r.mulheres)||0,
  }));
  const maxEst  = Math.max(...estudanteRows.map(r => Math.max(r.h||0, r.m||0)), 1);
  const maxPrev = Math.max(...previsaoRows.map(r => Math.max(r.h||0, r.m||0)), 1);

  const totalEst  = estudanteRows.reduce((a,r) => a + (r.h||0) + (r.m||0), 0);
  const totalPrev = previsaoRows.reduce((a,r) => a + (r.h||0) + (r.m||0), 0);
  const totalFunding = (parseFloat(data.financas?.oge)||0)+(parseFloat(data.financas?.doacoes)||0)+(parseFloat(data.financas?.creditos)||0)+(parseFloat(data.financas?.proprias)||0);
  const doneSections = Object.keys(sectionsDone).length;

  return (
    <div>
      {/* Status pills */}
      <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:12, padding:20, marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:500, marginBottom:12 }}>Estado das secções</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
          {SECTIONS.map((s, i) => (
            <div key={s} style={{
              fontSize:12, padding:'4px 12px', borderRadius:20,
              background: sectionsDone[i] ? '#EAF3DE' : 'var(--color-background-secondary)',
              color: sectionsDone[i] ? '#3B6D11' : 'var(--color-text-secondary)',
              border: `0.5px solid ${sectionsDone[i] ? '#C0DD97' : 'var(--color-border-tertiary)'}`,
            }}>
              {sectionsDone[i] ? '✓ ' : ''}{s}
            </div>
          ))}
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12, marginBottom:16 }}>
        <MetricCard label="Secções concluídas" value={`${doneSections} / 7`} />
        <MetricCard label={`Estudantes ${CURRENT_YEAR}`} value={totalEst.toLocaleString()} sub="total registados" />
        <MetricCard label="Cursos registados" value={(data.estudantes||[]).length} />
        <MetricCard label="Financiamento total" value={totalFunding.toLocaleString('pt-MZ')} sub="MT × 10³" />
        <MetricCard label={`Estudantes previstos ${NEXT_YEAR}`} value={totalPrev.toLocaleString()} />
      </div>

      {/* Charts */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:12, padding:20 }}>
          <BarChart
            title={`Estudantes ${CURRENT_YEAR} por curso`}
            rows={estudanteRows.slice(0,8)}
            maxVal={maxEst}
          />
        </div>
        <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:12, padding:20 }}>
          <BarChart
            title={`Previsão ${NEXT_YEAR} por curso`}
            rows={previsaoRows.slice(0,8)}
            maxVal={maxPrev}
            colorH='#3B6D11'
            colorM='#97C459'
          />
        </div>
      </div>

      {data.financas && Object.keys(data.financas).length > 0 && (
        <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:12, padding:20 }}>
          <FundingBar data={data.financas} />
        </div>
      )}
    </div>
  );
}
