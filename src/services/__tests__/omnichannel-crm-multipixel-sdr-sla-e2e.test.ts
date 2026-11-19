import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

import { LEAD_SOURCES } from "@/types/travel-dossier";
import {
  extractSemanticLeadFieldsFromAnswers,
  INTERNAL_CUSTOM_FIELD_KEYS,
} from "@/lib/niches/unified-field-bridge";
import { ingestOmnichannelLead } from "@/services/omnichannel-lead-ingestion";
import { isContactScopeSuppressed } from "@/lib/whatsapp-contact-scope";
import { resolveContactCaptureSuppression } from "@/lib/whatsapp-contact-suppression.server";
import { selectMatchedPixelsForContext } from "@/lib/pixel-routing";
import {
  correlateAndPersistInboundWhatsAppAttribution,
  dispatchServerSidePixelConversion,
} from "@/services/omnichannel-attribution.server";
import {
  formatReadableCampaignDetail,
  resolveAndEnrichMetaAdMetadata,
} from "@/services/meta-ad-enrichment.server";
import { executeDiscoverAccessibleAdAccounts } from "@/services/ads.functions";
import { encryptSecret } from "@/lib/crypto-vault.server";
import {
  hydrateMediaFromEvolution,
  refreshSignedChatMediaUrl,
} from "@/services/whatsapp-media.server";
import {
  appendVerifiedFactToContinuousKnowledgeBase,
  extractMediaAndChatToLeadAndKnowledge,
  transcribeAudioMediaServer,
} from "@/services/whatsapp-media-intelligence.server";
import {
  buildMultiNicheCopilotContextAndReply,
  extractLeadDossierFromThreadServer,
} from "@/services/omnichannel-ai-copilot.server";
import {
  computeSlaAlertsSummary,
  computeThreadSlaStatus,
} from "@/lib/sla-metrics";

const STORE_ID = "11111111-1111-4111-8111-111111111111";
const THREAD_ID = "22222222-2222-4222-8222-222222222222";
const LEAD_ID_1 = "33333333-3333-4333-8333-333333333333";
const INSTANCE_ID = "44444444-4444-4444-8444-444444444444";

