# Backup Verification Service - Testing Guide

## Overview

This document explains how to test the backup verification service manually. Use this guide when you need to verify the service works correctly before or after a data migration.

## Files

- `scripts/check-cleaned-table-data.mjs` - Main service module (8 exported functions)
- `scripts/test-backup-verification.mjs` - Automated test suite
- `verification_summary.txt` - Test results output

## Quick Start

### 1. Run the Full Test Suite

```bash
node scripts/test-backup-verification.mjs
```

This executes 11 comprehensive tests covering all functions.

### 2. Run the Main Verification (Production Use)

```bash
node scripts/check-cleaned-table-data.mjs
```

This runs the actual backup verification against your database.

## Manual Testing Guide

### Test 1: Database Connection

**Purpose:** Verify you can connect to the database

```javascript
import { createDatabaseConnection, CONFIG } from './scripts/check-cleaned-table-data.mjs';

const sql = createDatabaseConnection(CONFIG.DATABASE_URL);
const result = await sql`SELECT 1 as test`;
console.log(result); // Should output: [{ test: 1 }]
```

**Expected Output:** Connection established, query returns result

---

### Test 2: Count Production Vehicles

**Purpose:** Verify production table is accessible

```javascript
import { getTableRowCount, createDatabaseConnection, CONFIG } from './scripts/check-cleaned-table-data.mjs';

const sql = createDatabaseConnection(CONFIG.DATABASE_URL);
const count = await getTableRowCount(sql, 'vehicles');
console.log(`Production has ${count} vehicles`);
```

**Expected Output:** Number representing total vehicles in production

---

### Test 3: Check Backup Table Exists

**Purpose:** Verify backup table is accessible

```javascript
import { getTableRowCount, createDatabaseConnection, CONFIG } from './scripts/check-cleaned-table-data.mjs';

const sql = createDatabaseConnection(CONFIG.DATABASE_URL);
try {
  const count = await getTableRowCount(sql, 'cleaned_vehicles_for_google_sheets');
  console.log(`Backup has ${count} vehicles`);
} catch (error) {
  console.log('Backup table does not exist');
}
```

**Expected Output:** Number if table exists, error if it doesn't

---

### Test 4: Get ID Range

**Purpose:** Verify ID range analysis works

```javascript
import { getVehicleIdRange, createDatabaseConnection, CONFIG } from './scripts/check-cleaned-table-data.mjs';

const sql = createDatabaseConnection(CONFIG.DATABASE_URL);
const range = await getVehicleIdRange(sql, 'vehicles');
console.log(`IDs from ${range.minId} to ${range.maxId}`);
```

**Expected Output:** Object with minId and maxId properties

---

### Test 5: Find Missing Vehicles

**Purpose:** Verify detection of orphaned records

```javascript
import { findMissingVehicles, createDatabaseConnection, CONFIG } from './scripts/check-cleaned-table-data.mjs';

const sql = createDatabaseConnection(CONFIG.DATABASE_URL);
const missing = await findMissingVehicles(
  sql, 
  'cleaned_vehicles_for_google_sheets', 
  1190  // Production max ID
);

console.log(`Found ${missing.length} missing vehicles`);
if (missing.length > 0) {
  console.log('First missing:', missing[0]);
}
```

**Expected Output:** Array of vehicle objects with id, vehicle_brand, vehicle_model, etc.

---

### Test 6: Get Sample Data

**Purpose:** Verify sampling works

```javascript
import { getSampleVehicles, createDatabaseConnection, CONFIG } from './scripts/check-cleaned-table-data.mjs';

const sql = createDatabaseConnection(CONFIG.DATABASE_URL);
const samples = await getSampleVehicles(sql, 'vehicles', 3);

console.log('Sample vehicles:');
samples.forEach(v => {
  console.log(`  ${v.id}: ${v.vehicle_brand} ${v.vehicle_model}`);
});
```

**Expected Output:** Array of 3 (or fewer) vehicle records

---

### Test 7: Display Functions (No Database Needed)

