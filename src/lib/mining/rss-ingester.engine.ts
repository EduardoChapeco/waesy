/**
 * RSS & Atom Feed Ingester Engine
 * Ported with 100% fidelity from proprietary brain-rss-ingester v1.0
 */

import { fetchWithRetry, normalizeUrl, extractDomain, cleanHtmlText } from './scraper-utils';

export interface RssFeedItem {
  guid?: string;
  title: string;
  link: string;
  description?: string;
  contentEncoded?: string;
  publishedAt?: string;
  imageUrl?: string;
  author?: string;
  categories?: string[];
}

export interface ParsedFeedResult {
  title: string;
  description?: string;
  siteUrl?: string;
  feedUrl: string;
  items: RssFeedItem[];
}

export const COMMON_FEED_PATTERNS = [
  '/feed',
  '/feed.xml',
  '/rss',
  '/rss.xml',
  '/atom.xml',
  '/index.xml',
  '/blog/feed',
  '/news/feed',
  '/feed/rss',
];

/**
 * Descobre possíveis URLs de feed a partir de um website
 */
export async function discoverFeeds(websiteUrl: string): Promise<string[]> {
  const normalized = normalizeUrl(websiteUrl);
  const discovered: string[] = [];

  try {
    const response = await fetchWithRetry(normalized, { method: 'GET' });
    if (response.ok) {
      const html = await response.text();
      // Procura por tags <link rel="alternate" type="application/rss+xml" href="...">
      const linkRegex = /<link[^>]+type=["'](application\/(?:rss\+xml|atom\+xml))["'][^>]+href=["']([^"']+)["']/gi;
      let match;
      while ((match = linkRegex.exec(html)) !== null) {
        if (match[2]) {
          const href = match[2];
          const resolved = new URL(href, normalized).toString();
          if (!discovered.includes(resolved)) {
            discovered.push(resolved);
          }
        }
      }
    }
  } catch (err) {
    console.warn(`[RssIngester] Falha ao verificar HTML de ${normalized}:`, err);
  }

  // Se não encontrou links explícitos no <head>, testa os padrões mais comuns
  if (discovered.length === 0) {
    const origin = new URL(normalized).origin;
    for (const pattern of COMMON_FEED_PATTERNS.slice(0, 4)) {
      const candidate = `${origin}${pattern}`;
      try {
        const testRes = await fetchWithRetry(candidate, { method: 'HEAD' });
        if (testRes.ok) {
          discovered.push(candidate);
          break;
        }
      } catch {
        // continua
      }
    }
  }

  return discovered;
}

/**
 * Parser de RSS 2.0 e Atom tolerante e resiliente
 */
export async function parseFeed(feedUrl: string): Promise<ParsedFeedResult> {
  const normalized = normalizeUrl(feedUrl);
  const response = await fetchWithRetry(normalized);

  if (!response.ok) {
    throw new Error(`Falha ao buscar feed ${normalized}: HTTP ${response.status}`);
  }

  const xml = await response.text();

  // Extrair metadados gerais do canal
  const channelTitleMatch = xml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
  const feedTitle = channelTitleMatch ? channelTitleMatch[1].trim() : extractDomain(normalized);

  const descMatch = xml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
  const feedDesc = descMatch ? cleanHtmlText(descMatch[1]) : undefined;

  const items: RssFeedItem[] = [];

  // Suporte a RSS (<item>) e Atom (<entry>)
  const itemMatches = Array.from(xml.matchAll(/<(?:item|entry)[\s>]([\s\S]*?)<\/(?:item|entry)>/gi));

  for (const match of itemMatches) {
    const block = match[1];

    // Título
    const titleM = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const title = titleM ? cleanHtmlText(titleM[1]).trim() : '';

    // Link (RSS <link>url</link> ou Atom <link href="url"/>)
    let link = '';
    const linkTagM = block.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
    const linkAttrM = block.match(/<link[^>]+href=["']([^"']+)["']/i);
    if (linkTagM && linkTagM[1].trim().startsWith('http')) {
      link = linkTagM[1].trim();
    } else if (linkAttrM && linkAttrM[1]) {
      link = linkAttrM[1].trim();
    }

    if (!title || !link) continue;

    // Descrição e Conteúdo
    const descM = block.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
    const contentM = block.match(/<content:encoded[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content:encoded>/i);
    const description = descM ? cleanHtmlText(descM[1]).trim() : undefined;
    const contentEncoded = contentM ? cleanHtmlText(contentM[1]).trim() : undefined;

    // Data de publicação
    const dateM = block.match(/<(?:pubDate|published|updated)>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:pubDate|published|updated)>/i);
    const publishedAt = dateM ? new Date(dateM[1].trim()).toISOString() : undefined;

    // Imagem (enclosure ou media:content ou tag <img> dentro da description)
    let imageUrl: string | undefined;
    const enclosureM = block.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]*type=["']image\/[^"']+["']/i);
    const mediaM = block.match(/<media:content[^>]+url=["']([^"']+)["']/i);
    if (enclosureM && enclosureM[1]) {
      imageUrl = enclosureM[1];
    } else if (mediaM && mediaM[1]) {
      imageUrl = mediaM[1];
    } else if (descM && descM[1]) {
      const imgInDesc = descM[1].match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgInDesc && imgInDesc[1]) {
        imageUrl = imgInDesc[1];
      }
    }

    // GUID / ID
    const guidM = block.match(/<(?:guid|id)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:guid|id)>/i);
    const guid = guidM ? guidM[1].trim() : link;

    items.push({
      guid,
      title,
      link,
      description,
      contentEncoded,
      publishedAt,
      imageUrl,
    });
  }

  return {
    title: feedTitle,
    description: feedDesc,
    feedUrl: normalized,
    items,
  };
}
