import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { logAuditAction } from "./audit.functions";

/**
 * Returns a list of employees for the store along with their calculated financial balance.
 * Balance is calculated dynamically: Total Unpaid Commissions + Adhoc Credits - Advances/Debits.
 */
export const listEmployeesBalance = createServerFn({ method: "GET" }).handler(async () => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "finance"]);

 // 1. Fetch all store staff profiles via workspace_members
 const { data: storeStaff, error: staffErr } = await supabase
 .from("workspace_members")
 .select("profile_id, role, profiles(full_name)")
 .eq("store_id", identity.store_id);

 if (staffErr || !storeStaff) return [];

 // 2. Fetch all financial records for the store
 const { data: records, error: recordsErr } = await supabase
 .from("employee_financial_records")
 .select("*")
 .eq("store_id", identity.store_id)
 .order("created_at", { ascending: false });

 if (recordsErr) return [];

 // 3. Calculate dynamic balance per employee
 return storeStaff.map((staff) => {
 const employeeRecords = records.filter((r) => r.employee_id === staff.profile_id);

 let totalCredits = 0;
 let totalDebits = 0;

 employeeRecords.forEach((record) => {
 if (record.amount_cents > 0) {
 totalCredits += record.amount_cents;
 } else {
 totalDebits += Math.abs(record.amount_cents);
 }
 });

 return {
 id: staff.profile_id,
 name: (staff.profiles as any)?.full_name || "Colaborador",
 role: staff.role,
 balanceCents: totalCredits - totalDebits,
 recentRecords: employeeRecords.slice(0, 5),
 };
 });
});

/**
 * Register a financial event for an employee (e.g., Cash Advance, Manual Bonus)
 */
export const registerFinancialEvent = createServerFn({ method: "POST" })
 .validator(
 z.object({
 employeeId: z.string().uuid(),
 amountCents: z.number(),
 type: z.enum(["commission", "advance", "adjustment", "salary"]),
 description: z.string().min(3),
 }),
 )
 .handler(async ({ data: { employeeId, amountCents, type, description } }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "finance"]);

 // If it's an advance (vale), it should be a negative amount
 let finalAmount = amountCents;
 if (type === "advance" && finalAmount > 0) {
 finalAmount = -finalAmount;
 }

 const { data: record, error } = await supabase
 .from("employee_financial_records")
 .insert({
 store_id: identity.store_id,
 employee_id: employeeId,
 authorized_by: identity.id,
 amount_cents: finalAmount,
 type,
 description,
 })
 .select("id")
 .single();

 if (!error && record) {
   // Se for vale/adiantamento (advance) ou pagamento de salário/comissão em dinheiro, debita do caixa aberto e registra despesa
   if (type === "advance" && finalAmount < 0) {
     try {
       // 1. Débito no Caixa Ativo (se houver turno aberto)
       const { data: openRegister } = await supabase
         .from("cash_registers")
         .select("id")
         .eq("store_id", identity.store_id)
         .eq("status", "open")
         .order("opened_at", { ascending: false })
         .limit(1)
         .maybeSingle();

       if (openRegister) {
         await supabase.from("cash_register_entries").insert({
           cash_register_id: openRegister.id,
           order_id: null,
           amount_cents: finalAmount,
           entry_type: "cash",
           payment_method: "cash",
           notes: `Vale / Adiantamento: ${description}`,
           created_by: identity.id,
           channel_source: "hr_payroll",
           marketplace_fee_cents: 0,
           net_payout_cents: finalAmount,
           external_reference_id: record.id,
         });
       }

       // 2. Lançamento no DRE / Transações Financeiras da Loja
       await supabase.from("financial_transactions").insert({
         store_id: identity.store_id,
         type: "expense_other",
         amount_cents: finalAmount,
         description: `Vale / Adiantamento de Colaborador: ${description}`,
         category: "payroll",
         reference_date: new Date().toISOString().slice(0, 10),
         created_by: identity.id,
       });
     } catch (syncErr) {
       console.warn("[hr.functions] Aviso na sincronização de vale com caixa/DRE:", syncErr);
     }
   }
 }

 if (error) {
 throw new Error("Erro ao lançar evento financeiro: " + error.message);
 }

 // Immutable audit log
 await logAuditAction(
 identity,
 "FINANCIAL_EVENT_REGISTERED",
 "employee_financial_records",
 record.id,
 {
 employeeId,
 amountCents: finalAmount,
 type,
 description,
 },
 );

 return { status: "success", recordId: record.id };
 });

// ---------------------------------------------------------------------------
// 1. PONTO ELETRÔNICO (TIME TRACKING & GEOLOCATION)
// ---------------------------------------------------------------------------
export const recordTimeClock = createServerFn({ method: "POST" })
 .validator(
 z.object({
 employeeId: z.string().uuid(),
 entryType: z.enum([
 "clock_in",
 "lunch_out",
 "lunch_in",
 "clock_out",
 "break_out",
 "break_in",
 "overtime_in",
 "overtime_out",
 ]),
 source: z.enum(["web", "mobile_pwa", "biometric_terminal", "supervisor_manual"]).default("web"),
 geolocation: z.object({
 latitude: z.number().optional(),
 longitude: z.number().optional(),
 accuracy: z.number().optional(),
 address: z.string().optional(),
 }).default({}),
 photoUrl: z.string().optional(),
 ipAddress: z.string().optional(),
 userAgent: z.string().optional(),
 }),
 )
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();

 // Validar que o colaborador pertence à loja do workspace
 const { data: employee, error: empErr } = await supabase
 .from("employees")
 .select("id, store_id, full_name")
 .eq("id", data.employeeId)
 .eq("store_id", identity.store_id)
 .single();

 if (empErr || !employee) {
 throw new Error("Colaborador não encontrado ou não pertence a esta empresa.");
 }

 const { data: entry, error } = await supabase
 .from("employee_time_entries")
 .insert({
 store_id: identity.store_id,
 employee_id: data.employeeId,
 entry_type: data.entryType,
 source: data.source,
 geolocation: data.geolocation,
 photo_url: data.photoUrl,
 ip_address: data.ipAddress,
 user_agent: data.userAgent,
 status: "verified",
 })
 .select()
 .single();

 if (error) {
 throw new Error("Erro ao registrar batida de ponto: " + error.message);
 }

 return { status: "success", entry };
 });

