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

const targetSupabaseUrl = secrets.VITE_SUPABASE_URL || secrets.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://wlxapubsesiwtxzbuygt.supabase.co";
const targetAnonKey = secrets.VITE_SUPABASE_ANON_KEY || secrets.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
const targetServiceRoleKey = secrets.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const targetVaultMasterKey = secrets.VAULT_MASTER_KEY || process.env.VAULT_MASTER_KEY || targetServiceRoleKey;
const targetSiteUrl = secrets.VITE_SITE_URL || process.env.VITE_SITE_URL || "https://waesy.com.br";
const targetEvolutionUrl = secrets.EVOLUTION_API_URL || process.env.EVOLUTION_API_URL || "";
const targetEvolutionKey = secrets.EVOLUTION_API_KEY || process.env.EVOLUTION_API_KEY || "";
const targetWorkerToken = secrets.WHATSAPP_WORKER_TOKEN || process.env.WHATSAPP_WORKER_TOKEN || "";
const targetOffloadUrl = secrets.SUPABASE_OFFLOAD_URL || process.env.SUPABASE_OFFLOAD_URL || "";
const targetOffloadAnonKey = "";
const targetOffloadServiceKey = secrets.SUPABASE_OFFLOAD_SERVICE_ROLE_KEY || process.env.SUPABASE_OFFLOAD_SERVICE_ROLE_KEY || "";
const targetArchiveUrl = secrets.SUPABASE_ARCHIVE_URL || process.env.SUPABASE_ARCHIVE_URL || "";
const targetArchiveServiceKey = secrets.SUPABASE_ARCHIVE_SERVICE_ROLE_KEY || process.env.SUPABASE_ARCHIVE_SERVICE_ROLE_KEY || "";
const targetRouteMining = secrets.SUPABASE_ROUTE_MINING || process.env.SUPABASE_ROUTE_MINING || "0";
const targetTopologyMode = secrets.SUPABASE_TOPOLOGY_MODE || process.env.SUPABASE_TOPOLOGY_MODE || (targetOffloadServiceKey || targetArchiveServiceKey ? "auto" : "single");

