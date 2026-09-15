/**
 * integrity-gate.ts — Gateway Automático de Validação de Integridade e Clusterização Multi-Fonte
 * 
 * Missão:
 * 1. Erradicar o bug crônico de "importar apenas título e corpo vazio"
 * 2. Barrar páginas bloqueadas (HTTP 403, Cloudflare, Paywall) antes de gastar tokens de IA
 * 3. Gerar hash semântico de título para deduplicação instantânea
 * 4. Clusterizar múltiplas fontes que cobrem o mesmo acontecimento (ex: G1 + NSC cobrindo o mesmo fato)
 */

import type { MechanicalExtractionResult } from "./mechanical-extractor";

export interface IntegrityValidationResult {
  isValid: boolean;
  reason?: string;
  qualityScore: number;
  wordCount: number;
  paragraphCount: number;
  hasCoverImage: boolean;
  flags: string[];
}

const STOP_WORDS = new Set([
  "a", "o", "as", "os", "de", "do", "da", "dos", "das", "em", "no", "na", "nos", "nas",
  "por", "para", "com", "sem", "um", "uma", "uns", "umas", "que", "se", "e", "ou",
  "sobre", "apos", "durante", "entre", "contra", "desde", "ate", "como", "mais", "mas"
]);

/**
 * Remove acentuação e caracteres especiais
 */
export function normalizeText(text?: string | null): string {
  if (!text) return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Gera hash determinístico dos termos centrais do título para deduplicação imediata
 */
export function generateTitleHash(title: string): string {
  const normalized = normalizeText(title);
  const words = normalized
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
    .slice(0, 8); // Pega as 8 palavras-chave centrais

  const signature = words.join("-");
  let hash = 0;
  for (let i = 0; i < signature.length; i++) {
    const char = signature.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `th_${Math.abs(hash).toString(36)}_${words.slice(0, 3).join("_")}`;
}

/**
 * Calcula similaridade semântica de Jaccard entre dois títulos (0 a 1.0)
 */
export function calculateTitleSimilarity(titleA: string, titleB: string): number {
  const wordsA = new Set(
    normalizeText(titleA)
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
  );

  const wordsB = new Set(
    normalizeText(titleB)
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
  );

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }

  const union = new Set([...wordsA, ...wordsB]).size;
  return union === 0 ? 0 : intersection / union;
}

// Títulos inválidos extraídos da engine canônica (Brain Continuous Crawler)
export const INVALID_TITLES = new Set([
  "portal", "home", "index", "untitled", "page", "document", "error", 
  "404", "not found", "forbidden", "access denied", "loading", "please wait",
  "sem titulo", "sem título", "pagina inicial", "página inicial", "carregando"
]);

// Padrões de poluição (captchas, desafios Cloudflare, erros HTTP)
export const POLLUTION_PATTERNS = [
  /recaptcha/i, /cloudflare/i, /captcha/i, /robot/i, 
  /access denied/i, /verify you are human/i, /please wait/i,
  /loading\.\.\./i, /javascript required/i, /enable javascript/i,
  /403 forbidden/i, /404 not found/i, /500 internal/i,
  /serviço temporariamente indisponível/i, /cf-browser-verification/i,
  /just a moment/i, /ddos protection/i
];

export function isContentPolluted(content: string): boolean {
  return POLLUTION_PATTERNS.some((pattern) => pattern.test(content));
}

export interface ContentStats {
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  averageWordLength: number;
  contentLevel: "short" | "medium" | "long";
}

export function computeContentStats(content: string): ContentStats {
  const words = content.match(/\b[\p{L}\p{N}]+\b/gu) || [];
  const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const paragraphs = content.split(/\n{2,}/).filter((p) => p.trim().length > 0);
  const totalLength = words.reduce((sum, w) => sum + w.length, 0);

  const wordCount = words.length;
  let contentLevel: "short" | "medium" | "long" = "short";
  if (wordCount >= 1000) contentLevel = "long";
  else if (wordCount >= 300) contentLevel = "medium";

  return {
    wordCount,
    sentenceCount: sentences.length,
    paragraphCount: paragraphs.length,
    averageWordLength: wordCount > 0 ? totalLength / wordCount : 0,
    contentLevel,
  };
}

export function isHealthyImageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim().toLowerCase();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return false;

  const forbiddenPatterns = [
    "pixel.gif", "spacer.gif", "blank.gif", "1x1", "tracking",
    "avatar/default", "gravatar.com/avatar/default", "data:image",
    "clear.gif", "dot.gif", "shim.gif"
  ];

  return !forbiddenPatterns.some((p) => trimmed.includes(p));
}

