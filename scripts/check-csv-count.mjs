import fs from 'fs';
import path from 'path';

const csvPath = 'C:/Users/Chinit Hem/Downloads/cleaned_vehicles_for_google_sheets.csv';

console.log('Checking CSV file for vehicle count...\n');

if (!fs.existsSync(csvPath)) {
  console.log(`❌ CSV file not found at: ${csvPath}`);
  
  // Try alternative path
  const altPath = 'C:/Users/Chinit Hem/Downloads/cleaned_vehicles_for_google_sheets (1).csv';
  if (fs.existsSync(altPath)) {
    console.log(`✅ Found alternative file: ${altPath}`);
    checkFile(altPath);
  }
} else {
  checkFile(csvPath);
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  console.log(`📁 File: ${filePath}`);
  console.log(`📊 Total lines in file: ${lines.length}`);
  
  // Remove empty lines
  const nonEmptyLines = lines.filter(line => line.trim() !== '');
  console.log(`📊 Non-empty lines: ${nonEmptyLines.length}`);
  
  // Header is first line
  const header = nonEmptyLines[0];
  console.log(`\n📋 Header: ${header}`);
  
  // Data rows (excluding header)
  const dataRows = nonEmptyLines.slice(1);
  console.log(`\n🚗 Data rows (vehicles): ${dataRows.length}`);
  
  // Check for any parsing issues
  let validRows = 0;
  let invalidRows = 0;
  
  dataRows.forEach((row, index) => {
    const columns = row.split(',');
    if (columns.length >= 5) {
      validRows++;
    } else {
      invalidRows++;
      if (invalidRows <= 5) {
        console.log(`\n⚠️ Row ${index + 2} has issues: ${row.substring(0, 100)}...`);
      }
    }
  });
  
  console.log(`\n✅ Valid vehicle rows: ${validRows}`);
  console.log(`❌ Invalid rows: ${invalidRows}`);
  
  // Show first few IDs
  console.log(`\n📋 First 5 vehicle IDs:`);
  dataRows.slice(0, 5).forEach((row, index) => {
    const columns = row.split(',');
    console.log(`   ${index + 1}. ID: ${columns[0] || 'N/A'}`);
  });
  
  // Show last few IDs
  console.log(`\n📋 Last 5 vehicle IDs:`);
  dataRows.slice(-5).forEach((row, index) => {
    const columns = row.split(',');
    console.log(`   ${dataRows.length - 4 + index}. ID: ${columns[0] || 'N/A'}`);
  });
  
  // Check ID range
  const firstId = parseInt(dataRows[0].split(',')[0]);
  const lastId = parseInt(dataRows[dataRows.length - 1].split(',')[0]);
  console.log(`\n🔢 ID Range: ${firstId} to ${lastId}`);
  console.log(`📊 Expected count if sequential: ${lastId - firstId + 1}`);
}
