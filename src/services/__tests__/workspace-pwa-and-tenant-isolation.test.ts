import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const chain: any = {
      validator: () => chain,
      handler: (fn: any) => fn,
    };
    return chain;
  },
}));

const { insertedSwipes, mockDb } = vi.hoisted(() => {
  const swipes: any[] = [];
  const makeChain = (table: string) => {
    const chain: any = {
      select: () => chain,
      eq: () => chain,
      single: async () => {
        if (table === "match_cards") {
          return {
            data: {
              id: "11111111-1111-4111-8111-111111111111",
              card_kind: "vibe",
              trade_off_axis: "budget",
              axis_weights: { budget: 1 },
              linked_entity_id: null,
            },
            error: null,
          };
        }
        if (table === "match_visitor_brains") {
          return {
            data: {
              id: "brain-1",
              swipes_count: 1,
              likes_count: 1,
              passes_count: 0,
              axis_scores: { budget: 1 },
              top_matched_offer_ids: [],
              customer_id: null,
            },
            error: null,
          };
        }
        return { data: null, error: null };
      },
      maybeSingle: async () => ({
        data:
          table === "match_visitor_brains"
            ? {
                id: "brain-1",
                swipes_count: 0,
                likes_count: 0,
                passes_count: 0,
                axis_scores: {},
                top_matched_offer_ids: [],
                customer_id: null,
              }
            : null,
        error: null,
      }),
      update: () => chain,
      insert: (payload: any) => {
        if (table === "match_time_swipes") {
          swipes.push(payload);
        }
        return chain;
      },
      then: (resolve: any) => resolve({ data: null, error: null }),
    };
    return chain;
  };
  return {
    insertedSwipes: swipes,
    mockDb: { from: (t: string) => makeChain(t) },
  };
});

vi.mock("@/lib/supabase", () => ({
  getServerClient: () => mockDb,
}));

vi.mock("@/lib/logger", () => ({
  throwIfQueryFailed: (err: any, msg: string) => {
    if (err) throw new Error(msg);
  },
}));