export const listEmployeeTimeEntries = createServerFn({ method: "GET" })
 .validator(
 z.object({
 employeeId: z.string().uuid().optional(),
 startDate: z.string().optional(),
 endDate: z.string().optional(),
 }),
 )
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();

 let query = supabase
 .from("employee_time_entries")
 .select("*, employee:employees(id, full_name, job_title)")
 .eq("store_id", identity.store_id)
 .order("recorded_at", { ascending: false });

 if (data?.employeeId) {
 query = query.eq("employee_id", data.employeeId);
 }
 if (data?.startDate) {
 query = query.gte("recorded_at", data.startDate);
 }
 if (data?.endDate) {
 query = query.lte("recorded_at", data.endDate);
 }

 const { data: entries, error } = await query;
 if (error) {
 throw new Error("Erro ao listar pontos: " + error.message);
 }

 return entries || [];
 });

export const adjustTimeEntry = createServerFn({ method: "POST" })
 .validator(
 z.object({
 entryId: z.string().uuid(),
 reason: z.string().min(5, "Justificativa obrigatória"),
 newRecordedAt: z.string().datetime().optional(),
 newEntryType: z.enum([
 "clock_in",
 "lunch_out",
 "lunch_in",
 "clock_out",
 "break_out",
 "break_in",
 "overtime_in",
 "overtime_out",
 ]).optional(),
 }),
 )
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager"]);

 const updates: Record<string, unknown> = {
 status: "adjusted",
 adjustment_reason: data.reason,
 adjusted_by: identity.id,
 adjusted_at: new Date().toISOString(),
 };

 if (data.newRecordedAt) updates.recorded_at = data.newRecordedAt;
 if (data.newEntryType) updates.entry_type = data.newEntryType;

 const { data: updated, error } = await supabase
 .from("employee_time_entries")
 .update(updates)
 .eq("id", data.entryId)
 .eq("store_id", identity.store_id)
 .select()
 .single();

 if (error) {
 throw new Error("Erro ao ajustar ponto: " + error.message);
 }

 return { status: "success", entry: updated };
 });

// ---------------------------------------------------------------------------
// 2. HOLERITES & FOLHA DE PAGAMENTO (PAYSLIPS)
// ---------------------------------------------------------------------------
export const issuePayslip = createServerFn({ method: "POST" })
 .validator(
 z.object({
 employeeId: z.string().uuid(),
 referencePeriod: z.string().regex(/^[0-9]{4}-[0-9]{2}$/, "Formato deve ser YYYY-MM"),
 grossSalaryCents: z.number().int().min(0),
 inssDiscountCents: z.number().int().min(0).default(0),
 irrfDiscountCents: z.number().int().min(0).default(0),
 fgtsProvisionCents: z.number().int().min(0).default(0),
 transportVoucherDiscountCents: z.number().int().min(0).default(0),
 mealVoucherDiscountCents: z.number().int().min(0).default(0),
 otherDiscountsCents: z.number().int().min(0).default(0),
 bonusAdditionsCents: z.number().int().min(0).default(0),
 overtimePayCents: z.number().int().min(0).default(0),
 salaryBreakdown: z.array(z.object({
 code: z.string(),
 description: z.string(),
 type: z.enum(["earning", "deduction", "neutral"]),
 amount_cents: z.number().int(),
 })).default([]),
 pdfDocumentUrl: z.string().optional(),
 paymentDate: z.string().optional(),
 }),
 )
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "finance"]);

 const totalEarnings = data.grossSalaryCents + data.bonusAdditionsCents + data.overtimePayCents;
 const totalDeductions = data.inssDiscountCents + data.irrfDiscountCents + data.transportVoucherDiscountCents + data.mealVoucherDiscountCents + data.otherDiscountsCents;
 const netSalaryCents = Math.max(0, totalEarnings - totalDeductions);

 const { data: payslip, error } = await supabase
 .from("employee_payslips")
 .upsert({
 store_id: identity.store_id,
 employee_id: data.employeeId,
 reference_period: data.referencePeriod,
 gross_salary_cents: data.grossSalaryCents,
 net_salary_cents: netSalaryCents,
 inss_discount_cents: data.inssDiscountCents,
 irrf_discount_cents: data.irrfDiscountCents,
 fgts_provision_cents: data.fgtsProvisionCents,
 transport_voucher_discount_cents: data.transportVoucherDiscountCents,
 meal_voucher_discount_cents: data.mealVoucherDiscountCents,
 other_discounts_cents: data.otherDiscountsCents,
 bonus_additions_cents: data.bonusAdditionsCents,
 overtime_pay_cents: data.overtimePayCents,
 salary_breakdown: data.salaryBreakdown,
 pdf_document_url: data.pdfDocumentUrl,
 payment_date: data.paymentDate,
 status: "issued",
 }, { onConflict: "employee_id, reference_period" })
 .select()
 .single();

 if (error) {
 throw new Error("Erro ao emitir holerite: " + error.message);
 }

 return { status: "success", payslip };
 });

