/**
 * @fileoverview Server Functions para o Portal do Cliente 360 Whitelabel (Waesy BigTech).
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { logSystemError } from "@/lib/logger";

export const getCustomerPortalBySlug = createServerFn({ method: "GET" })
  .validator(z.object({ slug: z.string().min(1) }))
  .handler(async ({ data: { slug } }) => {
    const db = getServerClient();
    const cleanSlug = (slug || "").trim().replace(/^@/, "");
    if (!cleanSlug) {
      return { store: null, portalConfig: null, document: null };
    }

    try {
      const { data: storeRow, error: storeErr } = await db
        .from("stores")
        .select("id, name, slug, description, phone, city, state, logo_url, banner_url, settings")
        .eq("slug", cleanSlug)
        .maybeSingle();

      if (storeErr) {
        logSystemError({
          route: "customer-portal.getCustomerPortalBySlug",
          contractName: "getCustomerPortalBySlug",
          tableName: "stores",
          error: storeErr,
        });
        return { store: null, portalConfig: null, document: null };
      }

      if (!storeRow) {
        return { store: null, portalConfig: null, document: null };
      }

      const rawSettings = (storeRow.settings || {}) as Record<string, any>;
      const publicStore = {
        id: storeRow.id,
        name: storeRow.name,
        slug: storeRow.slug,
        description: storeRow.description || null,
        phone: storeRow.phone || null,
        city: storeRow.city || rawSettings.city || null,
        state: storeRow.state || rawSettings.state || null,
        logo_url: storeRow.logo_url || rawSettings.logoUrl || rawSettings.logo_url || null,
        banner_url: storeRow.banner_url || rawSettings.bannerUrl || rawSettings.banner_url || null,
        settings: {
          logoUrl: storeRow.logo_url || rawSettings.logoUrl || rawSettings.logo_url || null,
          bannerUrl: storeRow.banner_url || rawSettings.bannerUrl || rawSettings.banner_url || null,
          primaryColor: rawSettings.primaryColor || null,
          whatsapp_phone: rawSettings.whatsapp_phone || null,
          city: storeRow.city || rawSettings.city || null,
          state: storeRow.state || rawSettings.state || null,
        },
      };

      const { data: portalConfig } = await db
        .from("customer_portal_configs")
        .select("*")
        .eq("store_id", storeRow.id)
        .maybeSingle();

      return {
        store: publicStore,
        portalConfig,
        document: null,
      };
    } catch (err) {
      logSystemError({
        route: "customer-portal.getCustomerPortalBySlug",
        contractName: "getCustomerPortalBySlug",
        tableName: "stores",
        error: err,
      });
      return { store: null, portalConfig: null, document: null };
    }
  });
