// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { fileURLToPath } from "node:url";

const serverBrowserOnlyShim = fileURLToPath(
  new URL("./src/lib/server-browser-only-shim.ts", import.meta.url),
);

const serverRechartsShim = fileURLToPath(
  new URL("./src/lib/server-recharts-shim.ts", import.meta.url),
);

const serverClientNoopShim = fileURLToPath(
  new URL("./src/lib/server-client-noop-shim.ts", import.meta.url),
);

const clientServerCoreShim = fileURLToPath(
  new URL("./src/lib/client-start-server-core-shim.ts", import.meta.url),
);

const SSR_CLIENT_ONLY_COMPONENTS = [
  { subpath: "components/builder/OmniEditor", barrel: "/components/builder/index.ts", rel: "./OmniEditor" },
  { subpath: "components/tourism/promotional-flyer/travel-promo-flyer-modal" },
  { subpath: "components/chat/manus-computer-drawer" },
  { subpath: "components/chat/manus-task-telemetry-sheet" },
  { subpath: "components/documents/UniversalDocumentStudio" },
  { subpath: "components/office/contract-editor-sheet" },
  { subpath: "components/studio/video-studio-editor", barrel: "/components/studio/index.ts", rel: "./video-studio-editor" },
  { subpath: "components/studio/carousel-wizard-modal", barrel: "/components/studio/index.ts", rel: "./carousel-wizard-modal" },
  { subpath: "components/chat/copilot-skills-center", barrel: "/components/chat/ai-chat-shell.tsx", rel: "./copilot-skills-center" },
  { subpath: "components/design-system/ds4-showcase" },
  { subpath: "components/design-system/design-system-header" },
  { subpath: "components/design-system/actions-family" },
  { subpath: "components/design-system/forms-family" },
  { subpath: "components/design-system/surfaces-family" },
  { subpath: "components/design-system/overlays-family" },
  { subpath: "components/design-system/navigation-family" },
  { subpath: "components/design-system/media-showcase-family" },
  { subpath: "components/design-system/viewports-family" },
  { subpath: "components/chat/copilot-scheduled-tasks-view", barrel: "/components/chat/ai-chat-shell.tsx", rel: "./copilot-scheduled-tasks-view" },
  { subpath: "components/chat/copilot-connectors-center", barrel: "/components/chat/ai-chat-shell.tsx", rel: "./copilot-connectors-center" },
  { subpath: "components/chat/copilot-analytics-dashboard", barrel: "/components/chat/ai-chat-shell.tsx", rel: "./copilot-analytics-dashboard" },
  { subpath: "components/chat/copilot-background-tasks-drawer", barrel: "/components/chat/ai-chat-shell.tsx", rel: "./copilot-background-tasks-drawer" },
  { subpath: "components/chat/copilot-memory-settings-sheet", barrel: "/components/chat/ai-chat-shell.tsx", rel: "./copilot-memory-settings-sheet" },
  { subpath: "components/simlab/SimLabQuickTestSheet" },
  { subpath: "components/crm/UniversalCrmSpreadsheetImporterModal" },
  { subpath: "components/studio/carousel-studio-editor", barrel: "/components/studio/index.ts", rel: "./carousel-studio-editor" },
  { subpath: "components/chat/artifacts/ArtifactBuilderEditor", barrel: "/components/chat/artifacts/index.ts", rel: "./ArtifactBuilderEditor" },
  { subpath: "components/chat/artifacts/ArtifactInteractiveMap", barrel: "/components/chat/artifacts/index.ts", rel: "./ArtifactInteractiveMap" },
  { subpath: "components/chat/artifacts/ArtifactWebPreview", barrel: "/components/chat/artifacts/index.ts", rel: "./ArtifactWebPreview" },
  { subpath: "components/chat/artifacts/artifact-code-sandbox", barrel: "/components/chat/artifacts/index.ts", rel: "./artifact-code-sandbox" },
  { subpath: "components/chat/artifacts/ArtifactDashboard", barrel: "/components/chat/artifacts/index.ts", rel: "./ArtifactDashboard" },
  { subpath: "components/chat/artifacts/ArtifactChart", barrel: "/components/chat/artifacts/index.ts", rel: "./ArtifactChart" },
  { subpath: "components/commercial/lead-flight-grid-sheet" },
  { subpath: "components/tourism/vouchers/operator-voucher-import-sheet" },
  { subpath: "components/tourism/contract/new-travel-contract-sheet" },
  { subpath: "components/tourism/group-tours/NewGroupTourWizard" },
  { subpath: "components/commerce/supermarket/ProductCatalogPricingSheet", barrel: "/components/commerce/supermarket/index.ts", rel: "./ProductCatalogPricingSheet" },
  { subpath: "components/contracts/contract-workspace-studio", barrel: "/components/contracts/index.ts", rel: "./contract-workspace-studio" },
  { subpath: "components/tourism/unified-proposal-workspace" },
  { subpath: "components/atendimento/AtendimentoChatWorkspace" },
  { subpath: "components/chat/customer-360-sidebar", barrel: "/components/chat/index.ts", rel: "./customer-360-sidebar" },
  { subpath: "components/workspace/workspace-classified-editor-dialog" },
  { subpath: "components/tourism/CommissionAwardReceiptModal" },
  { subpath: "components/tourism/crm/TourismPipeCardDossier" },
  { subpath: "components/admin/builder/BuilderWixStudioPanels" },
  { subpath: "components/commerce/travel/travel-package-form" },
  { subpath: "components/commerce/travel/travel-package-unified-extensions", barrel: "/components/commerce/travel/travel-package-form.tsx", rel: "./travel-package-unified-extensions" },
  { subpath: "components/workspace/workspace-all-tools-dialog", barrel: "/components/workspace/index.ts", rel: "./workspace-all-tools-dialog" },
  { subpath: "components/tourism/studio/proposal-canvas-renderer" },
  { subpath: "components/tourism/studio/hot-offer-publisher-dialog" },
  { subpath: "components/tourism/studio/proposal-share-whatsapp-modal" },
  { subpath: "components/tourism/studio/proposal-web-page-builder" },
  { subpath: "components/tourism/studio/StudioMapWidget" },
  { subpath: "components/tourism/studio/travel-proposal-checkout-modal" },
  { subpath: "components/tourism/studio/StudioSidebar" },
  { subpath: "components/tourism/studio/studio-sidebar-editor" },
  { subpath: "components/tourism/vouchers/VoucherStudio", barrel: "/components/tourism/index.ts", rel: "./vouchers/VoucherStudio" },
  { subpath: "components/tourism/quotes/passhub-live-quoter-panel" },
  { subpath: "components/tourism/studio/studio-frame" },
  { subpath: "components/tourism/studio/StudioTemplatePicker" },
  { subpath: "components/tourism/studio/StudioFormatPicker" },
  { subpath: "components/tourism/studio/StudioToolbar" },
  { subpath: "components/documents/CommercialBudgetPadSheet" },
  { subpath: "components/hr/employee-dossier-modal" },
  { subpath: "components/chat/whatsapp-qr-connect-modal" },
  { subpath: "components/contracts/contract-markdown-renderer" },
  { subpath: "components/chat/ScheduleWhatsAppMessageModal" },
  { subpath: "components/chat/WhatsAppVoiceStudioModal" },
  { subpath: "components/chat/ChatQuickComposerModals" },
  { subpath: "components/chat/whatsapp-team-sectors-drawer" },
  { subpath: "components/commercial/lead-commission-calculator-sheet" },
  { subpath: "components/workspace/kanban/kanban-column-customizer-modal" },
  { subpath: "components/dossier/customer-360-printable-dossier" },
  { subpath: "components/admin/product-editor/product-editor-sticky-bar" },
  // Fase 6 (EARS-RES-03): Shims SSR exclusivos de cliente (editores, studios, modais e paineis autenticados)
  { subpath: "components/mining/mining-dashboard" },
  { subpath: "components/profile/professional-resume-editor", barrel: "/components/profile/index.ts", rel: "./professional-resume-editor" },
  { subpath: "components/kitchen/gastronomy-pantry-hub" },
  { subpath: "components/classifieds/creator/sections/classified-travel-section" },
  { subpath: "components/classifieds/creator/sections/classified-event-section" },
  { subpath: "components/classifieds/creator/sections/classified-grocery-section" },
  { subpath: "components/classifieds/creator/sections/classified-payment-methods-section" },
  { subpath: "components/tourism/InlineSalesSpreadsheetAndGoalsPanel" },
  { subpath: "components/branded-app/branded-app-workspace-editor" },
  { subpath: "components/workspace/orders/kds-order-manager" },
  { subpath: "components/tourism/boarding/PreBoardingPresentationStudio" },
  { subpath: "components/tourism/boarding/CardDetailPanel", barrel: "/components/tourism/index.ts", rel: "./boarding/CardDetailPanel" },
  { subpath: "components/profile/ProfileInPageEditor" },
  { subpath: "components/classifieds/ai-writing-copilot-sheet" },
  { subpath: "components/simlab/simlab-research-panel", barrel: "/components/simlab/index.ts", rel: "./simlab-research-panel" },
  { subpath: "components/admin/catalog/product-editor/product-specs-tab", barrel: "/components/admin/catalog/product-editor/index.ts", rel: "./product-specs-tab" },
  { subpath: "components/workspace/marketplace-hub-panels" },
  { subpath: "components/tourism/booking/SmartTravelBookingModal" },
  { subpath: "components/tourism/proposals/TourismProposalsManager" },
  { subpath: "components/classifieds/classified-analytics-sheet" },
  { subpath: "components/classifieds/detail/classified-booking-dialog", barrel: "/components/classifieds/detail/index.ts", rel: "./classified-booking-dialog" },
  { subpath: "components/classifieds/detail/classified-booking-dialog", barrel: "/components/classifieds/detail/classified-detail-dialogs.tsx", rel: "./classified-booking-dialog" },
  { subpath: "components/classifieds/travel-booking-dossier-modal", barrel: "/components/classifieds/editorial-showcase-view.tsx", rel: "./travel-booking-dossier-modal" },
  { subpath: "components/tourism/trips/trip-post-sale-editors" },
  { subpath: "components/builder/universal-block-inspector", barrel: "/components/builder/OmniEditor.tsx", rel: "./universal-block-inspector" },
  { subpath: "components/studio/studio-canvas", barrel: "/components/studio/index.ts", rel: "./studio-canvas" },
];

