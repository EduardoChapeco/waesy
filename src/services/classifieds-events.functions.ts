import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { signTicketPayload } from "@/lib/ticket-crypto";
import { buildEmvPixCopyPaste } from "@/lib/pix-payload";
import { getIdentity } from "./identity.functions";

/**
 * classifieds-events.functions.ts — Camada BFF para Gestão de Eventos em Classificados
 *
 * Funcionalidades:
 * 1. Inscrição Rápida de Leads / Participantes com captura real em classified_applications e leads_crm
 * 2. Exportação de Leads em CSV para organizadores auditados
 * 3. Enquetes e Interatividade em Tempo Real (votação e contagem de votos)
 * 4. Contagem e Sumário de Participantes Confirmados
 */

function resolveAuthoritativeTicketPriceCents(
  classified: { price_cents?: number | null; attributes?: any },
  requestedTierId?: string | null,
  requestedTierName?: string | null,
): {
  priceCents: number;
  resolvedTierName: string;
  matchedTier: Record<string, any> | null;
} {
  const attrs = ((classified?.attributes || {}) as Record<string, any>) || {};
  const tiers = Array.isArray(attrs.ticket_tiers) ? attrs.ticket_tiers : [];
  if (tiers.length > 0) {
    const matched = tiers.find(
      (t: any) =>
        (requestedTierId && String(t?.id || "") === String(requestedTierId)) ||
        (requestedTierName && String(t?.name || "").trim().toLowerCase() === String(requestedTierName).trim().toLowerCase()),
    );
    if (!matched) {
      throw new Error("Lote ou modalidade de ingresso inválido ou indisponível.");
    }
    const tierPrice = Number(matched.price_cents ?? matched.priceCents ?? 0);
    return {
      priceCents: Number.isFinite(tierPrice) && tierPrice >= 0 ? Math.round(tierPrice) : 0,
      resolvedTierName: String(matched.name || requestedTierName || "Ingresso"),
      matchedTier: matched,
    };
  }

  const listingPrice = Number(classified?.price_cents ?? attrs.ticket_price_cents ?? 0);
  return {
    priceCents: Number.isFinite(listingPrice) && listingPrice > 0 ? Math.round(listingPrice) : 0,
    resolvedTierName: requestedTierName || "Ingresso Geral",
    matchedTier: null,
  };
}

