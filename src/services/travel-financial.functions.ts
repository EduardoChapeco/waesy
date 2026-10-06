import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { requireFinance } from "@/lib/server-access";

const RecordTravelSalePaymentSchema = z.object({
  saleId: z.string().uuid(),
  amountCents: z.number().int().positive().max(1_000_000_000_000),
  paymentMethod: z.enum(["pix", "card", "boleto", "cash", "transfer", "other"]),
  idempotencyKey: z.string().trim().min(8).max(160),
  externalReference: z.string().trim().max(240).optional().nullable(),
  metadata: z.record(z.unknown()).default({}),
});

export type TravelSalePaymentResult = {
  success: boolean;
  replayed: boolean;
  payment_id?: string;
  ledger_id?: string;
  sale_id: string;
};

export const recordTravelSalePayment = createServerFn({ method: "POST" })
  .validator(RecordTravelSalePaymentSchema)
  .handler(async ({ data }) => {
    const identity = await requireFinance();
    const supabase = getServerClient();
    const { data: result, error } = await supabase.rpc(
      "record_travel_sale_payment" as never,
      {
        p_sale_id: data.saleId,
        p_amount_cents: data.amountCents,
        p_payment_method: data.paymentMethod,
        p_idempotency_key: `${identity.store_id}:${data.idempotencyKey}`,
        p_external_reference: data.externalReference || null,
        p_metadata: {
          ...data.metadata,
          recorded_by_store_id: identity.store_id,
        },
      } as never,
    );

    if (error) {
      throw new Error(`Não foi possível registrar o pagamento turístico: ${error.message}`);
    }

    return result as TravelSalePaymentResult;
  });
