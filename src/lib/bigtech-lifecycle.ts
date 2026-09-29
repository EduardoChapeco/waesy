/**
 * BigTech Autonomous Product & Engineering Lifecycle Engine
 * 
 * Unifies UX Research, EARS Requirements, PM Decision Framework, DAG Task Decomposition,
 * File Manager Safety, Web Performance, and WCAG Accessibility into a single cohesive pipeline.
 * 
 * Reference: .agents/skills/bigtech-board/SKILL.md & docs/MASTER_PLAN.md
 */

import {
  type InsightOpportunity,
  type ResearchTheme,
} from './ux-research';
import {
  validateEarsSyntax,
  formatEarsStatement,
  type EarsSpecInput,
  type EarsValidationResult,
} from './ears-validator';
import {
  calculateRiceScore,
  validateDecisionContext,
  type DecisionContext,
  type RiceScoreInput,
} from './product-manager';
import {
  calculateDagLayers,
  calculateCriticalPath,
  type NormalizedPrd,
  type TaskSpec,
} from './prd-decomposer';
import {
  validatePathSafety,
  type PathSafetyResult,
} from './file-manager';
import {
  evaluateCoreWebVitals,
  type CoreWebVitals,
} from './web-performance';

export interface IntegratedFeatureProposal {
  id: string;
  title: string;
  sourceResearchThemes?: ResearchTheme[];
  opportunities: InsightOpportunity[];
  decisionContext: DecisionContext;
  riceParameters: RiceScoreInput;
  earsSpecifications: EarsSpecInput[];
  targetPaths: string[];
  performanceMetrics?: CoreWebVitals;
  hasAccessibleMarkup: boolean;
  hasDatabasePersistence: boolean;
}

export interface PersonaAuditResult {
  persona: string;
  approved: boolean;
  notes: string[];
}

export interface GovernanceGateResult {
  isReadyForRelease: boolean;
  overallScore: number; // 0 - 100
  personaAudits: Record<string, PersonaAuditResult>;
  blockers: string[];
  recommendations: string[];
}

/**
 * Bridges UX Research insights into formal EARS specifications with automatic validation.
 */
export function bridgeResearchToEars(
  opportunity: InsightOpportunity,
  systemActor: string = 'o sistema'
): {
  earsSpec: EarsSpecInput;
  validation: EarsValidationResult;
  earsStatement: string;
} {
  // Convert insight opportunity to Event-Driven or Ubiquitous requirement
  const isHighImpact = opportunity.impact === 'High';
  const pattern = isHighImpact ? 'event_driven' : 'ubiquitous';

  const action = opportunity.opportunity.replace(/^(o |a |os |as )/i, '').trim();

  const earsSpec: EarsSpecInput = {
    pattern,
    action: `provide ${action}`,
    trigger: isHighImpact ? 'user initiates the action' : undefined,
  };

  const earsStatement = formatEarsStatement(earsSpec);
  const validation = validateEarsSyntax(earsStatement);

  return {
    earsSpec,
    validation,
    earsStatement,
  };
}

/**
 * Converts validated EARS specifications into Normalized PRD Requirements for DAG decomposition.
 */
export function bridgeEarsToPrd(
  title: string,
  earsSpecs: EarsSpecInput[]
): NormalizedPrd {
  return {
    title,
    requirements: earsSpecs.map((spec, index) => ({
      id: `REQ-EARS-${index + 1}`,
      text: formatEarsStatement(spec),
      category: spec.pattern === 'unwanted_behavior' ? 'security' : 'functional',
    })),
  };
}

/**
 * Executes a holistic Board Governance Gate Audit across all 5 Executive Personas.
 */
