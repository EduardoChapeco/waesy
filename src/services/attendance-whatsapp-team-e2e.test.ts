import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const STORE_A = "11111111-1111-4111-8111-111111111111";
const STORE_B = "22222222-2222-4222-8222-222222222222";
const USER_OWNER_A = "aaaa1111-1111-4111-8111-111111111111";
const USER_AGENT_A = "bbbb1111-1111-4111-8111-111111111111";
const USER_OWNER_B = "cccc2222-2222-4222-8222-222222222222";
const USER_MASTER = "dddd0000-0000-4000-8000-000000000000";

const INST_1 = "10000000-0000-4000-8000-000000000001";
const INST_2 = "10000000-0000-4000-8000-000000000002";
const INST_3 = "10000000-0000-4000-8000-000000000003";
const INST_B = "20000000-0000-4000-8000-000000000009";
const DEPT_SALES_A = "30000000-0000-4000-8000-000000000001";
const DEPT_SUPPORT_B = "30000000-0000-4000-8000-000000000009";
const THREAD_1 = "40000000-0000-4000-8000-000000000001";
const THREAD_2 = "40000000-0000-4000-8000-000000000002";
const THREAD_3 = "40000000-0000-4000-8000-000000000003";

let mockDb: ReturnType<typeof createInMemoryDb>;
let mockIdentity: any;

