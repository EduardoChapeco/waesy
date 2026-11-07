/**
 * Kanban Configuration Server Functions (Waesy BFF)
 * 
 * Permite que lojistas e gestores personalizem colunas, nomes, cores e propósitos de Kanbans
 * (Tarefas, Comercial/CRM, Orçamentos, Suporte, Turismo).
 * 
 * 100% Real no Supabase | Zero Mocks | Multi-Tenant Seguro por store_id
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";

export type KanbanPurpose = "inbox" | "in_progress" | "review" | "won" | "lost" | "archived";

export type KanbanCardVariant =
  | "standard"
  | "commercial"
  | "kds"
  | "picking"
  | "service_order"
  | "hr_talent"
  | "hr_onboarding"
  | "purchasing";

export type KanbanDepartment = "rh" | "compras" | "operacoes" | "comercial" | "projetos" | "geral";

export type KanbanNiche = "gastronomia" | "oficina" | "imobiliaria" | "supermercado" | "turismo" | "servicos" | "geral";

export interface KanbanStageDTO {
  id?: string;
  stage_key: string;
  title: string;
  purpose: KanbanPurpose;
  color: string;
  sort_order: number;
  is_visible: boolean;
  description?: string;
  sla_minutes?: number;
  card_variant?: KanbanCardVariant;
  department?: KanbanDepartment;
  niche?: KanbanNiche;
}

export interface KanbanPresetDefinition {
  presetKey: string;
  title: string;
  department: KanbanDepartment;
  niche: KanbanNiche;
  cardVariant: KanbanCardVariant;
  stages: KanbanStageDTO[];
}

export const KANBAN_DEFAULTS: Record<string, KanbanStageDTO[]> = {
  tasks: [
    { stage_key: "todo", title: "A Fazer", purpose: "inbox", color: "var(--muted-foreground)", sort_order: 0, is_visible: true },
    { stage_key: "in_progress", title: "Em Andamento", purpose: "in_progress", color: "var(--primary)", sort_order: 1, is_visible: true },
    { stage_key: "review", title: "Em Revisão", purpose: "review", color: "var(--warning)", sort_order: 2, is_visible: true },
    { stage_key: "done", title: "Concluído", purpose: "won", color: "var(--success)", sort_order: 3, is_visible: true },
  ],
  commercial_crm: [
    { stage_key: "new", title: "Novos Leads", purpose: "inbox", color: "var(--primary)", sort_order: 0, is_visible: true },
    { stage_key: "contact", title: "Primeiro Contato", purpose: "in_progress", color: "var(--warning)", sort_order: 1, is_visible: true },
    { stage_key: "qualified", title: "Qualificação", purpose: "in_progress", color: "var(--accent-foreground)", sort_order: 2, is_visible: true },
    { stage_key: "proposal", title: "Proposta Enviada", purpose: "review", color: "var(--primary)", sort_order: 3, is_visible: true },
    { stage_key: "negotiation", title: "Em Negociação", purpose: "review", color: "var(--warning-strong)", sort_order: 4, is_visible: true },
    { stage_key: "won", title: "Ganhos / Convertidos", purpose: "won", color: "var(--success)", sort_order: 5, is_visible: true },
    { stage_key: "lost", title: "Perdidos", purpose: "lost", color: "var(--destructive)", sort_order: 6, is_visible: true },
  ],
  quotes: [
    { stage_key: "draft", title: "Rascunhos", purpose: "inbox", color: "var(--muted-foreground)", sort_order: 0, is_visible: true },
    { stage_key: "sent", title: "Enviados", purpose: "in_progress", color: "var(--primary)", sort_order: 1, is_visible: true },
    { stage_key: "negotiating", title: "Negociando", purpose: "review", color: "var(--warning)", sort_order: 2, is_visible: true },
    { stage_key: "approved", title: "Aprovados", purpose: "won", color: "var(--success)", sort_order: 3, is_visible: true },
    { stage_key: "rejected", title: "Recusados", purpose: "lost", color: "var(--destructive)", sort_order: 4, is_visible: true },
  ],
  support_tickets: [
    { stage_key: "open", title: "Aguardando Análise", purpose: "inbox", color: "var(--warning)", sort_order: 0, is_visible: true },
    { stage_key: "in_progress", title: "Em Atendimento", purpose: "in_progress", color: "var(--primary)", sort_order: 1, is_visible: true },
    { stage_key: "resolved", title: "Resolvidos", purpose: "won", color: "var(--success)", sort_order: 2, is_visible: true },
    { stage_key: "archived", title: "Arquivados", purpose: "archived", color: "var(--muted-foreground)", sort_order: 3, is_visible: true },
  ],
  appointments: [
    { stage_key: "pending", title: "Pendente", purpose: "inbox", color: "var(--warning)", sort_order: 0, is_visible: true },
    { stage_key: "confirmed", title: "Confirmado", purpose: "in_progress", color: "var(--primary)", sort_order: 1, is_visible: true },
    { stage_key: "in_service", title: "Em Atendimento", purpose: "in_progress", color: "var(--accent-foreground)", sort_order: 2, is_visible: true },
    { stage_key: "completed", title: "Concluído", purpose: "won", color: "var(--success)", sort_order: 3, is_visible: true },
    { stage_key: "cancelled", title: "Cancelado", purpose: "lost", color: "var(--destructive)", sort_order: 4, is_visible: true },
  ],
  agenda: [
    { stage_key: "pending", title: "Pendente", purpose: "inbox", color: "var(--warning)", sort_order: 0, is_visible: true },
    { stage_key: "confirmed", title: "Confirmado", purpose: "in_progress", color: "var(--primary)", sort_order: 1, is_visible: true },
    { stage_key: "in_service", title: "Em Atendimento", purpose: "in_progress", color: "var(--accent-foreground)", sort_order: 2, is_visible: true },
    { stage_key: "completed", title: "Concluído", purpose: "won", color: "var(--success)", sort_order: 3, is_visible: true },
    { stage_key: "cancelled", title: "Cancelado", purpose: "lost", color: "var(--destructive)", sort_order: 4, is_visible: true },
  ],
  orders: [
    { stage_key: "pending", title: "Pendente", purpose: "inbox", color: "var(--warning)", sort_order: 0, is_visible: true },
    { stage_key: "preparing", title: "Em Preparo", purpose: "in_progress", color: "var(--primary)", sort_order: 1, is_visible: true },
    { stage_key: "ready", title: "Pronto", purpose: "review", color: "var(--accent-foreground)", sort_order: 2, is_visible: true },
    { stage_key: "dispatched", title: "Em Despacho", purpose: "in_progress", color: "var(--primary)", sort_order: 3, is_visible: true },
    { stage_key: "delivered", title: "Entregue", purpose: "won", color: "var(--success)", sort_order: 4, is_visible: true },
    { stage_key: "cancelled", title: "Cancelado", purpose: "lost", color: "var(--destructive)", sort_order: 5, is_visible: true },
  ],
  pedidos: [
    { stage_key: "pending", title: "Pendente", purpose: "inbox", color: "var(--warning)", sort_order: 0, is_visible: true },
    { stage_key: "preparing", title: "Em Preparo", purpose: "in_progress", color: "var(--primary)", sort_order: 1, is_visible: true },
    { stage_key: "ready", title: "Pronto", purpose: "review", color: "var(--accent-foreground)", sort_order: 2, is_visible: true },
    { stage_key: "dispatched", title: "Em Despacho", purpose: "in_progress", color: "var(--primary)", sort_order: 3, is_visible: true },
    { stage_key: "delivered", title: "Entregue", purpose: "won", color: "var(--success)", sort_order: 4, is_visible: true },
    { stage_key: "cancelled", title: "Cancelado", purpose: "lost", color: "var(--destructive)", sort_order: 5, is_visible: true },
  ],
  customers: [
    { stage_key: "lead", title: "Novo Lead", purpose: "inbox", color: "var(--muted-foreground)", sort_order: 0, is_visible: true },
    { stage_key: "prospect", title: "Em Sondagem", purpose: "in_progress", color: "var(--primary)", sort_order: 1, is_visible: true },
    { stage_key: "active", title: "Cliente Ativo", purpose: "won", color: "var(--success)", sort_order: 2, is_visible: true },
    { stage_key: "vip", title: "Cliente VIP", purpose: "won", color: "var(--accent-foreground)", sort_order: 3, is_visible: true },
    { stage_key: "inactive", title: "Inativo", purpose: "lost", color: "var(--destructive)", sort_order: 4, is_visible: true },
  ],
  clientes: [
    { stage_key: "lead", title: "Novo Lead", purpose: "inbox", color: "var(--muted-foreground)", sort_order: 0, is_visible: true },
    { stage_key: "prospect", title: "Em Sondagem", purpose: "in_progress", color: "var(--primary)", sort_order: 1, is_visible: true },
    { stage_key: "active", title: "Cliente Ativo", purpose: "won", color: "var(--success)", sort_order: 2, is_visible: true },
    { stage_key: "vip", title: "Cliente VIP", purpose: "won", color: "var(--accent-foreground)", sort_order: 3, is_visible: true },
    { stage_key: "inactive", title: "Inativo", purpose: "lost", color: "var(--destructive)", sort_order: 4, is_visible: true },
  ],
};

export const KANBAN_PRESETS_CATALOG: Record<string, KanbanPresetDefinition> = {
  hr_recruitment: {
    presetKey: "hr_recruitment",
    title: "RH: Recrutamento e Seleção",
    department: "rh",
    niche: "geral",
    cardVariant: "hr_talent",
    stages: [
      { stage_key: "talent_pool", title: "Banco de Talentos", purpose: "inbox", color: "var(--muted-foreground)", sort_order: 0, is_visible: true, card_variant: "hr_talent", department: "rh" },
      { stage_key: "screening", title: "Triagem Curricular", purpose: "in_progress", color: "var(--primary)", sort_order: 1, is_visible: true, card_variant: "hr_talent", department: "rh" },
      { stage_key: "technical_interview", title: "Entrevista Técnica", purpose: "in_progress", color: "var(--warning)", sort_order: 2, is_visible: true, card_variant: "hr_talent", department: "rh" },
      { stage_key: "proposal", title: "Proposta Feita", purpose: "review", color: "var(--accent-foreground)", sort_order: 3, is_visible: true, card_variant: "hr_talent", department: "rh" },
      { stage_key: "hired", title: "Contratado", purpose: "won", color: "var(--success)", sort_order: 4, is_visible: true, card_variant: "hr_talent", department: "rh" },
      { stage_key: "future_pool", title: "Banco Futuro", purpose: "archived", color: "var(--muted-foreground)", sort_order: 5, is_visible: true, card_variant: "hr_talent", department: "rh" },
    ],
  },
  hr_onboarding: {
    presetKey: "hr_onboarding",
    title: "RH: Admissão e Onboarding",
    department: "rh",
    niche: "geral",
    cardVariant: "hr_onboarding",
    stages: [
      { stage_key: "admission_approved", title: "Admissão Aprovada", purpose: "inbox", color: "var(--primary)", sort_order: 0, is_visible: true, card_variant: "hr_onboarding", department: "rh" },
      { stage_key: "docs_collection", title: "Coleta de Documentos", purpose: "in_progress", color: "var(--warning)", sort_order: 1, is_visible: true, card_variant: "hr_onboarding", department: "rh" },
      { stage_key: "medical_exam", title: "Exame Admissional ASO", purpose: "in_progress", color: "var(--warning-strong)", sort_order: 2, is_visible: true, card_variant: "hr_onboarding", department: "rh" },
      { stage_key: "contract_signing", title: "Contrato Assinado", purpose: "review", color: "var(--accent-foreground)", sort_order: 3, is_visible: true, card_variant: "hr_onboarding", department: "rh" },
      { stage_key: "setup_access", title: "Acessos e Equipamentos", purpose: "review", color: "var(--primary)", sort_order: 4, is_visible: true, card_variant: "hr_onboarding", department: "rh" },
      { stage_key: "active_integrated", title: "Colaborador Integrado", purpose: "won", color: "var(--success)", sort_order: 5, is_visible: true, card_variant: "hr_onboarding", department: "rh" },
    ],
  },
  hr_offboarding: {
    presetKey: "hr_offboarding",
    title: "RH: Desligamento",
    department: "rh",
    niche: "geral",
    cardVariant: "hr_onboarding",
    stages: [
      { stage_key: "notice", title: "Aviso Prévio", purpose: "inbox", color: "var(--muted-foreground)", sort_order: 0, is_visible: true, card_variant: "hr_onboarding", department: "rh" },
      { stage_key: "exit_interview", title: "Entrevista de Saída", purpose: "in_progress", color: "var(--primary)", sort_order: 1, is_visible: true, card_variant: "hr_onboarding", department: "rh" },
      { stage_key: "demissional_aso", title: "ASO Demissional", purpose: "in_progress", color: "var(--warning)", sort_order: 2, is_visible: true, card_variant: "hr_onboarding", department: "rh" },
      { stage_key: "asset_return", title: "Devolução de Ativos", purpose: "review", color: "var(--warning-strong)", sort_order: 3, is_visible: true, card_variant: "hr_onboarding", department: "rh" },
      { stage_key: "trct_homologation", title: "Homologação TRCT", purpose: "won", color: "var(--success)", sort_order: 4, is_visible: true, card_variant: "hr_onboarding", department: "rh" },
      { stage_key: "archived", title: "Prontuário Arquivado", purpose: "archived", color: "var(--muted-foreground)", sort_order: 5, is_visible: true, card_variant: "hr_onboarding", department: "rh" },
    ],
  },
  purchasing_supplies: {
    presetKey: "purchasing_supplies",
    title: "Compras e Fornecedores",
    department: "compras",
    niche: "geral",
    cardVariant: "purchasing",
    stages: [
      { stage_key: "internal_req", title: "Requisição Interna", purpose: "inbox", color: "var(--muted-foreground)", sort_order: 0, is_visible: true, card_variant: "purchasing", department: "compras" },
      { stage_key: "quotation", title: "Cotação Fornecedores", purpose: "in_progress", color: "var(--primary)", sort_order: 1, is_visible: true, card_variant: "purchasing", department: "compras" },
      { stage_key: "approval", title: "Aprovação de Alçada", purpose: "review", color: "var(--warning)", sort_order: 2, is_visible: true, card_variant: "purchasing", department: "compras" },
      { stage_key: "po_issued", title: "Pedido Emitido", purpose: "review", color: "var(--accent-foreground)", sort_order: 3, is_visible: true, card_variant: "purchasing", department: "compras" },
      { stage_key: "in_transit", title: "Em Trânsito", purpose: "in_progress", color: "var(--primary)", sort_order: 4, is_visible: true, card_variant: "purchasing", department: "compras" },
      { stage_key: "dock_received", title: "Recebido na Doca", purpose: "won", color: "var(--success)", sort_order: 5, is_visible: true, card_variant: "purchasing", department: "compras" },
    ],
  },
  kds_kitchen: {
    presetKey: "kds_kitchen",
    title: "KDS Cozinha e Bar",
    department: "operacoes",
    niche: "gastronomia",
    cardVariant: "kds",
    stages: [
      { stage_key: "order_inbox", title: "Pedido Recebido", purpose: "inbox", color: "var(--primary)", sort_order: 0, is_visible: true, sla_minutes: 5, card_variant: "kds", department: "operacoes", niche: "gastronomia" },
      { stage_key: "preparing", title: "Em Preparo", purpose: "in_progress", color: "var(--warning)", sort_order: 1, is_visible: true, sla_minutes: 15, card_variant: "kds", department: "operacoes", niche: "gastronomia" },
      { stage_key: "finishing", title: "Montagem e Finalização", purpose: "review", color: "var(--accent-foreground)", sort_order: 2, is_visible: true, sla_minutes: 5, card_variant: "kds", department: "operacoes", niche: "gastronomia" },
      { stage_key: "ready_expedition", title: "Pronto para Expedição", purpose: "won", color: "var(--success)", sort_order: 3, is_visible: true, sla_minutes: 3, card_variant: "kds", department: "operacoes", niche: "gastronomia" },
      { stage_key: "collected", title: "Retirado pelo Garçom", purpose: "archived", color: "var(--muted-foreground)", sort_order: 4, is_visible: true, card_variant: "kds", department: "operacoes", niche: "gastronomia" },
    ],
  },
  picking_separation: {
    presetKey: "picking_separation",
    title: "Separação e Picking",
    department: "operacoes",
    niche: "supermercado",
    cardVariant: "picking",
    stages: [
      { stage_key: "pending_separation", title: "Fila de Separação", purpose: "inbox", color: "var(--muted-foreground)", sort_order: 0, is_visible: true, sla_minutes: 10, card_variant: "picking", department: "operacoes", niche: "supermercado" },
      { stage_key: "picking_active", title: "Em Separação", purpose: "in_progress", color: "var(--primary)", sort_order: 1, is_visible: true, sla_minutes: 20, card_variant: "picking", department: "operacoes", niche: "supermercado" },
      { stage_key: "weight_check", title: "Pesagem e Bipagem", purpose: "review", color: "var(--warning)", sort_order: 2, is_visible: true, sla_minutes: 8, card_variant: "picking", department: "operacoes", niche: "supermercado" },
      { stage_key: "packed_checkout", title: "Embalado e Conferido", purpose: "won", color: "var(--success)", sort_order: 3, is_visible: true, sla_minutes: 5, card_variant: "picking", department: "operacoes", niche: "supermercado" },
      { stage_key: "waiting_courier", title: "Aguardando Entregador", purpose: "review", color: "var(--accent-foreground)", sort_order: 4, is_visible: true, sla_minutes: 10, card_variant: "picking", department: "operacoes", niche: "supermercado" },
    ],
  },
  service_order_workshop: {
    presetKey: "service_order_workshop",
    title: "Oficina: Ordem de Serviço",
    department: "operacoes",
    niche: "oficina",
    cardVariant: "service_order",
    stages: [
      { stage_key: "reception", title: "Check-in do Veículo", purpose: "inbox", color: "var(--muted-foreground)", sort_order: 0, is_visible: true, card_variant: "service_order", department: "operacoes", niche: "oficina" },
      { stage_key: "diagnosis", title: "Diagnóstico Técnico", purpose: "in_progress", color: "var(--warning)", sort_order: 1, is_visible: true, card_variant: "service_order", department: "operacoes", niche: "oficina" },
      { stage_key: "budget_approval", title: "Orçamento com Cliente", purpose: "review", color: "var(--primary)", sort_order: 2, is_visible: true, card_variant: "service_order", department: "operacoes", niche: "oficina" },
      { stage_key: "parts_waiting", title: "Aguardando Peças", purpose: "review", color: "var(--warning-strong)", sort_order: 3, is_visible: true, card_variant: "service_order", department: "operacoes", niche: "oficina" },
      { stage_key: "repair_active", title: "Reparo em Execução", purpose: "in_progress", color: "var(--accent-foreground)", sort_order: 4, is_visible: true, card_variant: "service_order", department: "operacoes", niche: "oficina" },
      { stage_key: "quality_test", title: "Teste de Rodagem", purpose: "review", color: "var(--primary)", sort_order: 5, is_visible: true, card_variant: "service_order", department: "operacoes", niche: "oficina" },
      { stage_key: "delivered", title: "Entregue ao Cliente", purpose: "won", color: "var(--success)", sort_order: 6, is_visible: true, card_variant: "service_order", department: "operacoes", niche: "oficina" },
    ],
  },
  projects_engineering: {
    presetKey: "projects_engineering",
    title: "Imobiliária: Projetos e Obras",
    department: "projetos",
    niche: "imobiliaria",
    cardVariant: "standard",
    stages: [
      { stage_key: "briefing", title: "Briefing e Viabilidade", purpose: "inbox", color: "var(--muted-foreground)", sort_order: 0, is_visible: true, card_variant: "standard", department: "projetos", niche: "imobiliaria" },
      { stage_key: "draft_design", title: "Anteprojeto", purpose: "in_progress", color: "var(--primary)", sort_order: 1, is_visible: true, card_variant: "standard", department: "projetos", niche: "imobiliaria" },
      { stage_key: "executive", title: "Projeto Executivo", purpose: "in_progress", color: "var(--accent-foreground)", sort_order: 2, is_visible: true, card_variant: "standard", department: "projetos", niche: "imobiliaria" },
      { stage_key: "legal_approval", title: "Aprovação e Alvará", purpose: "review", color: "var(--warning)", sort_order: 3, is_visible: true, card_variant: "standard", department: "projetos", niche: "imobiliaria" },
      { stage_key: "construction", title: "Obra em Andamento", purpose: "in_progress", color: "var(--warning-strong)", sort_order: 4, is_visible: true, card_variant: "standard", department: "projetos", niche: "imobiliaria" },
      { stage_key: "keys_delivered", title: "Entrega de Chaves", purpose: "won", color: "var(--success)", sort_order: 5, is_visible: true, card_variant: "standard", department: "projetos", niche: "imobiliaria" },
    ],
  },
  tourism_crm: {
    presetKey: "tourism_crm",
    title: "Turismo: Atendimento e Vendas",
    department: "comercial",
    niche: "turismo",
    cardVariant: "commercial",
    stages: [
      { stage_key: "new", title: "Novos Contatos", purpose: "inbox", color: "var(--primary)", sort_order: 0, is_visible: true, card_variant: "commercial", department: "comercial", niche: "turismo" },
      { stage_key: "contact", title: "Sondagem e Briefing", purpose: "in_progress", color: "var(--warning)", sort_order: 1, is_visible: true, card_variant: "commercial", department: "comercial", niche: "turismo" },
      { stage_key: "qualified", title: "Cotação em Montagem", purpose: "in_progress", color: "var(--accent-foreground)", sort_order: 2, is_visible: true, card_variant: "commercial", department: "comercial", niche: "turismo" },
      { stage_key: "proposal", title: "Proposta Enviada", purpose: "review", color: "var(--primary)", sort_order: 3, is_visible: true, card_variant: "commercial", department: "comercial", niche: "turismo" },
      { stage_key: "negotiation", title: "Em Fechamento", purpose: "review", color: "var(--warning-strong)", sort_order: 4, is_visible: true, card_variant: "commercial", department: "comercial", niche: "turismo" },
      { stage_key: "won", title: "Viagem Confirmada", purpose: "won", color: "var(--success)", sort_order: 5, is_visible: true, card_variant: "commercial", department: "comercial", niche: "turismo" },
      { stage_key: "lost", title: "Desistência", purpose: "lost", color: "var(--destructive)", sort_order: 6, is_visible: true, card_variant: "commercial", department: "comercial", niche: "turismo" },
    ],
  },
};

// Adicionar presets no KANBAN_DEFAULTS
Object.entries(KANBAN_PRESETS_CATALOG).forEach(([key, preset]) => {
  KANBAN_DEFAULTS[key] = preset.stages;
});

export function resolveKanbanDefaults(
  module: string,
  department?: string,
  niche?: string
): KanbanStageDTO[] {
  if (module && KANBAN_DEFAULTS[module]) {
    return KANBAN_DEFAULTS[module];
  }

  if (department) {
    const match = Object.values(KANBAN_PRESETS_CATALOG).find(
      (p) => p.department === department && (!niche || p.niche === niche || p.niche === "geral")
    );
    if (match) return match.stages;
  }

  if (niche) {
    const match = Object.values(KANBAN_PRESETS_CATALOG).find((p) => p.niche === niche);
    if (match) return match.stages;
  }

  return KANBAN_DEFAULTS.tasks;
}

const StageSchema = z.object({
  id: z.string().uuid().optional(),
  stage_key: z.string().min(1),
  title: z.string().min(1),
  purpose: z.enum(["inbox", "in_progress", "review", "won", "lost", "archived"]),
  color: z.string().min(3),
  sort_order: z.number().int().min(0),
  is_visible: z.boolean(),
  description: z.string().optional(),
  sla_minutes: z.number().int().positive().optional(),
  card_variant: z.enum(["standard", "commercial", "kds", "picking", "service_order", "hr_talent", "hr_onboarding", "purchasing"]).optional(),
  department: z.enum(["rh", "compras", "operacoes", "comercial", "projetos", "geral"]).optional(),
  niche: z.enum(["gastronomia", "oficina", "imobiliaria", "supermercado", "turismo", "servicos", "geral"]).optional(),
});

/**
 * Listar estágios de Kanban para um módulo específico
 */
