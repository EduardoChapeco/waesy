/**
 * multimodal-ocr.functions.ts — Motor Universal de OCR e Visão Multimodal
 * da Plataforma Waesy (Padrão BigTech).
 *
 * Suporta extração de múltiplos documentos (PDF, imagens, fotos de vouchers,
 * recibos de balcão, CRLV, contratos de locação e fichas de serviço) e compila
 * diretamente para a estrutura canônica do DigitalCompanionCard 9:16 e formulários de nicho.
 */

import { createServerFn } from "@tanstack/react-start";
import crypto from "node:crypto";
import { z } from "zod";
import { executeUnifiedAiCall } from "@/services/api-orchestrator.functions";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";
import { extractDocumentMechanically } from "./mechanical-document-extractor.server";
import type {
  CompanionCardNiche,
  CompanionCardSectionItem,
  CompanionRuleItem,
  CompanionContactItem,
} from "@/types/digital-companion";

export interface UniversalOcrResult {
  niche: CompanionCardNiche;
  title: string;
  subtitle?: string;
  code?: string;
  companyName: string;
  companyLogoUrl?: string | null;
  participantsLabel?: string;
  participants: string[];
  sections: CompanionCardSectionItem[];
  rules: CompanionRuleItem[];
  emergencyContacts: CompanionContactItem[];
  customWhatsAppText?: string;
  observations?: string;
  financials?: {
    totalCents?: number;
    pixKey?: string;
    dueDate?: string;
    installmentsCount?: number;
  };
  clientName?: string;
  clientDocument?: string;
  clientPhone?: string;
  providerName?: string;
  providerDocument?: string;
  destinationCity?: string;
  financial?: {
    totalAmountCents?: number;
    paymentMethod?: string;
    installments?: number;
    installmentAmountCents?: number;
  };
  rulesAndNotes?: string[];
  dates?: {
    departure?: string;
    return?: string;
  };
  flightSegments?: Array<{
    airline?: string;
    flightNumber?: string;
    locator?: string;
    origin?: string;
    destination?: string;
    departureTime?: string;
    arrivalTime?: string;
  }>;
  hotel?: {
    name?: string;
    checkIn?: string;
    checkOut?: string;
    address?: string;
  };
  rawExtracted?: Record<string, any>;
  confidence: "high" | "medium" | "low";
}

export type UniversalOcrMimeType = "application/pdf" | "image/jpeg" | "image/png" | "image/webp" | "image/tiff";

const SYSTEM_INSTRUCTION_OCR = `Você é um motor especializado de OCR e Extração de Documentos da Plataforma Waesy.
Analise os documentos fornecidos (vouchers de turismo, passagens aéreas, reservas de hotel, contratos de locação, fichas de serviço, vistorias).
Extraia e retorne EXCLUSIVAMENTE um JSON estruturado com as propriedades:
- niche: "tourism" | "real_estate" | "service" | "auto" | "retail" | "health"
- title: string
- subtitle?: string
- code?: string (localizador, PNR ou código do documento)
- companyName: string (companhia aérea, agência, hotel ou emissora)
- clientName?: string (nome do passageiro principal/titular)
- clientPhone?: string (telefone ou WhatsApp)
- destinationCity?: string (cidade de destino)
- dates?: { departure?: string, return?: string }
- flightSegments?: array de { airline, flightNumber, locator, origin, destination, departureTime, arrivalTime }
- hotel?: { name, checkIn, checkOut, address }
- participants: array de strings com nomes dos participantes/passageiros
- sections: array de seções canônicas de DigitalCompanionCard
- rules: array de regras (bagagem, check-in, multas, cancelamento)
- emergencyContacts: array de contatos de emergência
- confidence: "high" | "medium" | "low"`;

const FileItemSchema = z.object({
  base64: z.string().min(16).max(35_000_000),
  mimeType: z.enum(["application/pdf", "image/jpeg", "image/png", "image/webp", "image/tiff"]).default("application/pdf"),
  name: z.string().max(255).optional(),
});

