import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseTravelIntentDeterministically } from "@/lib/travel/travel-intent-parser";

const mockState = vi.hoisted(() => ({
  leads: [] as Record<string, unknown>[],
  proposals: [] as Record<string, unknown>[],
  captures: [] as Record<string, unknown>[],
  quotes: [] as Record<string, unknown>[],
  interests: [] as Record<string, unknown>[],
  demands: [] as Record<string, unknown>[],
  observations: [] as Record<string, unknown>[],
  persistedOpportunities: [] as Record<string, unknown>[],
  persistedMatches: [] as Record<string, unknown>[],
  leadsUpdated: [] as Array<{ id: string; payload: Record<string, unknown> }>,
}));

vi.mock("@/lib/server-access", () => ({
  requireStaff: vi.fn(async () => ({ id: "staff-1", role: "admin", store_id: "store-1" })),
  getServerIdentity: vi.fn(async () => ({ id: "staff-1", role: "admin", store_id: "store-1" })),
  assertStoreAccess: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  getServerClient: () => ({
    from: (table: string) => {
      const ctx: { filters: Array<[string, unknown]>; neqFilters: Array<[string, unknown]>; singleLeadId?: string } = {
        filters: [],
        neqFilters: [],
      };

      const resolveRows = () => {
        if (table === "leads_crm") {
          let rows = [...mockState.leads];
          for (const [k, v] of ctx.filters) rows = rows.filter((r) => r[k] === v);
          return rows;
        }
        if (table === "travel_proposals") {
          let rows = [...mockState.proposals];
          for (const [k, v] of ctx.filters) rows = rows.filter((r) => r[k] === v);
          return rows;
        }
        if (table === "travel_quote_captures") return [...mockState.captures];
        if (table === "travel_quotes") return [...mockState.quotes];
        if (table === "travel_interests") return [...mockState.interests];
        if (table === "travel_client_demands") return [...mockState.demands];
        if (table === "travel_price_observations") return [...mockState.observations];
        if (table === "travel_opportunities") {
          let rows = [...mockState.persistedOpportunities];
          for (const [k, v] of ctx.filters) rows = rows.filter((r) => r[k] === v);
          for (const [k, v] of ctx.neqFilters) rows = rows.filter((r) => r[k] !== v);
          return rows;
        }
        if (table === "travel_opportunity_matches") return [...mockState.persistedMatches];
        return [];
      };

      const builder: any = {
        select: () => builder,
        eq: (col: string, val: unknown) => {
          if (col === "id" && table === "leads_crm") ctx.singleLeadId = String(val);
          ctx.filters.push([col, val]);
          return builder;
        },
        is: () => builder,
        neq: (col: string, val: unknown) => {
          ctx.neqFilters.push([col, val]);
          return builder;
        },
        in: () => builder,
        not: () => builder,
        or: () => builder,
        gte: () => builder,
        order: () => builder,
        limit: () => builder,
        maybeSingle: async () => {
          const rows = resolveRows();
          if (ctx.singleLeadId) {
            return { data: rows.find((r) => r.id === ctx.singleLeadId) || null, error: null };
          }
          return { data: rows[0] || null, error: null };
        },
        then: (resolve: (v: { data: any[]; error: null }) => void) =>
          Promise.resolve(resolve({ data: resolveRows(), error: null })),
        upsert: async (payload: Record<string, unknown>) => {
          if (table === "travel_opportunities") {
            mockState.persistedOpportunities.push(payload);
          }
          return { data: payload, error: null };
        },
        insert: async (payload: Record<string, unknown>) => {
          if (table === "travel_opportunities") {
            mockState.persistedOpportunities.push(payload);
          }
          return { data: payload, error: null };
        },
        update: (payload: Record<string, unknown>) => ({
          eq: (col: string, val: unknown) => ({
            eq: async () => {
              if (table === "leads_crm" && col === "id") {
                mockState.leadsUpdated.push({ id: String(val), payload });
              } else if (table === "travel_opportunities" && col === "id") {
                const idx = mockState.persistedOpportunities.findIndex((o) => o.id === val);
                if (idx >= 0) mockState.persistedOpportunities[idx] = { ...mockState.persistedOpportunities[idx], ...payload };
              }
              return { data: null, error: null };
            },
          }),
        }),
      };
      return builder;
    },
  }),
}));

import {
  internalEvaluateDemandAgainstAllSupply,
  internalEvaluateSupplyAgainstAllLeads,
  internalGetVerifiedOpportunitiesForLead,
} from "../opportunity-radar.functions";

