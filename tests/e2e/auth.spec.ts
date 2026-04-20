import { test, expect } from '@playwright/test';

test.describe('Auth Flow', () => {
  test('smoke: login page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Emerald|Login|VMS/); // Flexible
  });

  test('login with test account', async ({ page, request }) => {
    // Login POST
    const loginRes = await request.post('/api/auth/login', {
      data: {
        username: 'test+ai@example.com',
        password: 'Password123!'
      }
    });
    expect(loginRes.status()).toBe(200);
    const loginBody = await loginRes.json();
    expect(loginBody.ok).toBeTruthy();

    // Verify session
    const meRes = await request.get('/api/auth/me');
    expect(meRes.status()).toBe(200);
    const meBody = await meRes.json();
    expect(meBody.ok).toBeTruthy();

    // Page login
    await page.goto('/login');
    await page.fill('input[placeholder="Enter username"]', 'test+ai@example.com');
    await page.fill('input[placeholder="Enter password"]', 'Password123!');
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('/', { timeout: 10000 });
    await expect(page).not.toHaveURL(/login/);
  });
});
