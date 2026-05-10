import { useState, useEffect } from 'react';
import { userMgmtApi, universityApi, auditApi } from '../../api';
import { useAuth } from '../../hooks/useAuth';
import { APP_NAME } from '../../utils/appConfig';

const ROLE_LABEL = { superadmin:'Super Admin', director_gpl:'Director GPL', chefe_departamento:'Chefe Dept.' };
const ROLE_COLOR = { superadmin:'#185FA5', director_gpl:'#3B6D11', chefe_departamento:'#854F0B' };
const ACTION_LABEL = { login:'Login', save_section:'Guardou secção', lock_section:'Bloqueou', unlock_section:'Desbloqueou', request_unlock:'Pediu desbloqueio', submit:'Submeteu', approve:'Aprovou', reject:'Rejeitou', deactivate_user:'Desactivou utilizador', reactivate_user:'Reactivou utilizador', change_role:'Alterou papel', reset_password:'Resetou senha', delete_user:'Eliminou utilizador', create_user:'Criou utilizador' };

function Pill({ label, color, bg }) {
  return <span style={{ fontSize:11, padding:'2px 9px', borderRadius:20, background:bg||'#F1EFE8', color:color||'#5F5E5A', fontWeight:500 }}>{label}</span>;
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background:'var(--color-background-secondary)', borderRadius:8, padding:'14px 16px' }}>
      <div style={{ fontSize:12, color:'var(--color-text-secondary)', marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:500, color:color||'var(--color-text-primary)' }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:'var(--color-text-secondary)', marginTop:2 }}>{sub}</div>}
    </div>
  );
}

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'var(--color-background-primary)', borderRadius:12, padding:28, width:380, border:'0.5px solid var(--color-border-tertiary)' }}>
        <div style={{ fontSize:14, marginBottom:20, lineHeight:1.6 }}>{message}</div>
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button onClick={onCancel} style={{ fontSize:13, padding:'8px 16px', border:'0.5px solid var(--color-border-tertiary)', borderRadius:8, background:'transparent', cursor:'pointer' }}>Cancelar</button>
          <button onClick={onConfirm} style={{ fontSize:13, padding:'8px 18px', background:'#A32D2D', color:'#fff', border:'none', borderRadius:8, cursor:'pointer' }}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}

