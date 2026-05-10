import { useState, useEffect, useCallback, useRef } from 'react';
import { submissionApi } from '../api';

const SAVE_DELAY = 1500;
const MAX_RETRIES = 3;

export function useSubmission() {
  const [data, setData] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  const [sectionsDone, setSectionsDone] = useState({});
  const timers = useRef({});
  const retries = useRef({});

  useEffect(() => {
    submissionApi.getCurrent()
      .then(r => {
        setSubmission(r.data.submission);
        setData({
          idies: r.data.idies || {},
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
      retries.current[section] = 0;
    } catch (e) {
      const status = e?.response?.status;
      // Retry on network errors, not on 4xx
      if (attempt < MAX_RETRIES && (!status || status >= 500)) {
        const delay = attempt * 1000;
        setTimeout(() => doSave(section, payload, attempt + 1), delay);
      } else {
        const msg = status === 401 ? 'Sessão expirada. Faça login novamente.'
          : status === 403 ? 'Sem permissão para guardar.'
          : 'Erro ao guardar. A tentar novamente...';
        setSaveError(msg);
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

  const markDone = (sectionIdx) => {
    setSectionsDone(prev => ({ ...prev, [sectionIdx]: true }));
  };

  const progress = Math.round(Object.keys(sectionsDone).length / 7 * 100);

  return { data, submission, saving, saveError, lastSaved, sectionsDone, markDone, update, progress };
}

export const emptyEstudante = () => ({ curso:'',duracao:'',area:'',subarea:'',regime:'Presencial',provincia:'',grau:'Licenciatura',homens:0,mulheres:0 });
export const emptyDocente = (regime) => ({ regime,provincia:'',distrito:'',nacionalidade:'Moçambicana',lic_h:0,lic_m:0,mest_h:0,mest_m:0,dout_h:0,dout_m:0 });
export const emptyInvestigador = (regime) => ({ regime,nacionalidade:'Moçambicana',lic_h:0,lic_m:0,mest_h:0,mest_m:0,dout_h:0,dout_m:0 });
export const emptyLab = () => ({ nome:'',area:'',subarea:'',provincia:'',distrito:'',num_labs:0 });
export const emptySala = () => ({ unidade:'',provincia:'',distrito:'',grau:'Licenciatura',num_salas:0 });
export const emptyPrevisao = () => ({ curso:'',duracao:'',area:'',grau:'Licenciatura',provincia:'',homens:0,mulheres:0 });
