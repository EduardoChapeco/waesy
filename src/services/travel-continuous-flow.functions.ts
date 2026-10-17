/**
 * travel-continuous-flow.functions.ts — Server Functions da Onda 1 do Turismo
 * Implementa:
 * 1. Qualificação Canônica de Leads Multi-Nicho
 * 2. Assinantes & Pagadores Múltiplos (Multi-Payer Contracts)
 * 3. Livro-Razão de Blindagem Fiscal & Split da Agência
 * 4. Fechamento de Competência Imutável
 * 5. Catálogo Soberano de Companhias Aéreas & Check-in
 */

import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { getServerClient, getAnonServerClient } from "@/lib/supabase";
import { getServerIdentity, requireStaff } from "@/lib/server-access";
import type {
  TravelLeadQualificationDTO,
  TravelContractSignerDTO,
  TravelTaxShieldLedgerDTO,
  TravelMonthlyClosingDTO,
  TravelAirlineLinkDTO,
} from "@/types/travel-continuous-flow";

// ── 1. Qualificação de Leads Multi-Nicho ─────────────────────────────────────

const UpsertLeadQualificationSchema = z.object({
  leadId: z.string().uuid(),
  nicheCategory: z.enum([
    "pacote_completo",
    "somente_aereo",
    "cruzeiro",
    "eurotrip",
    "locacao_carro",
    "seguro_viagem",
    "hospedagem",
    "outro",
  ]).default("pacote_completo"),
  originCity: z.string().optional().nullable(),
  destinationCities: z.array(z.string()).default([]),
  preferredDepartureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  preferredReturnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  flexibilityDays: z.number().int().min(0).max(30).default(0),
  paxAdults: z.number().int().min(1).max(50).default(2),
  paxChildren: z.number().int().min(0).max(50).default(0),
  paxChildrenAges: z.array(z.number().int().min(0).max(17)).default([]),
  paxInfants: z.number().int().min(0).max(20).default(0),
  paxInfantsBirthdates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).default([]),
  cabinPreference: z.enum(["economic", "premium_economy", "business", "first"]).default("economic"),
  hotelStarsMin: z.number().int().min(1).max(5).default(3),
  hotelMealPlan: z.enum(["room_only", "breakfast", "half_board", "full_board", "all_inclusive"]).default("breakfast"),
  budgetMaxCents: z.number().int().nonnegative().optional().nullable(),
  specialNotes: z.string().max(2000).optional().nullable(),
  assignedAgentId: z.string().uuid().optional().nullable(),
  qualificationScore: z.number().int().min(0).max(100).default(50),
});

