#!/usr/bin/env node
/**
 * Test Cloudinary connection and upload functionality
 */

import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

console.log('🔧 Cloudinary Configuration Check');
console.log('=====================================');
console.log('Cloud Name:', CLOUDINARY_CLOUD_NAME ? '✅ Set' : '❌ Not set');
console.log('API Key:', CLOUDINARY_API_KEY ? '✅ Set' : '❌ Not set');
console.log('API Secret:', CLOUDINARY_API_SECRET ? '✅ Set' : '❌ Not set');

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error('\n❌ Cloudinary is not properly configured');
  console.error('Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET');
  process.exit(1);
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true,
});

async function testConnection() {
  console.log('\n🧪 Testing Cloudinary Connection...');
  
  try {
    const result = await cloudinary.api.ping();
    console.log('✅ Cloudinary connection successful!');
    console.log('   Response:', result);
    return true;
  } catch (error) {
    console.error('❌ Cloudinary connection failed:', error.message);
    return false;
  }
}

async function testUpload() {
  console.log('\n🧪 Testing Cloudinary Upload (with retry logic)...');
  
  // Create a small test image (1x1 transparent PNG)
  const testBase64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  
  const maxRetries = 3;
  let attempts = 0;
  
  while (attempts < maxRetries) {
    attempts++;
    console.log(`\n   Attempt ${attempts}/${maxRetries}...`);
    
    try {
      const result = await Promise.race([
        cloudinary.uploader.upload(testBase64Image, {
          folder: 'vms/test',
          public_id: `test_${Date.now()}`,
          resource_type: 'image',
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Upload timeout')), 30000)
        )
      ]);
      
      console.log('✅ Upload successful!');
      console.log('   URL:', result.secure_url);
      console.log('   Public ID:', result.public_id);
      console.log('   Attempts:', attempts);
      
      // Clean up - delete the test image
      try {
        await cloudinary.uploader.destroy(result.public_id);
        console.log('   🗑️ Test image cleaned up');
      } catch (e) {
        console.log('   ⚠️ Could not clean up test image:', e.message);
      }
      
      return true;
    } catch (error) {
      console.error(`   ❌ Attempt ${attempts} failed:`, error.message);
      
      // Check if it's a transient error
      const isTransient = error.message.includes('timeout') || 
                          error.message.includes('502') ||
                          error.message.includes('503') ||
                          error.message.includes('504') ||
                          error.message.includes('ECONNRESET');
      
      if (isTransient && attempts < maxRetries) {
        const delay = 1000 * Math.pow(2, attempts - 1);
        console.log(`   🔄 Retrying after ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        console.error('\n❌ Upload failed after', attempts, 'attempt(s)');
        return false;
      }
    }
  }
  
  return false;
}

// Run tests
async function runTests() {
  const connectionOk = await testConnection();
  
  if (connectionOk) {
    const uploadOk = await testUpload();
    
    if (uploadOk) {
      console.log('\n✅ All tests passed!');
      process.exit(0);
    } else {
      console.log('\n❌ Upload test failed');
      process.exit(1);
    }
  } else {
    console.log('\n❌ Connection test failed');
    process.exit(1);
  }
}

runTests();
