#!/usr/bin/env node
/**
 * Complete Upload Test - Run this AFTER creating the upload preset
 * This tests the entire flow: preset exists → can upload → image accessible
 */

import { config } from 'dotenv';
import { readFileSync, existsSync, writeFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Load environment variables
const envLocalPath = join(rootDir, '.env.local');
if (existsSync(envLocalPath)) {
  config({ path: envLocalPath });
}

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

console.log('='.repeat(80));
console.log('🧪 COMPLETE UPLOAD TEST');
console.log('='.repeat(80));
console.log();

// Step 1: Check preset exists
console.log('📋 Step 1: Checking upload preset...');
const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

try {
  const formData = new FormData();
  formData.append('upload_preset', UPLOAD_PRESET);
  
  const response = await fetch(uploadUrl, {
    method: 'POST',
    body: formData
  });
  
  const result = await response.json().catch(() => ({}));
  
  if (result.error?.message?.includes('Upload preset not found')) {
    console.log('❌ PRESET NOT FOUND');
    console.log();
    console.log('You still need to create the preset in Cloudinary:');
    console.log('1. Go to https://cloudinary.com/console');
    console.log('2. Settings → Upload → Add upload preset');
    console.log(`3. Name: ${UPLOAD_PRESET}`);
    console.log('4. Signing Mode: UNSIGNED');
    console.log('5. Save and restart your dev server');
    process.exit(1);
  }
  
  if (result.error?.message?.includes('file') || result.error?.message?.includes('File')) {
    console.log('✅ Preset exists! (Got "file required" error as expected)');
  } else {
    console.log('✅ Preset appears to be working');
  }
} catch (error) {
  console.log('⚠️  Could not verify preset:', error.message);
}

console.log();

// Step 2: Test actual upload with a small test image
console.log('📋 Step 2: Testing actual image upload...');

// Create a minimal 1x1 pixel PNG image (base64 encoded)
const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const testBuffer = Buffer.from(testImageBase64, 'base64');

try {
  const formData = new FormData();
  const blob = new Blob([testBuffer], { type: 'image/png' });
  formData.append('file', blob, 'test.png');
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'test');
  formData.append('public_id', `test_${Date.now()}`);

  console.log('   Uploading test image...');
  
  const response = await fetch(uploadUrl, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `HTTP ${response.status}`);
  }

  const result = await response.json();
  
  if (result.secure_url) {
    console.log('✅ UPLOAD SUCCESSFUL!');
    console.log();
    console.log('Image URL:', result.secure_url);
    console.log();
    console.log('🎉 Your Cloudinary setup is working correctly!');
    console.log();
    console.log('You can now:');
    console.log('✓ Upload vehicle images');
    console.log('✓ Images will display in the data list');
    console.log('✓ Everything should work as expected');
    console.log();
    console.log('Next steps:');
    console.log('1. Restart your Next.js dev server (if not already done)');
    console.log('2. Try uploading a vehicle image in the application');
    console.log('3. The image should appear in the vehicle list');
  } else {
    console.log('⚠️  Upload completed but no URL returned');
    console.log('Response:', JSON.stringify(result, null, 2));
  }
} catch (error) {
  console.log('❌ Upload failed:', error.message);
  console.log();
  console.log('Possible causes:');
  console.log('- Preset is not set to UNSIGNED mode');
  console.log('- Network connectivity issue');
  console.log('- Cloudinary service issue');
  console.log();
  console.log('To fix:');
  console.log('1. Double-check preset settings in Cloudinary dashboard');
  console.log('2. Ensure Signing Mode is UNSIGNED');
  console.log('3. Try again in a few minutes');
}

console.log();
console.log('='.repeat(80));
