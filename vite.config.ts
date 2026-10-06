// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { fileURLToPath } from "node:url";

const clientServerCoreShim = fileURLToPath(
  new URL("./src/lib/client-start-server-core-shim.ts", import.meta.url),
);

const clientOnlyServerCoreGuard = {
  name: "waesy-client-only-server-core-guard",
  enforce: "pre" as const,
  resolveId(source: string, _importer: string | undefined, options?: { ssr?: boolean }) {
    if (source === "@tanstack/start-server-core" && options?.ssr !== true) {
      return clientServerCoreShim;
    }
    return null;
  },
};

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
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
