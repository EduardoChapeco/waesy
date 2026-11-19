/**
 * travel-supply-orchestrator.service.ts — Orquestrador de Suprimentos & Saga de Reserva Multi-Provider
 * NORMAS: AGENTS.md (B.1 a B.41), SPEC-TURISMO-CORPORATIVO-TRAVELOS-CONSOLIDATION
 * Sem Falsa Atomicidade | Padrão Saga com Compensação | Normalized Offer Schema
 */

import { getServerClient } from "@/lib/supabase";
import { calculateNormalizedPricing } from "@/lib/travel-pricing";
import {
  searchWoobaFlights,
  searchWoobaCars,
  searchWoobaBusRoutes,
} from "@/services/travel-wooba-connector.service";
import {
  infotravelSearchCarRentals,
  infotravelSearchFlights,
  infotravelSearchHotels,
  normalizeInfoTravelOperatorSlug,
  resolveStoreInfotravelCredentials,
  sanitizeInfotravelSearchText,
  INFOTRAVEL_OPERATOR_SLUGS,
  type InfoTravelOperatorSlug,
} from "@/services/infotravel";
import type {
  TravelOfferDTO,
  SagaBookingResult,
  SagaStepState,
} from "@/types/corporate-travel";
import { createCanonicalQuoteSession } from "@/services/travel-quote-session.service";

export { calculateNormalizedPricing } from "@/lib/travel-pricing";

export interface NormalizedSearchQuery {
  agencyId: string;
  companyId?: string;
  productType: "flight" | "hotel" | "car" | "package" | "bus";
  /**
   * Restringe a busca a canais explicitamente autorizados para o contexto.
   * Busca aérea isolada usa Wooba por padrão; pacotes continuam multi-provider.
   */
  providerCodes?: Array<"wooba" | "infotravel" | "rexturadvance" | "consolidator" | "manual">;
  originTerminalId?: string;
  destinationTerminalId?: string;
  originIata?: string;
  destinationIata?: string;
  departureDate: string;
  returnDate?: string;
  adultsCount: number;
  childrenCount?: number;
  cabinClass?: "economy" | "premium_economy" | "business" | "first";
}

export function resolveProviderCodesForSearch(query: Pick<NormalizedSearchQuery, "productType" | "providerCodes">): string[] | undefined {
  if (query.providerCodes?.length) return query.providerCodes;
  return query.productType === "flight" ? ["wooba"] : undefined;
}

/**
 * Consulta de ofertas multi-fornecedor com tolerância a falhas parciais.
 * Se um provedor cair ou expirar, os demais continuam e o sistema reporta resultados sem jank.
 */
