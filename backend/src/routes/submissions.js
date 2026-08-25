const express = require('express');
const db = require('../models/db');
const Joi = require('joi');
const { authenticate, requireChefe, requireDirector } = require('../middleware/auth');
const { sendSubmissionConfirmation, sendAdminNewSubmission } = require('../utils/email');
const audit = require('../utils/audit');

const router = express.Router();
router.use(authenticate, requireChefe);

const YEAR = () => new Date().getFullYear();

async function getOrCreateSubmission(userId, campusId, universityId) {
  const yr = YEAR();
  // Always ensure university_id is set — look it up if missing
  let univId = universityId;
  if (!univId && campusId) {
    const r = await db.query('SELECT university_id FROM campuses WHERE id=$1', [campusId]);
    univId = r.rows[0]?.university_id || null;
  }
  const existing = await db.query(
    'SELECT * FROM submissions WHERE user_id=$1 AND year=$2', [userId, yr]);
  if (existing.rows.length) {
    // Update university_id if it was null
    if (!existing.rows[0].university_id && univId) {
      await db.query('UPDATE submissions SET university_id=$1, campus_id=$2 WHERE id=$3',
        [univId, campusId, existing.rows[0].id]);
    }
    return { ...existing.rows[0], university_id: existing.rows[0].university_id || univId };
  }
  const created = await db.query(
    `INSERT INTO submissions (user_id,campus_id,university_id,year)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [userId, campusId||null, univId||null, yr]);
  return created.rows[0];
}

// GET /api/submissions/current
router.get('/current', async (req, res, next) => {
  try {
    const sub = await getOrCreateSubmission(req.user.id, req.user.campus_id, req.user.university_id);

    // Fetch university-level ID IES (not per-submission)
    let univIdIes = null;
    if (sub.university_id) {
      const r = await db.query('SELECT * FROM university_id_ies WHERE university_id=$1', [sub.university_id]);
      univIdIes = r.rows[0] || null;
    }

    const [estudantes, estudantesVagas, estudantesCursoEstatistica, estudantesNacionalidadeEstatistica, estudantesEstrangeiros, estudantesNecessidades, estudantesOutrasNecessidades, estudantesProvinciaConclusao, estudantesProvinciaNaturalidade, estudantesFaixaEtaria, estudantesGraduadosMatricula, estudantesCurtaDuracao, estudantesDesistencias, estudantesBolseirosCurso, estudantesBolseirosFaixa, estudantesBolseirosProvincia, docentes, docentesGrupoEtario, docentesGrupoEtarioGrau, docentesAreaFormacao, docentesCursoFormacao, docentesCategoria, docentesRelacao, ctaNivelFormacao, ctaNacionalidade, ctaRelacao, ctaGrupoEtario, investigadores, financas, labs, salas, bib, comp, previsao, desportoOrg, desportoPartic, culturaOrg, culturaPartic, grupos, tuna, estudantesAct, invGrupoEtario, invAreaFormacao, invConf, invProd, invPubsPares, invPubsDoc, invPubsTipo, invOrient, invPesq, invExt, invExtNivel, locks] =
      await Promise.all([
        db.query('SELECT * FROM estudantes WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM estudantes_vagas WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM estudantes_curso_estatistica WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM estudantes_nacionalidade_estatistica WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM estudantes_estrangeiros WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM estudantes_necessidades_especiais WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM estudantes_outras_necessidades WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM estudantes_provincia_conclusao WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM estudantes_provincia_naturalidade WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM estudantes_faixa_etaria WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM estudantes_graduados_matricula WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM estudantes_cursos_curta_duracao WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM estudantes_desistencias WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM estudantes_bolseiros_curso WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM estudantes_bolseiros_faixa_etaria WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM estudantes_bolseiros_provincia WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM docentes WHERE submission_id=$1 ORDER BY regime,sort_order', [sub.id]),
        db.query('SELECT * FROM docentes_grupo_etario WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM docentes_grupo_etario_grau WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM docentes_area_formacao WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM docentes_curso_formacao WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM docentes_categoria WHERE submission_id=$1 ORDER BY regime,sort_order', [sub.id]),
        db.query('SELECT * FROM docentes_relacao WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM cta_nivel_formacao WHERE submission_id=$1 ORDER BY regime,sort_order', [sub.id]),
        db.query('SELECT * FROM cta_nacionalidade WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM cta_relacao WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM cta_grupo_etario WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM investigadores WHERE submission_id=$1 ORDER BY regime,sort_order', [sub.id]),
        db.query('SELECT * FROM financas WHERE submission_id=$1', [sub.id]),
        db.query('SELECT * FROM infra_labs WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM infra_salas WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM infra_bibliotecas WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM infra_computadores WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM previsao WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM desporto_organizado WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM desporto_participacao WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM cultura_organizada WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM cultura_participacao WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM grupos_culturais WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM tuna_academica WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM estudantes_atividades WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM investigadores_grupo_etario WHERE submission_id=$1 ORDER BY regime,sort_order', [sub.id]),
        db.query('SELECT * FROM investigadores_area_formacao WHERE submission_id=$1 ORDER BY regime,sort_order', [sub.id]),
        db.query('SELECT * FROM investigadores_conferencias WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM investigadores_producao WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM investigadores_pubs_pares WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM investigadores_pubs_por_docente WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM investigadores_pubs_tipo WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM investigadores_orientacoes WHERE submission_id=$1 ORDER BY tipo,sort_order', [sub.id]),
        db.query('SELECT * FROM investigadores_pesquisas WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM investigadores_extensao WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM investigadores_extensao_nivel WHERE submission_id=$1 ORDER BY sort_order', [sub.id]),
        db.query('SELECT * FROM section_locks WHERE submission_id=$1', [sub.id]),
      ]);

    res.json({
      submission: sub,
      idies: univIdIes,          // university-level, read-only for chefes
      estudantes: estudantes.rows,
      estudantesVagas: estudantesVagas.rows,
      estudantesResultados: {
        cursoEstatistica: estudantesCursoEstatistica.rows,
        nacionalidadeEstatistica: estudantesNacionalidadeEstatistica.rows,
        estrangeiros: estudantesEstrangeiros.rows,
        necessidadesEspeciais: estudantesNecessidades.rows,
        outrasNecessidades: estudantesOutrasNecessidades.rows,
        provinciaConclusao: estudantesProvinciaConclusao.rows,
        provinciaNaturalidade: estudantesProvinciaNaturalidade.rows,
        faixaEtaria: estudantesFaixaEtaria.rows,
        graduadosMatricula: estudantesGraduadosMatricula.rows,
        curtaDuracao: estudantesCurtaDuracao.rows,
        desistencias: estudantesDesistencias.rows,
        bolseirosCurso: estudantesBolseirosCurso.rows,
        bolseirosFaixa: estudantesBolseirosFaixa.rows,
        bolseirosProvincia: estudantesBolseirosProvincia.rows,
      },
      docentes: docentes.rows,
      docentesResultados: {
        grupoEtario: docentesGrupoEtario.rows,
        grupoEtarioGrau: docentesGrupoEtarioGrau.rows,
        areaFormacao: docentesAreaFormacao.rows,
        cursoFormacao: docentesCursoFormacao.rows,
        categoria: docentesCategoria.rows,
        relacao: docentesRelacao.rows,
      },
      cta: {
        nivelFormacao: ctaNivelFormacao.rows,
        nacionalidade: ctaNacionalidade.rows,
        relacao: ctaRelacao.rows,
        grupoEtario: ctaGrupoEtario.rows,
      },
      investigadores: investigadores.rows,
      investigadoresGrupoEtario: invGrupoEtario.rows,
      investigadoresAreaFormacao: invAreaFormacao.rows,
      investigadoresResultados: {
        conferencias: invConf.rows,
        producao: invProd.rows,
        pubsPares: invPubsPares.rows,
        pubsPorDocente: invPubsDoc.rows,
        pubsTipo: invPubsTipo.rows,
        orientacoes: invOrient.rows,
        pesquisas: invPesq.rows,
        extensao: invExt.rows,
        extensaoNivel: invExtNivel.rows,
      },
      financas: financas.rows[0] || null,
      infra: { labs: labs.rows, salas: salas.rows, bibliotecas: bib.rows, computadores: comp.rows },
      previsao: previsao.rows,
      cultura: {
        desportoOrganizado: desportoOrg.rows,
        desportoParticipacao: desportoPartic.rows,
        culturaOrganizada: culturaOrg.rows,
        culturaParticipacao: culturaPartic.rows,
        grupos: grupos.rows,
        tuna: tuna.rows,
        estudantesAtividades: estudantesAct.rows,
      },
      locks: locks.rows,         // section locks for progress %
    });
  } catch (err) { next(err); }
});

// Helper to check section is not locked (chefe cannot edit locked sections)
async function checkNotLocked(submissionId, section, userRole) {
  if (userRole === 'director_gpl' || userRole === 'superadmin') return; // directors can always edit
  const r = await db.query(
    'SELECT id FROM section_locks WHERE submission_id=$1 AND section=$2', [submissionId, section]);
  if (r.rows.length) throw Object.assign(new Error('Secção bloqueada. Solicite desbloqueio ao Director GPL.'), { status: 423 });
}

// PUT /api/submissions/idies — director_gpl only (university level)
router.put('/idies', requireDirector, async (req, res, next) => {
  try {
    const univId = req.user.university_id;
    if (!univId) return res.status(400).json({ error: 'Sem universidade atribuída' });
    const d = req.body;
    await db.query(`
      INSERT INTO university_id_ies
        (university_id,nome,sigla,nuit,ano_inicio,provincia,distrito,website,contacto,email,responsavel,funcao,email_resp,updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
      ON CONFLICT (university_id) DO UPDATE SET
        nome=$2,sigla=$3,nuit=$4,ano_inicio=$5,provincia=$6,distrito=$7,
        website=$8,contacto=$9,email=$10,responsavel=$11,funcao=$12,email_resp=$13,updated_at=NOW()`,
      [univId,d.nome,d.sigla,d.nuit,d.ano_inicio,d.provincia,d.distrito,
       d.website,d.contacto,d.email,d.responsavel,d.funcao,d.email_resp]);
    audit.log({ userId:req.user.id, userEmail:req.user.email, userRole:req.user.role,
      action:'save_section', entityType:'university', entityId:univId, section:'idies', ip:audit.getIp(req) });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

async function saveRows(subId, table, fields, rows, valuesFn) {
  await db.query(`DELETE FROM ${table} WHERE submission_id=$1`, [subId]);
  for (let i = 0; i < rows.length; i++) {
    const vals = valuesFn(rows[i], i);
    const placeholders = vals.map((_, j) => `$${j + 1}`).join(',');
    await db.query(`INSERT INTO ${table} (${fields}) VALUES (${placeholders})`, vals);
  }
}

// PUT /api/submissions/estudantes
router.put('/estudantes', async (req, res, next) => {
  try {
    const sub = await getOrCreateSubmission(req.user.id, req.user.campus_id, req.user.university_id);
    await checkNotLocked(sub.id, 'estudantes', req.user.role);
    const rows = Array.isArray(req.body) ? req.body : [];
    await saveRows(sub.id, 'estudantes',
      'submission_id,curso,duracao,area,subarea,regime,nacionalidade,provincia,distrito,grau,homens,mulheres,sort_order',
      rows, (r,i) => [sub.id,r.curso,r.duracao||null,r.area,r.subarea,r.regime,r.nacionalidade||null,r.provincia,r.distrito||null,r.grau,r.homens||0,r.mulheres||0,i]);
    audit.log({ userId:req.user.id, userEmail:req.user.email, userRole:req.user.role,
      action:'save_section', entityType:'submission', entityId:sub.id, section:'estudantes',
      detail:{ rows_count:rows.length }, ip:audit.getIp(req) });
    res.json({ ok:true });
  } catch (err) { next(err); }
});

router.put('/estudantes/resultados', async (req, res, next) => {
  try {
    const sub = await getOrCreateSubmission(req.user.id, req.user.campus_id, req.user.university_id);
    await checkNotLocked(sub.id, 'estudantes', req.user.role);
    const d = req.body || {};
    if (Array.isArray(d.vagas)) await saveRows(sub.id, 'estudantes_vagas',
      'submission_id,curso,duracao,area,subarea,regime,nacionalidade,provincia,distrito,grau,vagas_preenchidas,vagas_nao_preenchidas,sort_order',
      d.vagas || [], (r, i) => [sub.id, r.curso, r.duracao || null, r.area, r.subarea, r.regime, r.nacionalidade || null,
        r.provincia, r.distrito || null, r.grau, r.vagas_preenchidas || 0, r.vagas_nao_preenchidas || 0, i]);
    if (Array.isArray(d.cursoEstatistica)) await saveRows(sub.id, 'estudantes_curso_estatistica',
      'submission_id,curso,duracao,area,subarea,regime,provincia,distrito,grau,ingresso_h,ingresso_m,matriculado_h,matriculado_m,graduado_h,graduado_m,sort_order',
      d.cursoEstatistica || [], (r, i) => [sub.id, r.curso, r.duracao || null, r.area, r.subarea, r.regime, r.provincia, r.distrito || null, r.grau,
        r.ingresso_h || 0, r.ingresso_m || 0, r.matriculado_h || 0, r.matriculado_m || 0, r.graduado_h || 0, r.graduado_m || 0, i]);
    if (Array.isArray(d.nacionalidadeEstatistica)) await saveRows(sub.id, 'estudantes_nacionalidade_estatistica',
      'submission_id,nacionalidade,ingresso_h,ingresso_m,matriculado_h,matriculado_m,graduado_h,graduado_m,sort_order',
      d.nacionalidadeEstatistica || [], (r, i) => [sub.id, r.nacionalidade || '', r.ingresso_h || 0, r.ingresso_m || 0, r.matriculado_h || 0, r.matriculado_m || 0, r.graduado_h || 0, r.graduado_m || 0, i]);
    if (Array.isArray(d.estrangeiros)) await saveRows(sub.id, 'estudantes_estrangeiros',
      'submission_id,curso,area,subarea,regime,pais,grau,ingresso_h,ingresso_m,matriculado_h,matriculado_m,graduado_h,graduado_m,sort_order',
      d.estrangeiros || [], (r, i) => [sub.id, r.curso, r.area, r.subarea, r.regime, r.pais, r.grau,
        r.ingresso_h || 0, r.ingresso_m || 0, r.matriculado_h || 0, r.matriculado_m || 0, r.graduado_h || 0, r.graduado_m || 0, i]);
    if (Array.isArray(d.necessidadesEspeciais)) await saveRows(sub.id, 'estudantes_necessidades_especiais',
      'submission_id,curso,area,subarea,regime,provincia,distrito,grau,cadeirante_h,cadeirante_m,visual_h,visual_m,auditiva_h,auditiva_m,outros_h,outros_m,sort_order',
      d.necessidadesEspeciais || [], (r, i) => [sub.id, r.curso, r.area, r.subarea, r.regime, r.provincia, r.distrito, r.grau,
        r.cadeirante_h || 0, r.cadeirante_m || 0, r.visual_h || 0, r.visual_m || 0, r.auditiva_h || 0, r.auditiva_m || 0, r.outros_h || 0, r.outros_m || 0, i]);
    if (Array.isArray(d.outrasNecessidades)) await saveRows(sub.id, 'estudantes_outras_necessidades',
      'submission_id,curso,area,subarea,regime,provincia,distrito,grau,tipo_necessidade,homens,mulheres,sort_order',
      d.outrasNecessidades, (r, i) => [sub.id, r.curso, r.area, r.subarea, r.regime, r.provincia, r.distrito, r.grau, r.tipo_necessidade, r.homens || 0, r.mulheres || 0, i]);
    const saveSimpleStats = async (table, fields, rows, values) => {
      if (Array.isArray(rows)) await saveRows(sub.id, table, fields, rows, values);
    };
    await saveSimpleStats('estudantes_provincia_conclusao', 'submission_id,provincia,ingresso_h,ingresso_m,matriculado_h,matriculado_m,graduado_h,graduado_m,sort_order', d.provinciaConclusao, (r,i) => [sub.id,r.provincia||'',r.ingresso_h||0,r.ingresso_m||0,r.matriculado_h||0,r.matriculado_m||0,r.graduado_h||0,r.graduado_m||0,i]);
    await saveSimpleStats('estudantes_provincia_naturalidade', 'submission_id,provincia,ingresso_h,ingresso_m,matriculado_h,matriculado_m,graduado_h,graduado_m,sort_order', d.provinciaNaturalidade, (r,i) => [sub.id,r.provincia||'',r.ingresso_h||0,r.ingresso_m||0,r.matriculado_h||0,r.matriculado_m||0,r.graduado_h||0,r.graduado_m||0,i]);
    await saveSimpleStats('estudantes_faixa_etaria', 'submission_id,classe_idade,ingresso_h,ingresso_m,matriculado_h,matriculado_m,graduado_h,graduado_m,sort_order', d.faixaEtaria, (r,i) => [sub.id,r.classe_idade||'',r.ingresso_h||0,r.ingresso_m||0,r.matriculado_h||0,r.matriculado_m||0,r.graduado_h||0,r.graduado_m||0,i]);
    await saveSimpleStats('estudantes_graduados_matricula', 'submission_id,curso,area,subarea,regime,provincia,distrito,grau,ano_primeira_matricula,antes_2016,ano_2016,ano_2017,ano_2018,ano_2019,ano_2020,ano_2021,ano_2022,ano_2023,sort_order', d.graduadosMatricula, (r,i) => [sub.id,r.curso,r.area,r.subarea,r.regime,r.provincia,r.distrito,r.grau,r.ano_primeira_matricula,r.antes_2016||0,r.ano_2016||0,r.ano_2017||0,r.ano_2018||0,r.ano_2019||0,r.ano_2020||0,r.ano_2021||0,r.ano_2022||0,r.ano_2023||0,i]);
    await saveSimpleStats('estudantes_cursos_curta_duracao', 'submission_id,curso,area,subarea,regime,provincia,distrito,duracao_meses,grau,matriculado_h,matriculado_m,graduado_h,graduado_m,sort_order', d.curtaDuracao, (r,i) => [sub.id,r.curso,r.area,r.subarea,r.regime,r.provincia,r.distrito,r.duracao_meses||null,r.grau,r.matriculado_h||0,r.matriculado_m||0,r.graduado_h||0,r.graduado_m||0,i]);
    await saveSimpleStats('estudantes_desistencias', 'submission_id,curso,area,subarea,regime,provincia,distrito,grau,causa,homens,mulheres,sort_order', d.desistencias, (r,i) => [sub.id,r.curso,r.area,r.subarea,r.regime,r.provincia,r.distrito,r.grau,r.causa,r.homens||0,r.mulheres||0,i]);
    await saveSimpleStats('estudantes_bolseiros_curso', 'submission_id,curso,area,subarea,regime,nacionalidade,provincia,distrito,pais,tipo_bolsa,financiador,grau,ingresso_h,ingresso_m,matriculado_h,matriculado_m,graduado_h,graduado_m,sort_order', d.bolseirosCurso, (r,i) => [sub.id,r.curso,r.area,r.subarea,r.regime,r.nacionalidade,r.provincia,r.distrito,r.pais,r.tipo_bolsa,r.financiador,r.grau,r.ingresso_h||0,r.ingresso_m||0,r.matriculado_h||0,r.matriculado_m||0,r.graduado_h||0,r.graduado_m||0,i]);
    await saveSimpleStats('estudantes_bolseiros_faixa_etaria', 'submission_id,classe_idade,ingresso_h,ingresso_m,matriculado_h,matriculado_m,graduado_h,graduado_m,sort_order', d.bolseirosFaixa, (r,i) => [sub.id,r.classe_idade||'',r.ingresso_h||0,r.ingresso_m||0,r.matriculado_h||0,r.matriculado_m||0,r.graduado_h||0,r.graduado_m||0,i]);
    await saveSimpleStats('estudantes_bolseiros_provincia', 'submission_id,provincia,ingresso_h,ingresso_m,matriculado_h,matriculado_m,graduado_h,graduado_m,sort_order', d.bolseirosProvincia, (r,i) => [sub.id,r.provincia||'',r.ingresso_h||0,r.ingresso_m||0,r.matriculado_h||0,r.matriculado_m||0,r.graduado_h||0,r.graduado_m||0,i]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// PUT /api/submissions/docentes
router.put('/docentes', async (req, res, next) => {
  try {
    const sub = await getOrCreateSubmission(req.user.id, req.user.campus_id, req.user.university_id);
    await checkNotLocked(sub.id, 'docentes', req.user.role);
    const rows = Array.isArray(req.body) ? req.body : [];
    await saveRows(sub.id, 'docentes',
      'submission_id,regime,provincia,distrito,nacionalidade,lic_h,lic_m,mest_h,mest_m,dout_h,dout_m,pos_h,pos_m,sort_order',
      rows, (r,i) => [sub.id,r.regime,r.provincia,r.distrito,r.nacionalidade,r.lic_h||0,r.lic_m||0,r.mest_h||0,r.mest_m||0,r.dout_h||0,r.dout_m||0,r.pos_h||0,r.pos_m||0,i]);
    res.json({ ok:true });
  } catch (err) { next(err); }
});

// PUT /api/submissions/docentes/resultados — quadros A2-A7 e B1-B4
router.put('/docentes/resultados', async (req, res, next) => {
  try {
    const sub = await getOrCreateSubmission(req.user.id, req.user.campus_id, req.user.university_id);
    await checkNotLocked(sub.id, 'docentes', req.user.role);
    const d = req.body || {};
    const degreeFields = 'submission_id,area_formacao,lic_h,lic_m,mest_h,mest_m,dout_h,dout_m,pos_h,pos_m,sort_order';
    const courseFields = degreeFields.replace('area_formacao', 'curso_formacao');
    const relDegreeFields = degreeFields.replace('area_formacao', 'relacao');
    const ctaDegree = 'submission_id,nacionalidade,ensino_primario_h,ensino_primario_m,secundario_1_h,secundario_1_m,secundario_2_h,secundario_2_m,bacharel_h,bacharel_m,lic_h,lic_m,mest_h,mest_m,dout_h,dout_m,sort_order';
    const ctaRelDegree = ctaDegree.replace('nacionalidade', 'relacao');
    const ctaNivel = ctaDegree.replace('nacionalidade,', 'regime,').replace(/,sort_order$/, ',sort_order');
    const degreeValues = (r, i, label) => [sub.id, r[label], r.lic_h||0, r.lic_m||0, r.mest_h||0, r.mest_m||0, r.dout_h||0, r.dout_m||0, r.pos_h||0, r.pos_m||0, i];
    await saveRows(sub.id, 'docentes_grupo_etario',
      'submission_id,classe_idade,moz_ti_h,moz_ti_m,moz_tp_h,moz_tp_m,estr_ti_h,estr_ti_m,estr_tp_h,estr_tp_m,sort_order',
      d.grupoEtario || [], (r,i) => [sub.id,r.classe_idade||'',r.moz_ti_h||0,r.moz_ti_m||0,r.moz_tp_h||0,r.moz_tp_m||0,r.estr_ti_h||0,r.estr_ti_m||0,r.estr_tp_h||0,r.estr_tp_m||0,i]);
    await saveRows(sub.id, 'docentes_grupo_etario_grau',
      'submission_id,classe_idade,lic_ti_h,lic_ti_m,lic_tp_h,lic_tp_m,mest_ti_h,mest_ti_m,mest_tp_h,mest_tp_m,dout_ti_h,dout_ti_m,dout_tp_h,dout_tp_m,pos_ti_h,pos_ti_m,pos_tp_h,pos_tp_m,sort_order',
      d.grupoEtarioGrau || [], (r,i) => [sub.id,r.classe_idade||'',r.lic_ti_h||0,r.lic_ti_m||0,r.lic_tp_h||0,r.lic_tp_m||0,r.mest_ti_h||0,r.mest_ti_m||0,r.mest_tp_h||0,r.mest_tp_m||0,r.dout_ti_h||0,r.dout_ti_m||0,r.dout_tp_h||0,r.dout_tp_m||0,r.pos_ti_h||0,r.pos_ti_m||0,r.pos_tp_h||0,r.pos_tp_m||0,i]);
    await saveRows(sub.id, 'docentes_area_formacao', degreeFields, d.areaFormacao || [], (r,i) => degreeValues(r,i,'area_formacao'));
    await saveRows(sub.id, 'docentes_curso_formacao', courseFields, d.cursoFormacao || [], (r,i) => degreeValues(r,i,'curso_formacao'));
    await saveRows(sub.id, 'docentes_categoria',
      'submission_id,regime,categoria,homens,mulheres,sort_order',
      d.categoria || [], (r,i) => [sub.id,r.regime||'tempo_inteiro',r.categoria||'',r.homens||0,r.mulheres||0,i]);
    await saveRows(sub.id, 'docentes_relacao', relDegreeFields, d.relacao || [], (r,i) => degreeValues(r,i,'relacao'));
    const ctaValues = (r,i,label) => [sub.id,r[label],r.ensino_primario_h||0,r.ensino_primario_m||0,r.secundario_1_h||0,r.secundario_1_m||0,r.secundario_2_h||0,r.secundario_2_m||0,r.bacharel_h||0,r.bacharel_m||0,r.lic_h||0,r.lic_m||0,r.mest_h||0,r.mest_m||0,r.dout_h||0,r.dout_m||0,i];
    await saveRows(sub.id, 'cta_nivel_formacao', ctaNivel, d.ctaNivelFormacao || [], (r,i) => [sub.id,r.regime||'tempo_inteiro',r.ensino_primario_h||0,r.ensino_primario_m||0,r.secundario_1_h||0,r.secundario_1_m||0,r.secundario_2_h||0,r.secundario_2_m||0,r.bacharel_h||0,r.bacharel_m||0,r.lic_h||0,r.lic_m||0,r.mest_h||0,r.mest_m||0,r.dout_h||0,r.dout_m||0,i]);
    await saveRows(sub.id, 'cta_nacionalidade', ctaDegree, d.ctaNacionalidade || [], (r,i) => ctaValues(r,i,'nacionalidade'));
    await saveRows(sub.id, 'cta_relacao', ctaRelDegree, d.ctaRelacao || [], (r,i) => ctaValues(r,i,'relacao'));
    await saveRows(sub.id, 'cta_grupo_etario',
      'submission_id,classe_idade,moz_ti_h,moz_ti_m,moz_tp_h,moz_tp_m,estr_ti_h,estr_ti_m,estr_tp_h,estr_tp_m,sort_order',
      d.ctaGrupoEtario || [], (r,i) => [sub.id,r.classe_idade||'',r.moz_ti_h||0,r.moz_ti_m||0,r.moz_tp_h||0,r.moz_tp_m||0,r.estr_ti_h||0,r.estr_ti_m||0,r.estr_tp_h||0,r.estr_tp_m||0,i]);
    res.json({ ok:true });
  } catch (err) { next(err); }
});

// PUT /api/submissions/investigadores
router.put('/investigadores', async (req, res, next) => {
  try {
    const sub = await getOrCreateSubmission(req.user.id, req.user.campus_id, req.user.university_id);
    await checkNotLocked(sub.id, 'investigadores', req.user.role);
    const rows = Array.isArray(req.body) ? req.body : [];
    await saveRows(sub.id, 'investigadores',
      'submission_id,regime,nacionalidade,lic_h,lic_m,mest_h,mest_m,dout_h,dout_m,pos_h,pos_m,sort_order',
      rows, (r,i) => [sub.id,r.regime,r.nacionalidade,r.lic_h||0,r.lic_m||0,r.mest_h||0,r.mest_m||0,r.dout_h||0,r.dout_m||0,r.pos_h||0,r.pos_m||0,i]);
    res.json({ ok:true });
  } catch (err) { next(err); }
});

// PUT /api/submissions/investigadores/grupo-etario — C.2 age groups
router.put('/investigadores/grupo-etario', async (req, res, next) => {
  try {
    const sub = await getOrCreateSubmission(req.user.id, req.user.campus_id, req.user.university_id);
    await checkNotLocked(sub.id, 'investigadores', req.user.role);
    const rows = Array.isArray(req.body) ? req.body : [];
    await saveRows(sub.id, 'investigadores_grupo_etario',
      'submission_id,regime,classe_idade,moz_h,moz_m,estr_h,estr_m,sort_order',
      rows, (r, i) => [sub.id, r.regime, r.classe_idade, r.moz_h||0, r.moz_m||0, r.estr_h||0, r.estr_m||0, i]);
    res.json({ ok:true });
  } catch (err) { next(err); }
});

// PUT /api/submissions/investigadores/area-formacao — C.3
router.put('/investigadores/area-formacao', async (req, res, next) => {
  try {
    const sub = await getOrCreateSubmission(req.user.id, req.user.campus_id, req.user.university_id);
    await checkNotLocked(sub.id, 'investigadores', req.user.role);
    const rows = Array.isArray(req.body) ? req.body : [];
    await saveRows(sub.id, 'investigadores_area_formacao',
      'submission_id,regime,area_formacao,moz_h,moz_m,estr_h,estr_m,sort_order',
      rows, (r, i) => [sub.id, r.regime, r.area_formacao, r.moz_h||0, r.moz_m||0, r.estr_h||0, r.estr_m||0, i]);
    res.json({ ok:true });
  } catch (err) { next(err); }
});

// PUT /api/submissions/investigadores/resultados — C.4 + C.5 + C.6
router.put('/investigadores/resultados', async (req, res, next) => {
  try {
    const sub = await getOrCreateSubmission(req.user.id, req.user.campus_id, req.user.university_id);
    await checkNotLocked(sub.id, 'investigadores', req.user.role);
    const d = req.body || {};

    await saveRows(sub.id, 'investigadores_conferencias',
      'submission_id,tipo_conferencia,lic_h,lic_m,mest_h,mest_m,dout_h,dout_m,pos_h,pos_m,sort_order',
      d.conferencias || [],
      (r, i) => [sub.id, r.tipo_conferencia, r.lic_h||0, r.lic_m||0, r.mest_h||0, r.mest_m||0, r.dout_h||0, r.dout_m||0, r.pos_h||0, r.pos_m||0, i]);

    await saveRows(sub.id, 'investigadores_producao',
      'submission_id,area_formacao,artigos_h,artigos_m,livros_h,livros_m,capitulos_h,capitulos_m,conf_nac_h,conf_nac_m,conf_int_h,conf_int_m,sort_order',
      d.producao || [],
      (r, i) => [sub.id, r.area_formacao, r.artigos_h||0, r.artigos_m||0, r.livros_h||0, r.livros_m||0, r.capitulos_h||0, r.capitulos_m||0, r.conf_nac_h||0, r.conf_nac_m||0, r.conf_int_h||0, r.conf_int_m||0, i]);

    await saveRows(sub.id, 'investigadores_pubs_pares',
      'submission_id,provincia,lic_h,lic_m,mest_h,mest_m,dout_h,dout_m,pos_h,pos_m,sort_order',
      d.pubsPares || [],
      (r, i) => [sub.id, r.provincia||null, r.lic_h||0, r.lic_m||0, r.mest_h||0, r.mest_m||0, r.dout_h||0, r.dout_m||0, r.pos_h||0, r.pos_m||0, i]);

    await saveRows(sub.id, 'investigadores_pubs_por_docente',
      'submission_id,num_publicacoes,lic_h,lic_m,mest_h,mest_m,dout_h,dout_m,sort_order',
      d.pubsPorDocente || [],
      (r, i) => [sub.id, String(r.num_publicacoes), r.lic_h||0, r.lic_m||0, r.mest_h||0, r.mest_m||0, r.dout_h||0, r.dout_m||0, i]);

    await saveRows(sub.id, 'investigadores_pubs_tipo',
      'submission_id,tipo_publicacao,lic_h,lic_m,mest_h,mest_m,dout_h,dout_m,sort_order',
      d.pubsTipo || [],
      (r, i) => [sub.id, r.tipo_publicacao, r.lic_h||0, r.lic_m||0, r.mest_h||0, r.mest_m||0, r.dout_h||0, r.dout_m||0, i]);

    await saveRows(sub.id, 'investigadores_orientacoes',
      'submission_id,tipo,num_orientacoes,lic_h,lic_m,mest_h,mest_m,dout_h,dout_m,sort_order',
      d.orientacoes || [],
      (r, i) => [sub.id, r.tipo, String(r.num_orientacoes), r.lic_h||0, r.lic_m||0, r.mest_h||0, r.mest_m||0, r.dout_h||0, r.dout_m||0, i]);

    await saveRows(sub.id, 'investigadores_pesquisas',
      'submission_id,em_curso,concluidas,sort_order',
      d.pesquisas || [],
      (r, i) => [sub.id, r.em_curso||0, r.concluidas||0, i]);

    await saveRows(sub.id, 'investigadores_extensao',
      'submission_id,accao,quantidade,sort_order',
      d.extensao || [],
      (r, i) => [sub.id, r.accao, r.quantidade||0, i]);

    await saveRows(sub.id, 'investigadores_extensao_nivel',
      'submission_id,nivel,quantidade,sort_order',
      d.extensaoNivel || [],
      (r, i) => [sub.id, r.nivel||null, r.quantidade||0, i]);

    res.json({ ok:true });
  } catch (err) { next(err); }
});

// PUT /api/submissions/financas
router.put('/financas', async (req, res, next) => {
  try {
    const sub = await getOrCreateSubmission(req.user.id, req.user.campus_id, req.user.university_id);
    await checkNotLocked(sub.id, 'financas', req.user.role);
    const d = req.body;
    await db.query(`
      INSERT INTO financas (submission_id,oge,doacoes,creditos,proprias,func_ensino,func_investig,func_admin,sal_docentes,sal_tecnicos,sal_outros,desp_invest,desp_deprec,desp_invest_outros,desp_reembolso)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      ON CONFLICT (submission_id) DO UPDATE SET
        oge=$2,doacoes=$3,creditos=$4,proprias=$5,func_ensino=$6,func_investig=$7,
        func_admin=$8,sal_docentes=$9,sal_tecnicos=$10,sal_outros=$11,desp_invest=$12,
        desp_deprec=$13,desp_invest_outros=$14,desp_reembolso=$15`,
      [sub.id,d.oge||0,d.doacoes||0,d.creditos||0,d.proprias||0,
       d.func_ensino||0,d.func_investig||0,d.func_admin||0,d.sal_docentes||0,d.sal_tecnicos||0,d.sal_outros||0,
       d.desp_invest||0,d.desp_deprec||0,d.desp_invest_outros||0,d.desp_reembolso||0]);
    audit.log({ userId:req.user.id, userEmail:req.user.email, userRole:req.user.role,
      action:'save_section', entityType:'submission', entityId:sub.id, section:'financas',
      detail:{ oge:d.oge, doacoes:d.doacoes, creditos:d.creditos, proprias:d.proprias }, ip:audit.getIp(req) });
    res.json({ ok:true });
  } catch (err) { next(err); }
});

// PUT /api/submissions/infra
router.put('/infra', async (req, res, next) => {
  try {
    const sub = await getOrCreateSubmission(req.user.id, req.user.campus_id, req.user.university_id);
    await checkNotLocked(sub.id, 'infra', req.user.role);
    const { labs, salas, bibliotecas, computadores } = req.body;
    await db.query('DELETE FROM infra_labs WHERE submission_id=$1', [sub.id]);
    await db.query('DELETE FROM infra_salas WHERE submission_id=$1', [sub.id]);
    await db.query('DELETE FROM infra_bibliotecas WHERE submission_id=$1', [sub.id]);
    await db.query('DELETE FROM infra_computadores WHERE submission_id=$1', [sub.id]);
    for (let i=0; i<(labs||[]).length; i++) {
      const r=labs[i];
      await db.query('INSERT INTO infra_labs (submission_id,nome,area,subarea,provincia,distrito,num_labs,sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [sub.id,r.nome,r.area,r.subarea,r.provincia,r.distrito,r.num_labs||0,i]);
    }
    for (let i=0; i<(salas||[]).length; i++) {
      const r=salas[i];
      await db.query('INSERT INTO infra_salas (submission_id,unidade,provincia,distrito,grau,num_salas,sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [sub.id,r.unidade,r.provincia,r.distrito,r.grau,r.num_salas||0,i]);
    }
    for (let i=0; i<(bibliotecas||[]).length; i++) {
      const r=bibliotecas[i];
      await db.query('INSERT INTO infra_bibliotecas (submission_id,unidade,provincia,distrito,num_fisicas,num_virtuais,sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [sub.id,r.unidade,r.provincia,r.distrito,r.num_fisicas||0,r.num_virtuais||0,i]);
    }
    for (let i=0; i<(computadores||[]).length; i++) {
      const r=computadores[i];
      await db.query('INSERT INTO infra_computadores (submission_id,unidade,provincia,distrito,num_computadores,sort_order) VALUES ($1,$2,$3,$4,$5,$6)',
        [sub.id,r.unidade,r.provincia,r.distrito,r.num_computadores||0,i]);
    }
    res.json({ ok:true });
  } catch (err) { next(err); }
});

// PUT /api/submissions/previsao
router.put('/previsao', async (req, res, next) => {
  try {
    const sub = await getOrCreateSubmission(req.user.id, req.user.campus_id, req.user.university_id);
    await checkNotLocked(sub.id, 'previsao', req.user.role);
    const rows = Array.isArray(req.body) ? req.body : [];
    await saveRows(sub.id, 'previsao',
      'submission_id,curso,duracao,area,grau,provincia,homens,mulheres,sort_order',
      rows, (r,i) => [sub.id,r.curso,r.duracao||null,r.area,r.grau,r.provincia,r.homens||0,r.mulheres||0,i]);
    res.json({ ok:true });
  } catch (err) { next(err); }
});

// Cultura endpoints (8 sections)
// PUT /api/submissions/cultura/desporto-organizado
router.put('/cultura/desporto-organizado', async (req, res, next) => {
  try {
    const sub = await getOrCreateSubmission(req.user.id, req.user.campus_id, req.user.university_id);
    await checkNotLocked(sub.id, 'cultura', req.user.role);
    const rows = Array.isArray(req.body) ? req.body : [];
    await saveRows(sub.id, 'desporto_organizado',
      'submission_id,nome_atividade,modalidade,data_local,objetivos,estudantes_h,estudantes_m,docentes_h,docentes_m,sort_order',
      rows, (r,i) => [sub.id,r.nome_atividade,r.modalidade,r.data_local,r.objetivos,r.estudantes_h||0,r.estudantes_m||0,r.docentes_h||0,r.docentes_m||0,i]);
    res.json({ ok:true });
  } catch (err) { next(err); }
});

router.put('/cultura/desporto-participacao', async (req, res, next) => {
  try {
    const sub = await getOrCreateSubmission(req.user.id, req.user.campus_id, req.user.university_id);
    await checkNotLocked(sub.id, 'cultura', req.user.role);
    const rows = Array.isArray(req.body) ? req.body : [];
    await saveRows(sub.id, 'desporto_participacao',
      'submission_id,nome_atividade,entidade_org,data_local,objetivos,estudantes_h,estudantes_m,docentes_h,docentes_m,classificacao,sort_order',
      rows, (r,i) => [sub.id,r.nome_atividade,r.entidade_org,r.data_local,r.objetivos,r.estudantes_h||0,r.estudantes_m||0,r.docentes_h||0,r.docentes_m||0,r.classificacao||null,i]);
    res.json({ ok:true });
  } catch (err) { next(err); }
});

router.put('/cultura/cultura-organizada', async (req, res, next) => {
  try {
    const sub = await getOrCreateSubmission(req.user.id, req.user.campus_id, req.user.university_id);
    await checkNotLocked(sub.id, 'cultura', req.user.role);
    const rows = Array.isArray(req.body) ? req.body : [];
    await saveRows(sub.id, 'cultura_organizada',
      'submission_id,nome_atividade,tipo_atividade,data_local,objetivos,estudantes_h,estudantes_m,docentes_h,docentes_m,sort_order',
      rows, (r,i) => [sub.id,r.nome_atividade,r.tipo_atividade,r.data_local,r.objetivos,r.estudantes_h||0,r.estudantes_m||0,r.docentes_h||0,r.docentes_m||0,i]);
    res.json({ ok:true });
  } catch (err) { next(err); }
});

router.put('/cultura/cultura-participacao', async (req, res, next) => {
  try {
    const sub = await getOrCreateSubmission(req.user.id, req.user.campus_id, req.user.university_id);
    await checkNotLocked(sub.id, 'cultura', req.user.role);
    const rows = Array.isArray(req.body) ? req.body : [];
    await saveRows(sub.id, 'cultura_participacao',
      'submission_id,nome_evento,entidade_org,data_local,objetivos,estudantes_h,estudantes_m,docentes_h,docentes_m,distincoes,sort_order',
      rows, (r,i) => [sub.id,r.nome_evento,r.entidade_org,r.data_local,r.objetivos,r.estudantes_h||0,r.estudantes_m||0,r.docentes_h||0,r.docentes_m||0,r.distincoes||null,i]);
    res.json({ ok:true });
  } catch (err) { next(err); }
});

router.put('/cultura/grupos', async (req, res, next) => {
  try {
    const sub = await getOrCreateSubmission(req.user.id, req.user.campus_id, req.user.university_id);
    await checkNotLocked(sub.id, 'cultura', req.user.role);
    const rows = Array.isArray(req.body) ? req.body : [];
    await saveRows(sub.id, 'grupos_culturais',
      'submission_id,nome_grupo,expressao_artistica,objetivos,estudantes_h,estudantes_m,docentes_h,docentes_m,distincoes,sort_order',
      rows, (r,i) => [sub.id,r.nome_grupo,r.expressao_artistica,r.objetivos,r.estudantes_h||0,r.estudantes_m||0,r.docentes_h||0,r.docentes_m||0,r.distincoes||null,i]);
    res.json({ ok:true });
  } catch (err) { next(err); }
});

router.put('/cultura/tuna', async (req, res, next) => {
  try {
    const sub = await getOrCreateSubmission(req.user.id, req.user.campus_id, req.user.university_id);
    await checkNotLocked(sub.id, 'cultura', req.user.role);
    const rows = Array.isArray(req.body) ? req.body : [];
    await saveRows(sub.id, 'tuna_academica',
      'submission_id,nome_membro,cargo,ano_ingresso,objetivos,distincoes,sort_order',
      rows, (r,i) => [sub.id,r.nome_membro,r.cargo,r.ano_ingresso||null,r.objetivos||null,r.distincoes||null,i]);
    res.json({ ok:true });
  } catch (err) { next(err); }
});

router.put('/cultura/estudantes-atividades', async (req, res, next) => {
  try {
    const sub = await getOrCreateSubmission(req.user.id, req.user.campus_id, req.user.university_id);
    await checkNotLocked(sub.id, 'cultura', req.user.role);
    const rows = Array.isArray(req.body) ? req.body : [];
    await saveRows(sub.id, 'estudantes_atividades',
      'submission_id,nome_completo,num_estudante,curso,ano_frequencia,sexo,atividade,evento,sort_order',
      rows, (r,i) => [sub.id,r.nome_completo,r.num_estudante,r.curso,r.ano_frequencia,r.sexo,r.atividade,r.evento,i]);
    res.json({ ok:true });
  } catch (err) { next(err); }
});

// POST /api/submissions/submit
router.post('/submit', async (req, res, next) => {
  try {
    const sub = await getOrCreateSubmission(req.user.id, req.user.campus_id, req.user.university_id);
    if (sub.status==='submitted') return res.status(400).json({ error:'Already submitted' });
    await db.query("UPDATE submissions SET status='submitted',submitted_at=NOW() WHERE id=$1", [sub.id]);
    const [userRes, estRes] = await Promise.all([
      db.query('SELECT email FROM users WHERE id=$1', [req.user.id]),
      db.query('SELECT COALESCE(SUM(homens+mulheres),0) AS total FROM estudantes WHERE submission_id=$1', [sub.id]),
    ]);
    const univIdIes = sub.university_id
      ? (await db.query('SELECT nome,sigla,provincia FROM university_id_ies WHERE university_id=$1', [sub.university_id])).rows[0] || {}
      : {};
    Promise.all([
      sendSubmissionConfirmation({ to:userRes.rows[0]?.email, institution:univIdIes.nome||req.user.institution, sigla:univIdIes.sigla, submittedAt:new Date() }),
      sendAdminNewSubmission({ institution:univIdIes.nome||req.user.institution, sigla:univIdIes.sigla, email:userRes.rows[0]?.email, provincia:univIdIes.provincia, totalEstudantes:estRes.rows[0]?.total||0 }),
    ]).catch(e => console.error('Email error:', e.message));
    res.json({ ok:true });
  } catch (err) { next(err); }
});

// PUT /api/submissions/:submissionId/idies — director_gpl only: set ID IES for a specific submission (useful when university info missing)
router.put('/:submissionId/idies', requireDirector, async (req, res, next) => {
  try {
    const submissionId = req.params.submissionId;
    // Validate input
    const idiesSchema = Joi.object({
      university_id: Joi.string().uuid().allow(null,'').optional(),
      nome: Joi.string().max(300).allow('',null),
      sigla: Joi.string().max(50).allow('',null),
      nuit: Joi.string().max(50).allow('',null),
      ano_inicio: Joi.number().integer().min(1900).max(3000).allow(null),
      provincia: Joi.string().max(100).allow('',null),
      distrito: Joi.string().max(100).allow('',null),
      website: Joi.string().uri().allow('',null),
      contacto: Joi.string().max(50).allow('',null),
      email: Joi.string().email().allow('',null),
      responsavel: Joi.string().max(200).allow('',null),
      funcao: Joi.string().max(100).allow('',null),
      email_resp: Joi.string().email().allow('',null)
    });
    const { error, value } = idiesSchema.validate(req.body || {});
    if (error) return res.status(400).json({ error: error.details[0].message });
    const d = value;

    // Find submission to resolve university or campus
    const subRes = await db.query('SELECT university_id, campus_id FROM submissions WHERE id=$1', [submissionId]);
    if (!subRes.rows.length) return res.status(404).json({ error: 'Submissão não encontrada' });
    let univId = d.university_id || subRes.rows[0].university_id;

    // If still missing, resolve from campus
    if (!univId && subRes.rows[0].campus_id) {
      const r = await db.query('SELECT university_id FROM campuses WHERE id=$1', [subRes.rows[0].campus_id]);
      univId = r.rows[0]?.university_id || null;
    }

    if (!univId) return res.status(400).json({ error: 'É necessário o university_id (ou associe a submissão a uma universidade)' });

    // Upsert university-level IES data
    await db.query(`
      INSERT INTO university_id_ies
        (university_id,nome,sigla,nuit,ano_inicio,provincia,distrito,website,contacto,email,responsavel,funcao,email_resp,updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
      ON CONFLICT (university_id) DO UPDATE SET
        nome=$2,sigla=$3,nuit=$4,ano_inicio=$5,provincia=$6,distrito=$7,
        website=$8,contacto=$9,email=$10,responsavel=$11,funcao=$12,email_resp=$13,updated_at=NOW()`,
      [univId, d.nome, d.sigla, d.nuit, d.ano_inicio, d.provincia, d.distrito,
       d.website, d.contacto, d.email, d.responsavel, d.funcao, d.email_resp]
    );

    // Optionally associate this submission with the university if it wasn't set
    if (!subRes.rows[0].university_id) {
      await db.query('UPDATE submissions SET university_id=$1 WHERE id=$2', [univId, submissionId]);
    }

    audit.log({ userId:req.user.id, userEmail:req.user.email, userRole:req.user.role,
      action:'save_university_idies_for_submission', entityType:'submission', entityId:submissionId, section:'idies', ip:audit.getIp(req) });

    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
