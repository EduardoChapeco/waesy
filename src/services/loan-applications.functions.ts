import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";

const loanApplicationSchema = z.object({
  amountCents: z.number().int().min(10000).max(100_000_000),
  installments: z.union([
    z.literal(6),
    z.literal(12),
    z.literal(18),
    z.literal(24),
    z.literal(36),
  ]),
  monthlyCents: z.number().int().positive(),
  totalPayableCents: z.number().int().min(10000),
  firstDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type LoanApplicationInput = z.infer<typeof loanApplicationSchema>;

export const createLoanApplication = createServerFn({ method: "POST" })
  .validator(loanApplicationSchema)
  .handler(async ({ data }): Promise<{ id: string; status: "pending_review" }> => {
    const identity = await getServerIdentity();
    const db = getServerClient();

    if (data.totalPayableCents < data.amountCents) {
      throw new Error("A simulação possui total inválido.");
    }

    const { data: application, error } = await db.rpc("submit_loan_application", {
      p_customer_id: identity.id,
      p_amount_cents: data.amountCents,
      p_installments_count: data.installments,
      p_monthly_payment_cents: data.monthlyCents,
      p_total_payable_cents: data.totalPayableCents,
      p_first_due_date: data.firstDueDate,
    });

    if (error || !application) {
      throw new Error(error?.message || "Não foi possível enviar a solicitação de crédito.");
    }

    const row = Array.isArray(application) ? application[0] : application;
    if (!row?.id || row.status !== "pending_review") {
      throw new Error("A solicitação não retornou um status persistido válido.");
    }

    return { id: row.id, status: "pending_review" };
  });

export interface LoanApplicationDTO {
  id: string;
  customerId: string;
  amountCents: number;
  installmentsCount: number;
  monthlyPaymentCents: number;
  totalPayableCents: number;
  firstDueDate: string;
  status: "pending_review" | "approved" | "rejected" | "disbursed";
  createdAt: string;
  updatedAt: string;
}

export const listMyLoanApplications = createServerFn({ method: "GET" }).handler(
  async (): Promise<LoanApplicationDTO[]> => {
    const identity = await getServerIdentity();
    if (!identity?.id) return [];

    const db = getServerClient();
    const { data, error } = await db
      .from("loan_applications")
      .select("*")
      .eq("customer_id", identity.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[loan-applications] listMyLoanApplications error:", error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      customerId: row.customer_id,
      amountCents: Number(row.amount_cents || 0),
      installmentsCount: Number(row.installments_count || 0),
      monthlyPaymentCents: Number(row.monthly_payment_cents || 0),
      totalPayableCents: Number(row.total_payable_cents || 0),
      firstDueDate: row.first_due_date,
      status: row.status as any,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }
);
