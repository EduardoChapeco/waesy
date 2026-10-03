import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/start-server-core";
import { z } from "zod";
import { getServerClient, getAnonServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { getRealClientIP } from "@/lib/network-telemetry.server";
import type { StorePwaConfig } from "@/types/wms-workflows-reputation";

export const getStorePwaConfig = createServerFn({ method: "GET" })
  .handler(async (): Promise<StorePwaConfig | null> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();

    const { data, error } = await supabase
      .from("store_pwa_configs")
      .select("*")
      .eq("store_id", identity.store_id)
      .maybeSingle();

    if (error) throw new Error("Erro ao buscar configurações do PWA: " + error.message);
    return (data || null) as StorePwaConfig | null;
  });

export const saveStorePwaConfig = createServerFn({ method: "POST" })
  .validator(
    z.object({
      appName: z.string().min(2).max(100),
      shortName: z.string().min(1).max(30),
      description: z.string().optional(),
      themeColor: z.string().default("#0F172A"),
      backgroundColor: z.string().default("#000000"),
      icon192Url: z.string().url().optional().nullable(),
      icon512Url: z.string().url().optional().nullable(),
      splashImageUrl: z.string().url().optional().nullable(),
      startUrl: z.string().default("/"),
      displayMode: z.enum(["standalone", "fullscreen", "minimal-ui", "browser"]).default("standalone"),
      orientation: z.enum(["portrait", "landscape", "any"]).default("portrait"),
      customDomain: z.string().optional().nullable(),
      isPublished: z.boolean().default(true),
      settings: z.record(z.any()).optional().default({}),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const payload = {
      store_id: identity.store_id,
      app_name: data.appName,
      short_name: data.shortName,
      description: data.description,
      theme_color: data.themeColor,
      background_color: data.backgroundColor,
      icon_192_url: data.icon192Url,
      icon_512_url: data.icon512Url,
      splash_image_url: data.splashImageUrl,
      start_url: data.startUrl,
      display_mode: data.displayMode,
      orientation: data.orientation,
      custom_domain: data.customDomain,
      is_published: data.isPublished,
      settings: data.settings || {},
      published_at: data.isPublished ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    const { data: config, error } = await supabase
      .from("store_pwa_configs")
      .upsert(payload, { onConflict: "store_id" })
      .select()
      .single();

    if (error) throw new Error("Erro ao salvar PWA: " + error.message);
    return { status: "success", config: config as StorePwaConfig };
  });

export const getPublicPwaManifest = createServerFn({ method: "GET" })
  .validator(z.object({ storeId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const supabase = getAnonServerClient();

    const { data: pwa, error } = await supabase
      .from("store_pwa_configs")
      .select("*")
      .eq("store_id", data.storeId)
      .eq("is_published", true)
      .maybeSingle();

    if (error || !pwa) {
      return {
        name: "Waesy Web App",
        short_name: "Waesy",
        start_url: "/",
        display: "standalone",
        background_color: "#000000",
        theme_color: "#0F172A",
        icons: [],
      };
    }

    const icons = [];
    if (pwa.icon_192_url) {
      icons.push({ src: pwa.icon_192_url, sizes: "192x192", type: "image/png" });
    }
    if (pwa.icon_512_url) {
      icons.push({ src: pwa.icon_512_url, sizes: "512x512", type: "image/png" });
    }

    return {
      name: pwa.app_name,
      short_name: pwa.short_name,
      description: pwa.description,
      start_url: pwa.start_url || "/",
      display: pwa.display_mode || "standalone",
      orientation: pwa.orientation || "portrait",
      background_color: pwa.background_color || "#000000",
      theme_color: pwa.theme_color || "#0F172A",
      icons,
    };
  });

// ── TELEMETRIA NATIVA DE PWA (Fase 3: Install & Launch Tracking) ──

export const recordPwaInstallation = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid(),
      eventType: z.enum(["prompt_shown", "prompt_accepted", "prompt_dismissed", "installed", "app_opened"]),
      platform: z.string().optional().default("unknown"),
      userAgent: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    let req: Request | null = null;
    try {
      req = getRequest();
    } catch {}

    const ipAddress = getRealClientIP(req);
    const supabase = getAnonServerClient();

    const { error } = await supabase.from("pwa_telemetry").insert({
      store_id: data.storeId,
      event_type: data.eventType,
      platform: data.platform || "unknown",
      user_agent: data.userAgent?.slice(0, 500) || null,
      ip_address: ipAddress,
    });

    if (error) {
      console.warn("[pwa.functions] Erro ao registrar telemetria PWA:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  });

export interface PwaTelemetrySummary {
  totalInstalls: number;
  promptsShown: number;
  promptsAccepted: number;
  appOpens: number;
  conversionRatePct: number;
  platformBreakdown: {
    ios: number;
    android: number;
    desktop: number;
    other: number;
  };
  recentEvents: Array<{
    id: string;
    eventType: string;
    platform: string;
    createdAt: string;
  }>;
}

export const getPwaTelemetryMetrics = createServerFn({ method: "GET" })
  .handler(async (): Promise<PwaTelemetrySummary> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const { data: rows, error } = await supabase
      .from("pwa_telemetry")
      .select("id, event_type, platform, created_at")
      .eq("store_id", identity.store_id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.warn("[pwa.functions] getPwaTelemetryMetrics error:", error.message);
      return {
        totalInstalls: 0,
        promptsShown: 0,
        promptsAccepted: 0,
        appOpens: 0,
        conversionRatePct: 0,
        platformBreakdown: { ios: 0, android: 0, desktop: 0, other: 0 },
        recentEvents: [],
      };
    }

    const items = rows || [];
    let totalInstalls = 0;
    let promptsShown = 0;
    let promptsAccepted = 0;
    let appOpens = 0;
    const platformBreakdown = { ios: 0, android: 0, desktop: 0, other: 0 };

    for (const r of items) {
      if (r.event_type === "installed") totalInstalls++;
      else if (r.event_type === "prompt_shown") promptsShown++;
      else if (r.event_type === "prompt_accepted") promptsAccepted++;
      else if (r.event_type === "app_opened") appOpens++;

      const p = (r.platform || "").toLowerCase();
      if (p.includes("ios") || p.includes("iphone") || p.includes("ipad")) platformBreakdown.ios++;
      else if (p.includes("android")) platformBreakdown.android++;
      else if (p.includes("windows") || p.includes("mac") || p.includes("linux") || p.includes("desktop")) platformBreakdown.desktop++;
      else platformBreakdown.other++;
    }

    const conversionRatePct = promptsShown > 0 ? Math.round((promptsAccepted / promptsShown) * 100) : 0;

    return {
      totalInstalls,
      promptsShown,
      promptsAccepted,
      appOpens,
      conversionRatePct,
      platformBreakdown,
      recentEvents: items.slice(0, 15).map((r) => ({
        id: r.id,
        eventType: r.event_type,
        platform: r.platform,
        createdAt: r.created_at,
      })),
    };
  });

export const getStoreAppCatalogPreview = createServerFn({ method: "GET" })
  .handler(async () => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const { data, error } = await supabase
      .from("products")
      .select("id, title, slug, price_cents, compare_at_cents, status, attributes")
      .eq("store_id", identity.store_id)
      .in("status", ["published", "active"])
      .order("created_at", { ascending: false })
      .limit(6);

    if (error) {
      console.warn("[pwa.functions] getStoreAppCatalogPreview error:", error.message);
      return [];
    }

    return (data || []).map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      priceCents: p.price_cents || 0,
      compareAtCents: p.compare_at_cents || null,
      coverUrl: (p.attributes as any)?.cover_url || null,
    }));
  });
