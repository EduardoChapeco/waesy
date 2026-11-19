import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runForensicAudit } from "./forensic-repo-audit.mjs";

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${name}: ${err.message}`);
    failed++;
  }
}

function withTempRepo(files, fn) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "waesy-forensic-test-"));
  try {
    for (const [rel, content] of Object.entries(files)) {
      const full = path.join(tmpDir, rel);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, content, "utf8");
    }
    fn(tmpDir);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

runTest("detects broken re-export and missing relative module", () => {
  withTempRepo(
    {
      "package.json": JSON.stringify({ dependencies: {}, devDependencies: {} }),
      "src/components/tourism/index.ts": `export { DeletedWidget } from "./groups/deleted-widget";\n`,
    },
    (dir) => {
      const report = runForensicAudit(dir);
      assert.equal(report.brokenImports.length, 1);
      assert.equal(report.brokenImports[0].specifier, "./groups/deleted-widget");
    }
  );
});

runTest("protects dormant capability files with unique tables from deletion classification", () => {
  withTempRepo(
    {
      "package.json": JSON.stringify({ dependencies: {}, devDependencies: {} }),
      "src/routes/index.tsx": `import { activeHelper } from "@/lib/active";\nexport const Route = () => activeHelper("x");\n`,
      "src/lib/active.ts": `export function activeHelper(v: string) { return v.trim().toLowerCase(); }\n`,
      "src/services/future-hotel.functions.ts": `export async function syncHotels(db: any) { return db.from("future_hotel_rates").select("*"); }\n`,
      "src/lib/old-shim.ts": `/** @deprecated Use @/lib/active */\nexport * from "./active";\n`,
    },
    (dir) => {
      const report = runForensicAudit(dir);
      const dormant = report.unreachableFiles.find((f) => f.relPath === "src/services/future-hotel.functions.ts");
      const shim = report.unreachableFiles.find((f) => f.relPath === "src/lib/old-shim.ts");
      assert.equal(dormant?.verdict, "DORMANT_CAPABILITY_KEEP_AND_WIRE");
      assert.equal(shim?.verdict, "DEPRECATED_OR_SHIM");
    }
  );
});

runTest("detects AST clone helpers and watchlisted duplicate helpers across files", () => {
  withTempRepo(
    {
      "package.json": JSON.stringify({ dependencies: {}, devDependencies: {} }),
      "src/lib/a.ts": `export function isUuid(value: string) {\n  if (!value) return false;\n  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);\n}\n`,
      "src/services/b.ts": `export function checkGuid(input: string) {\n  if (!input) return false;\n  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input);\n}\nexport function isUuid(v: string) { return v.length === 36; }\n`,
    },
    (dir) => {
      const report = runForensicAudit(dir);
      assert.ok(report.astClones.some((c) => c.uniqueFilesCount >= 2));
      assert.ok(report.watchlistedDuplicates.some((w) => w.name === "isUuid" && w.count === 2));
    }
  );
});

runTest("detects layer boundary violation when service imports lucide-react", () => {
  withTempRepo(
    {
      "package.json": JSON.stringify({ dependencies: { "lucide-react": "^0.500.0" }, devDependencies: {} }),
      "src/services/bad.functions.ts": `import { Check } from "lucide-react";\nexport const icon = Check;\n`,
    },
    (dir) => {
      const report = runForensicAudit(dir);
      assert.ok(report.layerViolations.some((v) => v.rule === "SERVICE_IMPORTS_UI"));
    }
  );
});

console.log(`forensic-repo-audit.test.mjs summary: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
