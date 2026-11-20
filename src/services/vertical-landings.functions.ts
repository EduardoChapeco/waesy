import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/start-server-core";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { requirePlatformAdmin } from "@/lib/server-access";
import { buildDefaultVerticalLanding } from "@/lib/vertical-landing-presets";
import type {
  VerticalLandingPageDTO,
  VerticalLandingSectionDTO,
} from "@/lib/vertical-landing-types";
import {
  CANONICAL_VERTICAL_SUBSYSTEMS,
  LEGACY_SUBSYSTEM_SLUG_ALIASES,
  normalizeCanonicalSubsystemId,
  resolveSubsystemBySlug,
  resolveSubsystemFromHost,
} from "@/lib/vertical-subsystems";

function resolveSafeRequestHost(): string {
  try {
    const forwardedHost = getRequestHeader?.("x-forwarded-host");
    const host = getRequestHeader?.("host");
    return String(forwardedHost || host || "").toLowerCase();
  } catch {
    return "";
  }
}

function resolveSafeRequestSubsystemHeader(): string {
  try {
    return String(getRequestHeader?.("x-waesy-subsystem-id") || "").trim().toLowerCase();
  } catch {
    return "";
  }
}

function mergeLandingRecord(
  slug: string,
  row: Record<string, any> | null,
  sectionRows: Record<string, any>[],
): VerticalLandingPageDTO {
  const base = buildDefaultVerticalLanding(slug);
  if (!row) {
    return base;
  }

  const normalizedSections: VerticalLandingSectionDTO[] =
    Array.isArray(sectionRows) && sectionRows.length > 0
      ? sectionRows.map((s) => ({
          id: String(s.id),
          landing_slug: String(s.landing_slug),
          section_type: s.section_type,
          title: String(s.title || ""),
          subtitle: s.subtitle ?? null,
          badge_tag: s.badge_tag ?? null,
          body: s.body ?? null,
          media_desktop_url: s.media_desktop_url ?? null,
          media_mobile_url: s.media_mobile_url ?? null,
          video_url: s.video_url ?? null,
          cta_label: s.cta_label ?? null,
          cta_href: s.cta_href ?? null,
          items_json: Array.isArray(s.items_json) ? s.items_json : [],
          layout_variant: s.layout_variant || "split_right",
          sort_order: typeof s.sort_order === "number" ? s.sort_order : 10,
          is_active: s.is_active !== false,
          updated_at: s.updated_at,
        }))
      : base.sections;

  return {
    slug: String(row.slug || base.slug),
    subsystem_id: row.subsystem_id ?? base.subsystem_id,
    brand_vertical_id: row.brand_vertical_id ?? base.brand_vertical_id,
    niche_id: row.niche_id ?? base.niche_id,
    vertical_sku: row.vertical_sku ?? base.vertical_sku,
    display_name: String(row.display_name || base.display_name),
    tagline: String(row.tagline || base.tagline),
    badge_label: row.badge_label ?? base.badge_label,
    hero_title: String(row.hero_title || base.hero_title),
    hero_subtitle: String(row.hero_subtitle || base.hero_subtitle),
    hero_cta_label: String(row.hero_cta_label || base.hero_cta_label),
    hero_cta_secondary_label: String(row.hero_cta_secondary_label || base.hero_cta_secondary_label),
    hero_image_desktop_url: row.hero_image_desktop_url ?? base.hero_image_desktop_url ?? null,
    hero_image_mobile_url: row.hero_image_mobile_url ?? base.hero_image_mobile_url ?? null,
    hero_video_url: row.hero_video_url ?? base.hero_video_url ?? null,
    login_split_image_url: row.login_split_image_url ?? base.login_split_image_url ?? null,
    logo_url: row.logo_url ?? base.logo_url ?? null,
    isolated_modules:
      Array.isArray(row.isolated_modules) && row.isolated_modules.length > 0
        ? row.isolated_modules
        : base.isolated_modules,
    plans:
      Array.isArray(row.plans) && row.plans.length > 0
        ? row.plans
        : base.plans,
    faq_items:
      Array.isArray(row.faq_items) && row.faq_items.length > 0
        ? row.faq_items
        : base.faq_items,
    metrics_items:
      Array.isArray(row.metrics_items) && row.metrics_items.length > 0
        ? row.metrics_items
        : base.metrics_items,
    sections: normalizedSections,
    is_published: row.is_published !== false,
    updated_at: row.updated_at,
  };
}

