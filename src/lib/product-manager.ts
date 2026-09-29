/**
 * Product Manager (PM) Autonomous Governance Engine
 * 
 * Implements stakeholder mode adaptation, lightweight vs full-format decision formats,
 * Decision Context validation (Goal, Decision, Constraint), RICE prioritization,
 * scope drift sensing (Change Sensing), and PPP reporting.
 * Reference: .agents/skills/pm/SKILL.md
 */

export type StakeholderPersona =
  | 'solo_founder'
  | 'founder_ceo'
  | 'business_stakeholder'
  | 'tech_lead'
  | 'designer'
  | 'operator'
  | 'unknown';

export type OutputMode = 'lightweight' | 'full_format';

export interface DecisionContext {
  currentGoal: string;
  recentDecision: string;
  biggestConstraint: string;
}

export interface LightweightDecisionInput {
  decision: string;
  reasons: string[];
  nextSteps: string[];
}

export interface RiceScoreInput {
  reach: number; // Users or accounts impacted
  impact: 0.5 | 1 | 2 | 3; // 0.5=low, 1=medium, 2=high, 3=massive
  confidence: 0.5 | 0.8 | 1; // 0.5=low, 0.8=medium, 1.0=high
  effort: number; // Sprints or person-weeks (> 0)
}

/**
 * Determines whether to use Lightweight Mode or Full-Format Mode based on interlocutor persona.
 */
export function determineOutputMode(persona: StakeholderPersona): OutputMode {
  switch (persona) {
    case 'solo_founder':
      return 'lightweight';
    case 'founder_ceo':
    case 'business_stakeholder':
    case 'tech_lead':
    case 'designer':
    case 'operator':
    case 'unknown':
    default:
      return 'full_format';
  }
}

/**
 * Validates the mandatory 3-item Decision Context template.
 */
export function validateDecisionContext(context?: Partial<DecisionContext>): {
  isValid: boolean;
  missingFields: string[];
} {
  const missingFields: string[] = [];
  if (!context?.currentGoal?.trim()) {
    missingFields.push('currentGoal');
  }
  if (!context?.recentDecision?.trim()) {
    missingFields.push('recentDecision');
  }
  if (!context?.biggestConstraint?.trim()) {
    missingFields.push('biggestConstraint');
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Formats an executive decision in Lightweight Mode:
 * 1-sentence conclusion -> max 3 numbered reasons -> max 2 immediate next steps.
 */
export function formatLightweightDecision(input: LightweightDecisionInput): string {
  const conclusion = input.decision.trim();
  const cappedReasons = input.reasons.slice(0, 3);
  const cappedSteps = input.nextSteps.slice(0, 2);

  const reasonsText = cappedReasons
    .map((r, i) => `(${i + 1}) ${r.trim()}`)
    .join(' ');

  const stepsText = cappedSteps
    .map((s, i) => `${i + 1}. ${s.trim()}`)
    .join(' ');

  return `Minha decisão: ${conclusion}. Motivos: ${reasonsText}. Próximos passos: ${stepsText}.`;
}

/**
 * Calculates RICE score for feature prioritization.
 * Formula: (Reach * Impact * Confidence) / Effort
 */
export function calculateRiceScore(input: RiceScoreInput): number {
  if (input.effort <= 0) {
    throw new Error('Effort must be greater than zero.');
  }

  const rawScore = (input.reach * input.impact * input.confidence) / input.effort;
  return Math.round(rawScore * 100) / 100;
}

/**
 * Detects scope drift between PRD approved requirements and actual deployed/coded features.
 */
export function detectScopeDrift(
  prdRequirements: string[],
  actualFeatures: string[]
): {
  unimplementedRequirements: string[];
  unexpectedFeatures: string[];
  alignmentScore: number;
} {
  const prdSet = new Set(prdRequirements.map((r) => r.toLowerCase().trim()));
  const actualSet = new Set(actualFeatures.map((f) => f.toLowerCase().trim()));

  const unimplementedRequirements = prdRequirements.filter(
    (r) => !actualSet.has(r.toLowerCase().trim())
  );

  const unexpectedFeatures = actualFeatures.filter(
    (f) => !prdSet.has(f.toLowerCase().trim())
  );

  const totalPoints = prdRequirements.length + actualFeatures.length;
  if (totalPoints === 0) {
    return {
      unimplementedRequirements: [],
      unexpectedFeatures: [],
      alignmentScore: 100,
    };
  }

  const mismatches = unimplementedRequirements.length + unexpectedFeatures.length;
  const alignmentScore = Math.max(
    0,
    Math.round(((totalPoints - mismatches) / totalPoints) * 100)
  );

  return {
    unimplementedRequirements,
    unexpectedFeatures,
    alignmentScore,
  };
}

/**
 * Formats a Progress, Plans, Problems (PPP) weekly executive report.
 */
export function formatPppReport(
  progress: string[],
  plans: string[],
  problems: string[]
): string {
  const p1 = progress.length > 0 ? progress.map((i) => `- ${i}`).join('\n') : '- Nenhum item';
  const p2 = plans.length > 0 ? plans.map((i) => `- ${i}`).join('\n') : '- Nenhum plano';
  const p3 = problems.length > 0 ? problems.map((i) => `- ${i}`).join('\n') : '- Nenhum problema reportado';

  return `### Relatório Semanal de Produto (PPP)

**Progresso (Progress):**
${p1}

**Planos para a Próxima Sprint (Plans):**
${p2}

**Bloqueios & Riscos (Problems):**
${p3}`;
}
