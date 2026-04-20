/**
 * Test the vehicles API endpoint directly
 */

const API_URL = 'http://localhost:3000';

async function testVehiclesAPI() {
  console.log('Testing Vehicles API...\n');
  
  const testCases = [
    { name: 'Basic fetch', url: '/api/vehicles' },
    { name: 'With noCache', url: '/api/vehicles?noCache=1' },
    { name: 'With category filter', url: '/api/vehicles?noCache=1&category=Cars' },
    { name: 'With limit', url: '/api/vehicles?noCache=1&category=Cars&limit=100' },
  ];
  
  for (const testCase of testCases) {
    console.log(`\n--- Test: ${testCase.name} ---`);
    console.log(`URL: ${API_URL}${testCase.url}`);
    
    try {
      const response = await fetch(`${API_URL}${testCase.url}`);
      const data = await response.json();
      
      console.log(`Status: ${response.status}`);
      console.log(`Success: ${data.success}`);
      
      if (!data.success) {
        console.error(`Error: ${data.error}`);
      } else {
        console.log(`Data count: ${data.data?.length || 0}`);
        console.log(`Meta:`, data.meta);
      }
    } catch (error) {
      console.error(`Fetch error: ${error.message}`);
    }
  }
}

// Run tests
testVehiclesAPI().catch(console.error);
