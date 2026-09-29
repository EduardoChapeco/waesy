import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  validateObservationVsInterpretation,
  calculateNps,
  filterHighImpactOpportunities,
  formatResearchSynthesisReport,
  type ResearchSynthesisReport,
} from '@/lib/ux-research';

describe('Skill ux-research-synthesis & Empirical Research Engine', () => {
  describe('Observation vs. Interpretation Scientific Validation', () => {
    it('accepts rigorous factual observations with quantifiable data and distinct interpretations', () => {
      const observation = '6 de 8 participantes hesitaram por mais de 5 segundos antes de encontrar o botão de checkout';
      const interpretation = 'O botão de checkout possui baixa saliência visual e disputa atenção com o banner promocional';

      const result = validateObservationVsInterpretation(observation, interpretation);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects vague qualifiers in observations such as "a maioria" or "muitos"', () => {
      const vagueObservation = 'A maioria dos usuários achou o fluxo difícil';
      const interpretation = 'A arquitetura de informação precisa de simplificação';

      const result = validateObservationVsInterpretation(vagueObservation, interpretation);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('qualificador subjetivo proibido'))).toBe(true);
    });

    it('rejects speculative wording in observations such as "achamos" or "talvez"', () => {
      const speculativeObservation = 'Talvez 4 participantes não viram o campo de cupom';
      const interpretation = 'O campo de cupom está escondido';

      const result = validateObservationVsInterpretation(speculativeObservation, interpretation);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('termo especulativo'))).toBe(true);
    });

    it('flags error when observation or interpretation is empty', () => {
      const result = validateObservationVsInterpretation('', '');
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });
  });

  describe('NPS (Net Promoter Score) Calculation Engine', () => {
    it('calculates NPS correctly using promoters (9-10) and detractors (0-6)', () => {
      // 10 promoters (9, 10), 5 passives (7, 8), 5 detractors (0-6) -> 20 total
      // Promoters = 50%, Detractors = 25% -> NPS = +25
      const scores = [
        10, 10, 9, 9, 10, 10, 9, 9, 10, 10, // 10 promoters
        8, 8, 7, 7, 8,                     // 5 passives
        6, 5, 4, 3, 2                      // 5 detractors
      ];

      const result = calculateNps(scores);
      expect(result.total).toBe(20);
      expect(result.promoters).toBe(10);
      expect(result.passives).toBe(5);
      expect(result.detractors).toBe(5);
      expect(result.nps).toBe(25);
    });

    it('handles perfect score (NPS 100) when all respondents are promoters', () => {
      const scores = [10, 9, 10, 9, 10];
      const result = calculateNps(scores);
      expect(result.nps).toBe(100);
      expect(result.promoters).toBe(5);
      expect(result.detractors).toBe(0);
    });

    it('handles worst score (NPS -100) when all respondents are detractors', () => {
      const scores = [0, 1, 2, 3, 4, 5, 6];
      const result = calculateNps(scores);
      expect(result.nps).toBe(-100);
      expect(result.detractors).toBe(7);
      expect(result.promoters).toBe(0);
    });

    it('returns zeroes gracefully for empty dataset', () => {
      const result = calculateNps([]);
      expect(result.nps).toBe(0);
      expect(result.total).toBe(0);
    });
  });

  describe('Insight → Opportunity Prioritization Matrix', () => {
    it('filters opportunities by High Impact and Low/Medium Effort (Quick Wins)', () => {
      const opportunities = [
        { insight: 'I1', opportunity: 'O1', impact: 'High' as const, effort: 'Low' as const },
        { insight: 'I2', opportunity: 'O2', impact: 'High' as const, effort: 'Med' as const },
        { insight: 'I3', opportunity: 'O3', impact: 'High' as const, effort: 'High' as const },
        { insight: 'I4', opportunity: 'O4', impact: 'Med' as const, effort: 'Low' as const },
        { insight: 'I5', opportunity: 'O5', impact: 'Low' as const, effort: 'Low' as const },
      ];

      const filtered = filterHighImpactOpportunities(opportunities);
      expect(filtered).toHaveLength(2);
      expect(filtered.map((f) => f.opportunity)).toEqual(['O1', 'O2']);
    });
  });

  describe('Canonical Research Synthesis Markdown Formatter', () => {
    it('formats a complete research synthesis report conforming to canonical template', () => {
      const sampleReport: ResearchSynthesisReport = {
        studyName: 'Onboarding de Comerciantes do Mercado Local',
        method: 'Interviews & Usability Testing',
        participantsCount: 8,
        dateRange: '15/09/2026 - 25/09/2026',
        researcher: 'Lead UX Researcher',
        executiveSummary: 'Comerciantes encontram alta fricção no upload do catálogo de produtos. A jornada mobile de 3 toques foi validada com sucesso, mas o upload em massa requer assistência manual.',
        themes: [
          {
            id: 'theme-catalog',
            name: 'Fricção na Digitalização Inicial do Estoque',
            prevalence: { count: 6, total: 8, percentage: 75 },
            summary: 'Lojistas possuem tabelas manuais e não conseguem formatar CSV no padrão esperado.',
            quotes: [
              { participantId: 'P2', quote: 'Eu não sei o que é CSV, eu só tenho meu caderno de fiado e uma planilha no WhatsApp.' },
              { participantId: 'P5', quote: 'Se eu tiver que cadastrar 100 produtos um por um no celular, eu desisto.' }
            ],
            productImplication: 'Necessidade urgente de onboarding assistido com upload de foto da planilha e IA de extração estruturada.'
          }
        ],
        insightsOpportunities: [
          {
            insight: 'Comerciantes tiram foto da lista de preços física',
            opportunity: 'Leitor OCR/IA que converte foto de cardápio/lista em catálogo atômico',
            impact: 'High',
            effort: 'Med'
          }
        ],
        userSegments: [
          {
            name: 'Comerciante Tradicional Analógico',
            characteristics: 'Opera comércio físico há mais de 10 anos, usa WhatsApp mas não possui ERP',
            needs: 'Zero complexidade técnica, importação guiada por voz ou foto',
            estimatedSizePercentage: 60
          }
        ],
        recommendations: [
          {
            priority: 'High',
            action: 'Implementar importador de cardápio via foto e Vision LLM',
            rationale: 'Desbloqueia 75% dos lojistas analisados no estudo de campo'
          }
        ],
        futureQuestions: [
          'Qual a taxa de acerto do OCR em cardápios manuscritos vs digitais?'
        ],
        methodologyNotes: 'Pesquisa qualitativa com 8 lojistas de Chapecó e região, combinando entrevista semiestruturada de 45 min com teste de usabilidade no smartphone do próprio lojista.'
      };

      const markdown = formatResearchSynthesisReport(sampleReport);

      expect(markdown).toContain('## Research Synthesis: Onboarding de Comerciantes do Mercado Local');
      expect(markdown).toContain('**Method:** Interviews & Usability Testing | **Participants:** 8');
      expect(markdown).toContain('### Executive Summary');
      expect(markdown).toContain('#### Theme: Fricção na Digitalização Inicial do Estoque');
      expect(markdown).toContain('**Prevalence:** 6 of 8 participants (75%)');
      expect(markdown).toContain('- "Eu não sei o que é CSV, eu só tenho meu caderno de fiado e uma planilha no WhatsApp." — P2');
      expect(markdown).toContain('### Insights → Opportunities');
      expect(markdown).toContain('| Comerciantes tiram foto da lista de preços física | Leitor OCR/IA que converte foto de cardápio/lista em catálogo atômico | High | Med |');
      expect(markdown).toContain('### User Segments Identified');
      expect(markdown).toContain('| Comerciante Tradicional Analógico |');
      expect(markdown).toContain('### Recommendations');
      expect(markdown).toContain('- **[High]** Implementar importador de cardápio via foto e Vision LLM');
      expect(markdown).toContain('### Questions for Further Research');
      expect(markdown).toContain('### Methodology Notes');
    });
  });

  describe('Architectural Governance & Knowledge Integrity', () => {
    const rootDir = process.cwd();

    it('verifies that the primary skill file .agents/skills/ux-research-synthesis/SKILL.md exists and contains required triggers', () => {
      const skillPath = path.join(rootDir, '.agents', 'skills', 'ux-research-synthesis', 'SKILL.md');
      expect(fs.existsSync(skillPath)).toBe(true);

      const content = fs.readFileSync(skillPath, 'utf8');
      expect(content).toContain('name: ux-research-synthesis');
      expect(content).toContain('/ux-research-synthesis');
      expect(content).toContain('Executive Summary');
      expect(content).toContain('Supporting Evidence');
    });

    it('verifies all 6 technical reference manuals exist in references/', () => {
      const refDir = path.join(rootDir, '.agents', 'skills', 'ux-research-synthesis', 'references');
      expect(fs.existsSync(refDir)).toBe(true);

      const expectedRefs = [
        'qualitative-coding.md',
        'interview-protocols.md',
        'usability-testing-analysis.md',
        'nps-csat-quant-synthesis.md',
        'triangulation-methods.md',
        'synthesis-templates.md',
      ];

      for (const ref of expectedRefs) {
        const refPath = path.join(refDir, ref);
        expect(fs.existsSync(refPath), `Reference file ${ref} must exist`).toBe(true);
        const refContent = fs.readFileSync(refPath, 'utf8');
        expect(refContent.length).toBeGreaterThan(100);
      }
    });

    it('verifies SSOT documentation docs/UX_RESEARCH.md exists and is documented', () => {
      const docPath = path.join(rootDir, 'docs', 'UX_RESEARCH.md');
      expect(fs.existsSync(docPath)).toBe(true);

      const content = fs.readFileSync(docPath, 'utf8');
      expect(content).toContain('Pesquisa com Usuários');
      expect(content).toContain('EARS');
    });

    it('verifies AGENTS.md establishes Rule 31 and lists docs/UX_RESEARCH.md in SSOT table', () => {
      const agentsPath = path.join(rootDir, '.agents', 'AGENTS.md');
      const content = fs.readFileSync(agentsPath, 'utf8');

      expect(content).toContain('docs/UX_RESEARCH.md');
      expect(content).toContain('Regra 31');
      expect(content).toContain('Mandato de Pesquisa Empírica & Síntese de UX');
    });

    it('verifies bigtech-board skill incorporates empirical research and UX synthesis mandate', () => {
      const boardPath = path.join(rootDir, '.agents', 'skills', 'bigtech-board', 'SKILL.md');
      const content = fs.readFileSync(boardPath, 'utf8');

      expect(content).toContain('ux-research-synthesis');
      expect(content).toContain('evidências empíricas');
    });
  });
});
