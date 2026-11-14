import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listAllNicheKanbanPresets,
  getNicheKanbanPreset,
  getNicheKanbanStages,
  getNicheKanbanTerminology,
  resolveKanbanStageSynonym,
  doesLeadBelongToStage,
  formatKanbanActionError,
  normalizeKanbanStageSlug,
} from "@/lib/niches/kanban-niche-taxonomy";
import { getNicheStages } from "@/lib/niches/niche-manifest";
import { KANBAN_PRESETS_CATALOG, resolveKanbanDefaults } from "@/services/kanban-config.functions";

// Hoisted mock state for Supabase & Fetch
const mockState = vi.hoisted(() => ({
  leads: new Map<string, any>(),
  pixelConfigs: new Map<string, any>(),
  credentials: new Map<string, any>(),
  stores: new Map<string, any>(),
  kanbanConfigs: new Map<string, any[]>(),
  telemetryLogs: [] as any[],
  touchpoints: [] as any[],
  threads: new Map<string, any>(),
  simulate23514OnStatusUpdate: false,
  simulate23514OnRpc: false,
  fetchCalls: [] as Array<{ url: string; init?: any }>,
}));

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let validatorFn: any = null;
    const builder: any = {
      middleware: () => builder,
      validator: (v: any) => {
        validatorFn = v;
        return builder;
      },
      inputValidator: (v: any) => {
        validatorFn = v;
        return builder;
      },
      handler: (fn: any) => {
        return async (opts?: any) => {
          let data = opts?.data;
          if (validatorFn) {
            if (typeof validatorFn.parse === "function") {
              data = validatorFn.parse(data);
            } else if (typeof validatorFn === "function") {
              data = validatorFn(data);
            }
          }
          return fn({ data });
        };
      },
    };
    return builder;
  },
}));

vi.mock("@/lib/server-access", () => ({
  STAFF_ROLES: ["owner", "admin", "manager", "seller", "support", "staff"],
  getServerIdentity: vi.fn(async () => ({
    id: "user-owner-1",
    email: "owner@excelenciatour.com.br",
    role: "owner",
    store_id: "11111111-1111-4111-8111-111111111111",
  })),
  assertStoreAccess: vi.fn(),
  resolveTenantStoreId: vi.fn(async () => "11111111-1111-4111-8111-111111111111"),
}));

vi.mock("@/lib/tenant.server", () => ({
  resolveTenantStoreId: vi.fn(async () => "11111111-1111-4111-8111-111111111111"),
}));

vi.mock("@/lib/logger", () => ({
  logSystemError: vi.fn(),
  logSecurityAudit: vi.fn(),
}));

vi.mock("@/lib/crypto-vault.server", () => ({
  encryptSecret: vi.fn((val: string) => `enc:${val}`),
  decryptSecret: vi.fn((val: string) => (val.startsWith("enc:") ? val.slice(4) : val)),
}));

