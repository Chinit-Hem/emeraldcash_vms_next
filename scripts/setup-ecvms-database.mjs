// Setup ecvms database schema
import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set");
  process.exit(1);
}


const sql = neon(DATABASE_URL);

async function setupDatabase() {
  try {
    console.log("🔧 Setting up ecvms database schema...");
    
    // Create vehicles table using tagged template literal
    await sql`
      CREATE TABLE IF NOT EXISTS vehicles (
        id SERIAL PRIMARY KEY,
        vehicle_id VARCHAR(50) NOT NULL UNIQUE,
        category VARCHAR(50) NOT NULL,
        brand VARCHAR(100) NOT NULL,
        model VARCHAR(100) NOT NULL,
        year INTEGER,
        plate VARCHAR(20),
        price_new NUMERIC(12, 2),
        price_40 NUMERIC(12, 2),
        price_70 NUMERIC(12, 2),
        tax_type VARCHAR(50),
        condition VARCHAR(50),
        body_type VARCHAR(50),
        color VARCHAR(50),
        image TEXT,
        time TIMESTAMPTZ,
        market_price_low NUMERIC(12, 2),
        market_price_median NUMERIC(12, 2),
        market_price_high NUMERIC(12, 2),
        market_price_source VARCHAR(50),
        market_price_samples INTEGER,
        market_price_confidence VARCHAR(20),
        market_price_updated_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log("✅ Vehicles table created successfully");
    
    // Create indexes using tagged template literals
    await sql`CREATE INDEX IF NOT EXISTS idx_vehicles_vehicle_id ON vehicles(vehicle_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_vehicles_brand ON vehicles(brand)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_vehicles_model ON vehicles(model)`;

    
    console.log("✅ Indexes created successfully");
    
    // Verify table was created
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'vehicles' AND table_schema = 'public'
    `;
    
    console.log("\n🚗 Vehicles table columns:");
    columns.forEach(c => {
      console.log(`   - ${c.column_name}: ${c.data_type}`);
    });
    
    console.log(`\n📈 Total columns: ${columns.length}`);
    console.log("\n✅ Database setup complete!");
    
  } catch (error) {
    console.error("❌ Setup failed:", error.message);
    process.exit(1);
  }
}

setupDatabase();
