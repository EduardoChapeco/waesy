import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

const STORE_ID = "550e8400-e29b-41d4-a716-446655440001";
const USER_ID = "550e8400-e29b-41d4-a716-446655440099";
const TARGET_ID = "550e8400-e29b-41d4-a716-446655440022";

const testState = vi.hoisted(() => ({
  identity: {
    id: "550e8400-e29b-41d4-a716-446655440099" as string | null,
    role: "admin",
    isPlatformAdmin: false,
    store_id: "550e8400-e29b-41d4-a716-446655440001" as string | null,
    memberships: [{ store_id: "550e8400-e29b-41d4-a716-446655440001", role: "admin" }],
  },
  storeRow: {
    id: "550e8400-e29b-41d4-a716-446655440001",
    name: "Excelencia Tour SMO",
    slug: "excelencia-tour",
    is_platform_root: false,
    plan_tier: "pro",
    subscription_tier: "pro",
    subscription_status: "active",
    settings: { segment: "tourism", type: "tourism", niche: "tourism", enabled_modules: ["tourism", "orders"] },
    enabled_modules: ["tourism", "orders"],
  } as Record<string, any>,
  lastStoreUpdate: null as Record<string, any> | null,
}));

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    validator: (schema: any) => ({
      handler: (fn: any) => async (args: any = {}) => {
        const parsed =
          typeof schema === "function"
            ? schema(args?.data)
            : typeof schema?.parse === "function"
              ? schema.parse(args?.data)
              : args?.data;
        return fn({ data: parsed });
      },
    }),
    handler: (fn: any) => async (args: any = {}) => fn(args || {}),
  }),
}));

vi.mock("@/lib/server-access", () => ({
  getServerIdentity: async () => testState.identity,
  requireAdmin: async () => {
    if (!testState.identity?.id) throw new Error("Unauthorized");
    if (!["owner", "admin", "manager", "platform_admin", "master"].includes(testState.identity.role)) {
      throw new Error("Unauthorized");
    }
    return {
      id: testState.identity.id,
      role: testState.identity.role,
      store_id: testState.identity.store_id,
    };
  },
  requirePlatformAdmin: async () => {
    const isMaster =
      testState.identity?.isPlatformAdmin ||
      ["platform_admin", "master", "admin_master", "superadmin"].includes(testState.identity?.role);
    if (!isMaster) {
      throw new Error("Acesso restrito ao Administrador Master Global.");
    }
    return {
      id: testState.identity.id,
      role: "platform_admin",
      store_id: testState.identity.store_id,
    };
  },
  assertManagerAccess: () => true,
  assertStoreAccess: () => true,
}));

vi.mock("@/services/identity.functions", () => ({
  getIdentity: async () => ({ id: testState.identity.id, role: testState.identity.role }),
}));

vi.mock("@/services/cart-helpers", () => ({
  getCurrentIdentity: async () => ({ customer_id: testState.identity.id, store_id: testState.identity.store_id }),
}));

function buildMockSupabase() {
  return {
    from: (table: string) => {
      const state: { method: string; payload: any } = { method: "select", payload: null };
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        in: () => chain,
        order: () => chain,
        limit: () => chain,
        insert: (p: any) => {
          state.method = "insert";
          state.payload = p;
          return chain;
        },
        update: (p: any) => {
          state.method = "update";
          state.payload = p;
          if (table === "stores") testState.lastStoreUpdate = p;
          return chain;
        },
        upsert: () => chain,
        maybeSingle: async () => ({ data: testState.storeRow, error: null }),
        single: async () => ({ data: { ...testState.storeRow, ...(state.payload || {}) }, error: null }),
        then: (resolve: any) => resolve({ data: [testState.storeRow], error: null }),
      };
      return chain;
    },
  };
}

vi.mock("@/lib/supabase", () => ({
  getServerClient: () => buildMockSupabase(),
  getAnonServerClient: () => buildMockSupabase(),
}));

import { updateStoreBrandAndTierFn } from "./multi-brand.functions";
import {
  toggleStoreModuleAddon,
  updateStorePlanTier,
  updateStoreVerticalSubscription,
} from "./store-modules.functions";
import { listModerationReports, resolveModerationReport } from "./moderation.functions";
import { listKycVerificationsForAdmin, auditKycVerification } from "./kyc.functions";
import { toggleAmbassadorStatus } from "./stories.functions";
import { _saveStoreSettings } from "./store.functions";

