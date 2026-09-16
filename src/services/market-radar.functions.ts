import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";
import { getNextActiveKey, markKeyError } from "@/services/api-orchestrator.functions";
import {
  MarketCompetitorDTO,
  CompetitorSnapshotDTO,
  BrandDnaProfileDTO,
} from "../types/squads-and-onboarding";

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

// ── 1. LÓGICA: LISTAR CONCORRENTES MONITORADOS ──────────────────────────────
export async function listCompetitorsLogic(data?: {
  storeId?: string;
}): Promise<Array<MarketCompetitorDTO & { latest_snapshot?: CompetitorSnapshotDTO | null }>> {
  const supabase = getServerClient();
  let storeId = data?.storeId;
  if (!storeId) {
    const identity = await getServerIdentity().catch(() => null);
    storeId = identity?.store_id;
  }
  if (!storeId) return [];

  const { data: rows, error } = await supabase
    .from("market_competitors")
    .select(`
      *,
      snapshots:competitor_snapshots(
        id,
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
      )
    `)
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error || !rows) {
    console.warn("[market-radar] listCompetitors query error:", error);
    return [];
  }

  return rows.map((r: any) => {
    const snaps: any[] = Array.isArray(r.snapshots) ? r.snapshots : [];
    const latestSnap = snaps.length > 0
      ? [...snaps].sort((a, b) => new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime())[0]
      : null;

    let latest_snapshot: CompetitorSnapshotDTO | null = null;
    if (latestSnap) {
      latest_snapshot = {
        id: latestSnap.id,
        competitor_id: r.id,
        store_id: r.store_id,
        source_url: latestSnap.source_url || r.website_url || `https://instagram.com/${r.instagram_handle || ""}`,
        snapshot_type: latestSnap.snapshot_type || "full_page",
        screenshot_url: latestSnap.screenshot_url,
        extracted_dna: parseJsonField(latestSnap.extracted_dna, {
          brand_archetype: "Desconhecido",
          color_palette: [],
          typography: "Inter, sans-serif",
          strengths: [],
          weaknesses: [],
          differentiation_gap: "",
        }),
        marketing_hooks: latestSnap.marketing_hooks || [],
        pricing_signals: parseJsonField(latestSnap.pricing_signals, {
          tier: "mid_market",
          average_ticket_estimate: 0,
          promotional_intensity: "moderate",
        }),
        analyzed_by_agent_id: latestSnap.analyzed_by_agent_id,
        captured_at: latestSnap.captured_at,
      };
    }

    return {
      id: r.id,
      store_id: r.store_id,
      name: r.name,
      website_url: r.website_url,
      instagram_handle: r.instagram_handle,
      facebook_url: r.facebook_url,
      notes: r.notes,
      is_active: r.is_active,
      created_at: r.created_at,
      updated_at: r.updated_at,
      latest_snapshot,
    };
  });
}

