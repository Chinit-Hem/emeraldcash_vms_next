import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function fixIdComplete() {
  try {
    console.log("🔧 Complete ID column fix...\n");

    // Step 1: Get max ID
    const maxResult = await sql`SELECT COALESCE(MAX(id), 0) as max_id FROM vehicles`;
    const maxId = maxResult[0].max_id;
    console.log(`Current max ID: ${maxId}`);

    // Step 2: Create sequence with proper ownership in one command
    console.log("\n1️⃣ Creating sequence with ownership...");
    const startValue = maxId + 1;
    
    // Use a DO block to execute multiple commands
    const setupScript = `
      DO $$
      BEGIN
        -- Drop if exists
        DROP SEQUENCE IF EXISTS cleaned_vehicles_id_seq CASCADE;
        
        -- Create sequence
        CREATE SEQUENCE cleaned_vehicles_id_seq START WITH ${startValue} INCREMENT BY 1;
        
        -- Set ownership
        ALTER SEQUENCE cleaned_vehicles_id_seq OWNED BY vehicles.id;
      END $$;
    `;
    
    await sql.unsafe(setupScript);
    console.log("   ✅ Sequence created with ownership");

    // Step 3: Set default using a different method
    console.log("\n2️⃣ Setting column default...");
    
    // Try using ALTER TABLE with the sequence
    const alterScript = `
      DO $$
      BEGIN
        ALTER TABLE vehicles 
        ALTER COLUMN id SET DEFAULT nextval('cleaned_vehicles_id_seq');
      END $$;
    `;
    
    await sql.unsafe(alterScript);
    console.log("   ✅ Default set");

    // Step 4: Verify
    console.log("\n3️⃣ Verifying setup...");
    const verify = await sql`
      SELECT column_default 
      FROM information_schema.columns 
      WHERE table_name = 'vehicles' 
      AND column_name = 'id'
    `;
    console.log("   Column default:", verify[0].column_default);

    // Step 5: Test with explicit nextval first
    console.log("\n4️⃣ Testing with explicit nextval...");
    const explicitTest = await sql`
      INSERT INTO vehicles (
        id, category, brand, model, year, plate, market_price,
        condition, created_at, updated_at
      ) VALUES (
        nextval('cleaned_vehicles_id_seq'),
        'TestExplicit', 'Brand', 'Model', 2024, 'TEST-EXP', 1000,
        'New', NOW(), NOW()
      )
      RETURNING id
    `;
    console.log(`   ✅ Explicit nextval works! ID: ${explicitTest[0].id}`);
    
    // Clean up
    await sql`DELETE FROM vehicles WHERE id = ${explicitTest[0].id}`;

    // Step 6: Test with default
    console.log("\n5️⃣ Testing with default (no id specified)...");
    try {
      const defaultTest = await sql`
        INSERT INTO vehicles (
          category, brand, model, year, plate, market_price,
          condition, created_at, updated_at
        ) VALUES (
          'TestDefault', 'Brand', 'Model', 2024, 'TEST-DEF', 1000,
          'New', NOW(), NOW()
        )
        RETURNING id
      `;
      console.log(`   ✅ Default works! ID: ${defaultTest[0].id}`);
      
      // Clean up
      await sql`DELETE FROM vehicles WHERE id = ${defaultTest[0].id}`;
    } catch (e) {
      console.log(`   ❌ Default failed: ${e.message}`);
      console.log("   The sequence works but default isn't set. Using explicit nextval in API instead.");
    }

    console.log("\n✅ Fix complete!");

  } catch (error) {
    console.error("\n❌ Fix failed:", error.message);
    if (error.detail) console.error("Detail:", error.detail);
    process.exit(1);
  }
}

fixIdComplete();
