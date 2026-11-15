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
  { subpath: "components/simlab/SimLabQuickTestSheet" },
  { subpath: "components/crm/UniversalCrmSpreadsheetImporterModal" },
  { subpath: "components/studio/carousel-studio-editor", barrel: "/components/studio/index.ts", rel: "./carousel-studio-editor" },
  { subpath: "components/chat/artifacts/ArtifactBuilderEditor", barrel: "/components/chat/artifacts/index.ts", rel: "./ArtifactBuilderEditor" },
  { subpath: "components/chat/artifacts/ArtifactInteractiveMap", barrel: "/components/chat/artifacts/index.ts", rel: "./ArtifactInteractiveMap" },
  { subpath: "components/commercial/lead-flight-grid-sheet" },
  { subpath: "components/tourism/vouchers/operator-voucher-import-sheet" },
  { subpath: "components/tourism/contract/new-travel-contract-sheet" },
  { subpath: "components/tourism/group-tours/NewGroupTourWizard" },
  { subpath: "components/commerce/supermarket/ProductCatalogPricingSheet", barrel: "/components/commerce/supermarket/index.ts", rel: "./ProductCatalogPricingSheet" },
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
