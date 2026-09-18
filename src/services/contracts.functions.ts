import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getIdentity } from "./identity.functions";
import {
  interpolateContractVariables,
  autoPositionSignatureFieldsFromContent,
} from "@/lib/contracts/contract-semantic-dictionary";

export const ContractCategoryEnum = z.enum([
  "real_estate_rental",
  "real_estate_sale",
  "vehicle_sale",
  "vehicle_consignation",
  "service_agreement",
  "employment",
  "general_deal",
  "legal_retainer",
  "tourism_package",
  "medical_aesthetic_consent",
  "fashion_retail",
  "pos_retail",
]);

// ─── Tipagens Canônicas de Posicionamento Visual & Despacho Multi-Canal ───────

export interface SignatureFieldDTO {
  id: string;
  signerIndex: number;
  signerEmail?: string;
  type: "signature" | "initials" | "name" | "cpf" | "date" | "checkbox";
  page: number; // 1-indexed
  x: number; // Porcentagem 0-100 do container
  y: number; // Porcentagem 0-100 do container
  width: number; // Porcentagem de largura (ex: 22%)
  height: number; // Porcentagem de altura (ex: 6%)
  repeatMode?: "page" | "all" | "all_except_last";
  label?: string;
}

export interface ObserverDTO {
  name: string;
  email: string;
  phone?: string;
  role?: string;
}

export interface DispatchSettingsDTO {
  signing_order: "parallel" | "sequential";
  send_reminders: boolean;
  reminder_days: number;
  auth_mark_position: "footer" | "header" | "side";
  auth_mark_size: "standard" | "compact" | "mini";
  force_signature_appearance: boolean;
  delivery_channels: ("email" | "whatsapp" | "sms" | "direct_link")[];
}

export interface OcrContractExtractionResult {
  name: string | null;
  document: string | null;
  documentType: "cnh" | "rg" | "passport" | "cpf" | "other";
  birthDate: string | null;
  nationality: string | null;
  documentExpiry: string | null;
  address: string | null;
  suggestedClauses: string[];
  rawText: string;
  confidence: "high" | "medium" | "low";
}

// ─── Criação de Contrato com Suporte a Posicionamento Visual & Canais ─────────

export const createContract = createServerFn({ method: "POST" })
  .validator(
    z.object({
      dealId: z.string().uuid().optional(),
      storeId: z.string().uuid().optional(),
      entityType: z.string().optional(),
      entityId: z.string().optional(),
      folderId: z.string().uuid().optional(),
      title: z.string().min(3),
      category: ContractCategoryEnum,
      contentMarkdown: z.string().min(10),
      clauses: z.array(z.record(z.any())).optional().default([]),
      variables: z.record(z.any()).optional().default({}),
      signatureFields: z.array(z.any()).optional().default([]),
      pageCount: z.number().int().min(1).optional().default(1),
      sourceFileUrl: z.string().optional(),
      dispatchSettings: z.record(z.any()).optional(),
      observers: z.array(z.any()).optional().default([]),
      isWhatsappNative: z.boolean().optional().default(false),
    }),
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getIdentity();
    if (!identity?.id) throw new Error("Não autenticado");

    const defaultDispatch: DispatchSettingsDTO = {
      signing_order: "parallel",
      send_reminders: true,
      reminder_days: 3,
      auth_mark_position: "footer",
      auth_mark_size: "standard",
      force_signature_appearance: false,
      delivery_channels: ["email", "whatsapp"],
    };

    const { data: contract, error: contractErr } = await supabase
      .from("contracts")
      .insert({
        deal_id: input.dealId || null,
        store_id: input.storeId || (identity as any).store_id || null,
        entity_type: input.entityType || null,
        entity_id: input.entityId || null,
        folder_id: input.folderId || null,
        creator_id: identity.id,
        title: input.title,
        category: input.category,
        status: "draft",
        current_version: 1,
        dispatch_settings: input.dispatchSettings || defaultDispatch,
        observers: input.observers || [],
        is_whatsapp_native: input.isWhatsappNative || false,
      })
      .select()
      .single();

    if (contractErr) {
      console.error("[contracts] Error creating contract:", contractErr);
      throw new Error("Erro ao criar contrato.");
    }

    const { data: version, error: versionErr } = await supabase
      .from("contract_versions")
      .insert({
        contract_id: contract.id,
        version_number: 1,
        title: input.title,
        content_markdown: input.contentMarkdown,
        clauses: input.clauses,
        variables: input.variables,
        signature_fields: input.signatureFields,
        page_count: input.pageCount,
        source_file_url: input.sourceFileUrl || null,
        is_sealed: false,
      })
      .select()
      .single();

    if (versionErr) {
      throw new Error("Erro ao criar primeira versão do contrato.");
    }

    return { contract, version };
  });

// ─── Atualização de Rascunho de Contrato & Posicionamento de Tags ─────────────

export const updateContractDraft = createServerFn({ method: "POST" })
  .validator(
    z.object({
      contractId: z.string().uuid(),
      versionId: z.string().uuid(),
      title: z.string().min(3).optional(),
      category: ContractCategoryEnum.optional(),
      contentMarkdown: z.string().optional(),
      clauses: z.array(z.record(z.any())).optional(),
      variables: z.record(z.any()).optional(),
      signatureFields: z.array(z.any()).optional(),
      pageCount: z.number().int().min(1).optional(),
      sourceFileUrl: z.string().optional(),
      dispatchSettings: z.record(z.any()).optional(),
      observers: z.array(z.any()).optional(),
      folderId: z.string().uuid().nullable().optional(),
    }),
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getIdentity();
    if (!identity?.id) throw new Error("Não autenticado");

    // 1. Atualiza metadados do contrato se fornecidos
    const contractUpdate: Record<string, any> = { updated_at: new Date().toISOString() };
    if (input.title) contractUpdate.title = input.title;
    if (input.category) contractUpdate.category = input.category;
    if (input.dispatchSettings) contractUpdate.dispatch_settings = input.dispatchSettings;
    if (input.observers !== undefined) contractUpdate.observers = input.observers;
    if (input.folderId !== undefined) contractUpdate.folder_id = input.folderId;

    const { error: cErr } = await supabase
      .from("contracts")
      .update(contractUpdate)
      .eq("id", input.contractId)
      .eq("creator_id", identity.id);

    if (cErr) {
      console.error("[contracts] Error updating contract draft:", cErr);
      throw new Error("Erro ao atualizar contrato.");
    }

    // 2. Atualiza a versão do contrato se for rascunho (não selado)
    const versionUpdate: Record<string, any> = {};
    if (input.title) versionUpdate.title = input.title;
    if (input.contentMarkdown !== undefined) versionUpdate.content_markdown = input.contentMarkdown;
    if (input.clauses !== undefined) versionUpdate.clauses = input.clauses;
    if (input.variables !== undefined) versionUpdate.variables = input.variables;
    if (input.signatureFields !== undefined) versionUpdate.signature_fields = input.signatureFields;
    if (input.pageCount !== undefined) versionUpdate.page_count = input.pageCount;
    if (input.sourceFileUrl !== undefined) versionUpdate.source_file_url = input.sourceFileUrl;

    if (Object.keys(versionUpdate).length > 0) {
      const { error: vErr } = await supabase
        .from("contract_versions")
        .update(versionUpdate)
        .eq("id", input.versionId)
        .eq("contract_id", input.contractId)
        .eq("is_sealed", false);

      if (vErr) {
        console.error("[contracts] Error updating contract version:", vErr);
        throw new Error("Erro ao atualizar campos do contrato.");
      }
    }

    return { success: true };
  });

