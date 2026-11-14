import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetStoreSettings = vi.fn();
const mockListTeamMembers = vi.fn();
const mockListChatDepartments = vi.fn();
const mockListWorkspaceWhatsAppInstances = vi.fn();
const mockGetAttendanceBusinessIntelligence = vi.fn();
const mockListInstanceMemberPermissions = vi.fn();
const mockUpsertInstanceMemberPermissions = vi.fn();
const mockUpdateTeamMemberProfile = vi.fn();
const mockToggleAgentPresence = vi.fn();
const mockLoaderData = vi.fn();
const mockRouterInvalidate = vi.fn();

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
        if (prop === "then" || typeof prop === "symbol") return undefined;
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
    useLoaderData: () => mockLoaderData(),
  }),
  Link: ({ children, to, ...rest }: any) => React.createElement("a", { href: to, ...rest }, children),
  useRouter: () => ({ invalidate: mockRouterInvalidate }),
}));

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

vi.mock("@/services/store.functions", () =>
  createSmartModuleMock({
    getStoreSettings: (...args: any[]) => mockGetStoreSettings(...args),
  }),
);

vi.mock("@/services/admin-team.functions", () =>
  createSmartModuleMock({
    listTeamMembers: (...args: any[]) => mockListTeamMembers(...args),
    toggleAgentPresence: (...args: any[]) => mockToggleAgentPresence(...args),
    updateTeamMemberProfile: (...args: any[]) => mockUpdateTeamMemberProfile(...args),
  }),
);

vi.mock("@/services/whatsapp-channel-instances.functions", () =>
  createSmartModuleMock({
    listChatDepartments: (...args: any[]) => mockListChatDepartments(...args),
    listWorkspaceWhatsAppInstances: (...args: any[]) => mockListWorkspaceWhatsAppInstances(...args),
    listInstanceMemberPermissions: (...args: any[]) => mockListInstanceMemberPermissions(...args),
    upsertInstanceMemberPermissions: (...args: any[]) => mockUpsertInstanceMemberPermissions(...args),
  }),
);

vi.mock("@/services/whatsapp-operations-metrics.functions", () =>
  createSmartModuleMock({
    getAttendanceBusinessIntelligence: (...args: any[]) =>
      mockGetAttendanceBusinessIntelligence(...args),
  }),
);

vi.mock("@/components/atendimento/AtendimentoSubmoduleHeader", () =>
  createSmartModuleMock({
    AtendimentoSubmoduleHeader: ({ title }: { title: string }) =>
      React.createElement("header", { "data-testid": "atendimento-header" }, title),
  }),
);

import { Route } from "../workspace.atendimento.atendentes";

describe("Atendimento — Atendentes & Permissões de Canal WhatsApp (Step 1 E2E)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetStoreSettings.mockResolvedValue({ id: "11111111-1111-4111-8111-111111111111" });
    mockListTeamMembers.mockResolvedValue([]);
    mockListChatDepartments.mockResolvedValue([]);
    mockListWorkspaceWhatsAppInstances.mockResolvedValue([]);
    mockGetAttendanceBusinessIntelligence.mockResolvedValue(null);
    mockListInstanceMemberPermissions.mockResolvedValue([]);
  });

  it("loader retorna loadError explícito e SSR renderiza ErrorState em falha de banco (sem mascarar vazio)", async () => {
    mockListTeamMembers.mockRejectedValueOnce(new Error("Falha RLS ao listar membros"));
    const loaded = await (Route.options.loader as any)();
    expect(loaded.loadError).toContain("Falha RLS");
    expect(loaded.members).toEqual([]);

    mockLoaderData.mockReturnValue(loaded);
    const Page = Route.options.component as React.ComponentType;
    const html = renderToStaticMarkup(React.createElement(Page));
    expect(html).toContain("Falha ao carregar atendentes");
    expect(html).toContain("Falha RLS");
    expect(html).not.toContain("Nenhum colaborador na equipe");
  });

  it("loader carrega instâncias e permissões reais e SSR renderiza lista sem crash", async () => {
    const member = {
      id: "aaaa1111-1111-4111-8111-111111111111",
      full_name: "Ana Tur",
      email: "ana@waesy.test",
      role: "seller",
      attendance_presence: "online",
      max_concurrent_chats: 12,
      whatsapp_instance: { display_name: "WhatsApp Principal" },
      department: { name: "Comercial" },
    };
    const instance = {
      id: "22222222-2222-4222-8222-222222222222",
      display_name: "WhatsApp Principal",
      is_default: true,
    };
    const perm = {
      id: "33333333-3333-4333-8333-333333333333",
      store_id: "11111111-1111-4111-8111-111111111111",
      instance_id: instance.id,
      profile_id: member.id,
      can_view: true,
      can_reply: false,
      can_manage_qr: true,
      can_manage_groups: true,
      can_sync_history: false,
      only_assigned_or_sector: true,
      can_transfer: true,
      can_close: true,
    };

    mockListTeamMembers.mockResolvedValueOnce([member]);
    mockListWorkspaceWhatsAppInstances.mockResolvedValueOnce([instance]);
    mockListInstanceMemberPermissions.mockResolvedValueOnce([perm]);

    const loaded = await (Route.options.loader as any)();
    expect(loaded.loadError).toBeNull();
    expect(loaded.members).toHaveLength(1);
    expect(loaded.instancePermissions).toHaveLength(1);

    mockLoaderData.mockReturnValue(loaded);
    const Page = Route.options.component as React.ComponentType;
    const html = renderToStaticMarkup(React.createElement(Page));
    expect(html).toContain("Ana Tur");
    expect(html).toContain("WhatsApp Principal");
    expect(html).toContain("bg-success");
  });

  it("contrato da rota conecta Select WhatsApp e 4 switches de permissão ao upsertInstanceMemberPermissions", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src/routes/workspace.atendimento.atendentes.tsx"),
      "utf8",
    );
    expect(source).toContain("hydrateChannelPerms(editingMember.id, val, editingMember)");
    expect(source).toContain("upsertInstanceMemberPermissions({");
    expect(source).toContain('id="perm-can-view"');
    expect(source).toContain('id="perm-can-reply"');
    expect(source).toContain('id="perm-can-manage-groups"');
    expect(source).toContain('id="perm-can-sync-history"');
    expect(source).toContain("listInstanceMemberPermissions({ data: { storeId: store?.id } })");
  });
});
