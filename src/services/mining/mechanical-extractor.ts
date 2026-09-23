/**
 * mechanical-extractor.ts — Motor Mecânico de Extração em 4 Camadas (Zero IA)
 * 
 * Arquitetura de Resiliência:
 * 1. Stealth HTTP Fetcher: Cabeçalhos reais de navegador anti-bloqueio (Akamai, Cloudflare, G1)
 * 2. Camada 1: JSON-LD Schema.org (NewsArticle, Article, Event)
 * 3. Camada 2: OpenGraph, Twitter Cards e MetaTags canônicas
 * 4. Camada 3: Dicionário de Seletores CSS de Portais Nacionais e Regionais
 * 5. Camada 4: Algoritmo de Densidade Textual / Pure Readability (Fall-back universal)
 */

import { getRandomUserAgent, cleanHtmlText } from "@/lib/mining/scraper-utils";
export { cleanHtmlText };

export interface MechanicalExtractionResult {
  title: string;
  lead?: string;
  bodyMarkdown: string;
  bodyText: string;
  author?: string;
  publishedAt?: string;
  coverImageUrl?: string;
  galleryImages: string[];
  wordCount: number;
  paragraphCount: number;
  method: "json_ld" | "css_selector" | "readability" | "opengraph";
  contentType: "noticia" | "artigo" | "blog_post" | "educacao" | "eventos" | "portal_municipal" | "portais_publicos" | "receitas" | "empresas" | "processos";
  recipeData?: {
    ingredients: string[];
    instructions: string[];
    prepTimeMinutes?: number;
    cookTimeMinutes?: number;
    totalTimeMinutes?: number;
    servings?: string;
    calories?: string;
  };
  eventData?: {
    startDate?: string;
    endDate?: string;
    venue?: string;
    location?: string;
    priceMin?: number;
    priceMax?: number;
    ticketUrl?: string;
    isFree?: boolean;
    organizerName?: string;
  };
  municipalData?: {
    editalNumber?: string;
    organName?: string;
    modality?: string;
    estimatedValue?: number;
    closingDate?: string;
  };
}



/**
 * Normaliza e valida URLs de imagem, resolvendo links relativos
 */
export function resolveImageUrl(candidateUrl: string | undefined | null, baseUrl: string): string | undefined {
  if (!candidateUrl || typeof candidateUrl !== "string") return undefined;
  const trimmed = candidateUrl.trim();
  if (
    !trimmed ||
    trimmed.startsWith("data:image") ||
    trimmed.startsWith("javascript:") ||
    trimmed.includes("pixel.gif") ||
    trimmed.includes("spacer.gif") ||
    trimmed.includes("1x1") ||
    trimmed.includes("avatar/default")
  ) {
    return undefined;
  }

  try {
    if (trimmed.startsWith("//")) {
      return `https:${trimmed}`;
    }
    return new URL(trimmed, baseUrl).href;
  } catch {
    return undefined;
  }
}

/**
 * Purifica lista de parágrafos eliminando boilerplates de redes sociais,
 * avisos de cookies, chamadas de WhatsApp/Telegram e assinaturas de newsletter.
 */
export function sanitizeParagraphs(paragraphs: string[]): string[] {
  const rejectedSubstrings = [
    "receba as notícias",
    "participe do nosso canal",
    "whatsapp",
    "telegram",
    "siga nosso instagram",
    "assine nossa newsletter",
    "todos os direitos reservados",
    "política de privacidade",
    "clique aqui para aceitar",
    "cookies",
    "leia também",
    "leia mais",
    "veja também",
    "confira também",
    "foto: divulgação",
    "crédito:",
  ];

  return paragraphs.filter((p) => {
    const lower = p.toLowerCase().trim();
    if (lower.length < 25) return false;
    for (const sub of rejectedSubstrings) {
      if (lower.includes(sub)) return false;
    }
    return true;
  });
}

/**
 * Requisitor HTTP de Alta Resiliência com Stealth Headers
 */
