// Returns { valid: bool, errors: { fieldName: 'message' } }

export function validateIdIes(d = {}) {
  const errors = {};
  if (!d.nome?.trim()) errors.nome = 'Nome é obrigatório';
  if (!d.sigla?.trim()) errors.sigla = 'Sigla é obrigatória';
  if (!d.nuit?.trim()) errors.nuit = 'NUIT é obrigatório';
  if (!d.provincia) errors.provincia = 'Seleccione a província';
  if (!d.responsavel?.trim()) errors.responsavel = 'Nome do responsável é obrigatório';
  if (d.email && !/\S+@\S+\.\S+/.test(d.email)) errors.email = 'Email inválido';
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateEstudantes(rows = []) {
  const errors = {};
  if (!rows.length) { errors._general = 'Adicione pelo menos um curso'; }
  rows.forEach((r, i) => {
    if (!r.curso?.trim()) errors[`${i}_curso`] = 'Nome do curso obrigatório';
    if (!r.grau) errors[`${i}_grau`] = 'Grau obrigatório';
    if ((r.homens ?? 0) < 0) errors[`${i}_homens`] = 'Valor inválido';
    if ((r.mulheres ?? 0) < 0) errors[`${i}_mulheres`] = 'Valor inválido';
  });
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateFinancas(d = {}) {
  const errors = {};
  const fields = ['oge','doacoes','creditos','proprias'];
  fields.forEach(f => {
    if (d[f] !== undefined && d[f] !== '' && isNaN(Number(d[f]))) {
      errors[f] = 'Valor numérico inválido';
    }
  });
  return { valid: Object.keys(errors).length === 0, errors };
}

// Generic numeric row validator
export function validateNumericRows(rows = [], requiredFields = []) {
  const errors = {};
  rows.forEach((r, i) => {
    requiredFields.forEach(f => {
      if (r[f] !== undefined && r[f] !== '' && isNaN(Number(r[f]))) {
        errors[`${i}_${f}`] = 'Valor inválido';
      }
    });
  });
  return { valid: Object.keys(errors).length === 0, errors };
}
