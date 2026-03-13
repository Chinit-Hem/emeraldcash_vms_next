import fs from 'fs';
import path from 'path';

const downloadsPath = 'C:/Users/Chinit Hem/Downloads';

console.log('Searching for all CSV files in Downloads...\n');

const files = fs.readdirSync(downloadsPath);

const csvFiles = files.filter(f => f.toLowerCase().endsWith('.csv'));

console.log(`Found ${csvFiles.length} CSV file(s):\n`);

csvFiles.forEach((file, index) => {
  const filePath = path.join(downloadsPath, file);
  const stats = fs.statSync(filePath);
  const sizeKB = (stats.size / 1024).toFixed(2);
  
  console.log(`${index + 1}. ${file}`);
  console.log(`   Size: ${sizeKB} KB`);
  console.log(`   Modified: ${stats.mtime.toLocaleString()}`);
  
  // Count rows
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim() !== '');
    const dataRows = lines.length > 0 ? lines.length - 1 : 0; // Subtract header
    console.log(`   Rows: ${dataRows} vehicles`);
    
    // Show first ID and last ID
    if (lines.length > 1) {
      const firstId = lines[1].split(',')[0];
      const lastLine = lines[lines.length - 1];
      const lastId = lastLine.split(',')[0];
      console.log(`   ID Range: ${firstId} to ${lastId}`);
    }
  } catch (e) {
    console.log(`   Error reading: ${e.message}`);
  }
  
  console.log('');
});

// Also check if there's a newer version with (1) or (2) etc
const numberedVersions = csvFiles.filter(f => f.match(/\(\d+\)\.csv$/));
if (numberedVersions.length > 0) {
  console.log('⚠️  Numbered versions found - these might be newer:');
  numberedVersions.forEach(f => console.log(`   - ${f}`));
}
