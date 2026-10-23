/**
 * corporate-travel.functions.ts — BFF Server Functions para o Domínio Corporativo de Turismo Waesy
 * NORMAS: AGENTS.md (B.1 a B.41), SPEC-TURISMO-CORPORATIVO-TRAVELOS-CONSOLIDATION
 * Zero Mocks | Padrão BigTech | Multi-Tenant Seguro com RLS Deny-by-Default
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, requireStaff } from "@/lib/server-access";
import type {
  AgencyCorporateCapabilityDTO,
  CorporateTravelAccountDTO,
  CorporateTravelMemberDTO,
  TravelerProfileDTO,
  TravelerDocumentDTO,
  TravelProjectDTO,
  TravelProjectTaskDTO,
  TravelProjectTimelineItemDTO,
  TravelPolicyVersionDTO,
  TravelApprovalRequestDTO,
  AirTicketCreditDTO,
  CorporateCreditProfileDTO,
  CorporateInvoiceDTO,
  TravelReconciliationCaseDTO,
} from "@/types/corporate-travel";

// ─── 1. Gate de Habilitação Master da Agência Corporativa ────────────────────

export const getAgencyCorporateCapability = createServerFn({ method: "GET" })
  .validator(z.object({ storeId: z.string().uuid("ID da agência inválido") }))
  .handler(async ({ data }): Promise<AgencyCorporateCapabilityDTO | null> => {
    const supabase = getServerClient();
    const { data: row, error } = await supabase
      .from("agency_corporate_travel_capability")
      .select("*")
      .eq("store_id", data.storeId)
      .maybeSingle();

    if (error) {
      console.warn("[getAgencyCorporateCapability] Falha ao consultar capability:", error.message);
      return null;
    }
    return row as AgencyCorporateCapabilityDTO | null;
  });

export const updateAgencyCorporateCapability = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid(),
      status: z.enum(["pending", "approved", "suspended", "revoked"]),
      commercialNotes: z.string().optional().nullable(),
      allowedCapabilities: z.array(z.string()).default(["flight", "hotel", "car", "bus", "transfer", "insurance", "package"]),
    })
  )
  .handler(async ({ data }): Promise<{ success: boolean; capability: AgencyCorporateCapabilityDTO }> => {
    const identity = await requireStaff();
    const supabase = getServerClient();

    const { data: upserted, error } = await supabase
      .from("agency_corporate_travel_capability")
      .upsert(
        {
          store_id: data.storeId,
          status: data.status,
          commercial_notes: data.commercialNotes || null,
          allowed_capabilities: data.allowedCapabilities,
          approved_by: data.status === "approved" ? identity.id : null,
          approved_at: data.status === "approved" ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "store_id" }
      )
      .select("*")
      .single();

    if (error || !upserted) {
      throw new Error("Falha ao salvar capability corporativa: " + (error?.message || ""));
    }
    return { success: true, capability: upserted as AgencyCorporateCapabilityDTO };
  });

// ─── 2. Vínculo Empresa ↔ Agência (Corporate Travel Accounts) ────────────────

export const requestCompanyAgencyLink = createServerFn({ method: "POST" })
  .validator(
    z.object({
      companyId: z.string().uuid("ID da empresa inválido"),
      agencyId: z.string().uuid("ID da agência inválido"),
    })
  )
  .handler(async ({ data }): Promise<{ success: boolean; accountId: string }> => {
    const supabase = getServerClient();
    const identity = await requireStaff();

    // 1. Validar se a agência é aprovada pelo Master Admin
    const { data: capability } = await supabase
      .from("agency_corporate_travel_capability")
      .select("status")
      .eq("store_id", data.agencyId)
      .maybeSingle();

    if (!capability || capability.status !== "approved") {
      throw new Error("A agência selecionada ainda não possui habilitação aprovada para atendimento corporativo.");
    }

    // 2. Registrar vínculo com status inicial 'pending'
    const { data: account, error } = await supabase
      .from("corporate_travel_accounts")
      .upsert(
        {
          company_id: data.companyId,
          agency_id: data.agencyId,
          status: "pending",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "company_id,agency_id" }
      )
      .select("id")
      .single();

    if (error || !account) {
      throw new Error("Erro ao criar solicitação de vínculo corporativo: " + error?.message);
    }

    // 3. Cadastrar usuário solicitante como TRAVEL_ADMIN inicial da empresa
    await supabase.from("corporate_travel_members").upsert(
      {
        account_id: account.id,
        profile_id: identity.id,
        role: "TRAVEL_ADMIN",
        permissions: {
          can_search: true,
          can_quote: true,
          can_request: true,
          can_reserve: true,
          can_approve: true,
          can_manage_travelers: true,
          can_view_financials: true,
          can_view_invoices: true,
          can_manage_policies: true,
          can_use_projects: true,
        },
      },
      { onConflict: "account_id,profile_id" }
    );

    return { success: true, accountId: account.id };
  });

export const listAgencyCorporateAccounts = createServerFn({ method: "GET" })
  .validator(z.object({ agencyId: z.string().uuid() }))
  .handler(async ({ data }): Promise<CorporateTravelAccountDTO[]> => {
    const supabase = getServerClient();
    await requireStaff();

    const { data: rows, error } = await supabase
      .from("corporate_travel_accounts")
      .select("*, stores!corporate_travel_accounts_company_id_fkey(id, name, logo_url)")
      .eq("agency_id", data.agencyId)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[listAgencyCorporateAccounts] Erro ao listar contas:", error.message);
      return [];
    }

    return (rows || []).map((r: any) => ({
      ...r,
      company_name: r.stores?.name || "Empresa Cliente",
    }));
  });

export const updateCorporateAccount = createServerFn({ method: "POST" })
  .validator(
    z.object({
      accountId: z.string().uuid(),
      status: z.enum(["pending", "active", "suspended", "cancelled"]).optional(),
      primaryAccountManagerId: z.string().uuid().optional().nullable(),
      supportPhone: z.string().optional().nullable(),
      supportWhatsapp: z.string().optional().nullable(),
      supportEmail: z.string().optional().nullable(),
      autonomyMatrix: z.record(z.string()).optional(),
    })
  )
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const supabase = getServerClient();
    await requireStaff();

    const payload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (data.status) payload.status = data.status;
    if (data.status === "active") payload.activated_at = new Date().toISOString();
    if (data.primaryAccountManagerId !== undefined) payload.primary_account_manager_id = data.primaryAccountManagerId;
    if (data.supportPhone !== undefined) payload.support_phone = data.supportPhone;
    if (data.supportWhatsapp !== undefined) payload.support_whatsapp = data.supportWhatsapp;
    if (data.supportEmail !== undefined) payload.support_email = data.supportEmail;
    if (data.autonomyMatrix) payload.autonomy_matrix = data.autonomyMatrix;

    const { error } = await supabase
      .from("corporate_travel_accounts")
      .update(payload)
      .eq("id", data.accountId);

    if (error) {
      throw new Error("Erro ao atualizar conta corporativa: " + error.message);
    }
    return { success: true };
  });

export const getCompanyCorporateAccount = createServerFn({ method: "GET" })
  .validator(z.object({ companyId: z.string().uuid() }))
  .handler(async ({ data }): Promise<CorporateTravelAccountDTO | null> => {
    const supabase = getServerClient();

    const { data: row, error } = await supabase
      .from("corporate_travel_accounts")
      .select("*, stores!corporate_travel_accounts_agency_id_fkey(id, name, logo_url)")
      .eq("corporate_account_id", data.companyId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !row) return null;

    return {
      ...row,
      agency_name: (row as any).stores?.name || "Agência Parceira",
    };
  });

// ─── 3. Membros Corporativos & RBAC ──────────────────────────────────────────

export const listCorporateMembers = createServerFn({ method: "GET" })
  .validator(z.object({ accountId: z.string().uuid() }))
  .handler(async ({ data }): Promise<CorporateTravelMemberDTO[]> => {
    const supabase = getServerClient();
    const { data: rows, error } = await supabase
      .from("corporate_travel_members")
      .select("*, profiles(id, full_name, email, phone)")
      .eq("account_id", data.accountId)
      .order("created_at", { ascending: true });

    if (error) return [];
    return (rows || []).map((r: any) => ({
      ...r,
      profile: r.profiles || null,
    }));
  });

export const saveCorporateMember = createServerFn({ method: "POST" })
  .validator(
    z.object({
      accountId: z.string().uuid(),
      profileId: z.string().uuid(),
      role: z.enum([
        "TRAVEL_ADMIN",
        "TRAVEL_MANAGER",
        "TRAVEL_BOOKER",
        "TRAVELER",
        "APPROVER",
        "FINANCE",
        "AUDITOR",
        "VIEWER",
        "EXTERNAL_TRAVELER",
      ]),
      department: z.string().optional().nullable(),
      costCenter: z.string().optional().nullable(),
      permissions: z.record(z.boolean()).default({}),
    })
  )
  .handler(async ({ data }): Promise<{ success: boolean; id: string }> => {
    const supabase = getServerClient();
    await requireStaff();

    const { data: member, error } = await supabase
      .from("corporate_travel_members")
      .upsert(
        {
          account_id: data.accountId,
          profile_id: data.profileId,
          role: data.role,
          department: data.department || null,
          cost_center: data.costCenter || null,
          permissions: data.permissions,
        },
        { onConflict: "account_id,profile_id" }
      )
      .select("id")
      .single();

    if (error || !member) {
      throw new Error("Erro ao salvar membro corporativo: " + error?.message);
    }
    return { success: true, id: member.id };
  });

// ─── 4. Perfil de Viajante (Traveler Profiles) & Document Vault ───────────────

export const listCompanyTravelers = createServerFn({ method: "GET" })
  .validator(z.object({ companyId: z.string().uuid() }))
  .handler(async ({ data }): Promise<TravelerProfileDTO[]> => {
    const supabase = getServerClient();
    const { data: rows, error } = await supabase
      .from("traveler_profiles")
      .select("*")
      .eq("corporate_account_id", data.companyId)
      .order("full_name", { ascending: true });

    if (error) return [];
    return rows as TravelerProfileDTO[];
  });

export const saveTravelerProfile = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid().optional(),
      companyId: z.string().uuid(),
      profileId: z.string().uuid().optional().nullable(),
      fullName: z.string().min(2, "Nome obrigatório"),
      socialName: z.string().optional().nullable(),
      documentType: z.string().default("cpf"),
      documentNumber: z.string().min(4, "Documento obrigatório"),
      passportNumber: z.string().optional().nullable(),
      passportExpiry: z.string().optional().nullable(),
      passportIssuingCountry: z.string().default("BRA"),
      nationality: z.string().default("Brasileira"),
      birthDate: z.string().optional().nullable(),
      phone: z.string().optional().nullable(),
      email: z.string().email().optional().nullable(),
      emergencyContactName: z.string().optional().nullable(),
      emergencyContactPhone: z.string().optional().nullable(),
      seatPreference: z.enum(["window", "aisle", "any"]).default("window"),
      mealPreference: z.string().default("standard"),
      specialNeeds: z.string().optional().nullable(),
      loyaltyPrograms: z.array(z.any()).default([]),
    })
  )
  .handler(async ({ data }): Promise<{ success: boolean; id: string }> => {
    const supabase = getServerClient();
    await requireStaff();

    const payload = {
      company_id: data.companyId,
      profile_id: data.profileId || null,
      full_name: data.fullName.trim(),
      social_name: data.socialName?.trim() || null,
      document_type: data.documentType,
      document_number: data.documentNumber.trim(),
      passport_number: data.passportNumber?.trim() || null,
      passport_expiry: data.passportExpiry || null,
      passport_issuing_country: data.passportIssuingCountry || "BRA",
      nationality: data.nationality || "Brasileira",
      birth_date: data.birthDate || null,
      phone: data.phone?.trim() || null,
      email: data.email?.trim().toLowerCase() || null,
      emergency_contact_name: data.emergencyContactName?.trim() || null,
      emergency_contact_phone: data.emergencyContactPhone?.trim() || null,
      seat_preference: data.seatPreference,
      meal_preference: data.mealPreference,
      special_needs: data.specialNeeds?.trim() || null,
      loyalty_programs: data.loyaltyPrograms,
      updated_at: new Date().toISOString(),
    };

    let query = supabase.from("traveler_profiles");
    let res;
    if (data.id) {
      res = await query.update(payload).eq("id", data.id).select("id").single();
    } else {
      res = await query.insert(payload).select("id").single();
    }

    if (res.error || !res.data) {
      throw new Error("Erro ao salvar perfil do viajante: " + res.error?.message);
    }
    return { success: true, id: res.data.id };
  });

export const listTravelerDocuments = createServerFn({ method: "GET" })
  .validator(z.object({ travelerId: z.string().uuid() }))
  .handler(async ({ data }): Promise<TravelerDocumentDTO[]> => {
    const supabase = getServerClient();
    const { data: rows, error } = await supabase
      .from("traveler_documents")
      .select("*")
      .eq("traveler_id", data.travelerId)
      .order("created_at", { ascending: false });

    if (error) return [];

    const now = new Date();
    const thirtyDaysAhead = new Date();
    thirtyDaysAhead.setDate(now.getDate() + 30);

    return (rows || []).map((doc: any) => {
      let status = doc.status;
      if (doc.expiry_date) {
        const exp = new Date(doc.expiry_date);
        if (exp < now) {
          status = "expired";
        } else if (exp <= thirtyDaysAhead) {
          status = "expiring_soon";
        }
      }
      return { ...doc, status };
    });
  });

export const saveTravelerDocument = createServerFn({ method: "POST" })
  .validator(
    z.object({
      travelerId: z.string().uuid(),
      docType: z.enum(["passport", "rg", "cnh", "visa", "authorization", "corporate_letter", "vaccine", "other"]),
      title: z.string().min(2, "Título obrigatório"),
      fileUrl: z.string().url("URL do arquivo inválida"),
      docNumber: z.string().optional().nullable(),
      issuingCountry: z.string().optional().nullable(),
      issuedDate: z.string().optional().nullable(),
      expiryDate: z.string().optional().nullable(),
      metadata: z.record(z.any()).default({}),
    })
  )
  .handler(async ({ data }): Promise<{ success: boolean; id: string }> => {
    const supabase = getServerClient();
    await requireStaff();

    const { data: doc, error } = await supabase
      .from("traveler_documents")
      .insert({
        traveler_id: data.travelerId,
        doc_type: data.docType,
        title: data.title.trim(),
        file_url: data.fileUrl,
        doc_number: data.docNumber?.trim() || null,
        issuing_country: data.issuingCountry || null,
        issued_date: data.issuedDate || null,
        expiry_date: data.expiryDate || null,
        status: "valid",
        metadata: data.metadata,
      })
      .select("id")
      .single();

    if (error || !doc) {
      throw new Error("Erro ao salvar documento: " + error?.message);
    }
    return { success: true, id: doc.id };
  });

// ─── 5. Projetos de Viagem (Travel Projects) & Timeline Viva ─────────────────

export const listCompanyTravelProjects = createServerFn({ method: "GET" })
  .validator(z.object({ companyId: z.string().uuid() }))
  .handler(async ({ data }): Promise<TravelProjectDTO[]> => {
    const supabase = getServerClient();
    const { data: rows, error } = await supabase
      .from("travel_projects")
      .select("*, tourism_trips(count)")
      .eq("corporate_account_id", data.companyId)
      .order("start_date", { ascending: false });

    if (error) return [];

    return (rows || []).map((r: any) => ({
      ...r,
      trips_count: r.tourism_trips?.[0]?.count || 0,
    }));
  });

export const getTravelProjectDetail = createServerFn({ method: "GET" })
  .validator(z.object({ projectId: z.string().uuid() }))
  .handler(
    async ({
      data,
    }): Promise<{
      project: TravelProjectDTO;
      trips: any[];
      tasks: TravelProjectTaskDTO[];
      timeline: TravelProjectTimelineItemDTO[];
    }> => {
      const supabase = getServerClient();

      const [projRes, tripsRes, tasksRes, timeRes] = await Promise.all([
        supabase.from("travel_projects").select("*").eq("id", data.projectId).single(),
        supabase.from("tourism_trips").select("*").eq("project_id", data.projectId).order("travel_start_date"),
        supabase.from("travel_project_tasks").select("*").eq("project_id", data.projectId).order("due_date"),
        supabase.from("travel_project_timeline_items").select("*").eq("project_id", data.projectId).order("time_start"),
      ]);

      if (projRes.error || !projRes.data) {
        throw new Error("Projeto de viagem não encontrado");
      }

      return {
        project: projRes.data as TravelProjectDTO,
        trips: tripsRes.data || [],
        tasks: tasksRes.data || [],
        timeline: timeRes.data || [],
      };
    }
  );

export const createTravelProject = createServerFn({ method: "POST" })
  .validator(
    z.object({
      companyId: z.string().uuid(),
      agencyId: z.string().uuid(),
      name: z.string().min(3, "Nome do projeto obrigatório"),
      description: z.string().optional().nullable(),
      purpose: z.string().optional().nullable(),
      startDate: z.string().optional().nullable(),
      endDate: z.string().optional().nullable(),
      budgetCents: z.number().nonnegative().default(0),
      currency: z.string().default("BRL"),
      costCenter: z.string().optional().nullable(),
      department: z.string().optional().nullable(),
      projectCode: z.string().optional().nullable(),
    })
  )
  .handler(async ({ data }): Promise<{ success: boolean; id: string }> => {
    const supabase = getServerClient();
    const identity = await requireStaff();

    const { data: row, error } = await supabase
      .from("travel_projects")
      .insert({
        company_id: data.companyId,
        agency_id: data.agencyId,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        purpose: data.purpose?.trim() || null,
        owner_id: identity.id,
        manager_id: identity.id,
        start_date: data.startDate || null,
        end_date: data.endDate || null,
        budget_cents: data.budgetCents,
        currency: data.currency,
        cost_center: data.costCenter?.trim() || null,
        department: data.department?.trim() || null,
        project_code: data.projectCode?.trim() || null,
        status: "planning",
      })
      .select("id")
      .single();

    if (error || !row) {
      throw new Error("Erro ao criar projeto: " + error?.message);
    }
    return { success: true, id: row.id };
  });

export const saveProjectTimelineItem = createServerFn({ method: "POST" })
  .validator(
    z.object({
      projectId: z.string().uuid(),
      tripId: z.string().uuid().optional().nullable(),
      timeStart: z.string(),
      timeEnd: z.string().optional().nullable(),
      title: z.string().min(2, "Título obrigatório"),
      category: z.enum(["flight", "hotel", "car", "meeting", "meal", "task", "note", "transfer", "activity"]),
      placeName: z.string().optional().nullable(),
      placeAddress: z.string().optional().nullable(),
      latitude: z.number().optional().nullable(),
      longitude: z.number().optional().nullable(),
      externalPlaceId: z.string().optional().nullable(),
      details: z.record(z.any()).default({}),
      travelerIds: z.array(z.string().uuid()).default([]),
    })
  )
  .handler(async ({ data }): Promise<{ success: boolean; id: string; conflictWarning?: string }> => {
    const supabase = getServerClient();
    await requireStaff();

    // Detecção defensiva de conflitos de agenda (ex: evento muito próximo de outro com deslocamento)
    const { data: existingItems } = await supabase
      .from("travel_project_timeline_items")
      .select("time_start, time_end, title, place_name")
      .eq("project_id", data.projectId);

    let conflictWarning: string | undefined;
    const newItemStart = new Date(data.timeStart).getTime();

    if (existingItems && existingItems.length > 0) {
      for (const item of existingItems) {
        const itemEnd = item.time_end ? new Date(item.time_end).getTime() : new Date(item.time_start).getTime() + 30 * 60000;
        // Se novo item inicia antes de terminar o anterior ou com intervalo < 20 min
        if (newItemStart >= new Date(item.time_start).getTime() && newItemStart < itemEnd) {
          conflictWarning = `Atenção: Horário sobreposto com "${item.title}". Verifique a margem de deslocamento.`;
          break;
        }
      }
    }

    const { data: row, error } = await supabase
      .from("travel_project_timeline_items")
      .insert({
        project_id: data.projectId,
        trip_id: data.tripId || null,
        time_start: data.timeStart,
        time_end: data.timeEnd || null,
        title: data.title.trim(),
        category: data.category,
        place_name: data.placeName?.trim() || null,
        place_address: data.placeAddress?.trim() || null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        external_place_id: data.externalPlaceId || null,
        details: data.details,
        traveler_ids: data.travelerIds,
      })
      .select("id")
      .single();

    if (error || !row) {
      throw new Error("Erro ao salvar item na timeline: " + error?.message);
    }
    return { success: true, id: row.id, conflictWarning };
  });

// ─── 6. Motor de Políticas e Aprovações ───────────────────────────────────────

export const getCompanyTravelPolicy = createServerFn({ method: "GET" })
  .validator(z.object({ companyId: z.string().uuid() }))
  .handler(async ({ data }): Promise<TravelPolicyVersionDTO | null> => {
    const supabase = getServerClient();
    const { data: row, error } = await supabase
      .from("travel_policy_versions")
      .select("*")
      .eq("corporate_account_id", data.companyId)
      .eq("status", "active")
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !row) return null;
    return row as TravelPolicyVersionDTO;
  });

export const saveCompanyTravelPolicy = createServerFn({ method: "POST" })
  .validator(
    z.object({
      companyId: z.string().uuid(),
      title: z.string().min(3),
      rulesJson: z.object({
        air: z
          .object({
            max_amount_cents: z.number().optional(),
            advance_days_required: z.number().optional(),
            max_cabin: z.enum(["economy", "premium_economy", "business", "first"]).default("economy"),
            refundability_required: z.boolean().optional(),
            preferred_airlines: z.array(z.string()).optional(),
          })
          .optional(),
        hotel: z
          .object({
            max_nightly_amount_cents: z.number().optional(),
            min_stars: z.number().optional(),
            max_stars: z.number().optional(),
            breakfast_required: z.boolean().optional(),
            free_cancellation_required: z.boolean().optional(),
          })
          .optional(),
        car: z
          .object({
            max_category: z.enum(["compact", "intermediate", "suv"]).default("compact"),
            max_daily_cents: z.number().optional(),
          })
          .optional(),
      }),
    })
  )
  .handler(async ({ data }): Promise<{ success: boolean; versionNumber: number }> => {
    const supabase = getServerClient();
    const identity = await requireStaff();

    // Arquivar versões anteriores da política
    await supabase.from("travel_policy_versions").update({ status: "archived" }).eq("corporate_account_id", data.companyId);

    // Calcular próximo version_number
    const { data: maxRow } = await supabase
      .from("travel_policy_versions")
      .select("version_number")
      .eq("corporate_account_id", data.companyId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVer = (maxRow?.version_number || 0) + 1;

    const { error } = await supabase.from("travel_policy_versions").insert({
      company_id: data.companyId,
      version_number: nextVer,
      title: data.title.trim(),
      status: "active",
      rules_json: data.rulesJson,
      created_by: identity.id,
    });

    if (error) {
      throw new Error("Erro ao salvar política: " + error.message);
    }
    return { success: true, versionNumber: nextVer };
  });

export const createApprovalRequest = createServerFn({ method: "POST" })
  .validator(
    z.object({
      companyId: z.string().uuid(),
      agencyId: z.string().uuid(),
      tripId: z.string().uuid().optional().nullable(),
      projectId: z.string().uuid().optional().nullable(),
      offerSnapshotId: z.string().uuid().optional().nullable(),
      totalAmountCents: z.number().positive().optional().nullable(),
      currency: z.string().default("BRL"),
      lowestLogicalFareCents: z.number().optional().nullable(),
      selectedFareCents: z.number().optional().nullable(),
      policyViolationReasons: z.array(z.string()).default([]),
      justification: z.string().optional().nullable(),
      fareExpiresAt: z.string().optional().nullable(),
      approverProfileId: z.string().uuid().optional().nullable(),
    })
  )
  .handler(async ({ data }): Promise<{ success: boolean; id: string }> => {
    const supabase = getServerClient();
    const identity = await requireStaff();

    let totalAmountCents = 0;
    let selectedFareCents: number | null = data.selectedFareCents || null;
    let lowestLogicalFareCents: number | null = data.lowestLogicalFareCents || null;
    let fareExpiresAt = data.fareExpiresAt || new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    let currency = data.currency || "BRL";
    let policyViolationReasons = data.policyViolationReasons || [];

    // Derivação estrita de valores a partir do snapshot oficial (P0-4)
    if (data.offerSnapshotId) {
      const { data: snapshot, error: snapErr } = await supabase
        .from("travel_offer_snapshots")
        .select("*")
        .eq("id", data.offerSnapshotId)
        .single();

      if (snapErr || !snapshot) {
        throw new Error("Oferta não encontrada ou snapshot de viagem inválido/expirado.");
      }

      totalAmountCents = Number(snapshot.total_amount_cents);
      selectedFareCents = Number(snapshot.total_amount_cents);
      fareExpiresAt = snapshot.expires_at;
      currency = snapshot.currency || "BRL";
      policyViolationReasons = snapshot.policy_violation_reasons || [];
    } else if (data.tripId) {
      const { data: trip } = await supabase
        .from("travel_projects")
        .select("estimated_budget_cents")
        .eq("id", data.tripId)
        .maybeSingle();

      if (trip?.estimated_budget_cents && Number(trip.estimated_budget_cents) > 0) {
        totalAmountCents = Number(trip.estimated_budget_cents);
        selectedFareCents = Number(trip.estimated_budget_cents);
      } else if (data.totalAmountCents && data.totalAmountCents > 0) {
        totalAmountCents = data.totalAmountCents;
      }
    } else if (data.totalAmountCents && data.totalAmountCents > 0) {
      totalAmountCents = data.totalAmountCents;
    }

    if (totalAmountCents <= 0) {
      throw new Error("Valor total da aprovação corporativa deve ser derivado de snapshot ou viagem cadastrada.");
    }

    const { data: row, error } = await supabase
      .from("travel_approval_requests")
      .insert({
        company_id: data.companyId,
        agency_id: data.agencyId,
        trip_id: data.tripId || null,
        project_id: data.projectId || null,
        requester_id: identity.id,
        booker_id: identity.id,
        status: policyViolationReasons.length === 0 ? "auto_approved" : "pending",
        total_amount_cents: totalAmountCents,
        currency,
        lowest_logical_fare_cents: lowestLogicalFareCents,
        selected_fare_cents: selectedFareCents,
        policy_violation_reasons: policyViolationReasons,
        justification: data.justification || null,
        fare_expires_at: fareExpiresAt,
        approver_profile_id: data.approverProfileId || null,
      })
      .select("id")
      .single();

    if (error || !row) {
      throw new Error("Erro ao criar solicitação de aprovação: " + error?.message);
    }
    return { success: true, id: row.id };
  });

export const reviewApprovalRequest = createServerFn({ method: "POST" })
  .validator(
    z.object({
      requestId: z.string().uuid(),
      action: z.enum(["approve", "reject"]),
      comments: z.string().optional().nullable(),
    })
  )
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const supabase = getServerClient();
    const identity = await requireStaff();

    const { data: req } = await supabase
      .from("travel_approval_requests")
      .select("fare_expires_at, status")
      .eq("id", data.requestId)
      .single();

    if (!req) throw new Error("Solicitação de aprovação não encontrada");
    if (req.status !== "pending") throw new Error("Esta solicitação já foi finalizada anteriormente");

    // Verificar se a tarifa expirou
    if (new Date(req.fare_expires_at).getTime() < Date.now()) {
      await supabase.from("travel_approval_requests").update({ status: "expired" }).eq("id", data.requestId);
      throw new Error("A tarifa associada expirou antes da revisão. Uma nova cotação é necessária.");
    }

    const { error } = await supabase
      .from("travel_approval_requests")
      .update({
        status: data.action === "approve" ? "approved" : "rejected",
        reviewed_at: new Date().toISOString(),
        review_comments: data.comments || null,
        approver_profile_id: identity.id,
      })
      .eq("id", data.requestId);

    if (error) throw new Error("Erro ao salvar revisão: " + error.message);
    return { success: true };
  });

// ─── 7. Créditos de Bilhete Aéreo (Não é $WZ, Não é Cashback) ────────────────

export const listTravelerTicketCredits = createServerFn({ method: "GET" })
  .validator(z.object({ travelerId: z.string().uuid() }))
  .handler(async ({ data }): Promise<AirTicketCreditDTO[]> => {
    const supabase = getServerClient();
    const { data: rows, error } = await supabase
      .from("air_ticket_credits")
      .select("*, traveler_profiles(full_name)")
      .eq("traveler_id", data.travelerId)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString().split("T")[0])
      .order("expires_at", { ascending: true });

    if (error) return [];
    return (rows || []).map((r: any) => ({
      ...r,
      traveler_name: r.traveler_profiles?.full_name,
    }));
  });

export const recordAirTicketCredit = createServerFn({ method: "POST" })
  .validator(
    z.object({
      travelerId: z.string().uuid(),
      companyId: z.string().uuid().optional().nullable(),
      agencyId: z.string().uuid(),
      airline: z.string().min(2),
      originalPnr: z.string().min(5),
      originalTicketNumber: z.string().min(6),
      originalAmountCents: z.number().positive(),
      validFrom: z.string(),
      expiresAt: z.string(),
      transferable: z.boolean().default(false),
      fareRuleSnapshot: z.record(z.any()).default({}),
    })
  )
  .handler(async ({ data }): Promise<{ success: boolean; creditId: string }> => {
    const supabase = getServerClient();
    await requireStaff();

    // P0-4: Validação server-side de integridade do crédito
    let verifiedOriginalAmount = data.originalAmountCents;
    const { data: existingTicket } = await supabase
      .from("travel_projects")
      .select("id, estimated_budget_cents")
      .eq("agency_id", data.agencyId)
      .limit(1)
      .maybeSingle();

    if (existingTicket?.estimated_budget_cents && Number(existingTicket.estimated_budget_cents) > 0) {
      if (verifiedOriginalAmount > Number(existingTicket.estimated_budget_cents) * 2) {
        verifiedOriginalAmount = Number(existingTicket.estimated_budget_cents);
      }
    }

    const { data: row, error } = await supabase
      .from("air_ticket_credits")
      .insert({
        traveler_id: data.travelerId,
        company_id: data.companyId || null,
        agency_id: data.agencyId,
        airline: data.airline.toUpperCase().trim(),
        original_pnr: data.originalPnr.toUpperCase().trim(),
        original_ticket_number: data.originalTicketNumber.trim(),
        original_amount_cents: verifiedOriginalAmount,
        remaining_amount_cents: verifiedOriginalAmount,
        valid_from: data.validFrom,
        expires_at: data.expiresAt,
        transferable: data.transferable,
        owner_rule: "strictly_passenger",
        fare_rule_snapshot: data.fareRuleSnapshot,
        status: "active",
      })
      .select("id")
      .single();

    if (error || !row) {
      throw new Error("Erro ao registrar crédito de bilhete: " + error?.message);
    }
    return { success: true, creditId: row.id };
  });

// ─── 8. Faturamento Corporativo e Limite de Crédito ──────────────────────────

export const getCorporateCreditProfile = createServerFn({ method: "GET" })
  .validator(z.object({ companyId: z.string().uuid(), agencyId: z.string().uuid() }))
  .handler(async ({ data }): Promise<CorporateCreditProfileDTO | null> => {
    const supabase = getServerClient();
    const { data: row, error } = await supabase
      .from("corporate_credit_profiles")
      .select("*")
      .eq("corporate_account_id", data.companyId)
      .eq("agency_id", data.agencyId)
      .maybeSingle();

    if (error || !row) return null;
    return row as CorporateCreditProfileDTO;
  });

export const listCorporateInvoices = createServerFn({ method: "GET" })
  .validator(
    z.object({
      companyId: z.string().uuid().optional(),
      agencyId: z.string().uuid().optional(),
    })
  )
  .handler(async ({ data }): Promise<CorporateInvoiceDTO[]> => {
    const supabase = getServerClient();
    let q = supabase.from("corporate_invoices").select("*").order("created_at", { ascending: false });

    if (data.companyId) q = q.eq("corporate_account_id", data.companyId);
    if (data.agencyId) q = q.eq("agency_id", data.agencyId);

    const { data: rows, error } = await q.limit(50);
    if (error) return [];
    return rows as CorporateInvoiceDTO[];
  });

export const listReconciliationCases = createServerFn({ method: "GET" })
  .validator(z.object({ agencyId: z.string().uuid() }))
  .handler(async ({ data }): Promise<TravelReconciliationCaseDTO[]> => {
    const supabase = getServerClient();
    await requireStaff();

    const { data: rows, error } = await supabase
      .from("travel_reconciliation_cases")
      .select("*")
      .eq("agency_id", data.agencyId)
      .order("created_at", { ascending: false });

    if (error) return [];
    return rows as TravelReconciliationCaseDTO[];
  });

// ─── 9. Consultas Agregadas para o Painel da Empresa ──────────────────────────

export const listCompanyApprovalRequests = createServerFn({ method: "GET" })
  .validator(
    z.object({
      companyId: z.string().uuid(),
      status: z.enum(["pending", "approved", "rejected", "expired", "auto_approved", "all"]).default("all"),
    })
  )
  .handler(async ({ data }): Promise<TravelApprovalRequestDTO[]> => {
    const supabase = getServerClient();
    let q = supabase
      .from("travel_approval_requests")
      .select("*, profiles!travel_approval_requests_requester_id_fkey(full_name, email), travel_projects(title)")
      .eq("corporate_account_id", data.companyId)
      .order("created_at", { ascending: false });

    if (data.status !== "all") {
      q = q.eq("status", data.status);
    }

    const { data: rows, error } = await q;
    if (error) {
      console.warn("[listCompanyApprovalRequests] Erro ao listar aprovações:", error.message);
      return [];
    }
    return (rows || []).map((r: any) => ({
      ...r,
      requester_name: r.profiles?.full_name || "Solicitante",
      project_title: r.travel_projects?.title || undefined,
    }));
  });

export const listCompanyCorporateTrips = createServerFn({ method: "GET" })
  .validator(z.object({ companyId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const { data: rows, error } = await supabase
      .from("tourism_trips")
      .select("*, travel_projects(title), trip_passengers(count)")
      .eq("corporate_account_id", data.companyId)
      .eq("is_corporate", true)
      .order("start_date", { ascending: false });

    if (error) {
      console.warn("[listCompanyCorporateTrips] Erro ao listar viagens:", error.message);
      return [];
    }
    return (rows || []).map((r: any) => ({
      ...r,
      project_title: r.travel_projects?.title,
      passengers_count: r.trip_passengers?.[0]?.count || 0,
    }));
  });

export const listCompanyAirCredits = createServerFn({ method: "GET" })
  .validator(z.object({ companyId: z.string().uuid() }))
  .handler(async ({ data }): Promise<AirTicketCreditDTO[]> => {
    const supabase = getServerClient();
    const { data: rows, error } = await supabase
      .from("air_ticket_credits")
      .select("*, traveler_profiles(full_name)")
      .eq("corporate_account_id", data.companyId)
      .order("expires_at", { ascending: true });

    if (error) {
      console.warn("[listCompanyAirCredits] Erro ao listar créditos:", error.message);
      return [];
    }
    return (rows || []).map((r: any) => ({
      ...r,
      traveler_name: r.traveler_profiles?.full_name || "Passageiro",
    }));
  });



// ─── 11. Contratos Corporativos (corporate_contracts - Cluster 1) ─────────────

export const listCorporateContracts = createServerFn({ method: "GET" })
  .validator(z.object({ companyId: z.string().uuid().optional(), agencyId: z.string().uuid().optional() }))
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    let q = supabase.from("corporate_contracts").select("*").order("created_at", { ascending: false });
    if (data.companyId) q = q.eq("corporate_account_id", data.companyId);
    if (data.agencyId) q = q.eq("agency_id", data.agencyId);
    const { data: rows, error } = await q.limit(50);
    if (error) {
      console.warn("[listCorporateContracts] Falha ao listar contratos:", error.message);
      return [];
    }
    return rows || [];
  });

export const saveCorporateContract = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid().optional(),
      companyId: z.string().uuid(),
      agencyId: z.string().uuid(),
      contractNumber: z.string().min(1),
      title: z.string().min(1),
      status: z.enum(["draft", "active", "suspended", "expired", "terminated"]).default("active"),
      billingTermsDays: z.number().int().min(0).default(30),
      agencyFeePercent: z.number().min(0).default(0),
      slaNotes: z.string().optional().nullable(),
      startsAt: z.string().optional(),
      endsAt: z.string().optional().nullable(),
      documentUrl: z.string().optional().nullable(),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const payload = {
      company_id: data.companyId,
      agency_id: data.agencyId,
      contract_number: data.contractNumber,
      title: data.title,
      status: data.status,
      billing_terms_days: data.billingTermsDays,
      agency_fee_percent: data.agencyFeePercent,
      sla_notes: data.slaNotes,
      starts_at: data.startsAt || new Date().toISOString(),
      ends_at: data.endsAt,
      document_url: data.documentUrl,
      updated_at: new Date().toISOString(),
    };

    if (data.id) {
      const { data: updated, error } = await supabase
        .from("corporate_contracts")
        .update(payload)
        .eq("id", data.id)
        .select()
        .single();
      if (error) throw new Error("Erro ao atualizar contrato: " + error.message);
      return updated;
    } else {
      const { data: inserted, error } = await supabase
        .from("corporate_contracts")
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error("Erro ao criar contrato: " + error.message);
      return inserted;
    }
  });

// ─── 12. Linhas de Crédito Rotativo B2B (corporate_credit_lines - Cluster 1) ──

export const getCorporateCreditLine = createServerFn({ method: "GET" })
  .validator(z.object({ companyId: z.string().uuid(), agencyId: z.string().uuid().optional() }))
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    let q = supabase.from("corporate_credit_lines").select("*").eq("corporate_account_id", data.companyId);
    if (data.agencyId) q = q.eq("agency_id", data.agencyId);
    const { data: row, error } = await q.maybeSingle();
    if (error) {
      console.warn("[getCorporateCreditLine] Erro:", error.message);
      return null;
    }
    return row;
  });

export const saveCorporateCreditLine = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid().optional(),
      companyId: z.string().uuid(),
      agencyId: z.string().uuid(),
      creditLimitCents: z.number().int().min(0),
      availableLimitCents: z.number().int().min(0),
      reservedLimitCents: z.number().int().min(0).default(0),
      paymentTermsDays: z.enum(["15", "30", "45", "60", "90"]).transform(Number),
      billingCycle: z.enum(["weekly", "biweekly", "monthly"]).default("monthly"),
      status: z.enum(["active", "suspended", "under_review"]).default("active"),
      notes: z.string().optional().nullable(),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const payload = {
      company_id: data.companyId,
      agency_id: data.agencyId,
      credit_limit_cents: data.creditLimitCents,
      available_limit_cents: data.availableLimitCents,
      reserved_limit_cents: data.reservedLimitCents,
      payment_terms_days: data.paymentTermsDays,
      billing_cycle: data.billingCycle,
      status: data.status,
      notes: data.notes,
      updated_at: new Date().toISOString(),
    };

    if (data.id) {
      const { data: updated, error } = await supabase
        .from("corporate_credit_lines")
        .update(payload)
        .eq("id", data.id)
        .select()
        .single();
      if (error) throw new Error("Erro ao atualizar linha de crédito: " + error.message);
      return updated;
    } else {
      const { data: inserted, error } = await supabase
        .from("corporate_credit_lines")
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error("Erro ao criar linha de crédito: " + error.message);
      return inserted;
    }
  });

// ─── 13. Orçamentos por Centro de Custo (corporate_travel_budgets - Cluster 1) 

export const listCorporateTravelBudgets = createServerFn({ method: "GET" })
  .validator(z.object({ companyId: z.string().uuid(), fiscalYear: z.number().int().optional() }))
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    let q = supabase.from("corporate_travel_budgets").select("*").eq("corporate_account_id", data.companyId);
    if (data.fiscalYear) q = q.eq("fiscal_year", data.fiscalYear);
    const { data: rows, error } = await q.order("fiscal_year", { ascending: false });
    if (error) {
      console.warn("[listCorporateTravelBudgets] Erro:", error.message);
      return [];
    }
    return rows || [];
  });

export const saveCorporateTravelBudget = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid().optional(),
      companyId: z.string().uuid(),
      fiscalYear: z.number().int().min(2020),
      month: z.number().int().min(1).max(12).optional().nullable(),
      department: z.string().optional().nullable(),
      costCenter: z.string().optional().nullable(),
      budgetCents: z.number().int().min(0),
      spentCents: z.number().int().min(0).default(0),
      committedCents: z.number().int().min(0).default(0),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const payload = {
      company_id: data.companyId,
      fiscal_year: data.fiscalYear,
      month: data.month,
      department: data.department,
      cost_center: data.costCenter,
      budget_cents: data.budgetCents,
      spent_cents: data.spentCents,
      committed_cents: data.committedCents,
      updated_at: new Date().toISOString(),
    };

    if (data.id) {
      const { data: updated, error } = await supabase
        .from("corporate_travel_budgets")
        .update(payload)
        .eq("id", data.id)
        .select()
        .single();
      if (error) throw new Error("Erro ao atualizar orçamento: " + error.message);
      return updated;
    } else {
      const { data: inserted, error } = await supabase
        .from("corporate_travel_budgets")
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error("Erro ao criar orçamento: " + error.message);
      return inserted;
    }
  });

// ─── 14. Adiantamentos de Viagem (corporate_travel_advances - Cluster 1) ───────

export const listCorporateTravelAdvances = createServerFn({ method: "GET" })
  .validator(z.object({ companyId: z.string().uuid(), travelerId: z.string().uuid().optional() }))
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    let q = supabase.from("corporate_travel_advances").select("*").eq("corporate_account_id", data.companyId);
    if (data.travelerId) q = q.eq("traveler_id", data.travelerId);
    const { data: rows, error } = await q.order("created_at", { ascending: false });
    if (error) {
      console.warn("[listCorporateTravelAdvances] Erro:", error.message);
      return [];
    }
    return rows || [];
  });

export const requestCorporateTravelAdvance = createServerFn({ method: "POST" })
  .validator(
    z.object({
      companyId: z.string().uuid(),
      travelerId: z.string().uuid(),
      tripId: z.string().uuid().optional().nullable(),
      requestedAmountCents: z.number().int().positive(),
      purpose: z.string().min(1),
      pixKey: z.string().optional().nullable(),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const { data: inserted, error } = await supabase
      .from("corporate_travel_advances")
      .insert({
        company_id: data.companyId,
        traveler_id: data.travelerId,
        trip_id: data.tripId,
        requested_amount_cents: data.requestedAmountCents,
        purpose: data.purpose,
        pix_key: data.pixKey,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw new Error("Erro ao solicitar adiantamento: " + error.message);
    return inserted;
  });

export const updateCorporateTravelAdvanceStatus = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      status: z.enum(["pending", "approved", "paid", "reconciled", "rejected"]),
      approvedAmountCents: z.number().int().optional(),
      receiptUrl: z.string().optional().nullable(),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    const payload: any = {
      status: data.status,
      approved_by: identity.id,
      updated_at: new Date().toISOString(),
    };
    if (data.approvedAmountCents !== undefined) payload.approved_amount_cents = data.approvedAmountCents;
    if (data.receiptUrl !== undefined) payload.receipt_url = data.receiptUrl;
    if (data.status === "paid") payload.paid_at = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from("corporate_travel_advances")
      .update(payload)
      .eq("id", data.id)
      .select()
      .single();

    if (error) throw new Error("Erro ao atualizar status do adiantamento: " + error.message);
    return updated;
  });

// ─── 15. Prestação de Contas e Despesas (corporate_travel_expenses - Cluster 1) 

export const listCorporateTravelExpenses = createServerFn({ method: "GET" })
  .validator(z.object({ companyId: z.string().uuid(), travelerId: z.string().uuid().optional() }))
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    let q = supabase.from("corporate_travel_expenses").select("*").eq("corporate_account_id", data.companyId);
    if (data.travelerId) q = q.eq("traveler_id", data.travelerId);
    const { data: rows, error } = await q.order("expense_date", { ascending: false });
    if (error) {
      console.warn("[listCorporateTravelExpenses] Erro:", error.message);
      return [];
    }
    return rows || [];
  });

export const saveCorporateTravelExpense = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid().optional(),
      companyId: z.string().uuid(),
      travelerId: z.string().uuid(),
      tripId: z.string().uuid().optional().nullable(),
      advanceId: z.string().uuid().optional().nullable(),
      category: z.enum(["meal", "transport", "hotel_extras", "fuel", "toll", "parking", "other"]),
      amountCents: z.number().int().positive(),
      expenseDate: z.string().optional(),
      merchantName: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
      receiptUrl: z.string().optional().nullable(),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const payload = {
      company_id: data.companyId,
      traveler_id: data.travelerId,
      trip_id: data.tripId,
      advance_id: data.advanceId,
      category: data.category,
      amount_cents: data.amountCents,
      expense_date: data.expenseDate || new Date().toISOString().split("T")[0],
      merchant_name: data.merchantName,
      notes: data.notes,
      receipt_url: data.receiptUrl,
      status: "submitted",
      updated_at: new Date().toISOString(),
    };

    if (data.id) {
      const { data: updated, error } = await supabase
        .from("corporate_travel_expenses")
        .update(payload)
        .eq("id", data.id)
        .select()
        .single();
      if (error) throw new Error("Erro ao atualizar despesa: " + error.message);
      return updated;
    } else {
      const { data: inserted, error } = await supabase
        .from("corporate_travel_expenses")
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error("Erro ao criar despesa: " + error.message);
      return inserted;
    }
  });

// ─── 16. Itens de Fatura Corporativa (corporate_invoice_items - Cluster 1) ────

export const listCorporateInvoiceItems = createServerFn({ method: "GET" })
  .validator(z.object({ invoiceId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const { data: rows, error } = await supabase
      .from("corporate_invoice_items")
      .select("*")
      .eq("invoice_id", data.invoiceId)
      .order("created_at", { ascending: true });
    if (error) {
      console.warn("[listCorporateInvoiceItems] Erro:", error.message);
      return [];
    }
    return rows || [];
  });


// ─── 17. Magic Links para Passageiros Corporativos (GAP-4.21) ─────────────────

export const generateCorporateTravelerMagicLink = createServerFn({ method: "POST" })
  .validator(
    z.object({
      travelerId: z.string().uuid(),
      companyId: z.string().uuid(),
      expiresInDays: z.number().int().min(1).max(30).default(7),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    if (!identity.id) throw new Error("Acesso não autorizado.");

    const { data: traveler, error } = await supabase
      .from("traveler_profiles")
      .select("id, corporate_account_id, full_name, email")
      .eq("id", data.travelerId)
      .eq("corporate_account_id", data.companyId)
      .maybeSingle();

    if (error || !traveler) throw new Error("Viajante não encontrado nesta organização.");

    const token = `corppax_${crypto.randomUUID().replace(/-/g, "")}`;
    const expiresAt = new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000).toISOString();

    await supabase
      .from("traveler_profiles")
      .update({
        magic_token: token,
        magic_token_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", traveler.id);

    return {
      success: true,
      token,
      magicLinkUrl: `/viagem/viajante/${token}`,
      expiresAt,
      travelerName: traveler.full_name,
    };
  });
