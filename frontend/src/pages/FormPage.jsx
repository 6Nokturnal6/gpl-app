import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSubmission } from '../hooks/useSubmission';
import { exportApi, submissionApi } from '../api';
import { APP_NAME, CURRENT_YEAR, NEXT_YEAR } from '../utils/appConfig';

import SectionIdIes from '../components/FormSections/SectionIdIes';
import SectionEstudantes from '../components/FormSections/SectionEstudantes';
import SectionDocentes from '../components/FormSections/SectionDocentes';
import SectionInvestigadores from '../components/FormSections/SectionInvestigadores';
import SectionFinancas from '../components/FormSections/SectionFinancas';
import SectionInfra from '../components/FormSections/SectionInfra';
import SectionPrevisao from '../components/FormSections/SectionPrevisao';
import Dashboard from '../components/Dashboard/Dashboard';

const SECTION_KEYS = ['idies','estudantes','docentes','investigadores','financas','infra','previsao'];
const SECTION_LABELS = {
  idies: 'ID IES',
  estudantes: `Estudantes ${CURRENT_YEAR}`,
  docentes: 'Docentes',
  investigadores: 'Investigadores',
  financas: 'Finanças',
  infra: 'Infraestrutura',
  previsao: `Previsão ${NEXT_YEAR}`,
};
const COMPONENTS = {
  idies: SectionIdIes,
  estudantes: SectionEstudantes,
  docentes: SectionDocentes,
  investigadores: SectionInvestigadores,
  financas: SectionFinancas,
  infra: SectionInfra,
  previsao: SectionPrevisao,
};
// Sections chefe can mark as concluído (not idies — that's director's)
const LOCKABLE = ['estudantes','docentes','investigadores','financas','infra','previsao'];

