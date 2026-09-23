/**
 * intent-classifier.engine.ts — Auto-Classificador Zero-Shot de Conteúdo e Roteamento de Entidades
 *
 * Arquitetura de 4 Camadas de Decisão:
 * Camada 1: Heurística Semântica de URL / Path / Query / Subdomínio (0ms, 0 tokens)
 * Camada 2: Metadados Estruturados Schema.org JSON-LD e OpenGraph (Zero-Shot Determinístico)
 * Camada 3: Vetores Léxicos de Frequência em Português (TF-IDF Heurístico)
 * Camada 4: Fallback Inteligente via AI Orchestrator (executeUnifiedAiCall) para Casos Ambíguos (< 70% confiança)
 */

import { executeUnifiedAiCall } from "@/services/api-orchestrator.functions";

export type MinedEntityType = "news" | "business" | "job" | "event" | "product";

export interface ClassificationContext {
  title?: string;
  text?: string;
  html?: string;
  jsonLd?: Record<string, unknown> | null;
  openGraph?: {
    type?: string;
    title?: string;
    description?: string;
    siteName?: string;
  };
}

export interface ClassificationResult {
  entityType: MinedEntityType;
  confidence: number; // 0.0 a 1.0
  signals: string[];
  method: "url_path" | "schema_microdata" | "lexical_vector" | "ai_orchestrator";
}

// ── 1. PALAVRAS-CHAVE E SELETORES POR TIPO DE ENTIDADE ────────────────────────

const PATH_RULES: Array<{ type: MinedEntityType; pattern: RegExp; weight: number }> = [
  // Vagas / Empregos
  { type: "job", pattern: /(vaga|vagas|trabalhe-conosco|carreiras|oportunidade|oportunidades|emprego|empregos|recrutamento|jobs|career)/i, weight: 0.85 },
  // Eventos / Festas / Shows
  { type: "event", pattern: /(evento|eventos|show|shows|festival|congresso|seminario|simposio|festa|agenda-cultural|ingressos|sympla|blueticket)/i, weight: 0.85 },
  // Produtos / Varejo / E-commerce
  { type: "product", pattern: /(produto|produtos|item|itens|catalogo|comprar|loja-online|carrinho|checkout|preco|departamento|mercadoria)/i, weight: 0.8 },
  // Empresas / Negócios Locais
  { type: "business", pattern: /(empresa|empresas|loja|lojas|quem-somos|sobre-nos|institucional|contato|onde-estamos|fornecedores|guia-comercial)/i, weight: 0.75 },
  // Notícias / Editorial
  { type: "news", pattern: /(noticia|noticias|artigo|artigos|post|posts|materia|materias|blog|jornal|editorial|coluna|plantao|fato)/i, weight: 0.8 },
];

const LEXICAL_DICTIONARIES: Record<MinedEntityType, string[]> = {
  job: [
    "requisitos", "beneficios", "salario", "clt", "pj", "remoto", "hibrido", "vaga",
    "atribuicoes", "perfil desejado", "inscreva-se", "candidatura", "curriculo", "vale refeicao",
    "plano de saude", "jornada de trabalho", "tempo integral", "estagio"
  ],
  event: [
    "data do evento", "horario", "local", "ingressos", "lote", "censura", "classificacao",
    "programacao", "palestrante", "atracao", "lineup", "palco", "abertura dos portoess",
    "inscricoes abertas", "setores", "pista", "camarote", "vip"
  ],
  product: [
    "r$", "reais", "em estoque", "parcelamento", "adicionar ao carrinho", "frete", "sku",
    "dimensoes", "especificacoes tecnicas", "garantia", "marca", "modelo", "desconto",
    "de:", "por:", "vista no pix", "sem juros"
  ],
  business: [
    "cnpj", "razao social", "nome fantasia", "missao", "visao", "valores", "nossos servicos",
    "atendimento", "horario de funcionamento", "segunda a sexta", "sabado", "telefone", "whatsapp",
    "endereco", "bairro", "cep", "fale conosco", "sobre nos"
  ],
  news: [
    "redacao", "reportagem", "g1", "nd mais", "segundo informacoes", "disse o delegado",
    "prefeitura informou", "nesta terca-feira", "nesta segunda-feira", "na manha de",
    "policia militar", "bombeiros", "acidente", "investigacao", "governo de sc"
  ]
};

// ── 2. MOTOR PRINCIPAL ───────────────────────────────────────────────────────

