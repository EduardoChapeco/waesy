/**
 * omni-apps.ts — Tipos e Schemas Canônicos para o Ecossistema Omni Apps
 * 
 * Paridade com Wix App Market & Shopify OS 2.0:
 * Ativar um App (Supermercado, Delivery, Eventos, Agendamentos, E-Commerce, BioLink, Notícias)
 * provisiona declarativamente toda a árvore de páginas, subfluxos transacionais,
 * blocos especializados e conexões de dados no banco (experience_documents).
 */

import { z } from "zod";

export type OmniAppId =
  | "supermarket"
  | "delivery"
  | "events"
  | "appointments"
  | "ecommerce"
  | "biolink"
  | "news";

export interface OmniAppPageBlueprint {
  slug: string;
  title: string;
  pageType: "showcase" | "list" | "detail" | "cart" | "dashboard" | "general";
  isHome?: boolean;
  requiredRoles?: ("guest" | "member" | "admin")[];
  initialBlocks: {
    type: string;
    props: Record<string, any>;
  }[];
  seo: {
    title: string;
    description: string;
    allowIndexing: boolean;
  };
}

export interface OmniAppBlueprint {
  id: OmniAppId;
  name: string;
  tagline: string;
  description: string;
  iconName: string;
  category: "commerce" | "food" | "events" | "services" | "social" | "media";
  version: string;
  defaultChannel: "marketplace" | "storefront_pwa";
  pages: OmniAppPageBlueprint[];
  navItems: {
    id: string;
    label: string;
    icon: string;
    targetSlug: string;
    isPrimaryAction?: boolean;
  }[];
  dataRequirements: {
    entity: "products" | "events" | "services" | "articles" | "biolinks";
    multiplePricingTiers?: boolean;
    deliverySlots?: boolean;
    tableManagement?: boolean;
    ticketTiers?: boolean;
    bookingCalendar?: boolean;
  };
}

export interface InstalledOmniAppDTO {
  appId: OmniAppId;
  storeId: string;
  installedAt: string;
  isActive: boolean;
  customSettings?: Record<string, any>;
  provisionedPageSlugs: string[];
}

export const OmniAppIdSchema = z.enum([
  "supermarket",
  "delivery",
  "events",
  "appointments",
  "ecommerce",
  "biolink",
  "news",
]);
