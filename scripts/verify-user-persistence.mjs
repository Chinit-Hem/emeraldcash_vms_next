#!/usr/bin/env node
/**
 * User Persistence Verification Script
 * 
 * This script:
 * 1. Creates a test user via the API
 * 2. Verifies the user exists in the database directly
 * 3. Simulates a "restart" by clearing the connection and checking again
 */

import { neon } from "@neondatabase/serverless";
import { randomUUID } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";

// Try to load environment variables from .env.local
function loadEnvFile() {
  try {
    const envPath = join(process.cwd(), ".env.local");
    const envContent = readFileSync(envPath, "utf-8");
    
    envContent.split("\n").forEach(line => {
      // Skip comments and empty lines
      line = line.trim();
      if (!line || line.startsWith("#")) return;
      
      const eqIndex = line.indexOf("=");
      if (eqIndex > 0) {
        const key = line.substring(0, eqIndex).trim();
        let value = line.substring(eqIndex + 1).trim();
        // Remove quotes if present
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

// Load environment variables
loadEnvFile();

// Get DATABASE_URL from environment or use fallback for testing
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set");
  console.error("   Please ensure DATABASE_URL is defined in .env.local");
  console.error("   Format: DATABASE_URL=postgresql://user:pass@host/db");
  process.exit(1);
}

// Create SQL client
const sql = neon(DATABASE_URL);

// Test configuration
const TEST_USER = {
  username: `testuser_${randomUUID().slice(0, 8)}`,
  password: "TestPassword123!",
  role: "Staff"
};

const API_BASE_URL = process.env.API_URL || "http://localhost:3000";

console.log("=".repeat(60));
console.log("USER PERSISTENCE VERIFICATION TEST");
console.log("=".repeat(60));
console.log(`Test User: ${TEST_USER.username}`);
console.log(`API URL: ${API_BASE_URL}`);
console.log(`Database: ${DATABASE_URL.split("@")[1]?.split("/")[0] || "unknown"}`);
console.log("=".repeat(60));

/**
 * Step 1: Create user via API
 */
async function createUserViaAPI() {
  console.log("\n📡 STEP 1: Creating user via API...");
  
  try {
    // First, we need to login as admin to get a session
    console.log("   → Logging in as admin...");
    const loginRes = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "admin",
        password: "1234" // Default password from seed
      })
    });
    
    if (!loginRes.ok) {
      console.error("   ❌ Admin login failed:", await loginRes.text());
      return null;
    }
    
    const loginData = await loginRes.json();
    console.log("   ✓ Admin logged in successfully");
    
    // Create the test user
    console.log(`   → Creating test user: ${TEST_USER.username}...`);
    const createRes = await fetch(`${API_BASE_URL}/api/auth/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": loginRes.headers.get("set-cookie") || ""
      },
      body: JSON.stringify(TEST_USER)
    });
    
    const createData = await createRes.json();
    
    if (!createRes.ok) {
      console.error("   ❌ User creation failed:", createData);
      return null;
    }
    
    console.log("   ✓ User created via API:", createData.user?.username);
    return createData.user;
  } catch (error) {
    console.error("   ❌ API Error:", error.message);
    return null;
  }
}

/**
 * Step 2: Verify user exists in database directly
 */
async function verifyUserInDatabase() {
  console.log("\n🔍 STEP 2: Verifying user in database (direct SQL query)...");
  
  try {
    console.log("   → Querying users table...");
    const result = await sql`SELECT * FROM users WHERE username = ${TEST_USER.username}`;
    
    if (result.length === 0) {
      console.error("   ❌ User NOT found in database!");
      return false;
    }
    
    const user = result[0];
    console.log("   ✓ User found in database:");
    console.log(`      - Username: ${user.username}`);
    console.log(`      - Role: ${user.role}`);
    console.log(`      - Created by: ${user.created_by}`);
    console.log(`      - Created at: ${user.created_at}`);
    
    return true;
  } catch (error) {
    console.error("   ❌ Database query failed:", error.message);
    return false;
  }
}

/**
 * Step 3: Simulate "restart" by creating new connection and checking again
 */
async function verifyAfterSimulatedRestart() {
  console.log("\n🔄 STEP 3: Simulating server restart...");
  
  try {
    // Create a completely new SQL connection (simulates new server instance)
    console.log("   → Creating new database connection...");
    const newSql = neon(DATABASE_URL);
    
    // Wait a moment to simulate restart
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log("   → Querying with new connection...");
    const result = await newSql`SELECT * FROM users WHERE username = ${TEST_USER.username}`;
    
    if (result.length === 0) {
      console.error("   ❌ User NOT found after restart! (Persistence FAILED)");
      return false;
    }
    
    console.log("   ✓ User still exists after simulated restart!");
    console.log(`      - Username: ${result[0].username}`);
    console.log(`      - Role: ${result[0].role}`);
    
    return true;
  } catch (error) {
    console.error("   ❌ Post-restart verification failed:", error.message);
    return false;
  }
}

/**
 * Step 4: List all users to verify database is working
 */
async function listAllUsers() {
  console.log("\n📋 STEP 4: Listing all users in database...");
  
  try {
    const result = await sql`SELECT username, role, created_by, created_at FROM users ORDER BY created_at DESC`;
    
    console.log(`   ✓ Found ${result.length} users in database:`);
    result.forEach((user, i) => {
      const marker = user.username === TEST_USER.username ? " ← TEST USER" : "";
      console.log(`      ${i + 1}. ${user.username} (${user.role})${marker}`);
    });
    
    return result.length;
  } catch (error) {
    console.error("   ❌ Failed to list users:", error.message);
    return 0;
  }
}

/**
 * Step 5: Cleanup - Delete test user
 */
async function cleanup() {
  console.log("\n🧹 STEP 5: Cleaning up test user...");
  
  try {
    const result = await sql`DELETE FROM users WHERE username = ${TEST_USER.username} RETURNING username`;
    
    if (result.length > 0) {
      console.log("   ✓ Test user deleted:", result[0].username);
    } else {
      console.log("   ℹ Test user not found (may have been deleted already)");
    }
  } catch (error) {
    console.error("   ⚠ Cleanup failed:", error.message);
  }
}

/**
 * Main test execution
 */
async function runTest() {
  const startTime = Date.now();
  let success = true;
  
  try {
    // Step 1: Create user
    const createdUser = await createUserViaAPI();
    if (!createdUser) {
      console.error("\n❌ STEP 1 FAILED: Could not create user via API");
      success = false;
    }
    
    // Step 2: Verify in database
    if (success) {
      const inDb = await verifyUserInDatabase();
      if (!inDb) {
        console.error("\n❌ STEP 2 FAILED: User not found in database");
        success = false;
      }
    }
    
    // Step 3: Verify after "restart"
    if (success) {
      const afterRestart = await verifyAfterSimulatedRestart();
      if (!afterRestart) {
        console.error("\n❌ STEP 3 FAILED: User did not persist after restart");
        success = false;
      }
    }
    
    // Step 4: List all users
    await listAllUsers();
    
  } catch (error) {
    console.error("\n❌ UNEXPECTED ERROR:", error);
    success = false;
  } finally {
    // Always cleanup
    await cleanup();
  }
  
  const duration = Date.now() - startTime;
  
  console.log("\n" + "=".repeat(60));
  if (success) {
    console.log("✅ ALL TESTS PASSED");
    console.log("   User persistence is working correctly!");
    console.log("   Users are being stored in PostgreSQL database.");
  } else {
    console.log("❌ TESTS FAILED");
    console.log("   User persistence is NOT working correctly.");
  }
  console.log(`   Duration: ${duration}ms`);
  console.log("=".repeat(60));
  
  process.exit(success ? 0 : 1);
}

// Run the test
runTest();
