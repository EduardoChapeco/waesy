/**
 * travel-continuous-flow.ts — Tipagens Canônicas do Ecossistema Contínuo de Turismo
 * Mapeamento das 6 entidades da Onda 1:
 * 1. TravelLeadQualificationDTO
 * 2. TravelContractSignerDTO
 * 3. TravelTaxShieldLedgerDTO
 * 4. TravelMonthlyClosingDTO
 * 5. TravelAirlineLinkDTO
 * 6. TravelEmissionLockStatusDTO
 */

export type TravelNicheCategory =
  | "pacote_completo"
  | "somente_aereo"
  | "cruzeiro"
  | "eurotrip"
  | "locacao_carro"
  | "seguro_viagem"
  | "hospedagem"
  | "outro";

export type TravelCabinPreference = "economic" | "premium_economy" | "business" | "first";

export type TravelHotelMealPlan = "room_only" | "breakfast" | "half_board" | "full_board" | "all_inclusive";

export interface TravelLeadQualificationDTO {
  id: string;
  lead_id: string;
  store_id: string;
  niche_category: TravelNicheCategory;
  origin_city?: string | null;
  destination_cities: string[];
  preferred_departure_date?: string | null;
  preferred_return_date?: string | null;
  flexibility_days: number;
  pax_adults: number;
  pax_children: number;
  pax_children_ages: number[];
  pax_infants: number;
  pax_infants_birthdates: string[];
  cabin_preference: TravelCabinPreference;
  hotel_stars_min: number;
  hotel_meal_plan: TravelHotelMealPlan;
  budget_max_cents?: number | null;
  special_notes?: string | null;
  assigned_agent_id?: string | null;
  qualification_score: number;
  created_at: string;
  updated_at: string;
}

export type TravelContractSignerRole = "primary_contractor" | "payer" | "legal_guardian" | "witness";

export type TravelContractSignatureStatus = "pending" | "signed" | "rejected" | "expired";

export interface TravelContractSignerDTO {
  id: string;
  contract_id: string;
  store_id: string;
  signer_role: TravelContractSignerRole;
  full_name: string;
  cpf_cnpj: string;
  email?: string | null;
  whatsapp?: string | null;
  share_percentage: number;
  share_amount_cents: number;
  payment_method: "pix" | "card" | "boleto" | "cash" | "transfer" | "other";
  public_sign_token: string;
  signature_status: TravelContractSignatureStatus;
  signed_at?: string | null;
  signer_ip?: string | null;
  signer_user_agent?: string | null;
  signature_hash?: string | null;
  rejection_reason?: string | null;
  audit_metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export type TravelTaxInvoiceStatus = "pending" | "requested" | "issued" | "exempt" | "cancelled";

export interface TravelTaxShieldLedgerDTO {
  id: string;
  store_id: string;
  sheet_id?: string | null;
  trip_id?: string | null;
  entry_code: string;
  operator_name: string;
  operator_locator: string;
  client_name: string;
  client_document?: string | null;
  gross_operator_volume_cents: number;
  operator_direct_transacted_cents: number;
  agency_retained_pix_cents: number;
  agency_gross_take_rate_cents: number;
  operator_cost_cents: number;
  taxable_service_base_cents: number;
  projected_tax_rate_pct: number;
  projected_tax_cents: number;
  invoice_status: TravelTaxInvoiceStatus;
  invoice_number?: string | null;
  invoice_key?: string | null;
  seller_profile_id?: string | null;
  seller_commission_cents: number;
  notes?: string | null;
  is_locked: boolean;
  created_at: string;
}

export type TravelClosingStatus = "open" | "review" | "closed" | "paid";

export interface TravelMonthlyClosingDTO {
  id: string;
  store_id: string;
  competence_month: string;
  status: TravelClosingStatus;
  total_operator_volume_cents: number;
  total_agency_take_rate_cents: number;
  total_seller_commissions_cents: number;
  sales_count: number;
  closed_at?: string | null;
  closed_by_profile_id?: string | null;
  snapshot_data?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface TravelAirlineLinkDTO {
  id: string;
  iata_code: string;
  airline_name: string;
  logo_url?: string | null;
  checkin_window_hours: number;
  official_checkin_url: string;
  deep_link_template?: string | null;
  required_fields: string[];
  baggage_rules_url?: string | null;
  status_tracking_url?: string | null;
  support_phone?: string | null;
  is_active: boolean;
  created_at: string;
}
