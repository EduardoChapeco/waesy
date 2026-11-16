import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGetServerClient,
  mockGetServerIdentity,
  mockAuthorizeBuilderStoreContext,
  mockGetActiveSecretForProvider,
  mockGetBatchActiveKeysForProviders,
  mockMarkKeyError,
  mockRecordKeyUsage,
  mockScrapeUrl,
  mockRunCopilotReactOrchestrator,
  dbHandlers,
  resetDbState,
} = vi.hoisted(() => {
  const handlers: Record<string, (op: string, payload?: any) => any> = {};

  const createBuilder = (table: string) => {
    let op = "select";
    let payload: any = null;
    const exec = async () => {
      const fn = handlers[table];
      if (!fn) return { data: op === "select" ? [] : null, error: null };
      const res = await fn(op, payload);
      return res ?? { data: null, error: null };
    };
    const builder: any = {
      select: () => builder,
      insert: (data: any) => {
        op = "insert";
        payload = data;
        return builder;
      },
      update: (data: any) => {
        op = "update";
        payload = data;
        return builder;
      },
      upsert: (data: any) => {
        op = "upsert";
        payload = data;
        return builder;
      },
      delete: () => {
        op = "delete";
        return builder;
      },
      eq: () => builder,
      in: () => builder,
      is: () => builder,
      or: () => builder,
      contains: () => builder,
      order: () => builder,
      limit: () => builder,
      single: () => exec(),
      maybeSingle: () =>
        exec().then((r: any) =>
          Array.isArray(r?.data) ? { data: r.data[0] ?? null, error: r.error ?? null } : r,
        ),
      then: (onFulfilled: any, onRejected: any) => exec().then(onFulfilled, onRejected),
    };
    return builder;
  };

  const dbMock = {
    from: (table: string) => createBuilder(table),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  };

  return {
    mockGetServerClient: vi.fn(() => dbMock),
    mockGetServerIdentity: vi.fn(),
    mockAuthorizeBuilderStoreContext: vi.fn(),
    mockGetActiveSecretForProvider: vi.fn(),
    mockGetBatchActiveKeysForProviders: vi.fn(),
    mockMarkKeyError: vi.fn().mockResolvedValue(undefined),
    mockRecordKeyUsage: vi.fn().mockResolvedValue(undefined),
    mockScrapeUrl: vi.fn().mockResolvedValue({ success: false, error: "skip" }),
    mockRunCopilotReactOrchestrator: vi.fn(),
    dbHandlers: handlers,
    resetDbState: () => {
      for (const k of Object.keys(handlers)) delete handlers[k];
    },
  };
});

vi.mock("@/lib/supabase", () => ({
  getServerClient: mockGetServerClient,
}));

vi.mock("@/lib/server-access", () => ({
  getServerIdentity: mockGetServerIdentity,
  authorizeBuilderStoreContext: mockAuthorizeBuilderStoreContext,
  STAFF_ROLES: ["owner", "admin", "manager", "staff"],
  assertStoreAccess: vi.fn(),
}));

vi.mock("@/services/secret-vault.functions", () => ({
  getActiveSecretForProvider: mockGetActiveSecretForProvider,
}));

vi.mock("@/services/api-orchestrator.functions", () => ({
  getBatchActiveKeysForProviders: mockGetBatchActiveKeysForProviders,
  markKeyError: mockMarkKeyError,
  recordKeyUsage: mockRecordKeyUsage,
  isProviderCircuitOpen: vi.fn().mockResolvedValue(false),
  executeUnifiedAiCall: vi.fn(),
}));

vi.mock("@/services/market-radar.functions", () => ({
  scrapeUrl: mockScrapeUrl,
  captureAndAnalyzeCompetitorLogic: vi.fn(),
}));

vi.mock("@/services/copilot-react-orchestrator", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/copilot-react-orchestrator")>();
  return {
    ...actual,
    runCopilotReactOrchestrator: mockRunCopilotReactOrchestrator,
  };
});

import { handleAiTranscribe } from "@/routes/api.ai.transcribe";
import {
  buildProviderStreamRequest,
  executeAiCoreGatewayStream,
  resolveCandidatesWithModelPreference,
} from "./ai-core-gateway.functions";
import { executeBrowserAutomationTask } from "./browser-automation-runner";
import { buildRankedToolCatalogPrompt } from "./copilot-react-orchestrator";
import { getMcpToolByName } from "@/registries/mcp-tool-registry";
import { hasValidWorkerToken } from "@/lib/ai/worker-auth";
import { computeNextRunFromCron } from "./ai-scheduled-tasks.functions";
import { handleCronScheduledTasks } from "@/routes/api.cron.ai-scheduled-tasks";
import {
  decryptSecretPayload,
  encryptSecretPayload,
} from "./ai-connectors-secrets.server";
import {
  runDeployFilesToGitHubForUser,
  runDeployFilesToVercelForUser,
  runPublishCopilotWebPage,
} from "./copilot-deploy.functions";

