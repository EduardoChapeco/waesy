import { getRealClientIP } from "@/lib/network-telemetry.server";
/**
 * rate-limiter.ts — Motor Central de Proteção Anti-Abuso, Anti-Bot, Anti-DDoS e Rate Limiting
 * Padrão BigTech (Inspirado em express-rate-limit & Cloudflare Sliding Window).
 *
 * Suporta múltiplas políticas por tipo de rota (Auth, IA, Checkout, E-mails, Uploads, Social).
 */

export interface RateLimitRecord {
 count: number;
 resetAt: number;
 blockedUntil?: number;
}

export interface RateLimitPolicy {
 windowMs: number;
 maxAllowed: number;
 lockoutMs?: number; // Tempo de bloqueio severo em caso de excesso repetido
 message?: string;
}

export interface RateLimitResult {
 allowed: boolean;
 limit: number;
 remaining: number;
 resetInMs: number;
 retryAfterSec: number;
 headers: Record<string, string>;
}

// ---------------------------------------------------------------------------
// 1. Políticas Pré-Configuradas do Ecossistema
// ---------------------------------------------------------------------------

export const RATE_LIMIT_POLICIES: Record<string, RateLimitPolicy> = {
 // Autenticação & Recuperação de Senha
 auth_login: {
 windowMs: 15 * 60 * 1000, // 15 minutos
 maxAllowed: 25, // 25 tentativas antes de acionar proteção
 lockoutMs: 15 * 60 * 1000, // 15 minutos de lockout em caso de brute force severo
 message: "Muitas tentativas de login. Para sua segurança, aguarde antes de tentar novamente.",
 },
 auth_signup: {
 windowMs: 15 * 60 * 1000,
 maxAllowed: 10,
 message: "Muitas tentativas de cadastro a partir deste endereço IP. Aguarde alguns minutos.",
 },
 auth_password_reset: {
 windowMs: 30 * 60 * 1000, // 30 minutos
 maxAllowed: 10,
 message: "Muitas solicitações de redefinição de senha. Verifique sua caixa de entrada ou aguarde.",
 },

  // Inteligência Artificial, LLMs & WebMCP Protocol
  ai_generation: {
    windowMs: 60 * 1000, // 1 minuto
    maxAllowed: 10,
    message: "Limite de requisições de Inteligência Artificial atingido. Aguarde alguns segundos para continuar gerando conteúdo.",
  },
  ai_mining_crawler: {
    windowMs: 60 * 1000,
    maxAllowed: 6,
    message: "Muitas extrações simultâneas em andamento. Aguarde o término da fila de mineração.",
  },
  webmcp_tool_call_public: {
    windowMs: 60 * 1000,
    maxAllowed: 30, // 30 chamadas públicas/min por IP
    lockoutMs: 5 * 60 * 1000, // 5 min de ban temporário em caso de ataque
    message: "Limite do Protocolo WebMCP excedido (30 req/min). Agentes de IA externos devem respeitar a quota pública.",
  },
  webmcp_tool_call_staff: {
    windowMs: 60 * 1000,
    maxAllowed: 120, // 120 chamadas/min por loja autenticada
    lockoutMs: 15 * 60 * 1000,
    message: "Cota de automação de staff WebMCP excedida (120 req/min). Proteção anti-loop de agentes ativada.",
  },
  webmcp_batch_dispatch: {
    windowMs: 5 * 60 * 1000, // 5 minutos
    maxAllowed: 10, // máx 10 lotes pesados
    lockoutMs: 15 * 60 * 1000,
    message: "Limite de lotes e simulações simultâneas WebMCP atingido. Aguarde o processamento dos jobs em andamento.",
  },

 // E-mails, Mensagens e Contatos
 email_contact_form: {
 windowMs: 10 * 60 * 1000, // 10 minutos
 maxAllowed: 3,
 message: "Muitas mensagens de contato enviadas. Aguarde para enviar uma nova mensagem.",
 },
 notification_dispatch: {
 windowMs: 60 * 1000,
 maxAllowed: 10,
 message: "Frequência de envio de notificações acima do limite permitido.",
 },

 // Transações & Checkout
 checkout_order: {
 windowMs: 60 * 1000,
 maxAllowed: 5,
 message: "Muitas tentativas de finalização de pedido. Aguarde alguns instantes antes de tentar novamente.",
 },
 pix_generation: {
 windowMs: 60 * 1000,
 maxAllowed: 6,
 message: "Muitas chaves PIX geradas recentemente. Conclua o pagamento anterior ou aguarde.",
 },

 // Uploads & Mídia
 media_upload: {
 windowMs: 5 * 60 * 1000, // 5 minutos
 maxAllowed: 20,
 message: "Limite de uploads simultâneos atingido. Aguarde alguns minutos.",
 },

 // Interações Sociais (Anti-Spam & Anti-Bot)
 social_like: {
 windowMs: 10 * 1000,
 maxAllowed: 15,
 message: "Você está curtindo rápido demais. Aguarde alguns segundos.",
 },
 social_comment: {
 windowMs: 30 * 1000,
 maxAllowed: 5,
 message: "Comentários temporariamente limitados para evitar spam.",
 },
 social_follow: {
 windowMs: 60 * 1000,
 maxAllowed: 10,
 message: "Limite de conexões por minuto atingido.",
 },

 // Geral
 general: {
 windowMs: 60 * 1000,
 maxAllowed: 60,
 message: "Limite de requisições excedido. Reduza a frequência de solicitações.",
 },
};

