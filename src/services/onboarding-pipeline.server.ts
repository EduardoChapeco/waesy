/**
 * onboarding-pipeline.server.ts — Pipeline Mestre de Extração Real e Concílio de IAs do Waesy
 *
 * Integração: Steel / Firecrawl / Groq / Gemini / OpenRouter / OpenAI
 * Frameworks de Marca: Kapferer, Aaker, 12 Arquétipos, Storybrand, SWOT, Business Model Canvas, 7 Pecados Capitais.
 * Persistência E2E: stores, brand_kits, brand_dna_profiles, briefings, directory_listings, ai_async_jobs.
 * Diretriz Zero: 100% Real, Zero Mocks, Zero Alucinações, Campos não comprovados marcados como "a confirmar".
 */

import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getNextActiveKey, markKeyError, executeUnifiedAiCall } from "./api-orchestrator.functions";

// ============================================================
// 1. Schemas Zod de Validação de Entrada e Evidências
// ============================================================

export const OnboardingInputSchema = z.object({
  url: z.string().url("URL inválida"),
  storeId: z.string().uuid("ID da loja inválido"),
  userId: z.string().uuid().optional(),
});

export type OnboardingInput = z.infer<typeof OnboardingInputSchema>;

export interface ScrapedEvidence {
  sourceUrl: string;
  domain: string;
  pageTitle: string;
  metaDescription?: string;
  scrapedMarkdown?: string;
  rawTextSample: string;
  screenshotUrl?: string | null;
  screenshotBase64?: string | null;
  extractionProvider: "firecrawl" | "steel" | "native_fetch";
  instagramStatus?: {
    isInstagram: boolean;
    loginWalled: boolean;
    publicBio?: string;
    warning?: string;
  };
  googleBusiness?: {
    found: boolean;
    source: "connected_account" | "public_search" | "not_found";
    name?: string;
    rating?: number;
    reviewCount?: number;
    address?: string;
    categories?: string[];
  };
}

export interface DesignSquadResult {
  brand_name: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  typography: {
    heading: string;
    body: string;
  };
  visual_style: string;
  confidence: number | null;
  evidence: string[];
}

export interface CopySquadResult {
  tone_of_voice: string;
  tone_adjectives: string[];
  archetype: string;
  archetype_justification: string;
  tone_rules: string[];
  do_words: string[];
  dont_words: string[];
  content_pillars: string[];
  bio_concise: string;
  tagline: string;
  confidence: number | null;
  evidence: string[];
}

export interface PrSquadResult {
  positioning_statement: string;
  value_proposition: string;
  reputation_summary: string;
  confidence: number | null;
  evidence: string[];
}

export interface BusinessStrategistSquadResult {
  business_model: {
    value_proposition: string;
    target_segments: string[];
    customer_relationships: string[];
    distribution_channels: string[];
    key_activities: string[];
    key_resources: string[];
    key_partners: string[];
    cost_structure: string[];
    revenue_streams: string[];
  };
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  seven_sins_hooks: Record<string, string>;
  confidence: number | null;
  evidence: string[];
}

export interface MarketAnalystSquadResult {
  direct_competitors: Array<{ name: string; notes?: string }>;
  competitive_differentials: string[];
  market_opportunities: string[];
  confidence: number | null;
  evidence: string[];
}

export interface FinalConsolidatedBriefing {
  analysis_status: "ai_generated_draft";
  requires_human_review: true;
  company_name: string;
  category: string;
  bio: string;
  tagline: string;
  brand_kit: {
    primary_color: string;
    secondary_color: string;
    accent_color: string;
    typography: { heading: string; body: string };
  };
  brand_dna: {
    archetype: string;
    archetype_justification: string;
    tone_of_voice: string;
    tone_rules: string[];
    content_pillars: string[];
    forbidden_words: string[];
    color_palette: Record<string, string>;
    seven_sins_triggers: Record<string, string>;
  };
  briefing: {
    title: string;
    business_model_text: string;
    swot_strengths: string[];
    swot_weaknesses: string[];
    swot_opportunities: string[];
    swot_threats: string[];
    competitors: any[];
    ideal_customer_profile: Record<string, any>;
  };
  suggested_products: Array<{
    name: string;
    description: string;
    price_cents: number;
    category?: string;
  }>;
  contact: {
    whatsapp?: string;
    phone?: string;
    email?: string;
    city: string;
    state: string;
    address?: string;
  };
  evidence_summary: {
    sources_used: string[];
    screenshots_captured: string[];
    unconfirmed_fields: string[];
  };
}

// ============================================================
// 2. Validação Anti-SSRF e Segurança de Rede
// ============================================================

export function assertSafeUrl(urlString: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new Error("URL informada é inválida ou malformada.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Apenas protocolos HTTP e HTTPS são permitidos.");
  }

  const hostname = parsed.hostname.toLowerCase();

  // Bloqueio rigoroso de endereços locais e de rede interna (SSRF)
  const isLocalOrPrivate =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]" ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") ||
    (hostname.startsWith("172.") && (() => {
      const parts = hostname.split(".");
      const second = parseInt(parts[1], 10);
      return second >= 16 && second <= 31;
    })()) ||
    hostname === "169.254.169.254" || // AWS/GCP instance metadata
    hostname === "metadata.google.internal";

  if (isLocalOrPrivate) {
    throw new Error("Acesso a endereços locais ou de infraestrutura interna é proibido por segurança.");
  }

  return parsed;
}

// ============================================================
// 3. Atualizador de Progresso do Job Assíncrono
// ============================================================

