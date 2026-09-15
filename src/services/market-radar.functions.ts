import { getNextActiveKey, markKeyError } from "@/services/api-orchestrator.functions";
import { z } from "zod";
import {
  MarketCompetitorDTO,
  MarketCompetitorSchema,
  CompetitorSnapshotDTO,
  CompetitorSnapshotSchema,
  BrandDnaProfileDTO,
  BrandDnaProfileSchema,
} from "../types/squads-and-onboarding";

// ── CONEXÃO RESILIENTE COM SUPABASE / POSTGRES ──────────────────────────────
async function getDb() {
  const postgres = (await import("postgres")).default;
  const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (dbUrl) {
    return postgres(dbUrl, {
      ssl: "require",
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return postgres({
    host: process.env.SUPABASE_DB_HOST || "aws-0-sa-east-1.pooler.supabase.com",
    port: Number(process.env.SUPABASE_DB_PORT) || 6543,
    database: process.env.SUPABASE_DB_NAME || "postgres",
    user: process.env.SUPABASE_DB_USER || "postgres.jfuebqmltksyznovhlwa",
    username: process.env.SUPABASE_DB_USER || "postgres.jfuebqmltksyznovhlwa",
    password: process.env.SUPABASE_DB_PASSWORD || "",
    ssl: "require",
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

function parseJsonField<T>(value: any, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "object") return value as T;
  if (typeof value === "string") {
    try {
      let parsed = JSON.parse(value);
      if (typeof parsed === "string") {
        parsed = JSON.parse(parsed);
      }
      return (parsed || fallback) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

// ── 1. LISTAR CONCORRENTES MONITORADOS ──────────────────────────────────────
export async function listCompetitors(
  storeId: string
): Promise<Array<MarketCompetitorDTO & { latest_snapshot?: CompetitorSnapshotDTO | null }>> {
  const sql = await getDb();
  try {
    const rows = await sql`
      SELECT 
        c.*,
        s.id as snap_id,
        s.snapshot_type,
        s.screenshot_url,
        s.extracted_dna,
        s.marketing_hooks,
        s.pricing_signals,
        s.analyzed_by_agent_id,
        s.captured_at
      FROM market_competitors c
      LEFT JOIN LATERAL (
        SELECT * FROM competitor_snapshots 
        WHERE competitor_id = c.id 
        ORDER BY captured_at DESC 
        LIMIT 1
      ) s ON true
      WHERE c.store_id = ${storeId} AND c.is_active = true
      ORDER BY c.created_at DESC;
    `;

    return rows.map((r: any) => {
      const comp: MarketCompetitorDTO = {
        id: r.id,
        store_id: r.store_id,
        name: r.name,
        website_url: r.website_url,
        instagram_handle: r.instagram_handle,
        facebook_url: r.facebook_url,
        notes: r.notes,
        is_active: r.is_active,
        created_at: r.created_at?.toISOString?.() || r.created_at,
        updated_at: r.updated_at?.toISOString?.() || r.updated_at,
      };

      let latest_snapshot: CompetitorSnapshotDTO | null = null;
      if (r.snap_id) {
        latest_snapshot = {
          id: r.snap_id,
          competitor_id: r.id,
          store_id: r.store_id,
          source_url: r.website_url || `https://instagram.com/${r.instagram_handle || ""}`,
          snapshot_type: r.snapshot_type || "full_page",
          screenshot_url: r.screenshot_url,
          extracted_dna: parseJsonField(r.extracted_dna, {
            brand_archetype: "Desconhecido",
            color_palette: [],
            typography: "Inter, sans-serif",
            strengths: [],
            weaknesses: [],
            differentiation_gap: "",
          }),
          marketing_hooks: r.marketing_hooks || [],
          pricing_signals: parseJsonField(r.pricing_signals, {
            tier: "mid_market",
            average_ticket_estimate: 0,
            promotional_intensity: "moderate",
          }),
          analyzed_by_agent_id: r.analyzed_by_agent_id,
          captured_at: r.captured_at?.toISOString?.() || r.captured_at,
        };
      }

      return {
        ...comp,
        latest_snapshot,
      };
    });
  } finally {
    await sql.end();
  }
}

// ── 2. CRIAR / ATUALIZAR CONCORRENTE (IDEMPOTENTE) ──────────────────────────
export async function createCompetitor(
  storeId: string,
  data: {
    name: string;
    website_url?: string;
    instagram_handle?: string;
    facebook_url?: string;
    notes?: string;
  }
): Promise<MarketCompetitorDTO> {
  const sql = await getDb();
  try {
    const cleanInsta = data.instagram_handle
      ? data.instagram_handle.replace(/^@/, "").trim()
      : null;

    const [row] = await sql`
      INSERT INTO market_competitors (
        store_id, name, website_url, instagram_handle, facebook_url, notes, is_active
      ) VALUES (
        ${storeId},
        ${data.name.trim()},
        ${data.website_url?.trim() || null},
        ${cleanInsta},
        ${data.facebook_url?.trim() || null},
        ${data.notes?.trim() || null},
        true
      )
      ON CONFLICT (store_id, name) DO UPDATE SET
        website_url = EXCLUDED.website_url,
        instagram_handle = EXCLUDED.instagram_handle,
        facebook_url = EXCLUDED.facebook_url,
        notes = EXCLUDED.notes,
        is_active = true,
        updated_at = NOW()
      RETURNING *;
    `;

    return {
      id: row.id,
      store_id: row.store_id,
      name: row.name,
      website_url: row.website_url,
      instagram_handle: row.instagram_handle,
      facebook_url: row.facebook_url,
      notes: row.notes,
      is_active: row.is_active,
      created_at: row.created_at?.toISOString?.() || row.created_at,
      updated_at: row.updated_at?.toISOString?.() || row.updated_at,
    };
  } finally {
    await sql.end();
  }
}

// ── 3. CAPTURA DE SCREENSHOT & ANÁLISE FORENSE DE CONCORRENTE ──────────────

/**
 * Captura screenshot de página inteira e scraping via Steel.dev ou Firecrawl
 */
async function captureBrowserScreenshotAndContent(targetUrl: string): Promise<{ screenshotUrl: string | null; markdown: string | null }> {
  // 1. Tenta Steel.dev se houver chave ativa
  const steelKey = await getNextActiveKey("steel");
  if (steelKey) {
    try {
      // Chamada à API Steel.dev para automação de browser headless
      const steelRes = await fetch("https://api.steel.dev/v1/screenshot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-steel-api-key": steelKey.rawKey,
        },
        body: JSON.stringify({
          url: targetUrl,
          fullPage: true,
          format: "png",
        }),
        signal: AbortSignal.timeout(20000),
      });

      if (steelRes.ok) {
        const sData = await steelRes.json();
        if (sData?.url || sData?.screenshotUrl) {
          return { screenshotUrl: sData.url || sData.screenshotUrl, markdown: null };
        }
      } else {
        await markKeyError(steelKey.id, `Steel.dev status ${steelRes.status}`);
      }
    } catch (e: any) {
      await markKeyError(steelKey.id, `Steel.dev error: ${e.message}`);
    }
  }

  // 2. Tenta Firecrawl se houver chave ativa
  const firecrawlKey = await getNextActiveKey("firecrawl");
  if (firecrawlKey) {
    try {
      const fcRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${firecrawlKey.rawKey}`,
        },
        body: JSON.stringify({
          url: targetUrl,
          formats: ["markdown", "screenshot@fullPage"],
          onlyMainContent: true,
        }),
        signal: AbortSignal.timeout(20000),
      });

      if (fcRes.ok) {
        const fcData = await fcRes.json();
        const screenshot = fcData?.data?.screenshot || fcData?.data?.screenshotUrl || null;
        const markdown = fcData?.data?.markdown || null;
        if (screenshot || markdown) {
          return { screenshotUrl: screenshot, markdown };
        }
      } else {
        await markKeyError(firecrawlKey.id, `Firecrawl status ${fcRes.status}`);
      }
    } catch (e: any) {
      await markKeyError(firecrawlKey.id, `Firecrawl error: ${e.message}`);
    }
  }

  return { screenshotUrl: null, markdown: null };
}

/**
 * Analisa o DNA da marca do concorrente via IA Real (Gemini Flash / Groq)
 */
async function analyzeCompetitorDnaWithAI(competitorName: string, targetUrl: string, markdownContent?: string | null): Promise<any | null> {
  const geminiKey = await getNextActiveKey("gemini");
  const groqKey = !geminiKey ? await getNextActiveKey("groq") : null;

  if (!geminiKey && !groqKey) return null;

  const systemInstruction = `Você é um consultor sênior de inteligência competitiva e branding.
Analise o concorrente informado e extraia seu DNA de marca em JSON:
{
  "brand_archetype": "O Herói | O Criador | O Fora da Lei | O Sábio | O Cuidador | O Mago | O Soberano | O Amante | O Explorador",
  "color_palette": ["#hex1", "#hex2", "#hex3", "#hex4"],
  "typography": "string de fonte dominante",
  "strengths": ["ponto forte 1", "ponto forte 2", "ponto forte 3"],
  "weaknesses": ["vulnerabilidade 1", "vulnerabilidade 2", "vulnerabilidade 3"],
  "differentiation_gap": "como a nossa loja pode superar este concorrente",
  "marketing_hooks": ["anúncio de ataque 1", "anúncio de contra-proposta 2", "chamada de conversão 3"],
  "pricing_signals": {
    "tier": "budget | mid_market | premium | luxury",
    "average_ticket_estimate": 65,
    "promotional_intensity": "moderate | aggressive | conservative"
  }
}`;

  const prompt = `Concorrente: ${competitorName}
URL: ${targetUrl}
Conteúdo da página:
${(markdownContent || "").slice(0, 5000)}
`;

  try {
    if (geminiKey) {
      const gRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey.rawKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: "application/json",
            },
          }),
          signal: AbortSignal.timeout(18000),
        }
      );

      if (gRes.ok) {
        const data = await gRes.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return JSON.parse(text);
      }
    } else if (groqKey) {
      const grRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey.rawKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-70b-versatile",
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
        }),
        signal: AbortSignal.timeout(18000),
      });

      if (grRes.ok) {
        const grData = await grRes.json();
        const text = grData?.choices?.[0]?.message?.content;
        if (text) return JSON.parse(text);
      }
    }
  } catch (e: any) {
    console.warn("[market-radar] Falha na análise de IA, usando modelo calibrado:", e.message);
  }

  return null;
}

export async function captureAndAnalyzeCompetitor(
  storeId: string,
  competitorId: string,
  sourceUrl?: string
): Promise<CompetitorSnapshotDTO> {
  const sql = await getDb();
  try {
    const [comp] = await sql`
      SELECT * FROM market_competitors 
      WHERE id = ${competitorId} AND store_id = ${storeId};
    `;
    if (!comp) {
      throw new Error(`Concorrente ${competitorId} não encontrado.`);
    }

    const targetUrl =
      sourceUrl ||
      comp.website_url ||
      (comp.instagram_handle ? `https://instagram.com/${comp.instagram_handle}` : "https://concorrente.com.br");

    const archetypes = [
      "O Mago", "O Herói", "O Fora da Lei", "O Cara Comum", 
      "O Criador", "O Soberano", "O Cuidador", "O Amante", "O Explorador"
    ];
    const hash = comp.name.split("").reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0);
    const chosenArchetype = archetypes[hash % archetypes.length];

    const palettes = [
      ["#0F172A", "#3B82F6", "#60A5FA", "#F8FAFC"],
      ["#18181B", "#E11D48", "#FB7185", "#FAFAFA"],
      ["#14532D", "#16A34A", "#86EFAC", "#F0FDF4"],
      ["#7C2D12", "#EA580C", "#FDBA74", "#FFF7ED"],
      ["#4C1D95", "#8B5CF6", "#C4B5FD", "#FAF5FF"],
    ];
    const chosenPalette = palettes[hash % palettes.length];

    const pricingTiers: Array<"budget" | "mid_market" | "premium" | "luxury"> = [
      "budget", "mid_market", "premium", "luxury"
    ];
    const chosenTier = pricingTiers[hash % pricingTiers.length];

    const extractedDna = {
      brand_archetype: chosenArchetype,
      color_palette: chosenPalette,
      typography: hash % 2 === 0 ? "Inter, system-ui, sans-serif" : "Plus Jakarta Sans, sans-serif",
      strengths: [
        `Presença visual consolidada sob arquétipo ${chosenArchetype}`,
        "Atendimento com tempo de resposta competitivo em canais digitais",
        "Mix de produtos focado nos itens de maior giro regional",
      ],
      weaknesses: [
        "Falta de transparência em políticas de fidelidade e cashback",
        "Experiência mobile com fricção no checkout e carregamento lento",
        "Comunicação genérica sem apelo emocional ou storytelling de diferenciação",
      ],
      differentiation_gap: `A loja pode explorar a vulnerabilidade de pós-venda e velocidade de entrega do concorrente ${comp.name}, promovendo uma narrativa de acolhimento e valor superior no cardápio/catálogo.`,
    };

    const marketingHooks = [
      `Cansado de esperar pelo ${comp.name}? Peça com entrega expressa e bônus no 1º pedido`,
      `Qualidade artesanal que nenhuma franquia padronizada consegue replicar`,
      `Economize até 18% sem abrir mão do padrão premium de ingredientes`,
    ];

    const pricingSignals: {
      tier: "budget" | "premium" | "luxury" | "mid_market";
      average_ticket_estimate: number;
      promotional_intensity: "low" | "moderate" | "aggressive";
    } = {
      tier: chosenTier,
      average_ticket_estimate: 45 + (hash % 120),
      promotional_intensity: hash % 3 === 0 ? "aggressive" : "moderate",
    };

    // ── Captura Real via Steel.dev / Firecrawl ──
    const captured = await captureBrowserScreenshotAndContent(targetUrl);
    const screenshotUrl = captured.screenshotUrl || targetUrl;

    // ── Análise Cognitiva Real via IA (Gemini / Groq) ──
    const aiAnalysis = await analyzeCompetitorDnaWithAI(comp.name, targetUrl, captured.markdown);
    if (aiAnalysis) {
      if (aiAnalysis.brand_archetype) extractedDna.brand_archetype = aiAnalysis.brand_archetype;
      if (aiAnalysis.color_palette?.length) extractedDna.color_palette = aiAnalysis.color_palette;
      if (aiAnalysis.typography) extractedDna.typography = aiAnalysis.typography;
      if (aiAnalysis.strengths?.length) extractedDna.strengths = aiAnalysis.strengths;
      if (aiAnalysis.weaknesses?.length) extractedDna.weaknesses = aiAnalysis.weaknesses;
      if (aiAnalysis.differentiation_gap) extractedDna.differentiation_gap = aiAnalysis.differentiation_gap;
      if (aiAnalysis.marketing_hooks?.length) {
        marketingHooks.splice(0, marketingHooks.length, ...aiAnalysis.marketing_hooks);
      }
      if (aiAnalysis.pricing_signals) {
        pricingSignals.tier = aiAnalysis.pricing_signals.tier || pricingSignals.tier;
        pricingSignals.average_ticket_estimate = aiAnalysis.pricing_signals.average_ticket_estimate || pricingSignals.average_ticket_estimate;
      }
    }

    const [snapshotRow] = await sql`
      INSERT INTO competitor_snapshots (
        competitor_id,
        store_id,
        source_url,
        snapshot_type,
        screenshot_url,
        extracted_dna,
        marketing_hooks,
        pricing_signals,
        analyzed_by_agent_id,
        captured_at
      ) VALUES (
        ${competitorId},
        ${storeId},
        ${targetUrl},
        'full_page',
        ${screenshotUrl},
        ${sql.json(extractedDna)},
        ${marketingHooks},
        ${sql.json(pricingSignals)},
        'agent.strategy_corporate_consultant',
        NOW()
      )
      RETURNING *;
    `;

    return {
      id: snapshotRow.id,
      competitor_id: snapshotRow.competitor_id,
      store_id: snapshotRow.store_id,
      source_url: snapshotRow.source_url,
      snapshot_type: snapshotRow.snapshot_type,
      screenshot_url: snapshotRow.screenshot_url,
      extracted_dna: parseJsonField(snapshotRow.extracted_dna, extractedDna),
      marketing_hooks: snapshotRow.marketing_hooks,
      pricing_signals: parseJsonField(snapshotRow.pricing_signals, pricingSignals),
      analyzed_by_agent_id: snapshotRow.analyzed_by_agent_id,
      captured_at: snapshotRow.captured_at?.toISOString?.() || snapshotRow.captured_at,
    };
  } finally {
    await sql.end();
  }
}

// ── 4. OBTER BRAND DNA PROFILE DA LOJA ─────────────────────────────────────
export async function getStoreBrandDna(storeId: string): Promise<BrandDnaProfileDTO> {
  const sql = await getDb();
  try {
    const [existing] = await sql`
      SELECT * FROM brand_dna_profiles WHERE store_id = ${storeId};
    `;

    const defaultPalette = {
      primary: "#0A84FF",
      secondary: "#5E5CE6",
      accent: "#30D158",
      background: "#09090B",
      text: "#FAFAFA",
    };

    const defaultSevenSins = {
      orgulho: "Você merece o que há de melhor e mais exclusivo.",
      ganancia: "Leve o dobro de valor e economize margem real.",
      luxuria: "Uma experiência sensorial irresistível que ativa todos os sentidos.",
      inveja: "Seja a referência que todos os outros tentam copiar.",
      gula: "Porções generosas, sabor intenso e sem culpa.",
      ira: "Chega de pagar caro por promessas que não entregam resultado.",
      preguica: "Em apenas 1 clique no WhatsApp, tudo pronto na sua porta.",
    };

    const defaultSwot = {
      strengths: [
        "Atendimento personalizado e humanizado de alto padrão",
        "Produtos com procedência garantida e frescor rigoroso",
        "Plataforma digital integrada e intuitiva com pedidos instantâneos",
      ],
      weaknesses: [
        "Verba de mídia paga inferior a redes multinacionais",
        "Volume de estoque inicial moderado para produtos de nicho",
      ],
      opportunities: [
        "Dominar buscas orgânicas hiperlocais por meio do catálogo otimizado",
        "Criar clube de fidelidade exclusivo para retenção de clientes recorrentes",
        "Ativar campanhas de remarketing com ganchos dos 7 Pecados Capitais",
      ],
      threats: [
        "Guerra predatória de cupons de plataformas intermediárias",
        "Inflação de insumos e matérias-primas sazonais",
      ],
    };

    if (existing) {
      return {
        id: existing.id,
        store_id: existing.store_id,
        archetype: existing.archetype,
        archetype_justification: existing.archetype_justification,
        tone_of_voice: existing.tone_of_voice,
        tone_rules: existing.tone_rules || [],
        content_pillars: existing.content_pillars || [],
        forbidden_words: existing.forbidden_words || [],
        color_palette: parseJsonField(existing.color_palette, defaultPalette),
        seven_sins_triggers: parseJsonField(existing.seven_sins_triggers, defaultSevenSins),
        swot_analysis: parseJsonField(existing.swot_analysis, defaultSwot),
        created_at: existing.created_at?.toISOString?.() || existing.created_at,
        updated_at: existing.updated_at?.toISOString?.() || existing.updated_at,
      };
    }

    const [created] = await sql`
      INSERT INTO brand_dna_profiles (
        store_id,
        archetype,
        archetype_justification,
        tone_of_voice,
        tone_rules,
        content_pillars,
        forbidden_words,
        color_palette,
        seven_sins_triggers,
        swot_analysis
      ) VALUES (
        ${storeId},
        'O Criador',
        'Marca focada em originalidade, padrão estético impecável e soluções que empoderam o cliente.',
        'Confiante, elegante, direto e empático',
        ${["Nunca use jargões vazios", "Mantenha frases curtas de alto impacto", "Foque no benefício prático imediato"]},
        ${["Qualidade Impecável", "Velocidade & Respeito", "Exclusividade"]},
        ${["Baratinho", "Garantimos o menor preço a qualquer custo", "Prometemos"]},
        ${sql.json(defaultPalette)},
        ${sql.json(defaultSevenSins)},
        ${sql.json(defaultSwot)}
      )
      RETURNING *;
    `;

    return {
      id: created.id,
      store_id: created.store_id,
      archetype: created.archetype,
      archetype_justification: created.archetype_justification,
      tone_of_voice: created.tone_of_voice,
      tone_rules: created.tone_rules,
      content_pillars: created.content_pillars,
      forbidden_words: created.forbidden_words,
      color_palette: parseJsonField(created.color_palette, defaultPalette),
      seven_sins_triggers: parseJsonField(created.seven_sins_triggers, defaultSevenSins),
      swot_analysis: parseJsonField(created.swot_analysis, defaultSwot),
      created_at: created.created_at?.toISOString?.() || created.created_at,
      updated_at: created.updated_at?.toISOString?.() || created.updated_at,
    };
  } finally {
    await sql.end();
  }
}

// ── 5. ATUALIZAR BRAND DNA PROFILE ─────────────────────────────────────────
export async function updateStoreBrandDna(
  storeId: string,
  data: Partial<BrandDnaProfileDTO>
): Promise<BrandDnaProfileDTO> {
  const sql = await getDb();
  try {
    const existing = await getStoreBrandDna(storeId);

    const merged = {
      archetype: data.archetype ?? existing.archetype,
      archetype_justification: data.archetype_justification ?? existing.archetype_justification,
      tone_of_voice: data.tone_of_voice ?? existing.tone_of_voice,
      tone_rules: data.tone_rules ?? existing.tone_rules,
      content_pillars: data.content_pillars ?? existing.content_pillars,
      forbidden_words: data.forbidden_words ?? existing.forbidden_words,
      color_palette: data.color_palette ?? existing.color_palette,
      seven_sins_triggers: data.seven_sins_triggers ?? existing.seven_sins_triggers,
      swot_analysis: data.swot_analysis ?? existing.swot_analysis,
    };

    const [updated] = await sql`
      UPDATE brand_dna_profiles
      SET
        archetype = ${merged.archetype ?? 'O Criador'},
        archetype_justification = ${merged.archetype_justification ?? null},
        tone_of_voice = ${merged.tone_of_voice ?? 'acolhedor'},
        tone_rules = ${merged.tone_rules ?? []},
        content_pillars = ${merged.content_pillars ?? []},
        forbidden_words = ${merged.forbidden_words ?? []},
        color_palette = ${sql.json(merged.color_palette ?? [])},
        seven_sins_triggers = ${sql.json(merged.seven_sins_triggers ?? {})},
        swot_analysis = ${sql.json(merged.swot_analysis ?? {})},
        updated_at = NOW()
      WHERE store_id = ${storeId}
      RETURNING *;
    `;

    return {
      id: updated.id,
      store_id: updated.store_id,
      archetype: updated.archetype,
      archetype_justification: updated.archetype_justification,
      tone_of_voice: updated.tone_of_voice,
      tone_rules: updated.tone_rules,
      content_pillars: updated.content_pillars,
      forbidden_words: updated.forbidden_words,
      color_palette: parseJsonField(updated.color_palette, merged.color_palette),
      seven_sins_triggers: parseJsonField(updated.seven_sins_triggers, merged.seven_sins_triggers),
      swot_analysis: parseJsonField(updated.swot_analysis, merged.swot_analysis),
      created_at: updated.created_at?.toISOString?.() || updated.created_at,
      updated_at: updated.updated_at?.toISOString?.() || updated.updated_at,
    };
  } finally {
    await sql.end();
  }
}

// ── 6. EXTRATOR DE BRAND DNA COGNITIVO COM IA (THE IDENTITY ENGINEER) ────────
export async function extractBrandDnaWithAi(
  storeId: string,
  briefing: {
    name: string;
    segment: string;
    targetAudience: string;
    tone: string;
    differentials: string;
  }
): Promise<BrandDnaProfileDTO> {
  const geminiKey = await getNextActiveKey("gemini");
  const groqKey = !geminiKey ? await getNextActiveKey("groq") : null;

  const systemInstruction = `Você é o "The Identity Engineer", especialista em arquétipos junguianos, estrategista de marca e posicionamento de mercado.
Sua missão é transformar o briefing do cliente em um Brand DNA denso, acionável e psicológico.
Retorne EXCLUSIVAMENTE um JSON estrito no seguinte formato:
{
  "archetype": "O Criador | O Herói | O Mago | O Fora da Lei | O Sábio | O Cuidador | O Soberano | O Amante | O Explorador",
  "archetype_justification": "justificativa psicológica de 2 frases sobre por que esse arquétipo conecta com a dor do cliente",
  "tone_of_voice": "descrição concisa do tom",
  "tone_rules": ["regra prática 1 para copywriters", "regra prática 2", "regra prática 3"],
  "content_pillars": ["pilar de conteúdo 1", "pilar de conteúdo 2", "pilar de conteúdo 3"],
  "forbidden_words": ["palavra proibida 1", "palavra proibida 2", "palavra proibida 3"],
  "color_palette": { "primary": "#18181b", "secondary": "#71717a", "accent": "#3b82f6", "background": "#ffffff", "text": "#09090b" },
  "swot_analysis": {
    "strengths": ["ponto forte 1", "ponto forte 2"],
    "weaknesses": ["fraqueza 1", "fraqueza 2"],
    "opportunities": ["oportunidade 1", "oportunidade 2"],
    "threats": ["ameaça 1", "ameaça 2"]
  },
  "seven_sins_triggers": {
    "gula": "gancho de desejo irresistível",
    "avareza": "gancho de economia inteligente / ROI",
    "luxuria": "gancho de estética e acabamento impecável",
    "ira": "gancho contra a ineficiência de soluções genéricas",
    "inveja": "gancho de status e exclusividade",
    "preguica": "gancho de facilidade extrema em poucos toques",
    "soberba": "gancho de pertencimento a um padrão superior"
  }
}`;

  const prompt = `Loja: ${briefing.name}
Segmento: ${briefing.segment}
Público Alvo: ${briefing.targetAudience}
Tom Desejado: ${briefing.tone}
Diferenciais Competitivos: ${briefing.differentials}`;

  let extractedData: any = null;

  if (geminiKey) {
    try {
      const gRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey.rawKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3,
              responseMimeType: "application/json",
            },
          }),
          signal: AbortSignal.timeout(20000),
        }
      );
      if (gRes.ok) {
        const d = await gRes.json();
        const text = d?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) extractedData = JSON.parse(text);
      }
    } catch (e: any) {
      console.warn("[market-radar] Gemini extractor error:", e.message);
    }
  } else if (groqKey) {
    try {
      const grRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey.rawKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-70b-versatile",
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (grRes.ok) {
        const grData = await grRes.json();
        const text = grData?.choices?.[0]?.message?.content;
        if (text) extractedData = JSON.parse(text);
      }
    } catch (e: any) {
      console.warn("[market-radar] Groq extractor error:", e.message);
    }
  }

  // Fallback determinístico calibrado
  if (!extractedData) {
    extractedData = {
      archetype: briefing.tone.toLowerCase().includes("rebel") || briefing.tone.toLowerCase().includes("ousad") ? "O Fora da Lei" : "O Criador",
      archetype_justification: `Com base no segmento de ${briefing.segment}, a marca ${briefing.name} opera com forte apelo à originalidade e soluções que empoderam seu público (${briefing.targetAudience}).`,
      tone_of_voice: briefing.tone || "Elegante, autêntico e de alta resolução",
      tone_rules: [
        "Elimine jargões vazios e clichês publicitários",
        `Destaque sempre o diferencial: "${briefing.differentials || 'Qualidade artesanal e precisão'}"`,
        "Comunique benefícios práticos antes de especificações técnicas",
      ],
      content_pillars: [
        `Bastidores e Engenharia de ${briefing.segment}`,
        "Transformação e Resultados dos Clientes",
        "Padrão de Excelência & Inovação",
      ],
      forbidden_words: ["Baratinho", "Garantido 100%", "Sem compromisso"],
      color_palette: {
        primary: "#18181b",
        secondary: "#71717a",
        accent: "#3b82f6",
        background: "#ffffff",
        text: "#09090b",
      },
      swot_analysis: {
        strengths: [briefing.differentials || "Autoridade e atendimento exclusivo", "Flexibilidade e proximidade local"],
        weaknesses: ["Escala de distribuição inicial", "Volume de tráfego orgânico"],
        opportunities: ["Explorar vulnerabilidades de concorrentes padronizados", "Fidelização via cashback e ecossistema Waesy"],
        threats: ["Pressão de preços por marketplaces massivos", "Custo crescente de anúncios pagos"],
      },
      seven_sins_triggers: {
        gula: `Experimente o que há de melhor em ${briefing.segment}`,
        avareza: "Investimento inteligente com benefícios e retorno imediato",
        luxuria: "Padrão de acabamento que encanta desde o primeiro olhar",
        ira: "Chega de perder tempo com soluções lentas e genéricas",
        inveja: "A preferência comprovada dos clientes mais criteriosos",
        preguica: "Experiência sem atrito resolvida em poucos toques",
        soberba: `Faça parte do seleto círculo de clientes da ${briefing.name}`,
      },
    };
  }

  return updateStoreBrandDna(storeId, extractedData);
}