const fallbackEnv = {
  VITE_SUPABASE_URL: targetSupabaseUrl,
  SUPABASE_URL: targetSupabaseUrl,
  VITE_SUPABASE_ANON_KEY: targetAnonKey,
  SUPABASE_ANON_KEY: targetAnonKey,
  VITE_SUPABASE_PUBLISHABLE_KEY: secrets.VITE_SUPABASE_PUBLISHABLE_KEY || targetAnonKey,
  SUPABASE_SERVICE_ROLE_KEY: targetServiceRoleKey,
  SUPABASE_PROJECT_REF: secrets.SUPABASE_PROJECT_REF || secrets.SUPABASE_PRIMARY_REF || "wlxapubsesiwtxzbuygt",
  SUPABASE_OFFLOAD_URL: targetOffloadUrl,
  SUPABASE_OFFLOAD_SERVICE_ROLE_KEY: targetOffloadServiceKey,
  SUPABASE_ARCHIVE_URL: targetArchiveUrl,
  SUPABASE_ARCHIVE_SERVICE_ROLE_KEY: targetArchiveServiceKey,
  SUPABASE_ROUTE_MINING: targetRouteMining,
  SUPABASE_TOPOLOGY_MODE: targetTopologyMode,
  VAULT_MASTER_KEY: targetVaultMasterKey,
  VITE_SITE_URL: targetSiteUrl,
  EVOLUTION_API_URL: targetEvolutionUrl,
  EVOLUTION_API_KEY: targetEvolutionKey,
  WHATSAPP_WORKER_TOKEN: targetWorkerToken,
  VITE_APP_URL: targetSiteUrl,
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
  const bundleResult = buildSync({
    entryPoints: [file],
    outfile: bundledFile,
    bundle: true,
    minify: true,
    treeShaking: true,
    charset: "utf8",
    legalComments: "none",
    drop: ["console", "debugger"],
    target: "es2022",
    format: "esm",
    external: ["node:*", "cloudflare:*"],
    metafile: Boolean(process.env.WORKER_METAFILE),
  });
  if (process.env.WORKER_METAFILE && bundleResult.metafile) {
    fs.writeFileSync(process.env.WORKER_METAFILE, JSON.stringify(bundleResult.metafile));
  }

  // Injetar variáveis de ambiente do Supabase no topo do worker bundle
  const envHeader = `const __fallbackEnv__ = ${JSON.stringify(fallbackEnv)};
if (typeof globalThis.process === "undefined") {
  globalThis.process = { env: Object.assign({}, __fallbackEnv__) };
} else {
  globalThis.process.env = Object.assign({}, __fallbackEnv__, globalThis.process.env || {});
}
globalThis.__env__ = Object.assign({}, __fallbackEnv__, globalThis.__env__ || {});
`;
  const rawBundledCode = fs.readFileSync(bundledFile, "utf-8");

  // 1.5b Prune unused Phosphor icon weight maps ("duotone", "light", "thin") from SSR bundle
  function stripUnusedPhosphorWeights(src) {
    const marker = 'new Map([["bold",';
    let out = "";
    let pos = 0;
    while (true) {
      const idx = src.indexOf(marker, pos);
      if (idx === -1) {
        out += src.slice(pos);
        break;
      }
      out += src.slice(pos, idx);
      let i = idx + "new Map([".length;
      const entries = [];
      while (i < src.length && src[i] !== "]") {
        if (src[i] === ",") i++;
        if (src[i] !== "[") break;
        const entryStart = i;
        let depth = 0;
        let inStr = false;
        let quote = "";
        for (; i < src.length; i++) {
          const ch = src[i];
          if (inStr) {
            if (ch === "\\") i++;
            else if (ch === quote) inStr = false;
          } else {
            if (ch === '"' || ch === "'" || ch === "`") {
              inStr = true;
              quote = ch;
            } else if (ch === "[" || ch === "(" || ch === "{") {
              depth++;
            } else if (ch === "]" || ch === ")" || ch === "}") {
              depth--;
              if (depth === 0) {
                i++;
                break;
              }
            }
          }
        }
        entries.push(src.slice(entryStart, i));
      }
      if (src.slice(i, i + 2) === "])") {
        const kept = entries.filter(
          (e) => e.startsWith('["bold",') || e.startsWith('["fill",') || e.startsWith('["regular",')
        );
        if (kept.length === 3 && entries.length === 6) {
          out += `new Map([${kept.join(",")}])`;
          pos = i + 2;
          continue;
        }
      }
      out += marker;
      pos = idx + marker.length;
    }
    return out;
  }

  const bundledCode = stripUnusedPhosphorWeights(rawBundledCode);
  fs.writeFileSync(bundledFile, envHeader + bundledCode);

  const workerDir = path.join(process.cwd(), "dist/_worker.js");
  if (fs.existsSync(workerDir)) {
    fs.rmSync(workerDir, { recursive: true, force: true });
  }
  fs.mkdirSync(workerDir, { recursive: true });
  const workerIndexFile = path.join(workerDir, "index.js");
  fs.writeFileSync(workerIndexFile, envHeader + bundledCode, "utf-8");
  if (fs.existsSync(bundledFile)) {
    fs.unlinkSync(bundledFile);
  }
  console.log("Successfully created ultra-optimized dist/_worker.js/index.js with Supabase env for Cloudflare Pages.");

  // 1.6 Garante paridade de CSS referenciado pelo Worker SSR em dist/assets/
  const workerFinalCode = fs.readFileSync(workerIndexFile, "utf-8");
  const distAssetsDir = path.join(process.cwd(), "dist/assets");
  const nitroSsrAssetsDir = path.join(process.cwd(), "node_modules/.nitro/vite/services/ssr/assets");
  if (fs.existsSync(distAssetsDir)) {
    const cssRefs = new Set([...workerFinalCode.matchAll(/\/assets\/(styles-[a-zA-Z0-9_-]+\.css)/g)].map((m) => m[1]));
    for (const cssFile of cssRefs) {
      const targetCss = path.join(distAssetsDir, cssFile);
      if (!fs.existsSync(targetCss)) {
        const nitroCss = path.join(nitroSsrAssetsDir, cssFile);
        if (fs.existsSync(nitroCss)) {
          fs.copyFileSync(nitroCss, targetCss);
          console.log(`Copied missing SSR CSS asset into dist/assets/: ${cssFile}`);
        } else {
          const fallbackCss = fs.readdirSync(distAssetsDir).find((f) => f.startsWith("styles-") && f.endsWith(".css"));
          if (fallbackCss) {
            fs.copyFileSync(path.join(distAssetsDir, fallbackCss), targetCss);
            console.log(`Aliased dist/assets/${fallbackCss} -> ${cssFile}`);
          }
        }
      }
    }
  }
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
    "/favicon.svg",
    "/manifest.json",
    "/robots.txt",
    "/sw.js",
    "/icons/*",
    "/apple-touch-icon.png",
    "/brand-favicon.png",
    "/brand-logo.png",
    "/offline.html",
    "/llms.txt",
    "/llms-full.txt"
  ]
};
fs.writeFileSync(routesJsonPath, JSON.stringify(cleanRoutesJson, null, 2));
console.log("Successfully generated optimized dist/_routes.json for Cloudflare Pages.");

// 3. Remove .wrangler build cache to avoid stale wrangler.json references
const wranglerDeployDir = path.join(process.cwd(), ".wrangler");
if (fs.existsSync(wranglerDeployDir)) {
  fs.rmSync(wranglerDeployDir, { recursive: true, force: true });
}


