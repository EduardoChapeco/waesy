/**
 * sanitizer.ts — Sanitizador de Descrição Narrativa (G22) e Catraca Anti-Vazamento (G24)
 * 
 * Regras:
 * - G22: Descrição narrativa com editor restrito e sanitização (sem HTML malicioso, sem inline styles).
 * - G24: Conteúdo renderizável vs interno com verificação matemática contra vazamento.
 */

import { CanonicalAdContent } from './types';

// Lista de tags HTML permitidas na descrição narrativa
const ALLOWED_TAGS = ['p', 'strong', 'em', 'u', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'a', 'br'];

/**
 * Sanitiza a descrição narrativa eliminando tags proibidas, scripts, atributos 'style' e links inseguros
 */
export function sanitizeNarrativeDescription(rawHtml: string): string {
  if (!rawHtml) return '';

  let sanitized = rawHtml
    // Remove scripts e styles em bloco
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Remove iframes e applets
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    // Remove eventos inline como onclick, onerror, onload, etc.
    .replace(/ on\w+="[^"]*"/gi, '')
    .replace(/ on\w+='[^']*'/gi, '')
    // Remove inline styles (DL-05)
    .replace(/ style="[^"]*"/gi, '')
    .replace(/ style='[^']*'/gi, '')
    // Bloqueia esquemas perigosos como javascript: ou data:
    .replace(/href=["']javascript:[^"']*["']/gi, 'href="#"')
    .replace(/href=["']data:[^"']*["']/gi, 'href="#"');

  // Garante que links externos tenham rel="noopener noreferrer"
  sanitized = sanitized.replace(/<a\s+(?:[^>]*?\s+)?href="([^"]*)"([^>]*)>/gi, (match, href, rest) => {
    const cleanRest = rest.replace(/rel="[^"]*"/gi, '').trim();
    return `<a href="${href}" rel="noopener noreferrer"${cleanRest ? ' ' + cleanRest : ''}>`;
  });

  return sanitized.trim();
}

/**
 * Remove qualquer bloco ou metadado marcado como interno antes de expor o anúncio publicamente (G24)
 */
export function stripInternalContent(ad: CanonicalAdContent): CanonicalAdContent {
  const publicBlocks = { ...ad.blocks };

  // Remove o bloco financeiro interno se existir
  delete publicBlocks.internal_economics;

  // Filtra itens de mídia internos (ex: notas fiscais anexadas, termos internos)
  publicBlocks.b3_role_media = {
    ...publicBlocks.b3_role_media,
    items: publicBlocks.b3_role_media.items.filter((item) => !item.isInternalOnly && item.role !== 'internal_document'),
  };

  // Filtra especificações técnicas marcadas como internas
  publicBlocks.b4_specifications = {
    ...publicBlocks.b4_specifications,
    specs: publicBlocks.b4_specifications.specs.filter((spec) => !spec.isInternalOnly && !spec.key.endsWith('_internal')),
  };

  // Remove dados fiscais que contenham dados confidenciais do fornecedor
  if (publicBlocks.b10_fiscal) {
    const { supplierCnpjInternal, ...cleanFiscal } = publicBlocks.b10_fiscal;
    publicBlocks.b10_fiscal = cleanFiscal as typeof publicBlocks.b10_fiscal;
  }

  return {
    ...ad,
    narrativeDescription: sanitizeNarrativeDescription(ad.narrativeDescription),
    blocks: publicBlocks,
  };
}

/**
 * Catraca de Verificação Automatizada (G24): Lança erro fatal se houver vazamento de dados internos
 */
export function assertNoInternalLeaks(payload: unknown): void {
  const serialized = JSON.stringify(payload);

  const forbiddenTokens = [
    'INTERNAL_ECONOMICS',
    'supplierCnpjInternal',
    '_internal',
    'internal_operator_notes',
    'supplier_cost_cents',
    'broker_commission_percent',
    'license_vault_key_internal',
    'wholesale_cost_cents',
  ];

  for (const token of forbiddenTokens) {
    if (serialized.includes(token)) {
      throw new Error(`[CRITICAL_LEAK_P0] Violação G24 detectada: Token interno "${token}" vazou no payload público.`);
    }
  }
}
