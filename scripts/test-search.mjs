// Test script for search functionality
import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set");
  process.exit(1);
}


const sql = neon(DATABASE_URL);

async function testSearch() {
  try {
    console.log("Testing database connection...");
    const version = await sql`SELECT version()`;
    console.log("✅ Connected:", version[0].version);
    
    console.log("\nTesting simple query...");
    const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    console.log("Tables:", tables.map(t => t.table_name));
    
    console.log("\nChecking vehicles table columns...");
    const columns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'vehicles' AND table_schema = 'public'
    `;
    console.log("Columns:", columns.map(c => c.column_name));
    
    console.log("\nTesting search with pattern...");
    const searchTerm = "Toyota";
    const pattern = `%${searchTerm}%`;
    console.log("Pattern:", pattern);
    
    // Test the search query - only search brand and model (description may not exist)
    const result = await sql`
      SELECT * FROM vehicles 
      WHERE 
        brand ILIKE ${pattern} OR
        model ILIKE ${pattern}
      ORDER BY brand, model
      LIMIT 10
    `;
    
    console.log("✅ Search result:", result);
    console.log("Rows found:", result.length);

    
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("Stack:", error.stack);
  }
}

testSearch();
