import { useState, useEffect } from 'react';
import { adminApi } from '../../api';
import { useAuth } from '../../hooks/useAuth';

export default function JtiManagementPanel() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [issued, setIssued] = useState([]);
  const [revoked, setRevoked] = useState([]);
  const [loading, setLoading] = useState(false);

  if (!user || user.role !== 'superadmin') return null;

  const load = async () => {
    setLoading(true);
    try {
      const [issRes, revRes] = await Promise.all([
        adminApi.listIssuedJtis({ q: query, limit: 200 }),
        adminApi.listRevokedJtis({ q: query, limit: 200 }),
      ]);
      setIssued(issRes.data || []);
      setRevoked(revRes.data || []);
    } catch (err) {
      alert('Falha ao carregar JTIs: ' + (err.response?.data?.error || err.message));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const doRevoke = async (jti) => {
    if (!confirm('Revogar jti ' + jti + '?')) return;
    try {
      await adminApi.revokeToken({ jti, reason: 'revoked from admin UI' });
      alert('Revogado');
      load();
    } catch (err) {
      alert('Falha ao revogar: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div style={{ marginTop: 12, padding: 12, border: '0.5px solid var(--color-border-tertiary)', borderRadius: 8, background: 'var(--color-background-primary)' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Gestão de JTIs</div>
        <input placeholder="Pesquisar jti ou user_id" value={query} onChange={e => setQuery(e.target.value)} style={{ marginLeft: 8, padding: '6px 10px', fontSize: 13 }} />
        <button onClick={load} style={{ padding: '6px 10px', marginLeft: 'auto' }}>Pesquisar</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Issued JTIs (recente primeiro)</div>
          <div style={{ maxHeight: 260, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  <th style={{ padding: 6 }}>JTI</th>
                  <th style={{ padding: 6 }}>User</th>
                  <th style={{ padding: 6 }}>Issued at</th>
                  <th style={{ padding: 6 }}>Expires at</th>
                  <th style={{ padding: 6 }}></th>
                </tr>
              </thead>
              <tbody>
                {issued.map(it => (
                  <tr key={it.jti} style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                    <td style={{ padding: 6, fontSize: 12 }}>{it.jti}</td>
                    <td style={{ padding: 6, fontSize: 12 }}>{it.user_id}</td>
                    <td style={{ padding: 6, fontSize: 12 }}>{it.issued_at ? new Date(it.issued_at).toLocaleString() : '—'}</td>
                    <td style={{ padding: 6, fontSize: 12 }}>{it.expires_at ? new Date(it.expires_at).toLocaleString() : '—'}</td>
                    <td style={{ padding: 6 }}><button onClick={() => doRevoke(it.jti)} style={{ padding: '6px 8px', background: '#D9534F', color: '#fff', border: 'none', borderRadius: 6 }}>Revoke</button></td>
                  </tr>
                ))}
                {issued.length === 0 && <tr><td colSpan={5} style={{ padding: 12 }}>Nenhum</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Revoked JTIs (recente primeiro)</div>
          <div style={{ maxHeight: 260, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  <th style={{ padding: 6 }}>JTI</th>
                  <th style={{ padding: 6 }}>Revoked at</th>
                  <th style={{ padding: 6 }}>Reason</th>
                </tr>
              </thead>
              <tbody>
                {revoked.map(r => (
                  <tr key={r.jti} style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                    <td style={{ padding: 6, fontSize: 12 }}>{r.jti}</td>
                    <td style={{ padding: 6, fontSize: 12 }}>{r.revoked_at ? new Date(r.revoked_at).toLocaleString() : '—'}</td>
                    <td style={{ padding: 6, fontSize: 12 }}>{r.reason || '—'}</td>
                  </tr>
                ))}
                {revoked.length === 0 && <tr><td colSpan={3} style={{ padding: 12 }}>Nenhum</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
