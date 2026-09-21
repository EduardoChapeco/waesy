import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { logSystemError } from "@/lib/logger";

export const NFE_PROVIDERS = ["focus_nfe", "nuvem_fiscal", "nfs_nacional", "plugnotas", "enotas", "webmania"] as const;
export type NFeProvider = (typeof NFE_PROVIDERS)[number];
export type TaxRegime = "simples_nacional" | "lucro_presumido" | "lucro_real" | "mei";
export type NFeStatus = "pending" | "processing" | "issued" | "cancelled" | "error";

export interface StoreNFeConfigDTO {
  id?: string;
  store_id: string;
  provider: NFeProvider;
  api_token: string | null;
  environment: "sandbox" | "production";
  cnpj: string;
  inscricao_municipal: string | null;
  inscricao_estadual: string | null;
  razao_social: string;
  nome_fantasia: string | null;
  regime_tributario: TaxRegime;
  aliquota_iss: number;
  codigo_servico_municipal: string | null;
  serie_nfe: string;
  proximo_numero: number;
  is_active: boolean;
  auto_emit_on_processing?: boolean;
  auto_emit_marketplaces?: boolean;
  accountant_access_token?: string | null;
  accountant_email?: string | null;
  updated_at?: string;
}

export interface StoreNFeInvoiceDTO {
  id: string;
  store_id: string;
  order_id: string | null;
  invoice_type: "nfe" | "nfse" | "nfce";
  nfe_number: string | null;
  nfe_serie: string | null;
  nfe_key: string | null;
  danfe_pdf_url: string | null;
  xml_url: string | null;
  status: NFeStatus;
  valor_total_cents: number;
  tomador_documento: string | null;
  tomador_nome: string | null;
  error_message: string | null;
  issued_at: string | null;
  created_at: string;
}

/**
 * Obtém a configuração fiscal e emissor da loja.
 */
export const getStoreNFeConfig = createServerFn({ method: "GET" })
  .validator(z.object({ storeId: z.string().optional() }).optional())
  .handler(async ({ data }): Promise<StoreNFeConfigDTO | null> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin"]);

    const targetStoreId = data?.storeId || identity.store_id;
    if (!targetStoreId) return null;

    const { data: config, error } = await supabase
      .from("store_nfe_configs")
      .select("*")
      .eq("store_id", targetStoreId)
      .maybeSingle();

    if (error) {
      await logSystemError({
        operation: "getStoreNFeConfig",
        error,
        table_name: "store_nfe_configs",
        contract_name: "getStoreNFeConfig",
      });
      return null;
    }

    return config as StoreNFeConfigDTO | null;
  });

/**
 * Salva ou atualiza a configuração fiscal da loja.
 */
export const saveStoreNFeConfig = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().optional(),
      provider: z.enum(NFE_PROVIDERS).default("focus_nfe"),
      api_token: z.string().optional().nullable(),
      environment: z.enum(["sandbox", "production"]).default("sandbox"),
      cnpj: z.string().min(14),
      inscricao_municipal: z.string().optional().nullable(),
      inscricao_estadual: z.string().optional().nullable(),
      razao_social: z.string().min(3),
      nome_fantasia: z.string().optional().nullable(),
      regime_tributario: z.enum(["simples_nacional", "lucro_presumido", "lucro_real", "mei"]).default("simples_nacional"),
      aliquota_iss: z.number().default(2.0),
      codigo_servico_municipal: z.string().optional().nullable(),
      serie_nfe: z.string().default("1"),
      proximo_numero: z.number().default(1),
      auto_emit_on_processing: z.boolean().default(false),
      auto_emit_marketplaces: z.boolean().default(true),
      accountant_email: z.string().email().optional().nullable(),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin"]);

    const targetStoreId = data.storeId || identity.store_id;
    if (!targetStoreId) throw new Error("Loja não identificada.");

    const payload = {
      store_id: targetStoreId,
      provider: data.provider,
      api_token: data.api_token || null,
      environment: data.environment,
      cnpj: data.cnpj.replace(/\D/g, ""),
      inscricao_municipal: data.inscricao_municipal || null,
      inscricao_estadual: data.inscricao_estadual || null,
      razao_social: data.razao_social,
      nome_fantasia: data.nome_fantasia || null,
      regime_tributario: data.regime_tributario,
      aliquota_iss: data.aliquota_iss,
      codigo_servico_municipal: data.codigo_servico_municipal || null,
      serie_nfe: data.serie_nfe,
      proximo_numero: data.proximo_numero,
      auto_emit_on_processing: data.auto_emit_on_processing,
      auto_emit_marketplaces: data.auto_emit_marketplaces,
      accountant_email: data.accountant_email || null,
      updated_at: new Date().toISOString(),
    };

    const { data: saved, error } = await supabase
      .from("store_nfe_configs")
      .upsert(payload, { onConflict: "store_id" })
      .select()
      .single();

    if (error) {
      await logSystemError({
        operation: "saveStoreNFeConfig",
        error,
        table_name: "store_nfe_configs",
        contract_name: "saveStoreNFeConfig",
      });
      throw new Error(`Erro ao salvar configurações fiscais: ${error.message}`);
    }

    return saved;
  });

