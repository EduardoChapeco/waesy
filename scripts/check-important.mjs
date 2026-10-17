import fs from "node:fs";
import path from "node:path";

function walk(dir) {
  const results = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      if (f !== "node_modules" && f !== ".git" && f !== "dist") {
        results.push(...walk(p));
      }
    } else if (/\.(tsx|ts|jsx|js|css)$/.test(f)) {
      const content = fs.readFileSync(p, "utf8");
      const lines = content.split("\n");
      lines.forEach((l, i) => {
        // Look specifically for !important or Tailwind class modifier ! inside quotes or class strings
        // e.g. "!h-", "!w-", "!max-", "!p-", "!m-", "!bg-", "!text-", "!inset-", "!rounded-", "!size-"
        const match = l.match(/(!important|(?<=["'`\s:])!(max-|h-|w-|min-|p-|m-|bg-|text-|inset-|rounded-|size-|border|opacity|flex|grid|block|hidden|relative|absolute|fixed|z-)[a-zA-Z0-9_\-\[\]]+)/);
        if (match) {
          results.push({ file: p, line: i + 1, match: match[0], content: l.trim() });
        }
      });
    }
  }
  return results;
}

const hits = walk("src");
console.log(`Found ${hits.length} actual DL-04 class violations:`);
hits.forEach((h) => console.log(`${h.file}:${h.line} [${h.match}]: ${h.content}`));
