import { describe, it, expect } from "vitest";
import { generateTanStackProjectFiles } from "./builder-project-generator";
import { OmniPageDocument } from "@/types/omni-builder";

describe("TanStack Project Generator (Lovable Parity)", () => {
  const sampleDoc: OmniPageDocument = {
    id: "doc_test_123",
    slug: "supermercado",
    title: "Supermercado Modelo",
    document_type: "storefront",
    is_active: true,
    blocks: [
      {
        id: "blk_1",
        type: "supermarket_hero_carousel",
        title: "Carrossel de Banners",
        is_visible: true,
        config: { roundedBottom: true, autoScrollIntervalMs: 4000 },
        props: { roundedBottom: true, autoScrollIntervalMs: 4000 },
        styling: { paddingTop: "none", paddingBottom: "none" },
      },
      {
        id: "blk_2",
        type: "supermarket_category_dock",
        title: "Departamentos de Alimentos",
        is_visible: true,
        config: { layout: "circular" },
        props: { layout: "circular" },
        styling: { paddingTop: "sm", paddingBottom: "sm" },
      },
    ],
    global_styles: {
      max_width_px: 1400,
      primary_color: "var(--primary)",
      theme_mode: "system",
    },
  };

  it("gera a árvore completa de arquivos do projeto TanStack Start", () => {
    const files = generateTanStackProjectFiles(sampleDoc);
    const filePaths = Object.keys(files);

    expect(filePaths).toContain("package.json");
    expect(filePaths).toContain("tsconfig.json");
    expect(filePaths).toContain("vite.config.ts");
    expect(filePaths).toContain("public/robots.txt");
    expect(filePaths).toContain("src/styles.css");
    expect(filePaths).toContain("src/routes/__root.tsx");
    expect(filePaths).toContain("src/routes/index.tsx");
  });

  it("valida que package.json possui dependências corretas de React e TanStack", () => {
    const files = generateTanStackProjectFiles(sampleDoc);
    const pkg = JSON.parse(files["package.json"]);

    expect(pkg.name).toBe("waesy-app-supermercado");
    expect(pkg.dependencies["@tanstack/react-router"]).toBeDefined();
    expect(pkg.dependencies["react"]).toBeDefined();
    expect(pkg.devDependencies["@tailwindcss/vite"]).toBeDefined();
  });

  it("renderiza os blocos no código-fonte de src/routes/index.tsx", () => {
    const files = generateTanStackProjectFiles(sampleDoc);
    const indexJsx = files["src/routes/index.tsx"];

    expect(indexJsx).toContain("Supermercado Modelo");
    expect(indexJsx).toContain("supermarket_hero_carousel");
    expect(indexJsx).toContain("supermarket_category_dock");
  });
});