export const upsertLeadQualification = createServerFn({ method: "POST" })
  .validator(UpsertLeadQualificationSchema)
  .handler(async ({ data }): Promise<{ success: boolean; id: string }> => {
    const identity = await requireStaff();
    const supabase = getServerClient();

    const { data: lead, error: leadErr } = await supabase
      .from("leads_crm")
      .select("id, store_id")
      .eq("id", data.leadId)
      .eq("store_id", identity.store_id)
      .single();

    if (leadErr || !lead) {
      throw new Error("Lead não encontrado nesta agência.");
    }

    const { data: existing } = await supabase
      .from("travel_leads_qualification")
      .select("id")
      .eq("lead_id", data.leadId)
      .maybeSingle();

    if (existing?.id) {
      const { error: updErr } = await supabase
        .from("travel_leads_qualification")
        .update({
          niche_category: data.nicheCategory,
          origin_city: data.originCity || null,
          destination_cities: data.destinationCities,
          preferred_departure_date: data.preferredDepartureDate || null,
          preferred_return_date: data.preferredReturnDate || null,
          flexibility_days: data.flexibilityDays,
          pax_adults: data.paxAdults,
          pax_children: data.paxChildren,
          pax_children_ages: data.paxChildrenAges,
          pax_infants: data.paxInfants,
          pax_infants_birthdates: data.paxInfantsBirthdates,
          cabin_preference: data.cabinPreference,
          hotel_stars_min: data.hotelStarsMin,
          hotel_meal_plan: data.hotelMealPlan,
          budget_max_cents: data.budgetMaxCents || null,
          special_notes: data.specialNotes || null,
          assigned_agent_id: data.assignedAgentId || null,
          qualification_score: data.qualificationScore,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (updErr) throw new Error("Erro ao atualizar qualificação do lead: " + updErr.message);
      return { success: true, id: existing.id };
    }

    const { data: created, error: insErr } = await supabase
      .from("travel_leads_qualification")
      .insert({
        lead_id: data.leadId,
        store_id: identity.store_id,
        niche_category: data.nicheCategory,
        origin_city: data.originCity || null,
        destination_cities: data.destinationCities,
        preferred_departure_date: data.preferredDepartureDate || null,
        preferred_return_date: data.preferredReturnDate || null,
        flexibility_days: data.flexibilityDays,
        pax_adults: data.paxAdults,
        pax_children: data.paxChildren,
        pax_children_ages: data.paxChildrenAges,
        pax_infants: data.paxInfants,
        pax_infants_birthdates: data.paxInfantsBirthdates,
        cabin_preference: data.cabinPreference,
        hotel_stars_min: data.hotelStarsMin,
        hotel_meal_plan: data.hotelMealPlan,
        budget_max_cents: data.budgetMaxCents || null,
        special_notes: data.specialNotes || null,
        assigned_agent_id: data.assignedAgentId || null,
        qualification_score: data.qualificationScore,
      })
      .select("id")
      .single();

    if (insErr || !created?.id) {
      throw new Error("Erro ao criar qualificação do lead: " + (insErr?.message || "ID ausente"));
    }

    return { success: true, id: created.id };
  });

export const getLeadQualification = createServerFn({ method: "GET" })
  .validator(z.object({ leadId: z.string().uuid() }))
  .handler(async ({ data }): Promise<TravelLeadQualificationDTO | null> => {
    const identity = await requireStaff();
    const supabase = getServerClient();

    const { data: qual, error } = await supabase
      .from("travel_leads_qualification")
      .select("*")
      .eq("lead_id", data.leadId)
      .eq("store_id", identity.store_id)
      .maybeSingle();

    if (error) throw new Error("Erro ao consultar qualificação do lead: " + error.message);
    return (qual as TravelLeadQualificationDTO) || null;
  });

// ── 2. Assinantes Múltiplos (Multi-Payer Contracts) ──────────────────────────

const SignerInputSchema = z.object({
  signerRole: z.enum(["primary_contractor", "payer", "legal_guardian", "witness"]).default("payer"),
  fullName: z.string().trim().min(2).max(160),
  cpfCnpj: z.string().trim().min(11).max(32),
  email: z.string().trim().email().optional().nullable(),
  whatsapp: z.string().trim().optional().nullable(),
  sharePercentage: z.number().min(0.01).max(100.0).default(100.0),
  shareAmountCents: z.number().int().nonnegative().default(0),
  paymentMethod: z.enum(["pix", "card", "boleto", "cash", "transfer", "other"]).default("pix"),
});

export const configureContractSigners = createServerFn({ method: "POST" })
  .validator(
    z.object({
      contractId: z.string().uuid(),
      signers: z.array(SignerInputSchema).min(1),
    }),
  )
  .handler(async ({ data }): Promise<{ success: boolean; signersCount: number }> => {
    const identity = await requireStaff();
    const supabase = getServerClient();

    // Validar se o contrato pertence à agência
    const { data: contract, error: cErr } = await supabase
      .from("travel_contracts")
      .select("id, store_id, total_value_cents")
      .eq("id", data.contractId)
      .eq("store_id", identity.store_id)
      .single();

    if (cErr || !contract) {
      throw new Error("Contrato não encontrado nesta agência.");
    }

    // Limpar signers não assinados para reconfiguração
    await supabase
      .from("travel_contract_signers")
      .delete()
      .eq("contract_id", data.contractId)
      .eq("signature_status", "pending");

    // Inserir os novos pagadores/assinantes
    const rowsToInsert = data.signers.map((s) => ({
      contract_id: data.contractId,
      store_id: identity.store_id,
      signer_role: s.signerRole,
      full_name: s.fullName,
      cpf_cnpj: s.cpfCnpj.replace(/\D/g, ""),
      email: s.email || null,
      whatsapp: s.whatsapp || null,
      share_percentage: s.sharePercentage,
      share_amount_cents: s.shareAmountCents || Math.round((contract.total_value_cents * s.sharePercentage) / 100),
      payment_method: s.paymentMethod,
      signature_status: "pending",
    }));

    const { error: insErr } = await supabase
      .from("travel_contract_signers")
      .insert(rowsToInsert);

    if (insErr) {
      throw new Error("Erro ao configurar assinantes do contrato: " + insErr.message);
    }

    return { success: true, signersCount: rowsToInsert.length };
  });

export const listContractSigners = createServerFn({ method: "GET" })
  .validator(z.object({ contractId: z.string().uuid() }))
  .handler(async ({ data }): Promise<TravelContractSignerDTO[]> => {
    const identity = await requireStaff();
    const supabase = getServerClient();

    const { data: rows, error } = await supabase
      .from("travel_contract_signers")
      .select("*")
      .eq("contract_id", data.contractId)
      .eq("store_id", identity.store_id)
      .order("created_at", { ascending: true });

    if (error) throw new Error("Erro ao listar assinantes do contrato: " + error.message);
    return (rows as TravelContractSignerDTO[]) || [];
  });

export const getPublicContractSignerByToken = createServerFn({ method: "GET" })
  .validator(z.object({ token: z.string().min(8).max(64) }))
  .handler(
    async ({
      data,
    }): Promise<{
      signer: TravelContractSignerDTO;
      contract: {
        id: string;
        contract_title: string;
        client_name: string;
        destination: string;
        package_summary: string;
        total_value_cents: number;
        payment_conditions: string;
      };
      agency: { name: string; whatsapp?: string | null };
    } | null> => {
      const anonClient = getAnonServerClient();

      const { data: signer, error: sErr } = await anonClient
        .from("travel_contract_signers")
        .select("*, travel_contracts(id, contract_title, client_name, destination, package_summary, total_value_cents, payment_conditions, store_id)")
        .eq("public_sign_token", data.token)
        .maybeSingle();

      if (sErr || !signer) return null;

      const rawContract = (signer as any).travel_contracts;
      let agencyName = "Agência Waesy";
      let agencyWhatsapp: string | null = null;

      if (rawContract?.store_id) {
        const { data: store } = await anonClient
          .from("stores")
          .select("name, settings")
          .eq("id", rawContract.store_id)
          .maybeSingle();
        if (store) {
          agencyName = store.name;
          agencyWhatsapp = (store.settings as any)?.whatsapp || null;
        }
      }

      return {
        signer: {
          id: signer.id,
          contract_id: signer.contract_id,
          store_id: signer.store_id,
          signer_role: signer.signer_role,
          full_name: signer.full_name,
          cpf_cnpj: signer.cpf_cnpj,
          email: signer.email,
          whatsapp: signer.whatsapp,
          share_percentage: signer.share_percentage,
          share_amount_cents: signer.share_amount_cents,
          payment_method: signer.payment_method,
          public_sign_token: signer.public_sign_token,
          signature_status: signer.signature_status,
          signed_at: signer.signed_at,
          signer_ip: signer.signer_ip,
          signer_user_agent: signer.signer_user_agent,
          signature_hash: signer.signature_hash,
          rejection_reason: signer.rejection_reason,
          audit_metadata: signer.audit_metadata,
          created_at: signer.created_at,
          updated_at: signer.updated_at,
        },
        contract: {
          id: rawContract.id,
          contract_title: rawContract.contract_title,
          client_name: rawContract.client_name,
          destination: rawContract.destination,
          package_summary: rawContract.package_summary,
          total_value_cents: rawContract.total_value_cents,
          payment_conditions: rawContract.payment_conditions,
        },
        agency: { name: agencyName, whatsapp: agencyWhatsapp },
      };
    },
  );

export const signContractAsPayer = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: z.string().min(8).max(64),
      acceptedTerms: z.boolean().refine((val) => val === true, "Aceite obrigatório"),
      signatureImage: z.string().max(350000).optional(),
    }),
  )
  .handler(async ({ data }): Promise<{ success: boolean; signatureHash: string }> => {
    const request = getRequest();
    const { getRealClientIP } = await import("@/lib/network-telemetry.server");
    const ipAddress = getRealClientIP(request);
    const userAgent = request.headers.get("user-agent")?.slice(0, 512) || "Desconhecido";
    const anonClient = getAnonServerClient();

    const { data: signer, error: sErr } = await anonClient
      .from("travel_contract_signers")
      .select("id, contract_id, cpf_cnpj, signature_status")
      .eq("public_sign_token", data.token)
      .maybeSingle();

    if (sErr || !signer) throw new Error("Assinante não encontrado.");
    if (signer.signature_status === "signed") {
      throw new Error("Este contrato já foi assinado por este pagador.");
    }

    const now = new Date().toISOString();
    const hashPayload = `${signer.contract_id}|${signer.id}|${signer.cpf_cnpj}|${now}|${ipAddress}`;
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(hashPayload));
    const signatureHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const { error: updErr } = await anonClient
      .from("travel_contract_signers")
      .update({
        signature_status: "signed",
        signed_at: now,
        signer_ip: ipAddress,
        signer_user_agent: userAgent,
        signature_hash: signatureHash,
        audit_metadata: {
          signed_via: "web_mobile_flow",
          has_signature_image: Boolean(data.signatureImage),
        },
        updated_at: now,
      })
      .eq("id", signer.id);

    if (updErr) throw new Error("Erro ao salvar assinatura eletrônica: " + updErr.message);

    return { success: true, signatureHash };
  });

