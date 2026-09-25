/**
 * registry.ts — Catálogo Central e Registro Escalável de Templates Sociais
 * Suporta centenas de layouts organizados por nichos de mercado e motor de rotação rápida
 */

import { TravelTemplateEditorial } from "./TravelTemplateEditorial";
import { TravelCurvedEditorial } from "./turismo/TravelCurvedEditorial";
import { TravelPassportBoarding } from "./turismo/TravelPassportBoarding";
import { TravelImmersiveStory } from "./turismo/TravelImmersiveStory";
import { RealEstateTemplateA } from "./RealEstateTemplateA";
import { RetailPromoTemplate } from "./RetailPromoTemplate";
import { GastronomyTemplate } from "./GastronomyTemplate";
import { RealEstateMinimalHero } from "./imoveis/RealEstateMinimalHero";
import { RealEstateEditorialGrid } from "./imoveis/RealEstateEditorialGrid";
import { RealEstateLuxuryDarkGlass } from "./imoveis/RealEstateLuxuryDarkGlass";
import type { SocialTemplateDefinition, SocialNiche } from "./types";

export const SOCIAL_TEMPLATES_REGISTRY: SocialTemplateDefinition[] = [
  // ── 1. Imóveis & Mercado Imobiliário ──
  {
    id: "imoveis_minimal_hero",
    name: "Imóveis 01: Fachada Dominante",
    niche: "imoveis",
    description: "Fotografia full-bleed, gradiente escuro na base, atributos em chips e CTA de alto impacto",
    supportedRatios: ["9:16", "4:5", "1:1"],
    component: RealEstateMinimalHero,
  },
  {
    id: "imoveis_editorial_grid",
    name: "Imóveis 02: Split-Card Editorial",
    niche: "imoveis",
    description: "Moldura branca sofisticada, janela fotográfica no topo e grid matricial 2x2 na base",
    supportedRatios: ["9:16", "4:5", "1:1"],
    component: RealEstateEditorialGrid,
  },
  {
    id: "imoveis_luxury_dark",
    name: "Imóveis 03: Midnight Luxury",
    niche: "imoveis",
    description: "Fundo ultra escuro, moldura squircle iluminada, card em vidro fumê e CTA metálico dourado",
    supportedRatios: ["9:16", "4:5", "1:1"],
    component: RealEstateLuxuryDarkGlass,
  },
  {
    id: "real_estate_premium",
    name: "Imóveis 04: Padrão Comercial",
    niche: "imoveis",
    description: "Layout limpo com especificações de área, quartos, suítes e financiamento",
    supportedRatios: ["9:16", "4:5", "1:1"],
    component: RealEstateTemplateA,
  },

  // ── 2. Viagens & Turismo ──
  {
    id: "turismo_curved_editorial",
    name: "Turismo 01: Curvatura Orgânica & Editorial",
    niche: "turismo",
    description: "Recorte orgânico curvo com 62% de imagem, área clean para inclusões e parcelamento",
    supportedRatios: ["9:16", "4:5", "1:1"],
    component: TravelCurvedEditorial,
  },
  {
    id: "turismo_passport_boarding",
    name: "Turismo 02: Boarding Pass & Passaporte",
    niche: "turismo",
    description: "Design inspirado em cartões de embarque aéreos, chanfros pontilhados e dados de voo",
    supportedRatios: ["9:16", "4:5", "1:1"],
    component: TravelPassportBoarding,
  },
  {
    id: "turismo_immersive_story",
    name: "Turismo 03: Full-Bleed Nature & Glass",
    niche: "turismo",
    description: "Fotografia cinematográfica 100% full-bleed, cápsula solar e card flutuante de vidro fosco",
    supportedRatios: ["9:16", "4:5", "1:1"],
    component: TravelImmersiveStory,
  },
  {
    id: "travel_editorial",
    name: "Turismo 04: Clássico Waesy Experience",
    niche: "turismo",
    description: "Design sofisticado com frosted glass, gradientes suaves e ícones de inclusões",
    supportedRatios: ["9:16", "4:5", "1:1"],
    component: TravelTemplateEditorial,
  },

  // ── 3. Varejo & Supermercado ──
  {
    id: "retail_promo_clean",
    name: "Varejo 01: Oferta & Supermercado",
    niche: "varejo",
    description: "Foco comercial com preço 'de/por', desconto percentual e garantia",
    supportedRatios: ["9:16", "4:5", "1:1"],
    component: RetailPromoTemplate,
  },

  // ── 4. Gastronomia & Delivery ──
  {
    id: "gastronomy_gourmet",
    name: "Gastronomia 01: Cardápio & Delivery",
    niche: "gastronomia",
    description: "Apetite visual com tempo estimado de entrega, combo e selo artesanal",
    supportedRatios: ["9:16", "4:5", "1:1"],
    component: GastronomyTemplate,
  },
];

