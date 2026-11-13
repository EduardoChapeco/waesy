import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";

// ─── AUTOMAÇÕES / WORKFLOWS VISUAIS (BFF CANÔNICO) ───────────────────────────

export const listWorkflows = createServerFn({ method: "GET" })
  .handler(async () => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const { data, error } = await supabase
      .from("store_workflows")
      .select("id, title, description, trigger_type, nodes, status, execution_count, last_run_at, created_at, updated_at")
      .eq("store_id", identity.store_id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("[automation] error listing workflows:", error);
    }

    return data || [];
  });

export const triggerWorkflowExecution = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid(), testPayload: z.record(z.any()).optional() }))
  .handler(async ({ data: { id, testPayload } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const { data: wf, error: wfError } = await supabase
      .from("store_workflows")
      .select("*")
      .eq("id", id)
      .eq("store_id", identity.store_id)
      .single();

    if (wfError || !wf) {
      throw new Error("Workflow não encontrado para execução.");
    }

    const triggerData = testPayload || {
      manual_trigger_by: identity.id,
      timestamp: new Date().toISOString(),
      source: "workspace_manual_test",
    };

    const nodesList = Array.isArray(wf.nodes) ? wf.nodes : [];
    const actionNodes = nodesList.filter((n: any) => n.type === "action");
    const whatsappNode = nodesList.find((n: any) => n.type === "action" && n.config?.messageTemplate) || nodesList[0];
    const rawTemplate: string =
      whatsappNode?.config?.messageTemplate ||
      wf.description ||
      "Olá {nome}, sua viagem para {destino} em {data_viagem} às {hora} está confirmada. Acesse seu dossiê: {link_dossie}";
    const sendTime: string = whatsappNode?.config?.sendTime || "09:00";
    const delayMinutes: number = Number(whatsappNode?.config?.delayMinutes || 0);

    const vars: Record<string, string> = {
      nome: String(triggerData.nome || triggerData.customer_name || "Cliente"),
      nome_cliente: String(triggerData.nome_cliente || triggerData.nome || triggerData.customer_name || "Cliente"),
      numero_pedido: String(triggerData.numero_pedido || triggerData.order_id || "#PEDIDO"),
      link_pagamento: String(triggerData.link_pagamento || triggerData.payment_url || "https://waesy.app/checkout"),
      destino: String(triggerData.destino || triggerData.destination || "Destino"),
      data_viagem: String(triggerData.data_viagem || triggerData.travel_date || new Date().toLocaleDateString("pt-BR")),
      hora: String(triggerData.hora || sendTime || "09:00"),
      link_dossie: String(triggerData.link_dossie || "https://waesy.app/conta/viagens"),
    };

    const renderedMessage = rawTemplate
      .replace(/\{\{\s*(nome_cliente|nome|numero_pedido|link_pagamento|destino|data_viagem|hora|link_dossie)\s*\}\}/gi, (_, key) => vars[key.toLowerCase()] || "")
      .replace(/\{(nome_cliente|nome|numero_pedido|link_pagamento|destino|data_viagem|hora|link_dossie)\}/gi, (_, key) => vars[key.toLowerCase()] || "");

    let outboxQueued = false;
    const { data: activeInstance } = await supabase
      .from("whatsapp_channel_instances")
      .select("id, provider")
      .eq("store_id", identity.store_id)
      .order("is_active", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeInstance?.id) {
      const dateKey = new Date().toISOString().slice(0, 13);
      const cleanRecipientPhone = String(triggerData.recipient_phone || "+5549999999999").replace(/@.*$/, "");
      const idempotencyKey = `workflow:${id}:${cleanRecipientPhone}:${dateKey}`;
      const { error: outboxErr } = await supabase
        .from("whatsapp_outbox")
        .upsert(
          {
            store_id: identity.store_id,
            channel_instance_id: activeInstance.id,
            provider: activeInstance.provider || "evolution_api",
            idempotency_key: idempotencyKey,
            recipient_phone: cleanRecipientPhone,
            message_type: "text",
            payload: {
              text: renderedMessage,
              send_time: sendTime,
              delay_minutes: delayMinutes,
              trigger_type: wf.trigger_type,
            },
            status: "pending",
          },
          { onConflict: "store_id,idempotency_key" }
        );
      if (!outboxErr) {
        outboxQueued = true;
      }
    }

    const resultData = {
      actions_dispatched: Math.max(actionNodes.length, 1),
      outbox_queued: outboxQueued,
      rendered_message: renderedMessage,
      send_time: sendTime,
      delay_minutes: delayMinutes,
      executed_by: identity.id,
      execution_mode: "manual_test",
      timestamp: new Date().toISOString(),
    };

    const { error: execError } = await supabase.from("store_workflow_executions").insert({
      workflow_id: id,
      store_id: identity.store_id,
      status: "success",
      trigger_data: triggerData,
      result_data: resultData,
    });

    if (execError) {
      console.error("[automation] error logging execution:", execError);
    }

    const nextExecutionCount = (wf.execution_count || 0) + 1;
    const nowStr = new Date().toISOString();

    await supabase
      .from("store_workflows")
      .update({
        execution_count: nextExecutionCount,
        last_run_at: nowStr,
      })
      .eq("id", id);

    return {
      success: true,
      execution_count: nextExecutionCount,
      last_run_at: nowStr,
      result: resultData,
    };
  });

export const getWorkflowById = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data: { id } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const { data, error } = await supabase
      .from("store_workflows")
      .select("*")
      .eq("id", id)
      .eq("store_id", identity.store_id)
      .single();

    if (error || !data) throw new Error("Workflow não encontrado.");
    return data;
  });

