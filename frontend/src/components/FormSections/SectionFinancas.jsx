import { Card, Field, ErrorBanner } from '../Layout/FormComponents';
import { validateFinancas } from '../../utils/validation';
import { useState } from 'react';

const ROW = { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom:'0.5px solid var(--color-border-tertiary)', fontSize:13 };
const TOTAL_ROW = { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', fontSize:14, fontWeight:500 };

function FinRow({ label, field, value, onChange }) {
  return (
    <div style={ROW}>
      <span style={{ color:'var(--color-text-primary)' }}>{label}</span>
      <input type="number" min="0" value={value??''} onChange={e=>onChange(field, parseFloat(e.target.value)||0)}
        style={{ width:140, textAlign:'right', fontSize:13 }} />
    </div>
  );
}

export default function SectionFinancas({ data, update }) {
  const f = data.financas || {};
  const [errors, setErrors] = useState({});

  const set = (k, v) => {
    const updated = { ...f, [k]: v };
    update('financas', updated);
    const { errors: e } = validateFinancas(updated);
    setErrors(e);
  };

  const totalFunding = (parseFloat(f.oge)||0)+(parseFloat(f.doacoes)||0)+(parseFloat(f.creditos)||0)+(parseFloat(f.proprias)||0);
  const totalDesp = (parseFloat(f.func_ensino)||0)+(parseFloat(f.func_investig)||0)+(parseFloat(f.func_admin)||0)+(parseFloat(f.sal_docentes)||0)+(parseFloat(f.sal_tecnicos)||0);

  return (
    <>
      <Card title="Dados sobre Recursos Financeiros" desc="Valores em Meticais × 10³ (milhares de meticais)">
        <ErrorBanner message={errors._general} />

        <div style={{ fontWeight:500, fontSize:13, marginBottom:8, color:'var(--color-text-primary)' }}>Quadro 2 – Financiamento por fonte</div>
        <FinRow label="OGE (Orçamento Geral do Estado)" field="oge" value={f.oge} onChange={set} />
        <FinRow label="Doações (internas e externas)" field="doacoes" value={f.doacoes} onChange={set} />
        <FinRow label="Créditos" field="creditos" value={f.creditos} onChange={set} />
        <FinRow label="Receitas próprias" field="proprias" value={f.proprias} onChange={set} />
        <div style={TOTAL_ROW}>
          <span>Total de financiamento</span>
          <span style={{ color:'#185FA5' }}>{totalFunding.toLocaleString('pt-MZ')} MT×10³</span>
        </div>
      </Card>

      <Card title="Quadro 3 – Despesas correntes">
        <FinRow label="Ensino" field="func_ensino" value={f.func_ensino} onChange={set} />
        <FinRow label="Investigação" field="func_investig" value={f.func_investig} onChange={set} />
        <FinRow label="Administração" field="func_admin" value={f.func_admin} onChange={set} />
        <FinRow label="Salários – Docentes" field="sal_docentes" value={f.sal_docentes} onChange={set} />
        <FinRow label="Salários – Técnicos Administrativos" field="sal_tecnicos" value={f.sal_tecnicos} onChange={set} />
        <div style={TOTAL_ROW}>
          <span>Total de despesas</span>
          <span style={{ color:'#185FA5' }}>{totalDesp.toLocaleString('pt-MZ')} MT×10³</span>
        </div>
      </Card>
    </>
  );
}
