/**
 * EARS (Easy Approach to Requirements Syntax) Validator & Engine
 * 
 * Implements formal syntactic classification, parsing, and quality checks
 * for requirement statements following the EARS methodology and BigTech standards.
 * Reference: .agents/skills/prompt-optimizer/SKILL.md
 */

export type EarsPatternType =
  | 'ubiquitous'
  | 'event_driven'
  | 'state_driven'
  | 'optional'
  | 'unwanted_behavior'
  | 'complex'
  | 'invalid';

export interface EarsValidationResult {
  isValid: boolean;
  pattern: EarsPatternType;
  errors: string[];
  vagueTermsFound: string[];
  normalizedStatement?: string;
}

export interface EarsSpecInput {
  pattern: EarsPatternType;
  action: string;
  trigger?: string;
  state?: string;
  condition?: string;
  prevention?: string;
  recovery?: string;
}

const VAGUE_TERMS = [
  'fácil',
  'facil',
  'rápido',
  'rapido',
  'intuitivo',
  'amigável',
  'amigavel',
  'moderno',
  'ótimo',
  'otimo',
  'perfeito',
  'simples',
  'adequado',
  'suficiente',
  'eficiente',
  'robusto',
  'bonito',
  'limpo',
  'user-friendly',
  'fast',
  'clean',
  'nice',
  'simple',
  'intuitive',
];

/**
 * Detects prohibited subjective or unquantified adjectives in requirements.
 */
export function detectVagueTerms(text: string): string[] {
  if (!text) return [];
  const normalized = text.toLowerCase();
  const found: string[] = [];

  for (const term of VAGUE_TERMS) {
    // Regex word boundary matching
    const regex = new RegExp(`\\b${term}\\b`, 'i');
    if (regex.test(normalized)) {
      found.push(term);
    }
  }

  return found;
}

/**
 * Classifies an EARS requirement string into its formal canonical pattern.
 */
export function classifyEarsPattern(statement: string): EarsPatternType {
  if (!statement || typeof statement !== 'string') return 'invalid';
  const clean = statement.trim();
  const lower = clean.toLowerCase();

  // Comportamento Indesejado (prevenção / erro)
  if (
    (lower.startsWith('if ') || lower.startsWith('quando ') || lower.startsWith('se ')) &&
    (lower.includes('shall prevent') ||
      lower.includes('shall reject') ||
      lower.includes('shall block') ||
      lower.includes('deverá bloquear') ||
      lower.includes('deve impedir') ||
      lower.includes('deverá impedir') ||
      lower.includes('deve rejeitar'))
  ) {
    return 'unwanted_behavior';
  }

  // Complexo (múltiplas cláusulas: While ... When ... shall ...)
  if (
    (lower.startsWith('while ') || lower.startsWith('enquanto ')) &&
    (lower.includes('when ') || lower.includes('quando ') || lower.includes('if ') || lower.includes('se ')) &&
    (lower.includes('shall') || lower.includes('deve') || lower.includes('deverá'))
  ) {
    return 'complex';
  }

  // Impulsionado por Estado (State-driven)
  if (
    (lower.startsWith('while ') || lower.startsWith('enquanto ')) &&
    (lower.includes('shall') || lower.includes('deve') || lower.includes('deverá'))
  ) {
    return 'state_driven';
  }

  // Orientado a Eventos (Event-driven)
  if (
    (lower.startsWith('when ') || lower.startsWith('quando ') || lower.startsWith('ao ')) &&
    (lower.includes('shall') || lower.includes('deve') || lower.includes('deverá'))
  ) {
    return 'event_driven';
  }

  // Opcional / Condicional
  if (
    (lower.startsWith('if ') ||
      lower.startsWith('se ') ||
      lower.startsWith('where ') ||
      lower.startsWith('onde ')) &&
    (lower.includes('shall') || lower.includes('deve') || lower.includes('deverá'))
  ) {
    return 'optional';
  }

  // Ubíquo (Invariante / Geral)
  if (
    (lower.startsWith('the system shall') ||
      lower.startsWith('o sistema deverá') ||
      lower.startsWith('o sistema deve')) &&
    !lower.startsWith('when') &&
    !lower.startsWith('while') &&
    !lower.startsWith('if')
  ) {
    return 'ubiquitous';
  }

  return 'invalid';
}

/**
 * Validates syntax, mandatory keywords, and language cleanliness of an EARS statement.
 */
export function validateEarsSyntax(statement: string): EarsValidationResult {
  const errors: string[] = [];
  if (!statement || typeof statement !== 'string' || statement.trim().length === 0) {
    return {
      isValid: false,
      pattern: 'invalid',
      errors: ['Declaração vazia ou não textual.'],
      vagueTermsFound: [],
    };
  }

  const clean = statement.trim();
  const pattern = classifyEarsPattern(clean);
  const vagueTerms = detectVagueTerms(clean);

  if (vagueTerms.length > 0) {
    errors.push(
      `Termos vagos ou não mensuráveis detectados: "${vagueTerms.join(
        '", "'
      )}". Substitua por critérios quantificados ou limites explícitos.`
    );
  }

  if (pattern === 'invalid') {
    errors.push(
      'A declaração não corresponde a nenhum dos 5 padrões canônicos do EARS (Ubíquo, Event-driven, State-driven, Condicional ou Comportamento Indesejado).'
    );
  }

  const hasShallOrDeve =
    /\b(shall|deverá|deve|devem)\b/i.test(clean);

  if (!hasShallOrDeve) {
    errors.push(
      'Ausência de verbo imperativo normativo canônico ("shall", "deverá" ou "deve").'
    );
  }

  return {
    isValid: errors.length === 0,
    pattern,
    errors,
    vagueTermsFound: vagueTerms,
    normalizedStatement: clean,
  };
}

/**
 * Formats a structured EARS object into a canonical normative string.
 */
export function formatEarsStatement(input: EarsSpecInput): string {
  const action = input.action.trim();

  switch (input.pattern) {
    case 'ubiquitous':
      return `The system shall ${action}.`;
    case 'event_driven':
      return `When ${input.trigger?.trim() || 'event occurs'}, the system shall ${action}.`;
    case 'state_driven':
      return `While ${input.state?.trim() || 'in state'}, the system shall ${action}.`;
    case 'optional':
      return `If ${input.condition?.trim() || 'condition is met'}, the system shall ${action}.`;
    case 'unwanted_behavior': {
      const prev = input.prevention ? ` prevent ${input.prevention.trim()}` : '';
      const rec = input.recovery ? ` AND ${input.recovery.trim()}` : '';
      return `If ${input.condition?.trim() || 'failure occurs'}, the system shall${prev}${rec}.`;
    }
    case 'complex':
      return `While ${input.state?.trim() || 'active'}, when ${input.trigger?.trim() || 'triggered'}, the system shall ${action}.`;
    default:
      return `The system shall ${action}.`;
  }
}
