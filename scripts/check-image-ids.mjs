/**
 * Check image_ids in Neon DB
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

console.log("=== Checking Image IDs in Neon DB ===\n");

try {
  // Get sample image_ids
  const results = await sql`
    SELECT id, image_id 
    FROM vehicles 
    WHERE image_id IS NOT NULL AND TRIM(image_id) != '' 
    LIMIT 10
  `;
  
  console.log(`Found ${results.length} vehicles with image_ids:\n`);
  
  for (const row of results) {
    const imageId = row.image_id;
    const isDriveId = /^[a-zA-Z0-9_-]{25,44}$/.test(imageId);
    const isUrl = imageId.startsWith('http');
    
    console.log(`Vehicle ${row.id}:`);
    console.log(`  image_id: ${imageId}`);
    console.log(`  Type: ${isDriveId ? 'Google Drive ID' : isUrl ? 'URL' : 'Other/Cloudinary'}`);
    console.log(`  Length: ${imageId.length}`);
    console.log('');
  }
  
  // Count by type
  const allWithImages = await sql`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE image_id ~ '^[a-zA-Z0-9_-]{25,44}$') as drive_ids,
      COUNT(*) FILTER (WHERE image_id LIKE 'http%') as urls,
      COUNT(*) FILTER (WHERE image_id NOT ~ '^[a-zA-Z0-9_-]{25,44}$' AND image_id NOT LIKE 'http%') as other
    FROM vehicles 
    WHERE image_id IS NOT NULL AND TRIM(image_id) != ''
  `;
  
  console.log("=== Summary ===");
  console.log(`Total with images: ${allWithImages[0].total}`);
  console.log(`Google Drive IDs: ${allWithImages[0].drive_ids}`);
  console.log(`URLs: ${allWithImages[0].urls}`);
  console.log(`Other/Cloudinary: ${allWithImages[0].other}`);
  
} catch (error) {
  console.error("Error:", error.message);
  process.exit(1);
}