function createMockSupabase() {
  const storeIdDefault = "11111111-1111-4111-8111-111111111111";

  const builderFor = (table: string) => {
    let op: "select" | "insert" | "update" | "upsert" | "delete" = "select";
    let payload: any = null;
    const filters: Record<string, any> = {};

    const execute = async () => {
      if (table === "leads_crm") {
        if (op === "select") {
          const id = filters.id;
          if (id) {
            const row = mockState.leads.get(id) || null;
            return { data: row, error: null };
          }
          return { data: Array.from(mockState.leads.values()), error: null };
        }
        if (op === "update") {
          const id = filters.id;
          const existing = mockState.leads.get(id);
          if (!existing) return { data: null, error: { message: "Lead not found" } };
          if (
            mockState.simulate23514OnStatusUpdate &&
            payload?.status &&
            !["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost", "converted"].includes(payload.status)
          ) {
            return {
              data: null,
              error: {
                code: "23514",
                message: 'new row for relation "leads_crm" violates check constraint "leads_crm_status_check"',
              },
            };
          }
          const updated = { ...existing, ...payload };
          mockState.leads.set(id, updated);
          return { data: updated, error: null };
        }
        if (op === "insert") {
          const row = Array.isArray(payload) ? payload[0] : payload;
          if (
            mockState.simulate23514OnStatusUpdate &&
            row?.status &&
            !["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost", "converted"].includes(row.status)
          ) {
            return {
              data: null,
              error: {
                code: "23514",
                message: 'new row for relation "leads_crm" violates check constraint "leads_crm_status_check"',
              },
            };
          }
          const id = row.id || `lead-${mockState.leads.size + 1}`;
          const saved = { id, created_at: new Date().toISOString(), ...row };
          mockState.leads.set(id, saved);
          return { data: saved, error: null };
        }
      }

      if (table === "kanban_stage_configs") {
        const sid = filters.store_id || storeIdDefault;
        return { data: mockState.kanbanConfigs.get(sid) || [], error: null };
      }

      if (table === "stores") {
        const sid = filters.id || storeIdDefault;
        if (op === "update") {
          const cur = mockState.stores.get(sid) || { id: sid, is_active: true, niche: "tourism", settings: {} };
          const next = { ...cur, ...payload };
          mockState.stores.set(sid, next);
          return { data: next, error: null };
        }
        const store = mockState.stores.get(sid) || {
          id: sid,
          is_active: true,
          niche: "tourism",
          business_type: "turismo",
          settings: {},
        };
        return { data: store, error: null };
      }

      if (table === "store_pixel_configs") {
        const sid = filters.store_id || payload?.store_id || storeIdDefault;
        if (op === "upsert" || op === "insert" || op === "update") {
          const cur = mockState.pixelConfigs.get(sid) || { store_id: sid };
          const next = { ...cur, ...payload };
          mockState.pixelConfigs.set(sid, next);
          return { data: next, error: null };
        }
        return { data: mockState.pixelConfigs.get(sid) || null, error: null };
      }

      if (table === "integration_credentials") {
        const sid = filters.store_id || payload?.store_id || storeIdDefault;
        const provider = filters.provider || payload?.provider;
        const key = `${sid}:${provider}`;
        if (op === "upsert" || op === "insert" || op === "update") {
          const next = { ...(mockState.credentials.get(key) || {}), ...payload };
          mockState.credentials.set(key, next);
          return { data: next, error: null };
        }
        return { data: mockState.credentials.get(key) || null, error: null };
      }

      if (table === "lead_conversion_telemetry") {
        if (op === "insert") {
          const entry = Array.isArray(payload) ? payload[0] : payload;
          mockState.telemetryLogs.push(entry);
          return { data: entry, error: null };
        }
        const existing = mockState.telemetryLogs.find(
          (l) => l.store_id === filters.store_id && l.event_id === filters.event_id,
        );
        return { data: existing || null, error: null };
      }

      if (table === "ad_attribution_touchpoints") {
        if (op === "insert") {
          const entry = { id: `tp-${mockState.touchpoints.length + 1}`, ...(Array.isArray(payload) ? payload[0] : payload) };
          mockState.touchpoints.push(entry);
          return { data: entry, error: null };
        }
        return { data: mockState.touchpoints, error: null };
      }

      if (table === "chat_threads") {
        const tid = filters.id;
        if (op === "update") {
          const cur = mockState.threads.get(tid) || { id: tid };
          const next = { ...cur, ...payload };
          mockState.threads.set(tid, next);
          return { data: next, error: null };
        }
        return { data: mockState.threads.get(tid) || null, error: null };
      }

      if (table === "chat_messages") {
        return {
          data: [
            {
              id: "msg-1",
              sender_role: "customer",
              content: "Olá, gostaria de cotar pacote para Maceió em família",
              created_at: new Date().toISOString(),
            },
          ],
          error: null,
        };
      }

      return { data: null, error: null };
    };

    const chain: any = {
      select: () => chain,
      insert: (p: any) => {
        op = "insert";
        payload = p;
        return chain;
      },
      update: (p: any) => {
        op = "update";
        payload = p;
        return chain;
      },
      upsert: (p: any) => {
        op = "upsert";
        payload = p;
        return chain;
      },
      delete: () => {
        op = "delete";
        return chain;
      },
      eq: (col: string, val: any) => {
        filters[col] = val;
        return chain;
      },
      is: () => chain,
      in: () => chain,
      gte: () => chain,
      or: () => chain,
      ilike: () => chain,
      order: () => chain,
      limit: () => chain,
      maybeSingle: () => execute(),
      single: () => execute(),
      then: (onFulfilled: any, onRejected: any) => execute().then(onFulfilled, onRejected),
    };

    return chain;
  };

  return {
    from: (table: string) => builderFor(table),
    rpc: vi.fn(async (fnName: string, args: any) => {
      if (fnName === "persist_lead_move") {
        if (mockState.simulate23514OnRpc) {
          return {
            data: null,
            error: {
              code: "23514",
              message: 'new row for relation "leads_crm" violates check constraint "leads_crm_status_check"',
            },
          };
        }
        const lead = mockState.leads.get(args._lead_id);
        if (!lead) return { data: null, error: { message: "Lead not found" } };
        const updated = {
          ...lead,
          status: args._to_status,
          pipeline_stage: args._to_status,
          custom_fields: {
            ...(lead.custom_fields || {}),
            kanban_stage_key: args._to_status,
          },
        };
        mockState.leads.set(args._lead_id, updated);
        return { data: null, error: null };
      }
      if (fnName === "get_store_public_pixels") {
        const cfg = mockState.pixelConfigs.get(args.p_store_id);
        return { data: cfg ? [cfg] : [], error: null };
      }
      return { data: null, error: null };
    }),
  };
}