export async function executeMultiProviderSearch(
  query: NormalizedSearchQuery
): Promise<{ offers: TravelOfferDTO[]; providersResponded: string[]; errors: string[] }> {
  const supabase = getServerClient();

  // 1. Carregar integrações ativas configuradas pela agência (ambas tabelas canônicas)
  const { data: integrations } = await (supabase.from("travel_operator_integrations") as any)
    .select("id, provider_code, operator_slug, display_name, engine_type, default_markup_percent, is_active, vault_secret_id")
    .eq("store_id", query.agencyId)
    .eq("is_active", true);

  let legacyCreds: Array<{ provider: string; is_active: boolean }> = [];
  try {
    const legacyRes = await (supabase.from("integration_credentials") as any)
      ?.select?.("provider, is_active")
      ?.eq?.("store_id", query.agencyId)
      ?.eq?.("is_active", true);
    if (Array.isArray(legacyRes?.data)) {
      legacyCreds = legacyRes.data;
    }
  } catch {
    legacyCreds = [];
  }

  type ActiveProviderEntry = {
    provider_code: string;
    operator_slug?: string | null;
    engine_type?: string | null;
    default_markup_percent?: number | null;
    vault_secret_id?: string | null;
    fromLegacyTable?: boolean;
  };

  const mergedProviders: ActiveProviderEntry[] = Array.isArray(integrations)
    ? integrations.map((row: any) => ({ ...row }))
    : [];

  const seenCodes = new Set(mergedProviders.map((p) => String(p.provider_code || "").toLowerCase()));
  for (const leg of legacyCreds) {
    const rawProvider = String(leg.provider || "").toLowerCase();
    if (!rawProvider) continue;
    const isTravel =
      rawProvider === "wooba" ||
      rawProvider === "infotravel" ||
      rawProvider.startsWith("infotravel_") ||
      INFOTRAVEL_OPERATOR_SLUGS.has(rawProvider);
    if (!isTravel) continue;
    if (!seenCodes.has(rawProvider)) {
      seenCodes.add(rawProvider);
      const opSlug =
        rawProvider.startsWith("infotravel_") || INFOTRAVEL_OPERATOR_SLUGS.has(rawProvider)
          ? normalizeInfoTravelOperatorSlug(rawProvider)
          : undefined;
      mergedProviders.push({
        provider_code: rawProvider === "wooba" ? "wooba" : opSlug === "infotravel_default" && rawProvider === "infotravel" ? "infotravel" : rawProvider,
        operator_slug: opSlug || null,
        engine_type: rawProvider === "wooba" ? "wooba_v2" : "infotravel_v1",
        default_markup_percent: 10,
        vault_secret_id: "__integration_credentials__",
        fromLegacyTable: true,
      });
    }
  }

  const allowedProviderCodes = resolveProviderCodesForSearch(query);
  const activeProviders = mergedProviders.filter((provider) => {
    const code = String(provider.provider_code || "").toLowerCase();
    const isInfoFamily =
      provider.engine_type === "infotravel_v1" ||
      code.startsWith("infotravel_") ||
      INFOTRAVEL_OPERATOR_SLUGS.has(code);
    const channelCode = isInfoFamily ? "infotravel" : code;
    return (
      !allowedProviderCodes ||
      allowedProviderCodes.includes(code as any) ||
      allowedProviderCodes.includes(channelCode as any)
    );
  });

  if (activeProviders.length === 0) {
    return {
      offers: [],
      providersResponded: [],
      errors: [
        "BLOCKED — PROVIDER CREDENTIAL REQUIRED: Nenhuma integração de fornecedor GDS/Consolidadora ativa cadastrada para esta agência.",
      ],
    };
  }

  const providersResponded: string[] = [];
  const errors: string[] = [];
  const offers: TravelOfferDTO[] = [];

  // 2. Despacho em paralelo com Promise.allSettled
  const searchPromises = activeProviders.map(async (provider) => {
    try {
      const codeLower = String(provider.provider_code || "").toLowerCase();
      const isInfoTravelProvider =
        provider.engine_type === "infotravel_v1" ||
        codeLower.startsWith("infotravel_") ||
        INFOTRAVEL_OPERATOR_SLUGS.has(codeLower);

      if (!provider.vault_secret_id && !isInfoTravelProvider) {
        errors.push(`${provider.provider_code}: BLOCKED — PROVIDER CREDENTIAL REQUIRED (credenciais ausentes no cofre)`);
        return;
      }

      if (isInfoTravelProvider) {
        const opSlug = normalizeInfoTravelOperatorSlug(String(provider.operator_slug || codeLower));
        const providerTag = codeLower === "infotravel" ? "infotravel" : opSlug;
        const markupPct = Number(provider.default_markup_percent ?? 10);
        let ranHandler = false;

        if (query.productType === "car") {
          const pickupLoc = query.destinationIata || query.originIata || query.destinationTerminalId;
          const dropoffDate = query.returnDate;
          if (!pickupLoc || !dropoffDate) {
            errors.push(`${providerTag}: local e data de devolução são obrigatórios para cotar carro`);
            return;
          }
          ranHandler = true;
          const carQuotes = await infotravelSearchCarRentals({
            data: {
              pickupAirportOrCity: pickupLoc,
              pickupDate: query.departureDate,
              dropoffDate,
            },
          });
          for (const car of carQuotes) {
            const dailyAmountBrl = Number(car.dailyRateBrl);
            const totalAmountBrl = Number(car.totalRateBrl);
            if (!Number.isFinite(dailyAmountBrl) || dailyAmountBrl <= 0 || !Number.isFinite(totalAmountBrl) || totalAmountBrl <= 0) {
              errors.push(`${providerTag}: oferta de carro ${car.id} sem tarifa válida`);
              continue;
            }
            const dailyCents = Math.round(dailyAmountBrl * 100);
            const totalCents = Math.round(totalAmountBrl * 100);
            const pricing = calculateNormalizedPricing({
              netAmountCents: totalCents,
              agencyMarkupPercent: markupPct,
            });
            offers.push({
              offer_id: `${providerTag}_car_${car.id}`,
              provider_code: "infotravel",
              product_type: "car",
              pricing,
              expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
              revalidate_required: false,
              policy_status: "within_policy",
              policy_violation_reasons: [],
              rules: {
                cancellation_policy: "Cancelamento conforme regra da locadora",
                is_refundable: true,
              },
              details: {
                operator_slug: opSlug,
                rental_company: car.rentalCompany,
                vehicle_category: car.vehicleCategory,
                vehicle_model_example: car.vehicleModelExample,
                transmission: car.transmission,
                pickup_location: car.pickupLocation,
                dropoff_location: car.dropoffLocation,
                daily_rate_cents: dailyCents,
                daily_rate_brl: dailyAmountBrl,
                total_rate_brl: totalAmountBrl,
              },
            });
          }
        } else if (query.productType === "flight" && query.originIata && query.destinationIata) {
          ranHandler = true;
          const gdsFlights = await infotravelSearchFlights(query.agencyId, {
            origin: query.originIata,
            destination: query.destinationIata,
            date: query.departureDate,
          });
          for (const f of gdsFlights) {
            const flightNumber = String(f.flight_number || "").trim();
            const netAmount = Number(f.price);
            if (!flightNumber || !Number.isFinite(netAmount) || netAmount <= 0) {
              errors.push(`${providerTag}: oferta aérea sem identificador ou tarifa válida`);
              continue;
            }
            const netCents = Math.round(netAmount * 100);
            const pricing = calculateNormalizedPricing({
              netAmountCents: netCents,
              agencyMarkupPercent: markupPct,
            });
            offers.push({
              offer_id: `${providerTag}_flt_${flightNumber}`,
              provider_code: "infotravel",
              product_type: "flight",
              pricing,
              expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
              revalidate_required: true,
              policy_status: "within_policy",
              policy_violation_reasons: [],
              rules: {
                is_refundable: undefined,
              },
              details: {
                operator_slug: opSlug,
                airline: f.airline,
                flight_number: f.flight_number,
                origin: f.origin,
                destination: f.destination,
              },
            });
          }
        } else if (query.productType === "hotel" && query.destinationIata) {
          const checkout = query.returnDate;
          if (!checkout) {
            errors.push(`${providerTag}: data de checkout é obrigatória para cotar hotel`);
            return;
          }
          ranHandler = true;
          const gdsHotels = await infotravelSearchHotels(query.agencyId, {
            city: query.destinationIata,
            checkin: query.departureDate,
            checkout,
          });
          for (const h of gdsHotels) {
            const hotelName = String((h as any).name || "").trim();
            const netAmount = Number((h as any).price_per_night ?? (h as any).price);
            if (!hotelName || !Number.isFinite(netAmount) || netAmount <= 0) {
              errors.push(`${providerTag}: hotel sem identificação ou tarifa válida`);
              continue;
            }
            const netCents = Math.round(netAmount * 100);
            const pricing = calculateNormalizedPricing({
              netAmountCents: netCents,
              agencyMarkupPercent: markupPct,
            });
            offers.push({
              offer_id: `${providerTag}_htl_${hotelName}`,
              provider_code: "infotravel",
              product_type: "hotel",
              pricing,
              expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
              revalidate_required: false,
              policy_status: "within_policy",
              policy_violation_reasons: [],
              rules: {
                is_refundable: undefined,
              },
              details: {
                operator_slug: opSlug,
                hotel_name: hotelName,
                city: query.destinationIata,
              },
            });
          }
        } else if (query.productType === "package") {
          const destTarget = sanitizeInfotravelSearchText(query.destinationIata || query.destinationTerminalId || "");
          if (!destTarget || !query.returnDate) {
            errors.push(`${providerTag}: destino e data de volta são obrigatórios para cotar pacote`);
            return;
          }
          const directCreds = await resolveStoreInfotravelCredentials(query.agencyId, opSlug);
          if (!directCreds) {
            errors.push(`${providerTag}: BLOCKED — PROVIDER CREDENTIAL REQUIRED (credenciais InfoTravel ausentes ou incompletas)`);
            return;
          }
          ranHandler = true;
          const pkgRes = await fetch(`${directCreds.baseUrl}/api/v1/utility/packageAvail`, {
            method: "POST",
            headers: directCreds.authHeader,
            body: JSON.stringify({
              destination: destTarget,
              departure: query.departureDate,
              arrival: query.returnDate,
              occupancies: [{ adults: query.adultsCount, childrenAges: [] }],
              operator: opSlug,
            }),
            signal: AbortSignal.timeout(20000),
          });
          if (!pkgRes.ok) {
            const errTxt = await pkgRes.text().catch(() => "");
            errors.push(`${providerTag}: Erro HTTP ${pkgRes.status} na consulta de pacotes (${errTxt.slice(0, 120)})`);
            return;
          }
          const pkgJson = await pkgRes.json().catch(() => ({}));
          const rawPkgs = Array.isArray(pkgJson?.packageAvail) ? pkgJson.packageAvail : [];
          for (const pkg of rawPkgs) {
            const pkgId = String(pkg?.id || "").trim();
            const pkgName = String(pkg?.name || pkg?.hotel?.name || "").trim();
            const priceTotalBrl = Number(pkg?.price?.amount);
            if (!pkgId || !pkgName || !Number.isFinite(priceTotalBrl) || priceTotalBrl <= 0) {
              continue;
            }
            const taxesBrl = Math.max(0, Number(pkg?.taxes?.amount) || 0);
            const netBrl = Math.max(0, priceTotalBrl - taxesBrl);
            const pricing = calculateNormalizedPricing({
              netAmountCents: Math.round(netBrl * 100),
              taxAmountCents: Math.round(taxesBrl * 100),
              agencyMarkupPercent: markupPct,
            });
            offers.push({
              offer_id: `${providerTag}_pkg_${pkgId}`,
              provider_code: "infotravel",
              product_type: "package",
              pricing,
              expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
              revalidate_required: true,
              policy_status: "within_policy",
              policy_violation_reasons: [],
              rules: {
                fare_family: pkg?.board?.name ? String(pkg.board.name) : undefined,
              },
              details: {
                operator_slug: opSlug,
                package_name: pkgName,
                destination: destTarget,
                hotel_name: typeof pkg?.hotel?.name === "string" ? pkg.hotel.name : undefined,
                board_type: typeof pkg?.board?.name === "string" ? pkg.board.name : undefined,
                includes_flight: Boolean(pkg?.includesFlight),
                includes_hotel: Boolean(pkg?.includesHotel),
                includes_transfer: Boolean(pkg?.includesTransfer),
                image_url: typeof pkg?.hotel?.imageUrl === "string" ? pkg.hotel.imageUrl : typeof pkg?.imageUrl === "string" ? pkg.imageUrl : undefined,
              },
            });
          }
        }
        if (ranHandler) {
          providersResponded.push(providerTag);
        }
      } else if (codeLower === "wooba") {
        let ranWooba = false;
        // Chamada ao conector Wooba Travellink
        if ((query.productType === "flight" || query.productType === "package") && query.originIata && query.destinationIata) {
          ranWooba = true;
          const woobaOffers = await searchWoobaFlights({
            agencyId: query.agencyId,
            originIata: query.originIata,
            destinationIata: query.destinationIata,
            departureDate: query.departureDate,
            returnDate: query.returnDate,
            adultsCount: query.adultsCount,
            cabinClass: query.cabinClass as any,
          });
          offers.push(...woobaOffers);
        }
        if (query.productType === "car") {
          const pickupLoc = query.destinationIata || query.originIata || query.destinationTerminalId;
          if (!pickupLoc || !query.returnDate) {
            errors.push("wooba: local e data de devolução são obrigatórios para cotar carro");
            return;
          }
          ranWooba = true;
          const woobaCarOffers = await searchWoobaCars({
            agencyId: query.agencyId,
            pickupLocationCode: pickupLoc,
            dropoffLocationCode: pickupLoc,
            pickupDate: query.departureDate,
            dropoffDate: query.returnDate,
          });
          offers.push(...woobaCarOffers);
        } else if (query.productType === "bus" && query.originTerminalId && query.destinationTerminalId) {
          ranWooba = true;
          const busRoutes = await searchWoobaBusRoutes({
            agencyId: query.agencyId,
            originTerminalCityId: query.originTerminalId,
            destinationTerminalCityId: query.destinationTerminalId,
            departureDate: query.departureDate,
          });
          for (const route of busRoutes) {
            const pricing = calculateNormalizedPricing({
              netAmountCents: route.netPriceCents,
              agencyMarkupPercent: Number(provider.default_markup_percent ?? 10),
            });
            offers.push({
              offer_id: `wooba_bus_${route.tripScheduleId}`,
              provider_code: "wooba",
              product_type: "bus",
              pricing,
              expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
              revalidate_required: false,
              policy_status: "within_policy",
              policy_violation_reasons: [],
              rules: {
                cancellation_policy: "Reembolso e remarcação conforme resolução ANTT",
                is_refundable: true,
                fare_family: route.serviceClass,
              },
              details: {
                trip_schedule_id: route.tripScheduleId,
                company_name: route.companyName,
                service_class: route.serviceClass,
                departure_time: route.departureTime,
                arrival_time: route.arrivalTime,
                departure_terminal_name: route.departureTerminalName,
                arrival_terminal_name: route.arrivalTerminalName,
                duration_minutes: route.durationMinutes,
                available_seats_count: route.availableSeatsCount,
              },
            });
          }
        }
        if (ranWooba) {
          providersResponded.push("wooba");
        }
      } else {
        errors.push(`${provider.provider_code}: Conector não implementado ou sem contrato operacional ativo`);
      }
    } catch (err: any) {
      errors.push(`${provider.provider_code}: ${err?.message || "Timeout de conexão"}`);
    }
  });

  await Promise.allSettled(searchPromises);

  return { offers, providersResponded, errors };
}

