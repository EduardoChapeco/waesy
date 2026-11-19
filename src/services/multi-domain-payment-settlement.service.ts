/**
 * multi-domain-payment-settlement.service.ts — Liquidação Server-Side Multi-Domínio de Webhooks de Pagamento
 * 
 * Normativa: SPEC-PAGAMENTOS-GATEWAY, AGENTS.md B.5, B.25, EARS-06
 * Suporta liquidação e pós-processamento atômico para:
 * 1. Orders (Catálogo / E-commerce físico)
 * 2. Travel Proposals (Propostas / Cotações do Estúdio e Vitrine)
 * 3. Tourism Trips / Excursions (Viagens e Bloqueios de Excursão)
 * 4. Receivables (Faturas / Carnês Digitais)
 */

import { getServerClient } from "@/lib/supabase";
import { emitFinancialEvent } from "./financial-event-bus.service";

export interface UniversalWebhookPaymentInput {
  provider: string;
  eventId: string;
  providerRef: string;
  referenceId: string | null;
  status: string;
  amountCents: number;
  payload: Record<string, any>;
}

export interface UniversalWebhookPaymentResult {
  status: "processed" | "already_processed" | "not_handled";
  domain: "orders" | "proposals" | "tourism_trips" | "receivables" | "unknown";
  paymentId?: string;
  referenceId?: string | null;
  message?: string;
}

