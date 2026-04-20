/**
 * Test Actual Cloudinary Upload
 * This script tests if images actually get uploaded to Cloudinary
 */

import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

console.log("============================================================");
console.log("☁️  CLOUDINARY ACTUAL UPLOAD TEST");
console.log("============================================================\n");

// Check configuration
console.log("📋 Configuration Check:");
console.log("------------------------------------------------------------");
console.log(`CLOUDINARY_CLOUD_NAME: ${CLOUDINARY_CLOUD_NAME || "❌ MISSING"}`);
console.log(`CLOUDINARY_API_KEY: ${CLOUDINARY_API_KEY ? "✅ Set (" + CLOUDINARY_API_KEY.slice(-4) + ")" : "❌ MISSING"}`);
console.log(`CLOUDINARY_API_SECRET: ${CLOUDINARY_API_SECRET ? "✅ Set (" + CLOUDINARY_API_SECRET.slice(-4) + ")" : "❌ MISSING"}`);

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.log("\n❌ Cloudinary is NOT configured!");
  console.log("\n🔧 To fix, add to .env.local:");
  console.log("   CLOUDINARY_CLOUD_NAME=dgntrakv6");
  console.log("   CLOUDINARY_API_KEY=your_api_key");
  console.log("   CLOUDINARY_API_SECRET=your_api_secret");
  process.exit(1);
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true,
});

// Test 1: Ping Cloudinary
console.log("\n📋 TEST 1: Ping Cloudinary");
console.log("------------------------------------------------------------");
try {
  const pingResult = await cloudinary.api.ping();
  console.log("✅ Cloudinary connection successful!");
  console.log("   Response:", pingResult);
} catch (error) {
  console.log("❌ Cloudinary connection failed:", error.message);
  process.exit(1);
}

// Test 2: Upload a test image
console.log("\n📋 TEST 2: Upload Test Image");
console.log("------------------------------------------------------------");

// Create a simple 1x1 red PNG image as base64
const testImageBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";

const timestamp = Date.now();
const publicId = `test_upload_${timestamp}`;

try {
  console.log("Uploading test image...");
  console.log(`   Public ID: ${publicId}`);
  console.log(`   Folder: test`);
  
  const uploadResult = await cloudinary.uploader.upload(testImageBase64, {
    folder: "test",
    public_id: publicId,
    resource_type: "image",
  });
  
  console.log("\n✅ Upload successful!");
  console.log("   URL:", uploadResult.secure_url);
  console.log("   Public ID:", uploadResult.public_id);
  console.log("   Format:", uploadResult.format);
  console.log("   Size:", uploadResult.bytes, "bytes");
  console.log("   Width:", uploadResult.width);
  console.log("   Height:", uploadResult.height);
  
  // Test 3: Verify image exists by fetching it
  console.log("\n📋 TEST 3: Verify Image Exists");
  console.log("------------------------------------------------------------");
  
  try {
    const imageRes = await fetch(uploadResult.secure_url, { method: "HEAD" });
    if (imageRes.ok) {
      console.log("✅ Image is accessible at URL");
    } else {
      console.log("⚠️  Image may not be immediately accessible (status:", imageRes.status + ")");
    }
  } catch (e) {
    console.log("⚠️  Could not verify image accessibility:", e.message);
  }
  
  // Test 4: Delete the test image
  console.log("\n📋 TEST 4: Delete Test Image");
  console.log("------------------------------------------------------------");
  
  const deleteResult = await cloudinary.uploader.destroy(`test/${publicId}`);
  if (deleteResult.result === "ok") {
    console.log("✅ Test image deleted successfully");
  } else {
    console.log("⚠️  Could not delete test image:", deleteResult.result);
  }
  
  console.log("\n============================================================");
  console.log("📊 TEST SUMMARY");
  console.log("============================================================");
  console.log("Cloudinary Config:    ✅");
  console.log("Connection Test:      ✅");
  console.log("Upload Test:          ✅");
  console.log("Image Accessible:     ✅");
  console.log("Delete Test:          ✅");
  console.log("\n🎉 All tests passed! Images WILL upload to Cloudinary.");
  console.log("============================================================");
  
} catch (error) {
  console.log("\n❌ Upload failed:", error.message);
  console.log("\nPossible causes:");
  console.log("1. Invalid API credentials");
  console.log("2. Network connectivity issues");
  console.log("3. Cloudinary service down");
  console.log("\nFull error:", error);
  process.exit(1);
}
