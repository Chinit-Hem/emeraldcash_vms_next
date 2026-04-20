import fs from 'fs';

const vehiclesPath = 'C:/Users/Chinit Hem/Downloads/vehicles.csv';

console.log('Checking vehicles.csv file...\n');

if (!fs.existsSync(vehiclesPath)) {
  console.log(`❌ vehicles.csv not found at: ${vehiclesPath}`);
  process.exit(1);
}

const content = fs.readFileSync(vehiclesPath, 'utf-8');
const lines = content.split('\n').filter(line => line.trim() !== '');
const dataRows = lines.length > 0 ? lines.length - 1 : 0;

console.log(`📁 File: vehicles.csv`);
console.log(`📊 Total lines: ${lines.length}`);
console.log(`🚗 Data rows (vehicles): ${dataRows}`);

// Show ID range
if (lines.length > 1) {
  const firstId = lines[1].split(',')[0];
  const lastLine = lines[lines.length - 1];
  const lastId = lastLine.split(',')[0];
  console.log(`🔢 ID Range: ${firstId} to ${lastId}`);
  
  // Check if this file has more vehicles
  if (dataRows > 1190) {
    console.log(`\n✅ This file has ${dataRows - 1190} MORE vehicles than the cleaned CSV!`);
    console.log(`   This might have the missing ${1222 - 1190} vehicles.`);
  } else if (dataRows < 1190) {
    console.log(`\n⚠️  This file has ${1190 - dataRows} FEWER vehicles.`);
  } else {
    console.log(`\nℹ️  Both files have the same number of vehicles.`);
  }
}

// Compare with expected 1222
if (dataRows === 1222) {
  console.log(`\n🎉 PERFECT! This file has exactly 1,222 vehicles!`);
  console.log(`   This is the complete dataset!`);
} else if (dataRows > 1222) {
  console.log(`\n⚠️  This file has ${dataRows - 1222} MORE than expected 1,222.`);
} else if (dataRows < 1222) {
  console.log(`\n❌ Still missing ${1222 - dataRows} vehicles to reach 1,222.`);
}

// Show first few rows to understand structure
console.log(`\n📋 First 3 rows (including header):`);
lines.slice(0, 3).forEach((line, i) => {
  console.log(`   ${i}: ${line.substring(0, 100)}...`);
});
