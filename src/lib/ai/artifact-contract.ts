import type { ChatArtifactType } from "@/types/chat";

export const CANONICAL_ARTIFACT_TYPES = [
  "document",
  "spreadsheet",
  "presentation",
  "landing_page",
  "proposal",
  "image",
  "video",
  "omnibuilder",
  "code",
  "itinerary",
  "travel_itinerary",
  "chart",
  "interactive_table",
  "biolink_cluster",
  "builder_bridge",
  "travel_dossier",
  "document_preview",
  "website",
  "social_post",
  "creative_post",
  "dashboard",
  "map_view",
  "carousel",
  "motion_video",
  "simlab_report",
  "business_plan",
  "web_app",
  "schedule_plan",
] as const;

const ARTIFACT_TYPE_SET = new Set<string>(CANONICAL_ARTIFACT_TYPES);

const ARTIFACT_TYPE_ALIASES: Record<string, ChatArtifactType> = {
  travel: "travel_itinerary",
  viagem: "travel_itinerary",
  roteiro: "travel_itinerary",
  table: "interactive_table",
  tabela: "interactive_table",
  biolink: "biolink_cluster",
  presentation_deck: "presentation",
  slides: "presentation",
  deck: "presentation",
  pdf: "document",
  contract: "document",
  contrato: "document",
  site: "website",
  html: "web_app",
  app: "web_app",
  webapp: "web_app",
  post: "creative_post",
  canva: "creative_post",
  carrossel: "carousel",
  motion: "motion_video",
  simlab: "simlab_report",
  simulacao: "simlab_report",
  business: "business_plan",
  plano_negocios: "business_plan",
  schedule: "schedule_plan",
  agenda: "schedule_plan",
  planilha: "spreadsheet",
  sheet: "spreadsheet",
  mapa: "map_view",
  map: "map_view",
};

export interface ArtifactCapabilityDescriptor {
  type: ChatArtifactType;
  labelPt: string;
  canPreviewHtml: boolean;
  canPreviewSandbox: boolean;
  canExportPdf: boolean;
  canExportPng: boolean;
  canOpenOmniEditor: boolean;
  canOpenDocumentStudio: boolean;
  canOpenCarouselStudio: boolean;
  canEditSpreadsheet: boolean;
}

const DEFAULT_CAPABILITY: Omit<ArtifactCapabilityDescriptor, "type" | "labelPt"> = {
  canPreviewHtml: false,
  canPreviewSandbox: false,
  canExportPdf: false,
  canExportPng: false,
  canOpenOmniEditor: false,
  canOpenDocumentStudio: false,
  canOpenCarouselStudio: false,
  canEditSpreadsheet: false,
};

