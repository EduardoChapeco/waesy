/**
 * crm.ts — Contratos e Tipos Canônicos de CRM e Carteira de Clientes (BFF BigTech)
 * Re-exporta Server Functions de crm.functions.ts com zero dependência de client Supabase.
 */

export type Stage = {
  id: string;
  name: string;
  position: number;
  color: string;
  is_won: boolean;
  is_lost: boolean;
};

export type Lead = {
  id: string;
  stage_id: string;
  owner_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  destination: string | null;
  estimated_value: number;
  estimated_value_cents?: number;
  pax_count: number;
  source: string | null;
  position: number;
  created_at: string;
  agency_id?: string;
  client_id?: string | null;
  notes?: string | null;
  travel_start?: string | null;
  travel_end?: string | null;
  closed_at?: string | null;
  lost_reason?: string | null;
  deleted_at?: string | null;
  tags?: string[];
  checklist?: Array<{ id: string; text: string; done: boolean }>;
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    size: number;
    type: string;
    created_at: string;
  }>;
  custom_fields?: Record<string, unknown>;
  pax_adults?: number;
  pax_children?: number;
  pax_infants?: number;
  pax_ages?: number[];
  interest_type?: string | null;
  last_contacted_at?: string | null;
  staleness_status?: string | null;
  lead_source_detail?: string | null;
  [key: string]: unknown;
};

export type Activity = {
  id: string;
  lead_id: string;
  author_id: string | null;
  agency_id: string;
  type: string;
  content: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

// Re-export canonical Server Functions
export * from "./crm.functions";
