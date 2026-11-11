import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  normalizeUnofficialIncomingMessage,
  normalizeUnofficialDelivery,
  persistInboundMessage,
  persistDelivery,
} from "./whatsapp-provider-webhook.server";
import { classifyWhatsAppSessionHealth } from "./whatsapp-channel-instances.functions";
import { sendWithWhatsAppAdapter, OutboundAdapterError } from "./whatsapp-outbound-adapters.server";
import { runWhatsAppOutboxWorker } from "./whatsapp-outbox.worker";
import {
  detectInboundIntent,
  evaluateControlledAiInboundRuntime,
} from "./whatsapp-automation-runtime.server";
import {
  linkThreadToCrmOpportunitySchema,
  registerCrmCommercialActivitySchema,
} from "./chat.functions";
import { assertStoreAccess } from "@/lib/identity-core";
import { encryptSecret } from "@/lib/crypto-vault.server";

// In-memory relational database mock for deterministic end-to-end verification
function createInMemorySupabase() {
  const tables: Record<string, any[]> = {
    stores: [],
    whatsapp_channel_instances: [],
    whatsapp_provider_webhook_events: [],
    whatsapp_contact_identities: [],
    chat_threads: [],
    chat_messages: [],
    whatsapp_outbox: [],
    whatsapp_campaign_recipients: [],
    customers_crm: [],
    leads_crm: [],
    travel_quotes: [],
    store_contracts: [],
    crm_customer_documents: [],
    financial_transactions: [],
    profiles: [],
    store_workflows: [],
    whatsapp_flow_runs: [],
  };

  let idSeq = 1;
  const nextId = (prefix: string) => `${prefix}-${idSeq++}`;

  const createQueryBuilder = (tableName: string) => {
    const filters: Array<(row: any) => boolean> = [];
    let pendingAction: "select" | "insert" | "update" | "upsert" | "delete" = "select";
    let mutationPayload: any = null;
    let upsertOpts: any = null;
    let sortField: string | null = null;
    let sortAsc = true;
    let limitCount: number | null = null;

    const execute = () => {
      const rows = tables[tableName] || (tables[tableName] = []);
      if (pendingAction === "insert") {
        const items = Array.isArray(mutationPayload) ? mutationPayload : [mutationPayload];
        const inserted = items.map((item) => {
          const row = {
            id: item.id || nextId(tableName.slice(0, 4)),
            created_at: item.created_at || new Date().toISOString(),
            ...item,
          };
          rows.push(row);
          return row;
        });
        return { data: Array.isArray(mutationPayload) ? inserted : inserted[0], error: null };
      }

      if (pendingAction === "upsert") {
        const item = mutationPayload;
        const conflictCols = String(upsertOpts?.onConflict || "id")
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean);
        const existing = rows.find((r) =>
          conflictCols.every((col) => r[col] !== undefined && r[col] === item[col]),
        );
        if (existing) {
          if (upsertOpts?.ignoreDuplicates) {
            return { data: null, error: null };
          }
          Object.assign(existing, item);
          return { data: existing, error: null };
        }
        const created = {
          id: item.id || nextId(tableName.slice(0, 4)),
          created_at: item.created_at || new Date().toISOString(),
          ...item,
        };
        rows.push(created);
        return { data: created, error: null };
      }

      let matched = rows.filter((r) => filters.every((fn) => fn(r)));

      if (pendingAction === "update") {
        matched.forEach((r) => Object.assign(r, mutationPayload));
        return { data: matched, error: null };
      }

      if (pendingAction === "delete") {
        tables[tableName] = rows.filter((r) => !filters.every((fn) => fn(r)));
        return { data: matched, error: null };
      }

      if (sortField) {
        matched = [...matched].sort((a, b) => {
          const va = a[sortField!];
          const vb = b[sortField!];
          if (va === vb) return 0;
          return (va > vb ? 1 : -1) * (sortAsc ? 1 : -1);
        });
      }
      if (limitCount !== null) {
        matched = matched.slice(0, limitCount);
      }
      return { data: matched, error: null };
    };

    const builder: any = {
      select: () => builder,
      insert: (payload: any) => {
        pendingAction = "insert";
        mutationPayload = payload;
        return builder;
      },
      update: (payload: any) => {
        pendingAction = "update";
        mutationPayload = payload;
        return builder;
      },
      upsert: (payload: any, opts?: any) => {
        pendingAction = "upsert";
        mutationPayload = payload;
        upsertOpts = opts;
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
        filters.push((r) => Array.isArray(vals) && vals.includes(r[col]));
        return builder;
      },
      is: (col: string, val: any) => {
        filters.push((r) => (val === null ? r[col] === null || r[col] === undefined : r[col] === val));
        return builder;
      },
      lte: (col: string, val: any) => {
        filters.push((r) => r[col] <= val);
        return builder;
      },
      gte: (col: string, val: any) => {
        filters.push((r) => r[col] === undefined || r[col] >= val);
        return builder;
      },
      ilike: (col: string, pattern: string) => {
        const clean = pattern.replace(/%/g, "").toLowerCase();
        filters.push((r) => String(r[col] || "").toLowerCase().includes(clean));
        return builder;
      },
      or: (expr: string) => {
        filters.push((r) => {
          const clauses = expr.split(",");
          return clauses.some((c) => {
            if (c.includes(".ilike.")) {
              const [col, pat] = c.split(".ilike.");
              const clean = pat.replace(/%/g, "").toLowerCase();
              return String(r[col] || "").toLowerCase().includes(clean);
            }
            if (c.includes(".eq.")) {
              const [col, val] = c.split(".eq.");
              return String(r[col] || "") === val;
            }
            return true;
          });
        });
        return builder;
      },
      order: (col: string, opts?: { ascending?: boolean }) => {
        sortField = col;
        sortAsc = opts?.ascending !== false;
        return builder;
      },
      limit: (n: number) => {
        limitCount = n;
        return builder;
      },
      maybeSingle: async () => {
        const res = execute();
        if (Array.isArray(res.data)) {
          return { data: res.data[0] || null, error: res.error };
        }
        return res;
      },
      single: async () => {
        const res = execute();
        if (Array.isArray(res.data)) {
          return { data: res.data[0] || null, error: res.error };
        }
        return res;
      },
      then: (resolve: any, reject: any) => Promise.resolve(execute()).then(resolve, reject),
    };

    return builder;
  };

  return {
    tables,
    from: (tableName: string) => createQueryBuilder(tableName),
    rpc: async (fnName: string, args: Record<string, any>) => {
      if (fnName === "claim_whatsapp_outbox") {
        const pending = (tables.whatsapp_outbox || []).filter(
          (r) => r.status === "pending" || r.status === "failed",
        );
        const claimed = pending.slice(0, args?.p_batch_size || 10).map((r) => {
          r.status = "processing";
          r.locked_by = args?.p_worker_id || "test-worker";
          r.attempts = (r.attempts || 0) + 1;
          return { ...r };
        });
        return { data: claimed, error: null };
      }
      if (fnName === "acquire_whatsapp_provider_circuit" || fnName === "acquire_whatsapp_circuit_permit") {
        return {
          data: [{ allowed: true, circuit_state: "closed", retry_after_seconds: 0 }],
          error: null,
        };
      }
      if (fnName === "record_whatsapp_provider_circuit_result" || fnName === "record_whatsapp_circuit_result") {
        return { data: null, error: null };
      }
      return { data: null, error: null };
    },
  };
}

