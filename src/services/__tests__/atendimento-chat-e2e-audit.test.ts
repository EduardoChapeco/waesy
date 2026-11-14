import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/crypto-vault.server", () => ({
  decryptSecret: (value: string) => value,
}));

import {
  classifyChatFile,
  extensionForMime,
  resolveNormalizedMimeType,
  extractSafeExtension,
  formatAttachmentBytes,
  extractFilesFromClipboardData,
  hasExternalFilesInDragEvent,
  isSyntheticMetaLid,
} from "@/lib/chat-media-attachment";
import {
  sendStaffMessageSchema,
  buildOutboxDispatchSpecFromStaffMessage,
} from "@/services/chat.functions";
import {
  sendWithWhatsAppAdapter,
  type OutboundInstance,
} from "@/services/whatsapp-outbound-adapters.server";

const THREAD_UUID = "00000000-0000-4000-8000-000000000010";

const createAdapterInstance = (
  provider: OutboundInstance["provider"],
  secret: Record<string, unknown>,
  extra: Partial<OutboundInstance> = {},
): OutboundInstance => ({
  id: "00000000-0000-4000-8000-000000000001",
  store_id: "00000000-0000-4000-8000-000000000002",
  provider,
  instance_key: "waesy-chat-e2e",
  external_instance_id: null,
  phone_number_id: null,
  public_config: {},
  secret_payload_encrypted: JSON.stringify(secret),
  ...extra,
});

