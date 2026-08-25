import { useState, useEffect, useCallback, useRef } from 'react';
import { submissionApi, lockApi } from '../api';
import { LOCKABLE_SECTIONS } from '../utils/appConfig';
import {
  ensureGrupoEtario, ensureAreaFormacao, ensureConferencias, ensureProducao,
  ensurePubsPorDocente, ensurePubsTipo, ensureOrientacoes, ensureExtensao,
  emptyPubsPares, emptyPesquisa, emptyExtensaoNivel,
} from '../utils/investigadoresStats';

const SAVE_DELAY = 1500;
const MAX_RETRIES = 3;

function normalizeResultados(raw) {
  const r = raw || {};
  return {
    conferencias: ensureConferencias(r.conferencias),
    producao: ensureProducao(r.producao),
    pubsPares: r.pubsPares?.length ? r.pubsPares : [emptyPubsPares()],
    pubsPorDocente: ensurePubsPorDocente(r.pubsPorDocente),
    pubsTipo: ensurePubsTipo(r.pubsTipo),
    orientacoes: ensureOrientacoes(r.orientacoes),
    pesquisas: r.pesquisas?.length ? r.pesquisas : [emptyPesquisa()],
    extensao: ensureExtensao(r.extensao),
    extensaoNivel: r.extensaoNivel?.length ? r.extensaoNivel : [emptyExtensaoNivel()],
  };
}

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
          estudantesVagas: r.data.estudantesVagas?.length ? r.data.estudantesVagas : [emptyEstudanteVaga()],
          estudantesResultados: r.data.estudantesResultados || {},
          docentes: r.data.docentes?.length ? r.data.docentes : [emptyDocente('tempo_inteiro')],
          docentesResultados: { ...emptyDocentesResultados(), ...(r.data.docentesResultados || {}), cta: { ...emptyCta(), ...(r.data.cta || {}) } },
          investigadores: r.data.investigadores?.length ? r.data.investigadores : [emptyInvestigador('tempo_inteiro')],
          investigadoresGrupoEtario: ensureGrupoEtario(r.data.investigadoresGrupoEtario),
          investigadoresAreaFormacao: ensureAreaFormacao(r.data.investigadoresAreaFormacao),
          investigadoresResultados: normalizeResultados(r.data.investigadoresResultados),
          financas: r.data.financas || {},
          infra: {
            labs: r.data.infra?.labs?.length ? r.data.infra.labs : [emptyLab()],
            salas: r.data.infra?.salas?.length ? r.data.infra.salas : [emptySala()],
            bibliotecas: r.data.infra?.bibliotecas?.length ? r.data.infra.bibliotecas : [emptyBiblioteca()],
            computadores: r.data.infra?.computadores?.length ? r.data.infra.computadores : [emptyComputador()],
          },
          previsao: r.data.previsao?.length ? r.data.previsao : [emptyPrevisao()],
          cultura: {
            desportoOrganizado: r.data.cultura?.desportoOrganizado?.length ? r.data.cultura.desportoOrganizado : [emptyDesportoOrganizado()],
            desportoParticipacao: r.data.cultura?.desportoParticipacao?.length ? r.data.cultura.desportoParticipacao : [emptyDesportoParticipacao()],
            culturaOrganizada: r.data.cultura?.culturaOrganizada?.length ? r.data.cultura.culturaOrganizada : [emptyCulturaOrganizada()],
            culturaParticipacao: r.data.cultura?.culturaParticipacao?.length ? r.data.cultura.culturaParticipacao : [emptyCulturaParticipacao()],
            grupos: r.data.cultura?.grupos?.length ? r.data.cultura.grupos : [emptyGrupo()],
            tuna: r.data.cultura?.tuna?.length ? r.data.cultura.tuna : [emptyTunaAtleta()],
            estudantesAtividades: r.data.cultura?.estudantesAtividades?.length ? r.data.cultura.estudantesAtividades : [emptyEstudanteAtividade()],
          },
        });
      })
      .catch(err => console.error('Failed to load submission:', err));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const savers = {
    idies: submissionApi.saveIdIes,
    estudantes: submissionApi.saveEstudantes,
    estudantesVagas: (payload) => submissionApi.saveEstudantesResultados({ ...(payload.estudantesResultados || {}), vagas: payload.estudantesVagas || [] }),
    estudantesResultados: submissionApi.saveEstudantesResultados,
    docentes: submissionApi.saveDocentes,
    docentesResultados: submissionApi.saveDocentesResultados,
    investigadores: submissionApi.saveInvestigadores,
    investigadoresGrupoEtario: submissionApi.saveInvestigadoresGrupoEtario,
    investigadoresAreaFormacao: submissionApi.saveInvestigadoresAreaFormacao,
    investigadoresResultados: submissionApi.saveInvestigadoresResultados,
    financas: submissionApi.saveFinancas,
    infra: submissionApi.saveInfra,
    previsao: submissionApi.savePrevisao,
    // Cultura sub-sections
    cultura: async (payload) => {
      if (!payload) return;
      await Promise.all([
        payload.desportoOrganizado && submissionApi.saveDesportoOrganizado(payload.desportoOrganizado),
        payload.desportoParticipacao && submissionApi.saveDesportoParticipacao(payload.desportoParticipacao),
        payload.culturaOrganizada && submissionApi.saveCulturaOrganizada(payload.culturaOrganizada),
        payload.culturaParticipacao && submissionApi.saveCulturaParticipacao(payload.culturaParticipacao),
        payload.grupos && submissionApi.saveGrupos(payload.grupos),
        payload.tuna && submissionApi.saveTuna(payload.tuna),
        payload.estudantesAtividades && submissionApi.saveEstudantesAtividades(payload.estudantesAtividades),
      ]);
    },
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
  const CHEFE_SECTIONS = LOCKABLE_SECTIONS;
  const lockedCount = CHEFE_SECTIONS.filter(s => locks[s]).length;
  const progress = Math.round(lockedCount / CHEFE_SECTIONS.length * 100);

  return {
    data, submission, saving, saveError, lastSaved,
    locks, lockSection, requestUnlock,
    progress, lockedCount, totalSections: CHEFE_SECTIONS.length,
    update, reload: loadData,
  };
}

