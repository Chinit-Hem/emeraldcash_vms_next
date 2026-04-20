/**
 * Cloudinary Diagnostic Tool
 * Run this in the browser console to diagnose Cloudinary configuration issues
 * 
 * Usage:
 * 1. Open browser console (F12)
 * 2. Type: diagnoseCloudinary()
 */

export function diagnoseCloudinary(): void {
  console.log('%c🔍 Cloudinary Diagnostic Tool', 'font-size: 16px; font-weight: bold; color: #3b82f6;');
  console.log('='.repeat(60));
  
  // Check environment variables
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  
  console.log('%c📋 Environment Variables:', 'font-weight: bold;');
  
  const checks = [
    {
      name: 'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME',
      value: cloudName,
      valid: cloudName && !cloudName.includes('your_') && cloudName !== 'your_cloud_name_here'
    },
    {
      name: 'NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET',
      value: uploadPreset,
      valid: uploadPreset && !uploadPreset.includes('your_') && uploadPreset !== 'your_unsigned_preset_name'
    }
  ];
  
  let allValid = true;
  
  for (const check of checks) {
    const status = check.valid ? '✅' : '❌';
    const value = check.value || 'NOT SET';
    console.log(`  ${status} ${check.name}: ${value}`);
    if (!check.valid) allValid = false;
  }
  
  if (!allValid) {
    console.log('');
    console.log('%c❌ Configuration Issue Detected', 'color: #ef4444; font-weight: bold;');
    console.log('');
    console.log('To fix this:');
    console.log('1. Check your .env.local file');
    console.log('2. Ensure variables are set to actual values (not placeholders)');
    console.log('3. Restart your Next.js dev server');
    console.log('');
    console.log('Run this in terminal: node scripts/verify-cloudinary-setup.mjs');
    return;
  }
  
  console.log('');
  console.log('%c✅ Environment variables look good!', 'color: #22c55e;');
  console.log('');
  console.log('Configuration:');
  console.log(`  Cloud Name: ${cloudName}`);
  console.log(`  Upload Preset: ${uploadPreset}`);
  console.log('');
  console.log('If you still get "Upload preset not found" errors:');
  console.log('1. Go to https://cloudinary.com/console');
  console.log('2. Settings → Upload → Upload presets');
  console.log(`3. Verify preset "${uploadPreset}" exists and is UNSIGNED`);
  console.log('');
  console.log('For detailed setup instructions, see: CLOUDINARY_SETUP_GUIDE.md');
}

// Make it available globally for console access
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).diagnoseCloudinary = diagnoseCloudinary;
}
