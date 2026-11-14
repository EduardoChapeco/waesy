export interface StoreSignatureDTO {
  agency_name: string;
  agency_logo_url: string | null;
  agency_email: string | null;
  agency_phone: string | null;
  agency_whatsapp: string | null;
  agent_name: string | null;
  agent_whatsapp: string | null;
}

export interface ResolvedProposalClientDTO {
  customer_id: string | null;
  lead_id: string | null;
  client_name: string;
  client_whatsapp: string;
  client_email: string | null;
  client_document: string | null;
  selected_customer_label: string | null;
}

export interface ProposalParticipantsEnrichmentResult {
  storeRow: any;
  agencySignature: StoreSignatureDTO;
  resolvedClient: ResolvedProposalClientDTO;
}

export interface ProposalParticipantsEnrichmentParams {
  supabase: any;
  storeId?: string | null;
  row?: Record<string, any> | null;
  meta?: Record<string, any> | null;
  customFields?: Record<string, any> | null;
  identity?: {
    id?: string | null;
    fullName?: string | null;
    email?: string | null;
    profile?: Record<string, any> | null;
    store?: Record<string, any> | null;
  } | null;
  allowClientLookup: boolean;
}

export function cleanNonEmptyString(val: unknown): string | null {
  if (typeof val !== "string") return null;
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizePhoneDigits(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/\D/g, "");
}

function phoneDigitsMatch(a: string, b: string): boolean {
  if (a.length < 8 || b.length < 8) return false;
  if (a === b) return true;
  const minSuffix = Math.min(9, a.length, b.length);
  return a.slice(-Math.max(8, minSuffix)) === b.slice(-Math.max(8, minSuffix));
}