export const listEmployeePayslips = createServerFn({ method: "GET" })
 .validator(
 z.object({
 employeeId: z.string().uuid().optional(),
 period: z.string().optional(),
 }),
 )
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();

 let query = supabase
 .from("employee_payslips")
 .select("*, employee:employees(id, full_name, job_title)")
 .eq("store_id", identity.store_id)
 .order("reference_period", { ascending: false });

 if (data?.employeeId) {
 query = query.eq("employee_id", data.employeeId);
 }
 if (data?.period) {
 query = query.eq("reference_period", data.period);
 }

 const { data: payslips, error } = await query;
 if (error) {
 throw new Error("Erro ao listar holerites: " + error.message);
 }

 return payslips || [];
 });

export const acknowledgePayslip = createServerFn({ method: "POST" })
 .validator(
 z.object({
 payslipId: z.string().uuid(),
 acknowledgedIp: z.string().optional(),
 }),
 )
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();

 const { data: payslip, error } = await supabase
 .from("employee_payslips")
 .update({
 status: "acknowledged",
 acknowledged_at: new Date().toISOString(),
 acknowledged_ip: data.acknowledgedIp || "0.0.0.0",
 })
 .eq("id", data.payslipId)
 .eq("store_id", identity.store_id)
 .select()
 .single();

 if (error) {
 throw new Error("Erro ao confirmar recebimento de holerite: " + error.message);
 }

 return { status: "success", payslip };
 });

// ---------------------------------------------------------------------------
// 3. SOLICITAÇÕES DO COLABORADOR (REQUESTS & VALES)
// ---------------------------------------------------------------------------
export const createEmployeeRequest = createServerFn({ method: "POST" })
 .validator(
 z.object({
 employeeId: z.string().uuid(),
 requestType: z.enum([
 "salary_advance",
 "leave_absence",
 "vacation",
 "time_adjustment",
 "reimbursement",
 "document_copy",
 "other",
 ]),
 title: z.string().min(2),
 description: z.string().min(5),
 amountCents: z.number().int().min(0).optional(),
 startDate: z.string().optional(),
 endDate: z.string().optional(),
 attachmentUrls: z.array(z.string()).default([]),
 }),
 )
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();

 const { data: request, error } = await supabase
 .from("employee_requests")
 .insert({
 store_id: identity.store_id,
 employee_id: data.employeeId,
 request_type: data.requestType,
 title: data.title,
 description: data.description,
 amount_cents: data.amountCents,
 start_date: data.startDate,
 end_date: data.endDate,
 attachment_urls: data.attachmentUrls,
 status: "pending",
 })
 .select()
 .single();

 if (error) {
 throw new Error("Erro ao criar solicitação: " + error.message);
 }

 return { status: "success", request };
 });

export const reviewEmployeeRequest = createServerFn({ method: "POST" })
 .validator(
 z.object({
 requestId: z.string().uuid(),
 status: z.enum(["approved", "rejected", "under_review"]),
 reviewerNotes: z.string().optional(),
 }),
 )
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "finance"]);

 const { data: reviewed, error } = await supabase
 .from("employee_requests")
 .update({
 status: data.status,
 reviewer_id: identity.id,
 reviewer_notes: data.reviewerNotes,
 reviewed_at: new Date().toISOString(),
 })
 .eq("id", data.requestId)
 .eq("store_id", identity.store_id)
 .select()
 .single();

 if (error) {
 throw new Error("Erro ao revisar solicitação: " + error.message);
 }

 return { status: "success", request: reviewed };
 });

export const registerMedicalCertificate = createServerFn({ method: "POST" })
  .validator(
    z.object({
      employeeId: z.string().uuid(),
      startDate: z.string(),
      endDate: z.string(),
      daysCount: z.number().int().min(1).default(1),
      cidCode: z.string().optional(),
      doctorCrm: z.string().optional(),
      doctorName: z.string().optional(),
      clinicName: z.string().optional(),
      description: z.string().min(3),
      attachmentUrl: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "finance"]);

    const { data: request, error } = await supabase
      .from("employee_requests")
      .insert({
        store_id: identity.store_id,
        employee_id: data.employeeId,
        request_type: "leave_absence",
        title: `Atestado Médico (${data.daysCount} dias) - CID: ${data.cidCode || "Não Informado"}`,
        description: data.description,
        start_date: data.startDate,
        end_date: data.endDate,
        attachment_urls: data.attachmentUrl ? [data.attachmentUrl] : [],
        status: "approved",
        reviewer_id: identity.id,
        reviewer_notes: `Atestado registrado e abonado pelo RH em ${new Date().toLocaleDateString("pt-BR")}. Médico: ${data.doctorName || "N/I"} (CRM ${data.doctorCrm || "N/I"}).`,
        reviewed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error("Erro ao registrar atestado médico: " + error.message);
    }

    return { status: "success", request };
  });

