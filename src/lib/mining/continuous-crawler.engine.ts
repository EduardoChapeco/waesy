/**
 * Continuous Crawler Core Engine
 * Ported with 100% fidelity from proprietary brain-continuous-crawler v3.3
 */

import { scrapeUrl } from './firecrawl-client';
import { cleanHtmlText, extractDomain, normalizeUrl } from './scraper-utils';
import { classifyMinedEntity, type ClassificationResult } from './intent-classifier.engine';

export type CrawlStrategy = 'default' | 'focused' | 'extended' | 'rescue';

export interface ContentStats {
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  averageWordLength: number;
  level: 'short' | 'medium' | 'long';
}

export interface ExtractedProductData {
  title: string;
  description?: string;
  brand?: string;
  sku?: string;
  priceCents: number;
  compareAtCents?: number;
  currency: string;
  imageUrl?: string;
  availability: 'in_stock' | 'out_of_stock' | 'preorder';
  category?: string;
  attributes?: Record<string, unknown>;
}

export interface ExtractedBusinessData {
  name: string;
  description?: string;
  cnpj?: string;
  phones?: string[];
  emails?: string[];
  address?: string;
  city?: string;
  state?: string;
  socialLinks?: Record<string, string>;
  brandTone?: string;
}

export interface ExtractedPageData {
  success?: boolean;
  error?: string;
  httpStatus?: number;
  isBlocked?: boolean;
  rateLimited?: boolean;
  url: string;
  domain: string;
  title: string;
  contentHash: string;
  cleanText: string;
  stats: ContentStats;
  openGraph: {
    title?: string;
    description?: string;
    image?: string;
    type?: string;
    siteName?: string;
  };
  jsonLd?: Record<string, unknown> | null;
  links: string[];
  isPolluted: boolean;
  strategyUsed: CrawlStrategy;
  classification?: ClassificationResult;
  extractedProduct?: ExtractedProductData | null;
  extractedBusiness?: ExtractedBusinessData | null;
}

const INVALID_TITLES = [
  'portal', 'home', 'index', 'untitled', 'page', 'document',
  'error', '404', 'not found', 'forbidden', 'access denied', 'loading', 'please wait'
];

const POLLUTION_PATTERNS = [
  /recaptcha/i, /cloudflare/i, /captcha/i, /robot/i,
  /access denied/i, /verify you are human/i, /please wait/i,
  /loading\.\.\./i, /javascript required/i, /enable javascript/i,
  /403 forbidden/i, /404 not found/i, /500 internal/i
];

export function selectCrawlStrategy(attempt: number): CrawlStrategy {
  if (attempt <= 1) return 'default';
  if (attempt === 2) return 'focused';
  if (attempt === 3) return 'extended';
  return 'rescue';
}

export function isContentPolluted(content: string): boolean {
  return POLLUTION_PATTERNS.some((pattern) => pattern.test(content));
}

export function computeContentStats(text: string): ContentStats {
  const words = text.match(/\b[\p{L}\p{N}]+\b/gu) || [];
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim().length > 0);
  const totalLength = words.reduce((sum, w) => sum + w.length, 0);

  const wordCount = words.length;
  const sentenceCount = sentences.length;
  const paragraphCount = paragraphs.length;
  const averageWordLength = wordCount > 0 ? totalLength / wordCount : 0;

  let level: 'short' | 'medium' | 'long' = 'short';
  if (wordCount >= 1200) level = 'long';
  else if (wordCount >= 400) level = 'medium';

  return {
    wordCount,
    sentenceCount,
    paragraphCount,
    averageWordLength,
    level,
  };
}

export function validateAndRecoverTitle(
  rawTitle: string | null | undefined,
  url: string,
  content: string
): string {
  if (rawTitle && rawTitle.length >= 5 && !INVALID_TITLES.includes(rawTitle.toLowerCase().trim())) {
    return rawTitle.trim();
  }

  // Fallback 1: Extrair primeiro título H1 do markdown ou HTML
  const h1Match = content.match(/^#\s+(.{10,200})/m) || content.match(/<h1[^>]*>([^<]{10,200})<\/h1>/i);
  if (h1Match && h1Match[1]) {
    return cleanHtmlText(h1Match[1]).trim();
  }

  // Fallback 2: Primeira linha com mais de 20 caracteres
  const firstLine = content
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 20 && !l.startsWith('#') && !l.startsWith('<'));
  if (firstLine) {
    return firstLine.substring(0, 160).trim();
  }

  // Fallback 3: Slug da URL limpo
  try {
    const pathname = new URL(normalizeUrl(url)).pathname;
    const slug = pathname.split('/').filter(Boolean).pop();
    if (slug && slug.length > 3) {
      return slug.replace(/[-_]/g, ' ').replace(/\.\w+$/, '');
    }
  } catch {
    // ignore
  }

  return 'Documento Sem Título';
}

