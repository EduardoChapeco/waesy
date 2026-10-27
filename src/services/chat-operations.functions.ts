/**
 * chat-operations.functions.ts — BFF Server Functions para Operações Avançadas de Atendimento
 * Quick Answers (Macros), Tags/Kanban de Tickets e Agendamento de Mensagens WhatsApp
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient, SupabaseUnconfiguredError } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess, STAFF_ROLES } from "@/lib/server-access";

// ============================================================
// Schemas
// ============================================================

export const listQuickAnswersSchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
});

export const createQuickAnswerSchema = z.object({
  shortcut: z.string().min(1).max(50),
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(2000),
  category: z.string().default("geral"),
  media_url: z.string().url().optional().nullable(),
});

export const deleteQuickAnswerSchema = z.object({
  id: z.string().uuid(),
});

export const listTagsSchema = z.object({
  is_kanban_column: z.boolean().optional(),
});

export const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  color_hex: z.string().min(2).default("primary"),
  is_kanban_column: z.boolean().default(false),
  kanban_order: z.number().int().default(0),
});

export const assignTagSchema = z.object({
  threadId: z.string().uuid(),
  tagId: z.string().uuid(),
});

export const removeTagSchema = z.object({
  threadId: z.string().uuid(),
  tagId: z.string().uuid(),
});

export const scheduleMessageSchema = z.object({
  threadId: z.string().uuid().optional().nullable(),
  recipientPhone: z.string().min(8),
  messageText: z.string().min(1).max(2000),
  scheduledFor: z.string().datetime(),
});

export const cancelScheduledMessageSchema = z.object({
  id: z.string().uuid(),
});

// ============================================================
// 1. Respostas Rápidas / Macros
// ============================================================

export const listStoreQuickAnswers = createServerFn({ method: "GET" })
  .validator(listQuickAnswersSchema.optional())
  .handler(async ({ data }) => {
    try {
      const identity = await getServerIdentity();
      assertStoreAccess(identity, STAFF_ROLES, identity.store_id);
      const db = getServerClient();

      let query = db
        .from("store_quick_answers")
        .select("id, store_id, shortcut, title, message, category, media_url, created_at, updated_at")
        .eq("store_id", identity.store_id)
        .order("shortcut", { ascending: true });

      if (data?.category && data.category !== "all") {
        query = query.eq("category", data.category);
      }

      if (data?.search && data.search.trim()) {
        const term = `%${data.search.trim().toLowerCase()}%`;
        query = query.or(`shortcut.ilike.${term},title.ilike.${term},message.ilike.${term}`);
      }

      const { data: items, error } = await query;
      if (error) throw error;
      return items || [];
    } catch (e: any) {
      if (e instanceof SupabaseUnconfiguredError) throw e;
      console.warn("[chat-operations] listStoreQuickAnswers error:", e?.message || e);
      return [];
    }
  });

export const createStoreQuickAnswer = createServerFn({ method: "POST" })
  .validator(createQuickAnswerSchema)
  .handler(async ({ data: input }) => {
    try {
      const identity = await getServerIdentity();
      assertStoreAccess(identity, STAFF_ROLES, identity.store_id);
      const db = getServerClient();

      const cleanShortcut = input.shortcut.replace(/^\//, "").toLowerCase().trim();

      const { data: item, error } = await db
        .from("store_quick_answers")
        .upsert(
          {
            store_id: identity.store_id,
            shortcut: cleanShortcut,
            title: input.title.trim(),
            message: input.message.trim(),
            category: input.category || "geral",
            media_url: input.media_url || null,
            created_by: identity.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "store_id,shortcut" }
        )
        .select()
        .single();

      if (error) throw error;
      return item;
    } catch (e: any) {
      if (e instanceof SupabaseUnconfiguredError) throw e;
      console.error("[chat-operations] createStoreQuickAnswer error:", e);
      throw new Error(e?.message || "Erro ao salvar resposta rápida.");
    }
  });

export const deleteStoreQuickAnswer = createServerFn({ method: "POST" })
  .validator(deleteQuickAnswerSchema)
  .handler(async ({ data: { id } }) => {
    try {
      const identity = await getServerIdentity();
      assertStoreAccess(identity, STAFF_ROLES, identity.store_id);
      const db = getServerClient();

      const { error } = await db
        .from("store_quick_answers")
        .delete()
        .eq("id", id)
        .eq("store_id", identity.store_id);

      if (error) throw error;
      return { success: true };
    } catch (e: any) {
      if (e instanceof SupabaseUnconfiguredError) throw e;
      console.error("[chat-operations] deleteStoreQuickAnswer error:", e);
      throw new Error(e?.message || "Erro ao excluir resposta rápida.");
    }
  });

// ============================================================
// 2. Tags e Etiquetas de Atendimento
// ============================================================

export const listChatThreadTags = createServerFn({ method: "GET" })
  .validator(listTagsSchema.optional())
  .handler(async ({ data }) => {
    try {
      const identity = await getServerIdentity();
      assertStoreAccess(identity, STAFF_ROLES, identity.store_id);
      const db = getServerClient();

      let query = db
        .from("chat_thread_tags")
        .select("id, store_id, name, color_hex, is_kanban_column, kanban_order, created_at")
        .eq("store_id", identity.store_id)
        .order("kanban_order", { ascending: true })
        .order("name", { ascending: true });

      if (data?.is_kanban_column !== undefined) {
        query = query.eq("is_kanban_column", data.is_kanban_column);
      }

      const { data: tags, error } = await query;
      if (error) throw error;
      return tags || [];
    } catch (e: any) {
      if (e instanceof SupabaseUnconfiguredError) throw e;
      console.warn("[chat-operations] listChatThreadTags error:", e?.message || e);
      return [];
    }
  });

export const createChatThreadTag = createServerFn({ method: "POST" })
  .validator(createTagSchema)
  .handler(async ({ data: input }) => {
    try {
      const identity = await getServerIdentity();
      assertStoreAccess(identity, STAFF_ROLES, identity.store_id);
      const db = getServerClient();

      const { data: tag, error } = await db
        .from("chat_thread_tags")
        .upsert(
          {
            store_id: identity.store_id,
            name: input.name.trim(),
            color_hex: input.color_hex,
            is_kanban_column: input.is_kanban_column,
            kanban_order: input.kanban_order,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "store_id,name" }
        )
        .select()
        .single();

      if (error) throw error;
      return tag;
    } catch (e: any) {
      if (e instanceof SupabaseUnconfiguredError) throw e;
      console.error("[chat-operations] createChatThreadTag error:", e);
      throw new Error(e?.message || "Erro ao criar etiqueta.");
    }
  });

export const assignTagToThread = createServerFn({ method: "POST" })
  .validator(assignTagSchema)
  .handler(async ({ data: { threadId, tagId } }) => {
    try {
      const identity = await getServerIdentity();
      assertStoreAccess(identity, STAFF_ROLES, identity.store_id);
      const db = getServerClient();

      const { data: assignment, error } = await db
        .from("chat_thread_tag_assignments")
        .upsert(
          {
            thread_id: threadId,
            tag_id: tagId,
            store_id: identity.store_id,
            assigned_by: identity.id,
          },
          { onConflict: "thread_id,tag_id" }
        )
        .select()
        .single();

      if (error) throw error;
      return assignment;
    } catch (e: any) {
      if (e instanceof SupabaseUnconfiguredError) throw e;
      console.error("[chat-operations] assignTagToThread error:", e);
      throw new Error(e?.message || "Erro ao vincular etiqueta.");
    }
  });

export const removeTagFromThread = createServerFn({ method: "POST" })
  .validator(removeTagSchema)
  .handler(async ({ data: { threadId, tagId } }) => {
    try {
      const identity = await getServerIdentity();
      assertStoreAccess(identity, STAFF_ROLES, identity.store_id);
      const db = getServerClient();

      const { error } = await db
        .from("chat_thread_tag_assignments")
        .delete()
        .eq("thread_id", threadId)
        .eq("tag_id", tagId)
        .eq("store_id", identity.store_id);

      if (error) throw error;
      return { success: true };
    } catch (e: any) {
      if (e instanceof SupabaseUnconfiguredError) throw e;
      console.error("[chat-operations] removeTagFromThread error:", e);
      throw new Error(e?.message || "Erro ao desvincular etiqueta.");
    }
  });

// ============================================================
// 3. Agendamento de Mensagens WhatsApp
// ============================================================

export const scheduleWhatsAppMessage = createServerFn({ method: "POST" })
  .validator(scheduleMessageSchema)
  .handler(async ({ data: input }) => {
    try {
      const identity = await getServerIdentity();
      assertStoreAccess(identity, STAFF_ROLES, identity.store_id);
      const db = getServerClient();

      const cleanPhone = input.recipientPhone.replace(/\D/g, "");

      const { data: item, error } = await db
        .from("whatsapp_scheduled_messages")
        .insert({
          store_id: identity.store_id,
          thread_id: input.threadId || null,
          recipient_phone: cleanPhone,
          message_text: input.messageText.trim(),
          scheduled_for: input.scheduledFor,
          status: "scheduled",
          created_by: identity.id,
        })
        .select()
        .single();

      if (error) throw error;
      return item;
    } catch (e: any) {
      if (e instanceof SupabaseUnconfiguredError) throw e;
      console.error("[chat-operations] scheduleWhatsAppMessage error:", e);
      throw new Error(e?.message || "Erro ao agendar mensagem.");
    }
  });

export const listScheduledWhatsAppMessages = createServerFn({ method: "GET" })
  .validator(z.object({ threadId: z.string().uuid().optional() }).optional())
  .handler(async ({ data }) => {
    try {
      const identity = await getServerIdentity();
      assertStoreAccess(identity, STAFF_ROLES, identity.store_id);
      const db = getServerClient();

      let query = db
        .from("whatsapp_scheduled_messages")
        .select("id, thread_id, recipient_phone, message_text, scheduled_for, status, sent_at, created_at")
        .eq("store_id", identity.store_id)
        .order("scheduled_for", { ascending: true });

      if (data?.threadId) {
        query = query.eq("thread_id", data.threadId);
      }

      const { data: list, error } = await query;
      if (error) throw error;
      return list || [];
    } catch (e: any) {
      if (e instanceof SupabaseUnconfiguredError) throw e;
      console.warn("[chat-operations] listScheduledWhatsAppMessages error:", e?.message || e);
      return [];
    }
  });

export const cancelScheduledWhatsAppMessage = createServerFn({ method: "POST" })
  .validator(cancelScheduledMessageSchema)
  .handler(async ({ data: { id } }) => {
    try {
      const identity = await getServerIdentity();
      assertStoreAccess(identity, STAFF_ROLES, identity.store_id);
      const db = getServerClient();

      const { error } = await db
        .from("whatsapp_scheduled_messages")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("store_id", identity.store_id)
        .eq("status", "scheduled");

      if (error) throw error;
      return { success: true };
    } catch (e: any) {
      if (e instanceof SupabaseUnconfiguredError) throw e;
      console.error("[chat-operations] cancelScheduledWhatsAppMessage error:", e);
      throw new Error(e?.message || "Erro ao cancelar mensagem agendada.");
    }
  });
