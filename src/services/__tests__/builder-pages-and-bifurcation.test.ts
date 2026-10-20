import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { ExperiencePageSchema, ExperienceNodeSchema } from "@/lib/builder/builder-types";

describe("Microfases 2, 3 e 4: Multi-Páginas, Bifurcação Estrita e Marketing Banners", () => {
  describe("1. ExperiencePageSchema & ExperienceNodeSchema (Microfase 4)", () => {
    it("deve validar página corporativa com campos obrigatórios e defaults", () => {
      const parsed = ExperiencePageSchema.parse({
        title: "Sobre Nós",
        path: "/sobre",
      });

      expect(parsed.title).toBe("Sobre Nós");
      expect(parsed.path).toBe("/sobre");
      expect(parsed.is_home).toBe(false);
      expect(parsed.sort_order).toBe(0);
      expect(parsed.document_id).toBeUndefined();
    });

    it("deve aceitar document_id explícito quando fornecido", () => {
      const docId = "123e4567-e89b-12d3-a456-426614174000";
      const parsed = ExperiencePageSchema.parse({
        document_id: docId,
        title: "Carreiras",
        path: "/carreiras",
        is_home: false,
        sort_order: 1,
      });

      expect(parsed.document_id).toBe(docId);
    });

    it("deve validar nó de construtor contendo page_id e animation_rules", () => {
      const pageId = "123e4567-e89b-12d3-a456-426614174001";
      const nodeParsed = ExperienceNodeSchema.parse({
        id: "node_1",
        page_id: pageId,
        node_type: "section",
        block_type: "hero_carousel",
        animation_rules: {
          entrance: "fade_up",
          duration_ms: 300,
        },
      });

      expect(nodeParsed.page_id).toBe(pageId);
      expect(nodeParsed.animation_rules).toEqual({
        entrance: "fade_up",
        duration_ms: 300,
      });
    });
  });

  describe("2. Bifurcação Estrita (Zero Dual-DOM - Invariante B.42) e Anti-Truncate (B.44)", () => {
    const catalogRoutes = [
      "src/routes/workspace.catalogo.categorias.index.tsx",
      "src/routes/workspace.catalogo.tabelas.tsx",
      "src/routes/workspace.estoque.index.tsx",
      "src/routes/workspace.estoque.alertas.tsx",
      "src/routes/workspace.catalogo.colecoes.index.tsx",
      "src/routes/workspace.catalogo.produtos.index.tsx",
    ];

    it("deve garantir que nenhuma rota prioritária possui block md:hidden ou hidden md:block duplicando a lista", () => {
      catalogRoutes.forEach((relPath) => {
        const fullPath = path.resolve(process.cwd(), relPath);
        const code = fs.readFileSync(fullPath, "utf8");

        // Proibido coexistence de block md:hidden e hidden md:block
        expect(code.includes("block md:hidden"), `${relPath} não deve conter 'block md:hidden'`).toBe(false);
        expect(code.includes("hidden md:block"), `${relPath} não deve conter 'hidden md:block'`).toBe(false);
      });
    });

    it("deve garantir o uso de useWindowSizeClass em todas as rotas do catálogo refatoradas", () => {
      catalogRoutes.forEach((relPath) => {
        const fullPath = path.resolve(process.cwd(), relPath);
        const code = fs.readFileSync(fullPath, "utf8");

        expect(code.includes("useWindowSizeClass"), `${relPath} deve importar e utilizar useWindowSizeClass`).toBe(true);
        expect(code.includes("isMobile"), `${relPath} deve derivar isMobile para bifurcação`).toBe(true);
      });
    });

    it("deve assegurar tipografia anti-truncate em títulos de coleções e produtos", () => {
      const colecoesCode = fs.readFileSync(path.resolve(process.cwd(), "src/routes/workspace.catalogo.colecoes.index.tsx"), "utf8");
      expect(colecoesCode.includes("break-words text-wrap leading-tight whitespace-normal")).toBe(true);

      const produtosCode = fs.readFileSync(path.resolve(process.cwd(), "src/routes/workspace.catalogo.produtos.index.tsx"), "utf8");
      expect(produtosCode.includes("break-words text-wrap leading-tight whitespace-normal")).toBe(true);
    });
  });

  describe("3. Marketing Banners: Paridade de Mídia, Dual Crop e Suporte a Vídeo (Microfase 3)", () => {
    it("deve validar renderização de vídeo nativo e tags de imagem responsiva picture", () => {
      const bannersPath = path.resolve(process.cwd(), "src/routes/workspace.marketing.banners.tsx");
      const bannersCode = fs.readFileSync(bannersPath, "utf8");

      // Deve mapear filteredBanners
      expect(bannersCode.includes("filteredBanners.map")).toBe(true);
      expect(bannersCode.includes("filteredBanners.length === 0")).toBe(true);

      // Deve renderizar tag video para mídias de vídeo
      expect(bannersCode.includes("<video")).toBe(true);
      expect(bannersCode.includes('b.media_type === "video"')).toBe(true);

      // Deve conter tags picture com breakpoints mobile e desktop
      expect(bannersCode.includes("<picture")).toBe(true);
      expect(bannersCode.includes('media="(max-width: 767px)"')).toBe(true);
      expect(bannersCode.includes('media="(min-width: 768px)"')).toBe(true);
    });
  });
});
