import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getIdentity } from "./identity.functions";
import { getNextActiveKey, markKeyError } from "@/services/api-orchestrator.functions";

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
      id, title, category, status, verification_code, created_at, dispatch_settings, observers,
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