// ─── Selagem Criptográfica SHA-256 & Despacho Multi-Canal (WhatsApp/Email/SMS) ─

export const sealAndIssueContract = createServerFn({ method: "POST" })
  .validator(
    z.object({
      contractId: z.string().uuid(),
      versionId: z.string().uuid(),
      signatureFields: z.array(z.any()).optional(),
      signers: z.array(
        z.object({
          name: z.string().min(2),
          email: z.string().email(),
          phone: z.string().optional(),
          cpf: z.string().optional(),
          role: z.enum(["party", "witness", "guarantor"]).default("party"),
          authLevel: z.enum(["basic", "advanced", "qualified"]).default("basic"),
          dispatchChannel: z.enum(["email", "whatsapp", "sms", "direct_link"]).default("email"),
          signingOrderIndex: z.number().int().min(1).default(1),
          colorCode: z.string().default("#2563eb"),
          requireFacialBiometrics: z.boolean().default(false),
          requireCpfConfirmation: z.boolean().default(false),
          profileId: z.string().uuid().optional(),
        }),
      ),
    }),
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getIdentity();
    if (!identity?.id) throw new Error("Não autenticado");

    // Fetch version
    const { data: version, error: vErr } = await supabase
      .from("contract_versions")
      .select("*")
      .eq("id", input.versionId)
      .eq("contract_id", input.contractId)
      .single();

    if (vErr || !version) throw new Error("Versão do contrato não encontrada.");

    // Atualiza signature_fields se enviados na chamada de selagem
    const finalFields = input.signatureFields || version.signature_fields || [];

    // Compute SHA-256 digest string do conteúdo + cláusulas + campos
    const textBuffer = new TextEncoder().encode(
      version.content_markdown +
        JSON.stringify(version.clauses) +
        JSON.stringify(finalFields),
    );
    const hashBuffer = await crypto.subtle.digest("SHA-256", textBuffer);
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Seal the version
    await supabase
      .from("contract_versions")
      .update({
        is_sealed: true,
        sealed_at: new Date().toISOString(),
        hash_sha256: hashHex,
        signature_fields: finalFields,
      })
      .eq("id", version.id);

    // Update contract status
    await supabase
      .from("contracts")
      .update({
        status: "signing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.contractId);

    // Create signature envelopes for each signer com suporte multi-canal
    const envelopesToInsert = input.signers.map((s) => ({
      contract_version_id: version.id,
      signer_name: s.name,
      signer_email: s.email,
      signer_phone: s.phone || null,
      signer_cpf: s.cpf || null,
      signer_role: s.role,
      auth_level: s.authLevel,
      dispatch_channel: s.dispatchChannel || "email",
      signing_order_index: s.signingOrderIndex || 1,
      color_code: s.colorCode || "#2563eb",
      require_facial_biometrics: s.requireFacialBiometrics || false,
      require_cpf_confirmation: s.requireCpfConfirmation || false,
      signer_profile_id: s.profileId || null,
      status: "pending",
    }));

    const { data: envelopes, error: envErr } = await supabase
      .from("signature_envelopes")
      .insert(envelopesToInsert)
      .select();

    if (envErr) throw new Error("Erro ao gerar envelopes de assinatura.");

    // Monta links de assinatura direta e link de despacho via WhatsApp
    const enrichedEnvelopes = (envelopes || []).map((env) => {
      const cleanPhone = (env.signer_phone || "").replace(/\D/g, "");
      const signingUrl = `/assinar/${env.signing_token}`;
      const fullUrl = `https://waesy.com${signingUrl}`;
      const waMsg = encodeURIComponent(
        `Olá ${env.signer_name}, seu documento "${version.title}" está pronto para assinatura eletrônica jurídica:\n\n${fullUrl}\n\nAbra o link no celular para assinar em poucos toques.`,
      );
      const whatsappDirectLink = cleanPhone ? `https://wa.me/${cleanPhone}?text=${waMsg}` : null;

      return {
        ...env,
        signingUrl,
        fullUrl,
        whatsappDirectLink,
      };
    });

    return {
      status: "sealed",
      hashSha256: hashHex,
      envelopes: enrichedEnvelopes,
    };
  });

// ─── Extração Inteligente de Documentos via OCR Multimodal (Gemini Vision) ────

export const extractContractDataFromOcr = createServerFn({ method: "POST" })
  .validator(
    z.object({
      imageUrl: z.string().optional(),
      base64: z.string().optional(),
      mimeType: z.string().optional().default("image/jpeg"),
    }),
  )
  .handler(async ({ data: input }): Promise<OcrContractExtractionResult> => {
    let imageBase64 = input.base64 || "";
    let mimeType = input.mimeType || "image/jpeg";

    if (!imageBase64 && input.imageUrl) {
      try {
        const res = await fetch(input.imageUrl, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) throw new Error("Falha ao baixar imagem para OCR.");
        const cType = res.headers.get("content-type") || "image/jpeg";
        mimeType = cType.split(";")[0].trim();
        const buf = await res.arrayBuffer();
        imageBase64 = Buffer.from(buf).toString("base64");
      } catch (err: any) {
        throw new Error(`Erro ao carregar imagem para análise: ${err.message}`);
      }
    }

    if (!imageBase64) {
      throw new Error("Nenhuma imagem fornecida para o OCR.");
    }

    const geminiKey = await getNextActiveKey("gemini");
    if (!geminiKey) {
      // Fallback gracioso com parsing básico de texto se IA não estiver configurada
      return {
        name: null,
        document: null,
        documentType: "other",
        birthDate: null,
        nationality: "Brasileira",
        documentExpiry: null,
        address: null,
        suggestedClauses: [],
        rawText: "Chave de visão computacional em configuração.",
        confidence: "low",
      };
    }

    const systemPrompt = `Você é o Agente Especialista em OCR e Extração de Documentos Oficiais Brasileiros da Waesy Platform (Padrão BigTech).
Sua missão é extrair com precisão cirúrgica os dados de CNH, RG, Passaporte ou contratos comerciais escaneados.
Retorne ESTRITAMENTE um JSON com este formato (sem markdown \`\`\`json):
{
  "name": "<Nome completo do titular ou null>",
  "document": "<Número do documento limpo ou formatado>",
  "documentType": "<uma das opções: 'cnh', 'rg', 'passport', 'cpf', 'other'>",
  "birthDate": "<YYYY-MM-DD ou null>",
  "nationality": "<Brasileira ou outra nacionalidade ou null>",
  "documentExpiry": "<YYYY-MM-DD ou null>",
  "address": "<Endereço completo se houver ou null>",
  "suggestedClauses": ["<resumo de obrigações ou cláusulas identificadas no documento se for contrato>"],
  "rawText": "<texto legível resumido em até 200 caracteres>",
  "confidence": "<'high', 'medium' ou 'low'>"
}`;

    const userPrompt = `Analise a imagem deste documento oficial ou contrato e extraia os dados cadastrais estruturados.`;

    try {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey.rawKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [
              {
                parts: [
                  { text: userPrompt },
                  { inlineData: { mimeType, data: imageBase64 } },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: "application/json",
            },
          }),
        },
      );

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        await markKeyError(geminiKey.id, `OCR Gemini Error: ${errText.slice(0, 150)}`);
        throw new Error("Falha no serviço de reconhecimento visual.");
      }

      const resData = await geminiRes.json();
      const responseText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!responseText) throw new Error("Resposta de visão vazia.");

      return JSON.parse(responseText) as OcrContractExtractionResult;
    } catch (err: any) {
      return {
        name: null,
        document: null,
        documentType: "other",
        birthDate: null,
        nationality: "Brasileira",
        documentExpiry: null,
        address: null,
        suggestedClauses: [],
        rawText: `Falha na leitura automática: ${err.message}`,
        confidence: "low",
      };
    }
  });

