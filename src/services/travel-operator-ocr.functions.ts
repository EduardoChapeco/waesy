/**
 * travel-operator-ocr.functions.ts — Motor BFF de Extração por Visão Computacional / OCR
 * para Cotações de Operadoras de Viagem B2B e Carnês/Boletos Bancários
 * Padrão BigTech | Zero Mocks | Multi-Provedor com Failover Automático
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { executeUnifiedAiCall } from "./api-orchestrator.functions";

// ─── CONTRATOS DE DADOS DE COTAÇÃO DE OPERADORA B2B ─────────────────────────

export const OperatorFlightItemSchema = z.object({
  airline: z.string().optional().default("Aérea"),
  flight_number: z.string().optional(),
  origin_iata: z.string().optional(),
  origin_city: z.string().optional(),
  destination_iata: z.string().optional(),
  destination_city: z.string().optional(),
  departure_time: z.string().optional(),
  arrival_time: z.string().optional(),
  date: z.string().optional(),
  baggage: z.string().optional().default("Mala de mão 10kg inclusa"),
  connections_count: z.number().int().default(0),
});

export const OperatorHotelItemSchema = z.object({
  hotel_name: z.string(),
  city: z.string().optional(),
  room_category: z.string().optional().default("Standard"),
  meal_plan: z.string().optional().default("Café da Manhã"),
  checkin_date: z.string().optional(),
  checkout_date: z.string().optional(),
  nights_count: z.number().int().default(1),
  stars: z.number().optional().default(4),
  address: z.string().optional(),
});

export const OperatorQuoteExtractionResultSchema = z.object({
  operator_name: z.string().default("Operadora B2B"),
  quote_reference_number: z.string().optional(),
  destination: z.string(),
  travel_start: z.string().optional().nullable(),
  travel_end: z.string().optional().nullable(),
  adults_count: z.number().int().default(2),
  children_count: z.number().int().default(0),
  flights: z.array(OperatorFlightItemSchema).default([]),
  hotels: z.array(OperatorHotelItemSchema).default([]),
  transfers: z.array(z.string()).default([]),
  tours: z.array(z.string()).default([]),
  inclusions: z.array(z.string()).default([]),
  exclusions: z.array(z.string()).default([]),
  gross_price_cents: z.number().int().default(0),
  operator_net_cents: z.number().int().default(0),
  suggested_commission_cents: z.number().int().default(0),
  max_installments: z.number().int().default(10),
  installment_cents: z.number().int().default(0),
  currency: z.string().default("BRL"),
  cancellation_rules: z.string().optional(),
  notes: z.string().optional(),
});

export type OperatorQuoteExtractionResult = z.infer<typeof OperatorQuoteExtractionResultSchema>;

// ─── 1. EXTRAÇÃO DE COTAÇÃO DE OPERADORA (PDF / IMAGEM / TEXTO) ─────────────

export const ProcessOperatorQuoteInputSchema = z.object({
  fileBase64: z.string().optional(),
  fileMime: z.string().optional(),
  fileName: z.string().optional(),
  rawText: z.string().optional(),
  storeId: z.string().optional(),
});

export const processOperatorQuoteOcr = createServerFn({ method: "POST" })
  .validator(ProcessOperatorQuoteInputSchema)
  .handler(async ({ data }): Promise<{ success: boolean; data: OperatorQuoteExtractionResult }> => {
    const systemPrompt = `Você é o Agente Especialista de OCR e Cotações B2B de Turismo da Waesy.
Sua missão é ler documentos, PDFs, vouchers ou prints de sistemas de operadoras de viagem (ex: CVC Corp, Orinter, Trend, Visual Turismo, E-HTL, Azul Viagens, RexturAdvance, Decolar B2B) e extrair os dados estruturados da cotação.

DIRETRIZES FUNDAMENTAIS (ZERO ALUCINAÇÃO):
1. Identifique a operadora emitente (ex: 'Orinter', 'Trend Viagens', 'CVC', 'Visual').
2. Identifique o Destino principal (ex: 'Maceió - AL', 'Cancún - México', 'Gramado - RS').
3. Extraia os voos com precisão:
   - Cia aérea (GOL, LATAM, Azul, TAP, Copa, etc.)
   - Número do voo, origem (IATA e cidade), destino (IATA e cidade)
   - Datas e horários de partida/chegada
   - Bagagem inclusa (se mala despachada 23kg ou apenas mão 10kg)
4. Extraia os hotéis/resorts:
   - Nome do hotel
   - Categoria do quarto (Standard, Luxo, Suíte Vista Mar)
   - Regime de alimentação (Café da Manhã, Meia Pensão, All Inclusive)
   - Datas de check-in e check-out
5. Extraia traslados e passeios inclusos.
6. Extraia a composição financeira:
   - Preço bruto total da venda (gross_price_cents, em centavos)
   - Preço líquido do operador (operator_net_cents, valor pago à operadora)
   - A comissão estimada da agência (gross_price_cents - operator_net_cents)
   - Quantidade de parcelas (ex: 10x, 12x) e valor de cada parcela em centavos
   - Se os valores estiverem em reais com vírgula (ex: R$ 5.480,00), multiplique por 100 para centavos (548000).

Retorne ESTRITAMENTE um JSON compatível com o schema OperatorQuoteExtractionResult:
{
  "operator_name": "Orinter",
  "quote_reference_number": "OR-98412",
  "destination": "Maceió - AL",
  "travel_start": "2026-10-15",
  "travel_end": "2026-10-22",
  "adults_count": 2,
  "children_count": 0,
  "flights": [
    {
      "airline": "LATAM",
      "flight_number": "LA3412",
      "origin_iata": "XAP",
      "origin_city": "Chapecó",
      "destination_iata": "MCZ",
      "destination_city": "Maceió",
      "departure_time": "09:40",
      "arrival_time": "16:20",
      "date": "2026-10-15",
      "baggage": "1 mala de 23kg inclusa",
      "connections_count": 1
    }
  ],
  "hotels": [
    {
      "hotel_name": "Jatiúca Hotel & Resort",
      "city": "Maceió",
      "room_category": "Superior Jardim",
      "meal_plan": "Meia Pensão (Café + Jantar)",
      "checkin_date": "2026-10-15",
      "checkout_date": "2026-10-22",
      "nights_count": 7,
      "stars": 5
    }
  ],
  "transfers": ["Traslado Aeroporto de Maceió / Hotel / Aeroporto Regular"],
  "tours": ["City tour em Maceió com Praia do Francês"],
  "inclusions": ["Passagem aérea ida e volta", "7 noites de hospedagem com Meia Pensão", "Traslados in/out", "Seguro viagem GTA"],
  "exclusions": ["Despesas pessoais", "Bebidas nas refeições", "Passeios opcionais"],
  "gross_price_cents": 890000,
  "operator_net_cents": 780000,
  "suggested_commission_cents": 110000,
  "max_installments": 10,
  "installment_cents": 89000,
  "currency": "BRL"
}`;

    const userPrompt = data.fileBase64
      ? `Analise este arquivo anexo de cotação da operadora (${data.fileName || "cotacao"}) e extraia todos os dados estruturados no formato JSON.`
      : `Analise o seguinte texto bruto copiado do sistema da operadora e extraia todos os dados estruturados no formato JSON:\n\n${data.rawText || ""}`;

    const aiResponse = await executeUnifiedAiCall({
      preferredProvider: "gemini",
      feature: "ocr_operator_quote",
      systemPrompt,
      userPrompt,
      fileBase64: data.fileBase64,
      fileMime: data.fileMime || "application/pdf",
      responseFormat: "json_object",
      temperature: 0.1,
    });

    let rawJson: any;
    try {
      rawJson = JSON.parse(aiResponse.text);
    } catch {
      const match = aiResponse.text.match(/\{[\s\S]*\}/);
      if (match) {
        rawJson = JSON.parse(match[0]);
      } else {
        throw new Error("Não foi possível decodificar os dados retornados pela IA.");
      }
    }

    const validated = OperatorQuoteExtractionResultSchema.parse({
      ...rawJson,
      destination: rawJson.destination || "Destino a Definir",
    });

    return {
      success: true,
      data: validated,
    };
  });

// ─── CONTRATOS DE DADOS DE CARNÊS E BOLETOS BANCÁRIOS ───────────────────────

export const BoletoInstallmentItemSchema = z.object({
  installment_number: z.number().int().default(1),
  total_installments: z.number().int().default(1),
  due_date: z.string(), // YYYY-MM-DD
  amount_cents: z.number().int().positive(),
  digitable_line: z.string().optional().default(""),
  barcode: z.string().optional().default(""),
  bank_name: z.string().optional().default("Banco"),
  beneficiary_name: z.string().optional(),
  beneficiary_document: z.string().optional(),
  status: z.enum(["pending", "paid", "overdue"]).default("pending"),
});

export const BoletoExtractionResultSchema = z.object({
  beneficiary_name: z.string().default("Agência de Viagens"),
  beneficiary_document: z.string().optional(),
  payer_name: z.string().optional(),
  total_amount_cents: z.number().int().default(0),
  total_installments: z.number().int().default(1),
  currency: z.string().default("BRL"),
  installments: z.array(BoletoInstallmentItemSchema).default([]),
  raw_notes: z.string().optional(),
});

export type BoletoExtractionResult = z.infer<typeof BoletoExtractionResultSchema>;

// ─── 2. EXTRAÇÃO EM LOTE DE CARNÊS / BOLETOS BANCÁRIOS ───────────────────────

export const ProcessBoletoInputSchema = z.object({
  fileBase64: z.string().optional(),
  fileMime: z.string().optional(),
  fileName: z.string().optional(),
  rawText: z.string().optional(),
  storeId: z.string().optional(),
});

export const processBoletoOcr = createServerFn({ method: "POST" })
  .validator(ProcessBoletoInputSchema)
  .handler(async ({ data }): Promise<{ success: boolean; data: BoletoExtractionResult }> => {
    const systemPrompt = `Você é o Agente Especialista de OCR Financeiro e Conciliação Bancária da Waesy.
Sua missão é analisar arquivos PDF ou imagens de carnês de viagem, boletos bancários únicos ou múltiplos boletos parcelados (Santander, Itaú, Bradesco, Banco do Brasil, Sicoob, Sicredi, Safra, Koin, etc.) e extrair todas as parcelas estruturadas.

DIRETRIZES FUNDAMENTAIS:
1. Identifique o pagador (nome do cliente/viajante) e o beneficiário.
2. Identifique cada parcela individual contida no documento:
   - Número da parcela e total (ex: Parcela 01 de 10 -> installment_number: 1, total_installments: 10).
   - Data de vencimento em formato ISO (YYYY-MM-DD).
   - Valor do documento em centavos (ex: R$ 450,00 -> 45000).
   - Linha digitável (sequência de 47 ou 48 dígitos numéricos, sem pontos ou espaços se possível).
   - Código de barras (44 dígitos numéricos, se legível).
   - Nome do banco emissor.
3. Calcule o total geral de todas as parcelas em centavos.

Retorne ESTRITAMENTE um JSON compatível com o schema BoletoExtractionResult:
{
  "beneficiary_name": "Waesy Turismo / CVC",
  "beneficiary_document": "12.345.678/0001-90",
  "payer_name": "João da Silva",
  "total_amount_cents": 450000,
  "total_installments": 10,
  "currency": "BRL",
  "installments": [
    {
      "installment_number": 1,
      "total_installments": 10,
      "due_date": "2026-11-10",
      "amount_cents": 45000,
      "digitable_line": "03399000000000000000000000000000000000000000000",
      "barcode": "03391234567890123456789012345678901234567890",
      "bank_name": "Banco Santander",
      "status": "pending"
    }
  ]
}`;

    const userPrompt = data.fileBase64
      ? `Analise este documento de carnê/boleto (${data.fileName || "carnê"}) e extraia todas as parcelas estruturadas no formato JSON.`
      : `Analise o texto do boleto e extraia as informações no formato JSON:\n\n${data.rawText || ""}`;

    const aiResponse = await executeUnifiedAiCall({
      preferredProvider: "gemini",
      feature: "ocr_boleto",
      systemPrompt,
      userPrompt,
      fileBase64: data.fileBase64,
      fileMime: data.fileMime || "application/pdf",
      responseFormat: "json_object",
      temperature: 0.1,
    });

    let rawJson: any;
    try {
      rawJson = JSON.parse(aiResponse.text);
    } catch {
      const match = aiResponse.text.match(/\{[\s\S]*\}/);
      if (match) {
        rawJson = JSON.parse(match[0]);
      } else {
        throw new Error("Não foi possível decodificar os dados do boleto.");
      }
    }

    const validated = BoletoExtractionResultSchema.parse(rawJson);

    return {
      success: true,
      data: validated,
    };
  });
