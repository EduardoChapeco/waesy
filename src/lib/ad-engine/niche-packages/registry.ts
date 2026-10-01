/**
 * registry.ts — Registro Central de Pacotes de Nicho e Validador em Runtime (G10, G18)
 * 
 * Regra G18: Nenhum nicho com código de outro nicho.
 * Todos os pacotes são validados estritamente contra o Zod schema na inicialização.
 */

import { TURISMO_NICHE_PACKAGE } from './turismo';
import { VAREJO_NICHE_PACKAGE } from './varejo';
import { MERCADO_NICHE_PACKAGE } from './mercado';
import { SERVICOS_NICHE_PACKAGE } from './servicos';
import { IMOVEIS_NICHE_PACKAGE } from './imoveis';
import { VEICULOS_NICHE_PACKAGE } from './veiculos';
import { DIGITAL_NICHE_PACKAGE } from './digital';
import {
  NicheId,
  NichePackage,
  CanonicalArchetypeId,
  nichePackageSchema,
} from './types';

// Validação dos pacotes canônicos na compilação do registro
const RAW_PACKAGES: Record<string, NichePackage> = {
  turismo: TURISMO_NICHE_PACKAGE,
  varejo: VAREJO_NICHE_PACKAGE,
  mercado: MERCADO_NICHE_PACKAGE,
  servicos: SERVICOS_NICHE_PACKAGE,
  imoveis: IMOVEIS_NICHE_PACKAGE,
  veiculos: VEICULOS_NICHE_PACKAGE,
  digital: DIGITAL_NICHE_PACKAGE,
};

// Validação estrita Zod em tempo de carregamento
const VALIDATED_REGISTRY = new Map<NicheId, NichePackage>();

for (const [key, pkg] of Object.entries(RAW_PACKAGES)) {
  const result = nichePackageSchema.safeParse(pkg);
  if (!result.success) {
    const errorDetails = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
    throw new Error(`[NICHE_REGISTRY_ERROR] Pacote de nicho inválido "${key}": ${errorDetails}`);
  }
  VALIDATED_REGISTRY.set(key as NicheId, result.data as NichePackage);
}

/**
 * Obtém o pacote canônico de um nicho específico
 */
export function getNichePackage(nicheId: NicheId | string): NichePackage {
  const pkg = VALIDATED_REGISTRY.get(nicheId as NicheId);
  if (!pkg) {
    // Fallback seguro para o pacote canônico de varejo geral
    return VALIDATED_REGISTRY.get('varejo')!;
  }
  return pkg;
}

/**
 * Lista todos os pacotes de nicho registrados e homologados
 */
export function listAllNichePackages(): NichePackage[] {
  return Array.from(VALIDATED_REGISTRY.values());
}

/**
 * Verifica se um arquétipo é permitido em um determinado nicho
 */
export function isArchetypeAllowedForNiche(
  nicheId: NicheId | string,
  archetypeId: CanonicalArchetypeId
): boolean {
  const pkg = getNichePackage(nicheId);
  const status = pkg.allowedArchetypes[archetypeId];
  return status === 'enabled' || status === 'optional';
}

/**
 * Retorna a lista de arquétipos habilitados para um determinado nicho
 */
export function getEnabledArchetypesForNiche(nicheId: NicheId | string): CanonicalArchetypeId[] {
  const pkg = getNichePackage(nicheId);
  return (Object.keys(pkg.allowedArchetypes) as CanonicalArchetypeId[]).filter(
    (arch) => pkg.allowedArchetypes[arch] === 'enabled' || pkg.allowedArchetypes[arch] === 'optional'
  );
}

/**
 * Valida se um conjunto de atributos respeita as regras do nicho e oculta campos internos (G24)
 */
export function sanitizeNicheAttributesForPublic(
  nicheId: NicheId | string,
  rawAttributes: Record<string, unknown>
): Record<string, unknown> {
  const pkg = getNichePackage(nicheId);
  const internalKeys = new Set(
    pkg.attributes.filter((a) => a.isInternalOnly).map((a) => a.key)
  );

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rawAttributes)) {
    // Proibido vazar campo com isInternalOnly ou sufixo interno
    if (
      !internalKeys.has(key) &&
      !key.endsWith('_internal') &&
      !key.endsWith('_cost_cents') &&
      !key.includes('margin')
    ) {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
