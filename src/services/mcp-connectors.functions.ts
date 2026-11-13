/**
 * mcp-connectors.functions.ts — Gerenciamento Zero-Trust de Servidores MCP Externos
 * Credenciais cifradas em repouso (AES-256-GCM via crypto-vault.server) na tabela ai_mcp_servers.
 * Expõe descoberta real via JSON-RPC 2.0 `tools/list` e invocação `tools/call` para o Copilot.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";
import { cleanApiKey, decryptSecret, encryptSecret, maskSecret } from "@/lib/crypto-vault.server";
import {
  assertSafeExternalMcpUrl,
  discoverExternalMcpTools,
  invokeExternalMcpTool,
  type ExternalMcpAuthType,
  type ExternalMcpToolDescriptor,
  type ExternalMcpTransport,
} from "@/lib/ai/mcp-client";

export interface PublicExternalMcpServerDTO {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  endpointUrl: string;
  transport: ExternalMcpTransport;
  authType: ExternalMcpAuthType;
  authHeaderName: string | null;
  keyHint: string | null;
  isActive: boolean;
  toolCount: number;
  toolsManifest: ExternalMcpToolDescriptor[];
  healthStatus: "pending" | "healthy" | "degraded" | "error";
  lastError: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const registerServerSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Nome deve ter no mínimo 2 caracteres").max(120),
  description: z.string().trim().max(400).optional(),
  endpointUrl: z.string().trim().url("Informe uma URL HTTPS válida"),
  transport: z.enum(["http_json_rpc", "sse", "streamable_http"]).default("http_json_rpc"),
  authType: z.enum(["none", "bearer", "api_key_header", "basic"]).default("none"),
  authHeaderName: z.string().trim().max(64).optional(),
  secret: z.string().trim().max(2048).optional(),
  syncOnSave: z.boolean().default(true),
});

const serverIdSchema = z.object({
  id: z.string().uuid(),
});

const toggleServerSchema = z.object({
  id: z.string().uuid(),
  isActive: z.boolean(),
});

function toSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || `mcp-${Date.now().toString(36)}`;
}

function mapServerRowToPublicDto(row: any): PublicExternalMcpServerDTO {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description || null,
    endpointUrl: row.endpoint_url,
    transport: (row.transport || "http_json_rpc") as ExternalMcpTransport,
    authType: (row.auth_type || "none") as ExternalMcpAuthType,
    authHeaderName: row.auth_header_name || null,
    keyHint: row.key_hint || null,
    isActive: Boolean(row.is_active),
    toolCount: Number(row.tool_count || 0),
    toolsManifest: Array.isArray(row.tools_manifest) ? row.tools_manifest : [],
    healthStatus: row.health_status || "pending",
    lastError: row.last_error || null,
    lastSyncedAt: row.last_synced_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const listExternalMcpServers = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicExternalMcpServerDTO[]> => {
    const identity = await getServerIdentity();
    if (!identity?.id) return [];

    const supabase = getServerClient();
    const { data, error } = await (supabase as any)
      .from("ai_mcp_servers")
      .select(
        "id, name, slug, description, endpoint_url, transport, auth_type, auth_header_name, key_hint, is_active, tools_manifest, tool_count, health_status, last_error, last_synced_at, created_at, updated_at"
      )
      .eq("user_id", identity.id)
      .order("updated_at", { ascending: false });

    if (error || !Array.isArray(data)) {
      return [];
    }

    return data.map(mapServerRowToPublicDto);
  }
);

export const registerExternalMcpServer = createServerFn({ method: "POST" })
  .validator(registerServerSchema)
  .handler(async ({ data }): Promise<PublicExternalMcpServerDTO> => {
    const identity = await getServerIdentity();
    if (!identity?.id) {
      throw new Error("Acesso negado: faça login para conectar um servidor MCP externo.");
    }

    // Validação rigorosa anti-SSRF antes de qualquer gravação ou chamada HTTP
    const safeUrl = assertSafeExternalMcpUrl(data.endpointUrl);
    const cleanedSecret = data.secret ? cleanApiKey(data.secret) : undefined;

    if (data.authType !== "none" && !cleanedSecret && !data.id) {
      throw new Error("Informe o token ou chave de autenticação do servidor MCP.");
    }

    const supabase = getServerClient();
    let existingRow: any = null;
    if (data.id) {
      const { data: found } = await (supabase as any)
        .from("ai_mcp_servers")
        .select("*")
        .eq("id", data.id)
        .eq("user_id", identity.id)
        .maybeSingle();
      if (!found) {
        throw new Error("Servidor MCP não encontrado.");
      }
      existingRow = found;
    }

    let plainSecretForSync: string | null = cleanedSecret || null;
    let encryptedSecretToSave: string | null = existingRow?.encrypted_secret || null;
    let keyHintToSave: string | null = existingRow?.key_hint || null;

    if (data.authType === "none") {
      encryptedSecretToSave = null;
      keyHintToSave = null;
      plainSecretForSync = null;
    } else if (cleanedSecret) {
      encryptedSecretToSave = encryptSecret(cleanedSecret);
      keyHintToSave = maskSecret(cleanedSecret);
    } else if (existingRow?.encrypted_secret) {
      plainSecretForSync = decryptSecret(existingRow.encrypted_secret);
    }

    let toolsManifest: ExternalMcpToolDescriptor[] = Array.isArray(existingRow?.tools_manifest)
      ? existingRow.tools_manifest
      : [];
    let healthStatus: "pending" | "healthy" | "degraded" | "error" = existingRow?.health_status || "pending";
    let lastError: string | null = null;
    let lastSyncedAt: string | null = existingRow?.last_synced_at || null;

    if (data.syncOnSave) {
      try {
        toolsManifest = await discoverExternalMcpTools({
          endpointUrl: safeUrl.toString(),
          transport: data.transport,
          authType: data.authType,
          authHeaderName: data.authHeaderName || null,
          secret: plainSecretForSync,
        });
        healthStatus = toolsManifest.length > 0 ? "healthy" : "degraded";
        lastSyncedAt = new Date().toISOString();
      } catch (syncErr: any) {
        healthStatus = "error";
        lastError = syncErr?.message || "Falha ao consultar tools/list no servidor MCP.";
      }
    }

    const storeId = (identity as any)?.activeStoreId || (identity as any)?.storeId || null;
    const baseSlug = existingRow?.slug || `${toSlug(data.name)}-${Date.now().toString(36).slice(-4)}`;

    const payload = {
      user_id: identity.id,
      store_id: storeId,
      name: data.name,
      slug: baseSlug,
      description: data.description || null,
      endpoint_url: safeUrl.toString(),
      transport: data.transport,
      auth_type: data.authType,
      auth_header_name: data.authType === "api_key_header" ? data.authHeaderName || "x-api-key" : null,
      encrypted_secret: encryptedSecretToSave,
      key_hint: keyHintToSave,
      is_active: true,
      tools_manifest: toolsManifest,
      tool_count: toolsManifest.length,
      health_status: healthStatus,
      last_error: lastError,
      last_synced_at: lastSyncedAt,
    };

    const query = existingRow
      ? (supabase as any)
          .from("ai_mcp_servers")
          .update(payload)
          .eq("id", existingRow.id)
          .eq("user_id", identity.id)
      : (supabase as any).from("ai_mcp_servers").insert(payload);

    const { data: savedRow, error: saveError } = await query
      .select(
        "id, name, slug, description, endpoint_url, transport, auth_type, auth_header_name, key_hint, is_active, tools_manifest, tool_count, health_status, last_error, last_synced_at, created_at, updated_at"
      )
      .single();

    if (saveError || !savedRow) {
      throw new Error(saveError?.message || "Falha ao salvar configuração do servidor MCP.");
    }

    return mapServerRowToPublicDto(savedRow);
  });

export const syncExternalMcpServerTools = createServerFn({ method: "POST" })
  .validator(serverIdSchema)
  .handler(async ({ data }): Promise<PublicExternalMcpServerDTO> => {
    const identity = await getServerIdentity();
    if (!identity?.id) {
      throw new Error("Acesso negado.");
    }

    const supabase = getServerClient();
    const { data: row, error } = await (supabase as any)
      .from("ai_mcp_servers")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", identity.id)
      .single();

    if (error || !row) {
      throw new Error("Servidor MCP não encontrado.");
    }

    const secret = row.encrypted_secret ? decryptSecret(row.encrypted_secret) : null;
    let toolsManifest: ExternalMcpToolDescriptor[] = [];
    let healthStatus: "healthy" | "degraded" | "error" = "pending" as any;
    let lastError: string | null = null;

    try {
      toolsManifest = await discoverExternalMcpTools({
        endpointUrl: row.endpoint_url,
        transport: row.transport,
        authType: row.auth_type,
        authHeaderName: row.auth_header_name,
        secret,
      });
      healthStatus = toolsManifest.length > 0 ? "healthy" : "degraded";
    } catch (syncErr: any) {
      healthStatus = "error";
      lastError = syncErr?.message || "Erro na descoberta de ferramentas MCP.";
    }

    const { data: updated, error: updateErr } = await (supabase as any)
      .from("ai_mcp_servers")
      .update({
        tools_manifest: toolsManifest,
        tool_count: toolsManifest.length,
        health_status: healthStatus,
        last_error: lastError,
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .eq("user_id", identity.id)
      .select(
        "id, name, slug, description, endpoint_url, transport, auth_type, auth_header_name, key_hint, is_active, tools_manifest, tool_count, health_status, last_error, last_synced_at, created_at, updated_at"
      )
      .single();

    if (updateErr || !updated) {
      throw new Error(updateErr?.message || "Falha ao atualizar manifesto MCP.");
    }

    return mapServerRowToPublicDto(updated);
  });

export const toggleExternalMcpServer = createServerFn({ method: "POST" })
  .validator(toggleServerSchema)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const identity = await getServerIdentity();
    if (!identity?.id) throw new Error("Acesso negado.");

    const supabase = getServerClient();
    const { error } = await (supabase as any)
      .from("ai_mcp_servers")
      .update({ is_active: data.isActive })
      .eq("id", data.id)
      .eq("user_id", identity.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteExternalMcpServer = createServerFn({ method: "POST" })
  .validator(serverIdSchema)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const identity = await getServerIdentity();
    if (!identity?.id) throw new Error("Acesso negado.");

    const supabase = getServerClient();
    const { error } = await (supabase as any)
      .from("ai_mcp_servers")
      .delete()
      .eq("id", data.id)
      .eq("user_id", identity.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Helper interno server-side para injetar ferramentas MCP externas ativas no prompt do Copilot.
 */
