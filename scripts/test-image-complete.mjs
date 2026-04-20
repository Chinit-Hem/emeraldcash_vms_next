/**
 * Complete Image Functionality Test
 * Tests upload, replace, and display of images
 */

const BASE_URL = "http://localhost:3000";

// Test vehicle with image
const testVehicle = {
  Brand: "IMAGE_TEST",
  Model: "ImageTest",
  Category: "Cars",
  Year: 2023,
  Plate: "IMG-123",
  PriceNew: 25000,
  TaxType: "Tax Plate",
  Condition: "New",
  BodyType: "Sedan",
  Color: "Red",
  // Small test image (1x1 pixel transparent PNG)
  Image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
};

let createdVehicleId = null;

// Helper to make requests
async function makeRequest(url, options = {}) {
  const fullUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`;
  const res = await fetch(fullUrl, {
    ...options,
    headers: {
      ...options.headers,
    },
  });
  
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

// Test 1: Check Cloudinary config
async function testCloudinaryConfig() {
  console.log("\n📋 TEST 1: Check Cloudinary Configuration");
  console.log("------------------------------------------------------------");
  
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  
  console.log(`CLOUDINARY_CLOUD_NAME: ${cloudName || "❌ Missing"}`);
  console.log(`CLOUDINARY_API_KEY: ${apiKey ? "✅ Set" : "❌ Missing"}`);
  console.log(`CLOUDINARY_API_SECRET: ${apiSecret ? "✅ Set" : "❌ Missing"}`);
  
  if (!cloudName) {
    console.log("\n⚠️  CRITICAL: CLOUDINARY_CLOUD_NAME is missing!");
    console.log("   Image uploads will FAIL with 502/503 errors.");
    console.log("\n   🔧 FIX: Add to .env.local:");
    console.log("   CLOUDINARY_CLOUD_NAME=dgntrakv6");
    return false;
  }
  
  return true;
}

// Test 2: Create vehicle with base64 image
async function testCreateWithImage() {
  console.log("\n📋 TEST 2: Create Vehicle with Base64 Image");
  console.log("------------------------------------------------------------");
  
  const { status, ok, data } = await makeRequest("/api/vehicles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(testVehicle),
  });
  
  console.log(`Status: ${status}`);
  
  if (ok && (data.success || data.ok)) {
    createdVehicleId = data.data?.id || data.data?.VehicleId;
    const hasImage = data.data?.Image || data.data?.image_id;
    console.log(`✅ Created vehicle ID: ${createdVehicleId}`);
    console.log(`   Has Image: ${hasImage ? "✅ Yes" : "❌ No"}`);
    if (hasImage) {
      console.log(`   Image URL: ${hasImage.substring(0, 80)}...`);
    }
    return true;
  } else {
    console.log("❌ Failed to create vehicle with image");
    console.log(`   Error: ${data.error || JSON.stringify(data)}`);
    return false;
  }
}

// Test 3: Get vehicle and check image
async function testGetVehicleWithImage() {
  console.log("\n📋 TEST 3: Get Vehicle and Verify Image");
  console.log("------------------------------------------------------------");
  
  if (!createdVehicleId) {
    console.log("⚠️  Skipping - no vehicle created");
    return false;
  }
  
  const { status, ok, data } = await makeRequest(`/api/vehicles/${createdVehicleId}`, {
    method: "GET",
  });
  
  console.log(`Status: ${status}`);
  
  if (ok && (data.ok || data.data)) {
    const vehicle = data.data || data;
    const imageUrl = vehicle.Image || vehicle.image_id;
    console.log(`✅ Retrieved vehicle: ${vehicle.Brand} ${vehicle.Model}`);
    console.log(`   Image URL: ${imageUrl ? imageUrl.substring(0, 80) + "..." : "❌ None"}`);
    
    if (imageUrl && imageUrl.includes("cloudinary.com")) {
      console.log("   ✅ Image is hosted on Cloudinary");
    } else if (imageUrl && imageUrl.startsWith("data:")) {
      console.log("   ⚠️  Image is still base64 (not uploaded to Cloudinary)");
    }
    return true;
  } else {
    console.log("❌ Failed to get vehicle");
    return false;
  }
}

// Test 4: Update vehicle with new image
async function testUpdateWithNewImage() {
  console.log("\n📋 TEST 4: Update Vehicle with New Image");
  console.log("------------------------------------------------------------");
  
  if (!createdVehicleId) {
    console.log("⚠️  Skipping - no vehicle created");
    return false;
  }
  
  // Different test image (1x1 pixel red PNG)
  const newImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";
  
  const updateData = {
    ...testVehicle,
    Brand: "IMAGE_TEST_UPDATED",
    Image: newImage,
  };
  
  const { status, ok, data } = await makeRequest(`/api/vehicles/${createdVehicleId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updateData),
  });
  
  console.log(`Status: ${status}`);
  
  if (ok && (data.ok || data.success)) {
    const hasImage = data.data?.Image || data.data?.image_id;
    console.log(`✅ Updated vehicle with new image`);
    console.log(`   Has Image: ${hasImage ? "✅ Yes" : "❌ No"}`);
    return true;
  } else {
    console.log("❌ Failed to update vehicle with new image");
    console.log(`   Error: ${data.error || JSON.stringify(data)}`);
    return false;
  }
}