export const registerClassifiedEventLead = createServerFn({ method: "POST" })
  .validator(
    z.object({
      classifiedId: z.string().uuid("ID de anúncio inválido"),
      name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
      whatsapp: z.string().min(8, "Telefone / WhatsApp inválido"),
      email: z.string().email("E-mail inválido").optional().or(z.literal("")),
      ticketTierId: z.string().optional(),
      ticketTierName: z.string().optional(),
      ticketTierPriceCents: z.number().int().optional(),
      notes: z.string().max(500).optional(),
    }),
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getIdentity().catch(() => null);

    // 1. Busca o anúncio para verificar integridade, preço autoritativo e store_id
    const { data: classified, error: classifiedErr } = await supabase
      .from("classifieds")
      .select("id, title, store_id, author_profile_id, category, price_cents, attributes, status")
      .eq("id", input.classifiedId)
      .maybeSingle();

    if (classifiedErr || !classified || ["archived", "removed"].includes(String(classified.status))) {
      throw new Error("Evento não encontrado ou inativo.");
    }

    const authoritativeTier = resolveAuthoritativeTicketPriceCents(
      classified,
      input.ticketTierId,
      input.ticketTierName,
    );
    const priceCents = authoritativeTier.priceCents;
    const resolvedTierLabel = input.ticketTierName || authoritativeTier.resolvedTierName;
    const roleLabel = resolvedTierLabel ? `Ingresso: ${resolvedTierLabel}` : "Inscrição no Evento";

    const provisionalTicketId = crypto.randomUUID();
    const ownerProfileId = identity?.id || classified.author_profile_id;
    const signedTicket = signTicketPayload({
      ticketId: provisionalTicketId,
      eventId: input.classifiedId,
      lotId: input.ticketTierId || authoritativeTier.matchedTier?.id || "classified-default-lot",
      ownerProfileId,
    });

    const attrs = (classified.attributes || {}) as Record<string, any>;
    const pixKey = String(attrs.pix_key || attrs.organizer_pix || "eventos@waesy.com.br");
    const pixCopyPaste =
      priceCents > 0
        ? buildEmvPixCopyPaste({
            pixKey,
            merchantName: classified.title || "WAESY EVENTOS",
            merchantCity: String(attrs.city || "CHAPECO"),
            amountCents: priceCents,
            txid: signedTicket.humanCode.replace(/-/g, ""),
          })
        : null;

    // 2. Gravação de Lead + Bilhete Criptográfico WCTS-1 em classified_applications
    const { data: appData, error: appErr } = await supabase
      .from("classified_applications")
      .insert({
        id: provisionalTicketId,
        classified_id: input.classifiedId,
        applicant_id: ownerProfileId,
        name: input.name.trim(),
        phone: input.whatsapp.trim(),
        email: input.email?.trim() || null,
        feedback_notes: roleLabel,
        cover_letter: [
          roleLabel,
          `Código WCTS-1: ${signedTicket.humanCode}`,
          `QR: ${signedTicket.qrPayload}`,
          input.notes ? `Nota: ${input.notes.trim()}` : null,
        ]
          .filter(Boolean)
          .join(" | "),
        status: priceCents > 0 ? "pending_payment" : "confirmed",
      })
      .select()
      .single();

    if (appErr) {
      throw new Error("Não foi possível registrar a inscrição no evento.");
    }

    // 3. Se o evento possui Loja / Empresa vinculada, sincroniza sem duplicação via motor unificado leads_crm
    if (classified.store_id) {
      try {
        const { ingestOmnichannelLead } = await import("./omnichannel-lead-ingestion");
        await ingestOmnichannelLead(supabase, {
          storeId: classified.store_id,
          source: "lead_form",
          sourceDetail: "Classificados / Eventos",
          fullName: input.name.trim(),
          phone: input.whatsapp.trim(),
          email: input.email?.trim() || null,
          title: `Inscrição Evento: ${classified.title}`,
          destination: `Evento: ${classified.title}`,
          estimatedValueCents: priceCents,
          sourceListingId: classified.id,
          sourceListingOrigin: "classified",
          sourceListingTitle: classified.title,
          notes: `Participante inscrito no evento ${classified.title}. Lote: ${input.ticketTierName || "Padrão"}. Bilhete: ${signedTicket.humanCode}. Preço: ${priceCents > 0 ? `R$ ${(priceCents / 100).toFixed(2)}` : "Gratuito"}.`,
          customFields: {
            ticket_tier_name: input.ticketTierName || "Padrão",
            ticket_code: signedTicket.humanCode,
          },
        });
      } catch (crmErr: any) {
        console.warn("[classifieds-events] leads_crm sync fallback:", crmErr);
      }
    }

    return {
      success: true,
      leadId: appData?.id || provisionalTicketId,
      ticketCode: signedTicket.humanCode,
      qrPayload: signedTicket.qrPayload,
      signature: signedTicket.signature,
      pixCopyPaste,
      amountCents: priceCents,
      message: "Inscrição e bilhete criptográfico gerados com sucesso!",
    };
  });

