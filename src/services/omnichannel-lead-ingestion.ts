import {
  extractSemanticLeadFieldsFromAnswers,
  mergeCustomFieldMaps,
  normalizeCustomFieldMap,
} from "@/lib/niches/unified-field-bridge";

export interface OmnichannelLeadInput {
  storeId: string;
  leadId?: string | null;
  source: string;
  sourceDetail?: string | null;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  document?: string | null;
  title?: string | null;
  destination?: string | null;
  travelStart?: string | null;
  travelEnd?: string | null;
  paxAdults?: number | null;
  paxChildren?: number | null;
  paxInfants?: number | null;
  paxCount?: number | null;
  paxList?: Array<Record<string, unknown>> | null;
  estimatedValueCents?: number | null;
  message?: string | null;
  notes?: string | null;
  status?: "new" | "contacted" | "qualified" | "proposal" | "negotiation";
  sourceListingId?: string | null;
  sourceListingOrigin?: "product" | "classified" | "experience" | "builder" | "form" | null;
  sourceListingTitle?: string | null;
  sourceDealId?: string | null;
  sourceQuoteId?: string | null;
  sourceFormId?: string | null;
  sourceSubmissionId?: string | null;
  departureOption?: Record<string, unknown> | string | null;
  boardingPoint?: string | null;
  customFields?: Record<string, unknown> | null;
  fieldLabelsMap?: Record<string, string>;
}

