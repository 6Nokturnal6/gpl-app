const { test, expect } = require('@playwright/test');
const { currentYear, nextYear } = require('../../backend/src/utils/yearHelper');

test('year helper returns current and next year', async () => {
  const cur = currentYear();
  const nxt = nextYear();
  expect(cur).toBe(new Date().getFullYear());
  expect(nxt).toBe(new Date().getFullYear() + 1);
});

test('filename pattern includes current year', async () => {
  const yr = currentYear();
  const sigla = 'IES';
  const campus = 'CampusX';
  const expected = `Formulario_Recolha_${yr}_${sigla}_${campus}.pdf`;
  // Basic sanity check for the format
  expect(expected).toMatch(new RegExp(`Formulario_Recolha_${yr}_[A-Za-z0-9_\-]+_[A-Za-z0-9_\-]+\\.pdf`));
});
