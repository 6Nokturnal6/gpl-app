import { CURRENT_YEAR, NEXT_YEAR } from '../../utils/appConfig';

const SECTION_KEYS = ['idies','estudantes','docentes','investigadores','financas','infra','previsao'];
const SECTION_LABELS = {
  idies: 'ID IES',
  estudantes: `Estudantes ${CURRENT_YEAR}`,
  docentes: 'Docentes',
  investigadores: 'Investigadores',
  financas: 'Finanças',
  infra: 'Infraestrutura',
  previsao: `Previsão ${NEXT_YEAR}`,
};
const LOCKABLE = ['estudantes','docentes','investigadores','financas','infra','previsao'];

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
  if (!rows || rows.length === 0 || rows.every(r => !r.h && !r.m)) return (
    <div>
      <div style={{ fontSize:13, fontWeight:500, marginBottom:10 }}>{title}</div>
      <div style={{ fontSize:13, color:'var(--color-text-secondary)', fontStyle:'italic' }}>Sem dados inseridos ainda</div>
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
            <div style={{ width:110, color:'var(--color-text-secondary)', textAlign:'right', flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.label}</div>
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

function hasData(data, key) {
  if (key === 'idies') return !!(data.idies?.nome);
  if (key === 'estudantes') return (data.estudantes||[]).some(r => r.curso);
  if (key === 'docentes') return (data.docentes||[]).some(r => r.provincia || r.lic_h || r.mest_h);
  if (key === 'investigadores') return (data.investigadores||[]).some(r => r.lic_h || r.mest_h);
  if (key === 'financas') return Object.values(data.financas||{}).some(v => parseFloat(v) > 0);
  if (key === 'infra') return (data.infra?.labs||[]).some(r => r.nome) || (data.infra?.salas||[]).some(r => r.unidade);
  if (key === 'previsao') return (data.previsao||[]).some(r => r.curso);
  return false;
}

export default function Dashboard({ data, locks = {} }) {
  const estudanteRows = (data.estudantes||[]).filter(r => r.curso).map(r => ({
    label: r.curso || '—', h: parseInt(r.homens)||0, m: parseInt(r.mulheres)||0,
  }));
  const previsaoRows = (data.previsao||[]).filter(r => r.curso).map(r => ({
    label: r.curso || '—', h: parseInt(r.homens)||0, m: parseInt(r.mulheres)||0,
  }));
  const maxEst  = Math.max(...estudanteRows.map(r => Math.max(r.h, r.m)), 1);
  const maxPrev = Math.max(...previsaoRows.map(r => Math.max(r.h, r.m)), 1);
  const totalEst  = estudanteRows.reduce((a,r) => a+r.h+r.m, 0);
  const totalPrev = previsaoRows.reduce((a,r) => a+r.h+r.m, 0);
  const totalFunding = (parseFloat(data.financas?.oge)||0)+(parseFloat(data.financas?.doacoes)||0)+(parseFloat(data.financas?.creditos)||0)+(parseFloat(data.financas?.proprias)||0);
  const lockedCount = LOCKABLE.filter(k => locks[k]).length;

  return (
    <div>
      {/* Section status pills — show which have data and which are locked */}
      <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:12, padding:20, marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:500, marginBottom:12 }}>Estado das secções</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
          {SECTION_KEYS.map(key => {
            const locked = !!locks[key];
            const dataPresent = hasData(data, key);
            const isIdIes = key === 'idies';
            let bg, color, label;
            if (locked) { bg='#EAF3DE'; color='#3B6D11'; label=`🔒 ${SECTION_LABELS[key]}`; }
            else if (dataPresent) { bg='#E6F1FB'; color='#185FA5'; label=`✎ ${SECTION_LABELS[key]}`; }
            else { bg='var(--color-background-secondary)'; color='var(--color-text-secondary)'; label=SECTION_LABELS[key]; }
            if (isIdIes) { bg = dataPresent ? '#E6F1FB' : 'var(--color-background-secondary)'; color = dataPresent ? '#185FA5' : 'var(--color-text-secondary)'; label = `${dataPresent ? '✓ ' : ''}${SECTION_LABELS[key]}`; }
            return (
              <div key={key} style={{ fontSize:12, padding:'4px 12px', borderRadius:20, background:bg, color, border:`0.5px solid ${locked?'#C0DD97':dataPresent?'#B5D4F4':'var(--color-border-tertiary)'}` }}>
                {label}
              </div>
            );
          })}
        </div>
        <div style={{ marginTop:10, fontSize:12, color:'var(--color-text-secondary)' }}>
          {lockedCount}/{LOCKABLE.length} secções concluídas
          {lockedCount === LOCKABLE.length && <span style={{ marginLeft:8, color:'#3B6D11', fontWeight:500 }}>✓ Pronto para submissão</span>}
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12, marginBottom:16 }}>
        <MetricCard label={`Estudantes ${CURRENT_YEAR}`} value={totalEst.toLocaleString()} sub="registados" />
        <MetricCard label="Cursos" value={(data.estudantes||[]).filter(r=>r.curso).length} />
        <MetricCard label="Financiamento (MT×10³)" value={totalFunding.toLocaleString('pt-MZ')} />
        <MetricCard label={`Previsão ${NEXT_YEAR}`} value={totalPrev.toLocaleString()} />
      </div>

      {/* Charts */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:12, padding:20 }}>
          <BarChart title={`Estudantes ${CURRENT_YEAR} por curso`} rows={estudanteRows.slice(0,8)} maxVal={maxEst} />
        </div>
        <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:12, padding:20 }}>
          <BarChart title={`Previsão ${NEXT_YEAR} por curso`} rows={previsaoRows.slice(0,8)} maxVal={maxPrev} colorH='#3B6D11' colorM='#97C459' />
        </div>
      </div>

      {totalFunding > 0 && (
        <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:12, padding:20 }}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:10 }}>Fontes de financiamento</div>
          <div style={{ display:'flex', height:20, borderRadius:4, overflow:'hidden', marginBottom:8 }}>
            {[['OGE',data.financas?.oge,'#185FA5'],['Doações',data.financas?.doacoes,'#5DCAA5'],['Créditos',data.financas?.creditos,'#EF9F27'],['Rec. próprias',data.financas?.proprias,'#D85A30']].map(([l,v,c]) => {
              const pct = totalFunding > 0 ? (parseFloat(v)||0)/totalFunding*100 : 0;
              return pct > 0 ? <div key={l} style={{ width:`${pct.toFixed(1)}%`, background:c }} title={`${l}: ${(parseFloat(v)||0).toLocaleString()}`} /> : null;
            })}
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'6px 16px' }}>
            {[['OGE',data.financas?.oge,'#185FA5'],['Doações',data.financas?.doacoes,'#5DCAA5'],['Créditos',data.financas?.creditos,'#EF9F27'],['Rec. próprias',data.financas?.proprias,'#D85A30']].map(([l,v,c]) => (
              <div key={l} style={{ display:'flex', alignItems:'center', gap:5, fontSize:12 }}>
                <span style={{ width:10, height:10, borderRadius:2, background:c, display:'inline-block' }}></span>
                <span style={{ color:'var(--color-text-secondary)' }}>{l}:</span>
                <span style={{ fontWeight:500 }}>{(parseFloat(v)||0).toLocaleString('pt-MZ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