// ---------------------------------------------------------------------------
// 4. AUTENTICAÇÃO DE TERMINAL COM PIN
// ---------------------------------------------------------------------------
export const authenticateEmployeePin = createServerFn({ method: "POST" })
 .validator(
 z.object({
 employeeId: z.string().uuid(),
 pin: z.string().min(4).max(8),
 terminalDeviceId: z.string(),
 }),
 )
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();

 // Buscar PIN do colaborador
 const { data: pinRecord, error } = await supabase
 .from("employee_pins")
 .select("*")
 .eq("employee_id", data.employeeId)
 .eq("store_id", identity.store_id)
 .single();

 if (error || !pinRecord || !pinRecord.is_active) {
 throw new Error("PIN não cadastrado ou inativo.");
 }

 // Verificar bloqueio
 if (pinRecord.locked_until && new Date(pinRecord.locked_until) > new Date()) {
 throw new Error("Terminal bloqueado temporariamente por excesso de tentativas incorretas.");
 }

 // Validação de hash (simulação de crypto hash salt)
 const crypto = await import("crypto");
 const testHash = crypto.createHash("sha256").update(data.pin + pinRecord.salt).digest("hex");

 if (testHash !== pinRecord.pin_hash) {
 const failed = pinRecord.failed_attempts + 1;
 const updates: Record<string, unknown> = { failed_attempts: failed };
 if (failed >= 5) {
 updates.locked_until = new Date(Date.now() + 15 * 60000).toISOString(); // 15 min lock
 }
 await supabase.from("employee_pins").update(updates).eq("id", pinRecord.id);

 // Log de falha
 await supabase.from("employee_pin_audit_logs").insert({
 store_id: identity.store_id,
 employee_id: data.employeeId,
 attempt_type: "auth_failed",
 terminal_device_id: data.terminalDeviceId,
 details: { attempts: failed },
 });

 throw new Error("PIN incorreto.");
 }

 // Sucesso: resetar falhas e criar sessão de contexto
 await supabase.from("employee_pins").update({
 failed_attempts: 0,
 locked_until: null,
 last_used_at: new Date().toISOString(),
 }).eq("id", pinRecord.id);

 const sessionToken = "PIN_SESS_" + crypto.randomBytes(24).toString("hex");
 const { data: session } = await supabase.from("employee_context_sessions").insert({
 store_id: identity.store_id,
 employee_id: data.employeeId,
 terminal_device_id: data.terminalDeviceId,
 session_token: sessionToken,
 expires_at: new Date(Date.now() + 8 * 3600000).toISOString(), // 8h
 }).select().single();

 await supabase.from("employee_pin_audit_logs").insert({
 store_id: identity.store_id,
 employee_id: data.employeeId,
 attempt_type: "auth_success",
 terminal_device_id: data.terminalDeviceId,
 details: { sessionId: session?.id },
 });

 return { status: "success", sessionToken };
 });

// ---------------------------------------------------------------------------
// 5. RESOLUÇÃO DINÂMICA DE COLABORADOR / EMPREGADO LOGADO
// ---------------------------------------------------------------------------
export const getMyEmployeeRecord = createServerFn({ method: "GET" }).handler(async () => {
  const identity = await getServerIdentity();
  if (!identity?.id) return null;

  const supabase = getServerClient();
  const { data: employee } = await supabase
    .from("employees")
    .select("id, store_id, full_name, job_title, department, admission_date, stores(id, name, logo_url)")
    .or(`profile_id.eq.${identity.id},email.eq.${identity.email || ""}`)
    .order("created_at", { ascending: false })
    .maybeSingle();

  if (employee) {
    return employee;
  }

  // Fallback para membro de equipe de workspace
  const { data: member } = await supabase
    .from("workspace_members")
    .select("profile_id, role, store_id, stores(id, name, logo_url)")
    .eq("profile_id", identity.id)
    .maybeSingle();

  if (member) {
    return {
      id: member.profile_id,
      store_id: member.store_id,
      full_name: identity.fullName || "Colaborador",
      job_title: member.role || "Membro de Equipe",
      department: "Operações",
      stores: (member as any)?.stores || null,
    };
  }

  return null;
});

// ---------------------------------------------------------------------------
// 6. DOCUMENTOS CORPORATIVOS, MANUAIS & POLÍTICAS
// ---------------------------------------------------------------------------
export interface CompanyDocumentDTO {
  id: string;
  store_id: string;
  title: string;
  description: string | null;
  category: "politica" | "manual" | "procedimento" | "formulario" | "geral";
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  is_required_reading: boolean;
  version: string;
  created_at: string;
  has_read?: boolean;
}

export const listCompanyDocuments = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        storeId: z.string().uuid().optional(),
        category: z.enum(["politica", "manual", "procedimento", "formulario", "geral"]).optional(),
      })
      .optional(),
  )
  .handler(async ({ data }): Promise<CompanyDocumentDTO[]> => {
    const identity = await getServerIdentity().catch(() => null);
    const db = getServerClient();

    const targetStoreId = data?.storeId || identity?.store_id;

    try {
      let query = db
        .from("company_documents")
        .select("*, company_document_reads(id, employee_id)")
        .order("created_at", { ascending: false });

      if (targetStoreId) {
        query = query.eq("store_id", targetStoreId);
      }
      if (data?.category) {
        query = query.eq("category", data.category);
      }

      const { data: rows, error } = await query;
      if (error || !rows) return [];

      return rows.map((r: any) => ({
        id: r.id,
        store_id: r.store_id,
        title: r.title,
        description: r.description,
        category: r.category,
        file_url: r.file_url,
        file_name: r.file_name,
        file_type: r.file_type,
        file_size: r.file_size,
        is_required_reading: r.is_required_reading,
        version: r.version,
        created_at: r.created_at,
        has_read: (r.company_document_reads || []).some(
          (read: any) => read.employee_id === identity?.id,
        ),
      }));
    } catch {
      return [];
    }
  });

