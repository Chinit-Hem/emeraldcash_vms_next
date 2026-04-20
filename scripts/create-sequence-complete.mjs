import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function createSequenceComplete() {
  try {
    console.log("🔧 Creating sequence and setting up auto-increment...\n");

    // Get max id
    const maxResult = await sql`SELECT COALESCE(MAX(id), 0) as max_id FROM vehicles`;
    const maxId = maxResult[0].max_id;
    console.log(`Current max ID: ${maxId}`);

    // Drop sequence if exists (clean slate)
    console.log("\n1️⃣ Dropping existing sequence if any...");
    try {
      await sql.unsafe(`DROP SEQUENCE IF EXISTS cleaned_vehicles_id_seq CASCADE`);
      console.log("   ✅ Dropped existing sequence");
    } catch (_e) {
      console.log("   ℹ️ No existing sequence to drop");
    }

    // Create sequence
    console.log("\n2️⃣ Creating new sequence...");
    const startValue = maxId + 1;
    await sql.unsafe(`CREATE SEQUENCE cleaned_vehicles_id_seq START WITH ${startValue} INCREMENT BY 1`);
    console.log(`   ✅ Sequence created starting at ${startValue}`);

    // Set column default
    console.log("\n3️⃣ Setting column default...");
    await sql.unsafe(`
      ALTER TABLE vehicles 
      ALTER COLUMN id SET DEFAULT nextval('cleaned_vehicles_id_seq')
    `);
    console.log("   ✅ Default value set");

    // Set sequence ownership
    console.log("\n4️⃣ Setting sequence ownership...");
    await sql.unsafe(`
      ALTER SEQUENCE cleaned_vehicles_id_seq OWNED BY vehicles.id
    `);
    console.log("   ✅ Ownership set");

    // Verify setup
    console.log("\n5️⃣ Verifying setup...");
    const verifyResult = await sql`
      SELECT column_default 
      FROM information_schema.columns 
      WHERE table_name = 'vehicles' 
      AND column_name = 'id'
    `;
    console.log("   Column default:", verifyResult[0].column_default);

    // Test insert
    console.log("\n6️⃣ Testing auto-increment...");
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
    const newId = testResult[0].id;
    console.log(`   ✅ Auto-increment working! New ID: ${newId}`);

    // Clean up
    console.log("\n7️⃣ Cleaning up test record...");
    await sql`DELETE FROM vehicles WHERE id = ${newId}`;
    console.log("   ✅ Test record deleted");

    console.log("\n✅ SUCCESS! Auto-increment is now working.");
    console.log("You can save vehicles without specifying an ID.");

  } catch (error) {
    console.error("\n❌ Setup failed:", error.message);
    if (error.detail) console.error("Detail:", error.detail);
    process.exit(1);
  }
}

createSequenceComplete();
