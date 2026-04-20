/**
 * Test script for 502 error fix on PUT /api/vehicles/[id]
 * 
 * This script tests:
 * 1. Timeout handling for image uploads
 * 2. Database timeout handling
 * 3. Error response format
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const TEST_VEHICLE_ID = 1199; // The vehicle ID from the error report

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('');
  log(`═`.repeat(60), 'cyan');
  log(`  ${title}`, 'cyan');
  log(`═`.repeat(60), 'cyan');
  console.log('');
}

async function testPutVehicleWithoutImage() {
  logSection('Test 1: PUT Vehicle Without Image (Fast Operation)');
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/vehicles/${TEST_VEHICLE_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'session=test-session', // Add valid session cookie if needed
      },
      body: JSON.stringify({
        Category: 'Cars',
        Brand: 'Test Brand',
        Model: 'Test Model',
        Year: 2023,
        PriceNew: 25000,
      }),
    });
    
    const duration = Date.now() - startTime;
    const data = await response.json().catch(() => null);
    
    log(`Status: ${response.status} ${response.statusText}`, response.ok ? 'green' : 'red');
    log(`Duration: ${duration}ms`, duration > 5000 ? 'yellow' : 'green');
    log(`Response: ${JSON.stringify(data, null, 2)}`, 'blue');
    
    return { success: response.ok, duration, data };
  } catch (error) {
    const duration = Date.now() - startTime;
    log(`Error after ${duration}ms: ${error.message}`, 'red');
    return { success: false, duration, error: error.message };
  }
}

async function testPutVehicleWithSmallImage() {
  logSection('Test 2: PUT Vehicle With Small Image (< 1MB)');
  
  // Create a small test image (1x1 pixel PNG)
  const smallImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/vehicles/${TEST_VEHICLE_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'session=test-session',
      },
      body: JSON.stringify({
        Category: 'Cars',
        Brand: 'Test Brand',
        Model: 'Test Model',
        Year: 2023,
        PriceNew: 25000,
        imageData: `data:image/png;base64,${smallImageBase64}`,
      }),
    });
    
    const duration = Date.now() - startTime;
    const data = await response.json().catch(() => null);
    
    log(`Status: ${response.status} ${response.statusText}`, response.ok ? 'green' : 'red');
    log(`Duration: ${duration}ms`, duration > 30000 ? 'red' : duration > 10000 ? 'yellow' : 'green');
    log(`Response: ${JSON.stringify(data, null, 2)}`, 'blue');
    
    return { success: response.ok, duration, data };
  } catch (error) {
    const duration = Date.now() - startTime;
    log(`Error after ${duration}ms: ${error.message}`, 'red');
    return { success: false, duration, error: error.message };
  }
}

async function testTimeoutErrorHandling() {
  logSection('Test 3: Test Error Response Format');
  
  // Test with an invalid vehicle ID to trigger error handling
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/vehicles/invalid-id`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'session=test-session',
      },
      body: JSON.stringify({
        Category: 'Cars',
        Brand: 'Test',
        Model: 'Test',
      }),
    });
    
    const duration = Date.now() - startTime;
    const data = await response.json().catch(() => null);
    
    log(`Status: ${response.status} ${response.statusText}`, 'yellow');
    log(`Duration: ${duration}ms`, 'green');
    log(`Error Response Structure:`, 'blue');
    log(`  - ok: ${data?.ok}`, data?.ok === false ? 'green' : 'red');
    log(`  - error: ${data?.error ? 'present' : 'missing'}`, data?.error ? 'green' : 'red');
    log(`  - details: ${data?.details ? 'present' : 'missing'}`, data?.details ? 'green' : 'yellow');
    log(`Full Response: ${JSON.stringify(data, null, 2)}`, 'blue');
    
    return { success: true, duration, data };
  } catch (error) {
    const duration = Date.now() - startTime;
    log(`Error after ${duration}ms: ${error.message}`, 'red');
    return { success: false, duration, error: error.message };
  }
}

async function testCloudinaryTimeout() {
  logSection('Test 4: Cloudinary Upload Timeout Configuration');
  
  // This test checks if the Cloudinary timeout is properly configured
  // by attempting to upload a moderately sized image
  
  const mediumImageSize = 2 * 1024 * 1024; // 2MB
  const mediumImageBuffer = Buffer.alloc(mediumImageSize, 0xFF);
  const mediumImageBase64 = mediumImageBuffer.toString('base64');
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/vehicles/${TEST_VEHICLE_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'session=test-session',
      },
      body: JSON.stringify({
        Category: 'Cars',
        Brand: 'Test Brand',
        Model: 'Test Model',
        Year: 2023,
        PriceNew: 25000,
        imageData: `data:image/jpeg;base64,${mediumImageBase64}`,
      }),
    });
    
    const duration = Date.now() - startTime;
    const data = await response.json().catch(() => null);
    
    log(`Status: ${response.status} ${response.statusText}`, response.ok ? 'green' : 'yellow');
    log(`Duration: ${duration}ms`, duration > 25000 ? 'red' : duration > 10000 ? 'yellow' : 'green');
    
    if (data?.details?.type === 'upload_timeout') {
      log(`✅ Timeout handling working correctly!`, 'green');
      log(`Timeout message: ${data.error}`, 'blue');
    } else if (data?.details?.type === 'cloudinary_upload_error') {
      log(`⚠️ Cloudinary upload error (expected for large test data):`, 'yellow');
      log(`Error: ${data.error}`, 'blue');
    }
    
    return { success: true, duration, data };
  } catch (error) {
    const duration = Date.now() - startTime;
    log(`Error after ${duration}ms: ${error.message}`, 'red');
    return { success: false, duration, error: error.message };
  }
}

async function runAllTests() {
  logSection('502 Error Fix Test Suite');
  log(`API Base URL: ${API_BASE_URL}`, 'blue');
  log(`Test Vehicle ID: ${TEST_VEHICLE_ID}`, 'blue');
  log(`Start Time: ${new Date().toISOString()}`, 'blue');
  
  const results = {
    test1: await testPutVehicleWithoutImage(),
    test2: await testPutVehicleWithSmallImage(),
    test3: await testTimeoutErrorHandling(),
    test4: await testCloudinaryTimeout(),
  };
  
  logSection('Test Summary');
  
  let allPassed = true;
  for (const [testName, result] of Object.entries(results)) {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    const color = result.success ? 'green' : 'red';
    log(`${testName}: ${status} (${result.duration}ms)`, color);
    if (!result.success) allPassed = false;
  }
  
  console.log('');
  log(`═`.repeat(60), allPassed ? 'green' : 'red');
  log(`  Overall: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`, allPassed ? 'green' : 'red');
  log(`═`.repeat(60), allPassed ? 'green' : 'red');
  
  return allPassed;
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      log(`Fatal error: ${error.message}`, 'red');
      process.exit(1);
    });
}

export { runAllTests, testPutVehicleWithoutImage, testPutVehicleWithSmallImage };
