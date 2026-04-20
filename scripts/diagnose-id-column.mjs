import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function diagnose() {
  try {
    console.log("🔍 Diagnosing id column issue...\n");

    // Check table structure
    console.log("1️⃣ Table structure:");
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'vehicles'
      ORDER BY ordinal_position
    `;
    
    columns.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type}`);
      console.log(`     nullable: ${col.is_nullable}`);
      console.log(`     default: ${col.column_default}`);
    });

    // Check if sequence exists
    console.log("\n2️⃣ Sequences:");
    const sequences = await sql`
      SELECT sequence_name 
      FROM information_schema.sequences 
      WHERE sequence_schema = 'public'
    `;
    sequences.forEach(seq => console.log(`   - ${seq.sequence_name}`));

    // Try to get sequence value directly
    console.log("\n3️⃣ Testing sequence:");
    try {
      const seqVal = await sql`SELECT nextval('cleaned_vehicles_id_seq')`;
      console.log(`   nextval result: ${seqVal[0].nextval}`);
    } catch (e) {
      console.log(`   ❌ Error: ${e.message}`);
    }

    // Check pg_class for the table
    console.log("\n4️⃣ Checking pg_attribute for defaults:");
    const attrResult = await sql`
      SELECT a.attname, pg_get_expr(d.adbin, d.adrelid) as default_expr
      FROM pg_attribute a
      LEFT JOIN pg_attrdef d ON a.attrelid = d.adrelid AND a.attnum = d.adnum
      WHERE a.attrelid = 'vehicles'::regclass
      AND a.attname = 'id'
    `;
    
    if (attrResult.length > 0) {
      console.log(`   attname: ${attrResult[0].attname}`);
      console.log(`   default_expr: ${attrResult[0].default_expr}`);
    }

    // Try a different approach - recreate the column
    console.log("\n5️⃣ Attempting to fix by recreating default...");
    
    // First, let's try to set the default using a simpler approach
    await sql.unsafe(`
      ALTER TABLE vehicles 
      ALTER COLUMN id DROP DEFAULT
    `);
    console.log("   Dropped existing default");
    
    await sql.unsafe(`
      ALTER TABLE vehicles 
      ALTER COLUMN id SET DEFAULT nextval('cleaned_vehicles_id_seq'::regclass)
    `);
    console.log("   Set new default with regclass cast");

    // Verify again
    console.log("\n6️⃣ Verifying fix:");
    const verifyResult = await sql`
      SELECT column_default 
      FROM information_schema.columns 
      WHERE table_name = 'vehicles' 
      AND column_name = 'id'
    `;
    console.log("   New column_default:", verifyResult[0].column_default);

    // Test insert
    console.log("\n7️⃣ Testing insert:");
    try {
      const testResult = await sql`
        INSERT INTO vehicles (
          category, brand, model, year, plate, market_price,
          condition, created_at, updated_at
        ) VALUES (
          'Test', 'TestBrand', 'TestModel', 2024, 'TEST-FIX', 1000,
          'New', NOW(), NOW()
        )
        RETURNING id
      `;
      console.log(`   ✅ Success! New ID: ${testResult[0].id}`);
      
      // Clean up
      await sql`DELETE FROM vehicles WHERE id = ${testResult[0].id}`;
      console.log("   ✅ Test record cleaned up");
    } catch (e) {
      console.log(`   ❌ Insert failed: ${e.message}`);
    }

  } catch (error) {
    console.error("❌ Diagnosis failed:", error.message);
    console.error(error);
  }
}

diagnose();
