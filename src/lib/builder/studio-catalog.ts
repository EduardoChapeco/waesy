import type { OmniBlockInstance, OmniPageDocument } from "@/types/omni-builder";
import { NICHE_TEMPLATE_MATRIX, type NicheTemplateDefinition } from "./omni-templates";
import { STUDIO_PILOT_TEMPLATES } from "./studio-pilot-templates";
import {
  STUDIO_MANIFEST_SCHEMA_VERSION,
  StudioTemplateManifestSchema,
  type StudioTemplateManifest,
} from "./studio-manifest";

export const STUDIO_CATALOG_VERSION = "1.1.0";
export type StudioTemplateDefinition = StudioTemplateManifest;
export type StudioTemplateGoal = StudioTemplateManifest["goal"];

const CATALOG_METADATA: Record<string, {
  goal: StudioTemplateGoal;
  tags: string[];
  copyFramework: StudioTemplateManifest["copyFramework"];
  assetSlots: string[];
}> = {
  template_legal_jus: {
    goal: "lead_capture",
    tags: ["autoridade", "consultivo", "sigilo", "juridico"],
    copyFramework: "authority-proof",
    assetSlots: ["hero_portrait", "team_portraits"],
  },
  template_gastronomy: {
    goal: "booking",
    tags: ["restaurante", "delivery", "reserva", "cardapio"],
    copyFramework: "catalog-discovery",
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
    copyFramework: "catalog-discovery",
    assetSlots: ["food_hero", "product_gallery", "logo"],
  },
};

function inferFunnelStage(goal: StudioTemplateGoal): StudioTemplateManifest["funnelStage"] {
  if (goal === "content") return "awareness";
  if (goal === "authority") return "consideration";
  if (goal === "catalog") return "consideration";
  return "conversion";
}

function toLegacyAssetSlot(id: string): StudioTemplateManifest["assetSlots"][number] {
  const lower = id.toLowerCase();
  const purpose: StudioTemplateManifest["assetSlots"][number]["purpose"] = /logo/.test(lower)
    ? "logo"
    : /portrait|team|doctor|agent/.test(lower)
      ? "portrait"
      : /property|food|menu|product/.test(lower)
        ? "product"
        : /gallery|destination|project/.test(lower)
          ? "gallery"
          : /cover/.test(lower)
            ? "cover"
            : "hero";

  return {
    id,
    purpose,
    required: false,
    allowedProviders: ["user", "upload"],
    allowUnsplash: false,
    subjectPolicy: "must-match-real-subject",
    searchHints: [],
    altGuidance: "Use um asset autorizado que corresponda ao negócio, produto, equipe ou local real; descreva a imagem com texto alternativo fiel.",
  };
}

function toStudioTemplate(source: NicheTemplateDefinition): StudioTemplateManifest {
  const metadata = CATALOG_METADATA[source.id];
  if (!metadata) throw new Error(`Template ${source.id} não possui metadados Studio.`);

  return StudioTemplateManifestSchema.parse({
    manifestSchemaVersion: STUDIO_MANIFEST_SCHEMA_VERSION,
    id: source.id,
    sourceTemplateId: source.id,
    version: "1.0.0",
    name: source.name,
    niche: source.niche,
    goal: metadata.goal,
    funnelStage: inferFunnelStage(metadata.goal),
    audience: `Público de ${source.niche}; refine com dados fornecidos pelo negócio antes de publicar.`,
    description: source.description,
    badge: source.badge,
    tags: metadata.tags,
    copyFramework: metadata.copyFramework,
    copyPolicy: {
      framework: metadata.copyFramework,
      factualClaims: "user-provided-or-human-reviewed",
      socialProof: "real-consented-only",
      pricing: "user-provided-only",
      urgency: "truthful-only",
      requiredFacts: ["identidade e oferta reais", "preços, condições e contatos confirmados"],
      forbiddenClaims: ["depoimentos, credenciais, números, preços, prazos, garantias ou resultados sem comprovação"],
      tone: ["claro", "específico", "sem exagero"],
    },
    assetSlots: metadata.assetSlots.map(toLegacyAssetSlot),
    blocks: source.blocks,
    status: "review_required",
    isPilot: false,
    provenance: { origin: "legacy-catalog", humanReviewed: false },
  });
}

const LEGACY_STUDIO_TEMPLATES = NICHE_TEMPLATE_MATRIX.map(toStudioTemplate);
export const STUDIO_TEMPLATE_CATALOG: StudioTemplateDefinition[] = [
  ...LEGACY_STUDIO_TEMPLATES,
  ...STUDIO_PILOT_TEMPLATES.map((template) => StudioTemplateManifestSchema.parse(template)),
];

export function getStudioTemplate(id: string): StudioTemplateDefinition | undefined {
  return STUDIO_TEMPLATE_CATALOG.find((template) => template.id === id);
}

export function listStudioTemplates(filters?: {
  niche?: string;
  goal?: StudioTemplateGoal;
  tag?: string;
  pilotsOnly?: boolean;
}): StudioTemplateDefinition[] {
  return STUDIO_TEMPLATE_CATALOG.filter((template) => {
    if (filters?.niche && template.niche !== filters.niche) return false;
    if (filters?.goal && template.goal !== filters.goal) return false;
    if (filters?.tag && !template.tags.includes(filters.tag)) return false;
    if (filters?.pilotsOnly && !template.isPilot) return false;
    return true;
  });
}

function newBlockId(index: number): string {
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `blk_${Date.now()}_${index}_${randomPart}`;
}

/** Materializa apenas uma cópia; o manifesto reutilizável permanece imutável e versionado. */
export function materializeStudioTemplate(page: OmniPageDocument, templateId: string): OmniPageDocument {
  const template = getStudioTemplate(templateId);
  if (!template) return page;

  return materializeStudioManifest(page, template);
}

export function materializeStudioManifest(page: OmniPageDocument, template: StudioTemplateManifest): OmniPageDocument {
  const validatedTemplate = StudioTemplateManifestSchema.parse(template);

  const blocks: OmniBlockInstance[] = validatedTemplate.blocks.map((block, index) => ({
    id: newBlockId(index),
    type: block.type,
    config: structuredClone(block.config) as Record<string, any>,
    ...(block.styling ? { styling: structuredClone(block.styling) } : {}),
    ...(block.sectionAnchorId ? { sectionAnchorId: block.sectionAnchorId } : {}),
    ...(block.isHidden !== undefined ? { isHidden: block.isHidden } : { isHidden: false }),
  }));

  return {
    ...page,
    schemaVersion: page.schemaVersion ?? 1,
    niche: validatedTemplate.niche,
    source_template_id: validatedTemplate.id,
    source_template_version: validatedTemplate.version,
    blocks,
    updated_at: new Date().toISOString(),
  };
}
