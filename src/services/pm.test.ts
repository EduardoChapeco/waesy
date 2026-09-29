import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  determineOutputMode,
  validateDecisionContext,
  formatLightweightDecision,
  calculateRiceScore,
  detectScopeDrift,
  formatPppReport,
} from '@/lib/product-manager';

describe('Skill pm & Product Manager Autonomous Governance Engine', () => {
  describe('Output Mode Adaptation by Stakeholder', () => {
    it('selects Lightweight Mode for solo founders', () => {
      expect(determineOutputMode('solo_founder')).toBe('lightweight');
    });

    it('selects Full-Format Mode for team roles and stakeholders', () => {
      expect(determineOutputMode('tech_lead')).toBe('full_format');
      expect(determineOutputMode('business_stakeholder')).toBe('full_format');
      expect(determineOutputMode('designer')).toBe('full_format');
      expect(determineOutputMode('operator')).toBe('full_format');
      expect(determineOutputMode('founder_ceo')).toBe('full_format');
    });
  });

  describe('Decision Context Validation', () => {
    it('validates complete context with Goal, Decision, and Constraint', () => {
      const validContext = {
        currentGoal: 'Alcançar R$ 500k de GMV no Q3',
        recentDecision: 'Descontinuar modalidade de frete manual',
        biggestConstraint: 'Time de engenharia com capacidade fixa de 3 devs',
      };

      const result = validateDecisionContext(validContext);
      expect(result.isValid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });

    it('flags missing items when context is incomplete', () => {
      const incompleteContext = {
        currentGoal: 'Aumentar conversão',
      };

      const result = validateDecisionContext(incompleteContext);
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('recentDecision');
      expect(result.missingFields).toContain('biggestConstraint');
    });
  });

  describe('Lightweight Decision Formatting', () => {
    it('formats 1-sentence conclusion, max 3 reasons, and max 2 next steps', () => {
      const formatted = formatLightweightDecision({
        decision: 'Pular exportação CSV neste sprint',
        reasons: [
          'Zero pedidos de clientes em 30 dias',
          'Custo estimado de 5 dias de engenharia',
          'Não impacta a ativação inicial',
          'Razão extra ignorada',
        ],
        nextSteps: [
          'Manter no backlog para daqui a 6 semanas',
          'Revisar métricas de retenção na sexta-feira',
          'Passo extra ignorado',
        ],
      });

      expect(formatted).toContain('Minha decisão: Pular exportação CSV neste sprint.');
      expect(formatted).toContain('(1) Zero pedidos de clientes em 30 dias');
      expect(formatted).toContain('(2) Custo estimado de 5 dias de engenharia');
      expect(formatted).toContain('(3) Não impacta a ativação inicial');
      expect(formatted).not.toContain('Razão extra ignorada');
      expect(formatted).toContain('1. Manter no backlog para daqui a 6 semanas');
      expect(formatted).toContain('2. Revisar métricas de retenção na sexta-feira');
      expect(formatted).not.toContain('Passo extra ignorado');
    });
  });

  describe('RICE Prioritization Score Calculation', () => {
    it('calculates RICE score correctly', () => {
      // (1000 reach * 2 impact * 0.8 confidence) / 4 effort = 1600 / 4 = 400
      const score = calculateRiceScore({
        reach: 1000,
        impact: 2,
        confidence: 0.8,
        effort: 4,
      });

      expect(score).toBe(400);
    });

    it('throws error when effort is zero or negative', () => {
      expect(() =>
        calculateRiceScore({
          reach: 500,
          impact: 1,
          confidence: 1,
          effort: 0,
        })
      ).toThrow('Effort must be greater than zero.');
    });
  });

  describe('Change Sensing & Scope Drift Detection', () => {
    it('detects missing requirements and unexpected rogue features', () => {
      const prdReqs = ['Login Social', 'Checkout Pix', 'Split de Recebíveis'];
      const actualFeatures = ['Login Social', 'Checkout Pix', 'Exportação PDF Não Solicitada'];

      const drift = detectScopeDrift(prdReqs, actualFeatures);
      expect(drift.unimplementedRequirements).toEqual(['Split de Recebíveis']);
      expect(drift.unexpectedFeatures).toEqual(['Exportação PDF Não Solicitada']);
      expect(drift.alignmentScore).toBeLessThan(100);
    });

    it('reports 100% alignment when features match PRD perfectly', () => {
      const prdReqs = ['A', 'B', 'C'];
      const actualFeatures = ['a', 'b', 'c'];

      const drift = detectScopeDrift(prdReqs, actualFeatures);
      expect(drift.unimplementedRequirements).toHaveLength(0);
      expect(drift.unexpectedFeatures).toHaveLength(0);
      expect(drift.alignmentScore).toBe(100);
    });
  });

  describe('PPP Weekly Report Formatting', () => {
    it('formats Progress, Plans, Problems correctly', () => {
      const ppp = formatPppReport(
        ['Deploy do split em produção', 'Testes de carga finalizados'],
        ['Iniciar homologação com lojistas piloto'],
        ['Atraso na liberação da chave de webhook pelo banco parceiro']
      );

      expect(ppp).toContain('**Progresso (Progress):**');
      expect(ppp).toContain('- Deploy do split em produção');
      expect(ppp).toContain('**Planos para a Próxima Sprint (Plans):**');
      expect(ppp).toContain('- Iniciar homologação com lojistas piloto');
      expect(ppp).toContain('**Bloqueios & Riscos (Problems):**');
      expect(ppp).toContain('- Atraso na liberação da chave de webhook pelo banco parceiro');
    });
  });

  describe('Skill Artifacts and 22 References Integrity', () => {
    const skillRoot = path.resolve(process.cwd(), '.agents/skills/pm');

    it('guarantees pm SKILL.md exists with required identity', () => {
      const skillFile = path.join(skillRoot, 'SKILL.md');
      expect(fs.existsSync(skillFile)).toBe(true);
      const content = fs.readFileSync(skillFile, 'utf8');
      expect(content).toContain('name: pm');
      expect(content).toContain('You are the Product Manager');
      expect(content).toContain('Modo Decisão Leve');
    });

    it('verifies all 22 canonical references exist and are populated', () => {
      const expectedRefs = [
        'onboarding.md',
        'people-registry.md',
        'proactive-agenda.md',
        'market-intelligence.md',
        'pm-integrity.md',
        'business-strategy.md',
        'change-sensing.md',
        'requirements.md',
        'prioritization.md',
        'problem-analysis.md',
        'business-analysis.md',
        'data-analysis.md',
        'prd-template.md',
        'progress-tracking.md',
        'stakeholder-comms.md',
        'external-presentation.md',
        'cross-team-alignment.md',
        'rituals.md',
        'knowledge-base.md',
        'launch.md',
        'playbooks.md',
        'session-handoff.md',
      ];

      for (const ref of expectedRefs) {
        const filePath = path.join(skillRoot, 'references', ref);
        expect(fs.existsSync(filePath), `Missing reference file: ${ref}`).toBe(true);
        const text = fs.readFileSync(filePath, 'utf8');
        expect(text.length).toBeGreaterThan(150);
      }
    });
  });

  describe('AGENTS.md & BigTech Board Governance Integration', () => {
    it('verifies pm skill integration in AGENTS.md', () => {
      const agentsPath = path.resolve(process.cwd(), '.agents/AGENTS.md');
      const content = fs.readFileSync(agentsPath, 'utf8');
      expect(content).toContain('.agents/skills/pm/SKILL.md');
      expect(content).toContain('29. **Mandato do Gerente de Produto Autônomo');
      expect(content).toContain('Você É o PM');
    });

    it('verifies pm skill in bigtech-board SKILL.md', () => {
      const boardPath = path.resolve(process.cwd(), '.agents/skills/bigtech-board/SKILL.md');
      const content = fs.readFileSync(boardPath, 'utf8');
      expect(content).toContain('skill pm');
      expect(content).toContain('Decisão Leve');
    });
  });
});
