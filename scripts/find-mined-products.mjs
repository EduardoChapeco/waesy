import fs from 'fs';
const files = ['src/services/mining.functions.ts', 'src/lib/mining/continuous-crawler.engine.ts', 'src/lib/mining/scraper-utils.ts'];
files.forEach(f => {
  if (fs.existsSync(f)) {
    const content = fs.readFileSync(f, 'utf-8');
    const lines = content.split('\n');
    lines.forEach((l, i) => {
      if (l.includes('mined_products')) {
        console.log(`${f}:${i+1}: ${l.trim()}`);
      }
    });
  }
});
