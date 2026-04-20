// Test the API PUT endpoint directly
import http from 'http';

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/vehicles/862',
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Cookie': 'session=test-session' // Add a test session cookie
  }
};

const testData = JSON.stringify({
  Category: 'Car',
  Brand: 'Test Brand',
  Model: 'Test Model',
  Year: 2020,
  Plate: 'TEST-123',
  market_price: 15000
});

console.log('Testing PUT /api/vehicles/862...\n');

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers, null, 2)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\nResponse Body:');
    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error.message);
});

req.write(testData);
req.end();
