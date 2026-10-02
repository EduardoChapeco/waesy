/**
 * workspace-parity-bridge.ts — Ponte de Paridade Classificados <-> Workspace (G55–G60)
 * 
 * Regra: Elimina silos e duplicidades entre classificados particulares e catálogo comercial.
 * Todo item transacionável do ecossistema mapeia para um dos 15 arquétipos canônicos (A01 a A15).
 */

import { CanonicalArchetypeId, NichePackageId } from './niche-packages/types';
import { getNichePackage, isArchetypeAllowedForNiche } from './niche-packages/registry';

export interface UnifiedListingContext {
  id: string;
  sourceType: 'product' | 'classified';
  archetypeId: CanonicalArchetypeId;
  nicheId: NichePackageId;
  title: string;
  slug: string;
  priceCents: number;
  currency: string;
  isNegotiable: boolean;
  requiresDocument: boolean;
  capabilities: {
    canAcceptOnlinePayment: boolean;
    canScheduleAppointment: boolean;
    canGenerateVoucher: boolean;
    canGenerateContract: boolean;
    canHoldDeposit: boolean;
    hasPhysicalStock: boolean;
  };
  legacyFieldMappings: Record<string, string>;
}

/**
 * Matriz de Elevação de Capacidades: Define o arquétipo canônico baseado nos atributos de entrada
 */
export function inferArchetypeFromRawListing(
  rawRecord: Record<string, unknown>,
  targetNiche: NichePackageId
): CanonicalArchetypeId {
  // 1. Veículos
  if (targetNiche === 'veiculos' || rawRecord.vehicle_make || rawRecord.renavam) {
    if (rawRecord.daily_rate_cents || rawRecord.is_rental) return 'A10';
    return 'A12'; // Venda de alto valor
  }

  // 2. Imóveis
  if (targetNiche === 'imoveis' || rawRecord.property_type || rawRecord.usable_area_m2) {
    if (rawRecord.rental_period === 'daily' || rawRecord.is_vacation_rental) return 'A10';
    if (rawRecord.rental_period === 'monthly' || rawRecord.is_lease) return 'A11';
    return 'A12';
  }

  // 3. Digital & Cursos
  if (targetNiche === 'digital' || rawRecord.digital_file_url || rawRecord.license_type) {
    if (rawRecord.billing_cycle || rawRecord.is_subscription) return 'A06';
    return 'A05';
  }

  // 4. Turismo & Viagens
  if (targetNiche === 'turismo' || rawRecord.destination_name || rawRecord.itinerary_days) {
    if (rawRecord.daily_rate_cents) return 'A10';
    return 'A07'; // Pacote turístico
  }

  // 5. Serviços Locais
  if (targetNiche === 'servicos' || rawRecord.duration_minutes || rawRecord.service_type) {
    if (rawRecord.is_quote_only) return 'A09';
    if (rawRecord.duration_minutes) return 'A08';
    return 'A15';
  }

  // 6. Mercado & Hortifrúti
  if (targetNiche === 'mercado' || rawRecord.selling_unit === 'kg' || rawRecord.is_perishable) {
    return 'A14';
  }

  // 7. Varejo Padrão
  if (rawRecord.has_variants || Array.isArray(rawRecord.variants)) return 'A02';
  if (rawRecord.is_bundle || Array.isArray(rawRecord.bundle_items)) return 'A03';

  return 'A01'; // Default: Produto Simples com Estoque
}

/**
 * Resolve o contexto canônico unificado para um anúncio (G57)
 */
export function resolveUnifiedListingContext(
  sourceType: 'product' | 'classified',
  rawRecord: Record<string, unknown>,
  explicitNiche?: NichePackageId
): UnifiedListingContext {
  const nicheId = (explicitNiche || rawRecord.niche_id || 'varejo') as NichePackageId;
  const inferredArchetype = inferArchetypeFromRawListing(rawRecord, nicheId);

  // Garante conformidade com o Niche Package (G18)
  const isAllowed = isArchetypeAllowedForNiche(nicheId, inferredArchetype);
  const pkg = getNichePackage(nicheId);
  const finalArchetype = isAllowed ? inferredArchetype : pkg.defaultArchetype;

  const priceCents = Number(rawRecord.price_cents || rawRecord.price || 0);

  const capabilities = {
    canAcceptOnlinePayment: ['A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A13', 'A14'].includes(finalArchetype),
    canScheduleAppointment: ['A08', 'A09', 'A15'].includes(finalArchetype),
    canGenerateVoucher: ['A07', 'A08', 'A10', 'A13'].includes(finalArchetype),
    canGenerateContract: ['A10', 'A11', 'A12'].includes(finalArchetype),
    canHoldDeposit: ['A10', 'A12'].includes(finalArchetype),
    hasPhysicalStock: ['A01', 'A02', 'A03', 'A04', 'A14'].includes(finalArchetype),
  };

  return {
    id: String(rawRecord.id || ''),
    sourceType,
    archetypeId: finalArchetype,
    nicheId,
    title: String(rawRecord.title || rawRecord.name || 'Sem Título'),
    slug: String(rawRecord.slug || ''),
    priceCents,
    currency: 'BRL',
    isNegotiable: Boolean(rawRecord.is_negotiable || finalArchetype === 'A12' || finalArchetype === 'A09'),
    requiresDocument: Boolean(capabilities.canGenerateContract || capabilities.canGenerateVoucher),
    capabilities,
    legacyFieldMappings: {
      name: 'title',
      description_html: 'narrative_description',
      price: 'price_cents',
      images: 'product_media',
    },
  };
}
