import { describe, it, expect } from 'vitest';
import {
  CANONICAL_FOOD_SUBNICHES,
  CANONICAL_SERVICE_SUBNICHES,
  CANONICAL_BUSINESS_TYPES,
  CANONICAL_INVESTMENT_MODELS,
} from '@/lib/classifieds/canonical-taxonomy';
import { resolveWorkspaceNavigation } from '@/lib/workspace-navigation';
import { AuditCnpjInputSchema } from '@/services/market-intelligence.functions';

describe('Fases 2, 3 e 4: Sub-nichos em Cascata, M&A sob NDA e Hub de Inteligência', () => {
  describe('2.1 Cascatas de Sub-nichos Especializados (Taxonomia Canônica)', () => {
    it('deve conter sub-nichos gastronômicos canônicos com tempos e sugestões', () => {
      expect(CANONICAL_FOOD_SUBNICHES.length).toBeGreaterThanOrEqual(6);
      const sushi = CANONICAL_FOOD_SUBNICHES.find((f) => f.id === 'sushi');
      expect(sushi).toBeDefined();
      expect(sushi?.label).toContain('Sushi');
      expect(sushi?.defaultPrepTime).toBeDefined();

      const pizzaria = CANONICAL_FOOD_SUBNICHES.find((f) => f.id === 'pizzaria');
      expect(pizzaria).toBeDefined();
      expect(pizzaria?.suggestedItems.length).toBeGreaterThan(0);
    });

    it('deve conter sub-nichos de serviços com conselhos de classe obrigatórios', () => {
      const advocacia = CANONICAL_SERVICE_SUBNICHES.find((s) => s.id === 'advocacia');
      expect(advocacia).toBeDefined();
      expect(advocacia?.councilName).toBe('OAB');
      expect(advocacia?.requiresLicense).toBe(true);

      const engenharia = CANONICAL_SERVICE_SUBNICHES.find((s) => s.id === 'engenharia_arquitetura');
      expect(engenharia).toBeDefined();
      expect(engenharia?.councilName).toBe('CREA / CAU');
      expect(engenharia?.specialties).toContain('Emissão de ART / RRT de Reforma');

      const saude = CANONICAL_SERVICE_SUBNICHES.find((s) => s.id === 'saude_estetica');
      expect(saude).toBeDefined();
      expect(saude?.councilName).toContain('CRM');
    });

    it('deve mapear transações de M&A e captação de investimento', () => {
      const vendaTotal = CANONICAL_BUSINESS_TYPES.find((b) => b.id === 'venda_total');
      expect(vendaTotal).toBeDefined();

      const repassePonto = CANONICAL_BUSINESS_TYPES.find((b) => b.id === 'repasse_ponto');
      expect(repassePonto).toBeDefined();

      const captacao = CANONICAL_BUSINESS_TYPES.find((b) => b.id === 'captacao_investimento');
      expect(captacao).toBeDefined();

      expect(CANONICAL_INVESTMENT_MODELS.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('3.1 Governança de M&A, Documentos Restritos e Sidebar', () => {
    it('deve registrar módulo global de Doações & Captação na sidebar do Workspace', () => {
      const masterNav = resolveWorkspaceNavigation({}, { isMasterMode: true });
      const donationsGroup = masterNav.find((g) => g.id === 'donations-captacao');
      expect(donationsGroup).toBeDefined();
      expect(donationsGroup?.label).toBe('Doações & Captação');
      expect(donationsGroup?.items.some((i) => i.path === '/workspace/doacoes')).toBe(true);
      expect(donationsGroup?.items.some((i) => i.path === '/workspace/captacao')).toBe(true);
      expect(donationsGroup?.items.some((i) => i.path === '/workspace/captacao/ndas')).toBe(true);
    });

    it('deve disponibilizar Doações & Captação no fluxo padrão de loja', () => {
      const storeNav = resolveWorkspaceNavigation({ settings: {} });
      const donationsGroup = storeNav.find((g) => g.id === 'donations-captacao');
      expect(donationsGroup).toBeDefined();
    });
  });

  describe('4.1 Auditoria Cadastral Conectada à Receita Federal', () => {
    it('deve aceitar CNPJ com busca automática de razão social pela Receita Federal', () => {
      const validWithoutName = {
        cnpj: '00.000.000/0001-91',
      };
      const parsed = AuditCnpjInputSchema.safeParse(validWithoutName);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.cnpj).toBe('00.000.000/0001-91');
      }
    });
  });

  describe('5.1 Migração de Anúncios e Ponte para Conta Pro (Workspace)', () => {
    it('deve validar schema de conversão de anúncio para loja com UUID estrito', async () => {
      const { ConvertClassifiedToWorkspaceStoreSchema, convertClassifiedToWorkspaceStore } = await import(
        '@/services/classifieds.functions'
      );

      expect(typeof convertClassifiedToWorkspaceStore).toBe('function');

      const invalid = ConvertClassifiedToWorkspaceStoreSchema.safeParse({
        classifiedId: 'not-a-uuid',
      });
      expect(invalid.success).toBe(false);

      const valid = ConvertClassifiedToWorkspaceStoreSchema.safeParse({
        classifiedId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        customStoreName: 'Pizzaria Napolitana Pro',
      });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.customStoreName).toBe('Pizzaria Napolitana Pro');
      }
    });

    it('deve exportar as funções de governança de M&A, NDAs e doações do Workspace', async () => {
      const {
        listStoreBusinessClassifieds,
        listStoreAllNdaSignatures,
        listStoreDonations,
      } = await import('@/services/classifieds.functions');

      expect(typeof listStoreBusinessClassifieds).toBe('function');
      expect(typeof listStoreAllNdaSignatures).toBe('function');
      expect(typeof listStoreDonations).toBe('function');
    });
  });
});

