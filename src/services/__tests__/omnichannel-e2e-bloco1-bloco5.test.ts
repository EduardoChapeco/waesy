import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { encryptSecret } from "@/lib/crypto-vault.server";

const STORE_ID = "11111111-1111-4111-8111-111111111111";
const INSTANCE_ID = "22222222-2222-4222-8222-222222222222";
const CUSTOMER_A = "33333333-3333-4333-8333-333333333333";
const CUSTOMER_B = "44444444-4444-4444-8444-444444444444";

function createFilterAwareMockDb(seed: Partial<Record<string, any[]>> = {}, rpcHandler?: (fn: string, params: any) => any) {
  const tables: Record<string, any[]> = {
    stores: [],
    profiles: [],
    workspace_members: [],
    whatsapp_channel_instances: [],
    whatsapp_contact_identities: [],
    whatsapp_provider_webhook_events: [],
    whatsapp_webhook_inbox: [],
    whatsapp_groups_directory: [],
    whatsapp_history_sync_jobs: [],
    whatsapp_outbox: [],
    whatsapp_lead_conversions: [],
    store_workflows: [],
    chat_departments: [],
    chat_threads: [],
    chat_messages: [],
    leads_crm: [],
    customers_crm: [],
    orders: [],
    tourism_trips: [],
    travel_proposals: [],
    commercial_invoices: [],
    ad_campaigns: [],
    store_ad_campaigns: [],
    ad_attribution_touchpoints: [],
    marketing_sources: [],
    marketing_source_pixels: [],
    lead_conversion_telemetry: [],
    ...seed,
  };
  let seq = 1;
  const recordedUpdates: Array<{ table: string; payload: any }> = [];
  const recordedInserts: Array<{ table: string; payload: any }> = [];

  function evalOrExpr(row: any, expr: string): boolean {
    return expr.split(",").some((clause) => {
      const c = clause.trim();
      const eqM = c.match(/^([a-zA-Z0-9_]+)\.eq\.(.+)$/);
      if (eqM) return String(row[eqM[1]] ?? "") === eqM[2];
      const ilikeM = c.match(/^([a-zA-Z0-9_]+)\.ilike\.(.+)$/);
      if (ilikeM) {
        const needle = ilikeM[2].replace(/%/g, "").toLowerCase();
        return String(row[ilikeM[1]] ?? "").toLowerCase().includes(needle);
      }
      const isNullM = c.match(/^([a-zA-Z0-9_]+)\.is\.null$/);
      if (isNullM) return row[isNullM[1]] === null || row[isNullM[1]] === undefined;
      return false;
    });
  }

  function makeBuilder(table: string) {
    const ops: Array<(row: any) => boolean> = [];
    let action: "select" | "insert" | "update" | "upsert" = "select";
    let payload: any = null;
    let maxRows: number | null = null;
    let upsertIgnoreDupes = false;
    let sortCol: { col: string; asc: boolean } | null = null;

    const getRows = () => {
      if (!tables[table]) tables[table] = [];
      return tables[table];
    };

    const run = async () => {
      const rows = getRows();
      if (action === "insert") {
        const list = Array.isArray(payload) ? payload : [payload];
        const inserted = list.map((it) => ({
          id: it.id || `99999999-9999-4999-8999-${String(seq++).padStart(12, "0")}`,
          created_at: it.created_at || new Date().toISOString(),
          updated_at: it.updated_at || new Date().toISOString(),
          ...it,
        }));
        rows.push(...inserted);
        recordedInserts.push({ table, payload: Array.isArray(payload) ? inserted : inserted[0] });
        return { data: Array.isArray(payload) ? inserted : inserted[0], error: null };
      }
      if (action === "upsert") {
        const list = Array.isArray(payload) ? payload : [payload];
        const out: any[] = [];
        for (const it of list) {
          const dup =
            (it.event_key && rows.find((r) => r.event_key === it.event_key)) ||
            (it.external_message_id && rows.find((r) => r.external_message_id === it.external_message_id && r.thread_id === it.thread_id));
          if (dup) {
            if (!upsertIgnoreDupes) {
              Object.assign(dup, it);
              out.push(dup);
            }
          } else {
            const created = {
              id: it.id || `99999999-9999-4999-8999-${String(seq++).padStart(12, "0")}`,
              processing_status: it.processing_status || "received",
              ...it,
            };
            rows.push(created);
            out.push(created);
          }
        }
        return { data: Array.isArray(payload) ? out : out[0] || null, error: null };
      }
      if (action === "update") {
        const updated: any[] = [];
        for (const r of rows) {
          if (ops.every((fn) => fn(r))) {
            Object.assign(r, payload);
            updated.push(r);
          }
        }
        recordedUpdates.push({ table, payload });
        return { data: updated, error: null };
      }

      let filtered = rows.filter((r) => ops.every((fn) => fn(r)));
      if (sortCol) {
        const { col, asc } = sortCol;
        filtered = [...filtered].sort((a, b) => {
          const va = String(a[col] || "");
          const vb = String(b[col] || "");
          return asc ? va.localeCompare(vb) : vb.localeCompare(va);
        });
      }
      if (maxRows !== null) filtered = filtered.slice(0, maxRows);
      return { data: filtered, error: null, count: filtered.length };
    };

    const api: any = {
      select: () => api,
      insert: (p: any) => {
        action = "insert";
        payload = p;
        return api;
      },
      update: (p: any) => {
        action = "update";
        payload = p;
        return api;
      },
      upsert: (p: any, opts?: { ignoreDuplicates?: boolean }) => {
        action = "upsert";
        payload = p;
        upsertIgnoreDupes = Boolean(opts?.ignoreDuplicates);
        return api;
      },
      eq: (col: string, val: any) => {
        ops.push((r) => r[col] === val);
        return api;
      },
      neq: (col: string, val: any) => {
        ops.push((r) => r[col] !== val);
        return api;
      },
      not: (col: string, op: string, val: any) => {
        if (op === "in") {
          const list = String(val || "").replace(/^\(|\)$/g, "").split(",").map((s) => s.trim());
          ops.push((r) => !list.includes(String(r[col] ?? "")));
        } else if (op === "eq") {
          ops.push((r) => JSON.stringify(r[col]) !== String(val));
        }
        return api;
      },
      in: (col: string, vals: any[]) => {
        ops.push((r) => Array.isArray(vals) && vals.includes(r[col]));
        return api;
      },
      is: (col: string, val: any) => {
        ops.push((r) => (val === null ? r[col] == null : r[col] === val));
        return api;
      },
      gte: (col: string, val: any) => {
        ops.push((r) => String(r[col] || "") >= String(val || ""));
        return api;
      },
      lt: (col: string, val: any) => {
        ops.push((r) => String(r[col] || "") < String(val || ""));
        return api;
      },
      or: (expr: string) => {
        ops.push((r) => evalOrExpr(r, expr));
        return api;
      },
      order: (col: string, opts?: { ascending?: boolean }) => {
        if (!sortCol) sortCol = { col, asc: opts?.ascending !== false };
        return api;
      },
      limit: (n: number) => {
        maxRows = n;
        return api;
      },
      maybeSingle: async () => {
        const res = await run();
        const first = Array.isArray(res.data) ? res.data[0] || null : res.data || null;
        return { data: first, error: res.error };
      },
      single: async () => {
        const res = await run();
        const first = Array.isArray(res.data) ? res.data[0] || null : res.data || null;
        return { data: first, error: first ? res.error : { message: "not_found" } };
      },
      then: (onFulfilled: any, onRejected?: any) => Promise.resolve(run()).then(onFulfilled, onRejected),
    };
    return api;
  }

  return {
    tables,
    recordedUpdates,
    recordedInserts,
    db: {
      from: (table: string) => makeBuilder(table),
      rpc: async (fn: string, params: any) => (rpcHandler ? rpcHandler(fn, params) : { data: null, error: null }),
    },
  };
}

