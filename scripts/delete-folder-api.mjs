/**
 * Script to explicitly delete Cloudinary folders using Admin API
 * Run with: node scripts/delete-folder-api.mjs
 */

import https from 'https';

// Cloudinary credentials
const CLOUD_NAME = 'dgntrakv6';
const API_KEY = '451223545965496';
const API_SECRET = '9WNuYMzGCDjif2b96IgyS1HS8kQ';

// Create authentication string
const auth = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');

function makeRequest(path, method = 'GET', postData = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.cloudinary.com',
      port: 443,
      path: `/v1_1/${CLOUD_NAME}${path}`,
      method: method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    };

    if (postData) {
      const postDataString = JSON.stringify(postData);
      options.headers['Content-Length'] = Buffer.byteLength(postDataString);
    }

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', (_error) => {
      reject(_error);
    });

    if (postData) {
      req.write(JSON.stringify(postData));
    }

    req.end();
  });
}

async function deleteFolder(folderPath) {
  console.log(`\n🗑️  Attempting to delete folder: "${folderPath}"`);
  
  try {
    // Try using the delete_folder API
    const result = await makeRequest(`/folders/${encodeURIComponent(folderPath)}`, 'DELETE');
    console.log(`   ✅ Result:`, result);
    return result;
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
    
    // Try alternative approach - POST to delete_folder endpoint
    try {
      console.log(`   🔄 Trying alternative method...`);
      const result2 = await makeRequest(`/folders/${encodeURIComponent(folderPath)}/destroy`, 'POST');
      console.log(`   ✅ Alternative result:`, result2);
      return result2;
    } catch (error2) {
      console.error(`   ❌ Alternative also failed:`, error2.message);
      return null;
    }
  }
}

async function listAllFolders() {
  console.log('🔍 Listing all folders...');
  
  try {
    const result = await makeRequest('/folders');
    console.log(`   Found ${result.folders?.length || 0} folders`);
    return result.folders || [];
  } catch (error) {
    console.error('   ❌ Error listing folders:', error.message);
    return [];
  }
}

async function main() {
  console.log('🚀 Cloudinary Folder Deletion Script\n');
  
  // First, list all folders
  const folders = await listAllFolders();
  
  // Find test folders
  const testFolders = folders.filter(f => 
    f.path === 'test' || 
    f.path === 'vms/test' ||
    f.path.includes('/test')
  );
  
  console.log(`\n🎯 Found ${testFolders.length} test folder(s):`);
  testFolders.forEach(f => console.log(`   - ${f.path}`));
  
  // Try to delete each test folder
  for (const folder of testFolders) {
    await deleteFolder(folder.path);
  }
  
  // Also try direct deletion of known paths
  console.log('\n🧹 Trying direct deletion of known test paths...');
  await deleteFolder('vms/test');
  await deleteFolder('test');
  
  console.log('\n✅ Script completed');
  console.log('\n📋 Note: If folders still appear in the dashboard:');
  console.log('   1. Go to https://console.cloudinary.com');
  console.log('   2. Navigate to Media Library > Folders');
  console.log('   3. Right-click on "vms/test" folder');
  console.log('   4. Select "Delete folder"');
  console.log('\n   Cloudinary API has limitations on folder deletion.');
  console.log('   Manual deletion from the UI is sometimes required.');
}

main().catch(console.error);
