/**
 * API Search Test - Verify all database data is searchable via API
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const testCases = [
  // Categories
  { term: 'car', description: 'Car category' },
  { term: 'motorcycle', description: 'Motorcycle category' },
  { term: 'tuk', description: 'Tuk Tuk category' },
  { term: 'truck', description: 'Truck category' },
  { term: 'van', description: 'Van category' },
  { term: 'bus', description: 'Bus category' },
  
  // Common brands
  { term: 'toyota', description: 'Toyota brand' },
  { term: 'honda', description: 'Honda brand' },
  { term: 'ford', description: 'Ford brand' },
  
  // Conditions
  { term: 'new', description: 'New condition' },
  { term: 'used', description: 'Used condition' },
  
  // With spaces
  { term: 'tuk tuk', description: 'Tuk Tuk with space' },
];

async function testSearch(term) {
  try {
    const response = await fetch(`${API_BASE_URL}/vehicles?search=${encodeURIComponent(term)}&limit=5`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🔍 Testing Search Across All Database Data...\n');
  console.log(`API URL: ${API_BASE_URL}\n`);
  
  let passed = 0;
  let failed = 0;
  
  for (const test of testCases) {
    process.stdout.write(`Testing "${test.term}" (${test.description})... `);
    
    const result = await testSearch(test.term);
    
    if (result.success && result.data && result.data.length > 0) {
      console.log(`✅ Found ${result.data.length} vehicles`);
      passed++;
    } else if (result.success) {
      console.log(`⚠️  No results (0 vehicles)`);
      // Not a failure, just no data
    } else {
      console.log(`❌ Error: ${result.error}`);
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(50));
  
  // Get stats
  console.log('\n📈 Fetching database stats...');
  try {
    const statsRes = await fetch(`${API_BASE_URL}/vehicles?statsOnly=true`);
    const stats = await statsRes.json();
    if (stats.success && stats.meta?.stats) {
      const s = stats.meta.stats;
      console.log(`   Total: ${s.total}`);
      console.log(`   Categories:`, s.byCategory);
    }
  } catch (e) {
    console.log('   Could not fetch stats');
  }
}

runTests().catch(console.error);