export const exportClassifiedEventLeadsCsv = createServerFn({ method: "POST" })
  .validator(
    z.object({
      classifiedId: z.string().uuid("ID de anúncio inválido"),
    }),
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getIdentity();

    if (!identity?.id) {
      throw new Error("Você precisa estar autenticado para exportar os inscritos.");
    }

    // 1. Verifica autoridade do usuário sobre o anúncio
    const { data: classified, error: classifiedErr } = await supabase
      .from("classifieds")
      .select("id, title, author_profile_id, store_id")
      .eq("id", input.classifiedId)
      .maybeSingle();

    if (classifiedErr || !classified) {
      throw new Error("Evento não encontrado.");
    }

    const isAdmin = identity.role === "admin" || identity.role === "master";
    let hasAuthority = classified.author_profile_id === identity.id || isAdmin;

    if (!hasAuthority && classified.store_id) {
      if (identity.store_id === classified.store_id) {
        hasAuthority = true;
      } else if (
        Array.isArray(identity.memberships) &&
        identity.memberships.some((m: any) => m.store_id === classified.store_id)
      ) {
        hasAuthority = true;
      }
    }

    if (!hasAuthority) {
      throw new Error("Você não possui permissão para exportar os inscritos deste evento.");
    }

    // 2. Busca todos os inscritos reais (desconsiderando votos de enquetes e depoimentos)
    const { data: rows, error: rowsErr } = await supabase
      .from("classified_applications")
      .select("id, name, phone, email, feedback_notes, cover_letter, status, applied_at")
      .eq("classified_id", input.classifiedId)
      .neq("status", "vote_cast")
      .order("applied_at", { ascending: false });

    if (rowsErr) {
      console.error("[classifieds-events] Erro ao buscar inscritos:", rowsErr);
      throw new Error("Falha ao buscar dados de inscritos.");
    }

    const list = (rows || []).filter(
      (r: any) =>
        !String(r.feedback_notes || "").startsWith("survey_vote:") &&
        !String(r.feedback_notes || "").startsWith("testimonial:")
    );

    // 3. Monta CSV com formatação segura contra injeção de fórmulas
    const sanitizeCsvCell = (val: any) => {
      if (val === null || val === undefined) return '""';
      let str = String(val).replace(/"/g, '""');
      if (str.startsWith("=") || str.startsWith("+") || str.startsWith("-") || str.startsWith("@")) {
        str = `'${str}`;
      }
      return `"${str}"`;
    };

    const headers = [
      "Data e Hora",
      "Nome Completo",
      "WhatsApp / Telefone",
      "E-mail",
      "Ingresso / Lote",
      "Notas",
      "Status",
    ];

    const csvLines = [headers.join(",")];

    for (const r of list) {
      const dateStr = r.applied_at
        ? new Date(r.applied_at).toLocaleString("pt-BR")
        : "";
      const line = [
        sanitizeCsvCell(dateStr),
        sanitizeCsvCell(r.name),
        sanitizeCsvCell(r.phone),
        sanitizeCsvCell(r.email),
        sanitizeCsvCell(r.feedback_notes),
        sanitizeCsvCell(r.cover_letter),
        sanitizeCsvCell(r.status),
      ].join(",");
      csvLines.push(line);
    }

    return {
      success: true,
      csvContent: csvLines.join("\r\n"),
      count: list.length,
      eventTitle: classified.title,
    };
  });

export const getClassifiedEventAttendeesCount = createServerFn({ method: "GET" })
  .validator(
    z.object({
      classifiedId: z.string().uuid(),
    }),
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();

    const { count, error } = await supabase
      .from("classified_applications")
      .select("id", { count: "exact", head: true })
      .eq("classified_id", input.classifiedId)
      .neq("status", "vote_cast");

    if (error) {
      return { count: 0 };
    }

    return { count: count || 0 };
  });

export const submitClassifiedEventSurveyVote = createServerFn({ method: "POST" })
  .validator(
    z.object({
      classifiedId: z.string().uuid("ID de evento inválido"),
      surveyId: z.string().min(1, "ID da enquete obrigatório"),
      optionIndex: z.number().int().min(0, "Opção inválida"),
      optionLabel: z.string().min(1),
      voterName: z.string().optional(),
      voterPhone: z.string().optional(),
      isAnonymous: z.boolean().optional(),
    }),
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getIdentity().catch(() => null);

    const { data: classified } = await supabase
      .from("classifieds")
      .select("author_profile_id")
      .eq("id", input.classifiedId)
      .maybeSingle();

    const isAnon = input.isAnonymous ?? (!input.voterName || input.voterName.trim() === "");
    const displayName = isAnon ? "Participante Anônimo" : (input.voterName?.trim() || "Participante");

    const votePayload = {
      survey_id: input.surveyId,
      option_index: input.optionIndex,
      option_label: input.optionLabel,
      is_anonymous: isAnon,
      voted_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("classified_applications").insert({
      classified_id: input.classifiedId,
      applicant_id: identity?.id || classified?.author_profile_id,
      name: displayName,
      phone: isAnon ? null : (input.voterPhone?.trim() || null),
      feedback_notes: `survey_vote:${input.surveyId}`,
      cover_letter: JSON.stringify(votePayload),
      status: "vote_cast",
    });

    if (error) {
      console.warn("[classifieds-events] survey vote error:", error);
      throw new Error("Não foi possível registrar o seu voto.");
    }

    return { success: true };
  });

