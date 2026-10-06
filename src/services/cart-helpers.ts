/**
 * Cart helpers — shared identity + guest-cart merge logic.
 *
 * Kept OUTSIDE cart.functions.ts because TanStack's server-fn splitter
 * (?tss-serverfn-split) strips sibling declarations from `.functions.ts`
 * modules, breaking any other file that imports them.
 */

import { getServerClient } from "@/lib/supabase";
import { getSSRClient } from "@/lib/server-access";
import { getOrCreateGuestSession, getGuestSession } from "@/lib/server-access";
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
  const token = await getOrCreateGuestSession();
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
    session_token = await getGuestSession();
  }

  if (!session_token) return { status: "success" as const };

  // 1. Try the atomic RPC to merge carts across stores preserving options
  let rpcSuccess = false;
  try {
    const { error } = await supabase.rpc("merge_guest_cart", {
      p_guest_session: session_token,
      p_customer_id: customerId,
    });
    if (!error) {
      rpcSuccess = true;
    } else {
      console.warn("[mergeGuestCartLogic] RPC merge_guest_cart reported error, attempting relational fallback:", error);
    }
  } catch (err) {
    console.warn("[mergeGuestCartLogic] RPC merge_guest_cart threw, attempting relational fallback:", err);
  }

  // 2. Relational multi-store fallback if RPC is not available or errored
  if (!rpcSuccess) {
    try {
      const serverClient = getServerClient();
      const { data: guestCarts } = await serverClient
        .from("carts")
        .select("id, store_id, seller_id, coupon_code, discount_cents")
        .eq("session_token", session_token)
        .eq("status", "active");

      if (guestCarts && guestCarts.length > 0) {
        for (const gCart of guestCarts) {
          const { data: userCart } = await serverClient
            .from("carts")
            .select("id")
            .eq("customer_id", customerId)
            .eq("store_id", gCart.store_id)
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!userCart) {
            await serverClient
              .from("carts")
              .update({ customer_id: customerId, session_token: null })
              .eq("id", gCart.id);
          } else {
            const { data: gItems } = await serverClient
              .from("cart_items")
              .select("variant_id, qty, price_snapshot_cents, selected_options")
              .eq("cart_id", gCart.id);

            if (gItems && gItems.length > 0) {
              for (const it of gItems) {
                const optJson = JSON.stringify(it.selected_options || {});
                const { data: existingUserItems } = await serverClient
                  .from("cart_items")
                  .select("id, qty, selected_options")
                  .eq("cart_id", userCart.id)
                  .eq("variant_id", it.variant_id);

                const match = existingUserItems?.find(
                  (uIt: any) => JSON.stringify(uIt.selected_options || {}) === optJson,
                );

                if (match) {
                  await serverClient
                    .from("cart_items")
                    .update({
                      qty: match.qty + it.qty,
                      price_snapshot_cents: it.price_snapshot_cents,
                    })
                    .eq("id", match.id);
                } else {
                  await serverClient.from("cart_items").insert({
                    cart_id: userCart.id,
                    variant_id: it.variant_id,
                    qty: it.qty,
                    price_snapshot_cents: it.price_snapshot_cents,
                    selected_options: it.selected_options || {},
                  });
                }
              }
            }

            await serverClient.from("cart_items").delete().eq("cart_id", gCart.id);
            await serverClient.from("carts").delete().eq("id", gCart.id);
          }
        }
      }
    } catch (fallbackErr) {
      console.error("[mergeGuestCartLogic] Fallback cart merge error:", fallbackErr);
    }
  }

  return { status: "success" as const };
}

export function withDataPayload<T extends z.ZodTypeAny>(schema: T) {
  return z.union([
    schema,
    z.object({ data: schema }).transform((val) => val.data as z.infer<T>),
  ]);
}
