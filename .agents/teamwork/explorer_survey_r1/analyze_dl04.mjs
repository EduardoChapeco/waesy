import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of list) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (!['node_modules', 'dist', '.git', 'legacy_quarantine'].includes(item.name)) {
        results = results.concat(walk(full));
      }
    } else if (['.tsx', '.ts', '.css'].some(ext => item.name.endsWith(ext))) {
      results.push(full);
    }
  }
  return results;
}

const files = walk('src');
const importantRegex = /!important|(?:^|[\s"'`])!(?:[a-zA-Z0-9_-]+)/g;

let jsNotCount = 0;
let genuineImportant = 0;

for (const file of files) {
  const isCss = file.endsWith('.css');
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line) => {
    let m;
    importantRegex.lastIndex = 0;
    while ((m = importantRegex.exec(line)) !== null) {
      if (isCss || m[0].includes('!important')) {
        genuineImportant++;
      } else if (line.includes('className') && line.includes('!')) {
        genuineImportant++;
      } else {
        jsNotCount++;
      }
    }
  });
}

console.log(JSON.stringify({ jsNotCount, genuineImportant }, null, 2));