let activeMockDb: ReturnType<typeof createFilterAwareMockDb> | null = null;

vi.mock("@tanstack/react-start", () => ({
  createServerFn: vi.fn(() => {
    const b: any = {
      validator: vi.fn((v: any) => {
        b._validator = v;
        return b;
      }),
      handler: vi.fn((h: any) => {
        const fn = async (args?: { data?: any }) => {
          let data = args?.data;
          if (b._validator) {
            data = typeof b._validator === "function" ? b._validator(data) : b._validator.parse(data);
          }
          return h({ data });
        };
        fn.handler = h;
        return fn;
      }),
    };
    return b;
  }),
}));

vi.mock("@/lib/supabase", () => ({
  getServerClient: () => activeMockDb?.db,
  getSSRClient: () => activeMockDb?.db,
  getAnonServerClient: () => activeMockDb?.db,
  SupabaseUnconfiguredError: class SupabaseUnconfiguredError extends Error {},
}));

vi.mock("@/lib/server-access", () => ({
  STAFF_ROLES: ["owner", "admin", "manager", "seller", "support", "agent"],
  MANAGER_ROLES: ["owner", "admin", "manager"],
  getServerIdentity: async () => ({
    id: "profile-owner-1",
    role: "owner",
    store_id: STORE_ID,
    memberships: [{ store_id: STORE_ID, role: "owner" }],
  }),
  assertStoreAccess: vi.fn(),
  assertManagerAccess: vi.fn(),
}));

