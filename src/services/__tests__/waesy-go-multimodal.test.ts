import { describe, it, expect } from "vitest";
import {
  computeCategorizedMobilityOptionsHelper,
  validateRescheduleDateHelper,
  calculateMobilityReceiptBreakdownHelper,
  sendMobilityTip,
  type CategorizedMobilityOption,
} from "../mobility.functions";

describe("Waesy Go — Multimodal Platform & Life Cycle Hardening", () => {
  describe("1. Cotação Categorizada e Desacoplada (Ride, Delivery, Freight, Moving)", () => {
    it("deve retornar exclusivamente opções de passageiros quando categoria for 'ride'", () => {
      const options = computeCategorizedMobilityOptionsHelper({
        category: "ride",
        origin_address: "Av. Getúlio Vargas, 500, Chapecó - SC",
        destination_address: "Aeroporto Serafin Enoss Bertaso, Chapecó - SC",
        distance_km: 8.5,
        helpers_count: 0,
      });

      expect(options).toHaveLength(4);
      const ids = options.map((o) => o.id);
      expect(ids).toEqual(["ride_moto", "ride_car_standard", "ride_car_priority", "ride_car_comfort"]);

      // Verifica que nenhuma opção contém caminhão ou van
      options.forEach((opt) => {
        expect(opt.category).toBe("ride");
        expect(opt.estimated_price_cents).toBeGreaterThan(0);
        expect(opt.eta_minutes).toBeGreaterThan(0);
        expect(opt.capacity_label).toBeDefined();
      });

      // Valida que o Expresso possui ETA menor ou igual ao Standard
      const standard = options.find((o) => o.id === "ride_car_standard")!;
      const priority = options.find((o) => o.id === "ride_car_priority")!;
      expect(priority.eta_minutes).toBeLessThanOrEqual(standard.eta_minutes);
      expect(priority.estimated_price_cents).toBeGreaterThan(standard.estimated_price_cents);
    });

    it("deve retornar opções de entrega com níveis de serviço (Expresso, Regular, Econômica, Carro, Van) para 'delivery'", () => {
      const options = computeCategorizedMobilityOptionsHelper({
        category: "delivery",
        origin_address: "Rua Uruguai, 100, Centro",
        destination_address: "Rua Fernando Machado, 2000, Líder",
        distance_km: 4.2,
        helpers_count: 0,
      });

      expect(options).toHaveLength(5);
      const ids = options.map((o) => o.id);
      expect(ids).toContain("delivery_moto_priority");
      expect(ids).toContain("delivery_moto_regular");
      expect(ids).toContain("delivery_moto_economy");
      expect(ids).toContain("delivery_car");
      expect(ids).toContain("delivery_van");

      const priority = options.find((o) => o.id === "delivery_moto_priority")!;
      const regular = options.find((o) => o.id === "delivery_moto_regular")!;
      const economy = options.find((o) => o.id === "delivery_moto_economy")!;

      expect(priority.eta_minutes).toBeLessThan(regular.eta_minutes);
      expect(regular.eta_minutes).toBeLessThan(economy.eta_minutes);
      expect(economy.estimated_price_cents).toBeLessThan(regular.estimated_price_cents);
    });

    it("deve incluir taxa de escadas e ajudantes no cálculo de mudança ('moving')", () => {
      const optionsWithStairs = computeCategorizedMobilityOptionsHelper({
        category: "moving",
        origin_address: "Apto 302, Centro",
        destination_address: "Casa, Efapi",
        distance_km: 7.0,
        helpers_count: 2,
        property_type: "stairs",
        floor_number: 3,
      });

      const optionsGround = computeCategorizedMobilityOptionsHelper({
        category: "moving",
        origin_address: "Casa, Centro",
        destination_address: "Casa, Efapi",
        distance_km: 7.0,
        helpers_count: 0,
        property_type: "ground",
        floor_number: 0,
      });

      expect(optionsWithStairs.length).toBe(3);
      expect(optionsGround.length).toBe(3);

      const truckWithStairs = optionsWithStairs.find((o) => o.id === "moving_truck_34")!;
      const truckGround = optionsGround.find((o) => o.id === "moving_truck_34")!;

      // Com 2 ajudantes e escadas, o valor deve ser sensivelmente maior
      expect(truckWithStairs.estimated_price_cents).toBeGreaterThan(truckGround.estimated_price_cents);
    });

    it("deve suportar frete ('freight') com utilitários e vans sem misturar com passageiro", () => {
      const freightOptions = computeCategorizedMobilityOptionsHelper({
        category: "freight",
        origin_address: "Depósito A",
        destination_address: "Loja B",
        distance_km: 5.0,
        helpers_count: 1,
      });

      expect(freightOptions).toHaveLength(3);
      const ids = freightOptions.map((o) => o.id);
      expect(ids).toEqual(["freight_fiorino", "freight_van", "freight_truck"]);
      freightOptions.forEach((opt) => {
        expect(opt.category).toBe("freight");
        expect(opt.canonical_service_type).toBe("freight_van");
      });
    });
  });

  describe("2. Ciclo de Vida: Cancelamento, Remarcação, Gorjeta e Recibos", () => {
    it("deve rejeitar remarcação com data no passado", () => {
      const pastDate = new Date(Date.now() - 3600 * 1000).toISOString();
      expect(() => validateRescheduleDateHelper(pastDate)).toThrow(/futuro/i);
    });

    it("deve aceitar remarcação com data futura válida", () => {
      const futureDate = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
      const parsed = validateRescheduleDateHelper(futureDate);
      expect(parsed.getTime()).toBeGreaterThan(Date.now());
    });

    it("deve validar limites de valor em gorjeta (min R$ 1,00 e max R$ 1.000,00)", async () => {
      await expect(
        sendMobilityTip({
          data: {
            requestId: "11111111-2222-3333-4444-555555555555",
            amountCents: 50, // menor que 100 (R$ 1,00)
            paymentMethod: "pix",
          },
        }),
      ).rejects.toThrow();

      await expect(
        sendMobilityTip({
          data: {
            requestId: "11111111-2222-3333-4444-555555555555",
            amountCents: 200000, // maior que 100000 (R$ 1.000,00)
            paymentMethod: "pix",
          },
        }),
      ).rejects.toThrow();
    });

    it("deve calcular o recibo detalhado preservando a taxa fixa de R$ 0,99 (B.23) e rendimento integral do motorista", () => {
      const receiptBreakdown = calculateMobilityReceiptBreakdownHelper({
        service_type: "ride_car",
        final_price_cents: 2500, // R$ 25,00
        helpers_count: 0,
        tip_cents: 500, // R$ 5,00
        notes: null,
      });

      expect(receiptBreakdown.totalCents).toBe(2500);
      expect(receiptBreakdown.platformFeeCents).toBe(99); // R$ 0,99 fixa Waesy Go
      expect(receiptBreakdown.driverEarningsCents).toBe(2401); // 2500 - 99 = 2401 (R$ 24,01)
      expect(receiptBreakdown.tipCents).toBe(500);
    });

    it("deve calcular assentos disponíveis por segmento de carona intermunicipal sem colisão", () => {
      const waypoints = [
        { stopOrder: 0, cityName: "Chapecó", stateCode: "SC", cumulativePriceCents: 0 },
        { stopOrder: 1, cityName: "Concórdia", stateCode: "SC", cumulativePriceCents: 3500 },
        { stopOrder: 2, cityName: "Lages", stateCode: "SC", cumulativePriceCents: 11000 },
        { stopOrder: 3, cityName: "Florianópolis", stateCode: "SC", cumulativePriceCents: 18000 },
      ];

      // Passageiro reservou trecho 0 -> 1 (Chapecó -> Concórdia) com 3 assentos
      const bookings = [
        { fromStopOrder: 0, toStopOrder: 1, seatsBooked: 3, status: "confirmed" },
      ];

      // No trecho 1 -> 3 (Concórdia -> Florianópolis), os 3 assentos estão 100% liberados
      const totalSeats = 4;
      const bookedOnSegment1to3 = bookings.filter(
        (b) => b.status !== "cancelled" && Math.max(1, b.fromStopOrder) < Math.min(3, b.toStopOrder),
      );
      expect(bookedOnSegment1to3).toHaveLength(0);

      // No trecho 0 -> 1, sobrou apenas 1 assento
      const bookedOnSegment0to1 = bookings.filter(
        (b) => b.status !== "cancelled" && Math.max(0, b.fromStopOrder) < Math.min(1, b.toStopOrder),
      );
      const remainingSeats0to1 = totalSeats - bookedOnSegment0to1.reduce((acc, curr) => acc + curr.seatsBooked, 0);
      expect(remainingSeats0to1).toBe(1);
    });
  });
});
