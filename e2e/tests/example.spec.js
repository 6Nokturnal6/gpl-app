const { test, expect } = require('@playwright/test');

test('API health returns ok', async ({ request }) => {
  const res = await request.get('/api/health');
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.status).toBe('ok');
});

test('Frontend root responds with 2xx', async ({ page }) => {
  const response = await page.goto('/');
  expect(response && response.status()).toBeLessThan(400);
});
