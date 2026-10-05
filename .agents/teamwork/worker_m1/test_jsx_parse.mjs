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

export function parseJsxTags(content) {
  const tags = [];
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

    if (ch === '/' && content[pos + 1] === '/') {
      while (pos < len && content[pos] !== '\n') pos++;
      continue;
    }

    if (ch === '/' && content[pos + 1] === '*') {
      pos += 2;
      while (pos < len && !(content[pos] === '*' && content[pos + 1] === '/')) {
        if (content[pos] === '\n') { line++; col = 1; }
        pos++;
      }
      pos += 2;
      continue;
    }

    // Match JSX opening tag `<TagName`
    if (ch === '<' && /[a-zA-Z]/.test(content[pos + 1])) {
      const tagStartLine = line;
      const tagStartCol = col;
      pos++; col++;

      let tagName = '';
      while (pos < len && /[a-zA-Z0-9_.-]/.test(content[pos])) {
        tagName += content[pos];
        pos++; col++;
      }

      let tagContent = '';
      let braceDepth = 0;
      let inQuote = null;

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
            pos++; col++;
            break;
          }
        }

        pos++; col++;
      }

      tags.push({
        tagName,
        tagContent,
        line: tagStartLine,
        col: tagStartCol
      });
      continue;
    }

    pos++;
    col++;
  }

  return tags;
}

const files = walk('src');
let violationsCount = 0;
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const tags = parseJsxTags(content);
  for (const tag of tags) {
    const isNativeButton = tag.tagName.toLowerCase() === 'button';
    const isDsButton = tag.tagName === 'Button' || tag.tagName.endsWith('Button');
    const hasOnClick = /\bonClick\s*=/.test(tag.tagContent);
    const hasFocusVisible = tag.tagContent.includes('focus-visible:');

    if ((isNativeButton || hasOnClick) && !isDsButton && !hasFocusVisible) {
      violationsCount++;
    }
  }
}

console.log('Total DL-15 with parseJsxTags across src:', violationsCount);
