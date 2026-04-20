// Simple image upload to Cloudinary
import { v2 as cloudinary } from "cloudinary";
import { neon } from "@neondatabase/serverless";
import fs from "fs";
import path from "path";

// Configure Cloudinary
const CLOUDINARY_URL = process.env.CLOUDINARY_URL;

if (!CLOUDINARY_URL) {
  console.error("❌ Please set CLOUDINARY_URL environment variable");
  process.exit(1);
}

const urlMatch = CLOUDINARY_URL.match(/cloudinary:\/\/([^:]+):([^@]+)@(.+)/);
const [, apiKey, apiSecret, cloudName] = urlMatch;

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

// Database
const DATABASE_URL = process.env.DATABASE_URL;
const sql = neon(DATABASE_URL);

// Folders
const FOLDERS = {
  CAR: "CarsVMS",
  MOTORCYCLE: "MotorcyclesVMS",
  TUKTUK: "TukTuksVMS"
};

async function uploadAndSave(imagePath, vehicleId, category) {
  try {
    // Determine folder based on category
    let folder = FOLDERS.CAR;
    const cat = category.toLowerCase();
    if (cat.includes('motor') || cat.includes('bike')) {
      folder = FOLDERS.MOTORCYCLE;
    } else if (cat.includes('tuk') || cat.includes('rickshaw')) {
      folder = FOLDERS.TUKTUK;
    }
    
    console.log(`\n📤 Uploading to ${folder}...`);
    
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(imagePath, {
      folder: folder,
      public_id: `${vehicleId}_${Date.now()}`,
      resource_type: "image"
    });
    
    console.log(`✅ Uploaded!`);
    console.log(`   URL: ${result.secure_url}`);
    
    // Save URL to database
    const updateResult = await sql`
      UPDATE vehicles 
      SET image = ${result.secure_url}, updated_at = NOW()
      WHERE vehicle_id = ${vehicleId}
      RETURNING vehicle_id, brand, model, image
    `;
    
    if (updateResult.length > 0) {
      console.log(`✅ Saved to database for vehicle ${vehicleId}`);
      return {
        success: true,
        url: result.secure_url,
        vehicle: updateResult[0]
      };
    } else {
      console.log(`⚠️ Vehicle ${vehicleId} not found in database`);
      return { success: true, url: result.secure_url, vehicle: null };
    }
    
  } catch (error) {
    console.error(`❌ Error:`, error.message);
    return { success: false, error: error.message };
  }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 3) {
  console.log(`
Usage: node scripts/simple-upload.mjs <image-path> <vehicle-id> <category>

Examples:
  node scripts/simple-upload.mjs ./toyota.jpg VH001 SUV
  node scripts/simple-upload.mjs ./honda.jpg VH002 Motorcycle
  node scripts/simple-upload.mjs ./tuk.jpg VH003 TukTuk

Categories: SUV, Car, Sedan, Truck, Motorcycle, TukTuk, etc.
  `);
  process.exit(0);
}

const [imagePath, vehicleId, category] = args;

// Check if file exists
if (!fs.existsSync(imagePath)) {
  console.error(`❌ File not found: ${imagePath}`);
  process.exit(1);
}

// Run upload
console.log("🔌 Connecting to Cloudinary and Database...");
uploadAndSave(imagePath, vehicleId, category).then(result => {
  if (result.success) {
    console.log(`\n✅ Complete! Image URL: ${result.url}`);
  }
  process.exit(result.success ? 0 : 1);
});
