import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function testSaveVehicle() {
  try {
    console.log("🔍 Testing vehicle save functionality...\n");

    // Test 1: Check table structure
    console.log("1️⃣ Checking table structure...");
    const columns = await sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'vehicles'
      ORDER BY ordinal_position
    `;
    
    console.log("   Table columns:");
    columns.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'REQUIRED' : 'optional'}`);
    });

    // Test 2: Try to insert a test vehicle
    console.log("\n2️⃣ Attempting to insert test vehicle...");
    
    const testVehicle = {
      category: "Motorcycle",
      brand: "TestBrand",
      model: "TestModel",
      year: 2024,
      plate: "TEST-1234",
      market_price: 5000,
      tax_type: "Taxed",
      condition: "New",
      body_type: "Standard",
      color: "Red",
      image_id: null
    };

    try {
      const now = new Date().toISOString();
      const result = await sql`
        INSERT INTO vehicles (
          category, brand, model, year, plate, market_price,
          tax_type, condition, body_type, color, image_id,
          created_at, updated_at
        ) VALUES (
          ${testVehicle.category}, 
          ${testVehicle.brand}, 
          ${testVehicle.model}, 
          ${testVehicle.year}, 
          ${testVehicle.plate},
          ${testVehicle.market_price}, 
          ${testVehicle.tax_type},
          ${testVehicle.condition}, 
          ${testVehicle.body_type},
          ${testVehicle.color},
          ${testVehicle.image_id},
          ${now},
          ${now}
        )
        RETURNING *
      `;
      
      console.log("   ✅ Insert successful!");
      console.log("   New vehicle ID:", result[0].id);
      
      // Clean up - delete test vehicle
      console.log("\n3️⃣ Cleaning up test vehicle...");
      await sql`DELETE FROM vehicles WHERE id = ${result[0].id}`;
      console.log("   ✅ Test vehicle deleted");
      
    } catch (insertError) {
      console.error("   ❌ Insert failed:", insertError.message);
      if (insertError.code) {
        console.error("   Error code:", insertError.code);
      }
      if (insertError.detail) {
        console.error("   Detail:", insertError.detail);
      }
    }

    // Test 3: Check current vehicle count
    console.log("\n4️⃣ Current vehicle count...");
    const countResult = await sql`SELECT COUNT(*) as count FROM vehicles`;
    console.log("   Total vehicles:", countResult[0].count);

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error(error);
  }
}

testSaveVehicle();
