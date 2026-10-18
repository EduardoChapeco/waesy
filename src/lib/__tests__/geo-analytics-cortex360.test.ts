import { describe, expect, it } from "vitest";
import {
  calculateHaversineDistanceKm,
  computeCortex360DynamicPrice,
  computeGoatGravitationalAccessibility,
  computeRegionalTamSamSom,
  generateCatchmentRingsFeatureCollection,
  generateIsochronePolygonGeoJSON,
  type GeoPointOfInterest,
} from "../geo-analytics";

describe("Geomarketing Spatial Engine & Cortex 360 Econometrics (Pilar 2)", () => {
  describe("calculateHaversineDistanceKm", () => {
    it("retorna 0 para coordenadas idênticas", () => {
      const d = calculateHaversineDistanceKm(-27.1004, -52.6152, -27.1004, -52.6152);
      expect(d).toBe(0);
    });

    it("calcula a distância esférica real entre Chapecó e São Miguel do Oeste (~98 km em linha reta)", () => {
      const d = calculateHaversineDistanceKm(-27.1004, -52.6152, -26.7253, -53.5183);
      expect(d).toBeGreaterThan(90);
      expect(d).toBeLessThan(105);
    });
  });

  describe("generateIsochronePolygonGeoJSON", () => {
    it("gera polígono GeoJSON fechado válido para 500m (5 min walk), 1km e 2km", () => {
      const centerLat = -27.1004;
      const centerLon = -52.6152;
      const iso500 = generateIsochronePolygonGeoJSON(centerLat, centerLon, 0.5, 32);

      expect(iso500.type).toBe("Feature");
      expect(iso500.geometry.type).toBe("Polygon");
      expect(iso500.properties.travelMode).toBe("walk_5min");
      expect(iso500.properties.areaKm2).toBeCloseTo(Math.PI * 0.25, 2);

      const coords = iso500.geometry.coordinates[0];
      expect(coords.length).toBe(33); // 32 vértices + ponto de fechamento RFC 7946
      expect(coords[0]).toEqual(coords[coords.length - 1]);

      // Verifica que qualquer vértice da borda está a ~0.5 km do centro
      const [vertexLon, vertexLat] = coords[8];
      const distVertex = calculateHaversineDistanceKm(
        centerLat,
        centerLon,
        vertexLat,
        vertexLon,
      );
      expect(distVertex).toBeCloseTo(0.5, 2);
    });

    it("gera FeatureCollection com os 3 anéis concêntricos de captura", () => {
      const collection = generateCatchmentRingsFeatureCollection(-27.1004, -52.6152);
      expect(collection.type).toBe("FeatureCollection");
      expect(collection.features).toHaveLength(3);
      expect(collection.features.map((f) => f.properties.radiusKm)).toEqual([2, 1, 0.5]);
    });
  });

  describe("computeGoatGravitationalAccessibility", () => {
    it("calcula o score gravitacional GOAT e o índice de saturação competitiva Geowire", () => {
      const targetLat = -27.1004;
      const targetLon = -52.6152;

      const pois: GeoPointOfInterest[] = [
        {
          id: "anchor-1",
          name: "Supermercado Central",
          kind: "anchor",
          category: "supermarket",
          latitude: -27.1015,
          longitude: -52.616,
          weight: 1.5,
        },
        {
          id: "anchor-2",
          name: "Agência Bancária",
          kind: "anchor",
          category: "bank",
          latitude: -27.0992,
          longitude: -52.614,
          weight: 1.3,
        },
        {
          id: "comp-1",
          name: "Concorrente Direto A",
          kind: "competitor",
          category: "restaurant",
          latitude: -27.102,
          longitude: -52.617,
          weight: 1.0,
          avgPriceCents: 5500,
        },
      ];

      const result = computeGoatGravitationalAccessibility(targetLat, targetLon, pois, 1.2);
      expect(result.gravitationalScore).toBeGreaterThan(2.0);
      expect(result.normalizedAccessibilityIndex).toBeGreaterThan(40);
      expect(result.competitorCountIn500m).toBe(1);
      expect(result.anchorCountIn1km).toBe(2);
      expect(result.competitorPressureGamma).toBeGreaterThan(0);
    });
  });

  describe("computeRegionalTamSamSom", () => {
    it("calcula TAM > SAM > SOM monotônicos e reduz SOM conforme aumenta o número de concorrentes", () => {
      const lowCompetition = computeRegionalTamSamSom({
        population: 254785,
        perCapitaIncomeBrl: 3200,
        nicheMonthlySpendShare: 0.08,
        targetAudienceShare: 0.35,
        competitorCountInRadius: 2,
      });

      const highCompetition = computeRegionalTamSamSom({
        population: 254785,
        perCapitaIncomeBrl: 3200,
        nicheMonthlySpendShare: 0.08,
        targetAudienceShare: 0.35,
        competitorCountInRadius: 9,
      });

      expect(lowCompetition.tamMonthlyCents).toBeGreaterThan(lowCompetition.samMonthlyCents);
      expect(lowCompetition.samMonthlyCents).toBeGreaterThan(lowCompetition.somMonthlyCents);
      expect(lowCompetition.somMonthlyCents).toBeGreaterThan(highCompetition.somMonthlyCents);
      expect(lowCompetition.estimatedMarketSharePct).toBeGreaterThan(
        highCompetition.estimatedMarketSharePct,
      );
    });
  });

  describe("computeCortex360DynamicPrice", () => {
    it("aplica exatamente a fórmula Preço Base * (1 + alpha) * (1 + beta) * (1 - gamma)", () => {
      const basePriceCents = 10000; // R$ 100,00
      const marketSentimentAlpha = 0.1; // +10%
      const localScarcityBeta = 0.2; // +20%
      const competitorPressureGamma = 0.05; // -5%

      // 10000 * 1.10 * 1.20 * 0.95 = 10000 * 1.254 = 12540
      const res = computeCortex360DynamicPrice({
        basePriceCents,
        marketSentimentAlpha,
        localScarcityBeta,
        competitorPressureGamma,
      });

      expect(res.multiplier).toBeCloseTo(1.254, 4);
      expect(res.dynamicPriceCents).toBe(12540);
      expect(res.rationale).toContain("+25.4%");
    });

    it("recomenda desconto estratégico quando a pressão competitiva supera a escassez local", () => {
      const res = computeCortex360DynamicPrice({
        basePriceCents: 6000,
        marketSentimentAlpha: 0.0,
        localScarcityBeta: -0.05,
        competitorPressureGamma: 0.15,
      });

      expect(res.dynamicPriceCents).toBeLessThan(6000);
      expect(res.multiplier).toBeLessThan(1.0);
    });
  });
});
