import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  buildVisibleProposalCustomFieldEntries,
  formatProposalPaymentTermsForDisplay,
  isEditableCustomFieldInProposalStudio,
  sanitizeLeadCustomFieldsForProposal,
} from "@/lib/tourism/proposal-custom-fields";
import { proposalToEditorialClassified } from "@/lib/tourism/proposal-editorial-mapper";
import { ProposalCanvasRenderer } from "@/components/tourism/studio/proposal-canvas-renderer";

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const chain: any = {
      validator: () => chain,
      handler: (fn: any) => fn,
    };
    return chain;
  },
}));

const mockState = {
  identity: { id: "user-1", role: "admin", store_id: "store-1" },
  lastInsertedProposal: null as Record<string, any> | null,
  legacyPollutedDbRow: null as Record<string, any> | null,
};

function createSupabaseChain(
  table: string,
  resolveFn: (table: string, mode: string) => any,
) {
  let currentMode = "select";
  const chain: any = {
    select: () => {
      return chain;
    },
    eq: () => chain,
    order: () => chain,
    limit: () => chain,
    insert: (payload: any) => {
      currentMode = "insert";
      if (table === "travel_proposals") {
        mockState.lastInsertedProposal = payload;
      }
      return chain;
    },
    update: () => {
      currentMode = "update";
      return chain;
    },
    maybeSingle: async () => resolveFn(table, currentMode),
    single: async () => resolveFn(table, currentMode),
  };
  return chain;
}

vi.mock("@/lib/supabase", () => ({
  getServerClient: () => ({
    from: (table: string) => {
      if (table === "travel_proposals") {
        return createSupabaseChain(table, (_, mode) => {
          if (mode === "insert") {
            return {
              data: { id: "prop-new-1", public_token: "prop_new_token" },
              error: null,
            };
          }
          return { data: mockState.legacyPollutedDbRow, error: null };
        });
      }
      return createSupabaseChain(table, (_, mode) => {
        if (mode === "insert") {
          return { data: { id: "quote-fallback-1" }, error: null };
        }
        return { data: null, error: null };
      });
    },
    rpc: async () => ({ data: null, error: null }),
  }),
}));

vi.mock("@/lib/server-access", () => ({
  getServerIdentity: async () => mockState.identity,
  requireStaff: async () => mockState.identity,
}));

vi.mock("@/services/travel-proposal-enrichment.server", () => ({
  resolveProposalParticipantsEnrichment: async () => ({
    storeRow: { id: "store-1", name: "Excelência Tour SMO" },
    agencySignature: {
      agency_name: "Excelência Tour SMO",
      agency_logo_url: null,
      agency_email: "contato@excelenciatour.com.br",
      agency_phone: "4936210000",
      agency_whatsapp: "49999990000",
      agent_name: "Consultora Ana",
      agent_whatsapp: "49999990000",
    },
    resolvedClient: {
      customer_id: null,
      lead_id: null,
      client_name: "Estevan",
      client_whatsapp: "49999991111",
      client_email: "estevan@example.com",
      client_document: null,
      selected_customer_label: null,
    },
  }),
}));

