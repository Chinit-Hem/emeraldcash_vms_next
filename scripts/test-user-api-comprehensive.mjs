/**
 * Comprehensive User Management API Testing
 * Tests all endpoints with happy paths and error scenarios
 */

const BASE_URL = 'http://localhost:3000';
const TEST_RESULTS = [];

// Helper to make requests
async function makeRequest(method, endpoint, body = null, cookies = '') {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookies && { 'Cookie': cookies })
    },
    ...(body && { body: JSON.stringify(body) })
  };
  
  try {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => null);
    return {
      status: res.status,
      ok: res.ok,
      data,
      headers: Object.fromEntries(res.headers.entries())
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message,
      data: null
    };
  }
}

// Helper to log results
function logTest(name, result, expected) {
  const passed = result.status === expected;
  const status = passed ? '✅ PASS' : '❌ FAIL';
  TEST_RESULTS.push({ name, status: result.status, expected, passed });
  console.log(`${status} | ${name} | Status: ${result.status} (Expected: ${expected})`);
  if (!passed && result.data) {
    console.log('   Response:', JSON.stringify(result.data, null, 2));
  }
  return passed;
}

// Test 1: Login to get session cookies
async function testLogin() {
  console.log('\n🔐 TEST 1: Authentication');
  console.log('==========================');
  
  // Admin login
  const adminRes = await makeRequest('POST', '/api/auth/login', {
    username: 'admin',
    password: '1234'
  });
  logTest('Admin login', adminRes, 200);
  
  // Staff login
  const staffRes = await makeRequest('POST', '/api/auth/login', {
    username: 'staff',
    password: '1234'
  });
  logTest('Staff login', staffRes, 200);
  
  // Invalid credentials
  const invalidRes = await makeRequest('POST', '/api/auth/login', {
    username: 'admin',
    password: 'wrongpassword'
  });
  logTest('Invalid credentials', invalidRes, 401);
  
  return {
    adminCookies: adminRes.headers['set-cookie'] || '',
    staffCookies: staffRes.headers['set-cookie'] || ''
  };
}

// Test 2: GET /api/auth/users - Authorization tests
async function testGetUsers(adminCookies, staffCookies) {
  console.log('\n📋 TEST 2: GET /api/auth/users');
  console.log('=================================');
  
  // Without auth
  const noAuthRes = await makeRequest('GET', '/api/auth/users');
  logTest('No authentication', noAuthRes, 401);
  
  // With staff role (should be 403)
  const staffRes = await makeRequest('GET', '/api/auth/users', null, staffCookies);
  logTest('Staff role (forbidden)', staffRes, 403);
  
  // With admin role (should be 200)
  const adminRes = await makeRequest('GET', '/api/auth/users', null, adminCookies);
  logTest('Admin role (success)', adminRes, 200);
  
  if (adminRes.ok && adminRes.data) {
    console.log(`   Found ${adminRes.data.users?.length || 0} users`);
  }
}

