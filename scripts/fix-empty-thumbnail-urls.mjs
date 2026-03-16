/**
 * Database Cleanup Script: Fix Empty thumbnail_url Values
 * 
 * This script updates all vehicles that have empty or invalid thumbnail_url values
 * to set thumbnail_url to NULL, allowing the image_id field to be used instead.
 * 
 * Usage: node scripts/fix-empty-thumbnail-urls.mjs
 */

import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";

// Load environment variables from .env file
dotenv.config();

async function fixEmptyThumbnailUrls() {
  console.log("🔧 Starting thumbnail_url cleanup...\n");

  // Check environment variables
  const dbUrl = process.env.DATABASE_URL;
  console.log("📡 Database Configuration:");
  console.log("   DATABASE_URL exists:", !!dbUrl);

  if (!dbUrl) {
    console.error("   ❌ ERROR: DATABASE_URL is not set!");
    console.error("   Please check your .env file or environment configuration.");
    process.exit(1);
  }

  // Mask the URL for safe logging
  const maskedUrl = dbUrl.replace(/\/\/[^:]+:[^@]+@/, "//****:****@");
  console.log("   DATABASE_URL (masked):", maskedUrl);

  // Add sdk_semver parameter
  const hasQueryParams = dbUrl.includes("?");
  const urlWithSdk = hasQueryParams 
    ? `${dbUrl}&sdk_semver=1.0.2` 
    : `${dbUrl}?sdk_semver=1.0.2`;

  console.log("\n🔌 Connecting to database...");
  
  try {
    const sql = neon(urlWithSdk, {
      fetchOptions: {
        keepalive: true,
      },
    });

    // Test connection
    await sql`SELECT 1 as connection_test`;
    console.log("✅ Database connection successful\n");
    
    // Find vehicles with empty or invalid thumbnail_url
    console.log("🔍 Finding vehicles with empty/invalid thumbnail_url...");
    const vehiclesToFix = await sql`
      SELECT id, brand, model, image_id, thumbnail_url
      FROM vehicles
      WHERE thumbnail_url IS NOT NULL 
        AND TRIM(thumbnail_url) = ''
      ORDER BY id
    `;
    
    console.log(`📊 Found ${vehiclesToFix.length} vehicles with empty thumbnail_url`);
    
    if (vehiclesToFix.length > 0) {
      console.log("\n📝 Vehicles to fix:");
      vehiclesToFix.forEach(v => {
        console.log(`  - ID ${v.id}: ${v.brand} ${v.model} (image_id: ${v.image_id ? 'present' : 'null'})`);
      });
      
      // Update vehicles to set thumbnail_url to NULL
      console.log("\n🔄 Updating vehicles...");
      const updatedVehicles = await sql`
        UPDATE vehicles
        SET thumbnail_url = NULL
        WHERE thumbnail_url IS NOT NULL 
          AND TRIM(thumbnail_url) = ''
        RETURNING id, brand, model
      `;
      
      console.log(`✅ Successfully updated ${updatedVehicles.length} vehicles`);
      
      console.log("\n📝 Updated vehicles:");
      updatedVehicles.forEach(v => {
        console.log(`  - ID ${v.id}: ${v.brand} ${v.model}`);
      });
    } else {
      console.log("✅ No vehicles need fixing - all thumbnail_url values are valid");
    }
    
    // Also check for vehicles with whitespace-only thumbnail_url
    console.log("\n🔍 Checking for whitespace-only thumbnail_url values...");
    const whitespaceVehicles = await sql`
      SELECT id, brand, model, image_id, thumbnail_url
      FROM vehicles
      WHERE thumbnail_url IS NOT NULL 
        AND TRIM(thumbnail_url) != thumbnail_url
      ORDER BY id
    `;
    
    if (whitespaceVehicles.length > 0) {
      console.log(`📊 Found ${whitespaceVehicles.length} vehicles with whitespace in thumbnail_url`);
      console.log("\n📝 Vehicles with whitespace:");
      whitespaceVehicles.forEach(v => {
        console.log(`  - ID ${v.id}: ${v.brand} ${v.model}`);
      });
      
      // Trim whitespace from thumbnail_url
      console.log("\n🔄 Trimming whitespace from thumbnail_url...");
      const trimmedVehicles = await sql`
        UPDATE vehicles
        SET thumbnail_url = TRIM(thumbnail_url)
        WHERE thumbnail_url IS NOT NULL 
          AND TRIM(thumbnail_url) != thumbnail_url
        RETURNING id, brand, model
      `;
      
      console.log(`✅ Successfully trimmed ${trimmedVehicles.length} vehicles`);
    } else {
      console.log("✅ No whitespace-only thumbnail_url values found");
    }
    
    console.log("\n🎉 Cleanup complete!");
    
    // Show summary of image status
    console.log("\n📊 Image Status Summary:");
    const summary = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE image_id IS NOT NULL AND TRIM(image_id) != '') as with_image_id,
        COUNT(*) FILTER (WHERE thumbnail_url IS NOT NULL AND TRIM(thumbnail_url) != '') as with_thumbnail_url,
        COUNT(*) FILTER (WHERE image_id IS NULL OR TRIM(image_id) = '') as without_image
      FROM vehicles
    `;
    
    if (summary.length > 0) {
      const s = summary[0];
      console.log(`  - Total vehicles: ${s.total}`);
      console.log(`  - With image_id: ${s.with_image_id}`);
      console.log(`  - With thumbnail_url: ${s.with_thumbnail_url}`);
      console.log(`  - Without images: ${s.without_image}`);
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error("\n❌ Error during cleanup:", error.message);
    if (error.message.includes("sdk_semver")) {
      console.error("\n🔍 sdk_semver Error Detected!");
      console.error("   This usually means the Neon SDK version is incompatible.");
      console.error("   Try updating @neondatabase/serverless: npm install @neondatabase/serverless@latest");
    }
    process.exit(1);
  }
}

// Run the cleanup
fixEmptyThumbnailUrls();
