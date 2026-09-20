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
          linkUrl = "/_store/conta/negociacoes";
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