export function getAllSocialTemplates(): SocialTemplateDefinition[] {
  return SOCIAL_TEMPLATES_REGISTRY;
}

export function getSocialTemplatesByNiche(niche: SocialNiche): SocialTemplateDefinition[] {
  return SOCIAL_TEMPLATES_REGISTRY.filter((t) => t.niche === niche || t.niche === "geral");
}

export function getSocialTemplateById(id: string): SocialTemplateDefinition {
  const found = SOCIAL_TEMPLATES_REGISTRY.find((t) => t.id === id);
  return found || SOCIAL_TEMPLATES_REGISTRY[0];
}

export function getDefaultTemplateForNiche(niche?: string): SocialTemplateDefinition {
  if (!niche) return SOCIAL_TEMPLATES_REGISTRY[0];
  const normalized = niche.toLowerCase();

  if (normalized.includes("imove") || normalized.includes("casa") || normalized.includes("apartamento") || normalized.includes("terreno")) {
    return SOCIAL_TEMPLATES_REGISTRY.find((t) => t.id === "imoveis_minimal_hero") || SOCIAL_TEMPLATES_REGISTRY[0];
  }
  if (normalized.includes("turismo") || normalized.includes("viagem") || normalized.includes("hotel") || normalized.includes("excurs")) {
    return SOCIAL_TEMPLATES_REGISTRY.find((t) => t.id === "turismo_curved_editorial") || SOCIAL_TEMPLATES_REGISTRY[0];
  }
  if (normalized.includes("gastro") || normalized.includes("lanche") || normalized.includes("comida") || normalized.includes("restaurante")) {
    return SOCIAL_TEMPLATES_REGISTRY.find((t) => t.id === "gastronomy_gourmet") || SOCIAL_TEMPLATES_REGISTRY[0];
  }
  if (normalized.includes("mercado") || normalized.includes("varejo") || normalized.includes("oferta") || normalized.includes("bebida")) {
    return SOCIAL_TEMPLATES_REGISTRY.find((t) => t.id === "retail_promo_clean") || SOCIAL_TEMPLATES_REGISTRY[0];
  }

  return SOCIAL_TEMPLATES_REGISTRY[0];
}

/**
 * The Shuffle Engine: Alterna ciclicamente para o próximo template do mesmo nicho
 */
export function getNextTemplateInNiche(currentTemplateId: string, niche?: string): SocialTemplateDefinition {
  const current = getSocialTemplateById(currentTemplateId);
  const targetNiche = (niche || current.niche) as SocialNiche;
  const templatesInNiche = getSocialTemplatesByNiche(targetNiche);

  if (templatesInNiche.length <= 1) {
    // Se não há mais no nicho, circula por todos os templates disponíveis
    const all = getAllSocialTemplates();
    const currIdx = all.findIndex((t) => t.id === currentTemplateId);
    return all[(currIdx + 1) % all.length];
  }

  const idx = templatesInNiche.findIndex((t) => t.id === currentTemplateId);
  const nextIdx = (idx + 1) % templatesInNiche.length;
  return templatesInNiche[nextIdx];
}
