import { getServerClient } from "@/lib/supabase";

import { getActiveIntegrationPayload } from "./integrations.functions";

type PaymentMethod = "pix" | "credit_card";

export type SupportedGatewayProvider = "mercado_pago" | "asaas" | "paypal" | "stripe";

export interface CreateGatewayPaymentInput {
  orderId: string;
  amountCents: number;
  method: PaymentMethod;
  idempotencyKey: string;
  payer: { name: string; email?: string | null; cpf?: string | null };
  cardToken?: string | null;
  installments?: number;
  provider?: SupportedGatewayProvider;
  storeId?: string;
}

export interface GatewayPaymentResult {
  provider: SupportedGatewayProvider;
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
  const selectedProvider: SupportedGatewayProvider = input.provider || "mercado_pago";
  const email = input.payer.email?.trim();
  if (!email) throw new Error("E-mail do pagador é obrigatório para o gateway.");

  // 1. ASAAS
  if (selectedProvider === "asaas") {
    let asaasApiKey = process.env.ASAAS_API_KEY?.trim();
    if (input.storeId) {
      const storeCreds = await getActiveIntegrationPayload(input.storeId, "asaas");
      if (storeCreds?.api_key) asaasApiKey = storeCreds.api_key;
    }
    if (!asaasApiKey) throw new Error("Gateway Asaas não configurado.");

    const isSandbox = asaasApiKey.startsWith("$aact_");
    const baseUrl = isSandbox ? "https://sandbox.asaas.com/api/v3" : "https://api.asaas.com/api/v3";

    // Criar ou localizar cliente
    let customerId: string | null = null;
    try {
      const custRes = await fetch(`${baseUrl}/customers?email=${encodeURIComponent(email)}`, {
        headers: { access_token: asaasApiKey, "Content-Type": "application/json" },
      });
      const custData = await custRes.json();
      if (custData?.data?.length > 0) {
        customerId = custData.data[0].id;
      } else {
        const newCustRes = await fetch(`${baseUrl}/customers`, {
          method: "POST",
          headers: { access_token: asaasApiKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            name: input.payer.name,
            email,
            cpfCnpj: input.payer.cpf?.replace(/\D/g, "") || undefined,
          }),
        });
        const newCust = await newCustRes.json();
        customerId = newCust?.id || null;
      }
    } catch (e) {
      console.error("[gateway:asaas] customer lookup/create error:", e);
    }

    if (!customerId) throw new Error("Não foi possível registrar pagador no gateway Asaas.");

    const asaasBody: Record<string, unknown> = {
      customer: customerId,
      billingType: input.method === "pix" ? "PIX" : "CREDIT_CARD",
      value: input.amountCents / 100,
      dueDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
      description: `Waesy order ${input.orderId}`,
      externalReference: input.orderId,
    };

    const paymentRes = await fetch(`${baseUrl}/payments`, {
      method: "POST",
      headers: {
        access_token: asaasApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(asaasBody),
    });

    const paymentPayload = await paymentRes.json().catch(() => ({})) as Record<string, unknown>;
    if (!paymentRes.ok) {
      throw new Error(`Gateway Asaas recusou a cobrança (${paymentRes.status}).`);
    }

    const providerRef = String(paymentPayload.id || "").trim();
    if (!providerRef) throw new Error("Asaas retornou resposta sem identificador de cobrança.");

    let pixData: { qrCode?: string; qrCodeBase64?: string } | undefined;
    if (input.method === "pix") {
      try {
        const pixRes = await fetch(`${baseUrl}/payments/${providerRef}/pixQrCode`, {
          headers: { access_token: asaasApiKey },
        });
        if (pixRes.ok) {
          const pixJson = await pixRes.json();
          pixData = {
            qrCode: pixJson.payload,
            qrCodeBase64: pixJson.encodedImage,
          };
        }
      } catch (e) {
        console.error("[gateway:asaas] pix qr lookup error:", e);
      }
    }

    const asaasStatus = String(paymentPayload.status || "").toUpperCase();
    const isPaid = asaasStatus === "RECEIVED" || asaasStatus === "CONFIRMED";
    const isFailed = asaasStatus === "FAILED" || asaasStatus === "OVERDUE";

    return {
      provider: "asaas",
      providerRef,
      status: isPaid ? "paid" : isFailed ? "failed" : "pending",
      payload: paymentPayload,
      pix: pixData,
    };
  }

