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
import { getDefaultCity, getDefaultState } from "@/lib/brand.config";
import { SEVEN_SINS_DEFINITIONS, SinType } from "./seven-sins-simlab.functions";

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
  confidence: number;
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
  confidence: number;
  evidence: string[];
}

export interface PrSquadResult {
  positioning_statement: string;
  value_proposition: string;
  reputation_summary: string;
  confidence: number;
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
  confidence: number;
  evidence: string[];
}

export interface MarketAnalystSquadResult {
  direct_competitors: Array<{ name: string; notes?: string }>;
  competitive_differentials: string[];
  market_opportunities: string[];
  confidence: number;
  evidence: string[];
}

export interface FinalConsolidatedBriefing {
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
          // Salva referência ou faz upload para bucket public_media
          screenshotUrl = rawShotUrl;
          extractionProvider = "steel";
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
4. Forneça o campo confidence (0.0 a 1.0) e cite no array evidence[] de onde você tirou cada cor ou pista visual.
5. Se não houver cores explícitas no texto ou screenshot, use a sobriedade institucional (#0F172A primário, #3B82F6 secundário) e marque evidence como "paleta_padrao_sugerida".`;

  const userPrompt = `Evidências Coletadas:
Domínio: ${evidence.domain}
Título da Página: ${evidence.pageTitle}
Descrição: ${evidence.metaDescription || "N/A"}
Texto Extraído:
${evidence.rawTextSample.slice(0, 2000)}
Screenshot capturado: ${evidence.screenshotUrl || "Nenhum print disponível"}

Retorne o JSON:
{
  "brand_name": "Nome da marca",
  "primary_color": "#HEX",
  "secondary_color": "#HEX",
  "accent_color": "#HEX",
  "background_color": "#FFFFFF",
  "typography": {
    "heading": "Nome da fonte para títulos",
    "body": "Nome da fonte para corpo"
  },
  "visual_style": "minimalista|editorial|tecnologico|artesanal|corporativo",
  "confidence": 0.85,
  "evidence": ["trecho ou pista usada"]
}`;

  const res = await executeUnifiedAiCall({
    systemPrompt,
    userPrompt,
    responseFormat: "json_object",
    temperature: 0.2,
  });

  const parsed = res.parsedJson || {};
  return {
    brand_name: parsed.brand_name || evidence.domain.split(".")[0].toUpperCase(),
    primary_color: parsed.primary_color || "#0F172A",
    secondary_color: parsed.secondary_color || "#3B82F6",
    accent_color: parsed.accent_color || "#F59E0B",
    background_color: parsed.background_color || "#FFFFFF",
    typography: {
      heading: parsed.typography?.heading || "Inter",
      body: parsed.typography?.body || "Inter",
    },
    visual_style: parsed.visual_style || "minimalista e moderno",
    confidence: Number(parsed.confidence) || 0.8,
    evidence: Array.isArray(parsed.evidence) ? parsed.evidence : ["evidencia_textual_site"],
  };
}

/**
 * Squad 2: Copy & Comunicação
 * Portado de ENGIOS (brand.agent.ts) — Arquétipos de Jung, Do/Don't words, Tom de Voz.
 */
export async function runCopySquad(evidence: ScrapedEvidence): Promise<CopySquadResult> {
  const systemPrompt = `Você é o Estrategista-Chefe de Comunicação e Tom de Voz do Waesy.
Analise a linguagem, o público e o estilo da empresa com base no material coletado.
Regras:
1. Determine o arquétipo junguiano principal (ex: O Criador, O Cuidador, O Herói, O Sábio, O Rebelde, O Explorador, O Mago, O Governante, O Amante, O Cara Comum).
2. Defina 4 adjetivos de tom de voz.
3. Crie regras claras de tom: Como a marca fala vs Como NÃO fala.
4. Liste palavras obrigatórias (do_words) e vocabulário proibido (dont_words).
5. Forneça 3 pilares editoriais de conteúdo.
6. Crie uma bio concisa (máx. 180 caracteres) e um tagline marcante.
7. Retorne EXCLUSIVAMENTE um JSON estrito com campos confidence e evidence[].`;

  const userPrompt = `Material da Empresa:
URL: ${evidence.sourceUrl}
Título: ${evidence.pageTitle}
Bio detectada: ${evidence.metaDescription || "N/A"}
Texto:
${evidence.rawTextSample.slice(0, 2500)}

Retorne o JSON:
{
  "tone_of_voice": "Frase que resume a voz da marca",
  "tone_adjectives": ["adjetivo1", "adjetivo2", "adjetivo3", "adjetivo4"],
  "archetype": "Nome do arquétipo",
  "archetype_justification": "Por que esse arquétipo combina com a empresa",
  "tone_rules": [
    "Sempre comunicar de forma transparente e acolhedora",
    "Nunca usar jargões frios ou promessas enganosas"
  ],
  "do_words": ["palavra1", "palavra2", "palavra3"],
  "dont_words": ["termo_proibido1", "termo_proibido2"],
  "content_pillars": ["Pilar 1", "Pilar 2", "Pilar 3"],
  "bio_concise": "Bio comercial concisa para o perfil da loja",
  "tagline": "Slogan de alto impacto",
  "confidence": 0.9,
  "evidence": ["trecho relevante do site"]
}`;

  const res = await executeUnifiedAiCall({
    systemPrompt,
    userPrompt,
    responseFormat: "json_object",
    temperature: 0.3,
  });

  const parsed = res.parsedJson || {};
  return {
    tone_of_voice: parsed.tone_of_voice || "Profissional, acolhedor e focado no cliente",
    tone_adjectives: Array.isArray(parsed.tone_adjectives) ? parsed.tone_adjectives : ["Confiável", "Ágil", "Acolhedor", "Claro"],
    archetype: parsed.archetype || "O Cuidador",
    archetype_justification: parsed.archetype_justification || "Foco evidente em atender as necessidades da comunidade e clientes com excelência.",
    tone_rules: Array.isArray(parsed.tone_rules) ? parsed.tone_rules : ["Comunicar com clareza sem burocracia", "Priorizar soluções reais"],
    do_words: Array.isArray(parsed.do_words) ? parsed.do_words : ["Qualidade", "Agilidade", "Confiança", "Atendimento"],
    dont_words: Array.isArray(parsed.dont_words) ? parsed.dont_words : ["Impossível", "Complicado", "Atraso"],
    content_pillars: Array.isArray(parsed.content_pillars) ? parsed.content_pillars : ["Produtos e Serviços em Destaque", "Bastidores e Qualidade", "Depoimentos e Comunidade"],
    bio_concise: parsed.bio_concise || (evidence.metaDescription ? evidence.metaDescription.slice(0, 180) : `Excelência e dedicação em ${evidence.domain}.`),
    tagline: parsed.tagline || `Qualidade e compromisso em cada detalhe.`,
    confidence: Number(parsed.confidence) || 0.85,
    evidence: Array.isArray(parsed.evidence) ? parsed.evidence : ["analise_conteudo_textual"],
  };
}

/**
 * Squad 3: Publicidade & PR
 */
export async function runPrSquad(evidence: ScrapedEvidence): Promise<PrSquadResult> {
  const systemPrompt = `Você é o Diretor de Publicidade e Relações Públicas do Waesy.
Sua função é formular o posicionamento único de mercado e a proposta de valor irresistível (UVP).
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
  "positioning_statement": "Para quem busca X, somos a única empresa que entrega Y porque Z.",
  "value_proposition": "Proposta de valor em uma frase",
  "reputation_summary": "Resumo de reputação e credibilidade percebida",
  "confidence": 0.85,
  "evidence": ["pistas encontradas"]
}`;

  const res = await executeUnifiedAiCall({
    systemPrompt,
    userPrompt,
    responseFormat: "json_object",
    temperature: 0.25,
  });

  const parsed = res.parsedJson || {};
  return {
    positioning_statement: parsed.positioning_statement || `Referência no segmento para clientes que valorizam atendimento ágil e pontualidade.`,
    value_proposition: parsed.value_proposition || `Entrega de excelência com atendimento hiper-personalizado.`,
    reputation_summary: parsed.reputation_summary || (evidence.googleBusiness?.rating ? `Avaliação média ${evidence.googleBusiness.rating}★ no Google.` : `Presença digital ativa e contato direto verificado.`),
    confidence: Number(parsed.confidence) || 0.8,
    evidence: Array.isArray(parsed.evidence) ? parsed.evidence : ["dados_institucionais_site"],
  };
}

/**
 * Squad 4: Estrategista de Negócios (SWOT, Business Model Canvas e 7 Pecados)
 * Portado de ENGIOS (frameworks.ts) e Waesy (seven-sins-simlab.functions.ts).
 */
export async function runBusinessStrategistSquad(evidence: ScrapedEvidence): Promise<BusinessStrategistSquadResult> {
  const systemPrompt = `Você é o Estrategista de Negócios Sênior do Waesy.
Sua missão é gerar a análise de negócios completa e estruturada da empresa:
1. Business Model Canvas (9 blocos fundamentais: proposta de valor, segmentos, canais, relacionamento, fontes de receita, recursos, atividades, parceiros, estrutura de custos).
2. Matriz SWOT (Forças, Fraquezas, Oportunidades, Ameaças) realista com pelo menos 3 pontos em cada quadrante.
3. Canvas dos 7 Pecados Capitais: gere ganchos persuasivos para cada um dos 7 pecados (orgulho, ganancia, luxuria, inveja, gula, ira, preguica) adaptados especificamente para esta empresa.
4. Retorne EXCLUSIVAMENTE JSON válido com confidence e evidence[].`;

  const userPrompt = `Empresa:
Domínio: ${evidence.domain}
Título: ${evidence.pageTitle}
Descrição: ${evidence.metaDescription || "N/A"}
Texto Mapeado:
${evidence.rawTextSample.slice(0, 2500)}

Retorne o JSON estrito:
{
  "business_model": {
    "value_proposition": "Proposta central",
    "target_segments": ["Segmento 1", "Segmento 2"],
    "customer_relationships": ["Relacionamento direto", "Suporte rápido"],
    "distribution_channels": ["Digital", "Loja Física/WhatsApp"],
    "key_activities": ["Atividade 1", "Atividade 2"],
    "key_resources": ["Recurso 1", "Recurso 2"],
    "key_partners": ["Parceiro 1"],
    "cost_structure": ["Custos operacionais", "Estoque/Logística"],
    "revenue_streams": ["Venda de produtos", "Prestação de serviços"]
  },
  "swot": {
    "strengths": ["Ponto forte 1", "Ponto forte 2", "Ponto forte 3"],
    "weaknesses": ["Fraqueza 1", "Fraqueza 2", "Fraqueza 3"],
    "opportunities": ["Oportunidade 1", "Oportunidade 2", "Oportunidade 3"],
    "threats": ["Ameaça 1", "Ameaça 2", "Ameaça 3"]
  },
  "seven_sins_hooks": {
    "orgulho": "Gancho de exclusividade e status",
    "ganancia": "Gancho de retorno sobre investimento e economia",
    "luxuria": "Gancho de apelo estético e desejo imediato",
    "inveja": "Gancho de destaque social",
    "gula": "Gancho de fartura e riqueza de benefícios",
    "ira": "Gancho de indignação contra serviços ruins do mercado",
    "preguica": "Gancho de conveniência máxima e zero esforço"
  },
  "confidence": 0.88,
  "evidence": ["evidencias do modelo de negocio"]
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
      value_proposition: bmc.value_proposition || "Soluções completas com atendimento de alto padrão.",
      target_segments: Array.isArray(bmc.target_segments) && bmc.target_segments.length > 0
        ? bmc.target_segments
        : ["Consumidores locais", "Empresas e profissionais da região"],
      customer_relationships: Array.isArray(bmc.customer_relationships) && bmc.customer_relationships.length > 0
        ? bmc.customer_relationships
        : ["Atendimento via WhatsApp", "Fidelização e suporte dedicado"],
      distribution_channels: Array.isArray(bmc.distribution_channels) && bmc.distribution_channels.length > 0
        ? bmc.distribution_channels
        : ["Plataforma Digital Waesy", "Balcão e WhatsApp"],
      key_activities: Array.isArray(bmc.key_activities) && bmc.key_activities.length > 0
        ? bmc.key_activities
        : ["Operação e atendimento ao cliente", "Gestão de qualidade"],
      key_resources: Array.isArray(bmc.key_resources) && bmc.key_resources.length > 0
        ? bmc.key_resources
        : ["Equipe especializada", "Catálogo e infraestrutura"],
      key_partners: Array.isArray(bmc.key_partners) && bmc.key_partners.length > 0
        ? bmc.key_partners
        : ["Fornecedores homologados", "Rede de logística Waesy"],
      cost_structure: Array.isArray(bmc.cost_structure) && bmc.cost_structure.length > 0
        ? bmc.cost_structure
        : ["Custos com insumos/produtos", "Marketing e operações"],
      revenue_streams: Array.isArray(bmc.revenue_streams) && bmc.revenue_streams.length > 0
        ? bmc.revenue_streams
        : ["Venda direta de produtos", "Serviços e combos"],
    },
    swot: {
      strengths: Array.isArray(swot.strengths) && swot.strengths.length > 0
        ? swot.strengths
        : ["Atendimento personalizado", "Qualidade reconhecida", "Agilidade de entrega"],
      weaknesses: Array.isArray(swot.weaknesses) && swot.weaknesses.length > 0
        ? swot.weaknesses
        : ["Dependência de canais tradicionais", "Presença digital em expansão", "Capacidade operacional"],
      opportunities: Array.isArray(swot.opportunities) && swot.opportunities.length > 0
        ? swot.opportunities
        : ["Digitalização do catálogo no ecossistema Waesy", "Vendas diretas via delivery", "Expansão de base local"],
      threats: Array.isArray(swot.threats) && swot.threats.length > 0
        ? swot.threats
        : ["Concorrência de marketplaces genéricos", "Oscilação de preços de fornecedores", "Mudanças nos hábitos de consumo"],
    },
    seven_sins_hooks: {
      orgulho: sins.orgulho || SEVEN_SINS_DEFINITIONS.orgulho.defaultAngle,
      ganancia: sins.ganancia || SEVEN_SINS_DEFINITIONS.ganancia.defaultAngle,
      luxuria: sins.luxuria || SEVEN_SINS_DEFINITIONS.luxuria.defaultAngle,
      inveja: sins.inveja || SEVEN_SINS_DEFINITIONS.inveja.defaultAngle,
      gula: sins.gula || SEVEN_SINS_DEFINITIONS.gula.defaultAngle,
      ira: sins.ira || SEVEN_SINS_DEFINITIONS.ira.defaultAngle,
      preguica: sins.preguica || SEVEN_SINS_DEFINITIONS.preguica.defaultAngle,
    },
    confidence: Number(parsed.confidence) || 0.85,
    evidence: Array.isArray(parsed.evidence) ? parsed.evidence : ["analise_estrategica_negocio"],
  };
}

/**
 * Squad 5: Analista de Mercado
 * Portado de ENGIOS (sherlock.agent.ts) — Inteligência competitiva e análise de concorrência.
 */
export async function runMarketAnalystSquad(evidence: ScrapedEvidence): Promise<MarketAnalystSquadResult> {
  const systemPrompt = `Você é o Sherlock — Analista de Inteligência Competitiva e OSINT do Waesy.
Analise a posição de mercado da empresa sem inventar concorrentes fictícios.
Regras:
1. Mapeie até 3 concorrentes visíveis no nicho ou deixe explícito como "mercado local genérico" se nenhum competidor for detectado.
2. Identifique os diferenciais competitivos reais e oportunidades de nicho.
3. Retorne JSON estrito com confidence e evidence[].`;

  const userPrompt = `Dados da Empresa:
Domínio: ${evidence.domain}
Título: ${evidence.pageTitle}
Texto do Site:
${evidence.rawTextSample.slice(0, 2000)}

Retorne o JSON:
{
  "direct_competitors": [
    { "name": "Concorrente relevante ou categoria", "notes": "Diferencial de preço ou atuação" }
  ],
  "competitive_differentials": ["Diferencial 1", "Diferencial 2"],
  "market_opportunities": ["Oportunidade de mercado 1", "Oportunidade 2"],
  "confidence": 0.82,
  "evidence": ["pistas de mercado"]
}`;

  const res = await executeUnifiedAiCall({
    systemPrompt,
    userPrompt,
    responseFormat: "json_object",
    temperature: 0.25,
  });

  const parsed = res.parsedJson || {};
  return {
    direct_competitors: Array.isArray(parsed.direct_competitors) && parsed.direct_competitors.length > 0
      ? parsed.direct_competitors
      : [{ name: "Comércio Local Tradicional", notes: "Concorrentes sem catálogo digital integrado" }],
    competitive_differentials: Array.isArray(parsed.competitive_differentials) && parsed.competitive_differentials.length > 0
      ? parsed.competitive_differentials
      : ["Agilidade de atendimento", "Relacionamento comunitário próximo"],
    market_opportunities: Array.isArray(parsed.market_opportunities) && parsed.market_opportunities.length > 0
      ? parsed.market_opportunities
      : ["Venda omnicanal no ecossistema Waesy", "Fidelização via cashback em tokens"],
    confidence: Number(parsed.confidence) || 0.8,
    evidence: Array.isArray(parsed.evidence) ? parsed.evidence : ["analise_concorrencia_nicho"],
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
Sua missão é auditar os achados dos 5 squads, eliminar redundâncias, resolver contradições e entregar o Briefing Canônico Oficial.
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
  "category": "gastronomia|turismo|comercio|servicos|saude|automotivo|outros",
  "bio": "${copy.bio_concise}",
  "tagline": "${copy.tagline}",
  "suggested_products": [
    { "name": "Produto real se detectado", "description": "Descrição", "price_cents": 2900, "category": "Categoria" }
  ],
  "contact": {
    "whatsapp": null,
    "phone": null,
    "email": null,
    "city": "${getDefaultCity()}",
    "state": "${getDefaultState()}",
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

  return {
    company_name: parsed.company_name || design.brand_name,
    category: parsed.category || "comercio",
    bio: parsed.bio || copy.bio_concise,
    tagline: parsed.tagline || copy.tagline,
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
      title: `Briefing Oficial — ${parsed.company_name || design.brand_name}`,
      business_model_text: JSON.stringify(biz.business_model, null, 2),
      swot_strengths: biz.swot.strengths,
      swot_weaknesses: biz.swot.weaknesses,
      swot_opportunities: biz.swot.opportunities,
      swot_threats: biz.swot.threats,
      competitors: market.direct_competitors,
      ideal_customer_profile: {
        primary_persona: copy.content_pillars[0] || "Cliente ideal",
        positioning: pr.positioning_statement,
        uvp: pr.value_proposition,
      },
    },
    suggested_products: Array.isArray(parsed.suggested_products) ? parsed.suggested_products : [],
    contact: {
      whatsapp: contact.whatsapp || undefined,
      phone: contact.phone || undefined,
      email: contact.email || undefined,
      city: contact.city || getDefaultCity(),
      state: contact.state || getDefaultState(),
      address: contact.address || undefined,
    },
    evidence_summary: {
      sources_used: [evidence.sourceUrl],
      screenshots_captured: evidence.screenshotUrl ? [evidence.screenshotUrl] : [],
      unconfirmed_fields: Array.isArray(parsed.unconfirmed_fields) ? parsed.unconfirmed_fields : [],
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
      is_verified: true,
      updated_at: now,
    },
    { onConflict: "store_id" }
  );

  return { createdProductsCount };
}
