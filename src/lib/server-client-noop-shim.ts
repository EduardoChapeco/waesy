/**
 * server-client-noop-shim.ts
 *
 * Shim SSR leve para widgets interativos exclusivos de navegador (croppers,
 * confetes, tabelas completas de DDD/E.164 e editor visual drag-and-drop),
 * preservando hidratação limpa e mantendo o Cloudflare Worker abaixo de 25 MiB.
 */

const NoopComponent = () => null;

export default NoopComponent;
export const OmniEditor = NoopComponent;
export const WaesyBuilder = NoopComponent;
export const TravelPromoFlyerModal = NoopComponent;
export const ManusComputerDrawer = NoopComponent;
export const ManusTaskTelemetrySheet = NoopComponent;
export const UniversalDocumentStudio = NoopComponent;
export const ContractEditorSheet = NoopComponent;
export const VideoStudioEditor = NoopComponent;
export const CarouselWizardModal = NoopComponent;
export const computeCopilotSessionTelemetry = () => ({
  totalDurationMs: 0,
  totalTokens: 0,
  durationLabel: "0s",
  modelLabel: "Auto",
  tokensUsedLabel: "0 tokens",
  creditsUsedLabel: "0 WZ",
  createdAtLabel: "-",
  clusterNodeLabel: "Cloudflare Workers",
});
export const CopilotSkillsCenter = NoopComponent;
export const CopilotScheduledTasksView = NoopComponent;
export const CopilotConnectorsCenter = NoopComponent;
export const CopilotAnalyticsDashboard = NoopComponent;
export const CopilotBackgroundTasksDrawer = NoopComponent;
export const CopilotMemorySettingsSheet = NoopComponent;
export const SimLabQuickTestSheet = NoopComponent;
export const UniversalCrmSpreadsheetImporterModal = NoopComponent;
export const CarouselStudioEditor = NoopComponent;
export const ArtifactBuilderEditor = NoopComponent;
export const ArtifactInteractiveMap = NoopComponent;
export const ArtifactWebPreview = NoopComponent;
export const ArtifactCodeSandbox = NoopComponent;
export const ArtifactDashboard = NoopComponent;
export const ArtifactChart = NoopComponent;
export const LeadFlightGridSheet = NoopComponent;
export const OperatorVoucherImportSheet = NoopComponent;
export const NewTravelContractSheet = NoopComponent;
export const NewGroupTourWizard = NoopComponent;
export const ProductCatalogPricingSheet = NoopComponent;
export const DS4Showcase = NoopComponent;
export const DesignSystemHeader = NoopComponent;
export const ActionsFamily = NoopComponent;
export const FormsFamily = NoopComponent;
export const SurfacesFamily = NoopComponent;
export const OverlaysFamily = NoopComponent;
export const NavigationFamily = NoopComponent;
export const MediaShowcaseFamily = NoopComponent;
export const ViewportsFamily = NoopComponent;
export const StateCard = NoopComponent;
export const ContractWorkspaceStudio = NoopComponent;
export const UnifiedProposalWorkspace = NoopComponent;
export const ProposalCanvasRenderer = NoopComponent;
export const ContractMarkdownRenderer = NoopComponent;

export function parsePhoneNumber(value?: string) {
  const raw = typeof value === "string" ? value : "";
  return {
    country: "BR",
    isValid: () => false,
    formatNational: () => raw,
    formatInternational: () => raw,
    format: () => raw,
  };
}

export class AsYouType {
  input(raw: string) {
    return raw;
  }
  getNumber() {
    return undefined;
  }
}
