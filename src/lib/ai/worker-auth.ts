import { timingSafeEqual } from "node:crypto";
import { getEnvVar } from "@/lib/env";

/**
 * Validacao Zero-Trust por token Bearer ou header X-Waesy-Worker-Token
 * compartilhada entre workers internos e cron endpoints do Cloudflare/pg_cron.
 */
export function hasValidWorkerToken(request: Request): boolean {
  const expected =
    getEnvVar("WAESY_AI_WORKER_TOKEN") ||
    getEnvVar("WAESY_CRON_TOKEN") ||
    getEnvVar("WHATSAPP_WORKER_TOKEN") ||
    process.env.WAESY_AI_WORKER_TOKEN ||
    process.env.WAESY_CRON_TOKEN ||
    process.env.WHATSAPP_WORKER_TOKEN ||
    "";
  if (!expected) return false;
  const authHeader = (request.headers.get("authorization") || "").trim();
  const headerToken = (request.headers.get("x-waesy-worker-token") || "").trim();
  const bearer = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : authHeader;
  const received = headerToken || bearer;
  if (!received) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}