export const WORKFLOW_TRIGGER_TYPES = [
  "greeting_message",
  "away_hours",
  "keyword_auto_reply",
  "funnel_stage_changed",
  "whatsapp_inbound",
  "customer_birthday",
  "travel_approaching_d7",
  "travel_approaching_d2",
  "travel_reminder_24h",
  "post_checkin_welcome",
  "post_return_nps",
  "quote_followup_24h",
  "payment_due_reminder",
  "order_paid",
  "order_created",
  "order_cancelled",
  "customer_created",
  "lead_created",
  "lead_won",
  "lead_lost",
  "booking_confirmed",
  "booking_cancelled",
  "cart_abandoned",
  "product_low_stock",
  "travel_flight_delay",
  "manual",
] as const;

export const createWorkflowSchema = z.object({
  title: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  description: z.string().optional().nullable(),
  triggerType: z.enum(WORKFLOW_TRIGGER_TYPES),
  keyword: z.string().optional().nullable(),
  sendTime: z.string().optional().nullable(),
  delayMinutes: z.number().int().min(0).default(0),
  messageTemplate: z.string().optional().nullable(),
  nodes: z.array(z.any()).default([]),
  edges: z.array(z.any()).default([]),
});

export const createWorkflow = createServerFn({ method: "POST" })
  .validator(createWorkflowSchema)
  .handler(async ({ data: input }) => {
    const {
      title,
      description,
      triggerType,
      keyword,
      sendTime,
      delayMinutes,
      messageTemplate,
      nodes,
      edges,
    } = input;
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const renderedTemplate =
      messageTemplate?.trim() ||
      "Olá {{nome_cliente}}, confira os detalhes de {destino} para {data_viagem} às {hora}: {link_dossie}";

    const defaultNodes = nodes.length > 0 ? nodes : [
      {
        id: "node-trigger",
        type: "trigger",
        title: triggerType,
        config: {
          event: triggerType,
          ...(keyword?.trim() ? { keyword: keyword.trim() } : {}),
          sendTime: sendTime || "09:00",
          delayMinutes: delayMinutes ?? 0,
        },
      },
      {
        id: "node-whatsapp-action",
        type: "action",
        title: "Disparo WhatsApp Outbox",
        config: {
          action: "send_text",
          channel: "whatsapp_outbox",
          sendTime: sendTime || "09:00",
          delayMinutes: delayMinutes ?? 0,
          text: renderedTemplate,
          messageTemplate: renderedTemplate,
        },
      },
    ];

    const { data, error } = await supabase
      .from("store_workflows")
      .insert({
        store_id: identity.store_id,
        title: title.trim(),
        description: description?.trim() || null,
        trigger_type: triggerType,
        channel: "whatsapp",
        nodes: defaultNodes,
        edges: edges || [],
        status: "active",
        created_by: identity.id,
      })
      .select()
      .single();

    if (error) {
      console.error("[automation] error creating workflow:", error);
      throw new Error("Erro ao criar workflow.");
    }

    return data;
  });

