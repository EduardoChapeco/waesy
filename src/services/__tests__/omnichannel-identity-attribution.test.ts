import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  normalizePhoneE164,
  isGroupJidOrSyntheticPhone,
  extractParticipantPhone,
  buildPhoneLookupCandidates,
  extractWhatsAppGroupContext,
  extractWhatsAppReferralAndTokens,
  mergeAttributionPayloads,
  recordAttributionTouchpoint,
  correlateAndPersistInboundWhatsAppAttribution,
} from "../omnichannel-attribution.server";
import { buildAttributionCustomFields, type ClientAttributionSnapshot } from "@/lib/attribution-collector";

vi.mock("@/lib/crypto-vault.server", () => ({
  decryptSecret: vi.fn((v: string) => v),
  encryptSecret: vi.fn((v: string) => v),
}));

vi.mock("../omnichannel-lead-ingestion", () => ({
  ingestOmnichannelLead: vi.fn(async (_db: any, payload: any) => ({
    leadId: "lead-uuid-001",
    customerId: "cust-uuid-001",
    payload,
  })),
}));

type RecordedOp = {
  table: string;
  op: "insert" | "update" | "select";
  values?: any;
  filters: Record<string, any>;
};

function createMockDb(seed: Record<string, any[]> = {}) {
  const ops: RecordedOp[] = [];
  const tableData: Record<string, any[]> = {
    ad_attribution_touchpoints: [],
    whatsapp_lead_conversions: [],
    lead_form_submissions: [],
    store_ad_campaigns: [],
    chat_threads: [],
    whatsapp_contact_identities: [],
    lead_conversion_telemetry: [],
    integration_credentials: [],
    ...seed,
  };

  function makeBuilder(table: string) {
    const state: {
      op: "select" | "insert" | "update";
      values?: any;
      filters: Record<string, any>;
      orExpr?: string;
    } = { op: "select", filters: {} };

    const executeSingle = () => {
      const rows = tableData[table] || [];
      let filtered = [...rows];
      for (const [k, v] of Object.entries(state.filters)) {
        if (v !== undefined) {
          filtered = filtered.filter((r) => String(r[k] ?? "") === String(v));
        }
      }
      if (state.orExpr && table === "ad_attribution_touchpoints") {
        filtered = filtered.filter((r) =>
          state.orExpr!.split(",").some((part) => {
            if (part.startsWith("phone_digits.eq.")) {
              return r.phone_digits === part.replace("phone_digits.eq.", "");
            }
            if (part.startsWith("phone_digits.ilike.%")) {
              const s = part.replace("phone_digits.ilike.%", "");
              return String(r.phone_digits || "").endsWith(s);
            }
            return false;
          }),
        );
      }
      return { data: filtered[0] ?? null, error: null };
    };

    const builder: any = {
      select() {
        return builder;
      },
      insert(values: any) {
        state.op = "insert";
        state.values = values;
        const row = { id: `${table}-${(tableData[table]?.length || 0) + 1}`, ...values };
        tableData[table] = [...(tableData[table] || []), row];
        ops.push({ table, op: "insert", values: row, filters: { ...state.filters } });
        return {
          select() {
            return {
              maybeSingle: async () => ({ data: row, error: null }),
              single: async () => ({ data: row, error: null }),
            };
          },
          then(onFulfilled: any) {
            return Promise.resolve({ data: [row], error: null }).then(onFulfilled);
          },
        };
      },
      update(values: any) {
        state.op = "update";
        state.values = values;
        ops.push({ table, op: "update", values, filters: { ...state.filters } });
        return builder;
      },
      eq(col: string, val: any) {
        state.filters[col] = val;
        return builder;
      },
      gte() {
        return builder;
      },
      ilike(col: string, pattern: string) {
        const clean = pattern.replace(/%/g, "");
        state.filters[`__ilike_${col}`] = clean;
        return builder;
      },
      or(expr: string) {
        state.orExpr = expr;
        return builder;
      },
      order() {
        return builder;
      },
      limit() {
        return {
          maybeSingle: async () => executeSingle(),
          then(onFulfilled: any) {
            const res = executeSingle();
            return Promise.resolve({ data: res.data ? [res.data] : [], error: null }).then(onFulfilled);
          },
        };
      },
      maybeSingle: async () => executeSingle(),
      then(onFulfilled: any, onRejected: any) {
        const rows = tableData[table] || [];
        return Promise.resolve({ data: rows, error: null }).then(onFulfilled, onRejected);
      },
    };
    return builder;
  }

  const db: any = {
    from: (table: string) => makeBuilder(table),
    __ops: ops,
    __tables: tableData,
  };
  return db;
}

