import { useState, useEffect } from 'react';
import { campusApi, universityApi, exportApi, lockApi, auditApi, userMgmtApi } from '../../api';
import { useAuth } from '../../hooks/useAuth';
import { APP_NAME, CURRENT_YEAR } from '../../utils/appConfig';

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
  const [nome, setNome] = useState(campus?.nome||'');
  const [provincia, setProvincia] = useState(campus?.provincia||'');
  const [distrito, setDistrito] = useState(campus?.distrito||'');
  const [chefeId, setChefeId] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!nome.trim()) return;
    setSaving(true);
    try {
      let saved = campus;
      if (!campus) {
        const r = await campusApi.create({ nome, provincia, distrito, university_id: universityId });
        saved = r.data;
      } else {
        await campusApi.update(campus.id, { nome, provincia, distrito });
      }
      if (chefeId && saved?.id) await campusApi.assign(saved.id, chefeId, universityId);
      onSave(); onClose();
    } catch(e) { console.error(e); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center' }}>
      <div style={{ background:'var(--color-background-primary)',borderRadius:12,padding:28,width:440,maxWidth:'95vw',border:'0.5px solid var(--color-border-tertiary)' }}>
        <div style={{ fontSize:15,fontWeight:500,marginBottom:18 }}>{campus?'Editar campus':'Novo campus / departamento'}</div>
        {[['Nome *',nome,setNome,'Ex: Campus de Nampula'],['Província',provincia,setProvincia,'Ex: Nampula'],['Distrito',distrito,setDistrito,'Ex: Nampula']].map(([l,v,s,p])=>(
          <div key={l} style={{ marginBottom:12 }}>
            <label style={{ fontSize:12,color:'var(--color-text-secondary)',display:'block',marginBottom:4 }}>{l}</label>
            <input value={v} onChange={e=>s(e.target.value)} placeholder={p} style={{ width:'100%' }} />
          </div>
        ))}
        {unassigned?.length > 0 && (
          <div style={{ marginBottom:14 }}>
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
  const [chefes, setChefes] = useState([]);
  const [unlockRequests, setUnlockRequests] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([
      campusApi.list(),
      campusApi.unassigned(),
      user.university_id ? universityApi.summary(user.university_id) : Promise.resolve({ data: null }),
      userMgmtApi.list(),
      auditApi.getSummary(),
      user.university_id ? lockApi.getUnlockRequests(user.university_id) : Promise.resolve({ data: [] }),
    ]).then(([c, u, s, users, audit, unlocks]) => {
      setCampuses(c.data);
      setUnassigned(u.data);
      setSummary(s.data);
      setChefes((users.data||[]).filter(u => u.role === 'chefe_departamento'));
      setUnlockRequests(unlocks.data||[]);
      setAuditLog(audit.data||[]);
    }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleUnlock = async (submissionId, section) => {
    try {
      await lockApi.unlock(submissionId, section);
      setUnlockRequests(prev => prev.filter(r => !(r.submission_id === submissionId && r.section === section)));
      alert(`Secção "${section}" desbloqueada com sucesso.`);
    } catch(e) { console.error(e); }
  };

  const handleSubmit = async () => {
    if (!user.university_id) return;
    setSubmitting(true);
    setSubmitMsg('');
    try {
      const r = await universityApi.submit(user.university_id);
      setSubmitMsg(r.data.message || 'Dados submetidos com sucesso!');
      load();
    } catch(e) {
      setSubmitMsg(e.response?.data?.error || 'Erro ao submeter.');
    } finally { setSubmitting(false); }
  };

  const handleDownload = async (type, subId) => {
    const key = subId ? `${type}-${subId}` : `${type}-univ`;
    setDownloading(key);
    const sigla = summary?.campuses?.[0]?.nome || 'Univ';
    try {
      if (subId) {
        if (type === 'pdf') await exportApi.downloadSubmissionPdf(subId, `Campus_${CURRENT_YEAR}.pdf`);
        else await exportApi.downloadSubmissionXlsx(subId, `Campus_${CURRENT_YEAR}.xlsx`);
      } else {
        if (type === 'pdf') await exportApi.downloadUniversityPdf(`Consolidado_${CURRENT_YEAR}_${sigla}.pdf`);
        else await exportApi.downloadUniversityXlsx(`Consolidado_${CURRENT_YEAR}_${sigla}.xlsx`);
      }
    } finally { setDownloading(null); }
  };

  const tabBtn = (id, label, badge) => (
    <button onClick={()=>setTab(id)} style={{ padding:'8px 16px',fontSize:13,border:'none',cursor:'pointer',
      borderBottom:`2px solid ${tab===id?'#185FA5':'transparent'}`,
      color:tab===id?'#185FA5':'var(--color-text-secondary)',background:'transparent',fontWeight:tab===id?500:400 }}>
      {label}
      {badge > 0 && <span style={{ marginLeft:6,fontSize:10,background:'#FCEBEB',color:'#A32D2D',padding:'1px 6px',borderRadius:10,fontWeight:500 }}>{badge}</span>}
    </button>
  );

  const submitted = campuses.filter(c=>['submitted','approved'].includes(c.submission_status)).length;
  const pending = campuses.filter(c=>!c.submission_status||c.submission_status==='draft').length;
  const unlockCount = unlockRequests.length;

  return (
    <div style={{ minHeight:'100vh',background:'var(--color-background-tertiary)' }}>
      {modal!==null && <CampusModal campus={modal==='new'?null:modal} unassigned={unassigned} universityId={user.university_id} onClose={()=>setModal(null)} onSave={load} />}

      {/* Topbar */}
      <div style={{ background:'var(--color-background-primary)',borderBottom:'0.5px solid var(--color-border-tertiary)',padding:'0 24px',display:'flex',alignItems:'center',height:52 }}>
        <div style={{ display:'flex',alignItems:'center',gap:8 }}>
          <div style={{ width:28,height:28,background:'#185FA5',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:10,fontWeight:700 }}>aG</div>
          <span style={{ fontSize:13,fontWeight:500 }}>{APP_NAME} — Director GPL</span>
          <span style={{ fontSize:11,background:'#EAF3DE',color:'#3B6D11',padding:'2px 8px',borderRadius:12 }}>{user?.institution}</span>
        </div>
        <div style={{ marginLeft:'auto',display:'flex',gap:8,alignItems:'center' }}>
          {/* Aggregated downloads */}
          <button onClick={()=>handleDownload('xlsx')} disabled={!!downloading} style={{ fontSize:11,padding:'5px 10px',border:'0.5px solid var(--color-border-tertiary)',borderRadius:6,background:'transparent',cursor:'pointer',color:'var(--color-text-secondary)' }}>
            {downloading==='xlsx-univ'?'...':'⬇ Excel consolidado'}
          </button>
          <button onClick={()=>handleDownload('pdf')} disabled={!!downloading} style={{ fontSize:11,padding:'5px 10px',border:'0.5px solid var(--color-border-tertiary)',borderRadius:6,background:'transparent',cursor:'pointer',color:'var(--color-text-secondary)' }}>
            {downloading==='pdf-univ'?'...':'⬇ PDF consolidado'}
          </button>
          <button onClick={logout} style={{ fontSize:11,padding:'5px 10px',border:'0.5px solid var(--color-border-tertiary)',borderRadius:6,background:'transparent',cursor:'pointer',color:'var(--color-text-secondary)' }}>Sair</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background:'var(--color-background-primary)',borderBottom:'0.5px solid var(--color-border-tertiary)',padding:'0 24px',display:'flex' }}>
        {tabBtn('campuses','Campi / Departamentos')}
        {tabBtn('summary','Sumário Consolidado')}
        {tabBtn('chefes','Chefes Dept.')}
        {tabBtn('unlocks','Pedidos de desbloqueio',unlockCount)}
        {tabBtn('activity','Actividade')}
      </div>

      <div style={{ padding:24 }}>
        {loading ? <div style={{ color:'var(--color-text-secondary)' }}>A carregar...</div> : (<>

          {/* ── CAMPUSES TAB ── */}
          {tab==='campuses' && (<>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:12,marginBottom:20 }}>
              {[['Total de campi',campuses.length],['Submetidos',submitted,'#3B6D11'],['Por submeter',pending,'#854F0B'],['Chefes disponíveis',unassigned.length]].map(([l,v,c])=>(
                <div key={l} style={{ background:'var(--color-background-secondary)',borderRadius:8,padding:'12px 16px' }}>
                  <div style={{ fontSize:11,color:'var(--color-text-secondary)',marginBottom:4 }}>{l}</div>
                  <div style={{ fontSize:20,fontWeight:500,color:c||'var(--color-text-primary)' }}>{v}</div>
                </div>
              ))}
            </div>

            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:8 }}>
              <div style={{ fontSize:14,fontWeight:500 }}>Campi / Departamentos</div>
              <div style={{ display:'flex',gap:8 }}>
                <button onClick={()=>setModal('new')} style={{ fontSize:13,padding:'7px 16px',background:'#185FA5',color:'#fff',border:'none',borderRadius:8,cursor:'pointer' }}>+ Novo campus</button>
                <button onClick={handleSubmit} disabled={submitting||pending===0} style={{ fontSize:13,padding:'7px 16px',background:pending===0?'#ccc':'#3B6D11',color:'#fff',border:'none',borderRadius:8,cursor:'pointer' }} title="Submete todos os dados ao Vice Reitor Administrativo">
                  {submitting?'A submeter...':'Submeter ao Vice Reitor Administrativo'}
                </button>
              </div>
            </div>

            {submitMsg && (
              <div style={{ padding:'10px 14px',borderRadius:8,marginBottom:14,fontSize:13,background:submitMsg.includes('sucesso')?'#EAF3DE':'#FCEBEB',color:submitMsg.includes('sucesso')?'#3B6D11':'#A32D2D',border:`0.5px solid ${submitMsg.includes('sucesso')?'#C0DD97':'#F09595'}` }}>
                {submitMsg}
              </div>
            )}

            <div style={{ background:'var(--color-background-primary)',border:'0.5px solid var(--color-border-tertiary)',borderRadius:12,overflow:'hidden' }}>
              <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
                <thead><tr style={{ background:'var(--color-background-secondary)' }}>
                  {['Campus / Departamento','Província','Chefe Departamento','Estado','Exportar'].map(h=>(
                    <th key={h} style={{ padding:'10px 14px',textAlign:'left',fontSize:12,fontWeight:500,color:'var(--color-text-secondary)',borderBottom:'0.5px solid var(--color-border-tertiary)' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {campuses.map((c,i)=>(
                    <tr key={c.id} style={{ borderBottom:'0.5px solid var(--color-border-tertiary)',background:i%2===1?'var(--color-background-secondary)':'transparent' }}>
                      <td style={{ padding:'10px 14px' }}>
                        <div style={{ fontWeight:500 }}>{c.nome}</div>
                      </td>
                      <td style={{ padding:'10px 14px',color:'var(--color-text-secondary)' }}>{c.provincia||'—'}</td>
                      <td style={{ padding:'10px 14px',fontSize:12 }}>
                        {c.chefe_nome||c.chefe_email
                          ? <>{c.chefe_nome||'—'}<div style={{ fontSize:11,color:'var(--color-text-secondary)' }}>{c.chefe_email}</div></>
                          : <span style={{ color:'var(--color-text-secondary)' }}>Sem chefe atribuído</span>}
                      </td>
                      <td style={{ padding:'10px 14px' }}><Pill status={c.submission_status||'draft'} /></td>
                      <td style={{ padding:'10px 14px' }}>
                        <div style={{ display:'flex',gap:5 }}>
                          <button onClick={()=>setModal(c)} style={{ fontSize:11,padding:'3px 9px',border:'0.5px solid #185FA5',color:'#185FA5',borderRadius:6,background:'transparent',cursor:'pointer' }}>Editar</button>
                          {c.submission_id && (<>
                            <button onClick={()=>handleDownload('pdf',c.submission_id)} disabled={downloading===`pdf-${c.submission_id}`} style={{ fontSize:11,padding:'3px 9px',border:'0.5px solid var(--color-border-tertiary)',color:'var(--color-text-secondary)',borderRadius:6,background:'transparent',cursor:'pointer' }}>
                              {downloading===`pdf-${c.submission_id}`?'...':'PDF'}
                            </button>
                            <button onClick={()=>handleDownload('xlsx',c.submission_id)} disabled={downloading===`xlsx-${c.submission_id}`} style={{ fontSize:11,padding:'3px 9px',border:'0.5px solid var(--color-border-tertiary)',color:'var(--color-text-secondary)',borderRadius:6,background:'transparent',cursor:'pointer' }}>
                              {downloading===`xlsx-${c.submission_id}`?'...':'Excel'}
                            </button>
                          </>)}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {campuses.length===0 && <tr><td colSpan={5} style={{ padding:32,textAlign:'center',color:'var(--color-text-secondary)' }}>Nenhum campus criado ainda. Clique em "+ Novo campus".</td></tr>}
                </tbody>
              </table>
            </div>
          </>)}

          {/* ── SUMMARY TAB ── */}
          {tab==='summary' && (<>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,marginBottom:20 }}>
              {[
                [`Estudantes ${CURRENT_YEAR}`, (summary?.students||[]).reduce((a,r)=>a+(parseInt(r.h)||0)+(parseInt(r.m)||0),0).toLocaleString()],
                ['Docentes', ((parseInt(summary?.staff?.homens)||0)+(parseInt(summary?.staff?.mulheres)||0)).toLocaleString()],
                ['Investigadores', (parseInt(summary?.researchers?.total)||0).toLocaleString()],
                ['Financiamento (MT×10³)', ((parseFloat(summary?.finances?.oge)||0)+(parseFloat(summary?.finances?.doacoes)||0)+(parseFloat(summary?.finances?.creditos)||0)+(parseFloat(summary?.finances?.proprias)||0)).toLocaleString('pt-MZ')],
                ['Laboratórios', (parseInt(summary?.infrastructure?.labs?.total_labs)||0).toLocaleString()],
                ['Salas de aulas', (parseInt(summary?.infrastructure?.salas?.total_salas)||0).toLocaleString()],
              ].map(([l,v])=>(
                <div key={l} style={{ background:'var(--color-background-secondary)',borderRadius:8,padding:'12px 16px' }}>
                  <div style={{ fontSize:11,color:'var(--color-text-secondary)',marginBottom:4 }}>{l}</div>
                  <div style={{ fontSize:20,fontWeight:500 }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ background:'var(--color-background-primary)',border:'0.5px solid var(--color-border-tertiary)',borderRadius:12,padding:20,marginBottom:16 }}>
              <div style={{ fontSize:13,fontWeight:500,marginBottom:14 }}>Estudantes por grau — todos os campi ({CURRENT_YEAR})</div>
              <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
                <thead><tr style={{ background:'var(--color-background-secondary)' }}>
                  {['Grau','Homens','Mulheres','Total'].map(h=><th key={h} style={{ padding:'8px 12px',textAlign:'left',fontSize:12,fontWeight:500,color:'var(--color-text-secondary)',borderBottom:'0.5px solid var(--color-border-tertiary)' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {(summary?.students||[]).map((r,i)=>(
                    <tr key={i} style={{ borderBottom:'0.5px solid var(--color-border-tertiary)',background:i%2===1?'var(--color-background-secondary)':'transparent' }}>
                      <td style={{ padding:'8px 12px',fontWeight:500 }}>{r.grau||'—'}</td>
                      <td style={{ padding:'8px 12px' }}>{(parseInt(r.h)||0).toLocaleString()}</td>
                      <td style={{ padding:'8px 12px' }}>{(parseInt(r.m)||0).toLocaleString()}</td>
                      <td style={{ padding:'8px 12px',fontWeight:500,color:'#185FA5' }}>{((parseInt(r.h)||0)+(parseInt(r.m)||0)).toLocaleString()}</td>
                    </tr>
                  ))}
                  {(!summary?.students||summary.students.length===0) && <tr><td colSpan={4} style={{ padding:24,textAlign:'center',color:'var(--color-text-secondary)' }}>Sem dados de estudantes ainda</td></tr>}
                </tbody>
              </table>
            </div>
            <div style={{ background:'var(--color-background-primary)',border:'0.5px solid var(--color-border-tertiary)',borderRadius:12,padding:20 }}>
              <div style={{ fontSize:13,fontWeight:500,marginBottom:12 }}>Estado dos campi</div>
              <div style={{ display:'flex',flexWrap:'wrap',gap:8 }}>
                {(summary?.campuses||[]).map(c=>(
                  <div key={c.nome} style={{ padding:'8px 14px',borderRadius:8,border:'0.5px solid var(--color-border-tertiary)',background:'var(--color-background-secondary)' }}>
                    <span style={{ fontWeight:500,fontSize:13 }}>{c.nome}</span>
                    <span style={{ marginLeft:8 }}><Pill status={c.status||'draft'} /></span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:12,fontSize:12,color:'var(--color-text-secondary)' }}>
                O estado muda para <strong>Submetido</strong> quando o Director GPL clica em "Submeter ao Vice Reitor Administrativo" no separador Campi.
              </div>
            </div>
          </>)}

          {/* ── CHEFES TAB ── */}
          {tab==='chefes' && (<>
            <div style={{ fontSize:14,fontWeight:500,marginBottom:14 }}>Chefes de Departamento</div>
            <div style={{ background:'var(--color-background-primary)',border:'0.5px solid var(--color-border-tertiary)',borderRadius:12,overflow:'hidden' }}>
              <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
                <thead><tr style={{ background:'var(--color-background-secondary)' }}>
                  {['Nome / Email','Campus','Estado conta','Última actividade','Acções'].map(h=>(
                    <th key={h} style={{ padding:'10px 14px',textAlign:'left',fontSize:12,fontWeight:500,color:'var(--color-text-secondary)',borderBottom:'0.5px solid var(--color-border-tertiary)' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {chefes.map((c,i)=>(
                    <tr key={c.id} style={{ borderBottom:'0.5px solid var(--color-border-tertiary)',background:i%2===1?'var(--color-background-secondary)':'transparent',opacity:c.is_active?1:0.6 }}>
                      <td style={{ padding:'10px 14px' }}>
                        <div style={{ fontWeight:500 }}>{c.nome||'—'}</div>
                        <div style={{ fontSize:11,color:'var(--color-text-secondary)' }}>{c.email}</div>
                      </td>
                      <td style={{ padding:'10px 14px',color:'var(--color-text-secondary)',fontSize:12 }}>{c.campus_nome||'Sem campus'}</td>
                      <td style={{ padding:'10px 14px' }}>
                        <span style={{ fontSize:11,padding:'2px 9px',borderRadius:20,background:c.is_active?'#EAF3DE':'#FCEBEB',color:c.is_active?'#3B6D11':'#A32D2D',fontWeight:500 }}>
                          {c.is_active?'Activo':'Inactivo'}
                        </span>
                      </td>
                      <td style={{ padding:'10px 14px',fontSize:12,color:'var(--color-text-secondary)' }}>
                        {c.last_activity ? new Date(c.last_activity).toLocaleDateString('pt-MZ') : '—'}
                      </td>
                      <td style={{ padding:'10px 14px' }}>
                        {c.is_active
                          ? <button onClick={async()=>{ await userMgmtApi.deactivate(c.id); load(); }} style={{ fontSize:11,padding:'3px 9px',border:'0.5px solid #854F0B',color:'#854F0B',borderRadius:6,background:'transparent',cursor:'pointer' }}>Desactivar</button>
                          : <button onClick={async()=>{ await userMgmtApi.reactivate(c.id); load(); }} style={{ fontSize:11,padding:'3px 9px',border:'0.5px solid #3B6D11',color:'#3B6D11',borderRadius:6,background:'transparent',cursor:'pointer' }}>Reactivar</button>
                        }
                      </td>
                    </tr>
                  ))}
                  {chefes.length===0 && <tr><td colSpan={5} style={{ padding:32,textAlign:'center',color:'var(--color-text-secondary)' }}>Nenhum Chefe de Departamento registado</td></tr>}
                </tbody>
              </table>
            </div>
          </>)}

          {/* ── UNLOCK REQUESTS TAB ── */}
          {tab==='unlocks' && (<>
            <div style={{ fontSize:14,fontWeight:500,marginBottom:14 }}>
              Pedidos de desbloqueio {unlockCount>0 && <span style={{ fontSize:12,background:'#FCEBEB',color:'#A32D2D',padding:'2px 8px',borderRadius:12,marginLeft:6 }}>{unlockCount} pendentes</span>}
            </div>
            {unlockRequests.length===0 ? (
              <div style={{ background:'var(--color-background-primary)',border:'0.5px solid var(--color-border-tertiary)',borderRadius:12,padding:32,textAlign:'center',color:'var(--color-text-secondary)',fontSize:13 }}>
                Nenhum pedido de desbloqueio pendente
              </div>
            ) : (
              <div style={{ background:'var(--color-background-primary)',border:'0.5px solid var(--color-border-tertiary)',borderRadius:12,overflow:'hidden' }}>
                <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
                  <thead><tr style={{ background:'var(--color-background-secondary)' }}>
                    {['Utilizador','Secção','Pedido em','Acção'].map(h=>(
                      <th key={h} style={{ padding:'10px 14px',textAlign:'left',fontSize:12,fontWeight:500,color:'var(--color-text-secondary)',borderBottom:'0.5px solid var(--color-border-tertiary)' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {unlockRequests.map((r,i)=>(
                      <tr key={i} style={{ borderBottom:'0.5px solid var(--color-border-tertiary)' }}>
                        <td style={{ padding:'10px 14px' }}>
                          <div style={{ fontWeight:500 }}>{r.requester_nome||'—'}</div>
                          <div style={{ fontSize:11,color:'var(--color-text-secondary)' }}>{r.requester_email}</div>
                          <div style={{ fontSize:11,color:'var(--color-text-secondary)' }}>{r.campus_nome}</div>
                        </td>
                        <td style={{ padding:'10px 14px',fontWeight:500 }}>{r.section}</td>
                        <td style={{ padding:'10px 14px',fontSize:12,color:'var(--color-text-secondary)' }}>{r.unlock_requested_at ? new Date(r.unlock_requested_at).toLocaleString('pt-MZ') : r.locked_at ? new Date(r.locked_at).toLocaleString('pt-MZ') : '—'}</td>
                        <td style={{ padding:'10px 14px' }}>
                          <button onClick={()=>handleUnlock(r.submission_id, r.section)} style={{ fontSize:12,padding:'5px 14px',background:'#3B6D11',color:'#fff',border:'none',borderRadius:6,cursor:'pointer' }}>
                            Desbloquear
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>)}

          {/* ── ACTIVITY TAB ── */}
          {tab==='activity' && (<>
            <div style={{ fontSize:14,fontWeight:500,marginBottom:14 }}>Registo de actividade — campuses desta universidade</div>
            <div style={{ background:'var(--color-background-primary)',border:'0.5px solid var(--color-border-tertiary)',borderRadius:12,overflow:'hidden' }}>
              <table style={{ width:'100%',borderCollapse:'collapse',fontSize:12 }}>
                <thead><tr style={{ background:'var(--color-background-secondary)' }}>
                  {['Data/Hora','Utilizador','Acção','Secção'].map(h=>(
                    <th key={h} style={{ padding:'9px 12px',textAlign:'left',fontSize:11,fontWeight:500,color:'var(--color-text-secondary)',borderBottom:'0.5px solid var(--color-border-tertiary)' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {auditLog.slice(0,100).map((a,i)=>(
                    <tr key={i} style={{ borderBottom:'0.5px solid var(--color-border-tertiary)',background:i%2===1?'var(--color-background-secondary)':'transparent' }}>
                      <td style={{ padding:'8px 12px',whiteSpace:'nowrap',color:'var(--color-text-secondary)',fontSize:11 }}>{a.created_at ? new Date(a.created_at).toLocaleString('pt-MZ') : '—'}</td>
                      <td style={{ padding:'8px 12px',fontSize:12 }}>{a.user_nome||a.user_email||'—'}</td>
                      <td style={{ padding:'8px 12px',fontWeight:500 }}>{a.action}</td>
                      <td style={{ padding:'8px 12px',color:'var(--color-text-secondary)' }}>{a.section||'—'}</td>
                    </tr>
                  ))}
                  {auditLog.length===0 && <tr><td colSpan={4} style={{ padding:24,textAlign:'center',color:'var(--color-text-secondary)' }}>Sem actividade registada</td></tr>}
                </tbody>
              </table>
            </div>
          </>)}
        </>)}
      </div>
    </div>
  );
}
