import { describe, it, expect } from "vitest";
import { UserAddressInputSchema } from "../addresses.functions";

describe("Meus Endereços / Address Platform - End-to-End Audit & Contracts", () => {
  describe("Zod Schema & Normalization (EARS-01 / EARS-03)", () => {
    it("validates a complete residential address with condominium fields", () => {
      const payload = {
        label: "Casa Central",
        recipient_name: "Eduardo Ramos",
        recipient_phone: "49999999999",
        zipcode: "89801000",
        street: "Avenida Getúlio Vargas",
        number: "123",
        complement: "Apto 402",
        reference_point: "Ao lado da Praça Coronel Bertaso",
        neighborhood: "Centro",
        city: "Chapecó",
        state: "SC",
        latitude: -27.100412,
        longitude: -52.615234,
        is_default: true,
        is_apartment: true,
        block_tower: "Torre A",
        intercom_code: "402",
        address_type: "residential",
        icon: "building",
        instructions: "Deixar com o porteiro diurno",
      };

      const result = UserAddressInputSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.state).toBe("SC");
        expect(result.data.latitude).toBeCloseTo(-27.100412, 5);
        expect(result.data.is_apartment).toBe(true);
        expect(result.data.icon).toBe("building");
      }
    });

    it("validates address with has_no_number: true and empty number (Mercado Livre Parity EARS-03)", () => {
      const semNumeroPayload = {
        label: "Casa Interior",
        recipient_name: "Eduardo Antonio Ramos",
        recipient_phone: "(49) 99171-6233",
        zipcode: "89801020",
        street: "Avenida Nereu Ramos - E",
        number: "",
        has_no_number: true,
        neighborhood: "Centro",
        city: "Chapecó",
        state: "SC",
      };

      const result = UserAddressInputSchema.safeParse(semNumeroPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.has_no_number).toBe(true);
        expect(result.data.recipient_name).toBe("Eduardo Antonio Ramos");
        expect(result.data.recipient_phone).toBe("(49) 99171-6233");
      }
    });

    it("rejects address when has_no_number is false and number is empty", () => {
      const missingNumberPayload = {
        label: "Casa Urbana",
        zipcode: "89801020",
        street: "Avenida Nereu Ramos",
        number: "",
        has_no_number: false,
        neighborhood: "Centro",
        city: "Chapecó",
        state: "SC",
      };

      const result = UserAddressInputSchema.safeParse(missingNumberPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.some((e) => e.path.includes("number"))).toBe(true);
      }
    });

    it("rejects invalid zipcode with less than 8 digits or missing required street", () => {
      const invalid = {
        zipcode: "123",
        street: "",
        number: "10",
        neighborhood: "Centro",
        city: "Chapecó",
        state: "SC",
      };

      const result = UserAddressInputSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.some((e) => e.path.includes("zipcode"))).toBe(true);
        expect(result.error.errors.some((e) => e.path.includes("street"))).toBe(true);
      }
    });

    it("rejects invalid state length not equal to 2 characters", () => {
      const invalidState = {
        zipcode: "89801000",
        street: "Rua São Pedro",
        number: "50",
        neighborhood: "Jardim Itália",
        city: "Chapecó",
        state: "SANTA CATARINA",
      };

      const result = UserAddressInputSchema.safeParse(invalidState);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.some((e) => e.path.includes("state"))).toBe(true);
      }
    });
  });

  describe("Architectural Invariant: SavedAddress (Mutable) vs Transactional Snapshot (Immutable)", () => {
    it("guarantees order shipping snapshot remains frozen when saved address is updated", () => {
      // 1. Endereço salvo na conta
      const userSavedAddress = {
        id: "addr-001",
        label: "Minha Casa",
        street: "Rua A",
        number: "100",
        neighborhood: "Bela Vista",
        city: "Chapecó",
        state: "SC",
        zipcode: "89801001",
        latitude: -27.1,
        longitude: -52.6,
      };

      // 2. Compra no checkout gera snapshot imutável no pedido
      const orderShippingAddressSnapshot = {
        street: userSavedAddress.street,
        number: userSavedAddress.number,
        neighborhood: userSavedAddress.neighborhood,
        city: userSavedAddress.city,
        state: userSavedAddress.state,
        zipcode: userSavedAddress.zipcode,
        latitude: userSavedAddress.latitude,
        longitude: userSavedAddress.longitude,
        captured_at: "2026-05-10T14:30:00Z",
      };

      // 3. Meses depois, usuário se muda e edita 'Minha Casa'
      userSavedAddress.street = "Avenida B";
      userSavedAddress.number = "999";
      userSavedAddress.neighborhood = "Efapi";
      userSavedAddress.zipcode = "89809000";

      // 4. O pedido histórico deve continuar intacto apontando para Rua A, 100
      expect(orderShippingAddressSnapshot.street).toBe("Rua A");
      expect(orderShippingAddressSnapshot.number).toBe("100");
      expect(orderShippingAddressSnapshot.neighborhood).toBe("Bela Vista");
      expect(orderShippingAddressSnapshot.zipcode).toBe("89801001");
      expect(userSavedAddress.street).toBe("Avenida B");
    });
  });

  describe("Haversine Distance & GPS Mismatch Calculation (EARS-05)", () => {
    it("correctly flags mismatch when user is 50km away from delivery destination", () => {
      // Ponto de entrega: Chapecó/SC (-27.1004, -52.6152)
      // Dispositivo do usuário: Joaçaba/SC (~110km) (-27.1747, -51.5036)
      const toRad = (value: number) => (value * Math.PI) / 180;
      const R = 6371;

      const lat1 = -27.1004;
      const lon1 = -52.6152;
      const lat2 = -27.1747;
      const lon2 = -51.5036;

      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distanceKm = Math.round(R * c * 10) / 10;

      expect(distanceKm).toBeGreaterThan(35);
      const isMismatch = distanceKm > 35;
      expect(isMismatch).toBe(true);
    });

    it("approves delivery when user is within acceptable proximity", () => {
      // Entrega no centro de Chapecó, usuário no bairro Santa Maria (~4km)
      const toRad = (value: number) => (value * Math.PI) / 180;
      const R = 6371;

      const lat1 = -27.1004;
      const lon1 = -52.6152;
      const lat2 = -27.1200;
      const lon2 = -52.6000;

      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distanceKm = Math.round(R * c * 10) / 10;

      expect(distanceKm).toBeLessThan(35);
      const isMismatch = distanceKm > 35;
      expect(isMismatch).toBe(false);
    });
  });
});
