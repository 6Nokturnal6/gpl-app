import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const ROLE_LABELS = {
  superadmin:         'Super Administrador',
  director_gpl:       'Director GPL',
  chefe_departamento: 'Chefe de Departamento',
};

const s = {
  page:      { minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--color-background-tertiary)' },
  card:      { background:'var(--color-background-primary)',border:'0.5px solid var(--color-border-tertiary)',borderRadius:16,padding:'2.5rem',width:400,maxWidth:'95vw' },
  logo:      { display:'flex',alignItems:'center',gap:10,marginBottom:'2rem' },
  badge:     { width:36,height:36,background:'#185FA5',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:500,fontSize:13 },
  title:     { fontSize:20,fontWeight:500,color:'var(--color-text-primary)',margin:0 },
  sub:       { fontSize:13,color:'var(--color-text-secondary)',marginTop:4 },
  tabs:      { display:'flex',marginBottom:'1.5rem',borderBottom:'0.5px solid var(--color-border-tertiary)' },
  tab:       { flex:1,padding:'8px 0',fontSize:13,background:'none',border:'none',cursor:'pointer',color:'var(--color-text-secondary)' },
  tabActive: { flex:1,padding:'8px 0',fontSize:13,background:'none',border:'none',borderBottom:'2px solid #185FA5',cursor:'pointer',color:'#185FA5',fontWeight:500 },
  label:     { display:'block',fontSize:12,color:'var(--color-text-secondary)',marginBottom:4 },
  group:     { marginBottom:14 },
  error:     { fontSize:12,color:'var(--color-text-danger)',marginTop:4 },
  btn:       { width:'100%',padding:'10px',background:'#185FA5',color:'#fff',border:'none',borderRadius:8,fontSize:14,fontWeight:500,cursor:'pointer',marginTop:8 },
  errBox:    { background:'var(--color-background-danger)',color:'var(--color-text-danger)',border:'0.5px solid var(--color-border-danger)',borderRadius:8,padding:'10px 14px',fontSize:13,marginBottom:12 },
  roleBox:   { background:'var(--color-background-secondary)',borderRadius:8,padding:'10px 14px',marginBottom:14,fontSize:13 },
};

export default function LoginPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email:'', password:'', institution:'', nome:'' });
  const [errors, setErrors] = useState({});
  const [serverErr, setServerErr] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.email.match(/\S+@\S+\.\S+/)) e.email = 'Email inválido';
    if (form.password.length < 8) e.password = 'Mínimo 8 caracteres';
    if (mode === 'register' && !form.institution.trim()) e.institution = 'Nome da instituição obrigatório';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setLoading(true);
    setServerErr('');
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form.email, form.password, form.institution, form.nome);
      }
      navigate('/');
    } catch (err) {
      setServerErr(err.response?.data?.error || 'Erro ao autenticar. Tente novamente.');
    } finally { setLoading(false); }
  };

  const handleKey = (e) => { if (e.key === 'Enter') submit(); };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>
          <div style={s.badge}>IES</div>
          <div>
            <div style={s.title}>GPL App</div>
            <div style={s.sub}>Recolha Estatística 2024 — Universidade Lúrio</div>
          </div>
        </div>

        <div style={s.tabs}>
          <button style={mode==='login'?s.tabActive:s.tab} onClick={()=>setMode('login')}>Entrar</button>
          <button style={mode==='register'?s.tabActive:s.tab} onClick={()=>setMode('register')}>Registar</button>
        </div>

        {serverErr && <div style={s.errBox}>{serverErr}</div>}

        {mode === 'register' && (<>
          <div style={s.group}>
            <label style={s.label}>Nome completo</label>
            <input value={form.nome} onChange={e=>set('nome',e.target.value)} placeholder="Nome e apelido" style={{ width:'100%' }} />
          </div>
          <div style={s.group}>
            <label style={s.label}>Instituição / Departamento *</label>
            <input value={form.institution} onChange={e=>set('institution',e.target.value)} placeholder="Ex: Departamento de Engenharia" style={{ width:'100%' }} />
            {errors.institution && <div style={s.error}>{errors.institution}</div>}
          </div>
          <div style={s.roleBox}>
            A conta será criada com o papel de <strong>Chefe de Departamento</strong>. O Director GPL irá atribuí-la ao campus correspondente.
          </div>
        </>)}

        <div style={s.group}>
          <label style={s.label}>Email</label>
          <input type="email" value={form.email} onChange={e=>set('email',e.target.value)} onKeyDown={handleKey} placeholder="email@unilurio.ac.mz" style={{ width:'100%' }} />
          {errors.email && <div style={s.error}>{errors.email}</div>}
        </div>

        <div style={s.group}>
          <label style={s.label}>Palavra-passe</label>
          <input type="password" value={form.password} onChange={e=>set('password',e.target.value)} onKeyDown={handleKey} placeholder="Mínimo 8 caracteres" style={{ width:'100%' }} />
          {errors.password && <div style={s.error}>{errors.password}</div>}
        </div>

        <button style={s.btn} onClick={submit} disabled={loading}>
          {loading ? 'A processar...' : mode==='login' ? 'Entrar' : 'Criar conta'}
        </button>
      </div>
    </div>
  );
}