vi.mock("@/lib/supabase", () => ({
  getServerClient: vi.fn(() => createMockSupabase()),
}));

describe("SPEC-20261114: Multi-Niche Kanban Flows, Synonyms, Sondagem & Briefing Move and Pixel/Google Ads E2E", () => {
  const storeId = "11111111-1111-4111-8111-111111111111";

  beforeEach(() => {
    mockState.leads.clear();
    mockState.pixelConfigs.clear();
    mockState.credentials.clear();
    mockState.stores.clear();
    mockState.kanbanConfigs.clear();
    mockState.telemetryLogs.length = 0;
    mockState.touchpoints.length = 0;
    mockState.threads.clear();
    mockState.simulate23514OnStatusUpdate = false;
    mockState.simulate23514OnRpc = false;
    mockState.fetchCalls.length = 0;

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: any) => {
        mockState.fetchCalls.push({ url: String(url), init });
        return {
          ok: true,
          status: 200,
          json: async () => ({ events_received: 1, fbtrace_id: "trace_ok_1" }),
        };
      }),
    );
  });

  it("R3: provides complete Kanban presets, stages, synonyms and terminology for all 22 verticals", () => {
    const presets = listAllNicheKanbanPresets();
    expect(presets.length).toBeGreaterThanOrEqual(22);

    const requiredNiches = [
      "beauty_salon",
      "barbershop",
      "aesthetics_clinic",
      "healthcare",
      "dental",
      "psychology",
      "vet_petshop",
      "gastronomy",
      "market_perishables",
      "pharmacy",
      "automotive",
      "tourism",
      "retail",
      "real_estate",
      "services",
      "law_firm",
      "accounting",
      "education",
      "events",
      "organizations",
      "generic",
      "creator",
    ] as const;

    for (const nicheId of requiredNiches) {
      const preset = getNicheKanbanPreset(nicheId);
      expect(preset.nicheId).toBe(nicheId);
      expect(preset.stages.length).toBeGreaterThanOrEqual(5);
      expect(preset.terminology.searchPlaceholder.length).toBeGreaterThan(5);
      expect(preset.terminology.interestTypes.length).toBeGreaterThan(0);
      expect(preset.terminology.leadSources.length).toBeGreaterThan(0);
      expect(preset.terminology.defaultChecklist.length).toBeGreaterThan(0);

      // Every stage must declare canonicalBucket, purpose and synonyms
      for (const stage of preset.stages) {
        expect(stage.stage_key).toMatch(/^[a-z0-9_-]{2,64}$/);
        expect(["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"]).toContain(
          stage.canonicalBucket,
        );
        expect(["inbox", "in_progress", "review", "won", "lost", "archived"]).toContain(stage.purpose);
        expect(stage.synonyms.length).toBeGreaterThan(0);
      }

      // Check KANBAN_PRESETS_CATALOG & resolveKanbanDefaults integration
      expect(KANBAN_PRESETS_CATALOG[nicheId]).toBeDefined();
      const defaults = resolveKanbanDefaults("commercial_crm", nicheId);
      expect(defaults.length).toBeGreaterThanOrEqual(5);
    }

    // Legacy NicheId aliases from niche-manifest.ts also resolve to rich domain presets
    const legacyManifestNiches = ["tourism", "food", "fashion", "health_beauty", "automotive", "real_estate", "legal", "education"] as const;
    for (const legacyId of legacyManifestNiches) {
      const manifestStages = getNicheStages("crm", legacyId as any);
      expect(manifestStages.length).toBeGreaterThanOrEqual(5);
      expect(manifestStages[0].purpose).toBeDefined();
      expect(manifestStages[0].synonyms?.length).toBeGreaterThan(0);
    }
  });

  it("R2 & R3: resolves 'Sondagem e Briefing' ('contact'/'briefing') and niche synonyms bidirectionally without perder cards", () => {
    const tourismStages = getNicheKanbanStages("tourism");
    const sondagemStage = tourismStages.find((s) => s.stage_key === "contact");
    expect(sondagemStage?.title).toBe("Sondagem e Briefing");

    const resolvedByKey = resolveKanbanStageSynonym("contact", tourismStages, "tourism");
    expect(resolvedByKey.matchedStageKey).toBe("contact");
    expect(resolvedByKey.canonicalBucket).toBe("contacted");
    expect(resolvedByKey.purpose).toBe("in_progress");
    expect(resolvedByKey.title).toBe("Sondagem e Briefing");

    const resolvedByTitle = resolveKanbanStageSynonym("Sondagem e Briefing", tourismStages, "tourism");
    expect(resolvedByTitle.matchedStageKey).toBe("contact");
    expect(resolvedByTitle.canonicalBucket).toBe("contacted");

    const resolvedByBriefing = resolveKanbanStageSynonym("briefing", tourismStages, "tourism");
    expect(resolvedByBriefing.matchedStageKey).toBe("contact");

    // Lead moved to "contact" ("Sondagem e Briefing") belongs strictly to "contact" column
    const leadInSondagem = {
      id: "lead-sondagem-1",
      status: "contacted",
      custom_fields: { kanban_stage_key: "contact" },
    };
    expect(doesLeadBelongToStage(leadInSondagem, "contact", tourismStages, "tourism")).toBe(true);
    expect(doesLeadBelongToStage(leadInSondagem, "new", tourismStages, "tourism")).toBe(false);
    expect(doesLeadBelongToStage(leadInSondagem, "qualified", tourismStages, "tourism")).toBe(false);

    // Custom column col_* preservation
    const customStages = [
      ...tourismStages,
      { stage_key: "col_vip_concierge", title: "Concierge VIP", purpose: "review" as const },
    ];
    const leadInCustomCol = {
      id: "lead-vip-1",
      status: "negotiation",
      custom_fields: { kanban_stage_key: "col_vip_concierge" },
    };
    expect(doesLeadBelongToStage(leadInCustomCol, "col_vip_concierge", customStages, "tourism")).toBe(true);
    expect(doesLeadBelongToStage(leadInCustomCol, "negotiation", customStages, "tourism")).toBe(false);
  });

  it("R2: formats raw Zod JSON errors into clean human messages and persists moves to 'contact' ('Sondagem e Briefing') with 23514 fallback", async () => {
    const rawZodDump = JSON.stringify([
      {
        received: "contact",
        code: "invalid_enum_value",
        options: ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"],
        path: ["status"],
        message: "Invalid enum value. Expected 'new' | 'contacted'..., received 'contact'",
      },
    ]);
    const cleanMsg = formatKanbanActionError(new Error(rawZodDump));
    expect(cleanMsg).not.toContain("[{");
    expect(cleanMsg).not.toContain("invalid_enum_value");
    expect(cleanMsg.toLowerCase()).toContain("etapa");

    const { persistLeadMove, updateLeadStatus } = await import("@/services/crm.functions");

    const leadId = "22222222-2222-4222-8222-222222222222";
    mockState.leads.set(leadId, {
      id: leadId,
      store_id: storeId,
      full_name: "Eduardo Turismo",
      phone: "+5549999171623",
      email: "eduardo@cliente.com.br",
      status: "new",
      estimated_value_cents: 1300000,
      custom_fields: {},
    });

    // 1. Direct move to "contact" ("Sondagem e Briefing")
    const moveRes = await persistLeadMove({
      data: {
        leadId,
        toStatus: "contact",
        reorderedIds: [leadId],
      },
    });
    expect(moveRes.success).toBe(true);
    expect(moveRes.stageKey).toBe("contact");
    expect(mockState.leads.get(leadId)?.custom_fields?.kanban_stage_key).toBe("contact");

    // 2. Simulate pre-migration DB throwing 23514 on custom/niche slug "contact"
    mockState.simulate23514OnRpc = true;
    mockState.simulate23514OnStatusUpdate = true;

    const fallbackRes = await persistLeadMove({
      data: {
        leadId,
        toStatus: "contact",
        reorderedIds: [leadId],
      },
    });
    expect(fallbackRes.success).toBe(true);
    const savedLead = mockState.leads.get(leadId);
    expect(savedLead.status).toBe("contacted");
    expect(savedLead.custom_fields.kanban_stage_key).toBe("contact");

    // And doesLeadBelongToStage still places it in "contact" ("Sondagem e Briefing")!
    const tourismStages = getNicheKanbanStages("tourism");
    expect(doesLeadBelongToStage(savedLead, "contact", tourismStages, "tourism")).toBe(true);

    // 3. updateLeadStatus also handles custom column slug "col_briefing_extra" with 23514 fallback
    const statusRes = await updateLeadStatus({
      data: {
        leadId,
        status: "col_briefing_extra",
      },
    });
    expect(statusRes.success).toBe(true);
    expect(mockState.leads.get(leadId)?.custom_fields?.kanban_stage_key).toBe("col_briefing_extra");
  }, 25000);

  it("R4: saves and serves Meta Pixel, Google Ads + Label, GA4 + MP Secret, GTM, TikTok and Domain Verification meta tags without leaking secrets", async () => {
    const { saveStorePixelConfig, getStorePixelConfig, getPublicStorePixels, testStorePixelPipeline } =
      await import("@/services/pixels.functions");
    const { getPublicPixels } = await import("@/services/integrations.functions");

    mockState.stores.set(storeId, {
      id: storeId,
      is_active: true,
      niche: "tourism",
      settings: {},
    });

    await saveStorePixelConfig({
      data: {
        storeId,
        meta_pixel_id: "123456789012345",
        meta_capi_token: "EAAB_SECRET_META_TOKEN",
        meta_test_event_code: "TEST9988",
        meta_domain_verification: "meta_verify_token_abc",
        google_ads_id: "AW-987654321",
        google_ads_conversion_label: "ConvLabelXYZ",
        google_analytics_id: "G-1A2B3C4D5E",
        ga4_api_secret: "ga4_super_secret_key",
        google_site_verification: "google_site_verify_token_xyz",
        gtm_id: "GTM-ABC1234",
        tiktok_pixel_id: "C9988776655",
        track_page_view: true,
        track_view_content: true,
        track_add_to_cart: true,
        track_initiate_checkout: true,
        track_lead: true,
        track_whatsapp_click: true,
      },
    });

    // Admin workspace view shows configured flags but never exposes raw secrets
    const adminCfg = await getStorePixelConfig();
    expect(adminCfg?.meta_pixel_id).toBe("123456789012345");
    expect(adminCfg?.meta_capi_token).toBeNull();
    expect(adminCfg?.meta_capi_configured).toBe(true);
    expect(adminCfg?.meta_test_event_code_configured).toBe(true);
    expect(adminCfg?.meta_domain_verification).toBe("meta_verify_token_abc");
    expect(adminCfg?.google_ads_id).toBe("AW-987654321");
    expect(adminCfg?.google_ads_conversion_label).toBe("ConvLabelXYZ");
    expect(adminCfg?.google_analytics_id).toBe("G-1A2B3C4D5E");
    expect(adminCfg?.ga4_api_secret_configured).toBe(true);
    expect(adminCfg?.google_site_verification).toBe("google_site_verify_token_xyz");
    expect(adminCfg?.gtm_id).toBe("GTM-ABC1234");
    expect(adminCfg?.tiktok_pixel_id).toBe("C9988776655");

    // Public storefront endpoints return all public IDs & verification tags and zero secrets
    const pubPixels = await getPublicStorePixels({ data: { storeId } });
    expect(pubPixels?.meta_pixel_id).toBe("123456789012345");
    expect(pubPixels?.google_ads_id).toBe("AW-987654321");
    expect(pubPixels?.google_ads_conversion_label).toBe("ConvLabelXYZ");
    expect(pubPixels?.google_analytics_id).toBe("G-1A2B3C4D5E");
    expect(pubPixels?.gtm_id).toBe("GTM-ABC1234");
    expect(pubPixels?.tiktok_pixel_id).toBe("C9988776655");
    expect(pubPixels?.google_site_verification).toBe("google_site_verify_token_xyz");
    expect(pubPixels?.meta_domain_verification).toBe("meta_verify_token_abc");
    expect((pubPixels as any)?.meta_capi_token).toBeUndefined();

    const pubIntegrations = await getPublicPixels({ data: { storeId } });
    expect(Array.isArray(pubIntegrations)).toBe(true);
    expect(pubIntegrations.find((p: any) => p.provider === "google_analytics")?.measurementId).toBe("G-1A2B3C4D5E");
    expect(pubIntegrations.find((p: any) => p.provider === "google_ads")?.conversionId).toBe("AW-987654321");
    expect(pubIntegrations.find((p: any) => p.provider === "google_ads")?.conversionLabel).toBe("ConvLabelXYZ");
    expect(pubIntegrations.find((p: any) => p.provider === "google_site_verification")?.verificationCode).toBe("google_site_verify_token_xyz");
    expect(pubIntegrations.find((p: any) => p.provider === "meta_domain_verification")?.verificationCode).toBe("meta_verify_token_abc");

    // Diagnostic pipeline test dispatches both Meta CAPI & Google Ads / GA4 MP
    const diag = await testStorePixelPipeline({
      data: {
        storeId,
        channel: "both",
      },
    });
    expect(diag.ok).toBe(true);
    expect(diag.meta?.sent).toBe(true);
    expect(diag.google?.sent).toBe(true);
  }, 25000);

  it("R4: fires closed-loop conversions on 'contact' ('Sondagem e Briefing') for Google Ads leads (gclid/gbraid without fbp) and 'won' leads with 0 value, plus Atendimento chat conversion", async () => {
    const { saveStorePixelConfig } = await import("@/services/pixels.functions");
    const { persistLeadMove } = await import("@/services/crm.functions");
    const { convertChatThreadToCrmLead } = await import("@/services/chat.functions");

    await saveStorePixelConfig({
      data: {
        storeId,
        meta_pixel_id: "123456789012345",
        meta_capi_token: "EAAB_SECRET_META_TOKEN",
        google_ads_id: "AW-987654321",
        google_ads_conversion_label: "ConvLabelXYZ",
        google_analytics_id: "G-1A2B3C4D5E",
        ga4_api_secret: "ga4_super_secret_key",
        track_page_view: true,
        track_view_content: true,
        track_add_to_cart: true,
        track_initiate_checkout: true,
        track_lead: true,
        track_whatsapp_click: true,
      },
    });

    // Lead captured from Google Ads (has gclid & gbraid, NO fbp/fbc, and 0 estimated value initially)
    const googleLeadId = "33333333-3333-4333-8333-333333333333";
    mockState.leads.set(googleLeadId, {
      id: googleLeadId,
      store_id: storeId,
      full_name: "Marciana Google Ads",
      phone: "+5549984042198",
      email: "marciana@cliente.com.br",
      status: "new",
      estimated_value_cents: 0,
      custom_fields: {
        gclid: "EAIaIQobChMI_google_click_123",
        gbraid: "0AAAA_gbraid_456",
        device_id: "dev_999",
      },
    });

    // Move to "contact" ("Sondagem e Briefing") -> triggers closed-loop qualification
    await persistLeadMove({
      data: {
        leadId: googleLeadId,
        toStatus: "contact",
        reorderedIds: [googleLeadId],
      },
    });

    const ga4CallsAfterContact = mockState.fetchCalls.filter((c) =>
      c.url.includes("google-analytics.com/mp/collect"),
    );
    expect(ga4CallsAfterContact.length).toBeGreaterThanOrEqual(1);
    const gaBody = JSON.parse(ga4CallsAfterContact[0].init.body);
    expect(gaBody.events[0].name).toBe("generate_lead");
    expect(gaBody.events[0].params.gclid).toBe("EAIaIQobChMI_google_click_123");

    // Move to "won" with 0 value -> does NOT throw and dispatches QualifiedLead/generate_lead with _won event_id
    await persistLeadMove({
      data: {
        leadId: googleLeadId,
        toStatus: "won",
        reorderedIds: [googleLeadId],
      },
    });

    const wonZeroLogs = mockState.telemetryLogs.filter((l) => String(l.event_id || "").includes("_won_"));
    expect(wonZeroLogs.length).toBeGreaterThanOrEqual(1);
    expect(wonZeroLogs.some((l) => l.event_name === "QualifiedLead" || l.event_name === "generate_lead")).toBe(true);

    // Update lead value > 0 and move to "won" -> dispatches Purchase / purchase
    mockState.leads.set(googleLeadId, {
      ...mockState.leads.get(googleLeadId),
      estimated_value_cents: 450000,
    });
    await persistLeadMove({
      data: {
        leadId: googleLeadId,
        toStatus: "won",
        reorderedIds: [googleLeadId],
      },
    });
    const purchaseLogs = mockState.telemetryLogs.filter((l) => l.event_name === "purchase" || l.event_name === "Purchase");
    expect(purchaseLogs.length).toBeGreaterThanOrEqual(1);

    // Atendimento WhatsApp Thread -> Convert to CRM Lead preserves attribution and uses estimated_value_cents
    const threadId = "44444444-4444-4444-8444-444444444444";
    mockState.threads.set(threadId, {
      id: threadId,
      store_id: storeId,
      participant_2_name: "Alexandro WhatsApp",
      primary_phone_e164: "+5549991112233",
      attribution: {
        platform: "google_ads",
        gclid: "gclid_from_whatsapp_thread",
        gbraid: "gbraid_from_thread",
        utm_campaign: "Campanha Inverno",
      },
      metadata: {},
    });

    const convRes = await convertChatThreadToCrmLead({
      data: {
        threadId,
        title: "Viagem em família",
        estimatedValue: 6000,
      },
    });
    expect(convRes.ok).toBe(true);
    const createdLead = mockState.leads.get(convRes.leadId);
    expect(createdLead.estimated_value_cents).toBe(600000);
    expect(createdLead.custom_fields.gclid).toBe("gclid_from_whatsapp_thread");
    expect(createdLead.custom_fields.gbraid).toBe("gbraid_from_thread");
  }, 25000);

  it("5) Squircle button standardization, customer terminology cleanup & feature propagation contracts", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const root = process.cwd();
    const read = (rel: string) => readFileSync(resolve(root, rel), "utf8");

    // 1. Core Button primitive pillowOutline uses rounded-lg squircle (zero rounded-full pill)
    const buttonSrc = read("src/components/ui/button.tsx");
    expect(buttonSrc).toContain('pillowOutline: "border border-border/70');
    expect(buttonSrc).not.toMatch(/pillowOutline:[^\n]*rounded-full/);

    // 2. VoucherStudio has zero rounded-full action buttons, textareas, or card repeater divs
    const voucherSrc = read("src/components/tourism/vouchers/VoucherStudio.tsx");
    expect(voucherSrc).not.toMatch(/<Textarea[^>]*rounded-full/);
    expect(voucherSrc).not.toMatch(/space-y-2 rounded-full border border-border/);
    expect(voucherSrc).not.toMatch(/rounded-full p-2 text-muted-foreground/);

    // 3. LeadCard & KanbanColumnCustomizerModal contracts
    const leadCardSrc = read("src/components/tourism/crm/LeadCard.tsx");
    expect(leadCardSrc).toContain("Abrir Perfil do Cliente");
    expect(leadCardSrc).not.toContain("Ficha 360");
    expect(leadCardSrc).not.toContain("w-9 rounded-lg");

    const customizerSrc = read("src/components/workspace/kanban/kanban-column-customizer-modal.tsx");
    expect(customizerSrc).toContain("listAllNicheKanbanPresets");

    // 4. Customer profile terminology cleanup (UI strings)
    for (const relPath of [
      "src/components/atendimento/AtendimentoChatWorkspace.tsx",
      "src/components/chat/customer-360-sidebar.tsx",
      "src/components/dossier/customer-360-printable-dossier.tsx",
      "src/components/tourism/crm/TourismPipeCardDossier.tsx",
      "src/routes/workspace.clientes.index.tsx",
      "src/routes/workspace.turismo.index.tsx",
      "src/routes/workspace.configuracoes.integracoes.tsx",
    ]) {
      const src = read(relPath);
      expect(src).not.toMatch(/Ficha 360|Perfil 360|Dossiê 360|Cliente 360°|Atendimento 360/);
    }

    // 5. Refactored Proposals Manager & Kanban Drag-and-Drop propagation
    const turismoIndexSrc = read("src/routes/workspace.turismo.index.tsx");
    expect(turismoIndexSrc).toContain("<TourismProposalsManager");

    const cotacoesSrc = read("src/routes/workspace.turismo.cotacoes.tsx");
    expect(cotacoesSrc).toContain("viewSwitcher={");
    expect(cotacoesSrc).toContain("border-dashed border-border/50 bg-transparent");
    expect(cotacoesSrc).toContain("onDrop={(e) =>");

    const orcamentosSrc = read("src/routes/workspace.orcamentos.index.tsx");
    expect(orcamentosSrc).toContain("onDrop={(e) =>");
    expect(orcamentosSrc).not.toMatch(/className="h-6 px-2/);
  });
});
