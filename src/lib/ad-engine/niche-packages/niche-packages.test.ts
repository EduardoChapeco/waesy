import { describe, it, expect } from 'vitest';
import {
  getNichePackage,
  listAllNichePackages,
  isArchetypeAllowedForNiche,
  getEnabledArchetypesForNiche,
  sanitizeNicheAttributesForPublic,
} from './index';

describe('Niche Packages Canonical Library (G10–G18)', () => {
  it('G10: deve carregar e validar todos os pacotes de nicho registrados', () => {
    const packages = listAllNichePackages();
    expect(packages.length).toBeGreaterThanOrEqual(7);

    const ids = packages.map((p) => p.id);
    expect(ids).toContain('turismo');
    expect(ids).toContain('varejo');
    expect(ids).toContain('mercado');
    expect(ids).toContain('servicos');
    expect(ids).toContain('imoveis');
    expect(ids).toContain('veiculos');
    expect(ids).toContain('digital');
  });

  it('G13: deve validar corretamente a permissão de arquétipos por nicho', () => {
    // Turismo proíbe A01 (Produto simples com estoque físico) e habilita A07 (Pacote)
    expect(isArchetypeAllowedForNiche('turismo', 'A01')).toBe(false);
    expect(isArchetypeAllowedForNiche('turismo', 'A07')).toBe(true);
    expect(isArchetypeAllowedForNiche('turismo', 'A10')).toBe(true);

    // Varejo habilita A01 e A02, mas proíbe A08 (Serviço com agendamento)
    expect(isArchetypeAllowedForNiche('varejo', 'A01')).toBe(true);
    expect(isArchetypeAllowedForNiche('varejo', 'A02')).toBe(true);
    expect(isArchetypeAllowedForNiche('varejo', 'A08')).toBe(false);

    // Digital habilita A05 e A06, proíbe A01 e A14
    expect(isArchetypeAllowedForNiche('digital', 'A05')).toBe(true);
    expect(isArchetypeAllowedForNiche('digital', 'A06')).toBe(true);
    expect(isArchetypeAllowedForNiche('digital', 'A01')).toBe(false);
  });

  it('G14: deve garantir que cada pacote tem seções de detalhe ordenadas', () => {
    const turismo = getNichePackage('turismo');
    expect(turismo.detailSections.length).toBeGreaterThan(0);

    // Garante que a ordenação das seções é crescente
    for (let i = 0; i < turismo.detailSections.length - 1; i++) {
      expect(turismo.detailSections[i].order).toBeLessThan(turismo.detailSections[i + 1].order);
    }
  });

  it('G15: deve possuir regras fiscais e órgãos reguladores declarados', () => {
    const imoveis = getNichePackage('imoveis');
    expect(imoveis.fiscalAndRegulatory.regulatoryBody).toContain('CRECI');
    expect(imoveis.fiscalAndRegulatory.requiresCnae).toBe(true);

    const turismo = getNichePackage('turismo');
    expect(turismo.fiscalAndRegulatory.regulatoryBody).toContain('Cadastur');
  });

  it('G18 & G24: deve sanitizar dados e impedir vazamento de campos internos para clientes públicos', () => {
    const rawTurismoAttributes = {
      destination_name: 'Gramado e Canela',
      transport_type: 'rodoviario_leito',
      operator_cost_cents: 150000, // Custo interno! Não pode vazar
      secret_margin_internal: '45%', // Sufixo interno!
    };

    const sanitized = sanitizeNicheAttributesForPublic('turismo', rawTurismoAttributes);

    expect(sanitized.destination_name).toBe('Gramado e Canela');
    expect(sanitized.transport_type).toBe('rodoviario_leito');
    expect(sanitized.operator_cost_cents).toBeUndefined();
    expect(sanitized.secret_margin_internal).toBeUndefined();
  });
});
