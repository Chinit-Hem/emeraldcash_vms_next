/**
 * Test API Vehicles Endpoint
 */

import dotenv from "dotenv";
dotenv.config();

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/vehicles";

console.log("=== Testing API Vehicles Endpoint ===\n");
console.log("API URL:", API_URL);

async function testApi() {
  try {
    const response = await fetch(API_URL, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("\nResponse Status:", response.status);
    console.log("Response Headers:", Object.fromEntries(response.headers.entries()));

    const data = await response.json();
    console.log("\nResponse Data:", JSON.stringify(data, null, 2));

    if (data.success) {
      console.log("\n✅ API is working!");
      console.log("Vehicle count:", data.data?.length || 0);
    } else {
      console.log("\n❌ API returned error:", data.error);
    }
  } catch (error) {
    console.error("\n❌ API request failed:", error.message);
  }
}

testApi();
