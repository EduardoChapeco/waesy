/**
 * Supabase clients Commerce
 *
 * SERVER CLIENT (server-side only):
 * Uses service_role key — NEVER import this in browser/component code.
 * Only safe inside createServerFn() handlers or API routes.
 *
 * BROWSER CLIENT:
 * Uses anon key — safe for Auth flows in the browser.
 * Does NOT bypass RLS; all data access still goes through server functions.
 *
 * CONFIGURATION:
 * Requires VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (public, browser-safe).
 * Server functions additionally require SUPABASE_SERVICE_ROLE_KEY (secret, server-only).
 * Missing config → explicit `unconfigured` state, never a silent fallback.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createBrowserClient, serializeCookieHeader } from "@supabase/ssr";
import { z } from "zod";
import { getEnvVar } from "./env";
import {
  AUTH_COOKIE_CHUNK_NAMES,
  getLegacyCookieDomainsToPurge,
  parseRawCookieStringPreservingDuplicates,
  resolveCanonicalAuthCookies,
  resolveOrphanAuthCookiesToExpire,
} from "./auth-cookie-sanitizer";

// ---------------------------------------------------------------------------
// Environment validation schemas
// ---------------------------------------------------------------------------

const BrowserEnvSchema = z.object({
 VITE_SUPABASE_URL: z.string().url("VITE_SUPABASE_URL must be a valid URL"),
 VITE_SUPABASE_ANON_KEY: z.string().min(10, "VITE_SUPABASE_ANON_KEY is required"),
});

const ServerEnvSchema = BrowserEnvSchema.extend({
 SUPABASE_SERVICE_ROLE_KEY: z
 .string()
 .min(10, "SUPABASE_SERVICE_ROLE_KEY is required for server operations"),
});

// ---------------------------------------------------------------------------
// Typed unconfigured error
// ---------------------------------------------------------------------------

import { getEvent } from "vinxi/http";

export class SupabaseUnconfiguredError extends Error {
 readonly code = "supabase_unconfigured" as const;
 constructor(reason: string) {
 let debugInfo = "";
 try {
 const gEnv = (globalThis as any).__env__;
 debugInfo += ` [__env__: ${gEnv ? Object.keys(gEnv).join(",") : "null"}]`;
 debugInfo += ` [process.env keys: ${typeof process !== "undefined" && process.env ? Object.keys(process.env).length : 0}]`;

 // Additional debugging
 debugInfo += ` [globalThis keys: ${Object.keys(globalThis)
 .filter((k) => k.includes("env") || k.includes("__"))
 .join(",")}]`;
 try {
 const event = getEvent();
 debugInfo += ` [event ctx keys: ${event?.context ? Object.keys(event.context).join(",") : "none"}]`;
 if (event?.context?.cloudflare) {
 debugInfo += ` [cf keys: ${Object.keys(event.context.cloudflare).join(",")}]`;
 debugInfo += ` [cf.env keys: ${event.context.cloudflare.env ? Object.keys(event.context.cloudflare.env).join(",") : "none"}]`;
 }
 } catch (e2) {
 debugInfo += ` [getEvent Error: ${e2}]`;
 }
 } catch (e) {
 debugInfo += ` [Error reading env debug: ${e}]`;
 }
 super(`Supabase not configured: ${reason}${debugInfo}`);
 this.name = "SupabaseUnconfiguredError";
 }
}

// ---------------------------------------------------------------------------
// Browser client (Auth only — data access must go through server functions)
// ---------------------------------------------------------------------------

let _browserClient: SupabaseClient | null = null;

/**
 * Higieniza proativamente document.cookie no navegador:
 * 1. Resolve o conjunto canônico vencedor (mais recente e íntegro) entre duplicatas.
 * 2. Expira variantes com Domain=.waesy.com.br / .usewaesy.com e chunks órfãos (.0..4).
 * 3. Regrava o conjunto vencedor exclusivamente como cookie host-only (path=/).
 */
