import { createFileRoute } from "@tanstack/react-router";
import { getServerClient } from "@/lib/supabase";

function escapeXml(unsafe: string): string {
 if (!unsafe) return "";
 return unsafe.replace(/[<>&'"]/g, (c) => {
 switch (c) {
 case "<":
 return "&lt;";
 case ">":
 return "&gt;";
 case "&":
 return "&amp;";
 case "'":
 return "&apos;";
 case '"':
 return "&quot;";
 }
 return c;
 });
}

export const Route = createFileRoute("/api/feed/xml")({
 server: {
 handlers: {
 GET: async ({ request }) => {
 try {
 const db = getServerClient();
 const url = new URL(request.url);
 let storeParam = url.searchParams.get("store") || url.searchParams.get("storeId");

 if (!storeParam) {
 const { resolveTenantStoreId } = await import("@/lib/tenant.server");
 storeParam = await resolveTenantStoreId();
 }

 if (!storeParam) {
 return new Response("Missing store parameter", { status: 400 });
 }

 const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storeParam);

 // Fetch store info by UUID or slug
 let storeQuery = db.from("stores").select("id, name, slug");
 if (isUuid) {
 storeQuery = storeQuery.eq("id", storeParam);
 } else {
 storeQuery = storeQuery.eq("slug", storeParam);
 }

 const { data: store } = await storeQuery.maybeSingle();

 if (!store) {
 return new Response("Store not found", { status: 404 });
 }

 const storeId = store.id;

 // Check optional integration credential status
 const { data: gmcIntegration } = await db
 .from("integration_credentials")
 .select("is_active")
 .eq("store_id", storeId)
 .eq("provider", "google_merchant_center")
 .maybeSingle();

 const { data: mktConnector } = await db
 .from("marketplace_connectors")
 .select("status")
 .eq("store_id", storeId)
 .in("platform", ["google_merchant_center", "google_business", "mercadolivre"])
 .maybeSingle();

 // If explicitly disabled in credentials, notify caller
 if (gmcIntegration && gmcIntegration.is_active === false) {
 return new Response(
 "Google Merchant Center feed is currently paused for this store.",
 { status: 403 },
 );
 }

 const { data: products, error } = await db
 .from("products")
 .select(
 `
 id, slug, title, short_description, description, manufacturer, price_cents, compare_at_cents, status, google_product_category,
 product_categories(name),
 product_variants(id, sku, price_cents, price_override_cents, attributes, stock_on_hand),
 product_media(url, sort_order)
 `,
 )
 .eq("store_id", storeId)
 .in("status", ["published", "active"]);

 if (error) {
 console.error("Feed XML Error:", error);
 return new Response("Error fetching catalog", { status: 500 });
 }

 const storeName = store?.name || "Waesy Commerce";

 // Generate RSS XML (Google Merchant / Facebook Catalog compatible)
 let xml = `<?xml version="1.0"?>\n`;
 xml += `<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">\n`;
 xml += `<channel>\n`;
 xml += `<title>${escapeXml(storeName)} — Catálogo</title>\n`;
 xml += `<link>${url.origin}</link>\n`;
 xml += `<description>Feed de Produtos — ${escapeXml(storeName)}</description>\n`;

 for (const p of products || []) {
 // For simple products or configurable ones, we export variants as items
 const variants = p.product_variants || [];
 const medias = (p.product_media || []).sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

 const thumb = medias[0]?.url || "";
 const additionalImages = medias.slice(1, 11);

 if (variants.length === 0) {
 // Fallback to parent product if no variants exist
 variants.push({
 id: p.id,
 sku: p.slug,
 price_cents: p.price_cents,
 price_override_cents: null,
 stock_on_hand: 0, // Estoque zero canônico (sem fallbacks fictícios)
 attributes: {},
 });
 }

 for (const v of variants) {
 // Use variant price_override_cents if available, fallback to product price
 const effectivePriceCents = v.price_override_cents ?? v.price_cents ?? p.price_cents;
 const priceBrl = (effectivePriceCents / 100).toFixed(2);
 const salePriceBrl =
 p.compare_at_cents && p.compare_at_cents > effectivePriceCents
 ? priceBrl
 : undefined;
 const regularPriceBrl = salePriceBrl
 ? (p.compare_at_cents / 100).toFixed(2)
 : priceBrl;

 const link = `${url.origin}/produto/${p.slug}?v=${v.sku || v.id}`;

 const titleExt = Object.values(v.attributes || {}).join(" - ");
 const itemTitle = titleExt ? `${p.title} - ${titleExt}` : p.title;
 const mpn = v.sku || `${p.slug}-${v.id.substring(0, 8)}`;

 xml += `<item>\n`;
 xml += ` <g:id>${escapeXml(v.sku || v.id)}</g:id>\n`;
 xml += ` <g:item_group_id>${escapeXml(p.id)}</g:item_group_id>\n`;
 xml += ` <g:title>${escapeXml(itemTitle)}</g:title>\n`;
 xml += ` <g:description>${escapeXml(p.short_description || p.description || itemTitle)}</g:description>\n`;
 xml += ` <g:link>${escapeXml(link)}</g:link>\n`;
 if (thumb) {
 xml += ` <g:image_link>${escapeXml(thumb)}</g:image_link>\n`;
 }
 for (const img of additionalImages) {
 xml += ` <g:additional_image_link>${escapeXml(img.url)}</g:additional_image_link>\n`;
 }
 xml += ` <g:condition>new</g:condition>\n`;

 const availableQty = v.stock_on_hand || 0;
 xml += ` <g:availability>${availableQty > 0 ? "in stock" : "out of stock"}</g:availability>\n`;
 xml += ` <g:price>${regularPriceBrl} BRL</g:price>\n`;
 if (salePriceBrl) {
 xml += ` <g:sale_price>${salePriceBrl} BRL</g:sale_price>\n`;
 }
 xml += ` <g:brand>${escapeXml(p.manufacturer || "Waesy")}</g:brand>\n`;
 xml += ` <g:mpn>${escapeXml(mpn)}</g:mpn>\n`;
 xml += ` <g:identifier_exists>false</g:identifier_exists>\n`;
 // Usa a categoria Google configurada no produto. Campo vazio é ignorado pelo Google (não causa rejeição).
 if (p.google_product_category) {
 xml += ` <g:google_product_category>${escapeXml(String(p.google_product_category))}</g:google_product_category>\n`;
 }
 if ((p as any).category_name) {
        xml += `      <g:product_type>${escapeXml((p as any).category_name)}</g:product_type>\n`;
      }

 if (v.attributes && typeof v.attributes === "object") {
 const attrs = v.attributes as Record<string, string>;

 // Dynamic size detection — supports multiple naming conventions
 const sizeKeys = ["tamanho", "size", "taille", "numero", "número", "tam"];
 const sizeKey = Object.keys(attrs).find((k) => sizeKeys.includes(k.toLowerCase()));
 if (sizeKey && attrs[sizeKey]) {
 xml += ` <g:size>${escapeXml(attrs[sizeKey])}</g:size>\n`;
 xml += ` <g:size_system>BR</g:size_system>\n`;
 }

 // Dynamic color detection
 const colorKeys = ["cor", "color", "colour", "couleur"];
 const colorKey = Object.keys(attrs).find((k) =>
 colorKeys.includes(k.toLowerCase()),
 );
 if (colorKey && attrs[colorKey]) {
 xml += ` <g:color>${escapeXml(attrs[colorKey])}</g:color>\n`;
 }

 // Dynamic material detection
 const materialKeys = ["material", "tecido", "fabric"];
 const materialKey = Object.keys(attrs).find((k) =>
 materialKeys.includes(k.toLowerCase()),
 );
 if (materialKey && attrs[materialKey]) {
 xml += ` <g:material>${escapeXml(attrs[materialKey])}</g:material>\n`;
 }
 }

 xml += `</item>\n`;
 }
 }

 xml += `</channel>\n`;
 xml += `</rss>`;

 return new Response(xml, {
 status: 200,
 headers: {
 "Content-Type": "application/xml; charset=utf-8",
 "Cache-Control": "public, max-age=3600",
 },
 });
 } catch (e: unknown) {
 console.error("Feed XML Exception:", e);
 return new Response("Internal Server Error", { status: 500 });
 }
 },
 },
 },
});
