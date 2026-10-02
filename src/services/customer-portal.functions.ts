/**
 * @fileoverview Server Functions para o Portal do Cliente 360 Whitelabel (Waesy BigTech).
 */

import { createServerFn } from "@tanstack/react-start";
import { getServerClient } from "@/lib/supabase";

export const getCustomerPortalBySlug = createServerFn({ method: "GET" })
  .validator((d: { slug: string }) => d)
  .handler(async ({ data: { slug } }) => {
    const db = getServerClient();
    try {
      const { data: store } = await db
        .from("stores")
        .select("id, name, slug, description, phone, email, settings")
        .eq("slug", slug)
        .maybeSingle();

      if (!store) {
        return {
          store: { name: "Empresa", slug, settings: {} },
          portalConfig: null,
          document: null,
        };
      }

      const { data: portalConfig } = await db
        .from("customer_portal_configs")
        .select("*")
        .eq("store_id", store.id)
        .maybeSingle();

      return {
        store,
        portalConfig,
        document: null,
      };
    } catch (err) {
      console.error("[customer-portal.functions] getCustomerPortalBySlug error:", err);
      return { store: null, portalConfig: null, document: null };
    }
  });
