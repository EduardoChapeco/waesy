import { describe, it, expect, beforeEach } from "vitest";
import { generateQrCodeSvg, generateQrCodeDataUri } from "@/lib/qr-code";
import {
  signTicketPayload,
  verifyTicketPayload,
} from "@/lib/ticket-crypto";

describe("Módulo de Ingressos — Ciclo de Vida Completo, WCTS-1 & Segurança Portaria", () => {
  describe("Geração de QR Code 100% Offline (Sem Dependências Externas)", () => {
    it("deve gerar SVG de QR Code válido e puro localmente", () => {
      const payload = "v1:TKT:test-ticket-123:1700000000:abcd1234ef";
      const svg = generateQrCodeSvg(payload);

      expect(svg).toBeDefined();
      expect(typeof svg).toBe("string");
      expect(svg).toContain("<svg");
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain("viewBox=");
      expect(svg).toContain("<path");
      expect(svg).toContain("</svg>");
    });

    it("deve gerar Data URI no formato SVG válido para elementos <img>", () => {
      const payload = "W-TKT-A1B2C3-7";
      const dataUri = generateQrCodeDataUri(payload);

      expect(dataUri).toBeDefined();
      expect(dataUri.startsWith("data:image/svg+xml;utf8,")).toBe(true);
      // O SVG codificado deve conter componentes vitais
      const decoded = decodeURIComponent(dataUri.replace("data:image/svg+xml;utf8,", ""));
      expect(decoded).toContain("<svg");
      expect(decoded).toContain("</svg>");
    });

    it("deve suportar payloads longos criptografados sem truncamento", () => {
      const longPayload = "v1:TKT:" + "a".repeat(36) + ":" + Date.now() + ":" + "f".repeat(64);
      const svg = generateQrCodeSvg(longPayload);

      expect(svg).toContain("<svg");
      expect(svg).toContain("<path");
    });
  });

  describe("Criptografia Tamper-Proof WCTS-1 (HMAC-SHA256 & Human Code Mod-36)", () => {
    const ticketId = "987e6543-e21b-12d3-a456-426614174000";
    const eventId = "event-test-001";
    const lotId = "lot-vip-001";
    const ownerProfileId = "user-profile-001";
    const issuedAt = 1718000000;

    it("deve gerar assinatura HMAC-SHA256 determinística no padrão WCTS-1", () => {
      const signed = signTicketPayload({
        ticketId,
        eventId,
        lotId,
        ownerProfileId,
        issuedAt,
      });

      expect(signed).toBeDefined();
      expect(signed.ticketId).toBe(ticketId);
      expect(signed.signature).toHaveLength(64); // SHA-256 hex string
      expect(signed.qrPayload).toBe(`v1:TKT:${ticketId}:${issuedAt}:${signed.signature}`);

      // Mesmos parâmetros devem gerar a mesma assinatura
      const signed2 = signTicketPayload({
        ticketId,
        eventId,
        lotId,
        ownerProfileId,
        issuedAt,
      });
      expect(signed2.signature).toBe(signed.signature);
      expect(signed2.qrPayload).toBe(signed.qrPayload);
    });

    it("deve validar com sucesso um payload WCTS-1 íntegro com seu contexto", () => {
      const signed = signTicketPayload({
        ticketId,
        eventId,
        lotId,
        ownerProfileId,
        issuedAt,
      });

      const verification = verifyTicketPayload(signed.qrPayload, {
        eventId,
        lotId,
        ownerProfileId,
      });
      expect(verification.isValid).toBe(true);
      expect(verification.ticketId).toBe(ticketId);
    });

    it("deve rejeitar payload adulterado em qualquer campo (Tamper-Proof)", () => {
      const signed = signTicketPayload({
        ticketId,
        eventId,
        lotId,
        ownerProfileId,
        issuedAt,
      });

      // Adulteração do ID do ingresso
      const tamperedIdPayload = `v1:TKT:fake-id-123:${issuedAt}:${signed.signature}`;
      expect(verifyTicketPayload(tamperedIdPayload, { eventId, lotId, ownerProfileId }).isValid).toBe(false);

      // Adulteração do timestamp de emissão
      const tamperedTimePayload = `v1:TKT:${ticketId}:${issuedAt + 100}:${signed.signature}`;
      expect(verifyTicketPayload(tamperedTimePayload, { eventId, lotId, ownerProfileId }).isValid).toBe(false);

      // Adulteração da assinatura
      const tamperedSigPayload = `v1:TKT:${ticketId}:${issuedAt}:ffff${signed.signature.slice(4)}`;
      expect(verifyTicketPayload(tamperedSigPayload, { eventId, lotId, ownerProfileId }).isValid).toBe(false);

      // Contexto adulterado (outro evento tentando usar a mesma assinatura)
      expect(verifyTicketPayload(signed.qrPayload, { eventId: "other-event", lotId, ownerProfileId }).isValid).toBe(false);
    });

    it("deve gerar Human Code legível com checksum Mod-36", () => {
      const signed = signTicketPayload({
        ticketId,
        eventId,
        lotId,
        ownerProfileId,
        issuedAt,
      });

      expect(signed.humanCode).toBeDefined();
      expect(signed.humanCode.startsWith("W-TKT-")).toBe(true);
      const parts = signed.humanCode.split("-");
      expect(parts).toHaveLength(4);
      expect(parts[0]).toBe("W");
      expect(parts[1]).toBe("TKT");
      expect(parts[2]).toHaveLength(8);
      expect(parts[3]).toHaveLength(2);
    });
  });

  describe("8 Fluxos Canônicos de Ciclo de Vida do Ingresso", () => {
    interface MockTicket {
      id: string;
      event_id: string;
      lot_id: string;
      profile_id: string;
      status: "valid" | "used" | "cancelled" | "revoked" | "pending";
      qr_payload: string;
      human_code: string;
      recipient_name: string;
      checkin_at?: string | null;
      cancelled_at?: string | null;
      cancellation_reason?: string | null;
      transferred_to_email?: string | null;
    }

    interface MockLot {
      id: string;
      event_id: string;
      capacity: number;
      sold_count: number;
      price_cents: number;
    }

    let ticketsTable: MockTicket[];
    let lotsTable: MockLot[];
    let lifecycleLogs: any[];

    beforeEach(() => {
      ticketsTable = [];
      lotsTable = [
        {
          id: "lot-1",
          event_id: "event-a",
          capacity: 100,
          sold_count: 50,
          price_cents: 10000,
        },
        {
          id: "lot-free",
          event_id: "event-a",
          capacity: 200,
          sold_count: 10,
          price_cents: 0,
        },
        {
          id: "lot-b",
          event_id: "event-b",
          capacity: 50,
          sold_count: 5,
          price_cents: 5000,
        },
      ];
      lifecycleLogs = [];
    });

    // Helper de simulação de emissão com WCTS-1
    function issueTicket(lotId: string, profileId: string, recipientName: string, isPaid: boolean) {
      const lot = lotsTable.find((l) => l.id === lotId);
      if (!lot) throw new Error("Lote não encontrado.");
      if (lot.sold_count >= lot.capacity) throw new Error("Lote esgotado.");

      const ticketId = `tkt-${Math.random().toString(36).slice(2, 9)}`;
      const issuedAt = Math.floor(Date.now() / 1000);
      const signed = signTicketPayload({
        ticketId,
        eventId: lot.event_id,
        lotId: lot.id,
        ownerProfileId: profileId,
        issuedAt,
      });

      const ticket: MockTicket = {
        id: ticketId,
        event_id: lot.event_id,
        lot_id: lot.id,
        profile_id: profileId,
        status: isPaid ? "valid" : "pending",
        qr_payload: signed.qrPayload,
        human_code: signed.humanCode,
        recipient_name: recipientName,
      };

      ticketsTable.push(ticket);
      lot.sold_count += 1;
      lifecycleLogs.push({
        ticket_id: ticketId,
        event_type: "issued",
        created_at: new Date().toISOString(),
      });

      return ticket;
    }

    // Helper de simulação de check-in atômico (Postgres UPDATE ... WHERE status = 'valid')
    function validateCheckin(ticketId: string, eventId: string) {
      const ticket = ticketsTable.find((t) => t.id === ticketId);
      if (!ticket) {
        return { success: false, code: "NOT_FOUND", message: "Ingresso inexistente." };
      }

      // Verificação de Multitenancy do Evento
      if (ticket.event_id !== eventId) {
        return { success: false, code: "WRONG_EVENT", message: "Ingresso pertence a outro evento." };
      }

      // Barreira de Pagamento / Status
      if (ticket.status === "pending") {
        return { success: false, code: "PAYMENT_PENDING", message: "Pagamento não confirmado." };
      }

      if (ticket.status === "revoked" || ticket.status === "cancelled") {
        return { success: false, code: "REVOKED", message: "Ingresso cancelado ou revogado." };
      }

      if (ticket.status === "used") {
        return {
          success: false,
          code: "ALREADY_USED",
          message: `Ingresso já utilizado em ${ticket.checkin_at}.`,
        };
      }

      // Operação atômica
      ticket.status = "used";
      ticket.checkin_at = new Date().toISOString();
      lifecycleLogs.push({
        ticket_id: ticketId,
        event_type: "checkin_validated",
        created_at: ticket.checkin_at,
      });

      return { success: true, ticket };
    }

    // Fluxo 1: Compra/emissão -> recebe WCTS-1 -> abre QR -> check-in na portaria
    it("Fluxo 1: deve emitir ingresso com credencial WCTS-1 e realizar check-in com sucesso", () => {
      const ticket = issueTicket("lot-1", "user-123", "João Silva", true);

      expect(ticket.status).toBe("valid");
      expect(ticket.qr_payload.startsWith("v1:TKT:")).toBe(true);

      const checkinResult = validateCheckin(ticket.id, "event-a");
      expect(checkinResult.success).toBe(true);
      expect(checkinResult.ticket?.status).toBe("used");
      expect(checkinResult.ticket?.checkin_at).toBeDefined();
    });

    // Fluxo 2: Pagamento pendente/falho -> ingresso não utilizável
    it("Fluxo 2: deve barrar check-in de ingresso com status pendente de pagamento", () => {
      const ticket = issueTicket("lot-1", "user-123", "Carlos Santos", false);
      expect(ticket.status).toBe("pending");

      const checkinResult = validateCheckin(ticket.id, "event-a");
      expect(checkinResult.success).toBe(false);
      expect(checkinResult.code).toBe("PAYMENT_PENDING");
    });

    // Fluxo 3: Idempotência na emissão e confirmação de pagamento
    it("Fluxo 3: confirmação de pagamento não deve duplicar emissão de ingresso", () => {
      const ticket = issueTicket("lot-1", "user-123", "Maria Souza", false);
      expect(ticketsTable.filter((t) => t.id === ticket.id)).toHaveLength(1);

      // Simula webhook ou confirmação idempotente de pagamento
      function confirmPayment(tktId: string) {
        const t = ticketsTable.find((x) => x.id === tktId);
        if (t && t.status === "pending") {
          t.status = "valid";
        }
      }

      confirmPayment(ticket.id);
      confirmPayment(ticket.id); // Chamada duplicada/retry

      expect(ticket.status).toBe("valid");
      expect(ticketsTable.filter((t) => t.id === ticket.id)).toHaveLength(1);
    });

    // Fluxo 4: Cancelamento do evento -> status do ingresso atualizado para revogado
    it("Fluxo 4: cancelamento do evento deve revogar todos os ingressos emitidos", () => {
      const t1 = issueTicket("lot-1", "user-1", "Pessoa 1", true);
      const t2 = issueTicket("lot-1", "user-2", "Pessoa 2", true);

      // Cancelamento do evento em lote
      function cancelEvent(eventId: string, reason: string) {
        ticketsTable
          .filter((t) => t.event_id === eventId)
          .forEach((t) => {
            t.status = "revoked";
            t.cancellation_reason = reason;
            t.cancelled_at = new Date().toISOString();
          });
      }

      cancelEvent("event-a", "Evento cancelado devido a condições climáticas");

      expect(t1.status).toBe("revoked");
      expect(t2.status).toBe("revoked");

      // Tentativa de entrada na portaria deve ser bloqueada
      const checkinAttempt = validateCheckin(t1.id, "event-a");
      expect(checkinAttempt.success).toBe(false);
      expect(checkinAttempt.code).toBe("REVOKED");
    });

    // Fluxo 5: Desistência/cancelamento pelo titular -> devolução de vaga ao lote -> ingresso invalidado
    it("Fluxo 5: desistência pelo titular deve devolver vaga ao lote e registrar log", () => {
      const lot = lotsTable.find((l) => l.id === "lot-1")!;
      const initialSoldCount = lot.sold_count;

      const ticket = issueTicket("lot-1", "user-123", "Desistente", true);
      expect(lot.sold_count).toBe(initialSoldCount + 1);

      // Cancelamento pelo titular
      function cancelByCustomer(ticketId: string, reason: string) {
        const t = ticketsTable.find((x) => x.id === ticketId);
        if (!t) throw new Error("Ingresso não encontrado");
        if (t.status !== "valid") throw new Error("Apenas ingressos válidos podem ser cancelados");

        t.status = "revoked";
        t.cancelled_at = new Date().toISOString();
        t.cancellation_reason = reason;

        // Devolução atômica ao lote
        const parentLot = lotsTable.find((l) => l.id === t.lot_id);
        if (parentLot && parentLot.sold_count > 0) {
          parentLot.sold_count -= 1;
        }

        lifecycleLogs.push({
          ticket_id: ticketId,
          event_type: "cancelled_by_customer",
          reason,
        });
      }

      cancelByCustomer(ticket.id, "Imprevisto pessoal de trabalho");

      expect(ticket.status).toBe("revoked");
      expect(ticket.cancellation_reason).toBe("Imprevisto pessoal de trabalho");
      expect(lot.sold_count).toBe(initialSoldCount); // Vaga devolvida!

      // Check-in na portaria deve ser rejeitado
      expect(validateCheckin(ticket.id, "event-a").success).toBe(false);
    });

    // Fluxo 6: Duas leituras concorrentes de check-in -> apenas uma tem sucesso
    it("Fluxo 6: corridas concorrentes de check-in devem aprovar estritamente a primeira leitura", () => {
      const ticket = issueTicket("lot-1", "user-123", "Titular Único", true);

      // Simulação de duas portas ou dois operadores bipando o mesmo QR simultaneamente
      const attempt1 = validateCheckin(ticket.id, "event-a");
      const attempt2 = validateCheckin(ticket.id, "event-a");

      expect(attempt1.success).toBe(true);
      expect(attempt2.success).toBe(false);
      expect(attempt2.code).toBe("ALREADY_USED");
      expect(attempt2.message).toContain("já utilizado");
    });

    // Fluxo 7: Multitenancy: Organizador A não valida nem visualiza ingressos do Organizador B
    it("Fluxo 7: ingresso do Evento A não pode ser validado na portaria do Evento B", () => {
      const ticketA = issueTicket("lot-1", "user-a", "Cliente Evento A", true);

      // Tentativa de validação com event_id do Evento B
      const resultCrossTenant = validateCheckin(ticketA.id, "event-b");

      expect(resultCrossTenant.success).toBe(false);
      expect(resultCrossTenant.code).toBe("WRONG_EVENT");
      expect(ticketA.status).toBe("valid"); // Permanece intacto
    });

    // Fluxo 8: Histórico pós-evento: ingresso utilizado preservado com timestamp
    it("Fluxo 8: ingresso utilizado deve ser preservado para auditoria e histórico civil", () => {
      const ticket = issueTicket("lot-1", "user-history", "Participante Presente", true);
      const res = validateCheckin(ticket.id, "event-a");

      expect(res.success).toBe(true);
      expect(ticket.status).toBe("used");
      expect(ticket.checkin_at).toBeDefined();

      // Histórico preservado na tabela
      const historyRecord = ticketsTable.find((t) => t.id === ticket.id);
      expect(historyRecord).toBeDefined();
      expect(historyRecord?.recipient_name).toBe("Participante Presente");
      expect(historyRecord?.status).toBe("used");

      // Logs de ciclo de vida associados
      const logs = lifecycleLogs.filter((l) => l.ticket_id === ticket.id);
      expect(logs.length).toBeGreaterThanOrEqual(2); // issued + checkin_validated
    });

    // Bônus: Transferência de Titularidade com Revogação de QR Anterior
    it("Transferência: deve revogar código anterior e emitir nova credencial nominal", () => {
      const oldTicket = issueTicket("lot-1", "user-origem", "Dono Anterior", true);
      const oldQr = oldTicket.qr_payload;
      const oldHumanCode = oldTicket.human_code;

      function transferTicket(tktId: string, newName: string, newEmail: string) {
        const t = ticketsTable.find((x) => x.id === tktId);
        if (!t || t.status !== "valid") throw new Error("Ingresso não elegível para transferência.");

        // Revoga anterior
        t.status = "revoked";
        t.cancellation_reason = `Transferido para ${newName} (${newEmail})`;

        // Emite novo ingresso transferido
        const newTicket = issueTicket(t.lot_id, "user-destino", newName, true);
        lifecycleLogs.push({
          ticket_id: t.id,
          event_type: "transferred_out",
          transferred_to_ticket_id: newTicket.id,
        });

        return newTicket;
      }

      const newTicket = transferTicket(oldTicket.id, "Novo Dono", "novodono@waesy.com");

      // Código antigo deve estar revogado
      expect(oldTicket.status).toBe("revoked");
      expect(validateCheckin(oldTicket.id, "event-a").success).toBe(false);

      // Novo ingresso deve estar válido com novo QR e novo código
      expect(newTicket.status).toBe("valid");
      expect(newTicket.recipient_name).toBe("Novo Dono");
      expect(newTicket.qr_payload).not.toBe(oldQr);
      expect(newTicket.human_code).not.toBe(oldHumanCode);

      // Novo ingresso deve conseguir fazer check-in normalmente
      expect(validateCheckin(newTicket.id, "event-a").success).toBe(true);
    });
  });
});
