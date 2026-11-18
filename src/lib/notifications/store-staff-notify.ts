import type { SupabaseClient } from "@supabase/supabase-js";

export interface NotifyStoreStaffInput {
  db: SupabaseClient<any, "public", any>;
  storeId: string;
  type: "order" | "new_lead" | "interaction" | "system";
  title: string;
  message: string;
  linkUrl?: string | null;
  authorName?: string | null;
}

/**
 * Notifica dono e membros ativos da loja na tabela `notifications` (alimenta NotificationBell em tempo real).
 * Nunca propaga exceção para não bloquear o fluxo transacional principal.
 */
export async function notifyStoreStaff({
  db,
  storeId,
  type,
  title,
  message,
  linkUrl = null,
  authorName = null,
}: NotifyStoreStaffInput): Promise<void> {
  if (!storeId) return;
  try {
    const recipientIds = new Set<string>();

    const { data: storeRow } = await db
      .from("stores")
      .select("owner_id")
      .eq("id", storeId)
      .maybeSingle();

    if (storeRow?.owner_id) {
      recipientIds.add(String(storeRow.owner_id));
    }

    const { data: memberRows } = await db
      .from("store_members")
      .select("user_id, profile_id")
      .eq("store_id", storeId);

    if (Array.isArray(memberRows)) {
      for (const m of memberRows) {
        if (m?.user_id) recipientIds.add(String(m.user_id));
        if (m?.profile_id) recipientIds.add(String(m.profile_id));
      }
    }

    if (recipientIds.size === 0) return;

    const rows = Array.from(recipientIds).map((userId) => ({
      user_id: userId,
      type,
      title,
      message,
      link_url: linkUrl,
      author_name: authorName,
      is_read: false,
    }));

    const { error } = await db.from("notifications").insert(rows);
    if (error) {
      console.warn("[notifyStoreStaff] Falha ao inserir notificações:", error.message);
    }
  } catch (err: any) {
    console.warn("[notifyStoreStaff] Exceção ignorada:", err?.message || err);
  }
}
