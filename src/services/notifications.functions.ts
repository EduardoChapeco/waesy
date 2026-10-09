import { getNicheTranslation } from "@/lib/niche-dictionary";
/**
 * notifications.functions.ts — BFF Server Functions para o Sistema Central de Notificações
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";

export type NotificationType = "interaction" | "promotion" | "opportunity" | "order" | "system" | "new_lead";

export interface NotificationItemDTO {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  avatarUrl?: string | null;
  authorName?: string | null;
  linkUrl?: string | null;
  isRead: boolean;
  createdAt: string;
}

export const listUserNotifications = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        type: z.enum(["all", "interaction", "promotion", "opportunity", "order", "system", "new_lead"]).optional(),
        limit: z.number().int().min(1).max(100).optional(),
      })
      .optional(),
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity().catch(() => null);
    const userId = identity?.id || identity?.customer_id;
    const limit = data?.limit ?? 30;

    if (!userId) {
      return [];
    }

    try {
      let query = supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (data?.type && data.type !== "all") {
        if (data.type === "interaction") {
          query = query.in("type", ["interaction", "new_lead"]);
        } else {
          query = query.eq("type", data.type);
        }
      }

      const { data: rows, error } = await query;

      if (error) {
        console.error("[notifications.functions] Erro ao buscar notificações:", error);
        return [];
      }

      if (!rows || rows.length === 0) {
        return [];
      }

      return rows.map((r: any) => {
        let linkUrl = r.link_url || null;
        if (!linkUrl && (r.type === "new_lead" || (r.title && r.title.toLowerCase().includes("lead")))) {
          linkUrl = "/conta/negociacoes";
        }
        if (linkUrl && linkUrl.startsWith("/_store/")) {
          linkUrl = linkUrl.replace(/^\/_store\//, "/");
        }
        return {
          id: r.id,
          userId: r.user_id,
          type: (r.type as NotificationType) || "system",
          title: r.title,
          message: r.message,
          avatarUrl: r.avatar_url || null,
          authorName: r.author_name || null,
          linkUrl,
          isRead: !!r.is_read,
          createdAt: r.created_at,
        };
      }) as NotificationItemDTO[];
    } catch (e) {
      console.warn("[notifications.functions] Erro ao listar notificações:", e);
      return [];
    }
  });

export const markNotificationAsRead = createServerFn({ method: "POST" })
  .validator(z.object({ notificationId: z.string() }))
  .handler(async ({ data: { notificationId } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity().catch(() => null);
    const userId = identity?.id || identity?.customer_id;
    if (!userId) return { success: false };

    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId)
        .eq("user_id", userId);

      if (error) {
        console.warn("[notifications] Falha ao marcar lida:", error.message);
        return { success: false };
      }
      return { success: true };
    } catch (e: any) {
      console.warn("[notifications] Exceção ao marcar lida:", e?.message);
      return { success: false };
    }
  });

export const markAllNotificationsAsRead = createServerFn({ method: "POST" }).handler(async () => {
  const supabase = getServerClient();
  const identity = await getServerIdentity().catch(() => null);
  const userId = identity?.id || identity?.customer_id;
  if (!userId) return { success: false };

  try {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) {
      console.warn("[notifications] Falha ao marcar todas lidas:", error.message);
      return { success: false };
    }
    return { success: true };
  } catch (e: any) {
    console.warn("[notifications] Exceção ao marcar todas lidas:", e?.message);
    return { success: false };
  }
});

// ---------------------------------------------------------------------------
// 4. MOTOR DE MICRO-COPY DE NOTIFICAÇÕES & EMAILS POR NICHO (V138 REALITY CHECK)
// ---------------------------------------------------------------------------

export type NicheNotificationEvent = "order_confirmed" | "order_pending" | "order_cancelled" | "lead_received";

export interface NicheNotificationMeta {
  code?: string;
  customerName?: string;
  itemName?: string;
  scheduledAt?: string;
  amountFormatted?: string;
}

export interface NicheNotificationTemplateResult {
  title: string;
  message: string;
  emailSubject: string;
  emailPreheader: string;
  whatsappMessage: string;
  actionLabel: string;
  actionUrl: string;
}

export function formatNicheNotification(
  nicheIdOrStore: string | any,
  eventType: NicheNotificationEvent,
  meta?: NicheNotificationMeta
): NicheNotificationTemplateResult {
  const { nicheId, terms } = getNicheTranslation(nicheIdOrStore);
  const code = meta?.code ? `#${meta.code}` : "";
  const name = meta?.customerName || terms.client;
  const item = meta?.itemName || terms.item;

  if (nicheId === "clinica" || nicheId === "services") {
    switch (eventType) {
      case "order_confirmed":
        return {
          title: "Consulta Confirmada",
          message: `Olá ${name}, seu horário para ${item} foi confirmado com sucesso.`,
          emailSubject: `Seu agendamento para ${item} foi confirmado`,
          emailPreheader: `Horário agendado no corpo clínico.`,
          whatsappMessage: `Olá ${name}! Confirmamos seu horário para ${item}. Estamos prontos para recebê-lo(a).`,
          actionLabel: "Ver Detalhes do Agendamento",
          actionUrl: "/conta/agendamentos",
        };
      case "order_cancelled":
        return {
          title: "Horário Cancelado",
          message: `O horário para ${item} foi desmarcado na grade.`,
          emailSubject: `Atualização sobre o agendamento de ${item}`,
          emailPreheader: `Horário liberado na agenda clínica.`,
          whatsappMessage: `Olá ${name}, informamos que o horário para ${item} foi cancelado conforme solicitado.`,
          actionLabel: "Reagendar Horário",
          actionUrl: "/conta/agendamentos",
        };
      default:
        return {
          title: "Novo Agendamento em Triagem",
          message: `Seu pedido de consulta para ${item} está em análise.`,
          emailSubject: `Recebemos sua solicitação de agendamento`,
          emailPreheader: `Aguarde a confirmação da recepção.`,
          whatsappMessage: `Olá ${name}, recebemos sua solicitação de agendamento e retornaremos em instantes.`,
          actionLabel: "Acompanhar Status",
          actionUrl: "/conta/agendamentos",
        };
    }
  }

  if (nicheId === "real_estate") {
    switch (eventType) {
      case "order_confirmed":
        return {
          title: "Proposta Aprovada",
          message: `Olá ${name}, a proposta para o imóvel ${item} foi aceita pelo proprietário.`,
          emailSubject: `Proposta aceita para ${item}`,
          emailPreheader: `Próxima etapa: elaboração da minuta contratual.`,
          whatsappMessage: `Parabéns ${name}! Sua proposta para o imóvel ${item} foi aceita.`,
          actionLabel: "Ver Minuta Contratual",
          actionUrl: "/conta/negociacoes",
        };
      case "lead_received":
        return {
          title: "Nova Proposta Comercial",
          message: `Uma nova proposta foi enviada para o imóvel ${item}.`,
          emailSubject: `Nova proposta recebida para ${item}`,
          emailPreheader: `Acesse o portal para analisar as condições.`,
          whatsappMessage: `Olá ${name}, você recebeu uma nova proposta no imóvel ${item}.`,
          actionLabel: "Analisar Proposta",
          actionUrl: "/conta/negociacoes",
        };
      default:
        return {
          title: "Manifestação de Interesse",
          message: `Nova visita ou interesse registrado para ${item}.`,
          emailSubject: `Atualização sobre seu imóvel ${item}`,
          emailPreheader: `Novo interessado em contato.`,
          whatsappMessage: `Olá ${name}, temos novidades sobre a captação do imóvel ${item}.`,
          actionLabel: "Acessar Ficha",
          actionUrl: "/conta/negociacoes",
        };
    }
  }

  if (nicheId === "creators") {
    return {
      title: "Acesso Liberado",
      message: `Olá ${name}, seu acesso a ${item} foi liberado com sucesso. Bons estudos!`,
      emailSubject: `Seu acesso a ${item} está disponível!`,
      emailPreheader: `Comece a assistir às aulas agora mesmo.`,
      whatsappMessage: `Boas-vindas ${name}! Seu acesso a ${item} está pronto. Aproveite o conteúdo!`,
      actionLabel: "Acessar Área de Membros",
      actionUrl: "/conta/cursos",
    };
  }

  if (nicheId === "gastronomy") {
    return {
      title: "Pedido em Preparo",
      message: `Seu pedido ${code} foi recebido e a cozinha já iniciou o preparo dos pratos.`,
      emailSubject: `Pedido ${code} confirmado na cozinha!`,
      emailPreheader: `Seu prato está sendo preparado com ingredientes frescos.`,
      whatsappMessage: `Olá ${name}! O restaurante confirmou seu pedido ${code} e já iniciou a preparação.`,
      actionLabel: "Acompanhar Pedido ao Vivo",
      actionUrl: "/conta/pedidos",
    };
  }

  // Padrão Varejo / Comércio Geral
  return {
    title: "Pedido Confirmado",
    message: `Seu pedido ${code} foi aprovado com sucesso e está em fase de separação.`,
    emailSubject: `Pedido ${code} confirmado!`,
    emailPreheader: `Obrigado por comprar conosco.`,
    whatsappMessage: `Olá ${name}, seu pedido ${code} foi confirmado com sucesso!`,
    actionLabel: "Ver Detalhes do Pedido",
    actionUrl: "/conta/pedidos",
  };
}

export const sendNicheContextualNotification = createServerFn({ method: "POST" })
  .validator(
    z.object({
      userId: z.string(),
      storeId: z.string().optional(),
      nicheId: z.string().optional(),
      eventType: z.enum(["order_confirmed", "order_pending", "order_cancelled", "lead_received"]),
      meta: z
        .object({
          code: z.string().optional(),
          customerName: z.string().optional(),
          itemName: z.string().optional(),
          scheduledAt: z.string().optional(),
          amountFormatted: z.string().optional(),
        })
        .optional(),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity().catch(() => null);

    const template = formatNicheNotification(data.nicheId || "retail", data.eventType, data.meta);

    const { data: record, error } = await supabase
      .from("notifications")
      .insert({
        user_id: data.userId,
        type: data.eventType === "lead_received" ? "new_lead" : "order",
        title: template.title,
        message: template.message,
        link_url: template.actionUrl,
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      console.warn("[notifications] Falha ao persistir notificação nichada:", error.message);
      return { success: false, template };
    }

    return {
      success: true,
      notificationId: record?.id,
      template,
    };
  });

// ---------------------------------------------------------------------------
// Canonical Notification Aliases (F16)
// ---------------------------------------------------------------------------
export const listNotificationsFn = listUserNotifications;
export const markNotificationReadFn = markNotificationAsRead;