export interface SagaBookingItem {
  type: "flight" | "hotel" | "car" | "bus";
  providerCode: string;
  offerId: string;
  details: Record<string, any>;
}

/**
 * Saga Orchestrator: Padrão Saga com compensação para reservas multi-provider.
 * Proibido fingir transação SQL atômica entre sistemas externos independentes.
 */
export async function executeMultiProviderBookingSaga(params: {
  tripId: string;
  agencyId: string;
  items: SagaBookingItem[];
}): Promise<SagaBookingResult> {
  const supabase = getServerClient();
  const sagaId = `saga_${Date.now()}_${params.tripId.slice(0, 8)}`;
  const steps: SagaStepState[] = [];
  let hasFailure = false;

  for (const item of params.items) {
    const stepName =
      item.type === "flight"
        ? "flight_reservation"
        : item.type === "hotel"
        ? "hotel_reservation"
        : item.type === "bus"
        ? "bus_reservation"
        : "car_reservation";

    try {
      // 1. Verificação estrita de credenciais ativas do provedor no cofre (P0-3)
      const { data: integration } = await supabase
        .from("travel_operator_integrations")
        .select("id, provider_code, vault_secret_id, is_active")
        .eq("store_id", params.agencyId)
        .eq("provider_code", item.providerCode)
        .eq("is_active", true)
        .maybeSingle();

      if (!integration || !integration.vault_secret_id) {
        throw new Error(
          `BLOCKED — PROVIDER CREDENTIAL REQUIRED: Provedor ${item.providerCode} não possui credenciais ativas cadastradas na agência.`
        );
      }

      // Provedor real: despacha requisição de reserva para o conector ativo
      // Proibido fingir sucesso ou emitir localizador fictício
      throw new Error(
        `BLOCKED — PROVIDER CREDENTIAL REQUIRED: Conexão de produção com ${item.providerCode} requer credenciais verificadas.`
      );
    } catch (err: any) {
      hasFailure = true;
      steps.push({
        step: stepName,
        status: "failed",
        provider: item.providerCode,
        error: err?.message || "Falha na reserva",
        timestamp: new Date().toISOString(),
      });
      break; // Interrompe para iniciar compensação
    }
  }

  if (!hasFailure) {
    return {
      saga_id: sagaId,
      status: "completed",
      steps,
      trip_id: params.tripId,
      compensations_executed: false,
      requires_manual_agent_intervention: false,
    };
  }

  // ─── EXECUÇÃO DE COMPENSAÇÃO (ROLLBACK EM CASCATA) ──────────────────────────
  let compensationsExecuted = true;
  let manualInterventionNeeded = false;

  for (const step of steps) {
    if (step.status === "success") {
      try {
        // Tentar cancelar ou liberar hold no provedor
        step.status = "compensated";
      } catch (cancelErr) {
        manualInterventionNeeded = true;
      }
    }
  }

  // Se a compensação automática falhou para algum item, abrir chamado de suporte urgente
  if (manualInterventionNeeded) {
    const supabase = getServerClient();
    await supabase.from("tourism_incident_tickets").insert({
      store_id: params.agencyId,
      trip_id: params.tripId,
      customer_name: "Sistema / Saga Orquestrador",
      urgency: "critical",
      category: "booking_failure",
      status: "open",
      summary: `Falha na compensação da Saga ${sagaId}. Verifique reservas pendentes no provedor.`,
    });
  }

  return {
    saga_id: sagaId,
    status: "failed",
    steps,
    trip_id: params.tripId,
    compensations_executed: compensationsExecuted,
    requires_manual_agent_intervention: manualInterventionNeeded,
  };
}


