#!/usr/bin/env node
/**
 * Thorough API Testing for User Management Endpoints
 * Tests all scenarios: happy paths, auth failures, validation errors, edge cases
 */

import { execSync } from 'child_process';

const BASE_URL = 'http://localhost:3000';
const TEST_RESULTS = [];

// Colors for output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

function log(message, color = RESET) {
  console.log(`${color}${message}${RESET}`);
}

async function makeRequest(method, endpoint, body = null, cookie = null) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
  };
  if (cookie) {
    headers['Cookie'] = cookie;
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    
    const responseBody = await response.json().catch(() => null);
    
    return {
      status: response.status,
      ok: response.ok,
      body: responseBody,
      headers: Object.fromEntries(response.headers.entries()),
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message,
      body: null,
    };
  }
}

// Test helper
function test(name, condition, expected, actual) {
  const passed = condition;
  TEST_RESULTS.push({ name, passed, expected, actual });
  
  if (passed) {
    log(`  ✓ ${name}`, GREEN);
  } else {
    log(`  ✗ ${name}`, RED);
    log(`    Expected: ${JSON.stringify(expected)}`, YELLOW);
    log(`    Actual: ${JSON.stringify(actual)}`, YELLOW);
  }
  
  return passed;
}

// ==================== TEST SUITE ====================

