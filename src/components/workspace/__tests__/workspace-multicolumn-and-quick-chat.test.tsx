import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Home, Store } from "lucide-react";

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    validator: (schema: any) => ({
      handler: (fn: any) => async (args: any) => {
        const validated = schema ? schema.parse(args?.data) : args?.data;
        return fn({ data: validated });
      },
    }),
    handler: (fn: any) => async (args: any) => fn(args || {}),
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, className, ...props }: any) => (
    <a href={typeof to === "string" ? to : "#"} className={className} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
  useRouter: () => ({ navigate: vi.fn(), invalidate: vi.fn() }),
  useRouterState: (opts?: any) => {
    const state = { location: { pathname: "/workspace/comercial/crm", search: "" } };
    return opts?.select ? opts.select(state) : state;
  },
}));

vi.mock("@/services/auth.functions", () => ({
  signOut: vi.fn(),
}));

vi.mock("@/services/identity.functions", () => ({
  setTenantContext: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  getBrowserClient: () => ({ auth: { signOut: vi.fn() } }),
}));

vi.mock("@/lib/context-auth", () => ({
  setClientContextCookies: vi.fn(),
  getClientActiveTenant: () => null,
}));

vi.mock("@/services/chat.functions", () => ({
  listChatThreads: vi.fn(async () => ({ items: [] })),
  getChatMessages: vi.fn(async () => ({ items: [] })),
  sendChatMessage: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/services/intranet.functions", () => ({
  listIntranetChannels: vi.fn(async () => []),
  listIntranetMessages: vi.fn(async () => []),
  sendIntranetMessage: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/services/ai-conversations.functions", () => ({
  listAiConversationThreads: vi.fn(async () => []),
  executeCopilotDrawerMessage: vi.fn(async () => ({ responseMessage: "Ok" })),
}));

import { StatefulNavIcon } from "@/components/ui/stateful-nav-icon";
import {
  WorkspaceQuickChatDock,
  resolveDockControlsLayoutClass,
  type DockConversationItem,
} from "@/components/workspace/workspace-quick-chat-dock";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

function createSeededQueryClient() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  qc.setQueryData(["workspace-dock-client-threads", "store-1"], {
    threads: [
      {
        id: "t-wa-1",
        customer: { full_name: "Marina Silva" },
        channel: "whatsapp",
        last_message: "Quero cotar pacote para Gramado",
        total_messages: 2,
        is_last_reply_staff: false,
        updated_at: "2026-11-13T18:00:00Z",
      },
    ],
  });

  qc.setQueryData(["workspace-dock-internal-channels", "store-1"], [
    {
      id: "ch-1",
      title: "Operação Turismo",
      department: "Roteiros",
      messages: [{ text: "Tarifário atualizado" }],
      updated_at: "2026-11-13T17:50:00Z",
    },
  ]);

  qc.setQueryData(["workspace-dock-messages", "client", "t-wa-1"], [
    {
      id: "m-1",
      isOutgoing: false,
      author: "Marina Silva",
      text: "Pode incluir passeio de trem?",
    },
    {
      id: "m-2",
      isOutgoing: true,
      author: "Você",
      text: "Sim, preparando orçamento agora.",
    },
  ]);

  qc.setQueryData(["workspace-dock-ai-threads"], [
    {
      id: "ai-1",
      title: "Resumo de Margem Gramado",
      last_message_snippet: "Markup sugerido de 18%",
    },
  ]);

  return qc;
}

