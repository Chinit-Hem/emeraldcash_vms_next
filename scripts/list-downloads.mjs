import fs from 'fs';
import path from 'path';

const downloadsPath = 'C:/Users/Chinit Hem/Downloads';

console.log('Listing all files in Downloads folder...\n');

try {
  const files = fs.readdirSync(downloadsPath);
  
  console.log(`Total files/folders: ${files.length}\n`);
  
  // Look for CSV files
  const csvFiles = files.filter(f => f.toLowerCase().endsWith('.csv'));
  console.log(`CSV files found: ${csvFiles.length}`);
  csvFiles.forEach((file, i) => {
    const stats = fs.statSync(path.join(downloadsPath, file));
    console.log(`  ${i + 1}. ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
  });
  
  // Look for files with "vehicle" in name
  console.log(`\nFiles with "vehicle" in name:`);
  const vehicleFiles = files.filter(f => f.toLowerCase().includes('vehicle'));
  vehicleFiles.forEach((file, i) => {
    console.log(`  ${i + 1}. ${file}`);
  });
  
  // Look for files with "cleaned" in name
  console.log(`\nFiles with "cleaned" in name:`);
  const cleanedFiles = files.filter(f => f.toLowerCase().includes('cleaned'));
  cleanedFiles.forEach((file, i) => {
    console.log(`  ${i + 1}. ${file}`);
  });
  
  // Look for files with numbers in parentheses
  console.log(`\nFiles with version numbers (e.g., "(1)", "(2)"):`);
  const versionedFiles = files.filter(f => f.match(/\(\d+\)/));
  versionedFiles.forEach((file, i) => {
    console.log(`  ${i + 1}. ${file}`);
  });
  
} catch (error) {
  console.error('Error reading directory:', error.message);
}
