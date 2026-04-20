#!/usr/bin/env node
/**
 * Test script to verify Cloudinary Unsigned Upload configuration
 * This checks if the required environment variables are set for the new upload flow
 */

import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
const envPath = join(__dirname, '..', '.env.local');
try {
  const envContent = readFileSync(envPath, 'utf8');
  config({ path: envPath });
  console.log('✅ Loaded environment variables from .env.local\n');
} catch (error) {
  console.log('⚠️  Could not load .env.local, checking process environment...\n');
}

console.log('========================================');
console.log('Cloudinary Unsigned Upload Configuration Check');
console.log('========================================\n');

// Check required environment variables
const checks = [
  {
    name: 'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME',
    required: true,
    description: 'Cloudinary cloud name for frontend unsigned uploads',
  },
  {
    name: 'NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET',
    required: true,
    description: 'Unsigned upload preset name for frontend uploads',
  },
  {
    name: 'CLOUDINARY_CLOUD_NAME',
    required: false,
    description: 'Cloudinary cloud name for backend (image deletion)',
  },
  {
    name: 'CLOUDINARY_API_KEY',
    required: false,
    description: 'Cloudinary API key for backend operations',
  },
  {
    name: 'CLOUDINARY_API_SECRET',
    required: false,
    description: 'Cloudinary API secret for backend operations',
  },
];

let allRequiredPresent = true;
let warnings = [];

checks.forEach((check) => {
  const value = process.env[check.name];
  const isPresent = !!value;
  
  if (check.required && !isPresent) {
    allRequiredPresent = false;
    console.log(`❌ ${check.name}`);
    console.log(`   Required: YES`);
    console.log(`   Status: MISSING`);
    console.log(`   Description: ${check.description}`);
    console.log('');
  } else if (isPresent) {
    // Mask sensitive values
    const displayValue = check.name.includes('SECRET') 
      ? '****' + value.slice(-4)
      : check.name.includes('KEY') && !check.name.includes('PUBLIC')
        ? '****' + value.slice(-4)
        : value;
    
    console.log(`✅ ${check.name}`);
    console.log(`   Required: ${check.required ? 'YES' : 'NO (optional)'}`);
    console.log(`   Status: PRESENT`);
    console.log(`   Value: ${displayValue}`);
    console.log(`   Description: ${check.description}`);
    console.log('');
  } else {
    warnings.push(check.name);
    console.log(`⚠️  ${check.name}`);
    console.log(`   Required: NO (optional)`);
    console.log(`   Status: MISSING`);
    console.log(`   Description: ${check.description}`);
    console.log('');
  }
});

console.log('========================================');
console.log('Summary');
console.log('========================================\n');

if (allRequiredPresent) {
  console.log('✅ All required environment variables are present!');
  console.log('');
  console.log('The Cloudinary Unsigned Upload fix is ready to use.');
  console.log('');
  console.log('Next steps:');
  console.log('1. Make sure you have created an unsigned upload preset in Cloudinary');
  console.log('2. Deploy your application');
  console.log('3. Test image uploads in the vehicle form');
  console.log('');
  console.log('To create an unsigned upload preset:');
  console.log('1. Go to https://cloudinary.com/console');
  console.log('2. Navigate to Settings → Upload → Upload presets');
  console.log('3. Click "Add upload preset"');
  console.log('4. Set Signing Mode to "Unsigned"');
  console.log('5. Save and copy the preset name to NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET');
} else {
  console.log('❌ Some required environment variables are missing!');
  console.log('');
  console.log('Please add the missing variables to your .env.local file:');
  console.log('');
  console.log('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name');
  console.log('NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_unsigned_preset');
  console.log('');
  console.log('For backend image deletion (optional but recommended):');
  console.log('CLOUDINARY_CLOUD_NAME=your_cloud_name');
  console.log('CLOUDINARY_API_KEY=your_api_key');
  console.log('CLOUDINARY_API_SECRET=your_api_secret');
}

if (warnings.length > 0) {
  console.log('');
  console.log('⚠️  Optional variables missing (backend will still work but image deletion may fail):');
  warnings.forEach(name => console.log(`   - ${name}`));
}

console.log('');
console.log('========================================');
console.log('Testing Cloudinary Connection');
console.log('========================================\n');

// Test Cloudinary connection if credentials are available
const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;

if (cloudName) {
  console.log(`Testing connection to Cloudinary cloud: ${cloudName}...`);
  
  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      // Send an empty request to test if the endpoint exists
      // This will fail with a 400 error, but that's expected
    });
    
    if (response.status === 400) {
      console.log('✅ Cloudinary endpoint is reachable (400 error is expected for empty request)');
    } else if (response.status === 404) {
      console.log('❌ Cloudinary cloud name appears to be invalid (404 error)');
      console.log('   Please verify your NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME');
    } else {
      console.log(`ℹ️  Cloudinary responded with status: ${response.status}`);
    }
  } catch (error) {
    console.log('❌ Could not connect to Cloudinary:', error.message);
  }
} else {
  console.log('⚠️  Cannot test connection - no cloud name configured');
}

console.log('');
console.log('========================================');
console.log('Documentation');
console.log('========================================\n');
console.log('For more information, see:');
console.log('- CLOUDINARY_UNSIGNED_UPLOAD_FIX.md');
console.log('- TODO_CLOUDINARY_UNSIGNED_UPLOAD.md');
