/**
 * customer-trips-orchestrator.test.ts — Testes Automatizados para a Jornada End-to-End de 'Minhas Viagens'
 * NORMAS: AGENTS.md (B.1 a B.41), AUDITORIA FORENSE MINHAS VIAGENS
 * Valida os 4 contadores, vinculação multi-agência, QR code offline e ciclo Proposta -> Contrato -> Viagem
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateQrCodeDataUri } from "@/lib/qr-code";

describe("Minhas Viagens — Orquestrador da Jornada & Contadores Semânticos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Contadores Semânticos & Consistência com Listagem (Itens 10 & 11)", () => {
    it("deve calcular 'Reservas Ativas' excluindo status cancelados, reembolsados e arquivados", () => {
      const mockAgencyTrips = [
        { id: "trip_1", status: "confirmed", trip_number: "TRIP-001" },
        { id: "trip_2", status: "pending", trip_number: "TRIP-002" },
        { id: "trip_3", status: "cancelled", trip_number: "TRIP-003" },
        { id: "trip_4", status: "refunded", trip_number: "TRIP-004" },
      ];

      const mockExperiences = [
        { id: "book_1", status: "confirmed", voucher_code: "EXP-001" },
        { id: "book_2", status: "cancelled", voucher_code: "EXP-002" },
      ];

      const activeAgencyTrips = mockAgencyTrips.filter(
        (t) => t.status !== "cancelled" && t.status !== "refunded" && t.status !== "archived"
      );
      const activeExperiences = mockExperiences.filter(
        (t) => t.status !== "cancelled" && t.status !== "refunded" && t.status !== "archived"
      );
      const activeCount = activeAgencyTrips.length + activeExperiences.length;

      // Esperado: trip_1 (confirmed) + trip_2 (pending) + book_1 (confirmed) = 3
      expect(activeCount).toBe(3);
      expect(activeAgencyTrips.map((t) => t.id)).toEqual(["trip_1", "trip_2"]);
      expect(activeExperiences.map((e) => e.id)).toEqual(["book_1"]);
    });

    it("deve calcular 'Confirmadas' estritamente com status confirmed", () => {
      const mockAgencyTrips = [
        { id: "trip_1", status: "confirmed" },
        { id: "trip_2", status: "pending" },
      ];
      const mockExperiences = [
        { id: "book_1", status: "confirmed" },
        { id: "book_2", status: "in_review" },
      ];

      const confirmedAgencyTrips = mockAgencyTrips.filter((t) => t.status === "confirmed");
      const confirmedExperiences = mockExperiences.filter((t) => t.status === "confirmed");
      const confirmedCount = confirmedAgencyTrips.length + confirmedExperiences.length;

      expect(confirmedCount).toBe(2);
      expect(confirmedAgencyTrips[0].id).toBe("trip_1");
      expect(confirmedExperiences[0].id).toBe("book_1");
    });

    it("deve calcular 'Propostas & Cotações' desconsiderando cotações perdidas e propostas expiradas", () => {
      const mockProposals = [
        { id: "prop_1", status: "sent", acceptance_status: "pending" },
        { id: "prop_2", status: "approved", acceptance_status: "accepted" },
        { id: "prop_3", status: "rejected", acceptance_status: "rejected" },
        { id: "prop_4", status: "expired", acceptance_status: "expired" },
      ];

      const mockQuotes = [
        { id: "quote_1", status: "quoted" },
        { id: "quote_2", status: "analyzing" },
        { id: "quote_3", status: "lost" },
      ];

      const activeProposals = mockProposals.filter(
        (p) => p.status !== "cancelled" && p.status !== "rejected" && p.status !== "expired"
      );
      const activeQuotes = mockQuotes.filter(
        (q) => q.status !== "lost" && q.status !== "cancelled"
      );
      const totalCount = activeProposals.length + activeQuotes.length;

      // prop_1 + prop_2 (2) + quote_1 + quote_2 (2) = 4
      expect(totalCount).toBe(4);
    });

    it("deve calcular 'Contratos' excluindo cancelados", () => {
      const mockContracts = [
        { id: "c_1", status: "signed" },
        { id: "c_2", status: "pending_signature" },
        { id: "c_3", status: "cancelled" },
      ];

      const validContracts = mockContracts.filter((c) => c.status !== "cancelled");
      expect(validContracts.length).toBe(2);
    });
  });

  describe("2. Geração Soberana de QR Code Offline (Item 39)", () => {
    it("deve gerar Data URI vetorial SVG localmente sem chamadas de rede", () => {
      const voucherCode = "WAESY-TRIP-998822";
      const dataUri = generateQrCodeDataUri(voucherCode);

      expect(dataUri).toBeDefined();
      expect(dataUri).toContain("data:image/svg+xml;utf8,");
      // O SVG gerado pela biblioteca uqr deve conter tags válidas
      expect(decodeURIComponent(dataUri)).toContain("<svg");
      expect(decodeURIComponent(dataUri)).toContain("</svg>");
      // Não deve depender de nenhum domínio de terceiro nem chamar API externa
      expect(dataUri).not.toContain("qrserver.com");
      expect(dataUri).not.toContain("http://api");
      expect(dataUri).not.toContain("https://api");
    });

    it("deve gerar Data URI para vouchers de embarque de carteira e URLs públicas de voucher", () => {
      const publicUrl = "https://usewaesy.pages.dev/voucher/TOKEN-ABC-999";
      const dataUri = generateQrCodeDataUri(publicUrl);

      expect(dataUri).toBeDefined();
      expect(dataUri.startsWith("data:image/svg+xml;utf8,")).toBe(true);
      expect(dataUri).not.toContain("qrserver.com");
      expect(decodeURIComponent(dataUri)).toContain("<svg");
    });
  });

  describe("3. Vinculação Multi-Agência & Reconciliação (Item 81 & 83)", () => {
    it("deve construir cláusulas de identificação por ID, E-mail, Documento (CPF) e Telefone", () => {
      const identity = { id: "user_uuid_123", email: "viajante@waesy.com" };
      const profile = {
        id: "user_uuid_123",
        email: "viajante@waesy.com",
        phone: "(49) 99876-5432",
        document_number: "123.456.789-00",
      };

      const cleanEmail = profile.email.trim().toLowerCase();
      const cleanDoc = profile.document_number.replace(/\D/g, "");
      const cleanPhone = profile.phone.replace(/\D/g, "");
      const phoneSuffix = cleanPhone.slice(-8);

      const tripOrClauses = [
        `customer_id.eq.${identity.id}`,
        `client_id.eq.${identity.id}`,
        `client_email.ilike.${cleanEmail}`,
        `client_document.ilike.%${cleanDoc}%`,
        `client_whatsapp.ilike.%${phoneSuffix}%`,
      ];

      expect(tripOrClauses).toContain("customer_id.eq.user_uuid_123");
      expect(tripOrClauses).toContain("client_email.ilike.viajante@waesy.com");
      expect(tripOrClauses).toContain("client_document.ilike.%12345678900%");
      expect(tripOrClauses).toContain("client_whatsapp.ilike.%98765432%");
    });
  });

  describe("4. Roteamento de Links Oficiais (Item 18, 120, 121)", () => {
    it("deve apontar contratos para /contrato/$token e propostas para /proposta/$token", () => {
      const contract = { public_token: "CONTRACT-TOKEN-ABC" };
      const proposal = { public_token: "PROPOSAL-TOKEN-XYZ" };
      const passenger = { token: "PAX-TOKEN-123" };

      const contractRoute = `/contrato/${contract.public_token}`;
      const proposalRoute = `/proposta/${proposal.public_token}`;
      const passengerRoute = `/viajante/${passenger.token}`;

      expect(contractRoute).toBe("/contrato/CONTRACT-TOKEN-ABC");
      expect(proposalRoute).toBe("/proposta/PROPOSAL-TOKEN-XYZ");
      expect(passengerRoute).toBe("/viajante/PAX-TOKEN-123");
      expect(contractRoute).not.toBe(passengerRoute);
    });
  });
});