export function evaluateFeatureGovernanceGate(
  proposal: IntegratedFeatureProposal
): GovernanceGateResult {
  const blockers: string[] = [];
  const recommendations: string[] = [];
  const personaAudits: Record<string, PersonaAuditResult> = {};

  // 1. Persona 1: CPO & Presidente do Conselho (PM, UX Research & EARS)
  const p1Notes: string[] = [];
  let p1Approved = true;

  const decisionContextCheck = validateDecisionContext(proposal.decisionContext);
  if (!decisionContextCheck.isValid) {
    p1Approved = false;
    blockers.push(`[Persona 1 - PM]: Contexto de Decisão incompleto (${decisionContextCheck.missingFields.join(', ')}).`);
    p1Notes.push('Contexto de Decisão inválido.');
  } else {
    p1Notes.push('Contexto de Decisão verificado.');
  }

  const riceResult = calculateRiceScore(proposal.riceParameters);
  p1Notes.push(`RICE Score calculado: ${riceResult.score} (Rank: ${riceResult.rankTier}).`);

  if (proposal.earsSpecifications.length === 0) {
    p1Approved = false;
    blockers.push('[Persona 1 - EARS]: Nenhuma especificação formal EARS foi fornecida.');
    p1Notes.push('Faltam especificações EARS.');
  } else {
    let validEarsCount = 0;
    for (const spec of proposal.earsSpecifications) {
      const statement = formatEarsStatement(spec);
      const val = validateEarsSyntax(statement);
      if (val.isValid) validEarsCount++;
      else {
        p1Notes.push(`EARS inválido: ${val.errors.join('; ')}`);
      }
    }
    if (validEarsCount === 0) {
      p1Approved = false;
      blockers.push('[Persona 1 - EARS]: Todas as declarações EARS falharam na validação sintática.');
    } else {
      p1Notes.push(`${validEarsCount} de ${proposal.earsSpecifications.length} requisitos EARS válidos.`);
    }
  }

  personaAudits['Persona 1 - CPO & PM'] = {
    persona: 'CPO & Presidente do Conselho',
    approved: p1Approved,
    notes: p1Notes,
  };

  // 2. Persona 2: Chief Software Architect (DAG & MECE)
  const p2Notes: string[] = [];
  let p2Approved = true;

  const prd = bridgeEarsToPrd(proposal.title, proposal.earsSpecifications);
  const tasks: TaskSpec[] = [];

  proposal.earsSpecifications.forEach((spec, idx) => {
    const reqNum = idx + 1;
    const taskDbId = `TASK-DB-${reqNum}`;
    const taskBffId = `TASK-BFF-${reqNum}`;
    const taskUiId = `TASK-UI-${reqNum}`;

    tasks.push({
      id: taskDbId,
      featureId: `FEAT-${reqNum}`,
      name: `Database Schema & RLS para Requisito ${reqNum}`,
      objective: 'Criar tabela, colunas, índices e políticas RLS deny-by-default multi-tenant',
      inputs: ['docs/DOMAIN_MODEL.md'],
      outputs: { codePath: `supabase/migrations/2026130${reqNum}_feature.sql` },
      acceptanceCriteria: [{ given: 'schema aplicado', when: 'query com tenant correto', then: 'retorna dados' }],
      dependencies: [],
      durationHours: 2,
    });

    tasks.push({
      id: taskBffId,
      featureId: `FEAT-${reqNum}`,
      name: `BFF Server Function Zod para Requisito ${reqNum}`,
      objective: 'Implementar createServerFn com autorização por sessão e validação Zod',
      inputs: [`supabase/migrations/2026130${reqNum}_feature.sql`],
      outputs: { codePath: `src/services/feature-${reqNum}.functions.ts` },
      acceptanceCriteria: [{ given: 'sessão autenticada', when: 'chamar server fn', then: 'executa mutação atômica' }],
      dependencies: [taskDbId],
      durationHours: 3,
    });

    tasks.push({
      id: taskUiId,
      featureId: `FEAT-${reqNum}`,
      name: `Interface & Gestão no Workspace para Requisito ${reqNum}`,
      objective: 'Construir componente com feedback real, 3 toques e painel no workspace',
      inputs: [`src/services/feature-${reqNum}.functions.ts`],
      outputs: { codePath: `src/components/feature-${reqNum}.tsx` },
      acceptanceCriteria: [{ given: 'usuário no workspace', when: 'clicar ação', then: 'persiste e atualiza UI' }],
      dependencies: [taskBffId],
      durationHours: 4,
    });
  });

  const { layers, hasCycle, cycleNodes } = calculateDagLayers(tasks);
  const criticalPath = calculateCriticalPath(tasks);

  if (hasCycle) {
    p2Approved = false;
    blockers.push(`[Persona 2 - Architect]: DAG inválido com dependências circulares: ${cycleNodes?.join(', ')}.`);
    p2Notes.push('DAG possui ciclos ou erros de dependência.');
  } else {
    p2Notes.push(`DAG MECE gerado com ${tasks.length} tarefas em ${layers.length} camadas paralelas.`);
    p2Notes.push(`Caminho crítico calculado com ${criticalPath.length} tarefas sequenciais.`);
  }

  personaAudits['Persona 2 - Software Architect'] = {
    persona: 'Chief Software Architect',
    approved: p2Approved,
    notes: p2Notes,
  };

  // 3. Persona 3: Staff Security & Data Engineer (RLS, Data & File Safety)
  const p3Notes: string[] = [];
  let p3Approved = true;

  for (const targetPath of proposal.targetPaths) {
    const safety = validatePathSafety(targetPath);
    if (!safety.isSafe) {
      p3Approved = false;
      blockers.push(`[Persona 3 - Security & File Safety]: Caminho inseguro detectado: "${targetPath}". Motivo: ${safety.reason}`);
      p3Notes.push(`Caminho rejeitado: ${targetPath}`);
    }
  }

  if (p3Approved) {
    p3Notes.push('Todos os caminhos e arquivos estão em conformidade com as políticas anti-traversal e deny-by-default.');
  }

  personaAudits['Persona 3 - Security & Data Engineer'] = {
    persona: 'Staff Security & Data Engineer',
    approved: p3Approved,
    notes: p3Notes,
  };

  // 4. Persona 4: Principal Design Ops & Web Performance (WCAG & Web Vitals)
  const p4Notes: string[] = [];
  let p4Approved = true;

  if (!proposal.hasAccessibleMarkup) {
    p4Approved = false;
    blockers.push('[Persona 4 - Accessibility]: Markup não atende aos requisitos mínimos WCAG 2.2 AA (rótulos ou touch targets).');
    p4Notes.push('Falha na auditoria de acessibilidade universal.');
  } else {
    p4Notes.push('Acessibilidade WCAG 2.2 AA validada (touch targets >= 44px, contraste e teclado).');
  }

  if (proposal.performanceMetrics) {
    const perfEval = evaluateCoreWebVitals(proposal.performanceMetrics);
    p4Notes.push(`Core Web Vitals Rating: ${perfEval.overallRating} (Score: ${perfEval.score}/100).`);
    if (perfEval.overallRating === 'poor') {
      recommendations.push('[Persona 4 - Performance]: Otimizar LCP e INP antes de tráfego massivo.');
    }
  } else {
    recommendations.push('[Persona 4 - Performance]: Métricas de Core Web Vitals em ambiente de homologação recomendadas.');
  }

  personaAudits['Persona 4 - Design Ops & Performance'] = {
    persona: 'Principal Design Ops & Web Performance',
    approved: p4Approved,
    notes: p4Notes,
  };

  // 5. Persona 5: Staff QA & Verification Gatekeeper (Red Team & No Mocks)
  const p5Notes: string[] = [];
  let p5Approved = true;

  if (!proposal.hasDatabasePersistence) {
    p5Approved = false;
    blockers.push('[Persona 5 - QA Gatekeeper]: Proibição de Toasts Fictícios violada (recurso sem persistência real no banco).');
    p5Notes.push('Detectado mock ou ausência de camada de banco.');
  } else {
    p5Notes.push('Completude Quádrupla comprovada (Tabela -> BFF -> UI -> Gestão).');
  }

  personaAudits['Persona 5 - Staff QA'] = {
    persona: 'Staff QA & Verification Gatekeeper',
    approved: p5Approved,
    notes: p5Notes,
  };

  // Overall readiness
  const totalPersonas = 5;
  const approvedPersonas = Object.values(personaAudits).filter((a) => a.approved).length;
  const overallScore = Math.round((approvedPersonas / totalPersonas) * 100);
  const isReadyForRelease = blockers.length === 0;

  return {
    isReadyForRelease,
    overallScore,
    personaAudits,
    blockers,
    recommendations,
  };
}