// Test 3: POST /api/auth/users - Create user tests
async function testCreateUser(adminCookies, staffCookies) {
  console.log('\n➕ TEST 3: POST /api/auth/users');
  console.log('=================================');
  
  const timestamp = Date.now();
  
  // Without auth
  const noAuthRes = await makeRequest('POST', '/api/auth/users', {
    username: 'testuser',
    password: 'password123',
    role: 'Staff'
  });
  logTest('No authentication', noAuthRes, 401);
  
  // With staff role (should be 403)
  const staffRes = await makeRequest('POST', '/api/auth/users', {
    username: 'testuser',
    password: 'password123',
    role: 'Staff'
  }, staffCookies);
  logTest('Staff role (forbidden)', staffRes, 403);
  
  // Invalid input - empty username
  const emptyUsernameRes = await makeRequest('POST', '/api/auth/users', {
    username: '',
    password: 'password123',
    role: 'Staff'
  }, adminCookies);
  logTest('Empty username (validation)', emptyUsernameRes, 400);
  
  // Invalid input - short password
  const shortPasswordRes = await makeRequest('POST', '/api/auth/users', {
    username: 'testuser',
    password: '123',
    role: 'Staff'
  }, adminCookies);
  logTest('Short password (validation)', shortPasswordRes, 400);
  
  // Invalid input - invalid role
  const invalidRoleRes = await makeRequest('POST', '/api/auth/users', {
    username: 'testuser',
    password: 'password123',
    role: 'InvalidRole'
  }, adminCookies);
  logTest('Invalid role (validation)', invalidRoleRes, 400);
  
  // Invalid input - invalid username format
  const invalidUsernameRes = await makeRequest('POST', '/api/auth/users', {
    username: 'test@user!',
    password: 'password123',
    role: 'Staff'
  }, adminCookies);
  logTest('Invalid username format', invalidUsernameRes, 400);
  
  // Success - create user
  const successRes = await makeRequest('POST', '/api/auth/users', {
    username: `testuser${timestamp}`,
    password: 'password123',
    role: 'Staff'
  }, adminCookies);
  logTest('Create user success', successRes, 201);
  
  // Duplicate user
  const duplicateRes = await makeRequest('POST', '/api/auth/users', {
    username: `testuser${timestamp}`,
    password: 'password123',
    role: 'Staff'
  }, adminCookies);
  logTest('Duplicate user (conflict)', duplicateRes, 409);
  
  return successRes.ok ? `testuser${timestamp}` : null;
}

// Test 4: DELETE /api/auth/users - Delete user tests
async function testDeleteUser(adminCookies, createdUsername) {
  console.log('\n🗑️  TEST 4: DELETE /api/auth/users');
  console.log('====================================');
  
  if (!createdUsername) {
    console.log('   ⚠️ Skipping - no user was created');
    return;
  }
  
  // Delete without auth
  const noAuthRes = await makeRequest('DELETE', '/api/auth/users', {
    username: createdUsername
  });
  logTest('No authentication', noAuthRes, 401);
  
  // Delete non-existent user
  const notFoundRes = await makeRequest('DELETE', '/api/auth/users', {
    username: 'nonexistentuser12345'
  }, adminCookies);
  logTest('Non-existent user (not found)', notFoundRes, 404);
  
  // Self-delete attempt
  const selfDeleteRes = await makeRequest('DELETE', '/api/auth/users', {
    username: 'admin'
  }, adminCookies);
  logTest('Self-delete (forbidden)', selfDeleteRes, 400);
  
  // Success - delete created user
  const successRes = await makeRequest('DELETE', '/api/auth/users', {
    username: createdUsername
  }, adminCookies);
  logTest('Delete user success', successRes, 200);
}

// Test 5: Verify structured logging
async function testLogging() {
  console.log('\n📝 TEST 5: Structured Logging Verification');
  console.log('===========================================');
  console.log('   Check server logs for [INFO], [ERROR], [DEBUG] prefixes');
  console.log('   with timestamps and [USER_DB], [USER_STORE], [API_USERS] tags');
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting Comprehensive User API Tests');
  console.log('========================================');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Time: ${new Date().toISOString()}`);
  
  try {
    const { adminCookies, staffCookies } = await testLogin();
    await testGetUsers(adminCookies, staffCookies);
    const createdUsername = await testCreateUser(adminCookies, staffCookies);
    await testDeleteUser(adminCookies, createdUsername);
    await testLogging();
    
    // Summary
    console.log('\n📊 TEST SUMMARY');
    console.log('================');
    const passed = TEST_RESULTS.filter(r => r.passed).length;
    const failed = TEST_RESULTS.filter(r => !r.passed).length;
    console.log(`Total: ${TEST_RESULTS.length}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      TEST_RESULTS.filter(r => !r.passed).forEach(r => {
        console.log(`   - ${r.name} (Got ${r.status}, Expected ${r.expected})`);
      });
    }
    
    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n💥 Test suite failed:', error.message);
    process.exit(1);
  }
}

runTests();