function ResetPasswordModal({ userId, onClose, onDone }) {
  const [pw, setPw] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const save = async () => {
    if (pw.length < 8) { setErr('Mínimo 8 caracteres'); return; }
    setSaving(true);
    try { await userMgmtApi.resetPassword(userId, pw); onDone(); onClose(); }
    catch(e) { setErr(e.response?.data?.error || 'Erro'); }
    finally { setSaving(false); }
  };
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'var(--color-background-primary)', borderRadius:12, padding:28, width:360, border:'0.5px solid var(--color-border-tertiary)' }}>
        <div style={{ fontSize:15, fontWeight:500, marginBottom:16 }}>Redefinir palavra-passe</div>
        <input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="Nova palavra-passe (mín. 8 chars)" style={{ width:'100%', marginBottom:8 }} />
        {err && <div style={{ fontSize:12, color:'var(--color-text-danger)', marginBottom:8 }}>{err}</div>}
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:8 }}>
          <button onClick={onClose} style={{ fontSize:13, padding:'8px 16px', border:'0.5px solid var(--color-border-tertiary)', borderRadius:8, background:'transparent', cursor:'pointer' }}>Cancelar</button>
          <button onClick={save} disabled={saving} style={{ fontSize:13, padding:'8px 18px', background:'#185FA5', color:'#fff', border:'none', borderRadius:8, cursor:'pointer' }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [stats, setStats] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);
  const [resetPw, setResetPw] = useState(null);
  const [univForm, setUnivForm] = useState({ nome:'', sigla:'', nuit:'' });
  const [univSaving, setUnivSaving] = useState(false);
  const [filterRole, setFilterRole] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [auditFilter, setAuditFilter] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [u, univ, s, a] = await Promise.all([
        userMgmtApi.list(),
        universityApi.list(),
        userMgmtApi.stats(),
        auditApi.getFull({ limit:200 }),
      ]);
      setUsers(u.data);
      setUniversities(univ.data);
      setStats(s.data);
      setAuditLog(a.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const doDeactivate = async (u) => {
    setConfirm({ message: `Desactivar a conta de ${u.email}?`, onConfirm: async () => {
      await userMgmtApi.deactivate(u.id);
      setConfirm(null); load();
    }});
  };
  const doReactivate = async (u) => { await userMgmtApi.reactivate(u.id); load(); };
  const doDelete = async (u) => {
    setConfirm({ message: `Eliminar permanentemente a conta de ${u.email}? Esta acção não pode ser desfeita.`, onConfirm: async () => {
      await userMgmtApi.delete(u.id);
      setConfirm(null); load();
    }});
  };
  const doChangeRole = async (id, role) => { await userMgmtApi.changeRole(id, role); load(); };
  const doCreateUniv = async () => {
    if (!univForm.nome.trim()) return;
    setUnivSaving(true);
    try { await universityApi.create(univForm); setUnivForm({ nome:'', sigla:'', nuit:'' }); load(); }
    finally { setUnivSaving(false); }
  };

  const tabBtn = (id, label) => (
    <button onClick={() => setTab(id)} style={{ padding:'8px 16px', fontSize:13, border:'none', cursor:'pointer', borderBottom:`2px solid ${tab===id?'#185FA5':'transparent'}`, color:tab===id?'#185FA5':'var(--color-text-secondary)', background:'transparent', fontWeight:tab===id?500:400 }}>
      {label}
    </button>
  );

  const filteredUsers = users.filter(u => {
    if (filterRole && u.role !== filterRole) return false;
    if (filterActive === 'active' && !u.is_active) return false;
    if (filterActive === 'inactive' && u.is_active) return false;
    return true;
  });

  const filteredAudit = auditLog.filter(a => !auditFilter || a.action === auditFilter);

  return (
    <div style={{ minHeight:'100vh', background:'var(--color-background-tertiary)' }}>
      {confirm && <ConfirmModal message={confirm.message} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}
      {resetPw && <ResetPasswordModal userId={resetPw} onClose={() => setResetPw(null)} onDone={load} />}

      {/* Topbar */}
      <div style={{ background:'var(--color-background-primary)', borderBottom:'0.5px solid var(--color-border-tertiary)', padding:'0 24px', display:'flex', alignItems:'center', height:52 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:28, height:28, background:'#185FA5', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:11, fontWeight:500 }}>aG</div>
          <span style={{ fontSize:13, fontWeight:500 }}>{APP_NAME}</span>
          <span style={{ fontSize:11, background:'#FCEBEB', color:'#A32D2D', padding:'2px 8px', borderRadius:12 }}>Super Admin</span>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', gap:8, alignItems:'center' }}>
          <span style={{ fontSize:12, color:'var(--color-text-secondary)' }}>{user?.email}</span>
          <button onClick={logout} style={{ fontSize:12, padding:'5px 12px', border:'0.5px solid var(--color-border-tertiary)', borderRadius:6, background:'transparent', cursor:'pointer' }}>Sair</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background:'var(--color-background-primary)', borderBottom:'0.5px solid var(--color-border-tertiary)', padding:'0 24px', display:'flex' }}>
        {tabBtn('overview', 'Visão Geral')}
        {tabBtn('users', 'Utilizadores')}
        {tabBtn('universities', 'Universidades')}
        {tabBtn('audit', 'Registo de Actividade')}
      </div>

      <div style={{ padding:24 }}>
        {loading ? <div style={{ color:'var(--color-text-secondary)' }}>A carregar...</div> : (<>

          {/* ── OVERVIEW ── */}
          {tab === 'overview' && stats && (<>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:20 }}>
              <StatCard label="Total utilizadores" value={users.length} />
              <StatCard label="Activos" value={users.filter(u=>u.is_active).length} color="#3B6D11" />
              <StatCard label="Inactivos" value={users.filter(u=>!u.is_active).length} color="#A32D2D" />
              <StatCard label="Universidades" value={stats.universities} />
              <StatCard label="Campuses" value={stats.campuses} />
              <StatCard label="Submissões" value={stats.submissions?.reduce((a,s)=>a+parseInt(s.count),0)||0} />
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
              <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:12, padding:20 }}>
                <div style={{ fontSize:13, fontWeight:500, marginBottom:12 }}>Utilizadores por papel</div>
                {stats.users?.map(u => (
                  <div key={`${u.role}-${u.is_active}`} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'0.5px solid var(--color-border-tertiary)', fontSize:13 }}>
                    <span style={{ color:ROLE_COLOR[u.role]||'var(--color-text-secondary)' }}>{ROLE_LABEL[u.role]||u.role} {u.is_active?'':'(inactivo)'}</span>
                    <span style={{ fontWeight:500 }}>{u.count}</span>
                  </div>
                ))}
              </div>
              <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:12, padding:20 }}>
                <div style={{ fontSize:13, fontWeight:500, marginBottom:12 }}>Submissões por estado</div>
                {stats.submissions?.map(s => (
                  <div key={s.status} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'0.5px solid var(--color-border-tertiary)', fontSize:13 }}>
                    <span>{s.status}</span><span style={{ fontWeight:500 }}>{s.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:12, padding:20 }}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:12 }}>Actividade nos últimos 7 dias</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {stats.recentActivity?.map(a => (
                  <div key={a.action} style={{ background:'var(--color-background-secondary)', borderRadius:8, padding:'8px 14px', fontSize:13 }}>
                    <span style={{ color:'var(--color-text-secondary)' }}>{ACTION_LABEL[a.action]||a.action}: </span>
                    <span style={{ fontWeight:500 }}>{a.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </>)}

          {/* ── USERS ── */}
          {tab === 'users' && (<>
            <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
              <span style={{ fontSize:13, color:'var(--color-text-secondary)' }}>Filtrar:</span>
              {['','superadmin','director_gpl','chefe_departamento'].map(r => (
                <button key={r} onClick={()=>setFilterRole(r)} style={{ fontSize:12, padding:'4px 12px', borderRadius:20, cursor:'pointer', border:`0.5px solid ${filterRole===r?'#185FA5':'var(--color-border-tertiary)'}`, background:filterRole===r?'#E6F1FB':'transparent', color:filterRole===r?'#185FA5':'var(--color-text-secondary)' }}>
                  {r===''?'Todos':ROLE_LABEL[r]}
                </button>
              ))}
              <span style={{ fontSize:13, color:'var(--color-text-secondary)', marginLeft:8 }}>Estado:</span>
              {[['','Todos'],['active','Activos'],['inactive','Inactivos']].map(([v,l]) => (
                <button key={v} onClick={()=>setFilterActive(v)} style={{ fontSize:12, padding:'4px 12px', borderRadius:20, cursor:'pointer', border:`0.5px solid ${filterActive===v?'#185FA5':'var(--color-border-tertiary)'}`, background:filterActive===v?'#E6F1FB':'transparent', color:filterActive===v?'#185FA5':'var(--color-text-secondary)' }}>
                  {l}
                </button>
              ))}
              <span style={{ marginLeft:'auto', fontSize:12, color:'var(--color-text-secondary)' }}>{filteredUsers.length} utilizadores</span>
            </div>

            <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:12, overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead><tr style={{ background:'var(--color-background-secondary)' }}>
                  {['Nome / Email','Instituição','Papel','Campus','Estado','Acções'].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:12, fontWeight:500, color:'var(--color-text-secondary)', borderBottom:'0.5px solid var(--color-border-tertiary)' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {filteredUsers.map((u, i) => (
                    <tr key={u.id} style={{ borderBottom:'0.5px solid var(--color-border-tertiary)', background:i%2===1?'var(--color-background-secondary)':'transparent', opacity:u.is_active?1:0.6 }}>
                      <td style={{ padding:'10px 14px' }}>
                        <div style={{ fontWeight:500 }}>{u.nome||'—'}</div>
                        <div style={{ fontSize:11, color:'var(--color-text-secondary)' }}>{u.email}</div>
                      </td>
                      <td style={{ padding:'10px 14px', color:'var(--color-text-secondary)', fontSize:12 }}>{u.institution}</td>
                      <td style={{ padding:'10px 14px' }}>
                        <select value={u.role} onChange={e=>doChangeRole(u.id,e.target.value)} style={{ fontSize:12, border:'0.5px solid var(--color-border-tertiary)', borderRadius:6, padding:'3px 6px', background:'transparent', color:ROLE_COLOR[u.role]||'inherit' }}>
                          <option value="chefe_departamento">Chefe Dept.</option>
                          <option value="director_gpl">Director GPL</option>
                          <option value="superadmin">Super Admin</option>
                        </select>
                      </td>
                      <td style={{ padding:'10px 14px', fontSize:12, color:'var(--color-text-secondary)' }}>{u.campus_nome||'—'}</td>
                      <td style={{ padding:'10px 14px' }}>
                        <Pill label={u.is_active?'Activo':'Inactivo'} color={u.is_active?'#3B6D11':'#A32D2D'} bg={u.is_active?'#EAF3DE':'#FCEBEB'} />
                      </td>
                      <td style={{ padding:'10px 14px' }}>
                        <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                          {u.is_active
                            ? <button onClick={()=>doDeactivate(u)} style={{ fontSize:11, padding:'3px 9px', border:'0.5px solid #854F0B', color:'#854F0B', borderRadius:6, background:'transparent', cursor:'pointer' }}>Desactivar</button>
                            : <button onClick={()=>doReactivate(u)} style={{ fontSize:11, padding:'3px 9px', border:'0.5px solid #3B6D11', color:'#3B6D11', borderRadius:6, background:'transparent', cursor:'pointer' }}>Reactivar</button>
                          }
                          <button onClick={()=>setResetPw(u.id)} style={{ fontSize:11, padding:'3px 9px', border:'0.5px solid #185FA5', color:'#185FA5', borderRadius:6, background:'transparent', cursor:'pointer' }}>Senha</button>
                          {u.id !== user?.id && <button onClick={()=>doDelete(u)} style={{ fontSize:11, padding:'3px 9px', border:'0.5px solid #A32D2D', color:'#A32D2D', borderRadius:6, background:'transparent', cursor:'pointer' }}>Eliminar</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length===0 && <tr><td colSpan={6} style={{ padding:32, textAlign:'center', color:'var(--color-text-secondary)' }}>Nenhum utilizador encontrado</td></tr>}
                </tbody>
              </table>
            </div>
          </>)}

          {/* ── UNIVERSITIES ── */}
          {tab === 'universities' && (<>
            <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:12, padding:20, marginBottom:16 }}>
              <div style={{ fontSize:14, fontWeight:500, marginBottom:14 }}>Adicionar universidade</div>
              <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr auto', gap:10, alignItems:'end' }}>
                <div>
                  <label style={{ fontSize:12, color:'var(--color-text-secondary)', display:'block', marginBottom:4 }}>Nome *</label>
                  <input value={univForm.nome} onChange={e=>setUnivForm(p=>({...p,nome:e.target.value}))} placeholder="Ex: Universidade Lúrio" style={{ width:'100%' }} />
                </div>
                <div>
                  <label style={{ fontSize:12, color:'var(--color-text-secondary)', display:'block', marginBottom:4 }}>Sigla</label>
                  <input value={univForm.sigla} onChange={e=>setUnivForm(p=>({...p,sigla:e.target.value}))} placeholder="Ex: UniLúrio" style={{ width:'100%' }} />
                </div>
                <div>
                  <label style={{ fontSize:12, color:'var(--color-text-secondary)', display:'block', marginBottom:4 }}>NUIT</label>
                  <input value={univForm.nuit} onChange={e=>setUnivForm(p=>({...p,nuit:e.target.value}))} placeholder="000000000" style={{ width:'100%' }} />
                </div>
                <button onClick={doCreateUniv} disabled={univSaving||!univForm.nome.trim()} style={{ padding:'9px 18px', background:'#185FA5', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13 }}>
                  {univSaving?'...':'Adicionar'}
                </button>
              </div>
            </div>

            <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:12, overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead><tr style={{ background:'var(--color-background-secondary)' }}>
                  {['Nome','Sigla','NUIT','Criada em'].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:12, fontWeight:500, color:'var(--color-text-secondary)', borderBottom:'0.5px solid var(--color-border-tertiary)' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {universities.map((u,i) => (
                    <tr key={u.id} style={{ borderBottom:'0.5px solid var(--color-border-tertiary)', background:i%2===1?'var(--color-background-secondary)':'transparent' }}>
                      <td style={{ padding:'10px 14px', fontWeight:500 }}>{u.nome}</td>
                      <td style={{ padding:'10px 14px', color:'var(--color-text-secondary)' }}>{u.sigla||'—'}</td>
                      <td style={{ padding:'10px 14px', color:'var(--color-text-secondary)' }}>{u.nuit||'—'}</td>
                      <td style={{ padding:'10px 14px', fontSize:12, color:'var(--color-text-secondary)' }}>{new Date(u.created_at).toLocaleDateString('pt-MZ')}</td>
                    </tr>
                  ))}
                  {universities.length===0 && <tr><td colSpan={4} style={{ padding:32, textAlign:'center', color:'var(--color-text-secondary)' }}>Nenhuma universidade registada</td></tr>}
                </tbody>
              </table>
            </div>
          </>)}

          {/* ── AUDIT LOG ── */}
          {tab === 'audit' && (<>
            <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
              <span style={{ fontSize:13, color:'var(--color-text-secondary)' }}>Acção:</span>
              {['','login','save_section','lock_section','unlock_section','submit','deactivate_user','change_role'].map(a => (
                <button key={a} onClick={()=>setAuditFilter(a)} style={{ fontSize:12, padding:'4px 12px', borderRadius:20, cursor:'pointer', border:`0.5px solid ${auditFilter===a?'#185FA5':'var(--color-border-tertiary)'}`, background:auditFilter===a?'#E6F1FB':'transparent', color:auditFilter===a?'#185FA5':'var(--color-text-secondary)' }}>
                  {a===''?'Todas':ACTION_LABEL[a]||a}
                </button>
              ))}
              <span style={{ marginLeft:'auto', fontSize:12, color:'var(--color-text-secondary)' }}>{filteredAudit.length} entradas</span>
            </div>

            <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:12, overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead><tr style={{ background:'var(--color-background-secondary)' }}>
                  {['Data/Hora','Utilizador','Papel','Acção','Secção','Detalhe'].map(h => (
                    <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontSize:11, fontWeight:500, color:'var(--color-text-secondary)', borderBottom:'0.5px solid var(--color-border-tertiary)', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {filteredAudit.map((a,i) => (
                    <tr key={a.id} style={{ borderBottom:'0.5px solid var(--color-border-tertiary)', background:i%2===1?'var(--color-background-secondary)':'transparent' }}>
                      <td style={{ padding:'8px 12px', whiteSpace:'nowrap', color:'var(--color-text-secondary)' }}>{new Date(a.created_at).toLocaleString('pt-MZ')}</td>
                      <td style={{ padding:'8px 12px' }}>{a.actor_nome||a.user_email||'—'}<div style={{ fontSize:10, color:'var(--color-text-secondary)' }}>{a.user_email}</div></td>
                      <td style={{ padding:'8px 12px' }}><Pill label={ROLE_LABEL[a.user_role]||a.user_role||'—'} color={ROLE_COLOR[a.user_role]} /></td>
                      <td style={{ padding:'8px 12px', fontWeight:500 }}>{ACTION_LABEL[a.action]||a.action}</td>
                      <td style={{ padding:'8px 12px', color:'var(--color-text-secondary)' }}>{a.section||'—'}</td>
                      <td style={{ padding:'8px 12px', color:'var(--color-text-secondary)', fontSize:11, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {a.detail ? JSON.stringify(a.detail).slice(0,80) : '—'}
                      </td>
                    </tr>
                  ))}
                  {filteredAudit.length===0 && <tr><td colSpan={6} style={{ padding:32, textAlign:'center', color:'var(--color-text-secondary)' }}>Sem registos</td></tr>}
                </tbody>
              </table>
            </div>
          </>)}
        </>)}
      </div>
    </div>
  );
}
