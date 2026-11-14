import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? React.createElement("div", { "data-testid": "dialog-root" }, children) : null,
  DialogContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
  DialogHeader: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
  DialogTitle: ({ children }: { children: React.ReactNode }) =>
    React.createElement("h2", null, children),
  DialogDescription: ({ children }: { children: React.ReactNode }) =>
    React.createElement("p", null, children),
}));

vi.mock("@/services/whatsapp-channel-instances.functions", () => ({
  connectWhatsAppQrCodeInstance: vi.fn(),
  syncWhatsAppInstanceStatus: vi.fn(),
  disconnectWhatsAppInstance: vi.fn(),
  saveWorkspaceWhatsAppInstance: vi.fn(),
}));

import {
  WhatsAppQrConnectModal,
  getNextFreeChannelKeyAndLabel,
  resolveWhatsAppQrModalInitialSelection,
} from "./whatsapp-qr-connect-modal";
import type { WhatsAppChannelInstanceDTO } from "@/services/whatsapp-channel-instances.functions";

function makeInstance(partial: Partial<WhatsAppChannelInstanceDTO>): WhatsAppChannelInstanceDTO {
  return {
    id: partial.id || "10000000-0000-4000-8000-000000000001",
    store_id: "11111111-1111-4111-8111-111111111111",
    display_name: partial.display_name || "WhatsApp Principal",
    provider: "evolution_api",
    connection_mode: "unofficial",
    instance_key: partial.instance_key || "principal",
    status: partial.status || "connected",
    is_active: partial.is_active ?? true,
    is_default: partial.is_default ?? false,
    phone_number_id: null,
    business_account_id: null,
    display_phone_number: partial.display_phone_number ?? "+5549991111111",
    external_instance_id: null,
    webhook_url: null,
    public_config: partial.public_config || { department: "geral" },
    capabilities: {},
    health_status: {},
    last_health_check_at: null,
    last_error_code: null,
    last_error_message: null,
    created_at: "2026-10-01T10:00:00Z",
    updated_at: "2026-10-01T10:00:00Z",
  };
}

describe("WhatsAppQrConnectModal — Seleção Alvo & Modo Novo Canal", () => {
  const inst1 = makeInstance({
    id: "10000000-0000-4000-8000-000000000001",
    display_name: "Comercial 01",
    instance_key: "comercial_01",
    display_phone_number: "+5549991111111",
    is_default: true,
  });

  const inst2 = makeInstance({
    id: "10000000-0000-4000-8000-000000000002",
    display_name: "Suporte 02",
    instance_key: "suporte_02",
    display_phone_number: "+5549992222222",
    status: "revoked",
    is_default: false,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gera próxima chave livre canal_N sem colidir com canais existentes", () => {
    const first = getNextFreeChannelKeyAndLabel([inst1, inst2]);
    expect(first).toEqual({
      instanceKey: "canal_3",
      displayName: "WhatsApp Canal 3",
    });

    const withCanal3 = [
      inst1,
      inst2,
      makeInstance({ id: "10000000-0000-4000-8000-000000000003", instance_key: "canal_3" }),
    ];
    const second = getNextFreeChannelKeyAndLabel(withCanal3);
    expect(second).toEqual({
      instanceKey: "canal_4",
      displayName: "WhatsApp Canal 4",
    });
  });

  it("resolve targetInstanceId explicitamente para inst2 sem cair para instances[0]", () => {
    const selected = resolveWhatsAppQrModalInitialSelection({
      instances: [inst1, inst2],
      targetInstanceId: inst2.id,
      initialMode: "manage",
    });
    expect(selected.isCreatingNew).toBe(false);
    expect(selected.selectedInstanceId).toBe(inst2.id);
    expect(selected.displayName).toBe("Suporte 02");
    expect(selected.instanceKey).toBe("suporte_02");
  });

  it("entra diretamente em modo de criação ao receber initialMode='create'", () => {
    const creating = resolveWhatsAppQrModalInitialSelection({
      instances: [inst1, inst2],
      initialMode: "create",
    });
    expect(creating.isCreatingNew).toBe(true);
    expect(creating.selectedInstanceId).toBeNull();
    expect(creating.instanceKey).toBe("canal_3");
    expect(creating.displayName).toBe("WhatsApp Canal 3");
  });

  it("renderiza estado inicial de criação com valores pré-preenchidos sem colisão", () => {
    const html = renderToStaticMarkup(
      <WhatsAppQrConnectModal
        open={true}
        onOpenChange={() => {}}
        instances={[inst1, inst2]}
        onInstancesUpdated={() => {}}
        initialMode="create"
      />,
    );
    expect(html).toContain("canal_3");
    expect(html).toContain("WhatsApp Canal 3");
    expect(html).toContain("Gerar QR Code Ao Vivo");
  });

  it("renderiza o cartão específico targetInstanceId quando aberto para gerenciar segundo número", () => {
    const html = renderToStaticMarkup(
      <WhatsAppQrConnectModal
        open={true}
        onOpenChange={() => {}}
        instances={[inst1, inst2]}
        onInstancesUpdated={() => {}}
        targetInstanceId={inst2.id}
        initialMode="manage"
      />,
    );
    expect(html).toContain("Suporte 02");
    expect(html).toContain("suporte_02");
  });
});