export const updateWorkflowSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  triggerType: z.enum(WORKFLOW_TRIGGER_TYPES).optional(),
  nodes: z.array(z.any()).optional(),
  edges: z.array(z.any()).optional(),
  status: z.enum(["active", "inactive", "draft", "archived"]).optional(),
});

export const updateWorkflow = createServerFn({ method: "POST" })
  .validator(updateWorkflowSchema)
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const updatePayload: any = {};
    if (input.title) updatePayload.title = input.title.trim();
    if (input.description !== undefined) updatePayload.description = input.description;
    if (input.triggerType) updatePayload.trigger_type = input.triggerType;
    if (input.nodes) updatePayload.nodes = input.nodes;
    if (input.edges) updatePayload.edges = input.edges;
    if (input.status) updatePayload.status = input.status;

    const { data, error } = await supabase
      .from("store_workflows")
      .update(updatePayload)
      .eq("id", input.id)
      .eq("store_id", identity.store_id)
      .select()
      .single();

    if (error) throw new Error("Erro ao atualizar workflow.");
    return data;
  });

export const toggleWorkflowStatus = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid(), active: z.boolean() }))
  .handler(async ({ data: { id, active } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const { error } = await supabase
      .from("store_workflows")
      .update({ status: active ? "active" : "inactive" })
      .eq("id", id)
      .eq("store_id", identity.store_id);

    if (error) throw new Error("Erro ao alterar status do workflow.");
    return { success: true, active };
  });

export const deleteWorkflow = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data: { id } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin"]);

    const { error } = await supabase
      .from("store_workflows")
      .delete()
      .eq("id", id)
      .eq("store_id", identity.store_id);

    if (error) throw new Error("Erro ao deletar workflow.");
    return { success: true };
  });

export const getWorkflowExecutions = createServerFn({ method: "GET" })
  .validator(z.object({ workflowId: z.string().uuid(), limit: z.number().int().min(1).max(100).default(20) }))
  .handler(async ({ data: { workflowId, limit } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const { data } = await supabase
      .from("store_workflow_executions")
      .select("id, status, trigger_data, result_data, error_msg, executed_at")
      .eq("workflow_id", workflowId)
      .eq("store_id", identity.store_id)
      .order("executed_at", { ascending: false })
      .limit(limit);

    return data || [];
  });

export const triggerTravelReminders24h = createServerFn({ method: "POST" })
  .validator(z.object({ storeId: z.string().optional() }).optional())
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const targetStoreId = data?.storeId || identity.store_id;
    if (!targetStoreId) return { processed: 0, reminders_sent: 0 };

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const { data: bookings } = await supabase
      .from("travel_bookings")
      .select("*")
      .eq("store_id", targetStoreId)
      .gte("travel_date", now.toISOString())
      .lte("travel_date", in24h.toISOString());

    const items = bookings || [];
    let sentCount = 0;

    for (const b of items) {
      if (b.customer_id) {
        await supabase.from("notifications").insert({
          user_id: b.customer_id,
          type: "travel_reminder_24h",
          title: "Sua viagem é amanhã!",
          message: `Lembrete: sua viagem para ${b.destination || 'o destino'} parte em breve. Verifique seu voucher digital e documentos.`,
          link_url: `/conta/viagens`,
          is_read: false,
        }).then(() => { sentCount++; }, () => null);
      }
    }

    return {
      processed: items.length,
      reminders_sent: sentCount,
      timestamp: new Date().toISOString(),
    };
  });

