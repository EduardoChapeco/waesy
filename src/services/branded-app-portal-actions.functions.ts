/**
 * branded-app-portal-actions.functions.ts — Ações Isoladas do Portal do Cliente no App Oficial (/app/:slug)
 *
 * Implementa:
 * 1. Chat Direto Isolado (Cliente <-> Loja, sem misturar conversas de outras empresas)
 * 2. Chamados de Suporte / SAC do Cliente dentro do App (store_support_tickets / operator_support_tickets)
 * 3. Avaliações Verificadas da Empresa (exigindo compra/viagem/agendamento real na loja)
 * 4. Candidatura a Vagas Diretamente no App (validando que a vaga pertence à loja ativa)
 *
 * Isolamento Zero-Trust:
 * - Todo acesso exige sessão autenticada OU Magic Token ativo escopado exatamente para `storeId`.
 * - Se um `accessToken` explícito for informado e pertencer a outra loja ou estiver revogado/expirado,
 *   a operação falha fechado imediatamente (bloqueia enumeração e vazamento cross-tenant).
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getSSRClient } from "@/lib/server-access";
import { buildBrazilPhoneVariants, sanitizePhoneDigits } from "@/lib/phone-match";
import { resolveScopedClientPortalToken } from "@/services/branded-app.functions";

export interface ScopedAppPortalIdentity {
  authenticated: boolean;
  tokenInvalid?: boolean;
  storeId: string;
  userId: string | null;
  crmCustomerId: string | null;
  leadId: string | null;
  threadId: string | null;
  tokenId: string | null;
  clientCode: string | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  phoneDigits: string | null;
}

export async function resolveBrandedAppPortalIdentity(
  db: any,
  storeId: string,
  accessToken?: string | null,
): Promise<ScopedAppPortalIdentity> {
  const cleanToken = String(accessToken || "").trim();

  // 1. Se um token explícito foi fornecido, ele DEVE pertencer a esta loja e estar válido
  if (cleanToken) {
    const tokenRow = await resolveScopedClientPortalToken(db, storeId, cleanToken);
    if (!tokenRow) {
      return {
        authenticated: false,
        tokenInvalid: true,
        storeId,
        userId: null,
        crmCustomerId: null,
        leadId: null,
        threadId: null,
        tokenId: null,
        clientCode: null,
        customerName: "Visitante",
        customerEmail: null,
        customerPhone: null,
        phoneDigits: null,
      };
    }

    const phoneDigits =
      sanitizePhoneDigits(tokenRow.customer_phone_digits || tokenRow.customer_phone) || null;
    return {
      authenticated: true,
      storeId,
      userId: tokenRow.customer_id || null,
      crmCustomerId: tokenRow.crm_customer_id || null,
      leadId: tokenRow.lead_id || null,
      threadId: tokenRow.thread_id || null,
      tokenId: tokenRow.id || null,
      clientCode: tokenRow.client_code || null,
      customerName: String(tokenRow.customer_name || "Cliente").trim() || "Cliente",
      customerEmail: tokenRow.customer_email || null,
      customerPhone: tokenRow.customer_phone || phoneDigits,
      phoneDigits,
    };
  }

  // 2. Caso contrário, verifica sessão autenticada do usuário
  try {
    const ssr = await getSSRClient();
    const { data: authData } = await ssr.auth.getUser();
    const user = authData?.user;
    if (!user?.id) {
      return {
        authenticated: false,
        storeId,
        userId: null,
        crmCustomerId: null,
        leadId: null,
        threadId: null,
        tokenId: null,
        clientCode: null,
        customerName: "Visitante",
        customerEmail: null,
        customerPhone: null,
        phoneDigits: null,
      };
    }

    const { data: profile } = await db
      .from("profiles")
      .select("id, full_name, email, phone")
      .eq("id", user.id)
      .maybeSingle();

    const phoneRaw = profile?.phone || (user.user_metadata as any)?.phone || null;
    const phoneDigits = sanitizePhoneDigits(phoneRaw) || null;
    const fullName =
      profile?.full_name ||
      (user.user_metadata as any)?.full_name ||
      user.email?.split("@")[0] ||
      "Cliente";

    return {
      authenticated: true,
      storeId,
      userId: user.id,
      crmCustomerId: null,
      leadId: null,
      threadId: null,
      tokenId: null,
      clientCode: null,
      customerName: String(fullName).trim(),
      customerEmail: profile?.email || user.email || null,
      customerPhone: phoneRaw,
      phoneDigits,
    };
  } catch {
    return {
      authenticated: false,
      storeId,
      userId: null,
      crmCustomerId: null,
      leadId: null,
      threadId: null,
      tokenId: null,
      clientCode: null,
      customerName: "Visitante",
      customerEmail: null,
      customerPhone: null,
      phoneDigits: null,
    };
  }
}

export interface AppDirectChatMessageDTO {
  id: string;
  thread_id: string;
  is_staff_reply: boolean;
  message: string;
  created_at: string;
}

export const getScopedAppChatMessagesFn = createServerFn({ method: "GET" })
  .validator(
    z.object({
      storeId: z.string().uuid(),
      accessToken: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ data }): Promise<{
    authenticated: boolean;
    threadId: string | null;
    messages: AppDirectChatMessageDTO[];
  }> => {
    const db = getServerClient();
    const identity = await resolveBrandedAppPortalIdentity(db, data.storeId, data.accessToken);
    if (!identity.authenticated) {
      return { authenticated: false, threadId: null, messages: [] };
    }

    let threadId: string | null = null;

    if (identity.threadId) {
      const { data: existingThread } = await db
        .from("chat_threads")
        .select("id, store_id")
        .eq("id", identity.threadId)
        .eq("store_id", data.storeId)
        .maybeSingle();
      if (existingThread?.id) {
        threadId = existingThread.id;
      }
    }

    if (!threadId && identity.userId) {
      const { data: userThreads } = await db
        .from("chat_threads")
        .select("id")
        .eq("store_id", data.storeId)
        .eq("customer_id", identity.userId)
        .order("updated_at", { ascending: false })
        .limit(1);
      if (userThreads?.[0]?.id) {
        threadId = userThreads[0].id;
      }
    }

    if (!threadId) {
      return { authenticated: true, threadId: null, messages: [] };
    }

    const { data: msgRows } = await db
      .from("chat_messages")
      .select("id, thread_id, is_staff_reply, message, created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(100);

    return {
      authenticated: true,
      threadId,
      messages: (msgRows || []).map((m: any) => ({
        id: String(m.id),
        thread_id: String(m.thread_id),
        is_staff_reply: Boolean(m.is_staff_reply),
        message: String(m.message || ""),
        created_at: String(m.created_at || new Date().toISOString()),
      })),
    };
  });

export const sendScopedAppChatMessageFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid(),
      accessToken: z.string().nullable().optional(),
      message: z.string().min(1).max(2000),
    }),
  )
  .handler(async ({ data }): Promise<{
    success: boolean;
    threadId: string;
    message: AppDirectChatMessageDTO;
  }> => {
    const db = getServerClient();
    const identity = await resolveBrandedAppPortalIdentity(db, data.storeId, data.accessToken);
    if (!identity.authenticated) {
      throw new Error("Acesso não autorizado ou token inválido para esta empresa.");
    }

    const cleanMessage = data.message.trim();
    if (!cleanMessage) {
      throw new Error("Digite uma mensagem válida.");
    }

    let threadId: string | null = null;

    if (identity.threadId) {
      const { data: tRow } = await db
        .from("chat_threads")
        .select("id")
        .eq("id", identity.threadId)
        .eq("store_id", data.storeId)
        .maybeSingle();
      if (tRow?.id) threadId = tRow.id;
    }

    if (!threadId && identity.userId) {
      const { data: existing } = await db
        .from("chat_threads")
        .select("id")
        .eq("store_id", data.storeId)
        .eq("customer_id", identity.userId)
        .order("updated_at", { ascending: false })
        .limit(1);
      if (existing?.[0]?.id) threadId = existing[0].id;
    }

    if (!threadId) {
      const { data: createdThread, error: createErr } = await db
        .from("chat_threads")
        .insert({
          store_id: data.storeId,
          customer_id: identity.userId || null,
          guest_name: identity.customerName,
          guest_email: identity.customerEmail || null,
          status: "open",
          subject: `Atendimento no App · ${identity.customerName}`,
        })
        .select("id")
        .single();

      if (createErr || !createdThread?.id) {
        throw new Error("Não foi possível iniciar a conversa com a empresa.");
      }
      threadId = String(createdThread.id);

      if (identity.tokenId) {
        await db
          .from("store_app_client_tokens")
          .update({ thread_id: threadId })
          .eq("id", identity.tokenId)
          .eq("store_id", data.storeId);
      }
    }

    const nowIso = new Date().toISOString();
    const { data: insertedMsg, error: msgErr } = await db
      .from("chat_messages")
      .insert({
        thread_id: threadId,
        sender_id: identity.userId || null,
        is_staff_reply: false,
        message: cleanMessage,
        created_at: nowIso,
      })
      .select("id, thread_id, is_staff_reply, message, created_at")
      .single();

    if (msgErr || !insertedMsg) {
      throw new Error("Erro ao enviar mensagem para a empresa.");
    }

    await db
      .from("chat_threads")
      .update({ status: "open", updated_at: nowIso })
      .eq("id", threadId)
      .eq("store_id", data.storeId);

    return {
      success: true,
      threadId: String(threadId),
      message: {
        id: String(insertedMsg.id),
        thread_id: String(insertedMsg.thread_id || threadId),
        is_staff_reply: Boolean(insertedMsg.is_staff_reply),
        message: String(insertedMsg.message || cleanMessage),
        created_at: String(insertedMsg.created_at || nowIso),
      },
    };
  });

export interface ClientAppSupportTicketDTO {
  id: string;
  ticket_type: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  order_id?: string | null;
  created_at: string;
}

export const listClientAppTicketsFn = createServerFn({ method: "GET" })
  .validator(
    z.object({
      storeId: z.string().uuid(),
      accessToken: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ data }): Promise<ClientAppSupportTicketDTO[]> => {
    const db = getServerClient();
    const identity = await resolveBrandedAppPortalIdentity(db, data.storeId, data.accessToken);
    if (!identity.authenticated) return [];

    const { data: rows } = await db
      .from("store_support_tickets")
      .select("id, customer_id, ticket_type, title, description, status, priority, order_id, resolution_notes, created_at")
      .eq("store_id", data.storeId)
      .order("created_at", { ascending: false })
      .limit(30);

    const allStoreTickets = Array.isArray(rows) ? rows : [];
    const filtered = allStoreTickets.filter((t: any) => {
      if (identity.userId && t.customer_id === identity.userId) return true;
      if (identity.clientCode && String(t.resolution_notes || "").includes(identity.clientCode)) return true;
      if (identity.phoneDigits && String(t.resolution_notes || "").includes(identity.phoneDigits)) return true;
      return false;
    });

    return filtered.map((t: any) => ({
      id: String(t.id),
      ticket_type: String(t.ticket_type || "other"),
      title: String(t.title || "Chamado"),
      description: String(t.description || ""),
      status: String(t.status || "open"),
      priority: String(t.priority || "normal"),
      order_id: t.order_id || null,
      created_at: String(t.created_at || new Date().toISOString()),
    }));
  });

export const createClientAppTicketFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid(),
      accessToken: z.string().nullable().optional(),
      ticketType: z
        .enum([
          "return_exchange",
          "missing_item",
          "defect_complaint",
          "delivery_issue",
          "billing_pix",
          "other",
        ])
        .default("other"),
      title: z.string().min(3).max(160),
      description: z.string().min(5).max(2000),
      orderId: z.string().uuid().nullable().optional(),
      priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
    }),
  )
  .handler(async ({ data }): Promise<{ success: boolean; ticket: ClientAppSupportTicketDTO }> => {
    const db = getServerClient();
    const identity = await resolveBrandedAppPortalIdentity(db, data.storeId, data.accessToken);
    if (!identity.authenticated) {
      throw new Error("Autenticação necessária para abrir um chamado nesta empresa.");
    }

    const metaJson = JSON.stringify({
      customer_name: identity.customerName,
      customer_phone: identity.phoneDigits || identity.customerPhone || null,
      client_code: identity.clientCode || null,
      source: "branded_app_portal",
    });

    const payload: Record<string, any> = {
      store_id: data.storeId,
      customer_id: identity.userId || null,
      order_id: data.orderId || null,
      ticket_type: data.ticketType,
      title: data.title.trim(),
      description: data.description.trim(),
      status: "open",
      priority: data.priority,
      resolution_notes: metaJson,
    };

    const { data: created, error } = await db
      .from("store_support_tickets")
      .insert(payload)
      .select("id, ticket_type, title, description, status, priority, order_id, created_at")
      .single();

    if (error || !created) {
      throw new Error("Não foi possível registrar seu chamado no momento.");
    }

    return {
      success: true,
      ticket: {
        id: String(created.id),
        ticket_type: String(created.ticket_type || data.ticketType),
        title: String(created.title || data.title),
        description: String(created.description || data.description),
        status: String(created.status || "open"),
        priority: String(created.priority || data.priority),
        order_id: created.order_id || null,
        created_at: String(created.created_at || new Date().toISOString()),
      },
    };
  });

export const submitBrandedAppStoreReviewFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid(),
      accessToken: z.string().nullable().optional(),
      rating: z.number().int().min(1).max(5),
      comment: z.string().min(4).max(1200),
      reviewerName: z.string().max(120).optional(),
      productId: z.string().uuid().nullable().optional(),
      orderId: z.string().uuid().nullable().optional(),
      tripId: z.string().uuid().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const db = getServerClient();
    const identity = await resolveBrandedAppPortalIdentity(db, data.storeId, data.accessToken);
    if (!identity.authenticated) {
      throw new Error("Entre na sua conta ou código de acesso da loja para enviar uma avaliação verificada.");
    }

    // Verificação estrita de vínculo transacional (pedido, viagem/proposta aceita ou agendamento na loja)
    let verifiedOrderId: string | null = data.orderId || null;
    let verifiedTripId: string | null = data.tripId || null;
    let hasVerifiedTransaction = false;

    const { data: storeOrders } = await db
      .from("orders")
      .select("id, customer_id, status, customer_snapshot")
      .eq("store_id", data.storeId)
      .order("created_at", { ascending: false })
      .limit(40);

    const phoneVariants = buildBrazilPhoneVariants(identity.phoneDigits || identity.customerPhone);
    for (const ord of storeOrders || []) {
      const snapPhone = sanitizePhoneDigits((ord as any)?.customer_snapshot?.phone);
      const matchesUser = Boolean(identity.userId && ord.customer_id === identity.userId);
      const matchesPhone = Boolean(snapPhone && phoneVariants.includes(snapPhone));
      const matchesExplicitOrder = Boolean(data.orderId && ord.id === data.orderId);
      if (matchesUser || matchesPhone || matchesExplicitOrder) {
        hasVerifiedTransaction = true;
        if (!verifiedOrderId) verifiedOrderId = String(ord.id);
        break;
      }
    }

    if (!hasVerifiedTransaction) {
      const { data: storeTrips } = await db
        .from("travel_proposals")
        .select("id, status, lead_id")
        .eq("store_id", data.storeId)
        .in("status", ["accepted", "approved", "completed", "sent"])
        .limit(20);
      if (Array.isArray(storeTrips) && storeTrips.length > 0 && (identity.leadId || identity.crmCustomerId || data.tripId)) {
        const matchedTrip = storeTrips.find(
          (tp: any) =>
            (data.tripId && tp.id === data.tripId) ||
            (identity.leadId && tp.lead_id === identity.leadId),
        );
        if (matchedTrip) {
          hasVerifiedTransaction = true;
          verifiedTripId = String(matchedTrip.id);
        }
      }
    }

    if (!hasVerifiedTransaction) {
      throw new Error(
        "Avaliação exclusiva para clientes com pedido, viagem ou serviço confirmado nesta empresa.",
      );
    }

    const reviewerDisplay =
      String(data.reviewerName || identity.customerName || "Cliente Verificado").trim();

    const { data: reviewRow, error: revErr } = await db
      .from("reviews")
      .insert({
        store_id: data.storeId,
        product_id: data.productId || null,
        user_id: identity.userId || null,
        reviewer_name: reviewerDisplay,
        rating: data.rating,
        comment: data.comment.trim(),
        status: "approved",
        verified_purchase: true,
        order_id: verifiedOrderId,
        trip_id: verifiedTripId,
        source_channel: "branded_app",
      })
      .select("id, rating, comment, reviewer_name, verified_purchase, created_at")
      .single();

    if (revErr || !reviewRow) {
      throw new Error("Não foi possível salvar sua avaliação verificada.");
    }

    return {
      success: true,
      review: reviewRow,
    };
  });

export const applyToBrandedAppJobFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid(),
      jobId: z.string().uuid(),
      candidateName: z.string().min(2).max(120),
      candidateEmail: z.string().email(),
      candidatePhone: z.string().min(8).max(30),
      resumeUrl: z.string().url().nullable().optional().or(z.literal("")),
      coverLetter: z.string().max(2000).nullable().optional(),
      salaryExpectationCents: z.number().int().min(0).nullable().optional(),
      previousCompanyName: z.string().max(120).nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const db = getServerClient();

    // Valida que a vaga existe, está ativa e pertence estritamente à loja do App (Zero Cross-Tenant)
    const { data: job } = await db
      .from("jobs")
      .select("id, store_id, title, status")
      .eq("id", data.jobId)
      .eq("store_id", data.storeId)
      .maybeSingle();

    if (!job || job.status !== "active") {
      throw new Error("Vaga não encontrada ou encerrada nesta empresa.");
    }

    const identity = await resolveBrandedAppPortalIdentity(db, data.storeId, null);

    const { data: created, error } = await db
      .from("job_applications")
      .insert({
        job_id: data.jobId,
        candidate_profile_id: identity.userId || null,
        candidate_name: data.candidateName.trim(),
        candidate_email: data.candidateEmail.trim().toLowerCase(),
        candidate_phone: data.candidatePhone.trim(),
        resume_url: data.resumeUrl && data.resumeUrl.trim() ? data.resumeUrl.trim() : null,
        cover_letter: data.coverLetter?.trim() || null,
        status: "pending",
        salary_expectation_cents: data.salaryExpectationCents ?? null,
        previous_company_name: data.previousCompanyName?.trim() || null,
      })
      .select("id, created_at")
      .single();

    if (error || !created?.id) {
      throw new Error("Não foi possível registrar sua candidatura.");
    }

    try {
      await db.from("leads_crm").insert({
        store_id: data.storeId,
        full_name: data.candidateName.trim(),
        email: data.candidateEmail.trim().toLowerCase(),
        phone: data.candidatePhone.trim(),
        title: `Candidatura App: ${job.title}`,
        destination: `Vaga: ${job.title}`,
        source: "site",
        lead_source_detail: "Aplicativo Oficial / Mural de Vagas",
        status: "new",
        tags: ["Candidato", "RH", "App Oficial", job.title],
        notes: data.coverLetter?.trim()
          ? `Apresentação: ${data.coverLetter.trim()}`
          : `Candidatura enviada pelo Aplicativo Oficial da empresa.`,
      });
    } catch {
      // Sincronia auxiliar de CRM não bloqueia a candidatura
    }

    return {
      success: true,
      applicationId: String(created.id),
    };
  });