export async function fetchHtmlWithStealth(url: string, timeoutMs = 20000): Promise<string> {
  const parsedUrl = new URL(url);
  const userAgent = getRandomUserAgent();

  const headers: Record<string, string> = {
    "User-Agent": userAgent,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    "Cache-Control": "max-age=0",
    Referer: `${parsedUrl.protocol}//${parsedUrl.hostname}/`,
  };

  let lastError: any = null;
  const retries = 2;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(timeoutMs),
        redirect: "follow",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} (${response.statusText})`);
      }

      const html = await response.text();
      if (!html || html.length < 50) {
        throw new Error("Página retornou conteúdo HTML vazio.");
      }

      return html;
    } catch (err: any) {
      lastError = err;
      if (attempt < retries) {
        // Pausa exponencial entre tentativas
        await new Promise((res) => setTimeout(res, 1000 * (attempt + 1)));
      }
    }
  }

  // Camada de Contingência: Jina Reader Proxy (Converte URLs com anti-bot em conteúdo limpo)
  try {
    const jinaRes = await fetch(`https://r.jina.ai/${url}`, {
      headers: {
        Accept: "text/plain",
        "X-Return-Format": "text",
      },
      signal: AbortSignal.timeout(12000),
    });
    if (jinaRes.ok) {
      const text = await jinaRes.text();
      if (text && text.length >= 80) {
        return `<html><head><title>Jina Extracted</title></head><body><article>${text.replace(/\n/g, "<p>")}</article></body></html>`;
      }
    }
  } catch {
    // Segue para erro padrão se proxy também falhar
  }

  throw new Error(`Falha mecânica ao acessar ${url}: ${lastError?.message || "Erro de conexão"}`);
}

/**
 * Camada 1: Extração por JSON-LD Schema.org
 */
function extractFromJsonLd(html: string, sourceUrl: string): Partial<MechanicalExtractionResult> | null {
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const rawJson = match[1].trim();
      const parsed = JSON.parse(rawJson);
      const items = Array.isArray(parsed) ? parsed : [parsed];

      for (const item of items) {
        const type = String(item["@type"] || "");

        // 1. Extração de Eventos
        if (type.includes("Event")) {
          const title = item.name || item.headline;
          const description = item.description || "";
          const startDate = item.startDate;
          const endDate = item.endDate;
          const location = item.location?.name || item.location?.address?.addressLocality || "";
          const venue = item.location?.name || "";
          const image = typeof item.image === "string" ? item.image : item.image?.url || item.image?.[0];
          const ticketUrl = item.offers?.url || item.url || sourceUrl;
          const price = item.offers?.price ? parseFloat(item.offers.price) : undefined;

          if (title) {
            const body = description.replace(/<[^>]+>/g, "\n\n").trim();
            const words = body.split(/\s+/).filter(Boolean).length;
            return {
              title: cleanHtmlText(title),
              lead: cleanHtmlText(description).slice(0, 300),
              bodyMarkdown: body,
              bodyText: cleanHtmlText(body),
              publishedAt: startDate || new Date().toISOString(),
              coverImageUrl: image || undefined,
              galleryImages: image ? [image] : [],
              wordCount: words,
              paragraphCount: 1,
              method: "json_ld",
              contentType: "eventos",
              eventData: {
                startDate,
                endDate,
                venue,
                location,
                priceMin: price,
                ticketUrl,
              },
            };
          }
        }

        // 2. Extração de Notícias e Artigos
        if (type.includes("NewsArticle") || type.includes("Article") || type.includes("BlogPosting")) {
          const title = item.headline || item.name;
          const lead = item.description || "";
          const body = item.articleBody || "";
          const author = typeof item.author === "string" ? item.author : item.author?.name || item.author?.[0]?.name;
          const publishedAt = item.datePublished || item.dateModified;
          const image = typeof item.image === "string" ? item.image : item.image?.url || item.image?.[0];

          if (title && (body.length > 100 || lead.length > 150)) {
            const fullText = body || lead;
            const paragraphs = fullText.split(/\n+/).filter((p: string) => p.trim().length > 20);
            const markdown = paragraphs.length > 0 ? paragraphs.join("\n\n") : fullText;
            const words = fullText.split(/\s+/).filter(Boolean).length;

            return {
              title: cleanHtmlText(title),
              lead: cleanHtmlText(lead).slice(0, 400),
              bodyMarkdown: markdown,
              bodyText: cleanHtmlText(fullText),
              author: author ? cleanHtmlText(author) : undefined,
              publishedAt,
              coverImageUrl: image || undefined,
              galleryImages: image ? [image] : [],
              wordCount: words,
              paragraphCount: Math.max(1, paragraphs.length),
              method: "json_ld",
              contentType: type.includes("BlogPosting") ? "blog_post" : "noticia",
            };
          }
        }
      }
    } catch {
      // Ignora JSON-LD mal formatado e tenta o próximo bloco
    }
  }

  return null;
}