export const listKanbanStages = createServerFn({ method: "GET" })
  .validator(
    z.object({
      storeId: z.string().uuid(),
      module: z.string().min(1),
      department: z.enum(["rh", "compras", "operacoes", "comercial", "projetos", "geral"]).optional(),
      niche: z.enum(["gastronomia", "oficina", "imobiliaria", "supermercado", "turismo", "servicos", "geral"]).optional(),
    })
  )
  .handler(async ({ data: { storeId, module, department, niche } }): Promise<KanbanStageDTO[]> => {
    const db = getServerClient();
    const defaults = resolveKanbanDefaults(module, department, niche);

    try {
      const { data: rows, error } = await db
        .from("kanban_stage_configs")
        .select("*")
        .eq("store_id", storeId)
        .eq("module", module)
        .order("sort_order", { ascending: true });

      if (error) {
        console.warn(`[kanban-config] Aviso ao buscar estágios customizados para ${module}: ${error.message}. Usando defaults canônicos.`);
        return defaults;
      }

      if (!rows || rows.length === 0) {
        return defaults;
      }

      return rows.map((r: any) => ({
        id: r.id,
        stage_key: r.stage_key,
        title: r.title,
        purpose: r.purpose as KanbanPurpose,
        color: r.color,
        sort_order: r.sort_order,
        is_visible: r.is_visible,
        sla_minutes: r.sla_minutes ?? undefined,
        card_variant: r.card_variant ?? undefined,
        department: r.department ?? undefined,
        niche: r.niche ?? undefined,
        description: r.description ?? undefined,
      }));
    } catch (err: any) {
      console.error(`[kanban-config] Erro no listKanbanStages para ${module}:`, err?.message);
      return defaults;
    }
  });