// Test 5: Delete vehicle (cleanup)
async function testDeleteVehicle() {
  console.log("\n📋 TEST 5: Delete Vehicle (Cleanup)");
  console.log("------------------------------------------------------------");
  
  if (!createdVehicleId) {
    console.log("⚠️  Skipping - no vehicle created");
    return false;
  }
  
  const { status, ok, data } = await makeRequest(`/api/vehicles/${createdVehicleId}`, {
    method: "DELETE",
  });
  
  console.log(`Status: ${status}`);
  
  if (ok && (data.ok || data.success)) {
    console.log(`✅ Deleted vehicle ${createdVehicleId}`);
    return true;
  } else {
    console.log("❌ Failed to delete vehicle");
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log("============================================================");
  console.log("🖼️  COMPLETE IMAGE FUNCTIONALITY TEST");
  console.log("============================================================");
  
  const results = {
    cloudinary: await testCloudinaryConfig(),
    create: false,
    get: false,
    update: false,
    delete: false,
  };
  
  // Only run API tests if server is available
  try {
    const res = await fetch(`${BASE_URL}/api/vehicles?limit=1`, { 
      signal: AbortSignal.timeout(3000) 
    });
    if (res.ok) {
      results.create = await testCreateWithImage();
      results.get = await testGetVehicleWithImage();
      results.update = await testUpdateWithNewImage();
      results.delete = await testDeleteVehicle();
    } else {
      console.log("\n❌ Server not responding - skipping API tests");
    }
  } catch (e) {
    console.log("\n❌ Server not running - skipping API tests");
    console.log("   Start server with: npm run dev");
  }
  
  // Summary
  console.log("\n============================================================");
  console.log("📊 TEST SUMMARY");
  console.log("============================================================");
  console.log(`Cloudinary Config:  ${results.cloudinary ? "✅" : "❌"}`);
  console.log(`Create with Image:  ${results.create ? "✅" : "❌"}`);
  console.log(`Get with Image:     ${results.get ? "✅" : "❌"}`);
  console.log(`Update with Image:  ${results.update ? "✅" : "❌"}`);
  console.log(`Delete:             ${results.delete ? "✅" : "❌"}`);
  
  console.log("\n============================================================");
  console.log("🔧 RECOMMENDED FIXES");
  console.log("============================================================");
  
  if (!results.cloudinary) {
    console.log("1. Add to .env.local:");
    console.log("   CLOUDINARY_CLOUD_NAME=dgntrakv6");
    console.log("   CLOUDINARY_API_KEY=your_api_key");
    console.log("   CLOUDINARY_API_SECRET=your_api_secret");
  }
  
  if (!results.create || !results.update) {
    console.log("\n2. Check API routes for image handling:");
    console.log("   - POST /api/vehicles - should handle image upload");
    console.log("   - PUT /api/vehicles/[id] - should handle image replacement");
  }
  
  process.exit(0);
}

runTests().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
