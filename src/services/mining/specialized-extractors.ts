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

export interface ExtractedJob {
  title: string;
  description: string;
  companyName: string;
  employmentType?: string;
  datePosted?: string;
  validThrough?: string;
  city?: string;
  state?: string;
  isRemote?: boolean;
  salaryMinCents?: number;
  salaryMaxCents?: number;
  salaryCurrency?: string;
  salaryUnit?: string;
  requirements?: string[];
  benefits?: string[];
  applyUrl?: string;
  coverImageUrl?: string;
  formattedMarkdown: string;
  sourceUrl: string;
}

export interface ExtractedLodging {
  name: string;
  description: string;
  lodgingType: "hotel" | "resort" | "pousada" | "hostel" | "bed_and_breakfast" | "lodging";
  address?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  starRating?: number;
  amenities: string[];
  priceRange?: string;
  checkinTime?: string;
  checkoutTime?: string;
  petsAllowed?: boolean;
  contactPhone?: string;
  websiteUrl?: string;
  coverImageUrl?: string;
  formattedMarkdown: string;
  sourceUrl: string;
}

export interface RecipeIngredientMatch {
  rawIngredient: string;
  cleanIngredient: string;
  matchedProductId?: string;
  matchedProductName?: string;
  confidenceScore: number;
  suggestedQty: number;
  suggestedUnit: string;
}

/**
 * Extrai anúncio de vaga de emprego a partir do Schema.org JobPosting
 */
export function extractJobFromJsonLd(html: string, sourceUrl: string): ExtractedJob | null {
  const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);

  for (const match of jsonLdMatches) {
    try {
      const parsed = JSON.parse(match[1]);
      const items = Array.isArray(parsed) ? parsed : [parsed];

      for (const item of items) {
        const candidate = item["@graph"] ? item["@graph"] : [item];
        for (const node of candidate) {
          const type = node["@type"];
          const isJob = type === "JobPosting" || (Array.isArray(type) && type.includes("JobPosting"));

          if (isJob) {
            const title = node.title || node.name;
            if (!title) continue;

            const description = cleanHtmlText(node.description || "");
            const companyName = typeof node.hiringOrganization === "object" ? node.hiringOrganization?.name || "Empresa Confidencial" : node.hiringOrganization || "Empresa Confidencial";
            const datePosted = node.datePosted;
            const validThrough = node.validThrough;
            const employmentType = Array.isArray(node.employmentType) ? node.employmentType.join(", ") : node.employmentType;

            let city: string | undefined;
            let state: string | undefined;
            let isRemote = false;

            if (node.jobLocationType === "TELECOMMUTE" || node.applicantLocationRequirements) {
              isRemote = true;
            }

            if (node.jobLocation) {
              const loc = Array.isArray(node.jobLocation) ? node.jobLocation[0] : node.jobLocation;
              const addr = loc?.address;
              if (typeof addr === "string") {
                city = addr;
              } else if (addr && typeof addr === "object") {
                city = addr.addressLocality;
                state = addr.addressRegion;
              }
            }

            // Salário
            let salaryMinCents: number | undefined;
            let salaryMaxCents: number | undefined;
            let salaryCurrency: string | undefined;
            let salaryUnit: string | undefined;

            const baseSalary = node.baseSalary;
            if (baseSalary) {
              salaryCurrency = baseSalary.currency || "BRL";
              const val = baseSalary.value;
              if (typeof val === "number") {
                salaryMinCents = Math.round(val * 100);
                salaryMaxCents = salaryMinCents;
              } else if (val && typeof val === "object") {
                salaryUnit = val.unitText;
                if (val.minValue !== undefined) salaryMinCents = Math.round(Number(val.minValue) * 100);
                if (val.maxValue !== undefined) salaryMaxCents = Math.round(Number(val.maxValue) * 100);
                if (val.value !== undefined && !salaryMinCents) salaryMinCents = Math.round(Number(val.value) * 100);
              }
            }

            const coverImageUrl = resolveImageUrl(
              Array.isArray(node.image) ? node.image[0] : typeof node.image === "object" ? node.image?.url : node.image,
              sourceUrl
            );

            const rawReq = node.experienceRequirements || node.qualifications || [];
            const requirements: string[] = (Array.isArray(rawReq) ? rawReq : [rawReq])
              .map((r: any) => cleanHtmlText(typeof r === "object" ? r.name || r.description || "" : String(r)))
              .filter(Boolean);

            const rawBen = node.jobBenefits || [];
            const benefits: string[] = (Array.isArray(rawBen) ? rawBen : [rawBen])
              .map((b: any) => cleanHtmlText(String(b)))
              .filter(Boolean);

            const applyUrl = node.url || sourceUrl;

            const mdLines: string[] = [
              `# ${title}`,
              "",
              `**Empresa:** ${companyName}`,
              city ? `**Localização:** ${city}${state ? ` - ${state}` : ""}${isRemote ? " (Remoto)" : ""}` : (isRemote ? "**Modelo:** 100% Remoto" : ""),
              employmentType ? `**Regime:** ${employmentType}` : "",
              salaryMinCents ? `**Remuneração:** R$ ${(salaryMinCents / 100).toFixed(2).replace(".", ",")}${salaryMaxCents && salaryMaxCents !== salaryMinCents ? ` a R$ ${(salaryMaxCents / 100).toFixed(2).replace(".", ",")}` : ""}` : "",
              "",
              "### Descrição da Vaga",
              description,
              "",
              requirements.length > 0 ? "### Requisitos\n" + requirements.map((r) => `- ${r}`).join("\n") : "",
              benefits.length > 0 ? "\n### Benefícios\n" + benefits.map((b) => `- ${b}`).join("\n") : "",
              applyUrl ? `\n[Candidatar-se à Vaga](${applyUrl})` : "",
            ].filter(Boolean);

            return {
              title,
              description,
              companyName,
              employmentType,
              datePosted,
              validThrough,
              city,
              state,
              isRemote,
              salaryMinCents,
              salaryMaxCents,
              salaryCurrency,
              salaryUnit,
              requirements,
              benefits,
              applyUrl,
              coverImageUrl,
              formattedMarkdown: mdLines.join("\n"),
              sourceUrl,
            };
          }
        }
      }
    } catch {
      // Ignora erro de parsing
    }
  }

  return null;
}