export function normalizePersonNameKey(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function isGenericCustomerName(nameKey: string): boolean {
  return (
    !nameKey ||
    nameKey.length < 3 ||
    nameKey === "cliente" ||
    nameKey === "cliente convidado" ||
    nameKey === "visitante" ||
    nameKey === "passageiro"
  );
}

function isValidProfileCandidate(candidate: any): boolean {
  return Boolean(
    candidate &&
      typeof candidate === "object" &&
      (typeof candidate.full_name === "string" || typeof candidate.phone === "string") &&
      !("public_token" in candidate),
  );
}

function isValidStoreCandidate(candidate: any): boolean {
  return Boolean(
    candidate &&
      typeof candidate === "object" &&
      (typeof candidate.name === "string" ||
        (candidate.settings && typeof candidate.settings === "object")) &&
      !("public_token" in candidate),
  );
}

function isValidLeadCandidate(candidate: any): boolean {
  return Boolean(
    candidate &&
      typeof candidate === "object" &&
      typeof candidate.full_name === "string" &&
      !("public_token" in candidate),
  );
}

function isValidCustomerCandidate(candidate: any): boolean {
  return Boolean(
    candidate &&
      typeof candidate === "object" &&
      (typeof candidate.full_name === "string" || typeof candidate.legal_name === "string") &&
      !("public_token" in candidate),
  );
}

export function resolveStoreSignatureData(
  storeRow?: any,
  rawCustomFields?: Record<string, any> | null,
  creatorProfile?: any,
  activeSellerProfile?: any,
  identityFullName?: string | null,
): StoreSignatureDTO {
  const settings =
    storeRow?.settings && typeof storeRow.settings === "object" ? storeRow.settings : {};
  const custom = rawCustomFields && typeof rawCustomFields === "object" ? rawCustomFields : {};

  const agencyName =
    cleanNonEmptyString(custom.agency_name) || cleanNonEmptyString(storeRow?.name) || "";
  const agencyLogoUrl =
    cleanNonEmptyString(custom.agency_logo_url) ||
    cleanNonEmptyString(storeRow?.logo_url) ||
    cleanNonEmptyString(settings.logoUrl) ||
    cleanNonEmptyString(settings.logo_url) ||
    null;

  const agencyEmail =
    cleanNonEmptyString(storeRow?.email) ||
    cleanNonEmptyString(settings.email) ||
    cleanNonEmptyString(settings.contactEmail) ||
    cleanNonEmptyString(settings.contact_email) ||
    null;

  const agencyPhone =
    cleanNonEmptyString(storeRow?.phone) ||
    cleanNonEmptyString(settings.phone) ||
    cleanNonEmptyString(settings.contactPhone) ||
    cleanNonEmptyString(settings.contact_phone) ||
    null;

  const agencyWhatsapp =
    cleanNonEmptyString(settings.whatsapp_phone) ||
    cleanNonEmptyString(settings.whatsapp) ||
    cleanNonEmptyString(settings.contactWhatsapp) ||
    cleanNonEmptyString(settings.contact_whatsapp) ||
    agencyPhone ||
    null;

  const cleanIdentityName = cleanNonEmptyString(identityFullName);
  const effectiveIdentityName =
    cleanIdentityName && cleanIdentityName.toLowerCase() !== "membro waesy"
      ? cleanIdentityName
      : null;

  const agentName =
    cleanNonEmptyString(custom.agent_name) ||
    cleanNonEmptyString(creatorProfile?.full_name) ||
    cleanNonEmptyString(activeSellerProfile?.full_name) ||
    effectiveIdentityName ||
    null;

  const agentWhatsapp =
    cleanNonEmptyString(custom.agent_whatsapp) ||
    cleanNonEmptyString(creatorProfile?.phone) ||
    cleanNonEmptyString(activeSellerProfile?.phone) ||
    agencyWhatsapp ||
    null;

  return {
    agency_name: agencyName,
    agency_logo_url: agencyLogoUrl,
    agency_email: agencyEmail,
    agency_phone: agencyPhone,
    agency_whatsapp: agencyWhatsapp,
    agent_name: agentName,
    agent_whatsapp: agentWhatsapp,
  };
}

async function fetchStoreForSignature(
  supabase: any,
  storeId: string | null,
  embeddedStore: any,
  identityStore: any,
): Promise<any> {
  const baseStore = isValidStoreCandidate(embeddedStore)
    ? embeddedStore
    : isValidStoreCandidate(identityStore)
      ? identityStore
      : null;

  const hasCompleteContact =
    baseStore &&
    Boolean(baseStore.name) &&
    Boolean(baseStore.phone || baseStore.email || baseStore.settings?.whatsapp || baseStore.settings?.whatsapp_phone);

  if (hasCompleteContact || !storeId) {
    return baseStore;
  }

  try {
    const { data } = await supabase
      .from("stores")
      .select("id, name, email, phone, logo_url, settings")
      .eq("id", storeId)
      .maybeSingle();
    if (isValidStoreCandidate(data)) {
      return {
        ...(baseStore || {}),
        ...data,
        settings: {
          ...(baseStore?.settings && typeof baseStore.settings === "object" ? baseStore.settings : {}),
          ...(data.settings && typeof data.settings === "object" ? data.settings : {}),
        },
      };
    }
  } catch {
    // Segue com os metadados já carregados na consulta principal
  }

  return baseStore;
}

async function fetchProfileSafe(supabase: any, profileId: string | null): Promise<any | null> {
  if (!profileId) return null;
  try {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, phone")
      .eq("id", profileId)
      .maybeSingle();
    return isValidProfileCandidate(data) ? data : null;
  } catch {
    return null;
  }
}

export async function resolveProposalParticipantsEnrichment(
  params: ProposalParticipantsEnrichmentParams,
): Promise<ProposalParticipantsEnrichmentResult> {
  const { supabase, allowClientLookup, identity } = params;
  const row = params.row || {};
  const meta = params.meta || {};
  const customFields = params.customFields || {};
  const rawPricing =
    row.pricing && typeof row.pricing === "object"
      ? row.pricing
      : meta.pricing && typeof meta.pricing === "object"
        ? meta.pricing
        : {};

  const storeId = cleanNonEmptyString(params.storeId) || cleanNonEmptyString(row.store_id) || null;
  const customAgentName = cleanNonEmptyString(customFields.agent_name);
  const customAgentWhatsapp = cleanNonEmptyString(customFields.agent_whatsapp);
  const creatorId = cleanNonEmptyString(row.created_by_profile_id);
  const activeSellerId = cleanNonEmptyString(identity?.id);

  const [storeRow, creatorProfile] = await Promise.all([
    fetchStoreForSignature(supabase, storeId, row.stores, identity?.store),
    !customAgentName || !customAgentWhatsapp
      ? fetchProfileSafe(supabase, creatorId)
      : Promise.resolve(null),
  ]);

  let activeSellerProfile: any = isValidProfileCandidate(identity?.profile)
    ? identity?.profile
    : null;
  if (
    activeSellerId &&
    (!customAgentName || !customAgentWhatsapp) &&
    !activeSellerProfile &&
    activeSellerId !== creatorId
  ) {
    activeSellerProfile = await fetchProfileSafe(supabase, activeSellerId);
  }
  if (!activeSellerProfile && activeSellerId && creatorId === activeSellerId) {
    activeSellerProfile = creatorProfile;
  }

  const agencySignature = resolveStoreSignatureData(
    storeRow,
    customFields,
    creatorProfile,
    activeSellerProfile,
    identity?.fullName,
  );

  let leadId = cleanNonEmptyString(row.lead_id) || cleanNonEmptyString(meta.lead_id);
  let customerId = cleanNonEmptyString(row.customer_id) || cleanNonEmptyString(meta.customer_id);
  const quoteId = cleanNonEmptyString(row.quote_id) || cleanNonEmptyString(meta.quote_id);

  let clientName =
    cleanNonEmptyString(row.client_name) ||
    cleanNonEmptyString(row.guest_name) ||
    cleanNonEmptyString(meta.client_name) ||
    "";
  let clientWhatsapp =
    cleanNonEmptyString(row.client_whatsapp) ||
    cleanNonEmptyString(row.guest_phone) ||
    cleanNonEmptyString(meta.client_whatsapp) ||
    "";
  let clientEmail =
    cleanNonEmptyString(row.client_email) ||
    cleanNonEmptyString(row.guest_email) ||
    cleanNonEmptyString(meta.client_email);
  let clientDocument =
    cleanNonEmptyString(row.client_document) ||
    cleanNonEmptyString(meta.client_document) ||
    cleanNonEmptyString(rawPricing.client_document) ||
    cleanNonEmptyString(customFields.document);

  let selectedCustomerLabel: string | null = null;

  if (allowClientLookup && storeId) {
    // 1. Backfill pela cotação vinculada
    if (quoteId && (!leadId || !customerId || !clientEmail || !clientWhatsapp || !clientName)) {
      try {
        const { data: quoteRow } = await supabase
          .from("travel_quotes")
          .select("id, lead_id, customer_id, contact_name, contact_whatsapp, contact_email")
          .eq("id", quoteId)
          .eq("store_id", storeId)
          .maybeSingle();
        if (quoteRow && !("public_token" in quoteRow)) {
          if (!leadId) leadId = cleanNonEmptyString(quoteRow.lead_id);
          if (!customerId) customerId = cleanNonEmptyString(quoteRow.customer_id);
          if (!clientName) clientName = cleanNonEmptyString(quoteRow.contact_name) || "";
          if (!clientWhatsapp) clientWhatsapp = cleanNonEmptyString(quoteRow.contact_whatsapp) || "";
          if (!clientEmail) clientEmail = cleanNonEmptyString(quoteRow.contact_email);
        }
      } catch {
        // Não bloqueia hidratação se travel_quotes não retornar vínculo
      }
    }

    // 2. Backfill pelo Lead do Kanban vinculado
    if (leadId) {
      try {
        const { data: leadRow } = await supabase
          .from("leads_crm")
          .select("id, customer_id, full_name, email, phone, custom_fields")
          .eq("id", leadId)
          .eq("store_id", storeId)
          .maybeSingle();
        if (isValidLeadCandidate(leadRow)) {
          const leadCf =
            leadRow.custom_fields && typeof leadRow.custom_fields === "object"
              ? leadRow.custom_fields
              : {};
          if (!customerId) customerId = cleanNonEmptyString(leadRow.customer_id);
          if (!clientName) clientName = cleanNonEmptyString(leadRow.full_name) || "";
          if (!clientWhatsapp) clientWhatsapp = cleanNonEmptyString(leadRow.phone) || "";
          if (!clientEmail) clientEmail = cleanNonEmptyString(leadRow.email);
          if (!clientDocument) {
            clientDocument =
              cleanNonEmptyString(leadCf.document) ||
              cleanNonEmptyString(leadCf.cpf_cnpj) ||
              cleanNonEmptyString(leadCf.cpf);
          }
        }
      } catch {
        // Continua com os demais elos
      }
    }

    // 3. Backfill pelo Cliente CRM vinculado
    if (customerId) {
      try {
        const { data: customerRow } = await supabase
          .from("customers_crm")
          .select("id, full_name, legal_name, document, email, phone")
          .eq("id", customerId)
          .eq("store_id", storeId)
          .maybeSingle();
        if (isValidCustomerCandidate(customerRow)) {
          const custName =
            cleanNonEmptyString(customerRow.full_name) ||
            cleanNonEmptyString(customerRow.legal_name);
          if (custName) {
            selectedCustomerLabel = custName;
            if (!clientName) clientName = custName;
          }
          if (!clientWhatsapp) clientWhatsapp = cleanNonEmptyString(customerRow.phone) || "";
          if (!clientEmail) clientEmail = cleanNonEmptyString(customerRow.email);
          if (!clientDocument) clientDocument = cleanNonEmptyString(customerRow.document);
        }
      } catch {
        // Continua para correspondência inteligente caso cliente não exista
      }
    }

    // 4. Descoberta determinística por telefone, e-mail ou nome único dentro do mesmo tenant
    const needsCustomerLink = !customerId || !clientEmail || !clientWhatsapp || !clientDocument;
    const phoneDigits = normalizePhoneDigits(clientWhatsapp);
    const emailKey = (clientEmail || "").trim().toLowerCase();
    const nameKey = normalizePersonNameKey(clientName);

    if (
      needsCustomerLink &&
      (phoneDigits.length >= 8 || emailKey.includes("@") || !isGenericCustomerName(nameKey))
    ) {
      try {
        const { data: customerRows } = await supabase
          .from("customers_crm")
          .select("id, full_name, legal_name, document, email, phone, deleted_at")
          .eq("store_id", storeId)
          .limit(100);

        const activeCustomers = Array.isArray(customerRows)
          ? customerRows.filter(
              (c: any) => isValidCustomerCandidate(c) && !c.deleted_at,
            )
          : [];

        const matchedCustomer = findBestCustomerMatch(activeCustomers, {
          emailKey,
          phoneDigits,
          nameKey,
        });

        if (matchedCustomer) {
          if (!customerId) customerId = cleanNonEmptyString(matchedCustomer.id);
          const matchedName =
            cleanNonEmptyString(matchedCustomer.full_name) ||
            cleanNonEmptyString(matchedCustomer.legal_name);
          if (matchedName) {
            selectedCustomerLabel = selectedCustomerLabel || matchedName;
            if (!clientName) clientName = matchedName;
          }
          if (!clientWhatsapp) clientWhatsapp = cleanNonEmptyString(matchedCustomer.phone) || "";
          if (!clientEmail) clientEmail = cleanNonEmptyString(matchedCustomer.email);
          if (!clientDocument) clientDocument = cleanNonEmptyString(matchedCustomer.document);
        }
      } catch {
        // Lookup opcional nunca deve quebrar o carregamento da proposta
      }
    }

    if (!leadId || !clientEmail || !clientWhatsapp || !customerId || !clientDocument) {
      const updatedPhoneDigits = normalizePhoneDigits(clientWhatsapp);
      const updatedEmailKey = (clientEmail || "").trim().toLowerCase();
      if (
        updatedPhoneDigits.length >= 8 ||
        updatedEmailKey.includes("@") ||
        !isGenericCustomerName(nameKey)
      ) {
        try {
          const { data: leadRows } = await supabase
            .from("leads_crm")
            .select("id, customer_id, full_name, email, phone, custom_fields")
            .eq("store_id", storeId)
            .limit(100);

          const validLeads = Array.isArray(leadRows)
            ? leadRows.filter((l: any) => isValidLeadCandidate(l))
            : [];
          const matchedLead = findBestCustomerMatch(validLeads, {
            emailKey: updatedEmailKey,
            phoneDigits: updatedPhoneDigits,
            nameKey,
          });

          if (matchedLead) {
            if (!leadId) leadId = cleanNonEmptyString(matchedLead.id);
            if (!customerId) customerId = cleanNonEmptyString(matchedLead.customer_id);
            if (!clientName) clientName = cleanNonEmptyString(matchedLead.full_name) || "";
            if (!clientWhatsapp) clientWhatsapp = cleanNonEmptyString(matchedLead.phone) || "";
            if (!clientEmail) clientEmail = cleanNonEmptyString(matchedLead.email);
            const matchedCf =
              matchedLead.custom_fields && typeof matchedLead.custom_fields === "object"
                ? matchedLead.custom_fields
                : {};
            if (!clientDocument) {
              clientDocument =
                cleanNonEmptyString(matchedCf.document) ||
                cleanNonEmptyString(matchedCf.cpf_cnpj) ||
                cleanNonEmptyString(matchedCf.cpf);
            }
          }
        } catch {
          // Lookup opcional de lead no CRM não interrompe a renderização
        }
      }
    }
  }

  return {
    storeRow,
    agencySignature,
    resolvedClient: {
      customer_id: customerId,
      lead_id: leadId,
      client_name: clientName,
      client_whatsapp: clientWhatsapp,
      client_email: clientEmail,
      client_document: clientDocument,
      selected_customer_label:
        selectedCustomerLabel || (customerId && clientName ? clientName : null),
    },
  };
}

function findBestCustomerMatch(
  records: any[],
  keys: { emailKey: string; phoneDigits: string; nameKey: string },
): any | null {
  if (!records.length) return null;

  if (keys.emailKey.includes("@")) {
    const emailMatches = records.filter(
      (r) => typeof r.email === "string" && r.email.trim().toLowerCase() === keys.emailKey,
    );
    if (emailMatches.length > 0) return emailMatches[0];
  }

  if (keys.phoneDigits.length >= 8) {
    const phoneMatches = records.filter((r) =>
      phoneDigitsMatch(normalizePhoneDigits(r.phone), keys.phoneDigits),
    );
    if (phoneMatches.length > 0) return phoneMatches[0];
  }

  if (!isGenericCustomerName(keys.nameKey)) {
    const exactNameMatches = records.filter((r) => {
      const fullKey = normalizePersonNameKey(r.full_name);
      const legalKey = normalizePersonNameKey(r.legal_name);
      return fullKey === keys.nameKey || legalKey === keys.nameKey;
    });
    if (exactNameMatches.length === 1) return exactNameMatches[0];
  }

  return null;
}