function createInMemoryDb() {
  const tables: Record<string, any[]> = {
    stores: [],
    profiles: [],
    workspace_members: [],
    whatsapp_channel_instances: [],
    whatsapp_channel_audit_events: [],
    whatsapp_outbox: [],
    whatsapp_provider_webhook_events: [],
    whatsapp_contact_identities: [],
    chat_departments: [],
    chat_threads: [],
    chat_messages: [],
    chat_thread_transfers: [],
    platform_api_integrations: [],
  };

  let seq = 100;
  const nextUuid = () => {
    seq += 1;
    const hex = String(seq).padStart(12, "0");
    return `99999999-9999-4999-8999-${hex}`;
  };

  const authUsers: Array<{ id: string; email: string; user_metadata?: any }> = [];

  const from = (tableName: string) => {
    const filters: Array<(row: any) => boolean> = [];
    let action: "select" | "insert" | "update" | "upsert" | "delete" = "select";
    let payload: any = null;
    let upsertOpts: any = null;
    let selectClause = "*";
    const orderCols: Array<{ col: string; ascending: boolean }> = [];
    let limitNum: number | null = null;
    let wantSingle: "single" | "maybeSingle" | null = null;

    const enrichRow = (row: any) => {
      const cloned = { ...row };
      if (tableName === "workspace_members" && selectClause.includes("profiles(")) {
        const prof = tables.profiles.find((p) => p.id === row.profile_id) || null;
        cloned.profiles = prof ? { ...prof } : null;
      }
      return cloned;
    };

    const run = () => {
      const list = tables[tableName] || (tables[tableName] = []);

      if (action === "insert") {
        const items = Array.isArray(payload) ? payload : [payload];
        const created = items.map((item) => {
          const row = {
            id: item.id || nextUuid(),
            created_at: item.created_at || new Date().toISOString(),
            ...item,
          };
          list.push(row);
          return enrichRow(row);
        });
        const out = Array.isArray(payload) ? created : created[0];
        if (wantSingle === "single" || wantSingle === "maybeSingle") {
          return { data: Array.isArray(out) ? out[0] ?? null : out, error: null };
        }
        return { data: out, error: null };
      }

      if (action === "upsert") {
        const conflictCols = String(upsertOpts?.onConflict || "id")
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean);
        const existing = list.find((r) =>
          conflictCols.every((c) => r[c] !== undefined && r[c] === payload[c]),
        );
        if (existing) {
          Object.assign(existing, payload);
          const enriched = enrichRow(existing);
          return { data: wantSingle ? enriched : [enriched], error: null };
        }
        const created = {
          id: payload.id || nextUuid(),
          created_at: payload.created_at || new Date().toISOString(),
          ...payload,
        };
        list.push(created);
        const enriched = enrichRow(created);
        return { data: wantSingle ? enriched : [enriched], error: null };
      }

      let matched = list.filter((r) => filters.every((f) => f(r)));

      if (action === "update") {
        matched.forEach((r) => Object.assign(r, payload));
        const enriched = matched.map(enrichRow);
        if (wantSingle === "single") {
          return enriched[0]
            ? { data: enriched[0], error: null }
            : { data: null, error: { message: "Row not found" } };
        }
        if (wantSingle === "maybeSingle") {
          return { data: enriched[0] ?? null, error: null };
        }
        return { data: enriched, error: null };
      }

      if (action === "delete") {
        const toDelete = new Set(matched);
        tables[tableName] = list.filter((r) => !toDelete.has(r));
        return { data: matched.map(enrichRow), error: null };
      }

      for (let i = orderCols.length - 1; i >= 0; i -= 1) {
        const { col, ascending } = orderCols[i];
        matched = [...matched].sort((a, b) => {
          const va = a[col];
          const vb = b[col];
          if (va === vb) return 0;
          if (va === undefined || va === null) return ascending ? 1 : -1;
          if (vb === undefined || vb === null) return ascending ? -1 : 1;
          return (va > vb ? 1 : -1) * (ascending ? 1 : -1);
        });
      }
      if (limitNum !== null) {
        matched = matched.slice(0, limitNum);
      }

      const enriched = matched.map(enrichRow);
      if (wantSingle === "single") {
        return enriched[0]
          ? { data: enriched[0], error: null }
          : { data: null, error: { message: "No rows" } };
      }
      if (wantSingle === "maybeSingle") {
        return { data: enriched[0] ?? null, error: null };
      }
      return { data: enriched, error: null };
    };

    const builder: any = {
      select: (cols?: string) => {
        if (cols) selectClause = cols;
        return builder;
      },
      insert: (data: any) => {
        action = "insert";
        payload = data;
        return builder;
      },
      update: (data: any) => {
        action = "update";
        payload = data;
        return builder;
      },
      upsert: (data: any, opts?: any) => {
        action = "upsert";
        payload = data;
        upsertOpts = opts;
        return builder;
      },
      delete: () => {
        action = "delete";
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
      gte: (col: string, val: any) => {
        filters.push((r) => r[col] !== undefined && r[col] >= val);
        return builder;
      },
      lte: (col: string, val: any) => {
        filters.push((r) => r[col] !== undefined && r[col] <= val);
        return builder;
      },
      ilike: (col: string, pat: string) => {
        const clean = pat.replace(/%/g, "").toLowerCase();
        filters.push((r) => String(r[col] || "").toLowerCase().includes(clean));
        return builder;
      },
      or: (expr: string) => {
        filters.push((r) =>
          expr.split(",").some((part) => {
            if (part.includes(".eq.")) {
              const [col, val] = part.split(".eq.");
              return String(r[col] ?? "") === val;
            }
            if (part.includes(".ilike.")) {
              const [col, pat] = part.split(".ilike.");
              return String(r[col] ?? "").toLowerCase().includes(pat.replace(/%/g, "").toLowerCase());
            }
            return false;
          }),
        );
        return builder;
      },
      order: (col: string, opts?: { ascending?: boolean }) => {
        orderCols.push({ col, ascending: opts?.ascending !== false });
        return builder;
      },
      limit: (n: number) => {
        limitNum = n;
        return builder;
      },
      single: () => {
        wantSingle = "single";
        return Promise.resolve(run());
      },
      maybeSingle: () => {
        wantSingle = "maybeSingle";
        return Promise.resolve(run());
      },
      then: (resolve: any, reject: any) => Promise.resolve(run()).then(resolve, reject),
    };
    return builder;
  };

  return {
    tables,
    authUsers,
    from,
    schema: (schemaName: string) => ({
      from: (tableName: string) => {
        if (schemaName === "auth" && tableName === "users") {
          return {
            select: () => ({
              in: async (_col: string, ids: string[]) => ({
                data: authUsers.filter((u) => ids.includes(u.id)).map((u) => ({ id: u.id, email: u.email })),
                error: null,
              }),
            }),
          };
        }
        return from(tableName);
      },
    }),
    rpc: vi.fn(async (fnName: string) => {
      if (fnName === "get_whatsapp_operations_metrics") {
        return {
          data: {
            store_id: STORE_A,
            queue: { pending: 2, processing: 1, failed: 1, dead_letter: 1, accepted_24h: 18, oldest_pending_seconds: 12, retryable_failures_24h: 0, p95_latency_ms_24h: 350, throughput_24h: 18 },
            conversations: { open: 2, unassigned: 1, first_response_avg_seconds: 90, first_response_p95_seconds: 180 },
            agents: [],
            providers: [{ provider: "evolution_api", attempts: 19, accepted: 18, failures: 1, avg_duration_ms: 210, p95_duration_ms: 350 }],
            health: { worker_status: "running", worker_last_seen_at: new Date().toISOString(), worker_last_run_at: new Date().toISOString(), worker_count: 1, generated_at: new Date().toISOString() },
            generated_at: new Date().toISOString(),
          },
          error: null,
        };
      }
      return { data: null, error: null };
    }),
    auth: {
      admin: {
        listUsers: async () => ({ data: { users: [...authUsers] }, error: null }),
        createUser: async (opts: { email: string; user_metadata?: any }) => {
          const existing = authUsers.find((u) => u.email.toLowerCase() === opts.email.toLowerCase());
          if (existing) {
            return { data: null, error: { message: "User already registered" } };
          }
          const created = { id: nextUuid(), email: opts.email, user_metadata: opts.user_metadata };
          authUsers.push(created);
          return { data: { user: created }, error: null };
        },
      },
    },
  };
}

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    validator: (schema: any) => ({
      handler: (fn: any) => async (args: any) => {
        const parsed = typeof schema === "function"
          ? schema(args?.data)
          : schema?.parse
            ? schema.parse(args?.data)
            : args?.data;
        return fn({ data: parsed });
      },
    }),
    handler: (fn: any) => async (args: any) => fn(args || {}),
  }),
}));

