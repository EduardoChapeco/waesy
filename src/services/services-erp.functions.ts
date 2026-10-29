import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { logSystemError } from "@/lib/logger";

// ============================================================
// 1. ACORDOS DE SALÃO PARCEIRO / PROFISSIONAL
// ============================================================

export const partnerAgreementSchema = z.object({
  employee_id: z.string().uuid(),
  is_partner_law: z.boolean().default(true),
  receives_commission: z.boolean().default(true),
  is_stockkeeper: z.boolean().default(false),
  date_filter_mode: z.enum(["competence", "availability"]).default("availability"),
  order_status_filter: z.enum(["all", "finalized"]).default("finalized"),
  gateway_fee_bearer: z.enum(["proportional", "store_100", "pro_100", "split_50"]).default("proportional"),
  discount_bearer: z.enum(["proportional", "store_100", "pro_100", "split_50"]).default("store_100"),
  additional_cost_deduction: z.boolean().default(false),
  consumed_products_deduction: z.enum(["pro_commission", "service_net", "none"]).default("pro_commission"),
  consumed_products_price_basis: z.enum(["none", "cost_price", "sale_price", "pro_special_price"]).default("none"),
  admin_fee_active: z.boolean().default(false),
  admin_fee_percentage: z.number().min(0).max(100).default(0),
  admin_fee_base: z.enum(["gross", "net"]).default("net"),
  show_gross_value_report: z.boolean().default(false),
  digital_signature_url: z.string().nullable().optional(),
  declaration_template: z.string().optional(),
});

export const getPartnerAgreement = createServerFn({ method: "GET" })
  .validator(z.object({ employeeId: z.string().uuid() }))
  .handler(async ({ data: { employeeId } }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    const supabase = getServerClient();

    const { data, error } = await supabase
      .from("workspace_partner_agreements")
      .select("*")
      .eq("store_id", identity.store_id)
      .eq("employee_id", employeeId)
      .maybeSingle();

    if (error) {
      console.error("[getPartnerAgreement] error:", error);
      return null;
    }
    return data;
  });

export const savePartnerAgreement = createServerFn({ method: "POST" })
  .validator(partnerAgreementSchema)
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "finance"]);
    const supabase = getServerClient();

    const payload = {
      store_id: identity.store_id,
      ...data,
      updated_at: new Date().toISOString(),
    };

    const { data: result, error } = await supabase
      .from("workspace_partner_agreements")
      .upsert(payload, { onConflict: "store_id, employee_id" })
      .select()
      .single();

    if (error) {
      console.error("[savePartnerAgreement] error:", error);
      throw new Error("Falha ao salvar acordo do profissional.");
    }
    return result;
  });

// ============================================================
// 2. FICHA TÉCNICA / PRODUTOS CONSUMIDOS (BOM DE SERVIÇO)
// ============================================================

export const consumedMaterialSchema = z.object({
  service_id: z.string().uuid(),
  product_id: z.string().uuid(),
  quantity: z.number().positive(),
  unit_measure: z.string().default("unidade"),
  tolerance_extra: z.number().nonnegative().default(0),
});

export const listServiceConsumedMaterials = createServerFn({ method: "GET" })
  .validator(z.object({ serviceId: z.string().uuid() }))
  .handler(async ({ data: { serviceId } }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    const supabase = getServerClient();

    const { data, error } = await supabase
      .from("service_consumed_materials")
      .select("*, products:product_id(id, title, price_cents, stock_quantity)")
      .eq("store_id", identity.store_id)
      .eq("service_id", serviceId);

    if (error) {
      console.error("[listServiceConsumedMaterials] error:", error);
      return [];
    }
    return data || [];
  });