describe("Opportunity Radar E2E BFF & Markdown AI Intent Flow", () => {
  beforeEach(() => {
    mockState.leads = [];
    mockState.proposals = [];
    mockState.captures = [];
    mockState.quotes = [];
    mockState.interests = [];
    mockState.demands = [];
    mockState.observations = [];
    mockState.persistedOpportunities = [];
    mockState.persistedMatches = [];
    mockState.leadsUpdated = [];
  });

  it("REQ-AI01: extracts structured destinations, period, rooms, 0-17 ages and budget from Markdown while preserving raw text", () => {
    const markdown = `
# Briefing Lead WhatsApp
Cliente: Mariana Oliveira
Telefone: (49) 99988-7766
Saindo de: Chapecó
Destinos: Maceió ou Maragogi
Período: 12/07/2026 a 19/07/2026 (flexível)
Grupo: 2 adultos e 2 crianças (5 anos e 11 anos) em 1 quarto All Inclusive
Orçamento: até R$ 9.500,00
    `.trim();

    const parsed = parseTravelIntentDeterministically(markdown);
    expect(parsed.contact.fullName).toBe("Mariana Oliveira");
    expect(parsed.contact.whatsapp).toContain("49999887766");
    expect(parsed.destinations.map((d) => d.normalized)).toEqual(
      expect.arrayContaining(["maceio", "maragogi"])
    );
    expect(parsed.period.startDate).toBe("2026-07-12");
    expect(parsed.period.endDate).toBe("2026-07-19");
    expect(parsed.adultsCount).toBe(2);
    expect(parsed.childrenAges).toEqual([5, 11]);
    expect(parsed.rooms).toHaveLength(1);
    expect(parsed.budget.maxTotalBudgetCents).toBe(950000);
    expect(parsed.preferences.mealPlan).toBe("All Inclusive");
    expect(parsed.rawMarkdownPreserved).toBe(markdown);
  });

  it("REQ-B01 / F-OPP-03: proposal for Lead A matches compatible Lead B with child simulation while skipping self and mismatched Gramado Lead C", async () => {
    mockState.leads = [
      {
        id: "lead-A",
        store_id: "store-1",
        full_name: "Lead A (Destinatário)",
        destination: "Maceió",
        target_months: ["2026-07"],
        pax_adults: 2,
        pax_children: 0,
        status: "proposal",
      },
      {
        id: "lead-B",
        store_id: "store-1",
        full_name: "Lead B (Família Maceió)",
        whatsapp: "49991234567",
        destination: "Maceió",
        destination_tags: [{ label: "Maceió (MCZ)", normalized: "maceio", iata: "MCZ" }],
        target_months: ["2026-07"],
        room_occupancies: [{ roomNumber: 1, adultsCount: 2, childrenCount: 2, childrenAges: [5, 11] }],
        pax_adults: 2,
        pax_children: 2,
        children_ages: [5, 11],
        budget_cents: 1200000,
        status: "new",
      },
      {
        id: "lead-C",
        store_id: "store-1",
        full_name: "Lead C (Gramado)",
        destination: "Gramado",
        target_months: ["2026-07"],
        pax_adults: 2,
        pax_children: 0,
        budget_cents: 900000,
        status: "new",
      },
    ];

    const summary = await internalEvaluateSupplyAgainstAllLeads({
      storeId: "store-1",
      sourceProposalId: "prop-mcz-A",
      offer: {
        id: "prop-mcz-A",
        sourceType: "proposal",
        title: "Maceió Resort — Pacote Julho",
        destinationCity: "Maceió",
        destinationIata: "MCZ",
        departureDate: "2026-07-14",
        returnDate: "2026-07-21",
        quotedAdultsCount: 2,
        quotedChildrenCount: 0,
        quotedChildrenAges: [],
        totalPriceCents: 600000,
        airfarePerAdultCents: 120000,
        transferPerAdultCents: 18000,
        targetLeadId: "lead-A",
      },
    });

    expect(summary.matchedCount).toBe(1);
    expect(summary.matchedLeads[0].leadId).toBe("lead-B");
    expect(summary.matchedLeads[0].requiresChildRequote).toBe(true);
    // 2 adultos (600.000) + 2 CHD [5a, 11a] * (120.000 + 18.000) = 876.000
    expect(summary.matchedLeads[0].effectiveTotalCents).toBe(876000);
    expect(summary.persistedCount).toBe(1);
    expect(mockState.persistedOpportunities[0].target_lead_id).toBe("lead-B");
  });

  it("F-OPP-01 / F-OPP-02: getLeadVerifiedOpportunities never leaks unrelated store captures or random proposals", async () => {
    mockState.leads = [
      {
        id: "lead-gramado",
        store_id: "store-1",
        full_name: "João Serra Gaúcha",
        destination: "Gramado",
        target_months: ["2026-07"],
        pax_adults: 2,
        pax_children: 0,
        budget_cents: 700000,
        status: "qualified",
      },
    ];

    // Proposta de Cancún (não deve vazar para Lead de Gramado!)
    mockState.proposals = [
      {
        id: "prop-cancun",
        lead_id: "other-lead",
        title: "Cancún 5 Estrelas",
        destination_city: "Cancún",
        travel_start_date: "2026-07-10",
        adults_count: 2,
        children_count: 0,
        pricing: { totalCents: 950000 },
        status: "sent",
        created_at: "2026-11-15T10:00:00Z",
      },
    ];

    // Captura de Porto Seguro (não deve vazar para Lead de Gramado!)
    mockState.captures = [
      {
        id: "cap-bps",
        operator_slug: "infotravel",
        source_page: "carrinho",
        destination_city: "Porto Seguro",
        start_date: "2026-07-10",
        total_cents: 500000,
        adults_count: 2,
        children_count: 0,
        created_at: "2026-11-15T10:00:00Z",
      },
    ];

    const bundle = await internalGetVerifiedOpportunitiesForLead({
      storeId: "store-1",
      leadId: "lead-gramado",
    });

    expect(bundle.verifiedSimilarProposals).toEqual([]);
    expect(bundle.verifiedCaptures).toEqual([]);
    expect(bundle.verifiedOpportunities).toEqual([]);
  });

  it("Red Team regressions: invalid calendar dates (31/02) return null and closed leads skip Radar reevaluation", async () => {
    const invalidDateParsed = parseTravelIntentDeterministically(
      "Destino: Maceió\nData: 31/02/2026 a 05/03/2026\n2 adultos"
    );
    expect(invalidDateParsed.period.startDate).toBeNull();
    expect(invalidDateParsed.period.endDate).toBe("2026-03-05");

    mockState.leads = [
      {
        id: "lead-closed-won",
        store_id: "store-1",
        full_name: "Lead Ganho",
        destination: "Maceió",
        target_months: ["2026-07"],
        pax_adults: 2,
        status: "won",
      },
    ];
    mockState.proposals = [
      {
        id: "prop-active-mcz",
        store_id: "store-1",
        lead_id: "lead-other",
        destination_city: "Maceió",
        travel_start_date: "2026-07-12",
        adults_count: 2,
        pricing: { totalCents: 550000 },
        status: "sent",
      },
    ];

    const evalClosed = await internalEvaluateDemandAgainstAllSupply({
      storeId: "store-1",
      leadId: "lead-closed-won",
    });
    expect(evalClosed.matchedCount).toBe(0);
    expect(evalClosed.persistedCount).toBe(0);
  });

  it("Red Team P2: preserves dismissed workflow status on reevaluation when matching existing opportunity", async () => {
    mockState.leads = [
      {
        id: "lead-dismissed-check",
        store_id: "store-1",
        full_name: "Marcos",
        destination: "Maceió",
        target_months: ["2026-07"],
        pax_adults: 2,
        status: "new",
      },
    ];
    mockState.persistedOpportunities = [
      {
        id: "opp-existing-1",
        store_id: "store-1",
        source_proposal_id: "prop-mcz-re",
        target_lead_id: "lead-dismissed-check",
        status: "dismissed",
      },
    ];

    const summary = await internalEvaluateSupplyAgainstAllLeads({
      storeId: "store-1",
      sourceProposalId: "prop-mcz-re",
      offer: {
        id: "prop-mcz-re",
        sourceType: "proposal",
        title: "Maceió Julho",
        destinationCity: "Maceió",
        destinationIata: "MCZ",
        departureDate: "2026-07-14",
        quotedAdultsCount: 2,
        quotedChildrenCount: 0,
        quotedChildrenAges: [],
        totalPriceCents: 600000,
      },
    });

    expect(summary.persistedCount).toBe(1);
    expect(mockState.persistedOpportunities[0].status).toBe("dismissed");
  });
});
