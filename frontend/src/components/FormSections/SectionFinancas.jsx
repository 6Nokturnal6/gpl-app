import { Card, ErrorBanner } from '../Layout/FormComponents';
import { validateFinancas } from '../../utils/validation';
import { useState } from 'react';

const ROW = { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom:'0.5px solid var(--color-border-tertiary)', fontSize:13 };
const TOTAL_ROW = { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', fontSize:14, fontWeight:500 };
const SUB = { fontSize:12, color:'var(--color-text-secondary)', margin:'12px 0 4px', fontWeight:500 };

function FinRow({ label, field, value, onChange, muted }) {
  return (
    <div style={ROW}>
      <span style={{ color: muted ? 'var(--color-text-secondary)' : 'var(--color-text-primary)' }}>{label}</span>
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
  const totalDespCorrente = (parseFloat(f.func_ensino)||0)+(parseFloat(f.func_investig)||0)+(parseFloat(f.func_admin)||0)+(parseFloat(f.sal_docentes)||0)+(parseFloat(f.sal_tecnicos)||0)+(parseFloat(f.sal_outros)||0);
  const totalInvest = (parseFloat(f.desp_invest)||0)+(parseFloat(f.desp_deprec)||0)+(parseFloat(f.desp_invest_outros)||0);
  const totalGeral = totalDespCorrente + totalInvest + (parseFloat(f.desp_reembolso)||0);

  return (
    <>
      <Card title="Dados sobre Recursos Financeiros" desc="Valores em Meticais × 10³ (milhares de meticais)">
        <ErrorBanner message={errors._general} />

        <div style={{ fontWeight:500, fontSize:13, marginBottom:8, color:'var(--color-text-primary)' }}>Quadro 1 – Despesas na IES</div>
        <div style={ROW}>
          <span>Despesas de Funcionamento</span>
          <span style={{ color:'var(--color-text-secondary)', fontSize:13 }}>{totalDespCorrente.toLocaleString('pt-MZ')}</span>
        </div>
        <div style={ROW}>
          <span>Despesas de Investimento</span>
          <span style={{ color:'var(--color-text-secondary)', fontSize:13 }}>{totalInvest.toLocaleString('pt-MZ')}</span>
        </div>
        <div style={TOTAL_ROW}>
          <span>Total (Quadro 1)</span>
          <span style={{ color:'#185FA5' }}>{(totalDespCorrente + totalInvest).toLocaleString('pt-MZ')} MT×10³</span>
        </div>
        <div style={{ fontSize:11, color:'var(--color-text-secondary)', marginTop:4 }}>
          Calculado a partir do Quadro 3 (correntes + investimento)
        </div>
      </Card>

      <Card title="Quadro 2 – Financiamento por fonte">
        <FinRow label="OGE (Orçamento Geral do Estado)" field="oge" value={f.oge} onChange={set} />
        <FinRow label="Doações (internas e externas)" field="doacoes" value={f.doacoes} onChange={set} />
        <FinRow label="Créditos" field="creditos" value={f.creditos} onChange={set} />
        <FinRow label="Receitas próprias" field="proprias" value={f.proprias} onChange={set} />
        <div style={TOTAL_ROW}>
          <span>Total de financiamento</span>
          <span style={{ color:'#185FA5' }}>{totalFunding.toLocaleString('pt-MZ')} MT×10³</span>
        </div>
      </Card>

      <Card title="Quadro 3 – Despesa para funcionamento e investimento">
        <div style={SUB}>Despesa corrente de funcionamento</div>
        <FinRow label="Ensino" field="func_ensino" value={f.func_ensino} onChange={set} muted />
        <FinRow label="Investigação" field="func_investig" value={f.func_investig} onChange={set} muted />
        <FinRow label="Administração" field="func_admin" value={f.func_admin} onChange={set} muted />

        <div style={SUB}>Salário e outros benefícios</div>
        <FinRow label="Docentes" field="sal_docentes" value={f.sal_docentes} onChange={set} muted />
        <FinRow label="Corpo Técnico Administrativo" field="sal_tecnicos" value={f.sal_tecnicos} onChange={set} muted />
        <FinRow label="Outros" field="sal_outros" value={f.sal_outros} onChange={set} muted />
        <div style={TOTAL_ROW}>
          <span>Subtotal despesas correntes</span>
          <span style={{ color:'#185FA5' }}>{totalDespCorrente.toLocaleString('pt-MZ')}</span>
        </div>

        <div style={SUB}>Despesa de investimento</div>
        <FinRow label="Investimento" field="desp_invest" value={f.desp_invest} onChange={set} muted />
        <FinRow label="Depreciação de edifícios e equipamentos" field="desp_deprec" value={f.desp_deprec} onChange={set} muted />
        <FinRow label="Outros" field="desp_invest_outros" value={f.desp_invest_outros} onChange={set} muted />
        <div style={TOTAL_ROW}>
          <span>Subtotal investimento</span>
          <span style={{ color:'#185FA5' }}>{totalInvest.toLocaleString('pt-MZ')}</span>
        </div>

        <div style={SUB}>Reembolso de capital (créditos)</div>
        <FinRow label="Reembolso" field="desp_reembolso" value={f.desp_reembolso} onChange={set} muted />

        <div style={{ ...TOTAL_ROW, marginTop:8, borderTop:'1px solid var(--color-border-tertiary)', paddingTop:12 }}>
          <span>Grande total</span>
          <span style={{ color:'#185FA5' }}>{totalGeral.toLocaleString('pt-MZ')} MT×10³</span>
        </div>
      </Card>
    </>
  );
}
