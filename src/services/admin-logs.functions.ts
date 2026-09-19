import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { requirePlatformAdmin } from "@/lib/server-access";

export interface SystemLogItem {
  id: string;
  route: string;
  error_message: string;
  stack_trace?: string | null;
  severity: "critical" | "error" | "warn";
  payload?: any;
  created_at: string;
  user_id?: string | null;
  contract_name?: string | null;
  page_url?: string | null;
  table_name?: string | null;
  column_name?: string | null;
  schema_name?: string | null;
  profiles?: {
    full_name: string;
    email: string;
    username?: string;
  } | null;
}

export interface SystemLogsStats {
  total: number;
  critical: number;
  errors: number;
  warnings: number;
  topRoutes: { route: string; count: number }[];
  lastErrorAt: string | null;
}

/**
 * Lista logs de erro do sistema com suporte a filtros e busca.
 */
export const getSystemLogs = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        severity: z.enum(["all", "critical", "error", "warn"]).optional().default("all"),
        search: z.string().optional(),
        route: z.string().optional(),
        limit: z.number().int().min(1).max(200).optional().default(100),
      })
      .optional(),
  )
  .handler(async ({ data: filter }) => {
    await requirePlatformAdmin();
    const db = getServerClient();

    let query = db
      .from("system_error_logs")
      .select(
        "id, route, error_message, stack_trace, severity, payload, created_at, user_id, contract_name, page_url, table_name, column_name, schema_name",
      )
      .order("created_at", { ascending: false })
      .limit(filter?.limit || 100);

    if (filter?.severity && filter.severity !== "all") {
      query = query.eq("severity", filter.severity);
    }

    if (filter?.route) {
      query = query.eq("route", filter.route);
    }

    if (filter?.search && filter.search.trim()) {
      const s = filter.search.trim();
      query = query.or(`route.ilike.%${s}%,error_message.ilike.%${s}%,contract_name.ilike.%${s}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[getSystemLogs] Error fetching logs:", error);
      return [];
    }

    const logs = data || [];
    const userIds = [...new Set(logs.map((l: any) => l.user_id).filter(Boolean))];
    const profileMap = new Map<string, any>();

    if (userIds.length > 0) {
      try {
        const { data: profs } = await db
          .from("profiles")
          .select("id, full_name, username")
          .in("id", userIds);
        (profs || []).forEach((p: any) => profileMap.set(p.id, p));
      } catch (e) {
        console.warn("[getSystemLogs] Could not fetch profiles for logs:", e);
      }
    }

    return logs.map((log: any): SystemLogItem => {
      const prof = profileMap.get(log.user_id);
      return {
        ...log,
        profiles: prof
          ? {
              full_name: prof.full_name || prof.username || "Usuário",
              email: "",
              username: prof.username || undefined,
            }
          : null,
      };
    });
  });

/**
 * Estatísticas consolidadas para o painel de telemetria e incidentes.
 */
export const getSystemLogsStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<SystemLogsStats> => {
    await requirePlatformAdmin();
    const db = getServerClient();

    const { data: logs, error } = await db
      .from("system_error_logs")
      .select("id, severity, route, created_at")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error || !logs) {
      return {
        total: 0,
        critical: 0,
        errors: 0,
        warnings: 0,
        topRoutes: [],
        lastErrorAt: null,
      };
    }

    let critical = 0;
    let errors = 0;
    let warnings = 0;
    const routeCounts = new Map<string, number>();

    for (const log of logs) {
      if (log.severity === "critical") critical++;
      else if (log.severity === "warn") warnings++;
      else errors++;

      const r = log.route || "desconhecido";
      routeCounts.set(r, (routeCounts.get(r) || 0) + 1);
    }

    const topRoutes = Array.from(routeCounts.entries())
      .map(([route, count]) => ({ route, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total: logs.length,
      critical,
      errors,
      warnings,
      topRoutes,
      lastErrorAt: logs[0]?.created_at || null,
    };
  },
);

/**
 * Exclui um log de erro específico após verificação do admin master.
 */
export const deleteSystemLog = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data: { id } }) => {
    await requirePlatformAdmin();
    const db = getServerClient();

    const { error } = await db.from("system_error_logs").delete().eq("id", id);
    if (error) {
      console.error("[deleteSystemLog] Error:", error);
      throw new Error("Falha ao excluir log.");
    }

    return { success: true };
  });

/**
 * Limpa todos os logs do sistema ou por severidade com autoridade Master Admin.
 */
export const clearSystemLogs = createServerFn({ method: "POST" })
  .validator(
    z
      .object({
        severity: z.enum(["all", "critical", "error", "warn"]).optional().default("all"),
      })
      .optional(),
  )
  .handler(async ({ data: input }) => {
    await requirePlatformAdmin();
    const db = getServerClient();

    let query = db.from("system_error_logs").delete();

    if (input?.severity && input.severity !== "all") {
      query = query.eq("severity", input.severity);
    } else {
      query = query.neq("id", "00000000-0000-0000-0000-000000000000"); // all rows
    }

    const { error } = await query;
    if (error) {
      console.error("[clearSystemLogs] Error:", error);
      throw new Error("Falha ao limpar logs.");
    }

    return { success: true };
  });

// ─── 5. BILATERALIDADE FORENSE & GOVERNANÇA (Master ↔ Loja) ─────────────────

export interface ForensicAuditEventItem {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  target_entity_type: string;
  target_entity_id: string;
  action: string;
  ip_address: string | null;
  user_agent: string | null;
  payload_snapshot: any;
  checksum_sha256: string | null;
  created_at: string;
  actor_name?: string;
  actor_username?: string;
}

/**
 * Consulta a trilha imutável de eventos forenses de governança da plataforma.
 * Acesso exclusivo: Administradores da Plataforma (Admin Master).
 */
export const getForensicAuditEvents = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        targetType: z.string().optional(),
        targetId: z.string().optional(),
        action: z.string().optional(),
        limit: z.number().int().min(1).max(200).optional().default(50),
      })
      .optional(),
  )
  .handler(async ({ data: filter }): Promise<ForensicAuditEventItem[]> => {
    await requirePlatformAdmin();
    const db = getServerClient();

    let query = db
      .from("forensic_audit_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(filter?.limit || 50);

    if (filter?.targetType) {
      query = query.eq("target_entity_type", filter.targetType);
    }
    if (filter?.targetId) {
      query = query.eq("target_entity_id", filter.targetId);
    }
    if (filter?.action) {
      query = query.eq("action", filter.action);
    }

    const { data: rows, error } = await query;
    if (error || !rows) {
      console.error("[getForensicAuditEvents] Erro ao buscar eventos forenses:", error);
      return [];
    }

    // Enriquece com nomes dos atores
    const actorIds = [...new Set(rows.map((r: any) => r.actor_id).filter(Boolean))];
    const profileMap = new Map<string, any>();

    if (actorIds.length > 0) {
      try {
        const { data: profiles } = await db
          .from("profiles")
          .select("id, full_name, username")
          .in("id", actorIds);
        (profiles || []).forEach((p: any) => profileMap.set(p.id, p));
      } catch (e) {
        console.warn("[getForensicAuditEvents] Não foi possível carregar perfis dos atores:", e);
      }
    }

    return rows.map((row: any): ForensicAuditEventItem => {
      const prof = profileMap.get(row.actor_id);
      return {
        id: row.id,
        actor_id: row.actor_id,
        actor_role: row.actor_role,
        target_entity_type: row.target_entity_type,
        target_entity_id: row.target_entity_id,
        action: row.action,
        ip_address: row.ip_address,
        user_agent: row.user_agent,
        payload_snapshot: row.payload_snapshot,
        checksum_sha256: row.checksum_sha256,
        created_at: row.created_at,
        actor_name: prof?.full_name || prof?.username || "Sistema / Administrador",
        actor_username: prof?.username || undefined,
      };
    });
  });

export interface StoreAuditLogItem {
  id: string;
  store_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  payload_snapshot: any;
  created_at: string;
  user_name?: string;
}

/**
 * Consulta a trilha de auditoria operacional da Loja autenticada no Workspace.
 * Garante bilateralidade: o lojista audita ações realizadas na sua própria loja.
 */
export const getStoreAuditLogs = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        action: z.string().optional(),
        entityType: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional().default(50),
      })
      .optional(),
  )
  .handler(async ({ data: filter }): Promise<StoreAuditLogItem[]> => {
    const { getServerIdentity } = await import("@/lib/server-access");
    const identity = await getServerIdentity();
    if (!identity?.id) throw new Error("Não autorizado.");

    const storeId = identity.store_id || identity.memberships?.[0]?.store_id;
    if (!storeId) return [];

    const db = getServerClient();

    let query = db
      .from("audit_logs")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(filter?.limit || 50);

    if (filter?.action) query = query.eq("action", filter.action);
    if (filter?.entityType) query = query.eq("entity_type", filter.entityType);

    const { data: rows, error } = await query;
    if (error || !rows) {
      console.error("[getStoreAuditLogs] Erro ao buscar logs da loja:", error);
      return [];
    }

    // Enriquece com nomes dos usuários da equipe
    const userIds = [...new Set(rows.map((r: any) => r.user_id).filter(Boolean))];
    const profileMap = new Map<string, any>();

    if (userIds.length > 0) {
      try {
        const { data: profiles } = await db
          .from("profiles")
          .select("id, full_name, username")
          .in("id", userIds);
        (profiles || []).forEach((p: any) => profileMap.set(p.id, p));
      } catch (e) {
        console.warn("[getStoreAuditLogs] Falha ao ler perfis de equipe:", e);
      }
    }

    return rows.map((row: any): StoreAuditLogItem => {
      const prof = profileMap.get(row.user_id);
      return {
        id: row.id,
        store_id: row.store_id,
        user_id: row.user_id,
        action: row.action,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        payload_snapshot: row.payload_snapshot,
        created_at: row.created_at,
        user_name: prof?.full_name || prof?.username || "Membro da Equipe",
      };
    });
  });