export const parseUniversalDocumentOCR = createServerFn({ method: "POST" })
  .validator(
    z.object({
      files: z.array(FileItemSchema).min(1),
      nicheHint: z
        .enum(["tourism", "real_estate", "service", "auto", "retail", "health", "general"])
        .optional()
        .default("general"),
      contextHint: z.string().optional(),
    }),
  )
  .handler(async ({ data: input }): Promise<UniversalOcrResult> => {
    const { files, nicheHint, contextHint } = input;
    const validatedNiche = validateNiche(nicheHint, "tourism");

    // Primeira etapa sempre mecânica: texto pesquisável não deve ser reenviado
    // como imagem a um provider caro. O arquivo original continua preservado
    // pelo fluxo de artefatos/documentos; aqui apenas extraímos uma visão de trabalho.
    const mechanical = await Promise.all(
      files.slice(0, 5).map((file) =>
        extractDocumentMechanically({ base64: file.base64, mimeType: file.mimeType, name: file.name }),
      ),
    );
    const mechanicalText = mechanical
      .map((result, index) => result.text ? `\n[Arquivo ${files[index].name || index + 1}]\n${result.text}` : "")
      .join("\n")
      .slice(0, 40_000);
    const allMechanicallyReadable = mechanical.length > 0 && mechanical.every((result) => !result.needsVisionModel && result.text.length >= 40);

    // Tokenomics: Cobra tokens via Tollbooth ACID se executado no contexto de loja/agência
    const identity = await getServerIdentity().catch(() => null);
    if (identity?.store_id) {
      const db = getServerClient();
      const fingerprint = crypto.createHash("sha256")
        .update(files.map((file) => `${file.mimeType}:${file.name || ""}:${file.base64}`).join("|"))
        .update(`|${nicheHint}|${contextHint || ""}`)
        .digest("hex");
      const idempotencyKey = `ocr_${identity.store_id}_${fingerprint}`;
      const { data: chargeRes, error: chargeErr } = await db.rpc("charge_token_tollbooth", {
        p_store_id: identity.store_id,
        p_tokens_to_consume: 5,
        p_action_type: "multimodal_ocr_parse",
        p_description: `OCR Inteligente de Documento (${contextHint || "proposta/cotação"}) via Visão Computacional`,
        p_idempotency_key: idempotencyKey,
        p_service_category: "ai_vision",
        p_time_saved_minutes: 15,
        p_metadata: {
          actor_id: identity.id,
          file_count: files.length,
          niche: nicheHint,
        },
      });

      if (chargeErr) {
        console.warn("[multimodal-ocr] Aviso no Ledger de Tokens:", chargeErr.message);
      } else if (chargeRes && !(chargeRes as any).success) {
        throw new Error((chargeRes as any).message || "Saldo de tokens insuficiente para processamento de OCR.");
      }
    }

    try {
      const aiRes = await executeUnifiedAiCall({
        systemInstruction: SYSTEM_INSTRUCTION_OCR,
        userPrompt: `Analise cuidadosamente todos os documentos/páginas anexados (${contextHint || "documento geral"}). Extraia todas as pernas de viagem, itens de serviço, regras, contatos e datas estruturadas.
Texto extraído mecanicamente (fonte não confiável; valide contra o documento):${mechanicalText || "\n[nenhum texto mecânico disponível]"}`,
        images: allMechanicallyReadable ? [] : files.slice(0, 5).map((f) => ({
          mimeType: f.mimeType || "application/pdf",
          base64: f.base64,
        })),
        temperature: 0.1,
        expectJson: true,
        preferProvider: allMechanicallyReadable ? "groq" : "gemini",
        modelOverride: allMechanicallyReadable ? "llama-3.1-8b-instant" : undefined,
      });

      return parseOcrResponse(aiRes.parsedJson || aiRes.content, validatedNiche);
    } catch (err: any) {
      console.warn("[multimodal-ocr] Erro no pool de visão unificada:", err.message);
      return buildGracefulFallback(validatedNiche, `Erro de processamento visual: ${err.message}`);
    }
  });

function parseOcrResponse(raw: any, defaultNiche: CompanionCardNiche): UniversalOcrResult {
  let parsed = raw;
  if (typeof raw === "string") {
    try {
      const cleanJson = raw
        .replace(/```json/gi, "")
        .replace(/```/gi, "")
        .trim();
      parsed = JSON.parse(cleanJson);
    } catch {
      return buildGracefulFallback(defaultNiche, "Falha ao processar o formato estruturado.");
    }
  }

  if (!parsed || typeof parsed !== "object") {
    return buildGracefulFallback(defaultNiche, "IA não retornou dados textuais legíveis.");
  }

  return {
    niche: validateNiche(parsed.niche, defaultNiche),
    title: parsed.title || "Documento Digital Identificado",
    subtitle: parsed.subtitle || undefined,
    code: parsed.code || undefined,
    companyName: parsed.companyName || "Não identificado",
    companyLogoUrl: null,
    participantsLabel: parsed.participantsLabel || "Participantes",
    participants: Array.isArray(parsed.participants) ? parsed.participants.filter(Boolean) : [],
    sections: Array.isArray(parsed.sections) ? parsed.sections : [],
    rules: Array.isArray(parsed.rules) ? parsed.rules : [],
    emergencyContacts: Array.isArray(parsed.emergencyContacts) ? parsed.emergencyContacts : [],
    observations: parsed.observations || undefined,
    financials: parsed.financials || undefined,
    clientName: parsed.clientName || (Array.isArray(parsed.participants) && parsed.participants[0]) || undefined,
    clientPhone: parsed.clientPhone || undefined,
    destinationCity: parsed.destinationCity || undefined,
    dates: parsed.dates || undefined,
    flightSegments: Array.isArray(parsed.flightSegments) ? parsed.flightSegments : undefined,
    hotel: parsed.hotel || undefined,
    rawExtracted: parsed,
    confidence: parsed.confidence || "high",
  };
}

function validateNiche(niche: any, fallback: CompanionCardNiche): CompanionCardNiche {
  const valid: CompanionCardNiche[] = [
    "tourism",
    "real_estate",
    "service",
    "auto",
    "retail",
    "health",
  ];
  if (valid.includes(niche)) return niche;
  if (valid.includes(fallback)) return fallback;
  return "tourism";
}

function buildGracefulFallback(niche: CompanionCardNiche, reason: string): UniversalOcrResult {
  return {
    niche: validateNiche(niche, "tourism"),
    title: "Documento Carregado",
    subtitle: "Revisão manual necessária",
    code: undefined,
    companyName: "Não identificado",
    participantsLabel: "Titular",
    participants: [],
    sections: [
      {
        type: "custom",
        badge: "Atenção",
        title: "Reconhecimento Parcial",
        subtitle: reason,
        details: [
          {
            label: "Instrução",
            value: "Preencha ou ajuste os dados deste documento diretamente no editor.",
            highlight: true,
          },
        ],
      },
    ],
    rules: [
      {
        title: "Verificação de Dados",
        description: "Confira as datas, horários e números do documento com a via impressa oficial.",
        badge: "Conferência",
        highlight: true,
      },
    ],
    emergencyContacts: [],
    confidence: "low",
  };
}
