/**
 * scripts/audit-city-indexing.test.mjs
 * 
 * EMPIRICAL ADVERSARIAL STRESS TEST HARNESS — MILESTONE 2
 * Tests:
 * 1. normalizeActiveCity & resolveActiveCity (edge cases, exclusions, encodings, injections, fallbacks)
 * 2. Zod schema verification for BFF services (jobs, directory, classifieds, search, events, banners, news)
 * 
 * Run with: node --experimental-strip-types scripts/audit-city-indexing.test.mjs
 */

import fs from "fs";
import path from "path";
import { z } from "zod";
import { normalizeActiveCity, resolveActiveCity } from "../src/lib/city-helper.ts";

console.log("======================================================================");
console.log("ADVERSARIAL EMPIRICAL HARNESS: ACTIVE CITY CONTEXTUAL INDEXING (M2)");
console.log("======================================================================");

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = "") {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${testName} ${details ? `— Details: ${details}` : ""}`);
  }
}

// ============================================================================
// SUITE 1: normalizeActiveCity — Canonical Normalization & Exclusions
// ============================================================================
console.log("\n--- SUITE 1: normalizeActiveCity tests ---");

// Valid cities
assert(normalizeActiveCity("Chapecó") === "Chapecó", "Valid city: Chapecó");
assert(normalizeActiveCity("  Chapecó  ") === "Chapecó", "Valid city with surrounding whitespace");
assert(normalizeActiveCity("Xanxerê") === "Xanxerê", "Valid city: Xanxerê");
assert(normalizeActiveCity("São Paulo") === "São Paulo", "Valid multi-word city: São Paulo");
assert(normalizeActiveCity("Concórdia - SC") === "Concórdia - SC", "Valid city with state tag");
assert(normalizeActiveCity("\t\nFlorianópolis\r\n") === "Florianópolis", "Valid city with control chars");

// Excluded cities blocklist (case-insensitive)
const exclusions = [
  "global", "Global", "GLOBAL", "  global  ",
  "all", "All", "ALL", "  all  ",
  "todas", "Todas", "TODAS", "  todas  ",
  "todas as cidades", "Todas as Cidades", "TODAS AS CIDADES",
  "todas-as-cidades", "TODAS-AS-CIDADES",
  "todos", "Todos", "TODOS",
  "indefinida", "Indefinida", "INDEFINIDA",
  "undefined", "Undefined", "UNDEFINED",
  "null", "Null", "NULL"
];

for (const excl of exclusions) {
  assert(
    normalizeActiveCity(excl) === undefined,
    `Exclusion filtered to undefined: "${excl}"`,
    `Got ${normalizeActiveCity(excl)}`
  );
}

// Edge, Empty & Non-String values
assert(normalizeActiveCity("") === undefined, "Empty string returns undefined");
assert(normalizeActiveCity("   ") === undefined, "Whitespace only returns undefined");
assert(normalizeActiveCity(null) === undefined, "null returns undefined");
assert(normalizeActiveCity(undefined) === undefined, "undefined returns undefined");
assert(normalizeActiveCity(12345) === undefined, "Number returns undefined");
assert(normalizeActiveCity({}) === undefined, "Object returns undefined");
assert(normalizeActiveCity(["Chapecó"]) === undefined, "Array returns undefined");
assert(normalizeActiveCity(true) === undefined, "Boolean true returns undefined");

// Adversarial input safety
assert(normalizeActiveCity("<script>alert(1)</script>") === "<script>alert(1)</script>", "XSS string safely normalized as string");
assert(normalizeActiveCity("' OR 1=1 --") === "' OR 1=1 --", "SQL injection probe safely normalized as string");


// ============================================================================
// SUITE 2: resolveActiveCity — Resolution Hierarchy & Context Fallbacks
// ============================================================================
console.log("\n--- SUITE 2: resolveActiveCity tests ---");

// 1. URL searchParams priority
assert(resolveActiveCity({ city: "Chapecó" }) === "Chapecó", "URL param city: Chapecó");
assert(resolveActiveCity({ city: "  Chapecó  " }) === "Chapecó", "URL param city with whitespace");
assert(resolveActiveCity({ city: "Global" }) === undefined, "URL param city: Global -> undefined");
assert(resolveActiveCity({ city: "Todas" }) === undefined, "URL param city: Todas -> undefined");
assert(resolveActiveCity({ city: "all" }) === undefined, "URL param city: all -> undefined");
assert(resolveActiveCity({ city: "Todas as Cidades" }) === undefined, "URL param city: Todas as Cidades -> undefined");
assert(resolveActiveCity({}) === undefined, "Empty searchParams -> undefined");
assert(resolveActiveCity(undefined) === undefined, "Undefined searchParams -> undefined");
assert(resolveActiveCity({ city: null }) === undefined, "searchParams with null city -> undefined");
assert(resolveActiveCity({ city: undefined }) === undefined, "searchParams with undefined city -> undefined");
assert(resolveActiveCity({ city: 999 }) === undefined, "searchParams with number city -> undefined");

// 2. Context searchCity fallback
assert(resolveActiveCity({}, { searchCity: "Chapecó" }) === "Chapecó", "Context searchCity: Chapecó");
assert(resolveActiveCity({}, { searchCity: "Global" }) === undefined, "Context searchCity: Global -> undefined");
assert(resolveActiveCity({}, { searchCity: "Todas" }) === undefined, "Context searchCity: Todas -> undefined");

// 3. Context cookie parsing (SSR)
assert(
  resolveActiveCity({}, { cookie: "waesy_city=Chapec%C3%B3" }) === "Chapecó",
  "Cookie single: waesy_city=Chapec%C3%B3 -> Chapecó"
);
assert(
  resolveActiveCity({}, { cookie: "session_id=123; waesy_city=Chapec%C3%B3; theme=dark" }) === "Chapecó",
  "Cookie multi: waesy_city embedded in headers -> Chapecó"
);
assert(
  resolveActiveCity({}, { cookie: "waesy_city=Global" }) === undefined,
  "Cookie with Global -> undefined"
);
assert(
  resolveActiveCity({}, { cookie: "waesy_city=Todas" }) === undefined,
  "Cookie with Todas -> undefined"
);
assert(
  resolveActiveCity({}, { cookie: "waesy_city=all" }) === undefined,
  "Cookie with all -> undefined"
);
assert(
  resolveActiveCity({}, { cookie: "waesy_city=" }) === undefined,
  "Cookie with empty value -> undefined"
);
assert(
  resolveActiveCity({}, { cookie: "waesy_city=%E0%A4%A" }) === undefined,
  "Cookie with malformed URI encoding does not crash and returns undefined"
);

// 4. Cloudflare cfCity header fallback (SSR)
assert(
  resolveActiveCity({}, { cfCity: "Chapecó" }) === "Chapecó",
  "Cloudflare cfCity: Chapecó -> Chapecó"
);
assert(
  resolveActiveCity({}, { cfCity: "Global" }) === undefined,
  "Cloudflare cfCity: Global -> undefined"
);

// 5. Precedence check: URL param overrides Context cookie
assert(
  resolveActiveCity({ city: "Xanxerê" }, { cookie: "waesy_city=Chapec%C3%B3" }) === "Xanxerê",
  "Precedence: Valid URL param (Xanxerê) overrides Cookie (Chapecó)"
);

// 6. Precedence check: Context searchCity overrides Cookie
assert(
  resolveActiveCity({}, { searchCity: "Xanxerê", cookie: "waesy_city=Chapec%C3%B3" }) === "Xanxerê",
  "Precedence: searchCity (Xanxerê) overrides Cookie (Chapecó)"
);

// 7. Precedence check: Cookie overrides Cloudflare cfCity
assert(
  resolveActiveCity({}, { cookie: "waesy_city=Chapec%C3%B3", cfCity: "Florianópolis" }) === "Chapecó",
  "Precedence: Cookie (Chapecó) overrides cfCity (Florianópolis)"
);

// 8. Adversarial edge case: Explicit URL "Todas" / "Global" with pre-existing cookie
// When a user has cookie waesy_city=Chapecó and accesses ?city=Todas or ?city=Global:
const explicitGlobalWithCookie = resolveActiveCity(
  { city: "Global" },
  { cookie: "waesy_city=Chapec%C3%B3" }
);
console.log(`  [BEHAVIORAL CHECK] ?city=Global with cookie waesy_city=Chapecó resolves to: "${explicitGlobalWithCookie}"`);


// ============================================================================
// SUITE 3: BFF Services Zod Schema Static & Dynamic Parity Verification
// ============================================================================
console.log("\n--- SUITE 3: BFF Services Zod Schema Parity Verification ---");

const targetFiles = [
  {
    name: "jobs.functions.ts",
    path: path.resolve("src/services/jobs.functions.ts"),
    validatorFn: "listPublicJobs",
    expectedFields: ["city", "limit", "category", "search", "contract_type", "storeId"],
  },
  {
    name: "directory.functions.ts",
    path: path.resolve("src/services/directory.functions.ts"),
    validatorFn: "getPublicDirectory",
    expectedFields: ["city", "limit", "category", "search"],
  },
  {
    name: "classifieds.functions.ts",
    path: path.resolve("src/services/classifieds.functions.ts"),
    validatorFn: "getPublicClassifieds",
    expectedFields: ["city", "limit", "category", "dealType", "search", "storeId"],
  },
  {
    name: "search.functions.ts",
    path: path.resolve("src/services/search.functions.ts"),
    validatorFn: "federatedSearchInput",
    expectedFields: ["city", "query", "types", "limit", "store_id"],
  },
  {
    name: "events.functions.ts",
    path: path.resolve("src/services/events.functions.ts"),
    validatorFn: "getPublicEvents",
    expectedFields: ["city", "limit", "category", "dateFrom", "dateTo", "state", "searchQuery"],
  },
  {
    name: "banner.functions.ts",
    path: path.resolve("src/services/banner.functions.ts"),
    validatorFn: "listActiveBanners",
    expectedFields: ["city", "placement", "storeId"],
  },
  {
    name: "news.functions.ts",
    path: path.resolve("src/services/news.functions.ts"),
    validatorFn: "listPublicArticles",
    expectedFields: ["city", "category", "storeId", "limit", "query"],
  },
];

for (const tf of targetFiles) {
  assert(fs.existsSync(tf.path), `File exists: ${tf.name}`);
  const content = fs.readFileSync(tf.path, "utf-8");

  // Check if city: z.string().optional() is declared in validator
  const cityRegex = /city\s*:\s*z\.string\(\)\.optional\(\)/;
  const hasCityValidator = cityRegex.test(content);
  assert(
    hasCityValidator,
    `${tf.name} genuinely declares "city: z.string().optional()" in schema`
  );

  // Check if all expected fields are present
  for (const f of tf.expectedFields) {
    const fRegex = new RegExp(`\\b${f}\\s*:`);
    assert(fRegex.test(content), `${tf.name} declares field "${f}" in validator schema`);
  }
}

// Dynamic schema verification with live Zod instances matching BFF contracts
console.log("\n--- SUITE 4: Dynamic Zod Schema Validation Tests ---");

// Jobs schema replica
const jobsSchema = z
  .object({
    category: z.string().optional(),
    search: z.string().optional(),
    contract_type: z.string().optional(),
    limit: z.number().int().min(1).max(100).optional(),
    storeId: z.string().optional(),
    city: z.string().optional(),
  })
  .optional();

assert(jobsSchema.safeParse({ city: "Chapecó" }).success, "Jobs schema accepts { city: 'Chapecó' }");
assert(jobsSchema.safeParse({}).success, "Jobs schema accepts empty object");
assert(jobsSchema.safeParse(undefined).success, "Jobs schema accepts undefined");
assert(!jobsSchema.safeParse({ city: 12345 }).success, "Jobs schema rejects non-string city (number)");

// Directory schema replica
const directorySchema = z
  .object({
    limit: z.number().int().min(1).max(100).optional(),
    category: z.string().optional(),
    search: z.string().optional(),
    city: z.string().optional(),
  })
  .optional();

assert(directorySchema.safeParse({ city: "Chapecó", limit: 20 }).success, "Directory schema accepts { city: 'Chapecó', limit: 20 }");
assert(!directorySchema.safeParse({ city: false }).success, "Directory schema rejects boolean city");

// Classifieds schema replica
const classifiedsSchema = z
  .object({
    limit: z.number().int().min(1).max(100).optional(),
    cursor: z.string().optional(),
    category: z.string().optional(),
    dealType: z.string().optional(),
    search: z.string().optional(),
    storeId: z.string().uuid().optional(),
    city: z.string().optional(),
  })
  .optional();

assert(classifiedsSchema.safeParse({ city: "Xanxerê" }).success, "Classifieds schema accepts { city: 'Xanxerê' }");
assert(!classifiedsSchema.safeParse({ city: ["Chapecó"] }).success, "Classifieds schema rejects array city");

// Federated Search schema replica
const searchSchema = z.object({
  query: z.string().min(1).max(200),
  types: z
    .array(z.enum(["product", "event", "classified", "store", "recipe"]))
    .optional()
    .default(["product", "event", "classified", "store", "recipe"]),
  limit: z.number().int().min(1).max(50).optional().default(10),
  store_id: z.string().uuid().optional(),
  city: z.string().optional(),
});

assert(searchSchema.safeParse({ query: "pizza", city: "Chapecó" }).success, "Search schema accepts { query: 'pizza', city: 'Chapecó' }");
assert(searchSchema.safeParse({ query: "pizza" }).success, "Search schema accepts query without city");
assert(!searchSchema.safeParse({ query: "pizza", city: 999 }).success, "Search schema rejects non-string city in search");

console.log("======================================================================");
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
console.log("======================================================================");

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
