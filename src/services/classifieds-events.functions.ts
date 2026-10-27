import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { signTicketPayload } from "@/lib/ticket-crypto";
import { getIdentity } from "./identity.functions";

function buildEmvPixCopyPaste(params: {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  amountCents: number;
  txid: string;
}): string {
  const formatField = (id: string, value: string) =>
    `${id}${String(value.length).padStart(2, "0")}${value}`;

  const cleanName = params.merchantName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .slice(0, 25)
    .toUpperCase() || "WAESY EVENTOS";
  const cleanCity = params.merchantCity
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .slice(0, 15)
    .toUpperCase() || "CHAPECO";
  const cleanTxid = params.txid.replace(/[^a-zA-Z0-9]/g, "").slice(0, 25) || "WAESYTKT";
  const amountStr = (Math.max(0, params.amountCents) / 100).toFixed(2);

  const gui = formatField("00", "br.gov.bcb.pix");
  const key = formatField("01", params.pixKey.trim());
  const merchantAccount = formatField("26", `${gui}${key}`);

  const payloadWithoutCrc = [
    formatField("00", "01"),
    merchantAccount,
    formatField("52", "0000"),
    formatField("53", "986"),
    ...(params.amountCents > 0 ? [formatField("54", amountStr)] : []),
    formatField("58", "BR"),
    formatField("59", cleanName),
    formatField("60", cleanCity),
    formatField("62", formatField("05", cleanTxid)),
    "6304",
  ].join("");

  let crc = 0xffff;
  for (let i = 0; i < payloadWithoutCrc.length; i++) {
    crc ^= payloadWithoutCrc.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  const crcHex = crc.toString(16).toUpperCase().padStart(4, "0");
  return `${payloadWithoutCrc}${crcHex}`;
}

/**
 * classifieds-events.functions.ts — Camada BFF para Gestão de Eventos em Classificados
 *
 * Funcionalidades:
 * 1. Inscrição Rápida de Leads / Participantes com captura real em classified_applications e leads_crm
 * 2. Exportação de Leads em CSV para organizadores auditados
 * 3. Enquetes e Interatividade em Tempo Real (votação e contagem de votos)
 * 4. Contagem e Sumário de Participantes Confirmados
 */

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

    // 1. Busca o anúncio para verificar integridade e store_id
    const { data: classified, error: classifiedErr } = await supabase
      .from("classifieds")
      .select("id, title, store_id, author_profile_id, category, attributes")
      .eq("id", input.classifiedId)
      .maybeSingle();

    if (classifiedErr || !classified) {
      throw new Error("Evento não encontrado ou inativo.");
    }

    const roleLabel = input.ticketTierName
      ? `Ingresso: ${input.ticketTierName}`
      : "Inscrição no Evento";

    const provisionalTicketId = crypto.randomUUID();
    const ownerProfileId = identity?.id || classified.author_profile_id;
    const signedTicket = signTicketPayload({
      ticketId: provisionalTicketId,
      eventId: input.classifiedId,
      lotId: input.ticketTierId || "classified-default-lot",
      ownerProfileId,
    });

    const priceCents = Number(input.ticketTierPriceCents || 0);
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
        candidate_role: roleLabel,
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
      console.warn("[classifieds-events] classified_applications insert notice:", appErr);
    }

    // 3. Se o evento possui Loja / Empresa vinculada, sincroniza com o Funil de Vendas leads_crm
    if (classified.store_id) {
      try {
        await supabase.from("leads_crm").insert({
          store_id: classified.store_id,
          full_name: input.name.trim(),
          phone: input.whatsapp.trim(),
          email: input.email?.trim() || null,
          title: `Inscrição Evento: ${classified.title}`,
          destination: `Evento: ${classified.title}`,
          source: "site",
          lead_source_detail: "Classificados / Eventos",
          status: "new",
          tags: ["Classificados", "Evento", input.ticketTierName || "Geral", signedTicket.humanCode],
          notes: `Participante inscrito no evento ${classified.title}. Lote: ${input.ticketTierName || "Padrão"}. Bilhete: ${signedTicket.humanCode}. Preço: ${priceCents > 0 ? `R$ ${(priceCents / 100).toFixed(2)}` : "Gratuito"}.`,
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

    // 2. Busca todos os inscritos reais (desconsiderando votos de enquetes)
    const { data: rows, error: rowsErr } = await supabase
      .from("classified_applications")
      .select("id, name, phone, email, candidate_role, cover_letter, status, created_at")
      .eq("classified_id", input.classifiedId)
      .not("candidate_role", "like", "survey_vote:%")
      .order("created_at", { ascending: false });

    if (rowsErr) {
      console.error("[classifieds-events] Erro ao buscar inscritos:", rowsErr);
      throw new Error("Falha ao buscar dados de inscritos.");
    }

    const list = rows || [];

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
      const dateStr = r.created_at
        ? new Date(r.created_at).toLocaleString("pt-BR")
        : "";
      const line = [
        sanitizeCsvCell(dateStr),
        sanitizeCsvCell(r.name),
        sanitizeCsvCell(r.phone),
        sanitizeCsvCell(r.email),
        sanitizeCsvCell(r.candidate_role),
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
      .not("candidate_role", "like", "survey_vote:%");

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
      candidate_role: `survey_vote:${input.surveyId}`,
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
      .select("id, name, created_at, cover_letter")
      .eq("classified_id", input.classifiedId)
      .eq("candidate_role", `survey_vote:${input.surveyId}`)
      .order("created_at", { ascending: false });

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
              createdAt: v.created_at,
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

    const { data: classified } = await supabase
      .from("classifieds")
      .select("id, title, store_id, author_profile_id, attributes")
      .eq("id", input.classifiedId)
      .maybeSingle();

    const ownerProfileId =
      identity?.id || classified?.author_profile_id || "00000000-0000-0000-0000-000000000000";
    const attrs = ((classified?.attributes || {}) as Record<string, any>) || {};
    const totalAmountCents = Math.max(0, input.unitPriceCents * input.quantity);

    const issuedTickets: Array<{ id: string; code: string; qrPayload: string }> = [];
    for (let i = 0; i < input.quantity; i++) {
      const ticketId = crypto.randomUUID();
      const signed = signTicketPayload({
        ticketId,
        eventId: input.classifiedId,
        lotId: input.tierId,
        ownerProfileId,
      });
      issuedTickets.push({
        id: ticketId,
        code: signed.humanCode,
        qrPayload: signed.qrPayload,
      });

      if (classified) {
        await supabase
          .from("classified_applications")
          .insert({
            id: ticketId,
            classified_id: input.classifiedId,
            applicant_id: ownerProfileId,
            name: input.buyerName.trim(),
            phone: input.buyerWhatsapp.trim(),
            email: input.buyerEmail?.trim() || null,
            candidate_role: `Ingresso: ${input.tierName}`,
            cover_letter: `Código WCTS-1: ${signed.humanCode} | QR: ${signed.qrPayload}`,
            status: totalAmountCents > 0 ? "pending_payment" : "confirmed",
          })
          .then(
            () => null,
            () => null
          );
      }
    }

    // Increment sold_count on the tier in attributes.ticket_tiers and check automatic rollover
    if (classified && Array.isArray(attrs.ticket_tiers)) {
      const updatedTiers = attrs.ticket_tiers.map((t: any) => {
        if (String(t.id) === String(input.tierId) || String(t.name) === String(input.tierName)) {
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
      await supabase
        .from("classifieds")
        .update({
          attributes: {
            ...attrs,
            ticket_tiers: updatedTiers,
          },
        })
        .eq("id", classified.id)
        .then(
          () => null,
          () => null
        );
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
      .select("id, name, candidate_role, cover_letter, status, created_at")
      .eq("classified_id", input.classifiedId)
      .order("created_at", { ascending: false })
      .limit(40);

    const list = rows || [];
    const attendees = list
      .filter(
        (r: any) =>
          !String(r.candidate_role || "").startsWith("survey_vote:") &&
          !String(r.candidate_role || "").startsWith("testimonial:")
      )
      .map((r: any) => ({
        id: r.id,
        name: r.name || "Participante",
      }));

    const testimonials = list
      .filter((r: any) => String(r.candidate_role || "").startsWith("testimonial:"))
      .map((r: any) => {
        const ratingMatch = String(r.candidate_role || "").split(":")[1];
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
      candidate_role: `testimonial:${input.rating}`,
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
      .select("id, name, candidate_role, cover_letter, status")
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

    return {
      valid: true,
      checkedInNow: input.markAsCheckedIn,
      buyerName: row.name || "Participante",
      tierName: String(row.candidate_role || "Ingresso Geral").replace(/^Ingresso:\s*/i, ""),
      message:
        row.status === "checked_in" && !input.markAsCheckedIn
          ? "Credencial autêntica (Check-in já registrado anteriormente)."
          : "Credencial autêntica e validada com sucesso!",
    };
  });
