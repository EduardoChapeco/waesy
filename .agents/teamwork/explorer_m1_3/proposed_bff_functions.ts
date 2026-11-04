/**
 * Workspace User View Preferences Server Functions (Waesy BFF)
 * 
 * Persistência multi-tenant isolada de preferências de visualização de rotinas operacionais
 * (Agenda, Clientes, Pedidos, Tarefas, Financeiro, Turismo).
 * 
 * Governança:
 * - AGENTS.md B.4, B.8, B.25 (100% Desestruturação de parâmetros & Validação Zod estrita)
 * - Zero-Trust RLS: Isolamento hermético por usuário e membro da loja via store_members / workspace_members
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess, STAFF_ROLES } from "@/lib/server-access";

// -----------------------------------------------------------------------------
// Tipos Canônicos e Schemas Zod (PROJECT.md Interface Contract 1)
// -----------------------------------------------------------------------------

export const WorkspaceModuleEnum = z.enum([
  "agenda",
  "clientes",
  "pedidos",
  "tarefas",
  "financeiro",
  "turismo",
]);
export type WorkspaceModule = z.infer<typeof WorkspaceModuleEnum>;

export const WorkspaceViewModeEnum = z.enum(["table", "kanban", "cards", "calendar"]);
export type WorkspaceViewMode = z.infer<typeof WorkspaceViewModeEnum>;

export const WorkspaceViewPreferenceSchema = z.object({
  store_id: z.string().uuid("store_id deve ser um UUID válido"),
  module: WorkspaceModuleEnum,
  view_mode: WorkspaceViewModeEnum,
  column_settings: z.record(z.any()).optional().default({}),
  sort_field: z.string().nullable().optional().default(null),
  sort_direction: z.enum(["asc", "desc"]).nullable().optional().default(null),
  filters: z.record(z.any()).optional().default({}),
});

export type WorkspaceViewPreferenceDTO = z.infer<typeof WorkspaceViewPreferenceSchema>;

export const GetWorkspaceViewPreferenceSchema = z.object({
  store_id: z.string().uuid("store_id deve ser um UUID válido"),
  module: WorkspaceModuleEnum,
});

export const SaveWorkspaceViewPreferenceSchema = WorkspaceViewPreferenceSchema;

export const ResetWorkspaceViewPreferenceSchema = z.object({
  store_id: z.string().uuid("store_id deve ser um UUID válido"),
  module: WorkspaceModuleEnum,
});

/**
 * Modos de visualização padrão de fábrica por módulo
 */
export const DEFAULT_VIEW_MODES: Record<WorkspaceModule, WorkspaceViewMode> = {
  agenda: "calendar",
  clientes: "table",
  pedidos: "kanban",
  tarefas: "kanban",
  financeiro: "table",
  turismo: "table",
};

// -----------------------------------------------------------------------------
// Server Functions BFF
// -----------------------------------------------------------------------------

/**
 * Obter preferência de visualização do usuário para um módulo da loja.
 * Caso o usuário ainda não possua preferência salva ou seja anônimo, retorna fallback seguro.
 * 
 * Atende Invariante B.25: 100% dos parâmetros desestruturados no escopo.
 */
export const getWorkspaceViewPreference = createServerFn({ method: "GET" })
  .validator(GetWorkspaceViewPreferenceSchema)
  .handler(async ({ data: { store_id, module } }): Promise<WorkspaceViewPreferenceDTO> => {
    const fallbackDefault: WorkspaceViewPreferenceDTO = {
      store_id,
      module,
      view_mode: DEFAULT_VIEW_MODES[module] || "table",
      column_settings: {},
      sort_field: null,
      sort_direction: null,
      filters: {},
    };

    try {
      const identity = await getServerIdentity().catch(() => null);
      if (!identity?.id) {
        return fallbackDefault;
      }

      // Verificação de acesso à loja (membro ativo)
      assertStoreAccess(identity, STAFF_ROLES);

      const db = getServerClient();
      const { data: row, error } = await db
        .from("workspace_user_view_preferences")
        .select("store_id, module, view_mode, column_settings, sort_field, sort_direction, filters")
        .eq("store_id", store_id)
        .eq("user_id", identity.id)
        .eq("module", module)
        .maybeSingle();

      if (error) {
        console.warn(`[workspace-view-preferences] Erro ao buscar preferência para ${module}: ${error.message}. Retornando padrão.`);
        return fallbackDefault;
      }

      if (!row) {
        return fallbackDefault;
      }

      return {
        store_id: row.store_id,
        module: row.module as WorkspaceModule,
        view_mode: row.view_mode as WorkspaceViewMode,
        column_settings: row.column_settings || {},
        sort_field: row.sort_field || null,
        sort_direction: (row.sort_direction as "asc" | "desc" | null) || null,
        filters: row.filters || {},
      };
    } catch (err: any) {
      console.warn(`[workspace-view-preferences] Exceção ao consultar preferência para ${module}: ${err?.message}. Retornando padrão.`);
      return fallbackDefault;
    }
  });

