import fs from "fs";
import path from "path";

const dir = "src/routes";
const allFiles = fs.readdirSync(dir);
const travelFiles = allFiles
  .filter(
    (f) =>
      f.includes("turismo") ||
      f.includes("viag") ||
      f.includes("viajante") ||
      f.includes("empresa.viagens")
  )
  .map((f) => path.join(dir, f));

const findings = [];

for (const file of travelFiles) {
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split("\n");

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;

    // Check bracket classes
    const bracketMatches = line.match(/\b[a-zA-Z0-9_-]+-\[[^\]]+\]/g);
    if (bracketMatches) {
      findings.push({ file, line: lineNum, type: "ARBITRARY_BRACKET", snippet: line.trim(), matches: bracketMatches });
    }

    // Check hex colors
    const cleanLine = line.replace(/https?:\/\/[^\s]+/g, "");
    const realHex = cleanLine.match(/#[0-9a-fA-F]{3,8}\b/g);
    if (realHex) {
      findings.push({ file, line: lineNum, type: "HEX_COLOR", snippet: line.trim(), matches: realHex });
    }

    // Check sub-44px button
    if (line.includes("<Button") && (line.match(/\b(h-7|h-8|h-9|h-10)\b/) || line.match(/size="sm"/))) {
      findings.push({ file, line: lineNum, type: "SUB_44PX_BUTTON", snippet: line.trim() });
    }
  });
}

console.log(`Found ${findings.length} total design-lint/quality findings across travel routes.`);
for (const f of findings) {
  console.log(`[${f.type}] ${f.file}:${f.line} -> ${f.matches ? f.matches.join(", ") : f.snippet}`);
}
