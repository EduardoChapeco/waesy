/**
 * Waesy Runtime Module Auditor
 * Cérebro validador em tempo de execução de completude e integridade operacional do workspace por nicho.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type HealthStatus = 'healthy' | 'needs_attention' | 'critical';

export interface AuditIssue {
 code: string;
 category: 'schema' | 'config' | 'payment' | 'fulfillment' | 'compliance';
 severity: 'blocker' | 'warning' | 'info';
 message: string;
 remediationPath?: string;
 actionLabel?: string;
}

export interface ModuleAuditReport {
 storeId: string;
 niche: string;
 healthScore: number; // 0 - 100
 status: HealthStatus;
 auditedAt: string;
 capabilities: {
 canReceiveOrders: boolean;
 canProcessPayments: boolean;
 canDispatchDelivery: boolean;
 canTrackTime: boolean;
 canRunKds: boolean;
 canSellTickets: boolean;
 };
 issues: AuditIssue[];
 summary: string;
}

export class ModuleAuditor {
 /**
 * Executa a auditoria completa de saúde operacional do workspace.
 */
 public static async auditStoreWorkspace(
 storeId: string,
 niche: string,
 client: SupabaseClient
 ): Promise<ModuleAuditReport> {
 const issues: AuditIssue[] = [];
 let score = 100;

 // 1. Auditoria da Loja Base
 const { data: store, error: storeError } = await client
 .from('stores')
 .select('id, name, slug, phone, cnpj, settings, is_active')
 .eq('id', storeId)
 .maybeSingle();

 if (storeError || !store) {
 return {
 storeId,
 niche,
 healthScore: 0,
 status: 'critical',
 auditedAt: new Date().toISOString(),
 capabilities: {
 canReceiveOrders: false,
 canProcessPayments: false,
 canDispatchDelivery: false,
 canTrackTime: false,
 canRunKds: false,
 canSellTickets: false,
 },
 issues: [
 {
 code: 'STORE_NOT_FOUND',
 category: 'config',
 severity: 'blocker',
 message: 'Loja não encontrada ou sem permissão de acesso.',
 },
 ],
 summary: 'Espaço de trabalho inacessível.',
 };
 }

 if (!store.cnpj) {
 score -= 15;
 issues.push({
 code: 'MISSING_DOCUMENT',
 category: 'compliance',
 severity: 'warning',
 message: 'CPF ou CNPJ da empresa não cadastrado.',
 remediationPath: '/workspace/configuracoes',
 actionLabel: 'Completar Cadastro',
 });
 }

 if (!store.phone) {
 score -= 10;
 issues.push({
 code: 'MISSING_PHONE',
 category: 'config',
 severity: 'warning',
 message: 'Telefone de contato comercial não configurado.',
 remediationPath: '/workspace/configuracoes',
 actionLabel: 'Adicionar Telefone',
 });
 }

 // 2. Auditoria Específica por Nicho
 const capabilities = {
 canReceiveOrders: false,
 canProcessPayments: false,
 canDispatchDelivery: false,
 canTrackTime: false,
 canRunKds: false,
 canSellTickets: false,
 };

 // Gastronomia
 if (niche === 'gastronomia' || niche === 'alimentacao') {
 const { count: tableCount } = await client
 .from('restaurant_tables')
 .select('*', { count: 'exact', head: true })
 .eq('store_id', storeId);

 if (!tableCount || tableCount === 0) {
 score -= 20;
 issues.push({
 code: 'NO_TABLES_CONFIGURED',
 category: 'fulfillment',
 severity: 'warning',
 message: 'Nenhuma mesa de salão cadastrada para o restaurante.',
 remediationPath: '/workspace/pdv/mesas',
 actionLabel: 'Cadastrar Mesas',
 });
 } else {
 capabilities.canRunKds = true;
 }
 }

 // Eventos
 if (niche === 'eventos') {
 const { count: eventCount } = await client
 .from('events')
 .select('*', { count: 'exact', head: true })
 .eq('store_id', storeId);

 if (!eventCount || eventCount === 0) {
 score -= 25;
 issues.push({
 code: 'NO_ACTIVE_EVENTS',
 category: 'fulfillment',
 severity: 'blocker',
 message: 'Nenhum evento criado no painel.',
 remediationPath: '/workspace/eventos/novo',
 actionLabel: 'Criar Primeiro Evento',
 });
 } else {
 capabilities.canSellTickets = true;
 }
 }

 // RH & Ponto (Transversal a qualquer nicho)
 const { count: employeeCount } = await client
 .from('employees')
 .select('*', { count: 'exact', head: true })
 .eq('store_id', storeId)
 .eq('status', 'active');

 if (employeeCount && employeeCount > 0) {
 capabilities.canTrackTime = true;
 }

 // Métodos de Pagamento
 const { count: paymentCount } = await client
 .from('payment_methods')
 .select('*', { count: 'exact', head: true })
 .eq('store_id', storeId)
 .eq('is_active', true);

 if (!paymentCount || paymentCount === 0) {
 score -= 25;
 issues.push({
 code: 'NO_PAYMENT_METHOD',
 category: 'payment',
 severity: 'blocker',
 message: 'Nenhum meio de pagamento ativo (PIX, Cartão ou Dinheiro).',
 remediationPath: '/workspace/configuracoes/pagamentos',
 actionLabel: 'Ativar Pagamentos',
 });
 } else {
 capabilities.canProcessPayments = true;
 capabilities.canReceiveOrders = true;
 }

 // Normalização final do Score
 const finalScore = Math.max(0, Math.min(100, score));
 let status: HealthStatus = 'healthy';
 if (finalScore < 50 || issues.some((i) => i.severity === 'blocker')) {
 status = 'critical';
 } else if (finalScore < 80 || issues.length > 0) {
 status = 'needs_attention';
 }

 let summary = 'O workspace opera com integridade plena e está homologado para receber tráfego.';
 if (status === 'critical') {
 summary = 'Existem pendências impeditivas que bloqueiam o recebimento de pedidos ou transações.';
 } else if (status === 'needs_attention') {
 summary = 'O workspace está operacional, mas requer ajustes para máxima conversão e conformidade.';
 }

 return {
 storeId,
 niche,
 healthScore: finalScore,
 status,
 auditedAt: new Date().toISOString(),
 capabilities,
 issues,
 summary,
 };
 }
}
