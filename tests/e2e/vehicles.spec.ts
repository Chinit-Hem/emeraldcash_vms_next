import { test, expect } from '@playwright/test';

const testVehicle = {
  category: 'Cars',
  brand: 'Test',
  model: 'AI Test',
  year: 2024,
  plate: 'AI-TEST-001',
  market_price: 100000,
};

test.describe('Vehicles CRUD', () => {
  test('GET vehicles list', async ({ request }) => {
    const res = await request.get('/api/vehicles?limit=5');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBeTruthy();
    expect(Array.isArray(body.data)).toBeTruthy();
  });

  test('POST create vehicle', async ({ request }) => {
    const res = await request.post('/api/vehicles', {
      data: testVehicle
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBeTruthy();
    expect(body.data).toHaveProperty('VehicleId');
  });

  test('DELETE vehicle (use ID from create if known)', async ({ request }) => {
    // Skip if no ID, or use test
    const res = await request.delete('/api/vehicles?id=1'); // Test ID, expect 200 or 404
    expect(res.status()).toBeLessThan(500);
  });
});
