import { useState, useEffect, useCallback, useRef } from 'react';
import { submissionApi, lockApi } from '../api';

const SAVE_DELAY = 1500;
const MAX_RETRIES = 3;

export function useSubmission() {
  const [data, setData] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  const [locks, setLocks] = useState({});       // section -> lock object from DB
  const timers = useRef({});

  const loadData = useCallback(() => {
    submissionApi.getCurrent()
      .then(r => {
        setSubmission(r.data.submission);
        // Build locks map from DB
        const lockMap = {};
        (r.data.locks || []).forEach(l => { lockMap[l.section] = l; });
        setLocks(lockMap);

        setData({
          idies: r.data.idies || {},          // university-level ID IES
          estudantes: r.data.estudantes?.length ? r.data.estudantes : [emptyEstudante()],
          docentes: r.data.docentes?.length ? r.data.docentes : [emptyDocente('tempo_inteiro')],
          investigadores: r.data.investigadores?.length ? r.data.investigadores : [emptyInvestigador('tempo_inteiro')],
          financas: r.data.financas || {},
          infra: {
            labs: r.data.infra?.labs?.length ? r.data.infra.labs : [emptyLab()],
            salas: r.data.infra?.salas?.length ? r.data.infra.salas : [emptySala()],
          },
          previsao: r.data.previsao?.length ? r.data.previsao : [emptyPrevisao()],
        });
      })
      .catch(err => console.error('Failed to load submission:', err));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const savers = {
    idies: submissionApi.saveIdIes,
    estudantes: submissionApi.saveEstudantes,
    docentes: submissionApi.saveDocentes,
    investigadores: submissionApi.saveInvestigadores,
    financas: submissionApi.saveFinancas,
    infra: submissionApi.saveInfra,
    previsao: submissionApi.savePrevisao,
  };

  const doSave = useCallback(async (section, payload, attempt = 1) => {
    setSaving(true);
    setSaveError(null);
    try {
      await savers[section](payload);
      setLastSaved(new Date());
      setSaveError(null);
    } catch (e) {
      const status = e?.response?.status;
      if (status === 423) {
        setSaveError('Secção bloqueada — solicite desbloqueio ao Director GPL.');
        setSaving(false);
        return;
      }
      if (attempt < MAX_RETRIES && (!status || status >= 500)) {
        setTimeout(() => doSave(section, payload, attempt + 1), attempt * 1000);
      } else {
        setSaveError(status === 401 ? 'Sessão expirada. Faça login novamente.'
          : status === 403 ? 'Sem permissão.'
          : 'Erro ao guardar. Verifique a ligação.');
      }
    } finally {
      setSaving(false);
    }
  }, []);

  const autoSave = useCallback((section, payload) => {
    clearTimeout(timers.current[section]);
    timers.current[section] = setTimeout(() => doSave(section, payload), SAVE_DELAY);
  }, [doSave]);

  const update = useCallback((section, newVal) => {
    setData(prev => {
      autoSave(section, newVal);
      return { ...prev, [section]: newVal };
    });
  }, [autoSave]);

  // Lock a section in DB and update local state
  const lockSection = useCallback(async (submissionId, section) => {
    await lockApi.lock(submissionId, section);
    const r = await lockApi.getLocks(submissionId);
    const lockMap = {};
    r.data.forEach(l => { lockMap[l.section] = l; });
    setLocks(lockMap);
  }, []);

  // Request unlock — updates local state optimistically
  const requestUnlock = useCallback(async (submissionId, section) => {
    await lockApi.requestUnlock(submissionId, section);
    setLocks(prev => ({
      ...prev,
      [section]: { ...prev[section], unlock_requested: true }
    }));
  }, []);

  // Progress: count locked sections (excluding idies which is director's)
  const CHEFE_SECTIONS = ['estudantes','docentes','investigadores','financas','infra','previsao'];
  const lockedCount = CHEFE_SECTIONS.filter(s => locks[s]).length;
  const progress = Math.round(lockedCount / CHEFE_SECTIONS.length * 100);

  return {
    data, submission, saving, saveError, lastSaved,
    locks, lockSection, requestUnlock,
    progress, lockedCount, totalSections: CHEFE_SECTIONS.length,
    update, reload: loadData,
  };
}

export const emptyEstudante = () => ({ curso:'',duracao:'',area:'',subarea:'',regime:'Presencial',provincia:'',grau:'Licenciatura',homens:0,mulheres:0 });
export const emptyDocente = (regime) => ({ regime,provincia:'',distrito:'',nacionalidade:'Moçambicana',lic_h:0,lic_m:0,mest_h:0,mest_m:0,dout_h:0,dout_m:0 });
export const emptyInvestigador = (regime) => ({ regime,nacionalidade:'Moçambicana',lic_h:0,lic_m:0,mest_h:0,mest_m:0,dout_h:0,dout_m:0 });
export const emptyLab = () => ({ nome:'',area:'',subarea:'',provincia:'',distrito:'',num_labs:0 });
export const emptySala = () => ({ unidade:'',provincia:'',distrito:'',grau:'Licenciatura',num_salas:0 });
export const emptyPrevisao = () => ({ curso:'',duracao:'',area:'',grau:'Licenciatura',provincia:'',homens:0,mulheres:0 });
