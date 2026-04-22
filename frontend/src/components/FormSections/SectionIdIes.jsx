import { useState } from 'react';
import { Card, Field, Grid, ErrorBanner } from '../Layout/FormComponents';
import { validateIdIes } from '../../utils/validation';
import { APP_NAME, CURRENT_YEAR } from '../../utils/appConfig';

const PROVINCIAS = ['Maputo','Gaza','Inhambane','Sofala','Manica','Tete','Zambézia','Nampula','Cabo Delgado','Niassa'];

function ReadOnlyField({ label, value }) {
  return (
    <div style={{ marginBottom:8 }}>
      <label style={{ display:'block', fontSize:12, color:'var(--color-text-secondary)', marginBottom:3 }}>{label}</label>
      <div style={{ fontSize:13, color:'var(--color-text-primary)', padding:'7px 10px', background:'var(--color-background-secondary)', borderRadius:6, border:'0.5px solid var(--color-border-tertiary)', minHeight:34 }}>
        {value || <span style={{ color:'var(--color-text-secondary)', fontStyle:'italic' }}>Não preenchido</span>}
      </div>
    </div>
  );
}

export default function SectionIdIes({ data, update, userRole, campusNome, campusProvincia }) {
  const d = data.idies || {};
  const [errors, setErrors] = useState({});
  const isReadOnly = userRole === 'chefe_departamento';

  const set = (k, v) => {
    const updated = { ...d, [k]: v };
    update('idies', updated);
    if (errors[k]) setErrors(p => { const n={...p}; delete n[k]; return n; });
  };

  if (isReadOnly) {
    return (
      <>
        <Card title="A. Identificação da Entidade" desc={`Preenchido pelo Director GPL — somente leitura`}>
          <div style={{ background:'#FAEEDA', color:'#854F0B', borderRadius:8, padding:'8px 14px', fontSize:12, marginBottom:16, border:'0.5px solid #FAC775' }}>
            Esta secção é preenchida pelo Director GPL. Os seus dados de campus foram pré-carregados.
          </div>
          <Grid cols={2} style={{ marginBottom:10 }}>
            <ReadOnlyField label="Nome da IES" value={d.nome} />
            <ReadOnlyField label="Sigla" value={d.sigla} />
          </Grid>
          <Grid cols={3} style={{ marginBottom:10 }}>
            <ReadOnlyField label="NUIT" value={d.nuit} />
            <ReadOnlyField label="Ano de início" value={d.ano_inicio} />
            <ReadOnlyField label="Contacto" value={d.contacto} />
          </Grid>
          <Grid cols={2} style={{ marginBottom:10 }}>
            <ReadOnlyField label="Província (campus)" value={campusProvincia || d.provincia} />
            <ReadOnlyField label="Distrito" value={d.distrito} />
          </Grid>
          <Grid cols={2}>
            <ReadOnlyField label="Website" value={d.website} />
            <ReadOnlyField label="Email" value={d.email} />
          </Grid>
        </Card>
        <Card title="Campus / Departamento">
          <Grid cols={2}>
            <ReadOnlyField label="Campus" value={campusNome} />
            <ReadOnlyField label="Província" value={campusProvincia} />
          </Grid>
        </Card>
      </>
    );
  }

  // Director GPL / SuperAdmin — editable
  return (
    <>
      <Card title="A. Identificação da Entidade" desc={`Dados de identificação da Instituição de Ensino Superior — Ano ${CURRENT_YEAR}`}>
        <ErrorBanner message={errors._general} />
        <Grid cols={2} style={{ marginBottom:12 }}>
          <Field label="Nome da IES *" error={errors.nome}>
            <input value={d.nome||''} onChange={e=>set('nome',e.target.value)} placeholder="Nome completo da IES" style={{ width:'100%' }} />
          </Field>
          <Field label="Sigla *" error={errors.sigla}>
            <input value={d.sigla||''} onChange={e=>set('sigla',e.target.value)} placeholder="Ex: UniLúrio" style={{ width:'100%' }} />
          </Field>
        </Grid>
        <Grid cols={3} style={{ marginBottom:12 }}>
          <Field label="NUIT *" error={errors.nuit}>
            <input value={d.nuit||''} onChange={e=>set('nuit',e.target.value)} placeholder="000000000" style={{ width:'100%' }} />
          </Field>
          <Field label="Ano de início">
            <input type="number" value={d.ano_inicio||''} onChange={e=>set('ano_inicio',e.target.value)} placeholder="Ex: 2006" style={{ width:'100%' }} />
          </Field>
          <Field label="Contacto">
            <input value={d.contacto||''} onChange={e=>set('contacto',e.target.value)} placeholder="+258..." style={{ width:'100%' }} />
          </Field>
        </Grid>
        <Grid cols={2} style={{ marginBottom:12 }}>
          <Field label="Província *" error={errors.provincia}>
            <select value={d.provincia||''} onChange={e=>set('provincia',e.target.value)} style={{ width:'100%' }}>
              <option value="">Seleccione...</option>
              {PROVINCIAS.map(p=><option key={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Distrito">
            <input value={d.distrito||''} onChange={e=>set('distrito',e.target.value)} placeholder="Distrito" style={{ width:'100%' }} />
          </Field>
        </Grid>
        <Grid cols={2}>
          <Field label="Website">
            <input value={d.website||''} onChange={e=>set('website',e.target.value)} placeholder="https://..." style={{ width:'100%' }} />
          </Field>
          <Field label="Email da IES" error={errors.email}>
            <input type="email" value={d.email||''} onChange={e=>set('email',e.target.value)} placeholder="info@unilurio.ac.mz" style={{ width:'100%' }} />
          </Field>
        </Grid>
      </Card>
      <Card title="Responsável pelo preenchimento">
        <Grid cols={3}>
          <Field label="Nome completo *" error={errors.responsavel}>
            <input value={d.responsavel||''} onChange={e=>set('responsavel',e.target.value)} style={{ width:'100%' }} />
          </Field>
          <Field label="Função">
            <input value={d.funcao||''} onChange={e=>set('funcao',e.target.value)} placeholder="Ex: Director de Planificação" style={{ width:'100%' }} />
          </Field>
          <Field label="Email do responsável" error={errors.email_resp}>
            <input type="email" value={d.email_resp||''} onChange={e=>set('email_resp',e.target.value)} style={{ width:'100%' }} />
          </Field>
        </Grid>
      </Card>
    </>
  );
}
