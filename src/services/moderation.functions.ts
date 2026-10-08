import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getIdentity } from "@/services/identity.functions";
import { requireAdmin } from "@/lib/server-access";

// ---------------------------------------------------------------------------
// 1. SUBMIT REPORT (Público / Usuário autenticado)
// ---------------------------------------------------------------------------

const submitReportInput = z.object({
 entityType: z.enum(["classified", "post", "event", "product", "profile", "comment"]),
 entityId: z.string(),
 entityTitle: z.string().optional(),
 reason: z.enum(["spam", "fraud", "inappropriate", "illegal", "offensive", "misleading", "other"]),
 description: z.string().max(1000).optional(),
 evidenceUrls: z.array(z.string()).optional().default([]),
});

export const submitModerationReport = createServerFn({ method: "POST" })
 .validator(submitReportInput)
 .handler(async ({ data: input }) => {
 const supabase = getServerClient();
 const identity = await getIdentity().catch(() => null);

 const { data, error } = await supabase
 .from("moderation_reports")
 .insert({
 entity_type: input.entityType,
 entity_id: input.entityId,
 entity_title: input.entityTitle || null,
 reason: input.reason,
 description: input.description || null,
 evidence_urls: input.evidenceUrls,
 reporter_profile_id: identity?.id || null,
 status: "pending",
 })
 .select()
 .single();

 if (error) {
 console.error("[moderation] submitModerationReport error:", error);
 throw new Error("Não foi possível enviar a denúncia no momento.");
 }

 return { success: true, reportId: data.id };
 });

// ---------------------------------------------------------------------------
// 2. LIST MODERATION REPORTS (Admin Master & Moderadores)
// ---------------------------------------------------------------------------

const listReportsInput = z.object({
 status: z
 .enum(["all", "pending", "in_review", "resolved_removed", "resolved_dismissed"])
 .optional()
 .default("all"),
 entityType: z
 .enum(["all", "classified", "post", "event", "product", "profile", "comment"])
 .optional()
 .default("all"),
 limit: z.number().int().min(1).max(100).optional().default(50),
});

export const listModerationReports = createServerFn({ method: "GET" })
 .validator(listReportsInput.optional())
 .handler(async ({ data: input }) => {
 await requireAdmin();
 const supabase = getServerClient();
 const limit = input?.limit || 50;

 let query = supabase
 .from("moderation_reports")
 .select(
 `
 id, entity_type, entity_id, entity_title, reason, description, evidence_urls,
 status, action_taken, moderator_notes, resolved_at, created_at, updated_at,
 reporter:reporter_profile_id (id, full_name, avatar_url),
 moderator:moderator_id (id, full_name)
 `,
 )
 .order("created_at", { ascending: false })
 .limit(limit);

 if (input?.status && input.status !== "all") {
 query = query.eq("status", input.status);
 }

 if (input?.entityType && input.entityType !== "all") {
 query = query.eq("entity_type", input.entityType);
 }

 const { data, error } = await query;

 if (error) {
 console.error("[moderation] listModerationReports error:", error);
 throw new Error("Erro ao carregar fila de moderação.");
 }

 return data || [];
 });

// ---------------------------------------------------------------------------
// 3. RESOLVE MODERATION REPORT (Ação de Moderação)
// ---------------------------------------------------------------------------

const resolveReportInput = z.object({
 reportId: z.string().uuid(),
 action: z.enum(["dismiss", "remove_content", "hide_content", "warn_author", "ban_author"]),
 moderatorNotes: z.string().optional(),
});

export const resolveModerationReport = createServerFn({ method: "POST" })
 .validator(resolveReportInput)
 .handler(async ({ data: input }) => {
 const admin = await requireAdmin();
 const supabase = getServerClient();

 // 1. Busca os detalhes da denúncia
 const { data: report, error: fetchErr } = await supabase
 .from("moderation_reports")
 .select("*")
 .eq("id", input.reportId)
 .single();

 if (fetchErr || !report) {
 throw new Error("Denúncia não encontrada.");
 }

 if (input.action === "warn_author" || input.action === "ban_author") {
   throw new Error("Esta ação de moderação ainda não possui enforcement persistido e não pode ser marcada como concluída.");
 }

 // 2. Executa a ação sobre o conteúdo se for remoção / ocultação
 if (input.action === "remove_content" || input.action === "hide_content") {
 let contentUpdateError: { message: string } | null = null;
 if (report.entity_type === "classified") {
 const { error } = await supabase
 .from("classifieds")
 .update({
 status: "archived",
 updated_at: new Date().toISOString(),
 })
 .eq("id", report.entity_id);
 contentUpdateError = error;
 } else if (report.entity_type === "post") {
 const { error } = await supabase
 .from("posts")
 .update({
 is_deleted: true,
 updated_at: new Date().toISOString(),
 })
 .eq("id", report.entity_id);
 contentUpdateError = error;
 } else if (report.entity_type === "event") {
 const { error } = await supabase
 .from("events")
 .update({
 status: "cancelled",
 updated_at: new Date().toISOString(),
 })
 .eq("id", report.entity_id);
 contentUpdateError = error;
 } else {
   throw new Error("Este tipo de conteúdo ainda não possui enforcement de remoção implementado.");
 }
 if (contentUpdateError) {
   console.error("[moderation] Falha ao alterar conteúdo denunciado:", contentUpdateError);
   throw new Error("Não foi possível aplicar a ação ao conteúdo denunciado.");
 }
 }

 // 3. Atualiza o status da denúncia
 const targetStatus =
 input.action === "dismiss"
 ? "resolved_dismissed"
 : "resolved_removed";

 const { data: updated, error: updateErr } = await supabase
 .from("moderation_reports")
 .update({
 status: targetStatus,
 action_taken: input.action === "dismiss" ? "dismissed" : input.action,
 moderator_id: admin.id,
 moderator_notes: input.moderatorNotes || null,
 resolved_at: new Date().toISOString(),
 updated_at: new Date().toISOString(),
 })
 .eq("id", input.reportId)
 .select()
 .single();

 if (updateErr) {
 console.error("[moderation] resolveModerationReport error:", updateErr);
 throw new Error("Erro ao salvar resolução da denúncia.");
 }

 return { success: true, report: updated };
 });
