import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearAllChatClientCache,
  clearCachedThreadMessages,
  getCachedCustomer360,
  getCachedThreadList,
  getCachedThreadMessages,
  getLatestMessageCursor,
  mergeMessagesIncremental,
  setCachedCustomer360,
  setCachedThreadList,
  setCachedThreadMessages,
} from "@/lib/chat-client-cache";
import {
  findExistingMessageExternalIds,
  isUniqueViolationError,
  persistWhatsAppMessagesIdempotently,
} from "@/services/whatsapp-message-persistence.server";
import { runEvolutionDeltaSyncForInstance } from "@/services/whatsapp-evolution-sync.server";

function createPersistenceMockDb(seed?: {
  messages?: any[];
  failBatchWith23505?: boolean;
  failMissingOptionalColumn?: boolean;
}) {
  const messages = [...(seed?.messages || [])];
  let failBatchWith23505 = Boolean(seed?.failBatchWith23505);
  let failMissingOptionalColumn = Boolean(seed?.failMissingOptionalColumn);
  const ops = { batchCalls: 0, singleCalls: 0 };

  const applyFilters = (rows: any[], filters: Array<(r: any) => boolean>) =>
    rows.filter((r) => filters.every((f) => f(r)));

  const db = {
    from(table: string) {
      if (table !== "chat_messages") {
        throw new Error(`Unexpected table in persistence mock: ${table}`);
      }
      const filters: Array<(r: any) => boolean> = [];
      let pendingInsert: any = null;

      const executeSelect = () => ({
        data: applyFilters(messages, filters),
        error: null,
      });

      const executeInsert = (singleRowExpected: boolean) => {
        const isBatch = Array.isArray(pendingInsert);
        const list = isBatch ? pendingInsert : [pendingInsert];

        if (isBatch) {
          ops.batchCalls += 1;
          if (failBatchWith23505) {
            return {
              data: null,
              error: {
                code: "23505",
                message: 'duplicate key value violates unique constraint "uq_chat_messages_external_message"',
              },
            };
          }
        } else {
          ops.singleCalls += 1;
        }

        const inserted: any[] = [];
        for (const raw of list) {
          if (
            failMissingOptionalColumn &&
            (raw.provider_message_id !== undefined ||
              raw.provider_name !== undefined ||
              raw.encryption_version !== undefined ||
              raw.is_encrypted !== undefined)
          ) {
            return {
              data: null,
              error: {
                code: "42703",
                message: 'column "provider_message_id" does not exist',
              },
            };
          }

          const dup = messages.find(
            (m) =>
              (raw.external_message_id && m.external_message_id === raw.external_message_id) ||
              (raw.provider_message_id && m.provider_message_id === raw.provider_message_id),
          );
          if (dup) {
            return {
              data: null,
              error: {
                code: "23505",
                message: 'duplicate key value violates unique constraint "uq_chat_messages_external_message"',
              },
            };
          }

          const created = { id: `msg-${messages.length + 1}`, ...raw };
          messages.push(created);
          inserted.push(created);
        }

        if (singleRowExpected) {
          return { data: inserted[0] || null, error: null };
        }
        return { data: inserted, error: null };
      };

      const chain: any = {
        select() {
          return chain;
        },
        in(col: string, vals: any[]) {
          filters.push((r) => vals.includes(r[col]));
          return chain;
        },
        insert(payload: any) {
          pendingInsert = payload;
          return {
            select() {
              return {
                maybeSingle: async () => executeInsert(true),
                then(resolve: any, reject: any) {
                  return Promise.resolve(executeInsert(false)).then(resolve, reject);
                },
              };
            },
          };
        },
        then(resolve: any, reject: any) {
          return Promise.resolve(executeSelect()).then(resolve, reject);
        },
      };
      return chain;
    },
  };

  return { db: db as any, messages, ops };
}

