#!/usr/bin/env node
/**
 * Script to create Cloudinary folders by uploading placeholder images
 * This ensures the folders vms/tuktuks and vms/motorcycles exist
 */

import { v2 as cloudinary } from 'cloudinary';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

// Check if Cloudinary is configured
if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error('❌ Cloudinary credentials not found in .env.local');
  console.error('Please ensure you have set:');
  console.error('  - CLOUDINARY_CLOUD_NAME');
  console.error('  - CLOUDINARY_API_KEY');
  console.error('  - CLOUDINARY_API_SECRET');
  process.exit(1);
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true,
});

// Folders to create
const FOLDERS_TO_CREATE = [
  'vms/tuktuks',
  'vms/motorcycles',
  'vms/cars' // Ensure cars folder also exists
];

// Create a 1x1 transparent PNG as base64 for placeholder
const TRANSPARENT_PNG_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

async function createFolder(folderPath) {
  try {
    console.log(`\n📁 Creating folder: ${folderPath}`);
    
    // Upload a placeholder image to create the folder
    const result = await cloudinary.uploader.upload(TRANSPARENT_PNG_BASE64, {
      folder: folderPath,
      public_id: '.folder_placeholder', // Hidden file to indicate folder
      resource_type: 'image',
      tags: ['folder_placeholder', 'system'],
      overwrite: false, // Don't overwrite if exists
    });
    
    console.log(`✅ Folder created/verified: ${folderPath}`);
    console.log(`   URL: ${result.secure_url}`);
    
    // Delete the placeholder immediately (folder will remain)
    try {
      await cloudinary.uploader.destroy(`${folderPath}/.folder_placeholder`);
      console.log(`   Cleaned up placeholder file`);
    } catch (_deleteError) {
      // Ignore deletion errors
    }
    
    return true;
  } catch (error) {
    if (error.message && error.message.includes('already exists')) {
      console.log(`ℹ️  Folder already exists: ${folderPath}`);
      return true;
    }
    
    console.error(`❌ Error creating folder ${folderPath}:`, error.message);
    return false;
  }
}

async function listExistingFolders() {
  try {
    console.log('\n📂 Checking existing folders...');
    const result = await cloudinary.api.root_folders();
    console.log('Existing root folders:', result.folders.map(f => f.name).join(', ') || 'None');
    return result.folders;
  } catch (error) {
    console.error('❌ Error listing folders:', error.message);
    return [];
  }
}

async function main() {
  console.log('========================================');
  console.log('  Cloudinary Folder Creation Script');
  console.log('========================================');
  console.log(`Cloud: ${CLOUDINARY_CLOUD_NAME}`);
  console.log('');
  
  // Test connection first
  try {
    await cloudinary.api.ping();
    console.log('✅ Cloudinary connection successful');
  } catch (error) {
    console.error('❌ Cloudinary connection failed:', error.message);
    process.exit(1);
  }
  
  // List existing folders
  await listExistingFolders();
  
  console.log('\n----------------------------------------');
  console.log('Creating required folders...');
  console.log('----------------------------------------');
  
  const results = [];
  for (const folder of FOLDERS_TO_CREATE) {
    const success = await createFolder(folder);
    results.push({ folder, success });
  }
  
  console.log('\n========================================');
  console.log('  Summary');
  console.log('========================================');
  
  const allSuccessful = results.every(r => r.success);
  
  for (const { folder, success } of results) {
    const status = success ? '✅' : '❌';
    console.log(`${status} ${folder}`);
  }
  
  console.log('');
  
  if (allSuccessful) {
    console.log('🎉 All folders created successfully!');
    console.log('');
    console.log('You can now upload vehicle images to these folders:');
    console.log('  - vms/cars (for Cars, SUVs, Trucks, etc.)');
    console.log('  - vms/motorcycles (for Motorcycles, Scooters, etc.)');
    console.log('  - vms/tuktuks (for Tuk Tuks, Auto Rickshaws, etc.)');
    process.exit(0);
  } else {
    console.log('⚠️  Some folders could not be created. Check the errors above.');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