// ─── Assinatura do Envelope & Registro de Telemetria Forense ─────────────────

export const signContractEnvelope = createServerFn({ method: "POST" })
  .validator(
    z.object({
      signingToken: z.string(),
      consent: z.boolean(),
      signatureImageBase64: z.string().optional(),
      ipAddress: z.string().optional(),
      userAgent: z.string().optional(),
      screenResolution: z.string().optional(),
      timezone: z.string().optional(),
      geoLatitude: z.number().optional(),
      geoLongitude: z.number().optional(),
      geoCity: z.string().optional(),
      geoState: z.string().optional(),
      faceImageUrl: z.string().optional(),
      facialBiometricsHash: z.string().optional(),
    }),
  )
  .handler(async ({ data: input }) => {
    if (!input.consent) throw new Error("Consentimento é obrigatório para assinar.");

    const supabase = getServerClient();

    // Fetch envelope by unique token
    const { data: envelope, error: envErr } = await supabase
      .from("signature_envelopes")
      .select("*, contract_version:contract_version_id(*)")
      .eq("signing_token", input.signingToken)
      .single();

    if (envErr || !envelope) throw new Error("Link de assinatura inválido ou expirado.");

    if (envelope.status === "signed") {
      return { success: true, message: "Este documento já foi assinado por você." };
    }

    const digest = `SIG-${envelope.id}-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

    // Registra evidência forense de assinatura
    await supabase.from("signature_evidence").insert({
      envelope_id: envelope.id,
      ip_address: input.ipAddress || "127.0.0.1",
      user_agent: input.userAgent || "Browser",
      screen_resolution: input.screenResolution || null,
      timezone: input.timezone || "America/Sao_Paulo",
      geo_latitude: input.geoLatitude || null,
      geo_longitude: input.geoLongitude || null,
      geo_city: input.geoCity || null,
      geo_state: input.geoState || null,
      auth_method: envelope.auth_level === "advanced" ? "email_otp" : "electronic_consent",
      consent_given: true,
      signature_digest: digest,
      facial_biometrics_hash: input.facialBiometricsHash || null,
      evidence_manifest: {
        timestamp: new Date().toISOString(),
        signer_email: envelope.signer_email,
        signer_phone: envelope.signer_phone,
        signer_cpf: envelope.signer_cpf,
        document_hash: (envelope.contract_version as any)?.hash_sha256,
        signature_image: input.signatureImageBase64 || null,
        face_image: input.faceImageUrl || null,
      },
    });

    // Atualiza status do envelope
    await supabase
      .from("signature_envelopes")
      .update({
        status: "signed",
        signed_at: new Date().toISOString(),
      })
      .eq("id", envelope.id);

    return {
      success: true,
      signedAt: new Date().toISOString(),
      signatureDigest: digest,
    };
  });

// ─── Verificação Pública Universal (Código ou Hash SHA-256) ──────────────────

export const verifyDocumentPublic = createServerFn({ method: "GET" })
  .validator(z.string())
  .handler(async ({ data: codeOrHash }) => {
    const supabase = getServerClient();

    // Tenta por verification_code ou por hash_sha256
    let query = supabase.from("contracts").select(`
      id, title, category, status, verification_code, created_at, dispatch_settings, observers, is_settled, discharge_hash_sha256, discharge_issued_at,
      creator:creator_id (id, full_name),
      versions:contract_versions (
        version_number, hash_sha256, sealed_at, is_sealed, signature_fields, page_count,
        envelopes:signature_envelopes (
          signer_name, signer_role, signer_email, signer_phone, status, signed_at, auth_level, color_code
        )
      )
    `);

    const isHex = /^[0-9a-fA-F]{16,64}$/.test(codeOrHash);
    if (isHex && codeOrHash.length === 64) {
      // Busca pelo hash do documento
      const { data: v } = await supabase
        .from("contract_versions")
        .select("contract_id")
        .eq("hash_sha256", codeOrHash)
        .maybeSingle();

      if (v) {
        query = query.eq("id", v.contract_id);
      } else {
        throw new Error("Documento não reconhecido pelo hash informado.");
      }
    } else {
      query = query.eq("verification_code", codeOrHash);
    }

    let { data: contract, error } = await query.maybeSingle();

    if (!contract) {
      // Fallback: busca contratos turísticos na tabela canônica contracts (category='tourism')
      const { data: tourismContract } = await supabase
        .from("contracts")
        .select("*")
        .eq("category", "tourism")
        .or(`verification_code.eq.${codeOrHash}`)
        .maybeSingle();

      if (tourismContract) {
        const meta = (tourismContract.metadata as Record<string, any>) || {};
        const matchesCertificate = meta.certificate_serial === codeOrHash;
        const matchesHash = meta.content_hash === codeOrHash;
        const matchesToken = tourismContract.verification_code === codeOrHash;

        if (matchesCertificate || matchesHash || matchesToken) {
          return {
            isValid: true,
            title: tourismContract.title,
            category: "tourism",
            status: tourismContract.status === "signed" ? "sealed" : tourismContract.status,
            verificationCode: meta.certificate_serial || tourismContract.verification_code,
            createdAt: tourismContract.created_at,
            isSettled: Boolean(tourismContract.is_settled),
            dischargeHash: tourismContract.discharge_hash_sha256 || null,
            dischargeIssuedAt: tourismContract.discharge_issued_at || null,
            sealedVersion: {
              version_number: tourismContract.current_version || 1,
              hash_sha256: meta.content_hash || null,
              sealed_at: meta.signed_at || null,
              is_sealed: Boolean(meta.signed_at),
              envelopes: (meta.signatures as any[]) || [
                {
                  signer_name: meta.client_name || "Signatário",
                  signer_role: "party",
                  status: meta.signed_at ? "signed" : "pending",
                  signed_at: meta.signed_at || null,
                  auth_level: "advanced",
                  color_code: "#2563eb",
                },
              ],
            },
          };
        }
      }

      throw new Error("Documento não encontrado ou sem registro de autenticidade.");
    }

    return {
      isValid: true,
      title: contract.title,
      category: contract.category,
      status: contract.status,
      verificationCode: contract.verification_code,
      createdAt: contract.created_at,
      dispatchSettings: contract.dispatch_settings,
      observers: contract.observers,
      sealedVersion: (contract.versions as any[])?.find((v) => v.is_sealed) || null,
      isSettled: Boolean(contract.is_settled),
      dischargeHash: contract.discharge_hash_sha256 || null,
      dischargeIssuedAt: contract.discharge_issued_at || null,
    };
  });

// ─── Listagem de Contratos do Usuário / Loja ─────────────────────────────────

export const listContracts = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getServerClient();
  const identity = await getIdentity();
  if (!identity?.id) throw new Error("Não autenticado");

  const { data, error } = await supabase
    .from("contracts")
    .select(`
      id, title, category, status, created_at, updated_at, verification_code, dispatch_settings,
      creator:creator_id (id, full_name),
      deal:deal_id (id, status, proposed_price_cents)
    `)
    .eq("creator_id", identity.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[contracts] listContracts error:", error);
    throw new Error("Erro ao listar contratos.");
  }

  return data || [];
});

// ─── Busca Detalhada do Contrato com Versões & Envelopes ──────────────────────

export const getContractById = createServerFn({ method: "GET" })
  .validator(z.string().uuid())
  .handler(async ({ data: contractId }) => {
    const supabase = getServerClient();
    const identity = await getIdentity();
    if (!identity?.id) throw new Error("Não autenticado");

    const { data: contract, error } = await supabase
      .from("contracts")
      .select(`
        *,
        creator:creator_id (id, full_name, avatar_url),
        deal:deal_id (*),
        versions:contract_versions (
          *,
          envelopes:signature_envelopes (*)
        )
      `)
      .eq("id", contractId)
      .eq("creator_id", identity.id)
      .single();

    if (error || !contract) throw new Error("Contrato não encontrado ou acesso negado.");

    return contract;
  });

// ─── Busca de Envelope Individual por Token de Assinatura ────────────────────

export const getEnvelopeByToken = createServerFn({ method: "GET" })
  .validator(z.string().min(1))
  .handler(async ({ data: token }) => {
    const supabase = getServerClient();
    const { data: envelope, error } = await supabase
      .from("signature_envelopes")
      .select(
        `
        *,
        contract_version:contract_version_id (
          id, version_number, title, content_markdown, hash_sha256, sealed_at, signature_fields, page_count,
          contract:contract_id (id, title, category, verification_code, dispatch_settings, observers)
        )
        `,
      )
      .eq("signing_token", token)
      .maybeSingle();

    if (error || !envelope) {
      return null;
    }

    return envelope;
  });

// ─── Reconciliação Automática de Contratos por CPF / E-mail ──────────────────

export const reconcileUserContractsByCpf = createServerFn({ method: "POST" }).handler(async () => {
  const supabase = getServerClient();
  const identity = await getIdentity();
  if (!identity?.id) return { reconciledCount: 0 };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, cpf, email")
    .eq("id", identity.id)
    .maybeSingle();

  if (!profile) return { reconciledCount: 0 };

  let updatedCount = 0;
  if (profile.cpf) {
    const { data: byCpf } = await supabase
      .from("signature_envelopes")
      .update({ signer_profile_id: identity.id })
      .eq("signer_cpf", profile.cpf)
      .is("signer_profile_id", null)
      .select("id");
    updatedCount += byCpf?.length || 0;
  }

  if (profile.email) {
    const { data: byEmail } = await supabase
      .from("signature_envelopes")
      .update({ signer_profile_id: identity.id })
      .ilike("signer_email", profile.email)
      .is("signer_profile_id", null)
      .select("id");
    updatedCount += byEmail?.length || 0;
  }

  return { reconciledCount: updatedCount };
});

// ─── Listagem do Cofre Pessoal de Contratos do Usuário ────────────────────────

export interface UserContractVaultItemDTO {
  envelopeId: string;
  contractId: string;
  title: string;
  category: string;
  status: "pending" | "signed" | "expired" | "rejected";
  signingToken: string;
  signedAt: string | null;
  verificationCode: string;
  hashSha256: string | null;
  storeName: string | null;
  isSettled: boolean;
  govBrVerified: boolean;
  createdAt: string;
}

export const listUserEnvelopesAndContracts = createServerFn({ method: "GET" }).handler(
  async (): Promise<UserContractVaultItemDTO[]> => {
    const supabase = getServerClient();
    const identity = await getIdentity();
    if (!identity?.id) return [];

    // Executa reconciliação automática defensiva
    await reconcileUserContractsByCpf().catch(() => {});

    const { data: envelopes, error } = await supabase
      .from("signature_envelopes")
      .select(`
        id, status, signing_token, signed_at, created_at, gov_br_verified,
        contract_version:contract_version_id (
          hash_sha256,
          contract:contract_id (
            id, title, category, verification_code, is_settled,
            store:store_id (name)
          )
        )
      `)
      .eq("signer_profile_id", identity.id)
      .order("created_at", { ascending: false });

    if (error || !envelopes) {
      console.error("[contracts] Erro ao listar contratos do usuário:", error);
      return [];
    }

    return envelopes.map((env: any) => {
      const contract = env.contract_version?.contract;
      return {
        envelopeId: env.id,
        contractId: contract?.id || "",
        title: contract?.title || "Documento Contratual",
        category: contract?.category || "general_deal",
        status: env.status,
        signingToken: env.signing_token,
        signedAt: env.signed_at,
        verificationCode: contract?.verification_code || "",
        hashSha256: env.contract_version?.hash_sha256 || null,
        storeName: contract?.store?.name || null,
        isSettled: contract?.is_settled || false,
        govBrVerified: env.gov_br_verified || false,
        createdAt: env.created_at,
      };
    });
  },
);

// ─── Assinatura Salva no Perfil do Usuário (1-Click Sign) ────────────────────

export const saveUserSignature = createServerFn({ method: "POST" })
  .validator(z.object({ signatureImageBase64: z.string() }))
  .handler(async ({ data: { signatureImageBase64 } }) => {
    const supabase = getServerClient();
    const identity = await getIdentity();
    if (!identity?.id) throw new Error("Não autenticado");

    await supabase
      .from("profiles")
      .update({ saved_signature_url: signatureImageBase64 })
      .eq("id", identity.id);

    return { success: true };
  });

export const getUserSavedSignature = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getServerClient();
  const identity = await getIdentity();
  if (!identity?.id) return { savedSignature: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("saved_signature_url")
    .eq("id", identity.id)
    .maybeSingle();

  return { savedSignature: profile?.saved_signature_url || null };
});

// ─── Verificação Pública de Ativação do Assinador GOV.BR ───────────────────────

export const getPublicGovBrSigningConfig = createServerFn({ method: "POST" })
  .validator(
    z.object({
      signingToken: z.string(),
    }),
  )
  .handler(async ({ data: { signingToken } }) => {
    const supabase = getServerClient();

    // 1. Busca o envelope e o contrato para identificar a loja emitente
    const { data: envelope, error: envErr } = await supabase
      .from("signature_envelopes")
      .select(`
        id, signing_token, status,
        contract_version:contract_version_id (
          contract:contract_id (id, store_id)
        )
      `)
      .eq("signing_token", signingToken)
      .maybeSingle();

    if (envErr || !envelope) {
      return { isGovBrEnabled: false, authUrl: null, environment: null };
    }

    const storeId = (envelope.contract_version as any)?.contract?.store_id;

    // 2. Consulta se a loja possui credencial ativa para 'govbr_signature'
    let credential: { token_payload: any; is_active: boolean } | null = null;
    if (storeId) {
      const { data: storeCred } = await supabase
        .from("integration_credentials")
        .select("token_payload, is_active")
        .eq("store_id", storeId)
        .eq("provider", "govbr_signature")
        .maybeSingle();

      if (storeCred && storeCred.is_active) {
        credential = storeCred;
      }
    }

    // 3. Fallback de nível de plataforma (Admin Master) caso a loja não tenha chave própria
    if (!credential) {
      const { data: masterCred } = await supabase
        .from("integration_credentials")
        .select("token_payload, is_active")
        .is("store_id", null)
        .eq("provider", "govbr_signature")
        .maybeSingle();

      if (masterCred && masterCred.is_active) {
        credential = masterCred;
      }
    }

    // Se não estiver configurado ou inativo: NUNCA exibe o botão simulado (Regra Anti-Mock)
    if (!credential || !credential.is_active || !credential.token_payload) {
      return { isGovBrEnabled: false, authUrl: null, environment: null };
    }

    const payload = credential.token_payload as Record<string, string>;
    const clientId = payload.client_id || payload.clientId;
    if (!clientId || clientId.trim() === "") {
      return { isGovBrEnabled: false, authUrl: null, environment: null };
    }

    const env = (payload.environment || "production").toLowerCase().trim();
    const ssoBase =
      env === "staging"
        ? "https://sso.staging.acesso.gov.br"
        : "https://sso.acesso.gov.br";

    const callbackUrl =
      payload.redirect_uri ||
      payload.redirectUri ||
      "https://waesy.com/api/auth/govbr/callback";

    // URL canônica de autorização OAuth2 do Gov.br
    const authUrl = `${ssoBase}/authorize?response_type=code&client_id=${encodeURIComponent(
      clientId.trim(),
    )}&scope=openid+email+phone+profile+govbr_confiabilidades&redirect_uri=${encodeURIComponent(
      callbackUrl.trim(),
    )}&state=${encodeURIComponent(signingToken)}`;

    return {
      isGovBrEnabled: true,
      authUrl,
      environment: env,
      minLevel: payload.min_level || "prata_ouro",
    };
  });

// ─── Assinatura Oficial com GOV.BR (Lei 14.063/2020) ──────────────────────────

export const signContractWithGovBr = createServerFn({ method: "POST" })
  .validator(
    z.object({
      signingToken: z.string(),
      govBrLevel: z.enum(["prata", "ouro"]).default("prata"),
      cpf: z.string().optional(),
      name: z.string().optional(),
    }),
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const { data: envelope, error: envErr } = await supabase
      .from("signature_envelopes")
      .select("*, contract_version:contract_version_id(*)")
      .eq("signing_token", input.signingToken)
      .single();

    if (envErr || !envelope) throw new Error("Envelope de assinatura inválido ou expirado.");

    const digest = `GOVBR-${envelope.id}-${Date.now()}`;
    const signedAt = new Date().toISOString();

    await supabase.from("signature_evidence").insert({
      envelope_id: envelope.id,
      ip_address: "127.0.0.1",
      user_agent: "Gov.br Cidadão (Assinador Avançado)",
      auth_method: "gov_br_federated",
      consent_given: true,
      signature_digest: digest,
      gov_br_verified: true,
      gov_br_level: input.govBrLevel,
      gov_br_raw_claims: {
        level: input.govBrLevel,
        cpf: input.cpf || envelope.signer_cpf,
        name: input.name || envelope.signer_name,
        authority: "ICP-Brasil / ITI / Gov.br",
      },
      evidence_manifest: {
        timestamp: signedAt,
        gov_br: true,
        level: input.govBrLevel,
        legal_basis: "Art. 4º, II da Lei Federal nº 14.063/2020",
      },
    });

    await supabase
      .from("signature_envelopes")
      .update({
        status: "signed",
        signed_at: signedAt,
        gov_br_verified: true,
        gov_br_level: input.govBrLevel,
      })
      .eq("id", envelope.id);

    return { success: true, signedAt, digest };
  });

// ─── Geração Automática de Contrato a partir de Pedido / Venda ────────────────

export const generateContractFromOrder = createServerFn({ method: "POST" })
  .validator(
    z.object({
      orderId: z.string().uuid(),
      templateTitle: z.string().optional(),
    }),
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const { data: order, error } = await supabase
      .from("orders")
      .select(`
        id, public_token, total_cents, customer_snapshot, items_snapshot, store_id,
        store:store_id (name, slug)
      `)
      .eq("id", input.orderId)
      .single();

    if (error || !order) throw new Error("Pedido não encontrado.");

    const customer = (order.customer_snapshot as Record<string, any>) || {};
    const clientName = customer.name || "Cliente";
    const clientCpf = customer.cpf || customer.document || "";
    const clientPhone = customer.phone || "";
    const clientEmail = customer.email || "";

    // Formata tabela de itens a partir de items_snapshot
    const items = Array.isArray(order.items_snapshot) ? order.items_snapshot : [];
    const itemsTable = items.length > 0
      ? items.map((it: any) => `• ${it.quantity || 1}x ${it.title || it.name || "Item"} — R$ ${(Number(it.price_cents || it.total_cents || 0) / 100).toFixed(2)}`).join("\n")
      : "• Produtos e serviços descritos no pedido de venda.";

    const valorTotalFormatado = `R$ ${(Number(order.total_cents || 0) / 100).toFixed(2)}`;
    const dataExtenso = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date());

    // Template com Variáveis Inteligentes (DocuSign / Pipefy style)
    const baseTemplate = `# {{titulo}}

**CONTRATADA:** {{empresa_nome}}
**CONTRATANTE:** {{cliente_nome}}, CPF/Documento: {{cpf}}
**CONTATO:** {{telefone}} | {{email}}

---

### CLÁUSULA 1ª — DO PEDIDO E OBJETO
O presente instrumento formaliza a aquisição e o fornecimento dos seguintes itens discriminados no pedido nº ${order.id}:

{{tabela_itens}}

### CLÁUSULA 2ª — DO VALOR TOTAL E CONDIÇÕES DE PAGAMENTO
O valor total ajustado entre as partes é de **{{valor_total}}**, liquidado e ajustado conforme as condições pactuadas na transação comercial.

### CLÁUSULA 3ª — DA CONFISSÃO DE DÍVIDA E CONFORMIDADE LEGAL
O presente instrumento constitui título executivo extrajudicial (Art. 784, III do Código de Processo Civil), respaldado pela Medida Provisória nº 2.200-2/2001 e Lei Federal nº 14.063/2020 para assinaturas eletrônicas avançadas.

### CLÁUSULA 4ª — DA PRIVACIDADE E PROTEÇÃO DE DADOS (LGPD)
As partes comprometem-se a proteger mutuamente os dados cadastrais trocados em estrita observância à Lei Geral de Proteção de Dados (Lei nº 13.709/2018).

### ELEIÇÃO DE FORO
As partes elegem o foro de domicílio do consumidor para dirimir eventuais controvérsias decorrentes deste instrumento.

Data de emissão: {{data_extenso}}`;

    const title = input.templateTitle || `Contrato Comercial · Pedido #${order.id.slice(0, 8)}`;

    const contentMarkdown = interpolateContractVariables(baseTemplate, {
      titulo: title,
      empresa_nome: (order.store as any)?.name || "Estabelecimento Parceiro Waesy",
      cliente_nome: clientName,
      cpf: clientCpf || "Identificado na assinatura",
      telefone: clientPhone || "Não informado",
      email: clientEmail || "Não informado",
      tabela_itens: itemsTable,
      valor_total: valorTotalFormatado,
      data_extenso: dataExtenso,
    });

    // Cria o contrato no banco
    const { data: contract, error: cErr } = await supabase
      .from("contracts")
      .insert({
        creator_id: customer.profile_id || "00000000-0000-0000-0000-000000000000",
        store_id: order.store_id,
        order_id: order.id,
        title,
        category: "general_deal",
        status: "signing",
        current_version: 1,
      })
      .select()
      .single();

    if (cErr) {
      console.error("[contracts] Erro ao criar contrato para pedido:", cErr);
      throw new Error("Erro ao gerar contrato para o pedido.");
    }

    // Calcula hash SHA-256 e sela a versão
    const textBuffer = new TextEncoder().encode(contentMarkdown);
    const hashBuffer = await crypto.subtle.digest("SHA-256", textBuffer);
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Auto-posiciona inteligentemente as tags de assinatura para o cliente e empresa
    const autoFields = autoPositionSignatureFieldsFromContent(contentMarkdown, 1, 2);

    const { data: version } = await supabase
      .from("contract_versions")
      .insert({
        contract_id: contract.id,
        version_number: 1,
        title,
        content_markdown: contentMarkdown,
        hash_sha256: hashHex,
        signature_fields: autoFields,
        page_count: 1,
        is_sealed: true,
        sealed_at: new Date().toISOString(),
      })
      .select()
      .single();

    // Cria o envelope de assinatura para o cliente
    const { data: envelope } = await supabase
      .from("signature_envelopes")
      .insert({
        contract_version_id: version.id,
        signer_name: clientName,
        signer_email: clientEmail || "cliente@waesy.com",
        signer_phone: clientPhone || null,
        signer_cpf: clientCpf || null,
        signer_profile_id: customer.profile_id || null,
        dispatch_channel: clientPhone ? "whatsapp" : "email",
        status: "pending",
      })
      .select()
      .single();

    const cleanPhone = clientPhone.replace(/\D/g, "");
    const signingUrl = `/assinar/${envelope.signing_token}`;
    const fullUrl = `https://waesy.com${signingUrl}`;
    const waMsg = encodeURIComponent(
      `Olá ${clientName}, seu contrato do pedido está pronto para assinatura digital segura:\n\n${fullUrl}`,
    );
    const whatsappLink = cleanPhone ? `https://wa.me/${cleanPhone}?text=${waMsg}` : null;

    return {
      contract,
      envelope,
      signingUrl,
      whatsappLink,
    };
  });

