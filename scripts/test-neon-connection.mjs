#!/usr/bin/env node
/**
 * Test Neon DB Connection
 * 
 * This script verifies your DATABASE_URL connection to Neon PostgreSQL.
 * Run with: node scripts/test-neon-connection.mjs
 */

import { neon } from "@neondatabase/serverless";

// Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testConnection() {
  log("\n🔍 Testing Neon DB Connection...\n", "cyan");
  
  // Check if DATABASE_URL is set
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    log("❌ ERROR: DATABASE_URL environment variable is not set!", "red");
    log("\nTo fix this:", "yellow");
    log("1. Create a .env.local file in your project root");
    log("2. Add: DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require");
    log("3. Get your connection string from: https://console.neon.tech/app/projects/long-hill-90158403/branches/br-lingering-cell-ai19xt06/tables");
    log("\nSee NEON_DB_SETUP.md for detailed instructions.\n");
    process.exit(1);
  }
  
  // Mask credentials for safe logging
  const maskedUrl = databaseUrl.replace(/\/\/.*@/, "//[CREDENTIALS]@");
  log(`📋 Connection URL: ${maskedUrl}`, "blue");
  
  try {
    // Add sdk_semver for Neon API compatibility
    const url = new URL(databaseUrl);
    url.searchParams.set("sdk_semver", "1.0.2");
    
    // Create SQL client
    const sql = neon(url.toString());
    
    // Test 1: Basic connection
    log("\n🧪 Test 1: Basic Connection...", "yellow");
    const versionResult = await sql`SELECT version()`;
    log("✅ Connected successfully!", "green");
    log(`   PostgreSQL Version: ${versionResult[0].version.split(" ")[0]}`, "blue");
    
    // Test 2: List tables
    log("\n🧪 Test 2: Listing Tables...", "yellow");
    const tablesResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    
    if (tablesResult.length === 0) {
      log("⚠️  No tables found in the database", "yellow");
    } else {
      log(`✅ Found ${tablesResult.length} tables:`, "green");
      tablesResult.forEach((row, i) => {
        log(`   ${i + 1}. ${row.table_name}`, "blue");
      });
    }
    
    // Test 3: Count records in each table
    log("\n🧪 Test 3: Counting Records...", "yellow");
    const tables = ["vehicles", "users", "lms_categories", "lms_lessons", "lms_staff", "lms_lesson_completions"];
    
    for (const table of tables) {
      try {
        const countResult = await sql`SELECT COUNT(*) as count FROM ${sql(table)}`;
        const count = countResult[0]?.count || 0;
        log(`   ${table}: ${count} records`, count > 0 ? "green" : "blue");
      } catch (err) {
        log(`   ${table}: Table not found or error`, "yellow");
      }
    }
    
    // Success
    log("\n✅ All tests passed! Your Neon DB connection is working correctly.\n", "green");
    log("🚀 Next steps:", "cyan");
    log("   1. Run your app: npm run dev");
    log("   2. Visit: http://localhost:3000/debug/data-list");
    log("   3. View all your data in the Data Explorer\n");
    
  } catch (error) {
    log("\n❌ Connection failed!", "red");
    log(`\nError: ${error.message}`, "red");
    
    if (error.message.includes("password authentication failed")) {
      log("\n💡 Tip: Check your username and password in the connection string.", "yellow");
    } else if (error.message.includes("getaddrinfo") || error.message.includes("ENOTFOUND")) {
      log("\n💡 Tip: The hostname in your connection string might be incorrect.", "yellow");
    } else if (error.message.includes("timeout")) {
      log("\n💡 Tip: Check your network connection and firewall settings.", "yellow");
    }
    
    log("\n📚 For help, see: NEON_DB_SETUP.md\n", "blue");
    process.exit(1);
  }
}

// Run the test
testConnection();
