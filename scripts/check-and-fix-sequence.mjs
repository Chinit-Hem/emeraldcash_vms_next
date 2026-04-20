import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function checkAndFix() {
  try {
    console.log("🔍 Checking sequence setup...\n");

    // Check if sequence exists
    const seqResult = await sql`
      SELECT sequence_name 
      FROM information_schema.sequences 
      WHERE sequence_name = 'cleaned_vehicles_id_seq'
    `;
    
    if (seqResult.length === 0) {
      console.log("❌ Sequence does not exist");
    } else {
      console.log("✅ Sequence exists:", seqResult[0].sequence_name);
    }

    // Check current sequence value
    const currVal = await sql`SELECT last_value FROM cleaned_vehicles_id_seq`;
    console.log("Current sequence value:", currVal[0].last_value);

    // Check column default
    const colResult = await sql`
      SELECT column_name, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'vehicles' 
      AND column_name = 'id'
    `;
    
    console.log("\nColumn info:");
    console.log("  column_name:", colResult[0].column_name);
    console.log("  column_default:", colResult[0].column_default);

    // Try to set the default using a different method
    console.log("\n🔧 Setting default with explicit cast...");
    await sql.unsafe(`
      ALTER TABLE vehicles
      ALTER COLUMN id SET DEFAULT nextval('cleaned_vehicles_id_seq'::regclass)
    `);
    console.log("✅ Default set with regclass cast");

    // Verify again
    const colResult2 = await sql`
      SELECT column_default 
      FROM information_schema.columns 
      WHERE table_name = 'vehicles' 
      AND column_name = 'id'
    `;
    console.log("\nNew column_default:", colResult2[0].column_default);

    // Test insert with explicit nextval
    console.log("\n🧪 Testing insert with explicit id...");
    const testResult = await sql`
      INSERT INTO vehicles (
        id, category, brand, model, year, plate, market_price,
        condition, created_at, updated_at
      ) VALUES (
        nextval('cleaned_vehicles_id_seq'),
        'Test', 'TestBrand', 'TestModel', 2024, 'TEST-AUTO', 1000,
        'New', NOW(), NOW()
      )
      RETURNING id
    `;
    console.log(`✅ Test insert successful! New ID: ${testResult[0].id}`);

    // Clean up
    await sql`DELETE FROM vehicles WHERE id = ${testResult[0].id}`;
    console.log("✅ Test record deleted");

    console.log("\n✅ Sequence is working! You can now save vehicles.");

  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
  }
}

checkAndFix();
