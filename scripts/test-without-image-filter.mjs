/**
 * Test script to verify the withoutImage filter logic
 * Tests that vehicles with only image_id OR thumbnail_url are NOT considered "without images"
 */

// Simulate the SQL logic from VehicleService.applyFilters()
function testApplyFiltersSQL() {
  console.log("=== Testing SQL Filter Logic ===\n");
  
  // Test cases for the SQL condition
  const testCases = [
    { image_id: null, thumbnail_url: null, expected: true, description: "Both NULL" },
    { image_id: "", thumbnail_url: "", expected: true, description: "Both empty strings" },
    { image_id: "   ", thumbnail_url: "   ", expected: true, description: "Both whitespace" },
    { image_id: "abc123", thumbnail_url: null, expected: false, description: "Has image_id, no thumbnail_url" },
    { image_id: null, thumbnail_url: "https://example.com/image.jpg", expected: false, description: "No image_id, has thumbnail_url" },
    { image_id: "abc123", thumbnail_url: "https://example.com/image.jpg", expected: false, description: "Has both image_id and thumbnail_url" },
    { image_id: "", thumbnail_url: "https://example.com/image.jpg", expected: false, description: "Empty image_id, has thumbnail_url" },
    { image_id: "abc123", thumbnail_url: "", expected: false, description: "Has image_id, empty thumbnail_url" },
  ];
  
  // The SQL condition we're testing:
  // ((image_id IS NULL OR TRIM(image_id) = '') AND (thumbnail_url IS NULL OR TRIM(thumbnail_url) = ''))
  
  testCases.forEach((test, index) => {
    const imageIdNull = test.image_id === null;
    const imageIdEmpty = test.image_id !== null && test.image_id.trim() === "";
    const thumbnailNull = test.thumbnail_url === null;
    const thumbnailEmpty = test.thumbnail_url !== null && test.thumbnail_url.trim() === "";
    
    const hasNoImageId = imageIdNull || imageIdEmpty;
    const hasNoThumbnail = thumbnailNull || thumbnailEmpty;
    const result = hasNoImageId && hasNoThumbnail;
    
    const passed = result === test.expected;
    console.log(`Test ${index + 1}: ${passed ? "✅ PASS" : "❌ FAIL"}`);
    console.log(`  Description: ${test.description}`);
    console.log(`  image_id: ${JSON.stringify(test.image_id)}, thumbnail_url: ${JSON.stringify(test.thumbnail_url)}`);
    console.log(`  Expected: ${test.expected ? "NO IMAGE (include in filter)" : "HAS IMAGE (exclude from filter)"}`);
    console.log(`  Result: ${result ? "NO IMAGE" : "HAS IMAGE"}`);
    console.log("");
  });
}

// Simulate the client-side filter logic from VehiclesClient.tsx
function testClientSideFilter() {
  console.log("=== Testing Client-Side Filter Logic ===\n");
  
  const testVehicles = [
    { Image: null, expected: true, description: "Image is null" },
    { Image: "", expected: true, description: "Image is empty string" },
    { Image: "   ", expected: true, description: "Image is whitespace" },
    { Image: "https://drive.google.com/file/d/abc123/view", expected: false, description: "Google Drive URL" },
    { Image: "https://res.cloudinary.com/demo/image/upload/sample.jpg", expected: false, description: "Cloudinary URL" },
    { Image: "data:image/png;base64,abc123", expected: false, description: "Data URL" },
    { Image: "vehicles/cars/toyota123", expected: false, description: "Cloudinary public_id" },
    { Image: "http://example.com/image.jpg", expected: false, description: "HTTP URL" },
  ];
  
  testVehicles.forEach((test, index) => {
    // The client-side logic (updated):
    // A vehicle has no image if Image field is empty/null or doesn't have valid image reference
    const imageValue = test.Image;
    const hasNoImage = !imageValue || !String(imageValue).trim();
    
    // Check if it's a valid image URL (Drive, Cloudinary, or data URL)
    const isUrl = !hasNoImage && (
      imageValue.startsWith('http://') || 
      imageValue.startsWith('https://') || 
      imageValue.startsWith('data:')
    );
    
    // Check if it's a Cloudinary public_id (folder/path format like "vehicles/cars/abc123")
    const isCloudinaryPublicId = !hasNoImage && /^[a-zA-Z0-9_\-]+(\/[a-zA-Z0-9_\-]+)*$/.test(imageValue);
    
    const hasValidImage = isUrl || isCloudinaryPublicId;
    const result = !hasValidImage;
    
    const passed = result === test.expected;
    console.log(`Test ${index + 1}: ${passed ? "✅ PASS" : "❌ FAIL"}`);
    console.log(`  Description: ${test.description}`);
    console.log(`  Image: ${JSON.stringify(test.Image)}`);
    console.log(`  Expected: ${test.expected ? "NO IMAGE" : "HAS IMAGE"}`);
    console.log(`  Result: ${result ? "NO IMAGE" : "HAS IMAGE"}`);
    console.log("");
  });
}

// Run tests
console.log("Testing 'withoutImage' filter logic fixes\n");
console.log("=".repeat(60) + "\n");

testApplyFiltersSQL();
testClientSideFilter();

console.log("=".repeat(60));
console.log("\nSummary:");
console.log("- SQL filter now checks BOTH image_id AND thumbnail_url");
console.log("- Client-side filter checks for valid image URLs (http/https/data)");
console.log("- Vehicles with EITHER field populated will NOT appear in 'without images' results");