describe("Workspace Multicolumn & Quick Chat Dock Architecture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("alterna entre ícone line (inativo) e preenchido/sólido (ativo) no estilo ChatGPT", () => {
    const inactiveHtml = renderToStaticMarkup(
      <StatefulNavIcon icon={Home} active={false} size={20} />
    );
    const activeHtml = renderToStaticMarkup(
      <StatefulNavIcon icon={Home} active={true} size={20} />
    );
    const secondaryHtml = renderToStaticMarkup(
      <StatefulNavIcon icon={Store} active={true} size={20} />
    );

    expect(inactiveHtml).toContain("<svg");
    expect(activeHtml).toContain("<svg");
    expect(activeHtml).not.toEqual(inactiveHtml);
    expect(secondaryHtml).toContain("<svg");
  });

  it("renderiza Coluna 3 fechada com Copilot acima do botão squircle de Chat", () => {
    const qc = createSeededQueryClient();
    const html = renderToStaticMarkup(
      <QueryClientProvider client={qc}>
        <WorkspaceQuickChatDock activeStoreId="store-1" />
      </QueryClientProvider>
    );

    expect(resolveDockControlsLayoutClass(false)).toContain("flex-col-reverse");
    expect(html).toContain('data-testid="workspace-quick-chat-dock"');
    expect(html).toContain('data-testid="dock-chat-toggle"');
    expect(html).toContain('data-testid="dock-copilot-toggle"');
    expect(html).toContain("flex-col-reverse");
    expect(html).not.toContain('data-testid="quick-chat-strip"');
  });

  it("expande tira vertical fina (w-14) com fotos squircle e desloca Copilot para o lado", () => {
    const qc = createSeededQueryClient();
    const html = renderToStaticMarkup(
      <QueryClientProvider client={qc}>
        <WorkspaceQuickChatDock activeStoreId="store-1" initialChatStripOpen={true} />
      </QueryClientProvider>
    );

    expect(resolveDockControlsLayoutClass(true)).toContain("flex-row");
    expect(html).toContain('data-testid="quick-chat-strip"');
    expect(html).toContain("w-14");
    expect(html).toContain("Marina Silva");
    expect(html).toContain("Operação Turismo");
    expect(html).toContain("flex-row");
  });

  it("abre chat rápido estilo Instagram e janela de conversas rápidas do Copilot", () => {
    const qc = createSeededQueryClient();
    const convo: DockConversationItem = {
      id: "t-wa-1",
      kind: "client",
      title: "Marina Silva",
      subtitle: "Quero cotar pacote para Gramado",
      channel: "whatsapp",
      unread: true,
    };

    const chatHtml = renderToStaticMarkup(
      <QueryClientProvider client={qc}>
        <WorkspaceQuickChatDock
          activeStoreId="store-1"
          initialChatStripOpen={true}
          initialConversation={convo}
        />
      </QueryClientProvider>
    );

    expect(chatHtml).toContain('data-testid="quick-chat-popover"');
    expect(chatHtml).toContain("Pode incluir passeio de trem?");
    expect(chatHtml).toContain("Responder agora...");

    const copilotHtml = renderToStaticMarkup(
      <QueryClientProvider client={qc}>
        <WorkspaceQuickChatDock activeStoreId="store-1" initialCopilotOpen={true} />
      </QueryClientProvider>
    );

    expect(copilotHtml).toContain('data-testid="quick-copilot-popover"');
    expect(copilotHtml).toContain("Resumo de Margem Gramado");
  });

  it("inicia WorkspaceShell com Coluna 2 recolhida, Coluna 1 matte (bg-rail) e Coluna 3 acoplada", () => {
    const qc = createSeededQueryClient();
    const session = {
      user: { id: "u-1", email: "op@waesy.com", user_metadata: { full_name: "Ana" } },
      role: "owner",
      memberships: [
        {
          store_id: "store-1",
          name: "Agência Sul",
          segment: "turismo",
          niche: "tourism",
          role: "owner",
        },
      ],
      activeStore: {
        id: "store-1",
        store_id: "store-1",
        name: "Agência Sul",
        segment: "turismo",
        niche: "tourism",
      },
      activeStoreId: "store-1",
    };

    const html = renderToStaticMarkup(
      <QueryClientProvider client={qc}>
        <WorkspaceShell session={session}>
          <div>Conteúdo Operacional</div>
        </WorkspaceShell>
      </QueryClientProvider>
    );

    // Coluna 1 fina matte (w-14 bg-rail) + Coluna 2 recolhida por padrão (w-56 bg-sidebar ausente)
    expect(html).toContain("w-14 bg-rail");
    expect(html).not.toContain("w-56 bg-sidebar");
    // Coluna 3 montada junto ao container principal
    expect(html).toContain('data-testid="workspace-quick-chat-dock"');
    // Sem washes ruidosos bg-primary/10 ou bg-primary/15
    expect(html).not.toContain("bg-primary/10");
    expect(html).not.toContain("bg-primary/15");
    expect(html).toContain("Conteúdo Operacional");
  });
});
