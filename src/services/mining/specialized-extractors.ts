/**
 * specialized-extractors.ts — Extratores Mecânicos Especializados (Receitas & Eventos)
 * 
 * Engenharia Reversa baseada em:
 * - carol-caires/receitas-web-scrapper (Parsing de Schema.org Recipe)
 * - ezequielfb/Web-Scraper-Eventos & simran1002/Event-Web-Scraper (Parsing de Schema.org Event)
 * 
 * Filosofia: ZERO TOKENS DE IA. Extração determinística de metadados em profundidade.
 */

import { cleanHtmlText, resolveImageUrl } from "./mechanical-extractor";

export interface ExtractedRecipe {
  title: string;
  description?: string;
  ingredients: string[];
  instructions: string[];
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  totalTimeMinutes?: number;
  servings?: string;
  calories?: string;
  coverImageUrl?: string;
  author?: string;
  category?: string;
  formattedMarkdown: string;
  sourceUrl: string;
}

export interface ExtractedEvent {
  title: string;
  description: string;
  startDate: string;
  endDate?: string;
  venueName?: string;
  address?: string;
  city?: string;
  state?: string;
  priceMinCents?: number;
  priceMaxCents?: number;
  isFree: boolean;
  ticketUrl?: string;
  organizerName?: string;
  coverImageUrl?: string;
  category?: string;
  formattedMarkdown: string;
  sourceUrl: string;
}

/**
 * Converte duração ISO 8601 (ex: "PT30M", "PT1H15M") para minutos inteiros
 */
export function parseIsoDurationToMinutes(duration?: string | null): number | undefined {
  if (!duration || typeof duration !== "string") return undefined;
  const match = duration.match(/P(?:T(?:(\d+)H)?(?:(\d+)M)?)?/i);
  if (!match) return undefined;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const total = hours * 60 + minutes;
  return total > 0 ? total : undefined;
}

/**
 * Extrai bloco de receita do Schema.org JSON-LD presente no HTML
 */
export function extractRecipeFromJsonLd(html: string, sourceUrl: string): ExtractedRecipe | null {
  const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);

  for (const match of jsonLdMatches) {
    try {
      const parsed = JSON.parse(match[1]);
      const items = Array.isArray(parsed) ? parsed : [parsed];

      for (const item of items) {
        const candidate = item["@graph"] ? item["@graph"] : [item];
        for (const node of candidate) {
          const type = node["@type"];
          const isRecipe = type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"));

          if (isRecipe) {
            const title = node.name || node.headline;
            if (!title) continue;

            // Ingredientes
            const rawIngredients = node.recipeIngredient || node.ingredients || [];
            const ingredients: string[] = (Array.isArray(rawIngredients) ? rawIngredients : [rawIngredients])
              .map((i: any) => cleanHtmlText(String(i)))
              .filter((i: string) => i.length > 2);

            // Modo de preparo / Instruções
            const rawInstructions = node.recipeInstructions || [];
            const instructions: string[] = [];

            if (Array.isArray(rawInstructions)) {
              for (const inst of rawInstructions) {
                if (typeof inst === "string") {
                  instructions.push(cleanHtmlText(inst));
                } else if (inst && typeof inst === "object") {
                  if (inst.text) instructions.push(cleanHtmlText(inst.text));
                  else if (inst.itemListElement) {
                    for (const sub of inst.itemListElement) {
                      if (sub.text) instructions.push(cleanHtmlText(sub.text));
                    }
                  }
                }
              }
            } else if (typeof rawInstructions === "string") {
              instructions.push(cleanHtmlText(rawInstructions));
            }

            const prepTime = parseIsoDurationToMinutes(node.prepTime);
            const cookTime = parseIsoDurationToMinutes(node.cookTime);
            const totalTime = parseIsoDurationToMinutes(node.totalTime) || (prepTime && cookTime ? prepTime + cookTime : undefined);

            const coverImageUrl = resolveImageUrl(
              Array.isArray(node.image) ? node.image[0] : typeof node.image === "object" ? node.image?.url : node.image,
              sourceUrl
            );

            // Gera Markdown de alta legibilidade
            const mdLines: string[] = [
              `# ${title}`,
              "",
              node.description ? `${node.description}\n` : "",
              "### Informações Gerais",
              totalTime ? `- **Tempo Total:** ${totalTime} minutos` : "",
              prepTime ? `- **Preparo:** ${prepTime} min` : "",
              cookTime ? `- **Cozimento:** ${cookTime} min` : "",
              node.recipeYield ? `- **Rendimento:** ${node.recipeYield}` : "",
              node.nutrition?.calories ? `- **Calorias:** ${node.nutrition.calories}` : "",
              "",
              "### Ingredientes",
              ...ingredients.map((ing) => `- ${ing}`),
              "",
              "### Modo de Preparo",
              ...instructions.map((step, idx) => `${idx + 1}. ${step}`),
            ].filter(Boolean);

            return {
              title,
              description: node.description,
              ingredients,
              instructions,
              prepTimeMinutes: prepTime,
              cookTimeMinutes: cookTime,
              totalTimeMinutes: totalTime,
              servings: String(node.recipeYield || ""),
              calories: node.nutrition?.calories,
              coverImageUrl,
              author: typeof node.author === "object" ? node.author?.name : node.author,
              category: Array.isArray(node.recipeCategory) ? node.recipeCategory.join(", ") : node.recipeCategory,
              formattedMarkdown: mdLines.join("\n"),
              sourceUrl,
            };
          }
        }
      }
    } catch {
      // Ignora JSON-LD malformado e continua
    }
  }

  return null;
}

