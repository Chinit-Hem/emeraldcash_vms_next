#!/usr/bin/env node
/**
 * Test script to verify image upload flow via API
 * Tests that base64 images are properly uploaded to Cloudinary
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create a small test base64 image (1x1 transparent PNG)
const testBase64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function testImageUpload() {
  console.log('🧪 Testing Image Upload Flow\n');
  
  const baseUrl = 'http://localhost:3000';
  
  try {
    // Step 1: Get a test vehicle
    console.log('1️⃣ Fetching test vehicle...');
    const vehiclesRes = await fetch(`${baseUrl}/api/vehicles?limit=10`);
    const vehiclesData = await vehiclesRes.json();
    
    if (!vehiclesData.data || vehiclesData.data.length === 0) {
      throw new Error('No vehicles found for testing');
    }
    
    const testVehicle = vehiclesData.data[0];
    console.log(`   ✅ Found vehicle: ${testVehicle.Brand} ${testVehicle.Model} (ID: ${testVehicle.VehicleId})`);
    
    // Step 2: Update vehicle with base64 image
    console.log('\n2️⃣ Testing image upload via PUT...');
    const updateData = {
      VehicleId: testVehicle.VehicleId,
      Brand: testVehicle.Brand,
      Model: testVehicle.Model,
      Plate: testVehicle.Plate,
      Image: testBase64Image, // This should trigger Cloudinary upload
    };
    
    const updateRes = await fetch(`${baseUrl}/api/vehicles/${testVehicle.VehicleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    
    const updateResult = await updateRes.json();
    
    if (!updateRes.ok) {
      console.error(`   ❌ Upload failed: ${updateResult.error || 'Unknown error'}`);
      return false;
    }
    
    console.log(`   ✅ Upload successful`);
    console.log(`   📊 Response:`, JSON.stringify(updateResult, null, 2));
    
    // Step 3: Verify the image was stored as Cloudinary URL (not base64)
    console.log('\n3️⃣ Verifying image storage...');
    const verifyRes = await fetch(`${baseUrl}/api/vehicles/${testVehicle.VehicleId}`);
    const verifyData = await verifyRes.json();
    
    if (!verifyData.data) {
      console.error('   ❌ Could not verify vehicle data');
      return false;
    }
    
    const storedImage = verifyData.data.Image;
    
    if (!storedImage) {
      console.log('   ⚠️ No image stored (Image field is empty)');
    } else if (storedImage.startsWith('data:')) {
      console.error('   ❌ Image stored as base64 (should be Cloudinary URL)');
      console.error(`   📄 Image starts with: ${storedImage.substring(0, 50)}...`);
      return false;
    } else if (storedImage.includes('cloudinary.com') || storedImage.startsWith('http')) {
      console.log(`   ✅ Image stored as URL: ${storedImage.substring(0, 80)}...`);
    } else {
      console.log(`   ⚠️ Image stored in unknown format: ${storedImage.substring(0, 50)}...`);
    }
    
    console.log('\n✅ All tests passed!');
    return true;
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run the test
testImageUpload().then(success => {
  process.exit(success ? 0 : 1);
});