// ---------------------------------------------------------------------------
// 2. Storage em Memória (Sliding Token Bucket)
// ---------------------------------------------------------------------------

const memoryStore = new Map<string, RateLimitRecord>();

// A limpeza passiva (garbage collection) ocorre ao acessar as chaves,
// e o ciclo de vida efêmero dos Cloudflare Workers limpa o restante.
export function passiveCleanup() {
 const now = Date.now();
 for (const [key, record] of memoryStore.entries()) {
 if (now > record.resetAt && (!record.blockedUntil || now > record.blockedUntil)) {
 memoryStore.delete(key);
 }
 }
}

// ---------------------------------------------------------------------------
// 3. Extração Confiável de IP do Cliente
// ---------------------------------------------------------------------------

export function extractClientIp(req?: Request | null): string {
 if (!req) return "unknown_ip";
 return getRealClientIP(req, "127.0.0.1");
}

// ---------------------------------------------------------------------------
export function checkRateLimit(
 identifier: string,
 actionType: string = "general",
 customOptions?: Partial<RateLimitPolicy>
): RateLimitResult {
 const policy = {
 ...(RATE_LIMIT_POLICIES[actionType] || RATE_LIMIT_POLICIES.general),
 ...customOptions,
 };

 const now = Date.now();

 // Executa o garbage collection em ~10% das requisições para economizar CPU na Borda
 if (Math.random() < 0.1) {
 passiveCleanup();
 }

 const isLocalOrUnknown =
 !identifier ||
 identifier === "127.0.0.1" ||
 identifier === "localhost" ||
 identifier === "::1" ||
 identifier === "unknown" ||
 identifier === "unknown_ip";

 if (isLocalOrUnknown) {
 return {
 allowed: true,
 limit: 999,
 remaining: 999,
 resetInMs: policy.windowMs,
 retryAfterSec: 0,
 headers: {
 "X-RateLimit-Limit": "999",
 "X-RateLimit-Remaining": "999",
 "X-RateLimit-Reset": String(Math.ceil((now + policy.windowMs) / 1000)),
 },
 };
 }

 const key = `${actionType}:${identifier}`;
 const record = memoryStore.get(key);

 // 1. Caso esteja em período de lockout estendido
 if (record?.blockedUntil && now < record.blockedUntil) {
 const retryAfterSec = Math.ceil((record.blockedUntil - now) / 1000);
 return {
 allowed: false,
 limit: policy.maxAllowed,
 remaining: 0,
 resetInMs: record.blockedUntil - now,
 retryAfterSec,
 headers: {
 "X-RateLimit-Limit": String(policy.maxAllowed),
 "X-RateLimit-Remaining": "0",
 "X-RateLimit-Reset": String(Math.ceil(record.blockedUntil / 1000)),
 "Retry-After": String(retryAfterSec),
 },
 };
 }

 // 2. Primeira requisição ou janela expirada
 if (!record || now > record.resetAt) {
 const resetAt = now + policy.windowMs;
 memoryStore.set(key, { count: 1, resetAt });
 return {
 allowed: true,
 limit: policy.maxAllowed,
 remaining: Math.max(0, policy.maxAllowed - 1),
 resetInMs: policy.windowMs,
 retryAfterSec: 0,
 headers: {
 "X-RateLimit-Limit": String(policy.maxAllowed),
 "X-RateLimit-Remaining": String(Math.max(0, policy.maxAllowed - 1)),
 "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
 },
 };
 }

 // 3. Incrementa contador
 record.count += 1;

 // 4. Verificação de estouro de limite
 if (record.count > policy.maxAllowed) {
 // Se a política possuir lockout e o limite foi excedido gravemente
 if (policy.lockoutMs && record.count >= policy.maxAllowed * 2) {
 record.blockedUntil = now + policy.lockoutMs;
 }

 const resetTarget = record.blockedUntil || record.resetAt;
 const retryAfterSec = Math.ceil((resetTarget - now) / 1000);

 return {
 allowed: false,
 limit: policy.maxAllowed,
 remaining: 0,
 resetInMs: Math.max(0, resetTarget - now),
 retryAfterSec,
 headers: {
 "X-RateLimit-Limit": String(policy.maxAllowed),
 "X-RateLimit-Remaining": "0",
 "X-RateLimit-Reset": String(Math.ceil(resetTarget / 1000)),
 "Retry-After": String(retryAfterSec),
 },
 };
 }

 const remaining = Math.max(0, policy.maxAllowed - record.count);
 return {
 allowed: true,
 limit: policy.maxAllowed,
 remaining,
 resetInMs: Math.max(0, record.resetAt - now),
 retryAfterSec: 0,
 headers: {
 "X-RateLimit-Limit": String(policy.maxAllowed),
 "X-RateLimit-Remaining": String(remaining),
 "X-RateLimit-Reset": String(Math.ceil(record.resetAt / 1000)),
 },
 };
}

