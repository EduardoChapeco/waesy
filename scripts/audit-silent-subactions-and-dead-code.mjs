import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const servicesDir = path.join(projectRoot, "src", "services");
const strict = process.argv.includes("--strict") || process.argv.includes("--ci");

function collectFunctionFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFunctionFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".functions.ts")) {
      results.push(full);
    }
  }
  return results;
}

const files = collectFunctionFiles(servicesDir);

console.log(`Auditing ${files.length} service function files for silent gaps, dead functions, and fake mutations...`);

const findings = [];

files.forEach(fullPath => {
  const relFile = path.relative(servicesDir, fullPath).replace(/\\/g, "/");
  const content = fs.readFileSync(fullPath, "utf8");

  // Capture both createServerFn({ method: ... }) and createServerFn() up to next export const or EOF
  const fnRegex = /export\s+const\s+([a-zA-Z0-9_]+)\s*=\s*createServerFn\(\s*(?:\{\s*method:\s*['"](GET|POST)['"]\s*\})?\s*\)([\s\S]*?)(?=(?:\r?\nexport\s+(?:const|async\s+function|function)|(?![\s\S])))/g;
  
  let match;
  while ((match = fnRegex.exec(content)) !== null) {
    const fnName = match[1];
    const method = match[2] || "GET";
    const body = match[3];

    // 1. Mutação POST sem chamada a db / getServerClient / rpc / fetch
    if (method === "POST") {
      const hasDb = body.includes("db.") || body.includes("getServerClient") || body.includes("supabase.") || body.includes("rpc(") || body.includes("fetch(");
      const isMockOrStub = !hasDb && (body.includes("return { success: true") || body.includes("return { status: 'success'") || body.includes("return true"));
      if (isMockOrStub) {
        findings.push({ file: relFile, fnName, method, issue: "POST mutation returns success without DB or RPC call" });
      }
    }

    // 2. Contains TODO / FIXME / Not implemented
    if (body.includes("Not implemented") || body.includes("not implemented") || body.includes("TODO:") || body.includes("FIXME:")) {
      findings.push({ file: relFile, fnName, method, issue: "Contains TODO or 'Not implemented'" });
    }

    // 3. Catches silently without log or rethrow in mutations
    if (method === "POST" && /catch\s*(?:\([^)]*\))?\s*\{\s*(?:return\b|\})/.test(body) && !body.includes("throw") && !body.includes("console.error") && !body.includes("console.warn")) {
      findings.push({ file: relFile, fnName, method, issue: "Silent catch swallowing errors in mutation" });
    }
  }
});

console.log(`\nFound ${findings.length} potential issues in service functions:`);
findings.forEach((it, idx) => {
  console.log(`${idx + 1}. [${it.file}] -> ${it.fnName} (${it.method}): ${it.issue}`);
});

if (strict && findings.length > 0) {
  process.exit(1);
}
