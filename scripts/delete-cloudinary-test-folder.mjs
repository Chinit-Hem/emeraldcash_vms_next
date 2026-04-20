/**
 * Script to delete the "test" folder from Cloudinary
 * Run with: node scripts/delete-cloudinary-test-folder.mjs
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

async function deleteTestFolder() {
  console.log('🔍 Checking for test folder in Cloudinary...\n');
  
  try {
    // First, search for all resources in the vms/test folder
    console.log('📁 Searching for resources in vms/test folder...');
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'vms/test/',
      max_results: 500
    });
    
    const resources = result.resources || [];
    console.log(`   Found ${resources.length} resources in vms/test/ folder`);
    
    if (resources.length === 0) {
      console.log('   ✅ No resources found in vms/test/ folder');
    } else {
      // Delete all resources in the test folder
      console.log('\n🗑️  Deleting resources from vms/test/ folder...');
      
      for (const resource of resources) {
        try {
          await cloudinary.uploader.destroy(resource.public_id);
          console.log(`   ✅ Deleted: ${resource.public_id}`);
        } catch (error) {
          console.error(`   ❌ Failed to delete: ${resource.public_id}`, error.message);
        }
      }
    }
    
    // Also check for any resources directly in vms/test (without trailing slash)
    console.log('\n📁 Checking for resources in vms/test (root level)...');
    const rootResult = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'vms/test',
      max_results: 500
    });
    
    const rootResources = rootResult.resources || [];
    const directTestResources = rootResources.filter(r => {
      const parts = r.public_id.split('/');
      return parts.length === 2 && parts[0] === 'vms' && parts[1] === 'test';
    });
    
    if (directTestResources.length > 0) {
      console.log(`   Found ${directTestResources.length} resources directly in vms/test`);
      
      for (const resource of directTestResources) {
        try {
          await cloudinary.uploader.destroy(resource.public_id);
          console.log(`   ✅ Deleted: ${resource.public_id}`);
        } catch (error) {
          console.error(`   ❌ Failed to delete: ${resource.public_id}`, error.message);
        }
      }
    }
    
    console.log('\n✅ Test folder cleanup completed!');
    console.log('\n📋 Note: Empty folders in Cloudinary are automatically removed.');
    console.log('   If the folder still appears in the dashboard, it should disappear');
    console.log('   after all resources are deleted (may take a few minutes).');
    
  } catch (error) {
    console.error('\n❌ Error accessing Cloudinary:', error.message);
    process.exit(1);
  }
}

// Run the deletion
deleteTestFolder();
