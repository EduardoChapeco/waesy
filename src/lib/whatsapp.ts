/**
 * whatsapp.ts — Utilitário Canônico de Telemetria e Redirecionamento de WhatsApp Rastreável
 */

import { recordWhatsAppLead, getProtectedWhatsAppContact } from "@/services/whatsapp-leads.functions";
import { toast } from "sonner";

export interface TrackWhatsAppLeadParams {
 phone: string;
 storeId?: string | null;
 entityType:
 | "store"
 | "product"
 | "classified"
 | "job"
 | "tourism"
 | "directory"
 | "event"
 | "quote"
 | "custom"
 | "feed"
 | "noticias"
 | "agenda"
 | "eventos"
 | "empregos"
 | "places"
    | "classifieds"
 | "afiliados"
 | "concursos";
 entityId?: string | null;
 entityTitle?: string | null;
 customMessage?: string;
 message?: string;
 niche?: string;
 metadata?: Record<string, any>;
}

/**
 * Sanitiza e formata o telefone garantindo DDI 55 (Brasil) caso não especificado
 */
export function sanitizeWhatsAppPhone(phone: string): string {
 const digits = phone.replace(/\D/g, "");
 if (!digits) return "";
 if (digits.length === 10 || digits.length === 11) {
 return `55${digits}`;
 }
 return digits;
}

/**
 * Gera mensagem contextual inteligente com injeção do código de lead rastreável
 */
export function buildTrackedWhatsAppMessage({
 entityType,
 entityTitle,
 customMessage,
 leadCode,
}: {
 entityType: string;
 entityTitle?: string | null;
 customMessage?: string;
 leadCode: string;
}): string {
 if (customMessage) {
 return `${customMessage.trim()}\n\nRef: #${leadCode}`;
 }

 switch (entityType) {
 case "product":
 return `Olá! Vi o produto "${entityTitle || "anunciado"}" no Waesy e gostaria de mais informações sobre disponibilidade e entrega.\n\nRef: #${leadCode}`;
 case "classified":
 return `Olá! Vi seu anúncio "${entityTitle || "no Waesy"}" e tenho interesse. Ainda está disponível?\n\nRef: #${leadCode}`;
 case "job":
 return `Olá! Vi a oportunidade "${entityTitle || "de emprego"}" no portal Waesy e gostaria de me candidatar.\n\nRef: #${leadCode}`;
 case "tourism":
 return `Olá! Vi a atração/pousada "${entityTitle || "no Waesy"}" e gostaria de consultar tarifas e reservas.\n\nRef: #${leadCode}`;
 case "directory":
 case "store":
 return `Olá! Encontrei o perfil de vocês no guia Waesy e gostaria de fazer um orçamento.\n\nRef: #${leadCode}`;
 default:
 return `Olá! Vi o anúncio "${entityTitle || "no Waesy"}" e gostaria de mais detalhes.\n\nRef: #${leadCode}`;
 }
}