export const acknowledgeCompanyDocumentRead = createServerFn({ method: "POST" })
  .validator(
    z.object({
      documentId: z.string().uuid(),
      employeeId: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const db = getServerClient();
    const { error } = await db
      .from("company_document_reads")
      .upsert(
        {
          document_id: data.documentId,
          employee_id: data.employeeId,
          read_at: new Date().toISOString(),
        },
        { onConflict: "document_id,employee_id" },
      );

    if (error) {
      throw new Error(`Erro ao confirmar leitura: ${error.message}`);
    }

    return { success: true };
  });

export const getEmployeeFinancialStatement = createServerFn({ method: "GET" })
  .validator(z.object({ employeeId: z.string().uuid() }))
  .handler(async ({ data: { employeeId } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "finance"]);

    // Busca perfil do colaborador
    const { data: member, error: memberErr } = await supabase
      .from("workspace_members")
      .select("profile_id, role, profiles(id, full_name, email, avatar_url)")
      .eq("store_id", identity.store_id)
      .eq("profile_id", employeeId)
      .single();

    if (memberErr || !member) {
      throw new Error("Colaborador não encontrado nesta loja.");
    }

    // Busca histórico financeiro
    const { data: records, error: recordsErr } = await supabase
      .from("employee_financial_records")
      .select("*")
      .eq("store_id", identity.store_id)
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false });

    if (recordsErr) {
      throw new Error("Erro ao buscar extrato do colaborador: " + recordsErr.message);
    }

    let totalCredits = 0;
    let totalDebits = 0;

    (records || []).forEach((r) => {
      if (r.amount_cents > 0) {
        totalCredits += r.amount_cents;
      } else {
        totalDebits += Math.abs(r.amount_cents);
      }
    });

    return {
      employee: {
        id: member.profile_id,
        name: (member.profiles as any)?.full_name || "Colaborador",
        email: (member.profiles as any)?.email || "",
        avatar_url: (member.profiles as any)?.avatar_url || null,
        role: member.role,
      },
      summary: {
        totalCreditsCents: totalCredits,
        totalDebitsCents: totalDebits,
        netBalanceCents: totalCredits - totalDebits,
      },
      records: records || [],
    };
  });

// ---------------------------------------------------------------------------
// 8. AUDITORIA DE PIN GERENCIAL E AUTORIZAÇÕES (GAP-239)
// ---------------------------------------------------------------------------
export const listEmployeePinAuditLogs = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        limit: z.number().int().min(1).max(100).default(50),
      })
      .default({ limit: 50 })
  )
  .handler(async ({ data: { limit } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const { data: logs, error } = await supabase
      .from("employee_pin_audit_logs")
      .select("id, employee_id, attempt_type, terminal_device_id, details, created_at, profiles:employee_id(full_name, email)")
      .eq("store_id", identity.store_id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.warn("[hr.functions] listEmployeePinAuditLogs notice:", error.message);
      return [];
    }

    return (logs || []).map((l: any) => ({
      id: l.id,
      employeeId: l.employee_id,
      employeeName: l.profiles?.full_name || "Colaborador",
      attemptType: l.attempt_type,
      terminalDeviceId: l.terminal_device_id,
      details: l.details,
      createdAt: l.created_at,
    }));
  });

// ---------------------------------------------------------------------------
// 9. COMPLIANCE TRABALHISTA POR IA & MAPA DE RISCO CLT / DP
// ---------------------------------------------------------------------------
export interface LaborComplianceItem {
  id: string;
  category: "vacation" | "aso" | "overtime" | "cash_advances" | "documentation";
  severity: "high" | "medium" | "low";
  employeeName: string;
  employeeId: string;
  description: string;
  legalReference: string;
  actionRecommended: string;
  internalRiskEstimateCents: number;
}

export interface LaborComplianceReport {
  complianceScore: number;
  criticalAlertsCount: number;
  warningsCount: number;
  totalRiskExposureCents: number;
  items: LaborComplianceItem[];
  scannedAt: string;
}

export const analyzeLaborCompliance = createServerFn({ method: "GET" })
  .handler(async (): Promise<LaborComplianceReport> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "finance"]);

    // 1. Fetch employees
    const { data: employees } = await supabase
      .from("employees")
      .select("id, full_name, admission_date, job_title")
      .eq("store_id", identity.store_id);

    // 2. Fetch employee financial records (for advances / vales / off-the-books check)
    const { data: financialRecords } = await supabase
      .from("employee_financial_records")
      .select("*")
      .eq("store_id", identity.store_id)
      .order("created_at", { ascending: false });

    // 3. Fetch recent time entries (excessive overtime / missing lunch break check)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: timeEntries } = await supabase
      .from("employee_time_entries")
      .select("*")
      .eq("store_id", identity.store_id)
      .gte("recorded_at", thirtyDaysAgo);

    const items: LaborComplianceItem[] = [];
    const now = new Date();

    // 4. Check Vacation Liabilities (CLT Art. 134 e 137)
    (employees || []).forEach((emp) => {
      if (emp.admission_date) {
        const admission = new Date(emp.admission_date);
        const monthsWorking = (now.getFullYear() - admission.getFullYear()) * 12 + (now.getMonth() - admission.getMonth());
        if (monthsWorking >= 22) {
          items.push({
            id: `vacation-double-${emp.id}`,
            category: "vacation",
            severity: "high",
            employeeName: emp.full_name,
            employeeId: emp.id,
            description: "Período concessivo de férias vencendo em menos de 60 dias (ou vencido). Risco de pagamento em dobro.",
            legalReference: "CLT Art. 134 e Art. 137",
            actionRecommended: "Programar e homologar aviso de férias imediatamente.",
            internalRiskEstimateCents: 450000,
          });
        } else if (monthsWorking >= 12) {
          items.push({
            id: `vacation-due-${emp.id}`,
            category: "vacation",
            severity: "medium",
            employeeName: emp.full_name,
            employeeId: emp.id,
            description: "Período aquisitivo de férias completado. Abrir período concessivo de 12 meses.",
            legalReference: "CLT Art. 130",
            actionRecommended: "Alinhar calendário de férias com o colaborador.",
            internalRiskEstimateCents: 0,
          });
        }
      }
    });

    // 5. Check Unsettled Cash Advances & Informal Outflows (Vales por fora)
    const advances = (financialRecords || []).filter((r) => r.type === "advance" || r.type === "adjustment");
    const totalAdvanceExposureCents = advances.reduce((sum, r) => sum + Math.abs(r.amount_cents), 0);

    if (advances.length > 0) {
      items.push({
        id: "cash-advances-exposure",
        category: "cash_advances",
        severity: totalAdvanceExposureCents > 100000 ? "high" : "medium",
        employeeName: "Gestão Interna de Caixa",
        employeeId: "general",
        description: `${advances.length} adiantamentos/vales em dinheiro registrados internamente. Necessário recolhimento de recibos assinados para proteção contra passivo trabalhista.`,
        legalReference: "CLT Art. 462 e Súmula 342 TST",
        actionRecommended: "Emitir e anexar recibos assinados no Dossiê GED de cada colaborador.",
        internalRiskEstimateCents: Math.round(totalAdvanceExposureCents * 0.4),
      });
    }

    // 6. Check Time Clock Irregularities (Intervalo de almoço e sobrejornada)
    const adjustedEntries = (timeEntries || []).filter((e) => e.status === "adjusted");
    if (adjustedEntries.length > 5) {
      items.push({
        id: "time-adjustments-high",
        category: "overtime",
        severity: "medium",
        employeeName: "Vários Colaboradores",
        employeeId: "general",
        description: `Alto volume de ajustes manuais de ponto (${adjustedEntries.length} nos últimos 30 dias). Portaria 671 MTE exige registro fiel e justificativa auditada.`,
        legalReference: "Portaria MTE 671/2021",
        actionRecommended: "Auditar os motivos de ajuste e reforçar o uso do app/terminal biométrico.",
        internalRiskEstimateCents: 150000,
      });
    }

    const criticalCount = items.filter((i) => i.severity === "high").length;
    const warningCount = items.filter((i) => i.severity === "medium").length;
    const totalExposure = items.reduce((sum, i) => sum + i.internalRiskEstimateCents, 0);
    const score = Math.max(0, 100 - criticalCount * 25 - warningCount * 10);

    return {
      complianceScore: score,
      criticalAlertsCount: criticalCount,
      warningsCount: warningCount,
      totalRiskExposureCents: totalExposure,
      items,
      scannedAt: now.toISOString(),
    };
  });


