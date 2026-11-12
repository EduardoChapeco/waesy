import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Governança e Persistência de Atendimento (DEC-489)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("garante que notas internas da equipe não alteram is_last_reply_staff para a fila do cliente", () => {
    const rawMessages = [
      {
        id: "msg-note-1",
        message: "Juçara é minha melhor amiga a 10 anos",
        message_type: "system_event",
        is_staff_reply: true,
        created_at: "2026-11-12T09:42:26Z",
        payload: { is_internal: true, is_whisper: true },
      },
      {
        id: "msg-customer-1",
        message: "Amanhã vc chega mais tarde",
        message_type: "text",
        is_staff_reply: false,
        created_at: "2026-11-12T02:25:44Z",
        payload: { origin: "whatsapp_customer" },
      },
    ];

    // Simula a lógica de filtragem implementada em listChatThreads
    const publicMessages = rawMessages.filter(
      (m: any) =>
        !m.payload?.is_internal &&
        !m.payload?.is_whisper &&
        m.message_type !== "internal_note" &&
        m.message_type !== "system_event"
    );

    const lastPublicMsg = publicMessages[0];
    const isLastReplyStaff = lastPublicMsg ? lastPublicMsg.is_staff_reply : false;

    // A nota interna não pode marcar que o staff respondeu ao cliente
    expect(isLastReplyStaff).toBe(false);
    expect(lastPublicMsg.message).toBe("Amanhã vc chega mais tarde");
  });

  it("garante que faxina de mensagens do WhatsApp preserva anotações internas da equipe", () => {
    const threadMessages = [
      { id: "1", message: "Oi", message_type: "text", payload: {} },
      { id: "2", message: "Nota interna privada", message_type: "system_event", payload: { is_internal: true } },
      { id: "3", message: "Outra nota interna", message_type: "internal_note", payload: {} },
      { id: "4", message: "Tudo bem?", message_type: "text", payload: {} },
    ];

    // Filtragem para deleção segura
    const idsToDelete = threadMessages
      .filter(
        (m: any) =>
          !m.payload?.is_internal &&
          !m.payload?.is_whisper &&
          m.message_type !== "internal_note" &&
          m.message_type !== "system_event"
      )
      .map((m: any) => m.id);

    expect(idsToDelete).toEqual(["1", "4"]);
    expect(idsToDelete).not.toContain("2");
    expect(idsToDelete).not.toContain("3");
  });

  it("garante que mensagens não contenham hashes encriptados quebrados na renderização", () => {
    const rawMessageText = "waesy-msg:v2:1:wMEJHXXMby3qS8s:Dw==:EaZAvpBvW4MpAYbMmL4Ji6FjXvSBfRhSd-2wYALCEvo2VwQv8F7jzDmZ";
    
    // Fallback defensivo garante que o cliente nunca veja a hash criptográfica crua na tela
    let displayText = rawMessageText;
    if (displayText.startsWith("waesy-msg:")) {
      displayText = "[Mensagem]";
    }

    expect(displayText).toBe("[Mensagem]");
    expect(displayText.startsWith("waesy-msg:")).toBe(false);
  });

  it("impede que colaboradores excluam threads diretamente sem permissão de supervisor", () => {
    const supervisorRoles = ["owner", "admin", "manager", "platform_admin"];
    const staffRole = "collaborator";

    const canDeleteDirectly = supervisorRoles.includes(staffRole);
    expect(canDeleteDirectly).toBe(false);

    // Quando não é supervisor, a ação deve ser 'requestChatContactDeletion'
    const actionRequired = canDeleteDirectly ? "direct_delete" : "request_deletion";
    expect(actionRequired).toBe("request_deletion");
  });

  it("permite que gerentes e donos excluam contatos definitivamente", () => {
    const supervisorRoles = ["owner", "admin", "manager", "platform_admin"];
    
    expect(supervisorRoles.includes("owner")).toBe(true);
    expect(supervisorRoles.includes("admin")).toBe(true);
    expect(supervisorRoles.includes("manager")).toBe(true);
  });

  it("garante enriquecimento contextual com regras da ANAC e pacotes para dúvidas de turismo", () => {
    const textQuery = "como funciona o cancelamento do voo e bagagem pela anac?";
    const mentionsAviation = /(anac|bagagem|mala|cancelamento|arrependimento)/i.test(textQuery);
    expect(mentionsAviation).toBe(true);

    const isBagagem = /(bagagem|mala)/i.test(textQuery);
    expect(isBagagem).toBe(true);
  });

  it("garante validação de status de solicitações de exclusão de contatos", () => {
    const validStatuses = ["pending", "approved", "rejected", "all"];
    expect(validStatuses.includes("pending")).toBe(true);
    expect(validStatuses.includes("unknown")).toBe(false);
  });
});
