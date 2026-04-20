import { useState } from 'react';
import { Card, Field, Grid, ErrorBanner } from '../Layout/FormComponents';
import { validateIdIes } from '../../utils/validation';

const PROVINCIAS = ['Maputo','Gaza','Inhambane','Sofala','Manica','Tete','Zambézia','Nampula','Cabo Delgado','Niassa'];

export default function SectionIdIes({ data, update }) {
  const d = data.idies || {};
  const [errors, setErrors] = useState({});

  const set = (k, v) => {
    const updated = { ...d, [k]: v };
    update('idies', updated);
    if (errors[k]) setErrors(p => { const n = { ...p }; delete n[k]; return n; });
  };

  const validate = () => {
    const { errors: e } = validateIdIes(d);
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <>
      <Card title="A. Identificação da Entidade" desc="Dados de identificação e localização da Instituição de Ensino Superior">
        <ErrorBanner message={errors._general} />
        <Grid cols={2} style={{ marginBottom: 12 }}>
          <Field label="Nome da IES *" error={errors.nome}>
            <input value={d.nome || ''} onChange={e => set('nome', e.target.value)} placeholder="Nome completo da IES" style={{ width: '100%' }} />
          </Field>
          <Field label="Sigla *" error={errors.sigla}>
            <input value={d.sigla || ''} onChange={e => set('sigla', e.target.value)} placeholder="Ex: UEM" style={{ width: '100%' }} />
          </Field>
        </Grid>
        <Grid cols={3} style={{ marginBottom: 12 }}>
          <Field label="NUIT *" error={errors.nuit}>
            <input value={d.nuit || ''} onChange={e => set('nuit', e.target.value)} placeholder="000000000" style={{ width: '100%' }} />
          </Field>
          <Field label="Ano de início" error={errors.ano_inicio}>
            <input type="number" value={d.ano_inicio || ''} onChange={e => set('ano_inicio', e.target.value)} placeholder="Ex: 1995" style={{ width: '100%' }} />
          </Field>
          <Field label="Contacto" error={errors.contacto}>
            <input value={d.contacto || ''} onChange={e => set('contacto', e.target.value)} placeholder="+258..." style={{ width: '100%' }} />
          </Field>
        </Grid>
        <Grid cols={2} style={{ marginBottom: 12 }}>
          <Field label="Província *" error={errors.provincia}>
            <select value={d.provincia || ''} onChange={e => set('provincia', e.target.value)} style={{ width: '100%' }}>
              <option value="">Seleccione...</option>
              {PROVINCIAS.map(p => <option key={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Distrito" error={errors.distrito}>
            <input value={d.distrito || ''} onChange={e => set('distrito', e.target.value)} placeholder="Distrito" style={{ width: '100%' }} />
          </Field>
        </Grid>
        <Grid cols={2}>
          <Field label="Website" error={errors.website}>
            <input value={d.website || ''} onChange={e => set('website', e.target.value)} placeholder="https://..." style={{ width: '100%' }} />
          </Field>
          <Field label="Email da IES" error={errors.email}>
            <input type="email" value={d.email || ''} onChange={e => set('email', e.target.value)} placeholder="info@ies.ac.mz" style={{ width: '100%' }} />
          </Field>
        </Grid>
      </Card>

      <Card title="Responsável pelo preenchimento">
        <Grid cols={3}>
          <Field label="Nome completo *" error={errors.responsavel}>
            <input value={d.responsavel || ''} onChange={e => set('responsavel', e.target.value)} style={{ width: '100%' }} />
          </Field>
          <Field label="Função">
            <input value={d.funcao || ''} onChange={e => set('funcao', e.target.value)} placeholder="Ex: Director de Planificação" style={{ width: '100%' }} />
          </Field>
          <Field label="Email do responsável" error={errors.email_resp}>
            <input type="email" value={d.email_resp || ''} onChange={e => set('email_resp', e.target.value)} style={{ width: '100%' }} />
          </Field>
        </Grid>
      </Card>
    </>
  );
}