export interface StoreEmployeeDTO {
  id: string;
  store_id: string;
  profile_id?: string | null;
  full_name: string;
  cpf_masked?: string | null;
  email?: string | null;
  phone?: string | null;
  job_title: string;
  employment_type: "clt" | "pj" | "internship" | "apprentice" | "temporary" | "freelancer";
  status: "active" | "on_leave" | "vacation" | "terminated" | "suspended";
  base_salary_cents: number;
  hire_date: string;
  work_schedule?: Record<string, any>;
  metadata?: {
    dependentsCount?: number;
    monthlyHoursDivisor?: number;
    transportVoucherCostCents?: number;
    mealVoucherCopayCents?: number;
    healthPlanCopayCents?: number;
    pisPasep?: string;
    cboCode?: string;
    departmentName?: string;
    pixKey?: string;
    asoValidUntil?: string;
  };
  balanceCents?: number;
}

export const listStoreEmployees = createServerFn({ method: "GET" }).handler(
  async (): Promise<StoreEmployeeDTO[]> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "finance"]);

    // 1. Carregar colaboradores cadastrados na tabela employees
    const { data: dbEmployees, error: empErr } = await supabase
      .from("employees")
      .select("*")
      .eq("store_id", identity.store_id)
      .order("full_name", { ascending: true });

    if (empErr) {
      console.warn("[hr.functions] listStoreEmployees error:", empErr.message);
    }

    const employeesList: StoreEmployeeDTO[] = (dbEmployees || []).map((e: any) => ({
      id: e.id,
      store_id: e.store_id,
      profile_id: e.profile_id,
      full_name: e.full_name,
      cpf_masked: e.cpf_masked,
      email: e.email,
      phone: e.phone,
      job_title: e.job_title,
      employment_type: e.employment_type || "clt",
      status: e.status || "active",
      base_salary_cents: e.base_salary_cents || 0,
      hire_date: e.hire_date || new Date().toISOString().split("T")[0],
      work_schedule: e.work_schedule || {},
      metadata: e.metadata || {},
    }));

    // 2. Sincronização resiliente: carregar workspace_members e mesclar quem ainda não tiver ficha
    const { data: members } = await supabase
      .from("workspace_members")
      .select("profile_id, role, profiles(full_name, email)")
      .eq("store_id", identity.store_id);

    if (members && members.length > 0) {
      for (const m of members) {
        const alreadyExists = employeesList.some(
          (e) => e.profile_id === m.profile_id || (m.profile_id && e.id === m.profile_id),
        );
        if (!alreadyExists) {
          const profile = m.profiles as any;
          employeesList.push({
            id: m.profile_id,
            store_id: identity.store_id,
            profile_id: m.profile_id,
            full_name: profile?.full_name || "Membro de Equipe",
            email: profile?.email || null,
            job_title: m.role || "Colaborador",
            employment_type: "clt",
            status: "active",
            base_salary_cents: 0,
            hire_date: new Date().toISOString().split("T")[0],
            metadata: {},
          });
        }
      }
    }

    return employeesList;
  },
);

