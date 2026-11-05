import { describe, it, expect } from 'vitest';
import {
  matchQuoteWithDemand,
  calculateTariffTemperature,
  normalizeCityName,
  isDateWithinWindow
} from './travel-opportunity-matcher';

describe('Motor de Oportunidades de Viagem (travel-opportunity-matcher)', () => {
  const mockDemand = {
    id: 'demand-123',
    contactName: 'Carlos Eduardo Silva',
    contactPhone: '49999998888',
    destinationCity: 'Lisboa',
    earliestDeparture: '2027-05-01',
    latestDeparture: '2027-05-15',
    budgetMaxCents: 1100000, // R$ 11.000,00
    adultsCount: 2,
    childrenCount: 0,
    preferredProductType: 'package' as const,
    lastInteractionAt: '2027-04-10T10:00:00Z'
  };

  it('deve normalizar nomes de cidades removendo acentos e caracteres especiais', () => {
    expect(normalizeCityName('São Paulo / SP')).toBe('saopaulosp');
    expect(normalizeCityName('Lisbôa - Portugal')).toBe('lisboaportugal');
    expect(normalizeCityName('Maceió')).toBe('maceio');
  });

  it('deve verificar corretamente a janela de datas com tolerância de flexibilidade', () => {
    expect(isDateWithinWindow('2027-05-07', '2027-05-01', '2027-05-15', 2)).toBe(true);
    expect(isDateWithinWindow('2027-05-17', '2027-05-01', '2027-05-15', 2)).toBe(true); // Flexibilidade de 2 dias
    expect(isDateWithinWindow('2027-05-20', '2027-05-01', '2027-05-15', 2)).toBe(false);
  });

  it('deve casar com sucesso uma oferta compatível de aéreo/pacote Lisboa dentro do orçamento', () => {
    const offer = {
      id: 'offer-lis-1',
      destinationCity: 'Lisboa',
      originCity: 'Chapecó',
      startDate: '2027-05-07',
      endDate: '2027-05-18',
      totalCents: 1010619, // R$ 10.106,19 (extraído real do Infotravel no HAR)
      adultsCount: 2,
      childrenCount: 0,
      productType: 'package' as const
    };

    const result = matchQuoteWithDemand(mockDemand, offer, { agencyName: 'Excelência Tour' });
    expect(result.isMatch).toBe(true);
    expect(result.matchScore).toBeGreaterThanOrEqual(90);
    expect(result.variancePct).toBeLessThan(0); // Mais barato que o orçamento
    expect(result.suggestedWhatsAppPitch).toContain('Carlos');
    expect(result.suggestedWhatsAppPitch).toContain('Lisboa');
    expect(result.suggestedWhatsAppPitch).toContain('Excelência Tour');
  });

  it('deve aceitar oferta até 10% acima do orçamento (tolerância padrão configurada)', () => {
    const offer = {
      id: 'offer-lis-2',
      destinationCity: 'Lisboa',
      startDate: '2027-05-07',
      totalCents: 1180000, // R$ 11.800,00 (~7.27% acima de R$ 11.000,00)
      adultsCount: 2,
      productType: 'package' as const
    };

    const result = matchQuoteWithDemand(mockDemand, offer);
    expect(result.isMatch).toBe(true);
    expect(result.variancePct).toBe(7.27);
    expect(result.reasons.some(r => r.includes('tolerância de 10%'))).toBe(true);
  });

  it('deve rejeitar oferta que excede o teto de 10% de tolerância', () => {
    const offer = {
      id: 'offer-lis-expensive',
      destinationCity: 'Lisboa',
      startDate: '2027-05-07',
      totalCents: 1350000, // R$ 13.500,00 (> 22% acima)
      adultsCount: 2,
      productType: 'package' as const
    };

    const result = matchQuoteWithDemand(mockDemand, offer);
    expect(result.isMatch).toBe(false);
    expect(result.matchScore).toBe(0);
    expect(result.reasons[0]).toContain('excede o orçamento');
  });

  it('deve rejeitar se o destino for diferente', () => {
    const offer = {
      id: 'offer-maceio',
      destinationCity: 'Maceió',
      startDate: '2027-05-07',
      totalCents: 500000,
      adultsCount: 2,
      productType: 'package' as const
    };

    const result = matchQuoteWithDemand(mockDemand, offer);
    expect(result.isMatch).toBe(false);
    expect(result.reasons[0]).toContain('Destino não compatível');
  });

  it('deve calcular temperatura tarifária honesta conforme regras de amostragem', () => {
    // Amostra menor que 5 deve retornar insufficient_data
    const smallSample = [100000, 110000, 105000];
    expect(calculateTariffTemperature(95000, smallSample).temperature).toBe('insufficient_data');

    // Amostra robusta: mediana de [100k, 102k, 105k, 108k, 110k] é 105k
    const validSample = [100000, 102000, 105000, 108000, 110000];
    
    // Tarifa fria (< 88% da mediana = 105k * 0.88 = 92.4k)
    const coldResult = calculateTariffTemperature(89000, validSample);
    expect(coldResult.temperature).toBe('cold');
    expect(coldResult.medianCents).toBe(105000);

    // Tarifa quente (> 115% da mediana = 105k * 1.15 = 120.75k)
    const warmResult = calculateTariffTemperature(125000, validSample);
    expect(warmResult.temperature).toBe('warm');

    // Tarifa moderada
    const moderateResult = calculateTariffTemperature(104000, validSample);
    expect(moderateResult.temperature).toBe('moderate');
  });
});
