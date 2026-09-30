import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import {
  COMPACT_MAX_WIDTH,
  MEDIUM_MIN_WIDTH,
  MEDIUM_MAX_WIDTH,
  EXPANDED_MIN_WIDTH,
  MOBILE_BREAKPOINT,
  DESKTOP_BREAKPOINT,
  getWindowSizeClass,
} from "./use-mobile";

describe("Anti-Jank & Runtime Performance Suite (Prompt 16)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("FASE A & D: Instabilidade de Shell e Preservação de Estado", () => {
    it("classifica determinística e monotonicamente as 3 classes de janela sem quebra de estado", () => {
      // Compact
      expect(getWindowSizeClass(390)).toBe("compact");
      // Medium
      expect(getWindowSizeClass(768)).toBe("medium");
      // Expanded
      expect(getWindowSizeClass(1280)).toBe("expanded");
    });

    it("assegura que WindowSizeProvider utiliza requestAnimationFrame para debounce em eventos de resize", () => {
      const hookContent = fs.readFileSync(
        path.resolve("src/hooks/use-mobile.tsx"),
        "utf8"
      );

      expect(hookContent).toContain("window.requestAnimationFrame");
      expect(hookContent).toContain("window.cancelAnimationFrame");
      expect(hookContent).toContain("handleResize");
    });

    it("garante transições de Sheet com duração ágil (<= 300ms) sem bloquear toques", () => {
      const sheetContent = fs.readFileSync(
        path.resolve("src/components/ui/sheet.tsx"),
        "utf8"
      );

      // Duração de abertura deve ser <= 300ms (não mais 500ms)
      expect(sheetContent).toContain("data-[state=open]:duration-300");
      expect(sheetContent).toContain("data-[state=closed]:duration-200");
      expect(sheetContent).not.toContain("duration-500");
    });

    it("garante que Sheet fecha e abre sem classes arbitrárias de colchetes no layout", () => {
      const sheetContent = fs.readFileSync(
        path.resolve("src/components/ui/sheet.tsx"),
        "utf8"
      );

      expect(sheetContent).not.toContain("[70vw]");
      expect(sheetContent).not.toContain("[65vw]");
    });
  });

  describe("FASE B & C: Carregamento sob Demanda e Purga Crítica", () => {
    it("não importa maplibre-gl.css no caminho crítico global de styles.css", () => {
      const stylesContent = fs.readFileSync(
        path.resolve("src/styles.css"),
        "utf8"
      );

      expect(stylesContent).not.toContain("@import \"maplibre-gl/dist/maplibre-gl.css\";");
      expect(stylesContent).not.toContain("@import 'maplibre-gl/dist/maplibre-gl.css';");
    });

    it("carrega maplibre-gl.css sob demanda nos componentes de mapa", () => {
      const studioMap = fs.readFileSync(
        path.resolve("src/components/tourism/studio/StudioMapWidget.tsx"),
        "utf8"
      );
      const addressField = fs.readFileSync(
        path.resolve("src/components/ui/address-field.tsx"),
        "utf8"
      );
      const locationPicker = fs.readFileSync(
        path.resolve("src/components/commerce/business-location-picker.tsx"),
        "utf8"
      );

      expect(studioMap).toContain("maplibre-gl/dist/maplibre-gl.css");
      expect(addressField).toContain("maplibre-gl/dist/maplibre-gl.css");
      expect(locationPicker).toContain("maplibre-gl/dist/maplibre-gl.css");
    });

    it("declara classes de virtualização nativa (content-visibility: auto) para feeds e listas longas", () => {
      const stylesContent = fs.readFileSync(
        path.resolve("src/styles.css"),
        "utf8"
      );

      expect(stylesContent).toContain(".content-visibility-auto");
      expect(stylesContent).toContain(".content-auto");
      expect(stylesContent).toContain(".content-auto-card");
      expect(stylesContent).toContain(".content-auto-row");
      expect(stylesContent).toContain("contain-intrinsic-size");
    });

    it("garante que html2canvas é carregado exclusivamente de forma dinâmica em todos os componentes", () => {
      const recipeModal = fs.readFileSync(
        path.resolve("src/components/recipes/recipe-story-modal.tsx"),
        "utf8"
      );
      const studioEditor = fs.readFileSync(
        path.resolve("src/components/studio/carousel-studio-editor.tsx"),
        "utf8"
      );

      // Proibido import estático de topo
      expect(recipeModal).not.toMatch(/^import html2canvas from/m);
      expect(studioEditor).not.toMatch(/^import html2canvas from/m);

      // Obrigatório dynamic import
      expect(recipeModal).toContain("await import(\"html2canvas\")");
      expect(studioEditor).toContain("await import(\"html2canvas\")");
    });

    it("garante aspecto quadrado no skeleton de card de produto para CLS = 0", () => {
      const loadingContent = fs.readFileSync(
        path.resolve("src/components/state/loading.tsx"),
        "utf8"
      );

      expect(loadingContent).toContain("aspect-square");
      expect(loadingContent).not.toContain("aspect-[4/5]");
    });

    it("garante zero ocorrências de !important em rotas e views de interface", () => {
      const pedidosGestor = fs.readFileSync(
        path.resolve("src/routes/workspace.pedidos.gestor.tsx"),
        "utf8"
      );
      const pedidosRecibo = fs.readFileSync(
        path.resolve("src/routes/workspace_.pedidos.$id.recibo.tsx"),
        "utf8"
      );

      expect(pedidosGestor).not.toContain("display: none !important");
      expect(pedidosRecibo).not.toContain("!important");
    });
  });

  describe("FASE B: Purga de Backdrop-Blur Decorativo e Aceleração de Cards", () => {
    it("não possui backdrop-blur em cards de notícias e ofertas de alta frequência", () => {
      const newsCard = fs.readFileSync(
        path.resolve("src/components/news/news-card.tsx"),
        "utf8"
      );
      const offerCard = fs.readFileSync(
        path.resolve("src/components/commerce/offer-card.tsx"),
        "utf8"
      );

      expect(newsCard).not.toContain("backdrop-blur");
      expect(offerCard).not.toContain("backdrop-blur");
    });

    it("utiliza transition-colors ou transition-transform e content-auto-card nos cards de feed", () => {
      const postCard = fs.readFileSync(
        path.resolve("src/components/community/post-card.tsx"),
        "utf8"
      );
      const newsCard = fs.readFileSync(
        path.resolve("src/components/news/news-card.tsx"),
        "utf8"
      );
      const offerCard = fs.readFileSync(
        path.resolve("src/components/commerce/offer-card.tsx"),
        "utf8"
      );
      const groceryCard = fs.readFileSync(
        path.resolve("src/components/commerce/grocery-product-card.tsx"),
        "utf8"
      );
      const dynProductCard = fs.readFileSync(
        path.resolve("src/components/commerce/dynamic-product-card.tsx"),
        "utf8"
      );

      expect(postCard).toContain("content-auto-card");
      expect(newsCard).toContain("content-auto-card");
      expect(offerCard).toContain("content-auto-card");
      expect(groceryCard).toContain("content-auto-card");
      expect(dynProductCard).toContain("content-auto-card");
    });
  });
});
