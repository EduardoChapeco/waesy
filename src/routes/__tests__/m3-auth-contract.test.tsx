import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  isAllowedOAuthOrigin,
  normalizeInternalReturnPath,
  resolveCanonicalOAuthOrigin,
} from "@/lib/return-path";

const mockGetUserSession = vi.fn();
const mockGetPublicBrandSettings = vi.fn();
const mockUseSearch = vi.fn();

const { createSmartModuleMock } = vi.hoisted(() => ({
  createSmartModuleMock: (overrides: Record<string, any> = {}) =>
    new Proxy(overrides, {
      get(target, prop) {
        if (prop === "__esModule") return true;
        if (prop === "default") return overrides.default ?? target;
        if (prop === "then" || typeof prop === "symbol") return undefined;
        if (prop in target) return target[prop as any];
        return () => null;
      },
      has(target, prop) {
        if (prop === "__esModule" || prop === "default" || prop in target) return true;
        return typeof prop === "string";
      },
      getOwnPropertyDescriptor(target, prop) {
        if (prop === "then" || typeof prop === "symbol") {
          return undefined;
        }
        return {
          configurable: true,
          enumerable: true,
          writable: true,
          value: prop in target ? target[prop as any] : () => null,
        };
      },
    }),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: (_path: string) => (config: any) => ({
    ...config,
    options: config,
    useLoaderData: () => ({ brand: { platform_name: "Waesy" } }),
    useSearch: () => mockUseSearch(),
  }),
  Link: ({ children, to, ...rest }: any) => React.createElement("a", { href: to, ...rest }, children),
  useNavigate: () => vi.fn(),
  useRouter: () => ({ invalidate: vi.fn() }),
  redirect: (opts: any) => Object.assign(new Error("ROUTER_REDIRECT"), { isRedirect: true, ...opts }),
  isRedirect: (err: any) => Boolean(err?.isRedirect),
}));

vi.mock("@/services/auth.functions", () =>
  createSmartModuleMock({
    getUserSession: (...args: any[]) => mockGetUserSession(...args),
    signInWithPassword: vi.fn(),
    signUpWithPassword: vi.fn(),
    signInWithOAuth: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    checkIdentifierExists: vi.fn(),
  }),
);

vi.mock("@/services/master.functions", () =>
  createSmartModuleMock({
    getPublicBrandSettings: (...args: any[]) => mockGetPublicBrandSettings(...args),
  }),
);

vi.mock("@/components/legal/legal-terms-sheet", () =>
  createSmartModuleMock({
    LegalTermsSheet: () => null,
  }),
);

vi.mock("@phosphor-icons/react", () =>
  createSmartModuleMock({
    GoogleLogo: () => React.createElement("span", { "data-icon": "google" }),
  }),
);

vi.mock("lucide-react", () =>
  new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === "__esModule") return true;
        if (prop === "then" || typeof prop === "symbol") return undefined;
        return () => React.createElement("span", { "data-icon": String(prop) });
      },
      has(_t, prop) {
        return prop === "__esModule" || typeof prop === "string";
      },
      getOwnPropertyDescriptor(_t, prop) {
        if (prop === "then" || typeof prop === "symbol") return undefined;
        return {
          configurable: true,
          enumerable: true,
          writable: true,
          value: () => React.createElement("span", { "data-icon": String(prop) }),
        };
      },
    },
  ),
);

