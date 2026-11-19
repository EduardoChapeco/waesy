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
export const WorkspaceClassifiedEditorDialog = NoopComponent;
export const CommissionAwardReceiptModal = NoopComponent;
export const TourismPipeCardDossier = NoopComponent;
export const TravelPackageForm = NoopComponent;
export const WorkspaceAllToolsDialog = NoopComponent;
export const WixVisualSitemapModal = NoopComponent;
export const WixMenuManagerDrawer = NoopComponent;
export const WixCmsCollectionManagerModal = NoopComponent;
export const WixBrandedAppAndHoppPanel = NoopComponent;
export const LovableAiSquadSplitPanel = NoopComponent;
export const WixScrollAnimationsAndDockingInspector = NoopComponent;
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
export const ScheduleWhatsAppMessageModal = NoopComponent;
export const WhatsAppVoiceStudioModal = NoopComponent;
export const ChatQuickComposerModals = NoopComponent;
export const InChatStoreCartBanner = NoopComponent;
export const WhatsAppTeamSectorsDrawer = NoopComponent;
export const LeadCommissionCalculatorSheet = NoopComponent;
export const KanbanColumnCustomizerModal = NoopComponent;
export const Customer360PrintableDossier = NoopComponent;
export const ProductEditorStickyBar = NoopComponent;
export const TravelProposalCheckoutModal = NoopComponent;
export const ProposalShareWhatsappModal = NoopComponent;
export const HotOfferPublisherDialog = NoopComponent;
export const StudioSidebarEditor = NoopComponent;
export const ProposalWebPageBuilder = NoopComponent;
export const StudioUnsplashPicker = NoopComponent;
export const StudioMapWidget = NoopComponent;
export const StudioSidebar = NoopComponent;
export const StudioToolbar = NoopComponent;
export const CommercialBudgetPadSheet = NoopComponent;
export const EmployeeDossierModal = NoopComponent;
export const WhatsAppQrConnectModal = NoopComponent;
export const StudioFrame = NoopComponent;
export const StudioTemplatePicker = NoopComponent;
export const StudioFormatPicker = NoopComponent;
export const VoucherStudio = NoopComponent;
export const PassHubLiveQuoterPanel = NoopComponent;
export const CANVAS_DIMENSIONS: Record<string, { width: string; minHeight: string; label: string; iconEmoji: string }> = {
  "a4-portrait": { width: "794px", minHeight: "1123px", label: "A4 Retrato (PDF)", iconEmoji: "A4" },
  "a4-landscape": { width: "1123px", minHeight: "794px", label: "A4 Paisagem (Lâmina)", iconEmoji: "A4L" },
  "story-916": { width: "1080px", minHeight: "1920px", label: "Story 9:16 (WhatsApp/Insta)", iconEmoji: "9:16" },
  "presentation-169": { width: "1920px", minHeight: "1080px", label: "Apresentação 16:9 (Slide)", iconEmoji: "16:9" },
  "letter-portrait": { width: "816px", minHeight: "1056px", label: "Carta (US Letter)", iconEmoji: "US" },
};

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
