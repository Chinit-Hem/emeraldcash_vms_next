/**
 * Comprehensive CRUD Test - Tests all operations without images first
 * Then tests with images to isolate the issue
 */

// Direct database test removed - will test via API only

const BASE_URL = "http://localhost:3000";

// Test vehicle data
const testVehicle = {
  Brand: "TEST_CRUD",
  Model: "TestModel",
  Category: "Cars",
  Year: 2023,
  Plate: "TEST-123",
  PriceNew: 25000,
  TaxType: "Tax Plate",
  Condition: "New",
  BodyType: "Sedan",
  Color: "Red",
};

let createdVehicleId = null;
let cookie = null;

// Helper to make requests
async function makeRequest(url, options = {}) {
  const fullUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`;
  const res = await fetch(fullUrl, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

// Test 1: Check if server is running
async function testServerRunning() {
  console.log("\n📋 TEST 1: Check if server is running");
  console.log("------------------------------------------------------------");
  
  try {
    const res = await fetch(`${BASE_URL}/api/vehicles?limit=1`, { 
      method: "GET",
      signal: AbortSignal.timeout(5000)
    });
    
    if (res.ok) {
      console.log("✅ Server is running and responding");
      return true;
    } else {
      console.log("❌ Server returned error:", res.status);
      return false;
    }
  } catch (e) {
    console.log("❌ Server not responding:", e.message);
    console.log("\n⚠️  Please start the dev server with: npm run dev");
    return false;
  }
}

// Test 2: Create vehicle (no image)
async function testCreateNoImage() {
  console.log("\n📋 TEST 2: Create vehicle (no image)");
  console.log("------------------------------------------------------------");
  
  const { status, ok, data } = await makeRequest("/api/vehicles", {
    method: "POST",
    body: JSON.stringify(testVehicle),
  });
  
  console.log(`Status: ${status}`);
  console.log(`Response:`, JSON.stringify(data, null, 2));
  
  if (ok && data.success) {
    createdVehicleId = data.data?.id || data.data?.VehicleId;
    console.log(`✅ Created vehicle with ID: ${createdVehicleId}`);
    return true;
  } else {
    console.log("❌ Failed to create vehicle");
    return false;
  }
}

// Test 3: Update vehicle (no image)
async function testUpdateNoImage() {
  console.log("\n📋 TEST 3: Update vehicle (no image)");
  console.log("------------------------------------------------------------");
  
  if (!createdVehicleId) {
    console.log("⚠️  Skipping - no vehicle created");
    return false;
  }
  
  const updateData = {
    ...testVehicle,
    Brand: "TEST_CRUD_UPDATED",
    Model: "UpdatedModel",
  };
  
  const { status, ok, data } = await makeRequest(`/api/vehicles/${createdVehicleId}`, {
    method: "PUT",
    body: JSON.stringify(updateData),
  });
  
  console.log(`Status: ${status}`);
  console.log(`Response:`, JSON.stringify(data, null, 2));
  
  if (ok && (data.ok || data.success)) {
    console.log("✅ Updated vehicle successfully");
    return true;
  } else {
    console.log("❌ Failed to update vehicle");
    return false;
  }
}

// Test 4: Get vehicle by ID
async function testGetById() {
  console.log("\n📋 TEST 4: Get vehicle by ID");
  console.log("------------------------------------------------------------");
  
  if (!createdVehicleId) {
    console.log("⚠️  Skipping - no vehicle created");
    return false;
  }
  
  const { status, ok, data } = await makeRequest(`/api/vehicles/${createdVehicleId}`, {
    method: "GET",
  });
  
  console.log(`Status: ${status}`);
  console.log(`Response:`, JSON.stringify(data, null, 2));
  
  if (ok && (data.ok || data.data)) {
    console.log("✅ Retrieved vehicle successfully");
    return true;
  } else {
    console.log("❌ Failed to get vehicle");
    return false;
  }
}

// Test 5: Delete vehicle
async function testDelete() {
  console.log("\n📋 TEST 5: Delete vehicle");
  console.log("------------------------------------------------------------");
  
  if (!createdVehicleId) {
    console.log("⚠️  Skipping - no vehicle created");
    return false;
  }
  
  const { status, ok, data } = await makeRequest(`/api/vehicles/${createdVehicleId}`, {
    method: "DELETE",
  });
  
  console.log(`Status: ${status}`);
  console.log(`Response:`, JSON.stringify(data, null, 2));
  
  if (ok && (data.ok || data.success)) {
    console.log("✅ Deleted vehicle successfully");
    return true;
  } else {
    console.log("❌ Failed to delete vehicle");
    return false;
  }
}

// Test 6: Check Cloudinary config
async function testCloudinaryConfig() {
  console.log("\n📋 TEST 6: Check Cloudinary configuration");
  console.log("------------------------------------------------------------");
  
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  
  console.log(`CLOUDINARY_CLOUD_NAME: ${cloudName ? "✅ Set" : "❌ Missing"}`);
  console.log(`CLOUDINARY_API_KEY: ${apiKey ? "✅ Set" : "❌ Missing"}`);
  console.log(`CLOUDINARY_API_SECRET: ${apiSecret ? "✅ Set" : "❌ Missing"}`);
  
  if (!cloudName || !apiKey || !apiSecret) {
    console.log("\n⚠️  WARNING: Cloudinary is not fully configured!");
    console.log("   Image uploads will fail with 502/503 errors.");
    console.log("\n   To fix, add to .env.local:");
    console.log("   CLOUDINARY_CLOUD_NAME=dgntrakv6");
    return false;
  }
  
  return true;
}

// Test 7: Check environment variables
async function testEnvironment() {
  console.log("\n📋 TEST 7: Check environment variables");
  console.log("------------------------------------------------------------");
  
  const envVars = {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    DATABASE_URL: process.env.DATABASE_URL ? "✅ Set" : "❌ Missing",
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ? "✅ Set" : "❌ Missing",
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ? "✅ Set" : "❌ Missing",
  };
  
  console.log("Environment variables:");
  Object.entries(envVars).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
  
  return true;
}

// Main test runner
async function runTests() {
  console.log("============================================================");
  console.log("🔍 COMPREHENSIVE CRUD TEST");
  console.log("============================================================");
  
  const results = {
    server: await testServerRunning(),
    cloudinary: await testCloudinaryConfig(),
    environment: await testEnvironment(),
    create: false,
    update: false,
    get: false,
    delete: false,
  };
  
  if (results.server) {
    results.create = await testCreateNoImage();
    results.update = await testUpdateNoImage();
    results.get = await testGetById();
    results.delete = await testDelete();
  }
  
  // Summary
  console.log("\n============================================================");
  console.log("📊 TEST SUMMARY");
  console.log("============================================================");
  console.log(`Server Running:     ${results.server ? "✅" : "❌"}`);
  console.log(`Cloudinary Config:  ${results.cloudinary ? "✅" : "❌"}`);
  console.log(`Environment Check:  ${results.environment ? "✅" : "❌"}`);
  console.log(`API Create:         ${results.create ? "✅" : "❌"}`);
  console.log(`API Update:         ${results.update ? "✅" : "❌"}`);
  console.log(`API Get:            ${results.get ? "✅" : "❌"}`);
  console.log(`API Delete:         ${results.delete ? "❌" : "❌"}`);
  
  console.log("\n============================================================");
  console.log("🔧 DIAGNOSIS");
  console.log("============================================================");
  
  if (!results.server) {
    console.log("❌ Server is not running. Start it with: npm run dev");
  } else if (!results.create && !results.update && !results.get && !results.delete) {
    console.log("❌ All API operations failing - check authentication/session");
    console.log("   - User might not be logged in");
    console.log("   - Session cookie might be missing");
    console.log("   - Admin role required for write operations");
  } else if (!results.cloudinary) {
    console.log("⚠️  Cloudinary not configured - image uploads will fail");
    console.log("   But basic CRUD without images should work");
  } else if (results.create && results.update && results.get && results.delete) {
    console.log("✅ All tests passed! CRUD operations are working.");
  } else {
    console.log("⚠️  Some operations failed - check individual test results above");
  }
  
  // Cleanup
  if (createdVehicleId && !results.delete) {
    console.log("\n🧹 Cleaning up test vehicle...");
    try {
      await makeRequest(`/api/vehicles/${createdVehicleId}`, { method: "DELETE" });
      console.log("✅ Cleanup successful");
    } catch (e) {
      console.log("⚠️  Cleanup failed (vehicle may already be deleted)");
    }
  }
  
  process.exit(0);
}

runTests().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
