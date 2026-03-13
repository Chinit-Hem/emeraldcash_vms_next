import fs from 'fs';

const altPath = 'C:/Users/Chinit Hem/Downloads/cleaned_vehicles_for_google_sheets (1).csv';

console.log('Checking alternative CSV file...\n');

if (!fs.existsSync(altPath)) {
  console.log(`❌ Alternative file not found: ${altPath}`);
  process.exit(1);
}

const content = fs.readFileSync(altPath, 'utf-8');
const lines = content.split('\n').filter(line => line.trim() !== '');
const dataRows = lines.length > 0 ? lines.length - 1 : 0;

console.log(`📁 File: cleaned_vehicles_for_google_sheets (1).csv`);
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
    console.log(`\n✅ This file has ${dataRows - 1190} MORE vehicles than the other CSV!`);
    console.log(`   This might be the complete dataset with 1,222 vehicles.`);
  } else if (dataRows < 1190) {
    console.log(`\n⚠️  This file has ${1190 - dataRows} FEWER vehicles.`);
  } else {
    console.log(`\nℹ️  Both files have the same number of vehicles.`);
  }
}

// Compare with expected 1222
if (dataRows === 1222) {
  console.log(`\n🎉 PERFECT! This file has exactly 1,222 vehicles!`);
} else if (dataRows < 1222) {
  console.log(`\n❌ Still missing ${1222 - dataRows} vehicles to reach 1,222.`);
}