describe("M3 Auth & Security Hardening Contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPublicBrandSettings.mockResolvedValue({ platform_name: "Waesy" });
    mockUseSearch.mockReturnValue({});
  });

  it("rejeita origens legadas/hostis e resolve origin OAuth canônico", () => {
    expect(isAllowedOAuthOrigin("https://waesy.pages.dev")).toBe(false);
    expect(isAllowedOAuthOrigin("https://www.waesy.pages.dev")).toBe(false);
    expect(isAllowedOAuthOrigin("https://evil.example.com")).toBe(false);
    expect(isAllowedOAuthOrigin("javascript:alert(1)")).toBe(false);

    expect(isAllowedOAuthOrigin("https://waesy.com.br")).toBe(true);
    expect(isAllowedOAuthOrigin("https://painel.waesy.com.br")).toBe(true);
    expect(isAllowedOAuthOrigin("https://preview.usewaesy.pages.dev")).toBe(true);
    expect(isAllowedOAuthOrigin("http://localhost:3000")).toBe(true);

    expect(
      resolveCanonicalOAuthOrigin({
        clientOrigin: "https://waesy.pages.dev",
        requestOrigin: "https://evil.example.com",
      }),
    ).toBe("https://waesy.com.br");

    expect(
      resolveCanonicalOAuthOrigin({
        clientOrigin: "https://painel.waesy.com.br",
      }),
    ).toBe("https://painel.waesy.com.br");

    expect(normalizeInternalReturnPath("/workspace", "/")).toBe("/workspace");
    expect(normalizeInternalReturnPath("//evil.com", "/")).toBe("/");
    expect(normalizeInternalReturnPath("/\\evil", "/")).toBe("/");
    expect(normalizeInternalReturnPath("https://evil.com", "/")).toBe("/");
  });

  it("bloqueia escalação de privilégio via user_metadata no loader de /entrar", async () => {
    mockGetUserSession.mockResolvedValue({
      id: "usr-spoofed",
      role: "customer",
      isMaster: false,
      isPlatformAdmin: false,
      memberships: [],
      user: {
        email: "usuario@externo.com",
        user_metadata: {
          role: "platform_admin",
          is_admin_master: true,
          is_superadmin: true,
        },
        app_metadata: {},
      },
    });

    const { Route } = await import("../_store.entrar");
    let caught: any = null;
    try {
      await (Route as any).options.loader({ search: { returnUrl: "/admin-master" } });
    } catch (err) {
      caught = err;
    }

    expect(caught?.isRedirect).toBe(true);
    expect(caught?.to).toBe("/");
  });

  it("bloqueia open redirect via returnUrl maliciosa e direciona lojista para /workspace", async () => {
    mockGetUserSession.mockResolvedValue({
      id: "usr-store",
      role: "owner",
      isMaster: false,
      isPlatformAdmin: false,
      memberships: [{ storeId: "store-1" }],
      user: { email: "dono@loja.com", app_metadata: {}, user_metadata: {} },
    });

    const { Route } = await import("../_store.entrar");
    let caught: any = null;
    try {
      await (Route as any).options.loader({ search: { returnUrl: "//evil.com/phish" } });
    } catch (err) {
      caught = err;
    }

    expect(caught?.isRedirect).toBe(true);
    expect(caught?.to).toBe("/workspace");
  });

  it("exibe alerta visível quando search.error chega do callback OAuth e omite PWA sem beforeinstallprompt", async () => {
    mockUseSearch.mockReturnValue({ error: "auth-callback-failed" });

    const { Route } = await import("../_store.entrar");
    const Comp = (Route as any).options.component;
    const html = renderToStaticMarkup(React.createElement(Comp));

    expect(html).toContain('role="alert"');
    expect(html).toContain("Não foi possível concluir a autenticação. Tente entrar novamente.");
    expect(html).not.toContain("Instalar Waesy App");
  });

  it("elimina MASTER_EMAILS e flags de user_metadata dos arquivos cliente", () => {
    const clientAuthFiles = [
      "src/routes/_store.entrar.tsx",
      "src/routes/workspace.tsx",
      "src/routes/admin-master.tsx",
    ];

    for (const relPath of clientAuthFiles) {
      const content = fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
      expect(content).not.toContain("MASTER_EMAILS");
      expect(content).not.toContain("user_metadata?.is_admin_master");
      expect(content).not.toContain("user_metadata?.is_superadmin");
      expect(content).not.toContain("user_metadata?.role");
    }

    const workspaceContent = fs.readFileSync(path.resolve(process.cwd(), "src/routes/workspace.tsx"), "utf8");
    expect(workspaceContent).not.toContain("@usewaesy.com");

    const entrarContent = fs.readFileSync(path.resolve(process.cwd(), "src/routes/_store.entrar.tsx"), "utf8");
    expect(entrarContent).not.toContain("font-black");
    expect(entrarContent).not.toContain("PWA pronto para instalação pelo navegador.");
    expect(entrarContent).toContain("beforeinstallprompt");

    const authFnContent = fs.readFileSync(path.resolve(process.cwd(), "src/services/auth.functions.ts"), "utf8");
    expect(authFnContent).not.toContain("https://waesy.pages.dev");
    expect(authFnContent).not.toContain("data.user?.user_metadata?.is_admin_master");
    expect(authFnContent).not.toContain("data.user?.user_metadata?.is_superadmin");

    const bffMasterAuthFiles = [
      "src/services/master.functions.ts",
      "src/services/admin-360-governance.functions.ts",
      "src/services/curadoria.functions.ts",
      "src/services/growth-targets.functions.ts",
      "src/services/legal.functions.ts",
      "src/services/waesy-cloud.functions.ts",
    ];
    for (const relPath of bffMasterAuthFiles) {
      const content = fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
      expect(content).not.toContain("MASTER_EMAILS");
      expect(content).toContain("isBootstrapPlatformAdminEmail");
    }

    const orchestratorContent = fs.readFileSync(
      path.resolve(process.cwd(), "src/services/api-orchestrator.functions.ts"),
      "utf8",
    );
    expect(orchestratorContent).not.toContain("https://waesy.pages.dev");
    expect(orchestratorContent).toContain("WAESY_CANONICAL_ORIGIN");

    for (const relPath of ["src/routes/_store.entrar.tsx", "src/routes/workspace.tsx"]) {
      const content = fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
      expect(content).not.toContain("waesy_auth_backup");
    }

    const cadastroContent = fs.readFileSync(
      path.resolve(process.cwd(), "src/routes/_store.cadastro.tsx"),
      "utf8",
    );
    expect(cadastroContent).toContain("const isGoogleAuthEnabled = true;");
    expect(cadastroContent).toContain("Continuar com Google");
    expect(cadastroContent).not.toContain("font-black");
    expect(cadastroContent).not.toContain("font-extrabold");
    expect(cadastroContent).toContain("text-base md:text-sm pr-12");
    expect(cadastroContent).toContain("size-11 min-h-11 min-w-11");
  });
});
