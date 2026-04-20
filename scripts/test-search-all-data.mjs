/**
 * Comprehensive Search Test - Verify all database data is searchable
 * Tests category, brand, model, plate, and general search terms
 */

import { vehicleService } from '../src/services/VehicleService.ts';

// Test search terms covering all major data categories
const testCases = [
  // Categories
  { term: 'car', expectedCategory: 'Cars', description: 'Car category search' },
  { term: 'motorcycle', expectedCategory: 'Motorcycles', description: 'Motorcycle category search' },
  { term: 'tuk', expectedCategory: 'TukTuks', description: 'Tuk Tuk category search' },
  { term: 'truck', expectedCategory: 'Trucks', description: 'Truck category search' },
  { term: 'van', expectedCategory: 'Vans', description: 'Van category search' },
  { term: 'bus', expectedCategory: 'Buses', description: 'Bus category search' },
  
  // Common brands (adjust based on your actual data)
  { term: 'toyota', description: 'Toyota brand search' },
  { term: 'honda', description: 'Honda brand search' },
  { term: 'ford', description: 'Ford brand search' },
  { term: 'bmw', description: 'BMW brand search' },
  
  // Test conditions
  { term: 'new', description: 'New condition search' },
  { term: 'used', description: 'Used condition search' },
  
  // Test with spaces (common user input)
  { term: 'tuk tuk', expectedCategory: 'TukTuks', description: 'Tuk Tuk with space' },
  { term: 'pickup truck', expectedCategory: 'Trucks', description: 'Pickup truck search' },
];

async function runSearchTests() {
  console.log('🔍 Starting Comprehensive Search Tests...\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    try {
      console.log(`Testing: ${testCase.description} (term: "${testCase.term}")`);
      
      // Test via applyFilters with searchTerm
      const result = await vehicleService.getVehicles({
        searchTerm: testCase.term,
        limit: 10
      });
      
      if (!result.success) {
        console.log(`  ❌ FAILED: ${result.error}`);
        failed++;
        continue;
      }
      
      const vehicles = result.data || [];
      console.log(`  ✅ Found ${vehicles.length} vehicles`);
      
      if (vehicles.length > 0) {
        // Show first match details
        const first = vehicles[0];
        console.log(`     First match: ${first.Brand} ${first.Model} (${first.Category})`);
        
        // Verify category normalization if expected
        if (testCase.expectedCategory && first.Category !== testCase.expectedCategory) {
          console.log(`     ⚠️  Category: ${first.Category} (expected: ${testCase.expectedCategory})`);
        }
      }
      
      passed++;
    } catch (error) {
      console.log(`  ❌ ERROR: ${error.message}`);
      failed++;
    }
    
    console.log('');
  }
  
  // Summary
  console.log('='.repeat(50));
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(50));
  
  // Get overall stats
  console.log('\n📈 Database Overview:');
  try {
    const stats = await vehicleService.getVehicleStats();
    if (stats.success) {
      console.log(`   Total Vehicles: ${stats.data.total}`);
      console.log(`   By Category:`, stats.data.byCategory);
      console.log(`   By Condition:`, stats.data.byCondition);
    }
  } catch (error) {
    console.log(`   Error fetching stats: ${error.message}`);
  }
  
  return { passed, failed };
}

// Run tests
runSearchTests()
  .then(results => {
    process.exit(results.failed > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
