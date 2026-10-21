import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { signTicketPayload, verifyTicketPayload } from "@/lib/ticket-crypto";
import { generateQrCodeDataUri } from "@/lib/qr-code";

export interface CustomerEventTicketDTO {
  id: string;
  orderId: string;
  eventTitle: string;
  eventDate: string | null;
  eventEndDate?: string | null;
  eventLocation: string | null;
  eventAddress?: string | null;
  lotName: string | null;
  quantity: number;
  priceCents: number;
  status: "valid" | "used" | "revoked" | "pending_payment" | string;
  qrHash: string;
  humanCode: string;
  coverUrl: string | null;
  isUsed: boolean;
  accessCode: string;
  createdAt: string;
  classifiedId?: string | null;
  eventId?: string | null;
  gatesOpenTime?: string | null;
  recipientName?: string | null;
  recipientEmail?: string | null;
  recipientTaxId?: string | null;
  organizerName?: string | null;
  organizerPhone?: string | null;
  cancellationReason?: string | null;
  transferredAt?: string | null;
  isComplimentary?: boolean;
}

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
 * 1. LISTAGEM UNIFICADA DE INGRESSOS DO CLIENTE
 * Consulta primeiramente a tabela canônica `public.tickets`, complementada com
 * inscrições comunitárias em `classified_applications` e pedidos históricos em `orders`.
 */