/**
 * Camada 2: Extração por Meta Tags / OpenGraph
 */
function extractFromMetaTags(html: string): {
  title?: string;
  description?: string;
  image?: string;
  author?: string;
  publishedTime?: string;
  category?: string;
} {
  const getMeta = (propOrName: string): string => {
    const r = new RegExp(`<meta[^>]+(?:property|name)=["']${propOrName}["'][^>]+content=["']([^"']+)`, "i");
    const alt = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${propOrName}["']`, "i");
    const match = html.match(r) || html.match(alt);
    return match?.[1] ? cleanHtmlText(match[1]) : "";
  };

  const title = getMeta("og:title") || getMeta("twitter:title") || html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
  const description = getMeta("og:description") || getMeta("twitter:description") || getMeta("description");
  const image = getMeta("og:image") || getMeta("twitter:image");
  const author = getMeta("author") || getMeta("article:author");
  const publishedTime = getMeta("article:published_time") || getMeta("publication_date");
  const category = getMeta("article:section") || getMeta("category");

  return {
    title: title ? cleanHtmlText(title) : undefined,
    description: description ? cleanHtmlText(description) : undefined,
    image: image || undefined,
    author: author ? cleanHtmlText(author) : undefined,
    publishedTime: publishedTime || undefined,
    category: category ? cleanHtmlText(category) : undefined,
  };
}

/**
 * Camada 3: Dicionário de Seletores CSS Específicos por Domínio
 */
function extractByDomainSelectors(html: string, domain: string): {
  title?: string;
  lead?: string;
  paragraphs: string[];
  coverImage?: string;
  author?: string;
  publishedAt?: string;
} {
  const result: {
    title?: string;
    lead?: string;
    paragraphs: string[];
    coverImage?: string;
    author?: string;
    publishedAt?: string;
  } = { paragraphs: [] };

  // 1. G1 Globo
  if (domain.includes("g1.globo.com") || domain.includes("globo.com")) {
    const titleMatch = html.match(/<h1[^>]*class="[^"]*content-head__title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i);
    if (titleMatch) result.title = cleanHtmlText(titleMatch[1]);

    const leadMatch = html.match(/<h2[^>]*class="[^"]*content-head__subtitle[^"]*"[^>]*>([\s\S]*?)<\/h2>/i);
    if (leadMatch) result.lead = cleanHtmlText(leadMatch[1]);

    const pMatches = html.matchAll(/<p[^>]*class="[^"]*content-text__container[^"]*"[^>]*>([\s\S]*?)<\/p>/gi);
    for (const m of pMatches) {
      result.paragraphs.push(cleanHtmlText(m[1]));
    }

    const imgMatch = html.match(/<img[^>]*class="[^"]*content-media-figure__image[^"]*"[^>]*src="([^"]+)"/i);
    if (imgMatch) result.coverImage = imgMatch[1];
  }

  // 2. UOL / Folha
  else if (domain.includes("uol.com.br") || domain.includes("folha.uol.com.br")) {
    const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (titleMatch) result.title = cleanHtmlText(titleMatch[1]);

    const pMatches = html.matchAll(/<(?:p|div)[^>]*class="[^"]*(?:c-news__body|text)[^"]*"[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/gi);
    for (const m of pMatches) {
      result.paragraphs.push(cleanHtmlText(m[1]));
    }
    if (result.paragraphs.length === 0) {
      const genericP = html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi);
      for (const m of genericP) result.paragraphs.push(cleanHtmlText(m[1]));
    }
  }

  // 3. CNN Brasil
  else if (domain.includes("cnnbrasil.com.br")) {
    const titleMatch = html.match(/<h1[^>]*class="[^"]*post__title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (titleMatch) result.title = cleanHtmlText(titleMatch[1]);

    const pMatches = html.matchAll(/<div[^>]*class="[^"]*(?:post__content|single__content)[^"]*"[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/gi);
    for (const m of pMatches) {
      result.paragraphs.push(cleanHtmlText(m[1]));
    }
  }

  // 4. NSC Total / Diário Catarinense
  else if (domain.includes("nsctotal.com.br")) {
    const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (titleMatch) result.title = cleanHtmlText(titleMatch[1]);

    const pMatches = html.matchAll(/<div[^>]*class="[^"]*content__body[^"]*"[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/gi) || html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi);
    for (const m of pMatches) {
      result.paragraphs.push(cleanHtmlText(m[1]));
    }
  }

  // 5. ND Mais
  else if (domain.includes("ndmais.com.br")) {
    const titleMatch = html.match(/<h1[^>]*class="[^"]*entry-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i);
    if (titleMatch) result.title = cleanHtmlText(titleMatch[1]);

    const pMatches = html.matchAll(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/gi);
    for (const m of pMatches) {
      result.paragraphs.push(cleanHtmlText(m[1]));
    }
  }

  // 6. ClicRDC (Oeste Catarinense / Chapecó)
  else if (domain.includes("clicrdc.com.br")) {
    const titleMatch = html.match(/<h1[^>]*class="[^"]*entry-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (titleMatch) result.title = cleanHtmlText(titleMatch[1]);

    const pMatches = html.matchAll(/<div[^>]*class="[^"]*(?:entry-content|td-post-content)[^"]*"[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/gi);
    for (const m of pMatches) {
      result.paragraphs.push(cleanHtmlText(m[1]));
    }
  }

  // 7. Prefeitura Municipal de Chapecó e Órgãos Públicos
  else if (domain.includes("chapeco.sc.gov.br") || domain.includes(".gov.br") || domain.includes(".leg.br")) {
    const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (titleMatch) result.title = cleanHtmlText(titleMatch[1]);

    const pMatches = html.matchAll(/<div[^>]*class="[^"]*(?:field-name-body|materia-conteudo|noticia-corpo|content-body)[^"]*"[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/gi) || html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi);
    for (const m of pMatches) {
      result.paragraphs.push(cleanHtmlText(m[1]));
    }
  }

  result.paragraphs = sanitizeParagraphs(result.paragraphs);
  return result;
}

