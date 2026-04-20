// Upload vehicle images to correct Cloudinary folders
// Cars -> CarsVMS, Motorcycles -> MotorcyclesVMS, TukTuks -> TukTuksVMS
import { v2 as cloudinary } from "cloudinary";
import { neon } from "@neondatabase/serverless";
import fs from "fs";

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

// Folder mapping - matches your Cloudinary console folders
const FOLDERS = {
  CARS: "CarsVMS",
  MOTORCYCLES: "MotorcyclesVMS",
  TUKTUKS: "TukTuksVMS"
};

/**
 * Get folder based on vehicle category
 */
function getFolderByCategory(category) {
  const cat = category.toLowerCase().trim();
  
  // Motorcycles
  if (cat.includes("motor") || cat.includes("bike") || cat.includes("scooter")) {
    return FOLDERS.MOTORCYCLES;
  }
  
  // TukTuks
  if (cat.includes("tuk") || cat.includes("rickshaw") || cat.includes("three wheel")) {
    return FOLDERS.TUKTUKS;
  }
  
  // Default: Cars (SUV, Sedan, Truck, Car, etc.)
  return FOLDERS.CARS;
}

/**
 * Upload image and save to database
 */
async function uploadToFolder(imagePath, vehicleId, category) {
  try {
    // Determine correct folder
    const folder = getFolderByCategory(category);
    
    console.log(`\n📤 Uploading to ${folder}...`);
    console.log(`   Vehicle: ${vehicleId}`);
    console.log(`   Category: ${category}`);
    
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(imagePath, {
      folder: folder,
      public_id: `${vehicleId}_${Date.now()}`,
      resource_type: "image"
    });
    
    console.log(`✅ Uploaded!`);
    console.log(`   URL: ${result.secure_url}`);
    console.log(`   Folder: ${folder}`);
    
    // Save URL to database
    const updateResult = await sql`
      UPDATE vehicles 
      SET image = ${result.secure_url}, updated_at = NOW()
      WHERE vehicle_id = ${vehicleId}
      RETURNING vehicle_id, brand, model, category, image
    `;
    
    if (updateResult.length > 0) {
      console.log(`✅ Saved to database!`);
      console.log(`   Vehicle: ${updateResult[0].brand} ${updateResult[0].model}`);
    } else {
      console.log(`⚠️ Vehicle ${vehicleId} not found - but image uploaded to ${folder}`);
    }
    
    return {
      success: true,
      url: result.secure_url,
      folder: folder,
      publicId: result.public_id
    };
    
  } catch (error) {
    console.error(`❌ Error:`, error.message);
    return { success: false, error: error.message };
  }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 3) {
  console.log(`
========================================
  Cloudinary Upload to Folders
========================================

Usage: node scripts/upload-to-folder.mjs <image-path> <vehicle-id> <category>

Categories and their folders:
  • SUV, Car, Sedan, Truck, Pickup, Van 
    → CarsVMS
    https://console.cloudinary.com/app/c-e2b60edd4b863da4f82a3c9f5157e9/assets/media_library/folders/ce555092908976deefcf5144e334d91fa5

  • Motorcycle, Motorbike, Scooter 
    → MotorcyclesVMS
    https://console.cloudinary.com/app/c-e2b60edd4b863da4f82a3c9f5157e9/assets/media_library/folders/ce5550c3538940f637816b763306aeb17b

  • TukTuk, Auto Rickshaw, Three Wheeler 
    → TukTuksVMS
    https://console.cloudinary.com/app/c-e2b60edd4b863da4f82a3c9f5157e9/assets/media_library/folders/ce55505c300960c23aff469967deea2277

Examples:
  node scripts/upload-to-folder.mjs ./toyota.jpg VH001 SUV
  node scripts/upload-to-folder.mjs ./honda.jpg VH002 Motorcycle
  node scripts/upload-to-folder.mjs ./tuk.jpg VH003 TukTuk
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
uploadToFolder(imagePath, vehicleId, category).then(result => {
  if (result.success) {
    console.log(`\n✅ Complete!`);
    console.log(`   Image URL: ${result.url}`);
    console.log(`   Folder: ${result.folder}`);
  }
  process.exit(result.success ? 0 : 1);
});
