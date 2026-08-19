const fs = require('fs');
const path = require('path');

const migrationsDir = 'C:\\Users\\91750\\.gemini\\antigravity\\scratch\\fahad-erp\\supabase\\migrations';
const files = fs.readdirSync(migrationsDir);

for (const file of files) {
  if (file.endsWith('.sql')) {
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    if (content.toLowerCase().includes('email') || content.toLowerCase().includes('user') || content.toLowerCase().includes('profile')) {
      console.log('Match in file:', file);
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (/email|profile|password/i.test(line)) {
          console.log(`  Line ${idx+1}: ${line.trim()}`);
        }
      });
    }
  }
}