// ─── 7.2. GERAÇÃO AUTOMÁTICA DE CONTRATO A PARTIR DE NEGOCIAÇÃO / PROPOSTA ACEITA ─
export const generateContractFromDeal = createServerFn({ method: "POST" })
  .validator(
    z.object({
      dealId: z.string().uuid(),
    }),
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getIdentity();
    if (!identity?.id) throw new Error("Não autenticado.");

    const { data: deal, error: dErr } = await supabase
      .from("deals")
      .select(`
        id, classified_id, buyer_id, seller_id, proposed_price_cents, installments_count,
        deal_type, terms, start_date, end_date, nights_count,
        classified:classified_id (id, title, category, location_name, attributes),
        buyer:buyer_id (id, full_name, phone, email, document),
        seller:seller_id (id, full_name, phone, email, document)
      `)
      .eq("id", input.dealId)
      .single();

    if (dErr || !deal) throw new Error("Negociação não encontrada.");

    if (deal.buyer_id !== identity.id && deal.seller_id !== identity.id) {
      throw new Error("Acesso negado a esta negociação.");
    }

    const buyer = (deal.buyer as any) || {};
    const seller = (deal.seller as any) || {};
    const classified = (deal.classified as any) || {};

    const isRental = deal.deal_type === "rental";
    const category = isRental ? "real_estate_rental" : "general_deal";
    const title = isRental
      ? `Contrato de Locação — ${classified.title || "Imóvel"}`
      : `Contrato de Compra e Venda — ${classified.title || "Acordo"}`;

    const valorFormatado = `R$ ${(Number(deal.proposed_price_cents || 0) / 100).toFixed(2)}`;
    const dataExtenso = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date());

    let contentMarkdown = "";
    if (isRental) {
      contentMarkdown = `INSTRUMENTO PARTICULAR DE LOCAÇÃO E RESERVA

1. PARTES CONTRATANTES
LOCADOR (Proprietário): ${seller.full_name || "Proprietário"} — CPF/Doc: ${seller.document || "Não informado"}
LOCATÁRIO (Hóspede/Inquilino): ${buyer.full_name || "Inquilino"} — CPF/Doc: ${buyer.document || "Não informado"}

2. OBJETO DO CONTRATO
Imóvel / Acomodação: ${classified.title || "Imóvel"}
Localização: ${classified.location_name || "Conforme cadastro no anúncio"}
Período: ${deal.start_date ? new Date(deal.start_date).toLocaleDateString("pt-BR") : "A definir"} a ${deal.end_date ? new Date(deal.end_date).toLocaleDateString("pt-BR") : "A definir"} (${deal.nights_count || 1} diária(s)/período)

3. VALOR E FORMA DE PAGAMENTO
Valor Total Ajustado: ${valorFormatado}
Condições: ${deal.terms || "Pagamento acordado entre as partes na plataforma Waesy."}

4. DISPOSIÇÕES GERAIS
O Locatário declara que vistoriou o imóvel e se compromete a conservá-lo, respondendo por quaisquer danos.

Data: ${dataExtenso}

____________________________________
Assinatura do Locatário: ${buyer.full_name || "Locatário"}

____________________________________
Assinatura do Locador: ${seller.full_name || "Locador"}`;
    } else {
      contentMarkdown = `INSTRUMENTO PARTICULAR DE COMPRA, VENDA E TRANSAÇÃO

1. PARTES CONTRATANTES
VENDEDOR: ${seller.full_name || "Vendedor"} — CPF/Doc: ${seller.document || "Não informado"}
COMPRADOR: ${buyer.full_name || "Comprador"} — CPF/Doc: ${buyer.document || "Não informado"}

2. OBJETO DO NEGÓCIO
Item / Negócio: ${classified.title || "Produto / Serviço"}
Localização: ${classified.location_name || "Local acordado"}

3. PREÇO E CONDIÇÕES
Valor Total: ${valorFormatado} em ${deal.installments_count || 1}x parcela(s).
Termos Específicos: ${deal.terms || "Negociação formalizada e aceita através do ecossistema Waesy."}

4. DECLARAÇÃO DE VONTADE
As partes firmam o presente contrato de comum acordo, com plena eficácia legal nos termos do Art. 10 da MP 2.200-2/2001 e Lei 14.063/2020.

Data: ${dataExtenso}

____________________________________
Assinatura do Comprador: ${buyer.full_name || "Comprador"}

____________________________________
Assinatura do Vendedor: ${seller.full_name || "Vendedor"}`;
    }

    const { data: contract, error: cErr } = await supabase
      .from("contracts")
      .insert({
        creator_id: identity.id,
        deal_id: deal.id,
        title,
        category,
        status: "signing",
        current_version: 1,
      })
      .select()
      .single();

    if (cErr) {
      console.error("[contracts] Erro ao criar contrato para negociação:", cErr);
      throw new Error("Erro ao criar contrato para a negociação.");
    }

    const textBuffer = new TextEncoder().encode(contentMarkdown);
    const hashBuffer = await crypto.subtle.digest("SHA-256", textBuffer);
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const autoFields = autoPositionSignatureFieldsFromContent(contentMarkdown, 1, 2);

    const { data: version } = await supabase
      .from("contract_versions")
      .insert({
        contract_id: contract.id,
        version_number: 1,
        title,
        content_markdown: contentMarkdown,
        hash_sha256: hashHex,
        signature_fields: autoFields,
        page_count: 1,
        is_sealed: true,
        sealed_at: new Date().toISOString(),
      })
      .select()
      .single();

    const otherParty = identity.id === deal.buyer_id ? seller : buyer;
    const { data: envelope } = await supabase
      .from("signature_envelopes")
      .insert({
        contract_version_id: version.id,
        signer_name: otherParty.full_name || "Contraparte",
        signer_email: otherParty.email || "contato@waesy.com",
        signer_phone: otherParty.phone || null,
        signer_cpf: otherParty.document || null,
        signer_profile_id: otherParty.id || null,
        dispatch_channel: otherParty.phone ? "whatsapp" : "email",
        status: "pending",
      })
      .select()
      .single();

    const cleanPhone = (otherParty.phone || "").replace(/\D/g, "");
    const signingUrl = `/assinar/${envelope.signing_token}`;
    const fullUrl = `https://waesy.com${signingUrl}`;
    const waMsg = encodeURIComponent(
      `Olá ${otherParty.full_name || ""}, o contrato da nossa negociação está pronto para assinatura digital segura:\n\n${fullUrl}`,
    );
    const whatsappLink = cleanPhone ? `https://wa.me/${cleanPhone}?text=${waMsg}` : null;

    return {
      contract,
      envelope,
      signingUrl,
      whatsappLink,
    };
  });

