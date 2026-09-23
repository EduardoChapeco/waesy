import fs from 'fs';
const path = 'src/services/mining.functions.ts';
let content = fs.readFileSync(path, 'utf-8');

// 1. Check if enrichOrInsertMinedProduct already exists
if (!content.includes('export async function enrichOrInsertMinedProduct')) {
  const enrichFunction = `
/**
 * Enriquecimento Dinâmico vs. Duplicação (Master Prompt V18 - Fase 4)
 * Evita linhas duplicadas no catálogo global de produtos minerados,
 * atualizando histórico de preços, imagens e metadados quando o produto já existe.
 */
export async function enrichOrInsertMinedProduct(supabase: any, prodPayload: any) {
  // 1. Busca por source_url exata
  const { data: existingByUrl } = await supabase
    .from("mined_products")
    .select("id, price_history, image_url, description, price_cents")
    .eq("source_url", prodPayload.source_url)
    .maybeSingle();

  let existing = existingByUrl;
  if (!existing && prodPayload.title && prodPayload.source_domain) {
    const { data: existingByTitle } = await supabase
      .from("mined_products")
      .select("id, price_history, image_url, description, price_cents")
      .eq("source_domain", prodPayload.source_domain)
      .ilike("title", prodPayload.title.trim())
      .maybeSingle();
    existing = existingByTitle;
  }

  if (existing) {
    const priceHistory = Array.isArray(existing.price_history) ? [...existing.price_history] : [];
    if (prodPayload.price_cents > 0 && prodPayload.price_cents !== existing.price_cents) {
      priceHistory.push({ date: new Date().toISOString(), price_cents: prodPayload.price_cents });
    }

    await supabase
      .from("mined_products")
      .update({
        price_cents: prodPayload.price_cents > 0 ? prodPayload.price_cents : existing.price_cents,
        compare_at_cents: prodPayload.compare_at_cents || undefined,
        image_url: existing.image_url || prodPayload.image_url,
        description: existing.description || prodPayload.description,
        price_history: priceHistory,
        availability: prodPayload.availability || "in_stock",
        quality_score: Math.max(prodPayload.quality_score || 70, 80),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    return { action: "enriched", id: existing.id };
  } else {
    const { data: inserted } = await supabase
      .from("mined_products")
      .insert(prodPayload)
      .select("id")
      .maybeSingle();
    return { action: "inserted", id: inserted?.id };
  }
}
`;

  // Insert function at top-level before addCrawlUrlSchema
  const target = 'export const addCrawlUrlSchema = z.object({';
  content = content.replace(target, enrichFunction + '\n' + target);
  console.log('enrichOrInsertMinedProduct declared at top level');

  // Replace upsert call with enrichOrInsertMinedProduct
  const oldUpsertRegex = /await supabase\.from\("mined_products"\)\.upsert\([\s\S]*?\{ onConflict: "source_url" \}\s*\);/;
  const newCall = `await enrichOrInsertMinedProduct(supabase, {
                    source_url: pageData.url,
                    source_domain: pageData.domain,
                    title: prod.title,
                    description: prod.description || pageData.openGraph.description,
                    brand: prod.brand,
                    sku: prod.sku,
                    price_cents: prod.priceCents,
                    compare_at_cents: prod.compareAtCents,
                    currency: prod.currency || "BRL",
                    image_url: prod.imageUrl || pageData.openGraph.image,
                    availability: prod.availability || "in_stock",
                    category: prod.category || pageData.classification?.signals?.[0],
                    price_history: [{ date: new Date().toISOString(), price_cents: prod.priceCents }],
                    quality_score: prod.priceCents > 0 ? 85 : 60,
                    status: "pending_review",
                    updated_at: new Date().toISOString(),
                  });`;

  if (oldUpsertRegex.test(content)) {
    content = content.replace(oldUpsertRegex, newCall);
    console.log('Upsert replaced with enrichOrInsertMinedProduct call');
  } else {
    console.log('Regex did not match old upsert call (might already be using enrichOrInsertMinedProduct)');
  }

  fs.writeFileSync(path, content, 'utf-8');
  console.log('Successfully updated mining.functions.ts with Single Global Source logic at top level!');
} else {
  console.log('enrichOrInsertMinedProduct already exists');
}
