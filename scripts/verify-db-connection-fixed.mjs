// Verify database connection
import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set");
  console.error("Make sure .env.local file exists and contains DATABASE_URL");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function verifyConnection() {
  try {
    console.log("🔌 Verifying database connection...\n");
    
    const result = await sql`SELECT version()`;
    console.log("✅ Connected to PostgreSQL");
    console.log(`Version: ${result[0].version}`);
    
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    console.log(`\n📊 Found ${tables.length} table(s)`);
    tables.forEach(t => console.log(`  - ${t.table_name}`));
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

verifyConnection();
