/**
 * semantic-deduplicator.ts — Motor de Deduplicação Semântica & Clusterização de Histórias
 * 
 * Agrupa coberturas jornalísticas e notícias de múltiplos portais (G1 SC, ND Mais, ClicRDC)
 * que abordam o mesmo evento em Chapecó e região, evitando proliferação de artigos redundantes.
 * Utiliza similaridade Jaccard em n-gramas e janelas temporais de 48 horas.
 * 
 * Regra: ZERO TOKENS DE IA. Algoritmo determinístico de alta eficiência computacional.
 */

import { getServerClient } from "@/lib/supabase";

const STOPWORDS = new Set([
  "de", "da", "do", "das", "dos", "em", "no", "na", "nos", "nas",
  "por", "para", "com", "sem", "sob", "sobre", "entre", "ate",
  "um", "uma", "uns", "umas", "o", "a", "os", "as", "e", "ou",
  "mas", "que", "se", "como", "quando", "onde", "quem", "foi",
  "sao", "ser", "ter", "tem", "vai", "diz", "veja", "apos", "sobre"
]);

export function normalizeAndTokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && STOPWORDS.has(token) === false);
}

export function computeJaccardSimilarity(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  let intersectionCount = 0;
  for (const token of setA) {
    if (setB.has(token)) {
      intersectionCount++;
    }
  }

  const unionSize = setA.size + setB.size - intersectionCount;
  return unionSize > 0 ? intersectionCount / unionSize : 0;
}

export interface ClusterMatchResult {
  clusterId: string;
  isDuplicate: boolean;
  matchedArticleId?: string;
  matchedArticleTitle?: string;
  similarityScore: number;
}

export async function detectStoryCluster(
  rawTitle: string,
  referenceDate?: string
): Promise<ClusterMatchResult> {
  const supabase = getServerClient();
  const inputTokens = normalizeAndTokenize(rawTitle);

  // Janela temporal de 48 horas
  const refTime = referenceDate ? new Date(referenceDate).getTime() : Date.now();
  const windowStart = new Date(refTime - 48 * 60 * 60 * 1000).toISOString();

  const { data: recentArticles } = await supabase
    .from("mined_articles")
    .select("id, raw_title, cluster_id, created_at")
    .gte("created_at", windowStart)
    .limit(100);

  let bestScore = 0;
  let matchedArticle: { id: string; raw_title: string; cluster_id?: string } | null = null;

  if (recentArticles && recentArticles.length > 0) {
    for (const article of recentArticles) {
      if (article.raw_title == null || article.raw_title.length === 0) continue;
      const candTokens = normalizeAndTokenize(article.raw_title);
      const sim = computeJaccardSimilarity(inputTokens, candTokens);

      if (sim > bestScore) {
        bestScore = sim;
        matchedArticle = article;
      }
    }
  }

  // Limiar de clusterização de 0.55 (mesmo evento com títulos ligeiramente diferentes)
  // Limiar de duplicata estrita de 0.80 (mesmo texto/republicação direta)
  if (bestScore >= 0.55 && matchedArticle) {
    const clusterId = matchedArticle.cluster_id || matchedArticle.id;
    return {
      clusterId,
      isDuplicate: bestScore >= 0.80,
      matchedArticleId: matchedArticle.id,
      matchedArticleTitle: matchedArticle.raw_title,
      similarityScore: Math.round(bestScore * 100),
    };
  }

  // Nova história independente: gera novo UUID
  const newClusterId = crypto.randomUUID();
  return {
    clusterId: newClusterId,
    isDuplicate: false,
    similarityScore: Math.round(bestScore * 100),
  };
}
