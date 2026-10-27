/**
 * corporate-travel.ts — DTOs, Enums e Schemas Canônicos para Viagens Corporativas Waesy
 * NORMAS: AGENTS.md (B.1 a B.41), SPEC-TURISMO-CORPORATIVO-TRAVELOS-CONSOLIDATION
 */

import { z } from "zod";

// ─── 1. Habilitação Master da Agência ──────────────────────────────────────────
export type CorporateCapabilityStatus = "pending" | "approved" | "suspended" | "revoked";

export interface AgencyCorporateCapabilityDTO {
  id: string;
  store_id: string;
  status: CorporateCapabilityStatus;
  approved_by?: string | null;
  approved_at?: string | null;
  commercial_notes?: string | null;
  allowed_capabilities: string[];
  created_at: string;
  updated_at: string;
}

// ─── 2. Vínculo Empresa ↔ Agência e Níveis de Autonomia ───────────────────────
export type AutonomyLevel =
  | "SEARCH_ONLY"
  | "QUOTE_ONLY"
  | "HOLD_ONLY"
  | "BOOK_REQUIRES_AGENCY"
  | "ISSUE_REQUIRES_AGENCY"
  | "SELF_BOOK"
  | "SELF_ISSUE";

export interface CorporateAutonomyMatrix {
  air_domestic: AutonomyLevel;
  air_international: AutonomyLevel;
  hotel: AutonomyLevel;
  car: AutonomyLevel;
  bus: AutonomyLevel;
  group: AutonomyLevel;
}

export type CorporateAccountStatus = "pending" | "active" | "suspended" | "cancelled";

export interface CorporateTravelAccountDTO {
  id: string;
  company_id: string;
  agency_id: string;
  status: CorporateAccountStatus;
  primary_account_manager_id?: string | null;
  support_phone?: string | null;
  support_whatsapp?: string | null;
  support_email?: string | null;
  contract_id?: string | null;
  policy_id?: string | null;
  billing_profile_id?: string | null;
  autonomy_matrix: CorporateAutonomyMatrix;
  activated_at?: string | null;
  created_at: string;
  updated_at: string;
  agency_name?: string;
  company_name?: string;
}

// ─── 3. Papéis Corporativos (RBAC) ────────────────────────────────────────────
export type CorporateTravelRole =
  | "TRAVEL_ADMIN"
  | "TRAVEL_MANAGER"
  | "TRAVEL_BOOKER"
  | "TRAVELER"
  | "APPROVER"
  | "FINANCE"
  | "AUDITOR"
  | "VIEWER"
  | "EXTERNAL_TRAVELER";

export interface CorporateMemberPermissions {
  can_search?: boolean;
  can_quote?: boolean;
  can_request?: boolean;
  can_reserve?: boolean;
  can_issue_without_approval?: boolean;
  can_approve?: boolean;
  can_approve_out_of_policy?: boolean;
  can_manage_travelers?: boolean;
  can_view_financials?: boolean;
  can_view_invoices?: boolean;
  can_manage_policies?: boolean;
  can_use_projects?: boolean;
  can_invite_external?: boolean;
}

export interface CorporateTravelMemberDTO {
  id: string;
  account_id: string;
  profile_id: string;
  role: CorporateTravelRole;
  permissions: CorporateMemberPermissions;
  department?: string | null;
  cost_center?: string | null;
  created_at: string;
  profile?: {
    full_name?: string;
    email?: string;
    phone?: string;
  } | null;
}

// ─── 4. Perfil de Viajante e Documentos (Vault) ───────────────────────────────
export interface LoyaltyProgramEntry {
  provider_type: "airline" | "hotel" | "car";
  program_name: string;
  membership_number: string;
  tier_level?: string;
}

export interface TravelerProfileDTO {
  id: string;
  company_id: string;
  profile_id?: string | null;
  full_name: string;
  social_name?: string | null;
  document_type: string;
  document_number: string;
  passport_number?: string | null;
  passport_expiry?: string | null;
  passport_issuing_country?: string | null;
  nationality: string;
  birth_date?: string | null;
  phone?: string | null;
  email?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  seat_preference: "window" | "aisle" | "any";
  meal_preference: string;
  special_needs?: string | null;
  loyalty_programs: LoyaltyProgramEntry[];
  created_at: string;
  updated_at: string;
}

export type TravelerDocumentType =
  | "passport"
  | "rg"
  | "cnh"
  | "visa"
  | "authorization"
  | "corporate_letter"
  | "vaccine"
  | "other";

export type DocumentStatus = "valid" | "expiring_soon" | "expired" | "review_needed";

export interface TravelerDocumentDTO {
  id: string;
  traveler_id: string;
  doc_type: TravelerDocumentType;
  title: string;
  file_url: string;
  doc_number?: string | null;
  issuing_country?: string | null;
  issued_date?: string | null;
  expiry_date?: string | null;
  status: DocumentStatus;
  metadata: Record<string, any>;
  created_at: string;
}

// ─── 5. Projetos de Viagem (Travel Projects) ──────────────────────────────────
export type ProjectVisibility = "public_company" | "restricted";
export type ProjectStatus = "planning" | "active" | "completed" | "archived";

