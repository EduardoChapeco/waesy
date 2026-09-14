import { getServerClient } from "./supabase";

/**
 * Registra um erro silencioso no banco de dados para auditoria.
 * Dispara de forma assíncrona para não bloquear a resposta da Server Function.
 */
export interface LogSystemErrorParams {
  route?: string;
  error?: unknown;
  error_message?: string;
  errorMessage?: string;
  operation?: string;
  payload?: any;
  userId?: string;
  user_id?: string;
  pageUrl?: string;
  page_url?: string;
  schemaName?: string;
  schema_name?: string;
  tableName?: string;
  table_name?: string;
  columnName?: string;
  column_name?: string;
  contractName?: string;
  contract_name?: string;
  severity?: "error" | "warn" | "critical";
}

/**
 * Registra um erro no banco de dados para auditoria detalhada de engenharia.
 * Dispara de forma assíncrona para não bloquear a resposta da Server Function.
 */
export function logSystemError(params: LogSystemErrorParams) {
  const errorMessage =
    params.errorMessage ||
    params.error_message ||
    (params.error instanceof Error ? params.error.message : params.error != null ? String(params.error) : "Unknown error");
  const stackTrace = params.error instanceof Error ? params.error.stack : undefined;
  
  // Extrai tabela ou coluna de erros típicos do Postgres se não fornecidos
  let derivedTable = params.tableName || params.table_name;
  let derivedColumn = params.columnName || params.column_name;
  let derivedSchema = params.schemaName || params.schema_name || "public";
  const derivedPageUrl = params.pageUrl || params.page_url;
  const derivedRoute = params.route || params.contractName || params.contract_name || params.operation || "system";
  const derivedContract = params.contractName || params.contract_name || derivedRoute;
  const derivedUserId = params.userId || params.user_id;

  if (params.error && typeof params.error === "object") {
    const pErr = params.error as any;
    if (pErr.table) derivedTable = pErr.table;
    if (pErr.column) derivedColumn = pErr.column;
    if (pErr.schema) derivedSchema = pErr.schema;
  }

  console.error(`[System Error - ${derivedRoute}${derivedContract ? ` (${derivedContract})` : ""}]`, errorMessage);

  try {
    const db = getServerClient();
    db.from("system_error_logs").insert({
      route: derivedRoute,
      contract_name: derivedContract,
      page_url: derivedPageUrl,
      schema_name: derivedSchema,
      table_name: derivedTable,
      column_name: derivedColumn,
      error_message: errorMessage,
      stack_trace: stackTrace,
      payload: params.payload,
      user_id: derivedUserId,
      severity: params.severity || "error",
    }).then(({ error }) => {
      if (error) {
        console.error("[System Error Logger] Falha ao gravar log no Supabase:", error);
      }
    });
  } catch (e) {
    console.error("[System Error Logger] Erro crítico ao tentar gravar log:", e);
  }
}
