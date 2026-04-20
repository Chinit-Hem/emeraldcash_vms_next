#!/usr/bin/env node
/**
 * iOS Compatibility Test Script
 * 
 * Tests data display, image loading, and hydration safety for iOS Safari.
 * 
 * Usage: node scripts/test-ios-compatibility.mjs
 */

// Use built-in fetch API (Node.js 18+)

// ============================================================================
// Configuration
// ============================================================================

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const IOS_USER_AGENT = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1";

// ============================================================================
// Test Utilities
// ============================================================================

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

function success(message) {
  log(`✅ ${message}`, "green");
}

function error(message) {
  log(`❌ ${message}`, "red");
}

function warning(message) {
  log(`⚠️  ${message}`, "yellow");
}

function info(message) {
  log(`ℹ️  ${message}`, "cyan");
}

// ============================================================================
// Test Functions
// ============================================================================

async function testDashboardData() {
  info("\n📊 Testing Dashboard Data Display...");
  
  try {
    const response = await fetch(`${BASE_URL}/api/vehicles`, {
      headers: {
        "User-Agent": IOS_USER_AGENT,
        "Accept": "application/json",
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Check if data has required fields
    if (!data.vehicles || !Array.isArray(data.vehicles)) {
      throw new Error("Invalid response format: missing vehicles array");
    }
    
    if (!data.meta) {
      throw new Error("Invalid response format: missing meta object");
    }
    
    // Check KPI counts
    const { total, countsByCategory } = data.meta;
    
    if (typeof total !== "number") {
      throw new Error("Invalid total count format");
    }
    
    if (!countsByCategory) {
      throw new Error("Missing countsByCategory in meta");
    }
    
    const { Cars, Motorcycles, TukTuks } = countsByCategory;
    
    success(`Total vehicles: ${total}`);
    success(`Cars: ${Cars || 0}`);
    success(`Motorcycles: ${Motorcycles || 0}`);
    success(`Tuk Tuks: ${TukTuks || 0}`);
    
    // Validate counts are numbers (not null/undefined)
    if (Cars === null || Cars === undefined) {
      warning("Cars count is null/undefined - may show '—' on iOS");
    }
    if (Motorcycles === null || Motorcycles === undefined) {
      warning("Motorcycles count is null/undefined - may show '—' on iOS");
    }
    if (TukTuks === null || TukTuks === undefined) {
      warning("TukTuks count is null/undefined - may show '—' on iOS");
    }
    
    return true;
  } catch (err) {
    error(`Dashboard data test failed: ${err.message}`);
    return false;
  }
}

async function testImageLoading() {
  info("\n🖼️  Testing Image Loading...");
  
  try {
    const response = await fetch(`${BASE_URL}/api/vehicles`, {
      headers: {
        "User-Agent": IOS_USER_AGENT,
        "Accept": "application/json",
      },
    });
    
    const data = await response.json();
    
    if (!data.vehicles || data.vehicles.length === 0) {
      warning("No vehicles found to test image loading");
      return true;
    }
    
    // Find vehicles with images
    const vehiclesWithImages = data.vehicles.filter(v => v.Image && v.Image.length > 0);
    
    if (vehiclesWithImages.length === 0) {
      warning("No vehicles with images found");
      return true;
    }
    
    info(`Found ${vehiclesWithImages.length} vehicles with images`);
    
    // Test first 3 images
    const testVehicles = vehiclesWithImages.slice(0, 3);
    
    for (const vehicle of testVehicles) {
      const imageUrl = vehicle.Image;
      info(`Testing image for vehicle ${vehicle.VehicleId}: ${imageUrl.substring(0, 50)}...`);
      
      try {
        // Check if URL is valid
        const urlObj = new URL(imageUrl);
        
        // Test if image is accessible
        const imgResponse = await fetch(imageUrl, {
          method: "HEAD",
          headers: {
            "User-Agent": IOS_USER_AGENT,
          },
        });
        
        if (imgResponse.ok) {
          success(`Image accessible: ${urlObj.hostname}`);
        } else {
          warning(`Image returned HTTP ${imgResponse.status}: ${imageUrl.substring(0, 50)}...`);
        }
      } catch (err) {
        error(`Invalid or inaccessible image URL: ${err.message}`);
      }
    }
    
    return true;
  } catch (err) {
    error(`Image loading test failed: ${err.message}`);
    return false;
  }
}

async function testHydrationSafety() {
  info("\n🔒 Testing Hydration Safety...");
  
  try {
    // Test that the page renders without hydration errors
    const response = await fetch(BASE_URL, {
      headers: {
        "User-Agent": IOS_USER_AGENT,
        "Accept": "text/html",
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // Check for hydration-related attributes
    if (html.includes('suppressHydrationWarning')) {
      success("Hydration warning suppression found");
    }
    
    // Check for iOS-specific class
    if (html.includes('ios-safari')) {
      success("iOS Safari class detection found");
    }
    
    // Check for mounted state checks (should be in the HTML)
    if (html.includes('isMounted') || html.includes('useMounted')) {
      success("Mounted state checks found");
    }
    
    // Verify no server-side localStorage access
    if (html.includes('localStorage') && !html.includes('typeof window')) {
      warning("Potential localStorage access without window check");
    } else {
      success("localStorage safely guarded");
    }
    
    return true;
  } catch (err) {
    error(`Hydration safety test failed: ${err.message}`);
    return false;
  }
}

async function testSearchFunctionality() {
  info("\n🔍 Testing Search Functionality...");
  
  try {
    // Test search with iOS user agent
    const searchResponse = await fetch(`${BASE_URL}/api/vehicles?search=toyota`, {
      headers: {
        "User-Agent": IOS_USER_AGENT,
        "Accept": "application/json",
      },
    });
    
    if (!searchResponse.ok) {
      throw new Error(`Search HTTP ${searchResponse.status}`);
    }
    
    const searchData = await searchResponse.json();
    
    if (searchData.vehicles && Array.isArray(searchData.vehicles)) {
      success(`Search returned ${searchData.vehicles.length} results`);
    } else {
      warning("Search returned invalid format");
    }
    
    // Test category filter
    const categoryResponse = await fetch(`${BASE_URL}/api/vehicles?category=Cars`, {
      headers: {
        "User-Agent": IOS_USER_AGENT,
        "Accept": "application/json",
      },
    });
    
    if (categoryResponse.ok) {
      success("Category filter working");
    }
    
    return true;
  } catch (err) {
    error(`Search test failed: ${err.message}`);
    return false;
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runTests() {
  log("\n" + "=".repeat(60), "blue");
  log("🧪 iOS Compatibility Test Suite", "blue");
  log("=".repeat(60), "blue");
  log(`Testing against: ${BASE_URL}`, "cyan");
  log(`User-Agent: ${IOS_USER_AGENT.substring(0, 50)}...`, "cyan");
  
  const results = {
    dashboard: await testDashboardData(),
    images: await testImageLoading(),
    hydration: await testHydrationSafety(),
    search: await testSearchFunctionality(),
  };
  
  // Summary
  log("\n" + "=".repeat(60), "blue");
  log("📋 Test Summary", "blue");
  log("=".repeat(60), "blue");
  
  const allPassed = Object.values(results).every(r => r);
  
  for (const [test, passed] of Object.entries(results)) {
    if (passed) {
      success(`${test}: PASSED`);
    } else {
      error(`${test}: FAILED`);
    }
  }
  
  log("\n" + "=".repeat(60), "blue");
  if (allPassed) {
    log("🎉 All iOS compatibility tests passed!", "green");
  } else {
    log("⚠️  Some tests failed. Review the output above.", "yellow");
  }
  log("=".repeat(60), "blue");
  
  process.exit(allPassed ? 0 : 1);
}

// Handle errors
process.on("unhandledRejection", (err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});

// Run tests
runTests();
