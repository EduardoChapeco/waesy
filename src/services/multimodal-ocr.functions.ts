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
import { getNextActiveKey, markKeyError } from "@/services/api-orchestrator.functions";
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
  rawExtracted?: Record<string, any>;
  confidence: "high" | "medium" | "low";
}

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

    // 1. Obtém chave ativa no pool de IA (Gemini Vision)
    const geminiKey = await getNextActiveKey("gemini");
    if (!geminiKey) {
      // Fallback gracioso com dados básicos informativos
      return buildGracefulFallback(nicheHint, "Chave de visão computacional em manutenção.");
    }

    // 2. Constrói instrução de sistema rigorosa e semântica
    const systemInstruction = `Você é o Agente Especialista em OCR e Extração de Documentos Multimodais da Waesy Platform.
Sua missão é analisar as imagens/páginas de documentos fornecidas (podem ser vouchers de viagem, passagens aéreas, confirmações de hotel, ordens de serviço, comprovantes de compra/carnê, contratos de locação, regras de condomínio, CRLV/CNH, ou termos de atendimento) e extrair dados COMPLETOS, precisos e amigáveis para o usuário.

NICHO PREFERENCIAL: ${nicheHint !== "general" ? nicheHint : "Detecte automaticamente com base no documento"}
${contextHint ? `CONTEXTO ADICIONAL FORNECIDO: ${contextHint}` : ""}

REGRAS DE FORMATAÇÃO E EXCELÊNCIA:
1. Retorne ESTRITAMENTE um objeto JSON válido, sem cercaduras markdown (\`\`\`json).
2. Converta textos em CAIXA ALTA para Title Case legível (Ex: "LATAM AIRLINES BRASIL" vira "Latam Airlines", "HOTEL VILA GALÉ" vira "Hotel Vila Galé").
3. Para Voos: Extraia CADA PERNA individualmente como uma seção separada (Origem -> Destino, horário de partida e chegada, cia aérea, número do voo, localizador e franquia de bagagem).
4. Para Hospedagem: Extraia nome do hotel, check-in, check-out, regime de refeição (ex: Café da Manhã, All Inclusive) e código de confirmação.
5. Para Imóveis: Extraia endereço, horários de check-in/out, regras de condomínio/silêncio, contatos do anfitrião/portaria.
6. Para Serviços / Balcão: Extraia descrição do serviço/produtos, prazos, garantias, valor total e parcelas.
7. Para Contatos de Emergência & Suporte: Identifique telefones de plantão 24h, WhatsApp de suporte, seguradora ou guincho.
8. Regras & Instruções: Extraia de 2 a 5 orientações práticas essenciais (tolerância de horário, documentação necessária, bagagem, preparo prévio).

FORMATO JSON OBRIGATÓRIO:
{
  "niche": "tourism" | "real_estate" | "service" | "auto" | "retail" | "health",
  "title": "<Título principal conciso e comercial, ex: 'Pacote Buenos Aires & Mendoza' ou 'Comprovante de Compra #1024'>",
  "subtitle": "<Subtítulo informativo, ex: '15/10/2026 a 22/10/2026' ou 'Loja Central'>",
  "code": "<Localizador geral, código do voucher, nota ou placa>",
  "companyName": "<Nome da empresa emissora, operadora ou fornecedor>",
  "participantsLabel": "<Ex: 'Passageiros', 'Hóspedes', 'Cliente' ou 'Titular'>",
  "participants": ["<Nome 1>", "<Nome 2>"],
  "sections": [
    {
      "type": "flight" | "hotel" | "transport" | "tour" | "insurance" | "service_item" | "custom",
      "badge": "<Tag curta, ex: 'Ida Confirmada', 'Check-in', '10x sem juros'>",
      "title": "<Nome do serviço/item>",
      "subtitle": "<Subtítulo ou rota>",
      "details": [
        { "label": "Horário", "value": "08:30 às 11:45", "highlight": true },
        { "label": "Bagagem", "value": "1x 10kg mão" }
      ]
    }
  ],
  "rules": [
    {
      "title": "<Título da regra>",
      "description": "<Instrução clara e objetiva>",
      "badge": "<Tag curta, ex: 'Embarque', 'Condomínio', 'Garantia'>",
      "highlight": true
    }
  ],
  "emergencyContacts": [
    {
      "name": "<Nome do contato ou setor>",
      "category": "<Ex: 'Seguro Viagem 24h', 'Plantão Agência', 'Anfitrião', 'Guincho'>",
      "phone": "<Telefone com DDD>",
      "whatsapp": true,
      "is24h": true
    }
  ],
  "observations": "<Observações gerais relevantes do documento>",
  "financials": {
    "totalCents": 150000,
    "pixKey": "<chave pix se informada no documento>",
    "dueDate": "<YYYY-MM-DD se houver>",
    "installmentsCount": 1
  },
  "confidence": "high" | "medium" | "low"
}`;

    // 3. Monta o payload multimodal para a API do Gemini
    const contentsParts: Array<any> = [
      {
        text: `Analise cuidadosamente todos os documentos/páginas anexados. Extraia todas as pernas de viagem, itens de serviço, regras, contatos e datas estruturadas:`,
      },
    ];

    for (const f of files.slice(0, 5)) {
      contentsParts.push({
        inlineData: {
          mimeType: f.mimeType || "application/pdf",
          data: f.base64,
        },
      });
    }

    try {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey.rawKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: [{ parts: contentsParts }],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: "application/json",
            },
          }),
        },
      );

      if (!geminiRes.ok) {
        // Fallback gracioso com gemini-1.5-flash se 2.5 não responder
        const fallbackRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey.rawKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemInstruction }] },
              contents: [{ parts: contentsParts }],
              generationConfig: {
                temperature: 0.1,
                responseMimeType: "application/json",
              },
            }),
          },
        );

        if (!fallbackRes.ok) {
          const errText = await fallbackRes.text();
          await markKeyError(geminiKey.id, `OCR Gemini Multi: ${errText.slice(0, 150)}`);
          return buildGracefulFallback(nicheHint, "Não foi possível interpretar o documento visual.");
        }

        const resData = await fallbackRes.json();
        return parseGeminiResponse(resData, nicheHint);
      }

      const resData = await geminiRes.json();
      return parseGeminiResponse(resData, nicheHint);
    } catch (err: any) {
      await markKeyError(geminiKey.id, `OCR catch: ${err.message}`);
      return buildGracefulFallback(nicheHint, `Erro de processamento: ${err.message}`);
    }
  });

function parseGeminiResponse(resData: any, defaultNiche: CompanionCardNiche): UniversalOcrResult {
  const text = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    return buildGracefulFallback(defaultNiche, "IA não retornou dados textuais legíveis.");
  }

  try {
    const cleanJson = text
      .replace(/```json/gi, "")
      .replace(/```/gi, "")
      .trim();

    const parsed = JSON.parse(cleanJson);

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
      rawExtracted: parsed,
      confidence: parsed.confidence || "high",
    };
  } catch {
    return buildGracefulFallback(defaultNiche, "Falha ao processar o formato estruturado.");
  }
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
