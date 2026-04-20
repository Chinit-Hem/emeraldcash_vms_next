/**
 * Test Image Display API - Verify images are returned correctly
 */

const API_URL = "http://localhost:3001/api/vehicles?limit=20";

console.log("=== Testing Image Display API ===\n");
console.log("API URL:", API_URL);

async function testApi() {
  try {
    const response = await fetch(API_URL);
    const data = await response.json();

    if (!data.success) {
      console.error("❌ API returned error:", data.error);
      return;
    }

    console.log("✅ API Response Status: SUCCESS");
    console.log("Total vehicles:", data.meta?.total);
    console.log("Returned vehicles:", data.data?.length);
    console.log("No image count:", data.meta?.noImageCount);
    
    console.log("\n--- Sample Vehicle Images ---");
    data.data?.slice(0, 5).forEach((v, i) => {
      const imgType = v.Image?.includes('cloudinary') ? 'Cloudinary' : 
                      v.Image?.includes('google') ? 'GoogleDrive' : 
                      v.Image ? 'Other' : 'NoImage';
      const imgPreview = v.Image ? v.Image.substring(0, 60) + "..." : "N/A";
      console.log(`${i + 1}. ${v.Brand} ${v.Model} (${v.VehicleId})`);
      console.log(`   Image Type: ${imgType} (${v.Image?.length || 0} chars)`);
      console.log(`   URL Preview: ${imgPreview}`);
      console.log("");
    });

    // Count image types
    const stats = {
      cloudinary: 0,
      googleDrive: 0,
      other: 0,
      noImage: 0
    };
    
    data.data?.forEach(v => {
      if (!v.Image) stats.noImage++;
      else if (v.Image.includes('cloudinary')) stats.cloudinary++;
      else if (v.Image.includes('google')) stats.googleDrive++;
      else stats.other++;
    });

    console.log("--- Image Type Distribution (in sample) ---");
    console.log(`Cloudinary: ${stats.cloudinary}`);
    console.log(`Google Drive: ${stats.googleDrive}`);
    console.log(`Other: ${stats.other}`);
    console.log(`No Image: ${stats.noImage}`);

    console.log("\n✅ Image display API test completed successfully!");
    
  } catch (error) {
    console.error("\n❌ API request failed:", error.message);
  }
}

testApi();