export function sanitizeBrowserAuthCookies(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  try {
    const rawCookie = document.cookie || "";
    if (!rawCookie) return;

    const rawEntries = parseRawCookieStringPreservingDuplicates(rawCookie);
    const hasAuthEntries = rawEntries.some(
      (c) =>
        c.name === "waesy-auth-token" ||
        c.name.startsWith("waesy-auth-token.") ||
        (c.name.startsWith("sb-") && c.name.includes("-auth-token")),
    );
    if (!hasAuthEntries) return;

    const canonical = resolveCanonicalAuthCookies(rawEntries);
    const winningAuthCookies = canonical.filter(
      (c) => c.name === "waesy-auth-token" || /^waesy-auth-token\.\d+$/.test(c.name),
    );

    // TRAVA DE SEGURANÇA ABSOLUTA: Se nenhum cookie vencedor pôde ser determinado com certeza,
    // NUNCA expire cookies! Retorne imediatamente para não aniquilar a sessão ativa do usuário.
    if (winningAuthCookies.length === 0) return;

    const winningNames = new Set(winningAuthCookies.map((c) => c.name));
    const currentAuthCookieMap = new Map<string, string>();
    for (const entry of rawEntries) {
      if (
        entry.name === "waesy-auth-token" ||
        entry.name.startsWith("waesy-auth-token.") ||
        (entry.name.startsWith("sb-") && entry.name.includes("-auth-token"))
      ) {
        currentAuthCookieMap.set(entry.name, entry.value);
      }
    }

    const hostname = window.location.hostname.toLowerCase();
    const isSecure = window.location.protocol === "https:";
    const legacyDomains = getLegacyCookieDomainsToPurge(hostname);

    // 1. Expira variantes com atributo Domain explícito se houver duplicatas legadas detectadas
    const hasDuplicates = rawEntries.some(
      (e) =>
        AUTH_COOKIE_CHUNK_NAMES.includes(e.name as any) &&
        rawEntries.filter((x) => x.name === e.name).length > 1,
    );
    if (hasDuplicates) {
      for (const domain of legacyDomains) {
        for (const name of AUTH_COOKIE_CHUNK_NAMES) {
          document.cookie = serializeCookieHeader(name, "", {
            path: "/",
            maxAge: 0,
            domain,
            sameSite: "lax",
            secure: isSecure,
          });
        }
      }
    }

    // 2. Expira no escopo host-only APENAS chunks órfãos que comprovadamente existem no browser
    // e NÃO pertencem à sessão vencedora (sem churn desnecessário).
    for (const name of AUTH_COOKIE_CHUNK_NAMES) {
      if (!winningNames.has(name) && currentAuthCookieMap.has(name)) {
        document.cookie = serializeCookieHeader(name, "", {
          path: "/",
          maxAge: 0,
          sameSite: "lax",
          secure: isSecure,
        });
      }
    }

    // 3. Regrava os cookies vencedores no escopo host-only APENAS se o valor diferir ou se houve limpeza
    for (const win of winningAuthCookies) {
      if (hasDuplicates || currentAuthCookieMap.get(win.name) !== win.value) {
        document.cookie = serializeCookieHeader(win.name, win.value, {
          path: "/",
          maxAge: 60 * 60 * 24 * 365,
          sameSite: "lax",
          secure: isSecure,
        });
      }
    }
  } catch {
    // Ignora falhas de acesso ao document.cookie em contextos restritos
  }
}

export function getBrowserClient(): SupabaseClient {
  if (_browserClient) return _browserClient;

  const env = BrowserEnvSchema.safeParse({
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  });

  if (!env.success) {
    throw new SupabaseUnconfiguredError(env.error.issues.map((i) => i.message).join("; "));
  }

  if (typeof window !== "undefined") {
    sanitizeBrowserAuthCookies();
  }

  _browserClient = createBrowserClient(
    env.data.VITE_SUPABASE_URL,
    env.data.VITE_SUPABASE_ANON_KEY,
    {
      auth: {
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: "waesy-auth-token",
      },
      cookieOptions: {
        name: "waesy-auth-token",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
        secure:
          typeof window !== "undefined" &&
          window.location.protocol === "https:",
        path: "/",
      },
      cookies: {
        getAll() {
          if (typeof document === "undefined") return [];
          const rawEntries = parseRawCookieStringPreservingDuplicates(document.cookie || "");
          return resolveCanonicalAuthCookies(rawEntries);
        },
        setAll(cookiesToSet) {
          if (typeof document === "undefined" || typeof window === "undefined") return;
          const isSecure = window.location.protocol === "https:";
          const legacyDomains = getLegacyCookieDomainsToPurge(window.location.hostname);
          const rawEntries = parseRawCookieStringPreservingDuplicates(document.cookie || "");

          cookiesToSet.forEach(({ name, value, options }) => {
            const isDeleting = !value || options?.maxAge === 0;

            // Expira variantes legadas com Domain explícito
            for (const domain of legacyDomains) {
              document.cookie = serializeCookieHeader(name, "", {
                path: "/",
                maxAge: 0,
                domain,
                sameSite: "lax",
                secure: isSecure,
              });
            }

            const cleanOptions = { ...options };
            delete cleanOptions.domain;

            document.cookie = serializeCookieHeader(name, isDeleting ? "" : value, {
              ...cleanOptions,
              maxAge: isDeleting ? 0 : (options?.maxAge ?? 60 * 60 * 24 * 365),
              sameSite: options?.sameSite === "none" ? "none" : "lax",
              secure: isSecure,
              path: "/",
            });
          });

          const orphanNames = resolveOrphanAuthCookiesToExpire(rawEntries, cookiesToSet);
          for (const orphanName of orphanNames) {
            for (const domain of legacyDomains) {
              document.cookie = serializeCookieHeader(orphanName, "", {
                path: "/",
                maxAge: 0,
                domain,
                sameSite: "lax",
                secure: isSecure,
              });
            }
            document.cookie = serializeCookieHeader(orphanName, "", {
              path: "/",
              maxAge: 0,
              sameSite: "lax",
              secure: isSecure,
            });
          }
        },
      },
    }
  );

  return _browserClient;
}


