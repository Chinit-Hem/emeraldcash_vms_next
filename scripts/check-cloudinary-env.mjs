#!/usr/bin/env node
/**
 * Cloudinary Environment Configuration Checker
 * Verifies that all required Cloudinary environment variables are properly configured
 */

import { config } from 'dotenv';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

console.log('='.repeat(80));
console.log('CLOUDINARY ENVIRONMENT CONFIGURATION CHECK');
console.log('='.repeat(80));
console.log();

// Load environment variables from all possible sources
const envLocalPath = join(rootDir, '.env.local');
const envPath = join(rootDir, '.env');

if (existsSync(envLocalPath)) {
  console.log('✅ Found .env.local file');
  config({ path: envLocalPath });
} else {
  console.log('❌ .env.local file not found');
}

if (existsSync(envPath)) {
  console.log('✅ Found .env file');
  config({ path: envPath });
}

console.log();

// Check environment variables
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

const checks = [
  {
    name: 'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME',
    value: CLOUD_NAME,
    required: true,
    validate: (val) => val && val !== 'your_cloud_name_here' && val !== 'your_cloud_name',
    format: (val) => val
  },
  {
    name: 'NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET',
    value: UPLOAD_PRESET,
    required: true,
    validate: (val) => val && val !== 'your_unsigned_preset_name' && val !== 'your_preset_name',
    format: (val) => val
  }
];

let allPassed = true;
let configuredCount = 0;

console.log('CONFIGURATION STATUS:');
console.log('-'.repeat(80));

for (const check of checks) {
  const isValid = check.validate(check.value);
  const status = isValid ? '✅' : '❌';
  const displayValue = check.value 
    ? (isValid ? check.format(check.value) : `"${check.value}" (placeholder value)`)
    : 'NOT SET';
  
  console.log(`${status} ${check.name}`);
  console.log(`   Value: ${displayValue}`);
  
  if (isValid) {
    configuredCount++;
  } else {
    allPassed = false;
  }
  console.log();
}

console.log('-'.repeat(80));

// Summary
if (allPassed) {
  console.log();
  console.log('🎉 SUCCESS! All Cloudinary environment variables are configured.');
  console.log();
  console.log('Configuration Summary:');
  console.log(`  Cloud Name: ${CLOUD_NAME}`);
  console.log(`  Upload Preset: ${UPLOAD_PRESET}`);
  console.log();
  console.log('Next steps:');
  console.log('  1. Restart your Next.js dev server if it\'s running');
  console.log('  2. Test image upload in the application');
  console.log('  3. Run: node scripts/test-cloudinary-unsigned-complete.mjs');
  console.log();
  process.exit(0);
} else {
  console.log();
  console.log('❌ CONFIGURATION INCOMPLETE');
  console.log();
  console.log(`Configured: ${configuredCount}/${checks.length} variables`);
  console.log();
  console.log('To fix this:');
  console.log();
  console.log('  Step 1: Copy the environment template');
  console.log('  -------------------------------------');
  console.log('  cp .env.local.example .env.local');
  console.log();
  console.log('  Step 2: Edit .env.local with your Cloudinary credentials');
  console.log('  --------------------------------------------------------');
  
  // Check if example file exists
  const examplePath = join(rootDir, '.env.local.example');
  if (existsSync(examplePath)) {
    console.log('  The .env.local.example file exists. Open it to see the template.');
  }
  
  console.log();
  console.log('  Required variables:');
  console.log('    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name');
  console.log('    NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_unsigned_preset');
  console.log();
  console.log('  Step 3: Get your credentials from Cloudinary');
  console.log('  ----------------------------------------------');
  console.log('  1. Go to https://cloudinary.com/console');
  console.log('  2. Find your Cloud Name on the dashboard');
  console.log('  3. Go to Settings → Upload → Upload presets');
  console.log('  4. Create an "Unsigned" upload preset (or use existing one)');
  console.log('  5. Copy the preset name');
  console.log();
  console.log('  Step 4: Restart your Next.js dev server');
  console.log('  ----------------------------------------');
  console.log('  Environment variables are loaded at startup, so you need to restart.');
  console.log();
  console.log('  For detailed instructions, see: CLOUDINARY_SETUP_GUIDE.md');
  console.log();
  process.exit(1);
}
