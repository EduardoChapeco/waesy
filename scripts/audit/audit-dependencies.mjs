#!/usr/bin/env node
import { execSync } from "node:child_process";

// SSOT Allowlist for upstream vendor advisories without non-breaking patch available
const ALLOWLIST = [
  {
    id: "GHSA-mrhx-c7xc-m3w5",
    package: "zod",
    reason: "Upstream memory exhaustion on oversized constrained collections; fix requires major breaking semver upgrade to v4 (v4.6.7). Mitigated via BFF max payload size limits and request throttling.",
  },
];

console.log("[audit:dependencies] Executing production dependency audit (npm audit --omit=dev)...");

let stdout = "";
try {
  stdout = execSync("npm audit --omit=dev --json", {
    encoding: "utf8",
    shell: true,
    maxBuffer: 10 * 1024 * 1024,
  });
} catch (error) {
  stdout = error.stdout || "";
}

let report;
try {
  report = JSON.parse(stdout);
} catch (err) {
  console.error("[audit:dependencies] Failed to parse npm audit output:", err.message);
  process.exit(1);
}

const vulnerabilities = report.vulnerabilities || {};
const blockingSeverities = new Set(["high", "critical"]);
const blockingFindings = [];
const allowlistedFindings = [];

for (const [pkgName, vulnData] of Object.entries(vulnerabilities)) {
  const viaList = Array.isArray(vulnData.via) ? vulnData.via : [];
  
  for (const via of viaList) {
    if (typeof via === "object" && via !== null) {
      const severity = via.severity || vulnData.severity;
      const url = via.url || "";
      const title = via.title || "";
      
      const matchedAllowlist = ALLOWLIST.find(
        (entry) =>
          url.includes(entry.id) ||
          pkgName === entry.package && (url.includes(entry.id) || title.includes("Zod can exhaust memory"))
      );

      if (matchedAllowlist) {
        allowlistedFindings.push({
          package: pkgName,
          severity,
          title,
          url,
          reason: matchedAllowlist.reason,
        });
      } else if (blockingSeverities.has(severity)) {
        blockingFindings.push({
          package: pkgName,
          severity,
          title,
          url,
        });
      }
    }
  }
}

if (allowlistedFindings.length > 0) {
  console.log(`[audit:dependencies] NOTICE: ${allowlistedFindings.length} allowlisted upstream advisory(ies) bypassed:`);
  for (const item of allowlistedFindings) {
    console.log(`  - [${item.severity.toUpperCase()}] ${item.package}: ${item.title}`);
    console.log(`    URL: ${item.url}`);
    console.log(`    Justification: ${item.reason}`);
  }
}

if (blockingFindings.length > 0) {
  console.error(`\n[audit:dependencies] FAILED: ${blockingFindings.length} unapproved high/critical vulnerability(ies) detected:`);
  for (const item of blockingFindings) {
    console.error(`  - [${item.severity.toUpperCase()}] ${item.package}: ${item.title} (${item.url})`);
  }
  process.exit(1);
}

console.log("[audit:dependencies] PASSED: Zero unapproved high/critical vulnerabilities found in production dependencies.");
process.exit(0);