async function runTests() {
  log('\n========================================', BLUE);
  log('THOROUGH USER API TESTING', BLUE);
  log('========================================\n', BLUE);

  // First, we need to get a valid session cookie
  log('Step 1: Getting valid admin session...', BLUE);
  
  // Try to login to get a session
  const loginResponse = await makeRequest('POST', '/api/auth/login', {
    username: 'admin',
    password: '1234'
  });
  
  let adminCookie = null;
  if (loginResponse.ok && loginResponse.body?.ok) {
    // Extract cookie from response headers
    const setCookie = loginResponse.headers['set-cookie'];
    if (setCookie) {
      adminCookie = setCookie;
      log('  ✓ Admin login successful', GREEN);
    }
  }
  
  if (!adminCookie) {
    log('  ⚠ Could not get admin session, some tests will be skipped', YELLOW);
  }

  // ==================== GET /api/auth/users TESTS ====================
  log('\n--- GET /api/auth/users Tests ---\n', BLUE);

  // Test 1: Get users without authentication
  log('Test 1: GET without authentication', YELLOW);
  const getNoAuth = await makeRequest('GET', '/api/auth/users');
  test(
    'Should return 401 without session',
    getNoAuth.status === 401,
    401,
    getNoAuth.status
  );
  test(
    'Should have error message',
    getNoAuth.body?.error?.includes('session') || getNoAuth.body?.error?.includes('unauthorized'),
    'session/unauthorized error',
    getNoAuth.body?.error
  );

  // Test 2: Get users with valid admin session
  if (adminCookie) {
    log('\nTest 2: GET with valid admin session', YELLOW);
    const getWithAuth = await makeRequest('GET', '/api/auth/users', null, adminCookie);
    test(
      'Should return 200 with valid session',
      getWithAuth.status === 200,
      200,
      getWithAuth.status
    );
    test(
      'Should return ok: true',
      getWithAuth.body?.ok === true,
      true,
      getWithAuth.body?.ok
    );
    test(
      'Should have users array',
      Array.isArray(getWithAuth.body?.users),
      'array',
      typeof getWithAuth.body?.users
    );
    
    if (Array.isArray(getWithAuth.body?.users)) {
      test(
        'Users should have required fields',
        getWithAuth.body.users.every(u => u.username && u.role && u.createdAt),
        'all users have required fields',
        'some users missing fields'
      );
    }
  }

  // ==================== POST /api/auth/users TESTS ====================
  log('\n--- POST /api/auth/users Tests ---\n', BLUE);

  // Test 3: Create user without authentication
  log('Test 3: POST without authentication', YELLOW);
  const postNoAuth = await makeRequest('POST', '/api/auth/users', {
    username: 'testuser',
    password: 'password123',
    role: 'Staff'
  });
  test(
    'Should return 401 without session',
    postNoAuth.status === 401,
    401,
    postNoAuth.status
  );

  // Test 4: Create user with invalid JSON
  if (adminCookie) {
    log('\nTest 4: POST with invalid JSON', YELLOW);
    const postInvalidJson = await fetch(`${BASE_URL}/api/auth/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': adminCookie,
      },
      body: 'not valid json',
    });
    test(
      'Should return 400 for invalid JSON',
      postInvalidJson.status === 400,
      400,
      postInvalidJson.status
    );
  }

  // Test 5: Create user with missing fields
  if (adminCookie) {
    log('\nTest 5: POST with missing fields', YELLOW);
    const postMissingFields = await makeRequest('POST', '/api/auth/users', {}, adminCookie);
    test(
      'Should return 400 for missing fields',
      postMissingFields.status === 400,
      400,
      postMissingFields.status
    );
  }

  // Test 6: Create user with invalid username
  if (adminCookie) {
    log('\nTest 6: POST with invalid username', YELLOW);
    const postInvalidUsername = await makeRequest('POST', '/api/auth/users', {
      username: 'ab', // Too short
      password: 'password123',
      role: 'Staff'
    }, adminCookie);
    test(
      'Should return 400 for invalid username',
      postInvalidUsername.status === 400,
      400,
      postInvalidUsername.status
    );
    test(
      'Should have validation error code',
      postInvalidUsername.body?.code === 'invalid_username',
      'invalid_username',
      postInvalidUsername.body?.code
    );
  }

  // Test 7: Create user with invalid password
  if (adminCookie) {
    log('\nTest 7: POST with invalid password', YELLOW);
    const postInvalidPassword = await makeRequest('POST', '/api/auth/users', {
      username: 'validuser',
      password: '123', // Too short
      role: 'Staff'
    }, adminCookie);
    test(
      'Should return 400 for short password',
      postInvalidPassword.status === 400,
      400,
      postInvalidPassword.status
    );
    test(
      'Should have password error code',
      postInvalidPassword.body?.code === 'invalid_password',
      'invalid_password',
      postInvalidPassword.body?.code
    );
  }

  // Test 8: Create user with invalid role
  if (adminCookie) {
    log('\nTest 8: POST with invalid role', YELLOW);
    const postInvalidRole = await makeRequest('POST', '/api/auth/users', {
      username: 'validuser2',
      password: 'password123',
      role: 'InvalidRole'
    }, adminCookie);
    test(
      'Should return 400 for invalid role',
      postInvalidRole.status === 400,
      400,
      postInvalidRole.status
    );
  }

  // Test 9: Create duplicate user
  if (adminCookie) {
    log('\nTest 9: POST duplicate user', YELLOW);
    // First create a user
    const uniqueUsername = `testuser_${Date.now()}`;
    const postFirst = await makeRequest('POST', '/api/auth/users', {
      username: uniqueUsername,
      password: 'password123',
      role: 'Staff'
    }, adminCookie);
    
    if (postFirst.status === 201) {
      // Try to create the same user again
      const postDuplicate = await makeRequest('POST', '/api/auth/users', {
        username: uniqueUsername,
        password: 'password123',
        role: 'Staff'
      }, adminCookie);
      
      test(
        'Should return 409 for duplicate user',
        postDuplicate.status === 409,
        409,
        postDuplicate.status
      );
      test(
        'Should have already_exists code',
        postDuplicate.body?.code === 'already_exists',
        'already_exists',
        postDuplicate.body?.code
      );
    }
  }

  // Test 10: Create user with valid data
  if (adminCookie) {
    log('\nTest 10: POST with valid data', YELLOW);
    const uniqueUsername = `newuser_${Date.now()}`;
    const postValid = await makeRequest('POST', '/api/auth/users', {
      username: uniqueUsername,
      password: 'password123',
      role: 'Staff'
    }, adminCookie);
    
    test(
      'Should return 201 for successful creation',
      postValid.status === 201,
      201,
      postValid.status
    );
    test(
      'Should return user data',
      postValid.body?.user?.username === uniqueUsername,
      uniqueUsername,
      postValid.body?.user?.username
    );
    test(
      'Should not include password hash',
      !postValid.body?.user?.passwordHash,
      'no password hash',
      postValid.body?.user?.passwordHash ? 'has password hash' : 'no password hash'
    );
  }

  // ==================== DELETE /api/auth/users TESTS ====================
  log('\n--- DELETE /api/auth/users Tests ---\n', BLUE);

  // Test 11: Delete without authentication
  log('Test 11: DELETE without authentication', YELLOW);
  const deleteNoAuth = await makeRequest('DELETE', '/api/auth/users', {
    username: 'testuser'
  });
  test(
    'Should return 401 without session',
    deleteNoAuth.status === 401,
    401,
    deleteNoAuth.status
  );

  // Test 12: Delete with missing username
  if (adminCookie) {
    log('\nTest 12: DELETE with missing username', YELLOW);
    const deleteMissingUsername = await makeRequest('DELETE', '/api/auth/users', {}, adminCookie);
    test(
      'Should return 400 for missing username',
      deleteMissingUsername.status === 400,
      400,
      deleteMissingUsername.status
    );
  }

  // Test 13: Delete non-existent user
  if (adminCookie) {
    log('\nTest 13: DELETE non-existent user', YELLOW);
    const deleteNonExistent = await makeRequest('DELETE', '/api/auth/users', {
      username: 'nonexistentuser12345'
    }, adminCookie);
    test(
      'Should return 404 for non-existent user',
      deleteNonExistent.status === 404,
      404,
      deleteNonExistent.status
    );
    test(
      'Should have not_found code',
      deleteNonExistent.body?.code === 'not_found',
      'not_found',
      deleteNonExistent.body?.code
    );
  }

  // Test 14: Self-delete attempt
  if (adminCookie) {
    log('\nTest 14: DELETE self-delete attempt', YELLOW);
    const deleteSelf = await makeRequest('DELETE', '/api/auth/users', {
      username: 'admin' // Assuming admin is the current user
    }, adminCookie);
    test(
      'Should return 403 for self-delete',
      deleteSelf.status === 403,
      403,
      deleteSelf.status
    );
    test(
      'Should have self_delete_forbidden code',
      deleteSelf.body?.code === 'self_delete_forbidden',
      'self_delete_forbidden',
      deleteSelf.body?.code
    );
  }

  // Test 15: Delete with valid data
  if (adminCookie) {
    log('\nTest 15: DELETE with valid data', YELLOW);
    // First create a user to delete
    const userToDelete = `deleteme_${Date.now()}`;
    const createForDelete = await makeRequest('POST', '/api/auth/users', {
      username: userToDelete,
      password: 'password123',
      role: 'Staff'
    }, adminCookie);
    
    if (createForDelete.status === 201) {
      const deleteValid = await makeRequest('DELETE', '/api/auth/users', {
        username: userToDelete
      }, adminCookie);
      
      test(
        'Should return 200 for successful deletion',
        deleteValid.status === 200,
        200,
        deleteValid.status
      );
      test(
        'Should return deleted user data',
        deleteValid.body?.user?.username === userToDelete,
        userToDelete,
        deleteValid.body?.user?.username
      );
    }
  }

  // ==================== SECURITY TESTS ====================
  log('\n--- Security Tests ---\n', BLUE);

  // Test 16: SQL Injection attempt in username
  if (adminCookie) {
    log('Test 16: SQL Injection attempt', YELLOW);
    const sqlInjection = await makeRequest('POST', '/api/auth/users', {
      username: "user'; DROP TABLE users; --",
      password: 'password123',
      role: 'Staff'
    }, adminCookie);
    
    test(
      'Should reject SQL injection in username',
      sqlInjection.status === 400 || sqlInjection.body?.code === 'invalid_username',
      '400 or invalid_username',
      `${sqlInjection.status} - ${sqlInjection.body?.code}`
    );
  }

  // Test 17: XSS attempt in username
  if (adminCookie) {
    log('\nTest 17: XSS attempt in username', YELLOW);
    const xssAttempt = await makeRequest('POST', '/api/auth/users', {
      username: '<script>alert("xss")</script>',
      password: 'password123',
      role: 'Staff'
    }, adminCookie);
    
    test(
      'Should reject XSS in username',
      xssAttempt.status === 400 || xssAttempt.body?.code === 'invalid_username',
      '400 or invalid_username',
      `${xssAttempt.status} - ${xssAttempt.body?.code}`
    );
  }

  // Test 18: Very long username
  if (adminCookie) {
    log('\nTest 18: Very long username', YELLOW);
    const longUsername = 'a'.repeat(100);
    const longUsernameTest = await makeRequest('POST', '/api/auth/users', {
      username: longUsername,
      password: 'password123',
      role: 'Staff'
    }, adminCookie);
    
    test(
      'Should reject username > 32 chars',
      longUsernameTest.status === 400,
      400,
      longUsernameTest.status
    );
  }

  // Test 19: Response headers security
  if (adminCookie) {
    log('\nTest 19: Security headers check', YELLOW);
    const headersCheck = await makeRequest('GET', '/api/auth/users', null, adminCookie);
    
    test(
      'Should have X-Content-Type-Options: nosniff',
      headersCheck.headers['x-content-type-options'] === 'nosniff',
      'nosniff',
      headersCheck.headers['x-content-type-options']
    );
    test(
      'Should have X-Frame-Options: DENY',
      headersCheck.headers['x-frame-options'] === 'DENY',
      'DENY',
      headersCheck.headers['x-frame-options']
    );
  }

  // ==================== SUMMARY ====================
  log('\n========================================', BLUE);
  log('TEST SUMMARY', BLUE);
  log('========================================\n', BLUE);

  const passed = TEST_RESULTS.filter(r => r.passed).length;
  const failed = TEST_RESULTS.filter(r => !r.passed).length;
  const total = TEST_RESULTS.length;

  log(`Total Tests: ${total}`, BLUE);
  log(`Passed: ${passed}`, GREEN);
  log(`Failed: ${failed}`, failed > 0 ? RED : GREEN);

  if (failed > 0) {
    log('\nFailed Tests:', RED);
    TEST_RESULTS.filter(r => !r.passed).forEach(r => {
      log(`  - ${r.name}`, RED);
    });
  }

  log('\n========================================\n', BLUE);

  // Return exit code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  log(`\nTest runner error: ${error.message}`, RED);
  process.exit(1);
});