// ── 3. Livro-Razão de Blindagem Fiscal & Split da Agência ──────────────────────

const RecordTaxShieldSchema = z.object({
  sheetId: z.string().uuid().optional().nullable(),
  tripId: z.string().uuid().optional().nullable(),
  entryCode: z.string().min(3),
  operatorName: z.string().min(2),
  operatorLocator: z.string().min(2),
  clientName: z.string().min(2),
  clientDocument: z.string().optional().nullable(),
  grossOperatorVolumeCents: z.number().int().nonnegative(),
  operatorDirectTransactedCents: z.number().int().nonnegative().default(0),
  agencyRetainedPixCents: z.number().int().nonnegative().default(0),
  agencyGrossTakeRateCents: z.number().int().nonnegative(),
  operatorCostCents: z.number().int().nonnegative(),
  taxableServiceBaseCents: z.number().int().nonnegative(),
  projectedTaxRatePct: z.number().min(0).max(100).default(6.0),
  invoiceStatus: z.enum(["pending", "requested", "issued", "exempt", "cancelled"]).default("pending"),
  invoiceNumber: z.string().optional().nullable(),
  sellerProfileId: z.string().uuid().optional().nullable(),
  sellerCommissionCents: z.number().int().nonnegative().default(0),
  notes: z.string().optional().nullable(),
});

