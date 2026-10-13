#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const trackedFiles = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);

const secretPatterns = [
  { name: "private-key", regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/ },
  { name: "aws-access-key", regex: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "github-token", regex: /\b(?:ghp|gho|ghs|ghr)_[A-Za-z0-9]{20,}\b|\bgithub_pat_[A-Za-z0-9_]{20,}\b/ },
  { name: "slack-token", regex: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/ },
  { name: "google-api-key", regex: /\bAIza[0-9A-Za-z_-]{30,}\b/ },
  { name: "openai-style-key", regex: /\bsk-(?:live|test)-[A-Za-z0-9_-]{24,}\b/ },
  { name: "service-role-assignment", regex: /\bSUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"'$<{\n]{20,}["']/ },
];

const allowlisted = [
  { file: "src/services/ai-core-gateway.test.ts", text: "sample-secret-do-not-leak", reason: "fixture intentionally asserts redaction" },
];

function isAllowed(file, line) {
  return allowlisted.some((entry) => file === entry.file && line.includes(entry.text));
}

const findings = [];
for (const relativeFile of trackedFiles) {
  const absoluteFile = path.join(root, relativeFile);
  let content;
  try {
    content = fs.readFileSync(absoluteFile, "utf8");
  } catch {
    continue;
  }

  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const pattern of secretPatterns) {
      if (pattern.regex.test(line) && !isAllowed(relativeFile, line)) {
        findings.push({ file: relativeFile, line: index + 1, pattern: pattern.name });
      }
    }
  });
}

console.log(JSON.stringify({
  scannedFiles: trackedFiles.length,
  findings,
  allowlist: allowlisted,
}, null, 2));

if (findings.length > 0) {
  console.error(`SECRET_SCAN_FAIL: ${findings.length} high-confidence finding(s)`);
  process.exit(1);
}

console.log(`SECRET_SCAN_PASS: ${trackedFiles.length} tracked files scanned; no unallowlisted high-confidence secrets`);