export function getFallbackThematicImage(category?: string | null): string {
  const cat = (category || "noticia").toLowerCase();
  if (cat.includes("event") || cat.includes("show") || cat.includes("festa")) {
    return "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&auto=format&fit=crop&q=80";
  }
  if (cat.includes("cultura") || cat.includes("arte") || cat.includes("teatro")) {
    return "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=1200&auto=format&fit=crop&q=80";
  }
  if (cat.includes("municip") || cat.includes("gov") || cat.includes("public") || cat.includes("edital")) {
    return "https://images.unsplash.com/photo-1577495508048-b635879837f1?w=1200&auto=format&fit=crop&q=80";
  }
  if (cat.includes("econ") || cat.includes("negoc") || cat.includes("finan")) {
    return "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop&q=80";
  }
  if (cat.includes("esport") || cat.includes("futebol") || cat.includes("jogo")) {
    return "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&auto=format&fit=crop&q=80";
  }
  return "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&auto=format&fit=crop&q=80";
}

/**
 * Validador de Integridade Mecânica Rigoroso (Gate Anti-Corpo Vazio)
 */
export function validateMechanicalCompleteness(result: MechanicalExtractionResult): IntegrityValidationResult {
  const flags: string[] = [];
  const words = result.wordCount;
  const paragraphs = result.paragraphCount;

  // 1. Verificação de Título Válido
  const cleanTitle = (result.title || "").trim().toLowerCase();
  if (!result.title || cleanTitle.length < 8 || INVALID_TITLES.has(cleanTitle) || result.title === "Sem título") {
    return {
      isValid: false,
      reason: `Título inválido ou genérico identificado: "${result.title}".`,
      qualityScore: 0,
      wordCount: words,
      paragraphCount: paragraphs,
      hasCoverImage: !!result.coverImageUrl,
      flags: ["TITLE_MISSING_OR_GENERIC"],
    };
  }

  // 2. Verificação de Bloqueio / Paywall / Desafio Anti-Bot
  const combinedText = `${result.title} ${result.bodyText}`;
  if (isContentPolluted(combinedText)) {
    return {
      isValid: false,
      reason: "Página bloqueada por proteção anti-bot ou desafio Cloudflare/Akamai detectado no texto.",
      qualityScore: 0,
      wordCount: words,
      paragraphCount: paragraphs,
      hasCoverImage: false,
      flags: ["ACCESS_BLOCKED_OR_CAPTCHA"],
    };
  }

  // 3. Verificação de Corpo Vazio ou Repetição do Título
  if (words < 40) {
    return {
      isValid: false,
      reason: `Conteúdo mecânico insuficiente (${words} palavras). O artigo não possui texto de matéria real.`,
      qualityScore: 10,
      wordCount: words,
      paragraphCount: paragraphs,
      hasCoverImage: !!result.coverImageUrl,
      flags: ["EMPTY_BODY_DETECTED"],
    };
  }

  // Se o corpo for apenas uma cópia exata do título
  const normalizedTitle = normalizeText(result.title);
  const normalizedBody = normalizeText(result.bodyText || (result as any).bodyMarkdown);
  if (normalizedBody === normalizedTitle || (words < 50 && normalizedBody.startsWith(normalizedTitle))) {
    return {
      isValid: false,
      reason: "Corpo do artigo idêntico ao título (conteúdo não foi extraído).",
      qualityScore: 15,
      wordCount: words,
      paragraphCount: paragraphs,
      hasCoverImage: !!result.coverImageUrl,
      flags: ["BODY_IS_ONLY_TITLE"],
    };
  }

  // 4. Limite Mínimo Específico por Categoria
  if (result.contentType === "noticia" || result.contentType === "artigo") {
    if (words < 100) {
      flags.push("SHORT_NEWS_ARTICLE");
    }
    if (paragraphs < 2) {
      flags.push("FEW_PARAGRAPHS");
    }
  }

  // 5. Cálculo de Score de Qualidade (0 a 100)
  let score = 40; // Base por ter passado no gate inicial

  // Bônus de extensão de texto
  if (words >= 300) score += 25;
  else if (words >= 180) score += 15;
  else if (words >= 100) score += 10;

  // Bônus de imagem de capa saudável
  const hasHealthyCover = isHealthyImageUrl(result.coverImageUrl);
  if (hasHealthyCover) {
    score += 15;
  } else {
    flags.push("NO_HEALTHY_COVER_IMAGE");
  }

  // Bônus de autor e data de publicação
  if (result.author) score += 10;
  if (result.publishedAt) score += 10;

  return {
    isValid: true,
    qualityScore: Math.min(100, score),
    wordCount: words,
    paragraphCount: paragraphs,
    hasCoverImage: hasHealthyCover,
    flags,
  };
}