const originalFetch = globalThis.fetch;
const originalWorkerToken = process.env.WAESY_AI_WORKER_TOKEN;
const originalSecretKey = process.env.SECRET_ENCRYPTION_KEY;

afterAll(() => {
  globalThis.fetch = originalFetch;
  process.env.WAESY_AI_WORKER_TOKEN = originalWorkerToken;
  process.env.SECRET_ENCRYPTION_KEY = originalSecretKey;
});

beforeEach(() => {
  resetDbState();
  vi.clearAllMocks();
  globalThis.fetch = originalFetch;
  process.env.WAESY_AI_WORKER_TOKEN = "waesy_test_cron_token_secure_123456";
  process.env.SECRET_ENCRYPTION_KEY = "test_secret_encryption_key_min_32_bytes_waesy";
  mockGetBatchActiveKeysForProviders.mockResolvedValue({});
  mockGetActiveSecretForProvider.mockResolvedValue(null);
});

describe("P0 — Whisper Transcription Vault & Pool Rotation", () => {
  it("uses string secret returned directly from getActiveSecretForProvider", async () => {
    mockGetServerIdentity.mockResolvedValue({ id: "user-1", store_id: "store-1" });
    mockGetActiveSecretForProvider.mockImplementation(async (provider: string) =>
      provider === "groq" ? "gsk_vault_secret_real_999" : null,
    );

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ text: "olá copilot waesy" }), { status: 200 }),
    );
    globalThis.fetch = fetchMock as any;

    const req = new Request("http://localhost/api/ai/transcribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audioBase64: Buffer.from("fake-webm-bytes").toString("base64"),
        mimeType: "audio/webm",
      }),
    });

    const res = await handleAiTranscribe(req);
    const body = (await res.json()) as Record<string, any>;

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.text).toBe("olá copilot waesy");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect((init?.headers as Record<string, string>)?.Authorization).toBe(
      "Bearer gsk_vault_secret_real_999",
    );
  });

  it("rotates pool keys and tracks error/usage when first Whisper key returns 429", async () => {
    mockGetServerIdentity.mockResolvedValue({ id: "user-1" });
    mockGetBatchActiveKeysForProviders.mockResolvedValue({
      groq: [
        { id: "key-groq-1", rawKey: "gsk_rate_limited" },
        { id: "key-groq-2", rawKey: "gsk_healthy_key" },
      ],
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("rate limit", { status: 429 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ text: "segunda chave funcionou" }), { status: 200 }),
      );
    globalThis.fetch = fetchMock as any;

    const req = new Request("http://localhost/api/ai/transcribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioBase64: Buffer.from("audio").toString("base64") }),
    });

    const res = await handleAiTranscribe(req);
    const body = (await res.json()) as Record<string, any>;

    expect(res.status).toBe(200);
    expect(body.text).toBe("segunda chave funcionou");
    expect(mockMarkKeyError).toHaveBeenCalledWith("key-groq-1", expect.stringContaining("429"), 429);
    expect(mockRecordKeyUsage).toHaveBeenCalledWith("key-groq-2");
  });

  it("rejects unauthenticated requests with 401", async () => {
    mockGetServerIdentity.mockResolvedValue({ id: "" });
    const req = new Request("http://localhost/api/ai/transcribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioBase64: Buffer.from("a").toString("base64") }),
    });
    const res = await handleAiTranscribe(req);
    expect(res.status).toBe(401);
  });
});

