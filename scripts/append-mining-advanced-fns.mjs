import fs from 'fs';

const file = 'src/services/mining.functions.ts';
let content = fs.readFileSync(file, 'utf8');

// 1. Ensure imports at top
if (!content.includes('harvestAndPersistDataJudProcess')) {
  content = `import { harvestAndPersistDataJudProcess } from "./mining/datajud-harvester";\nimport { harvestAndPersistPlaces } from "./mining/places-harvester";\n` + content;
}

// 2. Append new server functions if not present
if (!content.includes('harvestDataJudMiningFn')) {
  const fnsCode = `

// ============================================================
// Harvesters Especializados & Engine de Economia de Tokens V16
// ============================================================

/**
 * Harvester DataJud CNJ (Processos Judiciais via Elasticsearch Oficial)
 */
export const harvestDataJudMiningFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      process_number: z.string().min(14, "Número CNJ obrigatório"),
      store_id: z.string().uuid().optional(),
    })
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity().catch(() => null);
    const result = await harvestAndPersistDataJudProcess({
      processNumber: data.process_number,
      storeId: data.store_id,
      profileId: identity?.id,
    });
    if (!result.success) {
      throw new Error(result.error || "Falha ao minerar processo no DataJud");
    }
    return result;
  });

/**
 * Harvester de Lugares & Empresas (Google Maps / OpenStreetMap Nominatim)
 */
export const harvestPlacesBatchFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      query: z.string().min(2, "Termo de busca obrigatório"),
      city: z.string().default("Chapecó"),
      state: z.string().default("SC"),
      store_id: z.string().uuid().optional(),
    })
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity().catch(() => null);
    const result = await harvestAndPersistPlaces({
      query: data.query,
      city: data.city,
      state: data.state,
      storeId: data.store_id,
      authorProfileId: identity?.id,
    });
    if (!result.success) {
      throw new Error(result.error || "Falha ao minerar estabelecimentos locais");
    }
    return result;
  });

/**
 * Harvester Especializado de URL (Notícias, Receitas, Eventos com Zero IA)
 */
export const harvestSpecializedUrlFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      url: z.string().url("URL inválida"),
      store_id: z.string().uuid().optional(),
    })
  )
  .handler(async ({ data }) => {
    const extraction = await extractContentMechanically(data.url);
    const supabase = getServerClient();
    const titleHash = generateTitleHash(extraction.title);

    const { data: rawRecord, error } = await supabase
      .from("mined_raw_extractions")
      .insert({
        content_type: extraction.contentType,
        source_url: data.url,
        source_domain: new URL(data.url).hostname.replace("www.", ""),
        source_name: extraction.author || "Extração Mecânica",
        raw_title: extraction.title,
        raw_lead: extraction.lead,
        raw_body_text: extraction.bodyText,
        cover_image_url: extraction.coverImageUrl,
        gallery_images: extraction.galleryImages,
        type_metadata: extraction.recipeData || extraction.eventData || {},
        word_count: extraction.wordCount,
        paragraph_count: extraction.paragraphCount,
        extraction_method: extraction.method,
        title_hash: titleHash,
        status: "ready_for_curation",
        store_id: data.store_id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.warn("[harvestSpecializedUrlFn] Erro ao salvar em mined_raw_extractions:", error.message);
    }

    return {
      success: true,
      extraction,
      rawRecordId: rawRecord?.id,
      tokensSavedEstimate: Math.round(extraction.bodyText.length / 4),
    };
  });

/**
 * Telemetria de Economia de Tokens (Mecânica Zero-Token vs IA)
 */
export const getTokenEconomyMetricsFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const supabase = getAnonServerClient();

    // Contagem de extrações mecânicas em scraper_audit_log
    const { count: mechanicalCount } = await supabase
      .from("scraper_audit_log")
      .select("*", { count: "exact", head: true });

    // Contagem de itens em mined_articles
    const { count: minedCount } = await supabase
      .from("mined_articles")
      .select("*", { count: "exact", head: true });

    // Contagem de empresas em directory_listings
    const { count: directoryCount } = await supabase
      .from("directory_listings")
      .select("*", { count: "exact", head: true })
      .eq("is_crawled", true);

    // Contagem de processos em mined_lawsuits
    const { count: lawsuitsCount } = await supabase
      .from("mined_lawsuits")
      .select("*", { count: "exact", head: true });

    const totalMechanicalExtractions = (mechanicalCount || 0) + (minedCount || 0) + (directoryCount || 0) + (lawsuitsCount || 0);
    // Cada extração mecânica economiza em média 3.500 tokens de IA
    const estimatedTokensSaved = totalMechanicalExtractions * 3500;

    return {
      totalMechanicalExtractions,
      estimatedTokensSaved,
      breakdown: {
        auditLogEntries: mechanicalCount || 0,
        minedArticles: minedCount || 0,
        crawledDirectoryListings: directoryCount || 0,
        minedLawsuits: lawsuitsCount || 0,
      },
    };
  });
`;

  content = content.trimEnd() + fnsCode + '\n';
}

fs.writeFileSync(file, content, 'utf8');
console.log('Appended mining advanced functions successfully');
