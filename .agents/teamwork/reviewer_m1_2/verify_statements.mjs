import fs from "node:fs";
import path from "node:path";

const sql = fs.readFileSync("supabase/migrations/20270105000000_master_360_telemetry_and_governance.sql", "utf-8");

console.log("Analyzing statement structure of migration...");

// Let's split into statements taking into account $$ dollar quoting and comments
const statements = [];
let currentStmt = "";
let inDollarQuote = false;
let inString = false;
let inLineComment = false;
let inBlockComment = false;

for (let i = 0; i < sql.length; i++) {
  const c = sql[i];
  const next = sql[i + 1];

  if (!inString && !inDollarQuote && !inBlockComment && c === "-" && next === "-") {
    inLineComment = true;
    i++;
    continue;
  }
  if (inLineComment) {
    if (c === "\n") {
      inLineComment = false;
    }
    continue;
  }

  if (!inString && !inDollarQuote && !inLineComment && c === "/" && next === "*") {
    inBlockComment = true;
    i++;
    continue;
  }
  if (inBlockComment) {
    if (c === "*" && next === "/") {
      inBlockComment = false;
      i++;
    }
    continue;
  }

  if (c === "'" && !inDollarQuote) {
    if (inString && next === "'") {
      currentStmt += "''";
      i++;
      continue;
    }
    inString = !inString;
    currentStmt += c;
    continue;
  }

  if (c === "$" && next === "$" && !inString) {
    inDollarQuote = !inDollarQuote;
    currentStmt += "$$";
    i++;
    continue;
  }

  if (c === ";" && !inString && !inDollarQuote) {
    if (currentStmt.trim()) {
      statements.push(currentStmt.trim());
    }
    currentStmt = "";
    continue;
  }

  currentStmt += c;
}

if (currentStmt.trim()) {
  statements.push(currentStmt.trim());
}

console.log(`Total executable statements extracted: ${statements.length}`);

// Validate each statement starts with recognized DDL/DCL command
const validStarts = [
  "CREATE TABLE",
  "COMMENT ON",
  "CREATE INDEX",
  "CREATE OR REPLACE FUNCTION",
  "DROP TRIGGER",
  "CREATE TRIGGER",
  "ALTER TABLE",
  "DROP POLICY",
  "CREATE POLICY"
];

let invalid = 0;
statements.forEach((stmt, idx) => {
  const upper = stmt.toUpperCase();
  const startsValid = validStarts.some(prefix => upper.startsWith(prefix));
  if (!startsValid) {
    console.error(`Statement #${idx + 1} does not start with recognized command:`, stmt.substring(0, 50));
    invalid++;
  }
});

if (invalid === 0) {
  console.log("All statements cleanly recognized as valid Postgres DDL/DCL commands!");
} else {
  process.exit(1);
}

// Summary of statement types
const counts = {};
statements.forEach(stmt => {
  const firstTwoWords = stmt.split(/\s+/).slice(0, 2).join(" ").toUpperCase();
  counts[firstTwoWords] = (counts[firstTwoWords] || 0) + 1;
});

console.log("\nStatement counts by type:");
console.table(counts);
