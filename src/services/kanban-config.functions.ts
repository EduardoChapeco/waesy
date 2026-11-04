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

export interface KanbanStageDTO {
  id?: string;
  stage_key: string;
  title: string;
  purpose: KanbanPurpose;
  color: string;
  sort_order: number;
  is_visible: boolean;
  description?: string;
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

const StageSchema = z.object({
  id: z.string().uuid().optional(),
  stage_key: z.string().min(1),
  title: z.string().min(1),
  purpose: z.enum(["inbox", "in_progress", "review", "won", "lost", "archived"]),
  color: z.string().min(3),
  sort_order: z.number().int().min(0),
  is_visible: z.boolean(),
});

/**
 * Listar estágios de Kanban para um módulo específico
 */
export const listKanbanStages = createServerFn({ method: "GET" })
  .validator(
    z.object({
      storeId: z.string().uuid(),
      module: z.string().min(1),
    })
  )
  .handler(async ({ data: { storeId, module } }): Promise<KanbanStageDTO[]> => {
    const db = getServerClient();
    const defaults = KANBAN_DEFAULTS[module] || KANBAN_DEFAULTS.tasks;

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
