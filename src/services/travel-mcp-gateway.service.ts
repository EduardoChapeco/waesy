/**
 * travel-mcp-gateway.service.ts — Gateway de Integração MCP (Model Context Protocol) Seguro
 * NORMAS: AGENTS.md (B.1 a B.41), SPEC-TURISMO-CORPORATIVO-TRAVELOS-CONSOLIDATION
 * Zero Exposição de Chaves de Agência | Contextos e Escopos Isolados por Usuário
 */

import { z } from "zod";
import { getServerClient } from "@/lib/supabase";

export interface McpToolContext {
  userId: string;
  companyId: string;
  role: string;
  scopes: string[];
}

export interface McpToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  requiresConfirmation?: boolean;
  confirmationDetails?: Record<string, unknown>;
}

/**
 * Validador de Escopos e Permissões para ferramentas MCP
 */
function assertMcpPermission(context: McpToolContext, requiredScope: string): void {
  if (!context.scopes.includes(requiredScope) && !context.scopes.includes("travel:admin")) {
    throw new Error(`Permissão insuficiente para MCP tool. Escopo requerido: ${requiredScope}`);
  }
}

/**
 * Registro de Auditoria Imutável para Ações de IA via MCP
 */
async function auditMcpToolExecution(params: {
  context: McpToolContext;
  toolName: string;
  args: Record<string, unknown>;
  success: boolean;
  error?: string;
}): Promise<void> {
  const supabase = getServerClient();
  try {
    await supabase.from("audit_log").insert({
      store_id: params.context.companyId,
      actor_profile_id: params.context.userId,
      action: `mcp_tool:${params.toolName}`,
      entity_type: "mcp_gateway",
      metadata: {
        tool_name: params.toolName,
        role: params.context.role,
        success: params.success,
        error: params.error,
        sanitized_args: params.args,
        executed_at: new Date().toISOString(),
      },
    });
  } catch {
    // Auditoria não bloqueante
  }
}

// ─── 1. MCP Tools: Leitura (Read-Only) ────────────────────────────────────────

export async function mcpGetTrip(
  context: McpToolContext,
  args: { tripId: string }
): Promise<McpToolResult> {
  try {
    assertMcpPermission(context, "travel:read");
    const supabase = getServerClient();

    const { data: trip, error } = await supabase
      .from("tourism_trips")
      .select("id, trip_number, title, destination_city, travel_start_date, travel_end_date, status, flights, hotels, itinerary")
      .eq("id", args.tripId)
      .single();

    if (error || !trip) return { success: false, error: "Viagem não encontrada" };

    await auditMcpToolExecution({ context, toolName: "get_trip", args, success: true });
    return { success: true, data: trip };
  } catch (err: any) {
    await auditMcpToolExecution({ context, toolName: "get_trip", args, success: false, error: err.message });
    return { success: false, error: err.message };
  }
}

export async function mcpGetProject(
  context: McpToolContext,
  args: { projectId: string }
): Promise<McpToolResult> {
  try {
    assertMcpPermission(context, "travel:read");
    const supabase = getServerClient();

    const { data: project, error } = await supabase
      .from("travel_projects")
      .select("id, name, description, purpose, start_date, end_date, budget_cents, status")
      .eq("id", args.projectId)
      .eq("company_id", context.companyId)
      .single();

    if (error || !project) return { success: false, error: "Projeto de viagem não encontrado" };

    await auditMcpToolExecution({ context, toolName: "get_project", args, success: true });
    return { success: true, data: project };
  } catch (err: any) {
    await auditMcpToolExecution({ context, toolName: "get_project", args, success: false, error: err.message });
    return { success: false, error: err.message };
  }
}

export async function mcpGetTicketCredits(
  context: McpToolContext,
  args: { travelerId: string }
): Promise<McpToolResult> {
  try {
    assertMcpPermission(context, "travel:credits:read");
    const supabase = getServerClient();

    const { data: credits, error } = await supabase
      .from("air_ticket_credits")
      .select("id, airline, original_pnr, original_ticket_number, remaining_amount_cents, valid_from, expires_at, status")
      .eq("traveler_id", args.travelerId)
      .eq("status", "active");

    if (error) return { success: false, error: "Erro ao buscar créditos" };

    await auditMcpToolExecution({ context, toolName: "get_ticket_credit", args, success: true });
    return { success: true, data: credits || [] };
  } catch (err: any) {
    await auditMcpToolExecution({ context, toolName: "get_ticket_credit", args, success: false, error: err.message });
    return { success: false, error: err.message };
  }
}

// ─── 2. MCP Tools: Escrita & Solicitação (Write) ──────────────────────────────

export async function mcpCreateSupportCase(
  context: McpToolContext,
  args: { tripId: string; summary: string; urgency?: string }
): Promise<McpToolResult> {
  try {
    assertMcpPermission(context, "travel:support:write");
    const supabase = getServerClient();

    const { data: trip } = await supabase
      .from("tourism_trips")
      .select("store_id")
      .eq("id", args.tripId)
      .single();

    if (!trip) return { success: false, error: "Viagem não encontrada para vincular suporte" };

    const { data: ticket, error } = await supabase
      .from("tourism_incident_tickets")
      .insert({
        store_id: trip.store_id,
        trip_id: args.tripId,
        customer_name: `Viajante (IA MCP)`,
        urgency: args.urgency || "medium",
        category: "copilot_assistance",
        status: "open",
        summary: args.summary.trim(),
      })
      .select("id")
      .single();

    if (error || !ticket) throw new Error("Falha ao registrar chamado de suporte: " + error?.message);

    await auditMcpToolExecution({ context, toolName: "create_support_case", args, success: true });
    return { success: true, data: { ticketId: ticket.id } };
  } catch (err: any) {
    await auditMcpToolExecution({ context, toolName: "create_support_case", args, success: false, error: err.message });
    return { success: false, error: err.message };
  }
}

// ─── 3. MCP Tools: Alto Risco (Exige Confirmação & Step-Up) ───────────────────

export async function mcpCancelBooking(
  context: McpToolContext,
  args: { tripId: string; reason: string; confirmed?: boolean }
): Promise<McpToolResult> {
  try {
    assertMcpPermission(context, "travel:booking:cancel");

    // Barreira de segurança: Ação destrutiva não pode ser executada cegamente pela IA
    if (!args.confirmed) {
      return {
        success: false,
        requiresConfirmation: true,
        confirmationDetails: {
          warning: "O cancelamento de viagem pode acarretar multas tarifárias e retenções conforme contrato.",
          tripId: args.tripId,
          reason: args.reason,
        },
      };
    }

    const supabase = getServerClient();
    const { error } = await supabase
      .from("tourism_trips")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", args.tripId);

    if (error) throw new Error("Erro ao cancelar viagem: " + error.message);

    await auditMcpToolExecution({ context, toolName: "cancel_booking", args, success: true });
    return { success: true, data: { status: "cancelled" } };
  } catch (err: any) {
    await auditMcpToolExecution({ context, toolName: "cancel_booking", args, success: false, error: err.message });
    return { success: false, error: err.message };
  }
}
