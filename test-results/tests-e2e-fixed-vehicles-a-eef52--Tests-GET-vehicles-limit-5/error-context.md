# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\e2e-fixed\vehicles-api.spec.ts >> Vehicle API Smoke Tests >> GET /vehicles?limit=5
- Location: tests\e2e-fixed\vehicles-api.spec.ts:6:7

# Error details

```
Error: expect(received).toHaveProperty(path, value)

Expected path: "success"
Received path: []

Expected value: true
Received value: {"data": [{"BodyType": "", "Brand": "Honda", "Category": "Motorcycle", "Color": "Black", "Condition": "Used", "Image": "https://drive.google.com/thumbnail?id=1fOnQI-z0Id9N-CDSGBqlg9rt6kFNvixI&sz=w1000-h1000", "ImageFileId": "1fOnQI-z0Id9N-CDSGBqlg9rt6kFNvixI", "ImageThumb": "https://drive.google.com/thumbnail?id=1fOnQI-z0Id9N-CDSGBqlg9rt6kFNvixI&sz=w100-h100", "Model": "Dream", "Plate": "1JU-5517", "Price40": 740, "Price70": 1295, "PriceNew": 1850, "TaxType": "", "Time": "2025-12-18 13:38:58", "VehicleId": "1", "Year": 2023}, {"BodyType": "", "Brand": "Honda", "Category": "Motorcycle", "Color": "Black", "Condition": "Used", "Image": "https://drive.google.com/thumbnail?id=1pgGY1bUiPP0s7bAIxuDJTyGkGUonFwA5&sz=w1000-h1000", "ImageFileId": "1pgGY1bUiPP0s7bAIxuDJTyGkGUonFwA5", "ImageThumb": "https://drive.google.com/thumbnail?id=1pgGY1bUiPP0s7bAIxuDJTyGkGUonFwA5&sz=w100-h100", "Model": "Dream", "Plate": "1JF-5754", "Price40": 792, "Price70": 1386, "PriceNew": 1980, "TaxType": "", "Time": "2025-12-18 13:31:22", "VehicleId": "2", "Year": 2021}, {"BodyType": "", "Brand": "TOYOTA", "Category": "Car", "Color": "ទឹកមាស", "Condition": "Used", "Image": "https://drive.google.com/thumbnail?id=1iU7FLMB4KxvHHDZJQeRYZNukkwaNAeiT&sz=w1000-h1000", "ImageFileId": "1iU7FLMB4KxvHHDZJQeRYZNukkwaNAeiT", "ImageThumb": "https://drive.google.com/thumbnail?id=1iU7FLMB4KxvHHDZJQeRYZNukkwaNAeiT&sz=w100-h100", "Model": "CAMRY", "Plate": "PP 2AZ-2707", "Price40": 4940, "Price70": 8645, "PriceNew": 12350, "TaxType": "", "Time": "2025-12-18 13:39:30", "VehicleId": "3", "Year": 2002}, {"BodyType": "", "Brand": "TOYOTA", "Category": "Car", "Color": "ទឹកប្រាក់", "Condition": "Used", "Image": "https://drive.google.com/thumbnail?id=1YEPf1gzkoTGkxf4cByIUHnDtlF0MflVa&sz=w1000-h1000", "ImageFileId": "1YEPf1gzkoTGkxf4cByIUHnDtlF0MflVa", "ImageThumb": "https://drive.google.com/thumbnail?id=1YEPf1gzkoTGkxf4cByIUHnDtlF0MflVa&sz=w100-h100", "Model": "CAMRY", "Plate": "PP 2AO-6096", "Price40": 4200, "Price70": 7350, "PriceNew": 10500, "TaxType": "", "Time": "2025-12-18 13:40:19", "VehicleId": "4", "Year": 2002}, {"BodyType": "", "Brand": "Honda", "Category": "Motorcycle", "Color": "Black", "Condition": "Used", "Image": "https://drive.google.com/thumbnail?id=18wVDiMv5JxFmGCrdBPhFwrpXTWxaYYd_&sz=w1000-h1000", "ImageFileId": "18wVDiMv5JxFmGCrdBPhFwrpXTWxaYYd_", "ImageThumb": "https://drive.google.com/thumbnail?id=18wVDiMv5JxFmGCrdBPhFwrpXTWxaYYd_&sz=w100-h100", "Model": "Dream", "Plate": "1JS-4497", "Price40": 938, "Price70": 1641.5, "PriceNew": 2345, "TaxType": "", "Time": "2025-12-18 13:41:01", "VehicleId": "5", "Year": 2022}], "meta": {"filters": {"brand": "", "category": "", "condition": "", "priceMax": null, "priceMin": null, "q": "", "yearMax": null, "yearMin": null}, "limit": 5, "offset": 0, "total": 1190}, "ok": true, "status": 200}
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
> 11 |     expect(body).toHaveProperty('success', true);
     |                  ^ Error: expect(received).toHaveProperty(path, value)
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
  27 |     expect(body).toHaveProperty('success', true);
  28 |   });
  29 | });
  30 | 
  31 | 
```