const ARTIFACT_CAPABILITY_TABLE: Record<ChatArtifactType, ArtifactCapabilityDescriptor> = {
  document: { ...DEFAULT_CAPABILITY, type: "document", labelPt: "Documento", canPreviewHtml: true, canExportPdf: true, canOpenDocumentStudio: true },
  document_preview: { ...DEFAULT_CAPABILITY, type: "document_preview", labelPt: "Documento", canPreviewHtml: true, canExportPdf: true, canOpenDocumentStudio: true },
  proposal: { ...DEFAULT_CAPABILITY, type: "proposal", labelPt: "Proposta Comercial", canPreviewHtml: true, canExportPdf: true, canOpenDocumentStudio: true },
  business_plan: { ...DEFAULT_CAPABILITY, type: "business_plan", labelPt: "Plano de Negocios", canPreviewHtml: true, canExportPdf: true, canOpenDocumentStudio: true },
  presentation: { ...DEFAULT_CAPABILITY, type: "presentation", labelPt: "Apresentacao", canPreviewHtml: true, canExportPdf: true, canOpenDocumentStudio: true, canOpenOmniEditor: true },
  spreadsheet: { ...DEFAULT_CAPABILITY, type: "spreadsheet", labelPt: "Planilha", canExportPdf: true, canEditSpreadsheet: true },
  interactive_table: { ...DEFAULT_CAPABILITY, type: "interactive_table", labelPt: "Tabela", canExportPdf: true, canEditSpreadsheet: true },
  landing_page: { ...DEFAULT_CAPABILITY, type: "landing_page", labelPt: "Landing Page", canPreviewHtml: true, canPreviewSandbox: true, canOpenOmniEditor: true },
  website: { ...DEFAULT_CAPABILITY, type: "website", labelPt: "Site", canPreviewHtml: true, canPreviewSandbox: true, canOpenOmniEditor: true },
  web_app: { ...DEFAULT_CAPABILITY, type: "web_app", labelPt: "Aplicacao Web", canPreviewHtml: true, canPreviewSandbox: true, canOpenOmniEditor: true },
  omnibuilder: { ...DEFAULT_CAPABILITY, type: "omnibuilder", labelPt: "Projeto Builder", canPreviewHtml: true, canPreviewSandbox: true, canOpenOmniEditor: true },
  builder_bridge: { ...DEFAULT_CAPABILITY, type: "builder_bridge", labelPt: "Builder", canPreviewHtml: true, canPreviewSandbox: true, canOpenOmniEditor: true },
  code: { ...DEFAULT_CAPABILITY, type: "code", labelPt: "Codigo", canPreviewSandbox: true },
  creative_post: { ...DEFAULT_CAPABILITY, type: "creative_post", labelPt: "Arte Canva", canExportPng: true, canExportPdf: true, canOpenCarouselStudio: true },
  social_post: { ...DEFAULT_CAPABILITY, type: "social_post", labelPt: "Post Social", canExportPng: true, canExportPdf: true, canOpenCarouselStudio: true },
  carousel: { ...DEFAULT_CAPABILITY, type: "carousel", labelPt: "Carrossel", canExportPng: true, canExportPdf: true, canOpenCarouselStudio: true },
  motion_video: { ...DEFAULT_CAPABILITY, type: "motion_video", labelPt: "Video Motion", canExportPng: true },
  image: { ...DEFAULT_CAPABILITY, type: "image", labelPt: "Imagem IA", canExportPng: true },
  video: { ...DEFAULT_CAPABILITY, type: "video", labelPt: "Video", canExportPng: false },
  chart: { ...DEFAULT_CAPABILITY, type: "chart", labelPt: "Grafico", canExportPng: true, canExportPdf: true },
  dashboard: { ...DEFAULT_CAPABILITY, type: "dashboard", labelPt: "Dashboard", canExportPdf: true },
  map_view: { ...DEFAULT_CAPABILITY, type: "map_view", labelPt: "Mapa" },
  biolink_cluster: { ...DEFAULT_CAPABILITY, type: "biolink_cluster", labelPt: "Bio Link", canOpenOmniEditor: true },
  itinerary: { ...DEFAULT_CAPABILITY, type: "itinerary", labelPt: "Roteiro", canExportPdf: true, canOpenDocumentStudio: true },
  travel_itinerary: { ...DEFAULT_CAPABILITY, type: "travel_itinerary", labelPt: "Roteiro de Viagem", canExportPdf: true, canOpenDocumentStudio: true },
  travel_dossier: { ...DEFAULT_CAPABILITY, type: "travel_dossier", labelPt: "Dossie de Viagem", canExportPdf: true, canOpenDocumentStudio: true },
  simlab_report: { ...DEFAULT_CAPABILITY, type: "simlab_report", labelPt: "Relatorio SimLab", canExportPdf: true },
  schedule_plan: { ...DEFAULT_CAPABILITY, type: "schedule_plan", labelPt: "Cronograma", canExportPdf: true },
};

export function normalizeArtifactType(
  rawType?: string | null,
  fallback: ChatArtifactType = "document"
): ChatArtifactType {
  if (!rawType || typeof rawType !== "string") return fallback;
  const cleaned = rawType.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (ARTIFACT_TYPE_SET.has(cleaned)) {
    return cleaned as ChatArtifactType;
  }
  if (cleaned in ARTIFACT_TYPE_ALIASES) {
    return ARTIFACT_TYPE_ALIASES[cleaned];
  }
  return fallback;
}

export function isCanonicalArtifactType(value?: string | null): value is ChatArtifactType {
  return Boolean(value && ARTIFACT_TYPE_SET.has(value.trim().toLowerCase()));
}

export function getArtifactCapabilities(rawType?: string | null): ArtifactCapabilityDescriptor {
  const normalized = normalizeArtifactType(rawType);
  return ARTIFACT_CAPABILITY_TABLE[normalized];
}
