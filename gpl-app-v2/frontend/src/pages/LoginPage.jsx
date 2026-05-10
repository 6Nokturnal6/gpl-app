import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const s = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-background-tertiary)' },
  card: { background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 16, padding: '2.5rem', width: 380, maxWidth: '95vw' },
  logo: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: '2rem' },
  logoBadge: { width: 36, height: 36, background: '#185FA5', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 500, fontSize: 13 },
  title: { fontSize: 20, fontWeight: 500, color: 'var(--color-text-primary)', margin: 0 },
  sub: { fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 },
  tabs: { display: 'flex', gap: 0, marginBottom: '1.5rem', borderBottom: '0.5px solid var(--color-border-tertiary)' },
  tab: { flex: 1, padding: '8px 0', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' },
  tabActive: { flex: 1, padding: '8px 0', fontSize: 13, background: 'none', border: 'none', borderBottom: '2px solid #185FA5', cursor: 'pointer', color: '#185FA5', fontWeight: 500 },
  label: { display: 'block', fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 },
  group: { marginBottom: 12 },
  error: { fontSize: 12, color: 'var(--color-text-danger)', marginTop: 4 },
  btn: { width: '100%', padding: '10px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', marginTop: 8 },
  errBox: { background: 'var(--color-background-danger)', color: 'var(--color-text-danger)', border: '0.5px solid var(--color-border-danger)', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 12 },
};

export default function LoginPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', institution: '' });
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
      if (mode === 'login') await login(form.email, form.password);
      else await register(form.email, form.password, form.institution);
      navigate('/');
    } catch (err) {
      setServerErr(err.response?.data?.error || 'Erro ao autenticar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>
          <div style={s.logoBadge}>IES</div>
          <div>
            <div style={s.title}>GPL App</div>
            <div style={s.sub}>Recolha Estatística 2024</div>
          </div>
        </div>

        <div style={s.tabs}>
          <button style={mode === 'login' ? s.tabActive : s.tab} onClick={() => setMode('login')}>Entrar</button>
          <button style={mode === 'register' ? s.tabActive : s.tab} onClick={() => setMode('register')}>Registar</button>
        </div>

        {serverErr && <div style={s.errBox}>{serverErr}</div>}

        {mode === 'register' && (
          <div style={s.group}>
            <label style={s.label}>Nome da Instituição</label>
            <input value={form.institution} onChange={e => set('institution', e.target.value)} placeholder="Ex: Universidade Eduardo Mondlane" style={{ width: '100%' }} />
            {errors.institution && <div style={s.error}>{errors.institution}</div>}
          </div>
        )}

        <div style={s.group}>
          <label style={s.label}>Email</label>
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@ies.ac.mz" style={{ width: '100%' }} />
          {errors.email && <div style={s.error}>{errors.email}</div>}
        </div>

        <div style={s.group}>
          <label style={s.label}>Palavra-passe</label>
          <input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Mínimo 8 caracteres" style={{ width: '100%' }} />
          {errors.password && <div style={s.error}>{errors.password}</div>}
        </div>

        <button style={s.btn} onClick={submit} disabled={loading}>
          {loading ? 'A processar...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
        </button>
      </div>
    </div>
  );
}
