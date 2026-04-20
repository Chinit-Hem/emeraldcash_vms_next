/**
 * Validation testing with properly signed sessions
 * Uses the same crypto logic as the auth system
 * 
 * IMPORTANT: This test requires the server to use the same SESSION_SECRET
 * Run the server with: SESSION_SECRET=test-secret-for-validation npm run dev
 */

import crypto from 'crypto';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
// Use a fixed secret that matches what the server should use
const SESSION_SECRET = "test-secret-for-validation-64-characters-long-for-hmac-sha256";


// Session configuration (must match auth.ts)
const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8 hours
const SESSION_VERSION = 1;

// Helper functions (matching auth.ts implementation)
function base64UrlEncode(input) {
  return Buffer.from(input, 'utf8')
    .toString('base64')
    .replaceAll('=', '')
    .replaceAll('+', '-')
    .replaceAll('/', '_');
}

function sign(encodedPayload, secret) {
  const digest = crypto.createHmac('sha256', secret).update(encodedPayload).digest();
  return digest
    .toString('base64')
    .replaceAll('=', '')
    .replaceAll('+', '-')
    .replaceAll('/', '_');
}

function getRequestFingerprint() {
  // Static fingerprint (matching auth.ts mobile fix)
  const data = `ec-vms-static|v${SESSION_VERSION}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

function createSessionCookie(username, role = 'Admin') {
  const payload = {
    username,
    role,
    ts: Date.now(),
    version: SESSION_VERSION,
    fingerprint: getRequestFingerprint(),
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload, SESSION_SECRET);
  return `${encodedPayload}.${signature}`;
}

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, status, details = '') {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`   ${icon} ${name}`);
  if (details) console.log(`      ${details}`);
  results.tests.push({ name, status, details });
  if (status === 'PASS') results.passed++;
  else if (status === 'FAIL') results.failed++;
}

async function runTests() {
  console.log('🧪 Validation Testing with Signed Sessions\n');
  console.log('=' .repeat(60));
  
  // Create admin session with proper signature
  const sessionCookie = createSessionCookie('admin', 'Admin');
  const authHeaders = {
    'Content-Type': 'application/json',
    'Cookie': `session=${sessionCookie}`
  };

  console.log('\n📋 Using signed session cookie for authentication');
  console.log(`   Cookie length: ${sessionCookie.length} chars`);
  console.log(`   Secret: ${SESSION_SECRET.substring(0, 10)}...`);

  // Test 1: POST /api/vehicles-db - Missing VehicleId
  console.log('\n📌 Test 1: POST /api/vehicles-db without VehicleId');
  try {
    const response = await fetch(`${BASE_URL}/api/vehicles-db`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        category: 'Cars',
        brand: 'Toyota',
        model: 'Camry'
      }),
    });
    
    const data = await response.json();
    if (response.status === 400 && data.error && data.error.includes('VehicleId')) {
      logTest('Missing VehicleId rejected', 'PASS', `Status: ${response.status}, Error: "${data.error}"`);
    } else {
      logTest('Missing VehicleId rejected', 'FAIL', `Expected 400 with VehicleId error, got ${response.status}: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    logTest('Missing VehicleId rejected', 'FAIL', `Error: ${error.message}`);
  }

  // Test 2: POST /api/vehicles-db - Missing Category
  console.log('\n📌 Test 2: POST /api/vehicles-db without Category');
  try {
    const response = await fetch(`${BASE_URL}/api/vehicles-db`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        vehicle_id: 'VEH_001',
        brand: 'Toyota',
        model: 'Camry'
      }),
    });
    
    const data = await response.json();
    if (response.status === 400 && data.error && data.error.includes('Category')) {
      logTest('Missing Category rejected', 'PASS', `Status: ${response.status}, Error: "${data.error}"`);
    } else {
      logTest('Missing Category rejected', 'FAIL', `Expected 400 with Category error, got ${response.status}: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    logTest('Missing Category rejected', 'FAIL', `Error: ${error.message}`);
  }

  // Test 3: POST /api/vehicles-db - Missing Brand
  console.log('\n📌 Test 3: POST /api/vehicles-db without Brand');
  try {
    const response = await fetch(`${BASE_URL}/api/vehicles-db`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        vehicle_id: 'VEH_001',
        category: 'Cars',
        model: 'Camry'
      }),
    });
    
    const data = await response.json();
    if (response.status === 400 && data.error && data.error.includes('Brand')) {
      logTest('Missing Brand rejected', 'PASS', `Status: ${response.status}, Error: "${data.error}"`);
    } else {
      logTest('Missing Brand rejected', 'FAIL', `Expected 400 with Brand error, got ${response.status}: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    logTest('Missing Brand rejected', 'FAIL', `Error: ${error.message}`);
  }

  // Test 4: POST /api/vehicles-db - Missing Model
  console.log('\n📌 Test 4: POST /api/vehicles-db without Model');
  try {
    const response = await fetch(`${BASE_URL}/api/vehicles-db`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        vehicle_id: 'VEH_001',
        category: 'Cars',
        brand: 'Toyota'
      }),
    });
    
    const data = await response.json();
    if (response.status === 400 && data.error && data.error.includes('Model')) {
      logTest('Missing Model rejected', 'PASS', `Status: ${response.status}, Error: "${data.error}"`);
    } else {
      logTest('Missing Model rejected', 'FAIL', `Expected 400 with Model error, got ${response.status}: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    logTest('Missing Model rejected', 'FAIL', `Error: ${error.message}`);
  }

  // Test 5: POST /api/vehicles-db - Empty VehicleId
  console.log('\n📌 Test 5: POST /api/vehicles-db with empty VehicleId');
  try {
    const response = await fetch(`${BASE_URL}/api/vehicles-db`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        vehicle_id: '',
        category: 'Cars',
        brand: 'Toyota',
        model: 'Camry'
      }),
    });
    
    const data = await response.json();
    if (response.status === 400) {
      logTest('Empty VehicleId rejected', 'PASS', `Status: ${response.status}, Error: "${data.error}"`);
    } else {
      logTest('Empty VehicleId rejected', 'FAIL', `Expected 400, got ${response.status}: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    logTest('Empty VehicleId rejected', 'FAIL', `Error: ${error.message}`);
  }

  // Test 6: POST /api/vehicles-db - All required fields present
  console.log('\n📌 Test 6: POST /api/vehicles-db with all required fields');
  const testVehicleId = `VEH_TEST_${Date.now()}`;
  try {
    const response = await fetch(`${BASE_URL}/api/vehicles-db`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        vehicle_id: testVehicleId,
        category: 'Cars',
        brand: 'Toyota',
        model: 'Camry',
        year: 2023
      }),
    });
    
    const data = await response.json();
    if (response.status === 201 || response.status === 200) {
      logTest('All required fields accepted', 'PASS', `Status: ${response.status}, Vehicle created: ${testVehicleId}`);
      results.createdVehicleId = testVehicleId;
    } else {
      logTest('All required fields accepted', 'FAIL', `Expected 201/200, got ${response.status}: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    logTest('All required fields accepted', 'FAIL', `Error: ${error.message}`);
  }

  // Test 7: PUT /api/vehicles/[id] - Missing Category
  console.log('\n📌 Test 7: PUT /api/vehicles/[id] without Category');
  try {
    const response = await fetch(`${BASE_URL}/api/vehicles/VEH_001`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        Brand: 'Toyota',
        Model: 'Camry'
      }),
    });
    
    const data = await response.json();
    if (response.status === 400 && data.error && data.error.includes('Category')) {
      logTest('PUT missing Category rejected', 'PASS', `Status: ${response.status}, Error: "${data.error}"`);
    } else {
      logTest('PUT missing Category rejected', 'FAIL', `Expected 400 with Category error, got ${response.status}: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    logTest('PUT missing Category rejected', 'FAIL', `Error: ${error.message}`);
  }

  // Test 8: PUT /api/vehicles/[id] - Missing Brand
  console.log('\n📌 Test 8: PUT /api/vehicles/[id] without Brand');
  try {
    const response = await fetch(`${BASE_URL}/api/vehicles/VEH_001`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        Category: 'Cars',
        Model: 'Camry'
      }),
    });
    
    const data = await response.json();
    if (response.status === 400 && data.error && data.error.includes('Brand')) {
      logTest('PUT missing Brand rejected', 'PASS', `Status: ${response.status}, Error: "${data.error}"`);
    } else {
      logTest('PUT missing Brand rejected', 'FAIL', `Expected 400 with Brand error, got ${response.status}: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    logTest('PUT missing Brand rejected', 'FAIL', `Error: ${error.message}`);
  }

  // Test 9: PUT /api/vehicles/[id] - Missing Model
  console.log('\n📌 Test 9: PUT /api/vehicles/[id] without Model');
  try {
    const response = await fetch(`${BASE_URL}/api/vehicles/VEH_001`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        Category: 'Cars',
        Brand: 'Toyota'
      }),
    });
    
    const data = await response.json();
    if (response.status === 400 && data.error && data.error.includes('Model')) {
      logTest('PUT missing Model rejected', 'PASS', `Status: ${response.status}, Error: "${data.error}"`);
    } else {
      logTest('PUT missing Model rejected', 'FAIL', `Expected 400 with Model error, got ${response.status}: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    logTest('PUT missing Model rejected', 'FAIL', `Error: ${error.message}`);
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`   ✅ Passed: ${results.passed}`);
  console.log(`   ❌ Failed: ${results.failed}`);
  console.log(`   📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  
  if (results.failed === 0) {
    console.log('\n🎉 All validation tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed. Review the details above.');
  }

  // Cleanup
  if (results.createdVehicleId) {
    console.log(`\n🧹 Cleaning up test vehicle: ${results.createdVehicleId}`);
    try {
      await fetch(`${BASE_URL}/api/vehicles-db?id=${results.createdVehicleId}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      console.log('   ✅ Test vehicle cleaned up');
    } catch (e) {
      console.log('   ⚠️  Could not clean up test vehicle');
    }
  }

  return results.failed === 0;
}

runTests().then(success => {
  process.exit(success ? 0 : 1);
});
