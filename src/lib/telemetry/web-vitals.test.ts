import { describe, it, expect, beforeEach } from "vitest";
import {
  rateMetric,
  getViewportCategory,
  webVitalsRegistry,
  dispatchMetric,
  initWebVitalsCollector,
  type WebVitalMetric,
} from "./web-vitals";

describe("Web Vitals Engine (Fase S35)", () => {
  beforeEach(() => {
    webVitalsRegistry.clear();
  });

  describe("rateMetric", () => {
    it("deve classificar LCP corretamente conforme os patamares do W3C", () => {
      expect(rateMetric("LCP", 1500)).toBe("good");
      expect(rateMetric("LCP", 2500)).toBe("good");
      expect(rateMetric("LCP", 2501)).toBe("needs-improvement");
      expect(rateMetric("LCP", 4000)).toBe("needs-improvement");
      expect(rateMetric("LCP", 4001)).toBe("poor");
    });

    it("deve classificar INP corretamente", () => {
      expect(rateMetric("INP", 80)).toBe("good");
      expect(rateMetric("INP", 200)).toBe("good");
      expect(rateMetric("INP", 350)).toBe("needs-improvement");
      expect(rateMetric("INP", 600)).toBe("poor");
    });

    it("deve classificar CLS corretamente", () => {
      expect(rateMetric("CLS", 0.02)).toBe("good");
      expect(rateMetric("CLS", 0.1)).toBe("good");
      expect(rateMetric("CLS", 0.18)).toBe("needs-improvement");
      expect(rateMetric("CLS", 0.35)).toBe("poor");
    });

    it("deve classificar TTFB corretamente", () => {
      expect(rateMetric("TTFB", 250)).toBe("good");
      expect(rateMetric("TTFB", 800)).toBe("good");
      expect(rateMetric("TTFB", 1200)).toBe("needs-improvement");
      expect(rateMetric("TTFB", 2200)).toBe("poor");
    });

    it("deve classificar FCP corretamente", () => {
      expect(rateMetric("FCP", 1200)).toBe("good");
      expect(rateMetric("FCP", 1800)).toBe("good");
      expect(rateMetric("FCP", 2400)).toBe("needs-improvement");
      expect(rateMetric("FCP", 3500)).toBe("poor");
    });
  });

  describe("getViewportCategory", () => {
    it("deve classificar larguras nos breakpoints canônicos do Waesy", () => {
      expect(getViewportCategory(320)).toBe("compact");
      expect(getViewportCategory(390)).toBe("compact");
      expect(getViewportCategory(599)).toBe("compact");
      expect(getViewportCategory(600)).toBe("medium");
      expect(getViewportCategory(768)).toBe("medium");
      expect(getViewportCategory(839)).toBe("medium");
      expect(getViewportCategory(840)).toBe("expanded");
      expect(getViewportCategory(1280)).toBe("expanded");
      expect(getViewportCategory(1920)).toBe("expanded");
    });
  });

  describe("webVitalsRegistry e Agregação P75", () => {
    it("deve registrar métricas e calcular P75 e rating estatístico", () => {
      const sampleMetrics: WebVitalMetric[] = [
        {
          id: "m1",
          name: "LCP",
          value: 1200,
          delta: 1200,
          rating: "good",
          routeId: "/turismo",
          viewportCategory: "compact",
          timestamp: new Date().toISOString(),
        },
        {
          id: "m2",
          name: "LCP",
          value: 1800,
          delta: 1800,
          rating: "good",
          routeId: "/turismo",
          viewportCategory: "compact",
          timestamp: new Date().toISOString(),
        },
        {
          id: "m3",
          name: "LCP",
          value: 2600,
          delta: 2600,
          rating: "needs-improvement",
          routeId: "/turismo",
          viewportCategory: "medium",
          timestamp: new Date().toISOString(),
        },
        {
          id: "m4",
          name: "LCP",
          value: 3900,
          delta: 3900,
          rating: "needs-improvement",
          routeId: "/turismo",
          viewportCategory: "expanded",
          timestamp: new Date().toISOString(),
        },
      ];

      for (const m of sampleMetrics) {
        dispatchMetric(m);
      }

      const all = webVitalsRegistry.getAll();
      expect(all.length).toBe(4);

      const byRoute = webVitalsRegistry.getByRoute("/turismo");
      expect(byRoute.length).toBe(4);

      const summary = webVitalsRegistry.getSummary("/turismo");
      expect(summary.LCP.samples).toBe(4);
      // P75 dos valores [1200, 1800, 2600, 3900] index 3 -> 3900
      expect(summary.LCP.p75).toBe(3900);
      expect(summary.LCP.rating).toBe("needs-improvement");
    });

    it("deve isolar métricas de rotas diferentes", () => {
      dispatchMetric({
        id: "m_store",
        name: "TTFB",
        value: 150,
        delta: 150,
        rating: "good",
        routeId: "/store/catalog",
        viewportCategory: "compact",
        timestamp: new Date().toISOString(),
      });

      dispatchMetric({
        id: "m_admin",
        name: "TTFB",
        value: 450,
        delta: 450,
        rating: "good",
        routeId: "/admin-master",
        viewportCategory: "expanded",
        timestamp: new Date().toISOString(),
      });

      expect(webVitalsRegistry.getByRoute("/store/catalog").length).toBe(1);
      expect(webVitalsRegistry.getByRoute("/admin-master").length).toBe(1);
      expect(webVitalsRegistry.getByRoute("/non-existent").length).toBe(0);
    });
  });

  describe("initWebVitalsCollector", () => {
    it("deve degradar graciosamente em ambiente não-navegador e retornar teardown", () => {
      const teardown = initWebVitalsCollector({ routeId: "/test" });
      expect(typeof teardown).toBe("function");
      teardown();
    });
  });
});