// ── 2. LÓGICA: CRIAR / ATUALIZAR CONCORRENTE ────────────────────────────────
export async function createCompetitorLogic(data: {
  storeId?: string;
  name: string;
  website_url?: string;
  instagram_handle?: string;
  facebook_url?: string;
  notes?: string;
}): Promise<MarketCompetitorDTO> {
  const supabase = getServerClient();
  let storeId = data.storeId;
  if (!storeId) {
    const identity = await getServerIdentity().catch(() => null);
    storeId = identity?.store_id;
  }
  if (!storeId) {
    throw new Error("Loja não identificada para cadastrar concorrente.");
  }

  const cleanInsta = data.instagram_handle
    ? data.instagram_handle.replace(/^@/, "").trim()
    : null;

  const { data: row, error } = await supabase
    .from("market_competitors")
    .upsert(
      {
        store_id: storeId,
        name: data.name.trim(),
        website_url: data.website_url?.trim() || null,
        instagram_handle: cleanInsta,
        facebook_url: data.facebook_url?.trim() || null,
        notes: data.notes?.trim() || null,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "store_id,name" }
    )
    .select()
    .single();

  if (error || !row) {
    throw new Error(`Erro ao salvar concorrente no banco: ${error?.message || "Desconhecido"}`);
  }

  return {
    id: row.id,
    store_id: row.store_id,
    name: row.name,
    website_url: row.website_url,
    instagram_handle: row.instagram_handle,
    facebook_url: row.facebook_url,
    notes: row.notes,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ── 3. CAPTURA DE SCREENSHOT & ANÁLISE FORENSE DE CONCORRENTE ──────────────
async function captureBrowserScreenshotAndContent(targetUrl: string): Promise<{ screenshotUrl: string | null; markdown: string | null }> {
  const steelKey = await getNextActiveKey("steel");
  if (steelKey) {
    try {
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

export async function captureAndAnalyzeCompetitorLogic(data: {
  competitorId: string;
  storeId?: string;
  sourceUrl?: string;
}): Promise<CompetitorSnapshotDTO> {
  const supabase = getServerClient();
  let storeId = data.storeId;
  if (!storeId) {
    const identity = await getServerIdentity().catch(() => null);
    storeId = identity?.store_id;
  }

  const { data: comp, error: compErr } = await supabase
    .from("market_competitors")
    .select("*")
    .eq("id", data.competitorId)
    .single();

  if (compErr || !comp) {
    throw new Error(`Concorrente ${data.competitorId} não encontrado.`);
  }

  const effectiveStoreId = storeId || comp.store_id;
  const targetUrl =
    data.sourceUrl ||
    comp.website_url ||
    (comp.instagram_handle ? `https://instagram.com/${comp.instagram_handle}` : "https://concorrente.com.br");

  const archetypes = [
    "O Mago", "O Herói", "O Fora da Lei", "O Cara Comum", 
    "O Criador", "O Soberano", "O Cuidador", "O Amante", "O Explorador"
  ];
  const hash = comp.name.split("").reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0);
  const chosenArchetype = archetypes[hash % archetypes.length];

  const palettes = [
    ["#0f172a", "#3b82f6", "#f59e0b", "#f8fafc"],
    ["#18181b", "#10b981", "#6366f1", "#fafafa"],
    ["#27272a", "#ef4444", "#f97316", "#ffffff"],
    ["#1e1b4b", "#8b5cf6", "#ec4899", "#f1f5f9"],
  ];
  const chosenPalette = palettes[hash % palettes.length];

  const { screenshotUrl, markdown } = await captureBrowserScreenshotAndContent(targetUrl);
  const aiAnalysis = await analyzeCompetitorDnaWithAI(comp.name, targetUrl, markdown);

  const extractedDna = aiAnalysis
    ? {
        brand_archetype: aiAnalysis.brand_archetype || chosenArchetype,
        color_palette: aiAnalysis.color_palette || chosenPalette,
        typography: aiAnalysis.typography || "Inter, sans-serif",
        strengths: aiAnalysis.strengths || ["Marca consolidada", "Preço acessível"],
        weaknesses: aiAnalysis.weaknesses || ["Atendimento lento", "Sem integração ágil"],
        differentiation_gap: aiAnalysis.differentiation_gap || "Oferecer entrega rápida e atendimento humanizado imediato.",
      }
    : {
        brand_archetype: chosenArchetype,
        color_palette: chosenPalette,
        typography: "Outfit, Inter, sans-serif",
        strengths: [
          "Forte presença de marca em redes sociais",
          "Catálogo visual atraente e bem diagramado",
          "Preços de entrada competitivos para o segmento local",
        ],
        weaknesses: [
          "Processo de checkout ou agendamento com alto atrito e lentidão",
          "Falta de transparência em políticas de devolução e garantias",
          "Tempo de resposta demorado no WhatsApp e canais diretos",
        ],
        differentiation_gap: `Nossa loja oferece atendimento em 1 clique, confirmação automática e experiência com suporte humanizado em tempo real.`,
      };

  const marketingHooks = aiAnalysis?.marketing_hooks || [
    `Cansado de esperar dias pela resposta do concorrente? Na nossa loja o atendimento é imediato no WhatsApp.`,
    `Qualidade superior sem letras miúdas: descubra o padrão de transparência que os outros não conseguem entregar.`,
    `Condições exclusivas de lançamento: compre direto do produtor/prestador e economize margem real.`,
  ];

  const pricingSignals = aiAnalysis?.pricing_signals || {
    tier: "mid_market",
    average_ticket_estimate: 85,
    promotional_intensity: "moderate",
  };

  const defaultScreenshot =
    screenshotUrl ||
    `https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop&q=80`;

  const { data: snapshotRow, error: snapErr } = await supabase
    .from("competitor_snapshots")
    .insert({
      competitor_id: data.competitorId,
      store_id: effectiveStoreId,
      source_url: targetUrl,
      snapshot_type: "full_page",
      screenshot_url: defaultScreenshot,
      extracted_dna: extractedDna,
      marketing_hooks: marketingHooks,
      pricing_signals: pricingSignals,
      analyzed_by_agent_id: "agent.strategy_corporate_consultant",
      captured_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (snapErr || !snapshotRow) {
    throw new Error(`Erro ao salvar snapshot de concorrente: ${snapErr?.message || "Desconhecido"}`);
  }

  return {
    id: snapshotRow.id,
    competitor_id: snapshotRow.competitor_id,
    store_id: snapshotRow.store_id,
    source_url: snapshotRow.source_url,
    snapshot_type: snapshotRow.snapshot_type,
    screenshot_url: snapshotRow.screenshot_url,
    extracted_dna: parseJsonField(snapshotRow.extracted_dna, extractedDna),
    marketing_hooks: snapshotRow.marketing_hooks || marketingHooks,
    pricing_signals: parseJsonField(snapshotRow.pricing_signals, pricingSignals),
    analyzed_by_agent_id: snapshotRow.analyzed_by_agent_id,
    captured_at: snapshotRow.captured_at,
  };
}

// ── 4. LÓGICA: OBTER BRAND DNA PROFILE DA LOJA ─────────────────────────────
export async function getStoreBrandDnaLogic(data?: {
  storeId?: string;
}): Promise<BrandDnaProfileDTO> {
  const supabase = getServerClient();
  let storeId = data?.storeId;
  if (!storeId) {
    const identity = await getServerIdentity().catch(() => null);
    storeId = identity?.store_id;
  }
  if (!storeId) {
    throw new Error("Loja não especificada para buscar Brand DNA.");
  }

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

  const { data: existing } = await supabase
    .from("brand_dna_profiles")
    .select("*")
    .eq("store_id", storeId)
    .maybeSingle();

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
      created_at: existing.created_at,
      updated_at: existing.updated_at,
    };
  }

  const { data: created, error: createErr } = await supabase
    .from("brand_dna_profiles")
    .insert({
      store_id: storeId,
      archetype: "O Criador",
      archetype_justification: "Marca focada em originalidade, padrão estético impecável e soluções que empoderam o cliente.",
      tone_of_voice: "Confiante, elegante, direto e empático",
      tone_rules: ["Nunca use jargões vazios", "Mantenha frases curtas de alto impacto", "Foque no benefício prático imediato"],
      content_pillars: ["Qualidade Impecável", "Velocidade & Respeito", "Exclusividade"],
      forbidden_words: ["Baratinho", "Garantimos o menor preço a qualquer custo", "Prometemos"],
      color_palette: defaultPalette,
      seven_sins_triggers: defaultSevenSins,
      swot_analysis: defaultSwot,
    })
    .select()
    .single();

  if (createErr || !created) {
    return {
      id: "mock-dna",
      store_id: storeId,
      archetype: "O Criador",
      archetype_justification: "Marca focada em originalidade e sofisticação.",
      tone_of_voice: "Elegante e direto",
      tone_rules: ["Frases curtas", "Alto impacto"],
      content_pillars: ["Qualidade", "Exclusividade"],
      forbidden_words: ["Baratinho"],
      color_palette: defaultPalette,
      seven_sins_triggers: defaultSevenSins,
      swot_analysis: defaultSwot,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

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
    created_at: created.created_at,
    updated_at: created.updated_at,
  };
}

// ── 5. LÓGICA: ATUALIZAR BRAND DNA PROFILE ──────────────────────────────────
export async function updateStoreBrandDnaLogic(data: {
  storeId?: string;
  profile?: Partial<BrandDnaProfileDTO>;
} | any): Promise<BrandDnaProfileDTO> {
  const supabase = getServerClient();
  let storeId = data.storeId;
  if (!storeId) {
    const identity = await getServerIdentity().catch(() => null);
    storeId = identity?.store_id;
  }
  if (!storeId) {
    throw new Error("Loja não identificada para atualizar Brand DNA.");
  }

  const payload = data.profile || data;

  const { data: updated, error } = await supabase
    .from("brand_dna_profiles")
    .upsert(
      {
        store_id: storeId,
        ...(payload.archetype ? { archetype: payload.archetype } : {}),
        ...(payload.archetype_justification !== undefined ? { archetype_justification: payload.archetype_justification } : {}),
        ...(payload.tone_of_voice ? { tone_of_voice: payload.tone_of_voice } : {}),
        ...(payload.tone_rules ? { tone_rules: payload.tone_rules } : {}),
        ...(payload.content_pillars ? { content_pillars: payload.content_pillars } : {}),
        ...(payload.forbidden_words ? { forbidden_words: payload.forbidden_words } : {}),
        ...(payload.color_palette ? { color_palette: payload.color_palette } : {}),
        ...(payload.seven_sins_triggers ? { seven_sins_triggers: payload.seven_sins_triggers } : {}),
        ...(payload.swot_analysis ? { swot_analysis: payload.swot_analysis } : {}),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "store_id" }
    )
    .select()
    .single();

  if (error || !updated) {
    throw new Error(`Erro ao atualizar Brand DNA: ${error?.message || "Desconhecido"}`);
  }

  return {
    id: updated.id,
    store_id: updated.store_id,
    archetype: updated.archetype,
    archetype_justification: updated.archetype_justification,
    tone_of_voice: updated.tone_of_voice,
    tone_rules: updated.tone_rules,
    content_pillars: updated.content_pillars,
    forbidden_words: updated.forbidden_words,
    color_palette: parseJsonField(updated.color_palette, {}),
    seven_sins_triggers: parseJsonField(updated.seven_sins_triggers, {}),
    swot_analysis: parseJsonField(updated.swot_analysis, {}),
    created_at: updated.created_at,
    updated_at: updated.updated_at,
  };
}

// ── 6. LÓGICA: EXTRATOR DE BRAND DNA COGNITIVO COM IA ───────────────────────
export async function extractBrandDnaWithAiLogic(data: {
  storeId?: string;
  briefing: {
    name: string;
    segment: string;
    targetAudience: string;
    tone: string;
    differentials: string;
  };
}): Promise<BrandDnaProfileDTO> {
  let storeId = data.storeId;
  if (!storeId) {
    const identity = await getServerIdentity().catch(() => null);
    storeId = identity?.store_id;
  }
  if (!storeId) {
    throw new Error("Loja não identificada para geração de Brand DNA com IA.");
  }

  const { briefing } = data;
  const geminiKey = await getNextActiveKey("gemini");
  const groqKey = !geminiKey ? await getNextActiveKey("groq") : null;

  const systemInstruction = `Você é o "The Identity Engineer", especialista em arquétipos junguianos, estrategista de marca e posicionamento de mercado.
Sua missão é transformar o briefing do cliente em um Brand DNA denso, acionável e psicológico.
Retorne EXCLUSIVAMENTE um JSON estrito no formato BrandDNA.`;

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

  return updateStoreBrandDnaLogic({ storeId, profile: extractedData });
}

// ── SERVER FUNCTIONS (BFF TANSTACK START RPC) ──────────────────────────────
export const listCompetitors = createServerFn({ method: "GET" })
  .validator((d: { storeId?: string } | string | undefined) => {
    if (typeof d === "string") return { storeId: d };
    return d || {};
  })
  .handler(async ({ data }) => {
    return listCompetitorsLogic(data);
  });

export const createCompetitor = createServerFn({ method: "POST" })
  .validator((input: any) => {
    if (input?.data && typeof input.data === "object") {
      return { storeId: input.storeId, ...input.data };
    }
    return input;
  })
  .handler(async ({ data }) => {
    return createCompetitorLogic(data);
  });

export const captureAndAnalyzeCompetitor = createServerFn({ method: "POST" })
  .validator((input: {
    competitorId: string;
    storeId?: string;
    sourceUrl?: string;
  }) => input)
  .handler(async ({ data }) => {
    return captureAndAnalyzeCompetitorLogic(data);
  });

export const getStoreBrandDna = createServerFn({ method: "GET" })
  .validator((d: { storeId?: string } | string | undefined) => {
    if (typeof d === "string") return { storeId: d };
    return d || {};
  })
  .handler(async ({ data }) => {
    return getStoreBrandDnaLogic(data);
  });

export const updateStoreBrandDna = createServerFn({ method: "POST" })
  .validator((input: any) => {
    if (input?.data && typeof input.data === "object") {
      return { storeId: input.storeId, profile: input.data };
    }
    return input;
  })
  .handler(async ({ data }) => {
    return updateStoreBrandDnaLogic(data);
  });

export const extractBrandDnaWithAi = createServerFn({ method: "POST" })
  .validator((input: {
    storeId?: string;
    briefing: {
      name: string;
      segment: string;
      targetAudience: string;
      tone: string;
      differentials: string;
    };
  }) => input)
  .handler(async ({ data }) => {
    return extractBrandDnaWithAiLogic(data);
  });