export default function FormPage() {
  const { user, logout } = useAuth();
  const {
    data, submission, saving, saveError, lastSaved,
    locks, lockSection, requestUnlock,
    progress, lockedCount, totalSections,
    update, reload,
  } = useSubmission();

  const [current, setCurrent] = useState(0);
  const [view, setView] = useState('form');
  const [submitMsg, setSubmitMsg] = useState('');
  const [downloading, setDownloading] = useState(null);
  const [locking, setLocking] = useState(false);

  const isChefe = user?.role === 'chefe_departamento';
  const isDirector = ['director_gpl','superadmin'].includes(user?.role);

  const currentKey = SECTION_KEYS[current];
  const currentLock = locks[currentKey];
  const isSectionLocked = !!currentLock;
  const isLockable = LOCKABLE.includes(currentKey);
  const isIdIes = currentKey === 'idies';

  const handleMarkDone = async () => {
    if (!submission?.id || locking) return;
    setLocking(true);
    try {
      await lockSection(submission.id, currentKey);
    } catch(e) {
      console.error('Lock failed', e);
    } finally {
      setLocking(false);
    }
  };

  const handleRequestUnlock = async () => {
    if (!submission?.id) return;
    try {
      await requestUnlock(submission.id, currentKey);
      alert('Pedido de desbloqueio enviado ao Director GPL.');
    } catch(e) { console.error(e); }
  };

  const handleSubmit = async () => {
    try {
      await submissionApi.submit();
      setSubmitMsg('Formulário submetido com sucesso!');
      reload();
    } catch(e) {
      setSubmitMsg(e.response?.data?.error || 'Erro ao submeter.');
    }
  };

  const handleDownload = async (format) => {
    setDownloading(format);
    try {
      const sigla = data?.idies?.sigla || 'IES';
      if (format === 'xlsx') await exportApi.downloadXlsx(`Formulario_${CURRENT_YEAR}_${sigla}.xlsx`);
      if (format === 'pdf')  await exportApi.downloadPdf(`Formulario_${CURRENT_YEAR}_${sigla}.pdf`);
    } catch(e) {
      alert('Erro ao exportar. Verifique se existem dados inseridos.');
    } finally {
      setDownloading(null);
    }
  };

  const SectionComp = COMPONENTS[currentKey];

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', background:'var(--color-background-tertiary)' }}>

      {/* Topbar */}
      <div style={{ background:'var(--color-background-primary)', borderBottom:'0.5px solid var(--color-border-tertiary)', padding:'0 20px', display:'flex', alignItems:'center', gap:12, height:52, flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:28, height:28, background:'#185FA5', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:10, fontWeight:700 }}>aG</div>
          <span style={{ fontSize:13, fontWeight:500 }}>{APP_NAME} — Recolha {CURRENT_YEAR}</span>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
          {saving && <span style={{ fontSize:11, color:'var(--color-text-secondary)' }}>A guardar...</span>}
          {saveError && <span style={{ fontSize:11, color:'var(--color-text-danger)', maxWidth:200 }}>{saveError}</span>}
          {!saving && !saveError && lastSaved && <span style={{ fontSize:11, color:'#3B6D11' }}>✓ Guardado</span>}
          {!saving && !saveError && !lastSaved && (
            <span style={{ fontSize:11, color:'var(--color-text-secondary)' }}>
              {user?.campus_nome ? `${user.campus_nome} · ` : ''}{user?.institution}
            </span>
          )}
          <button onClick={() => handleDownload('xlsx')} disabled={!!downloading} style={{ fontSize:11, padding:'5px 10px', border:'0.5px solid var(--color-border-tertiary)', borderRadius:6, background:'transparent', cursor:'pointer', color:'var(--color-text-secondary)' }}>
            {downloading === 'xlsx' ? '...' : '⬇ Excel'}
          </button>
          <button onClick={() => handleDownload('pdf')} disabled={!!downloading} style={{ fontSize:11, padding:'5px 10px', border:'0.5px solid var(--color-border-tertiary)', borderRadius:6, background:'transparent', cursor:'pointer', color:'var(--color-text-secondary)' }}>
            {downloading === 'pdf' ? '...' : '⬇ PDF'}
          </button>
          <button onClick={() => setView(v => v === 'form' ? 'dash' : 'form')} style={{ fontSize:11, padding:'5px 10px', border:'0.5px solid var(--color-border-tertiary)', borderRadius:6, background:view==='dash'?'#185FA5':'transparent', color:view==='dash'?'#fff':'var(--color-text-secondary)', cursor:'pointer' }}>
            {view === 'dash' ? 'Formulário' : 'Dashboard'}
          </button>
          <button onClick={logout} style={{ fontSize:11, padding:'5px 10px', border:'0.5px solid var(--color-border-tertiary)', borderRadius:6, background:'transparent', cursor:'pointer', color:'var(--color-text-secondary)' }}>Sair</button>
        </div>
      </div>

      {/* Progress bar — driven by DB locks */}
      <div style={{ background:'var(--color-background-primary)', borderBottom:'0.5px solid var(--color-border-tertiary)', padding:'7px 20px', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
        <span style={{ fontSize:11, color:'var(--color-text-secondary)', whiteSpace:'nowrap' }}>Progresso ({lockedCount}/{totalSections} concluídas)</span>
        <div style={{ flex:1, height:4, background:'var(--color-background-secondary)', borderRadius:2, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${progress}%`, background: progress === 100 ? '#3B6D11' : '#185FA5', borderRadius:2, transition:'width 0.4s' }} />
        </div>
        <span style={{ fontSize:11, fontWeight:500, color: progress === 100 ? '#3B6D11' : '#185FA5', minWidth:32 }}>{progress}%</span>
        {submission?.status === 'submitted' && (
          <span style={{ fontSize:11, background:'#EAF3DE', color:'#3B6D11', padding:'2px 10px', borderRadius:20 }}>Submetido</span>
        )}
      </div>

      {view === 'dash' ? (
        <div style={{ flex:1, overflow:'auto', padding:24 }}>
          {data && <Dashboard data={data} locks={locks} />}
        </div>
      ) : (
        <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

          {/* Sidebar */}
          <div style={{ width:196, background:'var(--color-background-primary)', borderRight:'0.5px solid var(--color-border-tertiary)', overflowY:'auto', flexShrink:0 }}>
            {SECTION_KEYS.map((key, i) => {
              const locked = !!locks[key];
              const isCurrent = current === i;
              return (
                <div key={key} onClick={() => setCurrent(i)} style={{
                  display:'flex', alignItems:'center', gap:8, padding:'9px 16px', fontSize:13, cursor:'pointer',
                  color: isCurrent ? '#185FA5' : 'var(--color-text-secondary)',
                  borderLeft: `2px solid ${isCurrent ? '#185FA5' : 'transparent'}`,
                  background: isCurrent ? '#E6F1FB' : 'transparent',
                }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', flexShrink:0, background:
                    locked ? '#3B6D11' : isCurrent ? '#185FA5' : 'var(--color-border-tertiary)'
                  }} />
                  <span style={{ flex:1 }}>{SECTION_LABELS[key]}</span>
                  {locked && <span title="Concluído">🔒</span>}
                </div>
              );
            })}
          </div>

          {/* Section content */}
          <div style={{ flex:1, overflowY:'auto', padding:24 }}>
            {data ? (<>

              {/* Lock banner for chefe on locked section */}
              {isSectionLocked && isChefe && isLockable && (
                <div style={{ background:'#EAF3DE', border:'0.5px solid #C0DD97', borderRadius:10, padding:'12px 16px', marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:500, color:'#3B6D11' }}>🔒 Secção concluída e bloqueada</div>
                    <div style={{ fontSize:12, color:'#3B6D11', marginTop:2 }}>Os dados estão protegidos. Para editar, solicite desbloqueio ao Director GPL.</div>
                  </div>
                  {currentLock?.unlock_requested ? (
                    <span style={{ fontSize:12, color:'#854F0B', background:'#FAEEDA', padding:'4px 12px', borderRadius:20, whiteSpace:'nowrap' }}>⏳ Pedido enviado</span>
                  ) : (
                    <button onClick={handleRequestUnlock} style={{ fontSize:12, padding:'6px 14px', border:'0.5px solid #854F0B', color:'#854F0B', borderRadius:8, background:'transparent', cursor:'pointer', whiteSpace:'nowrap' }}>
                      Solicitar desbloqueio
                    </button>
                  )}
                </div>
              )}

              {/* ID IES read-only notice for chefe */}
              {isIdIes && isChefe && (
                <div style={{ background:'#E6F1FB', border:'0.5px solid #B5D4F4', borderRadius:10, padding:'10px 16px', marginBottom:16, fontSize:12, color:'#185FA5' }}>
                  ℹ️ Esta secção é preenchida pelo Director GPL e é comum a todos os campuses. Somente leitura.
                </div>
              )}

              {/* Section — disable interaction if locked (for chefe) */}
              <div style={{
                pointerEvents: (isSectionLocked && isChefe && isLockable) ? 'none' : 'auto',
                opacity: (isSectionLocked && isChefe && isLockable) ? 0.7 : 1,
              }}>
                <SectionComp
                  data={data}
                  update={update}
                  userRole={user?.role}
                  campusNome={user?.campus_nome}
                  campusProvincia={user?.campus_provincia}
                />
              </div>

              {/* Submit message */}
              {submitMsg && (
                <div style={{ marginTop:12, padding:'10px 14px', background:submitMsg.includes('sucesso')?'#EAF3DE':'#FCEBEB', color:submitMsg.includes('sucesso')?'#3B6D11':'#A32D2D', border:'0.5px solid', borderColor:submitMsg.includes('sucesso')?'#C0DD97':'#F09595', borderRadius:8, fontSize:13 }}>
                  {submitMsg}
                </div>
              )}

              {/* Navigation */}
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:20, paddingTop:16, borderTop:'0.5px solid var(--color-border-tertiary)' }}>
                <button onClick={() => setCurrent(c => Math.max(0,c-1))} disabled={current===0} style={{ fontSize:13, padding:'8px 18px', border:'0.5px solid var(--color-border-tertiary)', borderRadius:8, background:'transparent', cursor:'pointer', opacity:current===0?0.4:1 }}>
                  ← Anterior
                </button>
                <div style={{ display:'flex', gap:8 }}>
                  {/* Concluído button — only for chefe, only on lockable sections, only if not yet locked */}
                  {isChefe && isLockable && !isSectionLocked && (
                    <button onClick={handleMarkDone} disabled={locking} style={{ fontSize:13, padding:'8px 14px', border:'0.5px solid #3B6D11', color:'#3B6D11', borderRadius:8, background:'transparent', cursor:'pointer' }}>
                      {locking ? 'A guardar...' : '✓ Marcar como concluído'}
                    </button>
                  )}
                  {current < SECTION_KEYS.length - 1 ? (
                    <button onClick={() => setCurrent(c => c+1)} style={{ fontSize:13, padding:'8px 18px', background:'#185FA5', color:'#fff', border:'none', borderRadius:8, cursor:'pointer' }}>
                      Próximo →
                    </button>
                  ) : (
                    isChefe ? (
                      <div style={{ fontSize:12, color:'var(--color-text-secondary)', padding:'8px 0' }}>
                        {progress === 100 ? '✓ Todas as secções concluídas' : `${lockedCount} de ${totalSections} secções concluídas`}
                      </div>
                    ) : (
                      <button onClick={handleSubmit} disabled={submission?.status==='submitted'} style={{ fontSize:13, padding:'8px 18px', background:submission?.status==='submitted'?'#ccc':'#185FA5', color:'#fff', border:'none', borderRadius:8, cursor:'pointer' }}>
                        Submeter
                      </button>
                    )
                  )}
                </div>
              </div>
            </>) : (
              <div style={{ color:'var(--color-text-secondary)', fontSize:14 }}>A carregar dados...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