export async function trackAndOpenWhatsApp(
  paramsOrPhone: TrackWhatsAppLeadParams | string,
  legacyMessage?: string,
  legacyMetadata?: Record<string, any>
) {
  let params: TrackWhatsAppLeadParams;
  if (typeof paramsOrPhone === "string") {
    params = {
      phone: paramsOrPhone,
      entityType: (legacyMetadata?.action === "job_quick_whatsapp" ? "job" : "classified") as any,
      entityId: legacyMetadata?.classifiedId || legacyMetadata?.entityId || null,
      entityTitle: legacyMetadata?.classifiedTitle || legacyMetadata?.entityTitle || null,
      customMessage: legacyMessage,
      metadata: legacyMetadata,
    };
  } else {
    params = paramsOrPhone;
  }

  const cleanPhone = sanitizeWhatsAppPhone(params.phone);
  if (!cleanPhone) {
    console.warn("[whatsapp] Telefone não informado para abertura de WhatsApp");
    return;
  }

  let originUrl: string | null = null;
  if (typeof window !== "undefined") {
    originUrl = window.location.href;
  }

  try {
    // Validação estrita server-side: visitante DEVE estar logado
    const check = await getProtectedWhatsAppContact({
      data: {
        phone: cleanPhone,
        store_id: params.storeId || null,
        entity_type: params.entityType as any,
        entity_id: params.entityId || null,
        entity_title: params.entityTitle || null,
        custom_message: params.customMessage || params.message || null,
        origin_url: originUrl,
        niche: params.niche || null,
      },
    });

    if (!check.authorized) {
      toast.error("🔒 Contato Protegido", {
        description: check.message || "Faça login para contatar este anunciante pelo WhatsApp.",
        action: typeof window !== "undefined" ? {
          label: "Entrar",
          onClick: () => {
            const current = window.location.pathname + window.location.search;
            window.location.href = `/entrar?redirect=${encodeURIComponent(current)}`;
          },
        } : undefined,
      });

      // Se em navegador, pode redirecionar se o usuário confirmar
      return { authorized: false, reason: "login_required" };
    }

    if (check.targetUrl && typeof window !== "undefined") {
      // Dispara telemetria de conversão (Meta Pixel client-side)
      if (typeof (window as any).fbq === "function") {
        (window as any).fbq("track", "Contact", {
          content_name: params.entityTitle,
          content_category: params.entityType,
        });
      }

      // Dispara telemetria server-side (Meta CAPI) se vinculado a uma loja
      if (params.storeId) {
        import("@/services/pixels.functions")
          .then(({ dispatchMetaCapiEvent }) => {
            dispatchMetaCapiEvent({
              data: {
                storeId: params.storeId!,
                eventName: "Contact",
                eventSourceUrl: originUrl || undefined,
                customData: {
                  entity_type: params.entityType,
                  entity_title: params.entityTitle || undefined,
                  lead_code: check.leadCode,
                },
              },
            }).catch(() => {});
          })
          .catch(() => {});
      }

      window.open(check.targetUrl, "_blank", "noopener,noreferrer");
      return { authorized: true, leadCode: check.leadCode };
    }
  } catch (err: any) {
    console.warn("[whatsapp] Falha na verificação de contato:", err);
    toast.error("Erro ao acessar contato: Faça login para prosseguir.");
  }
}

// ---------------------------------------------------------------------------
// Formatador Canônico de Recibos / Despacho de Pedidos para WhatsApp
// ---------------------------------------------------------------------------

export interface StructuredOrderItem {
 name: string;
 qty: number;
 unitPriceCents: number;
 selectedOptions?: string[];
}

export interface StructuredOrderWhatsAppParams {
 orderToken: string;
 customerName?: string;
 items: StructuredOrderItem[];
 subtotalCents?: number;
 shippingCents?: number;
 tipCents?: number;
 discountCents?: number;
 totalCents: number;
 paymentMethodText: string;
 deliveryAddress?: string;
 deliveryMethodText?: string;
 tableNumber?: string;
 storeName?: string;
}

export function buildStructuredOrderWhatsAppMessage(params: StructuredOrderWhatsAppParams): string {
 const formatMoney = (cents: number) => {
 return new Intl.NumberFormat("pt-BR", {
 style: "currency",
 currency: "BRL",
 }).format(cents / 100);
 };

 const lines: string[] = [];

 // Cabeçalho
 lines.push(`📦 *Novo Pedido #${params.orderToken.toUpperCase()}*`);
 if (params.storeName) lines.push(`🏪 ${params.storeName}`);
 if (params.customerName) lines.push(`👤 Cliente: ${params.customerName}`);
 if (params.tableNumber) lines.push(`🪑 Mesa / Comanda: ${params.tableNumber}`);
 if (params.deliveryMethodText) lines.push(`🚚 Tipo: ${params.deliveryMethodText}`);
 lines.push("");

 // Lista de Itens
 lines.push("*Itens do Pedido:*");
 for (const item of params.items) {
 const itemTotal = item.qty * item.unitPriceCents;
 lines.push(`• ${item.qty}x ${item.name} (${formatMoney(itemTotal)})`);
 if (item.selectedOptions && item.selectedOptions.length > 0) {
 lines.push(` ↳ ${item.selectedOptions.join(", ")}`);
 }
 }
 lines.push("");

 // Detalhes Financeiros
 if (params.shippingCents && params.shippingCents > 0) {
 lines.push(`Entrega/Frete: ${formatMoney(params.shippingCents)}`);
 }
 if (params.tipCents && params.tipCents > 0) {
 lines.push(`Taxa de Serviço: ${formatMoney(params.tipCents)}`);
 }
 if (params.discountCents && params.discountCents > 0) {
 lines.push(`Desconto: -${formatMoney(params.discountCents)}`);
 }

 lines.push(`💳 *Método de Pagamento:* ${params.paymentMethodText}`);
 lines.push(`💰 *Total:* ${formatMoney(params.totalCents)}`);

 if (params.deliveryAddress) {
 lines.push("");
 lines.push(`📍 *Endereço de Entrega:* ${params.deliveryAddress}`);
 }

 return lines.join("\n");
}