function createDeltaSyncMockDb(seed: {
  instances: any[];
  threads: any[];
  messages: any[];
}) {
  const state = {
    instances: [...seed.instances],
    threads: [...seed.threads],
    messages: [...seed.messages],
    jobs: [] as any[],
    threadUpdates: [] as Array<{ id: string; payload: any }>,
  };

  const applyFilters = (rows: any[], filters: Array<(r: any) => boolean>) =>
    rows.filter((r) => filters.every((f) => f(r)));

  const getTable = (table: string): any[] => {
    if (table === "whatsapp_channel_instances") return state.instances;
    if (table === "chat_threads") return state.threads;
    if (table === "chat_messages") return state.messages;
    if (table === "whatsapp_history_sync_jobs") return state.jobs;
    return [];
  };

  const db = {
    from(table: string) {
      const filters: Array<(r: any) => boolean> = [];
      let orderBy: { col: string; asc: boolean } | null = null;
      let limitNum: number | null = null;
      let op: "select" | "insert" | "update" = "select";
      let payload: any = null;

      const exec = () => {
        const rows = getTable(table);
        if (op === "select") {
          let result = applyFilters(rows, filters);
          if (orderBy) {
            const { col, asc } = orderBy;
            result = [...result].sort((a, b) => {
              const av = a[col] ?? "";
              const bv = b[col] ?? "";
              return asc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
            });
          }
          if (limitNum !== null) {
            result = result.slice(0, limitNum);
          }
          return { data: result, error: null };
        }
        if (op === "insert") {
          const list = Array.isArray(payload) ? payload : [payload];
          const inserted = list.map((item, idx) => {
            const row = { id: item.id || `${table}-${rows.length + idx + 1}`, ...item };
            rows.push(row);
            return row;
          });
          return { data: inserted, error: null };
        }
        if (op === "update") {
          const matched = applyFilters(rows, filters);
          for (const target of matched) {
            Object.assign(target, payload);
            if (table === "chat_threads") {
              state.threadUpdates.push({ id: target.id, payload });
            }
          }
          return { data: matched, error: null };
        }
        return { data: null, error: null };
      };

      const chain: any = {
        select() {
          return chain;
        },
        insert(data: any) {
          op = "insert";
          payload = data;
          return chain;
        },
        update(data: any) {
          op = "update";
          payload = data;
          return chain;
        },
        eq(col: string, val: any) {
          filters.push((r) => r[col] === val);
          return chain;
        },
        in(col: string, vals: any[]) {
          filters.push((r) => vals.includes(r[col]));
          return chain;
        },
        lt(col: string, val: any) {
          filters.push((r) => String(r[col] || "") < String(val));
          return chain;
        },
        gte(col: string, val: any) {
          filters.push((r) => String(r[col] || "") >= String(val));
          return chain;
        },
        order(col: string, opts?: { ascending?: boolean }) {
          orderBy = { col, asc: opts?.ascending !== false };
          return chain;
        },
        limit(n: number) {
          limitNum = n;
          return chain;
        },
        maybeSingle: async () => {
          const res = exec();
          return { data: Array.isArray(res.data) ? res.data[0] || null : res.data, error: res.error };
        },
        single: async () => {
          const res = exec();
          return { data: Array.isArray(res.data) ? res.data[0] || null : res.data, error: res.error };
        },
        then(resolve: any, reject: any) {
          return Promise.resolve(exec()).then(resolve, reject);
        },
      };
      return chain;
    },
  };

  return { db: db as any, state };
}

