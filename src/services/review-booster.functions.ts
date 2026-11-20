/**
 * review-booster.functions.ts — Motor Review Booster & Blindagem de Reputação (`/avaliar/$token`)
 *
 * - Compila as respostas guiadas do cliente em um depoimento autêntico pronto para copiar.
 * - Bifurcação Inteligente:
 *   - Nota >= 8 (Promotor): exibe depoimento compilado + botão Copiar e Abrir Google Meu Negócio.
 *   - Nota < 8 (Detrator/Neutro): retém feedback de forma privada e gera alerta imediato para a gerência.
 */

import { randomUUID } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";

export function compileStructuredReviewTestimonial(params: {
  storeName: string;
  destinationOrItem?: string | null;
  highlightMoment: string;
  serviceQuality: string;
  wouldRecommendReason?: string | null;
}): string {
  const parts: string[] = [];
  const itemLabel = params.destinationOrItem?.trim();
  if (itemLabel) {
    parts.push(`Experiência excelente com a ${params.storeName} (${itemLabel})!`);
  } else {
    parts.push(`Atendimento impecável da ${params.storeName}!`);
  }

  if (params.highlightMoment.trim()) {
    parts.push(params.highlightMoment.trim().replace(/[.!?]+$/, "") + ".");
  }
  if (params.serviceQuality.trim()) {
    parts.push(`Destaque para ${params.serviceQuality.trim().replace(/[.!?]+$/, "")}.`);
  }
  if (params.wouldRecommendReason?.trim()) {
    parts.push(params.wouldRecommendReason.trim().replace(/[.!?]+$/, "") + ".");
  }

  return parts.join(" ");
}

export const createReviewBoosterInviteFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      customerId: z.string().uuid().optional().nullable(),
      tripId: z.string().uuid().optional().nullable(),
      orderId: z.string().uuid().optional().nullable(),
      customerName: z.string().trim().min(2).max(140),
      customerPhone: z.string().trim().max(40).optional().nullable(),
      destinationOrItem: z.string().trim().max(160).optional().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    const db = getServerClient();
    const token = `rv-${randomUUID().replace(/-/g, "").slice(0, 16)}`;

    const { data: row, error } = await db
      .from("review_booster_submissions")
      .insert({
        store_id: identity.store_id,
        token,
        customer_id: data.customerId || null,
        trip_id: data.tripId || null,
        order_id: data.orderId || null,
        customer_name: data.customerName,
        customer_phone: data.customerPhone || null,
        destination_or_item: data.destinationOrItem || null,
        status: "pending",
      })
      .select("id, token")
      .single();

    if (error || !row) throw new Error(`Falha ao gerar link Review Booster: ${error?.message}`);
    return {
      id: row.id,
      token: row.token,
      publicUrl: `/avaliar/${row.token}`,
    };
  });

export const getPublicReviewBoosterByTokenFn = createServerFn({ method: "GET" })
  .validator(z.object({ token: z.string().trim().min(3).max(160) }))
  .handler(async ({ data: { token } }) => {
    const db = getServerClient();

    // Suporta também token direto de loja `/avaliar/loja-<storeId>` ou `/avaliar/<slug>`
    if (token.startsWith("loja-")) {
      const storeId = token.slice("loja-".length);
      const { data: store } = await db
        .from("stores")
        .select("id, name, slug, logo_url, settings")
        .eq("id", storeId)
        .maybeSingle();
      if (!store) return null;
      const gmbUrl = ((store.settings as any)?.gmb_review_url || (store.settings as any)?.google_review_url || null) as string | null;
      return {
        token,
        storeId: store.id,
        storeName: store.name,
        storeLogoUrl: (store as any).logo_url || null,
        customerName: "",
        destinationOrItem: null,
        status: "pending" as const,
        gmbReviewUrl: gmbUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.name)}`,
      };
    }

    const { data: invite } = await db
      .from("review_booster_submissions")
      .select("*, store:store_id(id, name, slug, logo_url, settings)")
      .eq("token", token)
      .maybeSingle();

    if (!invite || !(invite as any).store) return null;
    const store = (invite as any).store;
    const gmbUrl = ((store.settings as any)?.gmb_review_url || (store.settings as any)?.google_review_url || null) as string | null;

    return {
      token: invite.token,
      storeId: store.id,
      storeName: store.name,
      storeLogoUrl: store.logo_url || null,
      customerName: invite.customer_name || "",
      destinationOrItem: invite.destination_or_item || null,
      status: invite.status as "pending" | "submitted",
      npsScore: invite.nps_score ?? null,
      testimonialCompiled: invite.testimonial_compiled || null,
      routingDecision: (invite.routing_decision as "public_gmb" | "private_retention" | null) || null,
      gmbReviewUrl: gmbUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.name)}`,
    };
  });

export const submitPublicReviewBoosterFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: z.string().trim().min(3).max(160),
      customerName: z.string().trim().min(2).max(140),
      npsScore: z.number().int().min(0).max(10),
      highlightMoment: z.string().trim().min(3).max(600),
      serviceQuality: z.string().trim().min(2).max(300),
      wouldRecommendReason: z.string().trim().max(400).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const db = getServerClient();
    const nowIso = new Date().toISOString();

    let storeId: string | null = null;
    let storeName = "Nossa Empresa";
    let gmbReviewUrl = "";
    let customerId: string | null = null;
    let destinationOrItem: string | null = null;

    if (data.token.startsWith("loja-")) {
      const candidateStoreId = data.token.slice("loja-".length);
      const { data: store } = await db.from("stores").select("id, name, settings").eq("id", candidateStoreId).maybeSingle();
      if (!store) throw new Error("Estabelecimento não encontrado.");
      storeId = store.id;
      storeName = store.name;
      gmbReviewUrl = ((store.settings as any)?.gmb_review_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.name)}`);
    } else {
      const { data: invite } = await db
        .from("review_booster_submissions")
        .select("*, store:store_id(id, name, settings)")
        .eq("token", data.token)
        .maybeSingle();
      if (!invite || !(invite as any).store) throw new Error("Convite de avaliação inválido ou expirado.");
      storeId = invite.store_id;
      storeName = (invite as any).store.name;
      customerId = invite.customer_id || null;
      destinationOrItem = invite.destination_or_item || null;
      gmbReviewUrl = (((invite as any).store.settings as any)?.gmb_review_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(storeName)}`);
    }

    const routingDecision: "public_gmb" | "private_retention" =
      data.npsScore >= 8 ? "public_gmb" : "private_retention";

    const testimonialCompiled = compileStructuredReviewTestimonial({
      storeName,
      destinationOrItem,
      highlightMoment: data.highlightMoment,
      serviceQuality: data.serviceQuality,
      wouldRecommendReason: data.wouldRecommendReason,
    });

    const recordToken = data.token.startsWith("loja-")
      ? `rv-${randomUUID().replace(/-/g, "").slice(0, 16)}`
      : data.token;

    await db.from("review_booster_submissions").upsert(
      {
        store_id: storeId!,
        token: recordToken,
        customer_id: customerId,
        customer_name: data.customerName,
        destination_or_item: destinationOrItem,
        nps_score: data.npsScore,
        answers: {
          highlightMoment: data.highlightMoment,
          serviceQuality: data.serviceQuality,
          wouldRecommendReason: data.wouldRecommendReason || null,
        },
        testimonial_compiled: testimonialCompiled,
        routing_decision: routingDecision,
        status: "submitted",
        redirected_to_gmb: routingDecision === "public_gmb",
        internal_retention_alert_created: routingDecision === "private_retention",
        submitted_at: nowIso,
      },
      { onConflict: "token" },
    );

    if (customerId && storeId) {
      await db
        .from("customers_crm")
        .update({
          last_nps_score: data.npsScore,
          ...(data.npsScore >= 9 ? { rfv_stage: "promoter" } : {}),
          updated_at: nowIso,
        })
        .eq("id", customerId)
        .eq("store_id", storeId);
    }

    if (routingDecision === "private_retention" && storeId) {
      try {
        const { notifyStoreStaff } = await import("@/lib/notifications/store-staff-notify");
        await notifyStoreStaff({
          db,
          storeId,
          type: "new_lead",
          title: `Alerta de Retenção Privado (Nota ${data.npsScore}/10)`,
          message: `${data.customerName} avaliou com nota ${data.npsScore}/10: "${data.highlightMoment.slice(0, 140)}". Entre em contato para reversão imediata.`,
          linkUrl: "/workspace/avaliacoes",
          authorName: data.customerName,
        });
      } catch {
        // best-effort
      }
    }

    return {
      success: true,
      routingDecision,
      npsScore: data.npsScore,
      testimonialCompiled,
      gmbReviewUrl,
    };
  });
