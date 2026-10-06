import type { OmniBlockInstance, OmniPageDocument } from "@/types/omni-builder";
import {
  applyTemplateToPage,
  getTemplateById,
  NICHE_TEMPLATE_MATRIX,
  type NicheTemplateDefinition,
} from "./omni-templates";

export const STUDIO_CATALOG_VERSION = "1.0.0";

export type StudioTemplateGoal = "lead_capture" | "catalog" | "booking" | "authority" | "content";

export interface StudioTemplateDefinition {
  id: string;
  sourceTemplateId: string;
  version: string;
  name: string;
  niche: string;
  goal: StudioTemplateGoal;
  description: string;
  badge: string;
  tags: string[];
  copyFramework: "problem-solution" | "authority-proof" | "offer-urgency" | "editorial" | "catalog-discovery";
  assetSlots: string[];
  blocks: Omit<OmniBlockInstance, "id">[];
  status: "ready";
}

const CATALOG_METADATA: Record<string, Pick<StudioTemplateDefinition, "goal" | "tags" | "copyFramework" | "assetSlots">> = {
  template_legal_jus: {
    goal: "lead_capture",
    tags: ["autoridade", "consultivo", "sigilo", "juridico"],
    copyFramework: "authority-proof",
    assetSlots: ["hero_portrait", "team_portraits"],
  },
  template_gastronomy: {
    goal: "booking",
    tags: ["restaurante", "delivery", "reserva", "cardapio"],
    copyFramework: "offer-urgency",
    assetSlots: ["hero_food", "menu_gallery", "logo"],
  },
  template_tourism: {
    goal: "lead_capture",
    tags: ["viagens", "destinos", "cotacao", "roteiros"],
    copyFramework: "catalog-discovery",
    assetSlots: ["destination_gallery", "agency_logo"],
  },
  template_creators: {
    goal: "lead_capture",
    tags: ["curso", "mentoria", "infoproduto", "comunidade"],
    copyFramework: "problem-solution",
    assetSlots: ["creator_portrait", "course_cover"],
  },
  template_real_estate: {
    goal: "booking",
    tags: ["imoveis", "alto-padrao", "visita", "locacao"],
    copyFramework: "authority-proof",
    assetSlots: ["property_gallery", "agent_portrait"],
  },
  template_services_wellness: {
    goal: "booking",
    tags: ["clinica", "estetica", "bem-estar", "agendamento"],
    copyFramework: "authority-proof",
    assetSlots: ["clinic_hero", "team_portraits"],
  },
  template_creator_biolink: {
    goal: "content",
    tags: ["link-na-bio", "creator", "newsletter", "social"],
    copyFramework: "editorial",
    assetSlots: ["creator_portrait", "project_gallery"],
  },
  template_clinic_premium: {
    goal: "booking",
    tags: ["medicina", "especialistas", "concierge", "whatsapp"],
    copyFramework: "authority-proof",
    assetSlots: ["clinic_hero", "doctor_portraits"],
  },
  template_dark_kitchen: {
    goal: "catalog",
    tags: ["delivery", "dark-kitchen", "cardapio", "conversao"],
    copyFramework: "offer-urgency",
    assetSlots: ["food_hero", "product_gallery", "logo"],
  },
};

function toStudioTemplate(source: NicheTemplateDefinition): StudioTemplateDefinition {
  const metadata = CATALOG_METADATA[source.id];
  if (!metadata) {
    throw new Error(`Template ${source.id} não possui metadados Studio.`);
  }

  return {
    ...source,
    sourceTemplateId: source.id,
    version: STUDIO_CATALOG_VERSION,
    ...metadata,
    blocks: source.blocks,
    status: "ready",
  };
}

/** A árvore de blocos continua existindo em omni-templates; este índice adiciona taxonomia e governança. */
export const STUDIO_TEMPLATE_CATALOG: StudioTemplateDefinition[] = NICHE_TEMPLATE_MATRIX.map(toStudioTemplate);

export function getStudioTemplate(id: string): StudioTemplateDefinition | undefined {
  return STUDIO_TEMPLATE_CATALOG.find((template) => template.id === id);
}

export function listStudioTemplates(filters?: { niche?: string; goal?: StudioTemplateGoal; tag?: string }): StudioTemplateDefinition[] {
  return STUDIO_TEMPLATE_CATALOG.filter((template) => {
    if (filters?.niche && template.niche !== filters.niche) return false;
    if (filters?.goal && template.goal !== filters.goal) return false;
    if (filters?.tag && !template.tags.includes(filters.tag)) return false;
    return true;
  });
}

/**
 * Instancia um template a partir da fonte única, registra sua origem e mantém a
 * mutação local separada da definição reutilizável.
 */
export function materializeStudioTemplate(page: OmniPageDocument, templateId: string): OmniPageDocument {
  const template = getStudioTemplate(templateId);
  if (!template || !getTemplateById(template.sourceTemplateId)) return page;

  const materialized = applyTemplateToPage(page, template.sourceTemplateId);
  return {
    ...materialized,
    source_template_id: template.sourceTemplateId,
    source_template_version: template.version,
  };
}
