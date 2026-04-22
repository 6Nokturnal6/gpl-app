import { useState, useEffect } from 'react';
import { adminApi, exportApi } from '../../api';
import { useAuth } from '../../hooks/useAuth';

const STATUS_STYLE = {
  draft:     { bg: '#F1EFE8', color: '#5F5E5A', label: 'Rascunho' },
  submitted: { bg: '#FAEEDA', color: '#854F0B', label: 'Submetido' },
  approved:  { bg: '#EAF3DE', color: '#3B6D11', label: 'Aprovado'  },
  rejected:  { bg: '#FCEBEB', color: '#A32D2D', label: 'Rejeitado' },
};

function Pill({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.draft;
  return (
    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: s.bg, color: s.color, fontWeight: 500 }}>
      {s.label}
    </span>
  );
}

function StatCard({ label, value, sub, color = '#185FA5' }) {
  return (
    <div style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '14px 16px' }}>
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 500, color }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function ReviewModal({ submission, onClose, onSave }) {
  const [status, setStatus] = useState(submission.status);
  const [note, setNote] = useState(submission.review_note || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await adminApi.setStatus(submission.id, status, note);
      onSave(submission.id, status, note);
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--color-background-primary)', borderRadius: 12, padding: 28, width: 480, maxWidth: '95vw', border: '0.5px solid var(--color-border-tertiary)' }}>
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>Rever submissão</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 20 }}>
          {submission.nome || submission.institution} ({submission.sigla || '—'})
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>Novo estado</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['approved', 'rejected', 'draft'].map(s => (
              <button key={s} onClick={() => setStatus(s)} style={{
                flex: 1, padding: '8px', fontSize: 12, borderRadius: 8, cursor: 'pointer', fontWeight: status === s ? 500 : 400,
                border: `2px solid ${status === s ? (s === 'approved' ? '#3B6D11' : s === 'rejected' ? '#A32D2D' : '#185FA5') : 'var(--color-border-tertiary)'}`,
                background: status === s ? (s === 'approved' ? '#EAF3DE' : s === 'rejected' ? '#FCEBEB' : '#E6F1FB') : 'transparent',
                color: status === s ? (s === 'approved' ? '#3B6D11' : s === 'rejected' ? '#A32D2D' : '#185FA5') : 'var(--color-text-secondary)',
              }}>
                {STATUS_STYLE[s].label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>
            Nota para a instituição {status === 'rejected' ? '(obrigatória)' : '(opcional)'}
          </label>
          <textarea value={note} onChange={e => setNote(e.target.value)}
            placeholder="Ex: Por favor corrija os dados de docentes da província X..."
            style={{ width: '100%', height: 90, fontSize: 13, resize: 'vertical' }} />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ fontSize: 13, padding: '8px 16px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 8, background: 'transparent', cursor: 'pointer' }}>Cancelar</button>
          <button onClick={save} disabled={saving || (status === 'rejected' && !note.trim())} style={{ fontSize: 13, padding: '8px 18px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'A guardar...' : 'Guardar decisão'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('submissions'); // 'submissions' | 'stats' | 'users'
  const [submissions, setSubmissions] = useState([]);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [reviewing, setReviewing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      adminApi.getSubmissions({ status: filterStatus || undefined }),
      adminApi.getStats(),
      adminApi.getUsers(),
    ]).then(([subs, statsRes, usersRes]) => {
      setSubmissions(subs.data);
      setStats(statsRes.data);
      setUsers(usersRes.data);
    }).finally(() => setLoading(false));
  }, [filterStatus]);

  const handleStatusSave = (id, status, note) => {
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status, review_note: note } : s));
  };

  const downloadPdf = async (sub) => {
    setDownloadingId(sub.id);
    try {
      await exportApi.downloadSubmissionPdf(sub.id, `Formulario_2024_${sub.sigla || sub.institution}.pdf`);
    } finally { setDownloadingId(null); }
  };

  const tabBtn = (id, label) => (
    <button onClick={() => setTab(id)} style={{
      padding: '8px 16px', fontSize: 13, border: 'none', cursor: 'pointer', borderBottom: `2px solid ${tab === id ? '#185FA5' : 'transparent'}`,
      color: tab === id ? '#185FA5' : 'var(--color-text-secondary)', background: 'transparent', fontWeight: tab === id ? 500 : 400,
    }}>{label}</button>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background-tertiary)' }}>
      {reviewing && <ReviewModal submission={reviewing} onClose={() => setReviewing(null)} onSave={handleStatusSave} />}

      {/* Topbar */}
      <div style={{ background: 'var(--color-background-primary)', borderBottom: '0.5px solid var(--color-border-tertiary)', padding: '0 24px', display: 'flex', alignItems: 'center', height: 52 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, background: '#185FA5', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 500 }}>IES</div>
          <span style={{ fontSize: 13, fontWeight: 500 }}>Painel de Administração</span>
          <span style={{ fontSize: 11, background: '#E6F1FB', color: '#185FA5', padding: '2px 8px', borderRadius: 12, marginLeft: 4 }}>Ministério</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{user?.email}</span>
          <button onClick={logout} style={{ fontSize: 12, padding: '5px 12px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 6, background: 'transparent', cursor: 'pointer' }}>Sair</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: 'var(--color-background-primary)', borderBottom: '0.5px solid var(--color-border-tertiary)', padding: '0 24px', display: 'flex' }}>
        {tabBtn('submissions', 'Submissões')}
        {tabBtn('stats', 'Estatísticas')}
        {tabBtn('users', 'Instituições')}
      </div>

      <div style={{ padding: 24 }}>
        {loading ? (
          <div style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>A carregar...</div>
        ) : tab === 'submissions' ? (
          <>
            {/* Filters + summary pills */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Filtrar:</span>
              {['', 'draft', 'submitted', 'approved', 'rejected'].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)} style={{
                  fontSize: 12, padding: '4px 12px', borderRadius: 20, cursor: 'pointer',
                  border: `0.5px solid ${filterStatus === s ? '#185FA5' : 'var(--color-border-tertiary)'}`,
                  background: filterStatus === s ? '#E6F1FB' : 'transparent',
                  color: filterStatus === s ? '#185FA5' : 'var(--color-text-secondary)',
                }}>
                  {s === '' ? 'Todos' : STATUS_STYLE[s].label}
                </button>
              ))}
              <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-secondary)' }}>{submissions.length} instituições</span>
            </div>

            {/* Submissions table */}
            <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--color-background-secondary)' }}>
                    {['Instituição','Província','Estudantes','Financiamento (MT×10³)','Submetido em','Estado','Acções'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', borderBottom: '0.5px solid var(--color-border-tertiary)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub, i) => (
                    <tr key={sub.id} style={{ borderBottom: '0.5px solid var(--color-border-tertiary)', background: i % 2 === 1 ? 'var(--color-background-secondary)' : 'transparent' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 500 }}>{sub.nome || sub.institution}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{sub.sigla} · {sub.email}</div>
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--color-text-secondary)' }}>{sub.provincia || '—'}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 500 }}>{Number(sub.total_estudantes).toLocaleString('pt-MZ')}</td>
                      <td style={{ padding: '10px 14px' }}>{Number(sub.total_financiamento||0).toLocaleString('pt-MZ')}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString('pt-MZ') : '—'}
                      </td>
                      <td style={{ padding: '10px 14px' }}><Pill status={sub.status} /></td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => setReviewing(sub)} style={{ fontSize: 11, padding: '4px 10px', border: '0.5px solid #185FA5', color: '#185FA5', borderRadius: 6, background: 'transparent', cursor: 'pointer' }}>
                            Rever
                          </button>
                          <button onClick={() => downloadPdf(sub)} disabled={downloadingId === sub.id} style={{ fontSize: 11, padding: '4px 10px', border: '0.5px solid var(--color-border-tertiary)', color: 'var(--color-text-secondary)', borderRadius: 6, background: 'transparent', cursor: 'pointer' }}>
                            {downloadingId === sub.id ? '...' : 'PDF'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {submissions.length === 0 && (
                    <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13 }}>Nenhuma submissão encontrada</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : tab === 'stats' && stats ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 20 }}>
              <StatCard label="Total submissões" value={stats.overview.total_submissions} />
              <StatCard label="Submetidas" value={stats.overview.submitted} color='#854F0B' />
              <StatCard label="Aprovadas" value={stats.overview.approved} color='#3B6D11' />
              <StatCard label="Rascunhos" value={stats.overview.draft} color='#5F5E5A' />
              <StatCard label="Total estudantes" value={Number(stats.overview.total_estudantes).toLocaleString('pt-MZ')} sub="todas as IES" />
              <StatCard label="Mulheres" value={Number(stats.overview.total_mulheres).toLocaleString('pt-MZ')}
                sub={`${stats.overview.total_estudantes > 0 ? Math.round(stats.overview.total_mulheres / stats.overview.total_estudantes * 100) : 0}%`} color='#5DCAA5' />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, padding: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14 }}>Estudantes por província</div>
                {stats.byProvincia.map(p => {
                  const max = Math.max(...stats.byProvincia.map(x => parseInt(x.estudantes)||0), 1);
                  return (
                    <div key={p.provincia} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 80, fontSize: 12, color: 'var(--color-text-secondary)', textAlign: 'right', flexShrink: 0 }}>{p.provincia || '—'}</div>
                      <div style={{ flex: 1, height: 16, background: 'var(--color-background-secondary)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.round((parseInt(p.estudantes)||0)/max*100)}%`, background: '#185FA5', borderRadius: 3 }} />
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', minWidth: 40 }}>{Number(p.estudantes).toLocaleString()}</div>
                    </div>
                  );
                })}
              </div>

              <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, padding: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14 }}>Financiamento agregado (MT×10³)</div>
                {[
                  ['OGE', stats.financials.total_oge, '#185FA5'],
                  ['Doações', stats.financials.total_doacoes, '#5DCAA5'],
                  ['Créditos', stats.financials.total_creditos, '#EF9F27'],
                  ['Rec. próprias', stats.financials.total_proprias, '#D85A30'],
                ].map(([label, val, color]) => {
                  const total = Object.values(stats.financials).reduce((a, v) => a + (parseFloat(v)||0), 0) || 1;
                  return (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 80, fontSize: 12, color: 'var(--color-text-secondary)', textAlign: 'right', flexShrink: 0 }}>{label}</div>
                      <div style={{ flex: 1, height: 16, background: 'var(--color-background-secondary)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.round((parseFloat(val)||0)/total*100)}%`, background: color, borderRadius: 3 }} />
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', minWidth: 55 }}>{Number(val||0).toLocaleString()}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : tab === 'users' ? (
          <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--color-background-secondary)' }}>
                  {['Instituição','Email','Conta criada','Estado submissão','Submetido em'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.filter(u => u.role !== 'admin').map((u, i) => (
                  <tr key={u.id} style={{ borderBottom: '0.5px solid var(--color-border-tertiary)', background: i % 2 === 1 ? 'var(--color-background-secondary)' : 'transparent' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 500 }}>{u.institution}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--color-text-secondary)', fontSize: 12 }}>{u.email}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--color-text-secondary)' }}>{new Date(u.created_at).toLocaleDateString('pt-MZ')}</td>
                    <td style={{ padding: '10px 14px' }}><Pill status={u.submission_status || 'draft'} /></td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                      {u.submitted_at ? new Date(u.submitted_at).toLocaleDateString('pt-MZ') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
