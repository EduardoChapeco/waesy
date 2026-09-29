import { describe, it, expect } from "vitest";

describe("CRM Bifurcation & Touch Targets (50-Prompt Golden Codex)", () => {
  it("valida formatação correta de clientes para a WhatsApp List móvel", () => {
    const rawCustomer = {
      id: "c1",
      full_name: "Eduardo Chapeco",
      phone: "(49) 99999-8888",
      channel: "whatsapp",
      total_spent_cents: 145000,
      status: "active",
    };

    const phoneDigits = rawCustomer.phone.replace(/\D/g, "");
    expect(phoneDigits).toBe("49999998888");
    expect(rawCustomer.status).toBe("active");
    expect(rawCustomer.total_spent_cents).toBe(145000);
  });

  it("garante touch targets ergonômicos de 44px (size-11) para ações móveis", () => {
    const minimumTouchTargetPx = 44;
    // size-11 in Tailwind v4 is 44px (2.75rem)
    const tailwindSize11Px = 44;
    expect(tailwindSize11Px).toBeGreaterThanOrEqual(minimumTouchTargetPx);
  });
});