export const emptyEstudante = () => ({ curso:'',duracao:'',area:'',subarea:'',regime:'Presencial',nacionalidade:'Moçambicana',provincia:'',distrito:'',grau:'Licenciatura',homens:0,mulheres:0 });
export const emptyEstudanteVaga = () => ({ curso:'', duracao:'', area:'', subarea:'', regime:'Presencial', nacionalidade:'Moçambicana', provincia:'', distrito:'', grau:'Licenciatura', vagas_preenchidas:0, vagas_nao_preenchidas:0 });
export const emptyEstudanteCursoEstatistica = () => ({ curso:'', duracao:'', area:'', subarea:'', regime:'Presencial', provincia:'', distrito:'', grau:'Licenciatura', ingresso_h:0, ingresso_m:0, matriculado_h:0, matriculado_m:0, graduado_h:0, graduado_m:0 });
export const emptyEstudanteNacionalidade = () => ({ nacionalidade:'Moçambicana', ingresso_h:0, ingresso_m:0, matriculado_h:0, matriculado_m:0, graduado_h:0, graduado_m:0 });
export const emptyEstudanteEstrangeiro = () => ({ curso:'', area:'', subarea:'', regime:'Presencial', pais:'', grau:'Licenciatura', ingresso_h:0, ingresso_m:0, matriculado_h:0, matriculado_m:0, graduado_h:0, graduado_m:0 });
export const emptyEstudanteNecessidade = () => ({ curso:'', area:'', subarea:'', regime:'Presencial', provincia:'', distrito:'', grau:'Licenciatura', cadeirante_h:0, cadeirante_m:0, visual_h:0, visual_m:0, auditiva_h:0, auditiva_m:0, outros_h:0, outros_m:0 });
export const emptyEstudanteOutraNecessidade = () => ({ curso:'', area:'', subarea:'', regime:'Presencial', provincia:'', distrito:'', grau:'Licenciatura', tipo_necessidade:'', homens:0, mulheres:0 });
export const emptyEstudanteProvincia = () => ({ provincia:'', ingresso_h:0, ingresso_m:0, matriculado_h:0, matriculado_m:0, graduado_h:0, graduado_m:0 });
export const emptyEstudanteFaixaEtaria = () => ({ classe_idade:'', ingresso_h:0, ingresso_m:0, matriculado_h:0, matriculado_m:0, graduado_h:0, graduado_m:0 });
export const emptyEstudanteGraduadoMatricula = () => ({ curso:'', area:'', subarea:'', regime:'Presencial', provincia:'', distrito:'', grau:'Licenciatura', ano_primeira_matricula:'', antes_2016:0, ano_2016:0, ano_2017:0, ano_2018:0, ano_2019:0, ano_2020:0, ano_2021:0, ano_2022:0, ano_2023:0 });
export const emptyEstudanteCurtaDuracao = () => ({ curso:'', area:'', subarea:'', regime:'Presencial', provincia:'', distrito:'', duracao_meses:0, grau:'', matriculado_h:0, matriculado_m:0, graduado_h:0, graduado_m:0 });
export const emptyEstudanteDesistencia = () => ({ curso:'', area:'', subarea:'', regime:'Presencial', provincia:'', distrito:'', grau:'', causa:'', homens:0, mulheres:0 });
export const emptyEstudanteBolseiroCurso = () => ({ curso:'', area:'', subarea:'', regime:'Presencial', nacionalidade:'Moçambicana', provincia:'', distrito:'', pais:'', tipo_bolsa:'', financiador:'', grau:'', ingresso_h:0, ingresso_m:0, matriculado_h:0, matriculado_m:0, graduado_h:0, graduado_m:0 });
export const emptyEstudanteBolseiroFaixa = () => ({ classe_idade:'', ingresso_h:0, ingresso_m:0, matriculado_h:0, matriculado_m:0, graduado_h:0, graduado_m:0 });
export const emptyEstudanteBolseiroProvincia = () => ({ provincia:'', ingresso_h:0, ingresso_m:0, matriculado_h:0, matriculado_m:0, graduado_h:0, graduado_m:0 });
export const emptyDocente = (regime) => ({ regime,provincia:'',distrito:'',nacionalidade:'Moçambicana',lic_h:0,lic_m:0,mest_h:0,mest_m:0,dout_h:0,dout_m:0,pos_h:0,pos_m:0 });
export const emptyDegreeRow = (label) => ({ [label]:'', lic_h:0, lic_m:0, mest_h:0, mest_m:0, dout_h:0, dout_m:0, pos_h:0, pos_m:0 });
export const emptyAgeDocente = () => ({ classe_idade:'', moz_ti_h:0, moz_ti_m:0, moz_tp_h:0, moz_tp_m:0, estr_ti_h:0, estr_ti_m:0, estr_tp_h:0, estr_tp_m:0 });
export const emptyGrupoEtarioGrau = () => ({ classe_idade:'', lic_ti_h:0, lic_ti_m:0, lic_tp_h:0, lic_tp_m:0, mest_ti_h:0, mest_ti_m:0, mest_tp_h:0, mest_tp_m:0, dout_ti_h:0, dout_ti_m:0, dout_tp_h:0, dout_tp_m:0, pos_ti_h:0, pos_ti_m:0, pos_tp_h:0, pos_tp_m:0 });
export const emptyDocentesResultados = () => ({ grupoEtario: [emptyAgeDocente()], grupoEtarioGrau: [emptyGrupoEtarioGrau()], areaFormacao: [emptyDegreeRow('area_formacao')], cursoFormacao: [emptyDegreeRow('curso_formacao')], categoria: [{ regime:'tempo_inteiro', categoria:'', homens:0, mulheres:0 }], relacao: [{ relacao:'Pertence ao quadro', lic_h:0, lic_m:0, mest_h:0, mest_m:0, dout_h:0, dout_m:0 }, { relacao:'Não pertence ao quadro', lic_h:0, lic_m:0, mest_h:0, mest_m:0, dout_h:0, dout_m:0 }] });
export const emptyCta = () => ({ nivelFormacao: [{ regime:'tempo_inteiro', ensino_primario_h:0, ensino_primario_m:0, secundario_1_h:0, secundario_1_m:0, secundario_2_h:0, secundario_2_m:0, bacharel_h:0, bacharel_m:0, lic_h:0, lic_m:0, mest_h:0, mest_m:0, dout_h:0, dout_m:0 }], nacionalidade: [{ nacionalidade:'Moçambicana' }], relacao: [{ relacao:'' }], grupoEtario: [emptyAgeDocente()] });
export const emptyInvestigador = (regime) => ({ regime,nacionalidade:'Moçambicana',lic_h:0,lic_m:0,mest_h:0,mest_m:0,dout_h:0,dout_m:0,pos_h:0,pos_m:0 });
export const emptyFinancas = () => ({ oge:0,doacoes:0,creditos:0,proprias:0,func_ensino:0,func_investig:0,func_admin:0,sal_docentes:0,sal_tecnicos:0,sal_outros:0 });
export const emptyLab = () => ({ nome:'',area:'',subarea:'',provincia:'',distrito:'',num_labs:0 });
export const emptySala = () => ({ unidade:'',provincia:'',distrito:'',grau:'Licenciatura',num_salas:0 });
export const emptyBiblioteca = () => ({ unidade:'',provincia:'',distrito:'',num_fisicas:0,num_virtuais:0 });
export const emptyComputador = () => ({ unidade:'',provincia:'',distrito:'',num_computadores:0 });
export const emptyPrevisao = () => ({ curso:'',duracao:'',area:'',grau:'Licenciatura',provincia:'',homens:0,mulheres:0 });

