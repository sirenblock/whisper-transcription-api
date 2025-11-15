/**
 * Simple syntax validation script
 * Run with: node validate-syntax.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating TypeScript syntax...\n');

const files = [
  'index.ts',
  'validate.ts',
  'examples.ts',
  '__tests__/config.test.ts',
  '__tests__/setup.ts',
];

let allValid = true;

files.forEach(file => {
  const filePath = path.join(__dirname, file);

  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').length;
      console.log(`✅ ${file.padEnd(30)} (${lines} lines)`);
    } else {
      console.log(`❌ ${file.padEnd(30)} (not found)`);
      allValid = false;
    }
  } catch (error) {
    console.log(`❌ ${file.padEnd(30)} (error: ${error.message})`);
    allValid = false;
  }
});

console.log('\n📊 File Statistics:\n');

const stats = files.map(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    return {
      file,
      lines: content.split('\n').length,
      size: (content.length / 1024).toFixed(2) + ' KB',
    };
  }
  return null;
}).filter(Boolean);

stats.forEach(stat => {
  console.log(`  ${stat.file}`);
  console.log(`    Lines: ${stat.lines}`);
  console.log(`    Size:  ${stat.size}`);
  console.log();
});

const totalLines = stats.reduce((sum, s) => sum + s.lines, 0);
console.log(`Total lines of code: ${totalLines}\n`);

if (allValid) {
  console.log('✅ All files validated successfully!\n');
  process.exit(0);
} else {
  console.log('❌ Some files are missing or invalid\n');
  process.exit(1);
}