export async function processMultiDomainPaymentWebhook(
  input: UniversalWebhookPaymentInput,
): Promise<UniversalWebhookPaymentResult> {
  const db = getServerClient();
  const { provider, eventId, providerRef, referenceId, status, amountCents, payload } = input;
  const isPaid = ["approved", "paid", "confirmed", "succeeded"].includes(status.toLowerCase());
  const isFailed = ["rejected", "cancelled", "canceled", "failed"].includes(status.toLowerCase());

  // 1. Tenta identificar se a referência corresponde explicitamente ou implicitamente a um domínio
  const ref = (referenceId || "").trim();

  // ── Domínio 1: Proposta Turística (proposal:*, prop_*, ou UUID em travel_proposals) ──
  const isProposalRef = ref.startsWith("proposal:") || ref.startsWith("prop_");
  let proposalId: string | null = null;
  if (isProposalRef) {
    proposalId = ref.replace(/^proposal:/, "");
  } else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref)) {
    const { data: propCheck } = await db
      .from("travel_proposals")
      .select("id")
      .eq("id", ref)
      .maybeSingle();
    if (propCheck?.id) proposalId = propCheck.id;
  } else if (ref.length > 5) {
    const { data: propTokenCheck } = await db
      .from("travel_proposals")
      .select("id")
      .eq("public_token", ref)
      .maybeSingle();
    if (propTokenCheck?.id) proposalId = propTokenCheck.id;
  }

  if (proposalId) {
    const { data: proposal } = await db
      .from("travel_proposals")
      .select("id, store_id, lead_id, customer_id, title, destination_city, total_cents, total_value_cents")
      .eq("id", proposalId)
      .maybeSingle();

    if (proposal) {
      if (isPaid) {
        // Marca proposta como aprovada e aceite confirmado
        await db
          .from("travel_proposals")
          .update({
            status: "approved",
            acceptance_status: "accepted",
            updated_at: new Date().toISOString(),
          })
          .eq("id", proposal.id);

        // Se vinculado ao CRM, avança Lead para 'won'
        if (proposal.lead_id) {
          const { data: leadRow } = await db
            .from("leads_crm")
            .select("custom_fields")
            .eq("id", proposal.lead_id)
            .maybeSingle();

          const prevCustom = leadRow?.custom_fields && typeof leadRow.custom_fields === "object" ? leadRow.custom_fields : {};
          await db
            .from("leads_crm")
            .update({
              status: "won",
              custom_fields: {
                ...prevCustom,
                online_payment: {
                  provider,
                  provider_ref: providerRef,
                  amount_cents: amountCents,
                  paid_at: new Date().toISOString(),
                },
              },
              updated_at: new Date().toISOString(),
            })
            .eq("id", proposal.lead_id);
        }

        // Se houver contrato pendente, marca como assinado/liberado
        await db
          .from("contracts")
          .update({
            status: "signed",
            updated_at: new Date().toISOString(),
          })
          .eq("store_id", proposal.store_id)
          .eq("metadata->>proposal_id", proposal.id);

        // Atualiza ou insere transação confirmada em financial_transactions
        await db.from("financial_transactions").upsert({
          store_id: proposal.store_id,
          type: "revenue",
          status: "confirmed",
          amount_cents: amountCents,
          description: `Pagamento Online Aprovado: Proposta ${proposal.title || proposal.destination_city || ""} (${providerRef})`,
          metadata: {
            provider,
            provider_ref: providerRef,
            webhook_event_id: eventId,
            proposal_id: proposal.id,
            gateway_payload: payload,
          },
          updated_at: new Date().toISOString(),
        }, { onConflict: "store_id,description" });

        // Emite evento no barramento financeiro unificado se houver cliente
        if (proposal.customer_id) {
          await emitFinancialEvent({
            profileId: proposal.customer_id,
            sourceDomain: "TOURISM",
            sourceEntityId: proposal.id,
            eventType: "PAYMENT_CONFIRMED",
            direction: "INCOMING",
            amountCents,
            description: `Pagamento da Proposta: ${proposal.title || "Pacote Turístico"}`,
            status: "COMPLETED",
            metadata: { provider, providerRef, eventId },
          });
        }
      }

      return {
        status: "processed",
        domain: "proposals",
        referenceId: proposal.id,
        message: `Pagamento de proposta turística processado com sucesso (${status}).`,
      };
    }
  }

  // ── Domínio 2: Excursão / Viagem (trip:*, tour:*, EXC-*, ou UUID em tourism_trips) ──
  const isTripRef = ref.startsWith("trip:") || ref.startsWith("tour:") || ref.startsWith("EXC-");
  let tripId: string | null = null;
  if (isTripRef) {
    const rawCode = ref.replace(/^(trip:|tour:)/, "");
    const { data: tripFound } = await db
      .from("tourism_trips")
      .select("id")
      .or(`id.eq.${rawCode},trip_number.eq.${rawCode}`)
      .maybeSingle();
    if (tripFound?.id) tripId = tripFound.id;
  } else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref)) {
    const { data: tripCheck } = await db
      .from("tourism_trips")
      .select("id")
      .eq("id", ref)
      .maybeSingle();
    if (tripCheck?.id) tripId = tripCheck.id;
  }

  if (tripId) {
    const { data: trip } = await db
      .from("tourism_trips")
      .select("id, store_id, customer_id, title, trip_number, portal_content")
      .eq("id", tripId)
      .maybeSingle();

    if (trip) {
      if (isPaid) {
        const portal = trip.portal_content && typeof trip.portal_content === "object" ? trip.portal_content : {};
        await db
          .from("tourism_trips")
          .update({
            status: "confirmed",
            payment_status: "paid",
            portal_content: {
              ...portal,
              payment_status: "paid",
              paid_amount_cents: amountCents,
              paid_at: new Date().toISOString(),
              gateway_ref: providerRef,
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", trip.id);

        await db
          .from("financial_transactions")
          .update({ status: "confirmed", updated_at: new Date().toISOString() })
          .eq("store_id", trip.store_id)
          .eq("metadata->>trip_id", trip.id);
      }

      return {
        status: "processed",
        domain: "tourism_trips",
        referenceId: trip.id,
        message: `Pagamento de viagem/excursão processado com sucesso (${status}).`,
      };
    }
  }

  // ── Domínio 3: Recebíveis / Faturas (receivable:*, rec_*, ou UUID em receivables) ──
  const isRecRef = ref.startsWith("receivable:") || ref.startsWith("rec_");
  let recId: string | null = null;
  if (isRecRef) {
    recId = ref.replace(/^receivable:/, "");
  } else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref)) {
    const { data: recCheck } = await db
      .from("receivables")
      .select("id")
      .eq("id", ref)
      .maybeSingle();
    if (recCheck?.id) recId = recCheck.id;
  }

  if (recId) {
    const { data: receivable } = await db
      .from("receivables")
      .select("id, store_id, debtor_id, creditor_id, amount_cents, status")
      .eq("id", recId)
      .maybeSingle();

    if (receivable) {
      if (isPaid) {
        await db
          .from("receivables")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", receivable.id);

        if (receivable.debtor_id) {
          await emitFinancialEvent({
            profileId: receivable.debtor_id,
            sourceDomain: "WALLET",
            sourceEntityId: receivable.id,
            eventType: "RECEIVABLE_SETTLED",
            direction: "OUTGOING",
            amountCents,
            description: "Liquidação de fatura/recebível",
            status: "COMPLETED",
          });
        }
      }

      return {
        status: "processed",
        domain: "receivables",
        referenceId: receivable.id,
        message: `Recebível liquidado com sucesso (${status}).`,
      };
    }
  }

  // ── Domínio 4: E-commerce / Pedidos Físicos (RPC nativa de Orders) ──
  const orderId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref) ? ref : null;
  const { data: rpcData, error: rpcError } = await db.rpc("process_marketplace_payment_webhook_atomic", {
    p_provider: provider,
    p_event_id: eventId,
    p_provider_ref: providerRef,
    p_order_id: orderId,
    p_status: status,
    p_amount_cents: amountCents,
    p_payload: payload,
  });

  if (!rpcError && rpcData) {
    return {
      status: "processed",
      domain: "orders",
      referenceId: orderId,
      message: "Pagamento de pedido de catálogo processado via RPC atômica.",
    };
  }

  return {
    status: "not_handled",
    domain: "unknown",
    referenceId,
    message: rpcError ? rpcError.message : "Entidade de referência não identificada para este pagamento.",
  };
}
