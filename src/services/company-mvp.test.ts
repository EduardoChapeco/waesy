import { describe, it, expect } from "vitest";
import { FastRegisterCompanySchema, UpdateCompanyLeadStatusSchema, ToggleCompanyClassifiedStatusSchema, RegisterWorkspaceProWaitlistSchema, RegisterClassifiedLeadSchema } from "./company-mvp.functions";
import { UpdatePortalCompletoContentSchema, MigrateCompanyToFullWorkspaceSchema } from "./portal-completo.functions";
import { classifiedCategorySchema, CLASSIFIED_CATEGORY_LABELS } from "@/types/community";

describe("Company MVP & Classifieds Niches Contracts", () => {
  it("validates FastRegisterCompanySchema requirements", () => {
    const valid = FastRegisterCompanySchema.safeParse({
      name: "Agência Serra Sol",
      category: "turismo",
      phone: "(49) 98888-7777",
      city: "Chapecó",
      state: "SC",
      bio: "Especialistas em pacotes para o litoral e serra.",
      website: "https://serrasol.com.br",
      instagram: "@serrasol",
    });
    expect(valid.success).toBe(true);

    const invalid = FastRegisterCompanySchema.safeParse({
      name: "A",
      phone: "123",
      city: "",
    });
    expect(invalid.success).toBe(false);
  });

  it("validates UpdateCompanyLeadStatusSchema transitions", () => {
    const valid = UpdateCompanyLeadStatusSchema.safeParse({
      dealId: "11111111-1111-1111-1111-111111111111",
      status: "completed",
      notes: "Negociação finalizada e recibo emitido",
    });
    expect(valid.success).toBe(true);

    const invalid = UpdateCompanyLeadStatusSchema.safeParse({
      dealId: "invalid-uuid",
      status: "unknown_status",
    });
    expect(invalid.success).toBe(false);
  });

  it("validates ToggleCompanyClassifiedStatusSchema", () => {
    const valid = ToggleCompanyClassifiedStatusSchema.safeParse({
      classifiedId: "22222222-2222-2222-2222-222222222222",
      newStatus: "resolved",
    });
    expect(valid.success).toBe(true);

    const invalid = ToggleCompanyClassifiedStatusSchema.safeParse({
      classifiedId: "not-a-uuid",
      newStatus: "invalid",
    });
    expect(invalid.success).toBe(false);
  });

  it("validates RegisterWorkspaceProWaitlistSchema for Workspace Pro", () => {
    const valid = RegisterWorkspaceProWaitlistSchema.safeParse({
      modulesOfInterest: ["pdv", "estoque", "motolink"],
      notes: "Interesse no PDV com KDS e entrega própria MotoLink",
    });
    expect(valid.success).toBe(true);
  });

  it("validates Portal Completo CMS update contract", () => {
    const valid = UpdatePortalCompletoContentSchema.safeParse({
      hero_title: "Workspace Pro para Lojas de Chapecó",
      hero_subtitle: "Gestão completa com PDV, Estoque e Entregadores.",
      video_url: "https://youtube.com/watch?v=12345",
    });
    expect(valid.success).toBe(true);
  });

  it("validates MigrateCompanyToFullWorkspaceSchema 1-clique migration", () => {
    const valid = MigrateCompanyToFullWorkspaceSchema.safeParse({
      waitlistId: "33333333-3333-3333-3333-333333333333",
      storeId: "44444444-4444-4444-4444-444444444444",
    });
    expect(valid.success).toBe(true);
  });

  it("ensures travel and equipment categories are present in community schema", () => {
    expect(classifiedCategorySchema.options).toContain("travel");
    expect(classifiedCategorySchema.options).toContain("equipment");
    expect(CLASSIFIED_CATEGORY_LABELS["travel"]).toBe("Viagem & Roteiro");
    expect(CLASSIFIED_CATEGORY_LABELS["equipment"]).toBe("Aluguel de Equipamentos");
  });

  it("validates RegisterClassifiedLeadSchema contract for instant deal capture", () => {
    const valid = RegisterClassifiedLeadSchema.safeParse({
      classifiedId: "55555555-5555-5555-5555-555555555555",
      buyerName: "Maria Souza",
      buyerPhone: "(49) 99999-1234",
      message: "Tenho interesse no pacote para Cancun!",
      proposedPriceCents: 450000,
    });
    expect(valid.success).toBe(true);

    const invalid = RegisterClassifiedLeadSchema.safeParse({
      classifiedId: "not-a-uuid",
    });
    expect(invalid.success).toBe(false);
  });
});
