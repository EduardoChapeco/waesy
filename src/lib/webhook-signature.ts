import crypto from "node:crypto";

const DEFAULT_REPLAY_WINDOW_SECONDS = 300;

type SignatureVerification =
  | { ok: true }
  | { ok: false; reason: string };

function safeEqualHex(expected: string, received: string): boolean {
  const normalizedExpected = expected.toLowerCase();
  const normalizedReceived = received.toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalizedReceived)) return false;
  const expectedBuffer = Buffer.from(normalizedExpected, "hex");
  const receivedBuffer = Buffer.from(normalizedReceived, "hex");
  return expectedBuffer.length === receivedBuffer.length && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

function parseSignature(value: string | null): string | null {
  if (!value) return null;
  const match = value.trim().match(/^(?:sha256=)?([a-f0-9]{64})$/i);
  return match?.[1] ?? null;
}

export function verifyWebhookSignature(
  rawBody: string,
  headers: Headers,
  secret: string | undefined,
  options: { signatureHeader?: string; timestampHeader?: string; replayWindowSeconds?: number } = {},
): SignatureVerification {
  if (!secret) return { ok: false, reason: "Webhook secret is not configured" };

  const signatureHeader = options.signatureHeader ?? "x-waesy-signature";
  const timestampHeader = options.timestampHeader ?? "x-waesy-timestamp";
  const receivedSignature = parseSignature(headers.get(signatureHeader));
  const timestamp = headers.get(timestampHeader);

  if (!receivedSignature || !timestamp) {
    return { ok: false, reason: "Missing webhook signature or timestamp" };
  }

  const timestampSeconds = Number(timestamp);
  const replayWindowSeconds = options.replayWindowSeconds ?? DEFAULT_REPLAY_WINDOW_SECONDS;
  if (!Number.isInteger(timestampSeconds) || Math.abs(Math.floor(Date.now() / 1000) - timestampSeconds) > replayWindowSeconds) {
    return { ok: false, reason: "Webhook timestamp outside replay window" };
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");

  return safeEqualHex(expectedSignature, receivedSignature)
    ? { ok: true }
    : { ok: false, reason: "Webhook signature mismatch" };
}

/**
 * Verifica a assinatura X-Hub-Signature-256 usada pela Meta.
 *
 * Diferentemente dos webhooks internos do Waesy, a Meta assina somente o
 * corpo bruto com o App Secret e não envia timestamp separado.
 */
export function verifyMetaWebhookSignature(
  rawBody: string,
  headers: Headers,
  appSecret: string | undefined,
): SignatureVerification {
  if (!appSecret) return { ok: false, reason: "Meta App Secret is not configured" };

  const receivedSignature = parseSignature(headers.get("x-hub-signature-256"));
  if (!receivedSignature) {
    return { ok: false, reason: "Missing X-Hub-Signature-256" };
  }

  const expectedSignature = crypto.createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");

  return safeEqualHex(expectedSignature, receivedSignature)
    ? { ok: true }
    : { ok: false, reason: "Meta webhook signature mismatch" };
}
