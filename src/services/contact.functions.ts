import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/start-server-core";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";
import { enforceRateLimit, extractClientIp } from "@/lib/rate-limiter";

const SubmitContactSchema = z.object({
 name: z.string().min(2, "Nome é obrigatório"),
 email: z.string().email("E-mail inválido"),
 phone: z.string().optional(),
 subject: z.string().optional(),
 message: z.string().min(5, "Mensagem deve conter no mínimo 5 caracteres"),
});

export const submitContactMessage = createServerFn({ method: "POST" })
 .validator(SubmitContactSchema)
 .handler(async ({ data }) => {
 const request = getRequest();
 const clientIp = extractClientIp(request);

 // Proteção Anti-Spam / Anti-Flood de E-mails
 enforceRateLimit(clientIp, "email_contact_form");

 const db = getServerClient();
 const identity = await getServerIdentity().catch(() => ({ id: null, store_id: null }));

 // 1. Gravar mensagem de contato de forma real e auditável no Supabase
 const { data: log, error } = await db.from("audit_logs").insert({
 user_id: identity.id || null,
 store_id: identity.store_id || null,
 action: "contact_form_submission",
 entity_type: "support_inquiry",
 payload_snapshot: {
 name: data.name.trim(),
 email: data.email.trim(),
 phone: data.phone?.trim() || null,
 subject: data.subject?.trim() || "Dúvida Geral / Atendimento",
 message: data.message.trim(),
 status: "unread",
 submitted_at: new Date().toISOString(),
 },
 }).select().single();

 if (error) {
 console.error("[submitContactMessage] db error:", error);
 throw new Error("Não foi possível registrar seu contato. Tente novamente.");
 }

 return {
 success: true,
 inquiry_id: log?.id,
 message: "Mensagem recebida com sucesso! Nossa equipe entrará em contato em breve.",
 };
 });