export const recordTaxShieldEntry = createServerFn({ method: "POST" })
  .validator(RecordTaxShieldSchema)
  .handler(async ({ data }): Promise<{ success: boolean; id: string }> => {
    const identity = await requireStaff();
    const supabase = getServerClient();

    const projectedTaxCents = Math.round(
      (data.taxableServiceBaseCents * data.projectedTaxRatePct) / 100,
    );

    const { data: created, error } = await supabase
      .from("travel_tax_shield_ledger")
      .insert({
        store_id: identity.store_id,
        sheet_id: data.sheetId || null,
        trip_id: data.tripId || null,
        entry_code: data.entryCode,
        operator_name: data.operatorName,
        operator_locator: data.operatorLocator,
        client_name: data.clientName,
        client_document: data.clientDocument || null,
        gross_operator_volume_cents: data.grossOperatorVolumeCents,
        operator_direct_transacted_cents: data.operatorDirectTransactedCents,
        agency_retained_pix_cents: data.agencyRetainedPixCents,
        agency_gross_take_rate_cents: data.agencyGrossTakeRateCents,
        operator_cost_cents: data.operatorCostCents,
        taxable_service_base_cents: data.taxableServiceBaseCents,
        projected_tax_rate_pct: data.projectedTaxRatePct,
        projected_tax_cents: projectedTaxCents,
        invoice_status: data.invoiceStatus,
        invoice_number: data.invoiceNumber || null,
        seller_profile_id: data.sellerProfileId || null,
        seller_commission_cents: data.sellerCommissionCents,
        notes: data.notes || null,
      })
      .select("id")
      .single();

    if (error || !created?.id) {
      throw new Error("Erro ao registrar lançamento no livro-razão de blindagem fiscal: " + (error?.message || "ID ausente"));
    }

    return { success: true, id: created.id };
  });

