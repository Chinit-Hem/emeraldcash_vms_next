// Test Cloudinary connection
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary from environment variable
// Format: cloudinary://API_KEY:API_SECRET@CLOUD_NAME
const CLOUDINARY_URL = process.env.CLOUDINARY_URL;

if (!CLOUDINARY_URL) {
  console.error("❌ CLOUDINARY_URL environment variable is not set");
  console.error("Please set it to: cloudinary://<your_api_key>:<your_api_secret>@dgntrakv6");
  process.exit(1);
}

// Parse Cloudinary URL
const urlMatch = CLOUDINARY_URL.match(/cloudinary:\/\/([^:]+):([^@]+)@(.+)/);

if (!urlMatch) {
  console.error("❌ Invalid CLOUDINARY_URL format");
  console.error("Expected format: cloudinary://API_KEY:API_SECRET@CLOUD_NAME");
  process.exit(1);
}

const [, apiKey, apiSecret, cloudName] = urlMatch;

// Configure Cloudinary
cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});


async function testCloudinary() {
  console.log("Testing Cloudinary connection...\n");
  console.log("Cloud Name:", cloudName);
  console.log("API Key:", apiKey.substring(0, 4) + "****");

  try {
    // Test 1: Ping Cloudinary
    console.log("\n1. Testing Cloudinary ping...");
    const pingResult = await cloudinary.api.ping();
    console.log("   ✅ Cloudinary ping successful:", pingResult);

    // Test 2: Get account info
    console.log("\n2. Getting account info...");
    const account = await cloudinary.api.usage();
    console.log("   ✅ Account info retrieved");
    console.log("   Plan:", account.plan);
    console.log("   Last updated:", account.last_updated);

    // Test 3: List resources (images)
    console.log("\n3. Listing resources...");
    const resources = await cloudinary.api.resources({
      type: "upload",
      max_results: 5,
    });
    console.log(`   ✅ Found ${resources.resources.length} resources`);
    if (resources.resources.length > 0) {
      console.log("   Sample resource:", resources.resources[0].public_id);
    }

    console.log("\n✅ All Cloudinary tests passed!");
    console.log("\nCloudinary is ready for image uploads.");

  } catch (error) {
    console.error("\n❌ Cloudinary test failed:", error.message);
    process.exit(1);
  }
}

testCloudinary();