/**
 * Extrai hotel, pousada ou resort a partir do Schema.org LodgingBusiness
 */
export function extractLodgingFromJsonLd(html: string, sourceUrl: string): ExtractedLodging | null {
  const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);

  for (const match of jsonLdMatches) {
    try {
      const parsed = JSON.parse(match[1]);
      const items = Array.isArray(parsed) ? parsed : [parsed];

      for (const item of items) {
        const candidate = item["@graph"] ? item["@graph"] : [item];
        for (const node of candidate) {
          const type = node["@type"];
          const typeStr = Array.isArray(type) ? type.join(" ") : String(type || "");
          const isLodging =
            typeStr.includes("LodgingBusiness") ||
            typeStr.includes("Hotel") ||
            typeStr.includes("Resort") ||
            typeStr.includes("BedAndBreakfast") ||
            typeStr.includes("Hostel") ||
            typeStr.includes("Motel");

          if (isLodging) {
            const name = node.name || node.headline;
            if (!name) continue;

            const description = cleanHtmlText(node.description || name);
            let lodgingType: ExtractedLodging["lodgingType"] = "lodging";
            if (typeStr.includes("Resort")) lodgingType = "resort";
            else if (typeStr.includes("Hotel")) lodgingType = "hotel";
            else if (typeStr.includes("Hostel")) lodgingType = "hostel";
            else if (typeStr.includes("BedAndBreakfast") || typeStr.includes("Pousada")) lodgingType = "pousada";

            let address: string | undefined;
            let city: string | undefined;
            let state: string | undefined;
            let country: string | undefined;

            if (node.address) {
              const addr = node.address;
              if (typeof addr === "string") {
                address = addr;
              } else if (typeof addr === "object") {
                address = addr.streetAddress;
                city = addr.addressLocality;
                state = addr.addressRegion;
                country = addr.addressCountry || "BR";
              }
            }

            let latitude: number | undefined;
            let longitude: number | undefined;
            if (node.geo) {
              latitude = Number(node.geo.latitude) || undefined;
              longitude = Number(node.geo.longitude) || undefined;
            }

            let starRating: number | undefined;
            if (node.starRating?.ratingValue) {
              starRating = Number(node.starRating.ratingValue) || undefined;
            }

            const amenities: string[] = [];
            const rawAmenities = node.amenityFeature || [];
            const amenityList = Array.isArray(rawAmenities) ? rawAmenities : [rawAmenities];
            for (const am of amenityList) {
              if (typeof am === "string") amenities.push(cleanHtmlText(am));
              else if (am && typeof am === "object" && am.name) amenities.push(cleanHtmlText(am.name));
            }

            const coverImageUrl = resolveImageUrl(
              Array.isArray(node.image) ? node.image[0] : typeof node.image === "object" ? node.image?.url : node.image,
              sourceUrl
            );

            const mdLines: string[] = [
              `# ${name}`,
              "",
              starRating ? `**Classificação:** ${starRating} estrelas` : "",
              city ? `**Localização:** ${city}${state ? ` - ${state}` : ""}` : "",
              address ? `**Endereço:** ${address}` : "",
              node.telephone ? `**Telefone:** ${node.telephone}` : "",
              node.priceRange ? `**Faixa de Preço:** ${node.priceRange}` : "",
              node.checkinTime ? `**Check-in:** ${node.checkinTime}` : "",
              node.checkoutTime ? `**Check-out:** ${node.checkoutTime}` : "",
              node.petsAllowed !== undefined ? `**Aceita Pets:** ${node.petsAllowed ? "Sim" : "Não"}` : "",
              "",
              "### Sobre a Hospedagem",
              description,
              "",
              amenities.length > 0 ? "### Comodidades & Lazer\n" + amenities.map((a) => `- ${a}`).join("\n") : "",
              sourceUrl ? `\n[Ver Detalhes Oficiais](${sourceUrl})` : "",
            ].filter(Boolean);

            return {
              name,
              description,
              lodgingType,
              address,
              city,
              state,
              country,
              latitude,
              longitude,
              starRating,
              amenities,
              priceRange: node.priceRange,
              checkinTime: node.checkinTime,
              checkoutTime: node.checkoutTime,
              petsAllowed: node.petsAllowed,
              contactPhone: node.telephone,
              websiteUrl: node.url || sourceUrl,
              coverImageUrl,
              formattedMarkdown: mdLines.join("\n"),
              sourceUrl,
            };
          }
        }
      }
    } catch {
      // Ignora erro de parsing
    }
  }

  return null;
}