vi.mock("@/lib/supabase", () => ({
  SupabaseUnconfiguredError: class SupabaseUnconfiguredError extends Error {},
  getServerClient: () => mockDb,
  getAnonServerClient: () => mockDb,
}));

vi.mock("@/lib/server-access", async () => {
  const actual = await vi.importActual<typeof import("@/lib/server-access")>("@/lib/server-access");
  return {
    ...actual,
    getServerIdentity: async () => mockIdentity,
  };
});

import {
  _connectWhatsAppQrCodeInstance,
  _syncWhatsAppInstanceStatus,
  _deleteWhatsAppInstance,
  _updateWorkspaceWhatsAppInstanceMetadata,
  _upsertChatDepartment,
  _deleteChatDepartment,
} from "./whatsapp-channel-instances.functions";
import { handleUnofficialWhatsAppWebhook } from "./whatsapp-provider-webhook.server";
import {
  _listTeamMembers,
  _inviteTeamMember,
  _updateTeamMemberProfile,
  _toggleAgentPresence,
} from "./admin-team.functions";
import {
  resolveOutboundWhatsAppInstanceForThread,
  _sendChatMessage,
} from "./chat.functions";
import { _getAttendanceBusinessIntelligence } from "./whatsapp-operations-metrics.functions";
import { getMasterSidebarPillars, resolveWorkspaceNavigation } from "@/lib/workspace-navigation";