  // 2. PAYPAL
  if (selectedProvider === "paypal") {
    let clientId = process.env.PAYPAL_CLIENT_ID?.trim();
    let clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();
    let environment = process.env.PAYPAL_ENVIRONMENT?.trim() || "production";

    if (input.storeId) {
      const storeCreds = await getActiveIntegrationPayload(input.storeId, "paypal");
      if (storeCreds?.client_id) clientId = storeCreds.client_id;
      if (storeCreds?.client_secret) clientSecret = storeCreds.client_secret;
      if (storeCreds?.environment) environment = storeCreds.environment;
    }

    if (!clientId || !clientSecret) throw new Error("Gateway PayPal não configurado (Client ID / Secret ausentes).");

    const isSandbox = environment === "sandbox";
    const tokenUrl = isSandbox ? "https://api-m.sandbox.paypal.com/v1/oauth2/token" : "https://api-m.paypal.com/v1/oauth2/token";
    const baseApiUrl = isSandbox ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";

    // Obter OAuth Token
    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!tokenRes.ok) throw new Error("Falha na autenticação com gateway PayPal.");
    const tokenJson = await tokenRes.json();
    const accessToken = tokenJson.access_token;

    // Criar pedido no PayPal
    const orderRes = await fetch(`${baseApiUrl}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": input.idempotencyKey,
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: input.orderId,
            description: `Waesy order ${input.orderId}`,
            amount: {
              currency_code: "BRL",
              value: (input.amountCents / 100).toFixed(2),
            },
          },
        ],
        payer: {
          name: { given_name: input.payer.name },
          email_address: email,
        },
      }),
    });

    const orderJson = await orderRes.json().catch(() => ({})) as Record<string, unknown>;
    if (!orderRes.ok) throw new Error(`PayPal recusou a criação do pedido (${orderRes.status}).`);

    const providerRef = String(orderJson.id || "").trim();
    const paypalStatus = String(orderJson.status || "").toUpperCase();

    return {
      provider: "paypal",
      providerRef,
      status: paypalStatus === "COMPLETED" ? "paid" : "pending",
      payload: orderJson,
    };
  }

  // 3. MERCADO PAGO (Default)
  let token = process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim();
  if (input.storeId) {
    const storeCreds = await getActiveIntegrationPayload(input.storeId, "mercadopago");
    if (storeCreds?.access_token) token = storeCreds.access_token;
  }
  if (!token) token = requireEnv("MERCADO_PAGO_ACCESS_TOKEN");

  if (input.method === "credit_card" && !input.cardToken) {
    throw new Error("Token seguro do cartão é obrigatório; dados brutos de cartão nunca são aceitos.");
  }

  const body: Record<string, unknown> = {
    transaction_amount: input.amountCents / 100,
    description: `Waesy order ${input.orderId}`,
    payer: { email, first_name: input.payer.name },
    external_reference: input.orderId,
    notification_url: process.env.MERCADO_PAGO_WEBHOOK_URL?.trim() || undefined,
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

  const providerRef = typeof payload.id === "string" || typeof payload.id === "number"
    ? String(payload.id).trim()
    : "";
  if (!providerRef) {
    throw new Error("Gateway retornou resposta sem identificador de pagamento.");
  }

  const status = String(payload.status || "").trim();
  if (!["approved", "rejected", "pending", "in_process", "authorized"].includes(status)) {
    throw new Error("Gateway retornou status de pagamento não reconhecido.");
  }

  return {
    provider: "mercado_pago",
    providerRef,
    status: status === "approved" || status === "authorized" ? "paid" : status === "rejected" ? "failed" : "pending",
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
