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
 amount_cents: finalAmount,
 type,
 description,
 metadata: { registered_by: identity.id },
 })
 .select("id")
 .single();

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

