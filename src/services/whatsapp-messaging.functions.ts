import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { formatMoney } from "@/lib/money";

export interface StoreWhatsAppStatusDTO {
  isConfigured: boolean;
  provider?: string;
  displayName?: string;
  instanceId?: string;
}

export const checkStoreWhatsAppStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<StoreWhatsAppStatusDTO> => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"]);

    const db = getServerClient();
    const { data: instance, error } = await db
      .from("whatsapp_channel_instances")
      .select("id, display_name, provider, is_active, status")
      .eq("store_id", identity.store_id)
      .eq("is_active", true)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("[whatsapp-messaging] Erro ao consultar canais WhatsApp:", error.message);
    }

    if (instance?.id) {
      return {
        isConfigured: true,
        provider: instance.provider,
        displayName: instance.display_name,
        instanceId: instance.id,
      };
    }

    return {
      isConfigured: false,
    };
  }
);

export const dispatchDocumentSchema = z.object({
  documentType: z.enum(["budget", "invoice", "receipt", "contract", "voucher"]),
  documentId: z.string().min(1, "ID do documento obrigatório"),
  documentCode: z.string().min(1, "Código do documento obrigatório"),
  documentTitle: z.string().min(1, "Título do documento obrigatório"),
  recipientPhone: z.string().min(8, "Telefone do destinatário obrigatório"),
  recipientName: z.string().min(1, "Nome do destinatário obrigatório"),
  documentUrl: z.string().url("URL do documento inválida"),
  totalCents: z.number().int().nonnegative().optional(),
});

export type DispatchDocumentInput = z.infer<typeof dispatchDocumentSchema>;

export interface DispatchDocumentResult {
  dispatched: boolean;
  queued?: boolean;
  reason?: string;
  outboxId?: string;
  provider?: string;
  messageText?: string;
}

export const dispatchDocumentViaStoreWhatsApp = createServerFn({ method: "POST" })
  .validator(dispatchDocumentSchema)
  .handler(async ({ data }): Promise<DispatchDocumentResult> => {
    const {
      documentType,
      documentId,
      documentCode,
      documentTitle,
      recipientPhone,
      recipientName,
      documentUrl,
      totalCents,
    } = data;

    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);

    const cleanDigits = recipientPhone.replace(/\D/g, "");
    if (cleanDigits.length < 10) {
      return {
        dispatched: false,
        reason: "Telefone do destinatário deve possuir DDD e ao menos 10 dígitos.",
      };
    }

    // Normaliza telefone para formato internacional E.164 (se Brasil e sem 55, prefixa)
    const normalizedPhone =
      cleanDigits.startsWith("55") && cleanDigits.length >= 12
        ? `+${cleanDigits}`
        : cleanDigits.length <= 11
        ? `+55${cleanDigits}`
        : `+${cleanDigits}`;

    const db = getServerClient();

    // 1. Verifica instância ativa da loja
    const { data: instance } = await db
      .from("whatsapp_channel_instances")
      .select("id, display_name, provider, is_active")
      .eq("store_id", identity.store_id)
      .eq("is_active", true)
      .order("is_default", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!instance?.id) {
      return {
        dispatched: false,
        reason:
          "Nenhuma instância de WhatsApp oficial conectada para este estabelecimento. Utilize o disparo via WhatsApp Web manual.",
      };
    }

    // 2. Monta mensagem humanizada e segura conforme tipo de documento
    const docLabels: Record<typeof documentType, string> = {
      budget: "orçamento comercial",
      invoice: "fatura de cobrança",
      receipt: "recibo de quitação",
      contract: "contrato de prestação de serviços",
      voucher: "voucher oficial de embarque",
    };

    const label = docLabels[documentType] || "documento";
    const valueStr = totalCents !== undefined && totalCents > 0 ? ` no valor de ${formatMoney(totalCents)}` : "";

    const messageText = `Olá ${recipientName}! Segue o link seguro para visualizar o seu ${label} ${documentCode}${valueStr}:\n\n${documentUrl}\n\nQualquer dúvida, estamos à total disposição!`;

    // 3. Enfileira na fila de outbox oficial (whatsapp_outbox)
    const idempotencyKey = `doc-dispatch:${documentType}:${documentId}:${Date.now()}`;

    const { data: outboxRow, error: outboxErr } = await db
      .from("whatsapp_outbox")
      .upsert(
        {
          store_id: identity.store_id,
          channel_instance_id: instance.id,
          provider: instance.provider,
          idempotency_key: idempotencyKey,
          recipient_phone: normalizedPhone,
          message_type: "text",
          payload: {
            text: messageText,
            document_type: documentType,
            document_id: documentId,
            document_code: documentCode,
            document_title: documentTitle,
            document_url: documentUrl,
            total_cents: totalCents || 0,
          },
          status: "pending",
          attempts: 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "store_id,idempotency_key" }
      )
      .select("id, status, provider")
      .single();

    if (outboxErr || !outboxRow?.id) {
      return {
        dispatched: false,
        reason: `Falha ao enfileirar mensagem no WhatsApp Outbox: ${outboxErr?.message || "Erro desconhecido"}`,
      };
    }

    return {
      dispatched: true,
      queued: true,
      outboxId: outboxRow.id,
      provider: outboxRow.provider,
      messageText,
    };
  });
