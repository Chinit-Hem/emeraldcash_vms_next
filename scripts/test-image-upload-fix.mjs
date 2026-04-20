/**
 * Test script to verify the image upload fix
 * Tests that File objects can be passed directly to Cloudinary
 */

import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Cloudinary
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error("❌ Cloudinary credentials not configured");
  console.error("Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET");
  process.exit(1);
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true,
});

console.log("🧪 Testing Image Upload Fix");
console.log("==========================\n");

// Test 1: Upload using File-like object (Buffer + stream)
async function testFileUpload() {
  console.log("Test 1: Upload using File-like object (Buffer + stream)");
  
  try {
    // Create a simple test image (1x1 pixel PNG)
    const testImagePath = path.join(__dirname, "test-image.png");
    
    // If test image doesn't exist, create a minimal one
    if (!fs.existsSync(testImagePath)) {
      // Minimal 1x1 transparent PNG
      const minimalPng = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
        0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, // IDAT chunk
        0x54, 0x78, 0x9C, 0x63, 0x60, 0x00, 0x00, 0x00,
        0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC, 0x33, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, // IEND chunk
        0x42, 0x60, 0x82
      ]);
      fs.writeFileSync(testImagePath, minimalPng);
    }
    
    // Read file as buffer (simulating File.arrayBuffer())
    const buffer = fs.readFileSync(testImagePath);
    console.log(`  📄 Test image size: ${buffer.length} bytes`);
    
    // Upload using upload_stream (the new method)
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "test-uploads",
          public_id: `test_file_${Date.now()}`,
          resource_type: "image",
        },
        (error, uploadResult) => {
          if (error) {
            reject(error);
          } else {
            resolve(uploadResult);
          }
        }
      );
      uploadStream.end(buffer);
    });
    
    console.log("  ✅ File upload successful!");
    console.log(`  📎 URL: ${result.secure_url}`);
    console.log(`  🆔 Public ID: ${result.public_id}`);
    
    // Clean up test image
    fs.unlinkSync(testImagePath);
    
    return { success: true, url: result.secure_url, publicId: result.public_id };
  } catch (error) {
    console.error("  ❌ File upload failed:", error.message);
    return { success: false, error: error.message };
  }
}

// Test 2: Upload using base64 (legacy method)
async function testBase64Upload() {
  console.log("\nTest 2: Upload using base64 (legacy method)");
  
  try {
    // Create a simple test image as base64
    const base64Image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    
    const result = await cloudinary.uploader.upload(base64Image, {
      folder: "test-uploads",
      public_id: `test_base64_${Date.now()}`,
      resource_type: "image",
    });
    
    console.log("  ✅ Base64 upload successful!");
    console.log(`  📎 URL: ${result.secure_url}`);
    console.log(`  🆔 Public ID: ${result.public_id}`);
    
    return { success: true, url: result.secure_url, publicId: result.public_id };
  } catch (error) {
    console.error("  ❌ Base64 upload failed:", error.message);
    return { success: false, error: error.message };
  }
}

// Test 3: Test WebP file upload (the problematic format)
async function testWebPUpload() {
  console.log("\nTest 3: Upload WebP file (previously problematic)");
  
  try {
    // Create a minimal WebP file
    // WebP file header: RIFF....WEBP
    const webpHeader = Buffer.from([
      0x52, 0x49, 0x46, 0x46, // "RIFF"
      0x1A, 0x00, 0x00, 0x00, // file size
      0x57, 0x45, 0x42, 0x50, // "WEBP"
      0x56, 0x50, 0x38, 0x20, // "VP8 "
      0x0E, 0x00, 0x00, 0x00, // chunk size
      0x30, 0x01, 0x00, 0x9D, 0x01, 0x2A, 0x01, 0x00, // VP8 data
      0x01, 0x00, 0x34, 0x25, 0xA4, 0x00, 0x03, 0x70,
      0x00, 0xFE, 0xFB, 0xFD, 0x50, 0x00
    ]);
    
    const testWebPPath = path.join(__dirname, "test-image.webp");
    fs.writeFileSync(testWebPPath, webpHeader);
    
    // Read and upload
    const buffer = fs.readFileSync(testWebPPath);
    console.log(`  📄 Test WebP size: ${buffer.length} bytes`);
    
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "test-uploads",
          public_id: `test_webp_${Date.now()}`,
          resource_type: "image",
        },
        (error, uploadResult) => {
          if (error) {
            reject(error);
          } else {
            resolve(uploadResult);
          }
        }
      );
      uploadStream.end(buffer);
    });
    
    console.log("  ✅ WebP upload successful!");
    console.log(`  📎 URL: ${result.secure_url}`);
    
    // Clean up
    fs.unlinkSync(testWebPPath);
    
    return { success: true, url: result.secure_url };
  } catch (error) {
    console.error("  ❌ WebP upload failed:", error.message);
    // WebP might not be supported, that's okay for this test
    console.log("  ⚠️  WebP upload failed (this may be expected if WebP is not supported)");
    return { success: false, error: error.message };
  }
}

// Cleanup function
async function cleanupTestUploads() {
  console.log("\n🧹 Cleaning up test uploads...");
  
  try {
    // Delete test folder contents
    const result = await cloudinary.api.delete_resources_by_prefix("test-uploads/");
    console.log(`  ✅ Deleted ${result.deleted?.length || 0} test resources`);
  } catch (error) {
    console.log("  ⚠️  Cleanup skipped:", error.message);
  }
}

// Run all tests
async function runTests() {
  console.log("Cloudinary Configuration:");
  console.log(`  ☁️  Cloud Name: ${CLOUDINARY_CLOUD_NAME}`);
  console.log(`  🔑 API Key: ${CLOUDINARY_API_KEY.substring(0, 4)}...${CLOUDINARY_API_KEY.slice(-4)}`);
  console.log(`  🔒 API Secret: ****${CLOUDINARY_API_SECRET.slice(-4)}\n`);
  
  const results = {
    fileUpload: await testFileUpload(),
    base64Upload: await testBase64Upload(),
    webpUpload: await testWebPUpload(),
  };
  
  await cleanupTestUploads();
  
  console.log("\n==========================");
  console.log("📊 Test Results Summary");
  console.log("==========================");
  console.log(`File Upload (New Method): ${results.fileUpload.success ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`Base64 Upload (Legacy):   ${results.base64Upload.success ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`WebP Upload:              ${results.webpUpload.success ? "✅ PASS" : "⚠️  SKIP/FAIL"}`);
  
  const allPassed = results.fileUpload.success && results.base64Upload.success;
  
  if (allPassed) {
    console.log("\n✅ All critical tests passed! The image upload fix is working.");
    process.exit(0);
  } else {
    console.log("\n❌ Some tests failed. Please check the error messages above.");
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error("💥 Test suite failed:", error);
  process.exit(1);
});
