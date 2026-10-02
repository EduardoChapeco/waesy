import fs from "fs";
import path from "path";

const file = path.join(process.cwd(), "dist/_worker.js/index.js");
if (!fs.existsSync(file)) {
  console.error(`File not found: ${file}`);
  process.exit(1);
}

let content = fs.readFileSync(file, "utf-8");

let secrets = {};
const secretsPath = path.join(process.cwd(), ".env.secrets");
if (fs.existsSync(secretsPath)) {
  const lines = fs.readFileSync(secretsPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const k = match[1].trim();
      let v = match[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      secrets[k] = v;
    }
  }
}

const fallbackEnv = {
  VITE_SUPABASE_URL: secrets.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://jfuebqmltksyznovhlwa.supabase.co",
  SUPABASE_URL: secrets.SUPABASE_URL || process.env.SUPABASE_URL || "https://jfuebqmltksyznovhlwa.supabase.co",
  VITE_SUPABASE_ANON_KEY: secrets.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "",
  SUPABASE_ANON_KEY: secrets.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "",
  SUPABASE_SERVICE_ROLE_KEY: secrets.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  VITE_SITE_URL: secrets.VITE_SITE_URL || process.env.VITE_SITE_URL || "https://usewaesy.pages.dev",
};

const injection = `async fetch(cfReq, env, context) {
		const mergedEnv = Object.assign({}, ${JSON.stringify(fallbackEnv)}, env || {});
		if (typeof globalThis.process === "undefined") {
			globalThis.process = { env: mergedEnv };
		} else {
			globalThis.process.env = Object.assign({}, globalThis.process.env || {}, mergedEnv);
		}
		globalThis.__env__ = mergedEnv;
`;

if (content.includes("async fetch(cfReq, env, context) {")) {
  content = content.replace(/async fetch\(cfReq, env, context\) \{[\s\S]*?globalThis\.__env__ = mergedEnv;\n/, injection);
  if (!content.includes("globalThis.__env__ = mergedEnv;")) {
    content = content.replace("async fetch(cfReq, env, context) {", injection);
  }
  fs.writeFileSync(file, content);
  console.log("Successfully injected packaged Supabase environment into Cloudflare worker.");
} else {
  console.warn("Could not find fetch entrypoint in worker.");
}

// 1.5 Empacotar e minificar em arquivo único _worker.js com esbuild
try {
  const { buildSync } = await import("esbuild");
  console.log("Compiling and minifying single-file Cloudflare Pages _worker.js with esbuild...");
  const bundledFile = path.join(process.cwd(), "dist/_worker.bundle.js");
  buildSync({
    entryPoints: [file],
    outfile: bundledFile,
    bundle: true,
    minify: true,
    treeShaking: true,
    legalComments: "none",
    target: "es2022",
    format: "esm",
    external: ["node:*", "cloudflare:*"],
  });

  // Injetar variáveis de ambiente do Supabase no topo do worker bundle
  const envHeader = `const __fallbackEnv__ = ${JSON.stringify(fallbackEnv)};
if (typeof globalThis.process === "undefined") {
  globalThis.process = { env: Object.assign({}, __fallbackEnv__) };
} else {
  globalThis.process.env = Object.assign({}, __fallbackEnv__, globalThis.process.env || {});
}
globalThis.__env__ = Object.assign({}, __fallbackEnv__, globalThis.__env__ || {});
`;
  const bundledCode = fs.readFileSync(bundledFile, "utf-8");
  fs.writeFileSync(bundledFile, envHeader + bundledCode);

  const workerDir = path.join(process.cwd(), "dist/_worker.js");
  fs.rmSync(workerDir, { recursive: true, force: true });
  fs.renameSync(bundledFile, workerDir);
  console.log("Successfully created ultra-optimized single-file dist/_worker.js with Supabase env for Cloudflare Pages.");
} catch (esbuildErr) {
  console.warn("Notice during esbuild worker bundling:", esbuildErr.message);
}

// 2. Ensure Cloudflare Pages _routes.json uses wildcard exclude for /assets/* to prevent stylesheet interception
const routesJsonPath = path.join(process.cwd(), "dist/_routes.json");
const cleanRoutesJson = {
  version: 1,
  include: ["/*"],
  exclude: [
    "/assets/*",
    "/favicon.ico",
    "/manifest.json",
    "/robots.txt",
    "/sw.js",
    "/icons/*"
  ]
};
fs.writeFileSync(routesJsonPath, JSON.stringify(cleanRoutesJson, null, 2));
console.log("Successfully generated optimized dist/_routes.json for Cloudflare Pages.");

// 3. Remove .wrangler build cache to avoid stale wrangler.json references
const wranglerDeployDir = path.join(process.cwd(), ".wrangler");
if (fs.existsSync(wranglerDeployDir)) {
  fs.rmSync(wranglerDeployDir, { recursive: true, force: true });
}