export const upsertStoreEmployee = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid().optional(),
      profileId: z.string().uuid().optional(),
      fullName: z.string().min(2, "Nome obrigatório"),
      cpfMasked: z.string().optional(),
      email: z.string().email().optional().or(z.literal("")),
      phone: z.string().optional(),
      jobTitle: z.string().min(2, "Cargo obrigatório"),
      employmentType: z
        .enum(["clt", "pj", "internship", "apprentice", "temporary", "freelancer"])
        .default("clt"),
      status: z.enum(["active", "on_leave", "vacation", "terminated", "suspended"]).default("active"),
      baseSalaryCents: z.number().int().min(0).default(0),
      hireDate: z.string().optional(),
      workSchedule: z.record(z.any()).optional(),
      metadata: z.record(z.any()).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "finance"]);

    const payload: Record<string, any> = {
      store_id: identity.store_id,
      full_name: data.fullName,
      cpf_masked: data.cpfMasked || null,
      email: data.email || null,
      phone: data.phone || null,
      job_title: data.jobTitle,
      employment_type: data.employmentType,
      status: data.status,
      base_salary_cents: data.baseSalaryCents,
      hire_date: data.hireDate || new Date().toISOString().split("T")[0],
      work_schedule: data.workSchedule || { weekly_hours: 44, daily_hours: 8.8 },
      metadata: data.metadata || {},
    };

    if (data.profileId) {
      payload.profile_id = data.profileId;
    }

    let savedEmployee;
    if (data.id) {
      const { data: updated, error } = await supabase
        .from("employees")
        .update(payload)
        .eq("id", data.id)
        .eq("store_id", identity.store_id)
        .select()
        .single();

      if (error) throw new Error("Erro ao atualizar colaborador: " + error.message);
      savedEmployee = updated;
    } else {
      const { data: inserted, error } = await supabase
        .from("employees")
        .insert(payload)
        .select()
        .single();

      if (error) throw new Error("Erro ao cadastrar colaborador: " + error.message);
      savedEmployee = inserted;
    }

    return { status: "success", employee: savedEmployee };
  });

export const closePayrollAndPostToPayables = createServerFn({ method: "POST" })
  .validator(
    z.object({
      referencePeriod: z.string().regex(/^[0-9]{4}-[0-9]{2}$/, "Formato deve ser YYYY-MM"),
      paymentDate: z.string().optional(),
      payslips: z.array(
        z.object({
          employeeId: z.string().uuid(),
          grossSalaryCents: z.number().int().min(0),
          netSalaryCents: z.number().int().min(0),
          inssDiscountCents: z.number().int().min(0).default(0),
          irrfDiscountCents: z.number().int().min(0).default(0),
          fgtsProvisionCents: z.number().int().min(0).default(0),
          transportVoucherDiscountCents: z.number().int().min(0).default(0),
          mealVoucherDiscountCents: z.number().int().min(0).default(0),
          otherDiscountsCents: z.number().int().min(0).default(0),
          bonusAdditionsCents: z.number().int().min(0).default(0),
          overtimePayCents: z.number().int().min(0).default(0),
          salaryBreakdown: z.array(z.any()).default([]),
        }),
      ),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "finance"]);

    let totalGrossCents = 0;
    let totalNetCents = 0;
    let totalINSSCents = 0;
    let totalFGTSCents = 0;

    // 1. Gravar/Emitir todos os holerites da competência
    for (const item of data.payslips) {
      totalGrossCents += item.grossSalaryCents;
      totalNetCents += item.netSalaryCents;
      totalINSSCents += item.inssDiscountCents;
      totalFGTSCents += item.fgtsProvisionCents;

      await supabase.from("employee_payslips").upsert(
        {
          store_id: identity.store_id,
          employee_id: item.employeeId,
          reference_period: data.referencePeriod,
          gross_salary_cents: item.grossSalaryCents,
          net_salary_cents: item.netSalaryCents,
          inss_discount_cents: item.inssDiscountCents,
          irrf_discount_cents: item.irrfDiscountCents,
          fgts_provision_cents: item.fgtsProvisionCents,
          transport_voucher_discount_cents: item.transportVoucherDiscountCents,
          meal_voucher_discount_cents: item.mealVoucherDiscountCents,
          other_discounts_cents: item.otherDiscountsCents,
          bonus_additions_cents: item.bonusAdditionsCents,
          overtime_pay_cents: item.overtimePayCents,
          salary_breakdown: item.salaryBreakdown,
          payment_date: data.paymentDate || new Date().toISOString().split("T")[0],
          status: "issued",
        },
        { onConflict: "employee_id, reference_period" },
      );
    }

    // 2. Bilateralidade com Financeiro: Criar despesa de Folha em financial_transactions
    if (totalNetCents > 0) {
      const today = new Date().toISOString().split("T")[0];
      const desc = `Folha de Pagamento - Competência ${data.referencePeriod} (${data.payslips.length} colaboradores)`;

      await supabase.from("financial_transactions").insert({
        store_id: identity.store_id,
        type: "expense",
        amount_cents: -totalNetCents,
        category: "folha_pagamento",
        description: desc,
        reference_date: data.paymentDate || today,
        created_by: identity.id,
      });
    }

    return {
      status: "success",
      referencePeriod: data.referencePeriod,
      totalNetCents,
      totalGrossCents,
      totalINSSCents,
      totalFGTSCents,
      count: data.payslips.length,
    };
  });