describe("Chat Incremental Persistence & Sync End-to-End", () => {
  afterEach(() => {
    clearAllChatClientCache();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("Camada 1 — Persistencia Idempotente Global de Mensagens WhatsApp", () => {
    it("isUniqueViolationError detecta codigo 23505 e constraints globais", () => {
      expect(isUniqueViolationError({ code: "23505", message: "duplicate" })).toBe(true);
      expect(
        isUniqueViolationError({ message: "violates unique constraint uq_chat_messages_external_message" }),
      ).toBe(true);
      expect(isUniqueViolationError({ code: "42501", message: "permission denied" })).toBe(false);
    });

    it("deduplica globalmente entre threads diferentes sem descartar novas mensagens", async () => {
      const { db, messages } = createPersistenceMockDb({
        messages: [
          {
            id: "existing-1",
            thread_id: "thread-A",
            external_message_id: "wamid-cross-thread",
            provider_message_id: "wamid-cross-thread",
          },
        ],
      });

      const found = await findExistingMessageExternalIds(db, [
        "wamid-cross-thread",
        "wamid-new-1",
      ]);
      expect(found.has("wamid-cross-thread")).toBe(true);
      expect(found.has("wamid-new-1")).toBe(false);

      const res = await persistWhatsAppMessagesIdempotently(db, [
        {
          thread_id: "thread-B",
          external_message_id: "wamid-cross-thread",
          provider_message_id: "wamid-cross-thread",
          message: "Duplicada de outra thread",
        },
        {
          thread_id: "thread-B",
          external_message_id: "wamid-new-1",
          provider_message_id: "wamid-new-1",
          message: "Mensagem valida nova",
        },
        {
          thread_id: "thread-B",
          external_message_id: "wamid-new-1",
          provider_message_id: "wamid-new-1",
          message: "Duplicada no mesmo lote",
        },
      ]);

      expect(res.insertedCount).toBe(1);
      expect(res.skippedDuplicates).toBe(2);
      expect(res.errors).toHaveLength(0);
      expect(messages).toHaveLength(2);
      expect(messages[1].message).toBe("Mensagem valida nova");
    });

    it("ativa fallback linha-a-linha quando lote de 100 colide em 23505 e preserva os outros 99 registros", async () => {
      const { db, messages, ops } = createPersistenceMockDb({
        messages: [
          {
            id: "race-existing",
            thread_id: "thread-1",
            external_message_id: "ext-50",
            provider_message_id: "ext-50",
          },
        ],
        failBatchWith23505: true,
      });

      const batch = Array.from({ length: 100 }, (_, i) => ({
        thread_id: "thread-1",
        external_message_id: `ext-${i}`,
        provider_message_id: `ext-${i}`,
        message: `Msg ${i}`,
      }));

      // Pula o pre-check para simular corrida real no PostgreSQL dentro do lote
      const res = await persistWhatsAppMessagesIdempotently(db, batch, {
        skipGlobalPrecheck: true,
      });

      expect(ops.batchCalls).toBe(1);
      expect(ops.singleCalls).toBe(100);
      expect(res.insertedCount).toBe(99);
      expect(res.skippedDuplicates).toBe(1);
      expect(res.errors).toHaveLength(0);
      expect(messages).toHaveLength(100);
    });

    it("remove colunas opcionais automaticamente em erro 42703 sem perder mensagem", async () => {
      const { db, messages } = createPersistenceMockDb({
        failMissingOptionalColumn: true,
      });

      const res = await persistWhatsAppMessagesIdempotently(
        db,
        [
          {
            thread_id: "thread-1",
            external_message_id: "ext-compat-1",
            provider_message_id: "ext-compat-1",
            provider_name: "evolution_api",
            encryption_version: "v1",
            is_encrypted: false,
            message: "Compatibilidade schema antigo",
          },
        ],
        { skipGlobalPrecheck: true },
      );

      expect(res.insertedCount).toBe(1);
      expect(res.errors).toHaveLength(0);
      expect(messages[0].message).toBe("Compatibilidade schema antigo");
      expect(messages[0].provider_message_id).toBeUndefined();
    });
  });

  describe("Camada 2 — Sync Incremental Evolution Sem Loops Nem Sobrescritas Vazias", () => {
    it("pula /chat/findMessages e evita update redundante quando bootstrap ja concluido e cursor atualizado", async () => {
      process.env.EVOLUTION_API_KEY = "evo-test-key";
      const lastMsgIso = "2026-11-16T12:00:00.000Z";
      const lastMsgSec = Math.floor(Date.parse(lastMsgIso) / 1000);

      const { db, state } = createDeltaSyncMockDb({
        instances: [
          {
            id: "inst-1",
            store_id: "store-1",
            instance_key: "inst-key",
            provider: "evolution_api",
            status: "connected",
            public_config: {
              base_url: "https://evo.example.com",
              webhook_verified_at: new Date().toISOString(),
            },
          },
        ],
        threads: [
          {
            id: "thread-up-to-date",
            store_id: "store-1",
            context_type: "whatsapp",
            entity_id: "5549999998888",
            primary_phone_e164: "+5549999998888",
            channel_instance_id: "inst-1",
            guest_name: "Cliente Estavel",
            last_message_at: lastMsgIso,
            last_message_text: "Ultima mensagem salva",
            history_bootstrap_done: true,
            sync_cursor_at: lastMsgIso,
            metadata: {
              history_bootstrap_done: true,
              sync_cursor_ms: Date.parse(lastMsgIso),
              whatsapp_jid: "5549999998888@s.whatsapp.net",
            },
          },
          {
            id: "thread-no-ts",
            store_id: "store-1",
            context_type: "whatsapp",
            entity_id: "5549977776666",
            primary_phone_e164: "+5549977776666",
            channel_instance_id: "inst-1",
            guest_name: "Contato Sem Timestamp",
            last_message_at: lastMsgIso,
            last_message_text: "Historico preservado",
            history_bootstrap_done: true,
            sync_cursor_at: lastMsgIso,
            metadata: {
              history_bootstrap_done: true,
              sync_cursor_ms: Date.parse(lastMsgIso),
              whatsapp_jid: "5549977776666@s.whatsapp.net",
            },
          },
        ],
        messages: [
          {
            id: "m-1",
            thread_id: "thread-up-to-date",
            external_message_id: "ext-m-1",
            message: "Ultima mensagem salva",
            message_type: "text",
            created_at: lastMsgIso,
          },
        ],
      });

      const findMessagesCalls: string[] = [];
      vi.spyOn(globalThis, "fetch").mockImplementation(async (input: any) => {
        const url = String(input);
        if (url.includes("/chat/findChats/")) {
          return new Response(
            JSON.stringify([
              {
                remoteJid: "5549999998888@s.whatsapp.net",
                pushName: "Cliente Estavel",
                lastMessage: { messageTimestamp: lastMsgSec },
              },
              {
                remoteJid: "5549977776666@s.whatsapp.net",
                pushName: "Contato Sem Timestamp",
              },
            ]),
            { status: 200 },
          );
        }
        if (url.includes("/chat/findContacts/")) {
          return new Response(JSON.stringify([]), { status: 200 });
        }
        if (url.includes("/chat/findMessages/")) {
          findMessagesCalls.push(url);
          return new Response(JSON.stringify({ messages: { records: [] } }), { status: 200 });
        }
        return new Response("{}", { status: 200 });
      });

      const res = await runEvolutionDeltaSyncForInstance({
        db,
        instance: state.instances[0],
        storeId: "store-1",
        mode: "delta",
      });

      expect(res.success).toBe(true);
      expect(findMessagesCalls).toHaveLength(0);
      expect(state.threadUpdates).toHaveLength(0);
    });

    it("repara last_message_text nulo em thread ja sincronizada e busca delta apenas quando chega mensagem mais nova", async () => {
      process.env.EVOLUTION_API_KEY = "evo-test-key";
      const oldIso = "2026-11-16T10:00:00.000Z";
      const newerSec = Math.floor(Date.parse("2026-11-16T10:05:00.000Z") / 1000);

      const { db, state } = createDeltaSyncMockDb({
        instances: [
          {
            id: "inst-1",
            store_id: "store-1",
            instance_key: "inst-key",
            provider: "evolution_api",
            status: "connected",
            public_config: {
              base_url: "https://evo.example.com",
              webhook_verified_at: new Date().toISOString(),
            },
          },
        ],
        threads: [
          {
            id: "thread-repair",
            store_id: "store-1",
            context_type: "whatsapp",
            entity_id: "5549911112222",
            primary_phone_e164: "+5549911112222",
            channel_instance_id: "inst-1",
            guest_name: "Ana",
            last_message_at: oldIso,
            last_message_text: null,
            history_bootstrap_done: true,
            metadata: {
              history_bootstrap_done: true,
              sync_cursor_ms: Date.parse(oldIso),
              whatsapp_jid: "5549911112222@s.whatsapp.net",
            },
          },
          {
            id: "thread-delta",
            store_id: "store-1",
            context_type: "whatsapp",
            entity_id: "5549933334444",
            primary_phone_e164: "+5549933334444",
            channel_instance_id: "inst-1",
            guest_name: "Bruno",
            last_message_at: oldIso,
            last_message_text: "Oi antigo",
            history_bootstrap_done: true,
            metadata: {
              history_bootstrap_done: true,
              sync_cursor_ms: Date.parse(oldIso),
              whatsapp_jid: "5549933334444@s.whatsapp.net",
            },
          },
        ],
        messages: [
          {
            id: "msg-repair-1",
            thread_id: "thread-repair",
            external_message_id: "ext-repair-1",
            message: "Texto ja estava no banco",
            message_type: "text",
            created_at: oldIso,
          },
        ],
      });

      const fetchedForJids: string[] = [];
      vi.spyOn(globalThis, "fetch").mockImplementation(async (input: any, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/chat/findChats/")) {
          return new Response(
            JSON.stringify([
              {
                remoteJid: "5549911112222@s.whatsapp.net",
                pushName: "Ana",
                lastMessage: { messageTimestamp: Math.floor(Date.parse(oldIso) / 1000) },
              },
              {
                remoteJid: "5549933334444@s.whatsapp.net",
                pushName: "Bruno",
                lastMessage: { messageTimestamp: newerSec },
              },
            ]),
            { status: 200 },
          );
        }
        if (url.includes("/chat/findContacts/")) {
          return new Response(JSON.stringify([]), { status: 200 });
        }
        if (url.includes("/chat/findMessages/")) {
          const body = JSON.parse(String(init?.body || "{}"));
          const jid = String(body?.where?.key?.remoteJid || "");
          fetchedForJids.push(jid);
          return new Response(
            JSON.stringify({
              messages: {
                records: [
                  {
                    key: { id: "ext-bruno-new", remoteJid: jid, fromMe: false },
                    messageTimestamp: newerSec,
                    message: { conversation: "Nova mensagem incremental" },
                  },
                ],
              },
            }),
            { status: 200 },
          );
        }
        return new Response("{}", { status: 200 });
      });

      const res = await runEvolutionDeltaSyncForInstance({
        db,
        instance: state.instances[0],
        storeId: "store-1",
        mode: "delta",
      });

      expect(res.success).toBe(true);
      expect(fetchedForJids).toEqual(["5549933334444@s.whatsapp.net"]);
      const repaired = state.threads.find((t) => t.id === "thread-repair");
      expect(repaired?.last_message_text).toBe("Texto ja estava no banco");
      const deltaThread = state.threads.find((t) => t.id === "thread-delta");
      expect(deltaThread?.last_message_text).toBe("Nova mensagem incremental");
      expect(state.messages.some((m) => m.external_message_id === "ext-bruno-new")).toBe(true);
    });
  });

  describe("Camada 3 — Cache Persistente e Merge Incremental no Cliente", () => {
    it("mergeMessagesIncremental preserva historico existente, midia hidratada, deduplica e retorna cursor mais recente", () => {
      const m1 = { id: "1", external_message_id: "e-1", message: "Oi", created_at: "2026-11-16T10:00:00.000Z" };
      const m2 = {
        id: "2",
        external_message_id: "e-2",
        message: "Tudo bem?",
        created_at: "2026-11-16T10:01:00.000Z",
        payload: { media: { url: "https://cdn.example.com/foto.jpg", kind: "image" } },
      };
      const m2Updated = {
        id: "2",
        external_message_id: "e-2",
        message: "Tudo bem?",
        created_at: "2026-11-16T10:01:00.000Z",
        payload: { status: "delivered", media: { kind: "image" } },
      };
      const m3 = { id: "3", external_message_id: "e-3", message: "Novo delta", created_at: "2026-11-16T10:02:00.000Z" };

      const merged = mergeMessagesIncremental([m1, m2], [m2Updated, m3]);
      expect(merged.map((m) => m.id)).toEqual(["1", "2", "3"]);
      expect(merged[1].payload?.status).toBe("delivered");
      expect(merged[1].payload?.media?.url).toBe("https://cdn.example.com/foto.jpg");
      expect(getLatestMessageCursor(merged)).toBe("2026-11-16T10:02:00.000Z");
    });

    it("hidrata sessionStorage com sanitizacao de anexos inline grandes e cacheia Customer 360", () => {
      const storage = new Map<string, string>();
      vi.stubGlobal("window", {
        sessionStorage: {
          getItem: (k: string) => storage.get(k) ?? null,
          setItem: (k: string, v: string) => storage.set(k, v),
          removeItem: (k: string) => storage.delete(k),
        },
      });

      const bigBase64 = `data:image/png;base64,${"A".repeat(60_000)}`;
      setCachedThreadMessages("store-1", "thread-9", [
        {
          id: "msg-big",
          message: "Foto grande",
          created_at: "2026-11-16T11:00:00.000Z",
          attachments: [bigBase64, "https://cdn.example.com/ok.jpg"],
          payload: { media: { url: bigBase64, kind: "image" } },
        },
      ]);

      // Memoria retorna objeto completo imediato
      const memCached = getCachedThreadMessages("store-1", "thread-9");
      expect(memCached).toHaveLength(1);
      expect(memCached?.[0].attachments).toContain(bigBase64);

      // Limpa memoria preservando sessionStorage e valida reidratacao enxuta
      clearAllChatClientCache();
      const restored = getCachedThreadMessages("store-1", "thread-9");
      expect(restored).toHaveLength(1);
      expect(restored?.[0].attachments).toEqual(["https://cdn.example.com/ok.jpg"]);
      expect(restored?.[0].payload?.media?.url).toBeUndefined();

      clearCachedThreadMessages("store-1", "thread-9");
      expect(getCachedThreadMessages("store-1", "thread-9")).toBeNull();

      setCachedCustomer360("store-1", "thread-9", { customerName: "Gabriella", totalSpent: 420 });
      expect(getCachedCustomer360("store-1", "thread-9")).toEqual({
        customerName: "Gabriella",
        totalSpent: 420,
      });
    });
  });

  describe("Camada 4 — Contratos Normativos SQL / BFF / UI", () => {
    it("migration 20270531000000 define cursors, trigger nao-invasivo e RPC DISTINCT ON", () => {
      const sql = readFileSync(
        resolve(process.cwd(), "supabase/migrations/20270531000000_chat_incremental_persistence_and_cursors.sql"),
        "utf-8",
      );
      expect(sql).toContain("history_bootstrap_done");
      expect(sql).toContain("sync_cursor_at");
      expect(sql).toContain("set_chat_threads_updated_at");
      expect(sql).toContain("get_threads_latest_public_messages");
      expect(sql).toContain("idx_chat_messages_thread_public_latest");
      expect(sql).toContain("idx_chat_threads_store_last_msg");
    });

    it("chat.functions.ts suporta afterCreatedAt, RPC de previews e GET limpo no Customer 360", () => {
      const src = readFileSync(resolve(process.cwd(), "src/services/chat.functions.ts"), "utf-8");
      expect(src).toContain("afterCreatedAt");
      expect(src).toContain("get_threads_latest_public_messages");
      expect(src).toContain("last_message_text");
      expect(src).toContain("history_bootstrap_done");

      const c360BlockStart = src.indexOf("export const getCustomer360Context");
      const c360BlockEnd = src.indexOf("export const ", c360BlockStart + 35);
      const c360Block = src.slice(c360BlockStart, c360BlockEnd > c360BlockStart ? c360BlockEnd : undefined);
      expect(c360Block).not.toContain("fetchProfilePictureUrl");
      expect(c360Block).not.toContain('.from("chat_threads")\n          .update(');
    });

    it("UI integra cache persistente, retry acessivel e isolamento de identidade no Customer360Sidebar", () => {
      const workspaceSrc = readFileSync(
        resolve(process.cwd(), "src/components/atendimento/AtendimentoChatWorkspace.tsx"),
        "utf-8",
      );
      expect(workspaceSrc).toContain("mergeMessagesIncremental");
      expect(workspaceSrc).toContain("getLatestMessageCursor");
      expect(workspaceSrc).toContain("getCachedThreadMessages");
      expect(workspaceSrc).toContain("setCachedThreadMessages");

      const sidebarSrc = readFileSync(
        resolve(process.cwd(), "src/components/chat/customer-360-sidebar.tsx"),
        "utf-8",
      );
      expect(sidebarSrc).toContain("getCachedCustomer360");
      expect(sidebarSrc).toContain("setCachedCustomer360");
      expect(sidebarSrc).toContain("identityPropsRef");
      expect(sidebarSrc).toContain("contextReqSeqRef");
      expect(sidebarSrc).toContain("h-11 min-h-11");
    });
  });
});