import {
  normalizeUnofficialIncomingMessage,
  persistInboundMessage,
} from "@/services/whatsapp-provider-webhook.server";
import { runEvolutionDeltaSyncForInstance } from "@/services/whatsapp-evolution-sync.server";
import {
  getCustomer360Context,
  listChatThreads,
} from "@/services/chat.functions";
import { calculateStoreLtvAndAdSpend } from "@/services/crm.functions";
import { getMarketingRoiClosedLoopMetrics } from "@/services/ads.functions";
import { getStoreAttributionOverview } from "@/services/pixels.functions";

afterEach(() => {
  vi.unstubAllGlobals();
  activeMockDb = null;
});

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("BLOCO 1-5 E2E: DM vs Group Isolation, Evolution Subject, Closed-Loop LTV/CAC & No-Op Sync", () => {
  it("EARS-01 Webhook: isola 100% DM vs Grupo do mesmo participante e resolve groupSubject sem sobrescrever com pushName", async () => {
    const dmThread = {
      id: "th-dm-evellyn",
      store_id: STORE_ID,
      channel_instance_id: INSTANCE_ID,
      channel_identity_id: "id-dm-evellyn",
      thread_type: "store",
      entity_id: "+5549991112222",
      primary_phone_e164: "+5549991112222",
      guest_name: "Evellyn Grossi",
      group_subject: null,
      status: "open",
      metadata: { whatsapp_jid: "5549991112222@s.whatsapp.net" },
    };

    const mock = createFilterAwareMockDb({
      whatsapp_contact_identities: [
        {
          id: "id-dm-evellyn",
          store_id: STORE_ID,
          channel_instance_id: INSTANCE_ID,
          provider: "evolution_api",
          external_user_id: "5549991112222@s.whatsapp.net",
          phone_e164: "+5549991112222",
          display_name: "Evellyn Grossi",
        },
      ],
      chat_threads: [dmThread],
    });
    activeMockDb = mock;

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).includes("/group/findGroupInfos/")) {
          return new Response(JSON.stringify({ subject: "Grupo Viagens VIP Cancún" }), { status: 200 });
        }
        return new Response("{}", { status: 200 });
      }),
    );

    const instance = {
      id: INSTANCE_ID,
      store_id: STORE_ID,
      provider: "evolution_api",
      instance_key: "principal",
      external_instance_id: "principal",
      public_config: { base_url: "https://evo.local" },
      secret_payload_encrypted: encryptSecret(JSON.stringify({ api_key: "secret" })),
    };

    const rawGroupWebhook = {
      event: "messages.upsert",
      data: {
        key: {
          id: "grp-msg-001",
          remoteJid: "120363012345678901@g.us",
          participant: "5549991112222@s.whatsapp.net",
          fromMe: false,
        },
        pushName: "Evellyn Grossi",
        message: { conversation: "Bom dia equipe no grupo!" },
        messageTimestamp: Math.floor(Date.now() / 1000),
      },
    };

    const normalizedGrp = normalizeUnofficialIncomingMessage("evolution_api", rawGroupWebhook as any, rawGroupWebhook.data as any);
    expect(normalizedGrp).not.toBeNull();
    expect(normalizedGrp!.isGroup).toBe(true);

    const persistRes = await persistInboundMessage(
      mock.db as any,
      "evolution_api",
      instance,
      rawGroupWebhook as any,
      normalizedGrp!,
    );

    expect(persistRes.threadId).toBeDefined();
    expect(persistRes.threadId).not.toBe("th-dm-evellyn");

    const grpThread = mock.tables.chat_threads.find((t) => t.id === persistRes.threadId);
    expect(grpThread.thread_type).toBe("group");
    expect(grpThread.entity_id).toBe("120363012345678901@g.us");
    expect(grpThread.primary_phone_e164).toBeNull();
    expect(grpThread.guest_name).toBe("Grupo Viagens VIP Cancún");
    expect(grpThread.guest_name).not.toBe("Evellyn Grossi");

    // Verificar que uma nova mensagem DM da mesma participante vai somente para th-dm-evellyn
    const rawDmWebhook = {
      event: "messages.upsert",
      data: {
        key: {
          id: "dm-msg-002",
          remoteJid: "5549991112222@s.whatsapp.net",
          fromMe: false,
        },
        pushName: "Evellyn Grossi",
        message: { conversation: "Oi no privado!" },
        messageTimestamp: Math.floor(Date.now() / 1000) + 5,
      },
    };
    const normalizedDm = normalizeUnofficialIncomingMessage("evolution_api", rawDmWebhook as any, rawDmWebhook.data as any);
    const dmRes = await persistInboundMessage(
      mock.db as any,
      "evolution_api",
      instance,
      rawDmWebhook as any,
      normalizedDm!,
    );
    expect(dmRes.threadId).toBe("th-dm-evellyn");
    expect(dmRes.threadId).not.toBe(grpThread.id);
  });

  it("EARS-01 & EARS-03 Delta Sync: usa /group/fetchAllGroups, isola DM/Grupo e ignora updates redundantes no ciclo seguinte", async () => {
    const fixedSec = 1_760_000_000;
    const mock = createFilterAwareMockDb({
      whatsapp_channel_instances: [
        {
          id: INSTANCE_ID,
          store_id: STORE_ID,
          provider: "evolution_api",
          instance_key: "principal",
          external_instance_id: "principal",
          status: "connected",
          is_active: true,
          webhook_url: "https://waesy.com.br/api/webhooks/whatsapp/evolution/principal",
          public_config: {
            base_url: "https://evo.local",
            webhook_verified_at: new Date().toISOString(),
          },
          secret_payload_encrypted: encryptSecret(JSON.stringify({ api_key: "key" })),
        },
      ],
      chat_threads: [
        {
          id: "th-dm-katrine",
          store_id: STORE_ID,
          channel_instance_id: INSTANCE_ID,
          thread_type: "store",
          entity_id: "+5549992223333",
          primary_phone_e164: "+5549992223333",
          guest_name: "Katrine Excelência",
          status: "open",
          last_message_at: new Date(fixedSec * 1000).toISOString(),
          last_message_text: "Oi DM",
          metadata: { whatsapp_jid: "5549992223333@s.whatsapp.net", history_bootstrap_done: true, sync_cursor_ms: fixedSec * 1000 },
        },
      ],
    });
    activeMockDb = mock;

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const u = String(input);
        if (u.includes("/chat/findChats/")) {
          return new Response(
            JSON.stringify([
              {
                remoteJid: "120363098765432100@g.us",
                updatedAt: new Date(fixedSec * 1000).toISOString(),
                lastMessage: {
                  key: { id: "grp-last-1", remoteJid: "120363098765432100@g.us", fromMe: false, participant: "5549992223333@s.whatsapp.net" },
                  pushName: "Katrine Excelência",
                  message: { conversation: "Enviei o contrato no grupo!" },
                  messageTimestamp: fixedSec,
                },
              },
            ]),
            { status: 200 },
          );
        }
        if (u.includes("/group/fetchAllGroups/")) {
          return new Response(
            JSON.stringify([{ id: "120363098765432100@g.us", subject: "Operação Black FRT" }]),
            { status: 200 },
          );
        }
        if (u.includes("/chat/findContacts/")) return new Response(JSON.stringify([]), { status: 200 });
        if (u.includes("/chat/findMessages/")) return new Response(JSON.stringify({ messages: { records: [] } }), { status: 200 });
        return new Response("{}", { status: 200 });
      }),
    );

    const instance = { ...mock.tables.whatsapp_channel_instances[0] };

    // 1a execucao: cria grupo isolado com assunto real Operação Black FRT (nunca Katrine Excelência)
    const firstRun = await runEvolutionDeltaSyncForInstance({
      db: mock.db as any,
      instance,
      storeId: STORE_ID,
      mode: "delta",
      force: true,
    });
    expect(firstRun.success).toBe(true);
    const createdGroup = mock.tables.chat_threads.find((t) => t.thread_type === "group");
    expect(createdGroup).toBeDefined();
    expect(createdGroup.guest_name).toBe("Operação Black FRT");
    expect(createdGroup.group_subject).toBe("Operação Black FRT");
    expect(createdGroup.primary_phone_e164).toBeNull();
    expect(mock.tables.chat_threads.find((t) => t.id === "th-dm-katrine")?.guest_name).toBe("Katrine Excelência");

    // 2a execucao no-op com dados identicos -> ZERO updates redundantes em chat_threads
    mock.recordedUpdates.length = 0;
    const secondRun = await runEvolutionDeltaSyncForInstance({
      db: mock.db as any,
      instance,
      storeId: STORE_ID,
      mode: "delta",
      force: true,
    });
    expect(secondRun.success).toBe(true);
    const redundantThreadUpdates = mock.recordedUpdates.filter((u) => u.table === "chat_threads");
    expect(redundantThreadUpdates.length).toBe(0);
  });

  it("EARS-02, EARS-06 & EARS-08: listChatThreads resolve media vazia em preview sem @sem-email e calculateStoreLtvAndAdSpend fecha ciclo sem dupla contagem", async () => {
    const nowIso = new Date().toISOString();
    const mock = createFilterAwareMockDb(
      {
        chat_threads: [
          {
            id: "th-audio-preview",
            store_id: STORE_ID,
            thread_type: "store",
            context_type: "whatsapp",
            status: "open",
            entity_id: "+5549991571265",
            primary_phone_e164: "+5549991571265",
            guest_name: "Gabriella",
            guest_email: "atendimento+5549991571265@sem-email.waesy.local",
            last_message_text: null,
            last_message_at: nowIso,
            updated_at: nowIso,
            created_at: nowIso,
            metadata: {},
          },
        ],
        orders: [
          { id: "ord-1", store_id: STORE_ID, customer_id: CUSTOMER_A, total_cents: 100000, status: "paid", created_at: nowIso, attributed_campaign_id: "camp-meta-1", utm_campaign: "Verão Floripa" },
          { id: "ord-2", store_id: STORE_ID, customer_id: CUSTOMER_A, total_cents: 150000, status: "completed", created_at: nowIso, utm_campaign: "Verão Floripa" },
        ],
        tourism_trips: [
          { id: "trip-1", store_id: STORE_ID, customer_id: CUSTOMER_B, total_cents: 300000, status: "confirmed", source_proposal_id: "prop-linked-1", created_at: nowIso },
        ],
        travel_proposals: [
          { id: "prop-linked-1", store_id: STORE_ID, customer_id: CUSTOMER_B, status: "converted", pricing: { total_price_cents: 300000 }, created_at: nowIso },
          { id: "prop-unlinked-2", store_id: STORE_ID, customer_id: CUSTOMER_B, lead_id: "lead-meta-1", status: "accepted", pricing: { total_price_cents: 200000 }, created_at: nowIso },
        ],
        commercial_invoices: [
          { id: "inv-1", store_id: STORE_ID, customer_id: CUSTOMER_A, lead_id: "lead-meta-1", total_cents: 50000, status: "paid", created_at: nowIso },
        ],
        customers_crm: [
          { id: CUSTOMER_A, store_id: STORE_ID, created_at: nowIso, deleted_at: null },
          { id: CUSTOMER_B, store_id: STORE_ID, created_at: nowIso, deleted_at: null },
        ],
        leads_crm: [
          { id: "lead-meta-1", store_id: STORE_ID, customer_id: CUSTOMER_B, source: "meta_ads", status: "won", created_at: nowIso, custom_fields: { attribution: { campaign_id: "camp-meta-1", campaign_name: "Verão Floripa" } } },
        ],
        ad_campaigns: [
          { id: "camp-meta-1", store_id: STORE_ID, external_campaign_id: "camp-meta-1", title: "Verão Floripa", budget_cents: 100000, spent_cents: 80000, status: "active", created_at: nowIso, settings: { real_spent_cents: 80000, synced_clicks: 40 } },
        ],
        store_ad_campaigns: [
          { id: "sc-google-1", store_id: STORE_ID, external_campaign_id: "camp-google-1", title: "Google Search", total_budget_cents: 20000, status: "active", created_at: nowIso, metadata: { spent_cents: 20000, clicks: 10 } },
        ],
        ad_attribution_touchpoints: [
          { id: "tp-1", store_id: STORE_ID, ad_platform: "meta_ads", utm_campaign: "Verão Floripa", campaign_id: "camp-meta-1", lead_id: "lead-meta-1", created_at: nowIso },
          { id: "tp-2", store_id: STORE_ID, ad_platform: "meta_ads", utm_campaign: "Verão Floripa", campaign_id: "camp-meta-1", lead_id: "lead-meta-1", created_at: nowIso },
        ],
        marketing_source_pixels: [
          { id: "px-1", store_id: STORE_ID, name: "Pixel Principal", external_pixel_id: "1234567890" },
        ],
        lead_conversion_telemetry: [
          { id: "tel-1", store_id: STORE_ID, lead_id: "lead-meta-1", status: "delivered", source_pixel_id: "px-1", external_pixel_id: "1234567890", dispatched_at: nowIso },
        ],
      },
      (fn) => {
        if (fn === "get_threads_latest_public_messages") {
          return {
            data: [
              {
                thread_id: "th-audio-preview",
                message: "",
                message_type: "audio",
                created_at: nowIso,
                is_staff_reply: false,
                total_messages: 3,
              },
            ],
            error: null,
          };
        }
        return { data: null, error: null };
      },
    );
    activeMockDb = mock;

    const listRes: any = await listChatThreads({ data: { store_id: STORE_ID, status: "all" } });
    expect(listRes.threads.length).toBe(1);
    expect(listRes.threads[0].last_message).toBe("[Áudio]");
    expect(listRes.threads[0].customer.email).toBe("");

    const ltvRes = await calculateStoreLtvAndAdSpend();
    // Receita total = 100k + 150k (orders) + 300k (trip) + 200k (prop unlinked; prop linked excluida!) + 50k (invoice) = 800_000 cents
    expect(ltvRes.totalRevenueCents).toBe(800000);
    expect(ltvRes.totalAdSpendCents).toBe(100000);
    expect(ltvRes.roas).toBe(8);
    expect(ltvRes.repeatCustomersCount).toBe(2);
    expect(ltvRes.repeatPurchaseRate).toBe(100);
    expect(ltvRes.totalClicksCount).toBe(52);
    expect(ltvRes.breakdownByCampaign.some((c) => c.campaignKey === "camp-meta-1" && c.leadsCount >= 1)).toBe(true);
    expect(ltvRes.breakdownByPixel.some((p) => p.pixelId === "1234567890" && p.deliveredEvents === 1)).toBe(true);
  });

  it("verifica invariantes de migration SQL, Realtime debounce e UI sem dangerouslySetInnerHTML", () => {
    const root = process.cwd();
    const sql = fs.readFileSync(
      path.join(root, "supabase/migrations/20270603000000_whatsapp_dm_group_isolation_and_healing.sql"),
      "utf8",
    );
    const chatWs = fs.readFileSync(
      path.join(root, "src/components/atendimento/AtendimentoChatWorkspace.tsx"),
      "utf8",
    );
    const sidebar = fs.readFileSync(
      path.join(root, "src/components/chat/customer-360-sidebar.tsx"),
      "utf8",
    );
    const dossier = fs.readFileSync(
      path.join(root, "src/components/tourism/crm/TourismPipeCardDossier.tsx"),
      "utf8",
    );
    const mdComp = fs.readFileSync(
      path.join(root, "src/components/atendimento/WhatsAppMarkdownText.tsx"),
      "utf8",
    );

    expect(sql).toContain("thread_type = 'group'");
    expect(sql).toContain("healed_from_dm_leak");
    expect(sql).toContain("idx_chat_threads_store_type_entity");

    expect(chatWs).toContain("createCoalescedController");
    expect(chatWs).toContain("patchThreadListOnMessageInsert");
    expect(chatWs).toContain("patchThreadListOnThreadUpdate");
    expect(chatWs).toContain("WhatsAppMarkdownText");
    expect(mdComp).not.toMatch(/dangerouslySetInnerHTML\s*[:=]/);

    expect(sidebar).toContain("sanitizeCustomerEmail");
    expect(sidebar).toContain("C360AttributionJourneyCard");
    expect(dossier).toContain("sanitizeCustomerEmail");
    expect(dossier).toContain("computeCustomerTouchpointJourney");
  });

  it("EARS-07/08/09 E2E: getCustomer360Context, getMarketingRoiClosedLoopMetrics, getStoreAttributionOverview e smoke-import UI/rotas", async () => {
    const nowIso = new Date().toISOString();
    const threadUuid = "aaaaaaaa-1111-4111-8111-111111111111";
    const mock = createFilterAwareMockDb({
      stores: [{ id: STORE_ID, name: "Agência Sul", slug: "agencia-sul", niche: "tourism", settings: {} }],
      chat_threads: [
        {
          id: threadUuid,
          store_id: STORE_ID,
          customer_id: CUSTOMER_A,
          thread_type: "store",
          entity_id: "+5549991571265",
          primary_phone_e164: "+5549991571265",
          guest_name: "Gabriella",
          guest_email: "atendimento+5549991571265@sem-email.waesy.local",
          status: "open",
          metadata: {},
          attribution: { campaign: "Verão Floripa", ad_id: "ad-2", ctwa_clid: "ctwa-last" },
        },
      ],
      profiles: [{ id: CUSTOMER_A, full_name: "Gabriella", phone: "+5549991571265", avatar_url: null }],
      orders: [
        { id: "o1", store_id: STORE_ID, customer_id: CUSTOMER_A, total_cents: 120000, status: "paid", created_at: nowIso, attributed_campaign_id: "camp-1" },
        { id: "o2", store_id: STORE_ID, customer_id: CUSTOMER_A, total_cents: 80000, status: "completed", created_at: nowIso, utm_campaign: "Verão Floripa" },
      ],
      ad_attribution_touchpoints: [
        { id: "tp-1", store_id: STORE_ID, thread_id: threadUuid, ad_platform: "meta_ads", utm_campaign: "Topo", campaign_id: "camp-0", ad_id: "ad-1", created_at: "2026-11-10T10:00:00.000Z" },
        { id: "tp-2", store_id: STORE_ID, thread_id: threadUuid, ad_platform: "meta_ads", utm_campaign: "Verão Floripa", campaign_id: "camp-1", ad_id: "ad-2", ctwa_clid: "ctwa-last", created_at: "2026-11-12T10:00:00.000Z" },
      ],
      ad_campaigns: [
        { id: "camp-1", store_id: STORE_ID, title: "Verão Floripa", budget_cents: 50000, status: "active", starts_at: "2026-11-01T00:00:00Z", created_at: nowIso, settings: { real_spent_cents: 40000, synced_clicks: 20 } },
      ],
      lead_conversion_telemetry: [
        { id: "tel-c1", store_id: STORE_ID, thread_id: threadUuid, event_name: "Lead", status: "delivered", external_pixel_id: "998877", dispatched_at: nowIso },
      ],
    });
    activeMockDb = mock;

    const c360: any = await getCustomer360Context({ data: { storeId: STORE_ID, threadId: threadUuid } });
    expect(c360.profile.email).toBeNull();
    expect(c360.metrics.repeat_purchases).toBe(1);
    expect(c360.metrics.ltv_cents).toBe(200000);
    expect(c360.journeySummary.totalTouchpointsCount).toBe(2);
    expect(c360.journeySummary.firstTouch?.campaignName).toBe("Topo");
    expect(c360.journeySummary.lastTouch?.campaignName).toBe("Verão Floripa");

    const roi: any = await getMarketingRoiClosedLoopMetrics();
    expect(roi.totalSpendCents).toBe(40000);
    expect(roi.totalAttributedRevenueCents).toBe(120000);
    expect(roi.roas).toBe(3);
    expect(roi.cpcCents).toBe(2000);
    expect(roi.cplCents).toBe(40000);

    const attrOv: any = await getStoreAttributionOverview({ data: { days: 30 } });
    expect(attrOv.summary.totalTouchpoints).toBe(2);
    expect(attrOv.summary.multiTouchContactsCount).toBe(1);
    expect(attrOv.pixelBreakdown[0].pixelId).toBe("998877");

    const [mdMod, c360AttrMod, dossierMod, mpMod, telemetriaMod, anunciosMod] = await Promise.all([
      import("@/components/atendimento/WhatsAppMarkdownText"),
      import("@/components/chat/c360/C360AttributionJourneyCard"),
      import("@/components/tourism/crm/TourismPipeCardDossier"),
      import("@/components/marketing/MarketingSourcesMultiPixelPanel"),
      import("@/routes/workspace.marketing.telemetria"),
      import("@/routes/workspace.marketing.anuncios"),
    ]);
    expect(typeof mdMod.WhatsAppMarkdownText).toBe("function");
    expect(typeof c360AttrMod.C360AttributionJourneyCard).toBe("function");
    expect(typeof dossierMod.TourismPipeCardDossier).toBe("function");
    expect(typeof mpMod.MarketingSourcesMultiPixelPanel).toBe("function");
    expect(telemetriaMod.Route).toBeDefined();
    expect(anunciosMod.Route).toBeDefined();
  }, 120000);
});
