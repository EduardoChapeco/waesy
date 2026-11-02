/**
 * omni-builder.functions.ts — BFF Server Functions para o Omni-Block Engine
 *
 * Persistência real, atômica e validada via Zod na tabela `experience_documents`
 * e `experience_versions` do Supabase. Erradicação total de mocks ou console.log.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin, getServerIdentity } from "@/lib/server-access";
import { getServerClient, SupabaseUnconfiguredError } from "@/lib/supabase";
import { OmniPageDocumentSchema, OmniPageDocument, createEmptyOmniPage } from "@/types/omni-builder";
import { applyTemplateToPage } from "@/lib/builder/omni-templates";
import { auditOmniDocument, getPublicationBlockingFindings } from "@/lib/builder/studio-template-audit";
import { matchesUnsplashSelectionLedger } from "@/lib/builder/unsplash-api";
import { matchesStudioUploadAssetLedger } from "@/lib/builder/asset-contract";
import { ensureCanonicalHomeSectionMaterialized } from "@/services/admin-home-cms.functions";

async function resolveBuilderStoreId(
  db: ReturnType<typeof getServerClient>,
  identityStoreId?: string | null,
  documentId?: string,
): Promise<string> {
  if (documentId) {
    const { data: docRow } = await db
      .from("experience_documents")
      .select("store_id")
      .eq("id", documentId)
      .maybeSingle();
    if (docRow?.store_id) return docRow.store_id;
  }
  if (identityStoreId) return identityStoreId;
  const { data: rootStore } = await db
    .from("stores")
    .select("id")
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!rootStore?.id) {
    throw new Error("Loja ativa não identificada na sessão segura.");
  }
  return rootStore.id;
}

async function syncOmniDocumentToPlatformCms(
  db: ReturnType<typeof getServerClient>,
  storeId: string,
  docSettings: Record<string, any>,
  omniDoc: OmniPageDocument,
) {
  const pageSlug = String(docSettings?.platform_page_slug || omniDoc.slug || "").trim().toLowerCase();
  const isPlatformSurface =
    Boolean(docSettings?.is_platform_surface) ||
    Boolean(pageSlug) ||
    omniDoc.blocks.some(
      (b: any) =>
        Boolean(b?.config?.cmsSectionKey) ||
        Boolean(b?.config?.cmsSurfaceSectionId) ||
        b?.type === "vitrine_lateral_drawer" ||
        b?.type === "vitrine_ifood_header",
    );

  if (!isPlatformSurface) return;

  for (let idx = 0; idx < omniDoc.blocks.length; idx++) {
    const block: any = omniDoc.blocks[idx];
    const cfg: Record<string, any> = block?.config || {};

    // 1. Sincroniza Cabeçalho Superior (header_nav)
    if (block.type === "vitrine_ifood_header" && Array.isArray(cfg.navItems) && cfg.navItems.length > 0) {
      const headerItems = cfg.navItems.map((it: any, i: number) => ({
        id: it.id || `hdr_${i}`,
        label: it.label || it.title || "Item",
        url: it.url || it.href || "/",
        type: "internal" as const,
        icon: it.icon || it.iconName || "Compass",
        image_url: it.image_url || it.imageUrl || undefined,
        badge_text: it.badge_text || it.badge || undefined,
        bg_color: it.bg_color || it.bgColor || undefined,
        text_color: it.text_color || it.textColor || undefined,
        show_text: it.show_text !== false && it.showLabel !== false,
        order: i,
      }));
      const { data: existingHeader } = await db
        .from("navigation_menus")
        .select("id")
        .eq("store_id", storeId)
        .eq("location", "header_nav")
        .maybeSingle();
      if (existingHeader?.id) {
        await db
          .from("navigation_menus")
          .update({ items: headerItems, updated_at: new Date().toISOString() })
          .eq("id", existingHeader.id);
      } else {
        await db.from("navigation_menus").insert({
          store_id: storeId,
          title: "Cabeçalho Superior Global",
          location: "header_nav",
          items: headerItems,
        });
      }
    }

    // 2. Sincroniza Menu Lateral (explore_menu + hotpages drawer_module)
    if (block.type === "vitrine_lateral_drawer") {
      const drawerSections = Array.isArray(cfg.sections) ? cfg.sections : [];
      const flatDrawerItems = drawerSections.length > 0
        ? drawerSections.flatMap((sec: any) =>
            (Array.isArray(sec.items) ? sec.items : []).map((it: any) => ({
              ...it,
              _sectionKey: String(sec.id || "explorar").replace(/^sec-drawer-/, ""),
              _sectionTitle: sec.title || "Destaques para Explorar",
            })),
          )
        : Array.isArray(cfg.items)
          ? cfg.items
          : [];
      if (flatDrawerItems.length > 0) {
        const menuItems = flatDrawerItems.map((it: any, i: number) => ({
          id: it.id || `nav_${i}`,
          label: it.label || it.title || "Item",
          url: it.href || it.url || "/",
          type: "internal" as const,
          icon: it.icon || it.iconName || "Compass",
          image_url: it.imageUrl || it.image_url || undefined,
          badge_text: it.badge || it.badge_text || undefined,
          bg_color: it.bgColor || it.bg_color || undefined,
          text_color: it.textColor || it.text_color || undefined,
          show_text: it.showLabel !== false,
          order: i,
        }));
        const { data: existingMenu } = await db
          .from("navigation_menus")
          .select("id")
          .eq("store_id", storeId)
          .eq("location", "explore_menu")
          .maybeSingle();
        if (existingMenu?.id) {
          await db
            .from("navigation_menus")
            .update({ items: menuItems, updated_at: new Date().toISOString() })
            .eq("id", existingMenu.id);
        } else {
          await db.from("navigation_menus").insert({
            store_id: storeId,
            title: cfg.drawerTitle || cfg.greetingTitle || "Menu Lateral Global (Hambúrguer)",
            location: "explore_menu",
            items: menuItems,
          });
        }

        // Sincroniza itens com hotpages (template_type = 'drawer_module') para SuperAppModuleDrawer
        for (let dIdx = 0; dIdx < flatDrawerItems.length; dIdx++) {
          const dItem: any = flatDrawerItems[dIdx];
          const slugCandidate = String(
            dItem.slug ||
              `drawer-${String(dItem.label || dItem.title || dIdx)
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "")}`,
          );
          const { data: existingDrawerHp } = await db
            .from("hotpages")
            .select("id, filter_rules")
            .eq("slug", slugCandidate)
            .maybeSingle();
          const mergedRules = {
            ...((existingDrawerHp?.filter_rules as Record<string, any>) || {}),
            section_key: dItem._sectionKey || "explorar",
            section_title: dItem._sectionTitle || "Destaques para Explorar",
            card_variant: dItem.cardVariant || "squircle",
          };
          const hpPayload: Record<string, any> = {
            slug: slugCandidate,
            title: dItem.label || dItem.title || "Módulo",
            badge_label: dItem.badge || null,
            target_route: dItem.href || dItem.url || "/",
            template_type: "drawer_module",
            icon_name: dItem.icon || dItem.iconName || "Compass",
            custom_icon_url: dItem.imageUrl || dItem.image_url || null,
            icon_url: dItem.imageUrl || dItem.image_url || null,
            bg_color: dItem.bgColor || dItem.bg_color || null,
            text_color: dItem.textColor || dItem.text_color || null,
            sort_order: dIdx + 1,
            is_active: dItem.isActive !== false,
            filter_rules: mergedRules,
          };
          if (existingDrawerHp?.id) {
            await db.from("hotpages").update(hpPayload).eq("id", existingDrawerHp.id);
          } else {
            await db.from("hotpages").insert({ ...hpPayload, module: "home", show_title: true });
          }
        }
      }
    }

    // 3. Sincroniza Banners Metamórficos com a tabela `banners` (listActiveBanners)
    if (block.type === "vitrine_metamorphic_banner" && Array.isArray(cfg.slides) && cfg.slides.length > 0) {
      const targetPlacement = String(
        cfg.cmsBannerPlacement || (pageSlug === "menus" || !pageSlug ? "home" : pageSlug),
      );
      for (let sIdx = 0; sIdx < cfg.slides.length; sIdx++) {
        const sl: any = cfg.slides[sIdx];
        const mediaUrl = sl.videoUrl || sl.imageDesktopUrl || sl.imageUrl || sl.imageMobileUrl || "";
        if (!mediaUrl) continue;
        const bannerPayload: Record<string, any> = {
          title: sl.title || "Banner",
          subtitle: sl.subtitle || null,
          badge_text: sl.badge || null,
          media_url: mediaUrl,
          media_desktop_url: sl.imageDesktopUrl || sl.imageUrl || mediaUrl,
          media_mobile_url: sl.imageMobileUrl || sl.imageDesktopUrl || sl.imageUrl || mediaUrl,
          media_type: sl.videoUrl ? "video" : "image",
          target_type: "external_url",
          target_url: sl.href || `/${targetPlacement}`,
          cta_label: sl.ctaLabel || "Conferir",
          placement: targetPlacement,
          city_filter: sl.cityFilter || null,
          starts_at: sl.startsAt || new Date().toISOString(),
          ends_at: sl.endsAt || null,
          auto_archive_at: sl.autoArchiveAt || null,
          bg_color: sl.bgColor || null,
          show_overlay: sl.showOverlay !== false,
          show_title: sl.showOverlay !== false && sl.showTitle !== false,
          show_description: sl.showOverlay !== false && sl.showDescription !== false,
          show_badge: sl.showOverlay !== false && sl.showBadge !== false,
          show_cta: sl.showOverlay !== false && sl.showCta !== false,
          sort_order: sIdx + 1,
          is_active: block.isVisible !== false,
        };
        const isUuid = typeof sl.id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sl.id);
        if (isUuid) {
          const { data: existB } = await db.from("banners").select("id").eq("id", sl.id).maybeSingle();
          if (existB?.id) {
            await db.from("banners").update(bannerPayload).eq("id", existB.id);
            continue;
          }
        }
        await db.from("banners").insert(bannerPayload);
      }
    }

    // 4. Sincroniza Botões & Categorias de Verticais com `hotpages` (listHotpages)
    if (
      block.type === "vitrine_buttons_dock" &&
      Array.isArray(cfg.items) &&
      cfg.items.length > 0 &&
      (cfg.cmsHotpageModule || (pageSlug && !["home", "menus", "explorar", "chat_noor"].includes(pageSlug)))
    ) {
      const targetModule = String(cfg.cmsHotpageModule || pageSlug);
      for (let bIdx = 0; bIdx < cfg.items.length; bIdx++) {
        const it: any = cfg.items[bIdx];
        const slugCandidate = String(
          it.slug ||
            `${targetModule}-${String(it.label || it.title || bIdx)
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "")}`,
        );
        const { data: existHp } = await db
          .from("hotpages")
          .select("id")
          .eq("slug", slugCandidate)
          .maybeSingle();
        const hpData: Record<string, any> = {
          slug: slugCandidate,
          title: it.label || "Categoria",
          description: it.subtitle || null,
          badge_label: it.badge || null,
          icon_name: it.iconName || "Tag",
          custom_icon_url: it.imageUrl || it.imageMobileUrl || null,
          icon_url: it.imageUrl || it.imageMobileUrl || null,
          cover_image_url: it.imageDesktopUrl || it.imageUrl || null,
          target_route: it.href || `/${targetModule}`,
          bg_color: it.bgColor || null,
          text_color: it.textColor || null,
          city_filter: it.cityFilter || null,
          starts_at: it.startsAt || null,
          ends_at: it.endsAt || null,
          module: targetModule,
          template_type: "category_hub",
          sort_order: bIdx + 1,
          show_title: it.showLabel !== false,
          is_active: true,
        };
        if (existHp?.id) {
          await db.from("hotpages").update(hpData).eq("id", existHp.id);
        } else {
          await db.from("hotpages").insert(hpData);
        }
      }
    }

    // 5. Sincroniza Seções da Home / Explorar / Chat Noor (`home_page_sections` + `home_section_items`)
    let cmsKey = cfg.cmsSectionKey as string | undefined;
    if (
      !cmsKey &&
      ["home", "menus", "explorar", "chat_noor"].includes(pageSlug) &&
      ![
        "vitrine_ifood_header",
        "vitrine_lateral_drawer",
      ].includes(block.type)
    ) {
      cmsKey = `omni_${pageSlug}_${block.type}_${idx}`;
    }

    if (cmsKey) {
      let secId = cfg.cmsSectionId as string | undefined;
      if (!secId || secId.startsWith("virtual-")) {
        const materialized = await ensureCanonicalHomeSectionMaterialized(db, cmsKey);
        secId = materialized?.realSectionId || undefined;
      }
      if (!secId) {
        const { data: createdHomeSec } = await db
          .from("home_page_sections")
          .insert({
            section_key: cmsKey,
            title: cfg.sectionTitle ?? cfg.title ?? "Nova Seção",
            subtitle: cfg.sectionSubtitle ?? cfg.subtitle ?? "",
            section_type:
              block.type === "vitrine_buttons_dock"
                ? "grid_2d"
                : block.type === "vitrine_bento_tetris"
                  ? "cards_action_grid"
                  : block.type === "vitrine_metamorphic_banner"
                    ? "carousel"
                    : block.type === "vitrine_coupon_strip"
                      ? "promo_strip_timer"
                      : "rail",
            sort_order: idx + 1,
            is_active: block.isVisible !== false,
          })
          .select("id")
          .maybeSingle();
        secId = createdHomeSec?.id;
      }
      if (!secId) continue;

      await db
        .from("home_page_sections")
        .update({
          title: cfg.sectionTitle ?? cfg.title ?? "",
          subtitle: cfg.sectionSubtitle ?? cfg.subtitle ?? "",
          is_active: block.isVisible !== false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", secId);

      let rawItems: any[] = [];
      if (block.type === "vitrine_buttons_dock" && Array.isArray(cfg.items)) {
        rawItems = cfg.items.map((it: any, i: number) => ({
          id: it.id,
          section_id: secId,
          title: it.label || "Botão",
          subtitle: it.subtitle || null,
          badge_text: it.badge || null,
          icon_name: it.iconName || "Tag",
          image_url: it.imageUrl || it.imageDesktopUrl || it.imageMobileUrl || "",
          mobile_image_url: it.imageMobileUrl || it.imageUrl || null,
          target_url: it.href || "/",
          button_shape: it.shape || cfg.defaultShape || "squircle",
          bg_color: it.bgColor || null,
          text_color: it.textColor || null,
          show_text: it.showLabel !== false,
          city_filter: it.cityFilter || null,
          starts_at: it.startsAt || null,
          ends_at: it.endsAt || null,
          metadata: {
            gradient: it.gradient || undefined,
            shadow_mode: it.shadowMode || undefined,
            hover_effect: it.hoverEffect || undefined,
          },
          sort_order: i + 1,
          is_active: true,
        }));
      } else if (block.type === "vitrine_bento_tetris" && Array.isArray(cfg.tiles)) {
        rawItems = cfg.tiles.map((t: any, i: number) => ({
          id: t.id,
          section_id: secId,
          title: t.title || "Bloco",
          subtitle: t.subtitle || null,
          badge_text: t.tag || null,
          icon_name: t.iconName || "Sparkles",
          image_url: t.imageUrl || t.imageDesktopUrl || t.imageMobileUrl || "",
          mobile_image_url: t.imageMobileUrl || t.imageUrl || null,
          target_url: t.href || "/",
          button_shape: "squircle",
          bg_color: t.bgColor || null,
          text_color: t.textColor || null,
          show_text: true,
          city_filter: t.cityFilter || null,
          starts_at: t.startsAt || null,
          ends_at: t.endsAt || null,
          metadata: {
            span: t.spanX || 1,
            gradient: t.gradient || undefined,
            shadow_mode: t.shadowMode || undefined,
          },
          sort_order: i + 1,
          is_active: true,
        }));
      } else if (block.type === "vitrine_metamorphic_banner" && Array.isArray(cfg.slides)) {
        rawItems = cfg.slides.map((sl: any, i: number) => ({
          id: sl.id,
          section_id: secId,
          title: sl.title || "Banner",
          subtitle: sl.subtitle || null,
          badge_text: sl.badge || null,
          image_url: sl.imageDesktopUrl || sl.imageUrl || "",
          mobile_image_url: sl.imageMobileUrl || sl.imageDesktopUrl || sl.imageUrl || null,
          target_url: sl.href || "/ofertas",
          button_shape: "banner",
          bg_color: sl.bgColor || null,
          text_color: sl.textColor || null,
          show_text: sl.showOverlay !== false,
          city_filter: sl.cityFilter || null,
          starts_at: sl.startsAt || null,
          ends_at: sl.endsAt || null,
          metadata: {
            video_url: sl.videoUrl || undefined,
            autoplay: sl.autoPlay !== false,
            loop: sl.loop !== false,
            muted: sl.muted !== false,
            controls: Boolean(sl.controls),
            gradient: sl.gradient || undefined,
          },
          sort_order: i + 1,
          is_active: true,
        }));
      } else if (block.type === "vitrine_coupon_strip") {
        rawItems = [
          {
            section_id: secId,
            title: cfg.title || "Campanha Especial",
            subtitle: cfg.subtitle || null,
            badge_text: cfg.badge || "OFERTA",
            image_url: "",
            target_url: cfg.href || "/ofertas",
            button_shape: "pill",
            bg_color: cfg.bgColor || null,
            text_color: cfg.textColor || null,
            show_text: true,
            city_filter: cfg.cityFilter || null,
            starts_at: cfg.startsAt || null,
            ends_at: cfg.timerExpiresAt || cfg.endsAt || null,
            metadata: {
              coupon_code: cfg.couponCode || "WAESY10",
              gradient: cfg.gradient || undefined,
            },
            sort_order: 1,
            is_active: true,
          },
        ];
      } else if (block.type === "vitrine_subcategory_pills" && Array.isArray(cfg.items)) {
        rawItems = cfg.items.map((it: any, i: number) => ({
          id: it.id,
          section_id: secId,
          title: it.label || "Subcategoria",
          badge_text: it.badge || null,
          image_url: it.imageUrl || "",
          target_url: it.href || "/",
          button_shape: "squircle",
          show_text: cfg.showText !== false,
          sort_order: i + 1,
          is_active: true,
        }));
      } else if (block.type === "vitrine_feature_mini_banners" && Array.isArray(cfg.items)) {
        rawItems = cfg.items.map((it: any, i: number) => ({
          id: it.id,
          section_id: secId,
          title: it.title || "Destaque",
          badge_text: it.badge || null,
          image_url: it.imageUrl || "",
          target_url: it.to || "/",
          bg_color: it.bgColor || null,
          button_shape: "banner",
          show_text: true,
          sort_order: i + 1,
          is_active: true,
        }));
      }

      if (rawItems.length > 0) {
        await db.from("home_section_items").delete().eq("section_id", secId);
        const cleanInsert = rawItems.map(({ id: _omitId, ...rest }) => rest);
        await db.from("home_section_items").insert(cleanInsert);
      }
    }

    const surfSecId = cfg.cmsSurfaceSectionId as string | undefined;
    const sectionMetaPatch: Record<string, any> = {
      title: cfg.sectionTitle ?? cfg.title ?? "",
      subtitle: cfg.sectionSubtitle ?? cfg.subtitle ?? "",
      item_limit: Number(cfg.maxItems) || 8,
      ranking_strategy: cfg.rankingStrategy || "random_shuffle",
      city_filter: cfg.cityFilter || null,
      starts_at: cfg.startsAt || null,
      ends_at: cfg.endsAt || null,
      auto_archive_at: cfg.autoArchiveAt || null,
      is_active: block.isVisible !== false,
      updated_at: new Date().toISOString(),
    };
    if (surfSecId) {
      const updatePayload: Record<string, any> = {
        ...sectionMetaPatch,
      };
      if (block.type === "vitrine_buttons_dock" && Array.isArray(cfg.items)) {
        updatePayload.config = {
          buttons: cfg.items.map((it: any) => ({
            id: it.id,
            label: it.label || "Botão",
            icon: it.iconName || "Tag",
            image_url: it.imageUrl || it.imageDesktopUrl || it.imageMobileUrl || "",
            url: it.href || "/",
            badge: it.badge || "",
            color: it.bgColor || "",
            text_color: it.textColor || "",
            shape: it.shape || "squircle",
            show_text: it.showLabel !== false,
          })),
        };
      }
      await db.from("marketplace_sections").update(updatePayload).eq("id", surfSecId);
    } else if (
      pageSlug &&
      !["home", "menus", "explorar", "chat_noor"].includes(pageSlug) &&
      !["vitrine_ifood_header", "vitrine_lateral_drawer"].includes(block.type)
    ) {
      let { data: surfRow } = await db
        .from("marketplace_surfaces")
        .select("id")
        .eq("slug", pageSlug)
        .maybeSingle();
      if (!surfRow?.id) {
        const { data: createdSurf } = await db
          .from("marketplace_surfaces")
          .insert({
            slug: pageSlug,
            title: omniDoc.title || `Vitrine ${pageSlug}`,
            is_global: true,
          })
          .select("id")
          .maybeSingle();
        surfRow = createdSurf;
      }
      if (surfRow?.id) {
        const sectionType =
          block.type === "vitrine_buttons_dock"
            ? "custom_buttons_rail"
            : block.type === "vitrine_metamorphic_banner"
              ? "banner_hero"
              : block.type === "vitrine_classifieds_rail"
                ? "classifieds_spotlight"
                : block.type === "vitrine_social_stream"
                  ? "social_posts_rail"
                  : "product_carousel";
        const newConfig: Record<string, any> =
          block.type === "vitrine_buttons_dock" && Array.isArray(cfg.items)
            ? {
                buttons: cfg.items.map((it: any) => ({
                  id: it.id,
                  label: it.label || "Botão",
                  icon: it.iconName || "Tag",
                  image_url: it.imageUrl || it.imageDesktopUrl || it.imageMobileUrl || "",
                  url: it.href || "/",
                  badge: it.badge || "",
                  color: it.bgColor || "",
                  text_color: it.textColor || "",
                  shape: it.shape || "squircle",
                  show_text: it.showLabel !== false,
                })),
              }
            : {};
        const { data: existingSecBySort } = await db
          .from("marketplace_sections")
          .select("id")
          .eq("surface_id", surfRow.id)
          .eq("type", sectionType)
          .eq("sort_order", idx + 1)
          .maybeSingle();
        if (existingSecBySort?.id) {
          await db
            .from("marketplace_sections")
            .update({
              ...sectionMetaPatch,
              config: newConfig,
            })
            .eq("id", existingSecBySort.id);
        } else {
          await db.from("marketplace_sections").insert({
            surface_id: surfRow.id,
            ...sectionMetaPatch,
            type: sectionType,
            config: newConfig,
            sort_order: idx + 1,
          });
        }
      }
    }
  }
}

// ── 1. SALVAMENTO ATÔMICO DO DOCUMENTO NO SUPABASE ──
export const saveOmniPageDocument = createServerFn({ method: "POST" })
  .validator(
    z.object({
      documentId: z.string().uuid(),
      document: OmniPageDocumentSchema,
    })
  )
  .handler(async ({ data: input }) => {
    try {
      await requireAdmin();
      const identity = await getServerIdentity();
      if (!identity.id) {
        throw new Error("Sessão administrativa não autenticada.");
      }

      const db = getServerClient();
      const targetStoreId = await resolveBuilderStoreId(db, identity.store_id, input.documentId);

      const { data: docMeta } = await db
        .from("experience_documents")
        .select("settings")
        .eq("id", input.documentId)
        .maybeSingle();

      const { data: result, error: persistErr } = await db.rpc("persist_omni_document_snapshot", {
        p_document_id: input.documentId,
        p_store_id: targetStoreId,
        p_actor_id: identity.id,
        p_snapshot: input.document,
        p_publish: false,
      });

      if (persistErr || !result?.version_id) {
        throw persistErr || new Error("Persistência do draft não confirmada.");
      }

      await syncOmniDocumentToPlatformCms(
        db,
        targetStoreId,
        (docMeta?.settings as Record<string, any>) || {},
        input.document,
      );

      return {
        status: "ok" as const,
        document: input.document,
        version_id: result.version_id as string,
        version_number: result.version_number as number,
        idempotent: Boolean(result.idempotent),
      };
    } catch (e: unknown) {
      if (e instanceof SupabaseUnconfiguredError) throw e;
      console.error("[omni-builder.functions] saveOmniPageDocument error:", e);
      throw new Error(
        (e instanceof Error ? e.message : String(e)) || "Erro ao persistir documento do builder."
      );
    }
  });

// ── 2. CARREGAMENTO E HIDRATAÇÃO DO DOCUMENTO ──
export const getOmniPageDocument = createServerFn({ method: "GET" })
  .validator(
    z.object({
      documentId: z.string().uuid(),
    })
  )
  .handler(async ({ data: input }) => {
    try {
      const identity = await getServerIdentity();
      if (!identity.id) {
        throw new Error("Não autenticado.");
      }

      const db = getServerClient();
      const targetStoreId = await resolveBuilderStoreId(db, identity.store_id, input.documentId);

      const { data: doc, error: docError } = await db
        .from("experience_documents")
        .select("*")
        .eq("id", input.documentId)
        .eq("store_id", targetStoreId)
        .maybeSingle();

      if (docError) throw docError;
      if (!doc) throw new Error("Documento não encontrado.");

      const settings = (doc.settings || {}) as Record<string, any>;
      let omniDoc: OmniPageDocument;

      const { data: draftVersion, error: draftError } = await db
        .from("experience_versions")
        .select("id, version_number, document_snapshot")
        .eq("document_id", doc.id)
        .eq("status", "draft")
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (draftError) throw draftError;

      // O editor reabre o rascunho; o snapshot legado só é fallback de migração.
      const draftSnapshot = draftVersion?.document_snapshot ?? settings.omni_page_draft ?? settings.omni_page;
      if (draftSnapshot) {
        const parsed = OmniPageDocumentSchema.safeParse(draftSnapshot);
        if (parsed.success) {
          omniDoc = parsed.data;
        } else {
          console.warn("[omni-builder.functions] omni_page corrompido, regenerando canônico:", parsed.error);
          omniDoc = createEmptyOmniPage(doc.slug || "pagina", doc.title || "Nova Página", (doc.document_type as any) || "general");
          omniDoc.id = doc.id;
        }
      } else {
        // Inicializa com documento canônico populado
        omniDoc = createEmptyOmniPage(doc.slug || "pagina", doc.title || "Nova Página", (doc.document_type as any) || "general");
        omniDoc.id = doc.id;

        // Se a página for vazia, injeta template base correspondente
        if (doc.document_type === "storefront") {
          omniDoc = applyTemplateToPage(omniDoc, "template_gastronomy");
        } else {
          omniDoc = applyTemplateToPage(omniDoc, "template_legal_jus");
        }
      }

      return {
        status: "ok" as const,
        document: omniDoc,
        rawDocument: {
          id: doc.id,
          store_id: doc.store_id,
          title: doc.title,
          slug: doc.slug,
          document_type: doc.document_type,
          is_active: doc.is_active,
        },
        version: draftVersion
          ? { id: draftVersion.id, version_number: draftVersion.version_number, status: "draft" as const }
          : null,
      };
    } catch (e: unknown) {
      if (e instanceof SupabaseUnconfiguredError) throw e;
      console.error("[omni-builder.functions] getOmniPageDocument error:", e);
      throw new Error(
        (e instanceof Error ? e.message : String(e)) || "Erro ao carregar documento do builder."
      );
    }
  });

// ── 3. PUBLICAÇÃO IMEDIATA NO SUPABASE ──
export const publishOmniPageDocument = createServerFn({ method: "POST" })
  .validator(
    z.object({
      documentId: z.string().uuid(),
      document: OmniPageDocumentSchema,
    })
  )
  .handler(async ({ data: input }) => {
    try {
      await requireAdmin();
      const identity = await getServerIdentity();
      if (!identity.id) {
        throw new Error("Sessão administrativa não autenticada.");
      }

      const db = getServerClient();
      const targetStoreId = await resolveBuilderStoreId(db, identity.store_id, input.documentId);

      const { data: docMeta } = await db
        .from("experience_documents")
        .select("settings, slug")
        .eq("id", input.documentId)
        .maybeSingle();

      const unsplashRefs = input.document.blocks.flatMap((block) => block.assetRefs ?? []).filter((asset) => asset.provider === "unsplash");
      if (unsplashRefs.length > 0) {
        if (unsplashRefs.some((asset) => !asset.source_asset_id || !asset.usage_slot)) {
          throw new Error("Publicação bloqueada: referência Unsplash sem foto ou slot de uso verificado.");
        }
        const photoIds = Array.from(new Set(unsplashRefs.map((asset) => asset.source_asset_id as string)));
        const { data: ledgerRows, error: ledgerError } = await db
          .from("unsplash_studio_selections")
          .select("photo_id, usage_slot, image_url, photo_page_url, creator_name, creator_profile_url, license_id, license_url")
          .eq("store_id", targetStoreId)
          .in("photo_id", photoIds);
        if (ledgerError) throw new Error("Não foi possível verificar o ledger Unsplash. A publicação falhou de forma segura; confira se as migrations estão aplicadas.");
        const unverifiable = unsplashRefs.filter((asset) => !ledgerRows?.some((row) => matchesUnsplashSelectionLedger(asset, row)));
        if (unverifiable.length > 0) {
          throw new Error(`Publicação bloqueada: ${unverifiable.length} asset(s) Unsplash não correspondem a uma seleção e tracking verificados nesta loja. Selecione novamente pelo picker oficial.`);
        }
      }

      const studioUploadRefs = input.document.blocks
        .flatMap((block) => block.assetRefs ?? [])
        .filter((asset) => asset.provider === "upload");
      if (studioUploadRefs.length > 0) {
        if (studioUploadRefs.some((asset) => !asset.asset_id || !asset.source_asset_id || !asset.usage_slot)) {
          throw new Error("Publicação bloqueada: upload Studio sem ID, caminho ou slot de uso verificável.");
        }
        const assetIds = Array.from(new Set(studioUploadRefs.map((asset) => asset.asset_id)));
        const { data: uploadLedgerRows, error: uploadLedgerError } = await db
          .from("media_assets")
          .select("id, store_id, bucket_name, file_path, public_url, mime_type, studio_usage_slot, rights_attested_at, rights_attested_by, rights_attestation_version")
          .eq("store_id", targetStoreId)
          .in("id", assetIds);
        if (uploadLedgerError) {
          throw new Error("Não foi possível verificar o ledger de uploads Studio. A publicação falhou de forma segura; confira se a migration de provenance está aplicada.");
        }
        const unverifiableUploads = studioUploadRefs.filter((asset) =>
          !uploadLedgerRows?.some((row) => matchesStudioUploadAssetLedger(asset, row, targetStoreId)),
        );
        if (unverifiableUploads.length > 0) {
          throw new Error(`Publicação bloqueada: ${unverifiableUploads.length} upload(s) não correspondem ao ledger de direitos desta loja. Reenvie pelo MediaUploader do Omni Studio.`);
        }
      }

      const docSettings = (docMeta?.settings as Record<string, any>) || {};
      const isPlatformDoc = Boolean(docSettings.is_platform_surface || docSettings.platform_page_slug);

      if (!isPlatformDoc) {
        const audit = auditOmniDocument(input.document);
        const blockingFindings = getPublicationBlockingFindings(audit);
        if (blockingFindings.length > 0) {
          const summary = blockingFindings
            .slice(0, 5)
            .map((finding) => `${finding.ruleId} (${finding.path}): ${finding.message}`)
            .join("; ");
          throw new Error(`Publicação bloqueada pela auditoria do Waesy Studio: ${summary}`);
        }
      }

      const { data: result, error: persistErr } = await db.rpc("persist_omni_document_snapshot", {
        p_document_id: input.documentId,
        p_store_id: targetStoreId,
        p_actor_id: identity.id,
        p_snapshot: input.document,
        p_publish: true,
      });

      if (persistErr || !result?.version_id || result.version_status !== "published") {
        throw persistErr || new Error("Publicação não confirmada.");
      }

      await syncOmniDocumentToPlatformCms(db, targetStoreId, docSettings, input.document);

      const pageSlug = docSettings.platform_page_slug || input.document.slug;
      const publicUrl = isPlatformDoc
        ? pageSlug === "home" || pageSlug === "menus"
          ? "/"
          : pageSlug === "chat_noor"
            ? "/chats"
            : `/${pageSlug}`
        : `/paginas/${input.document.slug}`;

      return {
        status: "ok" as const,
        version_id: result.version_id as string,
        version_number: result.version_number as number,
        published_at: new Date().toISOString(),
        public_url: publicUrl,
      };
    } catch (e: unknown) {
      if (e instanceof SupabaseUnconfiguredError) throw e;
      console.error("[omni-builder.functions] publishOmniPageDocument error:", e);
      throw new Error(
        (e instanceof Error ? e.message : String(e)) || "Erro ao publicar página no banco."
      );
    }
  });
