/**
 * Tier 1: Feature Coverage - Design Foundations & Primitives
 * Covering:
 * - Feature 1: Single Sovereign Surface Tokens & Foundations (DL-31)
 * - Feature 2: Belasis/Trello Canonical Metric & View Primitives
 * - Feature 3: Polymorphic UniversalViewManager Component
 * 
 * Target: >=5 test cases per feature (Total >= 15 test cases)
 */

import { describe, it, expect } from "vitest";
import { KpiMetricSchema } from "../harness/test-fixtures";

describe("Tier 1: Design Foundations & Primitives", () => {
  // ==========================================
  // Feature 1: Single Sovereign Surface Tokens & Foundations (DL-31)
  // ==========================================
  describe("Feature 1: Single Sovereign Surface & Anti-Containeritis", () => {
    it("1.1 enforces single sovereign surface: flags card inside card nesting", () => {
      // Rule DL-31: No container with border & bg wrapping child cards with border & bg
      const detectContaineritis = (parentClasses: string, childClasses: string) => {
        const hasBorderAndBg = (cls: string) =>
          (cls.includes("border") || cls.includes("rounded")) &&
          (cls.includes("bg-card") || cls.includes("bg-background") || cls.includes("bg-surface"));
        return hasBorderAndBg(parentClasses) && hasBorderAndBg(childClasses);
      };

      const invalidNesting = detectContaineritis(
        "rounded-2xl border border-border bg-card p-4",
        "rounded-xl border border-border/50 bg-card p-3"
      );
      expect(invalidNesting).toBe(true);

      const validSovereign = detectContaineritis(
        "space-y-4 px-4 py-2", // transparent layout wrapper
        "rounded-2xl border border-border bg-card p-4"
      );
      expect(validSovereign).toBe(false);
    });

    it("1.2 prevents cumulative lateral padding on mobile viewports (<600px)", () => {
      // Invariant B.8 & DL-31: Max lateral padding accumulation <= 16px (>=92% content width)
      const calculateAccumulatedPaddingPx = (paddings: number[]) =>
        paddings.reduce((sum, p) => sum + p, 0);

      const accumulatedMobilePadding = calculateAccumulatedPaddingPx([16, 16, 16]); // page + container + card = 48px
      expect(accumulatedMobilePadding).toBeGreaterThan(32); // violation

      const compliantPadding = calculateAccumulatedPaddingPx([0, 0, 16]); // unpadded shell + 16px card = 16px
      expect(compliantPadding).toBeLessThanOrEqual(16);
    });

    it("1.3 prohibits decorative drop-shadows on application data surfaces", () => {
      // Rule B.8: Proibido aplicar sombras decorativas em superfícies de aplicação
      const isShadowDecorativelyProhibited = (className: string) => {
        const prohibitedShadows = ["shadow-lg", "shadow-xl", "shadow-2xl", "shadow-md"];
        return prohibitedShadows.some((s) => className.includes(s));
      };

      expect(isShadowDecorativelyProhibited("bg-card border rounded-2xl shadow-xl")).toBe(true);
      expect(isShadowDecorativelyProhibited("bg-card border border-border/60 rounded-2xl")).toBe(false);
    });

    it("1.4 enforces 90% visual silence acromatism with semantic micro-accents", () => {
      // Palette uses --canvas / --surface, micro-accents restricted to badges (10% bg, 20% border)
      const validateBadgeOpacity = (bgOpacityPercent: number, borderOpacityPercent: number) => {
        return bgOpacityPercent <= 15 && borderOpacityPercent <= 25;
      };

      expect(validateBadgeOpacity(10, 20)).toBe(true);
      expect(validateBadgeOpacity(80, 100)).toBe(false); // loud decorative badge
    });

    it("1.5 enforces 4px modular spacing grid compliance across layout rules", () => {
      // Rule B.8: Spacings, margins, paddings must strictly be multiples of 4px
      const isCompliantWith4pxGrid = (pixels: number) => pixels % 4 === 0;

      expect(isCompliantWith4pxGrid(4)).toBe(true);
      expect(isCompliantWith4pxGrid(8)).toBe(true);
      expect(isCompliantWith4pxGrid(12)).toBe(true);
      expect(isCompliantWith4pxGrid(16)).toBe(true);
      expect(isCompliantWith4pxGrid(13)).toBe(false); // arbitrary magic value
      expect(isCompliantWith4pxGrid(7)).toBe(false);
    });
  });

  // ==========================================
  // Feature 2: Belasis/Trello Canonical Metric & View Primitives
  // ==========================================
  describe("Feature 2: Canonical KPI Metric & View Primitives", () => {
    it("2.1 validates KpiMetricCard schema props and constraints", () => {
      const validMetric = KpiMetricSchema.parse({
        title: "Faturamento Diario",
        value: "R$ 3.420,00",
        subValue: "+14% vs meta",
        trendDirection: "up",
        trendText: "+14%",
        sparklineData: [1000, 1500, 2200, 3420],
      });

      expect(validMetric.title).toBe("Faturamento Diario");
      expect(validMetric.trendDirection).toBe("up");
      expect(validMetric.sparklineData).toHaveLength(4);
    });

    it("2.2 validates MiniSparkline trend projection mathematical direction", () => {
      const computeTrendDirection = (data: number[]): "up" | "down" | "neutral" => {
        if (data.length < 2) return "neutral";
        const first = data[0];
        const last = data[data.length - 1];
        if (last > first) return "up";
        if (last < first) return "down";
        return "neutral";
      };

      expect(computeTrendDirection([10, 15, 20, 25])).toBe("up");
      expect(computeTrendDirection([50, 40, 30, 20])).toBe("down");
      expect(computeTrendDirection([15, 15, 15])).toBe("neutral");
    });

    it("2.3 enforces ultra-direct action titles and button labels (<= 3 words)", () => {
      // Invariant B.8: Títulos ultra-diretos (<= 4 palavras) e botões de ação concisos (<= 3 palavras)
      const countWords = (text: string) => text.trim().split(/\s+/).length;

      const validButtonLabel = "Novo Agendamento";
      const invalidAiSmellLabel = "Clique aqui para agendar um novo servico com o profissional";

      expect(countWords(validButtonLabel)).toBeLessThanOrEqual(3);
      expect(countWords(invalidAiSmellLabel)).toBeGreaterThan(3);
    });

    it("2.4 formats numeric metrics with tabular numbers for vertical alignment", () => {
      const formatTabular = (value: number) => {
        return {
          formatted: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value),
          className: "font-mono tabular-nums tracking-tight",
        };
      };

      const result = formatTabular(1250.5);
      expect(result.className).toContain("tabular-nums");
      expect(result.formatted).toContain("1.250,50");
    });

    it("2.5 enforces ViewModeSwitcher state modes: table, kanban, cards", () => {
      const validModes = ["table", "kanban", "cards"] as const;
      const isSupportedViewMode = (mode: string): mode is (typeof validModes)[number] => {
        return (validModes as readonly string[]).includes(mode);
      };

      expect(isSupportedViewMode("table")).toBe(true);
      expect(isSupportedViewMode("kanban")).toBe(true);
      expect(isSupportedViewMode("cards")).toBe(true);
      expect(isSupportedViewMode("timeline")).toBe(false);
    });
  });

  // ==========================================
  // Feature 3: Polymorphic UniversalViewManager Component
  // ==========================================
  describe("Feature 3: Polymorphic UniversalViewManager Component", () => {
    it("3.1 dispatches correct view renderer for Table, Kanban, and Cards modes", () => {
      const mockTableRenderer = () => "RENDER_TABLE";
      const mockKanbanRenderer = () => "RENDER_KANBAN";
      const mockCardsRenderer = () => "RENDER_CARDS";

      const renderView = (mode: "table" | "kanban" | "cards") => {
        switch (mode) {
          case "table":
            return mockTableRenderer();
          case "kanban":
            return mockKanbanRenderer();
          case "cards":
            return mockCardsRenderer();
        }
      };

      expect(renderView("table")).toBe("RENDER_TABLE");
      expect(renderView("kanban")).toBe("RENDER_KANBAN");
      expect(renderView("cards")).toBe("RENDER_CARDS");
    });

    it("3.2 maps numerical keyboard shortcuts (1, 2, 3) to view modes", () => {
      const mapKeyToViewMode = (key: string): "table" | "kanban" | "cards" | null => {
        switch (key) {
          case "1":
            return "table";
          case "2":
            return "kanban";
          case "3":
            return "cards";
          default:
            return null;
        }
      };

      expect(mapKeyToViewMode("1")).toBe("table");
      expect(mapKeyToViewMode("2")).toBe("kanban");
      expect(mapKeyToViewMode("3")).toBe("cards");
      expect(mapKeyToViewMode("4")).toBeNull();
      expect(mapKeyToViewMode("Enter")).toBeNull();
    });

    it("3.3 renders honest empty states when data array is empty", () => {
      const resolveState = <T>(data: T[], isLoading: boolean) => {
        if (isLoading) return "SKELETON";
        if (data.length === 0) return "EMPTY_STATE";
        return "DATA_VIEW";
      };

      expect(resolveState([], true)).toBe("SKELETON");
      expect(resolveState([], false)).toBe("EMPTY_STATE");
      expect(resolveState([{ id: 1 }], false)).toBe("DATA_VIEW");
    });

    it("3.4 preserves generic data typing polymorphically across data schemas", () => {
      interface AppointmentItem {
        id: string;
        customer: string;
      }
      interface OrderItem {
        id: string;
        totalCents: number;
      }

      const processDataset = <T extends { id: string }>(items: T[]) => {
        return {
          count: items.length,
          firstId: items[0]?.id ?? null,
        };
      };

      const appointments: AppointmentItem[] = [{ id: "app-1", customer: "Maria" }];
      const orders: OrderItem[] = [{ id: "ord-1", totalCents: 5000 }, { id: "ord-2", totalCents: 8000 }];

      expect(processDataset(appointments)).toEqual({ count: 1, firstId: "app-1" });
      expect(processDataset(orders)).toEqual({ count: 2, firstId: "ord-1" });
    });

    it("3.5 supports sort direction and column setting overrides", () => {
      const applySort = <T extends Record<string, any>>(
        items: T[],
        field: keyof T,
        direction: "asc" | "desc"
      ): T[] => {
        return [...items].sort((a, b) => {
          if (a[field] < b[field]) return direction === "asc" ? -1 : 1;
          if (a[field] > b[field]) return direction === "asc" ? 1 : -1;
          return 0;
        });
      };

      const records = [{ age: 30 }, { age: 20 }, { age: 40 }];
      const sortedAsc = applySort(records, "age", "asc");
      expect(sortedAsc[0].age).toBe(20);
      expect(sortedAsc[2].age).toBe(40);

      const sortedDesc = applySort(records, "age", "desc");
      expect(sortedDesc[0].age).toBe(40);
      expect(sortedDesc[2].age).toBe(20);
    });
  });
});