export interface TravelProjectDTO {
  id: string;
  company_id: string;
  agency_id: string;
  name: string;
  description?: string | null;
  purpose?: string | null;
  owner_id?: string | null;
  manager_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  budget_cents: number;
  committed_cents: number;
  currency: string;
  cost_center?: string | null;
  department?: string | null;
  project_code?: string | null;
  visibility: ProjectVisibility;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
  trips_count?: number;
}

export type CorporateTaskStatus = "todo" | "in_progress" | "done";
export type CorporateTaskPriority = "low" | "medium" | "high" | "urgent";

export interface TravelProjectTaskDTO {
  id: string;
  project_id: string;
  trip_id?: string | null;
  title: string;
  description?: string | null;
  assignee_profile_id?: string | null;
  due_date?: string | null;
  status: CorporateTaskStatus;
  priority: CorporateTaskPriority;
  checklist: Array<{ id: string; label: string; checked: boolean }>;
  created_at: string;
}

export type TimelineCategory =
  | "flight"
  | "hotel"
  | "car"
  | "meeting"
  | "meal"
  | "task"
  | "note"
  | "transfer"
  | "activity";

export interface TravelProjectTimelineItemDTO {
  id: string;
  project_id: string;
  trip_id?: string | null;
  time_start: string;
  time_end?: string | null;
  title: string;
  category: TimelineCategory;
  place_name?: string | null;
  place_address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  external_place_id?: string | null;
  details: Record<string, any>;
  traveler_ids: string[];
  created_at: string;
}

// ─── 6. Motor de Políticas e Aprovações ───────────────────────────────────────
export interface PolicyAirRule {
  max_amount_cents?: number;
  advance_days_required?: number;
  max_cabin: "economy" | "premium_economy" | "business" | "first";
  refundability_required?: boolean;
  preferred_airlines?: string[];
  max_stops?: number;
}

export interface PolicyHotelRule {
  max_nightly_amount_cents?: number;
  min_stars?: number;
  max_stars?: number;
  breakfast_required?: boolean;
  free_cancellation_required?: boolean;
  preferred_chains?: string[];
}

export interface PolicyCarRule {
  max_category: "compact" | "intermediate" | "suv";
  max_daily_cents?: number;
}

export interface TravelPolicyRulesDTO {
  air?: PolicyAirRule;
  hotel?: PolicyHotelRule;
  car?: PolicyCarRule;
}

export interface TravelPolicyVersionDTO {
  id: string;
  company_id: string;
  version_number: number;
  title: string;
  status: "active" | "draft" | "archived";
  rules_json: TravelPolicyRulesDTO;
  created_by?: string | null;
  created_at: string;
}

export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired" | "auto_approved";

export interface TravelApprovalRequestDTO {
  id: string;
  company_id: string;
  agency_id: string;
  trip_id?: string | null;
  project_id?: string | null;
  requester_id: string;
  booker_id: string;
  status: ApprovalStatus;
  total_amount_cents: number;
  currency: string;
  lowest_logical_fare_cents?: number | null;
  selected_fare_cents?: number | null;
  policy_violation_reasons: string[];
  justification?: string | null;
  fare_expires_at: string;
  approver_profile_id?: string | null;
  delegated_from_profile_id?: string | null;
  reviewed_at?: string | null;
  review_comments?: string | null;
  created_at: string;
  requester_name?: string;
  project_title?: string;
  trip_title?: string;
}

// ─── 7. Créditos de Bilhete Aéreo (Não é $WZ) ─────────────────────────────────
export type TicketCreditStatus = "active" | "partially_used" | "fully_used" | "expired";

export interface AirTicketCreditDTO {
  id: string;
  traveler_id: string;
  company_id?: string | null;
  agency_id: string;
  airline: string;
  original_pnr: string;
  original_ticket_number: string;
  currency: string;
  original_amount_cents: number;
  remaining_amount_cents: number;
  valid_from: string;
  expires_at: string;
  transferable: boolean;
  owner_rule: string;
  fare_rule_snapshot: Record<string, any>;
  status: TicketCreditStatus;
  created_at: string;
  traveler_name?: string;
}

// ─── 8. Faturamento Corporativo e Conciliação ──────────────────────────────────
export interface CorporateCreditProfileDTO {
  id: string;
  company_id: string;
  agency_id: string;
  credit_limit_cents: number;
  available_limit_cents: number;
  reserved_limit_cents: number;
  payment_terms_days: 15 | 30 | 45 | 60 | 90;
  billing_cycle: "weekly" | "biweekly" | "monthly";
  status: "active" | "suspended" | "under_review";
  created_at: string;
  updated_at: string;
}

export type InvoiceStatus = "draft" | "issued" | "paid" | "overdue" | "cancelled";

export interface CorporateInvoiceDTO {
  id: string;
  invoice_number: string;
  company_id: string;
  agency_id: string;
  period_start: string;
  period_end: string;
  due_date: string;
  subtotal_cents: number;
  fees_cents: number;
  total_amount_cents: number;
  currency: string;
  status: InvoiceStatus;
  pdf_url?: string | null;
  paid_at?: string | null;
  created_at: string;
}

