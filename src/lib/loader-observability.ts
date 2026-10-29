/**
 * Helper de Observabilidade e Logging Estruturado para Loaders e Server Functions (Waesy)
 *
 * Registra erros detalhados de queries, contratos BFF, tabelas e RLS
 * para diagnóstico imediato nos logs do servidor / Cloudflare Workers,
 * enquanto fornece valores de fallback seguros para a UI não quebrar com FOUC.
 */

export function logLoaderError<T>(
 context: {
 route: string;
 action: string;
 tableOrEntity?: string;
 params?: unknown;
 },
 fallbackValue: T
): (error: unknown) => T {
 return (error: unknown) => {
 const errorDetails = {
 timestamp: new Date().toISOString(),
 route: context.route,
 action: context.action,
 tableOrEntity: context.tableOrEntity || "desconhecida",
 params: context.params,
 message: error instanceof Error ? error.message : String(error),
 stack: error instanceof Error ? error.stack : undefined,
 };

 console.error(
 `[ALERTA] [Observability] Falha na consulta [${context.route} -> ${context.action}]:`,
 JSON.stringify(errorDetails, null, 2)
 );

 return fallbackValue;
 };
}