export interface SurveyVoteResponseItem {
  id: string;
  voterName: string;
  optionIndex: number;
  optionLabel: string;
  isAnonymous: boolean;
  createdAt: string;
}

export const getClassifiedEventSurveyResults = createServerFn({ method: "GET" })
  .validator(
    z.object({
      classifiedId: z.string().uuid(),
      surveyId: z.string().min(1),
    }),
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getIdentity().catch(() => null);

    const { data: classified } = await supabase
      .from("classifieds")
      .select("author_profile_id, store_id")
      .eq("id", input.classifiedId)
      .maybeSingle();

    const isOwner = Boolean(
      identity?.id &&
        (classified?.author_profile_id === identity.id ||
          (classified?.store_id && identity.store_id === classified.store_id) ||
          identity.role === "admin")
    );

    const { data: votes, error } = await supabase
      .from("classified_applications")
      .select("id, name, applied_at, cover_letter")
      .eq("classified_id", input.classifiedId)
      .eq("feedback_notes", `survey_vote:${input.surveyId}`)
      .order("applied_at", { ascending: false });

    if (error || !votes) {
      return {
        surveyId: input.surveyId,
        totalVotes: 0,
        counts: {} as Record<number, number>,
        percentages: {} as Record<number, number>,
        responses: [] as SurveyVoteResponseItem[],
        isOwner,
      };
    }

    const counts: Record<number, number> = {};
    let totalVotes = 0;
    const responses: SurveyVoteResponseItem[] = [];

    for (const v of votes) {
      try {
        if (!v.cover_letter) continue;
        const parsed = JSON.parse(v.cover_letter);
        const idx = Number(parsed.option_index);
        if (!isNaN(idx)) {
          counts[idx] = (counts[idx] || 0) + 1;
          totalVotes += 1;

          if (isOwner) {
            responses.push({
              id: v.id,
              voterName: parsed.is_anonymous ? "Anônimo" : (v.name || "Participante"),
              optionIndex: idx,
              optionLabel: String(parsed.option_label || ""),
              isAnonymous: Boolean(parsed.is_anonymous),
              createdAt: v.applied_at,
            });
          }
        }
      } catch (e) {
        // Ignora payloads corrompidos
      }
    }

    const percentages: Record<number, number> = {};
    for (const [idxStr, count] of Object.entries(counts)) {
      const idx = Number(idxStr);
      percentages[idx] = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
    }

    return {
      surveyId: input.surveyId,
      totalVotes,
      counts,
      percentages,
      responses,
      isOwner,
    };
  });

