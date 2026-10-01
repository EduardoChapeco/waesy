import { describe, it, expect } from 'vitest';
import {
  CanonicalAdContent,
  sanitizeNarrativeDescription,
  stripInternalContent,
  assertNoInternalLeaks,
  renderToMarkdown,
  renderToPlainText,
  renderToPublicJson,
  renderToVoucherContext,
  renderToContractContext,
} from './index';

describe('Canonical Content Blocks & Leak-Proof Engine (G19–G26)', () => {
  const mockAdWithInternalData: CanonicalAdContent = {
    version: '1.0.0',
    locale: 'pt-BR',
    narrativeDescription: `
      <h2>Experiência Completa nas Serras Gaúchas</h2>
      <p style="color: red; margin: 10px;">Aproveite o melhor de Gramado com <strong>todo conforto</strong>.</p>
      <script>alert("malicious script");</script>
      <a href="javascript:void(0)" onclick="stealData()">Link Suspeito</a>
      <a href="https://waesy.com/docs">Termos de Uso</a>
    `,
    blocks: {
      b1_identity: {
        type: 'B1_IDENTITY',
        title: 'Pacote Gramado & Canela Inesquecível 5D/4N',
        subtitle: 'Com saídas semanais e traslado incluso',
        category: 'turismo',
        condition: 'new',
        indexableTags: ['serra gaucha', 'gramado', 'canela', 'inverno'],
      },
      b2_value_proposition: {
        type: 'B2_VALUE_PROPOSITION',
        summaryLine: '5 dias inesquecíveis na Serra Gaúcha com passeios exclusivos e café colonial.',
        highlights: ['Hospedagem 4 estrelas', 'Aéreo incluso', 'Guia credenciado Cadastur'],
      },
      b3_role_media: {
        type: 'B3_ROLE_MEDIA',
        items: [
          {
            id: 'm1',
            url: 'https://cdn.waesy.com/gramado-cover.jpg',
            role: 'cover',
            altText: 'Centro de Gramado iluminado',
            displayOrder: 1,
          },
          {
            id: 'm2',
            url: 'https://cdn.waesy.com/operadora-contrato-confidencial.pdf',
            role: 'internal_document',
            altText: 'Contrato confidencial com a Cia Aérea',
            displayOrder: 99,
            isInternalOnly: true, // Arquivo confidencial!
          },
        ],
      },
      b4_specifications: {
        type: 'B4_TYPED_SPECIFICATIONS',
        archetypeId: 'A07',
        specs: [
          { key: 'duration_days', label: 'Duração', value: 5, unit: 'dias' },
          { key: 'transport', label: 'Transporte', value: 'Aéreo Regular' },
          { key: 'net_cost_internal', label: 'Custo Líquido', value: 120000, unit: 'centavos', isInternalOnly: true },
        ],
      },
      b5_inclusions_exclusions: {
        type: 'B5_INCLUSIONS_EXCLUSIONS',
        items: [
          { label: 'Passagens Aéreas de ida e volta', isIncluded: true },
          { label: 'Hospedagem com Café da Manhã', isIncluded: true },
          { label: 'Taxas de embarque e despesas pessoais', isIncluded: false },
        ],
      },
      b6_commercial_conditions: {
        type: 'B6_COMMERCIAL_CONDITIONS',
        paymentMethods: ['Pix', 'Cartão de Crédito'],
        maxInstallments: 10,
        fulfillmentType: 'on_site',
        warrantyPeriodDays: 90,
      },
      b7_policies: {
        type: 'B7_POLICIES',
        cancellationPolicy: 'Cancelamento gratuito até 7 dias após a contratação conforme CDC.',
        refundPolicy: 'Reembolso integral em caso de cancelamento dentro do prazo legal.',
      },
      b10_fiscal: {
        type: 'B10_FISCAL',
        cnaeCode: '7911-2/00',
        estimatedTaxPercent: 8.65,
        supplierCnpjInternal: '12.345.678/0001-99', // Dado confidencial do fornecedor!
      },
      b11_seo: {
        type: 'B11_SEO',
        slug: 'pacote-gramado-canela-5d',
        metaTitle: 'Pacote Gramado & Canela 5 Dias com Aéreo | Waesy',
        metaDescription: 'Reserve sua viagem inesquecível para Gramado e Canela com as melhores condições.',
        keywords: ['viagem gramado', 'turismo serra gaucha', 'pacote aereo'],
      },
      internal_economics: {
        type: 'INTERNAL_ECONOMICS',
        costCents: 150000,
        targetMarginPercent: 35,
        grossProfitCents: 80000,
        supplierName: 'Operadora Turística Regional LTDA',
        internalNotes: 'Margem negociada com bônus de volume semestral.',
        isInternalOnly: true,
      },
    },
  };

  it('G22: deve sanitizar a descrição narrativa eliminando tags perigosas, estilos inline e scripts', () => {
    const sanitizedHtml = sanitizeNarrativeDescription(mockAdWithInternalData.narrativeDescription);

    expect(sanitizedHtml).not.toContain('<script>');
    expect(sanitizedHtml).not.toContain('style="');
    expect(sanitizedHtml).not.toContain('onclick="');
    expect(sanitizedHtml).not.toContain('javascript:');
    expect(sanitizedHtml).toContain('<strong>todo conforto</strong>');
    expect(sanitizedHtml).toContain('rel="noopener noreferrer"');
  });

  it('G24: deve purgar rigorosamente todos os campos internos e notas de fornecedor', () => {
    const publicAd = stripInternalContent(mockAdWithInternalData);

    // Bloco de economia interna deve ser removido
    expect(publicAd.blocks.internal_economics).toBeUndefined();

    // Mídia de documento interno deve ser removida
    const mediaRoles = publicAd.blocks.b3_role_media.items.map((m) => m.role);
    expect(mediaRoles).not.toContain('internal_document');

    // Especificações com chave interna ou isInternalOnly devem ser removidas
    const specKeys = publicAd.blocks.b4_specifications.specs.map((s) => s.key);
    expect(specKeys).not.toContain('net_cost_internal');

    // CNPJ confidencial do fornecedor deve ser expurgado
    expect(publicAd.blocks.b10_fiscal?.supplierCnpjInternal).toBeUndefined();

    // A catraca não deve lançar erro para o payload limpo
    expect(() => assertNoInternalLeaks(publicAd)).not.toThrow();
  });

  it('G24: deve disparar erro fatal P0 caso dados internos tentem vazar para a vitrine', () => {
    // Se passarmos o objeto bruto com internal_economics, o validador DEVE lançar exceção
    expect(() => assertNoInternalLeaks(mockAdWithInternalData)).toThrowError(/CRITICAL_LEAK_P0/);
  });

  it('G23: deve renderizar com perfeição para formato Markdown', () => {
    const md = renderToMarkdown(mockAdWithInternalData);

    expect(md).toContain('# Pacote Gramado & Canela Inesquecível 5D/4N');
    expect(md).toContain('> 5 dias inesquecíveis na Serra Gaúcha');
    expect(md).toContain('## Especificações');
    expect(md).toContain('- **Duração:** 5 dias');
    expect(md).toContain('## O que está incluso');
    expect(md).toContain('- [x] Passagens Aéreas de ida e volta');
    expect(md).toContain('- [ ] Taxas de embarque');
    expect(md).not.toContain('INTERNAL_ECONOMICS');
    expect(md).not.toContain('supplierCnpjInternal');
  });

  it('G23: deve renderizar contextos específicos para Voucher e Contrato', () => {
    const voucher = renderToVoucherContext(mockAdWithInternalData);
    expect(voucher.title).toBe('Pacote Gramado & Canela Inesquecível 5D/4N');
    expect(voucher.inclusions).toContain('Passagens Aéreas de ida e volta');
    expect(voucher.exclusions).toContain('Taxas de embarque e despesas pessoais');
    expect(voucher.coverImage).toBe('https://cdn.waesy.com/gramado-cover.jpg');

    const contract = renderToContractContext(mockAdWithInternalData);
    expect(contract.objectTitle).toBe('Pacote Gramado & Canela Inesquecível 5D/4N');
    expect(contract.paymentTerms).toContain('Aceita Pix, Cartão de Crédito');
    expect(contract.jurisdictionDisclaimers.length).toBeGreaterThan(0);
  });
});
