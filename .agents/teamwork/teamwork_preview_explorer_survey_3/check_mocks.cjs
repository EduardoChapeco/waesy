const fs = require('fs');
const path = require('path');

const routesDir = path.resolve('src/routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.tsx') || (f.endsWith('.ts') && !f.includes('.test.')));

const mockRoutes = [];
const unsplashRoutes = [];

for (const f of files) {
  const filePath = path.join(routesDir, f);
  const content = fs.readFileSync(filePath, 'utf-8');

  if (/\bmock\b/i.test(content) || /\bmocks\b/i.test(content)) {
    mockRoutes.push(f);
  }

  if (content.includes('unsplash.com')) {
    unsplashRoutes.push(f);
  }
}

console.log('Routes with literal "mock" or "mocks":', mockRoutes.length);
console.log(JSON.stringify(mockRoutes.slice(0, 30), null, 2));

console.log('\nRoutes with unsplash.com:', unsplashRoutes.length);
console.log(JSON.stringify(unsplashRoutes, null, 2));