export const checkoutClassifiedEventTicket = createServerFn({ method: "POST" })
  .validator(
    z.object({
      classifiedId: z.string().min(1),
      tierId: z.string().default("general"),
      tierName: z.string().default("Ingresso Geral"),
      quantity: z.number().int().min(1).max(20).default(1),
      unitPriceCents: z.number().int().min(0).default(0),
      buyerName: z.string().min(2),
      buyerWhatsapp: z.string().min(8),
      buyerDocument: z.string().optional(),
      buyerEmail: z.string().optional(),
      paymentMethod: z.enum(["pix", "card", "free"]).default("free"),
    })
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getIdentity().catch(() => null);

    const { data: classified, error: classifiedErr } = await supabase
      .from("classifieds")
      .select("id, title, store_id, author_profile_id, price_cents, attributes, status")
      .eq("id", input.classifiedId)
      .maybeSingle();

    if (classifiedErr || !classified || ["archived", "removed"].includes(String(classified.status))) {
      throw new Error("Evento não encontrado ou encerrado.");
    }

    const ownerProfileId = identity?.id || classified.author_profile_id;
    if (!ownerProfileId) {
      throw new Error("Autenticação ou organizador válido obrigatório para emitir ingressos.");
    }

    const attrs = ((classified.attributes || {}) as Record<string, any>) || {};
    const authoritativeTier = resolveAuthoritativeTicketPriceCents(
      classified,
      input.tierId,
      input.tierName,
    );

    if (authoritativeTier.matchedTier) {
      const cap = Number(
        authoritativeTier.matchedTier.capacity ?? authoritativeTier.matchedTier.quantity ?? 0,
      );
      const sold = Number(authoritativeTier.matchedTier.sold_count || 0);
      if (
        authoritativeTier.matchedTier.status === "sold_out" ||
        (cap > 0 && sold + input.quantity > cap)
      ) {
        throw new Error("Lote esgotado ou sem ingressos suficientes disponíveis.");
      }
    }

    const authoritativeUnitPriceCents = authoritativeTier.priceCents;
    const totalAmountCents = Math.max(0, authoritativeUnitPriceCents * input.quantity);

    const issuedTickets: Array<{ id: string; code: string; qrPayload: string }> = [];
    for (let i = 0; i < input.quantity; i++) {
      const ticketId = crypto.randomUUID();
      const signed = signTicketPayload({
        ticketId,
        eventId: input.classifiedId,
        lotId: authoritativeTier.matchedTier?.id || input.tierId,
        ownerProfileId,
      });
      issuedTickets.push({
        id: ticketId,
        code: signed.humanCode,
        qrPayload: signed.qrPayload,
      });

      const { error: insertTicketErr } = await supabase
        .from("classified_applications")
        .insert({
          id: ticketId,
          classified_id: input.classifiedId,
          applicant_id: ownerProfileId,
          name: input.buyerName.trim(),
          phone: input.buyerWhatsapp.trim(),
          email: input.buyerEmail?.trim() || null,
          feedback_notes: `Ingresso: ${authoritativeTier.resolvedTierName}`,
          cover_letter: `Código WCTS-1: ${signed.humanCode} | QR: ${signed.qrPayload}`,
          status: totalAmountCents > 0 ? "pending_payment" : "confirmed",
        });

      if (insertTicketErr) {
        throw new Error("Não foi possível emitir o ingresso no banco de dados.");
      }
    }

    // Increment sold_count on the tier in attributes.ticket_tiers and check automatic rollover
    if (Array.isArray(attrs.ticket_tiers)) {
      const updatedTiers = attrs.ticket_tiers.map((t: any) => {
        if (
          (authoritativeTier.matchedTier?.id && String(t.id) === String(authoritativeTier.matchedTier.id)) ||
          String(t.id) === String(input.tierId) ||
          String(t.name) === String(input.tierName)
        ) {
          const nextSold = Number(t.sold_count || 0) + input.quantity;
          const cap = Number(t.capacity ?? t.quantity ?? 100);
          return {
            ...t,
            sold_count: nextSold,
            status: cap > 0 && nextSold >= cap ? "sold_out" : t.status || "active",
          };
        }
        return t;
      });
      const { error: tierUpdateErr } = await supabase
        .from("classifieds")
        .update({
          attributes: {
            ...attrs,
            ticket_tiers: updatedTiers,
          },
        })
        .eq("id", classified.id);
      if (tierUpdateErr) {
        console.error("[classifieds-events] Erro ao atualizar sold_count do lote:", tierUpdateErr);
      }
    }

    const pixKey = String(attrs.pix_key || attrs.organizer_pix || "eventos@waesy.com.br");
    const pixCopyPaste =
      totalAmountCents > 0
        ? buildEmvPixCopyPaste({
            pixKey,
            merchantName: classified?.title || "WAESY EVENTOS",
            merchantCity: String(attrs.city || "CHAPECO"),
            amountCents: totalAmountCents,
            txid: issuedTickets[0]?.code.replace(/-/g, "") || "WAESYTKT",
          })
        : null;

    return {
      success: true,
      tickets: issuedTickets,
      pixCopyPaste,
      totalAmountCents,
    };
  });

export const voteClassifiedEventSurvey = createServerFn({ method: "POST" })
  .validator(
    z.object({
      classifiedId: z.string().min(1),
      surveyId: z.string().min(1),
      optionId: z.string().min(1),
    })
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const { data: classified } = await supabase
      .from("classifieds")
      .select("id, attributes")
      .eq("id", input.classifiedId)
      .maybeSingle();

    if (classified) {
      const attrs = ((classified.attributes || {}) as Record<string, any>) || {};
      const surveys = Array.isArray(attrs.surveys) ? attrs.surveys : [];
      const updatedSurveys = surveys.map((sv: any) => {
        if (String(sv.id) !== String(input.surveyId)) return sv;
        const options = Array.isArray(sv.options)
          ? sv.options.map((opt: any) =>
              String(opt.id) === String(input.optionId)
                ? { ...opt, votes: Number(opt.votes || 0) + 1 }
                : opt
            )
          : [];
        return { ...sv, options };
      });

      await supabase
        .from("classifieds")
        .update({ attributes: { ...attrs, surveys: updatedSurveys } })
        .eq("id", classified.id)
        .then(
          () => null,
          () => null
        );
    }

    return { success: true };
  });

