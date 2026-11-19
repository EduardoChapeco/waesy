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
  { subpath: "components/tourism/proposal/unified-proposal-workspace", barrel: "/components/tourism/proposal/index.ts", rel: "./unified-proposal-workspace" },
  { subpath: "components/tourism/proposal/proposal-canvas-renderer", barrel: "/components/tourism/proposal/index.ts", rel: "./proposal-canvas-renderer" },
  { subpath: "components/office/contract-markdown-renderer", barrel: "/components/office/index.ts", rel: "./contract-markdown-renderer" },
  { subpath: "components/atendimento/AtendimentoChatWorkspace" },
  { subpath: "components/chat/customer-360-sidebar", barrel: "/components/chat/index.ts", rel: "./customer-360-sidebar" },
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
