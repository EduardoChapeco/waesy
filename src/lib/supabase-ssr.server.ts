/**
 * Supabase SSR Client Commerce
 *
 * This client is strictly for server-side auth and user session management.
 * It uses the @supabase/ssr package to manage Auth cookies via vinxi/http.
 *
 * It uses the ANON KEY, not the service role key, because it represents
 * the current user visiting the store.
 */

import { createServerClient, serializeCookieHeader } from "@supabase/ssr";
import { getRequestHeader, getResponseHeaders, setCookie } from "@tanstack/start-server-core";
import { z } from "zod";
import { SupabaseUnconfiguredError } from "./supabase";
import { getEnvVar } from "./env";
import {
  getLegacyCookieDomainsToPurge,
  parseRawCookieStringPreservingDuplicates,
  resolveCanonicalAuthCookies,
  resolveOrphanAuthCookiesToExpire,
} from "./auth-cookie-sanitizer";

const EnvSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(10),
});

function safeEmitCookie(
  capturedHeaders: Headers | null,
  name: string,
  value: string,
  options: Record<string, any>,
) {
  let emittedViaH3 = false;
  try {
    setCookie(name, value, options);
    emittedViaH3 = true;
  } catch {
    emittedViaH3 = false;
  }

  if (!emittedViaH3 && capturedHeaders) {
    try {
      capturedHeaders.append("Set-Cookie", serializeCookieHeader(name, value, options));
    } catch {}
  }
}

function safeAppendRawClearCookie(
  capturedHeaders: Headers | null,
  name: string,
  domain: string,
  isProd: boolean,
) {
  let targetHeaders = capturedHeaders;
  if (!targetHeaders) {
    try {
      targetHeaders = getResponseHeaders() as unknown as Headers;
    } catch {
      targetHeaders = null;
    }
  }
  if (!targetHeaders) return;
  try {
    targetHeaders.append(
      "Set-Cookie",
      serializeCookieHeader(name, "", {
        path: "/",
        maxAge: 0,
        domain,
        sameSite: "lax",
        secure: isProd,
      }),
    );
  } catch {}
}

export function getSSRClient(preCapturedHeaders?: Headers | null) {
  const env = EnvSchema.safeParse({
    VITE_SUPABASE_URL: getEnvVar("VITE_SUPABASE_URL"),
    VITE_SUPABASE_ANON_KEY: getEnvVar("VITE_SUPABASE_ANON_KEY"),
  });

  if (!env.success) {
    throw new SupabaseUnconfiguredError("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
  }

  // Captura síncrona antes de qualquer await de rede para preservar contexto mesmo se unctx expirar
  let capturedCookieHeader = "";
  let capturedHost = "";
  let capturedResHeaders: Headers | null = preCapturedHeaders || null;
  try {
    capturedCookieHeader = getRequestHeader("cookie") || "";
  } catch {}
  try {
    capturedHost = (getRequestHeader("host") || "").toLowerCase();
  } catch {}
  if (!capturedResHeaders) {
    try {
      capturedResHeaders = (getResponseHeaders() as unknown as Headers) || null;
    } catch {}
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
          let cookieHeader = capturedCookieHeader;
          if (!cookieHeader) {
            try {
              cookieHeader = getRequestHeader("cookie") || "";
            } catch {}
          }
          if (!cookieHeader) return [];

          const rawEntries = parseRawCookieStringPreservingDuplicates(cookieHeader);
          return resolveCanonicalAuthCookies(rawEntries);
        } catch {
          return [];
        }
      },
      setAll(cookiesToSet) {
        try {
          let host = capturedHost;
          if (!host) {
            try {
              host = (getRequestHeader("host") || "").toLowerCase();
            } catch {}
          }

          const isProd = process.env.NODE_ENV === "production";
          let cookieDomain: string | undefined = undefined;
          if (host.includes("waesy.com.br")) {
            cookieDomain = ".waesy.com.br";
          } else if (host.includes("usewaesy.com")) {
            cookieDomain = ".usewaesy.com";
          }
          const legacyDomains = getLegacyCookieDomainsToPurge(host);
          let cookieHeader = capturedCookieHeader;
          if (!cookieHeader) {
            try {
              cookieHeader = getRequestHeader("cookie") || "";
            } catch {}
          }
          const rawEntries = parseRawCookieStringPreservingDuplicates(cookieHeader);

          cookiesToSet.forEach(({ name, value, options }) => {
            const isDeleting = !value || options?.maxAge === 0;

            // 1. Limpa variantes com Domain=.waesy.com.br / .usewaesy.com para eliminar split-brain (domain: cookieDomain)
            for (const domain of legacyDomains) {
              safeAppendRawClearCookie(capturedResHeaders, name, domain, isProd);
            }

            // 2. Grava (ou expira) o cookie canônico host-only (sem domain wildcard)
            const cleanOptions = { ...options };
            delete cleanOptions.domain;

            safeEmitCookie(capturedResHeaders, name, isDeleting ? "" : value, {
              ...cleanOptions,
              maxAge: isDeleting ? 0 : (options?.maxAge ?? 60 * 60 * 24 * 365),
              sameSite: options?.sameSite === "none" ? "none" : "lax",
              secure: isProd,
              path: "/",
            });
          });

          // 3. Expira exclusivamente chunks órfãos comprovados, preservando chunks inalterados da sessão ativa
          const orphanNames = resolveOrphanAuthCookiesToExpire(rawEntries, cookiesToSet);
          for (const orphanName of orphanNames) {
            for (const domain of legacyDomains) {
              safeAppendRawClearCookie(capturedResHeaders, orphanName, domain, isProd);
            }
            safeEmitCookie(capturedResHeaders, orphanName, "", {
              maxAge: 0,
              sameSite: "lax",
              secure: isProd,
              path: "/",
            });
          }
        } catch {
          // Silently ignore cookie setting outside request context
        }
      },
    },
  });
}
