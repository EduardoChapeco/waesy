const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        results = results.concat(walk(fullPath));
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(fullPath);
    }
  });
  return results;
}

const allSrc = walk('src');
console.log('Total TypeScript files in src:', allSrc.length);

const mockFindings = [];
allSrc.forEach(f => {
  if (f.includes('.test.') || f.includes('__tests__') || f.includes('.spec.')) return;
  const content = fs.readFileSync(f, 'utf8');
  const relPath = f.replace(/\\/g, '/');
  
  // Look for mock markers
  const mockRegexes = [
    /\b(mock[A-Z]\w*|mockData|MOCK_\w+|sampleData|SAMPLE_\w+|dummyData)\b/g,
    /const\s+[A-Za-z0-9_]+\s*=\s*\[\s*\{\s*id:\s*['"][^'"]+['"],\s*name:\s*['"]/g,
    /const\s+DEFAULT_[A-Z_]+\s*=\s*\[\s*\{/g,
    /\bMOCK\b/g
  ];

  let matches = [];
  mockRegexes.forEach(r => {
    let m;
    while ((m = r.exec(content)) !== null) {
      matches.push(m[0]);
    }
  });

  if (matches.length > 0) {
    mockFindings.push({ file: relPath, matches: Array.from(new Set(matches)) });
  }
});

console.log('Files with mock patterns in src (excluding tests):', mockFindings.length);
mockFindings.forEach(m => console.log(m.file, '-->', m.matches.slice(0, 5).join(', ')));

fs.writeFileSync(
  path.resolve('.agents/teamwork/explorer_survey_1/mock_findings.json'),
  JSON.stringify(mockFindings, null, 2),
  'utf8'
);
