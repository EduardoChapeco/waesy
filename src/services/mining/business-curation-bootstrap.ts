/**
 * business-curation-bootstrap.ts — Motor de Curadoria Ativa Bootstrap com IA
 * 
 * Pipeline de Curadoria e Enriquecimento Profundo de Empresas:
 * 1. Descoberta Web & Scraping Multicanal (Firecrawl / Steel.dev / Native)
 * 2. Extração de Identidade Visual (Logo/Avatar HD, Banner de Cabeçalho, Galeria de Fotos)
 * 3. Mapeamento de Redes Sociais e Biolinks (Instagram, WhatsApp, Facebook, Linktree)
 * 4. Normalização de Horários de Funcionamento (OSM opening_hours -> Estruturado semanal)
 * 5. Validação e Enriquecimento Fiscal de CNPJ (BrasilAPI, Receita Federal, CNAE, QSA)
 * 6. Síntese Editorial Concisa Anti-AI-Smell (Geração de Descrições Institucionais)
 * 7. Auto-População de Biolink Cards no CMS do Waesy
 */

import { getServerClient } from "@/lib/supabase";
import { scrapeUrl } from "@/lib/mining/firecrawl-client";
import { enrichCnpj } from "@/lib/mining/cnpj-enrichment.engine";
import { extractDomain } from "@/lib/mining/scraper-utils";
import { executeUnifiedAiCall } from "@/services/api-orchestrator.functions";

export interface SocialLinks {
  instagram?: string;
  whatsapp?: string;
  facebook?: string;
  website?: string;
  biolink?: string;
}

export interface BiolinkCard {
  label: string;
  url: string;
  icon: "whatsapp" | "instagram" | "globe" | "map" | "phone";
  isPrimary?: boolean;
}

export interface CurationResult {
  id: string;
  businessName: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  photos: string[];
  workingHours: Record<string, string> | null;
  isOpenNow: boolean;
  cnpj: string | null;
  cnae: string | null;
  socialLinks: SocialLinks;
  biolinkCards: BiolinkCard[];
  dataQualityScore: number;
  description: string;
}

/**
 * Validação rigorosa de CNPJ com cálculo de Módulo 11 da Receita Federal
 */