**Purpose:** Verify reporting displays work

```javascript
import { 
  displayComparisonReport, 
  displayMissingVehicles, 
  displaySampleData 
} from './scripts/check-cleaned-table-data.mjs';

// Test comparison report
displayComparisonReport(1190, 1222, 1222, 1190);

// Test missing vehicles display
const mockMissing = [
  {
    id: 1191,
    vehicle_brand: 'Toyota',
    vehicle_model: 'Camry',
    manufacture_year: 2020,
    plate_number: 'ABC123'
  }
];
displayMissingVehicles(mockMissing);

// Test sample display
const mockSamples = [
  {
    id: 1,
    vehicle_brand: 'Honda',
    vehicle_model: 'Civic',
    manufacture_year: 2019
  }
];
displaySampleData(mockSamples);
```

**Expected Output:** Formatted console output with emojis and clear messaging

---

### Test 8: Full Integration

**Purpose:** Run complete verification workflow

```javascript
import { runBackupVerification } from './scripts/check-cleaned-table-data.mjs';

try {
  await runBackupVerification();
} catch (error) {
  console.error('Verification failed:', error.message);
}
```

**Expected Output:** Complete report showing:
- Backup table row count
- ID range analysis
- Comparison with production
- Missing vehicles list (if any)
- Sample data
- Action recommendations

---

## Configuration

All settings are in the `CONFIG` object exported from the main module:

```javascript
import { CONFIG } from './scripts/check-cleaned-table-data.mjs';

console.log(CONFIG);
```

### Key Settings:

| Setting | Description | Default |
|---------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | (hardcoded) |
| `BACKUP_TABLE_NAME` | Name of backup table | `cleaned_vehicles_for_google_sheets` |
| `PRODUCTION_TABLE_NAME` | Name of production table | `vehicles` |
| `EXPECTED_MAX_VEHICLE_ID` | Expected max ID before data loss | `1222` |
| `ACTUAL_MAX_VEHICLE_ID` | Actual max ID after data loss | `1190` |
| `SAMPLE_SIZE` | Number of sample records to show | `3` |

## Troubleshooting

### Error: "relation does not exist"

**Cause:** The backup table hasn't been created yet.

**Solution:** 
1. Check if table name is correct in CONFIG
2. Create the backup table if needed
3. Or run against a different database that has the table

### Error: "connection failed"

**Cause:** Database credentials or network issue.

**Solution:**
1. Verify DATABASE_URL is correct
2. Check network connectivity to Neon
3. Ensure SSL settings are correct

### Error: "cannot find module"

**Cause:** Import path is wrong.

**Solution:**
- Use relative paths: `./scripts/check-cleaned-table-data.mjs`
- Ensure file exists at that location

## Expected Test Results

When running the automated test suite (`test-backup-verification.mjs`):

- **If backup table exists:** All 11 tests should pass
- **If backup table doesn't exist:** 6 tests pass, 5 fail (expected behavior)

The 5 failures when table is missing are:
- `getTableRowCount (backup)`
- `getVehicleIdRange`
- `findMissingVehicles`
- `getSampleVehicles`
- `fullIntegration_runBackupVerification`

This is **correct behavior** - the code properly detects missing tables.

## Safety Notes

1. **READ-ONLY OPERATIONS**: All functions only SELECT data, never INSERT/UPDATE/DELETE
2. **SAFE TO RUN ANYTIME**: Won't modify your database
3. **PRODUCTION SAFE**: Can run against live production databases
4. **NO SIDE EFFECTS**: Only reads and displays information

## When to Use This Service

1. **After data migration** - Verify all records transferred
2. **After bulk cleanup** - Check for accidental deletions
3. **Before restoration** - Confirm what needs to be restored
4. **Regular audits** - Monthly data integrity checks
5. **Disaster recovery** - Assess backup completeness

## Support

For issues or questions:
1. Check this TESTING.md guide
2. Review the JSDoc comments in the code
3. Run individual tests above to isolate problems
4. Check `verification_summary.txt` for latest test results
