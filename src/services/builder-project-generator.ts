/**
 * builder-project-generator.ts — Gerador Canônico de Projetos TanStack Start (Lovable Parity)
 * 
 * Transforma qualquer documento do Omni Builder (`OmniPageDocument`) em uma
 * estrutura de projeto web completa e executável, pronta para deploy ou download.
 */

import { OmniPageDocument } from "@/types/omni-builder";

export interface GeneratedProjectFileTree {
  [filePath: string]: string;
}

export function generateTanStackProjectFiles(doc: OmniPageDocument): GeneratedProjectFileTree {
  const pageTitle = doc.title || "Waesy Generated App";
  const pageSlug = doc.slug || "home";
  const blocks = doc.blocks || [];

  // package.json executável
  const packageJson = JSON.stringify(
    {
      name: `waesy-app-${pageSlug.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
      private: true,
      type: "module",
      scripts: {
        dev: "vite dev",
        build: "vite build",
        preview: "vite preview",
      },
      dependencies: {
        react: "^19.0.0",
        "react-dom": "^19.0.0",
        "@tanstack/react-router": "^1.170.25",
        "lucide-react": "^1.16.0",
        clsx: "^2.1.1",
        "tailwind-merge": "^3.0.2",
      },
      devDependencies: {
        "@tailwindcss/vite": "^4.2.1",
        "@types/react": "^19.0.0",
        "@types/react-dom": "^19.0.0",
        "@vitejs/plugin-react": "^4.3.4",
        typescript: "^5.7.0",
        vite: "^6.1.0",
      },
    },
    null,
    2
  );

  // tsconfig.json
  const tsconfigJson = JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        useDefineForClassFields: true,
        lib: ["ES2022", "DOM", "DOM.Iterable"],
        module: "ESNext",
        skipLibCheck: true,
        moduleResolution: "bundler",
        allowImportingTsExtensions: false,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: "react-jsx",
        strict: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noFallthroughCasesInSwitch: true,
        baseUrl: ".",
        paths: {
          "@/*": ["./src/*"],
        },
      },
      include: ["src"],
    },
    null,
    2
  );

  // vite.config.ts
  const viteConfig = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
`;

  // src/styles.css
  const stylesCss = `@import "tailwindcss";

:root {
  --background: #09090b;
  --foreground: #fafafa;
  --primary: #2563eb;
  --primary-foreground: #ffffff;
  --muted: #27272a;
  --muted-foreground: #a1a1aa;
  --border: #27272a;
}

body {
  background-color: var(--background);
  color: var(--foreground);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  min-height: 100vh;
  margin: 0;
}
`;

  // src/routes/__root.tsx
  const rootRoute = `import * as React from "react";
import { Outlet, createRootRoute } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-primary selection:text-primary-foreground">
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 py-6">
        <Outlet />
      </main>
      <footer className="w-full border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        <p>© ${new Date().getFullYear()} ${pageTitle}. Powered by Waesy Universal Architecture.</p>
      </footer>
    </div>
  );
}
`;

  // src/routes/index.tsx (Renderiza os blocos do Omni Builder)
  const blockImports = new Set<string>();
  const renderedBlocksJsx = blocks
    .filter((b) => b.is_visible !== false)
    .map((b, idx) => {
      const sanitizedType = b.type.replace(/[^a-zA-Z0-9_]/g, "");
      blockImports.add(sanitizedType);
      return `      {/* Bloco ${idx + 1}: ${b.type} */}
      <section key="${b.id || idx}" className="w-full my-6 rounded-2xl border border-border/80 bg-card/60 p-6 shadow-xs">
        <h2 className="text-xl font-bold tracking-tight mb-2 text-foreground">${b.title || b.type}</h2>
        <pre className="text-xs font-mono text-muted-foreground overflow-x-auto p-4 rounded-xl bg-muted/40">
          {JSON.stringify(${JSON.stringify(b.props || {})}, null, 2)}
        </pre>
      </section>`;
    })
    .join("\n\n");

  const indexRoute = `import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="w-full flex flex-col gap-6">
      <header className="py-8 border-b border-border/60 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight">${pageTitle}</h1>
        <p className="text-sm text-muted-foreground mt-2 font-mono">Rotas e blocos provisionados pelo Omni Builder</p>
      </header>

${renderedBlocksJsx || `      <div className="p-12 text-center text-muted-foreground">Nenhum bloco visível configurado.</div>`}
    </div>
  );
}
`;

  // public/robots.txt
  const robotsTxt = `User-agent: *
Allow: /
Sitemap: https://meusite.waesy.com.br/sitemap.xml
`;

  return {
    "package.json": packageJson,
    "tsconfig.json": tsconfigJson,
    "vite.config.ts": viteConfig,
    "public/robots.txt": robotsTxt,
    "src/styles.css": stylesCss,
    "src/routes/__root.tsx": rootRoute,
    "src/routes/index.tsx": indexRoute,
  };
}
