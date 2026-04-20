#!/usr/bin/env node
/**
 * Direct Database Test for User Persistence
 * Tests the database operations directly without needing the API server
 */

import { neon } from "@neondatabase/serverless";
import { randomUUID } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";

// Load environment variables from .env.local
function loadEnvFile() {
  try {
    const envPath = join(process.cwd(), ".env.local");
    const envContent = readFileSync(envPath, "utf-8");
    
    envContent.split("\n").forEach(line => {
      line = line.trim();
      if (!line || line.startsWith("#")) return;
      
      const eqIndex = line.indexOf("=");
      if (eqIndex > 0) {
        const key = line.substring(0, eqIndex).trim();
        let value = line.substring(eqIndex + 1).trim();
        value = value.replace(/^["']|["']$/g, "");
        
        if (key && !process.env[key]) {
          process.env[key] = value;
        }
      }
    });
    
    console.log("✓ Loaded environment from .env.local");
  } catch (error) {
    console.log("ℹ Could not load .env.local:", error.message);
  }
}

loadEnvFile();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

// Test user data
const TEST_USER = {
  username: `testuser_${randomUUID().slice(0, 8)}`,
  password_hash: "$2b$10$testhash1234567890123456789012345678901234567890123456", // fake hash
  role: "Staff",
  created_by: "system"
};

console.log("=".repeat(60));
console.log("DIRECT DATABASE USER PERSISTENCE TEST");
console.log("=".repeat(60));
console.log(`Test User: ${TEST_USER.username}`);
console.log(`Database: ${DATABASE_URL.split("@")[1]?.split("/")[0] || "unknown"}`);
console.log("=".repeat(60));

async function runTest() {
  let success = true;
  
  try {
    // Step 1: Ensure users table exists
    console.log("\n📦 STEP 1: Ensuring users table exists...");
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        username VARCHAR(32) PRIMARY KEY,
        role VARCHAR(10) NOT NULL CHECK (role IN ('Admin', 'Staff')),
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(32) NOT NULL
      )
    `;
    console.log("   ✓ Users table ready");
    
    // Step 2: Insert test user
    console.log("\n📝 STEP 2: Inserting test user into database...");
    console.log("   → Executing INSERT...");
    
    const insertResult = await sql`
      INSERT INTO users (username, role, password_hash, created_by)
      VALUES (
        ${TEST_USER.username},
        ${TEST_USER.role},
        ${TEST_USER.password_hash},
        ${TEST_USER.created_by}
      )
      RETURNING *
    `;
    
    console.log("   ✓ User INSERTED successfully!");
    console.log(`      - Username: ${insertResult[0].username}`);
    console.log(`      - Role: ${insertResult[0].role}`);
    console.log(`      - Created at: ${insertResult[0].created_at}`);
    
    // Step 3: Verify user exists
    console.log("\n🔍 STEP 3: Verifying user exists in database...");
    const verifyResult = await sql`SELECT * FROM users WHERE username = ${TEST_USER.username}`;
    
    if (verifyResult.length === 0) {
      console.error("   ❌ User NOT found after insertion!");
      success = false;
    } else {
      console.log("   ✓ User verified in database");
    }
    
    // Step 4: Create new connection and verify (simulates restart)
    console.log("\n🔄 STEP 4: Simulating server restart with new connection...");
    const newSql = neon(DATABASE_URL);
    const restartResult = await newSql`SELECT * FROM users WHERE username = ${TEST_USER.username}`;
    
    if (restartResult.length === 0) {
      console.error("   ❌ User NOT found after restart simulation!");
      success = false;
    } else {
      console.log("   ✓ User persists after simulated restart");
    }
    
    // Step 5: List all users
    console.log("\n📋 STEP 5: Listing all users...");
    const allUsers = await sql`SELECT username, role, created_by FROM users ORDER BY created_at DESC`;
    console.log(`   ✓ Found ${allUsers.length} users:`);
    allUsers.forEach((user, i) => {
      const marker = user.username === TEST_USER.username ? " ← TEST USER" : "";
      console.log(`      ${i + 1}. ${user.username} (${user.role})${marker}`);
    });
    
    // Cleanup
    console.log("\n🧹 Cleaning up test user...");
    await sql`DELETE FROM users WHERE username = ${TEST_USER.username}`;
    console.log("   ✓ Test user deleted");
    
  } catch (error) {
    console.error("\n❌ TEST ERROR:", error.message);
    console.error(error);
    success = false;
    
    // Try to cleanup even on error
    try {
      await sql`DELETE FROM users WHERE username = ${TEST_USER.username}`;
      console.log("   ✓ Cleanup completed");
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
  }
  
  console.log("\n" + "=".repeat(60));
  if (success) {
    console.log("✅ ALL TESTS PASSED");
    console.log("   User persistence is working correctly!");
    console.log("   Data is being stored in PostgreSQL database.");
  } else {
    console.log("❌ TESTS FAILED");
  }
  console.log("=".repeat(60));
  
  process.exit(success ? 0 : 1);
}

runTest();
