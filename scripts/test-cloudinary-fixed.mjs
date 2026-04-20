import { config } from "dotenv";
import { v2 as cloudinary } from "cloudinary";

config({ path: ".env.local" });

// Get the URL and fix the angle brackets if present
let CLOUDINARY_URL = process.env.CLOUDINARY_URL;

console.log("🔍 Checking Cloudinary Configuration...\n");

if (!CLOUDINARY_URL) {
  console.error("❌ CLOUDINARY_URL environment variable is not set");
  process.exit(1);
}

// Remove angle brackets if present (common copy-paste error)
CLOUDINARY_URL = CLOUDINARY_URL.replace(/[<>]/g, '');

console.log("Raw URL check:", CLOUDINARY_URL.substring(0, 30) + "...");

// Parse Cloudinary URL
const urlMatch = CLOUDINARY_URL.match(/cloudinary:\/\/([^:]+):([^@]+)@(.+)/);

if (!urlMatch) {
  console.error("❌ Invalid CLOUDINARY_URL format");
  console.log("Expected format: cloudinary://API_KEY:API_SECRET@CLOUD_NAME");
  console.log("Your URL:", CLOUDINARY_URL.replace(/:[^@]+@/, ":****@"));
  process.exit(1);
}

const [, apiKey, apiSecret, cloudName] = urlMatch;

console.log("✅ Cloudinary URL parsed successfully");
console.log(`   Cloud Name: ${cloudName}`);
console.log(`   API Key: ${apiKey.substring(0, 6)}...`);

// Configure Cloudinary
cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

// Test connection with better error handling
async function testConnection() {
  try {
    console.log("\n🔌 Testing Cloudinary connection...");
    
    // Try a simple API call
    const result = await cloudinary.api.ping();
    console.log("✅ Cloudinary ping successful!");
    console.log("   Result:", result);
    
    return true;
  } catch (error) {
    console.error("❌ Cloudinary connection failed");
    console.error("   Error:", error.message);
    if (error.error) {
      console.error("   Details:", error.error);
    }
    return false;
  }
}

// Test upload to specific folders
async function testUpload() {
  // Create a simple 1x1 pixel transparent PNG as base64
  const testImageBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  
  const folders = ["CarsVMS", "MotorcyclesVMS", "TukTuksVMS"];
  
  console.log("\n📤 Testing uploads to your folders...");
  
  for (const folder of folders) {
    try {
      console.log(`\n   Testing folder: ${folder}`);
      const result = await cloudinary.uploader.upload(testImageBase64, {
        folder: folder,
        public_id: `test_${Date.now()}`,
        resource_type: "image",
      });
      
      console.log(`   ✅ Upload successful!`);
      console.log(`      Public ID: ${result.public_id}`);
      console.log(`      URL: ${result.secure_url.substring(0, 60)}...`);
      
      // Clean up - delete the test image
      await cloudinary.uploader.destroy(result.public_id);
      console.log(`   ✅ Test image cleaned up`);
      
    } catch (error) {
      console.error(`   ❌ Upload to ${folder} failed:`, error.message);
      if (error.error) {
        console.error("      Details:", error.error.message || error.error);
      }
    }
  }
}

async function main() {
  const connected = await testConnection();
  if (connected) {
    await testUpload();
    console.log("\n✅ All Cloudinary tests completed!");
    console.log("\nYour Cloudinary folders:");
    console.log("   - CarsVMS: https://console.cloudinary.com/app/c-e2b60edd4b863da4f82a3c9f5157e9/assets/media_library/folders/ce555092908976deefcf5144e334d91fa5");
    console.log("   - MotorcyclesVMS: https://console.cloudinary.com/app/c-e2b60edd4b863da4f82a3c9f5157e9/assets/media_library/folders/ce5550c3538940f637816b763306aeb17b");
    console.log("   - TukTuksVMS: https://console.cloudinary.com/app/c-e2b60edd4b863da4f82a3c9f5157e9/assets/media_library/folders/ce55505c300960c23aff469967deea2277");
  } else {
    console.log("\n❌ Connection test failed.");
    console.log("\nTroubleshooting:");
    console.log("1. Check if your API key and secret are correct");
    console.log("2. Verify your Cloudinary account is active");
    console.log("3. Make sure there are no angle brackets <> in the URL");
  }
}

main();
