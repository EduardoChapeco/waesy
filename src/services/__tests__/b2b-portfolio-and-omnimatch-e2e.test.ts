import { describe, it, expect } from "vitest";
import {
  calculateHaversineDistanceMeters,
  computeNextAttentionCycle,
} from "../b2b-portfolio-routes.functions";
import {
  normalizeVectorL2,
  updateIncrementalEmbedding,
} from "../match-engine.functions";

describe("Waesy B2B Rotary CRM, GPS Routes & OmniMatch Engine E2E", () => {
  describe("1. Haversine Geofence Calculations", () => {
    it("deve retornar 0 metros para pontos geográficos idênticos", () => {
      const dist = calculateHaversineDistanceMeters(-27.1234, -49.5678, -27.1234, -49.5678);
      expect(dist).toBe(0);
    });

    it("deve calcular distância dentro da geofence de 200m para deslocamento sutil", () => {
      // Coordenadas próximas (~55 metros de distância)
      const lat1 = -27.100000;
      const lon1 = -49.100000;
      const lat2 = -27.100400;
      const lon2 = -49.100300;

      const dist = calculateHaversineDistanceMeters(lat1, lon1, lat2, lon2);
      expect(dist).toBeGreaterThan(0);
      expect(dist).toBeLessThanOrEqual(200);
    });

    it("deve calcular distância fora da geofence para pontos distantes em outra cidade", () => {
      // São Miguel do Oeste (-26.72) vs Chapecó (-27.10) (~130 km)
      const latSmo = -26.7261;
      const lonSmo = -53.5181;
      const latXap = -27.1004;
      const lonXap = -52.6152;

      const dist = calculateHaversineDistanceMeters(latSmo, lonSmo, latXap, lonXap);
      expect(dist).toBeGreaterThan(50000); // Mais de 50 km
    });
  });

  describe("2. Carteira Rotativa e Ciclo de Atenção (SLA)", () => {
    it("deve classificar como on_track quando a última compra ocorreu há pouco tempo", () => {
      const now = new Date();
      const lastOrder = new Date(now.getTime() - 4 * 86400000).toISOString(); // 4 dias atrás

      const res = computeNextAttentionCycle(lastOrder, 14); // ciclo de 14 dias
      expect(res.daysSinceLastOrder).toBe(4);
      expect(res.slaStatus).toBe("on_track");
    });

    it("deve classificar como attention quando a data atinge 80% do ciclo médio", () => {
      const now = new Date();
      const lastOrder = new Date(now.getTime() - 12 * 86400000).toISOString(); // 12 dias atrás

      const res = computeNextAttentionCycle(lastOrder, 14); // 12 / 14 = ~85%
      expect(res.daysSinceLastOrder).toBe(12);
      expect(res.slaStatus).toBe("attention");
    });

    it("deve classificar como risk quando o ciclo de recompra expirou", () => {
      const now = new Date();
      const lastOrder = new Date(now.getTime() - 16 * 86400000).toISOString(); // 16 dias atrás

      const res = computeNextAttentionCycle(lastOrder, 14);
      expect(res.daysSinceLastOrder).toBe(16);
      expect(res.slaStatus).toBe("risk");
    });

    it("deve classificar como churn_loss quando o atraso supera 150% do ciclo médio", () => {
      const now = new Date();
      const lastOrder = new Date(now.getTime() - 25 * 86400000).toISOString(); // 25 dias atrás

      const res = computeNextAttentionCycle(lastOrder, 14); // 25 / 14 = ~178%
      expect(res.daysSinceLastOrder).toBe(25);
      expect(res.slaStatus).toBe("churn_loss");
    });

    it("deve tratar cliente sem pedidos anteriores de forma defensiva", () => {
      const res = computeNextAttentionCycle(null, 14);
      expect(res.daysSinceLastOrder).toBe(999);
      expect(res.slaStatus).toBe("risk");
      expect(res.nextAttentionDate).toBeDefined();
    });
  });

  describe("3. OmniMatch Vetores e Atualização Neural", () => {
    it("deve normalizar vetor para norma L2 unitária", () => {
      const rawVector = [3, 4]; // Norma euclidiana = 5
      const normalized = normalizeVectorL2(rawVector);

      expect(normalized[0]).toBeCloseTo(0.6, 5);
      expect(normalized[1]).toBeCloseTo(0.8, 5);

      const norm = Math.sqrt(normalized[0] * normalized[0] + normalized[1] * normalized[1]);
      expect(norm).toBeCloseTo(1.0, 5);
    });

    it("deve atualizar incrementalmente o vetor de preferência sem NaN", () => {
      const current = [0.6, 0.8];
      const card = [1.0, 0.0];

      const updated = updateIncrementalEmbedding(current, card, 0.2);
      expect(updated.length).toBe(2);

      const norm = Math.sqrt(updated[0] * updated[0] + updated[1] * updated[1]);
      expect(norm).toBeCloseTo(1.0, 5);
      expect(updated[0]).toBeGreaterThan(0.6); // moveu-se em direção ao card
      expect(updated[1]).toBeLessThan(0.8);
    });
  });
});
