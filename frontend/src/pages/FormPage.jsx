import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSubmission } from '../hooks/useSubmission';
import { exportApi, submissionApi } from '../api';

import SectionIdIes from '../components/FormSections/SectionIdIes';
import SectionEstudantes from '../components/FormSections/SectionEstudantes';
import SectionDocentes from '../components/FormSections/SectionDocentes';
import SectionInvestigadores from '../components/FormSections/SectionInvestigadores';
import SectionFinancas from '../components/FormSections/SectionFinancas';
import SectionInfra from '../components/FormSections/SectionInfra';
import SectionPrevisao from '../components/FormSections/SectionPrevisao';
import Dashboard from '../components/Dashboard/Dashboard';

const SECTIONS = [
  { id: 'idies', label: 'ID IES' },
  { id: 'estudantes', label: 'Estudantes' },
  { id: 'docentes', label: 'Docentes' },
  { id: 'investigadores', label: 'Investigadores' },
  { id: 'financas', label: 'Finanças' },
  { id: 'infra', label: 'Infraestrutura' },
  { id: 'previsao', label: 'Previsão 2025' },
];

const COMPONENTS = [
  SectionIdIes, SectionEstudantes, SectionDocentes, SectionInvestigadores,
  SectionFinancas, SectionInfra, SectionPrevisao,
];

export default function FormPage() {
  const { user, logout } = useAuth();
  const { data, submission, saving, saveError, sectionsDone, markDone, update, progress } = useSubmission();
  const [current, setCurrent] = useState(0);
  const [view, setView] = useState('form'); // 'form' | 'dash'
  const [submitMsg, setSubmitMsg] = useState('');
  const [downloading, setDownloading] = useState(false);

  const handleSubmit = async () => {
    try {
      await submissionApi.submit();
      setSubmitMsg('Formulário submetido com sucesso!');
    } catch (e) {
      setSubmitMsg(e.response?.data?.error || 'Erro ao submeter.');
    }
  };

  const handleDownload = async (format) => {
    setDownloading(format);
    try {
      const sigla = data?.idies?.sigla || 'IES';
      if (format === 'xlsx') await exportApi.downloadXlsx(`Formulario_Recolha_2024_${sigla}.xlsx`);
      if (format === 'pdf')  await exportApi.downloadPdf(`Formulario_Recolha_2024_${sigla}.pdf`);
    } finally { setDownloading(false); }
  };

  const SectionComp = COMPONENTS[current];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--color-background-tertiary)' }}>
      {/* Topbar */}
      <div style={{ background: 'var(--color-background-primary)', borderBottom: '0.5px solid var(--color-border-tertiary)', padding: '0 20px', display: 'flex', alignItems: 'center', gap: 12, height: 52, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, background: '#185FA5', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 500 }}>IES</div>
          <span style={{ fontSize: 13, fontWeight: 500 }}>Formulário de Recolha Estatística 2024</span>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {saving && <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>A guardar...</span>}
          {saveError && <span style={{ fontSize: 12, color: 'var(--color-text-danger)' }}>{saveError}</span>}
          {!saving && !saveError && <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{user?.institution}</span>}

          <button onClick={() => handleDownload('xlsx')} disabled={!!downloading} style={{ fontSize: 12, padding: '5px 12px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 6, background: 'transparent', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
            {downloading === 'xlsx' ? '...' : '⬇ Excel'}
          </button>
          <button onClick={() => handleDownload('pdf')} disabled={!!downloading} style={{ fontSize: 12, padding: '5px 12px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 6, background: 'transparent', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
            {downloading === 'pdf' ? '...' : '⬇ PDF'}
          </button>
          {user?.role === 'admin' && (
            <a href="/admin" style={{ fontSize: 12, padding: '5px 12px', border: '0.5px solid #185FA5', borderRadius: 6, background: '#E6F1FB', color: '#185FA5', textDecoration: 'none' }}>Admin</a>
          )}
          <button onClick={() => setView(view === 'form' ? 'dash' : 'form')} style={{ fontSize: 12, padding: '5px 12px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 6, background: view === 'dash' ? '#185FA5' : 'transparent', color: view === 'dash' ? '#fff' : 'var(--color-text-secondary)', cursor: 'pointer' }}>
            {view === 'dash' ? 'Formulário' : 'Dashboard'}
          </button>
          <button onClick={logout} style={{ fontSize: 12, padding: '5px 12px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 6, background: 'transparent', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>Sair</button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ background: 'var(--color-background-primary)', borderBottom: '0.5px solid var(--color-border-tertiary)', padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>Progresso</span>
        <div style={{ flex: 1, height: 4, background: 'var(--color-background-secondary)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: '#185FA5', borderRadius: 2, transition: 'width 0.4s' }} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 500, color: '#185FA5', minWidth: 34 }}>{progress}%</span>
        {submission?.status === 'submitted' && (
          <span style={{ fontSize: 11, background: '#EAF3DE', color: '#3B6D11', padding: '2px 10px', borderRadius: 20 }}>Submetido</span>
        )}
      </div>

      {view === 'dash' ? (
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          {data && <Dashboard data={data} sectionsDone={sectionsDone} />}
        </div>
      ) : (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Sidebar */}
          <div style={{ width: 196, background: 'var(--color-background-primary)', borderRight: '0.5px solid var(--color-border-tertiary)', overflowY: 'auto', flexShrink: 0 }}>
            {SECTIONS.map((sec, i) => (
              <div key={sec.id} onClick={() => setCurrent(i)} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px',
                fontSize: 13, cursor: 'pointer',
                color: current === i ? '#185FA5' : 'var(--color-text-secondary)',
                borderLeft: `2px solid ${current === i ? '#185FA5' : 'transparent'}`,
                background: current === i ? '#E6F1FB' : 'transparent',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: sectionsDone[i] ? '#3B6D11' : current === i ? '#185FA5' : 'var(--color-border-tertiary)' }} />
                {sec.label}
              </div>
            ))}
          </div>

          {/* Section content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            {data ? (
              <>
                <SectionComp data={data} update={update} />
                {submitMsg && (
                  <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--color-background-success)', color: 'var(--color-text-success)', border: '0.5px solid var(--color-border-success)', borderRadius: 8, fontSize: 13 }}>
                    {submitMsg}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, paddingTop: 16, borderTop: '0.5px solid var(--color-border-tertiary)' }}>
                  <button onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0} style={{ fontSize: 13, padding: '8px 18px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 8, background: 'transparent', cursor: 'pointer', opacity: current === 0 ? 0.4 : 1 }}>← Anterior</button>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => markDone(current)} style={{ fontSize: 13, padding: '8px 14px', border: '0.5px solid #3B6D11', color: '#3B6D11', borderRadius: 8, background: 'transparent', cursor: 'pointer' }}>
                      {sectionsDone[current] ? '✓ Concluído' : 'Marcar concluído'}
                    </button>
                    {current < SECTIONS.length - 1
                      ? <button onClick={() => setCurrent(c => c + 1)} style={{ fontSize: 13, padding: '8px 18px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Próximo →</button>
                      : <button onClick={handleSubmit} disabled={submission?.status === 'submitted'} style={{ fontSize: 13, padding: '8px 18px', background: submission?.status === 'submitted' ? '#ccc' : '#185FA5', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Submeter</button>
                    }
                  </div>
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>A carregar dados...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
