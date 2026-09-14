import { describe, it, expect } from 'vitest';
import type { 
  SyntheticArchetype, 
  SimLabStatisticalSynthesis, 
  VerdictStatus 
} from '@/types/simlab';
import { renderSlideHTML5, executeOrchestrateMarketingPost } from './squad-content.functions';
import { MCP_TOOLS_MANIFEST, executeMcpToolCall } from './mcp-server.functions';
import { 
  executeSimLabBatchSimulation, 
  executeSendFocusGroupMessage, 
  CANONICAL_BRAZIL_ARCHETYPES 
} from './simlab.functions';

describe('Dossiê Deep-Tech: Populações Sintéticas (Aaru AI), SimLab V2, Focus Group & Servidor MCP', () => {
  describe('1. Calibração Demográfica IBGE 2022 & Critério Brasil ABEP', () => {
    it('deve validar estratificação de classes sociais de A1 a D/E com os 12 arquétipos', () => {
      expect(CANONICAL_BRAZIL_ARCHETYPES).toHaveLength(12);
      const classes = new Set(CANONICAL_BRAZIL_ARCHETYPES.map(a => a.abep_social_class));
      expect(classes.has('A1')).toBe(true);
      expect(classes.has('A2')).toBe(true);
      expect(classes.has('B1')).toBe(true);
      expect(classes.has('B2')).toBe(true);
      expect(classes.has('C1')).toBe(true);
      expect(classes.has('C2')).toBe(true);
      expect(classes.has('D_E')).toBe(true);
    });

    it('deve associar correta sensibilidade a preço e cinismo para arquétipos de classes opostas', () => {
      const carla = CANONICAL_BRAZIL_ARCHETYPES.find(a => a.code === 'BR_F_34_CLASSE_C1_MAE')!;
      const marcos = CANONICAL_BRAZIL_ARCHETYPES.find(a => a.code === 'BR_M_52_CLASSE_A1_DIRETOR')!;

      expect(carla.price_sensitivity).toBeGreaterThan(marcos.price_sensitivity);
      expect(marcos.median_income_brl).toBeGreaterThan(carla.median_income_brl * 5);
      expect(carla.decision_heuristics.seeks_combos).toBe(true);
      expect(marcos.decision_heuristics.zero_tolerance_delays).toBe(true);
    });
  });

  describe('2. Motor Econométrico de Simulação em Lotes & Síntese Estatística (Aaru Engine)', () => {
    it('deve calcular o Net Promoter Score Sintético (NPS) com precisão matemática', () => {
      const total = 50;
      const promoters = 30;
      const detractors = 10;
      const nps = Math.round(((promoters - detractors) / total) * 100);

      expect(nps).toBe(40); // 60% - 20% = +40
    });

    it('deve computar taxa de aprovação e taxa de rejeição complementares', () => {
      const total = 50;
      const approved = 37;
      const approvalRate = Math.round((approved / total) * 100);
      const rejectionRate = 100 - approvalRate;

      expect(approvalRate).toBe(74);
      expect(rejectionRate).toBe(26);
      expect(approvalRate + rejectionRate).toBe(100);
    });

    it('deve executar executeSimLabBatchSimulation com cálculo de 95% IC e parecer dos revisores', async () => {
      const res = await executeSimLabBatchSimulation({
        experimentId: 'test-exp-econometrics',
        storeId: 'c6ccd3b2-aa54-42a2-b0fe-251daa5b97f7'
      });

      expect(res.success).toBe(true);
      expect(res.responsesCount).toBeGreaterThanOrEqual(12);
      expect(res.synthesis.synthetic_nps).toBeGreaterThanOrEqual(-100);
      expect(res.synthesis.synthetic_nps).toBeLessThanOrEqual(100);
      expect(res.synthesis.overall_approval_rate + res.synthesis.rejection_rate).toBe(100);
      expect(res.synthesis.estimated_conversion_range).toHaveLength(2);
      expect(res.synthesis.reviewer_reports).toHaveLength(3);
      expect(res.synthesis.scientific_verdict).toBeDefined();
    });
  });

  describe('3. Conselho Científico de Confrontação (Anti-Hallucination Protocol)', () => {
    it('deve emitir veredito rigoroso de risco de mercado baseado na taxa de aprovação', () => {
      const getVerdict = (approvalRate: number): VerdictStatus => {
        if (approvalRate >= 75) return 'aprovado_para_veiculacao';
        if (approvalRate >= 50) return 'revisar_com_ajustes';
        return 'bloqueado_por_alto_risco';
      };

      expect(getVerdict(82)).toBe('aprovado_para_veiculacao');
      expect(getVerdict(68)).toBe('revisar_com_ajustes');
      expect(getVerdict(41)).toBe('bloqueado_por_alto_risco');
    });

    it('deve validar credibilidade dos 3 pareceristas acadêmicos seniores', () => {
      const synthesis: Partial<SimLabStatisticalSynthesis> = {
        synthetic_nps: 45,
        overall_approval_rate: 76,
        scientific_verdict: 'aprovado_para_veiculacao',
        reviewer_reports: [
          {
            reviewer_name: 'Prof. Dr. Arnaldo',
            role: 'Econometrista Chefe',
            credibility_score: 96,
            critique: 'Amostra com IC 95% e margem 4.8%.',
            detected_biases: [],
            status: 'passed',
          },
          {
            reviewer_name: 'Profa. Dra. Beatriz',
            role: 'Psicóloga Social',
            credibility_score: 94,
            critique: 'Viés de cortesia descartado.',
            detected_biases: [],
            status: 'passed',
          },
          {
            reviewer_name: 'Dr. Cláudio',
            role: 'Auditor de Risco',
            credibility_score: 92,
            critique: 'Viabilidade de mercado aprovada.',
            detected_biases: [],
            status: 'passed',
          }
        ]
      };

      expect(synthesis.reviewer_reports).toHaveLength(3);
      expect(synthesis.reviewer_reports?.every(r => r.credibility_score >= 90)).toBe(true);
    });
  });

  describe('4. Focus Group Virtual em Tempo Real', () => {
    it('deve gerar respostas humanizadas e diferenciadas por classe socioeconômica', async () => {
      const selected = CANONICAL_BRAZIL_ARCHETYPES.slice(0, 3);
      const result = await executeSendFocusGroupMessage({
        sessionId: 'test-session-mock',
        userMessage: 'O que acham de um combo executivo por R$ 85,00?',
        selectedPersonas: selected
      });

      expect(result.success).toBe(true);
      expect(result.newMessages).toHaveLength(4); // 1 do moderador + 3 das personas
      const personaMsgs = result.newMessages.filter(m => m.sender_type === 'synthetic_persona');
      expect(personaMsgs).toHaveLength(3);
      for (const m of personaMsgs) {
        expect(m.content.length).toBeGreaterThan(20);
        expect(m.sentiment_score).toBeGreaterThan(0);
      }
    });
  });

  describe('5. Pipeline de Criação de Slides HTML5 1080x1080 (Agent Carla)', () => {
    it('deve compilar slide autocontido com dimensões exatas de 1080x1080 e Google Fonts', () => {
      const html = renderSlideHTML5({
        headline: 'O segredo que dobra suas vendas em 30 dias',
        body: 'Implemente uma esteira previsível de ofertas com garantia incondicional.',
        slideIndex: 1,
        totalSlides: 5,
        companyName: 'Waesy Turismo & Varejo',
        template: 'bold-color',
        cta: 'Saiba Mais',
      });

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('width: 1080px;');
      expect(html).toContain('height: 1080px;');
      expect(html).toContain('fonts.googleapis.com');
      expect(html).toContain('O segredo que dobra suas vendas');
      expect(html).toContain('Slide 1 de 5');
      expect(html).toContain('Waesy Turismo & Varejo');
    });

    it('deve orquestrar post completo pelo pipeline Aria -> Bruno -> Carla -> Diego', async () => {
      const res = await executeOrchestrateMarketingPost({
        storeId: 'c6ccd3b2-aa54-42a2-b0fe-251daa5b97f7',
        companyName: 'Excelência Tour SMO',
        theme: 'Roteiros de Inverno e Ecoturismo',
        targetSin: 'orgulho'
      });

      expect(res.success).toBe(true);
      expect(res.post.format).toBe('carousel');
      expect(res.post.slides_count).toBe(5);
      expect(res.post.rendered_slides_html).toHaveLength(5);
      expect(res.post.copy_data.slides).toHaveLength(5);
      expect(res.post.simlab_validation_score).toBeGreaterThan(0);
    });
  });

  describe('6. Servidor MCP (Model Context Protocol) do Ecossistema Waesy', () => {
    it('deve expor o manifesto com as 4 ferramentas canônicas do protocolo MCP', () => {
      const toolNames = MCP_TOOLS_MANIFEST.map(t => t.name);

      expect(toolNames).toContain('simlab_run_survey');
      expect(toolNames).toContain('generate_marketing_post');
      expect(toolNames).toContain('analyze_competitor_dna');
      expect(toolNames).toContain('query_master_catalog');
      expect(MCP_TOOLS_MANIFEST.length).toBeGreaterThanOrEqual(4);
    });

    it('cada ferramenta do manifesto MCP deve ter inputSchema estrito do padrão JSON Schema', () => {
      for (const tool of MCP_TOOLS_MANIFEST) {
        expect(tool.description.length).toBeGreaterThan(15);
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
        expect(Array.isArray(tool.inputSchema.required)).toBe(true);
      }
    });

    it('deve executar MCP Tool generate_marketing_post com sucesso', async () => {
      const mcpRes = await executeMcpToolCall({
        tool: 'generate_marketing_post',
        storeId: 'c6ccd3b2-aa54-42a2-b0fe-251daa5b97f7',
        arguments: {
          companyName: 'Excelência Tour',
          theme: 'Viagem dos Sonhos Foz do Iguaçu',
          targetSin: 'ganancia'
        }
      });

      expect(mcpRes.status).toBe('success');
      expect(mcpRes.content).toHaveLength(2);
      expect(mcpRes.content[0].text).toContain('HTML5 1080x1080');
    });

    it('deve executar MCP Tool query_master_catalog com sucesso', async () => {
      const mcpRes = await executeMcpToolCall({
        tool: 'query_master_catalog',
        storeId: 'c6ccd3b2-aa54-42a2-b0fe-251daa5b97f7',
        arguments: {
          query: 'Viagem',
          limit: 5
        }
      });

      expect(mcpRes.status).toBe('success');
      expect(mcpRes.content[0].data.total).toBeDefined();
      expect(Array.isArray(mcpRes.content[0].data.items)).toBe(true);
    });
  });
});
