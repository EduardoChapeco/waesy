/**
 * url-canonicalizer.ts — Normalização Canônica de URLs e Detector de Laços Infinitos
 *
 * Previne duplicidade de rastreamento, consumo redundante de banda e loops circulares de paginação.
 * Regra DL-04: Proibido uso de negação unária (!ident) para conformidade com design-lint.
 */

import crypto from "crypto";

const DISCARDED_TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "fbclid",
  "gclid",
  "gbraid",
  "wbraid",
  "dclid",
  "msclkid",
  "yclid",
  "mc_eid",
  "ref",
  "source",
  "_ga",
  "_gl",
  "session_id",
  "jsessionid",
  "phpsessid",
  "token",
]);

/**
 * Normaliza uma URL para forma canônica determinística.
 */
export function canonicalizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl.trim());

    // 1. Protocolo e host em caixa baixa
    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase();

    // 2. Remove portas padrão explícitas
    if ((url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443")) {
      url.port = "";
    }

    // 3. Remove fragmentos de âncora (#)
    url.hash = "";

    // 4. Remove parâmetros de marketing e rastreamento
    const keysToDelete: string[] = [];
    url.searchParams.forEach((_, key) => {
      const lowerKey = key.toLowerCase();
      if (DISCARDED_TRACKING_PARAMS.has(lowerKey) || lowerKey.startsWith("utm_")) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => url.searchParams.delete(key));

    // 5. Ordena parâmetros restantes para garantir determinismo
    url.searchParams.sort();

    // 6. Normaliza barra final no caminho
    let normalized = url.toString();
    if (normalized.endsWith("/") && url.pathname !== "/") {
      normalized = normalized.slice(0, -1);
    }

    return normalized;
  } catch {
    // Se a URL for inválida, retorna o valor original sem espaços
    return rawUrl.trim();
  }
}

/**
 * Gera hash SHA-256 da URL canônica para indexação e deduplicação no banco.
 */
export function hashCanonicalUrl(rawUrl: string): string {
  const canonical = canonicalizeUrl(rawUrl);
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

/**
 * Detector de laços e árvore de profundidade em memória para sessões de crawling.
 */
export class UrlLoopDetector {
  private readonly visitedHashes: Set<string> = new Set();
  private readonly maxDepth: number;
  private readonly maxPagesPerRun: number;

  constructor(options: { maxDepth?: number; maxPagesPerRun?: number } = {}) {
    this.maxDepth = options.maxDepth ?? 2;
    this.maxPagesPerRun = options.maxPagesPerRun ?? 20;
  }

  public shouldVisit(url: string, currentDepth: number = 0): boolean {
    if (currentDepth > this.maxDepth) {
      return false;
    }

    if (this.visitedHashes.size >= this.maxPagesPerRun) {
      return false;
    }

    const hash = hashCanonicalUrl(url);
    if (this.visitedHashes.has(hash)) {
      return false;
    }

    return true;
  }

  public markVisited(url: string): void {
    const hash = hashCanonicalUrl(url);
    this.visitedHashes.add(hash);
  }

  public getVisitedCount(): number {
    return this.visitedHashes.size;
  }

  public reset(): void {
    this.visitedHashes.clear();
  }
}
