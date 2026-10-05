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
    } else if (['.tsx', '.jsx'].some(ext => item.name.endsWith(ext))) {
      results.push(full);
    }
  }
  return results;
}

function findDl15Violations(content, filePath) {
  const violations = [];
  const len = content.length;
  let pos = 0;
  let line = 1;
  let col = 1;

  while (pos < len) {
    const ch = content[pos];

    if (ch === '\n') {
      line++;
      col = 1;
      pos++;
      continue;
    }

    // Skip single-line comments
    if (ch === '/' && content[pos + 1] === '/') {
      while (pos < len && content[pos] !== '\n') pos++;
      continue;
    }

    // Skip multi-line comments
    if (ch === '/' && content[pos + 1] === '*') {
      pos += 2;
      while (pos < len && !(content[pos] === '*' && content[pos + 1] === '/')) {
        if (content[pos] === '\n') { line++; col = 1; }
        pos++;
      }
      pos += 2;
      continue;
    }

    // Detect JSX opening tag: `<` followed by tag name
    if (ch === '<' && /[a-zA-Z]/.test(content[pos + 1])) {
      const tagStartLine = line;
      const tagStartCol = col;
      pos++; col++;

      let tagName = '';
      while (pos < len && /[a-zA-Z0-9_.-]/.test(content[pos])) {
        tagName += content[pos];
        pos++; col++;
      }

      // Collect rest of the opening tag until `>` with braceDepth === 0
      let tagContent = '';
      let braceDepth = 0;
      let inQuote = null;
      let tagEnd = false;

      while (pos < len) {
        const c = content[pos];
        tagContent += c;

        if (c === '\n') {
          line++;
          col = 1;
          pos++;
          continue;
        }

        if (inQuote) {
          if (c === inQuote && content[pos - 1] !== '\\') {
            inQuote = null;
          }
        } else {
          if (c === '"' || c === "'" || c === '`') {
            inQuote = c;
          } else if (c === '{') {
            braceDepth++;
          } else if (c === '}') {
            if (braceDepth > 0) braceDepth--;
          } else if (c === '>' && braceDepth === 0) {
            tagEnd = true;
            pos++; col++;
            break;
          }
        }

        pos++; col++;
      }

      // Check if tag is interactive
      const isButtonTag = tagName.toLowerCase() === 'button';
      const isDesignSystemButton = tagName === 'Button' || tagName.endsWith('Button');
      const hasOnClick = /\bonClick\s*=/.test(tagContent);
      const hasFocusVisible = tagContent.includes('focus-visible:');

      if ((isButtonTag || hasOnClick) && !isDesignSystemButton && !hasFocusVisible) {
        violations.push({
          file: filePath,
          line: tagStartLine,
          col: tagStartCol,
          tagName,
          hasOnClick,
          isButtonTag
        });
      }

      continue;
    }

    pos++;
    col++;
  }

  return violations;
}

const files = walk('src');
let totalViolations = 0;
const byFile = {};

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const v = findDl15Violations(content, file);
  if (v.length > 0) {
    totalViolations += v.length;
    byFile[file] = v.length;
  }
}

console.log('Total DL-15 violations found with JSX block parser:', totalViolations);
console.log('Files with violations:', Object.keys(byFile).length);
console.log('Top files:', Object.entries(byFile).sort((a,b) => b[1] - a[1]).slice(0, 10));
