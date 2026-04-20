import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function setupSequence() {
  try {
    console.log("🔧 Setting up auto-increment for id column...\n");

    // Check current max id
    const maxResult = await sql`SELECT MAX(id) as max_id FROM vehicles`;
    const maxId = maxResult[0].max_id || 0;
    console.log(`Current max ID: ${maxId}`);

    // Create sequence using unsafe query
    console.log("\n1️⃣ Creating sequence...");
    const startValue = maxId + 1;
    const createSeqQuery = `CREATE SEQUENCE IF NOT EXISTS cleaned_vehicles_id_seq START WITH ${startValue}`;
    await sql.unsafe(createSeqQuery);
    console.log("   ✅ Sequence created");

    // Set default value
    console.log("\n2️⃣ Setting default value for id column...");
    await sql.unsafe(`
      ALTER TABLE vehicles 
      ALTER COLUMN id SET DEFAULT nextval('cleaned_vehicles_id_seq')
    `);
    console.log("   ✅ Default value set");

    // Link sequence to table
    console.log("\n3️⃣ Linking sequence to table...");
    await sql.unsafe(`ALTER SEQUENCE cleaned_vehicles_id_seq OWNED BY vehicles.id`);
    console.log("   ✅ Sequence linked");

    // Test insert
    console.log("\n4️⃣ Testing insert without specifying id...");
    const testResult = await sql`
      INSERT INTO vehicles (
        category, brand, model, year, plate, market_price,
        condition, created_at, updated_at
      ) VALUES (
        'Test', 'TestBrand', 'TestModel', 2024, 'TEST-AUTO', 1000,
        'New', NOW(), NOW()
      )
      RETURNING id
    `;
    console.log(`   ✅ Test insert successful! New ID: ${testResult[0].id}`);

    // Clean up
    console.log("\n5️⃣ Cleaning up test record...");
    await sql`DELETE FROM vehicles WHERE id = ${testResult[0].id}`;
    console.log("   ✅ Test record deleted");

    console.log("\n✅ Auto-increment setup completed successfully!");
    console.log("You can now save vehicles without specifying an ID.");

  } catch (error) {
    console.error("❌ Setup failed:", error.message);
    console.error(error);
    process.exit(1);
  }
}

setupSequence();
