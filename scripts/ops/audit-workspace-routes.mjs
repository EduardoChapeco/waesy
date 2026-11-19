import fs from "fs";
import path from "path";

const routesDir = "src/routes";
const files = fs.readdirSync(routesDir).filter((f) => f.startsWith("workspace.") && (f.endsWith(".tsx") || f.endsWith(".ts")));

console.log(`Auditing ${files.length} workspace route files...`);

const issues = [];

for (const f of files) {
  const filePath = path.join(routesDir, f);
  const content = fs.readFileSync(filePath, "utf8");

  // Check 1: Links to /conta/* (civil leaking into workspace)
  const contaMatches = content.matchAll(/(?:to|href)=["'](\/conta[^"']*)["']/g);
  for (const cm of contaMatches) {
    issues.push({ file: f, type: "CIVIL_LINK_LEAK", detail: cm[1] });
  }

  // Check 2: Redirects to /conta/*
  const redirectMatches = content.matchAll(/redirect\(\s*\{\s*to:\s*["'](\/conta[^"']*)["']/g);
  for (const rm of redirectMatches) {
    issues.push({ file: f, type: "CIVIL_REDIRECT_LEAK", detail: rm[1] });
  }

  // Check 3: References to /workspace/lojas
  const lojasMatches = content.matchAll(/["']\/workspace\/lojas[^"']*["']/g);
  for (const lm of lojasMatches) {
    if (f !== "workspace.lojas.index.tsx") {
      issues.push({ file: f, type: "LOJAS_SWITCHER_LEAK", detail: lm[0] });
    }
  }

  // Check 4: Checks for "Minha Empresa" hardcoded fallback
  if (content.includes('"Minha Empresa"')) {
    issues.push({ file: f, type: "HARDCODED_MINHA_EMPRESA", detail: '"Minha Empresa"' });
  }

  // Check 5: Look for loaders that require specific roles or throw
  if (content.includes("requireRole") || content.includes("requireStaff")) {
    issues.push({ file: f, type: "STAFF_ROLE_GUARD_IN_ROUTE", detail: "Uses requireRole/requireStaff directly" });
  }
}

console.log(`\nTotal issues flagged: ${issues.length}\n`);
for (const iss of issues) {
  console.log(`[${iss.type}] ${iss.file} -> ${iss.detail}`);
}