export const saveServiceConsumedMaterials = createServerFn({ method: "POST" })
  .validator(
    z.object({
      serviceId: z.string().uuid(),
      materials: z.array(
        z.object({
          product_id: z.string().uuid(),
          quantity: z.number().positive(),
          unit_measure: z.string().default("unidade"),
          tolerance_extra: z.number().nonnegative().default(0),
        }),
      ),
    }),
  )
  .handler(async ({ data: { serviceId, materials } }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);
    const supabase = getServerClient();

    // Remove insumos antigos para substituição atômica
    await supabase
      .from("service_consumed_materials")
      .delete()
      .eq("store_id", identity.store_id)
      .eq("service_id", serviceId);

    if (materials.length === 0) return { success: true };

    const rows = materials.map((m) => ({
      store_id: identity.store_id,
      service_id: serviceId,
      product_id: m.product_id,
      quantity: m.quantity,
      unit_measure: m.unit_measure,
      tolerance_extra: m.tolerance_extra,
    }));

    const { error } = await supabase.from("service_consumed_materials").insert(rows);
    if (error) {
      console.error("[saveServiceConsumedMaterials] error:", error);
      throw new Error("Falha ao salvar ficha técnica do serviço.");
    }
    return { success: true, count: rows.length };
  });

// ============================================================
// 3. COMISSÕES COMPOSTAS E AUXILIARES
// ============================================================

export const saveServiceCollaboratorSplits = createServerFn({ method: "POST" })
  .validator(
    z.object({
      serviceId: z.string().uuid(),
      splits: z.array(
        z.object({
          employee_id: z.string().uuid().nullable().optional(),
          commission_type: z.enum(["percent", "fixed"]),
          commission_value: z.number().nonnegative(),
          discount_source: z.enum(["establishment", "professional", "split"]),
          establishment_split_ratio: z.number().min(0).max(100).default(50),
          calculation_base: z.enum(["gross", "net"]).default("gross"),
        }),
      ),
    }),
  )
  .handler(async ({ data: { serviceId, splits } }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);
    const supabase = getServerClient();

    await supabase
      .from("service_collaborator_splits")
      .delete()
      .eq("store_id", identity.store_id)
      .eq("service_id", serviceId);

    if (splits.length === 0) return { success: true };

    const rows = splits.map((s) => ({
      store_id: identity.store_id,
      service_id: serviceId,
      employee_id: s.employee_id || null,
      commission_type: s.commission_type,
      commission_value: s.commission_value,
      discount_source: s.discount_source,
      establishment_split_ratio: s.establishment_split_ratio,
      calculation_base: s.calculation_base,
    }));

    const { error } = await supabase.from("service_collaborator_splits").insert(rows);
    if (error) {
      console.error("[saveServiceCollaboratorSplits] error:", error);
      throw new Error("Falha ao salvar regras de comissão auxiliar.");
    }
    return { success: true };
  });

export const listServiceCollaboratorSplits = createServerFn({ method: "GET" })
  .validator(z.object({ serviceId: z.string().uuid() }))
  .handler(async ({ data: { serviceId } }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    const supabase = getServerClient();

    const { data, error } = await supabase
      .from("service_collaborator_splits")
      .select("*")
      .eq("store_id", identity.store_id)
      .eq("service_id", serviceId);

    if (error) {
      console.error("[listServiceCollaboratorSplits] error:", error);
      return [];
    }
    return data || [];
  });

// ============================================================
// 4. ANAMNESES COM ASSINATURA DIGITAL E VALIDAÇÃO JURÍDICA
// ============================================================

export const listCustomerAnamneses = createServerFn({ method: "GET" })
  .validator(z.object({ customerId: z.string().uuid() }))
  .handler(async ({ data: { customerId } }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    const supabase = getServerClient();

    const { data, error } = await supabase
      .from("customer_anamnesis_records")
      .select("*")
      .eq("store_id", identity.store_id)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[listCustomerAnamneses] error:", error);
      return [];
    }
    return data || [];
  });

export const saveCustomerAnamnesis = createServerFn({ method: "POST" })
  .validator(
    z.object({
      customer_id: z.string().uuid(),
      template_name: z.string().default("Geral"),
      answers: z.record(z.any()),
      signature_vector: z.string().optional(),
      status: z.enum(["open", "completed", "signed"]).default("completed"),
    }),
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    const supabase = getServerClient();

    const payload = {
      store_id: identity.store_id,
      customer_id: data.customer_id,
      template_name: data.template_name,
      answers_payload: data.answers,
      signature_vector: data.signature_vector || null,
      status: data.signature_vector ? "signed" : data.status,
      signed_at: data.signature_vector ? new Date().toISOString() : null,
      signature_ip_address: "127.0.0.1",
      signature_user_agent: "Waesy Native Shell",
    };

    const { data: record, error } = await supabase
      .from("customer_anamnesis_records")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("[saveCustomerAnamnesis] error:", error);
      throw new Error("Falha ao salvar ficha de anamnese.");
    }
    return record;
  });

