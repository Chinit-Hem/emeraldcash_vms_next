// Test the complete vehicle update flow with image
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import fs from "fs";
import path from "path";

// Load environment variables
config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL;
const API_URL = "http://localhost:3000";

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not set");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

// Create a simple test image (1x1 pixel PNG)
const testImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

async function testFullUpdateFlow() {
  try {
    console.log("🔍 Testing complete vehicle update flow with image...\n");
    
    // 1. Get a test vehicle
    const vehicles = await sql`SELECT * FROM vehicles LIMIT 1`;
    if (vehicles.length === 0) {
      console.error("❌ No vehicles found");
      process.exit(1);
    }
    
    const vehicle = vehicles[0];
    console.log("📋 Test vehicle:", {
      id: vehicle.id,
      brand: vehicle.brand,
      model: vehicle.model,
      current_image_id: vehicle.image_id
    });
    
    // 2. Create a test image file
    const testImageBuffer = Buffer.from(testImageBase64, "base64");
    const testImagePath = path.join(process.cwd(), "test-image.png");
    fs.writeFileSync(testImagePath, testImageBuffer);
    console.log("\n📝 Created test image file:", testImagePath);
    
    // 3. Create FormData and simulate the update
    const formData = new FormData();
    formData.append("VehicleId", String(vehicle.id));
    formData.append("Category", vehicle.category);
    formData.append("Brand", vehicle.brand);
    formData.append("Model", vehicle.model);
    formData.append("Year", String(vehicle.year));
    formData.append("Plate", vehicle.plate || "");
    formData.append("PriceNew", String(vehicle.market_price));
    
    // Create a File object from the buffer
    const file = new File([testImageBuffer], "test-image.png", { type: "image/png" });
    formData.append("image", file);
    
    console.log("\n📤 Sending update request...");
    console.log("FormData entries:");
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`  ${key}: File (${value.name}, ${value.size} bytes)`);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    }
    
    // 4. Make the API request
    const response = await fetch(`${API_URL}/api/vehicles/${vehicle.id}`, {
      method: "PUT",
      body: formData,
      headers: {
        "Cookie": "session=test-session" // Add a test session cookie
      }
    });
    
    console.log("\n📥 Response status:", response.status);
    
    const responseData = await response.json().catch(() => ({}));
    console.log("Response data:", JSON.stringify(responseData, null, 2));
    
    if (response.ok && responseData.ok) {
      console.log("\n✅ Update successful!");
      console.log("Updated vehicle:", {
        VehicleId: responseData.data?.VehicleId,
        Image: responseData.data?.Image?.substring(0, 100) + "..."
      });
    } else {
      console.error("\n❌ Update failed:", responseData.error || "Unknown error");
    }
    
    // 5. Verify in database
    const verifyResult = await sql`SELECT * FROM vehicles WHERE id = ${vehicle.id}`;
    const verifiedVehicle = verifyResult[0];
    
    console.log("\n🔍 Database verification:", {
      id: verifiedVehicle.id,
      image_id: verifiedVehicle.image_id,
      updated_at: verifiedVehicle.updated_at
    });
    
    // Cleanup
    fs.unlinkSync(testImagePath);
    console.log("\n🧹 Cleaned up test file");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testFullUpdateFlow();