export const seedCanonicalAutomationWorkflows = createServerFn({ method: "POST" })
  .handler(async () => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const canonicalSeeds = [
      {
        title: "Aniversário do Cliente (Felicitações + Voucher)",
        trigger_type: "customer_birthday",
        sendTime: "09:00",
        delayMinutes: 0,
        description: "Disparo matinal automático no dia do aniversário do cliente com benefício exclusivo.",
        messageTemplate:
          "Olá {nome}, parabéns pelo seu dia! Preparamos uma condição especial para sua próxima viagem rumo a {destino}. Acesse: {link_dossie}",
      },
      {
        title: "Viagem se Aproximando (Check-list D-7 / D-2 / D-1)",
        trigger_type: "travel_approaching_d7",
        sendTime: "10:00",
        delayMinutes: 0,
        description: "Orientação preventiva de documentos, bagagem, clima e voucher de embarque.",
        messageTemplate:
          "Olá {nome}, faltam poucos dias para seu embarque rumo a {destino} em {data_viagem} às {hora}. Confira seu voucher e documentos no dossiê: {link_dossie}",
      },
      {
        title: "Boas-Vindas Pós-Embarque / Check-in",
        trigger_type: "post_checkin_welcome",
        sendTime: "14:00",
        delayMinutes: 30,
        description: "Mensagem de acompanhamento após o horário de embarque ou check-in no hotel.",
        messageTemplate:
          "Olá {nome}, desejamos uma excelente chegada em {destino}! Qualquer suporte durante sua estadia, acione nossa equipe. Seu roteiro: {link_dossie}",
      },
      {
        title: "Pesquisa de Satisfação Pós-Retorno (NPS D+1)",
        trigger_type: "post_return_nps",
        sendTime: "11:00",
        delayMinutes: 60,
        description: "Coleta de avaliação e depoimento 24h após o retorno da viagem.",
        messageTemplate:
          "Olá {nome}, como foi sua viagem para {destino}? Avalie sua experiência em: {link_dossie}",
      },
      {
        title: "Follow-up de Orçamento em Aberto (24h / 48h)",
        trigger_type: "quote_followup_24h",
        sendTime: "15:00",
        delayMinutes: 1440,
        description: "Recuperação consultiva de cotações enviadas que ainda não foram fechadas.",
        messageTemplate:
          "Olá {nome}, conseguimos manter a tarifa da sua cotação para {destino} em {data_viagem}. Deseja revisar os detalhes ou garantir a emissão? {link_dossie}",
      },
      {
        title: "Cobrança Preventiva / Amigável (Pix / Parcela)",
        trigger_type: "payment_due_reminder",
        sendTime: "09:30",
        delayMinutes: 0,
        description: "Lembrete amigável no dia do vencimento da parcela com link rápido.",
        messageTemplate:
          "Olá {nome}, lembramos que a parcela referente a {destino} ({data_viagem}) vence hoje. Acesse o link seguro do seu dossiê para quitação: {link_dossie}",
      },
    ];

    const { data: existing } = await supabase
      .from("store_workflows")
      .select("trigger_type, title")
      .eq("store_id", identity.store_id);

    const existingTypes = new Set((existing || []).map((e: any) => e.trigger_type));
    const toInsert = canonicalSeeds
      .filter((seed) => !existingTypes.has(seed.trigger_type))
      .map((seed) => ({
        store_id: identity.store_id,
        title: seed.title,
        description: seed.description,
        trigger_type: seed.trigger_type,
        status: "active",
        created_by: identity.id,
        nodes: [
          {
            id: "node-trigger",
            type: "trigger",
            title: seed.trigger_type,
            config: { sendTime: seed.sendTime, delayMinutes: seed.delayMinutes },
          },
          {
            id: "node-whatsapp-action",
            type: "action",
            title: "Disparo WhatsApp Outbox",
            config: {
              channel: "whatsapp_outbox",
              sendTime: seed.sendTime,
              delayMinutes: seed.delayMinutes,
              messageTemplate: seed.messageTemplate,
            },
          },
        ],
        edges: [],
      }));

    if (toInsert.length > 0) {
      await supabase.from("store_workflows").insert(toInsert);
    }

    const { data: refreshed } = await supabase
      .from("store_workflows")
      .select("id, title, description, trigger_type, nodes, status, execution_count, last_run_at, created_at, updated_at")
      .eq("store_id", identity.store_id)
      .order("updated_at", { ascending: false });

    return {
      inserted: toInsert.length,
      workflows: refreshed || [],
    };
  });