export const listTaxShieldEntries = createServerFn({ method: "GET" })
  .validator(
    z.object({
      invoiceStatus: z.string().optional(),
      search: z.string().optional(),
    }).optional().default({}),
  )
  .handler(async ({ data }): Promise<TravelTaxShieldLedgerDTO[]> => {
    const identity = await requireStaff();
    const supabase = getServerClient();

    let query = supabase
      .from("travel_tax_shield_ledger")
      .select("*")
      .eq("store_id", identity.store_id)
      .order("created_at", { ascending: false });

    if (data.invoiceStatus && data.invoiceStatus !== "all") {
      query = query.eq("invoice_status", data.invoiceStatus);
    }
    if (data.search?.trim()) {
      const q = data.search.trim();
      query = query.or(`client_name.ilike.%${q}%,operator_locator.ilike.%${q}%,entry_code.ilike.%${q}%`);
    }

    const { data: rows, error } = await query;
    if (error) throw new Error("Erro ao consultar lançamentos fiscais: " + error.message);
    return (rows as TravelTaxShieldLedgerDTO[]) || [];
  });

// ── 4. Fechamento de Competência Imutável ─────────────────────────────────────

export const listMonthlyClosings = createServerFn({ method: "GET" })
  .handler(async (): Promise<TravelMonthlyClosingDTO[]> => {
    const identity = await requireStaff();
    const supabase = getServerClient();

    const { data: rows, error } = await supabase
      .from("travel_monthly_closings")
      .select("*")
      .eq("store_id", identity.store_id)
      .order("competence_month", { ascending: false });

    if (error) throw new Error("Erro ao listar competências mensais: " + error.message);
    return (rows as TravelMonthlyClosingDTO[]) || [];
  });

export const closeMonthlyCompetence = createServerFn({ method: "POST" })
  .validator(z.object({ competenceMonth: z.string().regex(/^\d{4}-\d{2}-01$/) }))
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const identity = await requireStaff();
    const supabase = getServerClient();

    const { error } = await supabase
      .from("travel_monthly_closings")
      .upsert(
        {
          store_id: identity.store_id,
          competence_month: data.competenceMonth,
          status: "closed",
          closed_at: new Date().toISOString(),
          closed_by_profile_id: identity.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "store_id, competence_month" },
      );

    if (error) throw new Error("Erro ao travar competência mensal: " + error.message);
    return { success: true };
  });

// ── 5. Catálogo Soberano de Companhias Aéreas & Check-in ─────────────────────

export const listAirlineLinks = createServerFn({ method: "GET" })
  .handler(async (): Promise<TravelAirlineLinkDTO[]> => {
    const anonClient = getAnonServerClient();

    const { data: rows, error } = await anonClient
      .from("travel_airline_links")
      .select("*")
      .eq("is_active", true)
      .order("airline_name", { ascending: true });

    if (error) throw new Error("Erro ao listar companhias aéreas: " + error.message);
    return (rows as TravelAirlineLinkDTO[]) || [];
  });

export const getAirlineLinkByIata = createServerFn({ method: "GET" })
  .validator(z.object({ iataCode: z.string().min(2).max(4) }))
  .handler(async ({ data }): Promise<TravelAirlineLinkDTO | null> => {
    const anonClient = getAnonServerClient();

    const { data: link, error } = await anonClient
      .from("travel_airline_links")
      .select("*")
      .eq("iata_code", data.iataCode.toUpperCase())
      .maybeSingle();

    if (error) throw new Error("Erro ao consultar companhia aérea: " + error.message);
    return (link as TravelAirlineLinkDTO) || null;
  });
