const { test, expect } = require('@playwright/test');

// This test requires environment variables with a director account that exists in the test DB:
// DIRECTOR_EMAIL and DIRECTOR_PASSWORD

test('director can set ID IES for a submission (if environment configured)', async ({ request }) => {
  const email = process.env.DIRECTOR_EMAIL;
  const password = process.env.DIRECTOR_PASSWORD;
  test.skip(!email || !password, 'DIRECTOR_EMAIL and DIRECTOR_PASSWORD not provided');

  // Login to obtain token
  const loginRes = await request.post('/api/auth/login', { data: { email, password } });
  expect(loginRes.ok()).toBeTruthy();
  const loginBody = await loginRes.json();
  const token = loginBody.token;
  expect(token).toBeTruthy();

  const headers = { Authorization: `Bearer ${token}` };

  // Find a campus with an existing submission_id
  const campusesRes = await request.get('/api/campuses', { headers });
  expect(campusesRes.ok()).toBeTruthy();
  const campuses = await campusesRes.json();
  const campus = campuses.find(c => c.submission_id);
  test.skip(!campus, 'No campus with submission_id found');

  const submissionId = campus.submission_id;
  const payload = {
    nome: 'Universidade de Teste',
    sigla: 'UTEST',
    nuit: '999999999',
    ano_inicio: 2001,
    provincia: 'TesteProv',
    distrito: 'TesteDist',
    website: 'https://teste.example',
    contacto: '+000000000',
    email: 'info@teste.example',
    responsavel: 'Director Teste',
    funcao: 'Director',
    email_resp: 'resp@teste.example'
  };

  const res = await request.put(`/api/submissions/${submissionId}/idies`, { data: payload, headers });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.ok).toBe(true);
});