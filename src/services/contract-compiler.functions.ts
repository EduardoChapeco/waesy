/**
 * @fileoverview BFF DE COMPILACAO MULTI-NICHO DE CONTRATOS TABULARES
 *
 * Conecta Orcamentos (/workspace/orcamentos/$id), Propostas Turisticas (travel_proposals),
 * Leads Kanban (leads_crm + custom_fields + pax_list) e Templates Personalizaveis
 * ao motor unificado contracts + contract_versions + signature_envelopes.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { autoPositionSignatureFieldsFromContent } from "@/lib/contracts/contract-semantic-dictionary";
import {
  compileContractDocument,
  type CompiledContractItemRow,
  type CompiledContractOutput,
  type CompiledContractPassengerRow,
  type CompiledContractItineraryRow,
  type CompiledContractInstallmentRow,
} from "@/lib/contracts/contract-compiler";
import {
  formatDynamicFieldLabel,
  formatFieldPrimitiveValue,
  getNicheContractBlueprint,
  normalizeCustomFieldMap,
} from "@/lib/niches/unified-field-bridge";

const SectionConfigSchema = z
  .object({
    showItemsTable: z.boolean().optional(),
    showSpecsTable: z.boolean().optional(),
    showItineraryTable: z.boolean().optional(),
    showPassengersTable: z.boolean().optional(),
    showFinancialTable: z.boolean().optional(),
    showCustomFieldsTable: z.boolean().optional(),
    includeLegalClauses: z.boolean().optional(),
  })
  .optional();

function mapBlueprintToDbContractCategory(
  contractCategory: string,
  nicheId: string,
): string {
  if (nicheId === "tourism") return "tourism";
  if (contractCategory === "vehicle_sale") return "vehicle_sale";
  if (contractCategory === "real_estate_rental") return "real_estate_rental";
  if (contractCategory === "service_agreement") return "service_agreement";
  return "general_deal";
}

function parseJsonSafe(raw: unknown): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, any>;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
      } catch {
        return {};
      }
    }
  }
  return {};
}

async function computeSha256Hex(content: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const compileContractFromQuote = createServerFn({ method: "POST" })
  .validator(
    z.object({
      quoteId: z.string().uuid(),
      templateId: z.string().optional(),
      customTitle: z.string().optional(),
      sectionConfig: SectionConfigSchema,
      customVariables: z.record(z.string(), z.string()).optional(),
    }),
  )
  .handler(
    async ({
      data: input,
    }): Promise<{
      success: boolean;
      contractId: string;
      versionId: string;
      publicToken: string;
      templateTitle: string;
      compiled: CompiledContractOutput;
    }> => {
      const supabase = getServerClient();
      const identity = await getServerIdentity();
      assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);
      const storeId = identity.store_id;

      // 1. Carrega orcamento + itens + proposta de turismo opcional + loja
      const [{ data: quote, error: qErr }, { data: quoteItems }, { data: travelProp }, { data: storeRow }] =
        await Promise.all([
          supabase
            .from("quotes")
            .select("*")
            .eq("id", input.quoteId)
            .eq("store_id", storeId)
            .maybeSingle(),
          supabase.from("quote_items").select("*").eq("quote_id", input.quoteId),
          supabase
            .from("travel_proposals")
            .select("*")
            .eq("id", input.quoteId)
            .eq("store_id", storeId)
            .maybeSingle(),
          supabase
            .from("stores")
            .select("id, name, cnpj, address, city, state, phone, email, primary_niche_id, settings")
            .eq("id", storeId)
            .maybeSingle(),
        ]);

      if (qErr || !quote) {
        throw new Error("Orçamento não encontrado nesta loja.");
      }

      const travelMeta = parseJsonSafe(quote.conditions);
      const linkedLeadId =
        (travelProp as any)?.lead_id ||
        (typeof travelMeta.lead_id === "string" ? travelMeta.lead_id : null);

      const [{ data: leadRow }, { data: customerRow }] = await Promise.all([
        linkedLeadId
          ? supabase
              .from("leads_crm")
              .select("*")
              .eq("id", linkedLeadId)
              .eq("store_id", storeId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        quote.customer_id
          ? supabase
              .from("customers_crm")
              .select("*")
              .eq("id", quote.customer_id)
              .eq("store_id", storeId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      const storeSettings = parseJsonSafe((storeRow as any)?.settings);
      const nicheHint = (storeRow as any)?.primary_niche_id || storeSettings.niche_id || storeSettings.niche;
      const blueprint = getNicheContractBlueprint(nicheHint);

      // 2. Normaliza itens do orcamento / proposta
      const items: CompiledContractItemRow[] = [];
      if (Array.isArray(quoteItems) && quoteItems.length > 0) {
        for (const it of quoteItems as any[]) {
          items.push({
            title: String(it.title || it.name || it.description || "Item do Orçamento"),
            sku: it.sku || undefined,
            unit: it.unit || it.metadata?.unit || "un",
            quantity: Number(it.quantity || 1),
            unitPriceCents: Number(it.unit_price_cents || 0),
            totalPriceCents: Number(
              it.total_cents ?? Number(it.unit_price_cents || 0) * Number(it.quantity || 1),
            ),
          });
        }
      } else if (Array.isArray((travelProp as any)?.hotels) && (travelProp as any).hotels.length > 0) {
        for (const h of (travelProp as any).hotels) {
          items.push({
            title: `Hospedagem: ${h.hotel_name || h.name || "Hotel Selecionado"}`,
            unit: "pacote",
            quantity: 1,
            unitPriceCents: Number(quote.total_cents || 0),
            totalPriceCents: Number(quote.total_cents || 0),
          });
        }
      } else {
        items.push({
          title: String(
            travelMeta.title ||
              (travelProp as any)?.title ||
              quote.internal_notes ||
              `Orçamento #${quote.quote_number || quote.id.slice(0, 8)}`,
          ),
          unit: "un",
          quantity: 1,
          unitPriceCents: Number(quote.total_cents || 0),
          totalPriceCents: Number(quote.total_cents || 0),
        });
      }

      // 3. Mescla campos personalizados e especificacoes tecnicas
      const mergedCustomFields = normalizeCustomFieldMap({
        ...((customerRow as any)?.custom_fields || {}),
        ...((leadRow as any)?.custom_fields || {}),
        ...(travelMeta.custom_fields || {}),
        ...(((travelProp as any)?.pricing?.custom_fields as Record<string, unknown>) || {}),
      });

      const specs: Array<{ label: string; value: string }> = [];
      const destination = String(
        (travelProp as any)?.destination_city ||
          travelMeta.destination_city ||
          (leadRow as any)?.destination ||
          "",
      ).trim();
      const travelStart =
        (travelProp as any)?.travel_start_date ||
        travelMeta.travel_start_date ||
        (leadRow as any)?.travel_start ||
        null;
      const travelEnd =
        (travelProp as any)?.travel_end_date ||
        travelMeta.travel_end_date ||
        (leadRow as any)?.travel_end ||
        null;

      if (destination) specs.push({ label: "Destino / Objeto Principal", value: destination });
      if (travelStart) specs.push({ label: "Inicio / Embarque", value: String(travelStart) });
      if (travelEnd) specs.push({ label: "Termino / Retorno", value: String(travelEnd) });
      if (Array.isArray(quoteItems)) {
        for (const it of quoteItems as any[]) {
          const itemLabel = String(it.title || it.name || "Detalhe");
          if (it.description && it.description !== itemLabel) {
            specs.push({ label: itemLabel, value: String(it.description) });
          }
        }
      }
      for (const [k, rawVal] of Object.entries(mergedCustomFields)) {
        const formatted = formatFieldPrimitiveValue(rawVal);
        if (formatted && specs.length < 15) {
          specs.push({ label: formatDynamicFieldLabel(k), value: formatted });
        }
      }

      // 4. Roteiro & Passageiros (quando existentes)
      const rawItinerary = Array.isArray((travelProp as any)?.itinerary)
        ? (travelProp as any).itinerary
        : Array.isArray(travelMeta.itinerary)
        ? travelMeta.itinerary
        : [];
      const itinerary: CompiledContractItineraryRow[] = rawItinerary.map((d: any, idx: number) => ({
        day: d.day || d.day_number || idx + 1,
        title: String(d.title || `Etapa ${idx + 1}`),
        description: String(d.description || ""),
        meals: Array.isArray(d.meals) ? d.meals.join(", ") : d.meals ? String(d.meals) : undefined,
      }));

      const rawPassengers =
        Array.isArray((leadRow as any)?.pax_list) && (leadRow as any).pax_list.length > 0
          ? (leadRow as any).pax_list
          : Array.isArray(travelMeta.passengers)
          ? travelMeta.passengers
          : [];
      const passengers: CompiledContractPassengerRow[] = rawPassengers
        .filter((p: any) => p?.name || p?.full_name)
        .map((p: any) => ({
          name: String(p.name || p.full_name),
          document: p.document || p.cpf || p.rg || undefined,
          birthDate: p.birth_date || p.birthDate || undefined,
          role: p.role || undefined,
          boardingPoint: p.boarding_point || (mergedCustomFields.boarding_point ? String(mergedCustomFields.boarding_point) : undefined),
        }));

      const rawInstallments = Array.isArray(travelMeta.pricing?.installments_options)
        ? travelMeta.pricing.installments_options
        : Array.isArray((travelProp as any)?.pricing?.installments_options)
        ? (travelProp as any).pricing.installments_options
        : [];
      const installments: CompiledContractInstallmentRow[] = rawInstallments.map((inst: any, idx: number) => ({
        installmentNumber: inst.installments_count ? `1/${inst.installments_count}` : idx + 1,
        dueDate: inst.due_date || "Conforme faturamento",
        amountCents: Number(inst.installment_value_cents || quote.total_cents || 0),
        method: String(inst.method || "A combinar").toUpperCase(),
        status: "Prevista",
      }));

      const clientName = String(
        quote.guest_name ||
          (travelProp as any)?.client_name ||
          travelMeta.client_name ||
          (customerRow as any)?.full_name ||
          (leadRow as any)?.full_name ||
          "Cliente",
      ).trim();
      const clientDocument = String(
        travelMeta.client_document ||
          (customerRow as any)?.document ||
          (leadRow as any)?.document ||
          mergedCustomFields.document ||
          "",
      ).trim();
      const clientEmail = String(
        quote.guest_email ||
          (travelProp as any)?.client_email ||
          travelMeta.client_email ||
          (customerRow as any)?.email ||
          (leadRow as any)?.email ||
          "",
      ).trim();
      const clientPhone = String(
        quote.guest_phone ||
          (travelProp as any)?.client_whatsapp ||
          travelMeta.client_whatsapp ||
          (customerRow as any)?.phone ||
          (leadRow as any)?.phone ||
          "",
      ).trim();

      const contractTitle =
        input.customTitle?.trim() ||
        `Contrato Comercial · ${travelMeta.title || (travelProp as any)?.title || quote.internal_notes || `#${quote.quote_number || quote.id.slice(0, 8)}`}`;

      const paymentConditions = String(
        travelMeta.pricing?.payment_terms ||
          (travelProp as any)?.pricing?.payment_terms ||
          travelMeta.payment_conditions ||
          "Conforme orçamento aprovado",
      );

      const compiled = compileContractDocument({
        title: contractTitle,
        nicheHint,
        templateId: input.templateId || travelMeta.template_id || blueprint.defaultTemplateId,
        sectionConfig: input.sectionConfig,
        issuer: {
          name: (storeRow as any)?.name || "Empresa Contratada",
          document: (storeRow as any)?.cnpj || "",
          address: (storeRow as any)?.address || "",
          cityState: [(storeRow as any)?.city, (storeRow as any)?.state].filter(Boolean).join(" / "),
          phone: (storeRow as any)?.phone || storeSettings.whatsapp_phone || "",
          email: (storeRow as any)?.email || "",
        },
        customer: {
          name: clientName,
          document: clientDocument,
          phone: clientPhone,
          email: clientEmail,
          address: (customerRow as any)?.address || "",
          cityState: [(customerRow as any)?.city, (customerRow as any)?.state].filter(Boolean).join(" / "),
        },
        items,
        specs,
        itinerary,
        passengers,
        installments,
        customFields: mergedCustomFields,
        summaryText: quote.internal_notes || undefined,
        totalValueCents: Number(quote.total_cents || 0),
        discountCents: Number(quote.discount_cents || 0),
        paymentConditions,
        validUntil: quote.valid_until,
        travelStartDate: travelStart,
        travelEndDate: travelEnd,
        destination: destination || undefined,
        hotelName: (travelProp as any)?.hotels?.[0]?.hotel_name || undefined,
        boardingPoint: mergedCustomFields.boarding_point
          ? String(mergedCustomFields.boarding_point)
          : undefined,
        customVariables: input.customVariables,
      });

      const dbCategory = mapBlueprintToDbContractCategory(blueprint.contractCategory, blueprint.nicheId);
      const hashHex = await computeSha256Hex(compiled.contentMarkdown);
      const autoFields = autoPositionSignatureFieldsFromContent(compiled.contentMarkdown, 2, 2);

      // 5. Persiste contracts + contract_versions + signature_envelopes com rollback seguro
      const { data: newContract, error: ctrErr } = await supabase
        .from("contracts")
        .insert({
          store_id: storeId,
          creator_id: identity.id,
          lead_id: linkedLeadId || null,
          customer_id: (customerRow as any)?.id || null,
          title: contractTitle,
          category: dbCategory,
          status: "draft",
          current_version: 1,
          metadata: {
            store_id: storeId,
            quote_id: quote.id,
            lead_id: linkedLeadId || null,
            customer_id: (customerRow as any)?.id || null,
            client_name: clientName,
            client_document: clientDocument || null,
            client_email: clientEmail || null,
            client_phone: clientPhone || "",
            destination: destination || null,
            package_summary: compiled.summaryText,
            total_value_cents: Number(quote.total_cents || 0),
            payment_conditions: paymentConditions,
            passengers,
            template_id: compiled.templateIdUsed,
            niche_id: compiled.nicheId,
          },
        })
        .select("id, verification_code")
        .single();

      if (ctrErr || !newContract?.id) {
        throw new Error(`Erro ao registrar contrato do orçamento: ${ctrErr?.message || "falha desconhecida"}`);
      }

      const { data: version, error: verErr } = await supabase
        .from("contract_versions")
        .insert({
          contract_id: newContract.id,
          version_number: 1,
          title: contractTitle,
          content_markdown: compiled.contentMarkdown,
          clauses: compiled.clauses,
          variables: compiled.variablesApplied,
          hash_sha256: hashHex,
          signature_fields: autoFields,
          page_count: 2,
          is_sealed: false,
        })
        .select("id")
        .single();

      if (verErr || !version?.id) {
        await supabase.from("contracts").delete().eq("id", newContract.id);
        throw new Error(`Erro ao criar versão do contrato: ${verErr?.message || "falha desconhecida"}`);
      }

      await supabase.from("signature_envelopes").insert({
        contract_version_id: version.id,
        signer_name: clientName,
        signer_email: clientEmail || "cliente@waesy.com",
        signer_phone: clientPhone || null,
        signer_cpf: clientDocument || null,
        dispatch_channel: clientPhone ? "whatsapp" : "email",
        status: "pending",
      });

      await supabase
        .from("quotes")
        .update({ status: "converted", updated_at: new Date().toISOString() })
        .eq("id", quote.id)
        .eq("store_id", storeId);

      return {
        success: true,
        contractId: newContract.id,
        versionId: version.id,
        publicToken: newContract.verification_code || newContract.id,
        templateTitle: compiled.templateTitle,
        compiled,
      };
    },
  );

export const issueCustomizedContractFromProposal = createServerFn({ method: "POST" })
  .validator(
    z.object({
      proposalId: z.string().uuid(),
      clientDocument: z.string().optional(),
      templateId: z.string().optional(),
      customTitle: z.string().optional(),
      sectionConfig: SectionConfigSchema,
      customVariables: z.record(z.string(), z.string()).optional(),
    }),
  )
  .handler(
    async ({
      data: input,
    }): Promise<{
      success: boolean;
      contractId: string;
      publicToken: string;
      templateTitle: string;
    }> => {
      const supabase = getServerClient();
      const identity = await getServerIdentity();
      assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);
      const storeId = identity.store_id;

      // Garante TODAS as travas P0 de snapshot, aceite e autorizacao no RPC oficial antes de personalizar a minuta
      const { data: rpcRes, error: rpcErr } = await (supabase.rpc as any)(
        "create_staff_travel_contract_from_proposal",
        {
          p_proposal_id: input.proposalId,
          p_store_id: storeId,
          p_actor_profile_id: identity.id,
          p_client_document: input.clientDocument || null,
        },
      );

      if (rpcErr || !rpcRes?.contract_id) {
        throw new Error(rpcErr?.message || "Não foi possível gerar o contrato da proposta.");
      }

      const contractId = String(rpcRes.contract_id);
      const publicToken = String(rpcRes.public_token || contractId);

      const [{ data: contractRow }, { data: propRow }, { data: storeRow }] = await Promise.all([
        supabase.from("contracts").select("*").eq("id", contractId).maybeSingle(),
        supabase
          .from("travel_proposals")
          .select("*")
          .eq("id", input.proposalId)
          .eq("store_id", storeId)
          .maybeSingle(),
        supabase
          .from("stores")
          .select("id, name, cnpj, address, city, state, phone, email, primary_niche_id, settings")
          .eq("id", storeId)
          .maybeSingle(),
      ]);

      const { data: currentVersion } = await supabase
        .from("contract_versions")
        .select("*")
        .eq("contract_id", contractId)
        .eq("version_number", contractRow?.current_version || 1)
        .maybeSingle();

      // Nunca altera versao ja selada/assinada
      if (!contractRow || !currentVersion || currentVersion.is_sealed) {
        return {
          success: true,
          contractId,
          publicToken,
          templateTitle: String(contractRow?.title || "Contrato Turístico"),
        };
      }

      const meta = parseJsonSafe(contractRow.metadata);
      const leadId = (propRow as any)?.lead_id || meta.lead_id || null;
      const { data: leadRow } = leadId
        ? await supabase
            .from("leads_crm")
            .select("*")
            .eq("id", leadId)
            .eq("store_id", storeId)
            .maybeSingle()
        : { data: null };

      const mergedCustomFields = normalizeCustomFieldMap({
        ...((leadRow as any)?.custom_fields || {}),
        ...(((propRow as any)?.pricing?.custom_fields as Record<string, unknown>) || {}),
      });

      const flights = Array.isArray((propRow as any)?.flights) ? (propRow as any).flights : [];
      const hotels = Array.isArray((propRow as any)?.hotels) ? (propRow as any).hotels : [];
      const items: CompiledContractItemRow[] = [];

      for (const h of hotels) {
        items.push({
          title: `Hospedagem: ${h.hotel_name || h.name || "Hotel Selecionado"}${h.board_basis ? ` (${h.board_basis})` : ""}`,
          unit: h.nights_count ? `${h.nights_count} noite(s)` : "estadia",
          quantity: 1,
          unitPriceCents: Number(meta.total_value_cents || 0),
          totalPriceCents: Number(meta.total_value_cents || 0),
        });
      }
      for (const f of flights) {
        items.push({
          title: `Aéreo: ${f.airline_name || f.airline || "Voo"} (${f.origin_iata || f.origin_city || "Origem"} -> ${f.destination_iata || f.destination_city || "Destino"})`,
          unit: "trecho",
          quantity: 1,
          unitPriceCents: 0,
          totalPriceCents: 0,
        });
      }
      if (items.length === 0) {
        items.push({
          title: String(propRow?.title || meta.destination || "Pacote Turístico Contratado"),
          unit: "pacote",
          quantity: 1,
          unitPriceCents: Number(meta.total_value_cents || 0),
          totalPriceCents: Number(meta.total_value_cents || 0),
        });
      }

      const specs: Array<{ label: string; value: string }> = [];
      if (meta.destination) specs.push({ label: "Destino", value: String(meta.destination) });
      if (meta.travel_start_date) specs.push({ label: "Embarque", value: String(meta.travel_start_date) });
      if (meta.travel_end_date) specs.push({ label: "Retorno", value: String(meta.travel_end_date) });
      if (Array.isArray((propRow as any)?.includes) && (propRow as any).includes.length > 0) {
        specs.push({ label: "Servicos Inclusos", value: (propRow as any).includes.join(", ") });
      }
      if (Array.isArray((propRow as any)?.excludes) && (propRow as any).excludes.length > 0) {
        specs.push({ label: "Nao Incluso", value: (propRow as any).excludes.join(", ") });
      }

      const passengersRaw =
        Array.isArray(meta.passengers) && meta.passengers.length > 0
          ? meta.passengers
          : Array.isArray((leadRow as any)?.pax_list)
          ? (leadRow as any).pax_list
          : [];

      const storeSettings = parseJsonSafe((storeRow as any)?.settings);
      const customClauses = Array.isArray(storeSettings.tourism_contract_clauses)
        ? storeSettings.tourism_contract_clauses
        : undefined;

      const compiled = compileContractDocument({
        title: input.customTitle?.trim() || String(contractRow.title || "Contrato Turístico"),
        nicheHint: "tourism",
        templateId: input.templateId || "template-turismo-pacote-viagem",
        sectionConfig: input.sectionConfig,
        issuer: {
          name: (storeRow as any)?.name || "Agência Contratada",
          document: (storeRow as any)?.cnpj || "",
          address: (storeRow as any)?.address || "",
          cityState: [(storeRow as any)?.city, (storeRow as any)?.state].filter(Boolean).join(" / "),
          phone: (storeRow as any)?.phone || storeSettings.whatsapp_phone || "",
          email: (storeRow as any)?.email || "",
        },
        customer: {
          name: String(meta.client_name || "Cliente"),
          document: String(input.clientDocument || meta.client_document || ""),
          phone: String(meta.client_phone || ""),
          email: String(meta.client_email || ""),
        },
        items,
        specs,
        itinerary: Array.isArray((propRow as any)?.itinerary) ? (propRow as any).itinerary : [],
        passengers: passengersRaw.map((p: any) => ({
          name: String(p?.name || p?.full_name || "Passageiro"),
          document: p?.document || p?.cpf || p?.rg || undefined,
          birthDate: p?.birth_date || p?.birthDate || undefined,
          boardingPoint: mergedCustomFields.boarding_point
            ? String(mergedCustomFields.boarding_point)
            : undefined,
        })),
        installments: Array.isArray((propRow as any)?.pricing?.installments_options)
          ? (propRow as any).pricing.installments_options.map((inst: any, i: number) => ({
              installmentNumber: inst.installments_count ? `1/${inst.installments_count}` : i + 1,
              dueDate: "Conforme acordo",
              amountCents: Number(inst.installment_value_cents || meta.total_value_cents || 0),
              method: String(inst.method || "").toUpperCase(),
            }))
          : [],
        customFields: mergedCustomFields,
        summaryText: meta.package_summary || undefined,
        totalValueCents: Number(meta.total_value_cents || 0),
        paymentConditions: String(meta.payment_conditions || ""),
        travelStartDate: meta.travel_start_date || null,
        travelEndDate: meta.travel_end_date || null,
        destination: meta.destination || null,
        hotelName: hotels[0]?.hotel_name || hotels[0]?.name || null,
        boardingPoint: mergedCustomFields.boarding_point
          ? String(mergedCustomFields.boarding_point)
          : undefined,
        customVariables: input.customVariables,
        extraClauses: !input.templateId && customClauses ? customClauses : undefined,
      });

      const hashHex = await computeSha256Hex(compiled.contentMarkdown);
      await Promise.all([
        supabase
          .from("contract_versions")
          .update({
            title: input.customTitle?.trim() || currentVersion.title,
            content_markdown: compiled.contentMarkdown,
            clauses: compiled.clauses,
            variables: compiled.variablesApplied,
            hash_sha256: hashHex,
          })
          .eq("id", currentVersion.id),
        supabase
          .from("contracts")
          .update({
            store_id: storeId,
            title: input.customTitle?.trim() || contractRow.title,
            metadata: {
              ...meta,
              package_summary: compiled.summaryText,
              template_id: compiled.templateIdUsed,
            },
          })
          .eq("id", contractId),
      ]);

      return {
        success: true,
        contractId,
        publicToken,
        templateTitle: compiled.templateTitle,
      };
    },
  );