describe("P0 — AI Gateway ModelPreference, Multimodal Stream & Key Rotation", () => {
  it("prioritizes skill modelPreference across providers while guarding non-text tasks", () => {
    const preferred = resolveCandidatesWithModelPreference("chat", "claude-3-5-sonnet-20241022");
    expect(preferred[0]).toEqual({
      provider: "anthropic",
      model: "claude-3-5-sonnet-20241022",
    });

    const openRouterPref = resolveCandidatesWithModelPreference("chat", "deepseek/deepseek-r1:free");
    expect(openRouterPref[0]).toEqual({
      provider: "openrouter",
      model: "deepseek/deepseek-r1:free",
    });

    const embeddingGuard = resolveCandidatesWithModelPreference("embedding", "claude-3-5-sonnet-20241022");
    expect(embeddingGuard[0]?.provider).toBe("gemini");
  });

  it("builds multimodal stream payloads with inline images for Gemini, Anthropic and OpenAI-compatible", () => {
    const img = { mimeType: "image/png", base64: "iVBORw0KGgo=" };
    const turns = [{ role: "user" as const, content: "Analise esta imagem" }];

    const geminiReq = buildProviderStreamRequest({
      provider: "gemini",
      model: "gemini-2.5-flash",
      rawKey: "gm-1",
      turns,
      images: [img],
    });
    expect(geminiReq.body.contents[0].parts[0]).toEqual({
      inline_data: { mime_type: "image/png", data: "iVBORw0KGgo=" },
    });

    const claudeReq = buildProviderStreamRequest({
      provider: "anthropic",
      model: "claude-3-5-sonnet-20241022",
      rawKey: "ant-1",
      turns,
      images: [img],
    });
    expect(claudeReq.body.messages[0].content[0].type).toBe("image");

    const openAiReq = buildProviderStreamRequest({
      provider: "openrouter",
      model: "google/gemini-2.5-flash",
      rawKey: "or-1",
      turns,
      images: [img],
    });
    expect(openAiReq.body.messages[0].content[1].type).toBe("image_url");
  });

  it("rotates failed pool key during executeAiCoreGatewayStream and yields tokens from second key", async () => {
    mockGetBatchActiveKeysForProviders.mockResolvedValue({
      groq: [
        { id: "groq-pool-1", rawKey: "gsk_bad_1" },
        { id: "groq-pool-2", rawKey: "gsk_ok_2" },
      ],
    });

    const sseBody = 'data: {"choices":[{"delta":{"content":"Olá"}}]}\n\ndata: [DONE]\n\n';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("quota exhausted", { status: 429 }))
      .mockResolvedValueOnce(
        new Response(sseBody, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        }),
      );
    globalThis.fetch = fetchMock as any;

    const chunks: string[] = [];
    const streamRes = await executeAiCoreGatewayStream(
      {
        task: "chat",
        prompt: "Teste de rotação",
      },
      (delta) => chunks.push(delta),
    );

    expect(streamRes.success).toBe(true);
    expect(chunks.join("")).toBe("Olá");
    expect(mockMarkKeyError).toHaveBeenCalledWith(
      "groq-pool-1",
      expect.stringContaining("429"),
      429,
    );
    expect(mockRecordKeyUsage).toHaveBeenCalledWith("groq-pool-2");
  });
});

describe("P0 — Browser Automation Steel Pool & SSRF Guard", () => {
  it("uses Steel pool key from api_key_pools when vault key is absent", async () => {
    mockGetBatchActiveKeysForProviders.mockResolvedValue({
      steel: [{ id: "steel-pool-1", rawKey: "stl_live_987" }],
    });

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          title: "Página Exemplo",
          markdown: "Conteúdo capturado em tempo real.",
          links: ["https://exemplo.com/oferta"],
          screenshotUrl: "https://cdn.steel.dev/shot.png",
        }),
        { status: 200 },
      ),
    );
    globalThis.fetch = fetchMock as any;

    const res = await executeBrowserAutomationTask({
      url: "https://exemplo.com",
      userId: "user-1",
    });

    expect(res.status).toBe("completed");
    expect(res.driver).toBe("steel_cloud");
    expect(res.screenshotUrl).toBe("https://cdn.steel.dev/shot.png");
    expect(mockRecordKeyUsage).toHaveBeenCalledWith("steel-pool-1");
  });

  it("blocks internal SSRF targets strictly", async () => {
    const res = await executeBrowserAutomationTask({
      url: "http://127.0.0.1:8080/internal",
      userId: "user-1",
    });
    expect(res.status).toBe("failed");
    expect(res.stepsExecuted[0]?.action).toContain("ssrf_guard");
  });
});

