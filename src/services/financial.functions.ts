/**
 * Financial Management Server Functions (F17)
 *
 * BFF boundary for the Workspace Pro financial ledger.
 * Re-exports and wraps canonical financial operations with zero mocks (M01).
 * All money is integer cents. Tenant isolation is strictly enforced via store_id.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  FINANCIAL_TX_TYPES,
  type FinancialTxType,
  type FinancialTransactionDTO,
  type FinancialSummaryDTO,
  listFinancialTransactions,
  getFinancialSummary,
  createManualTransaction,
  _listFinancialTransactions,
  _getFinancialSummary,
  _createManualTransaction,
} from "./finance.functions";

export {
  FINANCIAL_TX_TYPES,
  type FinancialTxType,
  type FinancialTransactionDTO,
  type FinancialSummaryDTO,
  _listFinancialTransactions,
  _getFinancialSummary,
  _createManualTransaction,
};

export const listFinancialEntriesSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  type: z.enum(FINANCIAL_TX_TYPES).optional(),
  category: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
});

export const createFinancialEntrySchema = z.object({
  type: z.enum(FINANCIAL_TX_TYPES),
  amount_cents: z.number().int().min(1, "Valor deve ser maior que zero"),
  description: z.string().min(3, "Descrição obrigatória"),
  category: z.string().optional(),
  reference_date: z.string().optional(),
});

export const getCashFlowSummarySchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
});

/**
 * Server Function: listFinancialEntriesFn
 * Real query against financial_transactions with store_id isolation.
 */
export const listFinancialEntriesFn = createServerFn({ method: "GET" })
  .validator(listFinancialEntriesSchema)
  .handler(async ({ data: filters }) => {
    return await listFinancialTransactions({ data: filters });
  });

/**
 * Server Function: createFinancialEntryFn
 * Manual entry for expense or adjustment. Rejects direct revenue injection.
 */
export const createFinancialEntryFn = createServerFn({ method: "POST" })
  .validator(createFinancialEntrySchema)
  .handler(async ({ data: input }) => {
    return await createManualTransaction({ data: input });
  });

/**
 * Server Function: getCashFlowSummaryFn
 * Aggregates revenue, expenses, refunds and net total for a time window.
 */
export const getCashFlowSummaryFn = createServerFn({ method: "GET" })
  .validator(getCashFlowSummarySchema)
  .handler(async ({ data: filters }) => {
    return await getFinancialSummary({ data: filters });
  });
