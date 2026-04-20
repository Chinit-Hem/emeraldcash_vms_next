// Get all data from all tables in the database
import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set");
  process.exit(1);
}



const sql = neon(DATABASE_URL);

async function getAllData() {
  try {
    console.log("🔌 Connecting to database...\n");
    
    // Test connection
    const versionResult = await sql`SELECT version()`;
    console.log("✅ Connected to PostgreSQL");
    console.log(`📊 Version: ${versionResult[0].version}\n`);
    
    // Get all tables
    console.log("📋 Finding all tables...\n");
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    console.log(`Found ${tables.length} table(s):\n`);
    
    // For each table, get row count and sample data
    for (const table of tables) {
      const tableName = table.table_name;
      console.log(`\n=== Table: ${tableName} ===`);
      
      try {
        // Get row count using parameterized query
        const countQuery = `SELECT COUNT(*) as count FROM ${tableName}`;
        const countResult = await sql.unsafe(countQuery);
        const rowCount = parseInt(countResult[0]?.count || 0);
        console.log(`  Total rows: ${rowCount}`);
        
        if (rowCount > 0) {
          // Get column names
          const columns = await sql`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = ${tableName} AND table_schema = 'public'
            ORDER BY ordinal_position
          `;
          console.log(`  Columns: ${columns.map(c => c.column_name).join(', ')}`);
          
          // Get sample data (first 3 rows)
          const sampleQuery = `SELECT * FROM ${tableName} LIMIT 3`;
          const sampleData = await sql.unsafe(sampleQuery);
          console.log(`\n  Sample data (up to 3 rows):`);
          sampleData.forEach((row, index) => {
            console.log(`\n  Row ${index + 1}:`);
            Object.entries(row).forEach(([key, value]) => {
              const displayValue = value === null ? 'NULL' : 
                                  typeof value === 'string' && value.length > 50 ? 
                                  value.substring(0, 50) + '...' : value;
              console.log(`    ${key}: ${displayValue}`);
            });
          });
        } else {
          console.log('  (No data in this table)');
        }
      } catch (tableError) {
        console.log(`  ⚠️ Error reading table: ${tableError.message}`);
      }
      
      console.log(''); // Empty line between tables
    }
    
    console.log("✅ Data retrieval complete!");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

getAllData();