export async function generateContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function extractOpenGraph(html: string): {
  title?: string;
  description?: string;
  image?: string;
  type?: string;
  siteName?: string;
} {
  const getTag = (prop: string) => {
    const patterns = [
      new RegExp(`<meta\\s+property=["']${prop}["']\\s+content=["']([^"']*)["']`, 'i'),
      new RegExp(`<meta\\s+content=["']([^"']*)["']\\s+property=["']${prop}["']`, 'i'),
      new RegExp(`<meta\\s+name=["']${prop}["']\\s+content=["']([^"']*)["']`, 'i'),
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) return match[1].trim();
    }
    return undefined;
  };

  return {
    title: getTag('og:title') || getTag('twitter:title'),
    description: getTag('og:description') || getTag('twitter:description') || getTag('description'),
    image: getTag('og:image') || getTag('twitter:image'),
    type: getTag('og:type'),
    siteName: getTag('og:site_name'),
  };
}

export function extractJsonLd(html: string): Record<string, unknown> | null {
  try {
    const match = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
    if (match && match[1]) {
      return JSON.parse(match[1].trim());
    }
  } catch {
    // ignore json parsing errors
  }
  return null;
}

export function extractProductData(
  html: string,
  jsonLd: Record<string, unknown> | null,
  og: Record<string, any>,
  fallbackTitle: string
): ExtractedProductData | null {
  // 1. Tenta Schema.org Product
  if (jsonLd) {
    const rawType = String(jsonLd['@type'] || '');
    if (/product/i.test(rawType)) {
      const offers = jsonLd.offers as Record<string, unknown> | Array<Record<string, unknown>> | undefined;
      const primaryOffer = Array.isArray(offers) ? offers[0] : offers;
      const rawPrice = primaryOffer?.price || primaryOffer?.lowPrice || jsonLd.price;
      const priceNum = typeof rawPrice === 'number' ? rawPrice : parseFloat(String(rawPrice || '').replace(',', '.'));
      const priceCents = !isNaN(priceNum) && priceNum > 0 ? Math.round(priceNum * 100) : 0;

      if (priceCents > 0) {
        return {
          title: String(jsonLd.name || fallbackTitle).trim(),
          description: typeof jsonLd.description === 'string' ? jsonLd.description.slice(0, 1000) : undefined,
          brand: typeof jsonLd.brand === 'object' ? (jsonLd.brand as any)?.name : String(jsonLd.brand || ''),
          sku: jsonLd.sku ? String(jsonLd.sku) : undefined,
          priceCents,
          currency: String(primaryOffer?.priceCurrency || 'BRL'),
          imageUrl: typeof jsonLd.image === 'string' ? jsonLd.image : Array.isArray(jsonLd.image) ? jsonLd.image[0] : og.image,
          availability: /instock/i.test(String(primaryOffer?.availability || '')) ? 'in_stock' : 'in_stock',
          category: typeof jsonLd.category === 'string' ? jsonLd.category : undefined,
        };
      }
    }
  }

  // 2. Tenta OpenGraph ou Meta Tags de Preço (ex: og:price:amount, product:price:amount)
  const priceMetaMatch = html.match(/<meta[^>]+(?:property|name)=["'](?:product:price:amount|og:price:amount|price)["'][^>]+content=["']([^"']+)["']/i);
  if (priceMetaMatch && priceMetaMatch[1]) {
    const val = parseFloat(priceMetaMatch[1].replace(',', '.'));
    if (!isNaN(val) && val > 0) {
      return {
        title: og.title || fallbackTitle,
        description: og.description,
        priceCents: Math.round(val * 100),
        currency: 'BRL',
        imageUrl: og.image,
        availability: 'in_stock',
      };
    }
  }

  // 3. Regex em BRL no texto HTML (ex: R$ 199,90)
  const brlRegex = /R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*\,[0-9]{2})/i;
  const brlMatch = html.match(brlRegex);
  if (brlMatch && brlMatch[1] && (html.includes('comprar') || html.includes('carrinho') || html.includes('parcelado'))) {
    const num = parseFloat(brlMatch[1].replace(/\./g, '').replace(',', '.'));
    if (!isNaN(num) && num > 0) {
      return {
        title: og.title || fallbackTitle,
        description: og.description,
        priceCents: Math.round(num * 100),
        currency: 'BRL',
        imageUrl: og.image,
        availability: 'in_stock',
      };
    }
  }

  return null;
}

export function extractBusinessData(
  html: string,
  jsonLd: Record<string, unknown> | null,
  og: Record<string, any>,
  domain: string
): ExtractedBusinessData | null {
  let name = og.siteName || '';
  let description = og.description;
  let cnpj: string | undefined;
  const phones: string[] = [];
  const emails: string[] = [];
  let address: string | undefined;
  let city: string | undefined;
  let state: string | undefined;

  // Schema.org LocalBusiness / Organization
  if (jsonLd) {
    const type = String(jsonLd['@type'] || '');
    if (/LocalBusiness|Store|Organization|Restaurant/i.test(type)) {
      name = String(jsonLd.name || name);
      description = typeof jsonLd.description === 'string' ? jsonLd.description : description;
      if (jsonLd.telephone) phones.push(String(jsonLd.telephone));
      if (jsonLd.email) emails.push(String(jsonLd.email));
      if (typeof jsonLd.address === 'object' && jsonLd.address !== null) {
        const addr = jsonLd.address as Record<string, any>;
        address = addr.streetAddress;
        city = addr.addressLocality;
        state = addr.addressRegion;
      }
    }
  }

  // Heurística de CNPJ
  const cnpjMatch = html.match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/);
  if (cnpjMatch) {
    cnpj = cnpjMatch[0];
  }

  // Heurística de Telefone / WhatsApp
  const phoneMatches = html.matchAll(/(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?(?:9\s*)?\d{4}[-\s]?\d{4}/g);
  for (const match of phoneMatches) {
    const clean = match[0].replace(/\D/g, '');
    if (clean.length >= 10 && clean.length <= 13 && !phones.includes(match[0].trim())) {
      phones.push(match[0].trim());
    }
    if (phones.length >= 3) break;
  }

  // Redes Sociais
  const socialLinks: Record<string, string> = {};
  const instaMatch = html.match(/https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)/i);
  if (instaMatch) socialLinks.instagram = instaMatch[0];
  const fbMatch = html.match(/https?:\/\/(?:www\.)?facebook\.com\/([a-zA-Z0-9_.]+)/i);
  if (fbMatch) socialLinks.facebook = fbMatch[0];
  const waMatch = html.match(/https?:\/\/(?:wa\.me|api\.whatsapp\.com\/send\?phone=)(\d+)/i);
  if (waMatch) socialLinks.whatsapp = waMatch[0];

  if (!name) {
    name = domain.replace(/^www\./, '').split('.')[0];
    name = name.charAt(0).toUpperCase() + name.slice(1);
  }

  return {
    name,
    description,
    cnpj,
    phones: phones.slice(0, 3),
    emails: emails.slice(0, 2),
    address,
    city,
    state,
    socialLinks,
  };
}

export async function executeContinuousCrawl(
  targetUrl: string,
  attempt = 1
): Promise<ExtractedPageData> {
  const normalized = normalizeUrl(targetUrl);
  const domain = extractDomain(normalized);
  const strategy = selectCrawlStrategy(attempt);

  const scrapeResult = await scrapeUrl(normalized, {
    onlyMainContent: strategy === 'focused' || strategy === 'rescue',
    waitFor: strategy === 'extended' ? 4000 : 1500,
  });

  // Se o scraper falhar ou for bloqueado por Cloudflare / 429, propaga o status exato sem forjar 200 OK
  if (!scrapeResult.success) {
    return {
      success: false,
      error: scrapeResult.error || `Falha na raspagem de ${normalized}`,
      httpStatus: scrapeResult.httpStatus || 500,
      isBlocked: scrapeResult.isBlocked ?? false,
      rateLimited: scrapeResult.rateLimited ?? false,
      url: normalized,
      domain,
      title: "",
      contentHash: "",
      cleanText: "",
      stats: {
        wordCount: 0,
        sentenceCount: 0,
        paragraphCount: 0,
        averageWordLength: 0,
        level: 'short',
      },
      openGraph: {},
      links: [],
      isPolluted: false,
      strategyUsed: strategy,
    };
  }

  const rawHtml = scrapeResult.html || scrapeResult.markdown || '';
  const cleanText = cleanHtmlText(rawHtml);
  const isPolluted = isContentPolluted(rawHtml);
  const og = extractOpenGraph(rawHtml);
  const jsonLd = extractJsonLd(rawHtml);
  const stats = computeContentStats(cleanText);
  const title = validateAndRecoverTitle(og.title, normalized, rawHtml);
  const contentHash = await generateContentHash(cleanText);

  const classification = await classifyMinedEntity(normalized, {
    title,
    text: cleanText,
    jsonLd,
    openGraph: og,
  });

  const extractedProduct = extractProductData(rawHtml, jsonLd, og, title);
  const extractedBusiness = extractBusinessData(rawHtml, jsonLd, og, domain);

  return {
    success: true,
    httpStatus: scrapeResult.httpStatus || 200,
    url: normalized,
    domain,
    title,
    contentHash,
    cleanText,
    stats,
    openGraph: og,
    jsonLd,
    links: scrapeResult.links || [],
    isPolluted,
    strategyUsed: strategy,
    classification,
    extractedProduct,
    extractedBusiness,
  };
}