export const getClassifiedEventPublicWall = createServerFn({ method: "GET" })
  .validator(z.object({ classifiedId: z.string().min(1) }))
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const { data: rows } = await supabase
      .from("classified_applications")
      .select("id, name, feedback_notes, cover_letter, status, applied_at")
      .eq("classified_id", input.classifiedId)
      .order("applied_at", { ascending: false })
      .limit(40);

    const list = rows || [];
    const attendees = list
      .filter(
        (r: any) =>
          r.status !== "vote_cast" &&
          !String(r.feedback_notes || "").startsWith("survey_vote:") &&
          !String(r.feedback_notes || "").startsWith("testimonial:")
      )
      .map((r: any) => ({
        id: r.id,
        name: r.name || "Participante",
      }));

    const testimonials = list
      .filter((r: any) => String(r.feedback_notes || "").startsWith("testimonial:"))
      .map((r: any) => {
        const ratingMatch = String(r.feedback_notes || "").split(":")[1];
        return {
          id: r.id,
          authorName: r.name || "Participante",
          rating: Number(ratingMatch) || 5,
          comment: r.cover_letter || "",
        };
      });

    return {
      attendees: attendees.slice(0, 20),
      totalConfirmed: attendees.length,
      testimonials: testimonials.slice(0, 10),
    };
  });

export const submitClassifiedEventTestimonial = createServerFn({ method: "POST" })
  .validator(
    z.object({
      classifiedId: z.string().min(1),
      authorName: z.string().min(2),
      rating: z.number().int().min(1).max(5).default(5),
      comment: z.string().min(3).max(600),
    })
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getIdentity().catch(() => null);
    const { data: classified } = await supabase
      .from("classifieds")
      .select("author_profile_id")
      .eq("id", input.classifiedId)
      .maybeSingle();

    await supabase.from("classified_applications").insert({
      classified_id: input.classifiedId,
      applicant_id: identity?.id || classified?.author_profile_id,
      name: input.authorName.trim(),
      feedback_notes: `testimonial:${input.rating}`,
      cover_letter: input.comment.trim(),
      status: "published",
    });

    return { success: true };
  });

export const verifyClassifiedTicketByCode = createServerFn({ method: "POST" })
  .validator(
    z.object({
      ticketCode: z.string().min(4),
      markAsCheckedIn: z.boolean().default(false),
    })
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const cleanCode = input.ticketCode.trim().toUpperCase();

    const { data: row } = await supabase
      .from("classified_applications")
      .select("id, name, feedback_notes, cover_letter, status")
      .ilike("cover_letter", `%${cleanCode}%`)
      .maybeSingle();

    if (!row) {
      return {
        valid: false,
        checkedInNow: false,
        message: "Credencial não localizada para este código.",
      };
    }

    if (input.markAsCheckedIn && row.status !== "checked_in") {
      await supabase
        .from("classified_applications")
        .update({ status: "checked_in" })
        .eq("id", row.id);
    }

    let parsedTier = "";
    try {
      const parsedCover = JSON.parse(String(row.cover_letter || "{}"));
      parsedTier = String(parsedCover?.tierName || parsedCover?.roleLabel || "");
    } catch {
      parsedTier = "";
    }

    return {
      valid: true,
      checkedInNow: input.markAsCheckedIn,
      buyerName: row.name || "Participante",
      tierName: String(parsedTier || row.feedback_notes || "Ingresso Geral").replace(/^Ingresso:\s*/i, ""),
      message:
        row.status === "checked_in" && !input.markAsCheckedIn
          ? "Credencial autêntica (Check-in já registrado anteriormente)."
          : "Credencial autêntica e validada com sucesso!",
    };
  });