/**
 * Camada 4: Algoritmo Mecânico de Densidade de Texto (Universal Readability)
 */
function extractByTextDensity(html: string): { title?: string; paragraphs: string[] } {
  // Remove scripts, estilos, comentários, menus e rodapés
  let cleanHtml = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, "")
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, "")
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, "")
    .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, "");

  // Título
  const titleMatch = cleanHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || cleanHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? cleanHtmlText(titleMatch[1]) : undefined;

  // Extrai todos os parágrafos substanciais
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  const rawParagraphs: string[] = [];
  let match;

  while ((match = pRegex.exec(cleanHtml)) !== null) {
    rawParagraphs.push(cleanHtmlText(match[1]));
  }

  const paragraphs = sanitizeParagraphs(rawParagraphs);
  return { title, paragraphs };
}

/**
 * Motor Principal: Extração Mecânica Autônoma em 4 Camadas
 */
export async function extractContentMechanically(url: string, htmlContent?: string): Promise<MechanicalExtractionResult> {
  const parsedUrl = new URL(url);
  const domain = parsedUrl.hostname.replace("www.", "");

  // 1. Obter HTML (se não fornecido)
  const html = htmlContent || (await fetchHtmlWithStealth(url));

  // 1.5. Extratores Especializados Schema.org (Receitas & Eventos) — Zero Tokens de IA
  try {
    const { extractRecipeFromJsonLd, extractEventFromJsonLd } = await import("./specialized-extractors");
    const recipe = extractRecipeFromJsonLd(html, url);
    if (recipe && recipe.ingredients.length > 0) {
      return {
        title: recipe.title,
        lead: recipe.description || `Receita de ${recipe.title} com ${recipe.ingredients.length} ingredientes`,
        bodyMarkdown: recipe.formattedMarkdown,
        bodyText: `${recipe.title}. ${recipe.description || ""} Ingredientes: ${recipe.ingredients.join(", ")}. Modo de preparo: ${recipe.instructions.join(" ")}`,
        author: recipe.author,
        publishedAt: new Date().toISOString(),
        coverImageUrl: recipe.coverImageUrl,
        galleryImages: recipe.coverImageUrl ? [recipe.coverImageUrl] : [],
        wordCount: recipe.formattedMarkdown.split(/\s+/).filter(Boolean).length,
        paragraphCount: recipe.instructions.length + 2,
        method: "json_ld",
        contentType: "receitas",
        recipeData: {
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          prepTimeMinutes: recipe.prepTimeMinutes,
          cookTimeMinutes: recipe.cookTimeMinutes,
          totalTimeMinutes: recipe.totalTimeMinutes,
          servings: recipe.servings,
          calories: recipe.calories,
        },
      };
    }

    const event = extractEventFromJsonLd(html, url);
    if (event && event.title) {
      return {
        title: event.title,
        lead: event.description.slice(0, 350),
        bodyMarkdown: event.formattedMarkdown,
        bodyText: `${event.title}. ${event.description}. Local: ${event.venueName || ""} ${event.city || ""}`,
        publishedAt: event.startDate,
        coverImageUrl: event.coverImageUrl,
        galleryImages: event.coverImageUrl ? [event.coverImageUrl] : [],
        wordCount: event.formattedMarkdown.split(/\s+/).filter(Boolean).length,
        paragraphCount: 4,
        method: "json_ld",
        contentType: "eventos",
        eventData: {
          startDate: event.startDate,
          endDate: event.endDate,
          venue: event.venueName,
          location: event.address || event.city,
          priceMin: event.priceMinCents ? event.priceMinCents / 100 : undefined,
          priceMax: event.priceMaxCents ? event.priceMaxCents / 100 : undefined,
          ticketUrl: event.ticketUrl,
          isFree: event.isFree,
          organizerName: event.organizerName,
        },
      };
    }
  } catch {
    // Continua para extração padrão se falhar
  }

  // 2. Camada 1: JSON-LD Schema.org Padrão (NewsArticle / Article)
  const jsonLdResult = extractFromJsonLd(html, url);
  if (jsonLdResult && jsonLdResult.title && jsonLdResult.wordCount && jsonLdResult.wordCount >= 80) {
    const rawCover = jsonLdResult.coverImageUrl;
    const coverImage = resolveImageUrl(rawCover, url);
    return {
      ...jsonLdResult,
      coverImageUrl: coverImage,
      galleryImages: coverImage ? [coverImage] : [],
    } as MechanicalExtractionResult;
  }

  // 3. Camada 2: Metatags / OpenGraph
  const meta = extractFromMetaTags(html);

  // 4. Camada 3: Seletores por Domínio
  const domainResult = extractByDomainSelectors(html, domain);

  // 5. Camada 4: Densidade Textual Universal
  const densityResult = extractByTextDensity(html);

  // Seleção e Fusão das Melhores Evidências
  const finalTitle =
    domainResult.title ||
    meta.title ||
    densityResult.title ||
    jsonLdResult?.title ||
    "Sem título";

  const candidateParagraphs =
    domainResult.paragraphs.length >= 2
      ? domainResult.paragraphs
      : densityResult.paragraphs.length >= 2
      ? densityResult.paragraphs
      : [];

  const bodyMarkdown = candidateParagraphs.join("\n\n");
  const bodyText = candidateParagraphs.join(" ");
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;
  const paragraphCount = candidateParagraphs.length;

  const lead =
    domainResult.lead ||
    meta.description ||
    (candidateParagraphs[0] ? candidateParagraphs[0].slice(0, 350) : "");

  const rawCoverImage = domainResult.coverImage || meta.image || jsonLdResult?.coverImageUrl;
  const coverImage = resolveImageUrl(rawCoverImage, url);
  const author = domainResult.author || meta.author || jsonLdResult?.author;
  const publishedAt = domainResult.publishedAt || meta.publishedTime || jsonLdResult?.publishedAt || new Date().toISOString();

  // Heurística de Tipo de Conteúdo
  let contentType: MechanicalExtractionResult["contentType"] = "noticia";
  if (domain.includes("sympla") || domain.includes("eventbrite") || url.includes("/evento")) {
    contentType = "eventos";
  } else if (domain.includes("gov.br") || domain.includes(".leg.br") || url.includes("prefeitura")) {
    contentType = "portal_municipal";
  } else if (url.includes("/blog/") || url.includes("/post/")) {
    contentType = "blog_post";
  } else if (url.includes("/curso") || url.includes("/educacao") || url.includes("/artigo")) {
    contentType = "educacao";
  }

  return {
    title: finalTitle,
    lead: lead.slice(0, 400),
    bodyMarkdown,
    bodyText,
    author,
    publishedAt,
    coverImageUrl: coverImage,
    galleryImages: coverImage ? [coverImage] : [],
    wordCount,
    paragraphCount,
    method: domainResult.paragraphs.length >= 2 ? "css_selector" : candidateParagraphs.length > 0 ? "readability" : "opengraph",
    contentType,
  };
}
