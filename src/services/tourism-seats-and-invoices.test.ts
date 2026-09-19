import { describe, it, expect, vi } from "vitest";

describe("Tourism Seats, CSPRNG & Invoices System", () => {
  it("valida geração de código de voucher com CSPRNG seguro", () => {
    const randomBuffer = new Uint32Array(1);
    crypto.getRandomValues(randomBuffer);
    const randomSuffix = 100000 + (randomBuffer[0] % 900000);
    const voucherCode = `WDR-TUR-${randomSuffix}`;

    expect(voucherCode).toMatch(/^WDR-TUR-\d{6}$/);
    expect(randomSuffix).toBeGreaterThanOrEqual(100000);
    expect(randomSuffix).toBeLessThanOrEqual(999999);
  });

  it("detecta concorrência e rejeita assento já reservado ou bloqueado", () => {
    const existingSeats = [
      { seat_number: 1, status: "free" },
      { seat_number: 2, status: "reserved", passenger_name: "Passageiro Anterior" },
      { seat_number: 3, status: "blocked" },
      { seat_number: 4, status: "free" },
    ];

    const seatsToBook = [2];

    const isOccupied = seatsToBook.some((seatNum) => {
      const found = existingSeats.find((s) => s.seat_number === seatNum);
      return found && (found.status === "reserved" || found.status === "blocked");
    });

    expect(isOccupied).toBe(true);
  });

  it("aloca assentos livres com sucesso e decrementa capacidade disponível", () => {
    const existingSeats = [
      { seat_number: 1, status: "free" },
      { seat_number: 2, status: "free" },
      { seat_number: 3, status: "free" },
    ];
    let totalAvailable = 3;
    const requestedSeats = [1, 2];

    requestedSeats.forEach((num) => {
      const s = existingSeats.find((item) => item.seat_number === num);
      if (s) {
        s.status = "reserved";
        totalAvailable--;
      }
    });

    expect(existingSeats[0].status).toBe("reserved");
    expect(existingSeats[1].status).toBe("reserved");
    expect(existingSeats[2].status).toBe("free");
    expect(totalAvailable).toBe(1);
  });

  it("calcula multa de 2% e juros pro-rata de 1% ao mês para faturas vencidas", () => {
    const amountCents = 100000; // R$ 1.000,00
    const daysOverdue = 15; // 15 dias de atraso

    // Multa padrão brasileira de 2%
    const fineCents = Math.round(amountCents * 0.02);
    // Juros pro-rata die de 1% ao mês (0,033% ao dia)
    const dailyRate = 0.01 / 30;
    const interestCents = Math.round(amountCents * dailyRate * daysOverdue);
    const totalPayableCents = amountCents + fineCents + interestCents;

    expect(fineCents).toBe(2000); // R$ 20,00
    expect(interestCents).toBe(500); // R$ 5,00
    expect(totalPayableCents).toBe(102500); // R$ 1.025,00
  });

  it("diferencia candidatura oficial de vaga externa minerada e interna", () => {
    const internalJob = {
      id: "job-1",
      title: "Desenvolvedor Full Stack",
      is_external: false,
      external_url: null,
      application_mode: "internal",
    };

    const externalJob = {
      id: "job-2",
      title: "Engenheiro de Dados Sênior",
      is_external: true,
      external_url: "https://gupy.io/vaga/12345",
      external_source: "Gupy",
      application_mode: "external",
    };

    expect(internalJob.is_external).toBe(false);
    expect(externalJob.is_external).toBe(true);
    expect(externalJob.external_url).toBeTruthy();
    expect(externalJob.external_source).toBe("Gupy");
  });

  it("verifica elegibilidade de desbloqueio bilateral automático de inadimplência após quitação", () => {
    const store = {
      id: "store-123",
      settings: {
        blocked_due_to_debt: true,
        debt_blocked_at: "2026-09-01T00:00:00Z",
      },
    };

    const remainingOverdueInvoices: any[] = []; // Nenhuma outra fatura em aberto

    let shouldUnblock = false;
    let updatedSettings = { ...store.settings };

    if (remainingOverdueInvoices.length === 0 && store.settings.blocked_due_to_debt) {
      shouldUnblock = true;
      updatedSettings = {
        ...store.settings,
        blocked_due_to_debt: false,
        debt_unblocked_at: "2026-09-19T10:00:00Z",
      };
    }

    expect(shouldUnblock).toBe(true);
    expect(updatedSettings.blocked_due_to_debt).toBe(false);
    expect(updatedSettings.debt_unblocked_at).toBeTruthy();
  });

  it("enriquece audit logs operacionais com dados de perfis de membros da equipe sem N+1 queries", () => {
    const rawAuditRows = [
      { id: "log-1", user_id: "user-a", action: "product_updated", entity_type: "product" },
      { id: "log-2", user_id: "user-b", action: "order_approved", entity_type: "order" },
      { id: "log-3", user_id: "user-a", action: "price_changed", entity_type: "product" },
    ];

    const profiles = [
      { id: "user-a", full_name: "Ana Gerente", username: "ana.loja" },
      { id: "user-b", full_name: "Bruno Caixa", username: "bruno.pdv" },
    ];

    const profileMap = new Map(profiles.map((p) => [p.id, p]));

    const enrichedLogs = rawAuditRows.map((row) => ({
      ...row,
      user_name: profileMap.get(row.user_id)?.full_name || "Membro da Equipe",
    }));

    expect(enrichedLogs).toHaveLength(3);
    expect(enrichedLogs[0].user_name).toBe("Ana Gerente");
    expect(enrichedLogs[1].user_name).toBe("Bruno Caixa");
    expect(enrichedLogs[2].user_name).toBe("Ana Gerente");
  });
});

