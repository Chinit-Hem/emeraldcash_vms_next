// Test script to verify API meta response
import http from 'http';

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/vehicles?noCache=1',
  method: 'GET',
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('API Response:');
      console.log('success:', json.success);
      console.log('meta:', JSON.stringify(json.meta, null, 2));
      
      if (json.meta?.countsByCategory) {
        console.log('\n✅ Category counts found:');
        console.log('  Cars:', json.meta.countsByCategory.Cars);
        console.log('  Motorcycles:', json.meta.countsByCategory.Motorcycles);
        console.log('  TukTuks:', json.meta.countsByCategory.TukTuks);
      } else {
        console.log('\n❌ No category counts in meta');
      }
    } catch (e) {
      console.error('Error parsing response:', e.message);
      console.log('Raw response:', data.substring(0, 500));
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
});

req.end();
