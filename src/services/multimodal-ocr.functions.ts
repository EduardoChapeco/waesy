/**
 * multimodal-ocr.functions.ts — Motor Universal de OCR e Visão Multimodal
 * da Plataforma Waesy (Padrão BigTech).
 *
 * Suporta extração de múltiplos documentos (PDF, imagens, fotos de vouchers,
 * recibos de balcão, CRLV, contratos de locação e fichas de serviço) e compila
 * diretamente para a estrutura canônica do DigitalCompanionCard 9:16 e formulários de nicho.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { executeUnifiedAiCall } from "@/services/api-orchestrator.functions";
import type {
  CompanionCardNiche,
  CompanionCardSectionItem,
  CompanionRuleItem,
  CompanionContactItem,
} from "@/components/documents/digital-companion-card";

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
  base64: z.string(),
  mimeType: z.string().default("application/pdf"),
  name: z.string().optional(),
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

    try {
      const aiRes = await executeUnifiedAiCall({
        systemInstruction: SYSTEM_INSTRUCTION_OCR,
        userPrompt: `Analise cuidadosamente todos os documentos/páginas anexados (${contextHint || "documento geral"}). Extraia todas as pernas de viagem, itens de serviço, regras, contatos e datas estruturadas:`,
        images: files.slice(0, 5).map((f) => ({
          mimeType: f.mimeType || "application/pdf",
          base64: f.base64,
        })),
        temperature: 0.1,
        expectJson: true,
        preferProvider: "gemini",
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
    companyName: parsed.companyName || "Waesy Platform",
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
    subtitle: "Revisão Manual Necessária",
    code: "OCR-MANUAL",
    companyName: "Waesy Platform",
    participantsLabel: "Titular",
    participants: ["Titular"],
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
    emergencyContacts: [
      {
        name: "Central de Apoio Waesy",
        category: "Suporte",
        phone: "0800 000 0000",
        whatsapp: true,
        is24h: true,
      },
    ],
    confidence: "low",
  };
}