// Cultura factories
export const emptyDesportoOrganizado = () => ({ nome_atividade:'',modalidade:'',data_local:'',objetivos:'',estudantes_h:0,estudantes_m:0,docentes_h:0,docentes_m:0 });
export const emptyDesportoParticipacao = () => ({ nome_atividade:'',entidade_org:'',data_local:'',objetivos:'',estudantes_h:0,estudantes_m:0,docentes_h:0,docentes_m:0,classificacao:'' });
export const emptyCulturaOrganizada = () => ({ nome_atividade:'',tipo_atividade:'',data_local:'',objetivos:'',estudantes_h:0,estudantes_m:0,docentes_h:0,docentes_m:0 });
export const emptyCulturaParticipacao = () => ({ nome_evento:'',entidade_org:'',data_local:'',objetivos:'',estudantes_h:0,estudantes_m:0,docentes_h:0,docentes_m:0,distincoes:'' });
export const emptyGrupo = () => ({ nome_grupo:'',expressao_artistica:'',objetivos:'',estudantes_h:0,estudantes_m:0,docentes_h:0,docentes_m:0,distincoes:'' });
export const emptyTunaAtleta = () => ({ nome_membro:'',cargo:'',ano_ingresso:'',objetivos:'',distincoes:'' });
export const emptyEstudanteAtividade = () => ({ nome_completo:'',num_estudante:'',curso:'',ano_frequencia:'',sexo:'',atividade:'',evento:'' });
