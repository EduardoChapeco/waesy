import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const STORE_A = "550e8400-e29b-41d4-a716-446655440001";
const STORE_B = "550e8400-e29b-41d4-a716-446655440002";
const ROOT_STORE = "550e8400-e29b-41d4-a716-446655440000";
const USER_ID = "550e8400-e29b-41d4-a716-446655440099";
const TARGET_USER = "550e8400-e29b-41d4-a716-446655440077";

const testState = vi.hoisted(() => ({
  identity: {
    id: "550e8400-e29b-41d4-a716-446655440099" as string | null,
    role: "admin",
    isPlatformAdmin: false,
    store_id: "550e8400-e29b-41d4-a716-446655440001" as string | null,
    memberships: [{ store_id: "550e8400-e29b-41d4-a716-446655440001", role: "admin" }],
  } as any,
  storeRows: {
    "550e8400-e29b-41d4-a716-446655440001": {
      id: "550e8400-e29b-41d4-a716-446655440001",
      name: "Loja A",
      slug: "loja-a",
      is_platform_root: false,
      is_active: true,
      approval_status: "approved",
      plan_tier: "starter",
      settings: { segment: "retail", existingKey: "keep" },
    },
    "550e8400-e29b-41d4-a716-446655440002": {
      id: "550e8400-e29b-41d4-a716-446655440002",
      name: "Loja B",
      slug: "loja-b",
      is_platform_root: false,
      is_active: true,
      approval_status: "approved",
      plan_tier: "pro",
      settings: {},
    },
    "550e8400-e29b-41d4-a716-446655440000": {
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Waesy Root",
      slug: "waesy",
      is_platform_root: true,
      is_active: true,
      approval_status: "approved",
      plan_tier: "enterprise",
      settings: {},
    },
  } as Record<string, any>,
  lastUpdateByTable: {} as Record<string, Record<string, any>>,
  lastUpsertByTable: {} as Record<string, Record<string, any>>,
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

vi.mock("@/lib/server-access", async () => {
  const actual = await vi.importActual<typeof import("@/lib/server-access")>("@/lib/server-access");
  return {
    ...actual,
    getServerIdentity: async () => testState.identity,
    requirePlatformAdmin: async () => {
      const id = testState.identity;
      const role = String(id?.role || "").toLowerCase();
      const isMaster =
        Boolean(id?.id) &&
        (id?.isPlatformAdmin === true ||
          role === "platform_admin" ||
          role === "master" ||
          role === "admin_master" ||
          role === "superadmin");
      if (!isMaster) {
        throw new Error("Acesso restrito ao Administrador Master Global.");
      }
      return {
        id: id.id,
        role: "platform_admin",
        store_id: id.store_id,
        isPlatformAdmin: true,
      };
    },
  };
});

vi.mock("@/lib/logger", () => ({
  logSystemError: vi.fn(),
}));

vi.mock("@/services/identity.functions", () => ({
  getIdentity: async () => ({
    id: testState.identity?.id || null,
    role: testState.identity?.role || "customer",
    store_id: testState.identity?.store_id || null,
    memberships: testState.identity?.memberships || [],
    isPlatformAdmin: Boolean(testState.identity?.isPlatformAdmin),
  }),
}));

vi.mock("@/lib/supabase", () => ({
  getServerClient: () => ({
    from: (table: string) => {
      const state: { method: string; payload: any; eqs: Record<string, any> } = {
        method: "select",
        payload: null,
        eqs: {},
      };
      const chain: any = {
        select: () => chain,
        insert: (p: any) => {
          state.method = "insert";
          state.payload = p;
          return chain;
        },
        update: (p: any) => {
          state.method = "update";
          state.payload = p;
          testState.lastUpdateByTable[table] = p;
          return chain;
        },
        upsert: (p: any) => {
          state.method = "upsert";
          state.payload = p;
          testState.lastUpsertByTable[table] = p;
          return chain;
        },
        eq: (col: string, val: any) => {
          state.eqs[col] = val;
          return chain;
        },
        neq: () => chain,
        order: () => chain,
        limit: () => chain,
        maybeSingle: async () => {
          if (table === "stores") {
            return { data: testState.storeRows[state.eqs.id] || null, error: null };
          }
          if (table === "workspace_members") {
            return { data: null, error: null };
          }
          if (table === "platform_brand_settings") {
            return { data: { id: "brand-1", root_experience_mode: "landing_vendas" }, error: null };
          }
          return { data: null, error: null };
        },
        single: async () => {
          if (table === "stores") {
            const target = testState.storeRows[state.eqs.id] || testState.storeRows[STORE_A];
            return { data: target, error: null };
          }
          if (table === "platform_modules_config") {
            return { data: { module_key: "pdv", enabled: true }, error: null };
          }
          if (table === "platform_vertical_subsystems") {
            return { data: state.payload || { id: "pro" }, error: null };
          }
          return { data: state.payload || {}, error: null };
        },
        then: (resolve: (val: any) => any) => {
          if (state.method === "select" && table === "platform_modules_config") {
            return Promise.resolve({
              data: [
                { module_key: "pdv", name: "PDV", enabled: true, is_public: true, order_index: 1 },
                { module_key: "marketplace", name: "Marketplace", enabled: false, is_public: true, order_index: 2 },
              ],
              error: null,
            }).then(resolve);
          }
          if (state.method === "select" && table === "platform_vertical_subsystems") {
            return Promise.resolve({ data: [], error: null }).then(resolve);
          }
          return Promise.resolve({ data: [], error: null }).then(resolve);
        },
      };
      return chain;
    },
  }),
}));

import { isPlatformAdminIdentity } from "@/lib/identity-core";
import { canAccessModule } from "@/lib/multi-brand-engine";
import {
  resolveSubsystemFromHost,
  resolveSubsystemHref,
  buildGoDaddyDnsRecordsForSubsystems,
  CANONICAL_VERTICAL_SUBSYSTEMS,
} from "@/lib/vertical-subsystems";
import { adminTogglePlatformModule, getStoreActiveModules } from "@/services/modules.functions";
import { upgradeStoreToWaesyMax as upgradeAiQuotaMax } from "@/services/ai-quotas-and-byok.functions";
import { upgradeStoreToWaesyMax as upgradeAdsMax } from "@/services/ads.functions";
import { listWorkspaceWaitlist, migrateCompanyToFullWorkspace } from "@/services/portal-completo.functions";
import { listCourierApplicationsForAudit, auditCourierApplication } from "@/services/courier-verification.functions";
import { auditStoreCompliance } from "@/services/marketplace-compliance.functions";
import { verifyLedgerIntegrity, listLedgerEntries } from "@/services/immutable-ledger.functions";
import { _savePublicProfile, _saveStoreSettings, updateStoreProfileFn } from "@/services/store.functions";
import {
  adminSetCompanyApprovalFn,
  adminUpdateUserGovernanceFn,
  adminUpdateEcosystemFlagsFn,
} from "@/services/vertical-subsystems.functions";

describe("Seguranca Soberana, Isolamento Multi-Tenant & Subsistemas Verticais", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.identity = {
      id: USER_ID,
      role: "admin",
      isPlatformAdmin: false,
      store_id: STORE_A,
      memberships: [{ store_id: STORE_A, role: "admin" }],
    };
    testState.lastUpdateByTable = {};
    testState.lastUpsertByTable = {};
  });

  describe("1. Identidade Master vs Tenant Admin (Zero Escalation)", () => {
    it("rejeita papeis locais de empresa ('admin', 'owner', 'manager') como Admin Master", () => {
      for (const role of ["admin", "owner", "store_owner", "manager", "seller", "customer", ""]) {
        expect(isPlatformAdminIdentity({ id: USER_ID, role, isPlatformAdmin: false })).toBe(false);
      }
      expect(isPlatformAdminIdentity(null)).toBe(false);
      expect(isPlatformAdminIdentity({ id: null, role: "platform_admin", isPlatformAdmin: true })).toBe(false);
    });

    it("aceita estritamente papeis globais de plataforma ou flag isPlatformAdmin", () => {
      for (const role of ["platform_admin", "master", "admin_master", "superadmin"]) {
        expect(isPlatformAdminIdentity({ id: USER_ID, role })).toBe(true);
      }
      expect(isPlatformAdminIdentity({ id: USER_ID, role: "owner", isPlatformAdmin: true })).toBe(true);
    });
  });

  describe("2. Bloqueios Exclusivos do Admin Master Global (Prova Negativa + Positiva)", () => {
    it("bloqueia tenant 'admin' e 'owner' em todas as funcoes administrativas e planos", async () => {
      for (const tenantRole of ["admin", "owner"]) {
        testState.identity = {
          id: USER_ID,
          role: tenantRole,
          isPlatformAdmin: false,
          store_id: STORE_A,
          memberships: [{ store_id: STORE_A, role: tenantRole }],
        };

        await expect(adminTogglePlatformModule({ data: { moduleKey: "pdv", enabled: false } })).rejects.toThrow();
        await expect(upgradeAiQuotaMax({ data: { storeId: STORE_A } })).rejects.toThrow(/platform_admin|Master|autorizado/i);
        await expect(upgradeAdsMax()).rejects.toThrow(/platform_admin|Master|autorizado/i);
        await expect(
          adminSetCompanyApprovalFn({ data: { storeId: STORE_A, approvalStatus: "approved" } }),
        ).rejects.toThrow(/Master/);
        await expect(
          adminUpdateUserGovernanceFn({
            data: {
              userId: TARGET_USER,
              approvalStatus: "approved",
              userPlanTier: "WAESY_MAX",
              enabledModules: [],
              disabledModules: [],
            },
          }),
        ).rejects.toThrow(/Master/);
        await expect(
          adminUpdateEcosystemFlagsFn({
            data: {
              rootExperienceMode: "landing_vendas",
              requireCompanyApproval: true,
              requireUserApproval: true,
            },
          }),
        ).rejects.toThrow(/Master/);
        await expect(listWorkspaceWaitlist()).rejects.toThrow(/Master/);
        await expect(
          migrateCompanyToFullWorkspace({ data: { waitlistId: STORE_A, storeId: STORE_B } }),
        ).rejects.toThrow(/Master/);
        await expect(listCourierApplicationsForAudit({ data: {} })).rejects.toThrow(/Master|autorizado/i);
        await expect(
          auditCourierApplication({
            data: { applicationId: STORE_A, decision: "match_approved" },
          }),
        ).rejects.toThrow(/Master|autorizado/i);
        await expect(
          auditStoreCompliance({ data: { storeId: STORE_A, decision: "APPROVE" } }),
        ).rejects.toThrow(/Master|autorizado/i);
        await expect(verifyLedgerIntegrity({ data: {} })).rejects.toThrow(/Master/);
      }
    });

    it("bloqueia acesso cruzado de ledger financeiro e edicao de empresa de outro tenant", async () => {
      testState.identity = {
        id: USER_ID,
        role: "owner",
        isPlatformAdmin: false,
        store_id: STORE_A,
        memberships: [{ store_id: STORE_A, role: "owner" }],
      };

      await expect(listLedgerEntries({ data: { storeId: STORE_B } })).rejects.toThrow();
      await expect(updateStoreProfileFn({ data: { storeId: STORE_B, name: "Hack B" } })).rejects.toThrow();
    });

    it("sanitiza chaves de governanca no _savePublicProfile e _saveStoreSettings para nao-master", async () => {
      testState.identity = {
        id: USER_ID,
        role: "owner",
        isPlatformAdmin: false,
        store_id: STORE_A,
        memberships: [{ store_id: STORE_A, role: "owner" }],
      };

      await _savePublicProfile({
        description: "Padaria Central",
        settings: {
          plan_tier: "enterprise",
          subscription_tier: "enterprise",
          vertical_sku: "WAESY_MAX",
          enabled_modules: ["*"] as any,
          is_platform_root: true,
          approval_status: "approved",
          customTheme: "clean",
        },
      });

      const savedSettings = testState.lastUpdateByTable.stores?.settings;
      expect(savedSettings.customTheme).toBe("clean");
      expect(savedSettings.plan_tier).toBeUndefined();
      expect(savedSettings.vertical_sku).toBeUndefined();
      expect(savedSettings.enabled_modules).toBeUndefined();
      expect(savedSettings.is_platform_root).toBeUndefined();

      const settingsRes = await _saveStoreSettings({ enabled_modules: ["hr", "erp_financial"] });
      expect(settingsRes).toEqual({ status: "success" });
      expect(testState.lastUpdateByTable.stores?.enabled_modules).toBeUndefined();
      expect(testState.lastUpdateByTable.stores?.settings?.enabled_modules).toBeUndefined();
    });

    it("permite ao Admin Master aprovar/suspender empresas, alterar planos de usuarios e alternar flags globais", async () => {
      testState.identity = {
        id: USER_ID,
        role: "platform_admin",
        isPlatformAdmin: true,
        store_id: ROOT_STORE,
        memberships: [],
      };

      await expect(
        adminSetCompanyApprovalFn({ data: { storeId: ROOT_STORE, approvalStatus: "suspended" } }),
      ).rejects.toThrow(/raiz da plataforma/i);

      const resStore = await adminSetCompanyApprovalFn({
        data: { storeId: STORE_A, approvalStatus: "suspended", notes: "CNPJ pendente" },
      });
      expect(resStore.success).toBe(true);
      expect(resStore.isActive).toBe(false);
      expect(testState.lastUpdateByTable.stores).toMatchObject({
        approval_status: "suspended",
        is_active: false,
      });

      await adminUpdateUserGovernanceFn({
        data: {
          userId: TARGET_USER,
          approvalStatus: "approved",
          userPlanTier: "enterprise",
          enabledModules: ["crm", "pdv"],
          disabledModules: ["hr"],
          notes: "Liberado via Master",
        },
      });
      expect(testState.lastUpdateByTable.profiles).toMatchObject({
        approval_status: "approved",
        user_plan_tier: "enterprise",
        enabled_modules: ["crm", "pdv"],
        disabled_modules: ["hr"],
      });

      await adminUpdateEcosystemFlagsFn({
        data: {
          rootExperienceMode: "marketplace_local",
          requireCompanyApproval: true,
          requireUserApproval: true,
        },
      });
      expect(testState.lastUpdateByTable.platform_brand_settings).toMatchObject({
        root_experience_mode: "marketplace_local",
        require_company_approval: true,
        require_user_approval: true,
      });
    });
  });

  describe("3. Matriz Fail-Closed de Modulos & Status de Aprovacao", () => {
    it("nega acesso quando store esta sem plano declarado (default 'starter'), suspensa ou pendente", () => {
      expect(canAccessModule({ id: STORE_A }, "hr")).toBe(false);
      expect(
        canAccessModule({ id: STORE_A, plan_tier: "enterprise", is_active: false }, "pdv"),
      ).toBe(false);
      expect(
        canAccessModule({ id: STORE_A, plan_tier: "enterprise", approval_status: "pending" }, "crm"),
      ).toBe(false);
      expect(
        canAccessModule({ id: ROOT_STORE, is_platform_root: true, plan_tier: "starter" }, "hr"),
      ).toBe(true);
    });

    it("getStoreActiveModules bloqueia modulo globalmente desabilitado e desabilita tudo se loja estiver suspensa", async () => {
      testState.storeRows[STORE_A].approval_status = "approved";
      testState.storeRows[STORE_A].is_active = true;
      const activeRes = await getStoreActiveModules({ data: { storeId: STORE_A } });
      expect(activeRes.activeMap.pdv).toBe(true);
      expect(activeRes.activeMap.marketplace).toBe(false);

      testState.storeRows[STORE_A].approval_status = "suspended";
      testState.storeRows[STORE_A].is_active = false;
      const suspendedRes = await getStoreActiveModules({ data: { storeId: STORE_A } });
      expect(suspendedRes.activeMap.pdv).toBe(false);
    });
  });

  describe("4. Desmembramento Multi-Dominio & GoDaddy DNS Guide", () => {
    it("mapeia todos os subdominios verticais canonicos para rotas independentes", () => {
      expect(resolveSubsystemFromHost("waesy.com.br")?.id).toBe("waesy");
      expect(resolveSubsystemFromHost("www.waesy.com.br")?.targetPath).toBe("/");
      expect(resolveSubsystemFromHost("pro.waesy.com.br")?.targetPath).toBe("/painel");
      expect(resolveSubsystemFromHost("marketplace.waesy.com.br")?.targetPath).toBe("/marketplace");
      expect(resolveSubsystemFromHost("classificados.waesy.com.br")?.targetPath).toBe("/classificados");
      expect(resolveSubsystemFromHost("noticias.waesy.com.br")?.targetPath).toBe("/noticias");
      expect(resolveSubsystemFromHost("go.waesy.com.br")?.targetPath).toBe("/mobilidade");
      expect(resolveSubsystemFromHost("talk.waesy.com.br")?.targetPath).toBe("/workspace/atendimento/chat");
      expect(resolveSubsystemFromHost("copilot.waesy.com.br")?.targetPath).toBe("/copilot");
      expect(resolveSubsystemFromHost("places.waesy.com.br")?.targetPath).toBe("/diretorio");
      expect(resolveSubsystemFromHost("wider.waesy.com.br")?.targetPath).toBe("/painel?vertical=wider");
      expect(resolveSubsystemFromHost("eventio.waesy.com.br")?.targetPath).toBe("/painel?vertical=eventio");
      expect(resolveSubsystemFromHost("juris.waesy.com.br")?.targetPath).toBe("/painel?vertical=juris");
      expect(resolveSubsystemFromHost("store.waesy.com.br")?.targetPath).toBe("/painel?vertical=store");
      expect(resolveSubsystemFromHost("mercado.waesy.com.br")?.targetPath).toBe("/painel?vertical=mercado");
      expect(resolveSubsystemFromHost("admin.waesy.com.br")?.targetPath).toBe("/admin-master");
      expect(resolveSubsystemFromHost("localhost:3000")).toBeNull();
    });

    it("resolve links contextuais entre subdominios em producao e caminhos locais em dev", () => {
      const sub = CANONICAL_VERTICAL_SUBSYSTEMS.find((s) => s.id === "go")!;
      expect(resolveSubsystemHref(sub, "waesy.com.br")).toEqual({
        href: "https://go.waesy.com.br",
        external: true,
      });
      expect(resolveSubsystemHref(sub, "go.waesy.com.br")).toEqual({
        href: "https://go.waesy.com.br",
        external: false,
      });
      expect(resolveSubsystemHref(sub, "localhost")).toEqual({
        href: "/mobilidade",
        external: false,
      });
    });

    it("gera tabela GoDaddy DNS completa apontando para Cloudflare Pages", () => {
      const records = buildGoDaddyDnsRecordsForSubsystems(CANONICAL_VERTICAL_SUBSYSTEMS, "usewaesy.pages.dev");
      const hosts = records.map((r) => r.host);
      expect(hosts).toContain("@");
      expect(hosts).toContain("www");
      expect(hosts).toContain("pro");
      expect(hosts).toContain("painel");
      expect(hosts).toContain("marketplace");
      expect(hosts).toContain("classificados");
      expect(hosts).toContain("noticias");
      expect(hosts).toContain("go");
      expect(hosts).toContain("talk");
      expect(hosts).toContain("copilot");
      expect(hosts).toContain("wider");
      expect(hosts).toContain("eventio");
      expect(hosts).toContain("juris");
      expect(hosts).toContain("store");
      expect(hosts).toContain("mercado");
      expect(records.every((r) => r.value === "usewaesy.pages.dev")).toBe(true);
    });
  });

  describe("5. Integridade Estatica de SQL Triggers, Cookies Cross-Domain & Limite de Linhas UI", () => {
    it("confirma triggers imutaveis BEFORE UPDATE e tabela platform_vertical_subsystems na migration", () => {
      const sqlPath = path.resolve(
        process.cwd(),
        "supabase/migrations/20270521000000_governance_rls_user_plans_and_subsystems.sql",
      );
      const sql = fs.readFileSync(sqlPath, "utf-8");
      expect(sql).toContain("protect_profile_sensitive_columns()");
      expect(sql).toContain("protect_store_sensitive_columns()");
      expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.platform_vertical_subsystems");
      expect(sql).toContain("user_plan_tier");
      expect(sql).toContain("approval_status");
      expect(sql).toContain("disabled_modules");
    });

    it("confirma server.ts roteando subdominios verticais e context-auth compartilhando .waesy.com.br", () => {
      const serverTs = fs.readFileSync(path.resolve(process.cwd(), "src/server.ts"), "utf-8");
      const contextAuth = fs.readFileSync(path.resolve(process.cwd(), "src/lib/context-auth.ts"), "utf-8");
      expect(serverTs).toContain("resolveSubsystemFromHost");
      expect(serverTs).toContain("x-waesy-subsystem-id");
      expect(contextAuth).toContain("domain=.waesy.com.br");
    });

    it("confirma limites de modularizacao <= 250L em componentes e <= 300L na nova rota Admin", () => {
      const files = [
        { p: "src/components/admin/godaddy-dns-guide-card.tsx", max: 250 },
        { p: "src/components/admin/user-governance-modal.tsx", max: 250 },
        { p: "src/components/shell/waesy-hub-launcher.tsx", max: 250 },
        { p: "src/components/landing/waesy-sales-tabs.tsx", max: 250 },
        { p: "src/components/landing/waesy-sales-landing.tsx", max: 250 },
        { p: "src/routes/admin-master.subsistemas.tsx", max: 300 },
      ];
      for (const f of files) {
        const lines = fs.readFileSync(path.resolve(process.cwd(), f.p), "utf-8").split("\n").length;
        expect(lines, `${f.p} excedeu ${f.max} linhas`).toBeLessThanOrEqual(f.max);
      }
    });
  });
});
