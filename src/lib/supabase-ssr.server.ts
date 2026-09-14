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
import { getRequestHeader, setCookie } from "@tanstack/react-start/server";
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
 cookies: {
 getAll() {
 try {
 const cookieHeader = getRequestHeader("cookie");
 if (!cookieHeader) return [];
 return parseCookieHeader(cookieHeader).map((c) => ({
 name: c.name,
 value: c.value ?? "",
 }));
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
 });
 });
 } catch {
 // Silently ignore cookie setting outside request context
 }
 },
 },
 });
}
