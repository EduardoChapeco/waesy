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
          const parsed = parseCookieHeader(cookieHeader).map((c) => ({
            name: c.name,
            value: c.value ?? "",
          }));
          const hasWaesy = parsed.some((c) => c.name.startsWith("waesy-auth-token"));
          if (!hasWaesy) {
            const legacyPattern = new RegExp(["^sb-", "[^-]+", "-auth-token"].join(""));
            return parsed.map((c) =>
              c.name.startsWith("sb-") && c.name.includes("-auth-token")
                ? { ...c, name: c.name.replace(legacyPattern, "waesy-auth-token") }
                : c,
            );
          }
          return parsed;
        } catch {
          return [];
        }
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            setCookie(name, value, {
              ...options,
              sameSite: options?.sameSite === "none" ? "none" : "lax",
              secure: process.env.NODE_ENV === "production",
              path: "/",
            });
          });
        } catch {
          // Silently ignore cookie setting outside request context
        }
      },
    },
  });
}