// ---------------------------------------------------------------------------
// 5. Enforce Rate Limit (Lança erro com tempo amigável)
// ---------------------------------------------------------------------------

export class RateLimitExceededError extends Error {
 public retryAfterSec: number;
 public policyType: string;

 constructor(message: string, retryAfterSec: number, policyType: string) {
 super(message);
 this.name = "RateLimitExceededError";
 this.retryAfterSec = retryAfterSec;
 this.policyType = policyType;
 }
}

export function enforceRateLimit(
 identifier: string,
 actionType: string = "general",
 customOptions?: Partial<RateLimitPolicy>
): RateLimitResult {
 const result = checkRateLimit(identifier, actionType, customOptions);

 if (!result.allowed) {
 const policy = {
 ...(RATE_LIMIT_POLICIES[actionType] || RATE_LIMIT_POLICIES.general),
 ...customOptions,
 };
 const timeFormatted = formatRetryAfter(result.retryAfterSec);
 const baseMessage = policy.message || "Limite de requisições excedido.";
 const fullMessage = `${baseMessage} Tente novamente em ${timeFormatted}.`;

 throw new RateLimitExceededError(fullMessage, result.retryAfterSec, actionType);
 }

 return result;
}

// ---------------------------------------------------------------------------
// 6. Helpers de Falha & Formatação
// ---------------------------------------------------------------------------

export function recordFailedAttempt(identifier: string, type = "auth_login", windowMs = 300000): void {
 const key = `${type}:${identifier}`;
 const now = Date.now();
 const record = memoryStore.get(key);

 if (!record || now > record.resetAt) {
 memoryStore.set(key, { count: 1, resetAt: now + windowMs });
 } else {
 record.count += 1;
 }
}

export function resetAttempts(identifier: string, type = "auth_login"): void {
 const key = `${type}:${identifier}`;
 memoryStore.delete(key);
}

export function formatRetryAfter(seconds?: number): string {
 if (!seconds || seconds <= 0) return "alguns instantes";
 if (seconds < 60) return `${seconds} segundo${seconds > 1 ? "s" : ""}`;
 const minutes = Math.ceil(seconds / 60);
 return `${minutes} minuto${minutes > 1 ? "s" : ""}`;
}
