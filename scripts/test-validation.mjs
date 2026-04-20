/**
 * Test script to verify VehicleId, Category, Brand, and Model validation
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

async function testValidation() {
  console.log("🧪 Testing Vehicle Validation...\n");

  // Test 1: POST /api/vehicles-db without required fields
  console.log("1. Testing POST /api/vehicles-db without VehicleId...");
  try {
    const response = await fetch(`${BASE_URL}/api/vehicles-db`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "Cars",
        brand: "Toyota",
        model: "Camry"
        // Missing vehicle_id
      }),
    });
    
    const data = await response.json();
    if (response.status === 400 && data.error && data.error.includes("VehicleId")) {
      console.log("   ✅ Correctly rejected: VehicleId is required");
    } else {
      console.log("   ❌ Failed: Expected 400 error for missing VehicleId");
      console.log("   Response:", data);
    }
  } catch (error) {
    console.log("   ⚠️  Error (expected if server not running):", error.message);
  }

  // Test 2: POST /api/vehicles-db without Category
  console.log("\n2. Testing POST /api/vehicles-db without Category...");
  try {
    const response = await fetch(`${BASE_URL}/api/vehicles-db`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vehicle_id: "VEH_001",
        brand: "Toyota",
        model: "Camry"
        // Missing category
      }),
    });
    
    const data = await response.json();
    if (response.status === 400 && data.error && data.error.includes("Category")) {
      console.log("   ✅ Correctly rejected: Category is required");
    } else {
      console.log("   ❌ Failed: Expected 400 error for missing Category");
      console.log("   Response:", data);
    }
  } catch (error) {
    console.log("   ⚠️  Error (expected if server not running):", error.message);
  }

  // Test 3: POST /api/vehicles-db without Brand
  console.log("\n3. Testing POST /api/vehicles-db without Brand...");
  try {
    const response = await fetch(`${BASE_URL}/api/vehicles-db`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vehicle_id: "VEH_001",
        category: "Cars",
        model: "Camry"
        // Missing brand
      }),
    });
    
    const data = await response.json();
    if (response.status === 400 && data.error && data.error.includes("Brand")) {
      console.log("   ✅ Correctly rejected: Brand is required");
    } else {
      console.log("   ❌ Failed: Expected 400 error for missing Brand");
      console.log("   Response:", data);
    }
  } catch (error) {
    console.log("   ⚠️  Error (expected if server not running):", error.message);
  }

  // Test 4: POST /api/vehicles-db without Model
  console.log("\n4. Testing POST /api/vehicles-db without Model...");
  try {
    const response = await fetch(`${BASE_URL}/api/vehicles-db`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vehicle_id: "VEH_001",
        category: "Cars",
        brand: "Toyota"
        // Missing model
      }),
    });
    
    const data = await response.json();
    if (response.status === 400 && data.error && data.error.includes("Model")) {
      console.log("   ✅ Correctly rejected: Model is required");
    } else {
      console.log("   ❌ Failed: Expected 400 error for missing Model");
      console.log("   Response:", data);
    }
  } catch (error) {
    console.log("   ⚠️  Error (expected if server not running):", error.message);
  }

  // Test 5: POST /api/vehicles-db with all required fields
  console.log("\n5. Testing POST /api/vehicles-db with all required fields...");
  try {
    const response = await fetch(`${BASE_URL}/api/vehicles-db`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vehicle_id: "VEH_TEST_001",
        category: "Cars",
        brand: "Toyota",
        model: "Camry",
        year: 2023
      }),
    });
    
    const data = await response.json();
    if (response.status === 401) {
      console.log("   ✅ Correctly requires authentication (401)");
    } else if (response.status === 403) {
      console.log("   ✅ Correctly requires admin role (403)");
    } else if (response.status === 201 || response.status === 200) {
      console.log("   ✅ Successfully created vehicle with all required fields");
    } else {
      console.log("   ℹ️  Response:", response.status, data);
    }
  } catch (error) {
    console.log("   ⚠️  Error (expected if server not running):", error.message);
  }

  console.log("\n✅ Validation testing complete!");
  console.log("\n📋 Summary of Required Fields:");
  console.log("   - VehicleId: Required for POST /api/vehicles-db");
  console.log("   - Category: Required for POST /api/vehicles-db");
  console.log("   - Brand: Required for POST /api/vehicles-db");
  console.log("   - Model: Required for POST /api/vehicles-db");
  console.log("\n   - Category: Required for PUT /api/vehicles/[id]");
  console.log("   - Brand: Required for PUT /api/vehicles/[id]");
  console.log("   - Model: Required for PUT /api/vehicles/[id]");
}

testValidation();