export const getPublicVerticalLandingFn = createServerFn({ method: "GET" })
  .validator((input?: { slug?: string; includeInactiveSections?: boolean }) =>
    z
      .object({
        slug: z.string().max(60).optional(),
        includeInactiveSections: z.boolean().optional(),
      })
      .optional()
      .parse(input),
  )
  .handler(async ({ data }): Promise<VerticalLandingPageDTO> => {
    const capturedHost = resolveSafeRequestHost();
    const capturedSubHeader = resolveSafeRequestSubsystemHeader();
    let targetSlug = (data?.slug || "").trim().toLowerCase();
    if (!targetSlug) {
      const hostSub =
        resolveSubsystemFromHost(capturedHost) || resolveSubsystemBySlug(capturedSubHeader);
      targetSlug = hostSub?.id || "waesy";
    }
    const resolvedSub = resolveSubsystemBySlug(targetSlug);
    const canonicalSlug = resolvedSub?.id || normalizeCanonicalSubsystemId(targetSlug) || "waesy";

    const db = getServerClient();
    try {
      const [{ data: row }, { data: sections }] = await Promise.all([
        db
          .from("platform_landing_pages")
          .select("*")
          .eq("slug", canonicalSlug)
          .maybeSingle(),
        db
          .from("platform_landing_sections")
          .select("*")
          .eq("landing_slug", canonicalSlug)
          .order("sort_order", { ascending: true }),
      ]);

      const filteredSections = (sections || []).filter((s: any) =>
        data?.includeInactiveSections ? true : s.is_active !== false,
      );
      return mergeLandingRecord(canonicalSlug, row || null, filteredSections);
    } catch {
      return buildDefaultVerticalLanding(canonicalSlug);
    }
  });

export const getHostVerticalSubsystemLandingFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ subsystemId: string | null; landing: VerticalLandingPageDTO | null }> => {
    const host = resolveSafeRequestHost();
    const subHeader = resolveSafeRequestSubsystemHeader();
    const hostSub = resolveSubsystemFromHost(host) || resolveSubsystemBySlug(subHeader);
    if (!hostSub || hostSub.id === "waesy") {
      return { subsystemId: hostSub?.id || null, landing: null };
    }
    if (hostSub.category !== "saas_brand" && hostSub.category !== "vertical_workspace") {
      return { subsystemId: hostSub.id, landing: null };
    }
    const landing = await getPublicVerticalLandingFn({ data: { slug: hostSub.id } });
    return { subsystemId: hostSub.id, landing };
  },
);

export const listPublicVerticalSystemsCatalogFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const db = getServerClient();
    const activeSubs = CANONICAL_VERTICAL_SUBSYSTEMS.filter((s) => s.id !== "admin" && s.isActive);
    try {
      const [{ data: subRows }, { data: landingRows }] = await Promise.all([
        db.from("platform_vertical_subsystems").select("*").order("sort_order", { ascending: true }),
        db.from("platform_landing_pages").select("slug, hero_image_desktop_url, logo_url, tagline, badge_label, is_published"),
      ]);

      const subMap = new Map<string, any>();
      for (const r of subRows || []) {
        const rawId = String(r.id || "");
        const normId = normalizeCanonicalSubsystemId(rawId);
        const isLegacy = Boolean(LEGACY_SUBSYSTEM_SLUG_ALIASES[rawId.toLowerCase()]);
        if (!subMap.has(normId) || !isLegacy) {
          subMap.set(normId, isLegacy ? { ...r, name: undefined, short_name: undefined } : r);
        }
      }
      const landingMap = new Map<string, any>();
      for (const l of landingRows || []) {
        const rawSlug = String(l.slug || "");
        const normSlug = normalizeCanonicalSubsystemId(rawSlug);
        const isLegacy = Boolean(LEGACY_SUBSYSTEM_SLUG_ALIASES[rawSlug.toLowerCase()]);
        if (!landingMap.has(normSlug) || !isLegacy) {
          landingMap.set(normSlug, l);
        }
      }

      return activeSubs
        .filter((s) => s.id !== "waesy")
        .filter((s) => {
          const ov = subMap.get(s.id);
          return ov ? ov.is_active !== false : s.isActive;
        })
        .map((s) => {
          const ov = subMap.get(s.id);
          const lp = landingMap.get(s.id);
          const preset = buildDefaultVerticalLanding(s.id);
          return {
            ...s,
            name: ov?.name || s.name,
            shortName: ov?.short_name || s.shortName,
            description: ov?.description || lp?.tagline || s.description,
            heroImageUrl: lp?.hero_image_desktop_url || null,
            logoUrl: lp?.logo_url || null,
            badgeLabel: lp?.badge_label || preset.badge_label || s.shortName,
            modulesCount: preset.isolated_modules.length,
            plansCount: preset.plans.length,
            isPublished: lp ? lp.is_published !== false : true,
          };
        });
    } catch {
      return activeSubs
        .filter((s) => s.id !== "waesy")
        .map((s) => {
          const preset = buildDefaultVerticalLanding(s.id);
          return {
            ...s,
            heroImageUrl: null,
            logoUrl: null,
            badgeLabel: preset.badge_label || s.shortName,
            modulesCount: preset.isolated_modules.length,
            plansCount: preset.plans.length,
            isPublished: true,
          };
        });
    }
  },
);

export const adminListVerticalLandingsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<VerticalLandingPageDTO[]> => {
    await requirePlatformAdmin();
    const db = getServerClient();
    const { data: rows } = await db.from("platform_landing_pages").select("*");
    const { data: allSections } = await db
      .from("platform_landing_sections")
      .select("*")
      .order("sort_order", { ascending: true });

    const rowMap = new Map<string, any>();
    for (const r of rows || []) rowMap.set(String(r.slug), r);

    const secMap = new Map<string, any[]>();
    for (const sec of allSections || []) {
      const k = String(sec.landing_slug);
      const arr = secMap.get(k) || [];
      arr.push(sec);
      secMap.set(k, arr);
    }

    return CANONICAL_VERTICAL_SUBSYSTEMS.filter((s) => s.id !== "admin").map((s) =>
      mergeLandingRecord(s.id, rowMap.get(s.id) || null, secMap.get(s.id) || []),
    );
  },
);

const IsolatedModuleSchema = z.object({
  id: z.string().min(1).max(60),
  title: z.string().min(2).max(120),
  category: z.string().min(1).max(60),
  description: z.string().min(4).max(400),
  highlights: z.array(z.string().min(1).max(80)).default([]),
  iconName: z.string().max(40).optional(),
  imageUrl: z.string().max(600).nullable().optional(),
});

const LandingPlanSchema = z.object({
  id: z.string().min(1).max(60),
  sku: z.string().max(60).optional(),
  name: z.string().min(2).max(100),
  badge: z.string().max(40).optional(),
  tagline: z.string().min(2).max(240),
  monthlyPriceCents: z.number().int().min(0),
  annualPriceCents: z.number().int().min(0),
  isFeatured: z.boolean().optional(),
  ctaLabel: z.string().min(2).max(60),
  features: z.array(z.string().min(1).max(120)).default([]),
  limits: z.array(z.string().min(1).max(120)).default([]),
});

export const adminSaveVerticalLandingFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      slug: z.string().min(2).max(60),
      display_name: z.string().min(2).max(120),
      tagline: z.string().min(2).max(400),
      badge_label: z.string().max(80).nullable().optional(),
      hero_title: z.string().min(3).max(160),
      hero_subtitle: z.string().min(4).max(500),
      hero_cta_label: z.string().min(2).max(60),
      hero_cta_secondary_label: z.string().min(2).max(60),
      hero_image_desktop_url: z.string().max(700).nullable().optional(),
      hero_image_mobile_url: z.string().max(700).nullable().optional(),
      hero_video_url: z.string().max(700).nullable().optional(),
      login_split_image_url: z.string().max(700).nullable().optional(),
      logo_url: z.string().max(700).nullable().optional(),
      isolated_modules: z.array(IsolatedModuleSchema),
      plans: z.array(LandingPlanSchema),
      faq_items: z.array(z.object({ question: z.string().min(3), answer: z.string().min(3) })).default([]),
      metrics_items: z
        .array(z.object({ label: z.string().min(1), value: z.string().min(1), detail: z.string().default("") }))
        .default([]),
      is_published: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    const admin = await requirePlatformAdmin();
    const db = getServerClient();
    const defaults = buildDefaultVerticalLanding(data.slug);

    const payload = {
      slug: data.slug.trim().toLowerCase(),
      subsystem_id: defaults.subsystem_id,
      brand_vertical_id: defaults.brand_vertical_id,
      niche_id: defaults.niche_id,
      vertical_sku: defaults.vertical_sku,
      display_name: data.display_name.trim(),
      tagline: data.tagline.trim(),
      badge_label: data.badge_label?.trim() || null,
      hero_title: data.hero_title.trim(),
      hero_subtitle: data.hero_subtitle.trim(),
      hero_cta_label: data.hero_cta_label.trim(),
      hero_cta_secondary_label: data.hero_cta_secondary_label.trim(),
      hero_image_desktop_url: data.hero_image_desktop_url?.trim() || null,
      hero_image_mobile_url: data.hero_image_mobile_url?.trim() || null,
      hero_video_url: data.hero_video_url?.trim() || null,
      login_split_image_url: data.login_split_image_url?.trim() || null,
      logo_url: data.logo_url?.trim() || null,
      isolated_modules: data.isolated_modules,
      plans: data.plans,
      faq_items: data.faq_items,
      metrics_items: data.metrics_items,
      is_published: data.is_published,
      updated_at: new Date().toISOString(),
      updated_by: admin.id,
    };

    const { error } = await db.from("platform_landing_pages").upsert(payload);
    if (error) throw new Error("Erro ao salvar landing vertical: " + error.message);

    try {
      await db.from("forensic_audit_events").insert({
        actor_id: admin.id,
        actor_role: "platform_admin",
        target_entity_type: "vertical_landing_page",
        target_entity_id: payload.slug,
        action: "save_vertical_landing",
        payload_snapshot: { slug: payload.slug, is_published: payload.is_published },
      });
    } catch {}

    return await getPublicVerticalLandingFn({
      data: { slug: payload.slug, includeInactiveSections: true },
    });
  });

async function ensureLandingRowExists(db: any, slug: string, adminId: string) {
  const { data: existing } = await db
    .from("platform_landing_pages")
    .select("slug")
    .eq("slug", slug)
    .maybeSingle();
  if (existing?.slug) return;
  const def = buildDefaultVerticalLanding(slug);
  await db.from("platform_landing_pages").insert({
    slug: def.slug,
    subsystem_id: def.subsystem_id,
    brand_vertical_id: def.brand_vertical_id,
    niche_id: def.niche_id,
    vertical_sku: def.vertical_sku,
    display_name: def.display_name,
    tagline: def.tagline,
    badge_label: def.badge_label,
    hero_title: def.hero_title,
    hero_subtitle: def.hero_subtitle,
    hero_cta_label: def.hero_cta_label,
    hero_cta_secondary_label: def.hero_cta_secondary_label,
    isolated_modules: def.isolated_modules,
    plans: def.plans,
    faq_items: def.faq_items,
    metrics_items: def.metrics_items,
    is_published: true,
    updated_by: adminId,
  });
}

export const adminUpsertLandingSectionFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid().optional(),
      landing_slug: z.string().min(2).max(60),
      section_type: z.enum([
        "feature_split",
        "modules_grid",
        "plans_pricing",
        "media_showcase",
        "video_demo",
        "workflow_steps",
        "faq_accordion",
        "metrics_bar",
        "cta_banner",
      ]),
      title: z.string().min(2).max(160),
      subtitle: z.string().max(400).nullable().optional(),
      badge_tag: z.string().max(60).nullable().optional(),
      body: z.string().max(2000).nullable().optional(),
      media_desktop_url: z.string().max(700).nullable().optional(),
      media_mobile_url: z.string().max(700).nullable().optional(),
      video_url: z.string().max(700).nullable().optional(),
      cta_label: z.string().max(60).nullable().optional(),
      cta_href: z.string().max(300).nullable().optional(),
      items_json: z
        .array(
          z.object({
            title: z.string().min(1),
            description: z.string().optional(),
            badge: z.string().optional(),
            imageUrl: z.string().nullable().optional(),
          }),
        )
        .default([]),
      layout_variant: z
        .enum(["split_right", "split_left", "grid_2", "grid_3", "bento", "banner_wide"])
        .default("split_right"),
      sort_order: z.number().int().min(0).max(999).default(10),
      is_active: z.boolean().default(true),
    }),
  )
  .handler(async ({ data }) => {
    const admin = await requirePlatformAdmin();
    const db = getServerClient();
    const slug = data.landing_slug.trim().toLowerCase();
    await ensureLandingRowExists(db, slug, admin.id);

    const payload = {
      landing_slug: slug,
      section_type: data.section_type,
      title: data.title.trim(),
      subtitle: data.subtitle?.trim() || null,
      badge_tag: data.badge_tag?.trim() || null,
      body: data.body?.trim() || null,
      media_desktop_url: data.media_desktop_url?.trim() || null,
      media_mobile_url: data.media_mobile_url?.trim() || null,
      video_url: data.video_url?.trim() || null,
      cta_label: data.cta_label?.trim() || null,
      cta_href: data.cta_href?.trim() || null,
      items_json: data.items_json,
      layout_variant: data.layout_variant,
      sort_order: data.sort_order,
      is_active: data.is_active,
      updated_at: new Date().toISOString(),
    };

    if (data.id) {
      const { data: updated, error } = await db
        .from("platform_landing_sections")
        .update(payload)
        .eq("id", data.id)
        .select()
        .single();
      if (error) throw new Error("Erro ao atualizar seção da landing: " + error.message);
      return updated;
    }

    const { data: inserted, error } = await db
      .from("platform_landing_sections")
      .insert(payload)
      .select()
      .single();
    if (error) throw new Error("Erro ao criar seção da landing: " + error.message);
    return inserted;
  });

export const adminDeleteLandingSectionFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requirePlatformAdmin();
    const db = getServerClient();
    const { error } = await db.from("platform_landing_sections").delete().eq("id", data.id);
    if (error) throw new Error("Erro ao remover seção: " + error.message);
    return { success: true };
  });

export const adminReorderLandingSectionsFn = createServerFn({ method: "POST" })
  .validator(z.object({ orderedIds: z.array(z.string().uuid()).min(1) }))
  .handler(async ({ data }) => {
    await requirePlatformAdmin();
    const db = getServerClient();
    await Promise.all(
      data.orderedIds.map((id, idx) =>
        db.from("platform_landing_sections").update({ sort_order: (idx + 1) * 10 }).eq("id", id),
      ),
    );
    return { success: true };
  });
