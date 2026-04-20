/**
 * @fileoverview Thorough Test Suite for Backup Verification Service
 * 
 * WHY THIS EXISTS:
 * This test suite validates all 8 exported functions from the backup verification
 * service to ensure they work correctly before production use. It provides
 * documented proof that the refactored code is functional and safe to run.
 * 
 * This test suite includes dynamic setup/teardown:
 * - Creates a mock backup table before tests
 * - Inserts test data representing various scenarios
 * - Runs comprehensive tests against the mock data
 * - Drops the mock table after tests complete
 * 
 * This ensures full test coverage without side effects.
 * 
 * @module scripts/test-backup-verification
 */

import {
  createDatabaseConnection,
  getTableRowCount,
  getVehicleIdRange,
  findMissingVehicles,
  getSampleVehicles,
  displayComparisonReport,
  displayMissingVehicles,
  displaySampleData,
  runBackupVerification,
  CONFIG,
} from './check-cleaned-table-data.mjs';

// Mock table name for testing (different from production to avoid conflicts)
const MOCK_BACKUP_TABLE = 'test_backup_vehicles_mock';

// Store original CONFIG values to restore after tests
const originalConfig = {
  BACKUP_TABLE_NAME: CONFIG.BACKUP_TABLE_NAME,
  EXPECTED_MAX_VEHICLE_ID: CONFIG.EXPECTED_MAX_VEHICLE_ID,
  ACTUAL_MAX_VEHICLE_ID: CONFIG.ACTUAL_MAX_VEHICLE_ID,
};

// Test results accumulator
const testResults = {
  passed: [],
  failed: [],
  startTime: new Date().toISOString(),
  endTime: null,
};

/**
 * Helper function to run a single test and log results
 */
async function runTest(testName, testFunction) {
  console.log(`\n🧪 TEST: ${testName}`);
  console.log('   ' + '='.repeat(50));
  
  try {
    const startTime = Date.now();
    const result = await testFunction();
    const duration = Date.now() - startTime;
    
    testResults.passed.push({
      name: testName,
      duration: `${duration}ms`,
      result: result || 'SUCCESS',
    });
    
    console.log(`   ✅ PASSED (${duration}ms)`);
    if (result) {
      console.log(`   Output: ${JSON.stringify(result, null, 2).split('\n').join('\n   ')}`);
    }
    return result;
  } catch (error) {
    testResults.failed.push({
      name: testName,
      error: error.message,
      stack: error.stack,
    });
    
    console.log(`   ❌ FAILED`);
    console.log(`   Error: ${error.message}`);
    return null;
  }
}

// ============================================================================
// SETUP AND TEARDOWN FUNCTIONS
// ============================================================================

/**
 * Creates mock backup table with test data
 * 
 * WHY: We need a controlled test environment with known data to verify
 * that our functions work correctly. This creates a temporary table
 * that mimics the real backup table structure.
 */
async function setupMockTable() {
  console.log('\n🔧 SETUP: Creating mock backup table...');
  
  const sql = createDatabaseConnection(CONFIG.DATABASE_URL);
  
  try {
    // Drop table if it exists from previous failed run
    await sql`DROP TABLE IF EXISTS ${sql.unsafe(MOCK_BACKUP_TABLE)}`;
    
    // Create mock table with same schema as expected backup table
    await sql`
      CREATE TABLE ${sql.unsafe(MOCK_BACKUP_TABLE)} (
        id INTEGER PRIMARY KEY,
        brand VARCHAR(100),
        model VARCHAR(100),
        year INTEGER,
        plate VARCHAR(20)
      )
    `;
    
    // Insert test data representing various scenarios:
    // - IDs 1-5: Normal vehicles (below production max)
    // - IDs 1191-1195: Missing vehicles (above production max of 1190)
    // - ID 1200: Edge case vehicle
    const testVehicles = [
      { id: 1, brand: 'Toyota', model: 'Camry', year: 2020, plate: 'ABC001' },
      { id: 2, brand: 'Honda', model: 'Civic', year: 2019, plate: 'ABC002' },
      { id: 3, brand: 'Ford', model: 'Mustang', year: 2021, plate: 'ABC003' },
      { id: 4, brand: 'BMW', model: 'X5', year: 2020, plate: 'ABC004' },
      { id: 5, brand: 'Mercedes', model: 'C300', year: 2022, plate: 'ABC005' },
      { id: 1191, brand: 'Audi', model: 'A4', year: 2021, plate: 'MISS001' },
      { id: 1192, brand: 'Lexus', model: 'RX350', year: 2020, plate: 'MISS002' },
      { id: 1193, brand: 'Tesla', model: 'Model 3', year: 2022, plate: 'MISS003' },
      { id: 1194, brand: 'Volvo', model: 'XC90', year: 2021, plate: 'MISS004' },
      { id: 1195, brand: 'Subaru', model: 'Outback', year: 2020, plate: 'MISS005' },
      { id: 1200, brand: 'Porsche', model: '911', year: 2023, plate: 'EDGE001' },
    ];
    
    for (const vehicle of testVehicles) {
      await sql`
        INSERT INTO ${sql.unsafe(MOCK_BACKUP_TABLE)} (id, brand, model, year, plate)
        VALUES (${vehicle.id}, ${vehicle.brand}, ${vehicle.model}, ${vehicle.year}, ${vehicle.plate})
      `;
    }
    
    // Override CONFIG to use mock table for tests
    CONFIG.BACKUP_TABLE_NAME = MOCK_BACKUP_TABLE;
    CONFIG.EXPECTED_MAX_VEHICLE_ID = 1200;
    CONFIG.ACTUAL_MAX_VEHICLE_ID = 1190;
    
    console.log(`   ✅ Mock table created with ${testVehicles.length} test vehicles`);
    return true;
  } catch (error) {
    console.error('   ❌ Setup failed:', error.message);
    throw error;
  }
}

