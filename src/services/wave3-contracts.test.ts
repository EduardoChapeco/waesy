import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('ONDA 3: CONTRATOS BDD & ZOD SCHEMAS DAS SERVER FUNCTIONS', () => {

 // ─── 1. HR & HUB DO COLABORADOR ───
 describe('HR Contracts (hr.functions.ts)', () => {
 const TimeClockSchema = z.object({
 employeeId: z.string().uuid(),
 entryType: z.enum([
 "clock_in",
 "lunch_out",
 "lunch_in",
 "clock_out",
 "break_out",
 "break_in",
 "overtime_in",
 "overtime_out",
 ]),
 source: z.enum(["web", "mobile_pwa", "biometric_terminal", "supervisor_manual"]).default("web"),
 geolocation: z.object({
 latitude: z.number().optional(),
 longitude: z.number().optional(),
 accuracy: z.number().optional(),
 address: z.string().optional(),
 }).default({}),
 photoUrl: z.string().optional(),
 ipAddress: z.string().optional(),
 userAgent: z.string().optional(),
 });

 it('deve aceitar batida de ponto com GPS e IP válidos', () => {
 const payload = {
 employeeId: "11111111-1111-1111-1111-111111111111",
 entryType: "clock_in",
 source: "mobile_pwa",
 geolocation: { latitude: -23.5505, longitude: -46.6333, accuracy: 10, address: "Av. Paulista, 1000" },
 ipAddress: "189.40.22.15",
 };
 const result = TimeClockSchema.safeParse(payload);
 expect(result.success).toBe(true);
 });

 const PayslipSchema = z.object({
 employeeId: z.string().uuid(),
 referencePeriod: z.string().regex(/^[0-9]{4}-[0-9]{2}$/, "Formato deve ser YYYY-MM"),
 grossSalaryCents: z.number().int().min(0),
 inssDiscountCents: z.number().int().min(0).default(0),
 salaryBreakdown: z.array(z.object({
 code: z.string(),
 description: z.string(),
 type: z.enum(["earning", "deduction", "neutral"]),
 amount_cents: z.number().int(),
 })).default([]),
 });

 it('deve validar emissão de holerite com breakdown de proventos', () => {
 const payload = {
 employeeId: "22222222-2222-2222-2222-222222222222",
 referencePeriod: "2026-09",
 grossSalaryCents: 500000,
 inssDiscountCents: 55000,
 salaryBreakdown: [
 { code: "001", description: "Salário Base", type: "earning", amount_cents: 500000 },
 { code: "101", description: "Desconto INSS", type: "deduction", amount_cents: 55000 },
 ],
 };
 expect(PayslipSchema.safeParse(payload).success).toBe(true);
 });
 });

 // ─── 2. GASTRONOMIA & PDV ───
 describe('PDV & KDS Contracts (pdv.functions.ts)', () => {
 const PosMultiPaymentSchema = z.object({
 orderId: z.string().uuid(),
 payments: z.array(
 z.object({
 paymentMethod: z.enum(["cash", "pix", "credit_card", "debit_card", "meal_voucher", "store_credit", "cryptocurrency", "other"]),
 amountCents: z.number().int().positive(),
 changeCents: z.number().int().min(0).default(0),
 installments: z.number().int().min(1).default(1),
 }),
 ).min(1),
 });

 it('deve validar split de pagamento fracionado no balcão / mesa', () => {
 const payload = {
 orderId: "33333333-3333-3333-3333-333333333333",
 payments: [
 { paymentMethod: "pix", amountCents: 15000, installments: 1 },
 { paymentMethod: "cash", amountCents: 5000, changeCents: 0, installments: 1 },
 ],
 };
 expect(PosMultiPaymentSchema.safeParse(payload).success).toBe(true);
 });
 });

 // ─── 3. EVENTOS & SUBPAINÉIS ───
 describe('Events & Subpanels Contracts (events.functions.ts)', () => {
 const SubpanelSchema = z.object({
 eventId: z.string().uuid(),
 name: z.string().min(2),
 panelType: z.enum(["bar", "foodtruck", "restaurant", "merchandise", "ticketing_box", "vip_lounge", "security_checkpoint", "other"]).default("bar"),
 expireDays: z.number().int().min(1).default(30),
 });

 it('deve validar criação de subpainel tokenizado para bar/camarote', () => {
 const payload = {
 eventId: "44444444-4444-4444-4444-444444444444",
 name: "Bar Principal - Arena",
 panelType: "bar",
 expireDays: 15,
 };
 expect(SubpanelSchema.safeParse(payload).success).toBe(true);
 });
 });

 // ─── 4. WMS PICKING & EXPEDIÇÃO ───
 describe('WMS Contracts (wms.functions.ts)', () => {
 const BatchPickingSchema = z.object({
 orderIds: z.array(z.string().uuid()).min(1),
 operatorId: z.string().uuid().optional(),
 });

 it('deve validar criação de onda de separação com pedidos múltiplos', () => {
 const payload = {
 orderIds: [
 "55555555-5555-5555-5555-555555555555",
 "66666666-6666-6666-6666-666666666666",
 ],
 };
 expect(BatchPickingSchema.safeParse(payload).success).toBe(true);
 });
 });

 // ─── 5. PWA & PORTAL DE REPUTAÇÃO ───
 describe('PWA & Claim Contracts (pwa.functions.ts & claim.functions.ts)', () => {
 const ClaimSchema = z.object({
 storeId: z.string().uuid(),
 customerName: z.string().min(2),
 customerEmail: z.string().email(),
 title: z.string().min(3).max(160),
 description: z.string().min(10),
 category: z.enum(["atendimento", "entrega", "produto_defeituoso", "cobranca_indevida", "cancelamento_estorno", "outro"]),
 });

 it('deve validar abertura de chamado com categoria e e-mail válidos', () => {
 const payload = {
 storeId: "77777777-7777-7777-7777-777777777777",
 customerName: "Ana Paula Ramos",
 customerEmail: "ana.paula@gmail.com",
 title: "Atraso na entrega do pedido",
 description: "Meu pedido não foi entregue no prazo prometido de 24h.",
 category: "entrega",
 };
 expect(ClaimSchema.safeParse(payload).success).toBe(true);
 });
 });

 // ─── 6. SUPORTE & HANDOVER ───
 describe('Support Supervision Contracts (support-tickets.functions.ts)', () => {
 const HandoverSchema = z.object({
 ticket_id: z.string().uuid(),
 target_operator_id: z.string().uuid(),
 reason: z.string().min(5),
 });

 it('deve validar transferência de atendimento com motivo explícito', () => {
 const payload = {
 ticket_id: "88888888-8888-8888-8888-888888888888",
 target_operator_id: "99999999-9999-9999-9999-999999999999",
 reason: "Cliente solicitou atendimento técnico especializado em integrações.",
 };
 expect(HandoverSchema.safeParse(payload).success).toBe(true);
 });

 it('não deve inferir a primeira loja para ticket sem contexto de tenant', () => {
 const source = readFileSync(resolve(process.cwd(), 'src/services/support-tickets.functions.ts'), 'utf8');
 const customerTicketBlock = source.slice(source.indexOf('export const createCustomerTicket'));
 expect(customerTicketBlock).toContain('const effectiveStoreId = storeId || identity.store_id');
 expect(customerTicketBlock).toContain('Loja de destino não identificada.');
 expect(customerTicketBlock).not.toContain('.from("stores").select("id").limit(1)');
 });
 });
});
