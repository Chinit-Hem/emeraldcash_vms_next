/**
 * Comprehensive script to delete ALL "test" folders from Cloudinary
 * Searches in all possible locations: root, vms/, and subfolders
 * Run with: node scripts/delete-all-test-folders.mjs
 */

import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dgntrakv6';
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

if (!CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error('❌ Error: CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET environment variables are required');
  console.log('\nPlease set them before running this script:');
  console.log('  $env:CLOUDINARY_API_KEY="your_api_key"');
  console.log('  $env:CLOUDINARY_API_SECRET="your_api_secret"');
  process.exit(1);
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true,
});

async function getAllFolders() {
  console.log('🔍 Fetching all folders from Cloudinary...\n');
  
  const allFolders = [];
  
  try {
    // Get root folders
    const rootResult = await cloudinary.api.root_folders();
    allFolders.push(...(rootResult.folders || []));
    
    // Get subfolders recursively
    for (const folder of rootResult.folders || []) {
      try {
        const subResult = await cloudinary.api.sub_folders(folder.path);
        allFolders.push(...(subResult.folders || []));
      } catch (_e) {
        // Folder might not have subfolders
      }
    }
  } catch (error) {
    console.error('Error fetching folders:', error.message);
  }
  
  return allFolders;
}

async function deleteResourcesInFolder(folderPath) {
  console.log(`\n📁 Processing folder: "${folderPath}"`);
  
  try {
    // Get all resources in this folder
    let nextCursor = null;
    let totalDeleted = 0;
    
    do {
      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix: folderPath,
        max_results: 500,
        next_cursor: nextCursor
      });
      
      const resources = result.resources || [];
      
      if (resources.length === 0) {
        console.log(`   ℹ️  No resources found in "${folderPath}"`);
        break;
      }
      
      console.log(`   🗑️  Found ${resources.length} resources, deleting...`);
      
      // Delete resources in batches
      const batchSize = 100;
      for (let i = 0; i < resources.length; i += batchSize) {
        const batch = resources.slice(i, i + batchSize);
        const publicIds = batch.map(r => r.public_id);
        
        try {
          const deleteResult = await cloudinary.api.delete_resources(publicIds);
          const deleted = Object.keys(deleteResult.deleted || {}).length;
          totalDeleted += deleted;
          console.log(`   ✅ Deleted batch ${Math.floor(i/batchSize) + 1}: ${deleted} resources`);
        } catch (error) {
          console.error(`   ❌ Failed to delete batch:`, error.message);
        }
      }
      
      nextCursor = result.next_cursor;
    } while (nextCursor);
    
    console.log(`   ✅ Total deleted from "${folderPath}": ${totalDeleted}`);
    return totalDeleted;
    
  } catch (error) {
    console.error(`   ❌ Error processing folder "${folderPath}":`, error.message);
    return 0;
  }
}

async function deleteTestFolders() {
  console.log('🚀 Starting comprehensive test folder cleanup...\n');
  
  // Define all possible test folder paths
  const testFolderPaths = [
    'test',                    // Root level test folder
    'test/',                   // Root level with trailing slash
    'vms/test',                // vms/test folder
    'vms/test/',               // vms/test with trailing slash
    'vehicles/test',           // vehicles/test folder
    'cars/test',               // cars/test folder
    'motorcycles/test',        // motorcycles/test folder
    'tuktuks/test',            // tuktuks/test folder
  ];
  
  let totalDeleted = 0;
  
  // First, try to delete resources from all known test folder paths
  for (const folderPath of testFolderPaths) {
    const deleted = await deleteResourcesInFolder(folderPath);
    totalDeleted += deleted;
  }
  
  // Also search for any folder containing "test" in its name
  console.log('\n🔍 Searching for all folders in Cloudinary...');
  const allFolders = await getAllFolders();
  
  console.log(`\n📂 Found ${allFolders.length} total folders`);
  
  const testFolders = allFolders.filter(f => 
    f.name.toLowerCase() === 'test' || 
    f.path.toLowerCase().includes('/test') ||
    f.path.toLowerCase().startsWith('test')
  );
  
  console.log(`\n🎯 Found ${testFolders.length} folder(s) with "test" in the name:`);
  testFolders.forEach(f => console.log(`   - ${f.path}`));
  
  // Delete resources from any additional test folders found
  for (const folder of testFolders) {
    const deleted = await deleteResourcesInFolder(folder.path);
    totalDeleted += deleted;
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ CLEANUP COMPLETED');
  console.log('='.repeat(60));
  console.log(`\nTotal resources deleted: ${totalDeleted}`);
  
  if (testFolders.length > 0) {
    console.log(`\n📋 Test folders found and processed:`);
    testFolders.forEach(f => console.log(`   - ${f.path}`));
  }
  
  console.log('\n📝 IMPORTANT:');
  console.log('   - Empty folders in Cloudinary are automatically removed');
  console.log('   - The folder may still appear in the dashboard for a few minutes');
  console.log('   - Try refreshing the Cloudinary dashboard (F5) in 2-3 minutes');
  console.log('   - If the folder persists, it may need to be deleted manually from the UI');
  
  // Try to explicitly delete the folder using admin API if possible
  console.log('\n🧹 Attempting to force-delete test folders...');
  for (const folderPath of ['test', 'vms/test']) {
    try {
      // Note: Cloudinary doesn't have a direct "delete folder" API
      // Folders are automatically removed when empty
      console.log(`   ℹ️  Folder "${folderPath}" will auto-delete when empty`);
    } catch (error) {
      console.log(`   ⚠️  Could not process "${folderPath}": ${error.message}`);
    }
  }
}

// Run the cleanup
deleteTestFolders().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