describe("P0/P1 — Tool Ranking without 32-Tool Amputation & New MCP Registry Tools", () => {
  it("keeps external MCP tools and relevance-matched tools even when catalog > 50 tools", () => {
    const builtins = Array.from({ length: 60 }, (_, idx) => ({
      name: idx === 55 ? "connector_vercel_deploy" : `generic_tool_${idx}`,
      module: "catalog",
      description: idx === 55 ? "Deploy HTML project on Vercel" : "Generic catalog helper",
    }));

    const prompt = buildRankedToolCatalogPrompt(
      builtins,
      [
        {
          compositeToolName: "mcp_ext:crm_acme:sync_contact",
          serverId: "srv-1",
          serverSlug: "crm_acme",
          serverName: "CRM Acme",
          toolName: "sync_contact",
          description: "Sync lead on external CRM",
          inputSchema: {},
        },
      ],
      "Fazer deploy na Vercel e sincronizar CRM",
      [],
    );

    expect(prompt).toContain("connector_vercel_deploy");
    expect(prompt).toContain("mcp_ext:crm_acme:sync_contact");
  });

  it("exposes prospecting, squad and connector tools in canonical MCP registry and blocks anonymous calls", async () => {
    const prospecting = getMcpToolByName("copilot_autonomous_prospecting");
    const squad = getMcpToolByName("squad_orchestrator_run");
    const gh = getMcpToolByName("connector_github_ops");
    const vc = getMcpToolByName("connector_vercel_deploy");

    expect(prospecting).toBeDefined();
    expect(squad).toBeDefined();
    expect(gh).toBeDefined();
    expect(vc).toBeDefined();

    await expect(
      gh!.handler({ supabase: mockGetServerClient(), identity: { id: "", role: "guest" } }, { action: "list_repos" }),
    ).rejects.toThrow(/Autenticação obrigatória/i);
  });
});

describe("P1 — Cron Workers Zero-Trust Bearer Auth & Execution", () => {
  it("validates constant-time worker tokens and computes cron intervals", () => {
    expect(hasValidWorkerToken(new Request("http://localhost/api/cron/ai-jobs"))).toBe(false);
    expect(
      hasValidWorkerToken(
        new Request("http://localhost/api/cron/ai-jobs", {
          headers: { Authorization: "Bearer wrong_token" },
        }),
      ),
    ).toBe(false);
    expect(
      hasValidWorkerToken(
        new Request("http://localhost/api/cron/ai-jobs", {
          headers: { Authorization: "Bearer waesy_test_cron_token_secure_123456" },
        }),
      ),
    ).toBe(true);

    const base = new Date("2026-11-15T10:00:00.000Z");
    const next15 = computeNextRunFromCron("*/15 * * * *", base);
    expect(next15).toBe("2026-11-15T10:15:00.000Z");
  });

  it("rejects unauthorized cron requests with 401 and processes due tasks via ReAct when authorized", async () => {
    const unauthorized = await handleCronScheduledTasks(
      new Request("http://localhost/api/cron/ai-scheduled-tasks", { method: "POST" }),
    );
    expect(unauthorized.status).toBe(401);

    const updatedTasks: any[] = [];
    dbHandlers.ai_scheduled_tasks = (op, payload) => {
      if (op === "select") {
        return {
          data: [
            {
              id: "task-sched-1",
              user_id: "user-1",
              workspace_id: "store-1",
              title: "Resumo Diário",
              prompt: "Gerar resumo de vendas de hoje",
              cron_expression: "0 8 * * *",
              run_count: 2,
              is_active: true,
              input_payload: {},
            },
          ],
          error: null,
        };
      }
      updatedTasks.push(payload);
      return { data: null, error: null };
    };
    dbHandlers.ai_tasks = (op) =>
      op === "insert"
        ? { data: { id: "durable-task-1" }, error: null }
        : { data: null, error: null };
    dbHandlers.ai_threads = () => ({ data: { id: "thread-sched-1" }, error: null });
    dbHandlers.ai_messages = () => ({ data: { id: "msg-1" }, error: null });

    mockRunCopilotReactOrchestrator.mockResolvedValue({
      responseMessage: "Relatório executado com 12 vendas.",
      activitySteps: [],
      executionId: "exec-1",
      updatedMemory: {},
      fsmPhase: "COMPLETED",
    });

    const authorized = await handleCronScheduledTasks(
      new Request("http://localhost/api/cron/ai-scheduled-tasks", {
        method: "POST",
        headers: { "x-waesy-worker-token": "waesy_test_cron_token_secure_123456" },
      }),
    );
    const json = (await authorized.json()) as Record<string, any>;

    expect(authorized.status).toBe(200);
    expect(json.executedCount).toBe(1);
    expect(json.executed[0].status).toBe("completed");
    expect(mockRunCopilotReactOrchestrator).toHaveBeenCalledTimes(1);
    expect(updatedTasks[0]?.run_count).toBe(3);
    expect(updatedTasks[0]?.last_status).toBe("completed");
  });
});