export async function listActiveExternalMcpToolsForUser(userId: string): Promise<
  Array<{
    compositeToolName: string;
    serverId: string;
    serverSlug: string;
    serverName: string;
    toolName: string;
    description: string;
    inputSchema: Record<string, unknown>;
  }>
> {
  if (!userId) return [];
  try {
    const supabase = getServerClient();
    const { data, error } = await (supabase as any)
      .from("ai_mcp_servers")
      .select("id, slug, name, tools_manifest")
      .eq("user_id", userId)
      .eq("is_active", true)
      .neq("health_status", "error")
      .limit(15);

    if (error || !Array.isArray(data)) return [];

    const out: Array<{
      compositeToolName: string;
      serverId: string;
      serverSlug: string;
      serverName: string;
      toolName: string;
      description: string;
      inputSchema: Record<string, unknown>;
    }> = [];

    for (const srv of data) {
      const tools = Array.isArray(srv.tools_manifest) ? srv.tools_manifest : [];
      for (const tool of tools) {
        if (!tool?.name) continue;
        out.push({
          compositeToolName: `mcp_ext:${srv.slug}:${tool.name}`,
          serverId: srv.id,
          serverSlug: srv.slug,
          serverName: srv.name,
          toolName: tool.name,
          description: String(tool.description || tool.name),
          inputSchema: tool.inputSchema || { type: "object", properties: {} },
        });
      }
    }

    return out;
  } catch {
    return [];
  }
}

