/**
 * @fileoverview ENRIQUECEDOR E INSERIDOR ATÔMICO DE PRODUTOS MINERADOS (Plano 5 — S14)
 * Módulo folha de persistência e enriquecimento histórico de preços para desvincular
 * api-orchestrator de dependências circulares com o serviço principal de mining.
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
