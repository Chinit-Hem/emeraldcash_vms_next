# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\e2e-fixed\vehicles-api.spec.ts >> Vehicle API Smoke Tests >> POST /vehicles (create)
- Location: tests\e2e-fixed\vehicles-api.spec.ts:14:7

# Error details

```
Error: expect(received).toHaveProperty(path, value)

Expected path: "success"
Received path: []

Expected value: true
Received value: {"error": "Unknown action: ", "ok": false, "status": 400}
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | const API_BASE = 'https://script.google.com/macros/s/AKfycbwlIp823Km3GEcMhWip_cZSlZ9GRlf1HptIucXdvz2qI14vsn_3Zq_Z27QyblOOLdUuMQ/exec';
  4  | 
  5  | test.describe('Vehicle API Smoke Tests', () => {
  6  |   test('GET /vehicles?limit=5', async ({ request }) => {
  7  |     const res = await request.get(`${API_BASE}?limit=5`);
  8  |     expect(res.status()).toBe(200);
  9  |     const body = await res.json();
  10 |     console.log('GET response:', body);
  11 |     expect(body).toHaveProperty('success', true);
  12 |   });
  13 | 
  14 |   test('POST /vehicles (create)', async ({ request }) => {
  15 |     const payload = {
  16 |       category: 'Cars',
  17 |       brand: 'Test',
  18 |       model: 'AI Test',
  19 |       year: 2024,
  20 |       plate: 'AI-TEST-001',
  21 |       market_price: 100000
  22 |     };
  23 |     const res = await request.post(API_BASE, { data: payload });
  24 |     expect(res.status()).toBe(200);
  25 |     const body = await res.json();
  26 |     console.log('POST response:', body);
> 27 |     expect(body).toHaveProperty('success', true);
     |                  ^ Error: expect(received).toHaveProperty(path, value)
  28 |   });
  29 | });
  30 | 
  31 | 
```