describe("Atendimento Decoupling, Multi-Number WhatsApp, Equipe & BI E2E", () => {
  beforeEach(() => {
    process.env.EVOLUTION_API_URL = "http://evolution.test";
    process.env.EVOLUTION_API_KEY = "test-evo-key";

    mockDb = createInMemoryDb();
    mockIdentity = {
      id: USER_OWNER_A,
      role: "owner",
      store_id: STORE_A,
      memberships: [{ store_id: STORE_A, role: "owner" }],
    };

    mockDb.tables.stores.push(
      {
        id: STORE_A,
        name: "Agência Waesy Alpha",
        slug: "alpha",
        plan_tier: "enterprise",
        settings: { whatsapp_max_instances: 5 },
      },
      {
        id: STORE_B,
        name: "Loja Beta",
        slug: "beta",
        plan_tier: "enterprise",
        settings: { whatsapp_max_instances: 5 },
      },
    );

    mockDb.tables.profiles.push(
      { id: USER_OWNER_A, full_name: "Ana Gestora", avatar_url: null, phone: "+5549999000001" },
      { id: USER_AGENT_A, full_name: "Lucas Consultor", avatar_url: null, phone: "+5549999000002" },
      { id: USER_OWNER_B, full_name: "Carlos Beta", avatar_url: null, phone: "+5549999000003" },
    );

    mockDb.authUsers.push(
      { id: USER_OWNER_A, email: "ana@alpha.com" },
      { id: USER_AGENT_A, email: "lucas@alpha.com" },
    );

    mockDb.tables.whatsapp_channel_instances.push(
      {
        id: INST_1,
        store_id: STORE_A,
        display_name: "WhatsApp Comercial",
        provider: "evolution_api",
        connection_mode: "unofficial",
        instance_key: "comercial",
        external_instance_id: "waesy_11111111_comercial",
        status: "connected",
        is_active: true,
        is_default: true,
        display_phone_number: "+5549991111111",
        public_config: { department: "vendas" },
        capabilities: {},
        health_status: {},
        created_at: "2026-10-01T10:00:00Z",
        updated_at: "2026-10-01T10:00:00Z",
      },
      {
        id: INST_2,
        store_id: STORE_A,
        display_name: "WhatsApp Suporte",
        provider: "evolution_api",
        connection_mode: "unofficial",
        instance_key: "suporte",
        external_instance_id: "waesy_11111111_suporte",
        status: "connected",
        is_active: true,
        is_default: false,
        display_phone_number: "+5549992222222",
        public_config: { department: "suporte" },
        capabilities: {},
        health_status: {},
        created_at: "2026-10-02T10:00:00Z",
        updated_at: "2026-10-02T10:00:00Z",
      },
      {
        id: INST_B,
        store_id: STORE_B,
        display_name: "Beta Principal",
        provider: "evolution_api",
        connection_mode: "unofficial",
        instance_key: "principal",
        external_instance_id: "waesy_22222222_principal",
        status: "connected",
        is_active: true,
        is_default: true,
        display_phone_number: "+5549993333333",
        public_config: {},
        capabilities: {},
        health_status: {},
        created_at: "2026-10-01T10:00:00Z",
        updated_at: "2026-10-01T10:00:00Z",
      },
    );

    mockDb.tables.chat_departments.push(
      {
        id: DEPT_SALES_A,
        store_id: STORE_A,
        name: "Vendas Corporativas",
        slug: "vendas",
        color: "blue",
        routing_mode: "ai_sdr_first",
        sla_minutes: 10,
        whatsapp_instance_id: INST_1,
        assigned_agent_ids: [USER_AGENT_A],
        created_at: "2026-10-01T10:00:00Z",
      },
      {
        id: DEPT_SUPPORT_B,
        store_id: STORE_B,
        name: "Suporte Beta",
        slug: "suporte_beta",
        color: "emerald",
        routing_mode: "round_robin",
        sla_minutes: 15,
        whatsapp_instance_id: INST_B,
        assigned_agent_ids: [],
        created_at: "2026-10-01T10:00:00Z",
      },
    );

    mockDb.tables.workspace_members.push(
      {
        profile_id: USER_OWNER_A,
        store_id: STORE_A,
        role: "owner",
        department_id: DEPT_SALES_A,
        default_department_slug: "vendas",
        whatsapp_instance_id: INST_1,
        is_attendance_agent: true,
        attendance_presence: "online",
        max_concurrent_chats: 12,
        can_transfer_chats: true,
        can_close_chats: true,
        can_manage_whatsapp_qr: true,
        only_assigned_or_sector: false,
        contract_type: "partner_law",
        commission_percent: 60,
        fee_bearer: "proportional",
        can_view_unmasked_contacts: true,
        auto_deduct_supplies: true,
      },
      {
        profile_id: USER_AGENT_A,
        store_id: STORE_A,
        role: "seller",
        department_id: DEPT_SALES_A,
        default_department_slug: "vendas",
        whatsapp_instance_id: INST_2,
        is_attendance_agent: true,
        attendance_presence: "online",
        max_concurrent_chats: 8,
        can_transfer_chats: true,
        can_close_chats: true,
        can_manage_whatsapp_qr: false,
        only_assigned_or_sector: true,
        contract_type: "clt",
        commission_percent: 10,
        fee_bearer: "store_100",
        can_view_unmasked_contacts: false,
        auto_deduct_supplies: true,
      },
      {
        profile_id: USER_OWNER_B,
        store_id: STORE_B,
        role: "owner",
        is_attendance_agent: true,
        attendance_presence: "online",
        max_concurrent_chats: 10,
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("Parte 2 & 3 — Multi-Números WhatsApp, Colisões & Exclusão Real", () => {
    it("cria um segundo/terceiro número com mode='create' sem sobrescrever canais existentes e respeita cota do plano", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () =>
          new Response(
            JSON.stringify({ qrcode: { base64: "iVBORw0KGgo=", pairingCode: "1234-5678" } }),
            { status: 200 },
          ),
        ),
      );

      const created = await _connectWhatsAppQrCodeInstance({
        mode: "create",
        displayName: "WhatsApp Plantão",
        instanceKey: "canal_3",
        department: "plantao",
        isGlobalMaster: false,
        autoImportHistory: false,
      });

      expect(created.instance.instance_key).toBe("canal_3");
      expect(created.instance.id).not.toBe(INST_1);
      expect(created.instance.id).not.toBe(INST_2);
      expect(created.qrCodeBase64).toContain("data:image/png;base64,");
      expect(mockDb.tables.whatsapp_channel_instances.filter((i) => i.store_id === STORE_A)).toHaveLength(3);

      // Negativo: chave colidente em mode='create' rejeita explicitamente em vez de fazer upsert cego no canal 1
      await expect(
        _connectWhatsAppQrCodeInstance({
          mode: "create",
          displayName: "Duplicado",
          instanceKey: "comercial",
          isGlobalMaster: false,
          autoImportHistory: false,
        }),
      ).rejects.toThrow(/comercial/);

      // Negativo: cota de instâncias excedida bloqueia criação
      mockDb.tables.stores[0].plan_tier = "free";
      mockDb.tables.stores[0].settings = { whatsapp_max_instances: 2 };
      await expect(
        _connectWhatsAppQrCodeInstance({
          mode: "create",
          displayName: "Quarto Canal",
          instanceKey: "canal_4",
          isGlobalMaster: false,
          autoImportHistory: false,
        }),
      ).rejects.toThrow();
    });

    it("bloqueia número duplicado na mesma loja via sync status e webhook (DUPLICATE_PHONE_CONFLICT)", async () => {
      mockDb.tables.whatsapp_channel_instances.push({
        id: INST_3,
        store_id: STORE_A,
        display_name: "Canal Repetido",
        provider: "evolution_api",
        connection_mode: "unofficial",
        instance_key: "canal_3",
        external_instance_id: "waesy_11111111_canal_3",
        status: "pending",
        is_active: true,
        is_default: false,
        display_phone_number: null,
        public_config: {},
      });

      const fetchMock = vi.fn(async (url: string) => {
        if (url.includes("/connectionState/")) {
          return new Response(JSON.stringify({ instance: { state: "open" } }), { status: 200 });
        }
        if (url.includes("/fetchInstances")) {
          return new Response(JSON.stringify([{ ownerJid: "5549991111111@s.whatsapp.net" }]), {
            status: 200,
          });
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      });
      vi.stubGlobal("fetch", fetchMock);

      const syncResult = await _syncWhatsAppInstanceStatus({ id: INST_3 });
      expect(syncResult.state).toBe("error");
      expect(syncResult.instance.last_error_code).toBe("DUPLICATE_PHONE_CONFLICT");
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/instance/logout/"),
        expect.objectContaining({ method: "DELETE" }),
      );

      // Também valida webhook `connection.update` -> `revoked` (HTTP 401 statusReason)
      const revokeReq = new Request("https://waesy.test/api/webhooks/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: "test-evo-key" },
        body: JSON.stringify({
          event: "connection.update",
          data: { state: "close", statusReason: 401 },
        }),
      });
      const revokeRes = await handleUnofficialWhatsAppWebhook(revokeReq, "evolution_api", "suporte");
      const revokeJson = await revokeRes.json();
      expect(revokeJson.status).toBe("revoked");
      expect(mockDb.tables.whatsapp_channel_instances.find((i) => i.id === INST_2)?.status).toBe("revoked");
    });

    it("exclui canal definitivamente (logout+delete Evolution, desvincula referências, promove novo default e tolera gateway offline) e isola tenants", async () => {
      mockDb.tables.chat_threads.push({
        id: THREAD_1,
        store_id: STORE_A,
        channel_instance_id: INST_1,
        context_type: "whatsapp",
      });
      mockDb.tables.whatsapp_outbox.push({
        id: "50000000-0000-4000-8000-000000000001",
        store_id: STORE_A,
        channel_instance_id: INST_1,
      });

      const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
      vi.stubGlobal("fetch", fetchMock);

      const deleted = await _deleteWhatsAppInstance({ id: INST_1 }, "workspace");
      expect(deleted.deletedId).toBe(INST_1);
      expect(deleted.promotedDefaultInstanceId).toBe(INST_2);
      expect(deleted.gatewayCleanupOk).toBe(true);
      expect(mockDb.tables.whatsapp_channel_instances.some((i) => i.id === INST_1)).toBe(false);
      expect(mockDb.tables.whatsapp_channel_instances.find((i) => i.id === INST_2)?.is_default).toBe(true);
      expect(mockDb.tables.workspace_members.find((m) => m.profile_id === USER_OWNER_A)?.whatsapp_instance_id).toBeNull();
      expect(mockDb.tables.chat_threads.find((t) => t.id === THREAD_1)?.channel_instance_id).toBeNull();
      expect(mockDb.tables.whatsapp_outbox[0].channel_instance_id).toBeNull();
      expect(mockDb.tables.chat_departments.find((d) => d.id === DEPT_SALES_A)?.whatsapp_instance_id).toBeNull();
      expect(mockDb.tables.whatsapp_channel_audit_events.some((a) => a.action === "instance.deleted")).toBe(true);

      // Tolerância quando gateway Evolution está inacessível na exclusão
      vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("ECONNREFUSED"); }));
      const deletedOffline = await _deleteWhatsAppInstance({ id: INST_2 }, "workspace");
      expect(deletedOffline.gatewayCleanupOk).toBe(false);
      expect(deletedOffline.gatewayCleanupError).toContain("ECONNREFUSED");
      expect(mockDb.tables.whatsapp_channel_instances.some((i) => i.id === INST_2)).toBe(false);

      // Negativo: usuário da Loja B não pode excluir nem renomear canal da Loja A (escopo master exige role platform_admin)
      mockIdentity = {
        id: USER_OWNER_B,
        role: "owner",
        store_id: STORE_B,
        memberships: [{ store_id: STORE_B, role: "owner" }],
      };
      await expect(_deleteWhatsAppInstance({ id: INST_B, storeId: STORE_A }, "workspace")).rejects.toThrow();
      await expect(_deleteWhatsAppInstance({ id: INST_B }, "master")).rejects.toThrow();

      // Master pode gerenciar qualquer loja quando autenticado como platform_admin
      mockIdentity = { id: USER_MASTER, role: "platform_admin", store_id: STORE_A, memberships: [] };
      vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 200 })));
      const masterDeleted = await _deleteWhatsAppInstance({ id: INST_B }, "master");
      expect(masterDeleted.deletedId).toBe(INST_B);
    });

    it("atualiza metadados de canal existente sem chamar Evolution API", async () => {
      const updated = await _updateWorkspaceWhatsAppInstanceMetadata({
        id: INST_2,
        displayName: "Suporte VIP",
        department: "suporte",
        isDefault: true,
      });
      expect(updated.display_name).toBe("Suporte VIP");
      expect(updated.is_default).toBe(true);
      expect(mockDb.tables.whatsapp_channel_instances.find((i) => i.id === INST_1)?.is_default).toBe(false);
    });
  });

  describe("Parte 4 — Vínculo Real no Perfil/Cadastro da Equipe, Presença & Roteamento", () => {
    it("convida e edita colaborador com setor, WhatsApp padrão, permissões e contrato RH, bloqueando vínculo cross-tenant", async () => {
      const invited = await _inviteTeamMember({
        email: "novo.agente@alpha.com",
        fullName: "Mariana Tur",
        phone: "49988887777",
        role: "seller",
        departmentId: DEPT_SALES_A,
        whatsappInstanceId: INST_1,
        isAttendanceAgent: true,
        attendancePresence: "online",
        maxConcurrentChats: 15,
        canTransferChats: true,
        canCloseChats: false,
        canManageWhatsappQr: true,
        onlyAssignedOrSector: true,
        contractType: "pj",
        commissionPercent: 45,
        feeBearer: "split_50",
        canViewUnmaskedContacts: true,
        autoDeductSupplies: false,
      });

      expect(invited.status).toBe("success");
      const members = await _listTeamMembers();
      const mariana = members.find((m) => m.id === invited.profileId)!;
      expect(mariana.email).toBe("novo.agente@alpha.com");
      expect(mariana.phone).toBe("49988887777");
      expect(mariana.department_id).toBe(DEPT_SALES_A);
      expect(mariana.whatsapp_instance_id).toBe(INST_1);
      expect(mariana.max_concurrent_chats).toBe(15);
      expect(mariana.can_close_chats).toBe(false);
      expect(mariana.can_manage_whatsapp_qr).toBe(true);
      expect(mariana.contract_type).toBe("pj");
      expect(mariana.commission_percent).toBe(45);

      const syncedDept = mockDb.tables.chat_departments.find((d) => d.id === DEPT_SALES_A);
      expect(syncedDept.assigned_agent_ids).toContain(invited.profileId);

      // Edição completa + alternância de presença
      await _updateTeamMemberProfile({
        profileId: invited.profileId,
        whatsappInstanceId: INST_2,
        attendancePresence: "busy",
        maxConcurrentChats: 20,
      });
      const updatedList = await _listTeamMembers();
      expect(updatedList.find((m) => m.id === invited.profileId)?.whatsapp_instance_id).toBe(INST_2);

      const presenceRes = await _toggleAgentPresence({ presence: "away" });
      expect(presenceRes.attendance_presence).toBe("away");

      // Negativo: rejeita vinculação de setor/instância de outra loja (Loja B)
      await expect(
        _updateTeamMemberProfile({
          profileId: invited.profileId,
          departmentId: DEPT_SUPPORT_B,
        }),
      ).rejects.toThrow(/Setor informado/i);

      await expect(
        _updateTeamMemberProfile({
          profileId: invited.profileId,
          whatsappInstanceId: INST_B,
        }),
      ).rejects.toThrow(/Canal WhatsApp/i);
    });

    it("aplica cadeia de fallback de saída WhatsApp (thread -> atendente -> setor -> default loja) e isola notas internas", async () => {
      // 1) Usa instância da thread
      expect(
        await resolveOutboundWhatsAppInstanceForThread(mockDb, {
          storeId: STORE_A,
          threadChannelInstanceId: INST_1,
          agentProfileId: USER_AGENT_A,
          departmentSlug: "vendas",
        }),
      ).toMatchObject({ channelInstanceId: INST_1, source: "thread" });

      // 2) Fallback para instância do atendente (INST_2) quando thread não tem instância
      expect(
        await resolveOutboundWhatsAppInstanceForThread(mockDb, {
          storeId: STORE_A,
          threadChannelInstanceId: null,
          agentProfileId: USER_AGENT_A,
          departmentSlug: "vendas",
        }),
      ).toMatchObject({ channelInstanceId: INST_2, source: "agent" });

      // 3) Fallback para instância do setor (INST_1) quando atendente não tem instância
      mockDb.tables.workspace_members.find((m) => m.profile_id === USER_AGENT_A)!.whatsapp_instance_id = null;
      expect(
        await resolveOutboundWhatsAppInstanceForThread(mockDb, {
          storeId: STORE_A,
          threadChannelInstanceId: null,
          agentProfileId: USER_AGENT_A,
          departmentSlug: "vendas",
        }),
      ).toMatchObject({ channelInstanceId: INST_1, source: "department" });

      // 4) _sendChatMessage grava mensagem, atualiza first_response_at/channel_instance_id e não envia nota interna para outbox
      mockDb.tables.chat_threads.push({
        id: THREAD_2,
        store_id: STORE_A,
        context_type: "whatsapp",
        entity_id: "5549990001122",
        department: "vendas",
        channel_instance_id: null,
        first_response_at: null,
        metadata: {},
      });

      await _sendChatMessage({
        threadId: THREAD_2,
        message: "Nota privada entre equipe",
        message_type: "internal_note" as any,
        attachments: [],
        payload: { is_internal: true },
        is_internal: true,
      });
      expect(mockDb.tables.chat_messages).toHaveLength(1);
      expect(mockDb.tables.whatsapp_outbox).toHaveLength(0);

      await _sendChatMessage({
        threadId: THREAD_2,
        message: "Olá! Seguimos com sua cotação.",
        message_type: "text",
        attachments: [],
        is_internal: false,
      });
      expect(mockDb.tables.whatsapp_outbox).toHaveLength(1);
      expect(mockDb.tables.whatsapp_outbox[0].channel_instance_id).toBe(INST_1);
      expect(mockDb.tables.chat_threads[0].first_response_at).toBeTruthy();
    });
  });

  describe("Parte 5 — Submódulo Filas/Setores & BI de Atendimento (Dados Reais + Sem Falsos Positivos)", () => {
    it("gerencia CRUD 1:1 de chat_departments e calcula BI real com csatAvg=null quando 0 avaliações", async () => {
      const createdDept = await _upsertChatDepartment({
        name: "Pós-Venda VIP",
        slug: "pos_venda_vip",
        color: "blue",
        routingMode: "round_robin",
        slaMinutes: 20,
        whatsappInstanceId: INST_2,
        assignedAgentIds: [USER_AGENT_A],
        aiTriageEnabled: true,
        aiTriageStages: [
          { id: "step-1", title: "Identificação", instruction: "Coletar número do pedido", handoffToHuman: false },
        ],
      });
      expect(createdDept.slug).toBe("pos-venda-vip");
      expect(mockDb.tables.chat_departments.some((d) => d.id === createdDept.id)).toBe(true);

      const now = new Date("2026-11-12T15:00:00Z");
      mockDb.tables.chat_threads.push(
        {
          id: THREAD_1,
          store_id: STORE_A,
          status: "open",
          assigned_to_profile_id: USER_AGENT_A,
          department: "vendas",
          channel_instance_id: INST_1,
          created_at: "2026-11-12T12:00:00Z",
          first_response_at: "2026-11-12T12:05:00Z",
          closed_at: null,
          satisfaction_rating: null,
        },
        {
          id: THREAD_2,
          store_id: STORE_A,
          status: "resolved",
          assigned_to_profile_id: USER_AGENT_A,
          department: "vendas",
          channel_instance_id: INST_1,
          created_at: "2026-11-11T10:00:00Z",
          first_response_at: "2026-11-11T10:02:00Z",
          closed_at: "2026-11-11T10:30:00Z",
          satisfaction_rating: null,
        },
        {
          id: THREAD_3,
          store_id: STORE_A,
          status: "open",
          assigned_to_profile_id: null,
          department: "pos-venda-vip",
          channel_instance_id: INST_2,
          created_at: "2026-11-12T14:00:00Z",
          first_response_at: null,
          closed_at: null,
          satisfaction_rating: null,
        },
      );
      mockDb.tables.chat_messages.push(
        { id: "m1", thread_id: THREAD_1, is_staff_reply: false, created_at: "2026-11-12T12:01:00Z" },
        { id: "m2", thread_id: THREAD_1, is_staff_reply: true, created_at: "2026-11-12T12:05:00Z" },
      );

      const bi = await _getAttendanceBusinessIntelligence(
        { storeId: STORE_A, rangeDays: 7 },
        { now: () => now },
      );

      expect(bi.summary.totalThreadsInPeriod).toBe(3);
      expect(bi.summary.openThreads).toBe(2);
      expect(bi.summary.closedInPeriod).toBe(1);
      expect(bi.summary.unassignedThreads).toBe(1);
      expect(bi.summary.csatAvg).toBeNull();
      expect(bi.summary.csatCount).toBe(0);
      expect(bi.summary.avgFirstResponseSeconds).toBe(210);
      expect(bi.summary.firstContactResolutionRate).toBe(100);
      expect(bi.agents.find((a) => a.profileId === USER_AGENT_A)?.fullName).toBe("Lucas Consultor");

      const filteredBi = await _getAttendanceBusinessIntelligence(
        { storeId: STORE_A, rangeDays: 7, channelInstanceId: INST_2 },
        { now: () => now },
      );
      expect(filteredBi.summary.totalThreadsInPeriod).toBe(1);

      await _deleteChatDepartment({ id: createdDept.id, storeId: STORE_A });
      expect(mockDb.tables.chat_departments.some((d) => d.id === createdDept.id)).toBe(false);
    });

    it("estrutura pilar de Atendimento no workspace-navigation separando BI Overview, Chat Full-Page e subrotas dedicadas", () => {
      const pillars = getMasterSidebarPillars(
        resolveWorkspaceNavigation({ niche: "tourism" }, { isMasterMode: true }),
      );
      const attendancePillar = pillars.find((p) => p.id === "atendimento");
      expect(attendancePillar).toBeDefined();
      const paths = attendancePillar!.items.map((i) => i.path);
      expect(paths).toEqual(
        expect.arrayContaining([
          "/workspace/atendimento",
          "/workspace/atendimento/chat",
          "/workspace/atendimento/whatsapp",
          "/workspace/atendimento/filas",
          "/workspace/atendimento/atendentes",
          "/workspace/atendimento/horarios",
        ]),
      );
    });
  });
});