export interface CorporateInvoiceItemDTO {
  id: string;
  invoice_id: string;
  trip_id?: string | null;
  project_id?: string | null;
  traveler_id?: string | null;
  item_type: "flight" | "hotel" | "car" | "bus" | "fee" | "insurance" | "other";
  description: string;
  locator_code?: string | null;
  ticket_number?: string | null;
  cost_center?: string | null;
  department?: string | null;
  amount_cents: number;
  created_at: string;
}

export type ReconciliationDiscrepancyType =
  | "unmatched_charge"
  | "missing_invoice"
  | "amount_mismatch"
  | "refund_missing"
  | "double_charge";

export interface TravelReconciliationCaseDTO {
  id: string;
  company_id: string;
  agency_id: string;
  provider_code: string;
  booking_ref: string;
  discrepancy_type: ReconciliationDiscrepancyType;
  provider_amount_cents: number;
  waesy_amount_cents: number;
  status: "open" | "investigating" | "resolved" | "waived";
  notes?: string | null;
  created_at: string;
  resolved_at?: string | null;
}

// ─── 9. Normalized Offer Schema & Multi-Provider Saga ────────────────────────
export interface TravelOfferPricing {
  net_amount_cents: number;
  tax_amount_cents: number;
  supplier_fee_cents: number;
  agency_markup_cents: number;
  service_fee_cents: number;
  selling_total_cents: number;
  currency: string;
}

export interface TravelOfferDTO {
  offer_id: string;
  provider_code: "wooba" | "infotravel" | "rexturadvance" | "consolidator" | "manual";
  product_type: "flight" | "hotel" | "car" | "bus" | "insurance" | "package";
  pricing: TravelOfferPricing;
  expires_at: string;
  revalidate_required: boolean;
  policy_status: "within_policy" | "outside_policy" | "requires_approval";
  policy_violation_reasons: string[];
  rules: {
    cancellation_policy?: string;
    change_penalty?: string;
    baggage_allowance?: string;
    is_refundable?: boolean;
    fare_family?: string;
  };
  details: Record<string, any>;
  raw_snapshot_ref?: string;
}

export type SagaStepName = "flight_reservation" | "hotel_reservation" | "car_reservation";

export interface SagaStepState {
  step: SagaStepName;
  status: "pending" | "success" | "failed" | "compensated";
  provider: string;
  locator_code?: string;
  error?: string;
  timestamp: string;
}

export interface SagaBookingResult {
  saga_id: string;
  status: "completed" | "partially_failed" | "failed";
  steps: SagaStepState[];
  trip_id?: string;
  compensations_executed: boolean;
  requires_manual_agent_intervention: boolean;
}


// ─── 10. Sessão Canônica de Busca e Histórico Temporal de Preços ─────────────
export interface TravelQuoteSessionDTO {
  id: string;
  company_id?: string | null;
  agency_id: string;
  user_id: string;
  project_id?: string | null;
  trip_id?: string | null;
  product_type: "flight" | "hotel" | "car" | "bus" | "transfer" | "package";
  search_payload_hash: string;
  search_payload_json: Record<string, any>;
  status: "started" | "in_progress" | "completed" | "failed";
  provider_count: number;
  successful_provider_count: number;
  failed_provider_count: number;
  started_at: string;
  completed_at?: string | null;
}

export interface QuoteProviderExecutionDTO {
  id: string;
  quote_session_id: string;
  provider_code: string;
  request_started_at: string;
  response_at?: string | null;
  latency_ms: number;
  status: "success" | "timeout" | "error" | "no_availability";
  error_code?: string | null;
  cache_hit: boolean;
  provider_request_id?: string | null;
  trace_id: string;
}

export interface TravelOfferSnapshotDTO {
  id: string;
  quote_session_id: string;
  provider_code: string;
  normalized_offer_id: string;
  product_type: string;
  origin?: string | null;
  destination?: string | null;
  travel_start_date?: string | null;
  travel_end_date?: string | null;
  net_amount_cents: number;
  tax_amount_cents: number;
  fee_amount_cents: number;
  markup_amount_cents: number;
  total_amount_cents: number;
  currency: string;
  fare_family?: string | null;
  baggage_included?: string | null;
  cancellation_rule_summary?: string | null;
  policy_status: "within_policy" | "outside_policy" | "requires_approval";
  policy_violation_reasons: string[];
  provider_reference?: string | null;
  raw_snapshot_ref?: string | null;
  normalizer_version: string;
  quoted_at: string;
  expires_at: string;
}

export interface TravelPriceObservationDTO {
  id: string;
  observed_at: string;
  product_type: string;
  route_fingerprint: string;
  travel_start_date: string;
  travel_end_date?: string | null;
  advance_days: number;
  provider_code: string;
  fare_family?: string | null;
  price_cents: number;
  currency: string;
  search_context_hash: string;
  offer_snapshot_id?: string | null;
  availability_state: "available" | "last_seats" | "sold_out";
}