/**
 * Extrai bloco de evento do Schema.org JSON-LD presente no HTML
 */
export function extractEventFromJsonLd(html: string, sourceUrl: string): ExtractedEvent | null {
  const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);

  for (const match of jsonLdMatches) {
    try {
      const parsed = JSON.parse(match[1]);
      const items = Array.isArray(parsed) ? parsed : [parsed];

      for (const item of items) {
        const candidate = item["@graph"] ? item["@graph"] : [item];
        for (const node of candidate) {
          const type = node["@type"];
          const isEvent = type === "Event" || (Array.isArray(type) && type.includes("Event")) || (typeof type === "string" && type.endsWith("Event"));

          if (isEvent) {
            const title = node.name || node.headline;
            if (!title) continue;

            const startDate = node.startDate || new Date().toISOString();
            const endDate = node.endDate;

            // Local
            let venueName: string | undefined;
            let address: string | undefined;
            let city: string | undefined;
            let state: string | undefined;

            if (node.location) {
              if (typeof node.location === "string") {
                venueName = node.location;
              } else if (typeof node.location === "object") {
                venueName = node.location.name;
                const addr = node.location.address;
                if (typeof addr === "string") {
                  address = addr;
                } else if (addr && typeof addr === "object") {
                  address = addr.streetAddress || addr.name;
                  city = addr.addressLocality;
                  state = addr.addressRegion;
                }
              }
            }

            // Ingressos e Preços
            let priceMinCents: number | undefined;
            let priceMaxCents: number | undefined;
            let isFree = false;
            let ticketUrl = node.url || sourceUrl;

            const offers = node.offers;
            if (offers) {
              const offerList = Array.isArray(offers) ? offers : [offers];
              for (const off of offerList) {
                if (off.url) ticketUrl = off.url;
                if (off.price !== undefined) {
                  const val = parseFloat(String(off.price));
                  if (!isNaN(val)) {
                    const cents = Math.round(val * 100);
                    if (cents === 0) isFree = true;
                    if (priceMinCents === undefined || cents < priceMinCents) priceMinCents = cents;
                    if (priceMaxCents === undefined || cents > priceMaxCents) priceMaxCents = cents;
                  }
                }
                if (off.isAccessibleForFree === true) {
                  isFree = true;
                  priceMinCents = 0;
                }
              }
            }

            const coverImageUrl = resolveImageUrl(
              Array.isArray(node.image) ? node.image[0] : typeof node.image === "object" ? node.image?.url : node.image,
              sourceUrl
            );

            const organizer = typeof node.organizer === "object" ? node.organizer?.name : node.organizer;

            // Markdown estruturado
            const mdLines: string[] = [
              `# ${title}`,
              "",
              node.description ? `${node.description}\n` : "",
              "### Detalhes do Evento",
              `- **Data:** ${new Date(startDate).toLocaleString("pt-BR")}`,
              endDate ? `- **Término:** ${new Date(endDate).toLocaleString("pt-BR")}` : "",
              venueName ? `- **Local:** ${venueName}` : "",
              address ? `- **Endereço:** ${address}` : "",
              city ? `- **Cidade:** ${city}${state ? ` - ${state}` : ""}` : "",
              isFree ? "- **Entrada:** Gratuita" : priceMinCents ? `- **Ingressos:** A partir de R$ ${(priceMinCents / 100).toFixed(2).replace(".", ",")}` : "",
              organizer ? `- **Organização:** ${organizer}` : "",
              ticketUrl ? `\n[Comprar / Reservar Ingressos](${ticketUrl})` : "",
            ].filter(Boolean);

            return {
              title,
              description: node.description || title,
              startDate,
              endDate,
              venueName,
              address,
              city,
              state,
              priceMinCents,
              priceMaxCents,
              isFree,
              ticketUrl,
              organizerName: organizer,
              coverImageUrl,
              category: typeof node.eventStatus === "string" ? "evento" : "cultura_show",
              formattedMarkdown: mdLines.join("\n"),
              sourceUrl,
            };
          }
        }
      }
    } catch {
      // Ignora JSON-LD malformado e continua
    }
  }

  return null;
}
