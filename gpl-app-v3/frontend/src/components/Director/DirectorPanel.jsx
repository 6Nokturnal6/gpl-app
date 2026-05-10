import { useState, useEffect } from 'react';
import { campusApi, universityApi, exportApi } from '../../api';
import { useAuth } from '../../hooks/useAuth';

const STATUS_STYLE = {
  draft:     { bg:'#F1EFE8', color:'#5F5E5A', label:'Rascunho' },
  submitted: { bg:'#FAEEDA', color:'#854F0B', label:'Submetido' },
  approved:  { bg:'#EAF3DE', color:'#3B6D11', label:'Aprovado'  },
  rejected:  { bg:'#FCEBEB', color:'#A32D2D', label:'Rejeitado' },
};
function Pill({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.draft;
  return <span style={{ fontSize:11,padding:'3px 10px',borderRadius:20,background:s.bg,color:s.color,fontWeight:500 }}>{s.label}</span>;
}

function CampusModal({ campus, unassigned, universityId, onClose, onSave }) {
  const [nome, setNome] = useState(campus?.nome || '');
  const [provincia, setProvincia] = useState(campus?.provincia || '');
  const [distrito, setDistrito] = useState(campus?.distrito || '');
  const [chefeId, setChefeId] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!nome.trim()) return;
    setSaving(true);
    try {
      let savedCampus = campus;
      if (!campus) {
        const r = await campusApi.create({ nome, provincia, distrito, university_id: universityId });
        savedCampus = r.data;
      } else {
        await campusApi.update(campus.id, { nome, provincia, distrito });
      }
      if (chefeId && savedCampus?.id) {
        await campusApi.assign(savedCampus.id, chefeId, universityId);
      }
      onSave(); onClose();
    } catch(e) { console.error(e); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center' }}>
      <div style={{ background:'var(--color-background-primary)',borderRadius:12,padding:28,width:440,maxWidth:'95vw',border:'0.5px solid var(--color-border-tertiary)' }}>
        <div style={{ fontSize:15,fontWeight:500,marginBottom:20 }}>{campus ? 'Editar campus' : 'Novo campus / departamento'}</div>
        {[['Nome *',nome,setNome,'Ex: Campus de Nampula'],['Província',provincia,setProvincia,'Ex: Nampula'],['Distrito',distrito,setDistrito,'Ex: Nampula']].map(([label,val,setter,ph])=>(
          <div key={label} style={{ marginBottom:12 }}>
            <label style={{ fontSize:12,color:'var(--color-text-secondary)',display:'block',marginBottom:4 }}>{label}</label>
            <input value={val} onChange={e=>setter(e.target.value)} placeholder={ph} style={{ width:'100%' }} />
          </div>
        ))}
        {unassigned?.length > 0 && (
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:12,color:'var(--color-text-secondary)',display:'block',marginBottom:4 }}>Atribuir Chefe de Departamento</label>
            <select value={chefeId} onChange={e=>setChefeId(e.target.value)} style={{ width:'100%' }}>
              <option value=''>— Seleccionar —</option>
              {unassigned.map(u=><option key={u.id} value={u.id}>{u.nome||u.email}</option>)}
            </select>
          </div>
        )}
        <div style={{ display:'flex',gap:8,justifyContent:'flex-end',marginTop:8 }}>
          <button onClick={onClose} style={{ fontSize:13,padding:'8px 16px',border:'0.5px solid var(--color-border-tertiary)',borderRadius:8,background:'transparent',cursor:'pointer' }}>Cancelar</button>
          <button onClick={save} disabled={saving||!nome.trim()} style={{ fontSize:13,padding:'8px 18px',background:'#185FA5',color:'#fff',border:'none',borderRadius:8,cursor:'pointer' }}>
            {saving?'A guardar...':'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DirectorPanel() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('campuses');
  const [campuses, setCampuses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [unassigned, setUnassigned] = useState([]);
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      campusApi.list(),
      campusApi.unassigned(),
      user.university_id ? universityApi.summary(user.university_id) : Promise.resolve({ data: null }),
    ]).then(([c,u,s]) => {
      setCampuses(c.data); setUnassigned(u.data); setSummary(s.data);
    }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const tabBtn = (id, label) => (
    <button onClick={()=>setTab(id)} style={{ padding:'8px 16px',fontSize:13,border:'none',cursor:'pointer',borderBottom:`2px solid ${tab===id?'#185FA5':'transparent'}`,color:tab===id?'#185FA5':'var(--color-text-secondary)',background:'transparent',fontWeight:tab===id?500:400 }}>
      {label}
    </button>
  );

  return (
    <div style={{ minHeight:'100vh',background:'var(--color-background-tertiary)' }}>
      {modal!==null && <CampusModal campus={modal==='new'?null:modal} unassigned={unassigned} universityId={user.university_id} onClose={()=>setModal(null)} onSave={load} />}

      <div style={{ background:'var(--color-background-primary)',borderBottom:'0.5px solid var(--color-border-tertiary)',padding:'0 24px',display:'flex',alignItems:'center',height:52 }}>
        <div style={{ display:'flex',alignItems:'center',gap:8 }}>
          <div style={{ width:28,height:28,background:'#185FA5',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:11,fontWeight:500 }}>IES</div>
          <span style={{ fontSize:13,fontWeight:500 }}>Director GPL — {user?.institution}</span>
        </div>
        <div style={{ marginLeft:'auto',display:'flex',gap:8 }}>
          <span style={{ fontSize:12,color:'var(--color-text-secondary)' }}>{user?.email}</span>
          <button onClick={logout} style={{ fontSize:12,padding:'5px 12px',border:'0.5px solid var(--color-border-tertiary)',borderRadius:6,background:'transparent',cursor:'pointer' }}>Sair</button>
        </div>
      </div>

      <div style={{ background:'var(--color-background-primary)',borderBottom:'0.5px solid var(--color-border-tertiary)',padding:'0 24px',display:'flex' }}>
        {tabBtn('campuses','Campuses / Departamentos')}
        {tabBtn('summary','Sumário Consolidado')}
      </div>

      <div style={{ padding:24 }}>
        {loading ? <div style={{ color:'var(--color-text-secondary)' }}>A carregar...</div>

        : tab === 'campuses' ? (<>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:12,marginBottom:20 }}>
            {[['Total campuses',campuses.length],['Submetidos',campuses.filter(c=>['submitted','approved'].includes(c.submission_status)).length,'#3B6D11'],['Por submeter',campuses.filter(c=>!c.submission_status||c.submission_status==='draft').length,'#854F0B'],['Chefes disponíveis',unassigned.length]].map(([l,v,col])=>(
              <div key={l} style={{ background:'var(--color-background-secondary)',borderRadius:8,padding:'12px 16px' }}>
                <div style={{ fontSize:11,color:'var(--color-text-secondary)',marginBottom:4 }}>{l}</div>
                <div style={{ fontSize:20,fontWeight:500,color:col||'var(--color-text-primary)' }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14 }}>
            <div style={{ fontSize:14,fontWeight:500 }}>Campuses / Departamentos</div>
            <button onClick={()=>setModal('new')} style={{ fontSize:13,padding:'7px 16px',background:'#185FA5',color:'#fff',border:'none',borderRadius:8,cursor:'pointer' }}>+ Novo campus</button>
          </div>
          <div style={{ background:'var(--color-background-primary)',border:'0.5px solid var(--color-border-tertiary)',borderRadius:12,overflow:'hidden' }}>
            <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
              <thead><tr style={{ background:'var(--color-background-secondary)' }}>
                {['Campus / Departamento','Província','Chefe Departamento','Estado','Acções'].map(h=>(
                  <th key={h} style={{ padding:'10px 14px',textAlign:'left',fontSize:12,fontWeight:500,color:'var(--color-text-secondary)',borderBottom:'0.5px solid var(--color-border-tertiary)' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {campuses.map((c,i)=>(
                  <tr key={c.id} style={{ borderBottom:'0.5px solid var(--color-border-tertiary)',background:i%2===1?'var(--color-background-secondary)':'transparent' }}>
                    <td style={{ padding:'10px 14px',fontWeight:500 }}>{c.nome}</td>
                    <td style={{ padding:'10px 14px',color:'var(--color-text-secondary)' }}>{c.provincia||'—'}</td>
                    <td style={{ padding:'10px 14px',fontSize:12 }}>
                      {c.chefe_nome||c.chefe_email ? <>{c.chefe_nome||'—'}<div style={{ fontSize:11,color:'var(--color-text-secondary)' }}>{c.chefe_email}</div></> : <span style={{ color:'var(--color-text-secondary)' }}>Sem chefe atribuído</span>}
                    </td>
                    <td style={{ padding:'10px 14px' }}><Pill status={c.submission_status||'draft'} /></td>
                    <td style={{ padding:'10px 14px' }}>
                      <div style={{ display:'flex',gap:6 }}>
                        <button onClick={()=>setModal(c)} style={{ fontSize:11,padding:'4px 10px',border:'0.5px solid #185FA5',color:'#185FA5',borderRadius:6,background:'transparent',cursor:'pointer' }}>Editar</button>
                        {c.submission_id && <button onClick={async()=>{setDownloading(c.submission_id);try{await exportApi.downloadSubmissionPdf(c.submission_id,`Formulario_2024_${c.nome}.pdf`);}finally{setDownloading(null);}}} disabled={downloading===c.submission_id} style={{ fontSize:11,padding:'4px 10px',border:'0.5px solid var(--color-border-tertiary)',color:'var(--color-text-secondary)',borderRadius:6,background:'transparent',cursor:'pointer' }}>{downloading===c.submission_id?'...':'PDF'}</button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {campuses.length===0 && <tr><td colSpan={5} style={{ padding:32,textAlign:'center',color:'var(--color-text-secondary)' }}>Nenhum campus criado. Clique em "+ Novo campus".</td></tr>}
              </tbody>
            </table>
          </div>
        </>)

        : summary ? (<>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,marginBottom:20 }}>
            {[
              ['Estudantes 2024', (summary.students||[]).reduce((a,r)=>a+(parseInt(r.h)||0)+(parseInt(r.m)||0),0).toLocaleString()],
              ['Docentes', ((summary.staff?.homens||0)+(summary.staff?.mulheres||0)).toLocaleString()],
              ['Investigadores', (summary.researchers?.total||0).toLocaleString()],
              ['Financiamento (MT×10³)', ((summary.finances?.oge||0)+(summary.finances?.doacoes||0)+(summary.finances?.creditos||0)+(summary.finances?.proprias||0)).toLocaleString('pt-MZ')],
              ['Laboratórios', summary.infrastructure?.labs?.total_labs||0],
              ['Salas de aulas', summary.infrastructure?.salas?.total_salas||0],
            ].map(([l,v])=>(
              <div key={l} style={{ background:'var(--color-background-secondary)',borderRadius:8,padding:'12px 16px' }}>
                <div style={{ fontSize:11,color:'var(--color-text-secondary)',marginBottom:4 }}>{l}</div>
                <div style={{ fontSize:20,fontWeight:500 }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ background:'var(--color-background-primary)',border:'0.5px solid var(--color-border-tertiary)',borderRadius:12,padding:20,marginBottom:16 }}>
            <div style={{ fontSize:13,fontWeight:500,marginBottom:14 }}>Estudantes por grau — todos os campuses</div>
            <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
              <thead><tr style={{ background:'var(--color-background-secondary)' }}>
                {['Grau','Homens','Mulheres','Total'].map(h=><th key={h} style={{ padding:'8px 12px',textAlign:'left',fontSize:12,fontWeight:500,color:'var(--color-text-secondary)',borderBottom:'0.5px solid var(--color-border-tertiary)' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {(summary.students||[]).map((r,i)=>(
                  <tr key={i} style={{ borderBottom:'0.5px solid var(--color-border-tertiary)',background:i%2===1?'var(--color-background-secondary)':'transparent' }}>
                    <td style={{ padding:'8px 12px',fontWeight:500 }}>{r.grau||'—'}</td>
                    <td style={{ padding:'8px 12px' }}>{Number(r.h||0).toLocaleString()}</td>
                    <td style={{ padding:'8px 12px' }}>{Number(r.m||0).toLocaleString()}</td>
                    <td style={{ padding:'8px 12px',fontWeight:500,color:'#185FA5' }}>{(parseInt(r.h||0)+parseInt(r.m||0)).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ background:'var(--color-background-primary)',border:'0.5px solid var(--color-border-tertiary)',borderRadius:12,padding:20 }}>
            <div style={{ fontSize:13,fontWeight:500,marginBottom:14 }}>Estado dos campuses</div>
            <div style={{ display:'flex',flexWrap:'wrap',gap:8 }}>
              {(summary.campuses||[]).map(c=>(
                <div key={c.nome} style={{ padding:'8px 14px',borderRadius:8,border:'0.5px solid var(--color-border-tertiary)',background:'var(--color-background-secondary)' }}>
                  <span style={{ fontWeight:500,fontSize:13 }}>{c.nome}</span>
                  <span style={{ marginLeft:8 }}><Pill status={c.status||'draft'} /></span>
                </div>
              ))}
            </div>
          </div>
        </>) : <div style={{ color:'var(--color-text-secondary)' }}>Sem dados disponíveis ainda.</div>}
      </div>
    </div>
  );
}
