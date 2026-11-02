import { getServerClient } from "@/lib/supabase";
import type { TravelOfferDTO } from "@/types/corporate-travel";

export type CanonicalQuoteProduct = "flight" | "hotel" | "car" | "bus" | "transfer" | "package";

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createCanonicalQuoteSession(params: {
  agencyId: string;
  companyId?: string | null;
  userId: string;
  projectId?: string | null;
  tripId?: string | null;
  productType: CanonicalQuoteProduct;
  payload: Record<string, unknown>;
}): Promise<string> {
  const supabase = getServerClient();
  const searchPayloadJson = JSON.stringify(params.payload);
  const searchPayloadHash = await sha256Hex(searchPayloadJson);
  const { data, error } = await supabase
    .from("travel_quote_sessions")
    .insert({
      agency_id: params.agencyId,
      company_id: params.companyId || null,
      user_id: params.userId,
      project_id: params.projectId || null,
      trip_id: params.tripId || null,
      product_type: params.productType,
      search_payload_hash: searchPayloadHash,
      search_payload_json: params.payload,
      status: "started",
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(
      `Não foi possível registrar a sessão de cotação: ${error?.message || "ID ausente"}`,
    );
  }
  return data.id;
}

export async function recordCanonicalProviderExecution(params: {
  quoteSessionId: string;
  providerCode: string;
  latencyMs: number;
  status: "success" | "timeout" | "error" | "no_availability";
  errorCode?: string | null;
  cacheHit?: boolean;
  providerRequestId?: string | null;
}): Promise<void> {
  const { error } = await getServerClient()
    .from("quote_provider_executions")
    .insert({
      quote_session_id: params.quoteSessionId,
      provider_code: params.providerCode,
      latency_ms: Math.max(0, Math.round(params.latencyMs)),
      status: params.status,
      error_code: params.errorCode || null,
      cache_hit: params.cacheHit ?? false,
      provider_request_id: params.providerRequestId || null,
      trace_id: `tr_${crypto.randomUUID()}`,
      response_at: new Date().toISOString(),
    });
  if (error) throw new Error(`Não foi possível registrar a execução do provedor: ${error.message}`);
}

export async function persistCanonicalOfferSnapshots(params: {
  quoteSessionId: string;
  offers: TravelOfferDTO[];
}): Promise<Map<string, string>> {
  const rows = params.offers.map((offer) => {
    const totalAmountCents = Number(offer.pricing.selling_total_cents);
    const expiresAt = new Date(offer.expires_at);
    if (
      !offer.offer_id ||
      !offer.provider_code ||
      !Number.isFinite(totalAmountCents) ||
      totalAmountCents <= 0 ||
      Number.isNaN(expiresAt.getTime())
    ) {
      throw new Error(
        "O provedor retornou uma oferta sem identificador, preço ou validade utilizável.",
      );
    }

    return {
      quote_session_id: params.quoteSessionId,
      provider_code: offer.provider_code,
      normalized_offer_id: offer.offer_id,
      product_type: offer.product_type,
      origin: typeof offer.details.origin === "string" ? offer.details.origin : null,
      destination: typeof offer.details.destination === "string" ? offer.details.destination : null,
      travel_start_date:
        typeof offer.details.departure_date === "string" ? offer.details.departure_date : null,
      travel_end_date:
        typeof offer.details.return_date === "string" ? offer.details.return_date : null,
      net_amount_cents: Math.max(0, Number(offer.pricing.net_amount_cents) || 0),
      tax_amount_cents: Math.max(0, Number(offer.pricing.tax_amount_cents) || 0),
      fee_amount_cents: Math.max(
        0,
        (Number(offer.pricing.supplier_fee_cents) || 0) +
          (Number(offer.pricing.service_fee_cents) || 0),
      ),
      markup_amount_cents: Math.max(0, Number(offer.pricing.agency_markup_cents) || 0),
      total_amount_cents: totalAmountCents,
      currency: offer.pricing.currency || "BRL",
      fare_family: offer.rules.fare_family || null,
      baggage_included: offer.rules.baggage_allowance || null,
      cancellation_rule_summary: offer.rules.cancellation_policy || null,
      policy_status: offer.policy_status,
      policy_violation_reasons: offer.policy_violation_reasons || [],
      provider_reference: offer.offer_id,
      raw_snapshot_ref: offer.raw_snapshot_ref || null,
      expires_at: expiresAt.toISOString(),
    };
  });

  if (rows.length === 0) return new Map();
  const { data, error } = await getServerClient()
    .from("travel_offer_snapshots")
    .insert(rows)
    .select("id, normalized_offer_id");
  if (error)
    throw new Error(`Não foi possível persistir os snapshots das ofertas: ${error.message}`);

  return new Map((data || []).map((row) => [String(row.normalized_offer_id), String(row.id)]));
}

export async function finalizeCanonicalQuoteSession(params: {
  quoteSessionId: string;
  providerCount: number;
  successfulProviderCount: number;
  failedProviderCount: number;
  status: "completed" | "failed";
}): Promise<void> {
  const { error } = await getServerClient()
    .from("travel_quote_sessions")
    .update({
      status: params.status,
      provider_count: Math.max(0, params.providerCount),
      successful_provider_count: Math.max(0, params.successfulProviderCount),
      failed_provider_count: Math.max(0, params.failedProviderCount),
      completed_at: new Date().toISOString(),
    })
    .eq("id", params.quoteSessionId);
  if (error) throw new Error(`Não foi possível finalizar a sessão de cotação: ${error.message}`);
}
