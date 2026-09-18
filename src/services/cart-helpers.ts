/**
 * Cart helpers — shared identity + guest-cart merge logic.
 *
 * Kept OUTSIDE cart.functions.ts because TanStack's server-fn splitter
 * (?tss-serverfn-split) strips sibling declarations from `.functions.ts`
 * modules, breaking any other file that imports them.
 */

import { getServerClient } from "@/lib/supabase";
import { getSSRClient } from "@/lib/server-access";
import { getOrCreateGuestSession, getGuestSession } from "@/lib/session";
import { getEnvVar } from "@/lib/env";
import { z } from "zod";

export async function getCurrentIdentity() {
 const ssrClient = await getSSRClient();

 // First, check if the user is authenticated
 const {
 data: { user },
 } = await ssrClient.auth.getUser();

 if (user) {
 return { customer_id: user.id, session_token: null };
 }

 // If not authenticated, fetch or create guest session synchronously BEFORE any await
 // to keep the vinxi/http unctx context alive.
 const token = getOrCreateGuestSession();
 return { customer_id: null, session_token: token };
}

export async function mergeGuestCartLogic(
 customerId: string,
 accessToken?: string,
 explicitGuestToken?: string | null,
) {
 let supabase;
 if (accessToken) {
 const url = getEnvVar("VITE_SUPABASE_URL");
 const key = getEnvVar("VITE_SUPABASE_ANON_KEY");
 if (!url || !key) throw new Error("Missing env vars for Supabase");

 const { createClient } = await import("@supabase/supabase-js");
 supabase = createClient(url, key, {
 global: { headers: { Authorization: `Bearer ${accessToken}` } },
 });
 } else {
 supabase = await getSSRClient();
 }

 // Resolve session token. If we are logging in, we need the existing guest token
 let session_token = explicitGuestToken;
 if (session_token === undefined) {
 // If not explicit, get the current one from cookies (if any).
 // Note: We use getGuestSession so we don't accidentally create a new one.
 session_token = getGuestSession();
 }

 if (!session_token) return { status: "success" as const };

 // Use the new atomic RPC to merge carts, eliminating the catastrophic N+1 query loop.
 const { error } = await supabase.rpc("merge_guest_cart", {
 p_guest_session: session_token,
 p_customer_id: customerId,
 });

 if (error) {
 console.error("[mergeGuestCartLogic] Error merging carts:", error);
 // We don't throw to avoid breaking login if cart merge fails
 }

 // Ensure getServerClient stays imported (used by callers via cart.functions).
 void getServerClient;

 return { status: "success" as const };
}

export function withDataPayload<T extends z.ZodTypeAny>(schema: T) {
 return z.union([
 schema,
 z.object({ data: schema }).transform((val) => val.data as z.infer<T>),
 ]);
}
