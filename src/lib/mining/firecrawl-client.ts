import {
  fetchWithRetry,
  normalizeUrl,
  isCloudflareOrBotChallenge,
  setDomainCooldown,
  extractDomain,
} from './scraper-utils';
import { getNextActiveKey, markKeyError } from '@/services/api-orchestrator.functions';

export type FirecrawlFormat = 'markdown' | 'html' | 'rawHtml' | 'links' | 'summary';

export interface FirecrawlScrapeOptions {
  formats?: FirecrawlFormat[];
  onlyMainContent?: boolean;
  waitFor?: number;
  location?: { country?: string; languages?: string[] };
}

export interface FirecrawlResult<T = unknown> {
  success: boolean;
  data?: T;
  markdown?: string;
  html?: string;
  links?: string[];
  summary?: string;
  error?: string;
  httpStatus?: number;
  isBlocked?: boolean;
  rateLimited?: boolean;
  screenshotUrl?: string;
  provider: 'firecrawl' | 'steel' | 'native-fetch';
}

async function resolveFirecrawlKey(): Promise<{ id?: string; rawKey: string } | null> {
  // 1. Tenta pool de chaves do Secret Vault / api_key_pools
  try {
    const poolKey = await getNextActiveKey('firecrawl');
    if (poolKey && poolKey.rawKey) return poolKey;
  } catch {
    // Continua para variável de ambiente
  }

  // 2. Fallback para variáveis de ambiente
  if (typeof process !== 'undefined' && process.env) {
    const envKey =
      process.env.FIRECRAWL_API_KEY ||
      process.env.FIRECRAWL_API_KEY_1 ||
      process.env.FIRECRAWL_API_KEY_2 ||
      process.env.VITE_FIRECRAWL_API_KEY;
    if (envKey && envKey.trim().length > 5) {
      return { id: 'env-firecrawl', rawKey: envKey.trim() };
    }
  }

  return null;
}

export async function scrapeUrl(
  url: string,
  options: FirecrawlScrapeOptions = {}
): Promise<FirecrawlResult> {
  const normalized = normalizeUrl(url);
  const domain = extractDomain(normalized);
  const keyObj = await resolveFirecrawlKey();

  // 1. Tentativa via API oficial do Firecrawl (se chave estiver ativa)
  if (keyObj && keyObj.rawKey) {
    try {
      const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${keyObj.rawKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: normalized,
          formats: options.formats || ['markdown', 'html'],
          onlyMainContent: options.onlyMainContent ?? false,
          waitFor: options.waitFor ?? 1000,
        }),
        signal: AbortSignal.timeout(20000),
      });

      if (response.ok) {
        const json = await response.json();
        const data = json.data || {};
        return {
          success: true,
          data,
          markdown: data.markdown,
          html: data.html,
          links: data.links || [],
          summary: data.metadata?.description,
          httpStatus: 200,
          provider: 'firecrawl',
        };
      }

      // Se Firecrawl retornou 429 (Rate Limit no serviço do Firecrawl)
      if (response.status === 429) {
        if (keyObj.id) {
          await markKeyError(keyObj.id, 'Firecrawl Rate Limit 429');
        }
        console.warn(`[Firecrawl] Chave ${keyObj.id} atingiu limite 429. Recorrendo a fallbacks.`);
      } else if (response.status === 401 || response.status === 403) {
        if (keyObj.id) {
          await markKeyError(keyObj.id, `Firecrawl Auth Error HTTP ${response.status}`);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (keyObj.id) {
        await markKeyError(keyObj.id, `Firecrawl network error: ${msg.slice(0, 150)}`);
      }
      console.warn('[Firecrawl] Falha na chamada oficial. Recorrendo a fallbacks:', msg);
    }
  }

  // 2. Fallback Nativo sem custo via fetchWithRetry com User-Agent rotativo
  let nativeResponse: Response | null = null;
  let nativeError: string | null = null;
  let isBlocked = false;
  let httpStatus = 0;

  try {
    nativeResponse = await fetchWithRetry(normalized);
    httpStatus = nativeResponse.status;

    if (nativeResponse.ok) {
      const html = await nativeResponse.text();

      // Checa se o corpo é na verdade um desafio camuflado de Cloudflare / Anti-Bot
      if (isCloudflareOrBotChallenge(nativeResponse.status, nativeResponse.headers, html)) {
        isBlocked = true;
        setDomainCooldown(domain, 30 * 60 * 1000, 'cloudflare_challenge_body', 403);
      } else {
        // Extração heurística de links básicos do HTML
        const linkMatches = html.matchAll(/href=["'](https?:\/\/[^"'\s>]+)["']/gi);
        const links: string[] = [];
        for (const match of linkMatches) {
          if (match[1] && !links.includes(match[1])) {
            links.push(match[1]);
          }
        }

        return {
          success: true,
          html,
          links: links.slice(0, 50),
          httpStatus: 200,
          provider: 'native-fetch',
        };
      }
    } else {
      if (nativeResponse.status === 403) {
        isBlocked = true;
      }
      nativeError = `HTTP ${nativeResponse.status}: ${nativeResponse.statusText}`;
    }
  } catch (error) {
    nativeError = error instanceof Error ? error.message : String(error);
    if (nativeError.includes('403') || nativeError.includes('DOMAIN_COOLDOWN')) {
      isBlocked = true;
    }
  }

  // 3. Fallback Avançado Steel.dev (Headless Browser) se a página estiver bloqueada ou exigir bypass
  if (isBlocked || !nativeResponse?.ok) {
    try {
      const steelKey = await getNextActiveKey('steel');
      if (steelKey && steelKey.rawKey) {
        const steelRes = await fetch('https://api.steel.dev/v1/screenshot', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-steel-api-key': steelKey.rawKey,
          },
          body: JSON.stringify({
            url: normalized,
            fullPage: false,
            format: 'png',
          }),
          signal: AbortSignal.timeout(25000),
        });

        if (steelRes.ok) {
          const sData = await steelRes.json();
          if (sData?.url || sData?.screenshotUrl) {
            return {
              success: true,
              screenshotUrl: sData.url || sData.screenshotUrl,
              html: `<html><head><title>${domain}</title></head><body><!-- Steel screenshot captured --></body></html>`,
              links: [],
              httpStatus: 200,
              provider: 'steel',
            };
          }
        } else {
          await markKeyError(steelKey.id, `Steel.dev status ${steelRes.status}`);
        }
      }
    } catch (steelErr) {
      console.warn('[SteelFallback] Erro ao chamar Steel.dev:', steelErr);
    }
  }

  // 4. Retorno explícito de falha com telemetria exata (Sem esconder erros)
  return {
    success: false,
    error: nativeError || `Falha ao raspar ${normalized}`,
    httpStatus: httpStatus || 500,
    isBlocked,
    rateLimited: httpStatus === 429 || nativeError?.includes('429'),
    provider: 'native-fetch',
  };
}
