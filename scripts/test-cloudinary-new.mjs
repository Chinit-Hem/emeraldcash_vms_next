import { config } from "dotenv";
import { v2 as cloudinary } from "cloudinary";

config({ path: ".env.local" });

// Use individual environment variables (new format)
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

console.log("🔍 Checking Cloudinary Configuration (New Format)...\n");

// Check if all required variables are set
if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error("❌ Missing Cloudinary environment variables");
  console.log("\nPlease add the following to your .env.local file:");
  console.log('CLOUDINARY_CLOUD_NAME=your_cloud_name');
  console.log('CLOUDINARY_API_KEY=your_api_key');
  console.log('CLOUDINARY_API_SECRET=your_api_secret');
  console.log("\nYou can find these values in your Cloudinary Dashboard:");
  console.log("https://cloudinary.com/console");
  process.exit(1);
}

console.log("✅ All Cloudinary environment variables are set");
console.log(`   Cloud Name: ${CLOUDINARY_CLOUD_NAME}`);
console.log(`   API Key: ${CLOUDINARY_API_KEY.substring(0, 4)}...${CLOUDINARY_API_KEY.substring(CLOUDINARY_API_KEY.length - 4)}`);
console.log(`   API Secret: ****${CLOUDINARY_API_SECRET.substring(CLOUDINARY_API_SECRET.length - 4)}`);

// Configure Cloudinary
cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true,
});

// Test connection
async function testConnection() {
  try {
    console.log("\n🔌 Testing Cloudinary connection...");
    const result = await cloudinary.api.ping();
    console.log("✅ Cloudinary connection successful!");
    return true;
  } catch (error) {
    console.error("❌ Cloudinary connection failed:", error.message);
    
    if (error.message.includes("401") || error.message.includes("Invalid api_key")) {
      console.log("\n⚠️  401 Error: Invalid API credentials");
      console.log("\nPlease verify your Cloudinary credentials:");
      console.log("1. Log in to https://cloudinary.com/console");
      console.log("2. Go to Dashboard → Account Details");
      console.log("3. Copy the correct values for:");
      console.log("   - CLOUDINARY_CLOUD_NAME");
      console.log("   - CLOUDINARY_API_KEY");
      console.log("   - CLOUDINARY_API_SECRET");
      console.log("\n4. Update your .env.local file with the correct credentials");
    }
    
    return false;
  }
}

// Test upload to specific folders
async function testUpload() {
  // Create a simple 1x1 pixel transparent PNG as base64
  const testImageBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  
  const folders = ["vms/cars", "vms/motorcycles", "vms/tuktuks"];
  
  for (const folder of folders) {
    try {
      console.log(`\n📤 Testing upload to folder: ${folder}`);
      const result = await cloudinary.uploader.upload(testImageBase64, {
        folder: folder,
        public_id: `test_${Date.now()}`,
        resource_type: "image",
      });
      
      console.log(`✅ Upload successful!`);
      console.log(`   Public ID: ${result.public_id}`);
      console.log(`   URL: ${result.secure_url}`);
      
      // Clean up - delete the test image
      console.log(`   🗑️  Cleaning up test image...`);
      await cloudinary.uploader.destroy(result.public_id);
      console.log(`   ✅ Test image deleted`);
      
    } catch (error) {
      console.error(`❌ Upload to ${folder} failed:`, error.message);
    }
  }
}

async function main() {
  const connected = await testConnection();
  if (connected) {
    await testUpload();
    console.log("\n✅ All tests completed!");
  } else {
    console.log("\n❌ Connection test failed. Please check your Cloudinary credentials.");
    process.exit(1);
  }
}

main();
