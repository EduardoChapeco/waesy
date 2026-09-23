import fs from 'fs';
const path = 'src/routes/workspace.noticias.index.tsx';
let content = fs.readFileSync(path, 'utf-8');
const isCRLF = content.includes('\r\n');
const lines = content.split(isCRLF ? '\r\n' : '\n');

// Find the line with "  ))}" around line 530
const mapEndIdx = lines.findIndex((l, i) => i > 500 && l.trim() === '))}' && lines[i+1]?.trim() === '</div>');

if (mapEndIdx !== -1) {
  console.log('Found map end at index:', mapEndIdx);
  // After lines[mapEndIdx + 1] which is "</div>", insert another "</div>"
  lines.splice(mapEndIdx + 2, 0, '              </div>');
  const newContent = lines.join(isCRLF ? '\r\n' : '\n');
  fs.writeFileSync(path, newContent, 'utf-8');
  console.log('Successfully inserted extra </div> tag!');
} else {
  console.log('Could not find mapEndIdx');
}