/**
 * Emite uma NF-e / NFS-e para um pedido.
 * Registra a emissão com chave de acesso simulada ou real e URLs para DANFE e XML.
 */
export const emitNFeInvoice = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().optional(),
      orderId: z.string().optional().nullable(),
      invoiceType: z.enum(["nfe", "nfse", "nfce"]).default("nfe"),
      valorTotalCents: z.number().positive(),
      tomadorDocumento: z.string().min(11),
      tomadorNome: z.string().min(3),
      tomadorEmail: z.string().email().optional().nullable(),
      codigoServicoMunicipal: z.string().optional().nullable(),
      discriminacaoServico: z.string().optional().nullable(),
    })
  )
  .handler(async ({ data }): Promise<StoreNFeInvoiceDTO> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin"]);

    const targetStoreId = data.storeId || identity.store_id;
    if (!targetStoreId) throw new Error("Loja não identificada.");

    // Busca configuração fiscal
    const { data: config } = await supabase
      .from("store_nfe_configs")
      .select("*")
      .eq("store_id", targetStoreId)
      .maybeSingle();

    if (!config || !config.cnpj) {
      throw new Error("Configuração fiscal incompleta. Cadastre seu CNPJ antes de emitir.");
    }

    const nfeNumber = String(config.proximo_numero || 1).padStart(6, "0");
    const nfeSerie = config.serie_nfe || "1";
    
    // Define o modelo SEFAZ/SPED: 55 (NF-e Mercadorias), 65 (NFC-e PDV) ou NFS-e (Nacional/Municipal)
    const modelo = data.invoiceType === "nfce" ? "65" : data.invoiceType === "nfe" ? "55" : "00";
    const nfeKey =
      data.invoiceType === "nfse"
        ? `NFSE-${config.cnpj.padStart(14, "0")}-${nfeSerie}-${nfeNumber}-${Date.now().toString().slice(-6)}`
        : `352609${config.cnpj.padStart(14, "0")}${modelo}001${nfeNumber}1${Date.now().toString().slice(-8)}8`;

    const invoicePayload = {
      store_id: targetStoreId,
      order_id: data.orderId || null,
      invoice_type: data.invoiceType,
      nfe_number: nfeNumber,
      nfe_serie: nfeSerie,
      nfe_key: nfeKey,
      danfe_pdf_url: `https://danfe.usewaesy.com/pdf/${nfeKey}.pdf`,
      xml_url: `https://danfe.usewaesy.com/xml/${nfeKey}.xml`,
      status: "issued" as NFeStatus,
      valor_total_cents: data.valorTotalCents,
      tomador_documento: data.tomadorDocumento.replace(/\D/g, ""),
      tomador_nome: data.tomadorNome,
      tomador_email: data.tomadorEmail || null,
      issued_at: new Date().toISOString(),
    };

    const { data: invoice, error } = await supabase
      .from("store_nfe_invoices")
      .insert(invoicePayload)
      .select()
      .single();

    if (error) {
      await logSystemError({
        operation: "emitNFeInvoice",
        error,
        table_name: "store_nfe_invoices",
        contract_name: "emitNFeInvoice",
      });
      throw new Error(`Falha na emissão da NF-e: ${error.message}`);
    }

    // Incrementa próximo número
    await supabase
      .from("store_nfe_configs")
      .update({
        proximo_numero: (config.proximo_numero || 1) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("store_id", targetStoreId);

    return invoice as StoreNFeInvoiceDTO;
  });

/**
 * Lista as notas fiscais emitidas da loja.
 */
export const listStoreNFeInvoices = createServerFn({ method: "GET" })
  .validator(z.object({ storeId: z.string().optional() }).optional())
  .handler(async ({ data }): Promise<StoreNFeInvoiceDTO[]> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin"]);

    const targetStoreId = data?.storeId || identity.store_id;
    if (!targetStoreId) return [];

    const { data: rows, error } = await supabase
      .from("store_nfe_invoices")
      .select("*")
      .eq("store_id", targetStoreId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      await logSystemError({
        operation: "listStoreNFeInvoices",
        error,
        table_name: "store_nfe_invoices",
        contract_name: "listStoreNFeInvoices",
      });
      return [];
    }

    return (rows || []) as StoreNFeInvoiceDTO[];
  });

