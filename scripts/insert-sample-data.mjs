// Insert sample vehicle data into the database
import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set");
  process.exit(1);
}



const sql = neon(DATABASE_URL);

// Sample vehicle data
const sampleVehicles = [
  {
    vehicle_id: "VH001",
    category: "SUV",
    brand: "Toyota",
    model: "Land Cruiser",
    year: 2023,
    plate: "2A-1234",
    price_new: 85000,
    price_40: 51000,
    price_70: 25500,
    tax_type: "Import",
    condition: "New",
    body_type: "SUV",
    color: "White",
    image: null,
    time: new Date().toISOString(),
    market_price_low: 80000,
    market_price_median: 85000,
    market_price_high: 90000,
    market_price_source: "Market Research",
    market_price_samples: 10,
    market_price_confidence: "High",
    market_price_updated_at: new Date().toISOString()
  },
  {
    vehicle_id: "VH002",
    category: "Sedan",
    brand: "Honda",
    model: "Accord",
    year: 2022,
    plate: "2B-5678",
    price_new: 45000,
    price_40: 27000,
    price_70: 13500,
    tax_type: "Local",
    condition: "Used",
    body_type: "Sedan",
    color: "Black",
    image: null,
    time: new Date().toISOString(),
    market_price_low: 40000,
    market_price_median: 45000,
    market_price_high: 50000,
    market_price_source: "Market Research",
    market_price_samples: 8,
    market_price_confidence: "Medium",
    market_price_updated_at: new Date().toISOString()
  },
  {
    vehicle_id: "VH003",
    category: "Truck",
    brand: "Ford",
    model: "Ranger",
    year: 2024,
    plate: "2C-9012",
    price_new: 55000,
    price_40: 33000,
    price_70: 16500,
    tax_type: "Import",
    condition: "New",
    body_type: "Pickup",
    color: "Blue",
    image: null,
    time: new Date().toISOString(),
    market_price_low: 50000,
    market_price_median: 55000,
    market_price_high: 60000,
    market_price_source: "Market Research",
    market_price_samples: 5,
    market_price_confidence: "High",
    market_price_updated_at: new Date().toISOString()
  }
];

async function insertSampleData() {
  try {
    console.log("🔌 Connecting to database...\n");
    
    // Test connection
    const versionResult = await sql`SELECT version()`;
    console.log("✅ Connected to PostgreSQL");
    console.log(`📊 Version: ${versionResult[0].version}\n`);
    
    console.log(`🚗 Inserting ${sampleVehicles.length} sample vehicles...\n`);
    
    for (const vehicle of sampleVehicles) {
      try {
        const result = await sql`
          INSERT INTO vehicles (
            vehicle_id, category, brand, model, year, plate,
            price_new, price_40, price_70, tax_type, condition,
            body_type, color, image, time,
            market_price_low, market_price_median, market_price_high,
            market_price_source, market_price_samples, market_price_updated_at,
            market_price_confidence
          ) VALUES (
            ${vehicle.vehicle_id}, 
            ${vehicle.category}, 
            ${vehicle.brand}, 
            ${vehicle.model}, 
            ${vehicle.year}, 
            ${vehicle.plate},
            ${vehicle.price_new}, 
            ${vehicle.price_40}, 
            ${vehicle.price_70}, 
            ${vehicle.tax_type},
            ${vehicle.condition}, 
            ${vehicle.body_type},
            ${vehicle.color},
            ${vehicle.image},
            ${vehicle.time},
            ${vehicle.market_price_low},
            ${vehicle.market_price_median},
            ${vehicle.market_price_high},
            ${vehicle.market_price_source},
            ${vehicle.market_price_samples},
            ${vehicle.market_price_updated_at},
            ${vehicle.market_price_confidence}
          )
          RETURNING *
        `;
        
        console.log(`✅ Inserted: ${vehicle.brand} ${vehicle.model} (${vehicle.vehicle_id})`);
      } catch (insertError) {
        if (insertError.message.includes('duplicate key')) {
          console.log(`⚠️ Skipped: ${vehicle.vehicle_id} already exists`);
        } else {
          console.error(`❌ Error inserting ${vehicle.vehicle_id}:`, insertError.message);
        }
      }
    }
    
    // Get final count
    const countResult = await sql`SELECT COUNT(*) as count FROM vehicles`;
    console.log(`\n📈 Total vehicles in database: ${countResult[0].count}`);
    
    console.log("\n✅ Sample data insertion complete!");
    console.log("\nYou can now run 'node scripts/get-vehicles-data.mjs' to view the data.");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

insertSampleData();
