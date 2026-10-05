const fs = require('fs');
const path = require('path');

const srcDir = path.resolve('src');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(full));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(full);
    }
  });
  return results;
}

const files = walk(srcDir);
const dl19Violations = [];
const emojiFiles = new Map();

const headerRegex = /<h[12][^>]*>([^<]{20,})<\/h[12]>/gi;
const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;

for (const f of files) {
  const content = fs.readFileSync(f, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    // DL-19
    let hm;
    headerRegex.lastIndex = 0;
    while ((hm = headerRegex.exec(line)) !== null) {
      const text = hm[1].trim();
      const words = text.split(/\s+/).filter(Boolean);
      if (words.length > 6) {
        dl19Violations.push({ file: path.relative(process.cwd(), f), line: idx + 1, text, wordCount: words.length });
      }
    }

    // DL-23
    let em;
    emojiRegex.lastIndex = 0;
    while ((em = emojiRegex.exec(line)) !== null) {
      const count = emojiFiles.get(path.relative(process.cwd(), f)) || 0;
      emojiFiles.set(path.relative(process.cwd(), f), count + 1);
    }
  });
}

console.log('=== DL-19 (Composite Titles > 6 words) ===');
console.log(JSON.stringify(dl19Violations, null, 2));

console.log('\n=== DL-23 (Emoji count per file) ===');
console.log('Total files with emojis:', emojiFiles.size);
const topEmojiFiles = [...emojiFiles.entries()].sort((a,b) => b[1] - a[1]).slice(0, 15);
console.log(JSON.stringify(topEmojiFiles, null, 2));