describe("M11 — Sanitização E2E de Campos Internos CRM em Propostas", () => {
  beforeEach(() => {
    mockState.lastInsertedProposal = null;
    mockState.legacyPollutedDbRow = null;
  });

  it("remove integralmente campos internos CRM/saúde/atribuição/blobs preservando termos comerciais reais", () => {
    const dirtyLeadFields: Record<string, unknown> = {
      pcd: false,
      source: "instagram",
      comments: [
        {
          id: "comm-1794666374464",
          date: "14/11/2026, 11:26:14",
          text: "Documento PDF gerado e vinculado ao Card: Ficha de Embarque e Acessibilidade - Porto Seguro.pdf",
          author: "Sistema de Documentos",
        },
      ],
      attachments: ["Ficha de Embarque e Acessibilidade - Porto Seguro.pdf"],
      bebes: 0,
      autism_spectrum: false,
      checklist_groups: [
        {
          id: "default-checklist",
          title: "Checklist de Atendimento",
          items: [
            { id: "item-1", done: false, text: "Primeiro contato via WhatsApp realizado" },
          ],
        },
      ],
      reduced_mobility: false,
      payment_plan: { boletoInstallments: 15, pixDiscountPct: 5 },
      lgpd_consent: true,
      fbp: "fb.1.12345",
      legacy_comment_blob:
        "Id: comm-1794666374464 | Date: 14/11/2026, 11:26:14 | Text: Documento PDF gerado | Author: Sistema de Documentos",
      legacy_checklist_blob:
        "Id: default-checklist | Items: Id: item-1 | Done: Nao | Text: Primeiro contato | Title: Checklist de Atendimento",
      canvas_bg_color: "#ffffff",
      boarding_requirements: "RG original emitido há menos de 10 anos.",
      franquia_bagagem: "1 mala despachada 23kg + 1 bagagem de mão 10kg",
    };

    const sanitizedLead = sanitizeLeadCustomFieldsForProposal(dirtyLeadFields);
    expect(sanitizedLead).toEqual({
      canvas_bg_color: "#ffffff",
      boarding_requirements: "RG original emitido há menos de 10 anos.",
      franquia_bagagem: "1 mala despachada 23kg + 1 bagagem de mão 10kg",
    });

    const visibleEntries = buildVisibleProposalCustomFieldEntries(dirtyLeadFields);
    expect(visibleEntries).toEqual([
      {
        key: "franquia_bagagem",
        label: "Franquia Bagagem",
        value: "1 mala despachada 23kg + 1 bagagem de mão 10kg",
      },
    ]);

    expect(isEditableCustomFieldInProposalStudio("checklist_groups", dirtyLeadFields.checklist_groups)).toBe(false);
    expect(isEditableCustomFieldInProposalStudio("pcd", false)).toBe(false);
    expect(isEditableCustomFieldInProposalStudio("franquia_bagagem", "23kg")).toBe(true);
  });

  it("formata termos comerciais separados por pipe em lista legível", () => {
    const formatted = formatProposalPaymentTermsForDisplay(
      "Boleto: Até 15x de R$ 532,75 | Cartão: Até 15x sem juros | À Vista no Pix: R$ 7.591,74",
    );
    expect(formatted).toContain("Condições de Pagamento:");
    expect(formatted).toContain("• Boleto: Até 15x de R$ 532,75");
    expect(formatted).toContain("• Cartão: Até 15x sem juros");
    expect(formatted).toContain("• À Vista no Pix: R$ 7.591,74");
  });

  it("sanitiza na camada BFF tanto na criação quanto na reidratação de registros legados em travel_proposals", async () => {
    const { createTravelProposal, getTravelProposalById, getPublicTravelProposalByToken } = await import(
      "@/services/travel-proposal.functions"
    );

    await createTravelProposal({
      data: {
        title: "Proposta Porto Seguro",
        clientName: "Estevan",
        clientWhatsapp: "49999991111",
        destinationCity: "Porto Seguro",
        customFields: {
          pcd: false,
          source: "instagram",
          comments: [{ id: "comm-1", text: "Interno" }],
          attachments: ["Ficha.pdf"],
          bebes: 0,
          autism_spectrum: false,
          checklist_groups: [{ id: "default-checklist", items: [] }],
          reduced_mobility: false,
          embarque_vip: "Aeroporto Chapecó",
        },
        status: "sent",
      },
    });

    expect(mockState.lastInsertedProposal?.custom_fields).toEqual(
      expect.objectContaining({
        embarque_vip: "Aeroporto Chapecó",
        agent_name: "Consultora Ana",
      }),
    );
    expect(mockState.lastInsertedProposal?.custom_fields).not.toHaveProperty("pcd");
    expect(mockState.lastInsertedProposal?.custom_fields).not.toHaveProperty("source");
    expect(mockState.lastInsertedProposal?.custom_fields).not.toHaveProperty("comments");
    expect(mockState.lastInsertedProposal?.custom_fields).not.toHaveProperty("attachments");
    expect(mockState.lastInsertedProposal?.custom_fields).not.toHaveProperty("bebes");
    expect(mockState.lastInsertedProposal?.custom_fields).not.toHaveProperty("autism_spectrum");
    expect(mockState.lastInsertedProposal?.custom_fields).not.toHaveProperty("checklist_groups");
    expect(mockState.lastInsertedProposal?.custom_fields).not.toHaveProperty("reduced_mobility");

    mockState.legacyPollutedDbRow = {
      id: "9cdeb0c9-4bc2-490a-a90e-ad355b591111",
      store_id: "store-1",
      public_token: "prop_legacy_estevan",
      title: "Proposta Porto Seguro",
      client_name: "Estevan",
      client_whatsapp: "49999991111",
      destination_city: "Porto Seguro",
      status: "sent",
      visibility_mode: "public",
      is_hidden: false,
      adults_count: 2,
      children_count: 0,
      flights: [],
      hotels: [],
      itinerary: [],
      transfers: [],
      tours: [],
      rooms: [],
      includes: [],
      excludes: [],
      custom_fields: {
        pcd: false,
        source: "instagram",
        comments: "Id: comm-1794666374464 | Date: 14/11/2026, 11:26:14 | Text: Documento PDF gerado | Author: Sistema de Documentos",
        attachments: "Ficha de Embarque e Acessibilidade - Porto Seguro.pdf",
        bebes: 0,
        autism_spectrum: false,
        checklist_groups: "Id: default-checklist | Items: Id: item-1 | Done: Nao | Title: Checklist de Atendimento",
        reduced_mobility: false,
        franquia_bagagem: "1 mala despachada 23kg",
      },
      pricing: {
        currency: "BRL",
        total_price_cents: 799130,
        total_cents: 799130,
        payment_terms: "Boleto: Até 15x | Cartão: Até 15x | À Vista no Pix: R$ 7.591,74",
      },
    };

    const staffDto = await getTravelProposalById({ data: { id: "prop_legacy_estevan" } });
    expect(staffDto?.custom_fields).not.toHaveProperty("pcd");
    expect(staffDto?.custom_fields).not.toHaveProperty("comments");
    expect(staffDto?.custom_fields).not.toHaveProperty("checklist_groups");
    expect(staffDto?.custom_fields?.franquia_bagagem).toBe("1 mala despachada 23kg");

    const publicDto = await getPublicTravelProposalByToken({ data: { token: "prop_legacy_estevan" } });
    expect(publicDto?.custom_fields).not.toHaveProperty("pcd");
    expect(publicDto?.custom_fields).not.toHaveProperty("source");
    expect(publicDto?.custom_fields).not.toHaveProperty("attachments");
    expect(publicDto?.custom_fields).not.toHaveProperty("autism_spectrum");
    expect(publicDto?.custom_fields?.franquia_bagagem).toBe("1 mala despachada 23kg");
  });

  it("impede qualquer vazamento de dados internos CRM na UI SSR do Canvas (EditorialFlat/DarkPremium) e no Editorial Mapper", () => {
    const pollutedProposal: any = {
      id: "prop-polluted-1",
      quote_id: "prop-polluted-1",
      public_token: "prop_polluted_1",
      title: "Proposta Porto Seguro",
      agency_name: "Excelência Tour SMO",
      agency_whatsapp: "49999990000",
      client_name: "Estevan",
      client_whatsapp: "49999991111",
      destination_city: "Porto Seguro",
      travel_start_date: "2027-09-25",
      travel_end_date: "2027-09-29",
      adults_count: 2,
      children_count: 0,
      canvas_format: "a4-portrait",
      template_theme: "editorial-flat",
      flights: [],
      hotels: [],
      itinerary: [],
      transfers: [],
      tours: [],
      rooms: [],
      includes: ["Hospedagem com café da manhã"],
      excludes: [],
      pricing: {
        currency: "BRL",
        base_price_cents: 799130,
        boarding_tax_cents: 0,
        other_taxes_cents: 0,
        discount_cents: 0,
        total_price_cents: 799130,
        total_cents: 799130,
        installments_options: [],
        payment_terms:
          "Boleto: Até 15x de R$ 532,75 | Cartão: Até 15x sem juros | À Vista no Pix: R$ 7.591,74",
        custom_fields: {
          pcd: false,
          source: "instagram",
          comments: [
            {
              id: "comm-1794666374464",
              date: "14/11/2026, 11:26:14",
              text: "Documento PDF gerado e vinculado ao Card",
              author: "Sistema de Documentos",
            },
          ],
          attachments: "Ficha de Embarque e Acessibilidade - Porto Seguro.pdf",
          bebes: 0,
          autism_spectrum: false,
          checklist_groups: [
            {
              id: "default-checklist",
              title: "Checklist de Atendimento",
              items: [{ id: "item-1", done: false, text: "Primeiro contato via WhatsApp" }],
            },
          ],
          reduced_mobility: false,
        },
      },
      custom_fields: {
        pcd: false,
        source: "instagram",
        bebes: 0,
        autism_spectrum: false,
        reduced_mobility: false,
      },
      status: "sent",
      valid_until: "2027-09-20T23:59:59.000Z",
    };

    const editorial = proposalToEditorialClassified(pollutedProposal);
    expect(editorial.attributes.custom_field_entries).toEqual([]);

    for (const theme of ["editorial-flat", "dark-premium"] as const) {
      const html = renderToStaticMarkup(
        <ProposalCanvasRenderer
          proposal={{ ...pollutedProposal, template_theme: theme }}
        />,
      );
      expect(html).not.toContain("CHECKLIST GROUPS");
      expect(html).not.toContain("AUTISM SPECTRUM");
      expect(html).not.toContain("REDUCED MOBILITY");
      expect(html).not.toContain("comm-1794666374464");
      expect(html).not.toContain("Sistema de Documentos");
      expect(html).not.toContain("Ficha de Embarque e Acessibilidade");
      expect(html).not.toContain(">SOURCE<");
      expect(html).not.toContain(">BEBES<");
      expect(html).not.toContain(">PCD<");
      expect(html).toContain("Condições de Pagamento:");
    }

    const emptyConditionsHtml = renderToStaticMarkup(
      <ProposalCanvasRenderer
        proposal={{
          ...pollutedProposal,
          pricing: { ...pollutedProposal.pricing, payment_terms: "" },
        }}
      />,
    );
    expect(emptyConditionsHtml).not.toContain("Condições Comerciais &amp; Informações Importantes");
  });
});
