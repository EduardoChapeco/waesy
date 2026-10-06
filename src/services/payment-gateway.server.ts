import { getServerClient } from "@/lib/supabase";

type PaymentMethod = "pix" | "credit_card";

export interface CreateGatewayPaymentInput {
  orderId: string;
  amountCents: number;
  method: PaymentMethod;
  idempotencyKey: string;
  payer: { name: string; email?: string | null; cpf?: string | null };
  cardToken?: string | null;
  installments?: number;
}

export interface GatewayPaymentResult {
  provider: "mercado_pago";
  providerRef: string;
  status: "pending" | "paid" | "failed";
  payload: Record<string, unknown>;
  pix?: { qrCode?: string; qrCodeBase64?: string };
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Gateway não configurado: ${name}`);
  return value;
}

export async function createGatewayPayment(input: CreateGatewayPaymentInput): Promise<GatewayPaymentResult> {
  const token = requireEnv("MERCADO_PAGO_ACCESS_TOKEN");
  const email = input.payer.email?.trim();
  if (!email) throw new Error("E-mail do pagador é obrigatório para o gateway.");
  if (input.method === "credit_card" && !input.cardToken) {
    throw new Error("Token seguro do cartão é obrigatório; dados brutos de cartão nunca são aceitos.");
  }

  const body: Record<string, unknown> = {
    transaction_amount: input.amountCents / 100,
    description: `Waesy order ${input.orderId}`,
    payer: { email, first_name: input.payer.name },
    external_reference: input.orderId,
    notification_url: requireEnv("MERCADO_PAGO_WEBHOOK_URL"),
  };
  if (input.method === "pix") {
    body.payment_method_id = "pix";
  } else {
    body.token = input.cardToken;
    body.installments = input.installments ?? 1;
    body.payment_method_id = "visa";
  }

  const response = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new Error(`Gateway recusou o pagamento (${response.status}).`);

  const status = String(payload.status || "pending");
  return {
    provider: "mercado_pago",
    providerRef: String(payload.id || ""),
    status: status === "approved" ? "paid" : status === "rejected" ? "failed" : "pending",
    payload,
    pix: input.method === "pix" ? {
      qrCode: typeof (payload.point_of_interaction as any)?.transaction_data?.qr_code === "string"
        ? (payload.point_of_interaction as any).transaction_data.qr_code : undefined,
      qrCodeBase64: typeof (payload.point_of_interaction as any)?.transaction_data?.qr_code_base64 === "string"
        ? (payload.point_of_interaction as any).transaction_data.qr_code_base64 : undefined,
    } : undefined,
  };
}

export async function markGatewayPaymentFailure(paymentId: string, reason: string): Promise<void> {
  const db = getServerClient();
  const { error } = await db.rpc("mark_payment_failed_atomic", {
    p_payment_id: paymentId,
    p_reason: reason.slice(0, 500),
  });
  if (error) throw new Error("Não foi possível reverter o pagamento após falha do gateway.");
}
