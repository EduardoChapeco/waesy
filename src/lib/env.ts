import { getEvent } from "vinxi/http";

// ─── Runtime-level env resolver ──────────────────────────────────────────────
// Resolves environment variables securely and reliably across all target environments:
//
// 1. Vinxi HTTP Event (requires server.experimental.asyncContext: true)
// Accesses Cloudflare Pages runtime variables securely.
//
// 2. process.env:
// Fallback for Local Dev (Node.js/Vite) & Nitro Cloudflare polyfills.
//
// 3. import.meta.env:
// Vite build-time injections (for public VITE_* variables).
// ─────────────────────────────────────────────────────────────────────────────
// Polyfill for Vinxi on Edge runtimes (Cloudflare Pages)
// Vinxi expects globalThis.app to exist to check for asyncContext.
// Without this, getEvent() throws "Cannot read properties of undefined (reading 'config')"
// ---------------------------------------------------------------------------
if (typeof globalThis !== "undefined") {
 if (!(globalThis as any).app) {
 (globalThis as any).app = {
 config: {
 server: {
 experimental: {
 asyncContext: true,
 },
 },
 },
 };
 }
}

export function getEnvVar(key: string): string | undefined {
 let debug = "";

 // 1. Resolve via Cloudflare global scope (injected by src/server.ts)
 if (typeof globalThis !== "undefined" && (globalThis as any).__env__) {
 const env = (globalThis as any).__env__;
 if (env && typeof env[key] === "string" && env[key]) {
 return env[key];
 }
 } else {
 debug += "gEnv=no;";
 }

 // 1b. Resolve via injected process.env from wrap-worker.js
 const gProcess = (globalThis as any).process;
 if (gProcess && gProcess.env && typeof gProcess.env[key] === "string" && gProcess.env[key]) {
 return gProcess.env[key];
 }

 // 2. Resolve via Vinxi/Nitro event context (if available) dev TanStack Start with asyncContext)
 try {
 const event = getEvent();
 if (event) {
 debug += "evt=yes;";
 const env =
 event.context?.cloudflare?.env || (event.node?.req as any)?.runtime?.cloudflare?.env;
 if (env) {
 debug += "cEnv=yes;";
 if (typeof env[key] === "string" && env[key]) {
 return env[key];
 } else {
 debug += "keyNotFound;";
 }
 } else {
 debug += "cEnv=no;";
 debug += `ctxKeys=${Object.keys(event.context || {}).join(",")};`;
 }
 } else {
 debug += "evt=null;";
 }
 } catch (err: unknown) {
 debug += `evtThrow=${err instanceof Error ? err.message : String(err)};`;
 }

 // 2. Fallback to process.env (Node.js runtime / local dev)
 if (typeof process !== "undefined" && process.env && process.env[key]) {
 return process.env[key];
 }

 // 3. Fallback to Vite build-time env injection (Explicitly for known public vars)
 if (key === "VITE_SUPABASE_URL") return import.meta.env.VITE_SUPABASE_URL;
 if (key === "VITE_SUPABASE_ANON_KEY") return import.meta.env.VITE_SUPABASE_ANON_KEY;

 // Fallback for dynamic public vars
 if (typeof import.meta !== "undefined" && (import.meta as any).env?.[key]) {
 return (import.meta as any).env[key];
 }

 return undefined;
}

export const env: Record<string, string | undefined> = new Proxy({} as Record<string, string | undefined>, {
  get(_target, prop: string) {
    return getEnvVar(prop);
  },
});
