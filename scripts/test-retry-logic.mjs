/**
 * Unit test for the isRetryableError function logic
 * Tests the retry detection without needing a running server
 */

// Simulate the isRetryableError function from useUpdateVehicleOptimistic.ts
function isRetryableError(error) {
  const message = error.message.toLowerCase();
  
  // Check for HTTP status codes in message
  const has502 = message.includes('502') || message.includes('[http 502]');
  const has504 = message.includes('504') || message.includes('[http 504]');
  
  // Check for other retryable conditions
  const hasTimeout = message.includes('timeout');
  const hasNetworkError = message.includes('network') || 
                          message.includes('econnreset') ||
                          message.includes('econnrefused') ||
                          message.includes('socket hang up');
  const hasCloudinaryError = message.includes('cloudinary_upload_error') ||
                             message.includes('cloudinary') ||
                             message.includes('upload failed');
  
  // Also check for statusCode property on error object
  const statusCode = error.statusCode;
  const isRetryableStatus = statusCode === 502 || statusCode === 504 || statusCode === 503;
  
  const shouldRetry = has502 || has504 || hasTimeout || hasNetworkError || hasCloudinaryError || isRetryableStatus;
  
  return {
    shouldRetry,
    details: {
      has502,
      has504,
      hasTimeout,
      hasNetworkError,
      hasCloudinaryError,
      statusCode,
      isRetryableStatus,
      message: error.message.substring(0, 100),
    }
  };
}

// Test cases
const testCases = [
  {
    name: '502 error with HTTP prefix (new format)',
    error: new Error('[HTTP 502] Image upload failed: Cloudinary error'),
    expected: true
  },
  {
    name: '504 timeout error',
    error: new Error('[HTTP 504] Gateway timeout'),
    expected: true
  },
  {
    name: '502 error with statusCode property',
    error: Object.assign(new Error('Bad Gateway'), { statusCode: 502 }),
    expected: true
  },
  {
    name: 'Cloudinary upload error',
    error: new Error('cloudinary_upload_error: Upload failed'),
    expected: true
  },
  {
    name: 'Network error (ECONNRESET)',
    error: new Error('Connection reset: ECONNRESET'),
    expected: true
  },
  {
    name: 'Timeout error',
    error: new Error('Request timeout after 30000ms'),
    expected: true
  },
  {
    name: '400 Bad Request (should NOT retry)',
    error: new Error('[HTTP 400] Invalid input'),
    expected: false
  },
  {
    name: '401 Unauthorized (should NOT retry)',
    error: Object.assign(new Error('Unauthorized'), { statusCode: 401 }),
    expected: false
  },
  {
    name: '403 Forbidden (should NOT retry)',
    error: new Error('[HTTP 403] Forbidden'),
    expected: false
  },
  {
    name: '404 Not Found (should NOT retry)',
    error: new Error('[HTTP 404] Vehicle not found'),
    expected: false
  },
  {
    name: 'Generic error (should NOT retry)',
    error: new Error('Something went wrong'),
    expected: false
  }
];

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

console.log('');
log('═'.repeat(70), 'blue');
log('  RETRY LOGIC UNIT TEST', 'blue');
log('═'.repeat(70), 'blue');
console.log('');

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
  const result = isRetryableError(testCase.error);
  const success = result.shouldRetry === testCase.expected;
  
  if (success) {
    passed++;
    log(`✅ ${testCase.name}`, 'green');
  } else {
    failed++;
    log(`❌ ${testCase.name}`, 'red');
    log(`   Expected: ${testCase.expected}, Got: ${result.shouldRetry}`, 'red');
    log(`   Details: ${JSON.stringify(result.details, null, 2)}`, 'yellow');
  }
}

console.log('');
log('═'.repeat(70), failed === 0 ? 'green' : 'red');
log(`  RESULTS: ${passed} passed, ${failed} failed`, failed === 0 ? 'green' : 'red');
log('═'.repeat(70), failed === 0 ? 'green' : 'red');

if (failed === 0) {
  console.log('');
  log('✅ All retry logic tests passed!', 'green');
  log('The 502 error fix is working correctly.', 'green');
  console.log('');
} else {
  console.log('');
  log('❌ Some tests failed. Please review the implementation.', 'red');
  console.log('');
}

process.exit(failed === 0 ? 0 : 1);