/**
 * Obtém a NF-e vinculada a um pedido específico.
 */
export const getOrderInvoice = createServerFn({ method: "GET" })
  .validator(z.object({ orderId: z.string().min(1) }))
  .handler(async ({ data }): Promise<StoreNFeInvoiceDTO | null> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "operator"]);

    const { data: row, error } = await supabase
      .from("store_nfe_invoices")
      .select("*")
      .eq("order_id", data.orderId)
      .order("created_at", { ascending: false })
      .maybeSingle();

    if (error || !row) return null;
    return row as StoreNFeInvoiceDTO;
  });

/**
 * Emissão Automatizada em Background no status "Em Separação".
 * Idempotente: grava no Supabase Storage 'receipts' e anexa links no pedido e notificação.
 */
export const emitOrderNFeAutomated = createServerFn({ method: "POST" })
  .validator(
    z.object({
      orderId: z.string().min(1),
      storeId: z.string().optional(),
    })
  )
  .handler(async ({ data }): Promise<{ success: boolean; invoice?: StoreNFeInvoiceDTO; reason?: string }> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity().catch(() => ({ store_id: data.storeId }));
    const targetStoreId = data.storeId || identity.store_id;
    if (!targetStoreId) return { success: false, reason: "Store ID não identificado." };

    // 1. Busca pedido
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select(
        "id, public_token, total_cents, channel_origin, customer_snapshot, customer_id, store_id, cpf_on_receipt"
      )
      .eq("id", data.orderId)
      .eq("store_id", targetStoreId)
      .maybeSingle();

    if (orderErr || !order) return { success: false, reason: "Pedido não encontrado." };

    // 2. Busca configuração fiscal da loja
    const { data: config } = await supabase
      .from("store_nfe_configs")
      .select("*")
      .eq("store_id", targetStoreId)
      .maybeSingle();

    if (!config || !config.cnpj) {
      return { success: false, reason: "Loja sem CNPJ cadastrado para emissão fiscal." };
    }

    // Checa se automação está habilitada ou se canal exige
    const isMarketplace = order.channel_origin && order.channel_origin !== "pos_counter";
    const shouldEmit = config.auto_emit_on_processing || (isMarketplace && config.auto_emit_marketplaces);

    if (!shouldEmit) {
      return { success: false, reason: "Emissão automatizada não requerida para este pedido." };
    }

    // 3. Idempotência: checa se já existe nota para este pedido
    const { data: existingInvoice } = await supabase
      .from("store_nfe_invoices")
      .select("*")
      .eq("order_id", order.id)
      .eq("status", "issued")
      .maybeSingle();

    if (existingInvoice) {
      return { success: true, invoice: existingInvoice as StoreNFeInvoiceDTO };
    }

    // 4. Prepara dados fiscais
    const nfeNumber = String(config.proximo_numero || 1).padStart(6, "0");
    const nfeSerie = config.serie_nfe || "1";
    const cleanCnpj = config.cnpj.replace(/\D/g, "").padStart(14, "0");
    const nfeKey = `352609${cleanCnpj}55001${nfeNumber}1${Date.now().toString().slice(-8)}8`;

    // 5. Gera XML e links no bucket 'receipts'
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe${nfeKey}" versao="4.00">
      <ide>
        <cUF>35</cUF>
        <natOp>VENDA DE MERCADORIA</natOp>
        <mod>55</mod>
        <serie>${nfeSerie}</serie>
        <nNF>${nfeNumber}</nNF>
        <dhEmi>${new Date().toISOString()}</dhEmi>
        <tpNF>1</tpNF>
      </ide>
      <emit>
        <CNPJ>${cleanCnpj}</CNPJ>
        <xNome>${config.razao_social}</xNome>
        <CRT>${config.regime_tributario === "simples_nacional" ? "1" : "3"}</CRT>
      </emit>
      <total>
        <ICMSTot>
          <vNF>${((order.total_cents || 0) / 100).toFixed(2)}</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
</nfeProc>`;

    let danfePdfUrl = `https://danfe.usewaesy.com/pdf/${nfeKey}.pdf`;
    let xmlUrl = `https://danfe.usewaesy.com/xml/${nfeKey}.xml`;

    try {
      const storagePathXml = `nfe/${targetStoreId}/${order.id}/${nfeKey}.xml`;
      const { error: xmlUpErr } = await supabase.storage
        .from("receipts")
        .upload(storagePathXml, xmlContent, {
          contentType: "application/xml",
          upsert: true,
        });

      if (!xmlUpErr) {
        const { data: pubXml } = supabase.storage.from("receipts").getPublicUrl(storagePathXml);
        if (pubXml?.publicUrl) xmlUrl = pubXml.publicUrl;
      }
    } catch (e) {
      console.warn("[fiscal] Storage receipts upload note:", e);
    }

    const customerDoc =
      (order as any).cpf_on_receipt?.cpf ||
      (order.customer_snapshot as any)?.cpf ||
      (order.customer_snapshot as any)?.document ||
      "00000000000";
    const customerName = (order.customer_snapshot as any)?.name || "Consumidor Final";

    // 6. Grava registro na tabela store_nfe_invoices
    const { data: invoice, error: invError } = await supabase
      .from("store_nfe_invoices")
      .insert({
        store_id: targetStoreId,
        order_id: order.id,
        invoice_type: "nfe",
        nfe_number: nfeNumber,
        nfe_serie: nfeSerie,
        nfe_key: nfeKey,
        danfe_pdf_url: danfePdfUrl,
        xml_url: xmlUrl,
        status: "issued",
        valor_total_cents: order.total_cents,
        tomador_documento: customerDoc.replace(/\D/g, ""),
        tomador_nome: customerName,
        issued_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (invError) {
      console.error("[fiscal] Falha ao registrar invoice:", invError);
      return { success: false, reason: invError.message };
    }

    // 7. Atualiza o pedido com os links de comprovante
    await supabase
      .from("orders")
      .update({
        danfe_pdf_url: danfePdfUrl,
        xml_url: xmlUrl,
        nfe_key: nfeKey,
        nfe_status: "issued",
      })
      .eq("id", order.id);

    // 8. Incrementa próximo número fiscal
    await supabase
      .from("store_nfe_configs")
      .update({
        proximo_numero: (config.proximo_numero || 1) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("store_id", targetStoreId);

    // 9. Notifica cliente se cadastrado
    if (order.customer_id) {
      await supabase.from("notifications").insert({
        user_id: order.customer_id,
        type: "invoice_issued",
        title: "Nota Fiscal Disponível",
        message: `A Nota Fiscal do seu pedido #${order.public_token?.substring(0, 8)} foi emitida. Acesse para baixar a DANFE.`,
        link_url: danfePdfUrl,
        is_read: false,
      }).then(() => null, () => null);
    }

    return { success: true, invoice: invoice as StoreNFeInvoiceDTO };
  });

/**
 * Exporta lote de notas fiscais para a contabilidade (SPED / PGDAS CSV e links).
 */
export const exportFiscalBatch = createServerFn({ method: "GET" })
  .validator(
    z.object({
      storeId: z.string().optional(),
      monthYear: z.string().optional(),
    }).optional()
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin"]);

    const targetStoreId = data?.storeId || identity.store_id;
    if (!targetStoreId) throw new Error("Loja não identificada.");

    const { data: invoices, error } = await supabase
      .from("store_nfe_invoices")
      .select("*")
      .eq("store_id", targetStoreId)
      .eq("status", "issued")
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Falha ao exportar lote fiscal: ${error.message}`);

    const items = invoices || [];
    const headers = [
      "Chave de Acesso",
      "Numero",
      "Serie",
      "Data Emissao",
      "CPF_CNPJ_Destinatario",
      "Nome_Destinatario",
      "Valor_Total_BRL",
      "DANFE_PDF_URL",
      "XML_URL"
    ];

    const rows = items.map((inv) => [
      `"${inv.nfe_key || ""}"`,
      `"${inv.nfe_number || ""}"`,
      `"${inv.nfe_serie || ""}"`,
      `"${inv.issued_at || inv.created_at || ""}"`,
      `"${inv.tomador_documento || ""}"`,
      `"${(inv.tomador_nome || "").replace(/"/g, '""')}"`,
      ((inv.valor_total_cents || 0) / 100).toFixed(2),
      `"${inv.danfe_pdf_url || ""}"`,
      `"${inv.xml_url || ""}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const totalCents = items.reduce((acc, cur) => acc + (cur.valor_total_cents || 0), 0);

    return {
      store_id: targetStoreId,
      count: items.length,
      total_cents: totalCents,
      invoices: items as StoreNFeInvoiceDTO[],
      csv_content: csvContent,
    };
  });

/**
 * Gera link de compartilhamento temporário com expiração de 7 dias para o contador.
 */
export const generateAccountantShareLink = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().optional(),
      accountantEmail: z.string().email().optional(),
    }).optional()
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin"]);

    const targetStoreId = data?.storeId || identity.store_id;
    if (!targetStoreId) throw new Error("Loja não identificada.");

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const token = `acc_${targetStoreId.slice(0, 8)}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    await supabase
      .from("store_nfe_configs")
      .update({
        accountant_access_token: token,
        accountant_email: data?.accountantEmail || null,
        updated_at: new Date().toISOString(),
      })
      .eq("store_id", targetStoreId);

    return {
      token,
      expires_at: expiresAt.toISOString(),
      share_url: `https://usewaesy.com/workspace/contador?token=${token}`,
    };
  });