export const upsertEmployeeDossier = createServerFn({ method: "POST" })
  .validator(
    z.object({
      employeeId: z.string().uuid(),
      medicalExams: z.array(
        z.object({
          id: z.string().optional(),
          type: z.enum(["admissional", "periodico", "demissional", "retorno_ao_trabalho", "mudanca_funcao"]),
          examDate: z.string(),
          validUntil: z.string(),
          clinicName: z.string().optional(),
          doctorCrm: z.string().optional(),
          status: z.enum(["apt", "inapt", "apt_with_restrictions"]).default("apt"),
          documentUrl: z.string().optional(),
        })
      ).optional(),
      documents: z.array(
        z.object({
          id: z.string().optional(),
          category: z.enum(["rg_cpf", "ctps", "residence", "contract", "medical_leave", "aso", "other"]),
          title: z.string(),
          fileUrl: z.string(),
          uploadedAt: z.string().optional(),
          notes: z.string().optional(),
        })
      ).optional(),
      defaultBenefits: z.object({
        vtEnabled: z.boolean().default(false),
        vtMonthlyCents: z.number().int().min(0).default(0),
        vrEnabled: z.boolean().default(false),
        vrDailyCents: z.number().int().min(0).default(0),
        healthPlanEnabled: z.boolean().default(false),
        healthPlanCents: z.number().int().min(0).default(0),
        otherDiscountsCents: z.number().int().min(0).default(0),
      }).optional(),
      posPermissions: z.object({
        canOpenDrawer: z.boolean().default(true),
        canVoidItemWithoutPin: z.boolean().default(false),
        canGiveDiscountWithoutPin: z.boolean().default(false),
        maxDiscountPct: z.number().default(5),
        canRefund: z.boolean().default(false),
        canSangriaSuprimento: z.boolean().default(false),
      }).optional(),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "finance", "manager"]);

    const { data: emp, error: getErr } = await supabase
      .from("employees")
      .select("id, metadata")
      .eq("id", data.employeeId)
      .eq("store_id", identity.store_id)
      .single();

    if (getErr || !emp) throw new Error("Colaborador não encontrado.");

    const currentMeta = (emp.metadata || {}) as Record<string, any>;
    const updatedMeta = {
      ...currentMeta,
      ...(data.medicalExams !== undefined ? { medical_exams: data.medicalExams } : {}),
      ...(data.documents !== undefined ? { documents: data.documents } : {}),
      ...(data.defaultBenefits !== undefined ? { default_benefits: data.defaultBenefits } : {}),
      ...(data.posPermissions !== undefined ? { pos_permissions: data.posPermissions } : {}),
      updated_at: new Date().toISOString(),
    };

    const { error: updateErr } = await supabase
      .from("employees")
      .update({
        metadata: updatedMeta,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.employeeId)
      .eq("store_id", identity.store_id);

    if (updateErr) throw new Error("Erro ao atualizar prontuário: " + updateErr.message);

    return { status: "success", employeeId: data.employeeId, metadata: updatedMeta };
  });

export const batchUpdateDepartmentBenefits = createServerFn({ method: "POST" })
  .validator(
    z.object({
      departmentId: z.string().optional(),
      departmentName: z.string().optional(),
      benefits: z.object({
        vtEnabled: z.boolean().optional(),
        vtMonthlyCents: z.number().int().min(0).optional(),
        vrEnabled: z.boolean().optional(),
        vrDailyCents: z.number().int().min(0).optional(),
        healthPlanEnabled: z.boolean().optional(),
        healthPlanCents: z.number().int().min(0).optional(),
      }),
      salaryAdjustmentPercent: z.number().optional(),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "finance"]);

    let query = supabase
      .from("employees")
      .select("id, base_salary_cents, metadata")
      .eq("store_id", identity.store_id)
      .eq("status", "active");

    if (data.departmentId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.departmentId)) {
      query = query.eq("department_id", data.departmentId);
    }

    const { data: emps, error: listErr } = await query;

    if (listErr) throw new Error("Erro ao listar colaboradores do setor: " + listErr.message);

    const targetDept = data.departmentName?.toLowerCase();
    const candidateEmps = targetDept
      ? (emps || []).filter((e: any) => (e.metadata?.departmentName || "Operações").toLowerCase() === targetDept)
      : (emps || []);

    if (candidateEmps.length === 0) return { status: "success", updatedCount: 0 };

    let count = 0;
    for (const emp of candidateEmps) {
      const meta = (emp.metadata || {}) as Record<string, any>;
      const existingBenefits = meta.default_benefits || {};
      const updatedBenefits = {
        ...existingBenefits,
        ...(data.benefits.vtEnabled !== undefined ? { vtEnabled: data.benefits.vtEnabled } : {}),
        ...(data.benefits.vtMonthlyCents !== undefined ? { vtMonthlyCents: data.benefits.vtMonthlyCents } : {}),
        ...(data.benefits.vrEnabled !== undefined ? { vrEnabled: data.benefits.vrEnabled } : {}),
        ...(data.benefits.vrDailyCents !== undefined ? { vrDailyCents: data.benefits.vrDailyCents } : {}),
        ...(data.benefits.healthPlanEnabled !== undefined ? { healthPlanEnabled: data.benefits.healthPlanEnabled } : {}),
        ...(data.benefits.healthPlanCents !== undefined ? { healthPlanCents: data.benefits.healthPlanCents } : {}),
      };

      let newBaseSalary = emp.base_salary_cents;
      if (data.salaryAdjustmentPercent && data.salaryAdjustmentPercent !== 0) {
        newBaseSalary = Math.round(emp.base_salary_cents * (1 + data.salaryAdjustmentPercent / 100));
      }

      await supabase
        .from("employees")
        .update({
          base_salary_cents: newBaseSalary,
          metadata: {
            ...meta,
            default_benefits: updatedBenefits,
            last_batch_update: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", emp.id);

      count++;
    }

    return { status: "success", updatedCount: count };
  });
