import { test, expect } from '@playwright/test';

const API_BASE = 'https://script.google.com/macros/s/AKfycbwlIp823Km3GEcMhWip_cZSlZ9GRlf1HptIucXdvz2qI14vsn_3Zq_Z27QyblOOLdUuMQ/exec';

test.describe('Vehicle API Smoke Tests', () => {
  test('GET /vehicles?limit=5', async ({ request }) => {
    const res = await request.get(`${API_BASE}?limit=5`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    console.log('GET response:', body);
    expect(body).toHaveProperty('success', true);
  });

  test('POST /vehicles (create)', async ({ request }) => {
    const payload = {
      category: 'Cars',
      brand: 'Test',
      model: 'AI Test',
      year: 2024,
      plate: 'AI-TEST-001',
      market_price: 100000
    };
    const res = await request.post(API_BASE, { data: payload });
    expect(res.status()).toBe(200);
    const body = await res.json();
    console.log('POST response:', body);
    expect(body).toHaveProperty('success', true);
  });
});