function createInMemorySupabaseMock(seed: Partial<Record<string, any[]>> = {}, options?: { withStorage?: boolean }) {
  const tables: Record<string, any[]> = {
    stores: [],
    leads_crm: [],
    customers_crm: [],
    lead_activities: [],
    whatsapp_contact_identities: [],
    whatsapp_lead_conversions: [],
    whatsapp_channel_instances: [],
    workspace_members: [],
    profiles: [],
    marketing_sources: [],
    marketing_source_pixels: [],
    store_pixel_configs: [],
    lead_conversion_telemetry: [],
    integration_credentials: [],
    store_ad_accounts: [],
    store_ad_campaigns: [],
    ad_campaigns: [],
    store_listings: [],
    tourism_packages: [],
    chat_threads: [],
    chat_messages: [],
    chat_departments: [],
    ...seed,
  };
  const storageObjects = new Map<string, { bytes: Uint8Array; contentType?: string }>();
  let idSeq = 1;

  const ensureId = (row: any) => {
    if (!row.id) {
      const hex = String(idSeq++).padStart(12, "0");
      row.id = `99999999-9999-4999-8999-${hex}`;
    }
    return row;
  };

  function matchOrClause(row: any, orExpr: string): boolean {
    const parts = orExpr.split(",").map((s) => s.trim()).filter(Boolean);
    return parts.some((expr) => {
      const eqMatch = expr.match(/^([a-zA-Z0-9_]+)\.eq\.(.+)$/);
      if (eqMatch) {
        return String(row[eqMatch[1]] ?? "") === eqMatch[2];
      }
      const ilikeMatch = expr.match(/^([a-zA-Z0-9_]+)\.ilike\.(.+)$/i);
      if (ilikeMatch) {
        const escaped = ilikeMatch[2]
          .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
          .replace(/%/g, ".*");
        return new RegExp(`^${escaped}$`, "i").test(String(row[ilikeMatch[1]] ?? ""));
      }
      return false;
    });
  }

  function makeQuery(table: string) {
    let filters: Array<(row: any) => boolean> = [];
    let orderKey: { col: string; asc: boolean } | null = null;
    let limitNum: number | null = null;
    let pendingAction: "select" | "insert" | "update" | "upsert" | "delete" = "select";
    let pendingPayload: any = null;
    let conflictCols: string[] = [];

    const execute = async (): Promise<{ data: any; error: null; count?: number }> => {
      const rows = (tables[table] ||= []);

      if (pendingAction === "insert") {
        const incoming = Array.isArray(pendingPayload) ? pendingPayload : [pendingPayload];
        const created = incoming.map((item) => {
          const copy = ensureId({ ...item });
          rows.push(copy);
          return copy;
        });
        return { data: Array.isArray(pendingPayload) ? created : created[0], error: null };
      }

      if (pendingAction === "upsert") {
        const incoming = Array.isArray(pendingPayload) ? pendingPayload : [pendingPayload];
        const out: any[] = [];
        for (const item of incoming) {
          const idx =
            conflictCols.length > 0
              ? rows.findIndex((r) => conflictCols.every((c) => String(r[c] ?? "") === String(item[c] ?? "")))
              : -1;
          if (idx >= 0) {
            rows[idx] = { ...rows[idx], ...item };
            out.push(rows[idx]);
          } else {
            const copy = ensureId({ ...item });
            rows.push(copy);
            out.push(copy);
          }
        }
        return { data: Array.isArray(pendingPayload) ? out : out[0], error: null };
      }

      const matched = rows.filter((r) => filters.every((fn) => fn(r)));

      if (pendingAction === "update") {
        for (const r of matched) {
          Object.assign(r, pendingPayload);
        }
        return { data: matched, error: null };
      }

      if (pendingAction === "delete") {
        tables[table] = rows.filter((r) => !matched.includes(r));
        return { data: matched, error: null };
      }

      let result = [...matched];
      if (orderKey) {
        const { col, asc } = orderKey;
        result.sort((a, b) => {
          const av = a[col] ?? "";
          const bv = b[col] ?? "";
          return asc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
        });
      }
      if (limitNum !== null) result = result.slice(0, limitNum);
      return { data: result, error: null, count: result.length };
    };

    const builder: any = {
      select: () => builder,
      insert: (payload: any) => {
        pendingAction = "insert";
        pendingPayload = payload;
        return builder;
      },
      update: (payload: any) => {
        pendingAction = "update";
        pendingPayload = payload;
        return builder;
      },
      upsert: (payload: any, opts?: { onConflict?: string }) => {
        pendingAction = "upsert";
        pendingPayload = payload;
        conflictCols = opts?.onConflict ? opts.onConflict.split(",").map((s) => s.trim()) : [];
        return builder;
      },
      delete: () => {
        pendingAction = "delete";
        return builder;
      },
      eq: (col: string, val: any) => {
        filters.push((r) => r[col] === val);
        return builder;
      },
      neq: (col: string, val: any) => {
        filters.push((r) => r[col] !== val);
        return builder;
      },
      in: (col: string, vals: any[]) => {
        filters.push((r) => vals.includes(r[col]));
        return builder;
      },
      not: (col: string, op: string, rawVal: string) => {
        if (op === "in") {
          const inner = rawVal.replace(/^\(|\)$/g, "").split(",").map((s) => s.trim());
          filters.push((r) => !inner.includes(String(r[col] ?? "")));
        }
        return builder;
      },
      ilike: (col: string, pat: string) => {
        const clean = pat.replace(/%/g, "").toLowerCase();
        filters.push((r) => String(r[col] ?? "").toLowerCase().includes(clean));
        return builder;
      },
      or: (expr: string) => {
        filters.push((r) => matchOrClause(r, expr));
        return builder;
      },
      is: (col: string, val: any) => {
        filters.push((r) => (val === null ? r[col] === null || r[col] === undefined : r[col] === val));
        return builder;
      },
      gte: (col: string, val: any) => {
        filters.push((r) => String(r[col] ?? "") >= String(val));
        return builder;
      },
      order: (col: string, opts?: { ascending?: boolean }) => {
        orderKey = { col, asc: opts?.ascending !== false };
        return builder;
      },
      limit: (n: number) => {
        limitNum = n;
        return builder;
      },
      maybeSingle: async () => {
        const res = await execute();
        const first = Array.isArray(res.data) ? res.data[0] || null : res.data || null;
        return { data: first, error: res.error };
      },
      single: async () => {
        const res = await execute();
        const first = Array.isArray(res.data) ? res.data[0] || null : res.data || null;
        return { data: first, error: res.error };
      },
      then: (resolve: any, reject: any) => execute().then(resolve, reject),
    };
    return builder;
  }

  const db: any = {
    tables,
    storageObjects,
    from: (table: string) => makeQuery(table),
    rpc: async () => ({ data: null, error: null }),
  };

  if (options?.withStorage) {
    db.storage = {
      from: (bucket: string) => ({
        upload: async (objectPath: string, bytes: Uint8Array, opts?: { contentType?: string }) => {
          storageObjects.set(`${bucket}/${objectPath}`, { bytes, contentType: opts?.contentType });
          return { data: { path: objectPath }, error: null };
        },
        createSignedUrl: async (objectPath: string, expiresIn: number) => ({
          data: {
            signedUrl: `https://storage.waesy.test/object/sign/${bucket}/${objectPath}?token=sig_${expiresIn}`,
          },
          error: null,
        }),
        download: async (objectPath: string) => {
          const entry = storageObjects.get(`${bucket}/${objectPath}`);
          if (!entry) return { data: null, error: { message: "not found" } };
          return {
            data: new Blob([entry.bytes], { type: entry.contentType || "application/octet-stream" }),
            error: null,
          };
        },
      }),
    };
  }

  return db;
}

