// Get all vehicles data from database
import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set");
  process.exit(1);
}



const sql = neon(DATABASE_URL);

async function getVehiclesData() {
  try {
    console.log("🔌 Connecting to database...\n");
    
    // Test connection
    const versionResult = await sql`SELECT version()`;
    console.log("✅ Connected to PostgreSQL");
    console.log(`📊 Version: ${versionResult[0].version}\n`);
    
    // Get all vehicles
    console.log("🚗 Fetching vehicles data...\n");
    const vehicles = await sql`SELECT * FROM vehicles ORDER BY created_at DESC`;
    
    if (vehicles.length === 0) {
      console.log("ℹ️ No vehicles found in the database.\n");
    } else {
      console.log(`✅ Found ${vehicles.length} vehicle(s):\n`);
      
      // Display each vehicle
      vehicles.forEach((vehicle, index) => {
        console.log(`--- Vehicle ${index + 1} ---`);
        console.log(`  ID: ${vehicle.id}`);
        console.log(`  Vehicle ID: ${vehicle.vehicle_id}`);
        console.log(`  Category: ${vehicle.category}`);
        console.log(`  Brand: ${vehicle.brand}`);
        console.log(`  Model: ${vehicle.model}`);
        console.log(`  Year: ${vehicle.year || 'N/A'}`);
        console.log(`  Plate: ${vehicle.plate || 'N/A'}`);
        console.log(`  Price New: ${vehicle.price_new || 'N/A'}`);
        console.log(`  Condition: ${vehicle.condition || 'N/A'}`);
        console.log(`  Color: ${vehicle.color || 'N/A'}`);
        console.log(`  Image: ${vehicle.image ? 'Yes' : 'No'}`);
        console.log(`  Created: ${vehicle.created_at}`);
        console.log(`  Updated: ${vehicle.updated_at}`);
        console.log('');
      });
    }
    
    // Get statistics
    console.log("📊 Database Statistics:\n");
    
    const totalCount = await sql`SELECT COUNT(*) as count FROM vehicles`;
    console.log(`  Total Vehicles: ${totalCount[0].count}`);
    
    const categoryCount = await sql`
      SELECT category, COUNT(*) as count 
      FROM vehicles 
      GROUP BY category
    `;
    
    if (categoryCount.length > 0) {
      console.log("  By Category:");
      categoryCount.forEach(c => {
        console.log(`    - ${c.category}: ${c.count}`);
      });
    }
    
    const brandCount = await sql`
      SELECT brand, COUNT(*) as count 
      FROM vehicles 
      GROUP BY brand 
      ORDER BY count DESC 
      LIMIT 5
    `;
    
    if (brandCount.length > 0) {
      console.log("  Top 5 Brands:");
      brandCount.forEach(b => {
        console.log(`    - ${b.brand}: ${b.count}`);
      });
    }
    
    console.log("\n✅ Data retrieval complete!");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

getVehiclesData();