describe("Identidade WhatsApp (Cliente & Grupo @g.us) e Atribuição Conectada (Ads/Pixel/Form/CRM)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("nunca corrompe JID de grupo (@g.us / 120363...) como telefone de pessoa e extrai remetente participante real", () => {
    const groupJid = "120363401122334455@g.us";
    expect(isGroupJidOrSyntheticPhone(groupJid, "120363401122334455@g.us")).toBe(true);
    expect(isGroupJidOrSyntheticPhone(null, "120363401122334455")).toBe(true);
    expect(normalizePhoneE164(groupJid)).toBeNull();
    expect(normalizePhoneE164("120363401122334455")).toBeNull();
    expect(normalizePhoneE164("49991234567")).toBe("+5549991234567");
    expect(extractParticipantPhone("5549991234567@s.whatsapp.net")).toBe("+5549991234567");
    expect(extractParticipantPhone("988271625111@lid")).toBeNull();

    const ctx = extractWhatsAppGroupContext(
      { data: { groupMetadata: { subject: "Excursão Bariloche Outubro" } } },
      {
        key: {
          remoteJid: groupJid,
          participant: "988271625@lid",
          participantAlt: "554999887766@s.whatsapp.net",
        },
        pushName: "Mariana Silva",
      },
    );

    expect(ctx.isGroup).toBe(true);
    expect(ctx.groupJid).toBe(groupJid);
    expect(ctx.groupSubject).toBe("Excursão Bariloche Outubro");
    expect(ctx.senderPhone).toBe("+554999887766");
    expect(ctx.senderName).toBe("Mariana Silva");
  });

  it("gera variantes tolerantes para telefones brasileiros com e sem o 9º dígito", () => {
    const c11 = buildPhoneLookupCandidates("+55 (49) 99123-4567");
    expect(c11.e164).toBe("+5549991234567");
    expect(c11.digits).toBe("5549991234567");
    expect(c11.suffix8).toBe("91234567");
    expect(c11.variants).toContain("+554991234567");
    expect(c11.variants).toContain("49991234567");

    const c10 = buildPhoneLookupCandidates("4991234567");
    expect(c10.e164).toBe("+554991234567");
    expect(c10.variants).toContain("+5549991234567");
  });

  it("extrai Click-to-WhatsApp (externalAdReply / referral), Ref Code Waesy e URLs com UTMs da mensagem recebida", () => {
    const evoPayload = {
      message: {
        extendedTextMessage: {
          contextInfo: {
            externalAdReply: {
              sourceType: "ad",
              sourceId: "238591029384",
              sourceUrl: "https://instagram.com/p/demo",
              ctwaClid: "CTWA_CLID_XYZ",
              title: "Pacote Gramado Inverno 2026",
              body: "Parcele em até 10x sem juros",
            },
          },
        },
      },
    };

    const ctwaAttr = extractWhatsAppReferralAndTokens(evoPayload, "Olá! Vim pelo anúncio. Ref: #Waesy-W9K20");
    expect(ctwaAttr).not.toBeNull();
    expect(ctwaAttr?.platform).toBe("meta_ads");
    expect(ctwaAttr?.ctwa_clid).toBe("CTWA_CLID_XYZ");
    expect(ctwaAttr?.ad_id).toBe("238591029384");
    expect(ctwaAttr?.ad_headline).toBe("Pacote Gramado Inverno 2026");
    expect(ctwaAttr?.lead_code).toBe("Waesy-W9K20");
  });

  it("correlaciona mensagem WhatsApp recebida com touchpoint anterior por telefone + Ref code, sincronizando thread e disparando ingestão CRM", async () => {
    const mockDb = createMockDb({
      whatsapp_lead_conversions: [
        {
          id: "conv-1",
          store_id: "store-1",
          lead_code: "WAEF-998811",
          entity_type: "classified",
          entity_id: "class-99",
          entity_title: "Cruzeiro MSC Carnaval",
          utm_source: "facebook",
          utm_medium: "cpc",
          utm_campaign: "carnaval_2027_sul",
          fbclid: "IwAR123abc",
          fbp: "fb.1.1700000000.555",
          fbc: "fb.1.1700000000.IwAR123abc",
          ad_id: "ad_777",
          campaign_id: "camp_555",
          metadata: {},
        },
      ],
      store_ad_campaigns: [
        {
          id: "st-camp-1",
          store_id: "store-1",
          title: "Campanha Oficial Carnaval Sul",
          external_campaign_id: "camp_555",
        },
      ],
    });

    const result = await correlateAndPersistInboundWhatsAppAttribution(mockDb, {
      storeId: "store-1",
      threadId: "thread-1",
      identityId: "ident-1",
      phone: "49991234567",
      pushName: "Carlos Eduardo",
      text: "Oi, gostaria de orçamento do anúncio.\nRef: #WAEF-998811",
      payload: {},
      existingThreadMeta: {},
    });

    expect(result.leadId).toBe("lead-uuid-001");
    expect(result.customerId).toBe("cust-uuid-001");
    expect(result.attribution.utm_campaign).toBe("carnaval_2027_sul");
    expect(result.attribution.ad_id).toBe("ad_777");
    expect(result.attribution.fbp).toBe("fb.1.1700000000.555");
    expect(result.attribution.fbc).toBe("fb.1.1700000000.IwAR123abc");
    expect(result.attribution.listing_title).toBe("Cruzeiro MSC Carnaval");

    const { ingestOmnichannelLead } = await import("../omnichannel-lead-ingestion");
    expect(ingestOmnichannelLead).toHaveBeenCalledWith(
      mockDb,
      expect.objectContaining({
        storeId: "store-1",
        fullName: "Carlos Eduardo",
        phone: "+5549991234567",
        customFields: expect.objectContaining({
          meta_ad_id: "ad_777",
          utm_campaign: "carnaval_2027_sul",
          fbp: "fb.1.1700000000.555",
        }),
      }),
    );

    const threadUpdateOp = mockDb.__ops.find((o: RecordedOp) => o.table === "chat_threads" && o.op === "update");
    expect(threadUpdateOp?.values?.primary_phone_e164).toBe("+5549991234567");
    expect(threadUpdateOp?.values?.attribution?.utm_campaign).toBe("carnaval_2027_sul");
  });

  it("correlaciona via ad_attribution_touchpoints quando cliente preencheu formulário e depois mandou 'Oi' direto no WhatsApp sem código Ref", async () => {
    const mockDb = createMockDb();
    const tpId = await recordAttributionTouchpoint(mockDb, {
      storeId: "store-1",
      phone: "(49) 99887-6655",
      utmSource: "google",
      utmMedium: "cpc",
      utmCampaign: "google_search_jericoacoara",
      gclid: "Cj0KCQiA_GCLID_TEST",
      adPlatform: "google_ads",
      capturedVia: "lead_form",
    });
    expect(tpId).toBeTruthy();

    const result = await correlateAndPersistInboundWhatsAppAttribution(mockDb, {
      storeId: "store-1",
      threadId: "thread-2",
      phone: "+554998876655", // variação sem o 9º dígito!
      pushName: "Fernanda Rocha",
      text: "Oi, tudo bem? Gostaria de informações.",
      payload: {},
    });

    expect(result.attribution.platform).toBe("google_ads");
    expect(result.attribution.gclid).toBe("Cj0KCQiA_GCLID_TEST");
    expect(result.attribution.utm_campaign).toBe("google_search_jericoacoara");
  });

  it("preserva atribuição existente ao mesclar edições manuais de origem do operador", () => {
    const merged = mergeAttributionPayloads(
      {
        platform: "meta_ads",
        fbp: "fb.1.999",
        ctwa_clid: "CTWA_99",
        utm_campaign: "promo_verao",
      },
      {
        campaign: "Campanha Black Friday Corrigida",
        captured_via: "operator_manual_edit",
      },
    );

    expect(merged.fbp).toBe("fb.1.999");
    expect(merged.ctwa_clid).toBe("CTWA_99");
    expect(merged.utm_campaign).toBe("promo_verao");
    expect(merged.campaign).toBe("Campanha Black Friday Corrigida");
    expect(merged.captured_via).toBe("operator_manual_edit");
  });

  it("serializa snapshot do coletor client-side em custom_fields compatíveis com CRM e Pixels", () => {
    const snapshot: ClientAttributionSnapshot = {
      deviceId: "dev-abc",
      fbp: "fb.1.123",
      fbc: "fb.1.456.IwAR",
      fbclid: "IwAR",
      utmSource: "instagram",
      utmMedium: "stories",
      utmCampaign: "resort_natal",
      adId: "ad-505",
      campaignId: "camp-909",
      formId: "form-303",
      adPlatform: "meta_ads",
      landingUrl: "https://waesy.com.br/loja?utm_source=instagram",
    };

    const cf = buildAttributionCustomFields(snapshot);
    expect(cf.meta_ad_id).toBe("ad-505");
    expect(cf.campaign_id).toBe("camp-909");
    expect(cf.meta_form_id).toBe("form-303");
    expect(cf.ad_platform).toBe("meta_ads");
    expect(cf.utm_campaign).toBe("resort_natal");
  });
});
