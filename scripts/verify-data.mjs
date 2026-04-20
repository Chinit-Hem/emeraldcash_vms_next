import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function verifyData() {
  try {
    console.log("🔍 Verifying database data...\n");

    // Check total count
    const countResult = await sql`SELECT COUNT(*) as count FROM vehicles`;
    const totalCount = parseInt(countResult[0].count);
    console.log(`📊 Total vehicles: ${totalCount}`);

    // Get sample data
    const sample = await sql`SELECT * FROM vehicles LIMIT 5`;
    
    console.log("\n📋 Columns in table:");
    if (sample.length > 0) {
      console.log(Object.keys(sample[0]).join(", "));
    }

    console.log("\n📝 Sample vehicles:");
    sample.forEach((row, i) => {
      console.log(`\nRow ${i + 1}:`);
      console.log(`  ID: ${row.id}`);
      console.log(`  Category: ${row.category}`);
      console.log(`  Brand: ${row.brand}`);
      console.log(`  Model: ${row.model}`);
      console.log(`  Year: ${row.year}`);
      console.log(`  Plate: ${row.plate}`);
      console.log(`  Market Price: ${row.market_price}`);
      console.log(`  Condition: ${row.condition}`);
      console.log(`  Color: ${row.color}`);
    });

    console.log("\n✅ Data verification complete!");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

verifyData();
