import { useState } from 'react';
import { authApi } from '../../api';
import { useAuth } from '../../hooks/useAuth';

export default function MfaPanel() {
  const { user } = useAuth();
  const [secret, setSecret] = useState('');
  const [otpauth, setOtpauth] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user || user.role !== 'superadmin') return null;

  const setup = async () => {
    setLoading(true);
    try {
      const res = await authApi.mfaSetup();
      setSecret(res.data.secret);
      setOtpauth(res.data.otpauth_url || '');
      alert('Secret generated. Scan it into your authenticator app or copy the secret. Then enter the code to verify.');
    } catch (e) { alert('Failed to start MFA setup: ' + (e.response?.data?.error || e.message)); }
    finally { setLoading(false); }
  };

  const verify = async () => {
    if (!secret || !code) return alert('Provide secret and code');
    setLoading(true);
    try {
      await authApi.mfaVerify(secret, code);
      alert('MFA enabled for your account');
      setSecret(''); setOtpauth(''); setCode('');
    } catch (e) { alert('Failed to verify: ' + (e.response?.data?.error || e.message)); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ marginTop: 12, padding: 12, border: '0.5px solid var(--color-border-tertiary)', borderRadius: 8, background: 'var(--color-background-primary)' }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>MFA (TOTP) — Superadmin</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <button onClick={setup} disabled={loading} style={{ padding: '6px 10px' }}>{loading? '...' : 'Start setup'}</button>
        {secret && (
          <div style={{ fontSize: 12 }}>
            <div>Secret: <code style={{ background:'#f6f6f6', padding:'2px 6px', borderRadius:4 }}>{secret}</code></div>
            {otpauth && <div style={{ marginTop:6 }}>otpauth url: <a href={otpauth} target="_blank" rel="noreferrer">open</a></div>}
          </div>
        )}
      </div>
      {secret && (
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <input placeholder="TOTP code" value={code} onChange={e=>setCode(e.target.value)} style={{ padding:'6px', fontSize:13 }} />
          <button onClick={verify} disabled={loading} style={{ padding:'6px 10px' }}>Verify & Enable</button>
        </div>
      )}
    </div>
  );
}
