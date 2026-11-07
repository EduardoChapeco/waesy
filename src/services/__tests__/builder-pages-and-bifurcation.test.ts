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

  describe("4. Omni Builder & CMS Integration: Schema Integrity and Non-Ambiguous Navigation", () => {
    it("deve garantir integridade de schema na persistencia de experience_documents (coluna title, nunca name)", () => {
      const surfaceCmsCode = fs.readFileSync(path.resolve(process.cwd(), "src/services/surface-cms.functions.ts"), "utf8");
      
      // Proibição de consultar ou inserir coluna inexistente 'name' em experience_documents
      expect(surfaceCmsCode).not.toContain('.select("id, slug, name, settings")');
      expect(surfaceCmsCode).not.toContain('name: docName');
      
      // Validação do uso correto de 'title'
      expect(surfaceCmsCode).toMatch(/\.select\("id,\s*slug,\s*title,\s*settings/);
      expect(surfaceCmsCode).toMatch(/title:\s*doc(Title|Name)/);
      expect(surfaceCmsCode).toMatch(/existingDoc\.title\s*\|\|\s*doc(Title|Name)/);
    });

    it("deve garantir header canônico e erradicação de AI-smell em admin-master.home-editor", () => {
      const homeEditorCode = fs.readFileSync(path.resolve(process.cwd(), "src/routes/admin-master.home-editor.tsx"), "utf8");
      
      // Sem títulos compostos ou prolixidade AI-smell
      expect(homeEditorCode).not.toContain("CMS Página por Página & Home Builder");
      expect(homeEditorCode).not.toContain("Omni-Builder 3.0");
      expect(homeEditorCode).toContain("Páginas & Seções da Plataforma");
      
      // Sem abas falsas que redirecionam secretamente para vitrines
      expect(homeEditorCode).not.toContain('search={{ surface: "turismo" }}');
      expect(homeEditorCode).not.toContain('search={{ surface: "gastronomia" }}');
    });

    it("deve garantir navegação clara e sem sufixos (Omni) inflados em admin-master", () => {
      const adminMasterCode = fs.readFileSync(path.resolve(process.cwd(), "src/routes/admin-master.tsx"), "utf8");
      
      expect(adminMasterCode).toContain('label: "Páginas & Seções"');
      expect(adminMasterCode).toContain('label: "Vitrines Verticais"');
      expect(adminMasterCode).toContain('label: "Banners & Destaques"');
      expect(adminMasterCode).toContain('label: "Categorias & Hotpages"');
      expect(adminMasterCode).not.toContain('label: "Editor Visual de Páginas (Omni)"');
      expect(adminMasterCode).not.toContain('label: "Vitrines e Superfícies (Omni)"');
    });
  });
});
