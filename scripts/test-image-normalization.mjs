/**
 * Test script to verify image URL normalization
 * Tests the normalizeImageUrl function with various inputs
 */

// Simulate the normalizeImageUrl logic for testing
function isCloudinaryPublicId(value) {
  if (!value || typeof value !== "string") return false;
  
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return false;
  }
  
  if (value.startsWith("data:")) {
    return false;
  }
  
  if (value.includes("drive.google.com") || value.includes("googleusercontent.com")) {
    return false;
  }
  
  // Exclude Google Drive IDs (25-44 chars, alphanumeric + underscore + hyphen)
  if (value.length >= 25 && value.length <= 44 && /^[a-zA-Z0-9_-]+$/.test(value)) {
    return false;
  }
  
  const publicIdPattern = /^[a-zA-Z0-9_\-]+(\/[a-zA-Z0-9_\-]+)*$/;
  return publicIdPattern.test(value);
}

function isGoogleDriveId(value) {
  if (!value || typeof value !== "string") return false;
  
  if (value.length >= 25 && value.length <= 44 && /^[a-zA-Z0-9_-]+$/.test(value)) {
    return true;
  }
  
  return false;
}

function getGoogleDriveThumbnailUrl(fileId, size = "w400-h400") {
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=${encodeURIComponent(size)}`;
}

function normalizeImageUrl(imageId) {
  if (!imageId || typeof imageId !== "string") {
    return "";
  }

  const trimmed = imageId.trim();
  if (!trimmed) {
    return "";
  }

  // If it's already a valid URL, return as-is
  if (trimmed.startsWith("http://") || 
      trimmed.startsWith("https://") || 
      trimmed.startsWith("data:")) {
    return trimmed;
  }

  // If it's a Cloudinary public_id, convert to URL
  if (isCloudinaryPublicId(trimmed)) {
    // Would call getCloudinaryUrlFromPublicId in real implementation
    return `[CLOUDINARY_URL]${trimmed}`;
  }

  // If it looks like a Google Drive ID, convert to thumbnail URL
  if (isGoogleDriveId(trimmed)) {
    return getGoogleDriveThumbnailUrl(trimmed);
  }

  // Unknown format, return as-is
  return trimmed;
}

// Test cases
const testCases = [
  // Google Drive IDs (should be converted to thumbnail URLs)
  { input: "1v5AFTWvBIzJa5ijhGPzJKedNj_5Sqcky", expected: "thumbnail", description: "33-char Google Drive ID" },
  { input: "1KkNToKlABBtrx15H6kvIWCkFhpD4c318", expected: "thumbnail", description: "34-char Google Drive ID" },
  { input: "1DzKjjxw0_ckmULV0Syj_ekgOy2efqRv-", expected: "thumbnail", description: "33-char Google Drive ID with hyphen" },
  
  // Cloudinary URLs (should pass through unchanged)
  { input: "https://res.cloudinary.com/dgntrakv6/image/upload/v123/vehicles/car_123.jpg", expected: "unchanged", description: "Full Cloudinary URL" },
  
  // Empty/invalid (should return empty string)
  { input: "", expected: "empty", description: "Empty string" },
  { input: null, expected: "empty", description: "Null value" },
  { input: undefined, expected: "empty", description: "Undefined value" },
  
  // Short strings (should pass through as unknown)
  { input: "abc123", expected: "unchanged", description: "Short string (not Drive ID)" },
];

console.log("================================================================================");
console.log("IMAGE URL NORMALIZATION TEST");
console.log("================================================================================\n");

let passed = 0;
let failed = 0;

for (const test of testCases) {
  const result = normalizeImageUrl(test.input);
  let testPassed = false;
  
  if (test.expected === "thumbnail") {
    testPassed = result.includes("drive.google.com/thumbnail");
  } else if (test.expected === "unchanged") {
    testPassed = result === test.input;
  } else if (test.expected === "empty") {
    testPassed = result === "";
  }
  
  const status = testPassed ? "✅ PASS" : "❌ FAIL";
  console.log(`${status} - ${test.description}`);
  console.log(`   Input:    ${test.input || "(empty)"}`);
  console.log(`   Output:   ${result || "(empty)"}`);
  console.log(`   Expected: ${test.expected}`);
  console.log("");
  
  if (testPassed) passed++;
  else failed++;
}

console.log("================================================================================");
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log("================================================================================");

if (failed > 0) {
  process.exit(1);
}