describe("Missao Waesy Omnichannel End-to-End (EARS-01 a EARS-09)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete process.env.GROQ_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.EVOLUTION_API_KEY;
  });

  it("[EARS-01] inclui meta_ads e lead_form em LEAD_SOURCES, exclui chaves tecnicas de notesAppend e formata campanha legivel", () => {
    const sourceValues = LEAD_SOURCES.map((s) => s.value);
    expect(sourceValues).toContain("meta_ads");
    expect(sourceValues).toContain("lead_form");

    for (const techKey of [
      "platform",
      "ctwa_clid",
      "fbclid",
      "fbp",
      "fbc",
      "gclid",
      "ad_id",
      "campaign_id",
      "kanban_stage_key",
      "thread_id",
      "detected_at",
    ]) {
      expect(INTERNAL_CUSTOM_FIELD_KEYS.has(techKey)).toBe(true);
    }

    const semantic = extractSemanticLeadFieldsFromAnswers({
      ctwa_clid: "ctwa_raw_999",
      fbclid: "fb.1.12345",
      source_url: "https://fb.me/ad/123",
      ad_id: "12020012345",
      destination: "Betos Carrero / Balneario",
      pax_adults: 2,
    });

    expect(semantic.notesAppend).not.toContain("ctwa_raw_999");
    expect(semantic.notesAppend).not.toContain("fb.1.12345");
    expect(semantic.notesAppend).not.toContain(" | ");

    const readable = formatReadableCampaignDetail({
      campaignName: "Campanha Férias",
      adsetName: "Conjunto Sul",
      adName: "Carrossel Beto Carrero",
      adId: "12020012345",
    });
    expect(readable).toBe("Campanha Férias · Conjunto Sul · Carrossel Beto Carrero");

    const dossierSrc = fs.readFileSync(
      path.resolve("src/components/tourism/crm/TourismPipeCardDossier.tsx"),
      "utf-8",
    );
    expect(dossierSrc).toContain("}, [lead.id]);");
    expect(dossierSrc).toContain("Respostas Estruturadas do Formulário");
  });

  it("[EARS-02] deduplica variantes de telefone BR (+55 / 9o digito / hifens) em estagios customizados e abre novo ciclo so apos ganho/perdido/arquivado", async () => {
    const db = createInMemorySupabaseMock({
      stores: [{ id: STORE_ID, settings: {} }],
      leads_crm: [
        {
          id: LEAD_ID_1,
          store_id: STORE_ID,
          full_name: "Ana Paula",
          phone: "+55 49 99999-8888",
          phone_normalized_digits: "5549999998888",
          email: "ana@example.com",
          status: "em_negociacao_custom",
          notes: "Interesse inicial confirmado.",
          custom_fields: {
            interests: [{ listing_id: "pkg-1", listing_title: "Pacote Gramado", ad_id: "ad-1" }],
          },
          created_at: new Date().toISOString(),
        },
      ],
    });

    // Segunda interacao com 4999998888 (sem +55 e sem 9o digito) sobre OUTRO anuncio
    const merged = await ingestOmnichannelLead(db, {
      storeId: STORE_ID,
      source: "meta_ads",
      sourceDetail: "Campanha Cancun",
      fullName: "Ana Paula",
      phone: "4999998888",
      sourceListingId: "pkg-2",
      sourceListingTitle: "Pacote Cancun",
      notes: "Interesse inicial confirmado.",
      customFields: { ad_id: "ad-2", ctwa_clid: "ctwa-xyz" },
    });

    expect(merged.createdNewLead).toBe(false);
    expect(merged.leadId).toBe(LEAD_ID_1);
    expect(db.tables.leads_crm).toHaveLength(1);
    expect(db.tables.leads_crm[0].custom_fields.interests).toHaveLength(2);
    expect(db.tables.leads_crm[0].notes).toBe("Interesse inicial confirmado.");

    // Agora fecha o lead existente e valida abertura de novo ciclo
    db.tables.leads_crm[0].status = "won";
    const freshAfterWon = await ingestOmnichannelLead(db, {
      storeId: STORE_ID,
      source: "whatsapp",
      fullName: "Ana Paula",
      phone: "4999998888",
      listingTitle: "Pacote Maceió",
    });

    expect(freshAfterWon.createdNewLead).toBe(true);
    expect(db.tables.leads_crm).toHaveLength(2);
  });

  it("[EARS-03] bloqueia leads_crm e Meta CAPI para equipe interna/stakeholders mantendo inbox e detecta telefone do staff", async () => {
    expect(isContactScopeSuppressed("internal_team", false)).toBe(true);
    expect(isContactScopeSuppressed("stakeholder", false)).toBe(true);
    expect(isContactScopeSuppressed("supplier", false)).toBe(true);
    expect(isContactScopeSuppressed("ignored", false)).toBe(true);
    expect(isContactScopeSuppressed("lead", false)).toBe(false);
    expect(isContactScopeSuppressed("lead", true)).toBe(true);

    const db = createInMemorySupabaseMock({
      stores: [{ id: STORE_ID, settings: {} }],
      workspace_members: [{ store_id: STORE_ID, profile_id: "prof-staff-1", role: "seller" }],
      profiles: [{ id: "prof-staff-1", phone: "+5549988887777", full_name: "Vendedor Loja" }],
      chat_threads: [{ id: THREAD_ID, store_id: STORE_ID, primary_phone_e164: "+5549988887777", metadata: {} }],
    });

    const staffCheck = await resolveContactCaptureSuppression(db, {
      storeId: STORE_ID,
      phone: "49 98888-7777",
    });
    expect(staffCheck.suppressed).toBe(true);
    expect(staffCheck.reason).toBe("staff_directory_phone");

    const attrResult = await correlateAndPersistInboundWhatsAppAttribution(db, {
      storeId: STORE_ID,
      threadId: THREAD_ID,
      phone: "+5549988887777",
      text: "Oi pessoal, cheguei na agência",
    });
    expect(attrResult.suppressed).toBe(true);
    expect(attrResult.capiDispatched).toBe(false);
    expect(db.tables.leads_crm).toHaveLength(0);
  });

  it("[EARS-04 e EARS-05] roteia CAPI multi-pixel por campanha e descobre todas as contas/pixels Meta além de accounts[0]", async () => {
    const pixels = [
      {
        id: "px-camp-a",
        name: "Pixel Campanha A",
        provider: "meta_pixel",
        external_pixel_id: "111000111",
        secret_payload_encrypted: encryptSecret(JSON.stringify({ access_token: "token-pixel-a" })),
        enabled_events: { lead: true, qualified_lead: true, contact: true },
        routing_rules: { campaign_ids: ["camp-A"] },
        is_default: false,
        is_active: true,
      },
      {
        id: "px-camp-b",
        name: "Pixel Campanha B",
        provider: "meta_pixel",
        external_pixel_id: "222000222",
        secret_payload_encrypted: encryptSecret(JSON.stringify({ access_token: "token-pixel-b" })),
        enabled_events: { lead: true, qualified_lead: true, contact: true },
        routing_rules: { campaign_ids: ["camp-B"] },
        is_default: false,
        is_active: true,
      },
    ];

    const matchedA = selectMatchedPixelsForContext(pixels, { campaignId: "camp-A" }, "Lead", "meta_pixel");
    expect(matchedA.map((p) => p.external_pixel_id)).toEqual(["111000111"]);

    const db = createInMemorySupabaseMock({
      stores: [{ id: STORE_ID, settings: {} }],
      marketing_source_pixels: pixels.map((p) => ({ ...p, store_id: STORE_ID })),
      store_ad_campaigns: [
        {
          id: "camp-row-1",
          store_id: STORE_ID,
          external_campaign_id: "camp-A",
          title: "Campanha Verão A",
          adset_id: "adset-A1",
          adset_name: "Público SC",
          external_ad_id: "ad-A1",
          external_ad_name: "Criativo Vídeo A",
          source_pixel_id: "px-camp-a",
          metadata: {},
        },
      ],
    });

    const enrichedLocal = await resolveAndEnrichMetaAdMetadata(db, {
      storeId: STORE_ID,
      adId: "ad-A1",
      skipGraphApi: true,
    });
    expect(enrichedLocal?.campaignName).toBe("Campanha Verão A");
    expect(enrichedLocal?.adsetName).toBe("Público SC");

    const capiFetchCalls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: RequestInfo | URL) => {
        const u = String(url);
        if (u.includes("graph.facebook.com") && u.includes("/events")) {
          capiFetchCalls.push(u);
          return new Response(JSON.stringify({ events_received: 1 }), { status: 200 });
        }
        if (u.includes("/me/adaccounts")) {
          return new Response(
            JSON.stringify({
              data: [
                { id: "act_101", account_id: "101", name: "Conta Principal", account_status: 1 },
                { id: "act_202", account_id: "202", name: "Conta Secundária", account_status: 1 },
              ],
            }),
            { status: 200 },
          );
        }
        if (u.includes("act_101/adspixels")) {
          return new Response(JSON.stringify({ data: [{ id: "px_101", name: "Pixel 101" }] }), { status: 200 });
        }
        if (u.includes("act_202/adspixels")) {
          return new Response(JSON.stringify({ data: [{ id: "px_202", name: "Pixel 202" }] }), { status: 200 });
        }
        if (u.includes("/me/accounts")) {
          return new Response(JSON.stringify({ data: [{ id: "page_1", name: "Página Oficial" }] }), { status: 200 });
        }
        return new Response("{}", { status: 404 });
      }),
    );

    const capiRes = await dispatchServerSidePixelConversion(db, {
      storeId: STORE_ID,
      eventName: "Lead",
      eventId: "evt_multi_a_1",
      phone: "+5549999998888",
      campaignId: "camp-A",
      adId: "ad-A1",
    });

    expect(capiRes.sent).toBe(true);
    expect(capiFetchCalls).toHaveLength(1);
    expect(capiFetchCalls[0]).toContain("/111000111/events");
    expect(capiFetchCalls[0]).not.toContain("/222000222/events");
    expect(db.tables.lead_conversion_telemetry[0].source_pixel_id).toBe("px-camp-a");
    expect(db.tables.lead_conversion_telemetry[0].external_pixel_id).toBe("111000111");

    const discovery = await executeDiscoverAccessibleAdAccounts(db, STORE_ID, "meta_ads", "test-oauth-token");
    expect(discovery.accounts).toHaveLength(2);
    expect(discovery.pixels.map((p: any) => p.id)).toEqual(["px_101", "px_202"]);
  });

  it("[EARS-06 e EARS-07] sobe midias acima de 5.5MB no bucket privado, recusa fabricar transcricao sem chave e transcreve via Whisper quando configurado", async () => {
    process.env.EVOLUTION_API_KEY = "evo-key";
    const dbWithStorage = createInMemorySupabaseMock(
      {
        whatsapp_channel_instances: [
          {
            id: INSTANCE_ID,
            store_id: STORE_ID,
            provider: "evolution_api",
            instance_key: "geral",
            external_instance_id: "waesy_geral",
            public_config: { base_url: "https://evo.waesy.test" },
          },
        ],
        chat_threads: [
          {
            id: THREAD_ID,
            store_id: STORE_ID,
            lead_id: LEAD_ID_1,
            channel_instance_id: INSTANCE_ID,
            metadata: {},
          },
        ],
        leads_crm: [{ id: LEAD_ID_1, store_id: STORE_ID, custom_fields: {} }],
        chat_messages: [
          {
            id: "msg-vid-big",
            thread_id: THREAD_ID,
            external_message_id: "ext-vid-big",
            message_type: "video",
            payload: {},
          },
          {
            id: "msg-aud-1",
            thread_id: THREAD_ID,
            external_message_id: "ext-aud-1",
            message_type: "audio",
            message: "[Áudio]",
            attachments: ["data:audio/ogg;base64," + Buffer.from("fake-ogg-bytes-long-enough-to-transcribe-012345").toString("base64")],
            payload: { media: { type: "audio", mimetype: "audio/ogg" } },
          },
        ],
      },
      { withStorage: true },
    );

    const hugeVideoBase64 = Buffer.alloc(4_500_000, 65).toString("base64"); // ~6_000_000 chars base64 (> 5.5MB guard)
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: RequestInfo | URL) => {
        const u = String(url);
        if (u.includes("getBase64FromMediaMessage")) {
          return new Response(JSON.stringify({ base64: hugeVideoBase64, mimetype: "video/mp4" }), { status: 200 });
        }
        if (u.includes("api.groq.com/openai/v1/audio/transcriptions")) {
          return new Response(JSON.stringify({ text: "Quero cotação para Maceió em julho com 2 adultos." }), { status: 200 });
        }
        return new Response("{}", { status: 404 });
      }),
    );

    const hydrated = await hydrateMediaFromEvolution({
      db: dbWithStorage,
      storeId: STORE_ID,
      channelInstanceId: INSTANCE_ID,
      threadId: THREAD_ID,
      messageId: "msg-vid-big",
      externalMessageId: "ext-vid-big",
      messageType: "video",
      persistToMessage: true,
    });

    expect(hydrated?.storageBucket).toBe("chat-media-private");
    expect(hydrated?.signedUrl).toContain("https://storage.waesy.test/object/sign/chat-media-private/");
    const videoRow = dbWithStorage.tables.chat_messages.find((m: any) => m.id === "msg-vid-big");
    expect(videoRow.payload.media.media_size_guard).toBe(false);

    const refreshed = await refreshSignedChatMediaUrl(
      dbWithStorage,
      videoRow.payload.media.storage_bucket,
      videoRow.payload.media.storage_path,
      7200,
    );
    expect(refreshed).toContain("sig_7200");

    // Negativo: sem nenhuma chave Groq/OpenAI -> NAO inventa texto!
    const noKeyResult = await transcribeAudioMediaServer({
      db: dbWithStorage,
      storeId: STORE_ID,
      threadId: THREAD_ID,
      messageId: "msg-aud-1",
    });
    expect(noKeyResult.ok).toBe(false);
    expect(noKeyResult.status).toBe("no_provider_key");
    expect(noKeyResult.transcript).toBeNull();

    // Positivo: com chave Groq -> Whisper real + indexacao no lead e thread
    process.env.GROQ_API_KEY = "gsk_test_key";
    const okTranscript = await transcribeAudioMediaServer({
      db: dbWithStorage,
      storeId: STORE_ID,
      threadId: THREAD_ID,
      messageId: "msg-aud-1",
    });
    expect(okTranscript.ok).toBe(true);
    expect(okTranscript.transcript).toContain("Maceió");
    expect(dbWithStorage.tables.leads_crm[0].custom_fields.audio_transcripts[0].text).toContain("Maceió");

    // Negativo Vision sem midia nem texto valido -> honesto
    const noMediaVision = await extractMediaAndChatToLeadAndKnowledge({
      db: dbWithStorage,
      storeId: STORE_ID,
      threadId: THREAD_ID,
    });
    expect(noMediaVision.ok).toBe(false);
    expect(noMediaVision.status).toBe("media_unavailable");
  });

  it("[EARS-08 e EARS-09] adapta Copiloto SDR ao nicho real, faz Auto-Fill de ficha e calcula SLA/Aguardando/Esquecidos hoje com precisão", async () => {
    const now = Date.now();
    const minAgo = (m: number) => new Date(now - m * 60_000).toISOString();

    const db = createInMemorySupabaseMock({
      stores: [{ id: STORE_ID, name: "Imobiliária Horizonte", niche: "real_estate", settings: {} }],
      store_listings: [
        { id: "lst-1", store_id: STORE_ID, title: "Apartamento Beira-Mar 3 Dorms", price_cents: 85000000, status: "published" },
      ],
      chat_threads: [
        {
          id: THREAD_ID,
          store_id: STORE_ID,
          lead_id: LEAD_ID_1,
          guest_name: "Marcos",
          primary_phone_e164: "+5549999911111",
          metadata: {},
          attribution: { campaign: "Captação Imóveis Alto Padrão" },
        },
      ],
      leads_crm: [
        {
          id: LEAD_ID_1,
          store_id: STORE_ID,
          full_name: "Marcos",
          phone: "+5549999911111",
          status: "new",
          custom_fields: {},
        },
      ],
      chat_messages: [
        {
          id: "m1",
          thread_id: THREAD_ID,
          is_staff_reply: false,
          message: "[Áudio]",
          payload: { transcript: "Tenho interesse no apartamento 3 dorms em Florianópolis com orçamento de R$ 850.000." },
          created_at: minAgo(5),
        },
        {
          id: "m2",
          thread_id: THREAD_ID,
          is_staff_reply: false,
          message: "Conseguem agendar visita esta semana?",
          payload: {},
          created_at: minAgo(2),
        },
      ],
    });

    const insight = await buildMultiNicheCopilotContextAndReply({
      db,
      storeId: STORE_ID,
      threadId: THREAD_ID,
    });
    expect(insight.nicheId).toBe("real_estate");
    expect(insight.buyerIntent).toBe("hot");
    expect(insight.sdrScore).toBeGreaterThanOrEqual(80);
    expect(insight.suggestedReply).toContain("Apartamento Beira-Mar");

    const autoFill = await extractLeadDossierFromThreadServer({
      db,
      storeId: STORE_ID,
      threadId: THREAD_ID,
      leadId: LEAD_ID_1,
      apply: true,
    });
    expect(autoFill.applied).toBe(true);
    expect(db.tables.leads_crm[0].custom_fields.niche_id).toBe("real_estate");

    // EARS-09: SLA & Waiting strict verification
    const breachedWaiting = computeThreadSlaStatus({
      status: "open",
      lastCustomerMessageAt: minAgo(25),
      lastStaffReplyAt: minAgo(60),
      departmentSlaMinutes: 15,
      nowMs: now,
    });
    expect(breachedWaiting.waitingForReply).toBe(true);
    expect(breachedWaiting.waitingMinutes).toBe(25);
    expect(breachedWaiting.slaStatus).toBe("breached");
    expect(breachedWaiting.isForgottenToday).toBe(true);

    const answeredByStaff = computeThreadSlaStatus({
      status: "open",
      lastCustomerMessageAt: minAgo(25),
      lastStaffReplyAt: minAgo(10),
      departmentSlaMinutes: 15,
      nowMs: now,
    });
    expect(answeredByStaff.waitingForReply).toBe(false);
    expect(answeredByStaff.slaStatus).toBe("ok");
    expect(answeredByStaff.isForgottenToday).toBe(false);

    const closedThread = computeThreadSlaStatus({
      status: "closed",
      lastCustomerMessageAt: minAgo(120),
      lastStaffReplyAt: null,
      departmentSlaMinutes: 15,
      nowMs: now,
    });
    expect(closedThread.waitingForReply).toBe(false);
    expect(closedThread.isForgottenToday).toBe(false);

    const summary = computeSlaAlertsSummary(
      [
        { id: "t-a", customer: { full_name: "Cliente A" }, department: "vendas", waiting_for_reply: true, waiting_minutes: 40, sla_minutes: 15, sla_status: "breached", is_forgotten_today: true },
        { id: "t-b", customer: { full_name: "Cliente B" }, department: "suporte", waiting_for_reply: true, waiting_minutes: 95, sla_minutes: 15, sla_status: "breached", is_forgotten_today: true },
        { id: "t-c", customer: { full_name: "Cliente C" }, department: "geral", waiting_for_reply: false, waiting_minutes: 0, sla_minutes: 15, sla_status: "ok", is_forgotten_today: false },
      ],
      2,
    );
    expect(summary.waitingCount).toBe(2);
    expect(summary.breachedCount).toBe(2);
    expect(summary.forgottenTodayCount).toBe(2);
    expect(summary.forgottenLeadsCount).toBe(2);
    expect(summary.forgottenThreads[0].id).toBe("t-b");
  });

  it("[EARS-02 / EARS-05 / EARS-07 / EARS-08] deduplica telefone pre-backfill com hifen, indexa Base Continua sem PII, registra tools Meta MCP e valida UI", async () => {
    const db = createInMemorySupabaseMock({
      stores: [{ id: STORE_ID, settings: {} }],
      leads_crm: [
        {
          id: LEAD_ID_1,
          store_id: STORE_ID,
          full_name: "Carlos Eduardo",
          phone: "(49) 99999-8888",
          phone_normalized_digits: null,
          status: "atendimento_inicial",
          custom_fields: {},
          created_at: new Date().toISOString(),
        },
      ],
    });

    const mergedFormatted = await ingestOmnichannelLead(db, {
      storeId: STORE_ID,
      source: "lead_form",
      sourceDetail: "Formulário Rápido",
      fullName: "Carlos Eduardo",
      phone: "5549999998888",
      sourceListingId: "pkg-formatted-1",
      sourceListingTitle: "Pacote Serra Gaúcha",
    });
    expect(mergedFormatted.createdNewLead).toBe(false);
    expect(mergedFormatted.leadId).toBe(LEAD_ID_1);

    const kbRes = await appendVerifiedFactToContinuousKnowledgeBase({
      db,
      storeId: STORE_ID,
      facts: [
        "Parcelamento no PIX em até 3x sem juros para o cliente carlos@teste.com telefone 49 99999-8888 CPF 123.456.789-00",
      ],
      matchedCatalogTitle: "Pacote Serra Gaúcha",
      niche: "tourism",
    });
    expect(kbRes.savedCount).toBe(1);
    const savedFact = db.tables.stores[0].settings.continuous_knowledge_entries[0].fact;
    expect(savedFact).toContain("[email-omitido]");
    expect(savedFact).toContain("[telefone-omitido]");
    expect(savedFact).toContain("[cpf-omitido]");

    const mcpSrc = fs.readFileSync(path.resolve("src/registries/mcp-tool-registry.ts"), "utf-8");
    expect(mcpSrc).toContain("meta_ads_discover_accounts_and_pixels:");
    expect(mcpSrc).toContain("meta_ads_get_closed_loop_roas:");
    expect(mcpSrc).toContain("meta_ads_enrich_ad_metadata:");

    const chatUiSrc = fs.readFileSync(
      path.resolve("src/components/atendimento/AtendimentoChatWorkspace.tsx"),
      "utf-8",
    );
    expect(chatUiSrc).toContain("handleConfirmAutoFillSave");
    expect(chatUiSrc).toContain("showForgottenTray");
    expect(chatUiSrc).toContain("onContactScopeChanged");

    // Smoke-importa modulos UI e rotas alterados para garantir zero erros de sintaxe/import no Vite
    const [
      sourcesPanelMod,
      injectorMod,
      sidebarMod,
      chatWsMod,
      metaWebhookMod,
      waWebhookMod,
    ] = await Promise.all([
      import("@/components/marketing/MarketingSourcesMultiPixelPanel"),
      import("@/components/analytics/StoreAnalyticsInjector"),
      import("@/components/chat/customer-360-sidebar"),
      import("@/components/atendimento/AtendimentoChatWorkspace"),
      import("@/routes/api.webhooks.meta-ads"),
      import("@/routes/api.webhooks.whatsapp"),
    ]);
    expect(typeof sourcesPanelMod.MarketingSourcesMultiPixelPanel).toBe("function");
    expect(typeof injectorMod.StoreAnalyticsInjector).toBe("function");
    expect(typeof sidebarMod.Customer360Sidebar).toBe("function");
    expect(typeof chatWsMod.AtendimentoChatWorkspace).toBe("function");
    expect(metaWebhookMod.Route).toBeDefined();
    expect(waWebhookMod.Route).toBeDefined();
  }, 120000);
});
