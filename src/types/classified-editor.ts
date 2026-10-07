import type { LucideIcon } from "lucide-react";

export type ClassifiedNicheType =
  | "viagem"
  | "equipamento"
  | "doacao"
  | "hospedagem"
  | "imovel"
  | "desapego"
  | "digital"
  | "veiculo"
  | "servico"
  | "vaga"
  | "assinatura"
  | "gastronomia"
  | "farmacia"
  | "mercado"
  | "negocio";

export interface NicheDefinition {
  id: ClassifiedNicheType;
  canonicalCategory:
    | "sale"
    | "vehicle"
    | "real_estate"
    | "service"
    | "job"
    | "travel"
    | "equipment"
    | "donation"
    | "business"
    | "food";
  title: string;
  subtitle: string;
  description: string;
  icon: LucideIcon;
  badge: string;
  gradient: string;
}

export interface AiPrefillListing {
  category?: string;
  niche?: string;
  subcategory?: string;
  title?: string;
  content?: string;
  description?: string;
  price_cents?: number | null;
  location?: string;
  delivery_type?: string;
  search_tags?: string[];
  seo_meta_tags?: string[];
  attributes?: Record<string, unknown>;
}

export interface ClassifiedRefinementSuggestion {
  title: string;
  description: string;
  suggestedTags: string[];
}

export interface ClassifiedRefinementEvidence {
  version: number;
  source: "unified_ai";
  generatedAt: string;
  baseHash: string;
  before: {
    title: string;
    description: string;
  };
  suggestion: ClassifiedRefinementSuggestion;
  appliedAt?: string;
}

export function computeClassifiedRefinementBaseHash(title: string, description: string): string {
  const input = `${title.trim()}\u0000${description.trim()}`;
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
