const fs = require('fs');
const path = require('path');

const routesDir = path.resolve('src/routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.tsx') || (f.endsWith('.ts') && !f.includes('.test.')));

const smallFiles = [];
const suspiciousRoutes = [];

for (const f of files) {
  const filePath = path.join(routesDir, f);
  const stat = fs.statSync(filePath);
  const content = fs.readFileSync(filePath, 'utf-8');

  if (stat.size < 500) {
    smallFiles.push({ file: f, size: stat.size, content: content.trim() });
  }

  if (content.includes('TODO') || content.includes('Em breve') || content.includes('placeholder') || content.includes('mock') || content.includes('Mock')) {
    suspiciousRoutes.push({ file: f, size: stat.size });
  }
}

console.log('Small route files (<500 bytes):', smallFiles.length);
console.log(JSON.stringify(smallFiles, null, 2));

console.log('\nRoutes with placeholder/mock keywords:', suspiciousRoutes.length);
