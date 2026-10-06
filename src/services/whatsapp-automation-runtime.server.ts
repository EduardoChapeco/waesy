import { createHash } from "node:crypto";
import { getServerClient } from "@/lib/supabase";
import { encryptConversationMessage } from "@/lib/conversation-crypto.server";

function normalizePhone(value: string) { const digits = value.replace(/\D/g, ""); return digits.length >= 7 ? `+${digits}` : null; }
function phoneHash(value: string) { return createHash("sha256").update(value).digest("hex"); }

type InboundIdentityInput = { storeId: string; instanceId: string | null; provider: string; externalUserId: string | null; phone: string; displayName: string | null };

export async function resolveWhatsAppIdentity(input: InboundIdentityInput) {
  const db = getServerClient();
  const phone = normalizePhone(input.phone);
  if (!phone) return null;
  const hash = phoneHash(phone);
  let existing: any = null;
  if (input.externalUserId) {
    const result = await db.from("whatsapp_contact_identities").select("*").eq("store_id", input.storeId).eq("provider", input.provider).eq("external_user_id", input.externalUserId).maybeSingle();
    existing = result.data;
  }
  if (!existing) {
    const result = await db.from("whatsapp_contact_identities").select("*").eq("store_id", input.storeId).eq("provider", input.provider).eq("phone_hash", hash).maybeSingle();
    existing = result.data;
  }
  const base = { store_id: input.storeId, channel_instance_id: input.instanceId, provider: input.provider, channel: "whatsapp", external_user_id: input.externalUserId, phone_e164: phone, phone_hash: hash, display_name: input.displayName || existing?.display_name || phone, profile_name: input.displayName || existing?.profile_name || null, last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  if (existing) {
    const { data, error } = await db.from("whatsapp_contact_identities").update(base).eq("id", existing.id).eq("store_id", input.storeId).select().single();
    if (error) throw new Error(`identity_update_failed:${error.message}`);
    return data;
  }
  const { data, error } = await db.from("whatsapp_contact_identities").insert(base).select().single();
  if (error) throw new Error(`identity_insert_failed:${error.message}`);
  return data;
}

function conditionMatches(condition: any, input: Record<string, any>) {
  if (!condition?.config?.field) return true;
  const actual = input[condition.config.field];
  if (condition.config.equals !== undefined) return actual === condition.config.equals;
  if (condition.config.in && Array.isArray(condition.config.in)) return condition.config.in.includes(actual);
  return true;
}

export async function dispatchWhatsAppInboundFlows(input: { storeId: string; instanceId: string | null; provider: string; threadId: string; identityId: string; phone: string; text: string; eventId?: string | null; payload: Record<string, any> }) {
  const db = getServerClient();
  const { data: flows, error } = await db.from("store_workflows").select("id, nodes, edges, workflow_version, execution_count, channel_instance_id").eq("store_id", input.storeId).eq("channel", "whatsapp").eq("trigger_type", "whatsapp_inbound").eq("status", "active");
  if (error) throw new Error(`flow_lookup_failed:${error.message}`);
  const results: Array<{ workflowId: string; runId?: string; status: string; error?: string }> = [];
  for (const flow of flows || []) {
    if (flow.channel_instance_id && flow.channel_instance_id !== input.instanceId) continue;
    const nodes = Array.isArray(flow.nodes) ? flow.nodes : [];
    const conditions = nodes.filter((node: any) => node.type === "condition");
    if (!conditions.every((node: any) => conditionMatches(node, { ...input.payload, text: input.text, provider: input.provider }))) continue;
    const { data: run, error: runError } = await db.from("whatsapp_flow_runs").insert({ workflow_id: flow.id, store_id: input.storeId, thread_id: input.threadId, identity_id: input.identityId, trigger_event_id: input.eventId || null, status: "running", input_payload: { text: input.text, provider: input.provider, payload: input.payload }, output_payload: {}, current_node_id: nodes[0]?.id || null }).select("id").single();
    if (runError || !run) { results.push({ workflowId: flow.id, status: "failed", error: runError?.message || "run_not_created" }); continue; }
    try {
      let sent = 0;
      for (const node of nodes.filter((n: any) => n.type === "action")) {
        const action = node.config?.action;
        if (action === "set_consent") {
          const consent = node.config?.consent_status;
          if (["unknown", "opted_in", "opted_out"].includes(consent)) await db.from("whatsapp_contact_identities").update({ consent_status: consent, consent_source: `flow:${flow.id}`, consent_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", input.identityId).eq("store_id", input.storeId);
        } else if (action === "assign_agent" && node.config?.profile_id) {
          await db.from("chat_threads").update({ assigned_to_profile_id: node.config.profile_id, updated_at: new Date().toISOString() }).eq("id", input.threadId).eq("store_id", input.storeId);
        } else if (action === "send_text") {
          const body = String(node.config?.text || "").trim();
          if (!body) continue;
          const { data: outbox, error: outboxError } = await db.from("whatsapp_outbox").upsert({ store_id: input.storeId, thread_id: input.threadId, channel_instance_id: input.instanceId, provider: input.provider, idempotency_key: `flow:${flow.id}:run:${run.id}:node:${node.id}`, recipient_phone: input.phone, message_type: "text", payload: { text: body }, status: "pending" }, { onConflict: "store_id,idempotency_key", ignoreDuplicates: true }).select("id").maybeSingle();
          if (outboxError) throw new Error(`outbox_enqueue_failed:${outboxError.message}`);
          if (outbox?.id) sent++;
        }
        await db.from("whatsapp_flow_runs").update({ current_node_id: node.id, updated_at: new Date().toISOString() }).eq("id", run.id);
      }
      await db.from("whatsapp_flow_runs").update({ status: "completed", output_payload: { outbox_enqueued: sent }, finished_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", run.id);
      await db.from("store_workflows").update({ execution_count: (flow as any).execution_count ? (flow as any).execution_count + 1 : 1, last_run_at: new Date().toISOString() }).eq("id", flow.id).eq("store_id", input.storeId);
      results.push({ workflowId: flow.id, runId: run.id, status: "completed" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "flow_execution_failed";
      await db.from("whatsapp_flow_runs").update({ status: "failed", error_code: "ACTION_FAILED", error_message: message, finished_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", run.id);
      results.push({ workflowId: flow.id, runId: run.id, status: "failed", error: message });
    }
  }
  return results;
}

export function protectedInboundPreview(text: string) { return encryptConversationMessage(text); }
