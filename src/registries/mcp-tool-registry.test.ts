import { describe, it, expect } from 'vitest';
import { getMcpToolByName } from './mcp-tool-registry';

describe('MCP Tool Registry - Plan 3 Canonical Offer Extensions (G69)', () => {
  it('G69 & G47: deve calcular preço transparente via ferramenta MCP calculate_canonical_offer_price', async () => {
    const tool = getMcpToolByName('calculate_canonical_offer_price');
    expect(tool).toBeDefined();

    const result = await tool!.handler({} as any, {
      archetypeId: 'A01',
      nicheId: 'varejo',
      listPriceCents: 25000, // R$ 250,00
      salePriceCents: 20000, // R$ 200,00
      couponCode: 'DESC10',
      couponDiscountPercent: 10,
    });

    expect(result.listPriceBrl).toBe(250);
    expect(result.finalPriceBrl).toBe(180); // R$ 200,00 - 10% (R$ 20,00) = R$ 180,00
    expect(result.discountBrl).toBe(70);   // R$ 250 - R$ 180 = R$ 70 de economia total
    expect(result.isPromotional).toBe(true);
  });

  it('G69 & G10: deve inspecionar pacote de nicho via ferramenta MCP get_niche_package_spec', async () => {
    const tool = getMcpToolByName('get_niche_package_spec');
    expect(tool).toBeDefined();

    const result = await tool!.handler({} as any, {
      nicheId: 'turismo',
    });

    expect(result.id).toBe('turismo');
    expect(result.regulatoryBody).toContain('Cadastur');
    expect(result.terminology.primaryActionLabel).toBe('Reservar Agora');
    expect(result.sectionsCount).toBeGreaterThan(0);
  });
});