// ---------------------------------------------------------------------------
// Server client (service_role — server-side only)
// ---------------------------------------------------------------------------

/**
 * Returns the server-side Supabase client with service_role privileges.
 * MUST only be called inside createServerFn() or server-only modules.
 * Throws SupabaseUnconfiguredError if env vars are missing.
 *
 * NOTE: Not cached at module level — Cloudflare Workers reuse module instances
 * across requests. Since globalThis.__env__ is updated per-request by Nitro,
 * we must re-resolve env vars on every call.
 */
export const getServerSupabase = getServerClient;

export function getServerClient(): SupabaseClient {
 const env = ServerEnvSchema.safeParse({
 VITE_SUPABASE_URL: getEnvVar("VITE_SUPABASE_URL"),
 VITE_SUPABASE_ANON_KEY: getEnvVar("VITE_SUPABASE_ANON_KEY"),
 SUPABASE_SERVICE_ROLE_KEY: getEnvVar("SUPABASE_SERVICE_ROLE_KEY"),
 });

 if (!env.success) {
 throw new SupabaseUnconfiguredError(env.error.issues.map((i) => i.message).join("; "));
 }

 return createClient(
 env.data.VITE_SUPABASE_URL,
 env.data.SUPABASE_SERVICE_ROLE_KEY, // service_role — bypasses RLS (server only)
 {
 auth: {
 persistSession: false,
 autoRefreshToken: false,
 },
 },
 );
}

// ---------------------------------------------------------------------------
// Anon Server client (anon key — server-side only, respects RLS)
// ---------------------------------------------------------------------------

/**
 * Returns the server-side Supabase client with anon privileges.
 * Respects RLS and uses the public anon key.
 *
 * NOTE: Not cached at module level — see getServerClient() for reasoning.
 */
export function getAnonServerClient(): SupabaseClient {
 const env = BrowserEnvSchema.safeParse({
 VITE_SUPABASE_URL: getEnvVar("VITE_SUPABASE_URL"),
 VITE_SUPABASE_ANON_KEY: getEnvVar("VITE_SUPABASE_ANON_KEY"),
 });

 if (!env.success) {
 throw new SupabaseUnconfiguredError(env.error.issues.map((i) => i.message).join("; "));
 }

 return createClient(env.data.VITE_SUPABASE_URL, env.data.VITE_SUPABASE_ANON_KEY, {
 auth: {
 persistSession: false,
 autoRefreshToken: false,
 },
 });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Checks if Supabase is configured without throwing.
 * Use to render UnconfiguredState gracefully in server functions.
 */
export function isSupabaseConfigured(): boolean {
 try {
 getServerClient();
 return true;
 } catch (e) {
 if (e instanceof SupabaseUnconfiguredError) return false;
 // Re-throw unexpected errors (network, etc.)
 throw e;
 }
}

/**
 * Universal lazy proxy for convenience imports: import { supabase } from "@/lib/supabase".
 */
export const supabase: SupabaseClient = new Proxy({} as any, {
 get(_target, prop) {
 const client = typeof window !== "undefined" ? getBrowserClient() : getServerClient();
 const val = (client as any)[prop];
 return typeof val === "function" ? val.bind(client) : val;
 },
});
