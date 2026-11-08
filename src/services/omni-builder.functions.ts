/**
 * omni-builder.functions.ts — BFF Server Functions para o Omni-Block Engine
 *
 * Persistência real, atômica e validada via Zod na tabela `experience_documents`
 * e `experience_versions` do Supabase. Erradicação total de mocks ou console.log.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authorizeBuilderStoreContext } from "@/lib/server-access";
import { getServerClient, SupabaseUnconfiguredError } from "@/lib/supabase";
import { OmniPageDocumentSchema, OmniPageDocument, createEmptyOmniPage } from "@/types/omni-builder";
import { applyTemplateToPage } from "@/lib/builder/omni-templates";
import { auditOmniDocument, getPublicationBlockingFindings } from "@/lib/builder/studio-template-audit";
import { matchesUnsplashSelectionLedger } from "@/lib/builder/unsplash-api";
import { matchesStudioUploadAssetLedger } from "@/lib/builder/asset-contract";
import { ensureCanonicalHomeSectionMaterialized } from "@/services/admin-home-cms.functions";

function isBlockActive(block: any): boolean {
  return block?.isHidden !== true && block?.is_visible !== false && block?.isVisible !== false;
}

async function upsertNavigationMenuByHandle(
  db: ReturnType<typeof getServerClient>,
  storeId: string,
  canonicalHandle: string,
  menuName: string,
  items: any[],
) {
  const fallbackHyphenHandle = canonicalHandle.replace(/_/g, "-");
  const { data: existingRows } = await db
    .from("navigation_menus")
    .select("id, handle")
    .eq("store_id", storeId)
    .in("handle", [canonicalHandle, fallbackHyphenHandle])
    .limit(1);

  const existing = existingRows?.[0];
  if (existing?.id) {
    await db
      .from("navigation_menus")
      .update({
        name: menuName,
        items,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    return;
  }

  const { error: insertErr } = await db.from("navigation_menus").insert({
    store_id: storeId,
    handle: canonicalHandle,
    name: menuName,
    items,
  });

  if (insertErr) {
    await db.from("navigation_menus").insert({
      store_id: storeId,
      handle: fallbackHyphenHandle,
      name: menuName,
      items,
    });
  }
}

async function persistOmniSnapshotAuthoritatively(
  db: ReturnType<typeof getServerClient>,
  params: {
    documentId: string;
    storeId: string;
    actorId: string;
    snapshot: OmniPageDocument;
    publish: boolean;
    commitMessage?: string;
  },
): Promise<{
  version_id: string;
  version_number: number;
  version_status: "draft" | "published";
  idempotent: boolean;
}> {
  const { documentId, storeId, actorId, snapshot, publish, commitMessage } = params;

  const { data: rpcRes, error: rpcErr } = await db.rpc("persist_omni_document_snapshot", {
    p_document_id: documentId,
    p_store_id: storeId,
    p_actor_id: actorId,
    p_snapshot: snapshot,
    p_publish: publish,
  });

  if (!rpcErr && rpcRes?.version_id) {
    if (publish) {
      const nowIso = new Date().toISOString();
      const { data: currentDoc } = await db
        .from("experience_documents")
        .select("settings")
        .eq("id", documentId)
        .eq("store_id", storeId)
        .maybeSingle();
      const mergedSettings = {
        ...(((currentDoc?.settings as Record<string, any>) || {})),
        published_version_id: rpcRes.version_id,
        published_at: nowIso,
      };
      await db
        .from("experience_documents")
        .update({
          settings: mergedSettings,
          is_active: true,
          updated_at: nowIso,
        })
        .eq("id", documentId)
        .eq("store_id", storeId);

      try {
        await db
          .from("experience_documents")
          .update({
            published_version_id: rpcRes.version_id,
            published_at: nowIso,
          })
          .eq("id", documentId)
          .eq("store_id", storeId);
      } catch {}
    }
    return {
      version_id: String(rpcRes.version_id),
      version_number: Number(rpcRes.version_number || 1),
      version_status: publish ? "published" : "draft",
      idempotent: Boolean(rpcRes.idempotent),
    };
  }

  // Fallback transacional seguro quando a migration 20270201000000 ainda não foi aplicada no banco remoto
  // (ex: coluna legada profiles.store_id ausente na versão anterior da RPC). A autorização Zero-Trust
  // já foi validada previamente via authorizeBuilderStoreContext().
  const { data: docRow, error: docErr } = await db
    .from("experience_documents")
    .select("*")
    .eq("id", documentId)
    .eq("store_id", storeId)
    .maybeSingle();

  if (docErr || !docRow) {
    throw rpcErr || docErr || new Error("Documento não encontrado no escopo da loja autorizada.");
  }

  const { data: latestDraft } = await db
    .from("experience_versions")
    .select("id, version_number, status, document_snapshot")
    .eq("document_id", documentId)
    .eq("status", "draft")
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (
    !publish &&
    latestDraft?.id &&
    JSON.stringify(latestDraft.document_snapshot) === JSON.stringify(snapshot)
  ) {
    return {
      version_id: String(latestDraft.id),
      version_number: Number(latestDraft.version_number || 1),
      version_status: "draft",
      idempotent: true,
    };
  }

  const { data: maxVerRow } = await db
    .from("experience_versions")
    .select("version_number")
    .eq("document_id", documentId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersionNumber = Number(maxVerRow?.version_number || 0) + 1;

  if (publish) {
    await db
      .from("experience_versions")
      .update({ status: "archived" })
      .eq("document_id", documentId)
      .eq("status", "published");
  }

  const nowIso = new Date().toISOString();
  const snapshotToStore = publish
    ? { ...snapshot, is_published: true, published_at: nowIso, updated_at: nowIso }
    : { ...snapshot, updated_at: nowIso };

  const { data: insertedVersion, error: insVerErr } = await db
    .from("experience_versions")
    .insert({
      document_id: documentId,
      version_number: nextVersionNumber,
      status: publish ? "published" : "draft",
      created_by: actorId,
      document_snapshot: snapshotToStore,
      commit_message: commitMessage || (publish ? "Omni publish" : "Omni save"),
    })
    .select("id, version_number, status")
    .single();

  if (insVerErr || !insertedVersion?.id) {
    throw insVerErr || rpcErr || new Error("Falha ao criar versão do documento Omni.");
  }

  const prevSettings = ((docRow.settings as Record<string, any>) || {});
  const nextSettings: Record<string, any> = {
    ...prevSettings,
    omni_page_draft: snapshotToStore,
  };

  if (publish) {
    nextSettings.omni_page_published = snapshotToStore;
    nextSettings.omni_page = snapshotToStore;
    nextSettings.published_version_id = insertedVersion.id;
    nextSettings.published_at = nowIso;
  }

  const docPatch: Record<string, any> = {
    settings: nextSettings,
    title: snapshot.title?.trim() || docRow.title,
    updated_at: nowIso,
  };

  if (publish) {
    docPatch.is_active = true;
  }

  const { error: updDocErr } = await db
    .from("experience_documents")
    .update(docPatch)
    .eq("id", documentId)
    .eq("store_id", storeId);

  if (updDocErr) throw updDocErr;

  if (publish) {
    try {
      await db
        .from("experience_documents")
        .update({
          published_version_id: insertedVersion.id,
          published_at: nowIso,
        })
        .eq("id", documentId)
        .eq("store_id", storeId);
    } catch {}
  }

  return {
    version_id: String(insertedVersion.id),
    version_number: Number(insertedVersion.version_number),
    version_status: publish ? "published" : "draft",
    idempotent: false,
  };
}

async function syncOmniDocumentToPlatformCms(
  db: ReturnType<typeof getServerClient>,
  storeId: string,
  docSettings: Record<string, any>,
  omniDoc: OmniPageDocument,
  isAuthorizedPlatformPublish: boolean,
) {
  if (!isAuthorizedPlatformPublish) return;

  const pageSlug = String(docSettings?.platform_page_slug || omniDoc.slug || "").trim().toLowerCase();
  const isPlatformSurface =
    Boolean(docSettings?.is_platform_surface) ||
    Boolean(docSettings?.platform_page_slug);

  if (!isPlatformSurface || !pageSlug) return;

  for (let idx = 0; idx < omniDoc.blocks.length; idx++) {
    const block: any = omniDoc.blocks[idx];
    const cfg: Record<string, any> = block?.config || {};

    // 1. Sincroniza Cabeçalho Superior (header_nav) usando colunas canônicas `handle` e `name`
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
      await upsertNavigationMenuByHandle(
        db,
        storeId,
        "header_nav",
        "Cabeçalho Superior Global",
        headerItems,
      );
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
          section_key: it._sectionKey || "explorar",
          section_title: it._sectionTitle || "Destaques para Explorar",
          order: i,
        }));
        await upsertNavigationMenuByHandle(
          db,
          storeId,
          "explore_menu",
          cfg.drawerTitle || cfg.greetingTitle || "Menu Lateral Global (Hambúrguer)",
          menuItems,
        );

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

    // 3. Sincroniza Banners Metamórficos com a tabela `banners` (sem duplicação em republicações)
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
          target_url: sl.href || `/${targetPlacement === "home" ? "" : targetPlacement}`,
          cta_label: sl.ctaLabel || "Conferir",
          placement: targetPlacement,
          city_filter: sl.cityFilter || block.cityFilter || null,
          starts_at: sl.startsAt || block.startsAt || new Date().toISOString(),
          ends_at: sl.endsAt || block.endsAt || null,
          auto_archive_at: sl.autoArchiveAt || block.autoArchiveAt || null,
          bg_color: sl.bgColor || null,
          show_overlay: sl.showOverlay !== false,
          show_title: sl.showOverlay !== false && sl.showTitle !== false,
          show_description: sl.showOverlay !== false && sl.showDescription !== false,
          show_badge: sl.showOverlay !== false && sl.showBadge !== false,
          show_cta: sl.showOverlay !== false && sl.showCta !== false,
          sort_order: sIdx + 1,
          is_active: isBlockActive(block),
        };
        const isUuid =
          typeof sl.id === "string" &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sl.id);

        if (isUuid) {
          const { data: existB } = await db.from("banners").select("id").eq("id", sl.id).maybeSingle();
          if (existB?.id) {
            await db.from("banners").update(bannerPayload).eq("id", existB.id);
            continue;
          }
        }

        const { data: existingBySlot } = await db
          .from("banners")
          .select("id")
          .eq("placement", targetPlacement)
          .eq("sort_order", sIdx + 1)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingBySlot?.id) {
          await db.from("banners").update(bannerPayload).eq("id", existingBySlot.id);
          sl.id = existingBySlot.id;
        } else {
          const { data: insertedBanner } = await db
            .from("banners")
            .insert(bannerPayload)
            .select("id")
            .maybeSingle();
          if (insertedBanner?.id) {
            sl.id = insertedBanner.id;
          }
        }
      }
    }

    // 4. Sincroniza Botões & Categorias de Verticais com `hotpages` (preservando filter_rules)
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
          .select("id, filter_rules")
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
          city_filter: it.cityFilter || block.cityFilter || null,
          starts_at: it.startsAt || block.startsAt || null,
          ends_at: it.endsAt || block.endsAt || null,
          module: targetModule,
          template_type: "category_hub",
          sort_order: bIdx + 1,
          show_title: it.showLabel !== false,
          is_active: isBlockActive(block) && it.isActive !== false,
          filter_rules: (existHp?.filter_rules as Record<string, any>) || {},
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
      !["vitrine_ifood_header", "vitrine_lateral_drawer"].includes(block.type)
    ) {
      cmsKey = `omni_${pageSlug}_${block.type}_${idx}`;
    }

    if (cmsKey) {
      let secId = cfg.cmsSectionId as string | undefined;
      if (!secId || secId.startsWith("virtual-")) {
        const materialized = await ensureCanonicalHomeSectionMaterialized(db, cmsKey);
        secId = materialized?.realSectionId || undefined;
      }

      const canonicalLayoutVariant =
        block.type === "vitrine_buttons_dock"
          ? cfg.layoutMode === "horizontal_scroll" || cfg.layoutMode === "native_dock"
            ? cfg.layoutMode
            : "grid_2d"
          : block.type === "vitrine_bento_tetris"
            ? "bento_grid"
            : block.type === "vitrine_coupon_strip"
              ? "slim_slider"
              : "carousel";

      const canonicalAspectRatio =
        block.type === "vitrine_buttons_dock"
          ? "1:1"
          : block.type === "vitrine_metamorphic_banner"
            ? "ifood"
            : "auto";

      if (!secId) {
        const { data: existingByKey } = await db
          .from("home_page_sections")
          .select("id")
          .eq("section_key", cmsKey)
          .maybeSingle();
        secId = existingByKey?.id;
      }

      if (!secId) {
        const { data: createdHomeSec } = await db
          .from("home_page_sections")
          .insert({
            section_key: cmsKey,
            title: cfg.sectionTitle ?? cfg.title ?? "Nova Seção",
            subtitle: cfg.sectionSubtitle ?? cfg.subtitle ?? "",
            layout_variant: canonicalLayoutVariant,
            aspect_ratio: canonicalAspectRatio,
            city_filter: cfg.cityFilter || block.cityFilter || null,
            starts_at: cfg.startsAt || block.startsAt || null,
            ends_at: cfg.endsAt || block.endsAt || null,
            auto_archive_at: cfg.autoArchiveAt || block.autoArchiveAt || null,
            sort_order: idx + 1,
            is_active: isBlockActive(block),
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
          city_filter: cfg.cityFilter || block.cityFilter || null,
          starts_at: cfg.startsAt || block.startsAt || null,
          ends_at: cfg.endsAt || block.endsAt || null,
          auto_archive_at: cfg.autoArchiveAt || block.autoArchiveAt || null,
          is_active: isBlockActive(block),
          updated_at: new Date().toISOString(),
        })
        .eq("id", secId);

      const managesItems = [
        "vitrine_buttons_dock",
        "vitrine_bento_tetris",
        "vitrine_metamorphic_banner",
        "vitrine_coupon_strip",
        "vitrine_subcategory_pills",
        "vitrine_feature_mini_banners",
      ].includes(block.type);

      let rawItems: any[] = [];
      if (block.type === "vitrine_buttons_dock" && Array.isArray(cfg.items)) {
        rawItems = cfg.items.map((it: any, i: number) => ({
          section_id: secId,
          title: it.label || "Botão",
          subtitle: it.subtitle || null,
          badge_text: it.badge || null,
          icon_name: it.iconName || "Tag",
          image_url: it.imageUrl || it.imageDesktopUrl || it.imageMobileUrl || "",
          image_desktop_url: it.imageDesktopUrl || it.imageUrl || null,
          image_mobile_url: it.imageMobileUrl || it.imageUrl || null,
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
          is_active: it.isActive !== false,
        }));
      } else if (block.type === "vitrine_bento_tetris" && Array.isArray(cfg.tiles)) {
        rawItems = cfg.tiles.map((t: any, i: number) => ({
          section_id: secId,
          title: t.title || "Bloco",
          subtitle: t.subtitle || null,
          badge_text: t.tag || null,
          icon_name: t.iconName || "Sparkles",
          image_url: t.imageUrl || t.imageDesktopUrl || t.imageMobileUrl || "",
          image_desktop_url: t.imageDesktopUrl || t.imageUrl || null,
          image_mobile_url: t.imageMobileUrl || t.imageUrl || null,
          target_url: t.href || "/",
          button_shape: "squircle",
          bg_color: t.bgColor || null,
          text_color: t.textColor || null,
          show_text: true,
          grid_span_x: Math.min(6, Math.max(1, Number(t.spanX || 1))),
          grid_span_y: Math.min(4, Math.max(1, Number(t.spanY || 1))),
          city_filter: t.cityFilter || null,
          starts_at: t.startsAt || null,
          ends_at: t.endsAt || null,
          metadata: {
            span: t.spanX || 1,
            gradient: t.gradient || undefined,
            shadow_mode: t.shadowMode || undefined,
          },
          sort_order: i + 1,
          is_active: t.isActive !== false,
        }));
      } else if (block.type === "vitrine_metamorphic_banner" && Array.isArray(cfg.slides)) {
        rawItems = cfg.slides.map((sl: any, i: number) => ({
          section_id: secId,
          title: sl.title || "Banner",
          subtitle: sl.subtitle || null,
          badge_text: sl.badge || null,
          image_url: sl.imageDesktopUrl || sl.imageUrl || "",
          image_desktop_url: sl.imageDesktopUrl || sl.imageUrl || null,
          image_mobile_url: sl.imageMobileUrl || sl.imageDesktopUrl || sl.imageUrl || null,
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
            is_active: isBlockActive(block),
          },
        ];
      } else if (block.type === "vitrine_subcategory_pills" && Array.isArray(cfg.items)) {
        rawItems = cfg.items.map((it: any, i: number) => ({
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
          section_id: secId,
          title: it.title || "Destaque",
          badge_text: it.badge || null,
          image_url: it.imageUrl || "",
          target_url: it.to || it.href || "/",
          bg_color: it.bgColor || null,
          button_shape: "banner",
          show_text: true,
          sort_order: i + 1,
          is_active: true,
        }));
      }

      if (managesItems) {
        await db.from("home_section_items").delete().eq("section_id", secId);
        if (rawItems.length > 0) {
          const { error: itemsInsertErr } = await db.from("home_section_items").insert(rawItems);
          if (itemsInsertErr) {
            console.warn("[omni-builder.functions] home_section_items insert warning:", itemsInsertErr.message);
          }
        }
      }
    }

    const surfSecId = cfg.cmsSurfaceSectionId as string | undefined;
    const sectionMetaPatch: Record<string, any> = {
      title: cfg.sectionTitle ?? cfg.title ?? "",
      subtitle: cfg.sectionSubtitle ?? cfg.subtitle ?? "",
      item_limit: Number(block.dataBinding?.limit || cfg.maxItems) || 8,
      ranking_strategy: cfg.rankingStrategy || "random_shuffle",
      city_filter: cfg.cityFilter || block.cityFilter || null,
      starts_at: cfg.startsAt || block.startsAt || null,
      ends_at: cfg.endsAt || block.endsAt || null,
      auto_archive_at: cfg.autoArchiveAt || block.autoArchiveAt || null,
      is_active: isBlockActive(block),
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

// ── 1. SALVAMENTO ATÔMICO DO RASCUNHO (DRAFT ISOLADO — NUNCA ALTERA PÁGINA PÚBLICA) ──
export const saveOmniPageDocument = createServerFn({ method: "POST" })
  .validator(
    z.object({
      documentId: z.string().uuid(),
      document: OmniPageDocumentSchema,
    })
  )
  .handler(async ({ data: input }) => {
    try {
      const authCtx = await authorizeBuilderStoreContext({ documentId: input.documentId });
      const db = getServerClient();

      const normalizedDoc: OmniPageDocument = {
        ...input.document,
        id: input.documentId,
        store_id: authCtx.storeId,
        updated_at: new Date().toISOString(),
      };

      const result = await persistOmniSnapshotAuthoritatively(db, {
        documentId: input.documentId,
        storeId: authCtx.storeId,
        actorId: authCtx.actorId,
        snapshot: normalizedDoc,
        publish: false,
        commitMessage: "Omni draft save",
      });

      return {
        status: "ok" as const,
        document: normalizedDoc,
        version_id: result.version_id,
        version_number: result.version_number,
        idempotent: result.idempotent,
      };
    } catch (e: unknown) {
      if (e instanceof SupabaseUnconfiguredError) throw e;
      console.error("[omni-builder.functions] saveOmniPageDocument error:", e);
      throw new Error(
        (e instanceof Error ? e.message : String(e)) || "Erro ao persistir rascunho do builder."
      );
    }
  });

// ── 2. CARREGAMENTO E HIDRATAÇÃO DO DOCUMENTO (COM GUARDA MULTI-TENANT) ──
export const getOmniPageDocument = createServerFn({ method: "GET" })
  .validator(
    z.object({
      documentId: z.string().uuid(),
    })
  )
  .handler(async ({ data: input }) => {
    try {
      const authCtx = await authorizeBuilderStoreContext({ documentId: input.documentId });
      const db = getServerClient();
      const doc = authCtx.document;
      if (!doc) throw new Error("Documento não encontrado.");

      const settings = (doc.settings || {}) as Record<string, any>;
      let omniDoc: OmniPageDocument;

      const { data: draftVersion, error: draftError } = await db
        .from("experience_versions")
        .select("id, version_number, document_snapshot, created_at")
        .eq("document_id", doc.id)
        .eq("status", "draft")
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (draftError) throw draftError;

      const { data: publishedVersion } = await db
        .from("experience_versions")
        .select("id, version_number, created_at")
        .eq("document_id", doc.id)
        .eq("status", "published")
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      // O editor reabre o rascunho mais recente; caso não haja draft, abre a última versão publicada ou legado.
      const draftSnapshot =
        draftVersion?.document_snapshot ??
        settings.omni_page_draft ??
        settings.omni_page_published ??
        settings.omni_page;

      if (draftSnapshot) {
        const parsed = OmniPageDocumentSchema.safeParse(draftSnapshot);
        if (parsed.success) {
          omniDoc = {
            ...parsed.data,
            id: doc.id,
            store_id: doc.store_id,
          };
        } else {
          console.warn("[omni-builder.functions] omni_page inválido, regenerando canônico:", parsed.error);
          omniDoc = createEmptyOmniPage(
            doc.slug || "pagina",
            doc.title || "Nova Página",
            (doc.document_type as any) || "general",
          );
          omniDoc.id = doc.id;
          omniDoc.store_id = doc.store_id;
        }
      } else {
        omniDoc = createEmptyOmniPage(
          doc.slug || "pagina",
          doc.title || "Nova Página",
          (doc.document_type as any) || "general",
        );
        omniDoc.id = doc.id;
        omniDoc.store_id = doc.store_id;

        if (doc.document_type === "storefront") {
          omniDoc = applyTemplateToPage(omniDoc, "template_gastronomy");
        } else {
          omniDoc = applyTemplateToPage(omniDoc, "template_legal_jus");
        }
        omniDoc.id = doc.id;
        omniDoc.store_id = doc.store_id;
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
          custom_domain: doc.custom_domain ?? null,
          seo_metadata: doc.seo_metadata ?? {},
          published_version_id: doc.published_version_id ?? publishedVersion?.id ?? settings.published_version_id ?? null,
          published_at: doc.published_at ?? publishedVersion?.created_at ?? settings.published_at ?? null,
        },
        version: draftVersion
          ? { id: draftVersion.id, version_number: draftVersion.version_number, status: "draft" as const }
          : null,
        publishedVersion: publishedVersion
          ? { id: publishedVersion.id, version_number: publishedVersion.version_number, created_at: publishedVersion.created_at }
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

// ── 3. PUBLICAÇÃO ATÔMICA NO SUPABASE (PROMOVE DRAFT -> PUBLISHED) ──
export const publishOmniPageDocument = createServerFn({ method: "POST" })
  .validator(
    z.object({
      documentId: z.string().uuid(),
      document: OmniPageDocumentSchema,
    })
  )
  .handler(async ({ data: input }) => {
    try {
      const authCtx = await authorizeBuilderStoreContext({ documentId: input.documentId });
      const db = getServerClient();
      const targetStoreId = authCtx.storeId;
      const docMeta = authCtx.document;
      const docSettings = ((docMeta?.settings as Record<string, any>) || {});
      const isPlatformDoc = Boolean(docSettings.is_platform_surface || docSettings.platform_page_slug);

      if (isPlatformDoc && !authCtx.isPlatformAdmin) {
        throw new Error("Forbidden: Apenas administradores Master podem publicar superfícies globais da plataforma.");
      }

      const unsplashRefs = input.document.blocks
        .flatMap((block) => block.assetRefs ?? [])
        .filter((asset) => asset.provider === "unsplash");
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
        if (ledgerError) {
          throw new Error("Não foi possível verificar o ledger Unsplash. A publicação falhou de forma segura; confira se as migrations estão aplicadas.");
        }
        const unverifiable = unsplashRefs.filter(
          (asset) => !ledgerRows?.some((row) => matchesUnsplashSelectionLedger(asset, row)),
        );
        if (unverifiable.length > 0) {
          throw new Error(
            `Publicação bloqueada: ${unverifiable.length} asset(s) Unsplash não correspondem a uma seleção e tracking verificados nesta loja. Selecione novamente pelo picker oficial.`,
          );
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
        const unverifiableUploads = studioUploadRefs.filter(
          (asset) => !uploadLedgerRows?.some((row) => matchesStudioUploadAssetLedger(asset, row, targetStoreId)),
        );
        if (unverifiableUploads.length > 0) {
          throw new Error(
            `Publicação bloqueada: ${unverifiableUploads.length} upload(s) não correspondem ao ledger de direitos desta loja. Reenvie pelo MediaUploader do Omni Studio.`,
          );
        }
      }

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

      const normalizedDoc: OmniPageDocument = {
        ...input.document,
        id: input.documentId,
        store_id: targetStoreId,
        is_published: true,
        updated_at: new Date().toISOString(),
      };

      const result = await persistOmniSnapshotAuthoritatively(db, {
        documentId: input.documentId,
        storeId: targetStoreId,
        actorId: authCtx.actorId,
        snapshot: normalizedDoc,
        publish: true,
        commitMessage: "Omni publish",
      });

      if (!result.version_id || result.version_status !== "published") {
        throw new Error("Publicação não confirmada.");
      }

      const canSyncPlatformCms = Boolean(
        authCtx.isPlatformAdmin && authCtx.isPlatformRootStore && isPlatformDoc,
      );
      await syncOmniDocumentToPlatformCms(
        db,
        targetStoreId,
        docSettings,
        normalizedDoc,
        canSyncPlatformCms,
      );

      const pageSlug = docSettings.platform_page_slug || normalizedDoc.slug;
      const publicUrl = isPlatformDoc
        ? pageSlug === "home" || pageSlug === "menus"
          ? "/"
          : pageSlug === "chat_noor"
            ? "/chats"
            : `/${pageSlug}`
        : `/paginas/${normalizedDoc.slug}`;

      return {
        status: "ok" as const,
        document: normalizedDoc,
        version_id: result.version_id,
        version_number: result.version_number,
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

// ── 4. HISTÓRICO DE VERSÕES DO DOCUMENTO OMNI ──
export const listOmniDocumentVersions = createServerFn({ method: "GET" })
  .validator(z.object({ documentId: z.string().uuid() }))
  .handler(async ({ data: { documentId } }) => {
    const authCtx = await authorizeBuilderStoreContext({ documentId });
    const db = getServerClient();

    const { data, error } = await db
      .from("experience_versions")
      .select("id, version_number, status, commit_message, created_by, created_at")
      .eq("document_id", documentId)
      .order("version_number", { ascending: false })
      .limit(30);

    if (error) throw new Error(error.message);

    return {
      documentId,
      storeId: authCtx.storeId,
      versions: data || [],
    };
  });

// ── 5. RESTAURAÇÃO / ROLLBACK DE VERSÃO DO DOCUMENTO OMNI ──
export const restoreOmniDocumentVersion = createServerFn({ method: "POST" })
  .validator(
    z.object({
      documentId: z.string().uuid(),
      versionId: z.string().uuid(),
      publishImmediately: z.boolean().optional().default(false),
    }),
  )
  .handler(async ({ data: { documentId, versionId, publishImmediately } }) => {
    const authCtx = await authorizeBuilderStoreContext({ documentId });
    const db = getServerClient();

    const { data: targetVer, error: verErr } = await db
      .from("experience_versions")
      .select("id, version_number, status, document_snapshot")
      .eq("id", versionId)
      .eq("document_id", documentId)
      .maybeSingle();

    if (verErr || !targetVer?.document_snapshot) {
      throw new Error("Versão solicitada não encontrada ou sem snapshot válido.");
    }

    const parsed = OmniPageDocumentSchema.safeParse(targetVer.document_snapshot);
    if (!parsed.success) {
      throw new Error("O snapshot desta versão é incompatível com o schema atual.");
    }

    const restoredDoc: OmniPageDocument = {
      ...parsed.data,
      id: documentId,
      store_id: authCtx.storeId,
      updated_at: new Date().toISOString(),
    };

    const result = await persistOmniSnapshotAuthoritatively(db, {
      documentId,
      storeId: authCtx.storeId,
      actorId: authCtx.actorId,
      snapshot: restoredDoc,
      publish: Boolean(publishImmediately),
      commitMessage: `Rollback para v${targetVer.version_number}`,
    });

    if (publishImmediately) {
      const docSettings = ((authCtx.document?.settings as Record<string, any>) || {});
      const isPlatformDoc = Boolean(docSettings.is_platform_surface || docSettings.platform_page_slug);
      const canSyncPlatformCms = Boolean(
        authCtx.isPlatformAdmin && authCtx.isPlatformRootStore && isPlatformDoc,
      );
      await syncOmniDocumentToPlatformCms(
        db,
        authCtx.storeId,
        docSettings,
        restoredDoc,
        canSyncPlatformCms,
      );
    }

    return {
      status: "ok" as const,
      document: restoredDoc,
      version_id: result.version_id,
      version_number: result.version_number,
      version_status: result.version_status,
    };
  });
