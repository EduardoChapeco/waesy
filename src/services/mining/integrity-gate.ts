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

import type { ContentStats } from "@/types/mining";
export type { ContentStats };

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
    "clear.gif", "dot.gif", "shim.gif", "images.unsplash.com",
    "unsplash.com/photo", "placeholder", "default-thumb"
  ];

  return !forbiddenPatterns.some((p) => trimmed.includes(p));
}

export function getFallbackThematicImage(_category?: string | null): string {
  // V143 Truth Engine: Zero Stock Photo / Unsplash Fallbacks.
  // Se a matéria não possuir imagem jornalística real da fonte original, retorna string vazia.
  return "";
}

const NON_NEWS_STUB_PATTERNS = [
  /\bao vivo\b/i,
  /assista à programação/i,
  /acompanhe a programação/i,
  /^vídeos?:\s/i,
  /\bbom dia santa catarina\b/i,
  /\bjornal do almoço\b/i,
  /\bgiro cidades\b/i,
  /\bhoróscopo do dia\b/i,
  /\bresultado da lotofácil\b/i,
  /\bresultado da mega-sena\b/i,
];

/**
 * Validador de Integridade Mecânica Rigoroso (Gate Anti-Corpo Vazio & Anti-Stub)
 */
export function validateMechanicalCompleteness(result: MechanicalExtractionResult): IntegrityValidationResult {
  const flags: string[] = [];
  const words = result.wordCount;
  const paragraphs = result.paragraphCount;

  // 1. Verificação de Título Válido e Barragem de Stubs de Programação/Vídeo
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

  if (NON_NEWS_STUB_PATTERNS.some((pattern) => pattern.test(result.title))) {
    return {
      isValid: false,
      reason: `Pauta identificada como grade de programação de TV ou índice de vídeo sem matéria escrita: "${result.title}".`,
      qualityScore: 0,
      wordCount: words,
      paragraphCount: paragraphs,
      hasCoverImage: !!result.coverImageUrl,
      flags: ["LIVE_STREAM_OR_VIDEO_INDEX_STUB"],
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

  // 3. Verificação de Corpo Vazio ou Repetição do Título/Subtítulo
  if (words < 75) {
    return {
      isValid: false,
      reason: `Conteúdo mecânico insuficiente (${words} palavras). A matéria exige apuração completa com múltiplos parágrafos.`,
      qualityScore: 10,
      wordCount: words,
      paragraphCount: paragraphs,
      hasCoverImage: !!result.coverImageUrl,
      flags: ["EMPTY_BODY_DETECTED"],
    };
  }

  // Se o corpo for apenas uma cópia exata do título ou do lead/subtítulo
  const normalizedTitle = normalizeText(result.title);
  const normalizedBody = normalizeText(result.bodyText || (result as any).bodyMarkdown);
  if (normalizedBody === normalizedTitle || (words < 85 && normalizedBody.startsWith(normalizedTitle))) {
    return {
      isValid: false,
      reason: "Corpo do artigo idêntico ao título (conteúdo completo não foi extraído).",
      qualityScore: 15,
      wordCount: words,
      paragraphCount: paragraphs,
      hasCoverImage: !!result.coverImageUrl,
      flags: ["BODY_IS_ONLY_TITLE"],
    };
  }

  if (result.lead && calculateTitleSimilarity(result.lead, result.bodyText) > 0.88) {
    return {
      isValid: false,
      reason: "Corpo do artigo apenas repete a síntese/subtítulo sem desenvolver a notícia.",
      qualityScore: 20,
      wordCount: words,
      paragraphCount: paragraphs,
      hasCoverImage: !!result.coverImageUrl,
      flags: ["BODY_REPEATS_SUBTITLE"],
    };
  }

  // 4. Limite Mínimo Específico por Categoria (Notícias exigem >= 2 parágrafos reais)
  if (result.contentType === "noticia" || result.contentType === "artigo") {
    if (paragraphs < 2) {
      return {
        isValid: false,
        reason: `Artigo com apenas ${paragraphs} parágrafo(s). Requer múltiplos parágrafos estruturados.`,
        qualityScore: 25,
        wordCount: words,
        paragraphCount: paragraphs,
        hasCoverImage: !!result.coverImageUrl,
        flags: ["FEW_PARAGRAPHS"],
      };
    }
    if (words < 110) {
      flags.push("SHORT_NEWS_ARTICLE");
    }
  }

  // 5. Cálculo de Score de Qualidade (0 a 100)
  let score = 45; // Base por ter passado no gate rigoroso

  // Bônus de extensão de texto
  if (words >= 350) score += 25;
  else if (words >= 200) score += 18;
  else if (words >= 110) score += 10;

  // Bônus de imagem de capa saudável (e penalidade se não possuir imagem original real)
  const hasHealthyCover = isHealthyImageUrl(result.coverImageUrl);
  if (hasHealthyCover) {
    score += 15;
  } else {
    flags.push("NO_HEALTHY_COVER_IMAGE");
  }

  // Bônus de autor e data de publicação
  if (result.author) score += 8;
  if (result.publishedAt) score += 7;

  return {
    isValid: true,
    qualityScore: Math.min(100, score),
    wordCount: words,
    paragraphCount: paragraphs,
    hasCoverImage: hasHealthyCover,
    flags,
  };
}
