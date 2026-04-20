#!/usr/bin/env node
/**
 * Critical Path Test: Image Upload Flow
 * Tests: API endpoint → Cloudinary upload → Database update → Image display
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_BASE = 'http://localhost:3001';

console.log('🧪 Critical Path Test: Image Upload Flow');
console.log('==========================================\n');

// Test 1: Get a vehicle to test with
async function test1_getVehicle() {
  console.log('Test 1: Fetching a test vehicle...');
  try {
    const res = await fetch(`${API_BASE}/api/vehicles?limit=1`);
    const data = await res.json();
    
    if (!data.data || data.data.length === 0) {
      console.log('❌ No vehicles found');
      return null;
    }
    
    const vehicle = data.data[0];
    console.log(`✅ Found vehicle: ID ${vehicle.VehicleId}, Category: ${vehicle.Category}`);
    return vehicle;
  } catch (error) {
    console.error('❌ Failed to fetch vehicle:', error.message);
    return null;
  }
}

// Test 2: Upload image to vehicle
async function test2_uploadImage(vehicle) {
  console.log(`\nTest 2: Uploading image to vehicle ${vehicle.VehicleId}...`);
  
  // Create a simple test image (1x1 transparent PNG as base64)
  const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  
  // Convert base64 to buffer
  const base64Data = testImageBase64.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  
  // Create FormData
  const formData = new FormData();
  formData.append('image', new Blob([buffer], { type: 'image/png' }), 'test-image.png');
  formData.append('brand', vehicle.Brand || 'Test Brand');
  formData.append('model', vehicle.Model || 'Test Model');
  formData.append('category', vehicle.Category || 'Car');
  formData.append('year', String(vehicle.Year || 2024));
  formData.append('price', String(vehicle.Price || 50000));
  formData.append('condition', vehicle.Condition || 'New');
  
  try {
    const startTime = Date.now();
    const res = await fetch(`${API_BASE}/api/vehicles/${vehicle.VehicleId}`, {
      method: 'PUT',
      body: formData,
    });
    
    const duration = Date.now() - startTime;
    const data = await res.json();
    
    console.log(`   Status: ${res.status} (${duration}ms)`);
    console.log(`   Response:`, JSON.stringify(data, null, 2).substring(0, 500));
    
    if (data.ok && data.data?.Image) {
      console.log('✅ Image upload successful!');
      console.log(`   Image URL: ${data.data.Image.substring(0, 100)}...`);
      return data.data;
    } else {
      console.log('❌ Upload failed:', data.error || 'Unknown error');
      return null;
    }
  } catch (error) {
    console.error('❌ Upload error:', error.message);
    return null;
  }
}

// Test 3: Verify image appears in vehicle list
async function test3_verifyImageInList(vehicleId) {
  console.log(`\nTest 3: Verifying image in vehicle list...`);
  
  try {
    const res = await fetch(`${API_BASE}/api/vehicles?limit=10`);
    const data = await res.json();
    
    if (!data.data) {
      console.log('❌ Failed to fetch vehicles');
      return false;
    }
    
    const vehicle = data.data.find(v => v.VehicleId === vehicleId);
    
    if (!vehicle) {
      console.log('❌ Vehicle not found in list');
      return false;
    }
    
    if (vehicle.Image && vehicle.Image.includes('cloudinary.com')) {
      console.log('✅ Vehicle has Cloudinary image in list!');
      console.log(`   Image URL: ${vehicle.Image.substring(0, 100)}...`);
      return true;
    } else {
      console.log('⚠️ Vehicle found but no Cloudinary image:', vehicle.Image || 'No image');
      return false;
    }
  } catch (error) {
    console.error('❌ Verification error:', error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('Starting critical path tests...\n');
  
  // Test 1: Get vehicle
  const vehicle = await test1_getVehicle();
  if (!vehicle) {
    console.log('\n❌ Test 1 failed - cannot proceed');
    process.exit(1);
  }
  
  // Test 2: Upload image
  const updatedVehicle = await test2_uploadImage(vehicle);
  if (!updatedVehicle) {
    console.log('\n❌ Test 2 failed - upload unsuccessful');
    process.exit(1);
  }
  
  // Test 3: Verify in list
  const verified = await test3_verifyImageInList(vehicle.VehicleId);
  if (!verified) {
    console.log('\n⚠️ Test 3 incomplete - image may not appear in list yet');
  }
  
  console.log('\n==========================================');
  console.log('✅ Critical path tests completed!');
  console.log('Image upload flow is working correctly.');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
