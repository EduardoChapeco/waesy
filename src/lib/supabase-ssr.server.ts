/**
 * Supabase SSR Client Commerce
 *
 * This client is strictly for server-side auth and user session management.
 * It uses the @supabase/ssr package to manage Auth cookies via vinxi/http.
 *
 * It uses the ANON KEY, not the service role key, because it represents
 * the current user visiting the store.
 */

import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import { getRequestHeader, setCookie } from "@tanstack/start-server-core";
import { z } from "zod";
import { SupabaseUnconfiguredError } from "./supabase";
import { getEnvVar } from "./env";

const EnvSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(10),
});

export function getSSRClient() {
  const env = EnvSchema.safeParse({
    VITE_SUPABASE_URL: getEnvVar("VITE_SUPABASE_URL"),
    VITE_SUPABASE_ANON_KEY: getEnvVar("VITE_SUPABASE_ANON_KEY"),
  });

  if (!env.success) {
    throw new SupabaseUnconfiguredError("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
  }

  return createServerClient(env.data.VITE_SUPABASE_URL, env.data.VITE_SUPABASE_ANON_KEY, {
    cookieOptions: {
      name: "waesy-auth-token",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    },
    cookies: {
      getAll() {
        try {
          const cookieHeader = getRequestHeader("cookie");
          if (!cookieHeader) return [];
          const rawParsed = parseCookieHeader(cookieHeader).map((c) => ({
            name: c.name,
            value: c.value ?? "",
          }));

          let parsed = rawParsed;
          const hasWaesyTokens = rawParsed.some(
            (c) =>
              (c.name === "waesy-auth-token" || c.name.startsWith("waesy-auth-token.")) &&
              Boolean(c.value?.trim())
          );
          if (!hasWaesyTokens) {
            const legacyPattern = new RegExp(["^sb-", "[^-]+", "-auth-token"].join(""));
            parsed = rawParsed.map((c) =>
              c.name.startsWith("sb-") && c.name.includes("-auth-token")
                ? { ...c, name: c.name.replace(legacyPattern, "waesy-auth-token") }
                : c,
            );
          }

          // Anti-Collision & Deduplicação de Chunks (DEC-443):
          // Se existem cookies chunked (.0, .1), remove cookie unchunked obsoleto
          const hasChunks = parsed.some(
            (c) => c.name.startsWith("waesy-auth-token.") && Boolean(c.value?.trim())
          );

          const deduplicatedMap = new Map<string, string>();
          for (const c of parsed) {
            if (hasChunks && c.name === "waesy-auth-token") {
              continue;
            }
            const existing = deduplicatedMap.get(c.name);
            if (!existing) {
              deduplicatedMap.set(c.name, c.value);
            } else if ((c.value?.length || 0) > (existing?.length || 0)) {
              deduplicatedMap.set(c.name, c.value);
            }
          }

          return Array.from(deduplicatedMap.entries()).map(([name, value]) => ({
            name,
            value,
          }));
        } catch {
          return [];
        }
      },
      setAll(cookiesToSet) {
        try {
          let host = "";
          try {
            host = (getRequestHeader("host") || "").toLowerCase();
          } catch {
            host = "";
          }

          let cookieDomain: string | undefined = undefined;
          if (host.includes("waesy.com.br")) {
            cookieDomain = ".waesy.com.br";
          } else if (host.includes("usewaesy.com")) {
            cookieDomain = ".usewaesy.com";
          }

          cookiesToSet.forEach(({ name, value, options }) => {
            const isDeleting = !value || options?.maxAge === 0;

            // Se estiver deletando ou expirando, limpa explicitamente em ambos os escopos
            if (isDeleting && cookieDomain) {
              try {
                setCookie(name, "", {
                  ...options,
                  maxAge: 0,
                  path: "/",
                  domain: cookieDomain,
                });
              } catch {}
            }

            setCookie(name, value, {
              ...options,
              sameSite: options?.sameSite === "none" ? "none" : "lax",
              secure: process.env.NODE_ENV === "production",
              path: "/",
              ...(cookieDomain ? { domain: cookieDomain } : {}),
            });
          });
        } catch {
          // Silently ignore cookie setting outside request context
        }
      },
    },
  });
}
