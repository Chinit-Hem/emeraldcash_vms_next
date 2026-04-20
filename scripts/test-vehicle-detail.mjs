import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

// Pricing calculation functions
function roundTo(value, decimals = 2) {
  const safeDecimals = Math.max(0, Math.min(6, Math.trunc(decimals)));
  const factor = 10 ** safeDecimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function percentOfPrice(price, percent, decimals = 2) {
  if (price == null) return null;
  if (!Number.isFinite(price)) return null;
  if (!Number.isFinite(percent)) return null;
  return roundTo(price * percent, decimals);
}

function derivePrice40(priceNew) {
  return percentOfPrice(priceNew, 0.4);
}

function derivePrice70(priceNew) {
  return percentOfPrice(priceNew, 0.7);
}

// toVehicle function from db-schema.ts
function toVehicle(dbVehicle) {
  const priceNew = typeof dbVehicle.market_price === 'string' 
    ? parseFloat(dbVehicle.market_price) 
    : (dbVehicle.market_price || 0);
  
  return {
    VehicleId: String(dbVehicle.id),
    Category: dbVehicle.category,
    Brand: dbVehicle.brand,
    Model: dbVehicle.model,
    Year: dbVehicle.year,
    Plate: dbVehicle.plate,
    PriceNew: priceNew,
    Price40: derivePrice40(priceNew),
    Price70: derivePrice70(priceNew),
    TaxType: dbVehicle.tax_type,
    Condition: dbVehicle.condition,
    BodyType: dbVehicle.body_type,
    Color: dbVehicle.color,
    Image: dbVehicle.image_id || "",
    Time: dbVehicle.created_at,
  };
}

async function testVehicleDetail() {
  try {
    console.log("🔍 Testing vehicle detail API simulation...\n");

    // Get vehicle 1 from database
    const result = await sql`SELECT * FROM vehicles WHERE id = 1`;
    
    if (result.length === 0) {
      console.error("❌ Vehicle with ID 1 not found");
      process.exit(1);
    }
    
    const dbVehicle = result[0];
    const vehicle = toVehicle(dbVehicle);
    
    console.log("✅ Vehicle Detail API Response:");
    console.log(JSON.stringify({ ok: true, data: vehicle }, null, 2));

  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

testVehicleDetail();