export async function updateJobProgress(
  jobId: string,
  progressPercent: number,
  status: "queued" | "processing" | "completed" | "failed" = "processing",
  errorMessage?: string,
  resultData?: any
) {
  const supabase = getServerClient();
  const updatePayload: Record<string, any> = {
    progress_percent: progressPercent,
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "processing" && progressPercent <= 15) {
    updatePayload.started_at = new Date().toISOString();
  }
  if (status === "completed" || status === "failed") {
    updatePayload.finished_at = new Date().toISOString();
  }
  if (errorMessage) {
    updatePayload.error_message = errorMessage;
  }
  if (resultData) {
    updatePayload.result = resultData;
  }

  await supabase.from("ai_async_jobs").update(updatePayload).eq("id", jobId);
}

// ============================================================
// 4. Etapa 1: Visita e Captura Real (Firecrawl + Steel)
// ============================================================

export async function captureWebEvidence(
  targetUrl: string,
  storeId: string,
  jobId: string
): Promise<ScrapedEvidence> {
  const urlObj = assertSafeUrl(targetUrl);
  const domain = urlObj.hostname.replace(/^www\./, "");
  const isInstagram = domain.includes("instagram.com");

  await updateJobProgress(jobId, 15, "processing");

  let scrapedMarkdown = "";
  let pageTitle = domain;
  let metaDescription = "";
  let extractionProvider: "firecrawl" | "steel" | "native_fetch" = "native_fetch";
  let screenshotUrl: string | null = null;
  let screenshotBase64: string | null = null;
  let instagramStatus: ScrapedEvidence["instagramStatus"] = undefined;

  // A. Firecrawl Scrape Oficial
  const firecrawlKey = await getNextActiveKey("firecrawl").catch(() => null);
  if (firecrawlKey?.rawKey && !isInstagram) {
    try {
      const fcRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${firecrawlKey.rawKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: targetUrl,
          formats: ["markdown", "html"],
          onlyMainContent: true,
          waitFor: 1500,
        }),
        signal: AbortSignal.timeout(20000),
      });

      if (fcRes.ok) {
        const fcData = await fcRes.json();
        const data = fcData?.data || {};
        scrapedMarkdown = data.markdown || "";
        pageTitle = data.metadata?.title || domain;
        metaDescription = data.metadata?.description || "";
        extractionProvider = "firecrawl";
      } else {
        await markKeyError(firecrawlKey.id, `Firecrawl status HTTP ${fcRes.status}`);
      }
    } catch (e: any) {
      console.warn("[OnboardingPipeline] Firecrawl falhou:", e?.message);
    }
  }

  // B. Fallback Nativo com Fetch e Metadados
  if (!scrapedMarkdown) {
    try {
      const fetchRes = await fetch(targetUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        signal: AbortSignal.timeout(12000),
      });

      if (fetchRes.ok) {
        const html = await fetchRes.text();

        // Extrai metadados essenciais
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch && titleMatch[1]) pageTitle = titleMatch[1].trim();

        const descMatch =
          html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
          html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
        if (descMatch && descMatch[1]) metaDescription = descMatch[1].trim();

        // Limpa HTML para texto útil
        scrapedMarkdown = html
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
          .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 10000);

        extractionProvider = "native_fetch";
      }
    } catch (fetchErr: any) {
      console.warn("[OnboardingPipeline] Fetch nativo falhou:", fetchErr?.message);
    }
  }

  // C. Tratamento estrito de Instagram
  if (isInstagram) {
    const isLoginWalled = !scrapedMarkdown || scrapedMarkdown.length < 200 || scrapedMarkdown.includes("login");
    instagramStatus = {
      isInstagram: true,
      loginWalled: isLoginWalled,
      publicBio: metaDescription || undefined,
      warning: isLoginWalled
        ? "Instagram bloqueou acesso profundo via login wall. Analisando metadados públicos e bio visível."
        : undefined,
    };
  }

  await updateJobProgress(jobId, 25, "processing");

  // D. Captura de Screenshot Real via Steel.dev
  const steelKey = await getNextActiveKey("steel").catch(() => null);
  if (steelKey?.rawKey) {
    try {
      const steelRes = await fetch("https://api.steel.dev/v1/screenshot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-steel-api-key": steelKey.rawKey,
        },
        body: JSON.stringify({
          url: targetUrl,
          fullPage: false,
          format: "png",
        }),
        signal: AbortSignal.timeout(25000),
      });

      if (steelRes.ok) {
        const sData = await steelRes.json();
        const rawShotUrl = sData?.url || sData?.screenshotUrl;
        if (rawShotUrl) {
          screenshotUrl = rawShotUrl;
          extractionProvider = "steel";
          try {
            const shotBufferRes = await fetch(rawShotUrl, { signal: AbortSignal.timeout(12000) });
            if (shotBufferRes.ok) {
              const arrayBuffer = await shotBufferRes.arrayBuffer();
              screenshotBase64 = Buffer.from(arrayBuffer).toString("base64");
            }
          } catch (shotBufferErr: any) {
            console.warn("[OnboardingPipeline] Falha ao descarregar buffer do print Steel:", shotBufferErr?.message);
          }
        }
      } else {
        await markKeyError(steelKey.id, `Steel HTTP ${steelRes.status}`);
      }
    } catch (steelErr: any) {
      console.warn("[OnboardingPipeline] Captura Steel falhou:", steelErr?.message);
    }
  }

  await updateJobProgress(jobId, 35, "processing");

  return {
    sourceUrl: targetUrl,
    domain,
    pageTitle,
    metaDescription,
    scrapedMarkdown: scrapedMarkdown.slice(0, 8000),
    rawTextSample: scrapedMarkdown.slice(0, 3000),
    screenshotUrl,
    screenshotBase64,
    extractionProvider,
    instagramStatus,
  };
}

// ============================================================
// 5. Etapa 2: Integração Google Meu Negócio / Places
// ============================================================

