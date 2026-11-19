import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as supabaseLib from "@/lib/supabase";
import { handleCronWhatsAppSync } from "@/routes/api.cron.whatsapp-sync";
import {
  buildEvolutionWebhookConfig,
  buildEvolutionWebhookUrl,
  EVOLUTION_WEBHOOK_EVENTS,
  extractEvolutionMessageText,
  extractEvolutionMessageType,
  hasEvolutionWebhookDrift,
  resolveWebhookOrigin,
  unwrapBaileysMessageContent,
} from "@/services/whatsapp-evolution-config.server";
import {
  reapStaleWhatsAppSyncJobs,
  runEvolutionDeltaSyncForInstance,
} from "@/services/whatsapp-evolution-sync.server";
import {
  handleUnofficialWhatsAppWebhook,
  replayPendingWebhookEvents,
} from "@/services/whatsapp-provider-webhook.server";
import { hydrateMediaFromEvolution } from "@/services/whatsapp-media.server";
import { saveStoreSupportSettingsSchema } from "@/services/chat.functions";
import { WhatsAppGovernanceConfigSchema } from "@/services/whatsapp-channel-instances.functions";

// Mock DB helper com registro de chamadas e filtros para provar transicoes de estado reais
function createMockDb(seed?: {
  instances?: any[];
  threads?: any[];
  messages?: any[];
  syncJobs?: any[];
  webhookEvents?: any[];
}) {
  const state = {
    instances: [...(seed?.instances || [])],
    threads: [...(seed?.threads || [])],
    messages: [...(seed?.messages || [])],
    syncJobs: [...(seed?.syncJobs || [])],
    webhookEvents: [...(seed?.webhookEvents || [])],
    identities: [] as any[],
    auditEvents: [] as any[],
    outbox: [] as any[],
    groupsDirectory: [] as any[],
    deliveryEvents: [] as any[],
    webhookInbox: [] as any[],
    inserts: [] as Array<{ table: string; payload: any }>,
    updates: [] as Array<{ table: string; payload: any; filters: Array<[string, any]> }>,
  };

  const makeBuilder = (table: string) => {
    const filters: Array<[string, string, any]> = [];
    let pendingAction: "select" | "insert" | "update" | "upsert" = "select";
    let pendingPayload: any = null;
    let limitCount: number | null = null;

    const getStore = (): any[] => {
      if (table === "whatsapp_channel_instances") return state.instances;
      if (table === "chat_threads") return state.threads;
      if (table === "chat_messages") return state.messages;
      if (table === "whatsapp_history_sync_jobs") return state.syncJobs;
      if (table === "whatsapp_provider_webhook_events") return state.webhookEvents;
      if (table === "whatsapp_channel_identities") return state.identities;
      if (table === "whatsapp_channel_audit_events") return state.auditEvents;
      if (table === "whatsapp_outbox") return state.outbox;
      if (table === "whatsapp_groups_directory") return state.groupsDirectory;
      if (table === "whatsapp_delivery_events") return state.deliveryEvents;
      if (table === "whatsapp_webhook_inbox") return state.webhookInbox;
      return [];
    };

    const matchesFilters = (row: any) => {
      for (const [op, col, val] of filters) {
        if (op === "eq" && row[col] !== val) return false;
        if (op === "neq" && row[col] === val) return false;
        if (op === "in" && (!Array.isArray(val) || !val.includes(row[col]))) return false;
        if (op === "lt" && !(String(row[col] || "") < String(val || ""))) return false;
      }
      return true;
    };

    const execute = async () => {
      const store = getStore();
      if (pendingAction === "insert") {
        const items = Array.isArray(pendingPayload) ? pendingPayload : [pendingPayload];
        const inserted = items.map((it, idx) => ({
          id: it.id || `mock-${table}-${store.length + idx + 1}`,
          ...it,
        }));
        store.push(...inserted);
        state.inserts.push({ table, payload: pendingPayload });
        return { data: Array.isArray(pendingPayload) ? inserted : inserted[0], error: null };
      }
      if (pendingAction === "upsert") {
        const items = Array.isArray(pendingPayload) ? pendingPayload : [pendingPayload];
        const inserted = items.map((it, idx) => ({
          id: it.id || `mock-${table}-${store.length + idx + 1}`,
          processing_status: it.processing_status || "received",
          ...it,
        }));
        store.push(...inserted);
        state.inserts.push({ table, payload: pendingPayload });
        return { data: Array.isArray(pendingPayload) ? inserted : inserted[0], error: null };
      }
      if (pendingAction === "update") {
        const updatedRows: any[] = [];
        for (const row of store) {
          if (matchesFilters(row)) {
            Object.assign(row, pendingPayload);
            updatedRows.push(row);
          }
        }
        state.updates.push({
          table,
          payload: pendingPayload,
          filters: filters.map(([, c, v]) => [c, v]),
        });
        return { data: updatedRows, error: null };
      }

      let matched = store.filter(matchesFilters);
      if (limitCount !== null) matched = matched.slice(0, limitCount);
      return { data: matched, error: null };
    };

    const api: any = {
      select: () => api,
      insert: (payload: any) => {
        pendingAction = "insert";
        pendingPayload = payload;
        return api;
      },
      update: (payload: any) => {
        pendingAction = "update";
        pendingPayload = payload;
        return api;
      },
      upsert: (payload: any) => {
        pendingAction = "upsert";
        pendingPayload = payload;
        return api;
      },
      eq: (col: string, val: any) => {
        filters.push(["eq", col, val]);
        return api;
      },
      neq: (col: string, val: any) => {
        filters.push(["neq", col, val]);
        return api;
      },
      in: (col: string, vals: any[]) => {
        filters.push(["in", col, vals]);
        return api;
      },
      lt: (col: string, val: any) => {
        filters.push(["lt", col, val]);
        return api;
      },
      lte: (col: string, val: any) => {
        filters.push(["lt", col, val]);
        return api;
      },
      gt: () => api,
      gte: () => api,
      or: () => api,
      is: () => api,
      order: () => api,
      limit: (n: number) => {
        limitCount = n;
        return api;
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
    return api;
  };

  const db = {
    from: (table: string) => makeBuilder(table),
    rpc: vi.fn(async () => ({ data: null, error: null })),
  };

  return { db: db as any, state };
}

describe("WhatsApp Real-Time & Auto-Sync E2E", () => {
  const origEnv = { ...process.env };
  const origGlobalEnv = (globalThis as any).__env__;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...origEnv };
    (globalThis as any).__env__ = origGlobalEnv;
    vi.unstubAllGlobals();
  });

  describe("Configuracao Canonica & Deteccao de Deriva Evolution", () => {
    it("resolve origem webhook em runtime a partir de globalThis.__env__ sem reescrever pages.dev", () => {
      (globalThis as any).__env__ = {
        VITE_SITE_URL: "https://usewaesy.pages.dev/",
      };
      expect(resolveWebhookOrigin()).toBe("https://usewaesy.pages.dev");
      expect(buildEvolutionWebhookUrl("geral")).toBe(
        "https://usewaesy.pages.dev/api/webhooks/whatsapp/evolution/geral",
      );
    });

    it("configura webhook com base64=false para impedir drops >1MB e inclui todos os eventos de sync", () => {
      const cfg = buildEvolutionWebhookConfig(
        "https://usewaesy.pages.dev/api/webhooks/whatsapp/evolution/geral",
        "key-123",
      );
      expect(cfg.enabled).toBe(true);
      expect(cfg.base64).toBe(false);
      expect(cfg.webhookBase64).toBe(false);
      expect(cfg.headers).toEqual({ apikey: "key-123", "x-api-key": "key-123" });
      expect(EVOLUTION_WEBHOOK_EVENTS).toContain("MESSAGES_SET");
      expect(EVOLUTION_WEBHOOK_EVENTS).toContain("CHATS_UPSERT");
      expect(EVOLUTION_WEBHOOK_EVENTS).toContain("CONTACTS_UPSERT");
      expect(EVOLUTION_WEBHOOK_EVENTS).toContain("GROUPS_UPSERT");
      expect(EVOLUTION_WEBHOOK_EVENTS).toContain("SEND_MESSAGE");
    });

    it("detecta deriva quando webhookBase64=true, URL diverge ou faltam eventos", () => {
      const expected = "https://usewaesy.pages.dev/api/webhooks/whatsapp/evolution/geral";
      expect(
        hasEvolutionWebhookDrift(
          {
            enabled: true,
            url: expected,
            webhookBase64: true,
            events: [...EVOLUTION_WEBHOOK_EVENTS],
          },
          expected,
        ),
      ).toBe(true);

      expect(
        hasEvolutionWebhookDrift(
          {
            enabled: true,
            url: expected,
            webhookBase64: false,
            events: ["QRCODE_UPDATED", "MESSAGES_UPSERT"],
          },
          expected,
        ),
      ).toBe(true);

      expect(
        hasEvolutionWebhookDrift(
          {
            enabled: true,
            url: expected,
            webhookBase64: false,
            events: [...EVOLUTION_WEBHOOK_EVENTS],
          },
          expected,
        ),
      ).toBe(false);
    });

    it("desembrulha envelopes Baileys nested (ephemeral / viewOnceV2)", () => {
      const wrapped = {
        ephemeralMessage: {
          message: {
            viewOnceMessageV2: {
              message: {
                imageMessage: { caption: "Comprovante PIX" },
              },
            },
          },
        },
      };
      expect(unwrapBaileysMessageContent(wrapped)).toHaveProperty("imageMessage");
      expect(extractEvolutionMessageType({ message: wrapped })).toBe("image");
      expect(extractEvolutionMessageText({ message: wrapped })).toBe("Comprovante PIX");
    });
  });

  describe("Motor Delta Sync & Ciclo de Vida de Jobs (Anti-Travamento)", () => {
    it("finaliza job antigo em running (>3m) via reapStaleWhatsAppSyncJobs", async () => {
      const oldIso = new Date(Date.now() - 5 * 60_000).toISOString();
      const recentIso = new Date(Date.now() - 20_000).toISOString();
      const { db, state } = createMockDb({
        syncJobs: [
          { id: "job-stale", store_id: "s1", instance_id: "i1", status: "running", started_at: oldIso },
          { id: "job-fresh", store_id: "s1", instance_id: "i1", status: "running", started_at: recentIso },
        ],
      });

      const count = await reapStaleWhatsAppSyncJobs(db, "s1", "i1");
      expect(count).toBe(1);
      expect(state.syncJobs[0].status).toBe("failed");
      expect(state.syncJobs[0].completed_at).toBeTruthy();
      expect(state.syncJobs[1].status).toBe("running");
    });

    it("garante status='failed' com notes quando Evolution /chat/findChats falha (nunca fica travado em running)", async () => {
      process.env.EVOLUTION_API_KEY = "evo-test-key";
      const { db, state } = createMockDb({
        instances: [
          {
            id: "inst-1",
            store_id: "store-1",
            instance_key: "geral",
            external_instance_id: "waesy_store_geral",
            provider: "evolution_api",
            status: "connected",
            webhook_url: "https://usewaesy.pages.dev/api/webhooks/whatsapp/evolution/geral",
            public_config: { base_url: "https://evo.example.com", webhook_verified_at: new Date().toISOString() },
          },
        ],
      });

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(new Response("Upstream gateway down", { status: 502 })),
      );

      const res = await runEvolutionDeltaSyncForInstance({
        db,
        instance: state.instances[0],
        storeId: "store-1",
        mode: "manual_full",
        force: true,
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("HTTP 502");
      expect(state.syncJobs).toHaveLength(1);
      expect(state.syncJobs[0].status).toBe("failed");
      expect(state.syncJobs[0].completed_at).toBeTruthy();
      expect(state.syncJobs[0].notes).toContain("HTTP 502");
    });

    it("importa conversas @lid sem criar + sintetico, sincroniza fromMe do celular e conclui job", async () => {
      process.env.EVOLUTION_API_KEY = "evo-test-key";
      const nowSec = Math.floor(Date.now() / 1000);
      const { db, state } = createMockDb({
        instances: [
          {
            id: "inst-1",
            store_id: "store-1",
            instance_key: "geral",
            external_instance_id: "waesy_store_geral",
            provider: "evolution_api",
            status: "connected",
            webhook_url: "https://usewaesy.pages.dev/api/webhooks/whatsapp/evolution/geral",
            public_config: { base_url: "https://evo.example.com", webhook_verified_at: new Date().toISOString() },
          },
        ],
      });

      vi.stubGlobal(
        "fetch",
        vi.fn(async (input: RequestInfo | URL) => {
          const url = String(input);
          if (url.includes("/chat/findChats/")) {
            return new Response(
              JSON.stringify([
                {
                  remoteJid: "108250439667828@lid",
                  updatedAt: new Date().toISOString(),
                  lastMessage: {
                    key: { id: "msg-lid-out", remoteJid: "108250439667828@lid", fromMe: true },
                    message: { conversation: "Respondido pelo celular" },
                    messageTimestamp: nowSec,
                  },
                },
                {
                  remoteJid: "status@broadcast",
                  updatedAt: new Date().toISOString(),
                },
              ]),
              { status: 200 },
            );
          }
          if (url.includes("/chat/findContacts/")) {
            return new Response(
              JSON.stringify([{ id: "108250439667828@lid", pushName: "Ana Paula" }]),
              { status: 200 },
            );
          }
          if (url.includes("/chat/findMessages/")) {
            return new Response(
              JSON.stringify({
                messages: {
                  records: [
                    {
                      key: { id: "msg-lid-in", remoteJid: "108250439667828@lid", fromMe: false },
                      message: { conversation: "Oi, quero cotacao" },
                      messageTimestamp: nowSec - 10,
                    },
                  ],
                },
              }),
              { status: 200 },
            );
          }
          return new Response("{}", { status: 200 });
        }),
      );

      const res = await runEvolutionDeltaSyncForInstance({
        db,
        instance: state.instances[0],
        storeId: "store-1",
        mode: "delta",
        force: true,
      });

      expect(res.success).toBe(true);
      expect(res.totalFound).toBe(1);
      expect(res.importedChats).toBe(1);
      expect(res.importedMessages).toBe(2);

      // @lid puro nunca vira telefone sintetico "+108250..."
      expect(state.threads[0].primary_phone_e164).toBeNull();
      expect(state.threads[0].guest_name).toBe("Ana Paula");
      expect(state.messages.map((m) => m.external_message_id)).toEqual([
        "msg-lid-in",
        "msg-lid-out",
      ]);
      expect(state.messages.find((m) => m.external_message_id === "msg-lid-out")?.is_staff_reply).toBe(
        true,
      );
      expect(state.syncJobs[0].status).toBe("completed");
    });

    it("aplica cooldown de 25s em delta sync repetido sem force=true", async () => {
      process.env.EVOLUTION_API_KEY = "evo-test-key";
      const { db, state } = createMockDb({
        instances: [
          {
            id: "inst-1",
            store_id: "store-1",
            instance_key: "geral",
            provider: "evolution_api",
            status: "connected",
            public_config: {
              base_url: "https://evo.example.com",
              last_auto_sync_at: new Date().toISOString(),
            },
          },
        ],
      });

      const res = await runEvolutionDeltaSyncForInstance({
        db,
        instance: state.instances[0],
        storeId: "store-1",
        mode: "delta",
        force: false,
      });

      expect(res.success).toBe(true);
      expect(res.skipped).toBe(true);
      expect(res.reason).toBe("cooldown_active");
    });
  });

  describe("Webhook Handler (Metadados, Self-Healing & Replay)", () => {
    it("nao classifica chats.update nem group.update como delivery ACK e atualiza thread/grupo + heartbeat", async () => {
      process.env.EVOLUTION_API_KEY = "master-evo-key";
      const { db, state } = createMockDb({
        instances: [
          {
            id: "inst-1",
            store_id: "store-1",
            provider: "evolution_api",
            instance_key: "setor_2",
            external_instance_id: "waesy_s1_setor_2",
            status: "disconnected",
            is_active: true,
            public_config: { allow_unsigned_webhook: false },
          },
        ],
        threads: [
          {
            id: "th-grp-1",
            store_id: "store-1",
            entity_id: "12036300001@g.us",
            guest_name: "Grupo Antigo",
            metadata: { whatsapp_jid: "12036300001@g.us" },
          },
        ],
      });

      vi.spyOn(supabaseLib, "getServerClient").mockReturnValue(db);

      const res = await handleUnofficialWhatsAppWebhook(
        new Request("https://usewaesy.pages.dev/api/webhooks/whatsapp/evolution/setor_2", {
          method: "POST",
          headers: { apikey: "master-evo-key", "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "group.update",
            data: [{ id: "12036300001@g.us", subject: "Grupo Excursao Atualizado" }],
          }),
        }),
        "evolution_api",
        "setor_2",
      );

      expect(res.status).toBe(200);
      expect(state.deliveryEvents).toHaveLength(0);
      expect(state.threads[0].guest_name).toBe("Grupo Excursao Atualizado");
      expect(state.instances[0].status).toBe("connected");
      expect(state.instances[0].public_config.last_webhook_event).toBe("group.update");
      expect(state.instances[0].public_config.last_webhook_at).toBeTruthy();

      const unauthorizedWebhook = await handleUnofficialWhatsAppWebhook(
        new Request("https://usewaesy.pages.dev/api/webhooks/whatsapp/evolution/setor_2", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event: "messages.upsert", data: {} }),
        }),
        "evolution_api",
        "setor_2",
      );
      expect(unauthorizedWebhook.status).toBe(401);
    });

    it("drena eventos presos em received que ja existem em chat_messages ou expiraram (>24h)", async () => {
      const { db, state } = createMockDb({
        instances: [
          { id: "inst-1", store_id: "store-1", provider: "evolution_api", instance_key: "geral", status: "connected" },
        ],
        messages: [
          { id: "cm-1", thread_id: "th-1", external_message_id: "already-synced-ext" },
        ],
        webhookEvents: [
          {
            id: "wh-1",
            provider: "evolution_api",
            instance_id: "inst-1",
            store_id: "store-1",
            event_type: "message",
            external_message_id: "already-synced-ext",
            processing_status: "received",
            payload: {},
            created_at: new Date(Date.now() - 48 * 3600_000).toISOString(),
          },
          {
            id: "wh-2",
            provider: "evolution_api",
            instance_id: "inst-1",
            store_id: "store-1",
            event_type: "outbound_echo",
            external_message_id: "old-redacted-ext",
            processing_status: "received",
            payload: { key: { id: "old-redacted-ext" } },
            created_at: new Date(Date.now() - 72 * 3600_000).toISOString(),
          },
        ],
      });

      const summary = await replayPendingWebhookEvents({ db, limit: 10 });
      expect(summary.checked).toBe(2);
      expect(summary.resolvedDuplicates).toBe(1);
      expect(summary.expired).toBe(1);
      expect(state.webhookEvents[0].processing_status).toBe("processed");
      expect(state.webhookEvents[1].processing_status).toBe("failed");
    });
  });

  describe("Contratos SQL Realtime, Cron Route Auth & UI Ao Vivo", () => {
    it("endpoint /api/cron/whatsapp-sync bloqueia sem token (401) e executa ciclo autorizado (200)", async () => {
      (globalThis as any).__env__ = { WAESY_CRON_TOKEN: "cron-secret-test" };
      const { db } = createMockDb();
      vi.spyOn(supabaseLib, "getServerClient").mockReturnValue(db);
      const unauthorized = await handleCronWhatsAppSync(
        new Request("https://usewaesy.pages.dev/api/cron/whatsapp-sync", { method: "POST" }),
      );
      expect(unauthorized.status).toBe(401);

      const authorized = await handleCronWhatsAppSync(
        new Request("https://usewaesy.pages.dev/api/cron/whatsapp-sync", {
          method: "POST",
          headers: { Authorization: "Bearer cron-secret-test" },
        }),
      );
      expect(authorized.status).toBe(200);
      const body = (await authorized.json()) as any;
      expect(body.ok).toBe(true);
    });

    it("migracao 20270524000000 cria projecao live state segura sem segredos e com REPLICA IDENTITY FULL", () => {
      const sql = fs.readFileSync(
        path.join(process.cwd(), "supabase/migrations/20270524000000_whatsapp_realtime_sync_rls_and_crons.sql"),
        "utf8",
      );
      expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.whatsapp_channel_live_state");
      expect(sql).not.toContain("secret_payload_encrypted text");
      expect(sql).toContain("ALTER TABLE public.whatsapp_channel_live_state REPLICA IDENTITY FULL");
      expect(sql).toContain("ALTER TABLE public.whatsapp_outbox REPLICA IDENTITY FULL");
      expect(sql).toContain("ALTER TABLE public.whatsapp_history_sync_jobs REPLICA IDENTITY FULL");
      expect(sql).toContain("ALTER TABLE public.whatsapp_groups_directory REPLICA IDENTITY FULL");
      expect(sql).toContain("whatsapp_channel_live_state_deny_insert");
      expect(sql).toContain("waesy_whatsapp_realtime_sync_1m");
    });

    it("UI Ao Vivo assina whatsapp_channel_live_state e nao a tabela bloqueada whatsapp_channel_instances", () => {
      const root = process.cwd();
      const chatUi = fs.readFileSync(
        path.join(root, "src/components/atendimento/AtendimentoChatWorkspace.tsx"),
        "utf8",
      );
      const channelsUi = fs.readFileSync(
        path.join(root, "src/routes/workspace.atendimento.whatsapp.tsx"),
        "utf8",
      );
      const groupsUi = fs.readFileSync(
        path.join(root, "src/routes/workspace.atendimento.grupos.tsx"),
        "utf8",
      );
      const qrModal = fs.readFileSync(
        path.join(root, "src/components/chat/whatsapp-qr-connect-modal.tsx"),
        "utf8",
      );

      expect(chatUi).toContain('table: "whatsapp_channel_live_state"');
      expect(chatUi).toContain('table: "whatsapp_history_sync_jobs"');
      expect(chatUi).not.toContain('table: "whatsapp_channel_instances"');
      expect(chatUi).toContain("syncWhatsAppDeltaNow");
      expect(chatUi).toContain("const cf = channelFilterRef.current;");
      expect(channelsUi).toContain('table: "whatsapp_channel_live_state"');
      expect(groupsUi).toContain('table: "whatsapp_groups_directory"');
      expect(qrModal).toContain('table: "whatsapp_channel_live_state"');
    });

    it("hydrateMediaFromEvolution persiste imagem inline abaixo do teto e ativa media_size_guard acima de 5.5MB", async () => {
      process.env.EVOLUTION_API_KEY = "evo-test-key";
      const { db, state } = createMockDb({
        instances: [
          {
            id: "inst-1",
            store_id: "store-1",
            instance_key: "geral",
            external_instance_id: "waesy_store_geral",
            provider: "evolution_api",
            status: "connected",
            public_config: { base_url: "https://evo.example.com" },
          },
        ],
        messages: [
          { id: "msg-small", thread_id: "th-1", external_message_id: "ext-small", payload: {} },
          { id: "msg-huge", thread_id: "th-1", external_message_id: "ext-huge", payload: {} },
        ],
      });

      const smallBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
      const hugeBase64 = "A".repeat(5_500_050);

      vi.stubGlobal(
        "fetch",
        vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
          const bodyStr = String(init?.body || "");
          if (bodyStr.includes("ext-huge")) {
            return new Response(
              JSON.stringify({ base64: hugeBase64, mimetype: "video/mp4" }),
              { status: 200 },
            );
          }
          return new Response(
            JSON.stringify({ base64: smallBase64, mimetype: "image/png" }),
            { status: 200 },
          );
        }),
      );

      const smallRes = await hydrateMediaFromEvolution({
        db: db as any,
        storeId: "store-1",
        channelInstanceId: "inst-1",
        threadId: "th-1",
        messageId: "msg-small",
        externalMessageId: "ext-small",
        messageType: "image",
        persistToMessage: true,
      });
      expect(smallRes?.dataUri).toContain("data:image/png;base64,");
      const smallRow = state.messages.find((m) => m.id === "msg-small");
      expect(Array.isArray(smallRow.attachments)).toBe(true);
      expect(smallRow.attachments[0]).toContain("data:image/png;base64,");

      const hugeRes = await hydrateMediaFromEvolution({
        db: db as any,
        storeId: "store-1",
        channelInstanceId: "inst-1",
        threadId: "th-1",
        messageId: "msg-huge",
        externalMessageId: "ext-huge",
        messageType: "video",
        persistToMessage: true,
      });
      expect(hugeRes?.dataUri).toContain("data:video/mp4;base64,");
      const hugeRow = state.messages.find((m) => m.id === "msg-huge");
      expect(hugeRow.attachments).toBeUndefined();
      expect(hugeRow.payload?.media?.media_size_guard).toBe(true);
    });

    it("delta sync ignora altPhone @lid sintetico e reatribui thread presa em instancia inativa sem roubar instancia ativa", async () => {
      process.env.EVOLUTION_API_KEY = "evo-test-key";
      const nowSec = Math.floor(Date.now() / 1000);
      const oldIso = new Date(Date.now() - 60_000).toISOString();
      const { db, state } = createMockDb({
        instances: [
          {
            id: "inst-1",
            store_id: "store-1",
            instance_key: "geral",
            external_instance_id: "waesy_store_geral",
            provider: "evolution_api",
            status: "active",
            webhook_url: "https://usewaesy.pages.dev/api/webhooks/whatsapp/evolution/geral",
            public_config: { base_url: "https://evo.example.com", webhook_verified_at: new Date().toISOString() },
          },
          {
            id: "inst-other-active",
            store_id: "store-1",
            instance_key: "setor_2",
            external_instance_id: "waesy_store_setor_2",
            provider: "evolution_api",
            status: "active",
            public_config: { base_url: "https://evo.example.com" },
          },
          {
            id: "inst-old-dead",
            store_id: "store-1",
            instance_key: "legada",
            external_instance_id: "waesy_store_legada",
            provider: "evolution_api",
            status: "disconnected",
            public_config: { base_url: "https://evo.example.com" },
          },
        ],
        threads: [
          {
            id: "th-dead",
            store_id: "store-1",
            channel_instance_id: "inst-old-dead",
            context_type: "whatsapp",
            entity_id: "108250439667828@lid",
            primary_phone_e164: null,
            guest_name: "Contato Meta",
            last_message_at: oldIso,
            metadata: { whatsapp_jid: "108250439667828@lid" },
          },
          {
            id: "th-active-other",
            store_id: "store-1",
            channel_instance_id: "inst-other-active",
            context_type: "whatsapp",
            entity_id: "+5549999998888",
            primary_phone_e164: "+5549999998888",
            guest_name: "Cliente Setor 2",
            last_message_at: oldIso,
            metadata: { whatsapp_jid: "5549999998888@s.whatsapp.net" },
          },
        ],
      });

      vi.stubGlobal(
        "fetch",
        vi.fn(async (input: RequestInfo | URL) => {
          const url = String(input);
          if (url.includes("/chat/findChats/")) {
            return new Response(
              JSON.stringify([
                {
                  remoteJid: "108250439667828@lid",
                  updatedAt: new Date(nowSec * 1000).toISOString(),
                  lastMessage: {
                    key: { id: "msg-new-lid", remoteJid: "108250439667828@lid", fromMe: false },
                    message: { conversation: "Nova msg" },
                    messageTimestamp: nowSec,
                  },
                },
                {
                  remoteJid: "5549999998888@s.whatsapp.net",
                  updatedAt: new Date(nowSec * 1000).toISOString(),
                  lastMessage: {
                    key: { id: "msg-other", remoteJid: "5549999998888@s.whatsapp.net", fromMe: false },
                    message: { conversation: "Oi" },
                    messageTimestamp: nowSec,
                  },
                },
              ]),
              { status: 200 },
            );
          }
          if (url.includes("/chat/findContacts/")) {
            return new Response(
              JSON.stringify([
                {
                  id: "108250439667828@lid",
                  pushName: "Cliente Real",
                  phoneNumber: "108250439667828@lid",
                },
              ]),
              { status: 200 },
            );
          }
          if (url.includes("/chat/findMessages/")) {
            return new Response(JSON.stringify({ messages: { records: [] } }), { status: 200 });
          }
          return new Response("{}", { status: 200 });
        }),
      );

      const res = await runEvolutionDeltaSyncForInstance({
        db,
        instance: state.instances[0],
        storeId: "store-1",
        mode: "delta",
        force: true,
      });

      expect(res.success).toBe(true);
      const deadThread = state.threads.find((t) => t.id === "th-dead");
      expect(deadThread.channel_instance_id).toBe("inst-1");
      expect(deadThread.primary_phone_e164).toBeNull();
      expect(deadThread.guest_name).toBe("Cliente Real");

      const otherThread = state.threads.find((t) => t.id === "th-active-other");
      expect(otherThread.channel_instance_id).toBe("inst-other-active");
    });

    it("schemas de governanca/suporte preservam storeId e nao exigem departments ao salvar horarios", () => {
      const storeId = "11111111-1111-4111-8111-111111111111";
      const govParse = WhatsAppGovernanceConfigSchema.safeParse({
        storeId,
        permissions: {
          onlyManagersCanViewQr: true,
          onlyManagersCanDisconnect: true,
          showAgentNamePrefixInMessages: true,
          autoConvertIncomingToLead: false,
          defaultLeadSource: "WhatsApp Orgânico",
          enableMobilityBookingBot: false,
          enableCatalogSalesBot: true,
          enableCorporateTravelBot: false,
        },
      });
      expect(govParse.success).toBe(true);

      const supportParse = saveStoreSupportSettingsSchema.safeParse({
        storeId,
        away_message: "Voltamos logo.",
        auto_reply_enabled: true,
      });
      expect(supportParse.success).toBe(true);
    });

    it("todas as telas de Atendimento, Automacoes, Master, Media e Realtime mantem cobertura completa ao vivo", () => {
      const root = process.cwd();
      const chatFns = fs.readFileSync(path.join(root, "src/services/chat.functions.ts"), "utf8");
      const rtClient = fs.readFileSync(path.join(root, "src/services/realtime-channel.ts"), "utf8");
      const outboxWorker = fs.readFileSync(path.join(root, "src/services/whatsapp-outbox.worker.ts"), "utf8");
      const metricsPanel = fs.readFileSync(path.join(root, "src/components/chat/whatsapp-operations-metrics-panel.tsx"), "utf8");
      const overviewRoute = fs.readFileSync(path.join(root, "src/routes/workspace.atendimento.index.tsx"), "utf8");
      const atendentesRoute = fs.readFileSync(path.join(root, "src/routes/workspace.atendimento.atendentes.tsx"), "utf8");
      const filasRoute = fs.readFileSync(path.join(root, "src/routes/workspace.atendimento.filas.tsx"), "utf8");
      const horariosRoute = fs.readFileSync(path.join(root, "src/routes/workspace.atendimento.horarios.tsx"), "utf8");
      const automacoesRoute = fs.readFileSync(path.join(root, "src/routes/workspace.whatsapp.automacoes.tsx"), "utf8");
      const masterRoute = fs.readFileSync(path.join(root, "src/routes/admin-master.integracoes.tsx"), "utf8");
      const migrationSql = fs.readFileSync(
        path.join(root, "supabase/migrations/20270524000000_whatsapp_realtime_sync_rls_and_crons.sql"),
        "utf8",
      );

      expect(chatFns).toContain('new Set(["audio", "image", "sticker", "video", "document"])');
      expect(rtClient).toContain("syncRealtimeJwtAuth");
      expect(outboxWorker).toContain("last_message_at: nowIso");
      expect(metricsPanel).toContain("whatsapp_channel_live_state");
      expect(metricsPanel).toContain("whatsapp_history_sync_jobs");
      expect(overviewRoute).toContain("getRealtimeChannel");
      expect(atendentesRoute).toContain('table: "workspace_members"');
      expect(filasRoute).toContain('table: "chat_departments"');
      expect(horariosRoute).toContain('table: "store_quick_answers"');
      expect(automacoesRoute).toContain('table: "store_workflows"');
      expect(masterRoute).toContain('table: "whatsapp_channel_live_state"');
      expect(migrationSql).toContain("chat_departments");
      expect(migrationSql).toContain("store_quick_answers");
      expect(migrationSql).toContain("store_workflows");
    });
  });
});