/**
 * Salvar ou atualizar preferência de visualização (upsert idempotente).
 * 
 * Atende Invariante B.25: 100% dos parâmetros (store_id, module, view_mode, column_settings, sort_field, sort_direction, filters)
 * são desestruturados no escopo, com tratamento defensivo de opcionais/nulos.
 */
export const saveWorkspaceViewPreference = createServerFn({ method: "POST" })
  .validator(SaveWorkspaceViewPreferenceSchema)
  .handler(async ({ data: { store_id, module, view_mode, column_settings, sort_field, sort_direction, filters } }) => {
    const identity = await getServerIdentity().catch(() => null);
    if (!identity?.id) {
      throw new Error("Usuário não autenticado");
    }

    // Isolamento multi-tenant: apenas membros autorizados podem salvar preferências na loja
    assertStoreAccess(identity, STAFF_ROLES);

    // Tratamento defensivo de opcionais/nulos conforme Invariante B.25
    const safeColumnSettings = column_settings ?? {};
    const safeSortField = sort_field ?? null;
    const safeSortDirection = sort_direction ?? null;
    const safeFilters = filters ?? {};

    const db = getServerClient();
    const payload = {
      store_id,
      user_id: identity.id,
      module,
      view_mode,
      column_settings: safeColumnSettings,
      sort_field: safeSortField,
      sort_direction: safeSortDirection,
      filters: safeFilters,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await db
      .from("workspace_user_view_preferences")
      .upsert(payload, { onConflict: "store_id,user_id,module" })
      .select("store_id, module, view_mode, column_settings, sort_field, sort_direction, filters")
      .single();

    if (error) {
      console.error(`[workspace-view-preferences] Erro ao persistir preferência (${module}):`, error);
      throw new Error(`Erro ao salvar preferência de visualização: ${error.message}`);
    }

    return {
      success: true as const,
      data: {
        store_id: data.store_id,
        module: data.module as WorkspaceModule,
        view_mode: data.view_mode as WorkspaceViewMode,
        column_settings: data.column_settings || {},
        sort_field: data.sort_field || null,
        sort_direction: (data.sort_direction as "asc" | "desc" | null) || null,
        filters: data.filters || {},
      },
    };
  });

/**
 * Restaurar preferência padrão de fábrica para o módulo.
 * Remove o registro customizado do usuário para que a tela assuma os defaults de layout.
 * 
 * Atende Invariante B.25: 100% dos parâmetros desestruturados no escopo.
 */
export const resetWorkspaceViewPreference = createServerFn({ method: "POST" })
  .validator(ResetWorkspaceViewPreferenceSchema)
  .handler(async ({ data: { store_id, module } }) => {
    const identity = await getServerIdentity().catch(() => null);
    if (!identity?.id) {
      throw new Error("Usuário não autenticado");
    }

    assertStoreAccess(identity, STAFF_ROLES);

    const db = getServerClient();
    const { error } = await db
      .from("workspace_user_view_preferences")
      .delete()
      .eq("store_id", store_id)
      .eq("user_id", identity.id)
      .eq("module", module);

    if (error) {
      console.error(`[workspace-view-preferences] Erro ao redefinir preferência (${module}):`, error);
      throw new Error(`Erro ao redefinir preferência: ${error.message}`);
    }

    return {
      success: true as const,
      defaultViewMode: DEFAULT_VIEW_MODES[module] || "table",
    };
  });
