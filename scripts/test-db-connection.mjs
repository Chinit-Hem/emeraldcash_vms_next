/**
 * Database Connection Test Script
 * Diagnoses Neon DB connection issues including sdk_semver error
 */

import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";

// Load environment variables from .env file
dotenv.config();

console.log("=== Database Connection Diagnostic ===\n");

// Check environment variables
const dbUrl = process.env.DATABASE_URL;
console.log("1. Environment Check:");
console.log("   DATABASE_URL exists:", !!dbUrl);

if (!dbUrl) {
  console.error("   ❌ ERROR: DATABASE_URL is not set!");
  console.error("   Please check your .env file or environment configuration.");
  process.exit(1);
}

// Mask the URL for safe logging
const maskedUrl = dbUrl.replace(/\/\/[^:]+:[^@]+@/, "//****:****@");
console.log("   DATABASE_URL (masked):", maskedUrl);

// Check if URL already has query parameters
const hasQueryParams = dbUrl.includes("?");
console.log("   URL has query params:", hasQueryParams);

// Add sdk_semver parameter
const urlWithSdk = hasQueryParams 
  ? `${dbUrl}&sdk_semver=1.0.2` 
  : `${dbUrl}?sdk_semver=1.0.2`;

console.log("\n2. SDK Version Check:");
console.log("   Neon SDK version: 1.0.2");
console.log("   URL with sdk_semver added");

// Test connection
console.log("\n3. Connection Test:");
console.log("   Attempting to connect...");

try {
  const sql = neon(urlWithSdk, {
    fetchOptions: {
      keepalive: true,
    },
  });

  // Test with a simple query
  const result = await sql`SELECT version()`;
  
  console.log("   ✅ Connection successful!");
  console.log("   PostgreSQL version:", result[0]?.version);
  
  // Test vehicles table
  console.log("\n4. Vehicles Table Check:");
  try {
    const vehicleCount = await sql`SELECT COUNT(*) as count FROM vehicles`;
    console.log("   ✅ Vehicles table accessible");
    console.log("   Vehicle count:", vehicleCount[0]?.count);
  } catch (tableError) {
    console.error("   ❌ Error accessing vehicles table:", tableError.message);
  }
  
  process.exit(0);
} catch (error) {
  console.error("   ❌ Connection failed!");
  console.error("   Error message:", error.message);
  
  if (error.message.includes("sdk_semver")) {
    console.error("\n   🔍 sdk_semver Error Detected!");
    console.error("   This usually means:");
    console.error("   - The Neon SDK version is incompatible");
    console.error("   - The connection URL format is incorrect");
    console.error("   - There's a proxy or middleware interfering");
  }
  
  process.exit(1);
}