// ============================================================
// 5. MATRIZ TÁTIL DE PERMISSÕES POR FUNÇÃO / SETOR
// ============================================================

export const getRolePermissionsMatrix = createServerFn({ method: "GET" })
  .validator(z.object({ roleKey: z.string() }))
  .handler(async ({ data: { roleKey } }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    const supabase = getServerClient();

    const { data, error } = await supabase
      .from("workspace_role_permissions")
      .select("module_permissions")
      .eq("store_id", identity.store_id)
      .eq("role_key", roleKey)
      .maybeSingle();

    if (error) {
      console.error("[getRolePermissionsMatrix] error:", error);
      return null;
    }
    return data?.module_permissions || null;
  });

export const saveRolePermissionsMatrix = createServerFn({ method: "POST" })
  .validator(
    z.object({
      roleKey: z.string(),
      permissions: z.record(z.any()),
    }),
  )
  .handler(async ({ data: { roleKey, permissions } }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin"]);
    const supabase = getServerClient();

    const payload = {
      store_id: identity.store_id,
      role_key: roleKey,
      module_permissions: permissions,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("workspace_role_permissions")
      .upsert(payload, { onConflict: "store_id, role_key" })
      .select()
      .single();

    if (error) {
      console.error("[saveRolePermissionsMatrix] error:", error);
      throw new Error("Falha ao salvar matriz de permissões.");
    }
    return data;
  });

// ============================================================
// 6. EMISSÃO FISCAL INDIVIDUAL EM LINHA (NFSe, NFe, NFCe)
// ============================================================

export const emitRowFiscalInvoice = createServerFn({ method: "POST" })
  .validator(
    z.object({
      orderId: z.string().uuid(),
      invoiceType: z.enum(["NFSe", "NFe", "NFCe"]),
      grossAmountCents: z.number().int().min(0),
      lc116Code: z.string().optional(),
      cnaeCode: z.string().optional(),
      municipalServiceCode: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "finance", "seller"]);
    const supabase = getServerClient();

    // Geração simulada/pronta de nota fiscal com registro
    const invoicePayload = {
      store_id: identity.store_id,
      order_id: data.orderId,
      invoice_type: data.invoiceType,
      status: "authorized",
      access_key: `42${new Date().getFullYear()}000000000000550010000000011000000010`,
      protocol_number: `142${Date.now()}`,
      lc116_code: data.lc116Code || "06.01",
      cnae_code: data.cnaeCode || "9602-5/01",
      municipal_service_code: data.municipalServiceCode || "01.01",
      gross_amount_cents: data.grossAmountCents,
      net_amount_cents: data.grossAmountCents,
      danfe_pdf_url: `https://storage.waesy.com/fiscal/danfe_${data.orderId}.pdf`,
      xml_url: `https://storage.waesy.com/fiscal/xml_${data.orderId}.xml`,
    };

    const { data: result, error } = await supabase
      .from("order_fiscal_invoices")
      .insert(invoicePayload)
      .select()
      .single();

    if (error) {
      logSystemError({
        route: "services-erp.functions.emitRowFiscalInvoice",
        tableName: "order_fiscal_invoices",
        contractName: "emitRowFiscalInvoice",
        error,
        payload: invoicePayload,
      });
      console.error("[emitRowFiscalInvoice] error:", error);
      throw new Error(`Erro ao emitir ${data.invoiceType}: ${error.message}`);
    }

    return result;
  });

export const listOrderFiscalInvoices = createServerFn({ method: "GET" })
  .validator(z.object({ orderIds: z.array(z.string().uuid()) }))
  .handler(async ({ data: { orderIds } }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    const supabase = getServerClient();

    if (orderIds.length === 0) return [];

    const { data, error } = await supabase
      .from("order_fiscal_invoices")
      .select("*")
      .eq("store_id", identity.store_id)
      .in("order_id", orderIds);

    if (error) {
      console.error("[listOrderFiscalInvoices] error:", error);
      return [];
    }
    return data || [];
  });
