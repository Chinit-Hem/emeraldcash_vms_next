/**
 * Add thumbnail_url column and populate with Google Drive thumbnail URLs
 */

import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";

dotenv.config();

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const urlWithSdk = dbUrl.includes("?") 
  ? `${dbUrl}&sdk_semver=1.0.2` 
  : `${dbUrl}?sdk_semver=1.0.2`;

const sql = neon(urlWithSdk);

function getGoogleDriveThumbnailUrl(fileId) {
  if (!fileId || typeof fileId !== 'string') return null;
  // Google Drive IDs are 25-44 chars, alphanumeric + underscore + hyphen
  if (!/^[a-zA-Z0-9_-]{25,44}$/.test(fileId)) return null;
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400-h400`;
}

console.log("=== Adding Thumbnail URLs to Neon DB ===\n");

try {
  // Step 1: Add thumbnail_url column if it doesn't exist
  console.log("Step 1: Adding thumbnail_url column...");
  await sql`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS thumbnail_url TEXT`;
  console.log("✅ Column added (or already exists)\n");

  // Step 2: Get all vehicles with Google Drive image_ids
  console.log("Step 2: Finding vehicles with Google Drive IDs...");
  const vehiclesWithDriveIds = await sql`
    SELECT id, image_id 
    FROM vehicles 
    WHERE image_id IS NOT NULL 
      AND TRIM(image_id) != ''
      AND image_id ~ '^[a-zA-Z0-9_-]{25,44}$'
  `;
  
  console.log(`Found ${vehiclesWithDriveIds.length} vehicles with Google Drive IDs\n`);

  // Step 3: Update each vehicle with thumbnail_url
  console.log("Step 3: Updating thumbnail URLs...");
  let updated = 0;
  let errors = 0;
  
  for (const vehicle of vehiclesWithDriveIds) {
    const thumbnailUrl = getGoogleDriveThumbnailUrl(vehicle.image_id);
    
    if (thumbnailUrl) {
      try {
        await sql`UPDATE vehicles SET thumbnail_url = ${thumbnailUrl} WHERE id = ${vehicle.id}`;
        updated++;
        
        if (updated % 100 === 0) {
          console.log(`  Progress: ${updated}/${vehiclesWithDriveIds.length} updated...`);
        }
      } catch (err) {
        console.error(`  Error updating vehicle ${vehicle.id}:`, err.message);
        errors++;
      }
    }
  }
  
  console.log(`\n✅ Updated ${updated} vehicles with thumbnail URLs`);
  if (errors > 0) {
    console.log(`⚠️  ${errors} errors encountered`);
  }

  // Step 4: Show sample results
  console.log("\nStep 4: Sample results...");
  const samples = await sql`SELECT id, image_id, thumbnail_url FROM vehicles WHERE thumbnail_url IS NOT NULL LIMIT 5`;
  
  for (const row of samples) {
    console.log(`\nVehicle ${row.id}:`);
    console.log(`  image_id: ${row.image_id}`);
    console.log(`  thumbnail_url: ${row.thumbnail_url}`);
  }

  // Step 5: Summary statistics
  console.log("\n=== Summary ===");
  const stats = await sql`
    SELECT 
      COUNT(*) as total_vehicles,
      COUNT(thumbnail_url) as with_thumbnails,
      COUNT(*) FILTER (WHERE image_id IS NOT NULL AND TRIM(image_id) != '') as with_image_id
    FROM vehicles
  `;
  
  console.log(`Total vehicles: ${stats[0].total_vehicles}`);
  console.log(`With image_id: ${stats[0].with_image_id}`);
  console.log(`With thumbnail_url: ${stats[0].with_thumbnails}`);
  
} catch (error) {
  console.error("Error:", error.message);
  process.exit(1);
}
