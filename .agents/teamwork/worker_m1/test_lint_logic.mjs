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

// Test DL-04 refinement
// Match !important anywhere, OR in CSS any !word, OR in JS/TS/TSX within string/className matching Tailwind utility
const tailwindPrefixRegex = /(?:^|[\s"'`])!(?:(?:[a-zA-Z0-9_-]+:)*)(?:p[xytblr]?|m[xytblr]?|bg|text|border|h|w|min-[wh]|max-[wh]|flex|grid|gap|space|rounded|shadow|opacity|z|overflow|font|leading|tracking|items|justify|content|self|place|top|bottom|left|right|inset|col|row|cursor|pointer|transition|duration|animate|rotate|scale|translate|aspect|ring|outline)-[a-zA-Z0-9_[\]/.#%-]+/g;
const tailwindKeywordRegex = /(?:^|[\s"'`])!(?:block|inline|hidden|table|static|relative|absolute|fixed|sticky)\b/g;

let dl04Matches = [];

for (const file of files) {
  const isCss = file.endsWith('.css');
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const isComment = line.trim().startsWith('//') || line.trim().startsWith('*') || line.trim().startsWith('/*');
    if (isComment) return;

    if (line.includes('!important')) {
      dl04Matches.push({ file, line: idx + 1, match: '!important', text: line.trim() });
      return;
    }

    if (isCss) {
      const cssBang = /(?:^|[\s"'`])!(?:[a-zA-Z0-9_-]+)/g;
      let m;
      while ((m = cssBang.exec(line)) !== null) {
        dl04Matches.push({ file, line: idx + 1, match: m[0], text: line.trim() });
      }
      return;
    }

    // In TS/TSX: only check if inside className or string literal
    const inStringOrClass = /className|class|cn\(|cva\(|clsx\(|["'`]/.test(line);
    if (!inStringOrClass) return;

    let m;
    tailwindPrefixRegex.lastIndex = 0;
    while ((m = tailwindPrefixRegex.exec(line)) !== null) {
      dl04Matches.push({ file, line: idx + 1, match: m[0].trim(), text: line.trim() });
    }

    tailwindKeywordRegex.lastIndex = 0;
    while ((m = tailwindKeywordRegex.exec(line)) !== null) {
      dl04Matches.push({ file, line: idx + 1, match: m[0].trim(), text: line.trim() });
    }
  });
}

console.log('Total refined DL-04 matches:', dl04Matches.length);
console.log('Sample matches:', JSON.stringify(dl04Matches.slice(0, 10), null, 2));
