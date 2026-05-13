const { test, expect } = require('@playwright/test');
const { v4: uuidv4 } = require('uuid');

test('admin revoke-token API (requires SUPERADMIN_TOKEN)', async ({ request }) => {
  const token = process.env.SUPERADMIN_TOKEN;
  test.skip(!token, 'SUPERADMIN_TOKEN not set');

  const jti = uuidv4();
  const res = await request.post('/api/admin/revoke-token', {
    headers: { Authorization: `Bearer ${token}` },
    data: { jti, reason: 'playwright test' }
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body).toHaveProperty('ok');

  // cleanup: remove revoked jti
  await request.delete(`/api/admin/revoked-jtis/${jti}`, { headers: { Authorization: `Bearer ${token}` } });
});