describe("Atendimento Chat E2E — Upload Universal, Ctrl+V, Drag & Drop e Outbox", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Classificação universal de arquivos e normalização de MIME", () => {
    it("identifica imagens, GIFs animados, PDFs, planilhas, vídeos, áudios e binários genéricos", () => {
      const gif = classifyChatFile({ name: "promo.gif", type: "image/gif" });
      expect(gif).toMatchObject({ kind: "gif", outboundMessageType: "image", mimeType: "image/gif", extension: "gif" });

      const png = classifyChatFile({ name: "print.png", type: "image/png" });
      expect(png).toMatchObject({ kind: "image", outboundMessageType: "image", mimeType: "image/png", extension: "png" });

      const pdfFromOctet = classifyChatFile({ name: "Contrato-Viagem.pdf", type: "application/octet-stream" });
      expect(pdfFromOctet).toMatchObject({
        kind: "document",
        outboundMessageType: "document",
        mimeType: "application/pdf",
        extension: "pdf",
        label: "PDF",
      });

      const xlsx = classifyChatFile({ name: "tarifario.xlsx", type: "" });
      expect(xlsx).toMatchObject({
        kind: "document",
        outboundMessageType: "document",
        extension: "xlsx",
        label: "Planilha",
      });

      const mp3 = classifyChatFile({ name: "gravacao.mp3", type: "audio/mpeg" });
      expect(mp3).toMatchObject({ kind: "audio", outboundMessageType: "audio", extension: "mp3" });

      const mp4 = classifyChatFile({ name: "roteiro.mp4", type: "video/mp4" });
      expect(mp4).toMatchObject({ kind: "video", outboundMessageType: "video", extension: "mp4" });

      const unknownExt = classifyChatFile({ name: "remessa.rem", type: "application/octet-stream" });
      expect(unknownExt).toMatchObject({
        kind: "document",
        outboundMessageType: "document",
        mimeType: "application/octet-stream",
      });
    });

    it("remove parâmetros codecs do MIME type e formata tamanhos de arquivo", () => {
      expect(resolveNormalizedMimeType("audio/ogg; codecs=opus", "voz.ogg")).toBe("audio/ogg");
      expect(extensionForMime("audio/ogg; codecs=opus", "voz.ogg")).toBe("ogg");
      expect(extractSafeExtension("  minha.planilha.XLSX ")).toBe("xlsx");
      expect(formatAttachmentBytes(0)).toBe("0 KB");
      expect(formatAttachmentBytes(512)).toBe("512 B");
      expect(formatAttachmentBytes(2048)).toBe("2 KB");
      expect(formatAttachmentBytes(2.5 * 1024 * 1024)).toBe("2.5 MB");
    });
  });

  describe("Área de Transferência (Ctrl+V) e Drag & Drop Externo", () => {
    it("extrai arquivos colados com Ctrl+V normalizando prints genéricos e evitando duplicação entre items e files", () => {
      const screenshotBlob = new File([new Uint8Array([137, 80, 78, 71])], "image.png", {
        type: "image/png",
        lastModified: 1700000000000,
      });
      const pdfFile = new File([new Uint8Array([37, 80, 68, 70])], "voucher.pdf", {
        type: "application/pdf",
        lastModified: 1700000000100,
      });

      const extracted = extractFilesFromClipboardData({
        items: [
          { kind: "file", getAsFile: () => screenshotBlob } as unknown as DataTransferItem,
          { kind: "string", getAsFile: () => null } as unknown as DataTransferItem,
        ] as unknown as DataTransferItemList,
        files: [screenshotBlob, pdfFile] as unknown as FileList,
      });

      expect(extracted).toHaveLength(2);
      expect(extracted[0].name).toMatch(/^colado-\d+-1\.png$/);
      expect(extracted[1].name).toBe("voucher.pdf");
    });

    it("detecta exclusivamente arrastes com arquivos externos (ignora seleção interna de texto)", () => {
      expect(
        hasExternalFilesInDragEvent({
          types: ["Files"],
          items: [] as unknown as DataTransferItemList,
        }),
      ).toBe(true);

      expect(
        hasExternalFilesInDragEvent({
          types: ["text/plain", "text/html"],
          items: [{ kind: "string" } as DataTransferItem] as unknown as DataTransferItemList,
        }),
      ).toBe(false);
    });

    it("garante comportamento determinístico do hover de 380ms para abrir conversa durante drag", () => {
      vi.useFakeTimers();
      let activeId = "thread-a";
      let timer: ReturnType<typeof setTimeout> | null = null;

      const onEnterThread = (targetId: string) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          activeId = targetId;
        }, 380);
      };
      const onLeaveThread = () => {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      };

      onEnterThread("thread-b");
      vi.advanceTimersByTime(250);
      expect(activeId).toBe("thread-a");
      onLeaveThread();
      vi.advanceTimersByTime(300);
      expect(activeId).toBe("thread-a");

      onEnterThread("thread-c");
      vi.advanceTimersByTime(380);
      expect(activeId).toBe("thread-c");
    });
  });

  describe("Proteção contra exibição falsa de Meta @lid como telefone", () => {
    it("identifica Meta @lid puro sem telefone E164 real e preserva números reais com alt JID", () => {
      expect(isSyntheticMetaLid("82424734212173@lid", "+82424734212173", {})).toBe(true);
      expect(isSyntheticMetaLid("82424734212173", "82424734212173", null)).toBe(true);

      expect(
        isSyntheticMetaLid("82424734212173@lid", "+5549999999999", {
          whatsapp_jid_alt: "5549999999999@s.whatsapp.net",
        }),
      ).toBe(false);
      expect(isSyntheticMetaLid("5549999999999@s.whatsapp.net", "+5549999999999", {})).toBe(false);
    });
  });

  describe("Contrato BFF (Schema + Outbox Spec + Adaptadores WhatsApp)", () => {
    it("aceita envio com anexo sem legenda de texto e rejeita payload totalmente vazio", () => {
      const validFileOnly = sendStaffMessageSchema.safeParse({
        threadId: THREAD_UUID,
        message: "",
        message_type: "document",
        attachments: ["https://cdn.waesy.com.br/post-media/proposta.pdf"],
        payload: { file_name: "proposta.pdf", mime_type: "application/pdf" },
      });
      expect(validFileOnly.success).toBe(true);

      const emptyRejected = sendStaffMessageSchema.safeParse({
        threadId: THREAD_UUID,
        message: "   ",
        message_type: "text",
        attachments: [],
      });
      expect(emptyRejected.success).toBe(false);
    });

    it("monta dispatch spec correto para GIF, PDF e arquivo de áudio vs PTT", () => {
      const gifSpec = buildOutboxDispatchSpecFromStaffMessage(
        {
          message: "",
          message_type: "image",
          attachments: ["https://cdn.waesy.com.br/anim.gif"],
          payload: { file_name: "anim.gif", mime_type: "image/gif" },
        },
        "msg-gif",
      );
      expect(gifSpec.messageType).toBe("image");
      expect(gifSpec.payload).toMatchObject({
        media_url: "https://cdn.waesy.com.br/anim.gif",
        mime_type: "image/gif",
        file_name: "anim.gif",
      });
      expect(gifSpec.payload.caption).toBeUndefined();

      const pdfSpec = buildOutboxDispatchSpecFromStaffMessage(
        {
          message: "Segue a fatura em PDF.",
          message_type: "document",
          attachments: ["https://cdn.waesy.com.br/fatura.pdf"],
          payload: { file_name: "fatura.pdf", mime_type: "application/pdf" },
        },
        "msg-pdf",
      );
      expect(pdfSpec.messageType).toBe("document");
      expect(pdfSpec.payload).toMatchObject({
        media_url: "https://cdn.waesy.com.br/fatura.pdf",
        file_name: "fatura.pdf",
        mime_type: "application/pdf",
        caption: "Segue a fatura em PDF.",
      });

      const uploadedAudioFileSpec = buildOutboxDispatchSpecFromStaffMessage(
        {
          message: "",
          message_type: "audio",
          attachments: ["https://cdn.waesy.com.br/trilha.mp3"],
          payload: { file_name: "trilha.mp3", mime_type: "audio/mpeg" },
        },
        "msg-mp3",
      );
      expect(uploadedAudioFileSpec.messageType).toBe("audio");
      expect(uploadedAudioFileSpec.payload.voice_note).not.toBe(true);

      const pttSpec = buildOutboxDispatchSpecFromStaffMessage(
        {
          message: "[Áudio]",
          message_type: "audio",
          attachments: ["https://cdn.waesy.com.br/voz.ogg"],
          payload: { is_ptt: true },
        },
        "msg-ptt",
      );
      expect(pttSpec.messageType).toBe("audio");
      expect(pttSpec.payload.voice_note).toBe(true);
    });

    it("envia GIF com gifPlayback=true na Evolution e preserva @g.us / @lid sem mutilar", async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ key: { id: "evo-gif-1" } }), { status: 201 }),
      );
      vi.stubGlobal("fetch", fetchMock);

      await sendWithWhatsAppAdapter(
        createAdapterInstance("evolution_api", { api_key: "evo-key", base_url: "https://evo.example" }),
        {
          recipientPhone: "82424734212173@lid",
          messageType: "image",
          payload: {
            media_url: "https://cdn.example/anim.gif",
            mime_type: "image/gif",
            file_name: "anim.gif",
          },
        },
      );

      expect(fetchMock).toHaveBeenCalledWith(
        "https://evo.example/message/sendMedia/waesy-chat-e2e",
        expect.objectContaining({
          body: JSON.stringify({
            number: "82424734212173@lid",
            mediatype: "image",
            media: "https://cdn.example/anim.gif",
            mimetype: "image/gif",
            fileName: "anim.gif",
            gifPlayback: true,
          }),
        }),
      );
    });

    it("envia imagem e documento pela Meta Cloud API usando phone_number_id e access_token", async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ messages: [{ id: "wamid.HBgM" }] }), { status: 200 }),
      );
      vi.stubGlobal("fetch", fetchMock);

      const res = await sendWithWhatsAppAdapter(
        createAdapterInstance(
          "meta_cloud_api",
          { access_token: "meta-tok", phone_number_id: "99887766" },
          { phone_number_id: "99887766" },
        ),
        {
          recipientPhone: "+5549999999999",
          messageType: "document",
          payload: {
            media_url: "https://cdn.example/contrato.pdf",
            file_name: "contrato.pdf",
            caption: "Contrato anexo",
          },
        },
      );

      expect(res.externalMessageId).toBe("wamid.HBgM");
      expect(fetchMock).toHaveBeenCalledWith(
        "https://graph.facebook.com/v20.0/99887766/messages",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: "+5549999999999",
            type: "document",
            document: {
              link: "https://cdn.example/contrato.pdf",
              caption: "Contrato anexo",
              filename: "contrato.pdf",
            },
          }),
        }),
      );
    });
  });
});
