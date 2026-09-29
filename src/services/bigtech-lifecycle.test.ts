import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  bridgeResearchToEars,
  bridgeEarsToPrd,
  evaluateFeatureGovernanceGate,
  generateMermaidLifecycleDiagram,
  type IntegratedFeatureProposal,
} from '@/lib/bigtech-lifecycle';

describe('BigTech Autonomous Product & Engineering Lifecycle Engine', () => {
  describe('UX Research to EARS Requirements Bridge', () => {
    it('converts a high-impact research opportunity into an event-driven EARS requirement', () => {
      const opportunity = {
        insight: 'Lojistas gastam 10 minutos cadastrando cada item manualmente',
        opportunity: 'o leitor OCR de fotos de cardápios com importação automática em 1 toque',
        impact: 'High' as const,
        effort: 'Med' as const,
      };

      const result = bridgeResearchToEars(opportunity, 'o sistema de catálogo');
      expect(result.earsSpec.pattern).toBe('event_driven');
      expect(result.earsStatement).toContain('When user initiates the action, the system shall provide');
      expect(result.validation.isValid).toBe(true);
      expect(result.validation.errors).toHaveLength(0);
    });

    it('converts a medium-impact research opportunity into a ubiquitous EARS requirement', () => {
      const opportunity = {
        insight: 'Compradores querem ver o horário de funcionamento atualizado na vitrine',
        opportunity: 'o widget de status aberto/fechado em tempo real',
        impact: 'Med' as const,
        effort: 'Low' as const,
      };

      const result = bridgeResearchToEars(opportunity, 'a vitrine da loja');
      expect(result.earsSpec.pattern).toBe('ubiquitous');
      expect(result.earsStatement).toContain('The system shall provide');
      expect(result.validation.isValid).toBe(true);
    });
  });

  describe('EARS to Normalized PRD Bridge', () => {
    it('converts a collection of EARS specifications into a normalized PRD ready for DAG decomposition', () => {
      const specs = [
        {
          pattern: 'event_driven' as const,
          action: 'record the order in integer cents',
          trigger: 'customer confirms checkout',
        },
        {
          pattern: 'unwanted_behavior' as const,
          action: 'reject the payment AND return an error code',
          condition: 'wallet balance is insufficient',
        },
      ];

      const prd = bridgeEarsToPrd('Checkout Multi-Canal Seguro', specs);
      expect(prd.title).toBe('Checkout Multi-Canal Seguro');
      expect(prd.requirements).toHaveLength(2);
      expect(prd.requirements[0].category).toBe('functional');
      expect(prd.requirements[1].category).toBe('security');
    });
  });

  describe('Board Governance Gate Audit (5 Executive Personas)', () => {
    const validProposal: IntegratedFeatureProposal = {
      id: 'feat-omni-checkout',
      title: 'Checkout Seguro com Validação Multi-Tenant',
      opportunities: [
        {
          insight: 'Usuários desistem com formulários longos',
          opportunity: 'o checkout direto em 3 toques',
          impact: 'High',
          effort: 'Med',
        },
      ],
      decisionContext: {
        currentGoal: 'Reduzir taxa de abandono de checkout para menos de 15%',
        recentDecision: 'Adotar Pix dinâmico integrado no client',
        biggestConstraint: 'Tempo de expiração de 15 minutos por chave Pix',
      },
      riceParameters: {
        reach: 5000,
        impact: 2,
        confidence: 0.8,
        effort: 2,
      },
      earsSpecifications: [
        {
          pattern: 'event_driven',
          action: 'generate a dynamic pix qrcode within 200ms',
          trigger: 'customer selects pix payment method',
        },
      ],
      targetPaths: ['src/services/checkout.functions.ts', 'src/components/commerce/checkout-sheet.tsx'],
      performanceMetrics: {
        lcpMs: 1600,
        inpMs: 90,
        clsScore: 0.01,
        ttfbMs: 350,
      },
      hasAccessibleMarkup: true,
      hasDatabasePersistence: true,
    };

    it('approves a fully compliant proposal with 100% score across all 5 personas', () => {
      const gate = evaluateFeatureGovernanceGate(validProposal);

      expect(gate.isReadyForRelease).toBe(true);
      expect(gate.overallScore).toBe(100);
      expect(gate.blockers).toHaveLength(0);
      expect(gate.personaAudits['Persona 1 - CPO & PM'].approved).toBe(true);
      expect(gate.personaAudits['Persona 2 - Software Architect'].approved).toBe(true);
      expect(gate.personaAudits['Persona 3 - Security & Data Engineer'].approved).toBe(true);
      expect(gate.personaAudits['Persona 4 - Design Ops & Performance'].approved).toBe(true);
      expect(gate.personaAudits['Persona 5 - Staff QA'].approved).toBe(true);
    });

    it('blocks proposal if database persistence is missing (no fake toasts rule)', () => {
      const mockProposal: IntegratedFeatureProposal = {
        ...validProposal,
        hasDatabasePersistence: false,
      };

      const gate = evaluateFeatureGovernanceGate(mockProposal);
      expect(gate.isReadyForRelease).toBe(false);
      expect(gate.personaAudits['Persona 5 - Staff QA'].approved).toBe(false);
      expect(gate.blockers.some((b) => b.includes('Toasts Fictícios'))).toBe(true);
    });

    it('blocks proposal if target path attempts path traversal or accesses forbidden system directory', () => {
      const insecureProposal: IntegratedFeatureProposal = {
        ...validProposal,
        targetPaths: ['/etc/shadow', 'src/services/checkout.ts'],
      };

      const gate = evaluateFeatureGovernanceGate(insecureProposal);
      expect(gate.isReadyForRelease).toBe(false);
      expect(gate.personaAudits['Persona 3 - Security & Data Engineer'].approved).toBe(false);
      expect(gate.blockers.some((b) => b.includes('Caminho inseguro'))).toBe(true);
    });

    it('blocks proposal if accessibility markup is incomplete', () => {
      const inaccessibleProposal: IntegratedFeatureProposal = {
        ...validProposal,
        hasAccessibleMarkup: false,
      };

      const gate = evaluateFeatureGovernanceGate(inaccessibleProposal);
      expect(gate.isReadyForRelease).toBe(false);
      expect(gate.personaAudits['Persona 4 - Design Ops & Performance'].approved).toBe(false);
      expect(gate.blockers.some((b) => b.includes('WCAG 2.2 AA'))).toBe(true);
    });

    it('blocks proposal if decision context is missing required fields', () => {
      const invalidContextProposal: IntegratedFeatureProposal = {
        ...validProposal,
        decisionContext: {
          currentGoal: '',
          recentDecision: '',
          biggestConstraint: '',
        },
      };

      const gate = evaluateFeatureGovernanceGate(invalidContextProposal);
      expect(gate.isReadyForRelease).toBe(false);
      expect(gate.personaAudits['Persona 1 - CPO & PM'].approved).toBe(false);
      expect(gate.blockers.some((b) => b.includes('Contexto de Decisão'))).toBe(true);
    });
  });

  describe('Mermaid Lifecycle Diagram Generation', () => {
    it('generates a valid Mermaid graph connecting all 4 phases and executive gates', () => {
      const diagram = generateMermaidLifecycleDiagram();
      expect(diagram).toContain('graph TD');
      expect(diagram).toContain('UX Research');
      expect(diagram).toContain('PM Autonomous Decision');
      expect(diagram).toContain('EARS Normative Requirements');
      expect(diagram).toContain('DAG MECE Decomposition');
      expect(diagram).toContain('Board Governance Gate');
      expect(diagram).toContain('Production Deployment');
    });
  });

  describe('Documentation Integrity & Public Skills Enhancement Dossier', () => {
    const rootDir = process.cwd();

    it('verifies docs/PRODUCT_LIFECYCLE.md exists and documents the end-to-end pipeline', () => {
      const docPath = path.join(rootDir, 'docs', 'PRODUCT_LIFECYCLE.md');
      expect(fs.existsSync(docPath)).toBe(true);

      const content = fs.readFileSync(docPath, 'utf8');
      expect(content).toContain('Ciclo de Vida Autônomo de Produto');
      expect(content).toContain('EARS');
      expect(content).toContain('Completude Séptupla');
    });

    it('verifies docs/POTENCIALIZACAO_ECOSSISTEMA_SKILLS.md exists and outlines global public skills', () => {
      const docPath = path.join(rootDir, 'docs', 'POTENCIALIZACAO_ECOSSISTEMA_SKILLS.md');
      expect(fs.existsSync(docPath)).toBe(true);

      const content = fs.readFileSync(docPath, 'utf8');
      expect(content).toContain('Potencialização do Ecossistema Waesy');
      expect(content).toContain('sre-resilience');
      expect(content).toContain('seo-schema-engine');
      expect(content).toContain('database-query-optimizer');
      expect(content).toContain('ai-multimodal-extractor');
      expect(content).toContain('zero-trust-rbac');
    });
  });
});