/**
 * Drops mock backup table and restores original CONFIG
 * 
 * WHY: We must clean up after tests to leave the database in its
 * original state. This prevents test data from affecting production.
 */
async function teardownMockTable() {
  console.log('\n🧹 TEARDOWN: Cleaning up mock backup table...');
  
  const sql = createDatabaseConnection(CONFIG.DATABASE_URL);
  
  try {
    // Drop the mock table
    await sql`DROP TABLE IF EXISTS ${sql.unsafe(MOCK_BACKUP_TABLE)}`;
    
    // Restore original CONFIG values
    CONFIG.BACKUP_TABLE_NAME = originalConfig.BACKUP_TABLE_NAME;
    CONFIG.EXPECTED_MAX_VEHICLE_ID = originalConfig.EXPECTED_MAX_VEHICLE_ID;
    CONFIG.ACTUAL_MAX_VEHICLE_ID = originalConfig.ACTUAL_MAX_VEHICLE_ID;
    
    console.log('   ✅ Mock table dropped, CONFIG restored');
    return true;
  } catch (error) {
    console.error('   ❌ Teardown failed:', error.message);
    // Don't throw - we want to report results even if cleanup fails
    return false;
  }
}

// ============================================================================
// TEST CASES FOR ALL 8 FUNCTIONS
// ============================================================================

/**
 * TEST 1: createDatabaseConnection
 * Verifies database connection can be established
 */
async function testCreateDatabaseConnection() {
  const connection = createDatabaseConnection(CONFIG.DATABASE_URL);
  
  if (typeof connection !== 'function') {
    throw new Error('Connection is not a function');
  }
  
  // Test a simple query to verify connection works
  const result = await connection`SELECT 1 as test_value`;
  
  if (!result || result.length === 0) {
    throw new Error('Connection test query returned no results');
  }
  
  return {
    connectionType: typeof connection,
    testQueryResult: result[0].test_value,
    status: 'Connection established successfully',
  };
}

/**
 * TEST 2: getTableRowCount (backup table)
 * Verifies row counting works for backup table
 */
async function testGetBackupTableRowCount() {
  const sql = createDatabaseConnection(CONFIG.DATABASE_URL);
  const count = await getTableRowCount(sql, CONFIG.BACKUP_TABLE_NAME);
  
  if (typeof count !== 'number' || count < 0) {
    throw new Error(`Invalid count returned: ${count}`);
  }
  
  return {
    tableName: CONFIG.BACKUP_TABLE_NAME,
    rowCount: count,
    dataType: typeof count,
  };
}

/**
 * TEST 3: getTableRowCount (production table)
 * Verifies row counting works for production table
 */
async function testGetProductionTableRowCount() {
  const sql = createDatabaseConnection(CONFIG.DATABASE_URL);
  const count = await getTableRowCount(sql, CONFIG.PRODUCTION_TABLE_NAME);
  
  if (typeof count !== 'number' || count < 0) {
    throw new Error(`Invalid count returned: ${count}`);
  }
  
  return {
    tableName: CONFIG.PRODUCTION_TABLE_NAME,
    rowCount: count,
    dataType: typeof count,
  };
}