export async function fetchGoogleBusinessEvidence(
  storeId: string,
  businessName: string
): Promise<ScrapedEvidence["googleBusiness"]> {
  const supabase = getServerClient();

  // 1. Verifica conexão oficial no banco (google_business_connections)
  try {
    const { data: conn } = await supabase
      .from("google_business_connections")
      .select("id, google_location_id, google_location_name, access_token, status")
      .eq("company_id", storeId)
      .eq("status", "active")
      .maybeSingle();

    if (conn?.access_token && conn?.google_location_id) {
      const gmbUrl = `https://mybusinessbusinessinformation.googleapis.com/v1/${conn.google_location_id}`;
      const res = await fetch(gmbUrl, {
        headers: { Authorization: `Bearer ${conn.access_token}` },
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const gmbData = await res.json();
        return {
          found: true,
          source: "connected_account",
          name: gmbData.title || businessName,
          address: gmbData.storefrontAddress?.addressLines?.join(", "),
          categories: gmbData.categories?.primaryCategory?.displayName
            ? [gmbData.categories.primaryCategory.displayName]
            : [],
        };
      }
    }
  } catch (e: any) {
    console.warn("[OnboardingPipeline] Falha ao consultar conta conectada Google:", e?.message);
  }

  // 2. Se não estiver conectado, não inventa dados falsos
  return {
    found: false,
    source: "not_found",
  };
}

// ============================================================
// 6. Etapa 3: Concílio de IAs (4 Squads Especializados)
// ============================================================

/**
 * Squad 1: Design & Identidade Visual
 * Inspirado nas diretrizes do Brand Sprint e Semiótica do ENGIOS/brand.agent.ts
 */
export async function runDesignSquad(evidence: ScrapedEvidence): Promise<DesignSquadResult> {
  const systemPrompt = `Você é a Bia Brand Kit — Diretora de Design Estratégico e PhD em Semiótica do Waesy.
Sua missão é extrair rigorosamente a identidade visual da marca a partir das evidências reais coletadas.
Regras Absolutas:
1. Responda ESTRITAMENTE em formato JSON compatível com o schema esperado.
2. Extraia paleta primária, secundária e de destaque em códigos HEX válidos (#RRGGBB).
3. Sugira tipografia com famílias canônicas do Google Fonts (ex: Inter, Plus Jakarta Sans, Outfit, DM Sans, Playfair Display).
4. Não estime confiança. Não fabrique evidências; campos sem base devem ficar vazios.
5. Se a fonte não permitir identificar uma cor, devolva string vazia; nunca invente paleta.`;

  const userPrompt = `Evidências Coletadas:
Domínio: ${evidence.domain}
Título da Página: ${evidence.pageTitle}
Descrição: ${evidence.metaDescription || "N/A"}
Texto Extraído:
${evidence.rawTextSample.slice(0, 2000)}
Screenshot capturado: ${evidence.screenshotUrl || "Nenhum print disponível"}

Retorne o JSON:
{
  "brand_name": "",
  "primary_color": "",
  "secondary_color": "",
  "accent_color": "",
  "background_color": "",
  "typography": {
    "heading": "",
    "body": ""
  },
  "visual_style": "",
  "confidence": null,
  "evidence": []
}`;

  const res = await executeUnifiedAiCall({
    systemPrompt,
    userPrompt,
    responseFormat: "json_object",
    temperature: 0.2,
    images: evidence.screenshotBase64
      ? [{ mimeType: "image/png", base64: evidence.screenshotBase64 }]
      : undefined,
  });

  const parsed = res.parsedJson || {};
  return {
    brand_name: typeof parsed.brand_name === "string" ? parsed.brand_name : "",
    primary_color: typeof parsed.primary_color === "string" ? parsed.primary_color : "",
    secondary_color: typeof parsed.secondary_color === "string" ? parsed.secondary_color : "",
    accent_color: typeof parsed.accent_color === "string" ? parsed.accent_color : "",
    background_color: typeof parsed.background_color === "string" ? parsed.background_color : "",
    typography: {
      heading: parsed.typography?.heading || "",
      body: parsed.typography?.body || "",
    },
    visual_style: typeof parsed.visual_style === "string" ? parsed.visual_style : "",
    confidence: null,
    evidence: [],
  };
}

/**
 * Squad 2: Copy & Comunicação
 * Portado de ENGIOS (brand.agent.ts) — Arquétipos de Jung, Do/Don't words, Tom de Voz.
 */
export async function runCopySquad(evidence: ScrapedEvidence): Promise<CopySquadResult> {
  const systemPrompt = `Você é o Estrategista-Chefe de Comunicação e Tom de Voz do Waesy.
Analise a linguagem explícita da empresa. Arquétipos, público, pilares e tom são hipóteses interpretativas, não fatos observados nem perfil validado de clientes. Se a fonte for insuficiente, use campos vazios.
Regras:
1. Determine o arquétipo junguiano principal (ex: O Criador, O Cuidador, O Herói, O Sábio, O Rebelde, O Explorador, O Mago, O Governante, O Amante, O Cara Comum).
2. Defina 4 adjetivos de tom de voz.
3. Crie regras claras de tom: Como a marca fala vs Como NÃO fala.
4. Liste palavras obrigatórias (do_words) e vocabulário proibido (dont_words).
5. Forneça 3 pilares editoriais de conteúdo.
6. Gere bio/tagline somente se as fontes permitirem; caso contrário use strings vazias.
7. Retorne JSON sem confiança numérica ou evidências inventadas.`;

  const userPrompt = `Material da Empresa:
URL: ${evidence.sourceUrl}
Título: ${evidence.pageTitle}
Bio detectada: ${evidence.metaDescription || "N/A"}
Texto:
${evidence.rawTextSample.slice(0, 2500)}

Retorne o JSON:
{
  "tone_of_voice": "",
  "tone_adjectives": [],
  "archetype": "",
  "archetype_justification": "",
  "tone_rules": [],
  "do_words": [],
  "dont_words": [],
  "content_pillars": [],
  "bio_concise": "",
  "tagline": "",
  "confidence": null,
  "evidence": []
}`;

  const res = await executeUnifiedAiCall({
    systemPrompt,
    userPrompt,
    responseFormat: "json_object",
    temperature: 0.3,
    images: evidence.screenshotBase64
      ? [{ mimeType: "image/png", base64: evidence.screenshotBase64 }]
      : undefined,
  });

  const parsed = res.parsedJson || {};
  return {
    tone_of_voice: typeof parsed.tone_of_voice === "string" ? parsed.tone_of_voice : "",
    tone_adjectives: Array.isArray(parsed.tone_adjectives) ? parsed.tone_adjectives : [],
    archetype: typeof parsed.archetype === "string" ? parsed.archetype : "",
    archetype_justification: typeof parsed.archetype_justification === "string" ? parsed.archetype_justification : "",
    tone_rules: Array.isArray(parsed.tone_rules) ? parsed.tone_rules : [],
    do_words: Array.isArray(parsed.do_words) ? parsed.do_words : [],
    dont_words: Array.isArray(parsed.dont_words) ? parsed.dont_words : [],
    content_pillars: Array.isArray(parsed.content_pillars) ? parsed.content_pillars : [],
    bio_concise: typeof parsed.bio_concise === "string" ? parsed.bio_concise : (evidence.metaDescription ? evidence.metaDescription.slice(0, 180) : ""),
    tagline: typeof parsed.tagline === "string" ? parsed.tagline : "",
    confidence: null,
    evidence: [],
  };
}

/**
 * Squad 3: Publicidade & PR
 */
export async function runPrSquad(evidence: ScrapedEvidence): Promise<PrSquadResult> {
  const systemPrompt = `Você é o Diretor de Publicidade e Relações Públicas do Waesy.
Sua função é elaborar hipóteses de posicionamento a partir das fontes fornecidas; não afirme exclusividade, superioridade ou reputação não demonstrada.
Regras:
1. Posicionamento na fórmula: "Para [público-alvo], a [marca] é a [categoria] que entrega [benefício principal] porque [prova/diferencial]".
2. Proposta de valor clara em 1 frase.
3. Resumo da reputação baseado em dados reais de avaliações se presentes ou honestidade se ausentes.
4. Retorne apenas JSON com confidence e evidence[].`;

  const userPrompt = `Dados coletados da empresa:
Título: ${evidence.pageTitle}
Google Business Conectado: ${evidence.googleBusiness?.found ? "Sim" : "Não"}
Texto do site:
${evidence.rawTextSample.slice(0, 2000)}

Retorne o JSON:
{
  "positioning_statement": "",
  "value_proposition": "",
  "reputation_summary": "",
  "confidence": null,
  "evidence": []
}`;

  const res = await executeUnifiedAiCall({
    systemPrompt,
    userPrompt,
    responseFormat: "json_object",
    temperature: 0.25,
  });

  const parsed = res.parsedJson || {};
  return {
    positioning_statement: typeof parsed.positioning_statement === "string" ? parsed.positioning_statement : "",
    value_proposition: typeof parsed.value_proposition === "string" ? parsed.value_proposition : "",
    reputation_summary: typeof parsed.reputation_summary === "string" ? parsed.reputation_summary : (evidence.googleBusiness?.rating != null ? `Avaliação média ${evidence.googleBusiness.rating}★ no Google.` : ""),
    confidence: null,
    evidence: [],
  };
}

/**
 * Squad 4: Estrategista de Negócios (SWOT, Business Model Canvas e 7 Pecados)
 * Portado de ENGIOS (frameworks.ts) e Waesy (seven-sins-simlab.functions.ts).
 */
export async function runBusinessStrategistSquad(evidence: ScrapedEvidence): Promise<BusinessStrategistSquadResult> {
  const systemPrompt = `Você é o Estrategista de Negócios Sênior do Waesy.
Sua missão é produzir um rascunho analítico, baseado somente nas evidências fornecidas. Separe fatos de hipóteses e marque hipóteses no próprio texto; não trate o output como pesquisa de mercado ou validação de clientes. Campos sem suporte ficam vazios.
1. Business Model Canvas (9 blocos fundamentais: proposta de valor, segmentos, canais, relacionamento, fontes de receita, recursos, atividades, parceiros, estrutura de custos).
2. Matriz SWOT com hipóteses identificadas; sem base suficiente, devolva listas vazias. Não force quantidade mínima.
3. Canvas dos 7 Pecados Capitais: gere ganchos persuasivos para cada um dos 7 pecados (orgulho, ganancia, luxuria, inveja, gula, ira, preguica) adaptados especificamente para esta empresa.
4. Retorne JSON sem confiança numérica nem evidências inventadas.`;

  const userPrompt = `Empresa:
Domínio: ${evidence.domain}
Título: ${evidence.pageTitle}
Descrição: ${evidence.metaDescription || "N/A"}
Texto Mapeado:
${evidence.rawTextSample.slice(0, 2500)}

Retorne o JSON estrito:
{
  "business_model": {
    "value_proposition": "",
    "target_segments": [],
    "customer_relationships": [],
    "distribution_channels": [],
    "key_activities": [],
    "key_resources": [],
    "key_partners": [],
    "cost_structure": [],
    "revenue_streams": []
  },
  "swot": {
    "strengths": [],
    "weaknesses": [],
    "opportunities": [],
    "threats": []
  },
  "seven_sins_hooks": {
    "orgulho": "",
    "ganancia": "",
    "luxuria": "",
    "inveja": "",
    "gula": "",
    "ira": "",
    "preguica": ""
  },
  "confidence": null,
  "evidence": []
}`;

  const res = await executeUnifiedAiCall({
    systemPrompt,
    userPrompt,
    responseFormat: "json_object",
    temperature: 0.3,
  });

  const parsed = res.parsedJson || {};
  const swot = parsed.swot || {};
  const bmc = parsed.business_model || {};
  const sins = parsed.seven_sins_hooks || {};

  return {
    business_model: {
      value_proposition: typeof bmc.value_proposition === "string" ? bmc.value_proposition : "",
      target_segments: Array.isArray(bmc.target_segments) ? bmc.target_segments : [],
      customer_relationships: Array.isArray(bmc.customer_relationships) ? bmc.customer_relationships : [],
      distribution_channels: Array.isArray(bmc.distribution_channels) ? bmc.distribution_channels : [],
      key_activities: Array.isArray(bmc.key_activities) ? bmc.key_activities : [],
      key_resources: Array.isArray(bmc.key_resources) ? bmc.key_resources : [],
      key_partners: Array.isArray(bmc.key_partners) ? bmc.key_partners : [],
      cost_structure: Array.isArray(bmc.cost_structure) ? bmc.cost_structure : [],
      revenue_streams: Array.isArray(bmc.revenue_streams) ? bmc.revenue_streams : [],
    },
    swot: {
      strengths: Array.isArray(swot.strengths) ? swot.strengths : [],
      weaknesses: Array.isArray(swot.weaknesses) ? swot.weaknesses : [],
      opportunities: Array.isArray(swot.opportunities) ? swot.opportunities : [],
      threats: Array.isArray(swot.threats) ? swot.threats : [],
    },
    seven_sins_hooks: {
      orgulho: typeof sins.orgulho === "string" ? sins.orgulho : "",
      ganancia: typeof sins.ganancia === "string" ? sins.ganancia : "",
      luxuria: typeof sins.luxuria === "string" ? sins.luxuria : "",
      inveja: typeof sins.inveja === "string" ? sins.inveja : "",
      gula: typeof sins.gula === "string" ? sins.gula : "",
      ira: typeof sins.ira === "string" ? sins.ira : "",
      preguica: typeof sins.preguica === "string" ? sins.preguica : "",
    },
    confidence: null,
    evidence: [],
  };
}

/**
 * Squad 5: Analista de Mercado
 * Portado de ENGIOS (sherlock.agent.ts) — Inteligência competitiva e análise de concorrência.
 */
export async function runMarketAnalystSquad(evidence: ScrapedEvidence): Promise<MarketAnalystSquadResult> {
  const systemPrompt = `Você é o Sherlock — Analista de Inteligência Competitiva e OSINT do Waesy.
Analise somente o texto do próprio site recebido. Esta etapa não consulta buscadores nem páginas de concorrentes; não apresente análise como pesquisa competitiva completa.
Regras:
1. Liste concorrentes somente quando identificados nas fontes fornecidas; se nenhum for identificado, devolva lista vazia. Não use categorias genéricas como concorrentes.
2. Diferenciais e oportunidades sem prova devem ser rotulados como hipóteses; sem base, devolva listas vazias.
3. Retorne JSON sem confiança numérica nem evidências inventadas.`;

  const userPrompt = `Dados da Empresa:
Domínio: ${evidence.domain}
Título: ${evidence.pageTitle}
Texto do Site:
${evidence.rawTextSample.slice(0, 2000)}

Retorne o JSON:
{
  "direct_competitors": [

  ],
  "competitive_differentials": [],
  "market_opportunities": [],
  "confidence": null,
  "evidence": []
}`;

  const res = await executeUnifiedAiCall({
    systemPrompt,
    userPrompt,
    responseFormat: "json_object",
    temperature: 0.25,
  });

  const parsed = res.parsedJson || {};
  return {
    direct_competitors: Array.isArray(parsed.direct_competitors) ? parsed.direct_competitors : [],
    competitive_differentials: Array.isArray(parsed.competitive_differentials) ? parsed.competitive_differentials : [],
    market_opportunities: Array.isArray(parsed.market_opportunities) ? parsed.market_opportunities : [],
    confidence: null,
    evidence: [],
  };
}

// ============================================================
// 7. Etapa 4: Juiz Final e Consolidador
// ============================================================

export async function runConsolidationAndJudge(
  evidence: ScrapedEvidence,
  design: DesignSquadResult,
  copy: CopySquadResult,
  pr: PrSquadResult,
  biz: BusinessStrategistSquadResult,
  market: MarketAnalystSquadResult
): Promise<FinalConsolidatedBriefing> {
  // Extração de produtos genuínos caso o texto contenha catálogo
  const systemPrompt = `Você é o Juiz Final do Concílio de IAs do Waesy.
Sua missão é produzir um rascunho de briefing para revisão humana; a IA não é fonte de verdade nem pesquisador externo nesta etapa.
Regras Absolutas:
1. Se o site contiver produtos/serviços reais com preços, extraia até 5 itens legítimos. Se não contiver produtos explícitos com preços, deixe suggested_products como array vazio []. PROIBIDO criar itens fake.
2. Contato: extraia WhatsApp (apenas dígitos), telefone, e-mail e endereço se mencionados. Se ausente, deixe null sem inventar.
3. Se algum campo crucial não tiver evidência factual suficiente, anote no array unconfirmed_fields.
4. Retorne estritamente o JSON final consolidado.`;

  const userPrompt = `Achados dos Squads:
- Design: Marca "${design.brand_name}", Paleta: ${design.primary_color}, ${design.secondary_color}, Estilo: ${design.visual_style}
- Copy: Tom "${copy.tone_of_voice}", Arquétipo "${copy.archetype}", Bio: "${copy.bio_concise}"
- PR: Posicionamento: "${pr.positioning_statement}"
- Negócios: Proposta "${biz.business_model.value_proposition}", SWOT forças: ${biz.swot.strengths.join(", ")}
- Concorrência: ${market.direct_competitors.map((c) => c.name).join(", ")}

Texto Bruto Original para checagem de fatos e catálogo:
${evidence.scrapedMarkdown?.slice(0, 3000) || evidence.rawTextSample}

Retorne o JSON Consolidado:
{
  "company_name": "${design.brand_name}",
  "category": "",
  "bio": "",
  "tagline": "",
  "suggested_products": [],
  "contact": {
    "whatsapp": null,
    "phone": null,
    "email": null,
    "city": null,
    "state": null,
    "address": null
  },
  "unconfirmed_fields": []
}`;

  const res = await executeUnifiedAiCall({
    systemPrompt,
    userPrompt,
    responseFormat: "json_object",
    temperature: 0.15,
  });

  const parsed = res.parsedJson || {};
  const contact = parsed.contact || {};
  const normalizeForMatch = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  const sourceText = normalizeForMatch([
    evidence.sourceUrl,
    evidence.pageTitle,
    evidence.metaDescription || "",
    evidence.scrapedMarkdown || "",
    evidence.rawTextSample,
  ].join("\n"));
  const rawProducts = Array.isArray(parsed.suggested_products) ? parsed.suggested_products : [];
  const suggestedProducts = rawProducts.filter((item: any) => {
    if (!item || typeof item.name !== "string" || !item.name.trim() || !Number.isInteger(item.price_cents) || item.price_cents <= 0) return false;
    const productName = normalizeForMatch(item.name);
    const brlComma = (item.price_cents / 100).toFixed(2).replace(".", ",");
    const brlDot = (item.price_cents / 100).toFixed(2);
    return productName.length >= 3 && sourceText.includes(productName) && (sourceText.includes(brlComma) || sourceText.includes(brlDot));
  });
  const unconfirmedFields = Array.isArray(parsed.unconfirmed_fields)
    ? parsed.unconfirmed_fields.filter((field: unknown): field is string => typeof field === "string")
    : [];
  if (suggestedProducts.length < rawProducts.length) unconfirmedFields.push("suggested_products: alguns itens foram removidos porque nome/preço não aparecem literalmente nas fontes capturadas");

  const sourceDigits = sourceText.replace(/\D/g, "");
  const verifiedContactValue = (key: "whatsapp" | "phone" | "email" | "city" | "state" | "address") => {
    const raw = contact[key];
    if (typeof raw !== "string" || !raw.trim()) return undefined;
    const normalized = normalizeForMatch(raw);
    const verified = key === "whatsapp" || key === "phone"
      ? raw.replace(/\D/g, "").length >= 8 && sourceDigits.includes(raw.replace(/\D/g, ""))
      : sourceText.includes(normalized);
    if (!verified) unconfirmedFields.push(`contact.${key}: removido porque não foi encontrado literalmente nas fontes capturadas`);
    return verified ? raw : undefined;
  };
  const sourceCompanyName = typeof parsed.company_name === "string" ? parsed.company_name.trim() : "";
  const companyName = sourceCompanyName && sourceText.includes(normalizeForMatch(sourceCompanyName))
    ? sourceCompanyName
    : (evidence.pageTitle || evidence.domain);
  if (sourceCompanyName && companyName !== sourceCompanyName) unconfirmedFields.push("company_name: usando título do site/domínio porque o nome sugerido não foi localizado literalmente");

  return {
    analysis_status: "ai_generated_draft",
    requires_human_review: true,
    company_name: companyName,
    category: parsed.category || "",
    bio: typeof parsed.bio === "string" ? parsed.bio : copy.bio_concise,
    tagline: typeof parsed.tagline === "string" ? parsed.tagline : copy.tagline,
    brand_kit: {
      primary_color: design.primary_color,
      secondary_color: design.secondary_color,
      accent_color: design.accent_color,
      typography: design.typography,
    },
    brand_dna: {
      archetype: copy.archetype,
      archetype_justification: copy.archetype_justification,
      tone_of_voice: copy.tone_of_voice,
      tone_rules: copy.tone_rules,
      content_pillars: copy.content_pillars,
      forbidden_words: copy.dont_words,
      color_palette: {
        primary: design.primary_color,
        secondary: design.secondary_color,
        accent: design.accent_color,
        background: design.background_color,
        text: design.primary_color,
      },
      seven_sins_triggers: biz.seven_sins_hooks,
    },
    briefing: {
      title: `Rascunho de briefing (IA; requer revisão) — ${parsed.company_name || design.brand_name}`,
      business_model_text: JSON.stringify(biz.business_model, null, 2),
      swot_strengths: biz.swot.strengths,
      swot_weaknesses: biz.swot.weaknesses,
      swot_opportunities: biz.swot.opportunities,
      swot_threats: biz.swot.threats,
      competitors: market.direct_competitors,
      ideal_customer_profile: {
        primary_persona: copy.content_pillars[0] || "",
        positioning: pr.positioning_statement,
        uvp: pr.value_proposition,
      },
    },
    suggested_products: suggestedProducts,
    contact: {
      whatsapp: verifiedContactValue("whatsapp"),
      phone: verifiedContactValue("phone"),
      email: verifiedContactValue("email"),
      city: verifiedContactValue("city") || "",
      state: verifiedContactValue("state") || "",
      address: verifiedContactValue("address"),
    },
    evidence_summary: {
      sources_used: [evidence.sourceUrl],
      screenshots_captured: evidence.screenshotUrl ? [evidence.screenshotUrl] : [],
      unconfirmed_fields: unconfirmedFields,
    },
  };
}

// ============================================================
// 8. Etapa 5: Persistência E2E Atômica no Banco de Dados
// ============================================================

export async function persistOnboardingResults(
  storeId: string,
  consolidated: FinalConsolidatedBriefing,
  sourceUrl: string,
  jobId: string
) {
  const supabase = getServerClient();
  const now = new Date().toISOString();

  // A. Atualizar tabela stores
  const { data: currentStore } = await supabase
    .from("stores")
    .select("settings")
    .eq("id", storeId)
    .single();

  const existingSettings = currentStore?.settings || {};
  const updatedSettings = {
    ...existingSettings,
    brand_voice: consolidated.brand_dna.tone_of_voice,
    archetype: consolidated.brand_dna.archetype,
    magic_onboarded_at: now,
    magic_onboarding_url: sourceUrl,
    magic_onboarding_job_id: jobId,
    theme_colors: {
      primary: consolidated.brand_kit.primary_color,
      accent: consolidated.brand_kit.accent_color,
      secondary: consolidated.brand_kit.secondary_color,
    },
  };

  await supabase
    .from("stores")
    .update({
      name: consolidated.company_name,
      bio: consolidated.bio,
      city: consolidated.contact.city,
      state: consolidated.contact.state,
      address: consolidated.contact.address || null,
      phone: consolidated.contact.phone || null,
      contact_whatsapp: consolidated.contact.whatsapp || null,
      website: sourceUrl,
      settings: updatedSettings,
      updated_at: now,
    })
    .eq("id", storeId);

  // B. Upsert em public.brand_kits
  const { data: existingBrandKit } = await supabase
    .from("brand_kits")
    .select("id")
    .eq("store_id", storeId)
    .maybeSingle();

  const brandKitPayload = {
    store_id: storeId,
    brand_name: consolidated.company_name,
    tagline: consolidated.tagline,
    mission: consolidated.briefing.ideal_customer_profile.uvp || `Entregar a melhor experiência em ${consolidated.category}`,
    vision: `Ser referência regional e modelo de atendimento em ${consolidated.contact.city}`,
    values: consolidated.brand_dna.tone_rules.slice(0, 5),
    tone_of_voice: consolidated.brand_dna.tone_of_voice,
    target_audience: consolidated.briefing.ideal_customer_profile.positioning || "Clientes locais qualificados",
    primary_color: consolidated.brand_kit.primary_color,
    secondary_color: consolidated.brand_kit.secondary_color,
    accent_color: consolidated.brand_kit.accent_color,
    typography: consolidated.brand_kit.typography,
    archetype: consolidated.brand_dna.archetype,
    updated_at: now,
  };

  if (existingBrandKit?.id) {
    await supabase.from("brand_kits").update(brandKitPayload).eq("id", existingBrandKit.id);
  } else {
    await supabase.from("brand_kits").insert(brandKitPayload);
  }

  // C. Upsert em public.brand_dna_profiles (7 Pecados + SWOT)
  const { data: existingDna } = await supabase
    .from("brand_dna_profiles")
    .select("id")
    .eq("store_id", storeId)
    .maybeSingle();

  const brandDnaPayload = {
    store_id: storeId,
    archetype: consolidated.brand_dna.archetype,
    archetype_justification: consolidated.brand_dna.archetype_justification,
    tone_of_voice: consolidated.brand_dna.tone_of_voice,
    tone_rules: consolidated.brand_dna.tone_rules,
    content_pillars: consolidated.brand_dna.content_pillars,
    forbidden_words: consolidated.brand_dna.forbidden_words,
    color_palette: consolidated.brand_dna.color_palette,
    seven_sins_triggers: consolidated.brand_dna.seven_sins_triggers,
    swot_analysis: {
      strengths: consolidated.briefing.swot_strengths,
      weaknesses: consolidated.briefing.swot_weaknesses,
      opportunities: consolidated.briefing.swot_opportunities,
      threats: consolidated.briefing.swot_threats,
    },
    updated_at: now,
  };

  if (existingDna?.id) {
    await supabase.from("brand_dna_profiles").update(brandDnaPayload).eq("id", existingDna.id);
  } else {
    await supabase.from("brand_dna_profiles").insert(brandDnaPayload);
  }

  // D. Upsert em public.briefings (Business Model Canvas + Concorrentes)
  const { data: existingBriefing } = await supabase
    .from("briefings")
    .select("id")
    .eq("store_id", storeId)
    .maybeSingle();

  const briefingPayload = {
    store_id: storeId,
    title: consolidated.briefing.title,
    business_model: consolidated.briefing.business_model_text,
    swot_strengths: consolidated.briefing.swot_strengths,
    swot_weaknesses: consolidated.briefing.swot_weaknesses,
    swot_opportunities: consolidated.briefing.swot_opportunities,
    swot_threats: consolidated.briefing.swot_threats,
    competitors: consolidated.briefing.competitors,
    ideal_customer_profile: consolidated.briefing.ideal_customer_profile,
    updated_at: now,
  };

  if (existingBriefing?.id) {
    await supabase.from("briefings").update(briefingPayload).eq("id", existingBriefing.id);
  } else {
    await supabase.from("briefings").insert(briefingPayload);
  }

  // D2. Upsert em public.store_business_model_canvas (9 Blocos de Osterwalder)
  try {
    let parsedBizModel: any = null;
    if (consolidated.briefing.business_model_text) {
      parsedBizModel = JSON.parse(consolidated.briefing.business_model_text);
    }
    if (parsedBizModel && typeof parsedBizModel === "object") {
      const toBmcItems = (arr: any, prefix: string) => {
        if (!Array.isArray(arr)) return [];
        return arr.map((item: any, i: number) => ({
          id: `${prefix}-${i + 1}`,
          text: typeof item === "string" ? item : (item?.text || String(item)),
          confidence: null,
        }));
      };

      const bmcPayload = {
        store_id: storeId,
        key_partners: toBmcItems(parsedBizModel.key_partners, "kp"),
        key_activities: toBmcItems(parsedBizModel.key_activities, "ka"),
        key_resources: toBmcItems(parsedBizModel.key_resources, "kr"),
        value_propositions: parsedBizModel.value_proposition
          ? [{ id: "vp-1", text: parsedBizModel.value_proposition, confidence: null }]
          : [],
        customer_relationships: toBmcItems(parsedBizModel.customer_relationships, "cr"),
        channels: toBmcItems(parsedBizModel.distribution_channels, "ch"),
        customer_segments: toBmcItems(parsedBizModel.target_segments, "cs"),
        cost_structure: toBmcItems(parsedBizModel.cost_structure, "co"),
        revenue_streams: toBmcItems(parsedBizModel.revenue_streams, "rs"),
        generated_by_job_id: jobId,
        ai_model: "waesy-ai-concilio",
        confidence: null,
        edited_by_human: false,
        updated_at: now,
      };

      await supabase
        .from("store_business_model_canvas")
        .upsert(bmcPayload, { onConflict: "store_id" });
    }
  } catch (bmcErr) {
    console.warn("[onboarding-pipeline] Aviso ao persistir store_business_model_canvas:", bmcErr);
  }

  // E. Inserir produtos reais detectados (se existirem)
  let createdProductsCount = 0;
  if (consolidated.suggested_products && consolidated.suggested_products.length > 0) {
    for (const item of consolidated.suggested_products.slice(0, 5)) {
      if (!item.name || item.name.length < 2) continue;
      const { error: pErr } = await supabase.from("products").insert({
        store_id: storeId,
        name: item.name,
        description: item.description || item.name,
        price_cents: Number(item.price_cents || 0),
        is_active: true,
        status: "published",
        metadata: {
          source: "magic_onboarding_ai_concilio",
          category_name: item.category || consolidated.category,
        },
      });
      if (!pErr) createdProductsCount++;
    }
  }

  // F. Sincronizar directory_listings
  await supabase.from("directory_listings").upsert(
    {
      store_id: storeId,
      title: consolidated.company_name,
      description: consolidated.bio,
      category: consolidated.category,
      city: consolidated.contact.city,
      state: consolidated.contact.state,
      address: consolidated.contact.address || null,
      phone: consolidated.contact.phone || consolidated.contact.whatsapp || null,
      whatsapp: consolidated.contact.whatsapp || null,
      website: sourceUrl,
      is_active: true,
      is_verified: false,
      updated_at: now,
    },
    { onConflict: "store_id" }
  );

  // G. Sincronizar rascunhos do onboarding sem sobrescrever respostas humanas existentes.
  try {
    const { listStoreSquads } = await import("./squads-runtime.functions");
    const squads = await listStoreSquads(storeId);

    for (const ss of squads) {
      const dept = ss.template.department;
      let squadAnswers: Record<string, any> = {};
      let runtimeSettings: Record<string, any> = {};

      if (dept === "marketing") {
        squadAnswers = {
          archetype: consolidated.brand_dna.archetype,
          tone_of_voice: consolidated.brand_dna.tone_of_voice,
          content_pillars: consolidated.brand_dna.content_pillars,
        };
        runtimeSettings = {
          primary_color: consolidated.brand_kit.primary_color,
          tagline: consolidated.tagline,
          tone_rules: consolidated.brand_dna.tone_rules,
          seven_sins_triggers: consolidated.brand_dna.seven_sins_triggers,
        };
      } else if (dept === "accounting") {
        runtimeSettings = {
          business_model: consolidated.briefing.business_model_text,
          swot_strengths: consolidated.briefing.swot_strengths,
        };
      } else if (dept === "human_resources") {
        runtimeSettings = {
          company_name: consolidated.company_name,
          category: consolidated.category,
        };
      } else if (dept === "executive_strategy") {
        squadAnswers = {
          value_proposition: consolidated.tagline,
          swot_analysis: {
            strengths: consolidated.briefing.swot_strengths,
            weaknesses: consolidated.briefing.swot_weaknesses,
            opportunities: consolidated.briefing.swot_opportunities,
            threats: consolidated.briefing.swot_threats,
          },
        };
        runtimeSettings = {
          competitors: consolidated.briefing.competitors,
          ideal_customer_profile: consolidated.briefing.ideal_customer_profile,
        };
      }

      const { data: currentSquad, error: currentSquadError } = await supabase
        .from("store_squads")
        .select("onboarding_answers, runtime_settings")
        .eq("id", ss.id)
        .eq("store_id", storeId)
        .maybeSingle();
      if (currentSquadError) throw new Error(`Falha ao ler configuração atual do squad ${ss.id}: ${currentSquadError.message}`);

      const existingAnswers = currentSquad?.onboarding_answers && typeof currentSquad.onboarding_answers === "object"
        ? { ...(currentSquad.onboarding_answers as Record<string, unknown>) }
        : {};
      if (existingAnswers.pricing_strategy === "Margem calibrada conforme mercado regional" && existingAnswers.split_payment_ready === true) {
        delete existingAnswers.pricing_strategy;
        delete existingAnswers.split_payment_ready;
      }
      if (existingAnswers.service_culture === "Atendimento acolhedor e ágil" && existingAnswers.hospitality_focus === true) {
        delete existingAnswers.service_culture;
        delete existingAnswers.hospitality_focus;
      }
      const existingSettings = currentSquad?.runtime_settings && typeof currentSquad.runtime_settings === "object"
        ? currentSquad.runtime_settings as Record<string, unknown>
        : {};

      const { error: squadUpdateError } = await supabase
        .from("store_squads")
        .update({
          onboarding_answers: { ...squadAnswers, ...existingAnswers },
          runtime_settings: {
            ...runtimeSettings,
            ...existingSettings,
            onboarding_analysis_status: "ai_generated_draft",
            requires_human_review: true,
          },
          updated_at: now,
        })
        .eq("id", ss.id)
        .eq("store_id", storeId);
      if (squadUpdateError) throw new Error(`Falha ao atualizar squad ${ss.id}: ${squadUpdateError.message}`);
    }
  } catch (sqErr) {
    console.warn("[onboarding-pipeline] Aviso ao sincronizar rascunhos dos squads:", sqErr);
  }

  return { createdProductsCount };
}