/**
 * Salvar estágios customizados de Kanban
 */
export const saveKanbanStages = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid(),
      module: z.string().min(1),
      stages: z.array(StageSchema),
    })
  )
  .handler(async ({ data: { storeId, module, stages } }) => {
    const db = getServerClient();
    const { requireAdmin } = await import("@/lib/server-access");
    await requireAdmin();

    try {
      const recordsToUpsert = stages.map((s, idx) => ({
        store_id: storeId,
        module,
        stage_key: s.stage_key,
        title: s.title,
        purpose: s.purpose,
        color: s.color,
        sort_order: idx,
        is_visible: s.is_visible,
        sla_minutes: s.sla_minutes ?? null,
        card_variant: s.card_variant ?? null,
        department: s.department ?? null,
        niche: s.niche ?? null,
        description: s.description ?? null,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await db
        .from("kanban_stage_configs")
        .upsert(recordsToUpsert, { onConflict: "store_id,module,stage_key" });

      if (error) {
        console.error(`[kanban-config] Falha ao persistir estágios customizados (${module}):`, error);
        throw new Error(`Erro ao salvar colunas do Kanban: ${error.message}`);
      }

      return { status: "ok" as const, count: stages.length };
    } catch (err: any) {
      console.error(`[kanban-config] Erro interno no saveKanbanStages:`, err);
      throw new Error(err?.message || "Falha ao salvar configurações do Kanban");
    }
  });

/**
 * Restaurar estágios padrão de fábrica
 */
export const resetKanbanStages = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid(),
      module: z.string().min(1),
    })
  )
  .handler(async ({ data: { storeId, module } }) => {
    const db = getServerClient();
    const { requireAdmin } = await import("@/lib/server-access");
    await requireAdmin();

    const { error } = await db
      .from("kanban_stage_configs")
      .delete()
      .eq("store_id", storeId)
      .eq("module", module);

    if (error) {
      throw new Error(`Erro ao restaurar colunas padrão: ${error.message}`);
    }

    return { status: "ok" as const, defaults: KANBAN_DEFAULTS[module] || KANBAN_DEFAULTS.tasks };
  });
