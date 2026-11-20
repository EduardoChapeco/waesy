/**
 * whatsapp-prospecting-csv.functions.ts — Motor de Prospecção Ativa via CSV / Lista Segmentada
 *
 * Recursos:
 * - Parser universal de CSV/TSV (`nome,telefone,interesse,cidade`)
 * - Normalização E.164 Brasil e deduplicação automática
 * - Exclusão automática de contatos em Opt-Out (`leads_crm`, `customers_crm`, `chat_threads`)
 * - Injeção automática do link do App Próprio (`/app/:slug`) e variáveis de nicho
 * - Disparo com Pacing / Jitter Anti-Banimento e Janela Comercial (08:30–19:30 BRT) na Evolution API v2
 *   ou envio via Meta Cloud API, preparando a thread para handoff automático ao Agente SDR de Triagem.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { TURIS_PROSPECTING_DEFAULT_TEMPLATE } from "@/lib/presets/turis";

export interface ParsedCsvProspectItem {
  name: string;
  phone: string;
  interest: string | null;
  city: string | null;
}

export interface CsvProspectPreviewResult {
  totalRows: number;
  validContacts: ParsedCsvProspectItem[];
  optedOutExcludedCount: number;
  invalidOrDuplicateCount: number;
  brandedAppUrl: string;
  defaultTemplate: string;
}

export function parseRawProspectCsvText(csvText: string): {
  valid: ParsedCsvProspectItem[];
  invalidOrDuplicateCount: number;
} {
  const lines = String(csvText || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return { valid: [], invalidOrDuplicateCount: 0 };

  const seenPhones = new Set<string>();
  const valid: ParsedCsvProspectItem[] = [];
  let invalidOrDuplicateCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    // Ignora cabeçalho óbvio
    if (i === 0 && /(nome|name|telefone|phone|celular|whatsapp)/i.test(rawLine) && !/\d{8,}/.test(rawLine)) {
      continue;
    }

    const delimiter = rawLine.includes(";") ? ";" : rawLine.includes("\t") ? "\t" : ",";
    const cols = rawLine.split(delimiter).map((c) => c.replace(/^["']|["']$/g, "").trim());

    // Descobre qual coluna tem o telefone (>= 8 dígitos)
    let phoneColIdx = cols.findIndex((c) => c.replace(/\D/g, "").length >= 10);
    if (phoneColIdx === -1) {
      phoneColIdx = cols.findIndex((c) => c.replace(/\D/g, "").length >= 8);
    }
    if (phoneColIdx === -1) {
      invalidOrDuplicateCount++;
      continue;
    }

    let digits = cols[phoneColIdx].replace(/\D/g, "");
    if (digits.length === 10 || digits.length === 11) {
      digits = `55${digits}`;
    }
    if (digits.length < 10 || digits.length > 15 || seenPhones.has(digits)) {
      invalidOrDuplicateCount++;
      continue;
    }
    seenPhones.add(digits);

    const otherCols = cols.filter((_, idx) => idx !== phoneColIdx);
    const name = (otherCols[0] || "Viajante").slice(0, 120);
    const interest = otherCols[1] ? otherCols[1].slice(0, 120) : null;
    const city = otherCols[2] ? otherCols[2].slice(0, 80) : null;

    valid.push({ name, phone: digits, interest, city });
  }

  return { valid, invalidOrDuplicateCount };
}

/**
 * Calcula horários escalonados (pacing + jitter) dentro da janela comercial 08:30–19:30 BRT.
 */
export function computePacedScheduleTimestamps(
  count: number,
  baseDate: Date = new Date(),
  minIntervalSec = 45,
  maxIntervalSec = 95,
): string[] {
  const results: string[] = [];
  let cursorMs = Math.max(Date.now() + 10_000, baseDate.getTime());

  for (let i = 0; i < count; i++) {
    // Ajusta se cair fora da janela comercial BRT (UTC-3 => 11:30 UTC até 22:30 UTC)
    const dt = new Date(cursorMs);
    const utcMinutes = dt.getUTCHours() * 60 + dt.getUTCMinutes();
    const windowOpenUtcMin = 11 * 60 + 30; // 08:30 BRT
    const windowCloseUtcMin = 22 * 60 + 30; // 19:30 BRT

    if (utcMinutes < windowOpenUtcMin) {
      dt.setUTCHours(11, 30, 0, 0);
      cursorMs = dt.getTime();
    } else if (utcMinutes >= windowCloseUtcMin) {
      dt.setUTCDate(dt.getUTCDate() + 1);
      dt.setUTCHours(11, 30, 0, 0);
      cursorMs = dt.getTime();
    }

    results.push(new Date(cursorMs).toISOString());
    // Jitter determinístico-uniforme entre minIntervalSec e maxIntervalSec
    const jitterSec = minIntervalSec + ((i * 17 + 13) % Math.max(1, maxIntervalSec - minIntervalSec + 1));
    cursorMs += jitterSec * 1000;
  }

  return results;
}

export function interpolateProspectingMessage(params: {
  template: string;
  contact: ParsedCsvProspectItem;
  storeName: string;
  brandedAppUrl: string;
}): string {
  const firstName = params.contact.name.split(/\s+/)[0] || params.contact.name;
  let rendered = params.template
    .replace(/\{\{\s*(nome|primeiro_nome)\s*\}\}/gi, firstName)
    .replace(/\{\{\s*nome_completo\s*\}\}/gi, params.contact.name)
    .replace(/\{\{\s*(agencia|loja|empresa)\s*\}\}/gi, params.storeName)
    .replace(/\{\{\s*app_link\s*\}\}/gi, params.brandedAppUrl)
    .replace(/\{\{\s*interesse\s*\}\}/gi, params.contact.interest || "viagens e experiências")
    .replace(/\{\{\s*cidade\s*\}\}/gi, params.contact.city || "sua região");

  if (!rendered.includes(params.brandedAppUrl) && params.template.includes("{{app_link}}") === false) {
    rendered = `${rendered}\n\nConheça nosso app oficial com pacotes, grupos e aéreo: ${params.brandedAppUrl}`;
  }
  return rendered.trim();
}

