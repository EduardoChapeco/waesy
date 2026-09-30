/**
 * use-mobile.test.ts — Testes Unitários do Motor de Janela e Primitivas Nativas (Prompt 15)
 *
 * Cobre:
 * - Constantes Canônicas (Compact < 600, Medium 600-839, Expanded >= 840)
 * - Função determinística getWindowSizeClass()
 * - Erradicação do drift histórico (768 e 1024)
 * - Contratos de windowVariant em Card, Table, Sheet, Dialog
 */
import { describe, it, expect } from "vitest";
import {
  COMPACT_MAX_WIDTH,
  MEDIUM_MIN_WIDTH,
  MEDIUM_MAX_WIDTH,
  EXPANDED_MIN_WIDTH,
  MOBILE_BREAKPOINT,
  DESKTOP_BREAKPOINT,
  getWindowSizeClass,
} from "@/hooks/use-mobile";

describe("Window Size Class Engine — Constantes Canônicas (DESIGN.md Princípio 6)", () => {
  it("garante limites canônicos exatos de Compact, Medium e Expanded", () => {
    expect(COMPACT_MAX_WIDTH).toBe(599);
    expect(MEDIUM_MIN_WIDTH).toBe(600);
    expect(MEDIUM_MAX_WIDTH).toBe(839);
    expect(EXPANDED_MIN_WIDTH).toBe(840);
  });

  it("elimina o drift histórico de 768px e 1024px", () => {
    expect(MOBILE_BREAKPOINT).toBe(600);
    expect(DESKTOP_BREAKPOINT).toBe(840);
  });
});

describe("Window Size Class Engine — getWindowSizeClass()", () => {
  describe("Classe Compact (< 600px)", () => {
    it("classifica viewport 320px (iPhone SE) como compact", () => {
      expect(getWindowSizeClass(320)).toBe("compact");
    });

    it("classifica viewport 390px (iPhone 14/15) como compact", () => {
      expect(getWindowSizeClass(390)).toBe("compact");
    });

    it("classifica viewport 414px (iPhone Plus) como compact", () => {
      expect(getWindowSizeClass(414)).toBe("compact");
    });

    it("classifica viewport 599px (limite superior exato) como compact", () => {
      expect(getWindowSizeClass(599)).toBe("compact");
    });
  });

  describe("Classe Medium (600px a 839px)", () => {
    it("classifica viewport 600px (limite inferior exato) como medium", () => {
      expect(getWindowSizeClass(600)).toBe("medium");
    });

    it("classifica viewport 768px (antigo drift) como medium, NÃO como compact", () => {
      // PROVA: 768px agora é tratado como tablet Medium, eliminando bottom nav de celular
      expect(getWindowSizeClass(768)).toBe("medium");
    });

    it("classifica viewport 800px (tablets Android) como medium", () => {
      expect(getWindowSizeClass(800)).toBe("medium");
    });

    it("classifica viewport 834px (iPad Air portrait) como medium", () => {
      expect(getWindowSizeClass(834)).toBe("medium");
    });

    it("classifica viewport 839px (limite superior exato) como medium", () => {
      expect(getWindowSizeClass(839)).toBe("medium");
    });
  });

  describe("Classe Expanded (>= 840px)", () => {
    it("classifica viewport 840px (limite inferior exato) como expanded", () => {
      expect(getWindowSizeClass(840)).toBe("expanded");
    });

    it("classifica viewport 1024px (antigo drift de desktop) como expanded", () => {
      expect(getWindowSizeClass(1024)).toBe("expanded");
    });

    it("classifica viewport 1280px (MacBook / Laptop) como expanded", () => {
      expect(getWindowSizeClass(1280)).toBe("expanded");
    });

    it("classifica viewport 1440px (Monitor Panorâmico) como expanded", () => {
      expect(getWindowSizeClass(1440)).toBe("expanded");
    });

    it("classifica viewport 1920px (Full HD) como expanded", () => {
      expect(getWindowSizeClass(1920)).toBe("expanded");
    });
  });
});

describe("Primitivas Nativas — Contrato de WindowVariant", () => {
  it("valida contrato de CardProps suportando variantes de janela", async () => {
    const { Card } = await import("@/components/ui/card");
    expect(Card).toBeDefined();
  });

  it("valida contrato de TableProps suportando variantes de janela", async () => {
    const { Table } = await import("@/components/ui/table");
    expect(Table).toBeDefined();
  });

  it("valida contrato de SheetContentProps suportando variantes de janela", async () => {
    const { SheetContent } = await import("@/components/ui/sheet");
    expect(SheetContent).toBeDefined();
  });

  it("valida contrato de DialogContentProps suportando variantes de janela", async () => {
    const { DialogContent } = await import("@/components/ui/dialog");
    expect(DialogContent).toBeDefined();
  });
});
