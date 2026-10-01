import { describe, it, expect } from 'vitest';
import {
  calculateBasePriceQuote,
  calculateMarginAndMarkup,
  calculateRentalQuote,
  calculateSubscriptionQuote,
  calculateEarlyCancellationFee,
  CouponRule,
} from './index';

describe('Canonical Pricing Engine (G47–G54)', () => {
  it('G47: deve calcular corretamente preço de venda, desconto e percentual de economia', () => {
    const quote = calculateBasePriceQuote({
      archetypeId: 'A01',
      nicheId: 'varejo',
      listPriceCents: 20000, // R$ 200,00
      salePriceCents: 16000, // R$ 160,00
      costCents: 10000,      // R$ 100,00
    });

    expect(quote.listPriceCents).toBe(20000);
    expect(quote.finalPriceCents).toBe(16000);
    expect(quote.discountCents).toBe(4000);
    expect(quote.discountPercent).toBe(20);
    expect(quote.isPromotional).toBe(true);
    expect(quote.marginPercent).toBe(37.5); // (160 - 100) / 160 = 37.5%
    expect(quote.markupPercent).toBe(60);   // (160 - 100) / 100 = 60%
  });

  it('G48: deve aplicar cupom percentual respeitando teto máximo de desconto', () => {
    const coupon: CouponRule = {
      code: 'PROMO50',
      type: 'percentage',
      value: 50, // 50%
      maxDiscountCents: 5000, // Teto máximo de R$ 50,00
    };

    const quote = calculateBasePriceQuote(
      {
        archetypeId: 'A01',
        nicheId: 'varejo',
        listPriceCents: 30000, // R$ 300,00 -> 50% seria R$ 150,00, mas teto é R$ 50,00
      },
      coupon
    );

    // O desconto deve ser travado no teto de R$ 50,00
    expect(quote.finalPriceCents).toBe(25000);
    expect(quote.discountCents).toBe(5000);
  });

  it('G49: deve rejeitar cupom quando o nicho for incompatível', () => {
    const coupon: CouponRule = {
      code: 'TURISMO_ONLY',
      type: 'fixed_cents',
      value: 3000,
      applicableNiches: ['turismo'],
    };

    const quote = calculateBasePriceQuote(
      {
        archetypeId: 'A01',
        nicheId: 'varejo', // Incompatível com o cupom
        listPriceCents: 10000,
      },
      coupon
    );

    // O cupom não deve ser aplicado
    expect(quote.finalPriceCents).toBe(10000);
    expect(quote.discountCents).toBe(0);
  });

  it('G53: deve calcular locação por diárias com desconto progressivo de longa estadia', () => {
    // 10 diárias com base de R$ 200,00 a diária (>= 7 dias ganha 5% off na diária -> R$ 190,00)
    const rental = calculateRentalQuote({
      baseDailyRateCents: 20000,
      daysCount: 10,
      cleaningFeeCents: 15000, // R$ 150,00
      securityDepositCents: 50000, // R$ 500,00 caução
      insuranceDailyRateCents: 2000, // R$ 20,00 por dia
    });

    expect(rental.daysCount).toBe(10);
    expect(rental.dailyRateCents).toBe(19000); // 5% de desconto na diária
    expect(rental.subtotalDailyCents).toBe(190000); // R$ 1.900,00
    expect(rental.insuranceTotalCents).toBe(20000); // R$ 200,00
    expect(rental.cleaningFeeCents).toBe(15000); // R$ 150,00
    expect(rental.grossTotalCents).toBe(225000); // R$ 2.250,00 total a pagar
    expect(rental.securityDepositRefundableCents).toBe(50000);
  });

  it('G50: deve calcular assinatura anual com equivalente mensal e multa proporcional', () => {
    // Plano Anual de R$ 1.200,00 (referência mensal de R$ 150,00)
    const sub = calculateSubscriptionQuote(
      {
        cycle: 'annual',
        baseCyclePriceCents: 120000,
        trialDays: 7,
      },
      15000 // R$ 150,00 / mês
    );

    expect(sub.equivalentMonthlyPriceCents).toBe(10000); // R$ 100,00 / mês
    expect(sub.firstChargeTotalCents).toBe(0); // Trial de 7 dias = R$ 0 na primeira cobrança
    expect(sub.effectiveDiscountPercentVsMonthly).toBe(33.33); // 33.33% de desconto em relação aos 12x R$ 150,00

    // Multa de cancelamento antecipado faltando 6 meses (10% de multa sobre o saldo restante)
    const penalty = calculateEarlyCancellationFee(120000, 'annual', 6, 10);
    expect(penalty.remainingContractValueCents).toBe(60000); // R$ 600,00 restantes
    expect(penalty.feeCents).toBe(6000); // R$ 60,00 de multa rescisória justa
  });
});
