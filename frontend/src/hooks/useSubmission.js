import { useState, useEffect, useCallback, useRef } from 'react';
import { submissionApi } from '../api';

const SAVE_DELAY = 1500; // ms debounce

export function useSubmission() {
  const [data, setData] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [sectionsDone, setSectionsDone] = useState({});
  const timers = useRef({});

  useEffect(() => {
    submissionApi.getCurrent().then(r => {
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
    });
  }, []);

  const autoSave = useCallback((section, payload) => {
    clearTimeout(timers.current[section]);
    timers.current[section] = setTimeout(async () => {
      setSaving(true);
      setSaveError(null);
      try {
        const savers = {
          idies: submissionApi.saveIdIes,
          estudantes: submissionApi.saveEstudantes,
          docentes: submissionApi.saveDocentes,
          investigadores: submissionApi.saveInvestigadores,
          financas: submissionApi.saveFinancas,
          infra: submissionApi.saveInfra,
          previsao: submissionApi.savePrevisao,
        };
        await savers[section](payload);
      } catch (e) {
        setSaveError('Erro ao guardar. Verifique a ligação.');
      } finally {
        setSaving(false);
      }
    }, SAVE_DELAY);
  }, []);

  const update = useCallback((section, newVal) => {
    setData(prev => {
      const updated = { ...prev, [section]: newVal };
      autoSave(section, newVal);
      return updated;
    });
  }, [autoSave]);

  const markDone = (sectionIdx) => {
    setSectionsDone(prev => ({ ...prev, [sectionIdx]: true }));
  };

  const progress = Math.round(Object.keys(sectionsDone).length / 7 * 100);

  return { data, submission, saving, saveError, sectionsDone, markDone, update, progress };
}

export const emptyEstudante = () => ({ curso: '', duracao: '', area: '', subarea: '', regime: 'Presencial', provincia: '', grau: 'Licenciatura', homens: 0, mulheres: 0 });
export const emptyDocente = (regime) => ({ regime, provincia: '', distrito: '', nacionalidade: 'Moçambicana', lic_h:0,lic_m:0,mest_h:0,mest_m:0,dout_h:0,dout_m:0 });
export const emptyInvestigador = (regime) => ({ regime, nacionalidade: 'Moçambicana', lic_h:0,lic_m:0,mest_h:0,mest_m:0,dout_h:0,dout_m:0 });
export const emptyLab = () => ({ nome:'',area:'',subarea:'',provincia:'',distrito:'',num_labs:0 });
export const emptySala = () => ({ unidade:'',provincia:'',distrito:'',grau:'Licenciatura',num_salas:0 });
export const emptyPrevisao = () => ({ curso:'',duracao:'',area:'',grau:'Licenciatura',provincia:'',homens:0,mulheres:0 });
