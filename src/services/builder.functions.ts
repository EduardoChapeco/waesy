/**
 * Builder Platform server functions Commerce
 *
 * BFF boundary for Experience Documents, Versions, and Nodes management.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireAdmin } from "@/lib/server-access";
import { getServerClient, SupabaseUnconfiguredError } from "@/lib/supabase";
import { logSystemError } from "@/lib/logger";
import { getOpenStatus } from "@/lib/datetime";
import {
 ExperienceNodeSchema,
 type ExperienceDocument,
 type ExperienceNode,
 type ExperienceType,
} from "@/lib/builder-types";

// ---------------------------------------------------------------------------
// Store Profile Hydration Helper
// Reads real store data from `stores` table and calculates open/closed status.
// Used by both the editor (draft) and public renderer (published).
// ---------------------------------------------------------------------------

async function hydrateStoreProfileForNode(
 db: ReturnType<typeof getServerClient>,
 store_id: string,
): Promise<Record<string, any> | null> {
 try {
 const { data: store } = await db
 .from("stores")
 .select("name, slug, description, address, city, state, phone, email, settings")
 .eq("id", store_id)
 .single();

 if (!store) return null;

 const settings = (store.settings || {}) as Record<string, any>;
 const extendedHours: any[] = settings.business_hours_extended || [];
 const holidayExceptions: any[] = settings.holiday_exceptions || [];
 const actionButtons: any[] = settings.action_buttons || [];

 const openStatus = getOpenStatus(extendedHours, holidayExceptions);

 return {
 store_hero: {
 name: store.name,
 slug: store.slug,
 description: store.description,
 logo_url: settings.logoUrl || null,
 cover_url: settings.cover_url || null,
 },
 store_contact: {
 name: store.name,
 phone: store.phone,
 whatsapp: settings.whatsappNumber || store.phone,
 email: store.email ?? null,
 address: store.address,
 city: store.city,
 state: store.state,
 latitude: settings.latitude ?? null,
 longitude: settings.longitude ?? null,
 website: settings.website ?? null,
 action_buttons: actionButtons,
 },
 store_hours: {
 is_open: openStatus.status === "open",
 status_text: openStatus.text,
 hours: extendedHours,
 holiday_exceptions: holidayExceptions,
 },
 };
 } catch {
 return null;
 }
}

async function hydrateBindings(
 nodes: ExperienceNode[],
 db: ReturnType<typeof getServerClient>,
 store_id: string,
): Promise<ExperienceNode[]> {
 const needsStoreProfile = nodes.some(
 (n) => n.data_bindings && n.data_bindings.source === "store_profile",
 );
 const storeProfileData = needsStoreProfile
 ? await hydrateStoreProfileForNode(db, store_id)
 : null;

 // --- BATCH FETCHING FOR PERFORMANCE (Eliminates N+1) ---
 const collectionSlugs = new Set<string>();
 let needsLatestProducts = false;
 let maxLatestLimit = 12;
 let needsReviews = false;
 let maxReviewsLimit = 6;
 const hotspotSlugs = new Set<string>();
 let needsEvents = false;
 let maxEventsLimit = 6;
 let needsClassifieds = false;
 let maxClassifiedsLimit = 6;
 let needsDestinations = false;

 // 1. Map requirements
 nodes.forEach((node) => {
 const bindings = node.data_bindings || {};
 const bindingSource = bindings.source;

 if (bindingSource === "product_collection" && bindings.collection_slug) {
 collectionSlugs.add(bindings.collection_slug);
 } else if (bindingSource === "latest_products" || bindingSource === "dynamic_products") {
 needsLatestProducts = true;
 if (bindings.limit && bindings.limit > maxLatestLimit) {
 maxLatestLimit = bindings.limit;
 }
 } else if (bindingSource === "dynamic_reviews") {
 needsReviews = true;
 if (bindings.limit && bindings.limit > maxReviewsLimit) {
 maxReviewsLimit = bindings.limit;
 }
 } else if (bindingSource === "upcoming_events") {
 needsEvents = true;
 if (bindings.limit && bindings.limit > maxEventsLimit) {
 maxEventsLimit = bindings.limit;
 }
 } else if (bindingSource === "latest_classifieds") {
 needsClassifieds = true;
 if (bindings.limit && bindings.limit > maxClassifiedsLimit) {
 maxClassifiedsLimit = bindings.limit;
 }
 } else if (bindingSource === "marketing_banners") {
 needsMarketingBanners = true;
 } else if (bindingSource === "destinations_catalog" || node.block_type === "tourism_destinations_carousel") {
 needsDestinations = true;
 }

 if (node.block_type === "image_hotspots" && Array.isArray(node.content?.hotspots)) {
 node.content.hotspots.forEach((h: any) => {
 if (h.product_slug) hotspotSlugs.add(h.product_slug);
 });
 }
 });

 // Helper
 const formatProduct = (p: any) => {
 const sortedMedia = p.media
 ? [...p.media].sort((a: any, b: any) => a.sort_order - b.sort_order)
 : [];
 const totalStock = Array.isArray(p.variants)
 ? p.variants.reduce((sum: number, v: any) => sum + (v.stock_on_hand ?? 0), 0)
 : 0;
 return {
 id: p.id,
 title: p.title,
 slug: p.slug,
 priceCents: p.price_cents,
 compareAtCents: p.compare_at_cents,
 coverUrl: sortedMedia[0]?.url || null,
 hoverUrl: sortedMedia[1]?.url || null,
 isOutOfStock: totalStock <= 0,
 };
 };

 // 2. Execute Batched Queries (Concurrent via Promise.all)
 let needsMarketingBanners = false;
 const cache = {
 collections: {} as Record<string, any[]>,
 latest: [] as any[],
 reviews: [] as any[],
 hotspotsMap: new Map<string, any>(),
 events: [] as any[],
 classifieds: [] as any[],
 banners: [] as any[],
 destinations: [] as any[],
 };

 await Promise.all([
 // 2a. Collections
 (async () => {
 if (collectionSlugs.size === 0) return;
 try {
 const slugsArray = Array.from(collectionSlugs);
 const { data: cols } = await db
 .from("collections")
 .select("id, slug")
 .in("slug", slugsArray)
 .eq("store_id", store_id)
 .eq("status", "active");

 if (cols && cols.length > 0) {
 const colIds = cols.map((c) => c.id);
 const { data: junctions } = await db
 .from("product_collections")
 .select("collection_id, product_id")
 .in("collection_id", colIds);

 if (junctions && junctions.length > 0) {
 const pIds = Array.from(new Set(junctions.map((j) => j.product_id)));
 const { data: prods } = await db
 .from("products")
 .select(
 "id, title, slug, price_cents, compare_at_cents, " +
 "media:product_media(url, alt, sort_order), " +
 "variants:product_variants(stock_on_hand)",
 )
 .eq("status", "published")
 .eq("store_id", store_id)
 .in("id", pIds)
 .order("created_at", { ascending: false });

 if (prods) {
 const prodsById = new Map();
 (prods as any[]).forEach((p: any) => prodsById.set(p.id, formatProduct(p)));
 cols.forEach((c) => {
 const cPids = junctions
 .filter((j) => j.collection_id === c.id)
 .map((j) => j.product_id);
 cache.collections[c.slug] = cPids.map((pid) => prodsById.get(pid)).filter(Boolean);
 });
 }
 }
 }
 } catch (err) {
 console.error("[hydrateBindings] Collections error:", err);
 }
 })(),

 // 2b. Latest Products
 (async () => {
 if (!needsLatestProducts) return;
 try {
 const { data: latest } = await db
 .from("products")
 .select(
 "id, title, slug, price_cents, compare_at_cents, " +
 "media:product_media(url, alt, sort_order), " +
 "variants:product_variants(stock_on_hand)",
 )
 .eq("status", "published")
 .eq("store_id", store_id)
 .order("created_at", { ascending: false })
 .limit(maxLatestLimit);
 if (latest) cache.latest = latest.map(formatProduct);
 } catch (err) {
 console.error("[hydrateBindings] Latest Products error:", err);
 }
 })(),

 // 2c. Reviews
 (async () => {
 if (!needsReviews) return;
 try {
 const { data: reviews } = await db
 .from("reviews")
 .select("id, rating, comment, reviewer_name, profiles(full_name, avatar_url)")
 .eq("status", "approved")
 .eq("store_id", store_id)
 .order("created_at", { ascending: false })
 .limit(maxReviewsLimit);
 if (reviews) {
 cache.reviews = reviews.map((r: any) => {
 const profile = (r.profiles as any) || {};
 const authorName = (r.reviewer_name as string | null) || profile.full_name || "Cliente";
 return {
 author: authorName,
 role: "Cliente Verificado",
 content: r.comment || "",
 rating: r.rating,
 avatar_url: profile.avatar_url || null,
 };
 });
 }
 } catch (err) {
 console.error("[hydrateBindings] Reviews error:", err);
 }
 })(),

 // 2d. Hotspots
 (async () => {
 if (hotspotSlugs.size === 0) return;
 try {
 const { data: hProds } = await db
 .from("products")
 .select("id, title, slug, price_cents, compare_at_cents")
 .eq("store_id", store_id)
 .eq("status", "published")
 .in("slug", Array.from(hotspotSlugs));
 if (hProds) {
 hProds.forEach((p) => cache.hotspotsMap.set(p.slug, p));
 }
 } catch (err) {
 console.error("[hydrateBindings] Hotspots error:", err);
 }
 })(),

 // 2e. Events
 (async () => {
 if (!needsEvents) return;
 try {
 const { data: events } = await db
 .from("events")
 .select(
 "id, title, description, event_date, location, cover_image, ticket_lots(id, price_cents, capacity, sold_count)",
 )
 .eq("status", "published")
 .eq("store_id", store_id)
 .gte("event_date", new Date().toISOString())
 .order("event_date", { ascending: true })
 .limit(maxEventsLimit);
 if (events) {
 cache.events = events.map((e: any) => {
 const cheapestLot = (e.ticket_lots || []).reduce((min: number | null, lot: any) => {
 if (lot.capacity > lot.sold_count && (min === null || lot.price_cents < min)) {
 return lot.price_cents;
 }
 return min;
 }, null);
 return {
 id: e.id,
 title: e.title,
 description: e.description,
 event_date: e.event_date,
 location: e.location,
 cover_image: e.cover_image,
 price_cents: cheapestLot,
 };
 });
 }
 } catch (err) {
 console.error("[hydrateBindings] Events error:", err);
 }
 })(),

 // 2f. Classifieds
 (async () => {
 if (!needsClassifieds) return;
 try {
 const { data: classifieds } = await db
 .from("classifieds")
 .select(
 "id, title, content, category, price_cents, created_at, profiles(full_name, avatar_url)",
 )
 .eq("status", "active")
 .order("created_at", { ascending: false })
 .limit(maxClassifiedsLimit);
 if (classifieds) {
 cache.classifieds = classifieds.map((c: any) => ({
 id: c.id,
 title: c.title,
 content: c.content,
 category: c.category,
 price_cents: c.price_cents,
 created_at: c.created_at,
 author: (c.profiles as any)?.full_name || "Membro da Comunidade",
 avatar_url: (c.profiles as any)?.avatar_url || null,
 }));
 }
 } catch (err) {
 console.error("[hydrateBindings] Classifieds error:", err);
 }
 })(),

 // 2g. Marketing Banners
 (async () => {
 if (!needsMarketingBanners) return;
 try {
 const { data: banners } = await db
 .from("banners")
 .select("title, subtitle, badge_text, media_url, media_type, target_type, target_url, cta_label")
 .eq("store_id", store_id)
 .eq("is_active", true)
 .order("sort_order", { ascending: true })
 .limit(10);
 if (banners && banners.length > 0) {
 cache.banners = banners.map((b: any) => ({
 title: b.title,
 subtitle: b.subtitle,
 image_url: b.media_url,
 mobile_image_url: b.media_url,
 link: b.target_url || "#",
 button_text: b.cta_label || "Ver Mais",
 alt_text: b.title,
 }));
 }
 } catch (err) {
 console.error("[hydrateBindings] Banners error:", err);
 }
 })(),

 // 2h. Destinations Catalog
 (async () => {
 if (!needsDestinations) return;
 try {
 const { data: dests } = await db
 .from("destinations")
 .select("id, name, slug, city, state, iata_gateway, cover_image_url, gallery_urls, description, average_rating, highlights")
 .eq("is_active", true)
 .limit(12);
 if (dests && dests.length > 0) {
 cache.destinations = dests.map((d: any) => ({
 id: d.id,
 name: d.name,
 country: d.state ? `${d.city ? d.city + " · " : ""}${d.state}` : "Brasil",
 priceFromCents: 0,
 durationDays: 5,
 imageUrl: d.cover_image_url || d.gallery_urls?.[0] || undefined,
 badge: d.iata_gateway || (d.average_rating ? `★ ${Number(d.average_rating).toFixed(1)}` : undefined),
 }));
 }
 } catch (err) {
 console.error("[hydrateBindings] Destinations error:", err);
 }
 })(),
 ]);

 // 3. Hydrate the nodes using cached data (O(N) operation without async DB calls)
 return nodes.map((node) => {
 const bindings = node.data_bindings || {};
 const bindingSource = bindings.source;
 let transient_data: any = {};

 if (bindingSource === "store_profile" && storeProfileData) {
 transient_data = storeProfileData;
 } else if (bindingSource === "marketing_banners") {
 transient_data = { banners: cache.banners };
 } else if (bindingSource === "product_collection" && bindings.collection_slug) {
 const items = cache.collections[bindings.collection_slug];
 if (items) transient_data = { products: items };
 } else if (bindingSource === "latest_products" || bindingSource === "dynamic_products") {
 const limit = (bindings.limit as number) || 12;
 transient_data = { products: cache.latest.slice(0, limit) };
 } else if (bindingSource === "dynamic_reviews") {
 const limit = (bindings.limit as number) || 6;
 transient_data = { reviews: cache.reviews.slice(0, limit) };
 } else if (bindingSource === "upcoming_events") {
 const limit = (bindings.limit as number) || 6;
 transient_data = { events: cache.events.slice(0, limit) };
 } else if (bindingSource === "latest_classifieds") {
 const limit = (bindings.limit as number) || 6;
 transient_data = { classifieds: cache.classifieds.slice(0, limit) };
 } else if (bindingSource === "destinations_catalog" || node.block_type === "tourism_destinations_carousel") {
 if (cache.destinations && cache.destinations.length > 0) {
 transient_data = { destinations: cache.destinations };
 }
 }

 const enrichedNode = { ...node };
 if (Object.keys(transient_data).length > 0) {
 (enrichedNode as any).transient_data = transient_data;
 }

 if (
 enrichedNode.block_type === "image_hotspots" &&
 Array.isArray(enrichedNode.content?.hotspots)
 ) {
 const enrichedHotspots = enrichedNode.content.hotspots.map((h: any) => {
 if (h.product_slug && cache.hotspotsMap.has(h.product_slug)) {
 const p = cache.hotspotsMap.get(h.product_slug);
 return {
 ...h,
 title: h.title || p.title,
 price_cents: p.price_cents,
 product_id: p.id,
 };
 }
 return h;
 });
 enrichedNode.content = { ...enrichedNode.content, hotspots: enrichedHotspots };
 }

 return enrichedNode;
 });
}

// ---------------------------------------------------------------------------
// Documents CRUD
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Contexto de Loja Tolerante & Resiliente (Multi-Tenant & Global Admin)
// ---------------------------------------------------------------------------

export async function resolveStoreContext(
 identity: { id: string | null; role?: string; store_id?: string | null; memberships?: Array<{ store_id: string }> },
 targetStoreId?: string | null,
 documentId?: string | null
): Promise<string> {
 const isGlobalAdmin = identity.role === "platform_admin" || identity.role === "master";

 // 1. Se targetStoreId foi passado explicitamente
 if (targetStoreId) {
 if (isGlobalAdmin) return targetStoreId;
 if (identity.store_id === targetStoreId) return targetStoreId;
 if (identity.memberships?.some((m) => m.store_id === targetStoreId)) return targetStoreId;
 }

 // 2. Se documentId foi fornecido, resolve do documento no banco
 if (documentId) {
 const db = getServerClient();
 const { data: doc } = await db
 .from("experience_documents")
 .select("store_id")
 .eq("id", documentId)
 .maybeSingle();

 if (doc?.store_id) {
 if (isGlobalAdmin) return doc.store_id;
 if (identity.store_id === doc.store_id) return doc.store_id;
 if (identity.memberships?.some((m) => m.store_id === doc.store_id)) return doc.store_id;
 throw new Error("Acesso negado ao documento desta loja.");
 }
 }

 // 3. Fallback para store_id ativo na identidade
 if (identity.store_id) {
 return identity.store_id;
 }

 // 4. Administrador global sem loja fixada: busca a primeira loja cadastrada
 if (isGlobalAdmin) {
 const db = getServerClient();
 const { data: firstStore } = await db.from("stores").select("id").limit(1).maybeSingle();
 if (firstStore?.id) return firstStore.id;
 }

 throw new Error("Nenhum contexto de loja válido encontrado para a operação do builder.");
}


export const listExperienceDocuments = createServerFn({ method: "GET" })
 .validator(z.object({ type: z.string().optional(), store_id: z.string().optional() }).optional())
 .handler(async ({ data: input }) => {
 try {
 const { getServerIdentity } = await import("@/lib/server-access");
 const identity = await getServerIdentity();
 if (!identity.id) throw new Error("Não autenticado.");

 const storeId = await resolveStoreContext(identity, input?.store_id);
 const db = getServerClient();

 let query = db
 .from("experience_documents")
 .select("*")
 .eq("store_id", storeId)
 .order("created_at", { ascending: false });

 if (input?.type) {
 query = query.eq("document_type", input.type);
 }

 const { data, error } = await query;
 if (error) throw error;

 return data as ExperienceDocument[];
 } catch (e: any) {
 if (e instanceof SupabaseUnconfiguredError) throw e;
 console.error("[builder.functions] listExperienceDocuments error:", e);
 throw new Error("Erro ao listar documentos: " + (e?.message || String(e)));
 }
 });

export const getExperienceDocument = createServerFn({ method: "GET" })
 .validator(z.object({ id: z.string().uuid() }))
 .handler(async ({ data: input }) => {
 try {
 const { getServerIdentity } = await import("@/lib/server-access");
 const identity = await getServerIdentity();
 if (!identity.id) {
 throw new Error("Não autenticado.");
 }

 const db = getServerClient();

 // 1. Busca documento diretamente por ID (permite resolução tolerante cross-tenant para admin/membro)
 const { data: doc, error: docError } = await db
 .from("experience_documents")
 .select("*")
 .eq("id", input.id)
 .maybeSingle();

 if (docError) throw docError;
 if (!doc) throw new Error("Documento não encontrado.");

 const storeId = await resolveStoreContext(identity, doc.store_id, doc.id);

 // 2. Busca versão rascunho mais recente (ou publicada)
 const { data: versions, error: versionsError } = await db
 .from("experience_versions")
 .select("*")
 .eq("document_id", input.id)
 .order("created_at", { ascending: false })
 .limit(1);

 if (versionsError) throw versionsError;

 let version = versions && versions.length > 0 ? versions[0] : null;

 // Auto-cria versão rascunho inicial se inexistente
 if (!version) {
 const { data: newVer, error: createVerError } = await db
 .from("experience_versions")
 .insert({
 document_id: doc.id,
 version_number: 1,
 status: "draft",
 })
 .select()
 .single();

 if (!createVerError && newVer) {
 version = newVer;
 }
 }

 let nodes: ExperienceNode[] = [];

 // 3. Busca nós da versão ativa
 if (version) {
 const { data: nodesData, error: nodesError } = await db
 .from("experience_nodes")
 .select("*")
 .eq("version_id", version.id)
 .order("sort_order", { ascending: true });

 if (nodesError) throw nodesError;

 const rawNodes = (nodesData || []) as ExperienceNode[];
 nodes = await hydrateBindings(rawNodes, db, storeId);
 }

 return {
 status: "ok" as const,
 data: { document: doc as ExperienceDocument, version, nodes },
 };
 } catch (e: any) {
 if (e instanceof SupabaseUnconfiguredError) throw e;
 console.error("[builder.functions] getExperienceDocument error:", e);
 throw new Error("Erro ao carregar documento: " + (e?.message || String(e)));
 }
 });

export const createExperienceDocument = createServerFn({ method: "POST" })
 .validator(
 z.object({
 title: z.string().min(1).max(200),
 slug: z.string().regex(/^[a-z0-9-]+$/),
 document_type: z.enum([
 "storefront",
 "biolink",
 "pwa",
 "campaign",
 "seller_showcase",
 "landing_page",
 "custom",
 "institutional",
 ]),
 template_id: z.string().optional(),
 }),
 )
 .handler(async ({ data: input }) => {
 try {
 await requireAdmin(); // SECURITY FIX
 const db = getServerClient();

 const { getServerIdentity } = await import("@/lib/server-access");
 const identity = await getServerIdentity();
 if (!identity.store_id) throw new Error("No store found");
 const storeData = { id: identity.store_id };
 if (!storeData) throw new Error("No store found");

 // 1. Create Document
 const { data: doc, error: docError } = await db
 .from("experience_documents")
 .insert({
 store_id: storeData.id,
 title: input.title,
 slug: input.slug,
 document_type: input.document_type,
 is_active: true,
 })
 .select()
 .single();

 if (docError) throw docError;

 // 2. Create Initial Version
 const { data: version, error: versionError } = await db
 .from("experience_versions")
 .insert({
 document_id: doc.id,
 version_number: 1,
 status: "draft",
 })
 .select()
 .single();

 if (versionError) throw versionError;

 // 3. Inject Seed Template if provided
 if (input.template_id && input.template_id !== "blank") {
 const { randomUUID } = await import("crypto");
 let seedNodes: Partial<ExperienceNode>[] = [];

 if (input.template_id === "biolink_classic") {
 const sectionId = randomUUID();
 const containerId = randomUUID();

 seedNodes = [
 {
 id: sectionId,
 node_type: "section",
 block_type: "section",
 parent_id: null,
 sort_order: 0,
 design_tokens: { backgroundColor: "#f8fafc" },
 },
 {
 id: containerId,
 node_type: "container",
 block_type: "container",
 parent_id: sectionId,
 sort_order: 0,
 layout_rules: {
 maxWidth: "sm",
 display: "flex",
 flexDirection: "col",
 gap: "md",
 paddingX: "md",
 paddingY: "xl",
 },
 },
 {
 id: randomUUID(),
 node_type: "element",
 block_type: "rich_text",
 parent_id: containerId,
 sort_order: 0,
 content: {
 html: "<div style='text-align:center'><img src='https://github.com/shadcn.png' style='width:96px;height:96px;border-radius:50%;margin:0 auto;'/><h3>Meu Nome</h3><p>Minha biografia incrível</p></div>",
 },
 },
 {
 id: randomUUID(),
 node_type: "composition",
 block_type: "social_grid",
 parent_id: containerId,
 sort_order: 1,
 content: {
 items: [
 { title: "Comprar Agora", link: "/", icon: "ShoppingBag" },
 { title: "WhatsApp", link: "https://wa.me/5511999999999", icon: "Smartphone" },
 ],
 },
 },
 ];
 } else if (input.template_id === "landing_page") {
 const sectionId = randomUUID();
 const containerId = randomUUID();

 seedNodes = [
 {
 id: sectionId,
 node_type: "section",
 block_type: "section",
 parent_id: null,
 sort_order: 0,
 },
 {
 id: containerId,
 node_type: "container",
 block_type: "container",
 parent_id: sectionId,
 sort_order: 0,
 layout_rules: {
 maxWidth: "xl",
 display: "flex",
 flexDirection: "col",
 gap: "lg",
 paddingX: "md",
 paddingY: "lg",
 },
 },
 {
 id: randomUUID(),
 node_type: "composition",
 block_type: "hero_carousel",
 parent_id: containerId,
 sort_order: 0,
 content: {
 autoPlay: true,
 interval: 5,
 banners: [
 { image_url: "" },
 ],
 },
 },
 {
 id: randomUUID(),
 node_type: "element",
 block_type: "countdown_timer",
 parent_id: containerId,
 sort_order: 1,
 content: {
 target_date: new Date(Date.now() + 86400000).toISOString(),
 title: "Oferta Encerra em",
 },
 },
 {
 id: randomUUID(),
 node_type: "composition",
 block_type: "product_carousel",
 parent_id: containerId,
 sort_order: 2,
 content: { title: "Destaques da Coleção", subtitle: "As melhores ofertas pra você" },
 data_bindings: { source: "dynamic_products" },
 },
 {
 id: randomUUID(),
 node_type: "composition",
 block_type: "product_grid",
 parent_id: containerId,
 sort_order: 3,
 content: { title: "Mais Vendidos", subtitle: "Aproveite antes que acabe" },
 data_bindings: { source: "dynamic_products" },
 },
 ];
 } else if (input.template_id === "homepage_classic") {
 const sectionId = randomUUID();
 const containerId = randomUUID();

 seedNodes = [
 {
 id: sectionId,
 node_type: "section",
 block_type: "section",
 parent_id: null,
 sort_order: 0,
 },
 {
 id: containerId,
 node_type: "container",
 block_type: "container",
 parent_id: sectionId,
 sort_order: 0,
 layout_rules: {
 maxWidth: "full",
 display: "flex",
 flexDirection: "col",
 gap: "none",
 paddingX: "none",
 paddingY: "none",
 },
 },
 {
 id: randomUUID(),
 node_type: "composition",
 block_type: "hero_carousel",
 parent_id: containerId,
 sort_order: 0,
 content: {
 autoPlay: true,
 interval: 5,
 banners: [
 { image_url: "" },
 ],
 },
 },
 {
 id: randomUUID(),
 node_type: "composition",
 block_type: "product_carousel",
 parent_id: containerId,
 sort_order: 1,
 content: {
 title: "Produtos em Destaque",
 subtitle: "As últimas novidades da coleção",
 },
 data_bindings: { source: "dynamic_products" },
 },
 {
 id: randomUUID(),
 node_type: "composition",
 block_type: "bento_grid",
 parent_id: containerId,
 sort_order: 2,
 content: {
 items: [
 {
 title: "Verão",
 image: "",
 col_span: 2,
 },
 ],
 },
 },
 ];
 } else if (input.template_id === "institutional_profile") {
 const sectionId = randomUUID();
 const containerId = randomUUID();

 seedNodes = [
 {
 id: sectionId,
 node_type: "section",
 block_type: "section",
 parent_id: null,
 sort_order: 0,
 design_tokens: { backgroundColor: "#ffffff" },
 },
 {
 id: containerId,
 node_type: "container",
 block_type: "container",
 parent_id: sectionId,
 sort_order: 0,
 layout_rules: {
 maxWidth: "xl",
 display: "flex",
 flexDirection: "col",
 gap: "xl",
 paddingX: "md",
 paddingY: "2xl",
 },
 },
 {
 id: randomUUID(),
 node_type: "element",
 block_type: "rich_text",
 parent_id: containerId,
 sort_order: 0,
 content: {
 html: "<div style='text-align:center'><h1 style='font-size:3rem;font-weight:bold;margin-bottom:1rem;'>Nossa Essência</h1><p style='color:#64748b;font-size:1.25rem;max-width:40rem;margin:0 auto;'>Conectando você ao melhor do design e conforto desde o primeiro passo.</p></div>",
 },
 },
 {
 id: randomUUID(),
 node_type: "composition",
 block_type: "timeline_history",
 parent_id: containerId,
 sort_order: 1,
 content: {
 title: "Como tudo começou",
 events: [
 {
 year: "2015",
 title: "Fundação",
 description: "Início da nossa jornada vendendo sapatos artesanais.",
 },
 {
 year: "2020",
 title: "Expansão Nacional",
 description: "Chegamos a todos os estados do Brasil.",
 },
 ],
 },
 },
 {
 id: randomUUID(),
 node_type: "composition",
 block_type: "split_banner",
 parent_id: containerId,
 sort_order: 2,
 content: {
 title: "Conforto Incomparável",
 description:
 "Experimente a leveza e a flexibilidade que só os nossos produtos oferecem.",
 button_text: "Conhecer Coleção",
 button_link: "/catalog",
 image_position: "right",
 },
 },
 {
 id: randomUUID(),
 node_type: "composition",
 block_type: "testimonial_carousel",
 parent_id: containerId,
 sort_order: 3,
 content: {
 title: "O que dizem de nós",
 subtitle: "A opinião de quem já usa Waesy.",
 },
 data_bindings: { source: "dynamic_reviews" },
 },
 ];
 }

 if (seedNodes.length > 0) {
 const nodesToInsert = seedNodes.map((n) => ({
 ...n,
 version_id: version.id,
 }));
 await db.from("experience_nodes").insert(nodesToInsert);
 }
 }

 return { status: "success" as const, data: { document: doc, version } };
 } catch (e: unknown) {
 console.error("[builder.functions] createExperienceDocument error:", e);
 throw new Error("Erro ao criar documento.");
 }
 });

export const listMediaAssets = createServerFn({ method: "GET" }).handler(async () => {
 try {
 await requireAdmin(); // SECURITY FIX
 const db = getServerClient();

 const { getServerIdentity } = await import("@/lib/server-access");
 const identity = await getServerIdentity();
 if (!identity.store_id) throw new Error("No store found");
 const store = { id: identity.store_id };
 if (!store) throw new Error("No store found");

 const { data, error } = await db
 .from("media_assets")
 .select("*")
 .eq("store_id", store.id)
 .order("created_at", { ascending: false });

 if (error) throw error;

 return data;
 } catch (e: unknown) {
 console.error("[builder.functions] listMediaAssets error:", e);
 throw new Error((e instanceof Error ? e.message : String(e)) || "Erro ao carregar mídias");
 }
});

export const updateExperienceDocument = createServerFn({ method: "POST" })
 .validator(
 z.object({
 id: z.string().uuid(),
 title: z.string().min(1).max(200),
 slug: z.string().regex(/^[a-z0-9-]+$/),
 is_active: z.boolean(),
 }),
 )
 .handler(async ({ data: input }) => {
 try {
 await requireAdmin(); // SECURITY FIX
 const { getServerIdentity } = await import("@/lib/server-access");
 const identity = await getServerIdentity();
 if (!identity.store_id) throw new Error("No store found");

 const db = getServerClient();

 // Check slug collision
 const { data: existing } = await db
 .from("experience_documents")
 .select("id")
 .eq("store_id", identity.store_id)
 .eq("slug", input.slug)
 .neq("id", input.id)
 .eq("is_active", true)
 .maybeSingle();

 if (existing) {
 throw new Error("Este slug já está em uso por outra página ativa.");
 }

 const { error } = await db
 .from("experience_documents")
 .update({
 title: input.title,
 slug: input.slug,
 is_active: input.is_active,
 updated_at: new Date().toISOString(),
 })
 .eq("id", input.id)
 .eq("store_id", identity.store_id);

 if (error) throw error;

 return { status: "success" as const };
 } catch (e: unknown) {
 console.error("[builder.functions] updateExperienceDocument error:", e);
 throw new Error("Erro ao atualizar configurações.");
 }
 });

const HOME_TEMPLATES: Record<string, (ids: () => string) => any[]> = {
 blank: () => [],

 classic_commerce: (uid) => {
 const s1 = uid();
 const c1 = uid();
 const s2 = uid();
 const c2 = uid();
 const s3 = uid();
 const c3 = uid();
 return [
 { id: s1, node_type: "section", block_type: "section", parent_id: null, sort_order: 0 },
 {
 id: c1,
 node_type: "container",
 block_type: "container",
 parent_id: s1,
 sort_order: 0,
 layout_rules: {
 maxWidth: "full",
 display: "flex",
 flexDirection: "col",
 gap: "none",
 paddingX: "none",
 paddingY: "none",
 },
 },
 {
 id: uid(),
 node_type: "composition",
 block_type: "hero_carousel",
 parent_id: c1,
 sort_order: 0,
 content: {
 slides: [
 { title: "Nova Coleção", subtitle: "Chegou agora", button_text: "Ver produtos" },
 ],
 },
 },

 { id: s2, node_type: "section", block_type: "section", parent_id: null, sort_order: 1 },
 {
 id: c2,
 node_type: "container",
 block_type: "container",
 parent_id: s2,
 sort_order: 0,
 layout_rules: {
 maxWidth: "xl",
 display: "flex",
 flexDirection: "col",
 gap: "lg",
 paddingX: "md",
 paddingY: "xl",
 },
 },
 {
 id: uid(),
 node_type: "composition",
 block_type: "product_carousel",
 parent_id: c2,
 sort_order: 0,
 content: { title: "Destaques da Semana", subtitle: "Os queridinhos" },
 data_bindings: { source: "dynamic_products" },
 },

 { id: s3, node_type: "section", block_type: "section", parent_id: null, sort_order: 2 },
 {
 id: c3,
 node_type: "container",
 block_type: "container",
 parent_id: s3,
 sort_order: 0,
 layout_rules: {
 maxWidth: "xl",
 display: "flex",
 flexDirection: "col",
 gap: "lg",
 paddingX: "md",
 paddingY: "xl",
 },
 },
 {
 id: uid(),
 node_type: "composition",
 block_type: "split_banner",
 parent_id: c3,
 sort_order: 0,
 content: { title: "Desconto Especial", description: "Use o cupom na primeira compra" },
 },
 ];
 },

 minimalist_fashion: (uid) => {
 const s1 = uid();
 const c1 = uid();
 const s2 = uid();
 const c2 = uid();
 return [
 { id: s1, node_type: "section", block_type: "section", parent_id: null, sort_order: 0 },
 {
 id: c1,
 node_type: "container",
 block_type: "container",
 parent_id: s1,
 sort_order: 0,
 layout_rules: {
 maxWidth: "full",
 display: "flex",
 flexDirection: "col",
 gap: "none",
 paddingX: "none",
 paddingY: "none",
 },
 },
 {
 id: uid(),
 node_type: "composition",
 block_type: "split_banner",
 parent_id: c1,
 sort_order: 0,
 content: { title: "Minimalismo em Foco", description: "O essencial que transforma" },
 },

 { id: s2, node_type: "section", block_type: "section", parent_id: null, sort_order: 1 },
 {
 id: c2,
 node_type: "container",
 block_type: "container",
 parent_id: s2,
 sort_order: 0,
 layout_rules: {
 maxWidth: "xl",
 display: "flex",
 flexDirection: "col",
 gap: "lg",
 paddingX: "md",
 paddingY: "2xl",
 },
 },
 {
 id: uid(),
 node_type: "composition",
 block_type: "product_grid",
 parent_id: c2,
 sort_order: 0,
 content: { title: "Coleção Essencial" },
 data_bindings: { source: "dynamic_products" },
 },
 ];
 },

 street_wear: (uid) => {
 const s1 = uid();
 const c1 = uid();
 const s2 = uid();
 const c2 = uid();
 return [
 {
 id: s1,
 node_type: "section",
 block_type: "section",
 parent_id: null,
 sort_order: 0,
 design_tokens: { backgroundColor: "#000000", textColor: "#ffffff" },
 },
 {
 id: c1,
 node_type: "container",
 block_type: "container",
 parent_id: s1,
 sort_order: 0,
 layout_rules: {
 maxWidth: "full",
 display: "flex",
 flexDirection: "col",
 gap: "none",
 paddingX: "none",
 paddingY: "none",
 },
 },
 {
 id: uid(),
 node_type: "composition",
 block_type: "hero_carousel",
 parent_id: c1,
 sort_order: 0,
 content: { slides: [{ title: "STREET DROP", subtitle: "Edição Limitada" }] },
 },

 {
 id: s2,
 node_type: "section",
 block_type: "section",
 parent_id: null,
 sort_order: 1,
 design_tokens: { backgroundColor: "#111111", textColor: "#ffffff" },
 },
 {
 id: c2,
 node_type: "container",
 block_type: "container",
 parent_id: s2,
 sort_order: 0,
 layout_rules: {
 maxWidth: "xl",
 display: "flex",
 flexDirection: "col",
 gap: "lg",
 paddingX: "md",
 paddingY: "xl",
 },
 },
 {
 id: uid(),
 node_type: "composition",
 block_type: "product_carousel",
 parent_id: c2,
 sort_order: 0,
 content: { title: "Lançamentos" },
 data_bindings: { source: "dynamic_products" },
 },
 {
 id: uid(),
 node_type: "composition",
 block_type: "gallery_grid",
 parent_id: c2,
 sort_order: 1,
 content: { title: "No pé da galera" },
 },
 ];
 },
};

export const checkExperienceDocumentExists = createServerFn({ method: "GET" })
 .validator(
 z.object({
 slug: z.string(),
 document_type: z.enum([
 "storefront",
 "biolink",
 "pwa",
 "campaign",
 "seller_showcase",
 "product_template",
 "campaign_popup",
 ]),
 }),
 )
 .handler(async ({ data: { slug, document_type } }) => {
 try {
 await requireAdmin(); // SECURITY FIX
 const { getServerIdentity } = await import("@/lib/server-access");
 const identity = await getServerIdentity();
 if (!identity.store_id) throw new Error("No store found");

 const db = getServerClient();
 const { data: doc } = await db
 .from("experience_documents")
 .select("id")
 .eq("store_id", identity.store_id)
 .eq("slug", slug)
 .eq("document_type", document_type)
 .eq("is_active", true)
 .maybeSingle();

 return { status: "success" as const, data: { exists: !!doc, id: doc?.id } };
 } catch (e) {
 throw new Error("Erro ao verificar documento.");
 }
 });

export const getOrCreateHomeDocument = createServerFn({ method: "POST" })
 .validator(z.object({ template_id: z.string().default("blank") }).optional())
 .handler(async ({ data: input }) => {
 try {
 await requireAdmin(); // SECURITY FIX
 // 0. Get Identity
 const { getServerIdentity } = await import("@/lib/server-access");
 const identity = await getServerIdentity();
 if (!identity.store_id) throw new Error("No store found");
 const storeId = identity.store_id;

 const db = getServerClient();

 // 1. Check if home document exists
 const { data: doc } = await db
 .from("experience_documents")
 .select("*")
 .eq("store_id", storeId)
 .eq("slug", "home")
 .eq("document_type", "storefront")
 .eq("is_active", true)
 .maybeSingle();

 if (doc) {
 return { status: "success" as const, data: { id: doc.id, isNew: false } };
 }

 // 2. If not, create it
 const { data: newDoc, error: newDocError } = await db
 .from("experience_documents")
 .insert({
 store_id: storeId,
 title: "Página Inicial",
 slug: "home",
 document_type: "storefront",
 is_active: true,
 })
 .select()
 .single();

 if (newDocError) throw newDocError;

 // 3. Create initial draft version
 const { data: version, error: versionError } = await db
 .from("experience_versions")
 .insert({
 document_id: newDoc.id,
 version_number: 1,
 status: "draft",
 })
 .select()
 .single();

 if (versionError) throw versionError;

 // 4. Inject template nodes if requested
 const templateId = input?.template_id ?? "blank";
 const { HOME_TEMPLATES_LIBRARY } = await import("@/lib/home-templates-library");
 const preset = HOME_TEMPLATES_LIBRARY[templateId];
 const { randomUUID } = await import("crypto");
 const seedNodes = preset ? preset.nodesFactory(() => randomUUID()) : [];

 if (seedNodes.length > 0) {
 const nodesToInsert = seedNodes.map((n: any) => ({ ...n, version_id: version.id }));
 await db.from("experience_nodes").insert(nodesToInsert);
 }

 return { status: "success" as const, data: { id: newDoc.id, isNew: true, templateId } };
 } catch (e) {
 console.error("[builder.functions] getOrCreateHomeDocument error:", e);
 throw new Error("Erro ao criar vitrine principal.");
 }
 });

export const applyHomeTemplate = createServerFn({ method: "POST" })
 .validator(
 z.object({
 document_id: z.string().uuid(),
 template_id: z.string(),
 }),
 )
 .handler(async ({ data: input }) => {
 try {
 await requireAdmin(); // SECURITY FIX
 const { getServerIdentity } = await import("@/lib/server-access");
 const identity = await getServerIdentity();
 if (!identity.store_id) throw new Error("No store found");
 const storeId = identity.store_id;

 const db = getServerClient();

 // 0. Verify document belongs to tenant
 const { data: doc, error: docError } = await db
 .from("experience_documents")
 .select("id")
 .eq("id", input.document_id)
 .eq("store_id", storeId)
 .single();

 if (docError || !doc) {
 throw new Error("Documento não encontrado ou sem permissão.");
 }

 const { HOME_TEMPLATES_LIBRARY } = await import("@/lib/home-templates-library");
 const { randomUUID } = await import("crypto");

 const preset = HOME_TEMPLATES_LIBRARY[input.template_id];
 if (!preset) {
 throw new Error("Template de vitrine não encontrado.");
 }

 // 1. Get current Draft version or create one
 const { data: versions } = await db
 .from("experience_versions")
 .select("*")
 .eq("document_id", input.document_id)
 .order("created_at", { ascending: false })
 .limit(1);

 let version = versions && versions.length > 0 ? versions[0] : null;

 if (!version) {
 const { data: newVersion, error: vError } = await db
 .from("experience_versions")
 .insert({
 document_id: input.document_id,
 version_number: 1,
 status: "draft",
 })
 .select()
 .single();

 if (vError) throw vError;
 version = newVersion;
 }

 // 2. Delete existing nodes in draft version
 await db.from("experience_nodes").delete().eq("version_id", version.id);

 // 3. Generate template nodes and insert
 const seedNodes = preset.nodesFactory(() => randomUUID());
 if (seedNodes.length > 0) {
 const nodesToInsert = seedNodes.map((n: any) => ({
 ...n,
 version_id: version.id,
 }));
 const { error: insError } = await db.from("experience_nodes").insert(nodesToInsert);
 if (insError) throw insError;
 }

 return {
 status: "success" as const,
 data: { versionId: version.id, templateId: input.template_id },
 };
 } catch (e: unknown) {
 console.error("[builder.functions] applyHomeTemplate error:", e);
 throw new Error(
 (e instanceof Error ? e.message : String(e)) || "Erro ao aplicar template de vitrine.",
 );
 }
 });

// ---------------------------------------------------------------------------
// Institutional Profile — Get or create canonical "institucional" document
// ---------------------------------------------------------------------------

const INSTITUTIONAL_TEMPLATES: Record<string, (ids: () => string) => any[]> = {
 blank: () => [],

 modern_commercial: (uid) => {
 const s1 = uid();
 const c1 = uid();
 const s2 = uid();
 const c2 = uid();
 const s3 = uid();
 const c3 = uid();
 return [
 {
 id: s1,
 node_type: "section",
 block_type: "section",
 parent_id: null,
 sort_order: 0,
 design_tokens: { backgroundColor: "#ffffff" },
 },
 {
 id: c1,
 node_type: "container",
 block_type: "container",
 parent_id: s1,
 sort_order: 0,
 layout_rules: {
 maxWidth: "xl",
 display: "flex",
 flexDirection: "col",
 gap: "none",
 paddingX: "none",
 paddingY: "none",
 },
 },
 {
 id: uid(),
 node_type: "composition",
 block_type: "store_profile_hero",
 parent_id: c1,
 sort_order: 0,
 content: { layout: "centered", show_cover: true, show_logo: true, show_description: true },
 data_bindings: { source: "store_profile" },
 },
 { id: s2, node_type: "section", block_type: "section", parent_id: null, sort_order: 1 },
 {
 id: c2,
 node_type: "container",
 block_type: "container",
 parent_id: s2,
 sort_order: 0,
 layout_rules: {
 maxWidth: "xl",
 display: "flex",
 flexDirection: "col",
 gap: "lg",
 paddingX: "md",
 paddingY: "lg",
 },
 },
 {
 id: uid(),
 node_type: "element",
 block_type: "store_hours",
 parent_id: c2,
 sort_order: 0,
 content: { title: "Horários de Funcionamento", show_status_badge: true },
 data_bindings: { source: "store_profile" },
 },
 {
 id: uid(),
 node_type: "element",
 block_type: "store_contact",
 parent_id: c2,
 sort_order: 1,
 content: {
 title: "Fale Conosco",
 show_whatsapp: true,
 show_phone: true,
 show_email: true,
 show_address: true,
 show_map_link: true,
 show_action_buttons: true,
 },
 data_bindings: { source: "store_profile" },
 },
 { id: s3, node_type: "section", block_type: "section", parent_id: null, sort_order: 2 },
 {
 id: c3,
 node_type: "container",
 block_type: "container",
 parent_id: s3,
 sort_order: 0,
 layout_rules: {
 maxWidth: "xl",
 display: "flex",
 flexDirection: "col",
 gap: "md",
 paddingX: "md",
 paddingY: "lg",
 },
 },
 {
 id: uid(),
 node_type: "composition",
 block_type: "product_carousel",
 parent_id: c3,
 sort_order: 0,
 content: { title: "Nossos Produtos", subtitle: "Confira as novidades" },
 data_bindings: { source: "dynamic_products" },
 },
 {
 id: uid(),
 node_type: "composition",
 block_type: "testimonial_carousel",
 parent_id: c3,
 sort_order: 1,
 content: { title: "Avaliações de Clientes" },
 data_bindings: { source: "dynamic_reviews" },
 },
 ];
 },

 social_link_tree: (uid) => {
 const s1 = uid();
 const c1 = uid();
 const s2 = uid();
 const c2 = uid();
 return [
 { id: s1, node_type: "section", block_type: "section", parent_id: null, sort_order: 0 },
 {
 id: c1,
 node_type: "container",
 block_type: "container",
 parent_id: s1,
 sort_order: 0,
 layout_rules: {
 maxWidth: "sm",
 display: "flex",
 flexDirection: "col",
 gap: "md",
 paddingX: "md",
 paddingY: "lg",
 },
 },
 {
 id: uid(),
 node_type: "composition",
 block_type: "store_profile_hero",
 parent_id: c1,
 sort_order: 0,
 content: {
 layout: "instagram",
 show_cover: false,
 show_logo: true,
 show_description: true,
 },
 data_bindings: { source: "store_profile" },
 },
 {
 id: uid(),
 node_type: "element",
 block_type: "store_contact",
 parent_id: c1,
 sort_order: 1,
 content: {
 title: "Contato",
 show_whatsapp: true,
 show_phone: false,
 show_email: false,
 show_address: false,
 show_map_link: false,
 show_action_buttons: true,
 },
 data_bindings: { source: "store_profile" },
 },
 { id: s2, node_type: "section", block_type: "section", parent_id: null, sort_order: 1 },
 {
 id: c2,
 node_type: "container",
 block_type: "container",
 parent_id: s2,
 sort_order: 0,
 layout_rules: {
 maxWidth: "full",
 display: "flex",
 flexDirection: "col",
 gap: "none",
 paddingX: "none",
 paddingY: "none",
 },
 },
 {
 id: uid(),
 node_type: "composition",
 block_type: "gallery_grid",
 parent_id: c2,
 sort_order: 0,
 content: { title: "", images: [] },
 },
 ];
 },

 local_business: (uid) => {
 const s1 = uid();
 const c1 = uid();
 const s2 = uid();
 const c2 = uid();
 return [
 { id: s1, node_type: "section", block_type: "section", parent_id: null, sort_order: 0 },
 {
 id: c1,
 node_type: "container",
 block_type: "container",
 parent_id: s1,
 sort_order: 0,
 layout_rules: {
 maxWidth: "xl",
 display: "flex",
 flexDirection: "col",
 gap: "none",
 paddingX: "none",
 paddingY: "none",
 },
 },
 {
 id: uid(),
 node_type: "composition",
 block_type: "store_profile_hero",
 parent_id: c1,
 sort_order: 0,
 content: { layout: "left", show_cover: true, show_logo: true, show_description: true },
 data_bindings: { source: "store_profile" },
 },
 { id: s2, node_type: "section", block_type: "section", parent_id: null, sort_order: 1 },
 {
 id: c2,
 node_type: "container",
 block_type: "container",
 parent_id: s2,
 sort_order: 0,
 layout_rules: {
 maxWidth: "xl",
 display: "flex",
 flexDirection: "col",
 gap: "lg",
 paddingX: "md",
 paddingY: "lg",
 },
 },
 {
 id: uid(),
 node_type: "element",
 block_type: "store_hours",
 parent_id: c2,
 sort_order: 0,
 content: { title: "Horários", show_status_badge: true },
 data_bindings: { source: "store_profile" },
 },
 {
 id: uid(),
 node_type: "element",
 block_type: "store_contact",
 parent_id: c2,
 sort_order: 1,
 content: {
 title: "Localização e Contato",
 show_whatsapp: true,
 show_phone: true,
 show_email: true,
 show_address: true,
 show_map_link: true,
 show_action_buttons: false,
 },
 data_bindings: { source: "store_profile" },
 },
 {
 id: uid(),
 node_type: "composition",
 block_type: "testimonial_carousel",
 parent_id: c2,
 sort_order: 2,
 content: { title: "Avaliações" },
 data_bindings: { source: "dynamic_reviews" },
 },
 ];
 },

 whatsapp_business: (uid) => {
 const s1 = uid();
 const c1 = uid();
 const s2 = uid();
 const c2 = uid();
 return [
 {
 id: s1,
 node_type: "section",
 block_type: "section",
 parent_id: null,
 sort_order: 0,
 design_tokens: { backgroundColor: "#25d366" },
 },
 {
 id: c1,
 node_type: "container",
 block_type: "container",
 parent_id: s1,
 sort_order: 0,
 layout_rules: {
 maxWidth: "sm",
 display: "flex",
 flexDirection: "col",
 gap: "md",
 paddingX: "md",
 paddingY: "lg",
 },
 },
 {
 id: uid(),
 node_type: "composition",
 block_type: "store_profile_hero",
 parent_id: c1,
 sort_order: 0,
 content: { layout: "centered", show_cover: false, show_logo: true, show_description: true },
 data_bindings: { source: "store_profile" },
 },
 { id: s2, node_type: "section", block_type: "section", parent_id: null, sort_order: 1 },
 {
 id: c2,
 node_type: "container",
 block_type: "container",
 parent_id: s2,
 sort_order: 0,
 layout_rules: {
 maxWidth: "sm",
 display: "flex",
 flexDirection: "col",
 gap: "md",
 paddingX: "md",
 paddingY: "lg",
 },
 },
 {
 id: uid(),
 node_type: "element",
 block_type: "store_hours",
 parent_id: c2,
 sort_order: 0,
 content: { title: "Estamos Abertos?", show_status_badge: true },
 data_bindings: { source: "store_profile" },
 },
 {
 id: uid(),
 node_type: "element",
 block_type: "store_contact",
 parent_id: c2,
 sort_order: 1,
 content: {
 title: "Fale com a Gente",
 show_whatsapp: true,
 show_phone: true,
 show_email: false,
 show_address: true,
 show_map_link: true,
 show_action_buttons: true,
 },
 data_bindings: { source: "store_profile" },
 },
 ];
 },

 elegant_institutional: (uid) => {
 const s1 = uid();
 const c1 = uid();
 const s2 = uid();
 const c2 = uid();
 const s3 = uid();
 const c3 = uid();
 return [
 { id: s1, node_type: "section", block_type: "section", parent_id: null, sort_order: 0 },
 {
 id: c1,
 node_type: "container",
 block_type: "container",
 parent_id: s1,
 sort_order: 0,
 layout_rules: {
 maxWidth: "full",
 display: "flex",
 flexDirection: "col",
 gap: "none",
 paddingX: "none",
 paddingY: "none",
 },
 },
 {
 id: uid(),
 node_type: "composition",
 block_type: "store_profile_hero",
 parent_id: c1,
 sort_order: 0,
 content: { layout: "centered", show_cover: true, show_logo: true, show_description: true },
 data_bindings: { source: "store_profile" },
 },
 { id: s2, node_type: "section", block_type: "section", parent_id: null, sort_order: 1 },
 {
 id: c2,
 node_type: "container",
 block_type: "container",
 parent_id: s2,
 sort_order: 0,
 layout_rules: {
 maxWidth: "xl",
 display: "flex",
 flexDirection: "col",
 gap: "xl",
 paddingX: "md",
 paddingY: "2xl",
 },
 },
 {
 id: uid(),
 node_type: "composition",
 block_type: "trust_badges",
 parent_id: c2,
 sort_order: 0,
 content: { badges: [] },
 },
 {
 id: uid(),
 node_type: "composition",
 block_type: "timeline_history",
 parent_id: c2,
 sort_order: 1,
 content: { title: "Nossa História", events: [] },
 },
 {
 id: uid(),
 node_type: "composition",
 block_type: "testimonial_carousel",
 parent_id: c2,
 sort_order: 2,
 content: { title: "O que dizem de nós" },
 data_bindings: { source: "dynamic_reviews" },
 },
 { id: s3, node_type: "section", block_type: "section", parent_id: null, sort_order: 2 },
 {
 id: c3,
 node_type: "container",
 block_type: "container",
 parent_id: s3,
 sort_order: 0,
 layout_rules: {
 maxWidth: "xl",
 display: "flex",
 flexDirection: "col",
 gap: "lg",
 paddingX: "md",
 paddingY: "lg",
 },
 },
 {
 id: uid(),
 node_type: "element",
 block_type: "store_hours",
 parent_id: c3,
 sort_order: 0,
 content: { title: "Horários", show_status_badge: true },
 data_bindings: { source: "store_profile" },
 },
 {
 id: uid(),
 node_type: "element",
 block_type: "store_contact",
 parent_id: c3,
 sort_order: 1,
 content: {
 title: "Fale Conosco",
 show_whatsapp: true,
 show_phone: true,
 show_email: true,
 show_address: true,
 show_map_link: true,
 show_action_buttons: true,
 },
 data_bindings: { source: "store_profile" },
 },
 ];
 },

 catalog_contact: (uid) => {
 const s1 = uid();
 const c1 = uid();
 const s2 = uid();
 const c2 = uid();
 return [
 { id: s1, node_type: "section", block_type: "section", parent_id: null, sort_order: 0 },
 {
 id: c1,
 node_type: "container",
 block_type: "container",
 parent_id: s1,
 sort_order: 0,
 layout_rules: {
 maxWidth: "xl",
 display: "flex",
 flexDirection: "col",
 gap: "none",
 paddingX: "none",
 paddingY: "none",
 },
 },
 {
 id: uid(),
 node_type: "composition",
 block_type: "store_profile_hero",
 parent_id: c1,
 sort_order: 0,
 content: { layout: "left", show_cover: true, show_logo: true, show_description: true },
 data_bindings: { source: "store_profile" },
 },
 {
 id: uid(),
 node_type: "composition",
 block_type: "product_carousel",
 parent_id: c1,
 sort_order: 1,
 content: { title: "Nosso Catálogo", subtitle: "Veja nossas últimas peças" },
 data_bindings: { source: "dynamic_products" },
 },
 {
 id: uid(),
 node_type: "composition",
 block_type: "product_grid",
 parent_id: c1,
 sort_order: 2,
 content: { title: "Mais Vendidos" },
 data_bindings: { source: "dynamic_products" },
 },
 { id: s2, node_type: "section", block_type: "section", parent_id: null, sort_order: 1 },
 {
 id: c2,
 node_type: "container",
 block_type: "container",
 parent_id: s2,
 sort_order: 0,
 layout_rules: {
 maxWidth: "xl",
 display: "flex",
 flexDirection: "col",
 gap: "lg",
 paddingX: "md",
 paddingY: "lg",
 },
 },
 {
 id: uid(),
 node_type: "element",
 block_type: "store_contact",
 parent_id: c2,
 sort_order: 0,
 content: {
 title: "Contato e Compra Assistida",
 show_whatsapp: true,
 show_phone: true,
 show_email: true,
 show_address: true,
 show_map_link: true,
 show_action_buttons: true,
 },
 data_bindings: { source: "store_profile" },
 },
 {
 id: uid(),
 node_type: "element",
 block_type: "store_hours",
 parent_id: c2,
 sort_order: 1,
 content: { title: "Quando Estamos Disponíveis", show_status_badge: true },
 data_bindings: { source: "store_profile" },
 },
 ];
 },
};

export const getOrCreateInstitutionalDocument = createServerFn({ method: "POST" })
 .validator(
 z
 .object({ template_id: z.string().default("blank"), overwrite: z.boolean().optional() })
 .optional(),
 )
 .handler(async ({ data: input }) => {
 try {
 await requireAdmin(); // SECURITY FIX
 const db = getServerClient();

 // 0. Get Identity
 const { getServerIdentity } = await import("@/lib/server-access");
 const identity = await getServerIdentity();
 if (!identity.store_id) throw new Error("No store found");
 const storeId = identity.store_id;

 if (input?.overwrite) {
 await db
 .from("experience_documents")
 .delete()
 .eq("store_id", storeId)
 .eq("slug", "institucional")
 .eq("document_type", "storefront");
 }

 // 1. Check if institutional document exists
 const { data: doc } = await db
 .from("experience_documents")
 .select("*")
 .eq("store_id", storeId)
 .eq("slug", "institucional")
 .eq("document_type", "storefront")
 .eq("is_active", true)
 .maybeSingle();

 if (doc) {
 return { status: "success" as const, data: { id: doc.id, isNew: false } };
 }

 // 2. Create document
 const { data: newDoc, error: newDocError } = await db
 .from("experience_documents")
 .insert({
 store_id: storeId,
 title: "Perfil da Loja",
 slug: "institucional",
 document_type: "storefront",
 is_active: true,
 })
 .select()
 .single();

 if (newDocError) throw newDocError;

 // 3. Create initial draft version
 const { data: version, error: versionError } = await db
 .from("experience_versions")
 .insert({ document_id: newDoc.id, version_number: 1, status: "draft" })
 .select()
 .single();

 if (versionError) throw versionError;

 // 4. Inject template nodes if requested
 const templateId = input?.template_id ?? "blank";
 const templateFn = INSTITUTIONAL_TEMPLATES[templateId] ?? INSTITUTIONAL_TEMPLATES.blank;
 const { randomUUID } = await import("crypto");
 const seedNodes = templateFn(() => randomUUID());

 if (seedNodes.length > 0) {
 const nodesToInsert = seedNodes.map((n: any) => ({ ...n, version_id: version.id }));
 await db.from("experience_nodes").insert(nodesToInsert);
 }

 return { status: "success" as const, data: { id: newDoc.id, isNew: true, templateId } };
 } catch (e) {
 console.error("[builder.functions] getOrCreateInstitutionalDocument error:", e);
 throw new Error("Erro ao inicializar perfil institucional.");
 }
 });

// ---------------------------------------------------------------------------
// Public Storefront Rendering & Data Hydration
// ---------------------------------------------------------------------------

export const getPublicExperienceDocumentBySlug = createServerFn({ method: "GET" })
 .validator(
 z.object({
 slug: z.string(),
 document_type: z
 .enum([
 "storefront",
 "biolink",
 "pwa",
 "campaign",
 "seller_showcase",
 "product_template",
 "campaign_popup",
 ])
 .default("storefront"),
 storeId: z.string().optional(),
 }),
 )
 .handler(async ({ data: input }) => {
 try {
 const db = getServerClient();
 let resolvedStoreId: string | null = null;

 if (input.storeId) {
 // Se for um UUID válido
 if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.storeId)) {
 resolvedStoreId = input.storeId;
 } else {
 // Busca pelo slug da loja
 const { data: st } = await db
 .from("stores")
 .select("id")
 .eq("slug", input.storeId)
 .limit(1)
 .maybeSingle();
 if (st) resolvedStoreId = st.id;
 }
 }

 if (!resolvedStoreId) {
 const { resolveTenantStoreId } = await import("@/lib/tenant.server");
 resolvedStoreId = await resolveTenantStoreId();
 }

 if (!resolvedStoreId) {
 const { resolvePlatformRootStore } = await import("@/services/master.functions");
 const rootStore = await resolvePlatformRootStore(db);
 resolvedStoreId = rootStore?.id || null;
 }

 if (!resolvedStoreId) return { status: "not_found" as const };
 const storeId = resolvedStoreId;

 // 1. Get Document (tenta primeiro com o document_type solicitado, ou qualquer tipo ativo se não especificado)
 let docQuery = db
 .from("experience_documents")
 .select("*")
 .eq("store_id", storeId)
 .eq("slug", input.slug)
 .eq("is_active", true);

 if (input.document_type) {
 docQuery = docQuery.eq("document_type", input.document_type);
 }

 let { data: doc, error: docError } = await docQuery.maybeSingle();

 // Fallback: se não encontrou com o document_type exato, busca qualquer documento ativo com esse slug
 if (!doc && input.document_type) {
 const { data: fallbackDoc } = await db
 .from("experience_documents")
 .select("*")
 .eq("store_id", storeId)
 .eq("slug", input.slug)
 .eq("is_active", true)
 .maybeSingle();

 if (fallbackDoc) {
 doc = fallbackDoc;
 docError = null;
 }
 }

 if (docError) {
 if (
 docError.code === "PGRST116" &&
 input.slug === "home" &&
 input.document_type === "storefront"
 ) {
 // Auto-seed default storefront template for new store
 const { HOME_TEMPLATES_LIBRARY } = await import("@/lib/home-templates-library");
 const { randomUUID } = await import("crypto");
 const defaultPreset =
 HOME_TEMPLATES_LIBRARY["minimalist_luxury"] || Object.values(HOME_TEMPLATES_LIBRARY)[0];

 const { data: newDoc } = await db
 .from("experience_documents")
 .insert({
 store_id: storeId,
 title: "Vitrine Principal",
 slug: "home",
 document_type: "storefront",
 is_active: true,
 })
 .select()
 .single();

 if (newDoc) {
 const { data: newVersion } = await db
 .from("experience_versions")
 .insert({
 document_id: newDoc.id,
 version_number: 1,
 status: "published",
 })
 .select()
 .single();

 if (newVersion && defaultPreset) {
 const seedNodes = defaultPreset.nodesFactory(() => randomUUID());
 const nodesToInsert = seedNodes.map((n: any) => ({
 ...n,
 version_id: newVersion.id,
 }));
 await db.from("experience_nodes").insert(nodesToInsert);

 const hydratedNodes = await hydrateBindings(nodesToInsert as any, db, storeId);
 const buildTree = (flatNodes: any[], parentId: string | null = null): any[] => {
 return flatNodes
 .filter((n) => (parentId === null ? !n.parent_id : n.parent_id === parentId))
 .sort((a, b) => a.sort_order - b.sort_order)
 .map((node) => ({
 ...node,
 children: buildTree(flatNodes, node.id),
 }));
 };
 const tree = buildTree(hydratedNodes);
 return {
 status: "ok" as const,
 data: { document: newDoc as ExperienceDocument, tree },
 };
 }
 }
 }
 if (docError.code === "PGRST116") return { status: "not_found" as const };
 throw docError;
 }

  if (!doc) {
    return { status: "not_found" as const };
  }

  // Affiliate Tracking Injection
  if (doc?.owner_id) {
    const { setSellerRefCookie } = await import("@/lib/session");
    setSellerRefCookie(doc.owner_id);
  }

 // 2. Get the latest PUBLISHED version
 const { data: versions, error: versionsError } = await db
 .from("experience_versions")
 .select("*")
 .eq("document_id", doc.id)
 .eq("status", "published")
 .order("created_at", { ascending: false })
 .limit(1);

 if (versionsError) throw versionsError;

 let version = versions && versions.length > 0 ? versions[0] : null;
 if (!version && input.slug === "home" && input.document_type === "storefront") {
 // Auto-seed published version for home document
 const { HOME_TEMPLATES_LIBRARY } = await import("@/lib/home-templates-library");
 const { randomUUID } = await import("crypto");
 const defaultPreset =
 HOME_TEMPLATES_LIBRARY["minimalist_luxury"] || Object.values(HOME_TEMPLATES_LIBRARY)[0];

 const { data: newVersion } = await db
 .from("experience_versions")
 .insert({
 document_id: doc.id,
 version_number: 1,
 status: "published",
 })
 .select()
 .single();

 if (newVersion && defaultPreset) {
 const seedNodes = defaultPreset.nodesFactory(() => randomUUID());
 const nodesToInsert = seedNodes.map((n: any) => ({
 ...n,
 version_id: newVersion.id,
 }));
 await db.from("experience_nodes").insert(nodesToInsert);
 version = newVersion;
 }
 }

 if (!version) {
 return { status: "not_found" as const };
 }

 // 3. Get Nodes
 const { data: nodesData, error: nodesError } = await db
 .from("experience_nodes")
 .select("*")
 .eq("version_id", version.id)
 .order("sort_order", { ascending: true });

 if (nodesError) throw nodesError;
 const nodes = nodesData as ExperienceNode[];

 // 4. Hydrate Data Bindings — shared helper covers store_profile, products, reviews
 if (!storeId) throw new Error("Loja não encontrada");
 const hydratedNodes = await hydrateBindings(nodes, db, storeId);

 // 5. Build Tree
 const buildTree = (flatNodes: any[], parentId: string | null = null): any[] => {
 return flatNodes
 .filter((n) => (parentId === null ? !n.parent_id : n.parent_id === parentId))
 .sort((a, b) => a.sort_order - b.sort_order)
 .map((node) => ({
 ...node,
 children: buildTree(flatNodes, node.id),
 }));
 };

 const tree = buildTree(hydratedNodes);

 return { status: "ok" as const, data: { document: doc as ExperienceDocument, tree } };
 } catch (e) {
    // Backend não configurado não é erro fatal de página: a vitrine deve
    // renderizar o estado "em configuração" em vez de derrubar o SSR.
    if (e instanceof SupabaseUnconfiguredError) return { status: "unconfigured" as const };
    console.warn("[builder.functions] getPublicExperienceDocumentBySlug handled not_found/error:", e instanceof Error ? e.message : e);
    return { status: "not_found" as const };
  }
 });

// ---------------------------------------------------------------------------
// Nodes Editor Mutations
// ---------------------------------------------------------------------------

export const getActiveGlobalPopups = createServerFn({ method: "GET" }).handler(async () => {
 try {
 const { resolveTenantStoreId } = await import("@/lib/tenant.server");
 const storeId = await resolveTenantStoreId();
 if (!storeId) return [];

 const db = getServerClient();

 const { data: docs, error: docError } = await db
 .from("experience_documents")
 .select("*")
 .eq("store_id", storeId)
 .eq("document_type", "campaign_popup")
 .eq("is_active", true);

 if (docError) throw docError;
 if (!docs || docs.length === 0) return [];

 // Load published versions for all active popup documents
 const activePopups = await Promise.all(
 docs.map(async (doc) => {
 const { data: versions } = await db
 .from("experience_versions")
 .select("id")
 .eq("document_id", doc.id)
 .eq("status", "published")
 .order("created_at", { ascending: false })
 .limit(1);

 const version = versions && versions.length > 0 ? versions[0] : null;
 if (!version) return null;

 const { data: nodesData } = await db
 .from("experience_nodes")
 .select("*")
 .eq("version_id", version.id)
 .order("sort_order", { ascending: true });

 const nodes = (nodesData || []) as ExperienceNode[];

 const buildTree = (flatNodes: any[], parentId: string | null = null): any[] => {
 return flatNodes
 .filter((n) => (parentId === null ? !n.parent_id : n.parent_id === parentId))
 .sort((a, b) => a.sort_order - b.sort_order)
 .map((node) => ({
 ...node,
 children: buildTree(flatNodes, node.id),
 }));
 };

 return {
 id: doc.id,
 trigger_rules: doc.trigger_rules || {},
 tree: buildTree(nodes),
 };
 }),
 );

 return activePopups.filter(Boolean);
 } catch (e) {
 throw new Error("Erro ao carregar popups globais.");
 }
});

export const saveBuilderNodes = createServerFn({ method: "POST" })
 .validator(
 z.object({
 version_id: z.string().uuid(),
 nodes: z.array(ExperienceNodeSchema),
 }),
 )
 .handler(async ({ data: input }) => {
 try {
 const { getServerIdentity } = await import("@/lib/server-access");
 const identity = await getServerIdentity();
 if (!identity.id) throw new Error("Não autenticado.");

 const db = getServerClient();

 // 0. Validate ownership and get version info
 const { data: versionCheck, error: vErr } = await db
 .from("experience_versions")
 .select("id, status, document_id, version_number, experience_documents!inner(store_id)")
 .eq("id", input.version_id)
 .maybeSingle();

 if (vErr || !versionCheck) throw new Error("Acesso negado à versão do documento.");

 const docStoreId = (versionCheck as any)?.experience_documents?.store_id;
 const storeId = await resolveStoreContext(identity, docStoreId, versionCheck.document_id);

 let targetVersionId = input.version_id;
 let isForked = false;
 let targetVersion: any = versionCheck;

 if (versionCheck.status === "published") {
 // Fork: Cria nova versão rascunho
 const { data: newVersion, error: forkError } = await db
 .from("experience_versions")
 .insert({
 document_id: versionCheck.document_id,
 version_number: (versionCheck.version_number || 1) + 1,
 status: "draft",
 })
 .select()
 .single();

 if (forkError) throw forkError;
 targetVersionId = newVersion.id;
 targetVersion = newVersion;
 isForked = true;
 } else {
 // Versão já em rascunho: remove nós anteriores para substituição atômica
 const { error: delError } = await db
 .from("experience_nodes")
 .delete()
 .eq("version_id", targetVersionId);

 if (delError) throw delError;
 }

 // 2. Mapeamento de nós (com novos UUIDs se for forked para evitar colisão de PK)
 const idMap = new Map<string, string>();
 if (isForked) {
 input.nodes.forEach((node) => {
 idMap.set(node.id, crypto.randomUUID());
 });
 }

 const nodesToInsert = input.nodes.map((node: any) => {
 const newId = isForked ? idMap.get(node.id)! : node.id;
 const newParentId = node.parent_id
 ? (isForked ? idMap.get(node.parent_id) || null : node.parent_id)
 : null;

 return {
 id: newId,
 version_id: targetVersionId,
 parent_id: newParentId,
 node_type: node.node_type,
 block_type: node.block_type,
 layout_variant: node.layout_variant || null,
 content: node.content || {},
 design_tokens: node.design_tokens || {},
 layout_rules: node.layout_rules || {},
 responsive_overrides: node.responsive_overrides || {},
 data_bindings: node.data_bindings || {},
 action_bindings: node.action_bindings || {},
 sort_order: node.sort_order || 0,
 is_hidden: node.is_hidden || false,
 };
 });

 // 3. Sanitização e Ordenação Topológica (Pais ANTES de filhos para cumprir FK parent_id)
 const nodeMap = new Map(nodesToInsert.map((n) => [n.id, n]));
 nodesToInsert.forEach((n) => {
 if (n.parent_id && !nodeMap.has(n.parent_id)) {
 n.parent_id = null; // Evita chave estrangeira órfã
 }
 });

 const sortedNodes: typeof nodesToInsert = [];
 const visited = new Set<string>();

 const visitNode = (n: (typeof nodesToInsert)[0]) => {
 if (visited.has(n.id)) return;
 if (n.parent_id && nodeMap.has(n.parent_id)) {
 visitNode(nodeMap.get(n.parent_id)!);
 }
 visited.add(n.id);
 sortedNodes.push(n);
 };

 nodesToInsert.forEach((n) => visitNode(n));

 // 4. Inserção no banco
 if (sortedNodes.length > 0) {
 const { error: insError } = await db.from("experience_nodes").insert(sortedNodes);
 if (insError) throw insError;
 }

 return {
 status: "success" as const,
 version_id: targetVersionId,
 version: targetVersion,
 nodes: sortedNodes,
 };
 } catch (e: unknown) {
 console.error("[builder.functions] saveBuilderNodes error:", e);
 throw new Error("Erro ao salvar o documento: " + (e instanceof Error ? e.message : String(e)));
 }
 });

// ---------------------------------------------------------------------------
// Publish: save nodes AND mark version as published
// ---------------------------------------------------------------------------

export const publishBuilderVersion = createServerFn({ method: "POST" })
 .validator(
 z.object({
 version_id: z.string().uuid(),
 nodes: z.array(ExperienceNodeSchema),
 }),
 )
 .handler(async ({ data: input }) => {
 try {
 const { getServerIdentity } = await import("@/lib/server-access");
 const identity = await getServerIdentity();
 if (!identity.id) throw new Error("Não autenticado.");

 const db = getServerClient();

 // 1. Validação de posse do documento
 const { data: version, error: vErr } = await db
 .from("experience_versions")
 .select("id, document_id, version_number, status, experience_documents!inner(store_id)")
 .eq("id", input.version_id)
 .maybeSingle();

 if (vErr || !version) {
 throw new Error("Acesso negado ou versão não encontrada.");
 }

 const docStoreId = (version as any)?.experience_documents?.store_id;
 const storeId = await resolveStoreContext(identity, docStoreId, version.document_id);

 // 2. Arquiva versões publicadas anteriores do mesmo documento
 await db
 .from("experience_versions")
 .update({ status: "archived" })
 .eq("document_id", version.document_id)
 .eq("status", "published");

 // 3. Substitui os nós desta versão com ordenação topológica
 await db.from("experience_nodes").delete().eq("version_id", input.version_id);

 if (input.nodes.length > 0) {
 const nodesToInsert = input.nodes.map((node: any) => ({
 id: node.id,
 version_id: input.version_id,
 parent_id: node.parent_id || null,
 node_type: node.node_type,
 block_type: node.block_type,
 layout_variant: node.layout_variant || null,
 content: node.content || {},
 design_tokens: node.design_tokens || {},
 layout_rules: node.layout_rules || {},
 responsive_overrides: node.responsive_overrides || {},
 data_bindings: node.data_bindings || {},
 action_bindings: node.action_bindings || {},
 sort_order: node.sort_order || 0,
 is_hidden: node.is_hidden || false,
 }));

 const nodeMap = new Map(nodesToInsert.map((n) => [n.id, n]));
 nodesToInsert.forEach((n) => {
 if (n.parent_id && !nodeMap.has(n.parent_id)) {
 n.parent_id = null;
 }
 });

 const sortedNodes: typeof nodesToInsert = [];
 const visited = new Set<string>();
 const visitNode = (n: (typeof nodesToInsert)[0]) => {
 if (visited.has(n.id)) return;
 if (n.parent_id && nodeMap.has(n.parent_id)) {
 visitNode(nodeMap.get(n.parent_id)!);
 }
 visited.add(n.id);
 sortedNodes.push(n);
 };
 nodesToInsert.forEach((n) => visitNode(n));

 const { error: insError } = await db.from("experience_nodes").insert(sortedNodes);
 if (insError) throw insError;
 }

 // 4. Marca esta versão como published
 const { data: updatedVersion, error: pubError } = await db
 .from("experience_versions")
 .update({ status: "published" })
 .eq("id", input.version_id)
 .select()
 .single();

 if (pubError) throw pubError;

 return { status: "success" as const, version: updatedVersion || { ...version, status: "published" } };
 } catch (e: unknown) {
 console.error("[builder.functions] publishBuilderVersion error:", e);
 throw new Error("Erro ao publicar versão: " + (e instanceof Error ? e.message : String(e)));
 }
 });

// ---------------------------------------------------------------------------
// Advanced Builder Data Hydration
// ---------------------------------------------------------------------------

export const getBuilderProducts = createServerFn({ method: "GET" })
 .validator(z.object({ limit: z.number().optional() }).optional())
 .handler(async ({ data: input }) => {
 try {
 await requireAdmin(); // SECURITY FIX
 const db = getServerClient();
 const { data, error } = await db
 .from("products")
 .select(
 "id, title, slug, price_cents, compare_at_cents, media:product_media(url, alt, sort_order)",
 )
 .eq("status", "active")
 .order("created_at", { ascending: false })
 .limit(input?.limit || 4);

 if (error) throw error;

 const formatted = data.map((p) => {
 const sortedMedia = p.media
 ? [...p.media].sort((a: any, b: any) => a.sort_order - b.sort_order)
 : [];
 return {
 id: p.id,
 title: p.title,
 slug: p.slug,
 priceCents: p.price_cents,
 compareAtCents: p.compare_at_cents,
 coverUrl: sortedMedia[0]?.url || null,
 hoverUrl: sortedMedia[1]?.url || null,
 isOutOfStock: false,
 };
 });

 return formatted;
 } catch (e) {
 if (e instanceof SupabaseUnconfiguredError) throw e;
 console.error("[builder.functions] getBuilderProducts error:", e);
 throw new Error("Erro ao buscar produtos.");
 }
 });

export const getBuilderReviews = createServerFn({ method: "GET" }).handler(async () => {
 try {
 await requireAdmin(); // SECURITY FIX
 const db = getServerClient();
 const { data, error } = await db
 .from("reviews")
 .select("id, rating, comment, user_id, profiles(full_name, avatar_url)")
 .eq("status", "approved")
 .not("comment", "is", null)
 .neq("comment", "")
 .order("created_at", { ascending: false })
 .limit(6);

 if (error) throw error;

 const formatted = data.map((r) => {
 const profile = (r.profiles as any) || {};
 return {
 author: profile.full_name || "Cliente",
 role: "Cliente Verificado",
 content: r.comment,
 rating: r.rating,
 avatar_url: profile.avatar_url || null,
 };
 });

 return formatted;
 } catch (e) {
 if (e instanceof SupabaseUnconfiguredError) throw e;
 console.error("[builder.functions] getBuilderReviews error:", e);
 throw new Error("Erro ao buscar avaliações.");
 }
});

export const getOrCreateStorefrontExperienceDocument = createServerFn({ method: "POST" })
 .validator(z.object({ template_id: z.string().optional() }).optional())
 .handler(async ({ data: input }) => {
 await requireAdmin();
 const { getServerIdentity } = await import("@/lib/server-access");
 const identity = await getServerIdentity();
 if (!identity.store_id) throw new Error("No store found");
 const db = getServerClient();

 // Check if storefront document exists
 const { data: existing } = await db
 .from("experience_documents")
 .select("id")
 .eq("store_id", identity.store_id)
 .eq("slug", "home")
 .eq("document_type", "storefront")
 .maybeSingle();

 if (existing?.id) {
 return { documentId: existing.id };
 }

 // Otherwise create default storefront document
 const res = await createExperienceDocument({
 data: {
 title: "Vitrine Principal da Loja",
 slug: "home",
 document_type: "storefront",
 template_id: input?.template_id || "homepage_classic",
 },
 });

 return { documentId: res.data.document.id };
 });

export const getOrCreateBiolinkExperienceDocument = createServerFn({ method: "POST" })
 .validator(z.object({ template_id: z.string().optional() }).optional())
 .handler(async ({ data: input }) => {
 await requireAdmin();
 const { getServerIdentity } = await import("@/lib/server-access");
 const identity = await getServerIdentity();
 if (!identity.store_id) throw new Error("No store found");
 const db = getServerClient();

 // Check if biolink document exists
 const { data: existing } = await db
 .from("experience_documents")
 .select("id")
 .eq("store_id", identity.store_id)
 .eq("slug", "bio")
 .eq("document_type", "biolink")
 .maybeSingle();

 if (existing?.id) {
 return { documentId: existing.id };
 }

 // Otherwise create default biolink document
 const res = await createExperienceDocument({
 data: {
 title: "Link da Bio Oficial",
 slug: "bio",
 document_type: "biolink",
 template_id: input?.template_id || "biolink_classic",
 },
 });

 return { documentId: res.data.document.id };
 });

export const duplicateExperienceDocument = createServerFn({ method: "POST" })
 .validator(z.object({ id: z.string().uuid() }))
 .handler(async ({ data: input }) => {
 await requireAdmin();
 const { getServerIdentity } = await import("@/lib/server-access");
 const identity = await getServerIdentity();
 if (!identity.store_id) throw new Error("No store found");
 const db = getServerClient();

 // 1. Get original doc
 const original = await getExperienceDocument({ data: { id: input.id } });
 if (!original.data?.document) throw new Error("Documento original não encontrado.");

 const origDoc = original.data.document;
 const origNodes = original.data.nodes || [];

 const newSlug = `${origDoc.slug}-copia-${Date.now().toString().slice(-4)}`;
 const newTitle = `${origDoc.title} (Cópia)`;

 // 2. Create new document
 const { data: newDoc, error: docError } = await db
 .from("experience_documents")
 .insert({
 store_id: identity.store_id,
 title: newTitle,
 slug: newSlug,
 document_type: origDoc.document_type || "campaign",
 is_active: true,
 })
 .select()
 .single();

 if (docError || !newDoc) throw new Error("Erro ao duplicar documento.");

 // 3. Create version
 const { data: newVersion, error: verError } = await db
 .from("experience_versions")
 .insert({
 document_id: newDoc.id,
 version_number: 1,
 status: "draft",
 })
 .select()
 .single();

 if (verError || !newVersion) throw new Error("Erro ao criar versão duplicada.");

 // 4. Duplicate nodes with new IDs
 if (origNodes.length > 0) {
 const idMap = new Map<string, string>();
 const getNewId = (oldId: string) => {
 if (!idMap.has(oldId)) idMap.set(oldId, crypto.randomUUID());
 return idMap.get(oldId)!;
 };

 const nodesToInsert = origNodes.map((node) => ({
 id: getNewId(node.id),
 version_id: newVersion.id,
 parent_id: node.parent_id ? getNewId(node.parent_id) : null,
 node_type: node.node_type,
 block_type: node.block_type,
 sort_order: node.sort_order,
 layout_rules: node.layout_rules,
 design_tokens: node.design_tokens,
 content: node.content,
 data_bindings: node.data_bindings,
 }));

 await db.from("experience_nodes").insert(nodesToInsert);
 }

 return { documentId: newDoc.id };
 });



// ---------------------------------------------------------------------------
// Document Management & Duplication (Microfase 76B)
// ---------------------------------------------------------------------------

export const deleteExperienceDocument = createServerFn({ method: "POST" })
 .validator(z.object({ id: z.string().uuid() }))
 .handler(async ({ data: input }) => {
 try {
 await requireAdmin();
 const { getServerIdentity } = await import("@/lib/server-access");
 const identity = await getServerIdentity();
 if (!identity.store_id) throw new Error("No store found");

 const db = getServerClient();

 // Delete document (cascade removes versions and nodes)
 const { error } = await db
 .from("experience_documents")
 .delete()
 .eq("id", input.id)
 .eq("store_id", identity.store_id);

 if (error) throw error;
 return { status: "success" as const };
 } catch (e: unknown) {
 console.error("[builder.functions] deleteExperienceDocument error:", e);
 throw new Error((e instanceof Error ? e.message : String(e)) || "Erro ao excluir documento.");
 }
 });

export const setActiveStorefrontDocument = createServerFn({ method: "POST" })
 .validator(z.object({ id: z.string().uuid() }))
 .handler(async ({ data: input }) => {
 try {
 await requireAdmin();
 const { getServerIdentity } = await import("@/lib/server-access");
 const identity = await getServerIdentity();
 if (!identity.store_id) throw new Error("No store found");

 const db = getServerClient();

 // 1. Get the target document to know its type
 const { data: targetDoc, error: findError } = await db
 .from("experience_documents")
 .select("id, document_type")
 .eq("id", input.id)
 .eq("store_id", identity.store_id)
 .single();

 if (findError || !targetDoc) throw new Error("Documento não encontrado.");

 // 2. If it is a storefront or biolink, ensure only this one is active for that type
 if (targetDoc.document_type === "storefront" || targetDoc.document_type === "biolink") {
 await db
 .from("experience_documents")
 .update({ is_active: false })
 .eq("store_id", identity.store_id)
 .eq("document_type", targetDoc.document_type);
 }

 // 3. Mark the target as active
 const { error: updateError } = await db
 .from("experience_documents")
 .update({ is_active: true })
 .eq("id", input.id)
 .eq("store_id", identity.store_id);

 if (updateError) throw updateError;

 return { status: "success" as const };
 } catch (e: unknown) {
 console.error("[builder.functions] setActiveStorefrontDocument error:", e);
 throw new Error((e instanceof Error ? e.message : String(e)) || "Erro ao ativar documento.");
 }
 });

export const updateExperienceDocumentSettings = createServerFn({ method: "POST" })
 .validator(
 z.object({
 document_id: z.string().uuid(),
 settings: z.object({
 theme: z
 .object({
 primaryColor: z.string().optional(),
 backgroundColor: z.string().optional(),
 textColor: z.string().optional(),
 headingFont: z.string().optional(),
 bodyFont: z.string().optional(),
 borderRadius: z.string().optional(),
 surfaceStyle: z.string().optional(),
 })
 .optional(),
 pages: z
 .array(
 z.object({
 id: z.string(),
 title: z.string(),
 slug: z.string(),
 is_home: z.boolean().default(false),
 seo_title: z.string().optional(),
 seo_description: z.string().optional(),
 })
 )
 .optional(),
 }),
 })
 )
 .handler(async ({ data: input }) => {
 try {
 await requireAdmin();
 const { getServerIdentity } = await import("@/lib/server-access");
 const identity = await getServerIdentity();
 if (!identity.store_id) throw new Error("No store found");

 const db = getServerClient();

 // 1. Fetch current settings to merge
 const { data: currentDoc, error: fetchErr } = await db
 .from("experience_documents")
 .select("settings")
 .eq("id", input.document_id)
 .eq("store_id", identity.store_id)
 .single();

 if (fetchErr || !currentDoc) throw new Error("Documento não encontrado.");

 const currentSettings = (currentDoc.settings || {}) as Record<string, any>;
 const mergedSettings = {
 ...currentSettings,
 ...input.settings,
 theme: {
 ...(currentSettings.theme || {}),
 ...(input.settings.theme || {}),
 },
 };

 const { data: updatedDoc, error: updateErr } = await db
 .from("experience_documents")
 .update({
 settings: mergedSettings,
 updated_at: new Date().toISOString(),
 })
 .eq("id", input.document_id)
 .eq("store_id", identity.store_id)
 .select("id, settings")
 .single();

 if (updateErr) throw updateErr;

 return { status: "ok" as const, settings: updatedDoc.settings };
 } catch (e: unknown) {
 console.error("[builder.functions] updateExperienceDocumentSettings error:", e);
 throw new Error((e instanceof Error ? e.message : String(e)) || "Erro ao salvar configurações do documento.");
 }
 });

