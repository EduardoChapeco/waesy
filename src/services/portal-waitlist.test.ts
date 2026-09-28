import { describe, it, expect } from "vitest";
import { JoinPortalWaitlistSchema } from "./portal-waitlist.functions";

describe("Portal Waitlist Contracts (BFF)", () => {
  it("valida schema de inscrição na lista VIP com módulos de interesse", () => {
    const validEntry = {
      companyName: "Restaurante e Churrascaria Sul",
      contactEmail: "contato@churrascariasul.com.br",
      contactPhone: "49999112233",
      primaryNiche: "gastronomia",
      interestedModules: ["pdv", "delivery", "estoque", "financeiro"],
      currentMonthlyOrders: 450,
      notes: "Queremos migrar assim que o PDV de comandas estiver disponível",
    };

    const parsed = JoinPortalWaitlistSchema.parse(validEntry);
    expect(parsed.companyName).toBe("Restaurante e Churrascaria Sul");
    expect(parsed.interestedModules.length).toBe(4);
    expect(parsed.currentMonthlyOrders).toBe(450);
  });

  it("rejeita inscrição sem nome ou sem telefone", () => {
    const invalidEntry = {
      companyName: "",
      contactPhone: "",
      primaryNiche: "gastronomia",
    };

    expect(() => JoinPortalWaitlistSchema.parse(invalidEntry)).toThrow();
  });

  it("rejeita e-mail malformado na inscrição", () => {
    const invalidEmail = {
      companyName: "Agência Viagem dos Sonhos",
      contactEmail: "email-invalido-sem-arroba",
      contactPhone: "49988776655",
      primaryNiche: "turismo",
    };

    expect(() => JoinPortalWaitlistSchema.parse(invalidEmail)).toThrow();
  });
});
