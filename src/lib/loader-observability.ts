/**
 * Helper de Observabilidade e Logging Estruturado para Loaders e Server Functions (Waesy)
 *
 * Registra erros detalhados de queries, contratos BFF, tabelas e RLS
 * para diagnóstico imediato nos logs do servidor / Cloudflare Workers,
 * enquanto fornece valores de fallback seguros para a UI não quebrar com FOUC.
 */

import {
  buildCanonicalStructuredError,
  type CanonicalStructuredErrorPayload,
} from "@/lib/telemetry/operational-logger";

export function logLoaderError<T>(
 context: {
 route: string;
 action: string;
 module?: string;
 tableOrEntity?: string;
 dbColumn?: string | null;
 userRole?: string;
 severity?: "error" | "critical";
 params?: unknown;
 },
 fallbackValue: T
): (error: unknown) => T {
 return (error: unknown) => {
 const derivedModule =
 context.module ||
 context.route.replace(/^\/+/, "").split("/").slice(0, 2).join("-") ||
 "core";
 const structuredPayload: CanonicalStructuredErrorPayload = buildCanonicalStructuredError({
 severity: context.severity || "error",
 route: context.route,
 module: derivedModule,
 contract: context.action,
 db_schema: "public",
 db_table: context.tableOrEntity || "unknown",
 db_column: context.dbColumn,
 user_role: context.userRole || "visitor",
 error,
 });

 console.error(
 `[ALERTA] [Observability] Falha na consulta [${context.route} -> ${context.action}]:`,
 JSON.stringify(structuredPayload)
 );

 return fallbackValue;
 };
}
