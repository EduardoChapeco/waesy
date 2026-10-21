/**
 * quality-gate.ts — Detector Determinístico de Resposta Vazia & Fallback de Modelos
 * Impede respostas vazias, truncadas ou de baixa qualidade e governa o failover entre provedores de IA.
 */

export interface QualityCheckResult {
  passed: boolean;
  reason?: string;
  wordCount: number;
  characterCount: number;
}

/**
 * Padrões que indicam resposta vazia, recusada ou alucinação curta degenerada
 */
const DEGENERATE_PATTERNS = [
  /^\{\s*\}$/,
  /^\[\s*\]$/,
  /^null$/i,
  /^undefined$/i,
  /^como posso te ajudar\??$/i,
  /^olá, como posso ajudar\??$/i,
  /^i cannot help with that\.?$/i,
  /^desculpe, não posso ajudar com isso\.?$/i,
];

/**
 * Avalia de forma determinística a resposta gerada antes de entregar ao usuário
 */
export function evaluateAiResponseQuality(
  response: string,
  options?: {
    minChars?: number;
    minWords?: number;
    allowShortAcknowledgement?: boolean;
  }
): QualityCheckResult {
  const minChars = options?.minChars ?? 8;
  const minWords = options?.minWords ?? 2;
  const trimmed = (response || "").trim();
  const charCount = trimmed.length;
  const words = trimmed ? trimmed.split(/\s+/) : [];
  const wordCount = words.length;

  if (charCount === 0) {
    return {
      passed: false,
      reason: "Resposta completamente vazia (0 caracteres)",
      wordCount: 0,
      characterCount: 0,
    };
  }

  if (!options?.allowShortAcknowledgement && (charCount < minChars || wordCount < minWords)) {
    return {
      passed: false,
      reason: `Resposta abaixo do tamanho mínimo aceitável (${charCount} chars, ${wordCount} words)`,
      wordCount,
      characterCount: charCount,
    };
  }

  for (const pattern of DEGENERATE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        passed: false,
        reason: `Resposta corresponde a padrão degenerado / vazio: ${trimmed}`,
        wordCount,
        characterCount: charCount,
      };
    }
  }

  return {
    passed: true,
    wordCount,
    characterCount: charCount,
  };
}

export interface ModelProviderExecutionPlan<T> {
  providerName: string;
  execute: () => Promise<T>;
}

/**
 * Executa uma operação com plano de failover automático entre múltiplos provedores/modelos
 */
export async function executeWithModelFallback<T extends { text?: string } | string>(
  providers: ModelProviderExecutionPlan<T>[],
  validator?: (result: T) => boolean
): Promise<{ result: T; usedProvider: string; attempts: number }> {
  let lastError: any = null;
  let attempts = 0;

  for (const provider of providers) {
    attempts++;
    try {
      const output = await provider.execute();
      const textToValidate = typeof output === "string" ? output : (output as any)?.text ?? "";

      const quality = evaluateAiResponseQuality(textToValidate);
      const customValid = validator ? validator(output) : true;

      if (quality.passed && customValid) {
        return {
          result: output,
          usedProvider: provider.providerName,
          attempts,
        };
      }

      console.warn(`[ModelRouter] Provedor ${provider.providerName} rejeitado pelo Quality Gate: ${quality.reason}. Tentando próximo...`);
    } catch (err: any) {
      lastError = err;
      console.warn(`[ModelRouter] Provedor ${provider.providerName} falhou: ${err?.message || err}. Tentando próximo...`);
    }
  }

  throw new Error(`Todos os provedores de IA falharam após ${attempts} tentativas. Último erro: ${lastError?.message || "Sem resposta válida"}`);
}
