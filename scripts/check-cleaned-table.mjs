import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function checkTable() {
  try {
    console.log("🔍 Checking vehicles table...\n");
    
    // Check if table exists
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'vehicles'
    `;
    
    if (tables.length === 0) {
      console.log("❌ Table does not exist yet");
      console.log("\nCreating table...");
      
      // Create the table
      await sql`
        CREATE TABLE IF NOT EXISTS vehicles (
          id SERIAL PRIMARY KEY,
          category VARCHAR(50),
          brand VARCHAR(100),
          model VARCHAR(100),
          year INTEGER,
          plate VARCHAR(20),
          market_price DECIMAL(12, 2),
          tax_type VARCHAR(50),
          condition VARCHAR(20),
          body_type VARCHAR(50),
          color VARCHAR(50),
          image_id VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      console.log("✅ Table created: vehicles");
    } else {
      console.log("✅ Table exists: vehicles");
    }
    
    // Get column info
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'vehicles'
      ORDER BY ordinal_position
    `;
    
    console.log(`\n📋 Columns (${columns.length}):`);
    columns.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });
    
    // Get row count
    const countResult = await sql`SELECT COUNT(*) as count FROM vehicles`;
    const count = parseInt(countResult[0].count);
    console.log(`\n📊 Total rows: ${count}`);
    
    // Get sample data
    if (count > 0) {
      const data = await sql`SELECT * FROM vehicles LIMIT 3`;
      console.log("\n📝 Sample data:");
      data.forEach((row, i) => {
        console.log(`\n   Row ${i + 1}:`);
        Object.entries(row).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            console.log(`      ${key}: ${value}`);
          }
        });
      });
    } else {
      console.log("\n⚠️  Table is empty - no data yet");
    }
    
    console.log("\n✅ Check complete!");
    
  } catch (err) {
    console.error("\n❌ Error:", err.message);
    process.exit(1);
  }
}

checkTable();