const clientOnlyServerCoreGuard = {
  name: "waesy-client-only-server-core-guard",
  enforce: "pre" as const,
  resolveId(source: string, importer: string | undefined, options?: { ssr?: boolean }) {
    if (source === "@tanstack/start-server-core" && options?.ssr !== true) {
      return clientServerCoreShim;
    }
    if (options?.ssr === true) {
      if (["jspdf", "html2canvas", "maplibre-gl", "xlsx"].includes(source)) {
        return serverBrowserOnlyShim;
      }
      if (source === "recharts" || source.startsWith("recharts/")) {
        return serverRechartsShim;
      }
      if (["react-easy-crop", "canvas-confetti", "libphonenumber-js"].includes(source)) {
        return serverClientNoopShim;
      }
      const normalizedSource = source.replace(/\\/g, "/");
      const normalizedImporter = importer?.replace(/\\/g, "/");
      const matchesClientOnlyComponent = SSR_CLIENT_ONLY_COMPONENTS.some((entry) =>
        normalizedSource === `@/${entry.subpath}` ||
        normalizedSource.endsWith(`/${entry.subpath}`) ||
        normalizedSource.endsWith(`/${entry.subpath}.tsx`) ||
        (entry.rel && entry.barrel && normalizedSource === entry.rel && normalizedImporter?.endsWith(entry.barrel)),
      );
      if (matchesClientOnlyComponent) {
        return serverClientNoopShim;
      }
    }
    return null;
  },
};

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
    router: {
      routeFileIgnorePattern: "(^|[\\\\/])__tests__([\\\\/]|$)|\\.test\\.(tsx?|jsx?)$",
    },
  },
  nitro: {
    preset: "cloudflare-pages",
  },
  vite: {
    plugins: [clientOnlyServerCoreGuard],
    build: {
      rollupOptions: {
        external: ["vinxi/routes"],
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              if (id.includes("maplibre-gl")) return "vendor-maps";
              if (id.includes("jspdf") || id.includes("html2canvas")) return "vendor-pdf";
              if (id.includes("recharts")) return "vendor-charts";
              if (id.includes("@radix-ui")) return "vendor-radix";
              if (id.includes("@phosphor-icons") || id.includes("lucide-react")) return "vendor-icons";
            }
          },
        },
      },
    },
  },
});