describe("Workspace, PWA & Multi-Tenant Isolation E2E Regression", () => {
  it("isolates Workspace PWA manifest scope (/workspace on shared host, / on dedicated painel subdomain)", async () => {
    const manifestSrc = fs.readFileSync(
      path.resolve("src/routes/api.pwa.manifest[.]json.ts"),
      "utf8",
    );
    expect(manifestSrc).toContain('const workspaceScope = isWorkspaceSubdomain ? "/" : "/workspace";');
    expect(manifestSrc).toContain("scope: workspaceScope");
    expect(manifestSrc).not.toMatch(/workspaceGenericManifest[\s\S]*?scope:\s*"\/"/);

    const rootSrc = fs.readFileSync(path.resolve("src/routes/__root.tsx"), "utf8");
    expect(rootSrc).toContain("isWorkspaceOrPainelRoute");
    expect(rootSrc).not.toMatch(/const workspaceStoreId =[^;]*store\?\.id/);
  });

  it("purges all civil (/conta), Marketplace, and multi-company list leaks from Workspace & Branded Apps", () => {
    const shell = fs.readFileSync(
      path.resolve("src/components/workspace/workspace-shell.tsx"),
      "utf8",
    );
    const switcher = fs.readFileSync(
      path.resolve("src/components/workspace/workspace-account-switcher.tsx"),
      "utf8",
    );
    const allTools = fs.readFileSync(
      path.resolve("src/components/workspace/workspace-all-tools-dialog.tsx"),
      "utf8",
    );
    const workspaceRoute = fs.readFileSync(path.resolve("src/routes/workspace.tsx"), "utf8");
    const painelRoute = fs.readFileSync(path.resolve("src/routes/painel.tsx"), "utf8");
    const appSlugRoute = fs.readFileSync(path.resolve("src/routes/app.$slug.tsx"), "utf8");
    const captacaoRoute = fs.readFileSync(
      path.resolve("src/routes/workspace.captacao.index.tsx"),
      "utf8",
    );
    const doacoesRoute = fs.readFileSync(
      path.resolve("src/routes/workspace.doacoes.index.tsx"),
      "utf8",
    );
    const lojasRoute = fs.readFileSync(
      path.resolve("src/routes/workspace.lojas.index.tsx"),
      "utf8",
    );

    expect(shell).not.toMatch(/["']\/conta(?:\/|["'])/);
    expect(shell).not.toContain("/perfil-da-loja");
    expect(shell).not.toContain("/workspace/lojas");
    expect(shell).not.toContain("showPersonalSwitchModal");
    expect(shell).not.toContain("WaesyHubLauncher");
    expect(shell).toContain('to="/app/$slug"');
    expect(shell).toContain('to="/auth/portal-selector"');

    expect(switcher).not.toMatch(/["']\/conta(?:\/|["'])/);
    expect(switcher).not.toContain("/workspace/lojas");
    expect(switcher).not.toContain("Unidades Autorizadas");
    expect(switcher).not.toContain("filteredStores");

    expect(allTools).not.toContain("/conta/curriculo");
    expect(allTools).not.toContain("/workspace/lojas");
    expect(allTools).toContain("/workspace/match-time");

    expect(workspaceRoute).not.toContain("/criar-negocio");
    expect(workspaceRoute).not.toContain('<Link to="/"');
    expect(workspaceRoute).toContain('to: "/onboarding/empresa"');
    expect(workspaceRoute).toContain('to="/auth/portal-selector"');

    expect(painelRoute).not.toContain("/criar-negocio");
    expect(painelRoute).toContain("/onboarding/empresa");

    expect(appSlugRoute).not.toContain('<Link to="/">');
    expect(appSlugRoute).not.toContain('to="/loja/$slug"');

    expect(captacaoRoute).not.toContain("/conta/classificados/novo");
    expect(captacaoRoute).not.toContain('to="/classificados/$id"');
    expect(captacaoRoute).toContain("WorkspaceClassifiedEditorDialog");

    expect(doacoesRoute).not.toContain("/conta/classificados/novo");
    expect(doacoesRoute).not.toContain('to="/classificados/$id"');
    expect(doacoesRoute).toContain("WorkspaceClassifiedEditorDialog");

    expect(lojasRoute).toContain('throw redirect({ to: "/auth/portal-selector" });');
  });

  it("persists anonymous OmniMatch swipes in match_time_swipes with nullable migration contract", async () => {
    const migrationSql = fs.readFileSync(
      path.resolve("supabase/migrations/20270610000000_omnimatch_anonymous_swipes.sql"),
      "utf8",
    );
    expect(migrationSql).toContain("ALTER COLUMN session_id DROP NOT NULL");
    expect(migrationSql).toContain("ALTER COLUMN customer_id DROP NOT NULL");
    expect(migrationSql).toContain("ALTER COLUMN product_id DROP NOT NULL");

    const { recordMatchSwipeAndAnalyzeFn } = await import("../match-engine.functions");
    const res = await recordMatchSwipeAndAnalyzeFn({
      data: {
        storeId: "22222222-2222-4222-8222-222222222222",
        visitorSessionId: "visitor-anon-99",
        cardId: "11111111-1111-4111-8111-111111111111",
        action: "like",
        dwellTimeMs: 1450,
      },
    });

    expect(res.success).toBe(true);
    expect(insertedSwipes).toHaveLength(1);
    expect(insertedSwipes[0]).toMatchObject({
      store_id: "22222222-2222-4222-8222-222222222222",
      visitor_session_id: "visitor-anon-99",
      match_card_id: "11111111-1111-4111-8111-111111111111",
      action: "like",
      hesitation_ms: 1450,
      product_id: null,
    });
  });
});
