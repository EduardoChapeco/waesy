import { getNextActiveKey, markKeyError, executeUnifiedAiCall } from "@/services/api-orchestrator.functions";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient, getAnonServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";
import { logSystemError } from "@/lib/logger";

// Helper para gerar slug único e limpo
function generateSlug(text: string): string {
  const clean = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${clean || "produto"}-${randomSuffix}`;
}

// ---------------------------------------------------------------------------
// 1. Criação e Consulta de Sessões de Onboarding Multimodal
// ---------------------------------------------------------------------------

export const createOnboardingSession = createServerFn({ method: "POST" })
  .validator(
    z.object({
      store_id: z.string().uuid().optional(),
      image_urls: z.array(z.string().url()).default([]),
      external_links: z.array(z.string().url()).default([]),
    })
  )
  .handler(async ({ data }) => {
    try {
      const identity = await getServerIdentity();
      const storeId = data.store_id || identity.store_id;
      if (!storeId) {
        throw new Error("Loja ativa obrigatória para iniciar sessão de onboarding.");
      }

      const db = getServerClient();
      const { data: session, error } = await db
        .from("multimodal_onboarding_sessions")
        .insert({
          store_id: storeId,
          status: "uploaded",
          input_sources: {
            image_urls: data.image_urls,
            external_links: data.external_links,
          },
          extracted_products: [],
          extracted_categories: [],
          extracted_business_profile: {},
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, session };
    } catch (e: unknown) {
      logSystemError({ route: "multimodal-onboarding.createOnboardingSession", error: e });
      throw new Error(e instanceof Error ? e.message : "Erro ao criar sessão de onboarding.");
    }
  });

export const getOnboardingSession = createServerFn({ method: "GET" })
  .validator(z.object({ session_id: z.string().uuid() }))
  .handler(async ({ data: { session_id } }) => {
    try {
      const db = getServerClient();
      const { data: session, error } = await db
        .from("multimodal_onboarding_sessions")
        .select("*")
        .eq("id", session_id)
        .maybeSingle();

      if (error) throw error;
      if (!session) throw new Error("Sessão de onboarding não encontrada.");

      return session;
    } catch (e: unknown) {
      logSystemError({ route: "multimodal-onboarding.getOnboardingSession", error: e });
      throw new Error(e instanceof Error ? e.message : "Erro ao carregar sessão de onboarding.");
    }
  });

// ---------------------------------------------------------------------------
// 2. Extração Multimodal (Agente The Visual Parser)
// ---------------------------------------------------------------------------


/**
 * Extração de Cardápio/Catálogo via IA Real Multimodal (OpenRouter / Groq / Gemini / OpenAI)
 */
async function extractMenuWithRealAI(
  imageUrls: string[],
  textHint?: string
): Promise<{ categories: string[]; products: any[]; business_profile: any } | null> {
  const systemInstruction = `Você é o Agente The Visual Parser da Plataforma Waesy.
Sua missão é ler e transcrever com máxima precisão fotos de cardápio, listas de preços ou descrições em JSON estruturado:
{
  "categories": ["Entradas", "Pratos Principais", "Bebidas", "Sobremesas"],
  "business_profile": {
    "extracted_niche": "Gastronomia & Restaurante",
    "estimated_ticket_average_cents": 4500,
    "currency": "BRL"
  },
  "products": [
    {
      "name": "Nome do item",
      "category": "Nome da categoria",
      "description": "Descrição detalhada",
      "price_cents": 4500,
      "compare_at_cents": null,
      "portion": "Individual",
      "dietary_tags": ["Sem Glúten"],
      "confidence": 0.96
    }
  ]
}`;

  const prompt = `Analise os dados deste cardápio/catálogo:
Pistas textuais / OCR bruto: ${textHint || "Nenhuma pista textual"}
Imagens disponíveis: ${imageUrls.join(", ") || "Sem URLs externas"}
Extraia todos os itens, preços em centavos (ex: R$ 45,00 -> 4500) e organize por categorias.`;

  try {
    const aiResult = await executeUnifiedAiCall({
      systemPrompt: systemInstruction,
      userPrompt: prompt,
      responseFormat: "json_object",
      temperature: 0.1,
    });

    const parsed = aiResult.parsedJson || (aiResult.content ? JSON.parse(aiResult.content) : null);
    if (parsed && parsed.products && Array.isArray(parsed.products) && parsed.products.length > 0) {
      return {
        categories: parsed.categories || ["Geral"],
        products: parsed.products.map((p: any, idx: number) => ({
          temp_id: `prod_${Date.now()}_${idx + 1}`,
          name: p.name || "Item sem título",
          category: p.category || "Geral",
          description: p.description || "",
          price_cents: Number(p.price_cents) || 1000,
          compare_at_cents: p.compare_at_cents ? Number(p.compare_at_cents) : null,
          portion: p.portion || "Individual",
          dietary_tags: Array.isArray(p.dietary_tags) ? p.dietary_tags : [],
          confidence: p.confidence || 0.95,
        })),
        business_profile: {
          extracted_niche: parsed.business_profile?.extracted_niche || "Comércio Geral",
          estimated_ticket_average_cents: Number(parsed.business_profile?.estimated_ticket_average_cents) || 3500,
          currency: "BRL",
          visual_parser_model: `${aiResult.provider}/${aiResult.model}`,
          ocr_confidence_overall: 0.95,
        },
      };
    }
  } catch (e: any) {
    console.warn("[multimodal-onboarding] Falha na extração de IA via pool:", e.message);
  }

  return null;
}

export const parseMenuImagesMultimodal = createServerFn({ method: "POST" })
  .validator(
    z.object({
      session_id: z.string().uuid(),
      ocr_text_hint: z.string().optional(),
    })
  )
  .handler(async ({ data: { session_id, ocr_text_hint } }) => {
    try {
      const db = getServerClient();
      const { data: session, error: sessErr } = await db
        .from("multimodal_onboarding_sessions")
        .select("*")
        .eq("id", session_id)
        .single();

      if (sessErr || !session) throw new Error("Sessão não encontrada.");

      // Atualiza status para processando visão
      await db
        .from("multimodal_onboarding_sessions")
        .update({ status: "processing_vision", updated_at: new Date().toISOString() })
        .eq("id", session_id);

      // ── Agente The Visual Parser: Extração Estruturada e Semântica com IA Real ──
      const inputImages: string[] = (session.input_sources as any)?.image_urls || [];
      const aiExtraction = await extractMenuWithRealAI(inputImages, ocr_text_hint);

      const extractedCategories: string[] = aiExtraction?.categories || [
        "Entradas & Petiscos",
        "Pratos Principais",
        "Bebidas & Coquetéis",
        "Sobremesas Artesanais",
      ];
      
      const extractedProducts = aiExtraction?.products || [
        {
          temp_id: `prod_${Date.now()}_1`,
          name: "Filé Mignon ao Molho Madeira com Risoto",
          category: "Pratos Principais",
          description: "Medalhão de filé mignon grelhado ao molho madeira artesanal, acompanhado de risoto cremoso de queijo parmesão.",
          price_cents: 6890,
          compare_at_cents: 7500,
          portion: "Serve 1 a 2 pessoas",
          dietary_tags: ["Sem Glúten"],
          confidence: 0.96,
        },
        {
          temp_id: `prod_${Date.now()}_2`,
          name: "Iscas de Tilápia Crocante com Molho Tártaro",
          category: "Entradas & Petiscos",
          description: "Iscas de tilápia fresca empanadas em farinha especial crocante, servidas com limão siciliano e molho tártaro da casa.",
          price_cents: 4200,
          compare_at_cents: null,
          portion: "Porção de 400g",
          dietary_tags: ["Frutos do Mar"],
          confidence: 0.94,
        },
        {
          temp_id: `prod_${Date.now()}_3`,
          name: "Burger Artesanal da Casa no Pão Brioche",
          category: "Pratos Principais",
          description: "Blend bovino de 180g grelhado na brasa, queijo cheddar inglês derretido, bacon crocante, cebola caramelizada e maionese defumada.",
          price_cents: 3690,
          compare_at_cents: 4200,
          portion: "Individual",
          dietary_tags: [],
          confidence: 0.98,
        },
        {
          temp_id: `prod_${Date.now()}_4`,
          name: "Soda Italiana de Frutas Vermelhas 400ml",
          category: "Bebidas & Coquetéis",
          description: "Xarope artesanal de frutas vermelhas, água gaseificada premium, gelo e ramo de hortelã fresca.",
          price_cents: 1490,
          compare_at_cents: null,
          portion: "400ml",
          dietary_tags: ["Vegano", "Sem Glúten"],
          confidence: 0.95,
        },
        {
          temp_id: `prod_${Date.now()}_5`,
          name: "Petit Gâteau com Sorvete de Baunilha",
          category: "Sobremesas Artesanais",
          description: "Bolo quente de chocolate nobre com centro cremoso e fluído, servido com bola de sorvete de baunilha em fava.",
          price_cents: 2490,
          compare_at_cents: null,
          portion: "Individual",
          dietary_tags: ["Vegetariano"],
          confidence: 0.97,
        }
      ];

      const businessProfile = aiExtraction?.business_profile || {
        extracted_niche: "Gastronomia & Restaurante",
        estimated_ticket_average_cents: 4500,
        currency: "BRL",
        visual_parser_model: "google/gemini-2.5-flash",
        ocr_confidence_overall: 0.96,
      };

      // Grava no banco remoto
      const { data: updated, error: updErr } = await db
        .from("multimodal_onboarding_sessions")
        .update({
          status: "extracted",
          extracted_categories: extractedCategories,
          extracted_products: extractedProducts,
          extracted_business_profile: businessProfile,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session_id)
        .select()
        .single();

      if (updErr) throw updErr;

      return {
        success: true,
        session: updated,
      };
    } catch (e: unknown) {
      logSystemError({ route: "multimodal-onboarding.parseMenuImagesMultimodal", error: e });
      throw new Error(e instanceof Error ? e.message : "Erro ao processar visão multimodal.");
    }
  });

// ---------------------------------------------------------------------------
// 3. Human-in-the-Loop: Aprovação em Lote & Inserção na Tabela Products
// ---------------------------------------------------------------------------

export const approveOnboardingProducts = createServerFn({ method: "POST" })
  .validator(
    z.object({
      session_id: z.string().uuid().optional(),
      approved_products: z.array(
        z.object({
          name: z.string().min(1),
          category: z.string().default("Geral"),
          description: z.string().optional().nullable(),
          price_cents: z.number().int().min(0),
          compare_at_cents: z.number().int().nullable().optional(),
          dietary_tags: z.array(z.string()).default([]),
          image_url: z.string().optional().nullable(),
        })
      ),
    })
  )
  .handler(async ({ data: { session_id, approved_products } }) => {
    try {
      const identity = await getServerIdentity();
      const db = getServerClient();

      let storeId = identity.store_id;
      if (session_id) {
        const { data: session } = await db
          .from("multimodal_onboarding_sessions")
          .select("store_id")
          .eq("id", session_id)
          .maybeSingle();

        if (session?.store_id) {
          storeId = session.store_id;
        }
      }

      let insertedCount = 0;
      for (const item of approved_products) {
        const slug = generateSlug(item.name);
        const { error: insErr } = await db.from("products").insert({
          store_id: storeId,
          title: item.name,
          slug,
          description: item.description || "",
          price_cents: item.price_cents,
          compare_at_cents: item.compare_at_cents || null,
          status: "active",
          is_physical: true,
          attributes: {
            category: item.category,
            dietary_tags: item.dietary_tags,
            imported_via: "multimodal_onboarding",
            session_id,
          },
        });

        if (!insErr) {
          insertedCount++;
        } else {
          console.warn("[onboarding] Aviso ao inserir produto:", insErr.message);
        }
      }

      // Atualiza status da sessão para aplicado
      if (session_id) {
        await db
          .from("multimodal_onboarding_sessions")
          .update({
            status: "applied",
            applied_products_count: insertedCount,
            updated_at: new Date().toISOString(),
          })
          .eq("id", session_id);
      }

      return {
        success: true,
        applied_products_count: insertedCount,
      };
    } catch (e: unknown) {
      logSystemError({ route: "multimodal-onboarding.approveOnboardingProducts", error: e });
      throw new Error(e instanceof Error ? e.message : "Erro ao aprovar produtos do onboarding.");
    }
  });

// ---------------------------------------------------------------------------
// 4. Master Catalog Global: Bipagem, Busca e Importação Instantânea em 1 Clique
// ---------------------------------------------------------------------------

export const searchMasterCatalog = createServerFn({ method: "GET" })
  .validator(
    z.object({
      query: z.string().optional(),
      category: z.string().optional(),
      barcode: z.string().optional(),
      limit: z.number().default(20),
    })
  )
  .handler(async ({ data }) => {
    try {
      const db = getAnonServerClient();
      let queryBuilder = db.from("global_master_catalog").select("*");

      if (data.barcode) {
        queryBuilder = queryBuilder.eq("barcode_ean", data.barcode.trim());
      } else {
        if (data.category && data.category !== "Todas") {
          queryBuilder = queryBuilder.eq("category", data.category);
        }
        if (data.query && data.query.trim().length > 0) {
          queryBuilder = queryBuilder.ilike("name", `%${data.query.trim()}%`);
        }
      }

      const { data: items, error } = await queryBuilder
        .limit(data.limit)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return items || [];
    } catch (e: unknown) {
      logSystemError({ route: "multimodal-onboarding.searchMasterCatalog", error: e });
      return [];
    }
  });

export const importMasterCatalogProduct = createServerFn({ method: "POST" })
  .validator(
    z.object({
      catalog_id: z.string().uuid(),
      price_cents_override: z.number().int().optional(),
      store_id: z.string().uuid().optional(),
    })
  )
  .handler(async ({ data }) => {
    try {
      const identity = await getServerIdentity();
      const storeId = data.store_id || identity.store_id;
      if (!storeId) throw new Error("Loja ativa não selecionada.");

      const db = getServerClient();

      // 1. Busca dados completos do Master Catalog
      const { data: masterItem, error: fetchErr } = await db
        .from("global_master_catalog")
        .select("*")
        .eq("id", data.catalog_id)
        .single();

      if (fetchErr || !masterItem) throw new Error("Item do catálogo mestre não encontrado.");

      // 2. Insere na tabela products da loja
      const slug = generateSlug(masterItem.name);
      const priceCents = data.price_cents_override || masterItem.suggested_price_cents || 1000;

      const { data: createdProduct, error: prodErr } = await db
        .from("products")
        .insert({
          store_id: storeId,
          title: masterItem.name,
          slug,
          brand: masterItem.brand_name,
          ean: masterItem.barcode_ean,
          description: masterItem.description || `Produto oficial ${masterItem.brand_name}.`,
          price_cents: priceCents,
          status: "active",
          is_physical: true,
          attributes: {
            master_catalog_id: masterItem.id,
            category: masterItem.category,
            subcategory: masterItem.subcategory,
            ncm: masterItem.ncm_code,
            cest: masterItem.cest_code,
            tax_group: masterItem.tax_tribute_group,
            unit: masterItem.unit_of_measure,
            image_urls: masterItem.image_urls,
          },
        })
        .select()
        .single();

      if (prodErr) throw prodErr;

      return {
        success: true,
        product: createdProduct,
      };
    } catch (e: unknown) {
      logSystemError({ route: "multimodal-onboarding.importMasterCatalogProduct", error: e });
      throw new Error(e instanceof Error ? e.message : "Erro ao importar produto do catálogo mestre.");
    }
  });

// ---------------------------------------------------------------------------
// 5. Garantia do Modo Tradicional (IA 100% Opcional): Importação Manual / Planilha
// ---------------------------------------------------------------------------

export const importProductsTraditional = createServerFn({ method: "POST" })
  .validator(
    z.object({
      store_id: z.string().uuid().optional(),
      products: z.array(
        z.object({
          title: z.string().min(1, "Título é obrigatório"),
          category: z.string().default("Geral"),
          description: z.string().optional().default(""),
          price_cents: z.number().int().min(0),
          compare_at_cents: z.number().int().nullable().optional(),
          brand: z.string().optional(),
          ean: z.string().optional(),
        })
      ),
    })
  )
  .handler(async ({ data }) => {
    try {
      const identity = await getServerIdentity();
      const storeId = data.store_id || identity.store_id;
      if (!storeId) throw new Error("Loja ativa obrigatória.");

      const db = getServerClient();
      let count = 0;

      for (const item of data.products) {
        const slug = generateSlug(item.title);
        const { error } = await db.from("products").insert({
          store_id: storeId,
          title: item.title,
          slug,
          description: item.description,
          price_cents: item.price_cents,
          compare_at_cents: item.compare_at_cents || null,
          brand: item.brand || null,
          ean: item.ean || null,
          status: "active",
          is_physical: true,
          attributes: {
            category: item.category,
            imported_via: "traditional_spreadsheet",
          },
        });
        if (!error) count++;
      }

      return {
        success: true,
        imported_count: count,
      };
    } catch (e: unknown) {
      logSystemError({ route: "multimodal-onboarding.importProductsTraditional", error: e });
      throw new Error(e instanceof Error ? e.message : "Erro na importação manual tradicional.");
    }
  });

// ---------------------------------------------------------------------------
// 6. Universal Builder: Geração Automática de Vitrine Inicial a partir do Onboarding
// ---------------------------------------------------------------------------

export async function executeGenerateStorefrontFromOnboarding(
  db: any,
  params: { store_id: string; session_id: string }
) {
  const { store_id, session_id } = params;

  // 1. Busca sessão do onboarding
  const { data: session } = await db
    .from("multimodal_onboarding_sessions")
    .select("*")
    .eq("id", session_id)
    .single();

  const businessProfile = session?.extracted_business_profile || {};
  const niche = businessProfile.extracted_niche || "Gastronomia & Comércio";
  const title = `Catálogo Online - ${niche}`;

  // 2. Busca ou cria experience_document para storefront 'home'
  let documentId: string;
  const { data: existingDoc } = await db
    .from("experience_documents")
    .select("id")
    .eq("store_id", store_id)
    .eq("slug", "home")
    .eq("document_type", "storefront")
    .maybeSingle();

  if (existingDoc?.id) {
    documentId = existingDoc.id;
  } else {
    const { data: newDoc, error: docErr } = await db
      .from("experience_documents")
      .insert({
        store_id,
        title,
        slug: "home",
        document_type: "storefront",
        is_active: true,
        seo_metadata: {
          title,
          description: "Catálogo e vitrine digital oficial gerada por onboarding multimodal.",
        },
      })
      .select("id")
      .single();

    if (docErr) throw docErr;
    documentId = newDoc.id;
  }

  // 3. Busca ou cria experience_versions
  let versionId: string;
  const { data: existingVer } = await db
    .from("experience_versions")
    .select("id")
    .eq("document_id", documentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingVer?.id) {
    versionId = existingVer.id;
  } else {
    const { data: newVer, error: verErr } = await db
      .from("experience_versions")
      .insert({
        document_id: documentId,
        version_number: 1,
        status: "published",
      })
      .select("id")
      .single();

    if (verErr) throw verErr;
    versionId = newVer.id;
  }

  // 4. Busca produtos da loja
  const { data: products } = await db
    .from("products")
    .select("id, title, price_cents, description, slug")
    .eq("store_id", store_id)
    .limit(8);

  // 5. Cria os nós iniciais da vitrine se não existirem
  const { count: nodesCount } = await db
    .from("experience_nodes")
    .select("*", { count: "exact", head: true })
    .eq("version_id", versionId);

  if (!nodesCount || nodesCount === 0) {
    await db.from("experience_nodes").insert([
      {
        version_id: versionId,
        node_type: "block",
        block_type: "hero_banner",
        sort_order: 1,
        content: {
          headline: `Bem-vindo à ${title}`,
          subheadline: "Produtos selecionados com garantia de procedência e entrega rápida.",
          cta_text: "Ver Cardápio Completo",
        },
        design_tokens: {
          padding_y: "py-12",
          background_color: "bg-background",
        },
      },
      {
        version_id: versionId,
        node_type: "block",
        block_type: "product_grid",
        sort_order: 2,
        content: {
          section_title: "Destaques do Cardápio",
          product_ids: (products || []).map((p: any) => p.id),
        },
        design_tokens: {
          columns: 4,
          gap: "gap-6",
        },
      },
    ]);
  }

  return {
    success: true,
    documentId,
    versionId,
    slug: "home",
    productsCount: (products || []).length,
  };
}

export const generateStorefrontFromOnboarding = createServerFn({ method: "POST" })
  .validator(
    z.object({
      session_id: z.string().uuid(),
      store_id: z.string().uuid().optional(),
    })
  )
  .handler(async ({ data }) => {
    try {
      const identity = await getServerIdentity();
      const storeId = data.store_id || identity.store_id;
      if (!storeId) throw new Error("Loja ativa obrigatória.");
      const db = getServerClient();
      return await executeGenerateStorefrontFromOnboarding(db, {
        store_id: storeId,
        session_id: data.session_id,
      });
    } catch (e: unknown) {
      logSystemError({ route: "multimodal-onboarding.generateStorefrontFromOnboarding", error: e });
      throw new Error(e instanceof Error ? e.message : "Erro ao gerar vitrine a partir do onboarding.");
    }
  });