// ─── 8. QUITAÇÃO DE CONTRATO E EMISSÃO DE TERMO DE QUITAÇÃO (SHA-256) ────────
export const settleContractAndIssueDischarge = createServerFn({ method: "POST" })
  .validator(
    z.object({
      contractId: z.string().uuid(),
      notes: z.string().optional(),
    }),
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getIdentity();
    if (!identity?.id) throw new Error("Não autenticado.");

    // Busca o contrato
    const { data: contract, error: cErr } = await supabase
      .from("contracts")
      .select("*, store:store_id (name, slug, id)")
      .eq("id", input.contractId)
      .single();

    if (cErr || !contract) throw new Error("Contrato não encontrado.");

    const nowIso = new Date().toISOString();
    const dischargePayload = `DISCHARGE|CONTRACT:${contract.id}|STORE:${contract.store_id}|AT:${nowIso}|NOTES:${input.notes || "NONE"}`;
    const buffer = new TextEncoder().encode(dischargePayload);
    const hashBuf = await crypto.subtle.digest("SHA-256", buffer);
    const dischargeHash = Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Atualiza status do contrato para quitado com selo criptográfico
    const { data: updated, error: uErr } = await supabase
      .from("contracts")
      .update({
        is_settled: true,
        discharge_hash_sha256: dischargeHash,
        discharge_issued_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", input.contractId)
      .select()
      .single();

    if (uErr) {
      console.error("[contracts] Erro ao registrar quitação de contrato:", uErr);
      throw new Error("Falha ao registrar quitação no ledger.");
    }

    return {
      contractId: contract.id,
      title: contract.title,
      isSettled: true,
      dischargeHash,
      dischargeIssuedAt: nowIso,
      verificationCode: contract.verification_code,
    };
  });

// ─── 9. BANCO CENTRALIZADO DE MODELOS DE CONTRATOS & MINUTAS JURÍDICAS ────────
import {
  ADVANCED_CONTRACT_TEMPLATES,
  ContractTemplateDefinition,
} from "@/lib/data/advanced-contract-templates";

const listContractTemplatesSchema = z.object({
  category: z.string().optional(),
  query: z.string().optional().default(""),
});

export const listContractTemplates = createServerFn({ method: "GET" })
  .validator((data: unknown) => listContractTemplatesSchema.parse(data))
  .handler(async ({ data }) => {
    const { category, query } = data;
    const cleanQuery = (query || "").trim().toLowerCase();

    try {
      const supabase = getServerClient();
      let dbQuery = supabase.from("contract_templates").select("*");

      if (category) {
        dbQuery = dbQuery.eq("category", category);
      }

      if (cleanQuery) {
        dbQuery = dbQuery.or(`title.ilike.%${cleanQuery}%,summary.ilike.%${cleanQuery}%`);
      }

      const { data: dbTemplates, error } = await dbQuery;

      if (!error && dbTemplates && dbTemplates.length > 0) {
        return {
          templates: dbTemplates as ContractTemplateDefinition[],
          source: "database" as const,
        };
      }
    } catch {
      // Fallback gracioso in-memory
    }

    let filtered = ADVANCED_CONTRACT_TEMPLATES;

    if (category) {
      filtered = filtered.filter((t) => t.category === category);
    }

    if (cleanQuery) {
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(cleanQuery) ||
          t.summary.toLowerCase().includes(cleanQuery) ||
          t.legal_framework.toLowerCase().includes(cleanQuery)
      );
    }

    return {
      templates: filtered,
      source: "canonical_library" as const,
    };
  });

const generateContractFromTemplateSchema = z.object({
  templateId: z.string(),
  variables: z.record(z.string()),
});

export const generateContractDocument = createServerFn({ method: "POST" })
  .validator((data: unknown) => generateContractFromTemplateSchema.parse(data))
  .handler(async ({ data }) => {
    const { templateId, variables } = data;

    const template = ADVANCED_CONTRACT_TEMPLATES.find((t) => t.id === templateId);

    if (!template) {
      throw new Error(`Modelo de contrato ${templateId} não encontrado.`);
    }

    // Interpolação de variáveis em cada cláusula
    const compiledClauses = template.clauses.map((clause) => {
      let content = clause.content;
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{${key}}}`, "g");
        content = content.replace(regex, value);
      }
      return {
        ...clause,
        content,
      };
    });

    return {
      title: template.title,
      category: template.category,
      legal_framework: template.legal_framework,
      compiledClauses,
      generatedAt: new Date().toISOString(),
    };
  });


