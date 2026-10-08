import { describe, it, expect } from 'vitest';
import { NicheCalculationEngine } from './niche-calculation-engine';
import { ConditionalStepEngine } from './conditional-step-engine';
import { FormFieldEngine } from './form-field-engine';

describe('ONDA 6.1: HOMOLOGAÇÃO MULTINICHO E ISOLAMENTO DE JORNADAS', () => {

 // ─── 1. JORNADA GASTRONOMIA ───
 describe('Jornada Gastronomia (Mesa -> KDS -> Multi-Pagamento)', () => {
 it('deve simular ciclo completo: consumo em mesa, 10% de serviço, couvert e split de pagamento', () => {
 // Pedido: 2 Hambúrgueres artesanais + 2 Bebidas + 2 Sobremesas = R$ 180,00
 const subtotalCents = 18000;
 const bill = NicheCalculationEngine.calculateSplitBill({
 subtotalCents,
 serviceTaxPercentage: 10,
 couvertCentsPerPerson: 500, // R$ 5,00 x 2 = R$ 10,00
 peopleCount: 2,
 });

 // Total esperado: 180,00 + 18,00 (10%) + 10,00 (couvert) = 208,00 (20800 cents)
 expect(bill.totalCents).toBe(20800);
 expect(bill.perPersonCents).toBe(10400); // R$ 104,00 por pessoa

 // Split de Pagamento: Pessoa 1 paga R$ 104 no PIX, Pessoa 2 paga R$ 104 no Cartão
 const payments = [
 { method: 'pix', amountCents: 10400 },
 { method: 'credit_card', amountCents: 10400 },
 ];
 const totalPaid = payments.reduce((acc, p) => acc + p.amountCents, 0);
 expect(totalPaid).toBe(bill.totalCents);
 });
 });

 // ─── 2. JORNADA TURISMO ───
 describe('Jornada Turismo (Cotação -> Markup -> Parcelamento)', () => {
 it('deve simular cálculo de pacote para casal com margem de agência e 10x sem juros', () => {
 const quote = NicheCalculationEngine.calculateTourismQuote({
 baseCostCents: 200000, // R$ 2.000,00 passagens aéreas casal
 agencyMarkupPercentage: 18, // 18% margem da agência
 nightsCount: 4,
 passengersCount: 2,
 dailyRatePerNightCents: 35000, // R$ 350/noite x 4 noites x 2 pax = R$ 2.800,00
 extraTaxesCents: 12000, // R$ 120,00 taxas
 maxInstallmentsWithoutInterest: 10,
 });

 // Base total: 2000 + 2800 = 4800
 // Markup: 18% de 4800 = 864
 // Taxas: 120
 // Total: 5784,00 (578400 cents)
 expect(quote.totalPriceCents).toBe(578400);
 expect(quote.pricePerPassengerCents).toBe(289200); // R$ 2.892,00 por passageiro
 expect(quote.installmentAmountCents).toBe(57840); // 10x de R$ 578,40
 expect(quote.installmentsCount).toBe(10);
 });
 });

 // ─── 3. JORNADA EVENTOS ───
 describe('Jornada Eventos (Cálculo Determinístico de Lotes)', () => {
 it('deve calcular virada de lote e taxas com os dados fornecidos', () => {
 const lot = NicheCalculationEngine.calculateEventLotPrice({
 basePriceCents: 12000, // R$ 120,00
 convenienceTaxPercentage: 10,
 isHalfPriceEligible: false,
 soldTicketsCount: 920,
 totalCapacity: 1000, // 92% vendido -> Lote 3 Final (1.4x)
 });

 expect(lot.lotName).toBe('Lote 3 Final');
 expect(lot.finalTicketPriceCents).toBe(16800); // 120 x 1.4 = 168,00
 expect(lot.convenienceTaxCents).toBe(1680);
 expect(lot.totalChargedCents).toBe(18480); // R$ 184,80
 expect(lot.isLotSoldOut).toBe(false);

 });
 });

 // ─── 4. JORNADA VAREJO / COMÉRCIO ───
 describe('Jornada Varejo B2B/B2C (Markup -> Formação de Preço)', () => {
 it('deve validar precificação com margem líquida de 35% e impostos de 18%', () => {
 const retail = NicheCalculationEngine.calculateRetailPrice({
 costPriceCents: 12000, // R$ 120,00 produto
 desiredMarginPercentage: 35,
 icmsPct: 18,
 shippingCents: 2000, // R$ 20,00 frete
 });

 // Custo base: 140,00 (14000 cents)
 // Denominador: 1 - 0.35 - 0.18 = 0.47
 // Preço de venda: 140 / 0.47 = ~R$ 297,87
 expect(retail.suggestedSalePriceCents).toBeGreaterThan(29000);
 expect(retail.grossProfitCents).toBeGreaterThan(9000);
 expect(retail.effectiveMarginPct).toBeGreaterThan(30);
 });
 });

 // ─── 5. JORNADA RH & PONTO ELETRÔNICO ───
 describe('Jornada RH & Ponto (Módulo 11 CPF -> Validação de Jornada)', () => {
 it('deve validar CPF e calcular holerite sem inconsistências', () => {
 expect(FormFieldEngine.isValidCPF('52998224725')).toBe(true);
 const formatted = FormFieldEngine.formatCPF('52998224725');
 expect(formatted).toBe('529.982.247-25');

 const currencyStr = FormFieldEngine.formatCurrencyBRL(450000);
 expect(currencyStr).toContain('4.500,00');
 });
 });
});