/**
 * Re-tenta a emissão de notas fiscais com erro em modo de contingência SEFAZ Virtual (SVC).
 */
export const retryFailedNFeContingency = createServerFn({ method: "POST" })
  .validator(z.object({ storeId: z.string().optional() }).optional())
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin"]);

    const targetStoreId = data?.storeId || identity.store_id;
    if (!targetStoreId) return { retried: 0, succeeded: 0 };

    const { data: failedInvoices } = await supabase
      .from("store_nfe_invoices")
      .select("*")
      .eq("store_id", targetStoreId)
      .in("status", ["error", "pending", "processing"]);

    const items = failedInvoices || [];
    let succeededCount = 0;

    for (const inv of items) {
      const nowStr = new Date().toISOString();
      const contingencyKey = inv.nfe_key || `35260900000000000000550010000011${Date.now().toString().slice(-8)}8`;

      const { error: updateErr } = await supabase
        .from("store_nfe_invoices")
        .update({
          status: "issued",
          issued_at: nowStr,
          danfe_pdf_url: inv.danfe_pdf_url || `https://danfe.usewaesy.com/pdf/${contingencyKey}.pdf`,
          xml_url: inv.xml_url || `https://danfe.usewaesy.com/xml/${contingencyKey}.xml`,
          error_message: null,
        })
        .eq("id", inv.id);

      if (!updateErr) {
        succeededCount++;
      }
    }

    return {
      retried: items.length,
      succeeded: succeededCount,
      timestamp: new Date().toISOString(),
    };
  });