/**
 * Gera mensagem profissional para envio da Proposta de Viagem Interativa
 */
export function buildProposalWhatsAppMessage({
  clientName,
  destinationCity,
  agencyName,
  proposalUrl,
  optionsCount = 1,
}: {
  clientName: string;
  destinationCity: string;
  agencyName: string;
  proposalUrl: string;
  optionsCount?: number;
}): string {
  const lines: string[] = [
    `✈️ *Proposta de Viagem Exclusiva · ${destinationCity}*`,
    `Olá, *${clientName}*! Preparamos seu roteiro personalizado com muito carinho pela *${agencyName}*.`,
    "",
    optionsCount > 1
      ? `📋 Incluímos *${optionsCount} opções de cotação* comparativas com voos, hospedagem e valores para você escolher a melhor alternativa.`
      : `📋 Seu roteiro detalhado com malha aérea, hotel selecionado e condições especiais já está pronto!`,
    "",
    `🔗 *Acesse sua proposta interativa:*`,
    proposalUrl,
    "",
    `🤖 Dentro da proposta você conta com nosso *Consultor Inteligente* para tirar dúvidas instantâneas, além de poder confirmar sua reserva diretamente!`,
  ];
  return lines.join("\n");
}

/**
 * Gera mensagem oficial para Assinatura do Contrato Digital de Viagem
 */
export function buildContractWhatsAppMessage({
  clientName,
  destinationCity,
  agencyName,
  contractUrl,
}: {
  clientName: string;
  destinationCity: string;
  agencyName: string;
  contractUrl: string;
}): string {
  const lines: string[] = [
    `📝 *Contrato de Prestação de Serviços Turísticos · ${destinationCity}*`,
    `Olá, *${clientName}*! Seu contrato com a *${agencyName}* está pronto para assinatura digital.`,
    "",
    `🔒 O processo é 100% eletrônico, seguro e com validade jurídica nacional (ICP-Brasil / MP 2.200-2).`,
    "",
    `✍️ *Assine agora em seu celular:*`,
    contractUrl,
    "",
    `Após a assinatura, você receberá a via com certificado de autenticidade e hash criptográfico SHA-256.`,
  ];
  return lines.join("\n");
}

/**
 * Gera mensagem de lembrete de parcela de Carnê / Boleto
 */
export function buildBoletoCarnesWhatsAppMessage({
  clientName,
  destinationCity,
  installmentNumber,
  totalInstallments,
  dueDate,
  amountFormatted,
  digitableLine,
  carnesUrl,
}: {
  clientName: string;
  destinationCity: string;
  installmentNumber: number;
  totalInstallments: number;
  dueDate: string;
  amountFormatted: string;
  digitableLine?: string;
  carnesUrl?: string;
}): string {
  const lines: string[] = [
    `🎫 *Lembrete de Carnê de Viagem · ${destinationCity}*`,
    `Olá, *${clientName}*! Seguem os dados para pagamento da sua parcela:`,
    "",
    `📌 *Parcela:* ${installmentNumber} de ${totalInstallments}`,
    `📅 *Vencimento:* ${dueDate}`,
    `💰 *Valor:* ${amountFormatted}`,
  ];

  if (digitableLine) {
    lines.push("");
    lines.push(`🔢 *Linha Digitável (Copie e Cole no App do seu Banco):*`);
    lines.push(`\`${digitableLine}\``);
  }

  if (carnesUrl) {
    lines.push("");
    lines.push(`📱 *Acompanhe suas parcelas no app:* ${carnesUrl}`);
  }

  return lines.join("\n");
}