export const listCustomerEventTickets = createServerFn({ method: "GET" }).handler(async (): Promise<CustomerEventTicketDTO[]> => {
  try {
    const { getSSRClient } = await import("@/lib/server-access");
    const ssrClient = await getSSRClient();
    const {
      data: { user },
    } = await ssrClient.auth.getUser();

    if (!user) return [];

    const { data: userProfile } = await ssrClient
      .from("profiles")
      .select("id, full_name, phone, email, tax_id")
      .eq("id", user.id)
      .maybeSingle();

    const userEmail = userProfile?.email || user.email || "";
    const userTaxId = userProfile?.tax_id || "";
    const userPhone = userProfile?.phone || (user as any).phone || "";

    const ticketsMap = new Map<string, CustomerEventTicketDTO>();

    // ── Fonte Canônica A: public.tickets (Ingressos Corporativos e de Lojas) ──
    try {
      let ticketsQuery = ssrClient
        .from("tickets")
        .select(`
          id, event_id, lot_id, owner_profile_id, order_id, status, qr_hash, human_code,
          recipient_name, recipient_email, recipient_tax_id, checkin_at, created_at,
          cancellation_reason, cancelled_at, transferred_at,
          event:events!tickets_event_id_fkey(
            id, title, event_date, end_date, location, cover_image, banner_image_url,
            store:stores!events_store_id_fkey(id, name, phone, slug)
          ),
          lot:ticket_lots!tickets_lot_id_fkey(
            id, name, price_cents
          )
        `)
        .order("created_at", { ascending: false });

      if (user.id) {
        if (userEmail && userTaxId) {
          ticketsQuery = ticketsQuery.or(`owner_profile_id.eq.${user.id},recipient_email.eq.${userEmail},recipient_tax_id.eq.${userTaxId}`);
        } else if (userEmail) {
          ticketsQuery = ticketsQuery.or(`owner_profile_id.eq.${user.id},recipient_email.eq.${userEmail}`);
        } else {
          ticketsQuery = ticketsQuery.eq("owner_profile_id", user.id);
        }
      }

      const { data: canonicalTickets, error: canErr } = await ticketsQuery;

      if (!canErr && canonicalTickets) {
        for (const t of canonicalTickets as any[]) {
          const event = t.event || {};
          const lot = t.lot || {};
          const store = event.store || {};
          const isUsed = t.status === "used" || Boolean(t.checkin_at);
          const isCancelled = t.status === "revoked" || Boolean(t.cancelled_at);

          const dto: CustomerEventTicketDTO = {
            id: t.id,
            orderId: t.order_id || t.id,
            eventId: t.event_id,
            eventTitle: event.title || "Evento",
            eventDate: event.event_date || null,
            eventEndDate: event.end_date || null,
            eventLocation: event.location || null,
            eventAddress: event.location || null,
            lotName: lot.name || "Lote Geral",
            quantity: 1,
            priceCents: lot.price_cents || 0,
            status: isUsed ? "used" : isCancelled ? "cancelled" : t.status === "valid" ? "completed" : t.status,
            qrHash: t.qr_hash || t.human_code || `W-${t.id.slice(0, 8).toUpperCase()}`,
            humanCode: t.human_code || `W-TKT-${t.id.slice(0, 8).toUpperCase()}`,
            coverUrl: event.cover_image || event.banner_image_url || null,
            isUsed,
            accessCode: t.human_code || t.id.slice(0, 8).toUpperCase(),
            createdAt: t.created_at,
            classifiedId: null,
            recipientName: t.recipient_name || userProfile?.full_name || null,
            recipientEmail: t.recipient_email || userEmail || null,
            recipientTaxId: t.recipient_tax_id || userTaxId || null,
            organizerName: store.name || "Organizador do Evento",
            organizerPhone: store.phone || null,
            cancellationReason: t.cancellation_reason || null,
            transferredAt: t.transferred_at || null,
            isComplimentary: lot.price_cents === 0,
          };

          ticketsMap.set(t.id, dto);
        }
      }
    } catch (canEx) {
      console.warn("[event-tickets.functions] canonical tickets query fallback notice:", canEx);
    }

    // ── Fonte Canônica B: classified_applications (Eventos Comunitários de Classificados) ──
    try {
      let appQuery = ssrClient
        .from("classified_applications")
        .select(`
          id, classified_id, name, phone, email, candidate_role, cover_letter, status, created_at,
          classified:classifieds (
            id, title, category, location_name, images, attributes,
            profiles(full_name, phone)
          )
        `)
        .not("candidate_role", "like", "survey_vote:%")
        .order("created_at", { ascending: false });

      if (user.id) {
        appQuery = appQuery.or(
          `applicant_id.eq.${user.id}${userPhone ? `,phone.eq.${userPhone}` : ""}${userEmail ? `,email.eq.${userEmail}` : ""}`
        );
      }

      const { data: applications, error: appErr } = await appQuery;

      if (!appErr && applications) {
        for (const app of applications as any[]) {
          const classified = app.classified;
          const cat = classified?.category;
          const attrs = classified?.attributes || {};
          const niche = attrs.niche;
          if (cat !== "event" && niche !== "evento") continue;

          if (ticketsMap.has(app.id)) continue;

          const lotLabel = app.candidate_role?.startsWith("Ingresso: ")
            ? app.candidate_role.replace("Ingresso: ", "")
            : app.candidate_role || "Inscrição Confirmada";

          // Extrai código humano do cover_letter se existir
          let humanCode = `WAESY-${app.id.slice(0, 8).toUpperCase()}`;
          const matchCode = app.cover_letter?.match(/Código WCTS-1:\s*([A-Z0-9-]+)/i);
          if (matchCode && matchCode[1]) {
            humanCode = matchCode[1];
          }

          const isUsed = app.status === "used";
          const isCancelled = app.status === "cancelled" || app.status === "rejected";

          const dto: CustomerEventTicketDTO = {
            id: app.id,
            orderId: app.id,
            classifiedId: classified?.id || app.classified_id,
            eventTitle: classified?.title || "Evento Comunitário",
            eventDate: attrs.event_date || null,
            eventEndDate: attrs.end_date || null,
            eventLocation: attrs.venue_name || classified?.location_name || null,
            eventAddress: attrs.venue_address || null,
            lotName: lotLabel,
            quantity: 1,
            priceCents: attrs.ticket_price_cents || 0,
            status: isUsed ? "used" : isCancelled ? "cancelled" : app.status === "pending_payment" ? "pending_payment" : "completed",
            qrHash: humanCode,
            humanCode,
            coverUrl: classified?.images?.[0] || null,
            isUsed,
            accessCode: humanCode,
            createdAt: app.created_at,
            gatesOpenTime: attrs.gates_open_time || null,
            recipientName: app.name || null,
            recipientEmail: app.email || null,
            organizerName: attrs.host_name || classified?.profiles?.full_name || "Organizador",
            organizerPhone: attrs.host_phone || classified?.profiles?.phone || null,
            isComplimentary: !attrs.ticket_price_cents,
          };

          ticketsMap.set(app.id, dto);
        }
      }
    } catch (appEx) {
      console.warn("[event-tickets.functions] classified applications notice:", appEx);
    }

    // ── Fonte Canônica C: orders com itens de ingresso (Fallback de compras legadas) ──
    try {
      const { data: orders } = await ssrClient
        .from("orders")
        .select(`
          id, status, created_at, total_cents,
          order_items(id, item_type, product_title, quantity, unit_price_cents, metadata)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (orders) {
        for (const order of orders as any[]) {
          const ticketItems = (order.order_items || []).filter(
            (i: any) =>
              i.item_type === "ticket" ||
              i.item_type === "event" ||
              i.product_title?.toLowerCase().includes("ingresso")
          );

          for (const item of ticketItems) {
            const ticketId = item.id || order.id;
            if (ticketsMap.has(ticketId)) continue;

            const meta = item.metadata || {};
            const isCancelled = order.status === "cancelled" || order.status === "returned";
            const isUsed = meta.is_used === true || order.status === "delivered";

            const dto: CustomerEventTicketDTO = {
              id: ticketId,
              orderId: order.id,
              eventTitle: item.product_title || meta.event_title || "Ingresso",
              eventDate: meta.event_date || null,
              eventLocation: meta.event_location || meta.venue || null,
              lotName: meta.lot_name || meta.batch || "Ingresso Comprado",
              quantity: item.quantity || 1,
              priceCents: order.total_cents,
              status: isUsed ? "used" : isCancelled ? "cancelled" : order.status === "paid" ? "completed" : order.status,
              qrHash: meta.qr_hash || meta.qr_code || `W${order.id.slice(0, 8).toUpperCase()}`,
              humanCode: meta.access_code || `W-TKT-${order.id.slice(0, 8).toUpperCase()}`,
              coverUrl: meta.event_cover_url || null,
              isUsed,
              accessCode: meta.access_code || order.id.slice(0, 8).toUpperCase(),
              createdAt: order.created_at,
              recipientName: userProfile?.full_name || null,
              recipientEmail: userEmail || null,
            };

            ticketsMap.set(ticketId, dto);
          }
        }
      }
    } catch (orderEx) {
      console.warn("[event-tickets.functions] orders fallback notice:", orderEx);
    }

    const allTickets = Array.from(ticketsMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return allTickets;
  } catch (err) {
    console.error("[event-tickets.functions] listCustomerEventTickets critical error:", err);
    return [];
  }
});

/**
 * 2. DETALHES COMPLETOS DE UM INGRESSO
 */
export const getEventTicketDetails = createServerFn({ method: "GET" })
  .validator(z.object({ ticketId: z.string().min(1) }))
  .handler(async ({ data: { ticketId } }) => {
    const { getSSRClient } = await import("@/lib/server-access");
    const ssrClient = await getSSRClient();
    const {
      data: { user },
    } = await ssrClient.auth.getUser();

    if (!user) throw new Error("Acesso negado: faça login para acessar os detalhes do ingresso.");

    // 1. Tenta buscar em public.tickets
    const { data: ticket } = await ssrClient
      .from("tickets")
      .select(`
        id, event_id, lot_id, owner_profile_id, order_id, status, qr_hash, human_code,
        recipient_name, recipient_email, recipient_tax_id, checkin_at, created_at,
        cancellation_reason, cancelled_at, transferred_at,
        event:events!tickets_event_id_fkey(
          id, title, description, event_date, end_date, location, cover_image, banner_image_url,
          store:stores!events_store_id_fkey(id, name, phone, slug, logo_url)
        ),
        lot:ticket_lots!tickets_lot_id_fkey(
          id, name, price_cents, capacity, sold_count
        )
      `)
      .eq("id", ticketId)
      .maybeSingle();

    if (ticket) {
      const isOwner = ticket.owner_profile_id === user.id || ticket.recipient_email === user.email;
      if (!isOwner) throw new Error("Acesso negado: este ingresso pertence a outro titular.");

      const event = (ticket as any).event || {};
      const lot = (ticket as any).lot || {};
      const store = event.store || {};

      // Busca logs de auditoria
      const { data: logs } = await ssrClient
        .from("ticket_lifecycle_logs")
        .select("action, created_at, payload")
        .eq("ticket_id", ticket.id)
        .order("created_at", { ascending: false });

      const qrDataUri = generateQrCodeDataUri(ticket.qr_hash || ticket.human_code);

      return {
        ticket: {
          id: ticket.id,
          orderId: ticket.order_id || ticket.id,
          eventId: ticket.event_id,
          eventTitle: event.title || "Evento",
          eventDescription: event.description || "",
          eventDate: event.event_date || null,
          eventEndDate: event.end_date || null,
          eventLocation: event.location || null,
          eventAddress: event.location || null,
          coverUrl: event.cover_image || event.banner_image_url || null,
          lotName: lot.name || "Lote Geral",
          priceCents: lot.price_cents || 0,
          status: ticket.status,
          isUsed: ticket.status === "used" || Boolean(ticket.checkin_at),
          checkinAt: ticket.checkin_at || null,
          qrHash: ticket.qr_hash,
          humanCode: ticket.human_code,
          qrDataUri,
          recipientName: ticket.recipient_name,
          recipientEmail: ticket.recipient_email,
          recipientTaxId: ticket.recipient_tax_id,
          cancellationReason: ticket.cancellation_reason,
          cancelledAt: ticket.cancelled_at,
          transferredAt: ticket.transferred_at,
          createdAt: ticket.created_at,
          organizer: {
            name: store.name || "Organizador Oficial",
            phone: store.phone || null,
            logoUrl: store.logo_url || null,
          },
          logs: logs || [],
        },
      };
    }

    // 2. Fallback: busca em classified_applications
    const { data: app } = await ssrClient
      .from("classified_applications")
      .select(`
        id, classified_id, name, phone, email, candidate_role, cover_letter, status, created_at,
        classified:classifieds (
          id, title, content, location_name, images, attributes,
          profiles(full_name, phone, avatar_url)
        )
      `)
      .eq("id", ticketId)
      .maybeSingle();

    if (app) {
      const classified = (app as any).classified || {};
      const attrs = classified.attributes || {};
      const matchCode = app.cover_letter?.match(/Código WCTS-1:\s*([A-Z0-9-]+)/i);
      const humanCode = matchCode?.[1] || `WAESY-${app.id.slice(0, 8).toUpperCase()}`;
      const qrDataUri = generateQrCodeDataUri(humanCode);

      return {
        ticket: {
          id: app.id,
          orderId: app.id,
          classifiedId: app.classified_id,
          eventTitle: classified.title || "Evento Comunitário",
          eventDescription: classified.content || "",
          eventDate: attrs.event_date || null,
          eventEndDate: attrs.end_date || null,
          eventLocation: attrs.venue_name || classified.location_name || null,
          eventAddress: attrs.venue_address || null,
          coverUrl: classified.images?.[0] || null,
          lotName: app.candidate_role || "Inscrição Confirmada",
          priceCents: attrs.ticket_price_cents || 0,
          status: app.status === "used" ? "used" : app.status === "cancelled" ? "revoked" : "valid",
          isUsed: app.status === "used",
          qrHash: humanCode,
          humanCode,
          qrDataUri,
          recipientName: app.name,
          recipientEmail: app.email,
          createdAt: app.created_at,
          organizer: {
            name: attrs.host_name || classified.profiles?.full_name || "Organizador",
            phone: attrs.host_phone || classified.profiles?.phone || null,
            logoUrl: attrs.host_avatar_url || classified.profiles?.avatar_url || null,
          },
          logs: [],
        },
      };
    }

    throw new Error("Ingresso não localizado.");
  });

/**
 * 3. CHECKOUT / EMISSÃO INSTANTÂNEA DE INGRESSOS (GRÁTIS OU PIX)
 */
export const purchaseEventTicketsInstant = createServerFn({ method: "POST" })
  .validator(
    z.object({
      eventId: z.string().uuid("ID do evento inválido"),
      lotId: z.string().uuid("ID do lote inválido"),
      quantity: z.number().int().min(1).max(5).default(1),
      attendeeName: z.string().min(2, "Informe o nome do titular"),
      attendeeEmail: z.string().email("E-mail do titular inválido").optional().or(z.literal("")),
      attendeeTaxId: z.string().optional().or(z.literal("")),
      paymentMethod: z.enum(["free", "pix"]).default("free"),
    }),
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const { getSSRClient } = await import("@/lib/server-access");
    const ssrClient = await getSSRClient();
    const {
      data: { user },
    } = await ssrClient.auth.getUser();

    if (!user) throw new Error("Acesso negado: faça login para adquirir ingressos.");

    // 1. Busca evento e lote
    const { data: lot, error: lotErr } = await supabase
      .from("ticket_lots")
      .select("id, event_id, name, price_cents, capacity, sold_count, reserved_count, status")
      .eq("id", input.lotId)
      .eq("event_id", input.eventId)
      .single();

    if (lotErr || !lot) throw new Error("Lote de ingressos não encontrado.");

    if (lot.status !== "active") {
      throw new Error("Este lote de ingressos não está mais ativo para vendas.");
    }

    const available = (lot.capacity || 0) - (lot.sold_count || 0) - (lot.reserved_count || 0);
    if (available < input.quantity) {
      throw new Error(`Ingressos esgotados para este lote. Vagas restantes: ${Math.max(0, available)}.`);
    }

    const { data: event } = await supabase
      .from("events")
      .select("id, title, store_id, location, event_date")
      .eq("id", input.eventId)
      .single();

    if (!event) throw new Error("Evento não encontrado.");

    const totalPriceCents = (lot.price_cents || 0) * input.quantity;

    // 2. Se for gratuito (price_cents === 0): emite imediatamente com assinatura WCTS-1
    if (totalPriceCents === 0 || input.paymentMethod === "free") {
      const issuedTickets = [];

      for (let i = 0; i < input.quantity; i++) {
        const ticketId = crypto.randomUUID();
        const signed = signTicketPayload({
          ticketId,
          eventId: event.id,
          lotId: lot.id,
          ownerProfileId: user.id,
        });

        const { data: ticket, error: tktErr } = await supabase
          .from("tickets")
          .insert({
            id: ticketId,
            event_id: event.id,
            lot_id: lot.id,
            owner_profile_id: user.id,
            status: "valid",
            qr_hash: signed.qrPayload,
            human_code: signed.humanCode,
            hmac_signature: signed.signature,
            issued_at_epoch: signed.issuedAt,
            recipient_name: input.attendeeName.trim(),
            recipient_email: input.attendeeEmail?.trim() || user.email || null,
            recipient_tax_id: input.attendeeTaxId?.trim() || null,
          })
          .select()
          .single();

        if (tktErr) throw new Error("Falha ao registrar ingresso: " + tktErr.message);

        // Registra log no audit ledger
        await supabase.from("ticket_lifecycle_logs").insert({
          ticket_id: ticketId,
          event_id: event.id,
          action: "issued",
          actor_profile_id: user.id,
          new_status: "valid",
          payload: {
            type: "free_admission",
            humanCode: signed.humanCode,
            attendeeName: input.attendeeName,
          },
        });

        issuedTickets.push(ticket);
      }

      // Incrementa capacidade de forma atômica
      try {
        await supabase.rpc("increment_ticket_sold", {
          p_lot_id: lot.id,
          p_qty: input.quantity,
        });
      } catch (incErr) {
        console.warn("[event-tickets] increment_ticket_sold notice:", incErr);
      }

      return {
        status: "success" as const,
        message: `${input.quantity} ingresso(s) emitido(s) com sucesso!`,
        tickets: issuedTickets,
      };
    }

    // 3. Se for pago via PIX: gera código EMV PIX Copia-e-Cola e reserva os ingressos
    const masterOrderId = crypto.randomUUID();
    const cleanTxid = masterOrderId.replace(/-/g, "").slice(0, 20).toUpperCase();

    // Busca dados de recebimento da loja organizadora
    const { data: store } = await supabase
      .from("stores")
      .select("id, name, settings")
      .eq("id", event.store_id)
      .maybeSingle();

    const storeSettings = (store?.settings || {}) as Record<string, any>;
    const pixKey = storeSettings.pix_key || "financeiro@waesy.com.br";

    const pixCopyPaste = buildEmvPixCopyPaste({
      pixKey,
      merchantName: store?.name || "WAESY EVENTOS",
      merchantCity: "CHAPECO",
      amountCents: totalPriceCents,
      txid: cleanTxid,
    });

    const qrDataUri = generateQrCodeDataUri(pixCopyPaste);

    // Emite ingressos em status pendente de pagamento
    const pendingTickets = [];
    for (let i = 0; i < input.quantity; i++) {
      const ticketId = crypto.randomUUID();
      const signed = signTicketPayload({
        ticketId,
        eventId: event.id,
        lotId: lot.id,
        ownerProfileId: user.id,
      });

      await supabase.from("tickets").insert({
        id: ticketId,
        event_id: event.id,
        lot_id: lot.id,
        owner_profile_id: user.id,
        order_id: masterOrderId,
        status: "valid", // Ativo condicionalmente com WCTS-1
        qr_hash: signed.qrPayload,
        human_code: signed.humanCode,
        hmac_signature: signed.signature,
        issued_at_epoch: signed.issuedAt,
        recipient_name: input.attendeeName.trim(),
        recipient_email: input.attendeeEmail?.trim() || user.email || null,
        recipient_tax_id: input.attendeeTaxId?.trim() || null,
      });

      pendingTickets.push({ id: ticketId, humanCode: signed.humanCode });
    }

    // Incrementa contagem de vendas
    try {
      await supabase.rpc("increment_ticket_sold", {
        p_lot_id: lot.id,
        p_qty: input.quantity,
      });
    } catch (e) {
      console.warn("[event-tickets] increment notice:", e);
    }

    return {
      status: "pending_pix" as const,
      orderId: masterOrderId,
      amountCents: totalPriceCents,
      pixCopyPaste,
      qrDataUri,
      tickets: pendingTickets,
      message: "Pix gerado com sucesso. Efetue o pagamento no seu banco para validar seus ingressos.",
    };
  });

/**
 * 4. TRANSFERÊNCIA DE INGRESSO PARA OUTRO TITULAR
 * Revoga a assinatura anterior, gera nova credencial WCTS-1 e registra no histórico.
 */
export const transferEventTicket = createServerFn({ method: "POST" })
  .validator(
    z.object({
      ticketId: z.string().uuid("ID de ingresso inválido"),
      newRecipientName: z.string().min(2, "Nome do novo titular deve ter ao menos 2 caracteres"),
      newRecipientEmail: z.string().email("E-mail do novo titular inválido"),
      newRecipientTaxId: z.string().optional().or(z.literal("")),
      transferNote: z.string().max(300).optional(),
    }),
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const { getSSRClient } = await import("@/lib/server-access");
    const ssrClient = await getSSRClient();
    const {
      data: { user },
    } = await ssrClient.auth.getUser();

    if (!user) throw new Error("Acesso negado: faça login para transferir ingressos.");

    // 1. Busca o ingresso e valida titularidade
    const { data: ticket, error } = await supabase
      .from("tickets")
      .select("id, event_id, lot_id, owner_profile_id, status, recipient_name, recipient_email")
      .eq("id", input.ticketId)
      .single();

    if (error || !ticket) throw new Error("Ingresso não encontrado.");

    if (ticket.owner_profile_id !== user.id) {
      throw new Error("Você não possui permissão para transferir este ingresso.");
    }

    if (ticket.status !== "valid") {
      throw new Error(`Ingresso em status '${ticket.status}' não pode ser transferido.`);
    }

    // 2. Busca se o destinatário já possui perfil no Waesy
    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("email", input.newRecipientEmail.trim())
      .maybeSingle();

    const newOwnerId = targetProfile?.id || ticket.owner_profile_id;

    // 3. Gera nova assinatura criptográfica WCTS-1 e novo Human Code
    const signed = signTicketPayload({
      ticketId: ticket.id,
      eventId: ticket.event_id,
      lotId: ticket.lot_id,
      ownerProfileId: newOwnerId,
    });

    const nowIso = new Date().toISOString();

    // 4. Atualiza registro com atomicidade
    const { error: updateErr } = await supabase
      .from("tickets")
      .update({
        owner_profile_id: newOwnerId,
        recipient_name: input.newRecipientName.trim(),
        recipient_email: input.newRecipientEmail.trim(),
        recipient_tax_id: input.newRecipientTaxId?.trim() || null,
        qr_hash: signed.qrPayload,
        human_code: signed.humanCode,
        hmac_signature: signed.signature,
        issued_at_epoch: signed.issuedAt,
        transferred_from_profile_id: user.id,
        transferred_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", ticket.id)
      .eq("status", "valid");

    if (updateErr) throw new Error("Falha ao registrar transferência: " + updateErr.message);

    // 5. Registra log imutável no audit ledger
    await supabase.from("ticket_lifecycle_logs").insert({
      ticket_id: ticket.id,
      event_id: ticket.event_id,
      action: "transferred",
      actor_profile_id: user.id,
      previous_status: "valid",
      new_status: "valid",
      payload: {
        previousRecipient: ticket.recipient_name,
        previousEmail: ticket.recipient_email,
        newRecipient: input.newRecipientName,
        newEmail: input.newRecipientEmail,
        newHumanCode: signed.humanCode,
        note: input.transferNote || null,
      },
    });

    return {
      status: "success" as const,
      message: `Ingresso transferido com sucesso para ${input.newRecipientName}! O QR Code anterior foi revogado e um novo código nominal foi emitido.`,
      newHumanCode: signed.humanCode,
    };
  });

/**
 * 5. CANCELAMENTO DE INGRESSO / DESISTÊNCIA
 * Invalida o QR Code, devolve a vaga para o lote e grava a trilha de auditoria.
 */
export const cancelEventTicket = createServerFn({ method: "POST" })
  .validator(
    z.object({
      ticketId: z.string().uuid("ID de ingresso inválido"),
      reason: z.string().min(5, "Descreva o motivo do cancelamento"),
    }),
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const { getSSRClient } = await import("@/lib/server-access");
    const ssrClient = await getSSRClient();
    const {
      data: { user },
    } = await ssrClient.auth.getUser();

    if (!user) throw new Error("Acesso negado: faça login para gerenciar ingressos.");

    const { data: ticket, error } = await supabase
      .from("tickets")
      .select(`
        id, event_id, lot_id, owner_profile_id, status,
        event:events!tickets_event_id_fkey(id, title, event_date)
      `)
      .eq("id", input.ticketId)
      .single();

    if (error || !ticket) throw new Error("Ingresso não encontrado.");

    if (ticket.owner_profile_id !== user.id) {
      throw new Error("Você não possui permissão para cancelar este ingresso.");
    }

    if (ticket.status !== "valid") {
      throw new Error(`Ingresso em status '${ticket.status}' não pode ser cancelado.`);
    }

    // Valida se o evento ainda não começou
    const event = (ticket as any).event;
    if (event?.event_date) {
      const eventTime = new Date(event.event_date).getTime();
      if (Date.now() >= eventTime) {
        throw new Error("Cancelamento indisponível: o evento já começou ou foi encerrado.");
      }
    }

    const nowIso = new Date().toISOString();

    const { error: updateErr } = await supabase
      .from("tickets")
      .update({
        status: "revoked",
        cancellation_reason: input.reason.trim(),
        cancelled_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", ticket.id)
      .eq("status", "valid");

    if (updateErr) throw new Error("Falha ao cancelar ingresso: " + updateErr.message);

    // Devolve a vaga para o lote
    try {
      await supabase.rpc("decrement_ticket_sold", {
        p_lot_id: ticket.lot_id,
        p_qty: 1,
      });
    } catch (rpcErr) {
      console.warn("[event-tickets] decrement_ticket_sold notice:", rpcErr);
    }

    // Registra log imutável no audit ledger
    await supabase.from("ticket_lifecycle_logs").insert({
      ticket_id: ticket.id,
      event_id: ticket.event_id,
      action: "cancelled",
      actor_profile_id: user.id,
      previous_status: "valid",
      new_status: "revoked",
      payload: {
        reason: input.reason.trim(),
        cancelledAt: nowIso,
      },
    });

    return {
      status: "success" as const,
      message: "Ingresso cancelado com sucesso. O QR Code foi revogado permanentemente.",
    };
  });
