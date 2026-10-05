import fs from 'fs';
import path from 'path';

function walk(dir, filelist = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    const stat = fs.statSync(filepath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        walk(filepath, filelist);
      }
    } else if ((file.endsWith('.ts') || file.endsWith('.tsx')) && !file.includes('.test.') && !file.includes('.spec.')) {
      filelist.push(filepath);
    }
  }
  return filelist;
}

const allFiles = walk('src');

const results = {
  mockNamedFiles: [],
  mockConstDeclarations: [],
  sampleOrDemoData: [],
  unsplashReferences: [],
  placeholderReferences: [],
};

for (const f of allFiles) {
  const base = path.basename(f).toLowerCase();
  if (base.includes('mock') || base.includes('dummy') || base.includes('sample') || base.includes('seed')) {
    results.mockNamedFiles.push(f);
  }

  const content = fs.readFileSync(f, 'utf8');

  // Check for MOCK_ declarations
  const mockMatches = content.match(/const\s+(MOCK_[A-Z0-9_]+|SAMPLE_[A-Z0-9_]+|DEMO_[A-Z0-9_]+)\b/g);
  if (mockMatches) {
    results.mockConstDeclarations.push({ file: f, matches: mockMatches });
  }

  // Check for unsplash
  if (content.toLowerCase().includes('unsplash')) {
    results.unsplashReferences.push(f);
  }

  // Check for placehold or placeholder image
  if (content.toLowerCase().includes('placehold.co') || content.toLowerCase().includes('via.placeholder')) {
    results.placeholderReferences.push(f);
  }
}

console.log('Results Summary:');
console.log('- Mock Named Files:', results.mockNamedFiles.length, results.mockNamedFiles);
console.log('- Unsplash Reference Files:', results.unsplashReferences.length, results.unsplashReferences);
console.log('- Placeholder Reference Files:', results.placeholderReferences.length, results.placeholderReferences);
console.log('- Mock Const Declarations:', results.mockConstDeclarations.length);
results.mockConstDeclarations.forEach(m => console.log('  *', m.file, m.matches));
