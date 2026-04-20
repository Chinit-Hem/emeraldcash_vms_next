import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

async function check() {
  console.log("Checking vehicle ID 829...\n");
  
  // Check if vehicle 829 exists
  const result = await sql`SELECT * FROM vehicles WHERE id = 829`;
  console.log("Vehicle 829:", result.length > 0 ? result[0] : "NOT FOUND");
  
  // Get total count
  const count = await sql`SELECT COUNT(*) as count FROM vehicles`;
  console.log("\nTotal vehicles:", count[0].count);
  
  // Get last 5 vehicles
  const sample = await sql`SELECT id, brand, model FROM vehicles ORDER BY id DESC LIMIT 5`;
  console.log("\nLast 5 vehicles:");
  sample.forEach(v => console.log(`  ID ${v.id}: ${v.brand} ${v.model}`));
  
  // Check min and max IDs
  const range = await sql`SELECT MIN(id) as min_id, MAX(id) as max_id FROM vehicles`;
  console.log(`\nID range: ${range[0].min_id} to ${range[0].max_id}`);
}

check().catch(console.error);