describe("P2 — Connector Vault Encryption, Publish & Real GitHub/Vercel Deploy", () => {
  it("encrypts and decrypts connector secrets with AES-256-GCM and rejects tampering", () => {
    const encrypted = encryptSecretPayload({ apiToken: "ghp_secret_123", account: "dev@waesy.com" });
    expect(JSON.stringify(encrypted)).not.toContain("ghp_secret_123");
    const decrypted = decryptSecretPayload(encrypted);
    expect(decrypted.apiToken).toBe("ghp_secret_123");

    expect(() =>
      decryptSecretPayload({
        ...encrypted,
        tag: "0".repeat(32),
      }),
    ).toThrow();
  });

  it("publishes Copilot web pages into experience_documents + experience_versions and fails closed if unauthorized", async () => {
    mockAuthorizeBuilderStoreContext.mockRejectedValueOnce(
      new Error("Unauthorized: Autenticação obrigatória para operar o Builder e CMS."),
    );
    await expect(
      runPublishCopilotWebPage({
        title: "Landing Não Autorizada",
        html: "<!doctype html><html><body><h1>Teste</h1></body></html>",
        mode: "publish",
      }),
    ).rejects.toThrow(/Unauthorized/i);

    mockAuthorizeBuilderStoreContext.mockResolvedValue({
      actorId: "user-1",
      actorRole: "owner",
      storeId: "11111111-1111-4111-8111-111111111111",
      isPlatformAdmin: false,
      isPlatformRootStore: false,
    });

    let insertedDocPayload: any = null;
    dbHandlers.experience_documents = (op, payload) => {
      if (op === "select") return { data: null, error: null };
      if (op === "insert") {
        insertedDocPayload = payload;
        return { data: { id: "22222222-2222-4222-8222-222222222222" }, error: null };
      }
      return { data: null, error: null };
    };
    dbHandlers.experience_versions = (op) =>
      op === "select" ? { data: null, error: null } : { data: { id: "ver-1" }, error: null };

    const result = await runPublishCopilotWebPage({
      title: "Minha Vitrine Copilot",
      html: "<!doctype html><html><body><h1>Oferta Waesy</h1></body></html>",
      mode: "publish",
    });

    expect(result.success).toBe(true);
    expect(result.publicUrl).toBe("/paginas/minha-vitrine-copilot");
    expect(result.editorUrl).toBe("/workspace/builder/22222222-2222-4222-8222-222222222222/editor");
    expect(insertedDocPayload?.settings?.copilot_published_html).toContain("Oferta Waesy");
  });

  it("blocks GitHub/Vercel deploy without connected encrypted token and pushes cleanly when connected", async () => {
    dbHandlers.ai_connectors = () => ({ data: null, error: null });

    await expect(
      runDeployFilesToGitHubForUser("user-1", {
        repoName: "waesy-test",
        isPrivate: true,
        branch: "main",
        files: { "index.html": "<h1>Oi</h1>" },
      }),
    ).rejects.toThrow(/não conectado/i);

    await expect(
      runDeployFilesToVercelForUser("user-1", {
        projectName: "waesy-test",
        target: "production",
        files: { "index.html": "<h1>Oi</h1>" },
      }),
    ).rejects.toThrow(/não conectado/i);

    const ghEncrypted = encryptSecretPayload({ apiToken: "ghp_real_pat_777" });
    dbHandlers.ai_connectors = () => ({
      data: {
        id: "conn-1",
        provider: "github",
        status: "connected",
        scopes: ["repo"],
        account_identifier: "waesy-dev",
        encrypted_credentials: ghEncrypted,
      },
      error: null,
    });

    const ghFetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "https://api.github.com/user") {
        return new Response(JSON.stringify({ login: "waesy-dev" }), { status: 200 });
      }
      if (url === "https://api.github.com/repos/waesy-dev/meu-site" && (!init?.method || init.method === "GET")) {
        return new Response(JSON.stringify({ full_name: "waesy-dev/meu-site" }), { status: 200 });
      }
      if (url.includes("/contents/")) {
        if (!init?.method || init.method === "GET") {
          return new Response("not found", { status: 404 });
        }
        return new Response(JSON.stringify({ content: { path: "index.html" } }), { status: 201 });
      }
      return new Response("{}", { status: 200 });
    });
    globalThis.fetch = ghFetch as any;

    const ghRes = await runDeployFilesToGitHubForUser("user-1", {
      repoName: "meu-site",
      isPrivate: true,
      branch: "main",
      files: { "index.html": "<h1>Site Waesy</h1>" },
    });

    expect(ghRes.success).toBe(true);
    expect(ghRes.repoUrl).toBe("https://github.com/waesy-dev/meu-site");
    expect(ghRes.filesPushed).toEqual(["index.html"]);
  });
});
