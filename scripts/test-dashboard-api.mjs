/**
 * Dashboard API Testing Script
 * Tests all endpoints needed for dashboard functionality
 */

const BASE_URL = "http://localhost:3000";

async function testEndpoint(name, url, method = "GET", body = null) {
  console.log(`\n[TEST] ${name}`);
  console.log(`  URL: ${url}`);
  try {
    const options = {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
    };
    if (body) options.body = JSON.stringify(body);
    
    const response = await fetch(url, options);
    const data = await response.json().catch(() => null);
    
    console.log(`  Status: ${response.status} ${response.statusText}`);
    console.log(`  OK: ${response.ok ? "✓" : "✗"}`);
    
    if (data) {
      if (data.meta) {
        console.log(`  Meta: ${JSON.stringify(data.meta, null, 2).substring(0, 200)}...`);
      }
      if (data.data && Array.isArray(data.data)) {
        console.log(`  Records: ${data.data.length}`);
      }
    }
    
    return { success: response.ok, status: response.status, data };
  } catch (error) {
    console.log(`  Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log("=".repeat(60));
  console.log("DASHBOARD API THOROUGH TESTING");
  console.log("=".repeat(60));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Time: ${new Date().toISOString()}`);

  // Test 1: Vehicles API (main data source)
  const vehiclesTest = await testEndpoint(
    "1. GET /api/vehicles?noCache=1 (Main data)",
    `${BASE_URL}/api/vehicles?noCache=1`
  );

  // Test 2: Auth check
  const authTest = await testEndpoint(
    "2. GET /api/auth/me (Auth status)",
    `${BASE_URL}/api/auth/me`
  );

  // Test 3: Health check
  const healthTest = await testEndpoint(
    "3. GET /api/health (System health)",
    `${BASE_URL}/api/health`
  );

  // Test 4: Test KPI data structure
  console.log("\n[TEST] 4. KPI Data Structure Validation");
  if (vehiclesTest.success && vehiclesTest.data) {
    const { meta, data } = vehiclesTest.data;
    console.log(`  Total vehicles: ${meta?.total || data?.length || "N/A"}`);
    console.log(`  Categories: ${meta?.countsByCategory ? Object.keys(meta.countsByCategory).join(", ") : "N/A"}`);
    console.log(`  Conditions: ${meta?.countsByCondition ? Object.keys(meta.countsByCondition).join(", ") : "N/A"}`);
    console.log(`  No image count: ${meta?.noImageCount || "N/A"}`);
    
    // Validate all KPI fields exist
    const requiredFields = ["total", "countsByCategory", "countsByCondition", "noImageCount"];
    const missingFields = requiredFields.filter(f => !(f in (meta || {})));
    if (missingFields.length > 0) {
      console.log(`  ⚠️ Missing meta fields: ${missingFields.join(", ")}`);
    } else {
      console.log(`  ✓ All required KPI fields present`);
    }
  }

  // Test 5: Test category key formats (for Tuk Tuk fix)
  console.log("\n[TEST] 5. Category Key Format Validation");
  if (vehiclesTest.success && vehiclesTest.data?.meta?.countsByCategory) {
    const counts = vehiclesTest.data.meta.countsByCategory;
    const keys = Object.keys(counts);
    console.log(`  Available keys: ${keys.join(", ")}`);
    
    // Check for Tuk Tuk variations
    const tukTukKeys = keys.filter(k => 
      k.toLowerCase().includes("tuk") || 
      k.toLowerCase().includes("tuktuk")
    );
    console.log(`  Tuk Tuk variations: ${tukTukKeys.join(", ") || "None found"}`);
    
    // Test flexible matching
    const testLabels = ["Tuk Tuk", "TukTuks", "tuk tuk", "TUKTUK"];
    for (const label of testLabels) {
      const normalized = label.toLowerCase().replace(/\s+/g, ' ');
      const match = keys.find(k => k.toLowerCase() === normalized || 
        k.toLowerCase().replace(/\s+/g, '') === normalized.replace(/\s+/g, ''));
      console.log(`  "${label}" -> ${match ? `✓ matches "${match}"` : "✗ no match"}`);
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("TEST SUMMARY");
  console.log("=".repeat(60));
  const tests = [vehiclesTest, authTest, healthTest];
  const passed = tests.filter(t => t.success).length;
  const total = tests.length;
  console.log(`Passed: ${passed}/${total}`);
  
  if (passed === total) {
    console.log("✓ All critical tests passed!");
    process.exit(0);
  } else {
    console.log("✗ Some tests failed");
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