/**
 * Vinculador mecânico e determinístico de ingredientes de receitas à ficha técnica de insumos (BOM) do estoque
 * Regra: ZERO TOKENS DE IA. Combina tokenização fonética/lematizada e cálculo de similaridade vetorial leve.
 */
export function linkRecipeIngredientsToInventory(
  rawIngredients: string[],
  catalogProducts: Array<{ id: string; name: string; sku?: string }>
): RecipeIngredientMatch[] {
  const STOPWORDS = new Set([
    "de", "da", "do", "das", "dos", "em", "para", "com", "sem", "ou", "e",
    "xicara", "xicaras", "colher", "colheres", "sopa", "cha", "sobremesa",
    "kg", "g", "ml", "l", "litro", "litros", "grama", "gramas", "quilo",
    "fatia", "fatias", "pitada", "pitadas", "dente", "dentes", "unidade",
    "unidades", "lata", "latas", "caixa", "caixas", "pacote", "pacotes",
    "fresco", "fresca", "picado", "picada", "ralado", "ralada"
  ]);

  function normalizeTokens(str: string): string[] {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2 && !STOPWORDS.has(t));
  }

  function extractQuantityAndUnit(raw: string): { qty: number; unit: string } {
    const qtyMatch = raw.match(/^([\d.,]+|\d+\/\d+)/);
    let qty = 1;
    if (qtyMatch) {
      const qStr = qtyMatch[1];
      if (qStr.includes("/")) {
        const [num, den] = qStr.split("/").map(Number);
        if (den) qty = num / den;
      } else {
        qty = parseFloat(qStr.replace(",", ".")) || 1;
      }
    }

    let unit = "un";
    const lower = raw.toLowerCase();
    if (lower.includes("kg") || lower.includes("quilo")) unit = "kg";
    else if (lower.includes("g") || lower.includes("grama")) unit = "g";
    else if (lower.includes("ml")) unit = "ml";
    else if (lower.includes("litro") || lower.includes("l ")) unit = "l";
    else if (lower.includes("xícara") || lower.includes("xicara")) unit = "xic";
    else if (lower.includes("colher")) unit = "colh";

    return { qty, unit };
  }

  return rawIngredients.map((raw) => {
    const { qty, unit } = extractQuantityAndUnit(raw);
    const tokens = normalizeTokens(raw);
    const cleanIngredient = tokens.join(" ");

    let bestMatch: { id: string; name: string } | null = null;
    let highestScore = 0;

    for (const prod of catalogProducts) {
      const prodTokens = normalizeTokens(prod.name);
      if (prodTokens.length === 0) continue;

      let matchCount = 0;
      for (const t of tokens) {
        if (prodTokens.includes(t)) matchCount++;
      }

      const score = matchCount / Math.max(tokens.length, prodTokens.length);
      if (score > highestScore && score >= 0.3) {
        highestScore = score;
        bestMatch = prod;
      }
    }

    return {
      rawIngredient: raw,
      cleanIngredient,
      matchedProductId: bestMatch?.id,
      matchedProductName: bestMatch?.name,
      confidenceScore: Math.round(highestScore * 100),
      suggestedQty: qty,
      suggestedUnit: unit,
    };
  });
}