export async function classifyMinedEntity(
  url: string,
  context: ClassificationContext = {}
): Promise<ClassificationResult> {
  const signals: string[] = [];

  // CAMADA 1: Análise Semântica de URL e Path
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    const pathname = parsed.pathname.toLowerCase();

    for (const rule of PATH_RULES) {
      if (rule.pattern.test(pathname)) {
        signals.push(`URL path matched: ${rule.pattern.source}`);
        if (rule.weight >= 0.8) {
          return {
            entityType: rule.type,
            confidence: rule.weight,
            signals,
            method: "url_path",
          };
        }
      }
    }
  } catch {
    // Ignora erro de parsing de URL
  }

  // CAMADA 2: Metadados Estruturados Schema.org & OpenGraph
  if (context.jsonLd) {
    const rawType = String(context.jsonLd["@type"] || "").toLowerCase();
    if (rawType.includes("newsarticle") || rawType.includes("article") || rawType.includes("blogposting")) {
      signals.push(`Schema.org @type: ${rawType}`);
      return { entityType: "news", confidence: 0.95, signals, method: "schema_microdata" };
    }
    if (rawType.includes("jobposting")) {
      signals.push(`Schema.org @type: ${rawType}`);
      return { entityType: "job", confidence: 0.95, signals, method: "schema_microdata" };
    }
    if (rawType.includes("event")) {
      signals.push(`Schema.org @type: ${rawType}`);
      return { entityType: "event", confidence: 0.95, signals, method: "schema_microdata" };
    }
    if (rawType.includes("product")) {
      signals.push(`Schema.org @type: ${rawType}`);
      return { entityType: "product", confidence: 0.95, signals, method: "schema_microdata" };
    }
    if (rawType.includes("localbusiness") || rawType.includes("organization") || rawType.includes("store")) {
      signals.push(`Schema.org @type: ${rawType}`);
      return { entityType: "business", confidence: 0.95, signals, method: "schema_microdata" };
    }
  }

  if (context.openGraph?.type) {
    const ogType = context.openGraph.type.toLowerCase();
    if (ogType.includes("article")) {
      signals.push(`OpenGraph type: ${ogType}`);
      return { entityType: "news", confidence: 0.85, signals, method: "schema_microdata" };
    }
    if (ogType.includes("product")) {
      signals.push(`OpenGraph type: ${ogType}`);
      return { entityType: "product", confidence: 0.85, signals, method: "schema_microdata" };
    }
  }

  // CAMADA 3: Vetores Léxicos em Português
  const combinedText = `${context.title || ""} ${context.text || ""}`.toLowerCase();
  if (combinedText.trim().length > 50) {
    const scores: Record<MinedEntityType, number> = {
      news: 0,
      business: 0,
      job: 0,
      event: 0,
      product: 0,
    };

    for (const [entityType, keywords] of Object.entries(LEXICAL_DICTIONARIES) as [MinedEntityType, string[]][]) {
      for (const kw of keywords) {
        if (combinedText.includes(kw)) {
          scores[entityType] += 1;
        }
      }
    }

    let topType: MinedEntityType = "news";
    let maxScore = -1;
    let totalMatches = 0;

    for (const [t, s] of Object.entries(scores) as [MinedEntityType, number][]) {
      totalMatches += s;
      if (s > maxScore) {
        maxScore = s;
        topType = t;
      }
    }

    if (totalMatches >= 3 && maxScore >= 2) {
      const confidence = Math.min(0.92, 0.65 + (maxScore / Math.max(totalMatches, 1)) * 0.25);
      signals.push(`Lexical matches: ${maxScore}/${totalMatches} for ${topType}`);
      return {
        entityType: topType,
        confidence,
        signals,
        method: "lexical_vector",
      };
    }
  }

  // CAMADA 4: Fallback Inteligente via AI Orchestrator para Casos Ambíguos
  if (combinedText.trim().length > 30) {
    try {
      const prompt = `Classifique a seguinte página da web em exatamente uma das 5 categorias:
- news (notícia jornalística regional, artigo)
- business (perfil de empresa, comércio local, serviços)
- job (vaga de emprego, anúncio de contratação)
- event (evento, show, congresso, festa, ingressos)
- product (produto de e-commerce, catálogo com preço)

URL: ${url}
Título: ${context.title || "N/A"}
Texto de amostra: ${combinedText.substring(0, 400)}

Responda APENAS um JSON válido no formato: {"type": "news"|"business"|"job"|"event"|"product", "confidence": 0.95}`;

      const aiResponse = await executeUnifiedAiCall({
        prompt,
        systemInstruction: "Você é um classificador estrito de entidades web. Responda exclusivamente com JSON puro.",
        temperature: 0.1,
      });

      if (aiResponse?.text) {
        const cleaned = aiResponse.text.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        if (["news", "business", "job", "event", "product"].includes(parsed.type)) {
          signals.push(`AI Orchestrator classification: ${parsed.type}`);
          return {
            entityType: parsed.type as MinedEntityType,
            confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.85,
            signals,
            method: "ai_orchestrator",
          };
        }
      }
    } catch {
      // Falha graciosa de IA
    }
  }

  // Fallback padrão se nenhuma heurística atingir threshold
  return {
    entityType: "news",
    confidence: 0.5,
    signals: ["Default fallback to news"],
    method: "lexical_vector",
  };
}
