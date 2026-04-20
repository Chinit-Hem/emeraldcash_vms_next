import { config } from "dotenv";
config({ path: ".env.local" });

const BASE_URL = "http://localhost:3000";

async function testVehicleAPI() {
  console.log("Testing Vehicle API...\n");
  
  // First, test the list endpoint
  console.log("1️⃣ Testing list endpoint (/api/vehicles)...");
  try {
    const listRes = await fetch(`${BASE_URL}/api/vehicles?noCache=1`);
    console.log(`   Status: ${listRes.status}`);
    if (listRes.ok) {
      const data = await listRes.json();
      console.log(`   Vehicles count: ${data.data?.length || 0}`);
    } else {
      const error = await listRes.text();
      console.log(`   Error: ${error.substring(0, 200)}`);
    }
  } catch (e) {
    console.log(`   ❌ Fetch error: ${e.message}`);
  }
  
  // Test vehicle 829 detail
  console.log("\n2️⃣ Testing vehicle detail (/api/vehicles/829)...");
  try {
    const detailRes = await fetch(`${BASE_URL}/api/vehicles/829`);
    console.log(`   Status: ${detailRes.status}`);
    const text = await detailRes.text();
    console.log(`   Response: ${text.substring(0, 500)}`);
  } catch (e) {
    console.log(`   ❌ Fetch error: ${e.message}`);
  }
  
  // Test with a valid session (we need to login first)
  console.log("\n3️⃣ Testing login to get valid session...");
  try {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "1234" })

    });
    console.log(`   Login status: ${loginRes.status}`);
    
    // Get cookies from response
    const cookies = loginRes.headers.get("set-cookie");
    console.log(`   Cookies received: ${cookies ? "Yes" : "No"}`);
    
    if (loginRes.ok && cookies) {
      // Now test vehicle detail with valid session
      console.log("\n4️⃣ Testing vehicle detail with valid session...");
      const detailRes2 = await fetch(`${BASE_URL}/api/vehicles/829`, {
        headers: { "Cookie": cookies }
      });
      console.log(`   Status: ${detailRes2.status}`);
      const text2 = await detailRes2.text();
      console.log(`   Response: ${text2.substring(0, 500)}`);
      
      if (!detailRes2.ok) {
        console.log(`\n   ❌ ERROR DETAILS:`);
        try {
          const errorJson = JSON.parse(text2);
          console.log(`   Error: ${errorJson.error}`);
          console.log(`   Stack: ${errorJson.stack || "No stack trace"}`);
        } catch {
          console.log(`   Raw: ${text2}`);
        }
      }
    }
  } catch (e) {
    console.log(`   ❌ Login error: ${e.message}`);
  }
}

testVehicleAPI();
