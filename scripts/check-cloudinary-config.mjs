// Check Cloudinary configuration
import { config } from "dotenv";

config({ path: ".env.local" });

const CLOUDINARY_URL = process.env.CLOUDINARY_URL;

console.log("=== Cloudinary Configuration Check ===\n");

if (!CLOUDINARY_URL) {
  console.error("❌ CLOUDINARY_URL is not set");
  console.log("\nTo fix this, add to your .env.local file:");
  console.log('CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME');
  console.log("\nGet your credentials from: https://cloudinary.com/console");
  process.exit(1);
}

console.log("✅ CLOUDINARY_URL is set");

// Parse the URL to check format
const urlMatch = CLOUDINARY_URL.match(/cloudinary:\/\/([^:]+):([^@]+)@(.+)/);

if (!urlMatch) {
  console.error("❌ CLOUDINARY_URL format is invalid");
  console.log("\nExpected format: cloudinary://API_KEY:API_SECRET@CLOUD_NAME");
  console.log("Example: cloudinary://123456789:abcdef@mycloud");
  process.exit(1);
}

const [, apiKey, apiSecret, cloudName] = urlMatch;

console.log(`✅ URL format is valid`);
console.log(`   Cloud Name: ${cloudName}`);
console.log(`   API Key: ${apiKey.substring(0, 4)}...${apiKey.substring(-4)}`);
console.log(`   API Secret: ${apiSecret.substring(0, 4)}... (hidden)`);

// Test actual connection
console.log("\n🔌 Testing Cloudinary connection...");

try {
  const { v2: cloudinary } = await import("cloudinary");
  
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  const result = await cloudinary.api.ping();
  console.log("✅ Cloudinary connection successful!");
  console.log(`   Status: ${result.status || "OK"}`);
  
  // Try to get account info
  try {
    const account = await cloudinary.api.usage();
    console.log(`   Plan: ${account.plan || "Unknown"}`);
  } catch (_e) {
    // Ignore account info errors
  }
  
} catch (error) {
  console.error("❌ Cloudinary connection failed:");
  console.error(`   ${error.message}`);
  console.log("\nPossible causes:");
  console.log("1. Invalid API key or secret");
  console.log("2. Cloud name doesn't exist");
  console.log("3. Network connectivity issues");
  console.log("4. Cloudinary service is down");
  process.exit(1);
}

console.log("\n✅ All checks passed! Cloudinary is properly configured.");
