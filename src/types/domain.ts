/**
 * Domain-level shared types Commerce (Plano 5 — S13)
 * These are lightweight contracts used across the route registry, navigation
 * and UI states. Full domain model lives in docs/DOMAIN_MODEL.md.
 */

export type { Role } from "@/registries/permission-registry";
export type { IntegrationStatus } from "@/registries/integration-registry";

/** Delivery phases per docs/ROADMAP.md. */
export type Phase = 0 | 1 | 2 | 3 | 4 | 5;

/** Audience an area belongs to. */
export type Audience = "public" | "customer" | "admin";

/** ViewMode canônico do storefront (busca, vitrines, departamentos) */
export type ViewModeType = "grid" | "list" | "feed";

/** ViewMode canônico de módulos de workspace operacional */
export type WorkspaceViewModeType = "list" | "table" | "grid" | "kanban" | "calendar" | string;

/** Dados estruturados canônicos de endereço e CEP */
export interface AddressData {
  text?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
  ibge?: string;
  lat?: number;
  lng?: number;
}