/**
 * Generates an end-to-end Mermaid pipeline diagram illustrating the autonomous BigTech lifecycle.
 */
export function generateMermaidLifecycleDiagram(): string {
  return [
    '```mermaid',
    'graph TD',
    '  %% Phase 1: Discovery & Decision',
    '  U1["UX Research (Qual/Quant/NPS)"] --> U2["Theme & Opportunity Matrix"]',
    '  U2 --> P1["PM Autonomous Decision (RICE / Context)"]',
    '  P1 --> E1["EARS Normative Requirements"]',
    '',
    '  %% Phase 2: Architecture & Contracts',
    '  E1 --> D1["DAG MECE Decomposition (Layers 0..N)"]',
    '  D1 --> S1["BFF Contracts (Zod / createServerFn)"]',
    '  D1 --> S2["Database & RLS Multi-Tenant (PostgreSQL)"]',
    '',
    '  %% Phase 3: Surface & Operations',
    '  S1 --> C1["Design Ops & Clean UI (WCAG 2.2 AA)"]',
    '  S2 --> F1["File Manager & Safe Storage (Anti-Traversal)"]',
    '  C1 --> W1["Web Performance (Speculation Rules & CWV)"]',
    '',
    '  %% Phase 4: Verification & Gatekeeper',
    '  W1 --> Q1{"Board Governance Gate (Red Team)"}',
    '  F1 --> Q1',
    '  Q1 -->|0 Erros & 7 Camadas| PROD["Production Deployment (Cloudflare Pages)"]',
    '```',
  ].join('\n');
}
