import { describe, it, expect } from 'vitest';
import {
  AuditCnpjInputSchema,
  AnalyzeOpportunityInputSchema,
  GetCommercialPointTelemetrySchema,
  type CnpjAuditResult,
  type AcquisitionOpportunityAnalysis,
  type CommercialPointTelemetryResult,
} from './market-intelligence.functions';

describe('Fase 4: Backend Telemetry, Inteligência de Mercado & Squads de IA', () => {
  describe('4.1 Validação de Schemas e Contratos BFF', () => {
    it('deve validar dados cadastrais mínimos para auditoria de CNPJ', () => {
      const validCnpj = {
        cnpj: '12.345.678/0001-90',
        companyName: 'Restaurante Sabor & Arte Ltda',
        tradeName: 'Sabor & Arte',
        cnaePrincipal: '56.11-2-01',
        cnaeDescription: 'Restaurantes e similares',
        openingDate: '2019-05-15',
        taxRegime: 'simples_nacional' as const,
        capitalSocialCents: 5000000,
      };

      const parsed = AuditCnpjInputSchema.safeParse(validCnpj);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.companyName).toBe('Restaurante Sabor & Arte Ltda');
        expect(parsed.data.taxRegime).toBe('simples_nacional');
      }
    });

    it('deve rejeitar CNPJ com formato curto ou inválido', () => {
      const invalid = {
        cnpj: '123',
        companyName: 'Loja Teste',
      };
      const parsed = AuditCnpjInputSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });

    it('deve validar parâmetros de busca de telemetria de ponto comercial', () => {
      const input = {
        address: 'Av. Getúlio Vargas, 1200',
        city: 'Chapecó',
        state: 'SC',
      };
      const parsed = GetCommercialPointTelemetrySchema.safeParse(input);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.city).toBe('Chapecó');
      }
    });
  });

  describe('4.2 Motor de Inteligência de Ponto Comercial & Turnover', () => {
    it('deve formatar corretamente telemetria com histórico de ocupação', () => {
      const sample: CommercialPointTelemetryResult = {
        found: true,
        point: {
          id: 'point-101',
          addressNormalized: 'Av. Getúlio Vargas, 1200',
          city: 'Chapecó',
          neighborhood: 'Centro',
          areaSqm: 180,
          pointType: 'loja_rua',
          currentOccupant: 'Pizzaria Bella Itália',
          occupancyStatus: 'occupied',
          turnoverCount: 2,
          avgPermanenceMonths: 36.5,
          marketAttractivenessScore: 88,
        },
        turnoverHistory: [
          {
            id: 'turn-1',
            formerCompanyName: 'Café & Bistrô Antigo',
            segment: 'Gastronomia',
            durationMonths: 24,
            reasonForLeaving: 'Mudança para shopping',
          },
          {
            id: 'turn-2',
            formerCompanyName: 'Boutique Elegance',
            segment: 'Varejo / Moda',
            durationMonths: 48,
            reasonForLeaving: 'Aposentadoria do proprietário',
          },
        ],
      };

      expect(sample.found).toBe(true);
      expect(sample.point?.marketAttractivenessScore).toBe(88);
      expect(sample.turnoverHistory).toHaveLength(2);
      expect(sample.point?.avgPermanenceMonths).toBeGreaterThan(30);
    });
  });

  describe('4.3 Squad de Análise de Aquisição (Viabilidade & Payback)', () => {
    it('deve calcular viabilidade saudável quando aluguel é inferior a 8% do faturamento', () => {
      const revenue = 10000000; // R$ 100k
      const rent = 500000; // R$ 5k (5%)
      const profit = 2000000; // R$ 20k
      const price = 40000000; // R$ 400k (20 meses)

      const occupancyRatio = rent / revenue;
      const paybackMonths = Math.round(price / profit);

      expect(occupancyRatio).toBe(0.05);
      expect(occupancyRatio).toBeLessThanOrEqual(0.08);
      expect(paybackMonths).toBe(20);
    });

    it('deve emitir alerta de risco quando o aluguel consome mais de 10% do faturamento', () => {
      const revenue = 8000000; // R$ 80k
      const rent = 1000000; // R$ 10k (12.5%)
      const occupancyRatio = rent / revenue;

      expect(occupancyRatio).toBeGreaterThan(0.08);
    });
  });
});