export interface OmnichannelLeadResult {
  success: boolean;
  leadId: string | null;
  customerId: string | null;
  createdNewLead: boolean;
  reason?: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeCleanPhone(raw?: string | null): string {
  return String(raw || "").replace(/\D/g, "");
}

function normalizeCleanEmail(raw?: string | null): string | null {
  const email = String(raw || "").trim().toLowerCase();
  if (!email || !email.includes("@")) return null;
  return email;
}

function normalizeIsoDate(raw?: string | null): string | null {
  const val = String(raw || "").trim();
  if (!val) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  if (/^\d{4}-\d{2}-\d{2}T/.test(val)) return val.slice(0, 10);
  const br = val.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return null;
}

/**
 * Motor Unificado de Ingestao de Leads Omnichannel.
 * Garante gravacao consistente em `leads_crm` (colunas canonicas + `custom_fields` estruturado),
 * deduplicacao/sincronizacao com `customers_crm` e registro de atividade no card Kanban.
 */
export async function ingestOmnichannelLead(
  db: any,
  input: OmnichannelLeadInput,
): Promise<OmnichannelLeadResult> {
  if (!db || !input?.storeId || !UUID_RE.test(input.storeId)) {
    return { success: false, leadId: null, customerId: null, createdNewLead: false, reason: "invalid_store" };
  }

  const cleanName = String(input.fullName || "").trim() || "Cliente Interessado";
  const cleanPhone = normalizeCleanPhone(input.phone);
  const rawPhoneDisplay = String(input.phone || "").trim() || cleanPhone || null;
  const cleanEmail = normalizeCleanEmail(input.email);
  const cleanDoc = String(input.document || "").replace(/\D/g, "") || undefined;

  // 1. Validar existencia da loja e carregar labels de campos customizados se existirem
  let fieldLabelsMap = input.fieldLabelsMap || {};
  try {
    const { data: storeRow, error: storeErr } = await db
      .from("stores")
      .select("id, settings")
      .eq("id", input.storeId)
      .maybeSingle();

    if (storeErr || !storeRow?.id) {
      return { success: false, leadId: null, customerId: null, createdNewLead: false, reason: "store_not_found" };
    }

    const customInquiryFields = (storeRow.settings as any)?.custom_inquiry_fields;
    if (Array.isArray(customInquiryFields)) {
      const storeLabels: Record<string, string> = {};
      for (const f of customInquiryFields as any[]) {
        if (f?.id && f?.label) storeLabels[String(f.id)] = String(f.label);
      }
      fieldLabelsMap = { ...storeLabels, ...fieldLabelsMap };
    }
  } catch {
    // Em mocks enxutos onde stores nao foi populada, nao bloquear caso store existe no fluxo chamador
  }

  // 2. Extrair campos semanticos das respostas dinamicas
  const semantic = extractSemanticLeadFieldsFromAnswers(input.customFields, fieldLabelsMap);

  const mergedCustomFields = mergeCustomFieldMaps(semantic.customFields, {
    ...(input.sourceListingId ? { source_listing_id: input.sourceListingId } : {}),
    ...(input.sourceListingOrigin ? { source_listing_origin: input.sourceListingOrigin } : {}),
    ...(input.sourceListingTitle ? { source_listing_title: input.sourceListingTitle } : {}),
    ...(input.sourceDealId ? { source_deal_id: input.sourceDealId } : {}),
    ...(input.sourceQuoteId ? { source_quote_id: input.sourceQuoteId } : {}),
    ...(input.sourceFormId ? { source_form_id: input.sourceFormId } : {}),
    ...(input.sourceSubmissionId ? { source_submission_id: input.sourceSubmissionId } : {}),
    ...(input.departureOption ? { departure_option: input.departureOption } : {}),
    ...(input.boardingPoint ? { boarding_point: input.boardingPoint } : {}),
    ...(cleanEmail ? { email_provided: true } : { email_provided: false }),
  });

  const resolvedDestination =
    String(input.destination || semantic.destination || "").trim() || null;
  const resolvedStart = normalizeIsoDate(input.travelStart || semantic.travelStart);
  const resolvedEnd = normalizeIsoDate(input.travelEnd || semantic.travelEnd);
  const resolvedAdults = input.paxAdults ?? semantic.paxAdults ?? 1;
  const resolvedChildren = input.paxChildren ?? semantic.paxChildren ?? 0;
  const resolvedInfants = input.paxInfants ?? semantic.paxInfants ?? 0;
  const resolvedPaxCount =
    input.paxCount ??
    semantic.paxCount ??
    Math.max(1, Number(resolvedAdults) + Number(resolvedChildren) + Number(resolvedInfants));
  const resolvedDoc =
    (cleanDoc && (cleanDoc.length === 11 || cleanDoc.length === 14) ? cleanDoc : undefined) ||
    semantic.document ||
    null;
  const resolvedValueCents =
    typeof input.estimatedValueCents === "number" && input.estimatedValueCents > 0
      ? Math.round(input.estimatedValueCents)
      : semantic.estimatedValueCents ?? 0;

  const combinedNotes = [
    input.notes?.trim() || null,
    semantic.notesAppend ? `Respostas do Formulario:\n${semantic.notesAppend}` : null,
  ]
    .filter(Boolean)
    .join("\n\n") || null;

  const now = new Date().toISOString();

  // 3. Tentar localizar lead ativo existente para mesclagem inteligente sem duplicar card ativo
  let existingLead: any = null;
  if (input.leadId && UUID_RE.test(input.leadId)) {
    const { data } = await db
      .from("leads_crm")
      .select("id, customer_id, custom_fields, notes, message, status")
      .eq("id", input.leadId)
      .eq("store_id", input.storeId)
      .maybeSingle();
    if (data?.id) existingLead = data;
  }

  if (!existingLead && (cleanPhone || cleanEmail)) {
    try {
      let query = db
        .from("leads_crm")
        .select("id, customer_id, custom_fields, notes, message, status, phone, email")
        .eq("store_id", input.storeId)
        .in("status", ["new", "contacted", "qualified", "proposal", "negotiation"])
        .order("created_at", { ascending: false })
        .limit(5);

      if (cleanPhone && cleanEmail) {
        query = query.or(`phone.ilike.%${cleanPhone.slice(-8)}%,email.eq.${cleanEmail}`);
      } else if (cleanPhone) {
        query = query.ilike("phone", `%${cleanPhone.slice(-8)}%`);
      } else if (cleanEmail) {
        query = query.eq("email", cleanEmail);
      }

      const { data: candidates } = await query;
      if (Array.isArray(candidates) && candidates.length > 0) {
        existingLead = candidates.find((c: any) => {
          const existingSourceListing = c.custom_fields?.source_listing_id;
          // Se o lead existente veio do mesmo anuncio ou ainda nao tinha anuncio vinculado, mescla!
          return !input.sourceListingId || !existingSourceListing || existingSourceListing === input.sourceListingId;
        });
      }
    } catch {
      // Fallback para insercao de novo card
    }
  }

  let leadId: string | null = existingLead?.id || null;
  let customerId: string | null = existingLead?.customer_id || null;
  let createdNewLead = false;

  if (existingLead?.id) {
    const nextCf = mergeCustomFieldMaps(existingLead.custom_fields, mergedCustomFields);
    const updatePatch: Record<string, unknown> = {
      full_name: cleanName,
      phone: rawPhoneDisplay || undefined,
      email: cleanEmail || undefined,
      destination: resolvedDestination || undefined,
      travel_start: resolvedStart || undefined,
      travel_end: resolvedEnd || undefined,
      pax_count: resolvedPaxCount,
      pax_adults: resolvedAdults,
      pax_children: resolvedChildren,
      pax_infants: resolvedInfants,
      estimated_value_cents: resolvedValueCents > 0 ? resolvedValueCents : undefined,
      message: input.message?.trim() || existingLead.message || undefined,
      notes: combinedNotes
        ? [existingLead.notes, combinedNotes].filter(Boolean).join("\n\n---\n\n")
        : existingLead.notes || undefined,
      custom_fields: nextCf,
      last_contacted_at: now,
      updated_at: now,
      ...(resolvedDoc ? { document: resolvedDoc } : {}),
      ...(input.paxList && input.paxList.length > 0 ? { pax_list: input.paxList } : {}),
    };

    Object.keys(updatePatch).forEach((k) => {
      if (updatePatch[k] === undefined) delete updatePatch[k];
    });

    const { error: updErr } = await db
      .from("leads_crm")
      .update(updatePatch)
      .eq("id", existingLead.id)
      .eq("store_id", input.storeId);

    if (updErr) {
      // Tolerancia se coluna document/pax_list ainda nao existir em schema legado
      delete updatePatch.document;
      delete updatePatch.pax_list;
      await db
        .from("leads_crm")
        .update(updatePatch)
        .eq("id", existingLead.id)
        .eq("store_id", input.storeId);
    }
  } else {
    const safeFallbackEmail =
      cleanEmail ||
      `atendimento+${cleanPhone || crypto.randomUUID().slice(0, 8)}@sem-email.waesy.local`;

    const insertPayload: Record<string, unknown> = {
      store_id: input.storeId,
      full_name: cleanName,
      email: cleanEmail || safeFallbackEmail,
      phone: rawPhoneDisplay,
      title: input.title?.trim() || input.sourceListingTitle?.trim() || resolvedDestination || cleanName,
      message: input.message?.trim() || input.notes?.trim() || null,
      notes: combinedNotes,
      destination: resolvedDestination,
      travel_start: resolvedStart,
      travel_end: resolvedEnd,
      pax_count: resolvedPaxCount,
      pax_adults: resolvedAdults,
      pax_children: resolvedChildren,
      pax_infants: resolvedInfants,
      estimated_value_cents: resolvedValueCents,
      source: input.source,
      lead_source_detail: input.sourceDetail || input.sourceListingTitle || null,
      status: input.status || "new",
      custom_fields: mergedCustomFields,
      last_contacted_at: now,
      created_at: now,
      updated_at: now,
      ...(resolvedDoc ? { document: resolvedDoc } : {}),
      ...(input.paxList && input.paxList.length > 0 ? { pax_list: input.paxList } : {}),
    };

    let insertRes = await db
      .from("leads_crm")
      .insert(insertPayload)
      .select("id")
      .single();

    if (insertRes.error) {
      // Fallback caso alguma coluna estendida opcional falhe em ambiente antigo
      const minimalPayload = {
        store_id: input.storeId,
        full_name: cleanName,
        email: safeFallbackEmail,
        phone: rawPhoneDisplay,
        message: input.message?.trim() || combinedNotes || null,
        notes: combinedNotes,
        destination: resolvedDestination,
        status: input.status || "new",
        source: input.source,
        custom_fields: mergedCustomFields,
        estimated_value_cents: resolvedValueCents,
      };
      insertRes = await db
        .from("leads_crm")
        .insert(minimalPayload)
        .select("id")
        .single();
    }

    if (insertRes.error || !insertRes.data?.id) {
      return {
        success: false,
        leadId: null,
        customerId: null,
        createdNewLead: false,
        reason: insertRes.error?.message || "insert_failed",
      };
    }

    leadId = insertRes.data.id;
    createdNewLead = true;
  }

  // 4. Deduplicar e vincular ao Cadastro Unico do Cliente (`customers_crm`)
  if (leadId) {
    try {
      const { data: dedupCustomerId } = await db.rpc("deduplicate_and_link_lead_to_customer", {
        p_lead_id: leadId,
        p_store_id: input.storeId,
      });
      if (dedupCustomerId) {
        customerId = String(dedupCustomerId);
      }
    } catch {
      // Fallback manual caso RPC nao exista em ambiente de teste
    }

    if (!customerId) {
      try {
        let custRow: any = null;
        if (cleanPhone) {
          const { data } = await db
            .from("customers_crm")
            .select("id, custom_fields")
            .eq("store_id", input.storeId)
            .eq("phone", rawPhoneDisplay || cleanPhone)
            .maybeSingle();
          custRow = data;
        }
        if (!custRow && cleanEmail) {
          const { data } = await db
            .from("customers_crm")
            .select("id, custom_fields")
            .eq("store_id", input.storeId)
            .eq("email", cleanEmail)
            .maybeSingle();
          custRow = data;
        }

        if (custRow?.id) {
          customerId = custRow.id;
          await db
            .from("customers_crm")
            .update({
              custom_fields: mergeCustomFieldMaps(custRow.custom_fields, normalizeCustomFieldMap(input.customFields)),
              last_commercial_touch_at: now,
              updated_at: now,
            })
            .eq("id", custRow.id);
        } else {
          const { data: insertedCust } = await db
            .from("customers_crm")
            .insert({
              store_id: input.storeId,
              kind: "individual",
              full_name: cleanName,
              name: cleanName,
              phone: rawPhoneDisplay,
              email: cleanEmail,
              document: resolvedDoc,
              channel: input.source,
              tags: ["Lead Omnichannel"],
              custom_fields: normalizeCustomFieldMap(input.customFields),
              last_commercial_touch_at: now,
            })
            .select("id")
            .maybeSingle();
          if (insertedCust?.id) customerId = insertedCust.id;
        }

        if (customerId) {
          await db
            .from("leads_crm")
            .update({ customer_id: customerId })
            .eq("id", leadId)
            .eq("store_id", input.storeId);
        }
      } catch {
        // Nao abortar lead caso customers_crm possua restricao secundaria
      }
    } else {
      // Sincroniza respostas dinamicas mais recentes no customer_crm vinculado
      try {
        const { data: existingCust } = await db
          .from("customers_crm")
          .select("custom_fields")
          .eq("id", customerId)
          .maybeSingle();
        await db
          .from("customers_crm")
          .update({
            custom_fields: mergeCustomFieldMaps(existingCust?.custom_fields, normalizeCustomFieldMap(input.customFields)),
            last_commercial_touch_at: now,
          })
          .eq("id", customerId);
      } catch {
        // Silencioso
      }
    }

    // 5. Registrar atividade estruturada no Kanban
    try {
      await db.from("lead_activities").insert({
        lead_id: leadId,
        store_id: input.storeId,
        type: input.sourceDealId ? "deal" : "capture",
        content: input.sourceListingTitle
          ? `Novo contato via "${input.sourceListingTitle}" (${input.source}).`
          : `Contato capturado via canal ${input.source}.`,
        metadata: {
          source: input.source,
          source_listing_id: input.sourceListingId || null,
          source_deal_id: input.sourceDealId || null,
          source_quote_id: input.sourceQuoteId || null,
          custom_fields_count: Object.keys(normalizeCustomFieldMap(input.customFields)).length,
        },
      });
    } catch {
      // Nao critico
    }
  }

  return {
    success: Boolean(leadId),
    leadId,
    customerId,
    createdNewLead,
  };
}
