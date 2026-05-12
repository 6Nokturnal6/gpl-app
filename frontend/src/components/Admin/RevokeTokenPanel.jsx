import { useState } from 'react';
import { adminApi } from '../../api';
import { useAuth } from '../../hooks/useAuth';

export default function RevokeTokenPanel() {
  const { user } = useAuth();
  const [jti, setJti] = useState('');
  const [token, setToken] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user || user.role !== 'superadmin') return null;

  const submit = async (e) => {
    e.preventDefault();
    if (!jti && !token) return alert('Forneça jti ou token');
    setLoading(true);
    try {
      const payload = {};
      if (jti) payload.jti = jti;
      if (token) payload.token = token;
      if (reason) payload.reason = reason;
      const res = await adminApi.revokeToken(payload);
      alert('Revogado: ' + (res.data.revoked || JSON.stringify(res.data)));
      setJti(''); setToken(''); setReason('');
    } catch (err) {
      alert('Falha ao revogar: ' + (err.response?.data?.error || err.message));
    } finally { setLoading(false); }
  };

  return (
    <div style={{ marginBottom: 18, padding: 12, border: '0.5px solid var(--color-border-tertiary)', borderRadius: 8, background: 'var(--color-background-primary)' }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Revogar token (superadmin)</div>
      <form onSubmit={submit} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input placeholder="JTI" value={jti} onChange={e => setJti(e.target.value)} style={{ padding: '8px 10px', fontSize: 13, minWidth: 220 }} />
        <input placeholder="Full token (fallback)" value={token} onChange={e => setToken(e.target.value)} style={{ padding: '8px 10px', fontSize: 13, minWidth: 320 }} />
        <input placeholder="Reason (optional)" value={reason} onChange={e => setReason(e.target.value)} style={{ padding: '8px 10px', fontSize: 13, minWidth: 200 }} />
        <button type="submit" disabled={loading} style={{ padding: '8px 12px', background: '#D9534F', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          {loading ? 'Revogando...' : 'Revogar'}
        </button>
      </form>
    </div>
  );
}