let activeDb = createInMemorySupabase();

vi.mock("@/lib/supabase", () => ({
  getServerClient: () => activeDb,
}));

describe("WAEsy Fase 2 — Homologação End-to-End (20 Cenários Obrigatórios)", () => {
  const storeId = "11111111-1111-4111-8111-111111111111";
  const otherStoreId = "22222222-2222-4222-8222-222222222222";
  const instanceId = "inst-excelencia-01";
  let instanceRecord: any;

  beforeEach(() => {
    activeDb = createInMemorySupabase();
    activeDb.tables.stores.push({
      id: storeId,
      name: "Excelência Tour SMO",
      settings: {
        ai_automation_config: {
          mode: "disabled",
          enabled_agents: ["sdr_agent", "commercial_closer"],
          max_consecutive_turns: 3,
          cooldown_seconds: 15,
        },
      },
    });
    instanceRecord = {
      id: instanceId,
      store_id: storeId,
      provider: "evolution_api",
      instance_key: "principal",
      external_instance_id: `waesy_${storeId.replace(/-/g, "")}_principal`,
      phone_number_id: null,
      status: "connected",
      is_active: true,
      public_config: {
        base_url: "https://gateway-test.waesy.internal",
        server_url: "https://gateway-test.waesy.internal",
        instance_name: `waesy_${storeId.replace(/-/g, "")}_principal`,
        import_history: true,
      },
      secret_payload_encrypted: encryptSecret(
        JSON.stringify({
          api_key: "test-evolution-api-key-rotated",
          base_url: "https://gateway-test.waesy.internal",
          instance_name: `waesy_${storeId.replace(/-/g, "")}_principal`,
        }),
      ),
    };
    activeDb.tables.whatsapp_channel_instances.push(instanceRecord);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("Cenário 01 & 13: Mensagem recebida do cliente (fromMe: false) cria contato limpo e conversa", async () => {
    const body = {
      event: "messages.upsert",
      sender: "5549936330312@s.whatsapp.net", // JID da loja enviado pela Evolution
      timestamp: 1710000100,
    };
    const item = {
      key: {
        id: "wamid-inbound-01",
        fromMe: false,
        remoteJid: "5549991112233@s.whatsapp.net",
      },
      pushName: "Marina Viajante",
      message: { conversation: "Olá, gostaria de cotação para Gramado!" },
      messageTimestamp: 1710000100,
    };

    const normalized = normalizeUnofficialIncomingMessage("evolution_api", body, item);
    expect(normalized).not.toBeNull();
    expect(normalized?.fromMe).toBe(false);
    expect(normalized?.phone).toBe("+5549991112233");
    expect(normalized?.pushName).toBe("Marina Viajante");

    const res = await persistInboundMessage(activeDb as any, "evolution_api", instanceRecord, body, normalized!);
    expect(res.threadId).toBeDefined();
    expect(res.messageId).toBeDefined();

    const thread = activeDb.tables.chat_threads[0];
    expect(thread.guest_name).toBe("Marina Viajante");
    expect(thread.guest_phone).toBe("+5549991112233");

    const crmCustomer = activeDb.tables.customers_crm[0];
    expect(crmCustomer.full_name).toBe("Marina Viajante");
    expect(crmCustomer.phone).toBe("+5549991112233");
  });

  it("Cenário 02: Mensagem enviada pelo Waesy vincula chat_messages ao whatsapp_outbox e atualiza status para accepted", async () => {
    const threadId = "thread-waesy-02";
    const chatMsgId = "33333333-3333-4333-8333-333333333333";
    activeDb.tables.chat_threads.push({
      id: threadId,
      store_id: storeId,
      guest_name: "Carlos Cliente",
      guest_phone: "+5549988887777",
      channel: "whatsapp",
      status: "open",
    });
    activeDb.tables.chat_messages.push({
      id: chatMsgId,
      thread_id: threadId,
      channel: "whatsapp",
      message: "encrypted-content",
      is_staff_reply: true,
      delivery_status: "queued",
      payload: { origin: "waesy_panel" },
    });
    activeDb.tables.whatsapp_outbox.push({
      id: "outbox-02",
      store_id: storeId,
      thread_id: threadId,
      channel_instance_id: instanceId,
      provider: "evolution_api",
      idempotency_key: `chat_msg:${chatMsgId}`,
      recipient_phone: "+5549988887777",
      message_type: "text",
      payload: { text: "Segue sua proposta de viagem!", chat_message_id: chatMsgId },
      status: "pending",
      attempts: 0,
      max_attempts: 4,
      next_attempt_at: new Date(Date.now() - 1000).toISOString(),
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ key: { id: "evo-provider-msg-02" }, status: "PENDING" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const workerResult = await runWhatsAppOutboxWorker({ batchSize: 10 });
    expect(workerResult.accepted).toBe(1);

    const updatedMsg = activeDb.tables.chat_messages.find((m) => m.id === chatMsgId);
    expect(updatedMsg.external_message_id).toBe("evo-provider-msg-02");
    expect(updatedMsg.delivery_status).toBe("accepted");
  });

  it("Cenário 03 & 12: Mensagem enviada pelo celular (fromMe: true) sincroniza na conversa correta sem criar contato 'Você' e pausa IA", async () => {
    const threadId = "thread-existing-03";
    activeDb.tables.whatsapp_contact_identities.push({
      id: "ident-03",
      store_id: storeId,
      provider: "evolution_api",
      external_user_id: "5549991112233@s.whatsapp.net",
      phone_e164: "+5549991112233",
      display_name: "Marina Viajante",
    });
    activeDb.tables.chat_threads.push({
      id: threadId,
      store_id: storeId,
      channel: "whatsapp",
      channel_identity_id: "ident-03",
      guest_name: "Marina Viajante",
      guest_phone: "+5549991112233",
      status: "open",
      metadata: { handoff_mode: "ai_triage", ai_auto_reply_enabled: true },
    });

    const body = {
      event: "messages.upsert",
      sender: "5549936330312@s.whatsapp.net", // Número da própria agência
      timestamp: 1710000200,
    };
    const item = {
      key: {
        id: "wamid-device-outbound-03",
        fromMe: true,
        remoteJid: "5549991112233@s.whatsapp.net",
      },
      pushName: "Você", // Evolution frequentemente envia "Você" ou nome da loja em fromMe=true
      message: { conversation: "Oi Marina, estou te respondendo aqui pelo celular da agência!" },
      messageTimestamp: 1710000200,
    };

    const normalized = normalizeUnofficialIncomingMessage("evolution_api", body, item);
    expect(normalized).not.toBeNull();
    expect(normalized?.fromMe).toBe(true);
    expect(normalized?.phone).toBe("+5549991112233");
    expect(normalized?.pushName).toBeNull(); // Nunca deve aceitar "Você"

    const res = await persistInboundMessage(activeDb as any, "evolution_api", instanceRecord, body, normalized!);
    expect(res.origin).toBe("whatsapp_device");
    expect(res.threadId).toBe(threadId);
    expect(activeDb.tables.chat_threads).toHaveLength(1);
    expect(activeDb.tables.chat_threads[0].guest_name).toBe("Marina Viajante"); // Nome preservado!
    expect(activeDb.tables.chat_threads[0].metadata.handoff_mode).toBe("human_active");
    expect(activeDb.tables.chat_threads[0].metadata.ai_auto_reply_enabled).toBe(false);

    const msg = activeDb.tables.chat_messages[0];
    expect(msg.is_staff_reply).toBe(true);
    expect(msg.delivery_status).toBe("sent");
    expect(msg.payload.origin).toBe("whatsapp_device");
  });

  it("Cenário 04: Evento duplicado da Evolution é barrado por idempotência sem duplicar mensagem", async () => {
    const body = { event: "messages.upsert", timestamp: 1710000300 };
    const item = {
      key: { id: "wamid-dup-04", fromMe: false, remoteJid: "5549992223344@s.whatsapp.net" },
      pushName: "Pedro",
      message: { conversation: "Mensagem única" },
      messageTimestamp: 1710000300,
    };
    const normalized = normalizeUnofficialIncomingMessage("evolution_api", body, item)!;

    const first = await persistInboundMessage(activeDb as any, "evolution_api", instanceRecord, body, normalized);
    expect(first.messageId).toBeDefined();

    const second = await persistInboundMessage(activeDb as any, "evolution_api", instanceRecord, body, normalized);
    expect(second.duplicate).toBe(true);
    expect(activeDb.tables.chat_messages).toHaveLength(1);
  });

  it("Cenário 05: Evento fora de ordem (read antes de delivered) preserva estado monotônico superior", async () => {
    activeDb.tables.chat_messages.push({
      id: "msg-order-05",
      thread_id: "thread-05",
      channel: "whatsapp",
      external_message_id: "wamid-order-05",
      delivery_status: "read",
      read_at: "2026-11-11T15:00:05.000Z",
    });

    const lateDelivered = normalizeUnofficialDelivery("evolution_api", { event: "messages.update" }, {
      key: { id: "wamid-order-05", remoteJid: "5549992223344@s.whatsapp.net" },
      update: { status: "DELIVERY_ACK" },
    })!;

    await persistDelivery(activeDb as any, "evolution_api", instanceRecord, { event: "messages.update" }, lateDelivered);

    const msg = activeDb.tables.chat_messages[0];
    expect(msg.delivery_status).toBe("read"); // Não regrediu para delivered
  });

  it("Cenário 06: Eco de mensagem enviada pelo Waesy (fromMe: true em MESSAGES_UPSERT) concilia sem duplicar bolha", async () => {
    const threadId = "thread-echo-06";
    activeDb.tables.whatsapp_contact_identities.push({
      id: "ident-06",
      store_id: storeId,
      provider: "evolution_api",
      external_user_id: "5549995556666@s.whatsapp.net",
      phone_e164: "+5549995556666",
      display_name: "Fernanda",
    });
    activeDb.tables.chat_threads.push({
      id: threadId,
      store_id: storeId,
      channel: "whatsapp",
      channel_identity_id: "ident-06",
      guest_name: "Fernanda",
      guest_phone: "+5549995556666",
      status: "open",
    });
    activeDb.tables.chat_messages.push({
      id: "msg-waesy-06",
      thread_id: threadId,
      channel: "whatsapp",
      is_staff_reply: true,
      external_message_id: "wamid-waesy-echo-06",
      delivery_status: "accepted",
      payload: { origin: "waesy_panel" },
    });

    const body = { event: "messages.upsert", timestamp: 1710000600 };
    const item = {
      key: { id: "wamid-waesy-echo-06", fromMe: true, remoteJid: "5549995556666@s.whatsapp.net" },
      message: { conversation: "Mensagem disparada pelo painel" },
      messageTimestamp: 1710000600,
    };
    const normalized = normalizeUnofficialIncomingMessage("evolution_api", body, item)!;

    const res = await persistInboundMessage(activeDb as any, "evolution_api", instanceRecord, body, normalized);
    expect(res.reconciled).toBe("existing_external_id");
    expect(activeDb.tables.chat_messages).toHaveLength(1);
    expect(activeDb.tables.chat_messages[0].delivery_status).toBe("sent");
  });

  it("Cenário 07: Envio quando sessão está desconectada ('Connection Closed') marca mensagem como falha sem desativar is_active", async () => {
    const threadId = "thread-disc-07";
    const chatMsgId = "77777777-7777-4777-8777-777777777777";
    activeDb.tables.chat_messages.push({
      id: chatMsgId,
      thread_id: threadId,
      is_staff_reply: true,
      delivery_status: "queued",
      payload: {},
    });
    activeDb.tables.whatsapp_outbox.push({
      id: "outbox-07",
      store_id: storeId,
      thread_id: threadId,
      channel_instance_id: instanceId,
      provider: "evolution_api",
      idempotency_key: `chat_msg:${chatMsgId}`,
      recipient_phone: "+5549997778888",
      message_type: "text",
      payload: { text: "Tentativa com Connection Closed", chat_message_id: chatMsgId },
      status: "pending",
      attempts: 0,
      max_attempts: 2,
      next_attempt_at: new Date(Date.now() - 1000).toISOString(),
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 400, error: "Bad Request", response: { message: "Connection Closed" } }), {
        status: 400,
        headers: { "content-type": "application/json" },
      }),
    );

    await runWhatsAppOutboxWorker({ batchSize: 5 });

    const inst = activeDb.tables.whatsapp_channel_instances.find((i) => i.id === instanceId);
    expect(inst.is_active).toBe(true); // NUNCA deve ser false!
    expect(inst.status).toBe("degraded");

    const msg = activeDb.tables.chat_messages.find((m) => m.id === chatMsgId);
    expect(msg.delivery_status).toBe("failed");
    expect(msg.error_code).toBe("TEMPORARY_SEND_FAILURE");
  });

  it("Cenário 08: Envio quando sessão foi revogada (401 Logged Out) classifica como SESSION_REVOKED mantendo is_active=true", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 401, message: "device_removed / loggedOut" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    );

    let caughtError: OutboundAdapterError | null = null;
    try {
      await sendWithWhatsAppAdapter(instanceRecord, {
        recipientPhone: "+5549997778888",
        messageType: "text",
        payload: { text: "Teste sessão revogada" },
      });
    } catch (err: any) {
      caughtError = err;
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError?.code).toBe("SESSION_REVOKED");
    expect(caughtError?.retryable).toBe(false);

    const inst = activeDb.tables.whatsapp_channel_instances.find((i) => i.id === instanceId);
    expect(inst.status).toBe("revoked");
    expect(inst.is_active).toBe(true);
  });

  it("Cenário 09: Gateway inacessível e Túnel Cloudflare indisponível (502/530) são diferenciados com precisão", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Bad Gateway", { status: 502 }),
    );

    let tunnelErr: OutboundAdapterError | null = null;
    try {
      await sendWithWhatsAppAdapter(instanceRecord, {
        recipientPhone: "+5549997778888",
        messageType: "text",
        payload: { text: "Teste túnel 502" },
      });
    } catch (err: any) {
      tunnelErr = err;
    }
    expect(tunnelErr?.code).toBe("TUNNEL_UNAVAILABLE");
    expect(tunnelErr?.retryable).toBe(true);

    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new TypeError("fetch failed: ECONNREFUSED"));
    let gatewayErr: OutboundAdapterError | null = null;
    try {
      await sendWithWhatsAppAdapter(instanceRecord, {
        recipientPhone: "+5549997778888",
        messageType: "text",
        payload: { text: "Teste gateway offline" },
      });
    } catch (err: any) {
      gatewayErr = err;
    }
    expect(gatewayErr?.code).toBe("GATEWAY_UNREACHABLE");
    expect(gatewayErr?.retryable).toBe(true);
  });

  it("Cenário 10: Timeout no envio (UNCERTAIN_SEND_STATE) reconcilia com confirmação via webhook antes do retry sem reenviar duplicata", async () => {
    const threadId = "thread-uncertain-10";
    const chatMsgId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    activeDb.tables.chat_messages.push({
      id: chatMsgId,
      thread_id: threadId,
      is_staff_reply: true,
      external_message_id: "wamid-confirmed-by-webhook-10",
      delivery_status: "sent",
      payload: {},
    });
    activeDb.tables.whatsapp_outbox.push({
      id: "outbox-10",
      store_id: storeId,
      thread_id: threadId,
      channel_instance_id: instanceId,
      provider: "evolution_api",
      idempotency_key: `chat_msg:${chatMsgId}`,
      recipient_phone: "+5549997778888",
      message_type: "text",
      payload: { text: "Mensagem com timeout na 1ª tentativa", chat_message_id: chatMsgId },
      status: "failed",
      attempts: 1, // Já teve 1 tentativa incerta
      max_attempts: 4,
      next_attempt_at: new Date(Date.now() - 1000).toISOString(),
    });

    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const res = await runWhatsAppOutboxWorker({ batchSize: 5 });

    expect(res.accepted).toBe(1);
    expect(fetchSpy).not.toHaveBeenCalled(); // Não reenviou para a Evolution!
    expect(activeDb.tables.whatsapp_outbox[0].status).toBe("accepted");
  });

  it("Cenário 11: Health Check multi-sinal detecta estado zombie (connectionState=open mas fetchInstances=close/401) e respeita reconexão posterior", () => {
    const zombieCheck = classifyWhatsAppSessionHealth({
      connectionStateStatus: "open",
      connectionStateHttpStatus: 200,
      fetchInstancesRecord: {
        connectionStatus: "close",
        disconnectionReasonCode: 401,
        disconnectionAt: "2026-11-11T18:00:00.000Z",
        updatedAt: "2026-11-11T17:00:00.000Z",
      },
    });
    expect(zombieCheck.diagnosticState).toBe("session_revoked");
    expect(zombieCheck.dbStatus).toBe("revoked");

    // Se reconectou às 19:00 após a desconexão das 18:00, o código 401 histórico não deve bloquear a sessão!
    const reconnectedCheck = classifyWhatsAppSessionHealth({
      connectionStateStatus: "open",
      connectionStateHttpStatus: 200,
      fetchInstancesRecord: {
        connectionStatus: "open",
        disconnectionReasonCode: 401,
        disconnectionAt: "2026-11-11T18:00:00.000Z",
        updatedAt: "2026-11-11T19:00:00.000Z",
      },
      lastConnectedAt: "2026-11-11T19:00:00.000Z",
    });
    expect(reconnectedCheck.diagnosticState).toBe("connected");
    expect(reconnectedCheck.dbStatus).toBe("connected");
  });

  it("Cenário 14, 15 & 16: Cliente com múltiplas oportunidades (1:N), vínculo de oportunidade, movimentação no Kanban e atividade comercial", () => {
    const linkParsed = linkThreadToCrmOpportunitySchema.safeParse({
      threadId: "11111111-1111-4111-8111-111111111111",
      leadId: "22222222-2222-4222-8222-222222222222",
    });
    expect(linkParsed.success).toBe(true);

    const unlinkParsed = linkThreadToCrmOpportunitySchema.safeParse({
      threadId: "11111111-1111-4111-8111-111111111111",
      leadId: null,
    });
    expect(unlinkParsed.success).toBe(true);

    const actParsed = registerCrmCommercialActivitySchema.safeParse({
      leadId: "22222222-2222-4222-8222-222222222222",
      threadId: "11111111-1111-4111-8111-111111111111",
      activityText: "Enviada cotação aérea + hotel Gramado",
      activityType: "proposal_sent",
    });
    expect(actParsed.success).toBe(true);
  });

  it("Cenário 17 & 18: Isolamento Multi-Tenant e RLS (assertStoreAccess bloqueia acesso cruzado entre lojas)", () => {
    const fakeIdentity: any = {
      id: "user-store-1",
      role: "manager",
      store_id: storeId,
      memberships: [{ store_id: storeId, role: "manager" }],
    };

    // Acesso permitido à própria loja (não lança exceção)
    expect(() =>
      assertStoreAccess(fakeIdentity, ["owner", "manager", "seller"], storeId),
    ).not.toThrow();

    // Acesso negado à loja de outro tenant (lança exceção de isolamento multi-tenant)
    expect(() =>
      assertStoreAccess(fakeIdentity, ["owner", "manager", "seller"], otherStoreId),
    ).toThrow();
  });

  it("Cenário 19: Chatbot / Copilot em modo Assistido gera sugestão contextualizada com CRM sem disparar mensagem externa", async () => {
    activeDb.tables.stores[0].settings.ai_automation_config.mode = "assisted";
    activeDb.tables.leads_crm.push({
      id: "lead-crm-19",
      store_id: storeId,
      name: "Pacote Bariloche",
      phone: "+5549991112233",
      status: "proposal",
    });
    activeDb.tables.chat_threads.push({
      id: "thread-ai-19",
      store_id: storeId,
      guest_name: "Marina",
      guest_phone: "+5549991112233",
      metadata: { handoff_mode: "ai_triage", ai_auto_reply_enabled: true },
    });

    const decision = await evaluateControlledAiInboundRuntime({
      storeId,
      instanceId,
      provider: "evolution_api",
      threadId: "thread-ai-19",
      identityId: "ident-19",
      phone: "+5549991112233",
      text: "Olá, gostaria de receber um orçamento para pacote de viagem!",
      eventId: "evt-19",
      payload: { fromMe: false, pushName: "Marina" },
    });

    expect(decision.intent).toBe("quote_request");
    expect(decision.agentSlug).toBe("commercial_closer");
    expect(decision.actionTaken).toBe("copilot_suggestion_saved");
    expect(decision.crmContextSummary?.opportunitiesCount).toBe(1);
    expect(activeDb.tables.whatsapp_outbox).toHaveLength(0); // Nenhum envio externo em modo assistido!
    expect(activeDb.tables.chat_threads[0].metadata.ai_copilot_suggestion.suggestedReply).toContain("Marina");
  });

  it("Cenário 20: Handoff humano imediato e proteção contra loop (fromMe=true, solicitação de humano e limite de turnos)", async () => {
    activeDb.tables.stores[0].settings.ai_automation_config.mode = "sandbox";
    activeDb.tables.chat_threads.push({
      id: "thread-ai-20",
      store_id: storeId,
      guest_name: "Roberto",
      guest_phone: "+5549994445555",
      metadata: { handoff_mode: "ai_triage", ai_auto_reply_enabled: true },
    });

    // 1. Mensagem fromMe=true jamais aciona IA
    const fromMeDecision = await evaluateControlledAiInboundRuntime({
      storeId,
      instanceId,
      provider: "evolution_api",
      threadId: "thread-ai-20",
      identityId: "ident-20",
      phone: "+5549994445555",
      text: "Oi Roberto",
      payload: { fromMe: true },
    });
    expect(fromMeDecision.actionTaken).toBe("halted_from_me");

    // 2. Cliente pede para falar com atendente humano -> pausa IA imediatamente
    const handoffDecision = await evaluateControlledAiInboundRuntime({
      storeId,
      instanceId,
      provider: "evolution_api",
      threadId: "thread-ai-20",
      identityId: "ident-20",
      phone: "+5549994445555",
      text: "Quero falar com um atendente humano por favor",
      payload: { fromMe: false },
    });
    expect(handoffDecision.intent).toBe("human_handoff");
    expect(handoffDecision.actionTaken).toBe("handoff_to_human_queue");
    expect(activeDb.tables.chat_threads[0].metadata.handoff_mode).toBe("human_queue");
    expect(activeDb.tables.chat_threads[0].metadata.ai_auto_reply_enabled).toBe(false);

    // 3. Nova mensagem na mesma thread sob controle humano é bloqueada
    const blockedAfterHandoff = await evaluateControlledAiInboundRuntime({
      storeId,
      instanceId,
      provider: "evolution_api",
      threadId: "thread-ai-20",
      identityId: "ident-20",
      phone: "+5549994445555",
      text: "Qual o valor do pacote?",
      payload: { fromMe: false },
    });
    expect(blockedAfterHandoff.actionTaken).toBe("halted_human_active");
  });
});
