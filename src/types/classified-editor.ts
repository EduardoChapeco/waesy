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