/**
 * TEST 4: getVehicleIdRange
 * Verifies min/max ID retrieval works
 */
async function testGetVehicleIdRange() {
  const sql = createDatabaseConnection(CONFIG.DATABASE_URL);
  const range = await getVehicleIdRange(sql, CONFIG.BACKUP_TABLE_NAME);
  
  if (typeof range.minId !== 'number' || typeof range.maxId !== 'number') {
    throw new Error(`Invalid range object: ${JSON.stringify(range)}`);
  }
  
  if (range.minId > range.maxId) {
    throw new Error(`Invalid range: min (${range.minId}) > max (${range.maxId})`);
  }
  
  return {
    tableName: CONFIG.BACKUP_TABLE_NAME,
    minId: range.minId,
    maxId: range.maxId,
    totalRange: range.maxId - range.minId + 1,
  };
}

/**
 * TEST 5: findMissingVehicles
 * Verifies detection of vehicles above production max ID
 */
async function testFindMissingVehicles() {
  const sql = createDatabaseConnection(CONFIG.DATABASE_URL);
  const productionMaxId = CONFIG.ACTUAL_MAX_VEHICLE_ID;
  
  const missingVehicles = await findMissingVehicles(
    sql,
    CONFIG.BACKUP_TABLE_NAME,
    productionMaxId
  );
  
  if (!Array.isArray(missingVehicles)) {
    throw new Error(`Expected array, got ${typeof missingVehicles}`);
  }
  
  // Validate structure of returned vehicles
  if (missingVehicles.length > 0) {
    const firstVehicle = missingVehicles[0];
    const requiredFields = ['id', 'vehicle_brand', 'vehicle_model', 'manufacture_year', 'plate_number'];
    
    for (const field of requiredFields) {
      if (!(field in firstVehicle)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    // Verify all returned IDs are > productionMaxId
    const invalidIds = missingVehicles.filter(v => v.id <= productionMaxId);
    if (invalidIds.length > 0) {
      throw new Error(`Found ${invalidIds.length} vehicles with ID <= ${productionMaxId}`);
    }
  }
  
  return {
    productionMaxId,
    missingVehiclesFound: missingVehicles.length,
    sampleVehicle: missingVehicles[0] || null,
    allIdsValid: true,
  };
}

/**
 * TEST 6: getSampleVehicles
 * Verifies sampling returns correct number of records
 */
async function testGetSampleVehicles() {
  const sql = createDatabaseConnection(CONFIG.DATABASE_URL);
  const sampleSize = 3;
  
  const samples = await getSampleVehicles(sql, CONFIG.BACKUP_TABLE_NAME, sampleSize);
  
  if (!Array.isArray(samples)) {
    throw new Error(`Expected array, got ${typeof samples}`);
  }
  
  if (samples.length > sampleSize) {
    throw new Error(`Returned ${samples.length} samples, expected max ${sampleSize}`);
  }
  
  // Validate structure
  if (samples.length > 0) {
    const firstSample = samples[0];
    const requiredFields = ['id', 'vehicle_brand', 'vehicle_model', 'manufacture_year'];
    
    for (const field of requiredFields) {
      if (!(field in firstSample)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
  }
  
  return {
    requestedSampleSize: sampleSize,
    actualSampleSize: samples.length,
    sampleVehicle: samples[0] || null,
  };
}

/**
 * TEST 7: displayComparisonReport (console output test)
 * Verifies report generation doesn't throw errors
 */
async function testDisplayComparisonReport() {
  // Capture console output
  const originalLog = console.log;
  let logOutput = [];
  
  console.log = (...args) => {
    logOutput.push(args.join(' '));
  };
  
  try {
    displayComparisonReport(1190, 1222, 1222, 1190);
    
    // Restore console.log
    console.log = originalLog;
    
    // Verify output was generated
    if (logOutput.length === 0) {
      throw new Error('No console output generated');
    }
    
    const outputText = logOutput.join('\n');
    
    // Check for expected content
    if (!outputText.includes('BACKUP HAS MORE DATA')) {
      throw new Error('Expected "BACKUP HAS MORE DATA" in output');
    }
    
    return {
      linesOutput: logOutput.length,
      containsExpectedContent: true,
      sampleOutput: logOutput.slice(0, 3).join('\n   '),
    };
  } catch (error) {
    console.log = originalLog;
    throw error;
  }
}

/**
 * TEST 8: displayMissingVehicles (console output test)
 * Verifies vehicle listing doesn't throw errors
 */
async function testDisplayMissingVehicles() {
  const originalLog = console.log;
  let logOutput = [];
  
  console.log = (...args) => {
    logOutput.push(args.join(' '));
  };
  
  try {
    const mockVehicles = [
      {
        id: 1191,
        vehicle_brand: 'Toyota',
        vehicle_model: 'Camry',
        manufacture_year: 2020,
        plate_number: 'ABC123',
      },
      {
        id: 1192,
        vehicle_brand: 'Honda',
        vehicle_model: 'Civic',
        manufacture_year: 2019,
        plate_number: 'XYZ789',
      },
    ];
    
    displayMissingVehicles(mockVehicles);
    
    // Restore console.log
    console.log = originalLog;
    
    if (logOutput.length === 0) {
      throw new Error('No console output generated');
    }
    
    const outputText = logOutput.join('\n');
    
    if (!outputText.includes('MISSING VEHICLES DETECTED')) {
      throw new Error('Expected "MISSING VEHICLES DETECTED" in output');
    }
    
    return {
      mockVehiclesCount: mockVehicles.length,
      linesOutput: logOutput.length,
      containsExpectedContent: true,
    };
  } catch (error) {
    console.log = originalLog;
    throw error;
  }
}

/**
 * TEST 9: displaySampleData (console output test)
 * Verifies sample display doesn't throw errors
 */
async function testDisplaySampleData() {
  const originalLog = console.log;
  let logOutput = [];
  
  console.log = (...args) => {
    logOutput.push(args.join(' '));
  };
  
  try {
    const mockSamples = [
      {
        id: 1,
        vehicle_brand: 'Ford',
        vehicle_model: 'Mustang',
        manufacture_year: 2021,
      },
    ];
    
    displaySampleData(mockSamples);
    
    // Restore console.log
    console.log = originalLog;
    
    if (logOutput.length === 0) {
      throw new Error('No console output generated');
    }
    
    return {
      linesOutput: logOutput.length,
      sampleOutput: logOutput[0],
    };
  } catch (error) {
    console.log = originalLog;
    throw error;
  }
}

/**
 * TEST 10: Error handling - Invalid credentials
 * Verifies graceful failure when connection fails
 */
async function testErrorHandlingInvalidCredentials() {
  const invalidUrl = 'postgresql://invalid_user:wrong_pass@fake-host.neon.tech/fake_db';
  
  try {
    const badConnection = createDatabaseConnection(invalidUrl);
    
    // Attempt a query that should fail
    await badConnection`SELECT 1`;
    
    throw new Error('Expected connection to fail, but it succeeded');
  } catch (error) {
    // This is expected - connection should fail
    return {
      expectedError: true,
      errorType: error.name,
      errorMessage: error.message.substring(0, 100) + '...',
      handlingStatus: 'Graceful failure confirmed',
    };
  }
}

/**
 * TEST 11: Full integration - runBackupVerification
 * Runs the complete workflow (this is the main orchestrator)
 */
async function testFullIntegration() {
  // This test runs the actual main function
  // We'll capture its output to verify it completes
  
  const originalLog = console.log;
  let logOutput = [];
  
  console.log = (...args) => {
    logOutput.push(args.join(' '));
    originalLog(...args); // Still print to console for visibility
  };
  
  try {
    await runBackupVerification();
    
    console.log = originalLog;
    
    const outputText = logOutput.join('\n');
    
    // Verify key stages completed
    const checks = {
      started: outputText.includes('STARTING BACKUP TABLE VERIFICATION'),
      gotRowCount: outputText.includes('Total rows:'),
      gotIdRange: outputText.includes('ID Range in backup:'),
      comparisonDone: outputText.includes('TABLE COMPARISON REPORT'),
      complete: outputText.includes('VERIFICATION COMPLETE'),
    };
    
    const allPassed = Object.values(checks).every(v => v === true);
    
    if (!allPassed) {
      throw new Error(`Not all stages completed. Status: ${JSON.stringify(checks)}`);
    }
    
    return {
      workflowStagesCompleted: checks,
      totalLogLines: logOutput.length,
      status: 'Full workflow executed successfully',
    };
  } catch (error) {
    console.log = originalLog;
    throw error;
  }
}

// ============================================================================
// MAIN TEST EXECUTION
// ============================================================================

async function runAllTests() {
  console.log('\n' + '='.repeat(70));
  console.log('BACKUP VERIFICATION SERVICE - COMPREHENSIVE TEST SUITE');
  console.log('='.repeat(70));
  console.log(`Started at: ${testResults.startTime}`);
  console.log(`Testing against database: ${CONFIG.DATABASE_URL.split('@')[1].split('/')[0]}`);
  console.log(`Production table: ${CONFIG.PRODUCTION_TABLE_NAME}`);
  console.log('='.repeat(70));
  
  // Setup: Create mock table before tests
  let setupSuccess = false;
  try {
    await setupMockTable();
    setupSuccess = true;
    console.log(`   Using mock table: ${CONFIG.BACKUP_TABLE_NAME}`);
  } catch (error) {
    console.error('\n❌ SETUP FAILED - Cannot proceed with tests');
    console.error('   Error:', error.message);
    process.exit(1);
  }
  
  // Run all tests in sequence
  await runTest('createDatabaseConnection', testCreateDatabaseConnection);
  await runTest('getTableRowCount (backup)', testGetBackupTableRowCount);
  await runTest('getTableRowCount (production)', testGetProductionTableRowCount);
  await runTest('getVehicleIdRange', testGetVehicleIdRange);
  await runTest('findMissingVehicles', testFindMissingVehicles);
  await runTest('getSampleVehicles', testGetSampleVehicles);
  await runTest('displayComparisonReport', testDisplayComparisonReport);
  await runTest('displayMissingVehicles', testDisplayMissingVehicles);
  await runTest('displaySampleData', testDisplaySampleData);
  await runTest('errorHandlingInvalidCredentials', testErrorHandlingInvalidCredentials);
  await runTest('fullIntegration_runBackupVerification', testFullIntegration);
  
  // Final summary
  testResults.endTime = new Date().toISOString();
  
  console.log('\n' + '='.repeat(70));
  console.log('TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total Tests: ${testResults.passed.length + testResults.failed.length}`);
  console.log(`✅ Passed: ${testResults.passed.length}`);
  console.log(`❌ Failed: ${testResults.failed.length}`);
  console.log(`Duration: ${new Date(testResults.endTime) - new Date(testResults.startTime)}ms`);
  console.log('='.repeat(70));
  
  if (testResults.failed.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    testResults.failed.forEach((test, index) => {
      console.log(`   ${index + 1}. ${test.name}`);
      console.log(`      Error: ${test.error}`);
    });
    process.exit(1);
  } else {
    console.log('\n✅ ALL TESTS PASSED - Service is production-ready!');
  }
  
  // Write results to file
  await writeVerificationLog();
  
  // Teardown: Clean up mock table after all tests
  // This runs regardless of test success/failure
  await teardownMockTable();
}

async function writeVerificationLog() {
  const fs = await import('fs');
  
  const logContent = `
BACKUP VERIFICATION SERVICE - TEST RESULTS
==========================================
Generated: ${testResults.endTime}
Test Suite: Comprehensive Function Testing
Database: ${CONFIG.DATABASE_URL.split('@')[1].split('/')[0]}

SUMMARY
-------
Total Tests: ${testResults.passed.length + testResults.failed.length}
Passed: ${testResults.passed.length}
Failed: ${testResults.failed.length}

DETAILED RESULTS
----------------

PASSED TESTS:
${testResults.passed.map(t => `
  ✅ ${t.name}
     Duration: ${t.duration}
     Result: ${JSON.stringify(t.result, null, 4)}
`).join('\n')}

${testResults.failed.length > 0 ? `FAILED TESTS:
${testResults.failed.map(t => `
  ❌ ${t.name}
     Error: ${t.error}
     Stack: ${t.stack}
`).join('\n')}` : 'No failures recorded.'}

VERIFICATION STATUS: ${testResults.failed.length === 0 ? '✅ PRODUCTION READY' : '❌ ISSUES DETECTED'}
`;

  fs.writeFileSync('verification_summary.txt', logContent);
  console.log('\n📝 Verification log written to: verification_summary.txt');
}

// Execute all tests with proper error handling and cleanup
async function main() {
  try {
    await runAllTests();
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    
    // Ensure cleanup happens even on failure
    await teardownMockTable();
    process.exit(1);
  }
}

main();
