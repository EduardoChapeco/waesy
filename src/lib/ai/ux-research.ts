/**
 * UX Research Synthesis & Empirical Insights Engine
 * 
 * Implements qualitative and quantitative research synthesis, strict observation vs
 * interpretation validation, NPS calculation, and canonical research reporting.
 * Reference: .agents/skills/ux-research-synthesis/SKILL.md
 */

export interface ParticipantQuote {
  participantId: string; // e.g. "P1", "P4"
  quote: string;
}

export interface ResearchTheme {
  id: string;
  name: string;
  prevalence: {
    count: number;
    total: number;
    percentage: number;
  };
  summary: string;
  quotes: ParticipantQuote[];
  productImplication: string;
}

export interface InsightOpportunity {
  insight: string;
  opportunity: string;
  impact: 'High' | 'Med' | 'Low';
  effort: 'High' | 'Med' | 'Low';
}

export interface UserSegment {
  name: string;
  characteristics: string;
  needs: string;
  estimatedSizePercentage: number;
}

export interface ResearchSynthesisReport {
  studyName: string;
  method: string;
  participantsCount: number;
  dateRange: string;
  researcher: string;
  executiveSummary: string;
  themes: ResearchTheme[];
  insightsOpportunities: InsightOpportunity[];
  userSegments: UserSegment[];
  recommendations: Array<{
    priority: 'High' | 'Medium' | 'Low';
    action: string;
    rationale: string;
  }>;
  futureQuestions: string[];
  methodologyNotes: string;
}

/**
 * Validates the strict scientific separation between observable facts and analytical interpretations.
 */
export function validateObservationVsInterpretation(
  observation: string,
  interpretation: string
): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!observation || observation.trim().length === 0) {
    errors.push('Observação não pode ser vazia.');
  }

  if (!interpretation || interpretation.trim().length === 0) {
    errors.push('Interpretação não pode ser vazia.');
  }

  const vagueQualifiers = ['a maioria', 'muitos', 'alguns', 'vários', 'poucos'];
  const lowerObs = (observation || '').toLowerCase();

  for (const q of vagueQualifiers) {
    if (lowerObs.includes(q)) {
      errors.push(
        `Observação contém qualificador subjetivo proibido: "${q}". Utilize números exatos (ex: "6 de 8 participantes").`
      );
    }
  }

  // Check if observation contains speculative language
  const speculativeWords = ['talvez', 'provavelmente', 'achamos', 'parece que', 'sentiram que'];
  for (const s of speculativeWords) {
    if (lowerObs.includes(s)) {
      errors.push(
        `Observação contém termo especulativo: "${s}". Fatos observados devem registrar ações/falas literais, não suposições.`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Calculates Net Promoter Score (NPS) from array of ratings (0 to 10).
 * Formula: % Promoters (9-10) - % Detractors (0-6)
 */
export function calculateNps(scores: number[]): {
  nps: number;
  promoters: number;
  passives: number;
  detractors: number;
  total: number;
} {
  if (!scores || scores.length === 0) {
    return { nps: 0, promoters: 0, passives: 0, detractors: 0, total: 0 };
  }

  let promoters = 0;
  let passives = 0;
  let detractors = 0;

  for (const score of scores) {
    if (score >= 9) promoters++;
    else if (score >= 7) passives++;
    else detractors++;
  }

  const total = scores.length;
  const promoterPct = (promoters / total) * 100;
  const detractorPct = (detractors / total) * 100;
  const nps = Math.round(promoterPct - detractorPct);

  return {
    nps,
    promoters,
    passives,
    detractors,
    total,
  };
}

/**
 * Filters opportunities that offer High Impact with Low or Medium Effort (Quick Wins & Strategic Bets).
 */
export function filterHighImpactOpportunities(
  opportunities: InsightOpportunity[]
): InsightOpportunity[] {
  return opportunities.filter(
    (o) => o.impact === 'High' && (o.effort === 'Low' || o.effort === 'Med')
  );
}

/**
 * Formats a complete structured research synthesis report in canonical Markdown.
 */
export function formatResearchSynthesisReport(report: ResearchSynthesisReport): string {
  const lines: string[] = [
    `## Research Synthesis: ${report.studyName}`,
    `**Method:** ${report.method} | **Participants:** ${report.participantsCount}`,
    `**Date:** ${report.dateRange} | **Researcher:** ${report.researcher}`,
    '',
    '### Executive Summary',
    report.executiveSummary,
    '',
    '### Key Themes',
    '',
  ];

  for (const theme of report.themes) {
    lines.push(`#### Theme: ${theme.name}`);
    lines.push(
      `**Prevalence:** ${theme.prevalence.count} of ${theme.prevalence.total} participants (${theme.prevalence.percentage}%)`
    );
    lines.push(`**Summary:** ${theme.summary}`);
    lines.push('**Supporting Evidence:**');
    for (const q of theme.quotes) {
      lines.push(`- "${q.quote}" — ${q.participantId}`);
    }
    lines.push(`**Implication:** ${theme.productImplication}`);
    lines.push('');
  }

  lines.push('### Insights → Opportunities');
  lines.push('');
  lines.push('| Insight | Opportunity | Impact | Effort |');
  lines.push('|---------|-------------|--------|--------|');
  for (const io of report.insightsOpportunities) {
    lines.push(`| ${io.insight} | ${io.opportunity} | ${io.impact} | ${io.effort} |`);
  }
  lines.push('');

  lines.push('### User Segments Identified');
  lines.push('');
  lines.push('| Segment | Characteristics | Needs | Size |');
  lines.push('|---------|----------------|-------|------|');
  for (const seg of report.userSegments) {
    lines.push(`| ${seg.name} | ${seg.characteristics} | ${seg.needs} | ~${seg.estimatedSizePercentage}% |`);
  }
  lines.push('');

  lines.push('### Recommendations');
  for (const rec of report.recommendations) {
    lines.push(`- **[${rec.priority}]** ${rec.action} — ${rec.rationale}`);
  }
  lines.push('');

  if (report.futureQuestions.length > 0) {
    lines.push('### Questions for Further Research');
    for (const q of report.futureQuestions) {
      lines.push(`- ${q}`);
    }
    lines.push('');
  }

  lines.push('### Methodology Notes');
  lines.push(report.methodologyNotes);

  return lines.join('\n');
}