describe("Isolamento Estrito Admin Master vs. Workspace Lojista", () => {
  beforeEach(() => {
    testState.identity = {
      id: USER_ID,
      role: "admin",
      isPlatformAdmin: false,
      store_id: STORE_ID,
      memberships: [{ store_id: STORE_ID, role: "admin" }],
    };
    testState.lastStoreUpdate = null;
  });

  it("bloqueia store admin / owner de alterar Marca Vertical, Tier ou Domínio White-Label via BFF", async () => {
    for (const merchantRole of ["admin", "owner", "manager"]) {
      testState.identity.role = merchantRole;
      testState.identity.isPlatformAdmin = false;

      await expect(
        (updateStoreBrandAndTierFn as any)({
          data: {
            storeId: STORE_ID,
            brandOrigin: "turis",
            subscriptionTier: "enterprise",
            customDomain: "agencia.waesy.com.br",
          },
        }),
      ).rejects.toThrow("Administrador Master Global");

      await expect(
        (updateStorePlanTier as any)({
          data: { storeId: STORE_ID, planTier: "enterprise" },
        }),
      ).rejects.toThrow("Administrador Master Global");

      await expect(
        (updateStoreVerticalSubscription as any)({
          data: { storeId: STORE_ID, verticalSku: "waesy_tourism_pro" },
        }),
      ).rejects.toThrow("Administrador Master Global");

      await expect(
        (toggleStoreModuleAddon as any)({
          data: { storeId: STORE_ID, moduleId: "module_tourism_studio", active: true },
        }),
      ).rejects.toThrow("Administrador Master Global");
    }
  });

  it("permite somente platform_admin atualizar Marca Vertical, Tier e Módulos Comerciais", async () => {
    testState.identity.role = "platform_admin";
    testState.identity.isPlatformAdmin = true;

    const brandRes = await (updateStoreBrandAndTierFn as any)({
      data: {
        storeId: STORE_ID,
        brandOrigin: "turis",
        subscriptionTier: "enterprise",
        customDomain: "turis.minhaagencia.com.br",
      },
    });
    expect(brandRes.success).toBe(true);
    expect(brandRes.brandOrigin).toBe("turis");

    const tierRes = await (updateStorePlanTier as any)({
      data: { storeId: STORE_ID, planTier: "enterprise" },
    });
    expect(tierRes.success).toBe(true);
  });

  it("bloqueia store admin / owner de moderar denúncias, auditar KYC global e conceder selo de embaixador", async () => {
    await expect((listModerationReports as any)({ data: {} })).rejects.toThrow("Administrador Master Global");
    await expect(
      (resolveModerationReport as any)({ data: { reportId: TARGET_ID, action: "dismiss" } }),
    ).rejects.toThrow("Administrador Master Global");

    await expect((listKycVerificationsForAdmin as any)({ data: {} })).rejects.toThrow("governança master");
    await expect(
      (auditKycVerification as any)({ data: { verification_id: TARGET_ID, decision: "verified" } }),
    ).rejects.toThrow("governança master");

    await expect(
      (toggleAmbassadorStatus as any)({
        data: { creatorId: TARGET_ID, isOfficialAmbassador: true },
      }),
    ).rejects.toThrow("Administrador Master");
  });

  it("permite platform_admin operar moderação, KYC e selo de embaixador", async () => {
    testState.identity.role = "platform_admin";
    testState.identity.isPlatformAdmin = true;

    const reports = await (listModerationReports as any)({ data: {} });
    expect(Array.isArray(reports)).toBe(true);

    const kyc = await (listKycVerificationsForAdmin as any)({ data: {} });
    expect(Array.isArray(kyc)).toBe(true);

    const creator = await (toggleAmbassadorStatus as any)({
      data: { creatorId: TARGET_ID, isOfficialAmbassador: true },
    });
    expect(creator.is_official_ambassador).toBe(true);
  });

  it("impede lojista de sobrescrever nicho ou módulos habilitados já definidos via _saveStoreSettings", async () => {
    testState.identity.role = "owner";
    testState.identity.isPlatformAdmin = false;

    await _saveStoreSettings({
      name: "Excelencia Tour SMO",
      segment: "gastronomy",
      enabled_modules: ["rh_dp", "vehicles"],
    });

    expect(testState.lastStoreUpdate?.settings?.segment).toBe("tourism");
    expect(testState.lastStoreUpdate?.settings?.enabled_modules).toEqual(["tourism", "orders"]);
  });

  it("mantém a UI do Workspace sem seletores de vertical, plano self-service, Studio Business ou links Admin Master", () => {
    const root = process.cwd();
    const configRoute = fs.readFileSync(path.join(root, "src/routes/workspace.configuracoes.index.tsx"), "utf8");
    const planosRoute = fs.readFileSync(path.join(root, "src/routes/workspace.configuracoes.planos.tsx"), "utf8");
    const workspaceLayout = fs.readFileSync(path.join(root, "src/routes/workspace.tsx"), "utf8");
    const shell = fs.readFileSync(path.join(root, "src/components/workspace/workspace-shell.tsx"), "utf8");
    const allTools = fs.readFileSync(path.join(root, "src/components/workspace/workspace-all-tools-dialog.tsx"), "utf8");
    const lojasAdmin = fs.readFileSync(path.join(root, "src/routes/admin-master.lojas.tsx"), "utf8");

    expect(configRoute).toContain('mode="workspace"');
    expect(configRoute).toContain("getNicheSemantics({ ...(store || {}), segment })");
    expect(configRoute).not.toContain("<h2 className=\"text-base font-bold text-foreground\">Modelo de Operação</h2>");
    expect(configRoute).not.toContain("Módulos Habilitados");

    expect(planosRoute).not.toContain("updateStorePlanTier");
    expect(planosRoute).not.toContain("updateStoreVerticalSubscription");
    expect(planosRoute).not.toContain("toggleStoreModuleAddon");

    expect(lojasAdmin).toContain('mode="admin-master"');
    expect(workspaceLayout).not.toContain('session.role === "admin"');
    expect(shell).not.toContain('getBrandVerticalById("waesy_studio")');
    expect(allTools).not.toContain("/workspace/moderacao");
    expect(allTools).not.toContain("/workspace/master/influencers");
    expect(allTools).not.toContain("/workspace/design-system");
    expect(allTools).not.toContain("/workspace/configuracoes/planos");
  });
});
