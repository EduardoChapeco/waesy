import { describe, it, expect } from 'vitest';
import { ConditionalStepEngine } from './conditional-step-engine';
import { NicheCalculationEngine } from './niche-calculation-engine';
import { FormFieldEngine, type SemanticFieldDefinition } from './form-field-engine';

describe('ONDA 2: MOTORES CENTRAIS DO WAESY', () => {

 // ─── 1. CONDITIONAL STEP ENGINE ───
 describe('ConditionalStepEngine', () => {
 it('deve avaliar regras de igualdade e inclusão corretamente', () => {
 const state = { role: 'admin', age: 25, tags: ['vip', 'speaker'] };

 expect(ConditionalStepEngine.evaluateRule({ field: 'role', operator: 'equals', value: 'admin' }, state)).toBe(true);
 expect(ConditionalStepEngine.evaluateRule({ field: 'role', operator: 'equals', value: 'user' }, state)).toBe(false);
 expect(ConditionalStepEngine.evaluateRule({ field: 'age', operator: 'greater_than', value: 18 }, state)).toBe(true);
 expect(ConditionalStepEngine.evaluateRule({ field: 'tags', operator: 'contains', value: 'vip' }, state)).toBe(true);
 });

 it('deve avaliar grupos lógicos complexos AND / OR', () => {
 const state = { niche: 'gastronomia', hasKds: true, tablesCount: 12 };

 const groupAnd = {
 logicalOperator: 'AND' as const,
 rules: [
 { field: 'niche', operator: 'equals' as const, value: 'gastronomia' },
 { field: 'hasKds', operator: 'equals' as const, value: true },
 ],
 };

 expect(ConditionalStepEngine.evaluateGroup(groupAnd, state)).toBe(true);

 const groupOr = {
 logicalOperator: 'OR' as const,
 rules: [
 { field: 'niche', operator: 'equals' as const, value: 'turismo' },
 { field: 'tablesCount', operator: 'greater_than' as const, value: 10 },
 ],
 };

 expect(ConditionalStepEngine.evaluateGroup(groupOr, state)).toBe(true);
 });

 it('deve filtrar passos visíveis e processar ações dinâmicas', () => {
 const steps = [
 { id: 'step-1', title: 'Dados Gerais', order: 1 },
 {
 id: 'step-2',
 title: 'Configurações de Cozinha',
 order: 2,
 condition: {
 logicalOperator: 'AND' as const,
 rules: [{ field: 'isRestaurant', operator: 'equals' as const, value: true }],
 },
 },
 ];

 const resVisible = ConditionalStepEngine.computeVisibleSteps(steps, { isRestaurant: true });
 expect(resVisible.visibleSteps.map((s) => s.id)).toEqual(['step-1', 'step-2']);

 const resHidden = ConditionalStepEngine.computeVisibleSteps(steps, { isRestaurant: false });
 expect(resHidden.visibleSteps.map((s) => s.id)).toEqual(['step-1']);
 });
 });

 // ─── 2. NICHE CALCULATION ENGINE ───
 describe('NicheCalculationEngine', () => {
 it('deve calcular divisão de comanda gastronômica com taxa de serviço e couvert', () => {
 const res = NicheCalculationEngine.calculateSplitBill({
 subtotalCents: 20000, // R$ 200,00
 serviceTaxPercentage: 10, // R$ 20,00
 couvertCentsPerPerson: 1000, // R$ 10,00 x 4 = R$ 40,00
 peopleCount: 4,
 discountCents: 0,
 });

 // Total = 200 + 20 + 40 = 260,00 (26000 cents)
 // Por pessoa = 65,00 (6500 cents)
 expect(res.totalCents).toBe(26000);
 expect(res.perPersonCents).toBe(6500);
 expect(res.roundingDifferenceCents).toBe(0);
 });

 it('deve calcular cotação de pacote de turismo com markup e parcelas', () => {
 const res = NicheCalculationEngine.calculateTourismQuote({
 baseCostCents: 100000, // R$ 1.000,00 aéreo
 agencyMarkupPercentage: 20, // 20%
 nightsCount: 5,
 passengersCount: 2,
 dailyRatePerNightCents: 20000, // R$ 200 x 5 noites x 2 pax = R$ 2.000,00
 extraTaxesCents: 5000, // R$ 50,00 taxa de embarque
 maxInstallmentsWithoutInterest: 10,
 });

 // Base: 1000 + 2000 = 3000
 // Markup 20% = 600
 // Taxas: 50
 // Total: 3650,00 (365000 cents)
 expect(res.totalPriceCents).toBe(365000);
 expect(res.pricePerPassengerCents).toBe(182500);
 expect(res.installmentAmountCents).toBe(36500);
 expect(res.installmentsCount).toBe(10);
 });

 it('deve calcular preços dinâmicos de lotes de eventos e meia-entrada', () => {
 const res = NicheCalculationEngine.calculateEventLotPrice({
 basePriceCents: 10000, // R$ 100,00
 convenienceTaxPercentage: 10, // 10%
 isHalfPriceEligible: true,
 soldTicketsCount: 850,
 totalCapacity: 1000, // 85% vendido -> Lote 3 Final (1.4x)
 });

 // Lote 3: 100,00 x 1.4 = 140,00
 // Meia entrada: 70,00 (7000 cents)
 // Conveniência: 10% de 70 = 7,00 (700 cents)
 // Total: 77,00 (7700 cents)
 expect(res.lotName).toBe('Lote 3 Final');
 expect(res.finalTicketPriceCents).toBe(7000);
 expect(res.totalChargedCents).toBe(7700);
 });

 it('deve calcular margem de varejo e markup sobre custo', () => {
 const res = NicheCalculationEngine.calculateRetailPrice({
 costPriceCents: 5000, // R$ 50,00
 desiredMarginPercentage: 30, // 30%
 icmsPct: 18,
 shippingCents: 1000, // R$ 10,00 frete
 });

 // Base cost: 6000 cents
 // Denominator: 1 - 0.30 - 0.18 = 0.52
 // Preço de venda: 6000 / 0.52 = ~11538 cents (R$ 115,38)
 expect(res.suggestedSalePriceCents).toBeGreaterThan(11000);
 expect(res.grossProfitCents).toBeGreaterThan(0);
 });
 });

 // ─── 3. FORM FIELD ENGINE ───
 describe('FormFieldEngine', () => {
 it('deve validar CPFs e CNPJs com precisão de Módulo 11', () => {
 expect(FormFieldEngine.isValidCPF('52998224725')).toBe(true);
 expect(FormFieldEngine.isValidCPF('11111111111')).toBe(false);
 expect(FormFieldEngine.isValidCPF('12345678900')).toBe(false);

 expect(FormFieldEngine.isValidCNPJ('11222333000181')).toBe(true);
 expect(FormFieldEngine.isValidCNPJ('00000000000000')).toBe(false);
 });

 it('deve formatar moedas e máscaras brasileiras', () => {
 expect(FormFieldEngine.formatCurrencyBRL(125000)).toBe('R$\u00a01.250,00');
 expect(FormFieldEngine.parseCurrencyBRLToCents('R$ 1.250,00')).toBe(125000);
 expect(FormFieldEngine.formatCPF('52998224725')).toBe('529.982.247-25');
 });

 it('deve gerar schemas Zod executáveis e validar dados reais', () => {
 const fields: SemanticFieldDefinition[] = [
 { id: 'f1', name: 'nome', label: 'Nome', type: 'text', required: true, minLength: 3 },
 { id: 'f2', name: 'email', label: 'E-mail', type: 'email', required: true },
 { id: 'f3', name: 'cpf', label: 'CPF', type: 'cpf', required: true },
 { id: 'f4', name: 'salario_cents', label: 'Salário', type: 'currency_brl', required: false },
 ];

 const schema = FormFieldEngine.buildZodSchema(fields);

 const validData = {
 nome: 'Carlos Santos',
 email: 'carlos@empresa.com',
 cpf: '52998224725',
 salario_cents: 350000,
 };

 const result = schema.safeParse(validData);
 expect(result.success).toBe(true);

 const invalidData = {
 nome: 'Al', // minLength 3
 email: 'nao-e-email',
 cpf: '00000000000',
 };

 const invalidResult = schema.safeParse(invalidData);
 expect(invalidResult.success).toBe(false);
 });
 });

});
