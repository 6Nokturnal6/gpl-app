const { test, expect } = require('@playwright/test');

function decodeJtiFromJwt(token) {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    return payload.jti || null;
  } catch (e) { return null; }
}

test('Admin UI revoke flow (superadmin required)', async ({ page, request }) => {
  const superToken = process.env.SUPERADMIN_TOKEN;
  test.skip(!superToken, 'SUPERADMIN_TOKEN not set');

  // 1) Create a temporary user and login to obtain token (which includes jti)
  const email = `revoketest-ui-${Date.now()}@example.com`;
  const password = 'Rev0kePass!';
  const register = await request.post('/api/auth/register', { data: { email, password, institution: 'UITest', nome: 'Revoke UI Test' } });
  expect([200,201]).toContain(register.status());

  const login = await request.post('/api/auth/login', { data: { email, password } });
  expect(login.status()).toBe(200);
  const loginBody = await login.json();
  const userToken = loginBody.token;
  expect(userToken).toBeTruthy();

  const jti = decodeJtiFromJwt(userToken);
  expect(jti).toBeTruthy();

  // 2) Open app as superadmin (set token in localStorage) and navigate to users tab
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((t) => localStorage.setItem('gpl_token', t), superToken);
  await page.reload();
  await page.getByText('Utilizadores').click();

  // accept native confirm dialogs triggered by Revoke button
  page.on('dialog', async dialog => { await dialog.accept(); });

  // 3) Wait for issued jtis to load and find our jti row
  await page.waitForSelector(`text=${jti}`, { timeout: 10000 });
  const jtiCell = page.locator(`text=${jti}`).first();
  const row = jtiCell.locator('xpath=ancestor::tr');

  // Click the Revoke button in the same row
  const revokeBtn = row.locator('button', { hasText: 'Revoke' }).first();
  await revokeBtn.click();

  // 4) Verify via admin API that jti appears in revoked list
  const revokedRes = await request.get('/api/admin/revoked-jtis', { headers: { Authorization: `Bearer ${superToken}` } });
  expect(revokedRes.status()).toBe(200);
  const revokedList = await revokedRes.json();
  const found = revokedList.find(r => r.jti === jti);
  expect(found).toBeTruthy();

  // 5) Verify the user token is now rejected when calling /api/auth/me
  const meRes = await request.get('/api/auth/me', { headers: { Authorization: `Bearer ${userToken}` } });
  expect(meRes.status()).toBe(401);
});