export function isValidCnpjMod11(cnpj: string): boolean {
  const clean = cnpj.replace(/\D/g, "");
  if (clean.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(clean)) return false;

  let size = clean.length - 2;
  let numbers = clean.substring(0, size);
  const digits = clean.substring(size);
  let sum = 0;
  let pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += Number(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== Number(digits.charAt(0))) return false;

  size = size + 1;
  numbers = clean.substring(0, size);
  sum = 0;
  pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += Number(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return result === Number(digits.charAt(1));
}

/**
 * Normaliza sintaxe OSM de opening_hours (ex: "Mo-Fr 08:00-18:00; Sa 08:00-12:00")
 * para um dicionário semanal legível em português.
 */
export function parseOsmOpeningHours(rawHours?: string | null): Record<string, string> | null {
  if (!rawHours || typeof rawHours !== "string" || rawHours.trim().length === 0) {
    return null;
  }

  const clean = rawHours.trim();
  if (clean === "24/7") {
    return {
      segunda: "Aberto 24 horas",
      terca: "Aberto 24 horas",
      quarta: "Aberto 24 horas",
      quinta: "Aberto 24 horas",
      sexta: "Aberto 24 horas",
      sabado: "Aberto 24 horas",
      domingo: "Aberto 24 horas",
    };
  }

  const result: Record<string, string> = {
    segunda: "Fechado",
    terca: "Fechado",
    quarta: "Fechado",
    quinta: "Fechado",
    sexta: "Fechado",
    sabado: "Fechado",
    domingo: "Fechado",
  };

  const dayMap: Record<string, string[]> = {
    Mo: ["segunda"],
    Tu: ["terca"],
    We: ["quarta"],
    Th: ["quinta"],
    Fr: ["sexta"],
    Sa: ["sabado"],
    Su: ["domingo"],
  };

  const clauses = clean.split(";").map((c) => c.trim()).filter(Boolean);

  for (const clause of clauses) {
    // Ex: "Mo-Fr 08:00-12:00,13:30-18:00" ou "Sa 08:00-12:00" ou "Mo-Sa 08:00-18:00"
    const match = clause.match(/^([A-Za-z,-]+)\s+(.+)$/);
    if (!match) continue;

    const daysPart = match[1];
    const timePart = match[2].replace(/,/g, ", ");

    if (daysPart.includes("-")) {
      const [startDay, endDay] = daysPart.split("-");
      const order = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
      const startIndex = order.indexOf(startDay);
      const endIndex = order.indexOf(endDay);

      if (startIndex !== -1 && endIndex !== -1 && startIndex <= endIndex) {
        for (let i = startIndex; i <= endIndex; i++) {
          const mapped = dayMap[order[i]];
          if (mapped) {
            for (const d of mapped) {
              result[d] = timePart;
            }
          }
        }
      }
    } else {
      const individualDays = daysPart.split(",");
      for (const id of individualDays) {
        const mapped = dayMap[id.trim()];
        if (mapped) {
          for (const d of mapped) {
            result[d] = timePart;
          }
        }
      }
    }
  }

  return result;
}

/**
 * Determina se o estabelecimento está aberto agora com base nos horários semanais
 * considerando o fuso horário oficial de Brasília (America/Sao_Paulo).
 */
export function computeIsOpenNow(workingHours?: Record<string, string> | null): boolean {
  if (!workingHours) return false;

  const nowSp = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const dayIndex = nowSp.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  const dayKeys = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
  const currentDayKey = dayKeys[dayIndex];

  const todayHours = workingHours[currentDayKey];
  if (!todayHours || todayHours.toLowerCase() === "fechado") {
    return false;
  }

  if (todayHours.toLowerCase().includes("24 horas")) {
    return true;
  }

  const currentMinutes = nowSp.getHours() * 60 + nowSp.getMinutes();

  // Parse time intervals: "08:00 - 12:00, 13:30 - 18:00"
  const intervals = todayHours.split(",").map((s) => s.trim());
  for (const interval of intervals) {
    const parts = interval.split(/[-–às]+/).map((s) => s.trim());
    if (parts.length === 2) {
      const [startStr, endStr] = parts;
      const [startH, startM] = startStr.split(":").map(Number);
      const [endH, endM] = endStr.split(":").map(Number);

      if (!isNaN(startH) && !isNaN(endH)) {
        const startTotal = startH * 60 + (startM || 0);
        const endTotal = endH * 60 + (endM || 0);

        if (currentMinutes >= startTotal && currentMinutes <= endTotal) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Constrói descrição institucional refinada anti-AI-smell para estabelecimentos
 */
export function synthesizeBusinessDescription(data: {
  businessName: string;
  category: string;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  cnpjData?: any;
  specialties?: string[];
  workingHours?: Record<string, string> | null;
}): string {
  const city = data.city || "Chapecó";
  const state = data.state || "SC";
  const name = data.businessName;

  const categoryLabels: Record<string, string> = {
    restaurante: "Restaurante e gastronomia local",
    mercado: "Supermercado e conveniência",
    farmacia: "Farmácia e cuidados com a saúde",
    servicos: "Prestação de serviços e atendimento local",
    imobiliaria: "Imobiliária, locação e intermediação de imóveis",
    leiloes: "Leilões judiciais e extrajudiciais",
    automotivo: "Serviços automotivos e mecânica",
    educacao: "Educação e capacitação",
    saude: "Clínica médica e serviços de saúde",
    geral: "Empresa e comércio local",
  };

  const categoryDesc = categoryLabels[data.category] || "Atendimento comercial";

  let desc = `${name} é um estabelecimento atuante em ${city}/${state}, com foco em ${categoryDesc.toLowerCase()}.`;

  if (data.address) {
    desc += ` Localizado em ${data.address}.`;
  }

  if (data.cnpjData?.cnae_principal?.descricao) {
    desc += ` Atividade principal registrada: ${data.cnpjData.cnae_principal.descricao}.`;
  }

  if (data.workingHours?.segunda && data.workingHours.segunda !== "Fechado") {
    desc += ` Atendimento comercial de segunda a sexta-feira (${data.workingHours.segunda}).`;
  }

  return desc;
}

/**
 * Executa a curadoria ativa e enriquecimento completo de um único estabelecimento
 */
export async function curateDirectoryListingRecord(
  listing: any
): Promise<CurationResult> {
  const supabase = getServerClient();
  const metadata = (listing.metadata || {}) as Record<string, any>;
  const rawOsmTags = (metadata.osm_tags || {}) as Record<string, string>;

  // 1. Resolver URL do website ou rede social
  let targetUrl =
    listing.website_url ||
    metadata.website ||
    metadata.contact_website ||
    rawOsmTags.website ||
    rawOsmTags["contact:website"] ||
    null;

  if (targetUrl && !targetUrl.startsWith("http")) {
    targetUrl = `https://${targetUrl}`;
  }

  let domain = "";
  if (targetUrl) {
    try {
      domain = extractDomain(targetUrl);
    } catch {
      domain = "";
    }
  }

  // 2. Extração de Redes Sociais & Contatos Iniciais
  const socialLinks: SocialLinks = {
    website: targetUrl || undefined,
    instagram:
      metadata.social_links?.instagram ||
      rawOsmTags["contact:instagram"] ||
      rawOsmTags.instagram ||
      undefined,
    whatsapp:
      listing.contact_whatsapp ||
      metadata.social_links?.whatsapp ||
      rawOsmTags["contact:whatsapp"] ||
      undefined,
    facebook:
      metadata.social_links?.facebook ||
      rawOsmTags["contact:facebook"] ||
      rawOsmTags.facebook ||
      undefined,
  };

  // 3. Raspagem do Website (se disponível) para Ativos Visuais e CNPJ
  let discoveredCnpj: string | null = listing.cnpj || null;
  let discoveredAvatarUrl: string | null = listing.avatar_url || null;
  let discoveredBannerUrl: string | null = listing.banner_url || null;
  const discoveredPhotos: string[] = Array.isArray(listing.photos) ? [...listing.photos] : [];

  if (targetUrl) {
    try {
      const scrapeRes = await scrapeUrl(targetUrl, {
        formats: ["html", "markdown"],
        waitFor: 1200,
      });

      if (scrapeRes.success && scrapeRes.html) {
        const html = scrapeRes.html;

        // Extrai OpenGraph Image para Banner
        const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
        if (ogImageMatch && ogImageMatch[1]) {
          discoveredBannerUrl = ogImageMatch[1];
        }

        // Extrai Apple Touch Icon ou Favicon para Avatar
        const iconMatch = html.match(/<link\s+[^>]*rel=["'](?:apple-touch-icon|shortcut icon|icon)["'][^>]*href=["']([^"']+)["']/i);
        if (iconMatch && iconMatch[1]) {
          let iconUrl = iconMatch[1];
          if (!iconUrl.startsWith("http")) {
            try {
              iconUrl = new URL(iconUrl, targetUrl).toString();
            } catch {
              // fallback
            }
          }
          if (!discoveredAvatarUrl) {
            discoveredAvatarUrl = iconUrl;
          }
        }

        // Extração de CNPJ do HTML
        if (!discoveredCnpj) {
          const cnpjMatches = html.matchAll(/\b(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})\b/g);
          for (const match of cnpjMatches) {
            const candidate = match[1].replace(/\D/g, "");
            if (isValidCnpjMod11(candidate)) {
              discoveredCnpj = candidate;
              break;
            }
          }
        }

        // Extração de Instagram e WhatsApp se não existiam
        if (!socialLinks.instagram) {
          const instaMatch = html.match(/href=["'](https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9_.]+)\/?["']/i);
          if (instaMatch && instaMatch[1]) {
            socialLinks.instagram = instaMatch[1];
          }
        }

        if (!socialLinks.whatsapp) {
          const waMatch = html.match(/href=["'](https?:\/\/(?:wa\.me|api\.whatsapp\.com\/send\?phone=)[0-9]+[^"']*)["']/i);
          if (waMatch && waMatch[1]) {
            socialLinks.whatsapp = waMatch[1];
          }
        }

        // Extração de fotos da galeria (filtrando imagens pequenas / ícones)
        const imgMatches = html.matchAll(/<img\s+[^>]*src=["'](https?:\/\/[^"'\s>]+)["'][^>]*>/gi);
        for (const m of imgMatches) {
          const src = m[1];
          if (
            src &&
            !src.includes("icon") &&
            !src.includes("logo") &&
            !src.includes("tracker") &&
            !src.includes("pixel") &&
            !discoveredPhotos.includes(src) &&
            discoveredPhotos.length < 6
          ) {
            discoveredPhotos.push(src);
          }
        }
      }
    } catch (scrapeErr: any) {
      console.warn(`[CurationBootstrap] Aviso ao raspar ${targetUrl}:`, scrapeErr?.message);
    }
  }

  // Fallback para Avatar de Alta Resolução via Favicon Google
  if (!discoveredAvatarUrl && domain) {
    discoveredAvatarUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  }

  // B.8/B.33 Anti-Fake: Se não houver banner legítimo minerado do domínio oficial, mantém null para layout honesto
  if (!discoveredBannerUrl) {
    discoveredBannerUrl = null;
  }

  // 4. Normalização de Horários de Funcionamento (OSM opening_hours)
  const rawOpeningHours =
    listing.working_hours?.raw ||
    rawOsmTags.opening_hours ||
    metadata.opening_hours ||
    null;

  const parsedWorkingHours = parseOsmOpeningHours(rawOpeningHours);
  const isOpenNow = computeIsOpenNow(parsedWorkingHours);

  // 5. Enriquecimento Fiscal de CNPJ via BrasilAPI
  let cnpjFiscalData: any = metadata.cnpj_fiscal_data || null;
  let resolvedCnae: string | null = listing.cnae || null;

  if (discoveredCnpj) {
    try {
      const enriched = await enrichCnpj(discoveredCnpj);
      if (enriched) {
        cnpjFiscalData = enriched;
        resolvedCnae = enriched.cnae_principal?.codigo || resolvedCnae;
      }
    } catch (cnpjErr: any) {
      console.warn(`[CurationBootstrap] Erro ao enriquecer CNPJ ${discoveredCnpj}:`, cnpjErr?.message);
    }
  }

  // 6. Geração de Biolink Cards para Auto-População
  const biolinkCards: BiolinkCard[] = [];

  if (socialLinks.whatsapp) {
    const waUrl = socialLinks.whatsapp.startsWith("http")
      ? socialLinks.whatsapp
      : `https://wa.me/55${socialLinks.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá! Vi o perfil da ${listing.business_name} no Waesy e gostaria de informações.`)}`;

    biolinkCards.push({
      label: "Conversar no WhatsApp",
      url: waUrl,
      icon: "whatsapp",
      isPrimary: true,
    });
  }

  if (socialLinks.instagram) {
    biolinkCards.push({
      label: "Instagram Oficial",
      url: socialLinks.instagram,
      icon: "instagram",
    });
  }

  if (listing.latitude && listing.longitude) {
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${listing.latitude},${listing.longitude}`;
    biolinkCards.push({
      label: "Como Chegar / Rotas",
      url: mapsUrl,
      icon: "map",
    });
  }

  if (socialLinks.website) {
    biolinkCards.push({
      label: "Website Oficial",
      url: socialLinks.website,
      icon: "globe",
    });
  }

  if (listing.contact_phone) {
    biolinkCards.push({
      label: `Ligar: ${listing.contact_phone}`,
      url: `tel:${listing.contact_phone.replace(/\D/g, "")}`,
      icon: "phone",
    });
  }

  // 7. Síntese de Descrição Institucional
  const richDescription = synthesizeBusinessDescription({
    businessName: listing.business_name,
    category: listing.category,
    city: listing.city,
    state: listing.state,
    address: listing.address,
    cnpjData: cnpjFiscalData,
    workingHours: parsedWorkingHours,
  });

  // 8. Cálculo Dinâmico de Qualidade de Dados (0 a 100)
  let score = 30; // base de existência física
  if (discoveredCnpj) score += 20;
  if (discoveredAvatarUrl) score += 15;
  if (discoveredBannerUrl) score += 10;
  if (discoveredPhotos.length > 0) score += 10;
  if (parsedWorkingHours) score += 10;
  if (socialLinks.whatsapp || listing.contact_phone) score += 10;
  if (richDescription.length > 80) score += 5;
  score = Math.min(100, score);

  // 9. Persistência Atômica no Banco de Dados
  const updatedMetadata = {
    ...metadata,
    social_links: socialLinks,
    biolink_cards: biolinkCards,
    cnpj_fiscal_data: cnpjFiscalData,
    is_open_now: isOpenNow,
    curated_at: new Date().toISOString(),
    curated_by: "waesy-curation-bootstrap-v1",
  };

  const payload: Record<string, any> = {
    avatar_url: discoveredAvatarUrl,
    banner_url: discoveredBannerUrl,
    photos: discoveredPhotos,
    working_hours: parsedWorkingHours,
    cnpj: discoveredCnpj,
    cnae: resolvedCnae,
    description: richDescription,
    data_quality_score: score,
    is_verified: discoveredCnpj !== null,
    metadata: updatedMetadata,
    last_validated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (socialLinks.whatsapp) {
    payload.contact_whatsapp = socialLinks.whatsapp.replace(/\D/g, "");
  }
  if (socialLinks.website && !listing.website_url) {
    payload.website_url = socialLinks.website;
  }

  await supabase
    .from("directory_listings")
    .update(payload)
    .eq("id", listing.id);

  return {
    id: listing.id,
    businessName: listing.business_name,
    avatarUrl: discoveredAvatarUrl,
    bannerUrl: discoveredBannerUrl,
    photos: discoveredPhotos,
    workingHours: parsedWorkingHours,
    isOpenNow,
    cnpj: discoveredCnpj,
    cnae: resolvedCnae,
    socialLinks,
    biolinkCards,
    dataQualityScore: score,
    description: richDescription,
  };
}

/**
 * Curadoria em lote de estabelecimentos de directory_listings
 */
export async function batchCurateDirectoryListings(options?: {
  limit?: number;
  minScore?: number;
}): Promise<{
  totalInspected: number;
  curated: number;
  enrichedCnpj: number;
  enrichedAvatars: number;
  enrichedBanners: number;
  enrichedHours: number;
  errors: number;
}> {
  const supabase = getServerClient();
  const limit = options?.limit || 40;

  // Busca estabelecimentos com menor pontuação ou que nunca foram curados
  const { data: listings, error } = await supabase
    .from("directory_listings")
    .select("*")
    .order("data_quality_score", { ascending: true, nullsFirst: true })
    .limit(limit);

  if (error || !listings || listings.length === 0) {
    return {
      totalInspected: 0,
      curated: 0,
      enrichedCnpj: 0,
      enrichedAvatars: 0,
      enrichedBanners: 0,
      enrichedHours: 0,
      errors: 0,
    };
  }

  let curated = 0;
  let enrichedCnpj = 0;
  let enrichedAvatars = 0;
  let enrichedBanners = 0;
  let enrichedHours = 0;
  let errors = 0;

  for (const item of listings) {
    try {
      const res = await curateDirectoryListingRecord(item);
      curated++;
      if (res.cnpj) enrichedCnpj++;
      if (res.avatarUrl) enrichedAvatars++;
      if (res.bannerUrl) enrichedBanners++;
      if (res.workingHours) enrichedHours++;
    } catch (itemErr: any) {
      errors++;
      console.warn(`[BatchCuration] Erro ao curar estabelecimento ${item.id}:`, itemErr?.message);
    }
  }

  return {
    totalInspected: listings.length,
    curated,
    enrichedCnpj,
    enrichedAvatars,
    enrichedBanners,
    enrichedHours,
    errors,
  };
}