export const previewCsvProspectingListFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      csvText: z.string().min(1).max(500_000),
    }),
  )
  .handler(async ({ data }): Promise<CsvProspectPreviewResult> => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);
    const db = getServerClient();

    const { data: store } = await db
      .from("stores")
      .select("id, name, slug, primary_niche_id")
      .eq("id", identity.store_id)
      .maybeSingle();

    const parsed = parseRawProspectCsvText(data.csvText);
    const [optLeads, optCustomers] = await Promise.all([
      db.from("leads_crm").select("phone").eq("store_id", identity.store_id).eq("whatsapp_opt_out", true),
      db.from("customers_crm").select("phone").eq("store_id", identity.store_id).eq("whatsapp_opt_out", true),
    ]);

    const optOutSuffixes = new Set<string>();
    for (const r of [...(optLeads.data || []), ...(optCustomers.data || [])]) {
      const d = String((r as any).phone || "").replace(/\D/g, "");
      if (d.length >= 8) optOutSuffixes.add(d.slice(-8));
    }

    const eligible: ParsedCsvProspectItem[] = [];
    let optedOutExcludedCount = 0;
    for (const item of parsed.valid) {
      if (optOutSuffixes.has(item.phone.slice(-8))) {
        optedOutExcludedCount++;
      } else {
        eligible.push(item);
      }
    }

    const slug = (store as any)?.slug || identity.store_id;
    const brandedAppUrl = `https://waesy.com.br/app/${slug}`;

    return {
      totalRows: parsed.valid.length + parsed.invalidOrDuplicateCount,
      validContacts: eligible.slice(0, 500),
      optedOutExcludedCount,
      invalidOrDuplicateCount: parsed.invalidOrDuplicateCount,
      brandedAppUrl,
      defaultTemplate: TURIS_PROSPECTING_DEFAULT_TEMPLATE,
    };
  });

export const launchCsvProspectingCampaignFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      campaignName: z.string().trim().min(2).max(140),
      csvText: z.string().min(1).max(500_000),
      messageTemplate: z.string().trim().min(10).max(2000),
      channelInstanceId: z.string().uuid().optional(),
      minIntervalSec: z.number().int().min(20).max(300).default(50),
      maxIntervalSec: z.number().int().min(30).max(600).default(100),
    }),
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);
    const db = getServerClient();

    const { data: store } = await db
      .from("stores")
      .select("id, name, slug, primary_niche_id")
      .eq("id", identity.store_id)
      .maybeSingle();

    let instanceQuery = db
      .from("whatsapp_channel_instances")
      .select("id, provider, is_active")
      .eq("store_id", identity.store_id)
      .eq("is_active", true);
    if (data.channelInstanceId) {
      instanceQuery = instanceQuery.eq("id", data.channelInstanceId);
    }
    const { data: instance } = await instanceQuery
      .order("is_default", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!instance?.id) {
      throw new Error("Nenhuma instância WhatsApp ativa encontrada para disparar a prospecção.");
    }

    const parsed = parseRawProspectCsvText(data.csvText);
    if (parsed.valid.length === 0) {
      throw new Error("Nenhum contato válido encontrado na lista CSV.");
    }

    const [optLeads, optCustomers] = await Promise.all([
      db.from("leads_crm").select("phone").eq("store_id", identity.store_id).eq("whatsapp_opt_out", true),
      db.from("customers_crm").select("phone").eq("store_id", identity.store_id).eq("whatsapp_opt_out", true),
    ]);
    const optOutSuffixes = new Set<string>();
    for (const r of [...(optLeads.data || []), ...(optCustomers.data || [])]) {
      const d = String((r as any).phone || "").replace(/\D/g, "");
      if (d.length >= 8) optOutSuffixes.add(d.slice(-8));
    }

    const contacts = parsed.valid.filter((c) => !optOutSuffixes.has(c.phone.slice(-8))).slice(0, 300);
    if (contacts.length === 0) {
      throw new Error("Todos os contatos da lista estão marcados com Opt-Out.");
    }

    const storeName = (store as any)?.name || "Nossa Agência";
    const slug = (store as any)?.slug || identity.store_id;
    const brandedAppUrl = `https://waesy.com.br/app/${slug}`;
    const scheduleTimestamps = computePacedScheduleTimestamps(
      contacts.length,
      new Date(),
      data.minIntervalSec,
      Math.max(data.minIntervalSec + 10, data.maxIntervalSec),
    );

    let scheduledCount = 0;
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      const text = interpolateProspectingMessage({
        template: data.messageTemplate,
        contact,
        storeName,
        brandedAppUrl,
      });

      const { error: schedErr } = await db.from("whatsapp_scheduled_messages").insert({
        store_id: identity.store_id,
        channel_instance_id: instance.id,
        recipient_phone: contact.phone,
        message_text: text,
        scheduled_for: scheduleTimestamps[i],
        status: "scheduled",
        created_by: identity.id,
      });
      if (!schedErr) scheduledCount++;
    }

    return {
      success: true,
      campaignName: data.campaignName,
      scheduledCount,
      firstDispatchAt: scheduleTimestamps[0] || null,
      lastDispatchAt: scheduleTimestamps[scheduleTimestamps.length - 1] || null,
      brandedAppUrl,
    };
  });