/**
 * Executa uma tool externa nomeada como `mcp_ext:<slug>:<toolName>` em nome do usuário dono.
 */
export async function invokeExternalMcpToolForUser(
  userId: string,
  compositeToolName: string,
  args: Record<string, unknown>
): Promise<{
  status: "success" | "error";
  serverName?: string;
  toolName: string;
  content: Array<{ type: "text"; text: string }>;
  rawResult?: any;
}> {
  const parts = compositeToolName.split(":");
  if (parts.length < 3 || parts[0] !== "mcp_ext") {
    return {
      status: "error",
      toolName: compositeToolName,
      content: [{ type: "text", text: `Identificador de ferramenta MCP externa inválido: ${compositeToolName}` }],
    };
  }

  const serverSlug = parts[1];
  const realToolName = parts.slice(2).join(":");

  const supabase = getServerClient();
  const { data: srv, error } = await (supabase as any)
    .from("ai_mcp_servers")
    .select("*")
    .eq("user_id", userId)
    .eq("slug", serverSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !srv) {
    return {
      status: "error",
      toolName: realToolName,
      content: [
        {
          type: "text",
          text: `Servidor MCP externo "${serverSlug}" não encontrado ou inativo para o usuário.`,
        },
      ],
    };
  }

  try {
    const secret = srv.encrypted_secret ? decryptSecret(srv.encrypted_secret) : null;
    const result = await invokeExternalMcpTool(
      {
        endpointUrl: srv.endpoint_url,
        transport: srv.transport,
        authType: srv.auth_type,
        authHeaderName: srv.auth_header_name,
        secret,
      },
      realToolName,
      args || {}
    );

    return {
      status: result.status,
      serverName: srv.name,
      toolName: realToolName,
      content: [{ type: "text", text: result.textSummary }],
      rawResult: result.rawResult,
    };
  } catch (err: any) {
    return {
      status: "error",
      serverName: srv.name,
      toolName: realToolName,
      content: [
        {
          type: "text",
          text: `Erro ao invocar ferramenta externa "${realToolName}" em ${srv.name}: ${err?.message || "Falha de conexão"}`,
        },
      ],
    };
  }
}