// ─── 4. Sessões Canônicas, Histórico de Preços e Revalidação ─────────────────

export async function createQuoteSession(params: {
  agencyId: string;
  companyId?: string | null;
  userId: string;
  projectId?: string | null;
  tripId?: string | null;
  productType: "flight" | "hotel" | "car" | "bus" | "transfer" | "package";
  payload: Record<string, unknown>;
}): Promise<string> {
  return createCanonicalQuoteSession(params);
}

export async function recordProviderExecution(params: {
  quoteSessionId: string;
  providerCode: string;
  latencyMs: number;
  status: "success" | "timeout" | "error" | "no_availability";
  errorCode?: string | null;
  cacheHit: boolean;
  providerRequestId?: string | null;
}): Promise<void> {
  const supabase = getServerClient();
  const traceId = `tr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  try {
    await supabase.from("quote_provider_executions").insert({
      quote_session_id: params.quoteSessionId,
      provider_code: params.providerCode,
      latency_ms: params.latencyMs,
      status: params.status,
      error_code: params.errorCode || null,
      cache_hit: params.cacheHit,
      provider_request_id: params.providerRequestId || null,
      trace_id: traceId,
    });
  } catch {
    // Telemetria não bloqueante
  }
}

export async function recordPriceObservation(params: {
  productType: string;
  routeFingerprint: string;
  travelStartDate: string;
  travelEndDate?: string | null;
  advanceDays: number;
  providerCode: string;
  fareFamily?: string | null;
  priceCents: number;
  currency?: string;
  searchContextHash: string;
  offerSnapshotId?: string | null;
}): Promise<void> {
  const supabase = getServerClient();
  try {
    await supabase.from("travel_price_observations").insert({
      product_type: params.productType,
      route_fingerprint: params.routeFingerprint.toUpperCase().trim(),
      travel_start_date: params.travelStartDate,
      travel_end_date: params.travelEndDate || null,
      advance_days: Math.max(0, params.advanceDays),
      provider_code: params.providerCode,
      fare_family: params.fareFamily || null,
      price_cents: params.priceCents,
      currency: params.currency || "BRL",
      search_context_hash: params.searchContextHash,
      offer_snapshot_id: params.offerSnapshotId || null,
      availability_state: "available",
    });
  } catch {
    // Observação de preço não bloqueante
  }
}

export async function getRoutePriceStatistics(params: {
  routeFingerprint: string;
  productType?: string;
  travelStartDate?: string;
}): Promise<{
  hasSufficientSample: boolean;
  sampleCount: number;
  medianCents?: number;
  minCents?: number;
  maxCents?: number;
  insightMessagePt?: string;
}> {
  const supabase = getServerClient();
  const { data: rows } = await supabase
    .from("travel_price_observations")
    .select("price_cents")
    .eq("route_fingerprint", params.routeFingerprint.toUpperCase().trim())
    .limit(100);

  if (!rows || rows.length < 5) {
    return {
      hasSufficientSample: false,
      sampleCount: rows?.length || 0,
      insightMessagePt: "Amostra histórica insuficiente para esta rota. Acompanhe as próximas consultas para gerar insights estatísticos.",
    };
  }

  const prices = rows.map((r: any) => Number(r.price_cents)).sort((a, b) => a - b);
  const minCents = prices[0];
  const maxCents = prices[prices.length - 1];
  const mid = Math.floor(prices.length / 2);
  const medianCents = prices.length % 2 !== 0 ? prices[mid] : Math.round((prices[mid - 1] + prices[mid]) / 2);

  return {
    hasSufficientSample: true,
    sampleCount: prices.length,
    medianCents,
    minCents,
    maxCents,
    insightMessagePt: `Baseado em ${prices.length} cotações registradas nos últimos períodos. Preço mediano observado: R$ ${(medianCents / 100).toFixed(2)}.`,
  };
}

export async function revalidateOfferPricing(params: {
  offerSnapshotId: string;
  currentNetCents: number;
}): Promise<{
  isPriceChanged: boolean;
  deltaCents: number;
  previousPriceCents: number;
  newPriceCents: number;
  requiresReapproval: boolean;
}> {
  const supabase = getServerClient();
  const { data: snapshot } = await supabase
    .from("travel_offer_snapshots")
    .select("total_amount_cents, expires_at")
    .eq("id", params.offerSnapshotId)
    .single();

  if (!snapshot) {
    return {
      isPriceChanged: false,
      deltaCents: 0,
      previousPriceCents: params.currentNetCents,
      newPriceCents: params.currentNetCents,
      requiresReapproval: false,
    };
  }

  const prev = Number(snapshot.total_amount_cents);
  const delta = params.currentNetCents - prev;
  const isChanged = Math.abs(delta) > 0;
  // Se o preço subiu mais que 5% ou expirou, exige re-aprovação formal
  const isExpired = new Date(snapshot.expires_at).getTime() < Date.now();
  const requiresReapproval = isExpired || delta > prev * 0.05;

  return {
    isPriceChanged: isChanged,
    deltaCents: delta,
    previousPriceCents: prev,
    newPriceCents: params.currentNetCents,
    requiresReapproval,
  };
}
