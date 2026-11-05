/**
 * travel-operator-ocr.functions.ts — Motor BFF de Extração por Visão Computacional / OCR
 * para Cotações de Operadoras de Viagem B2B e Carnês/Boletos Bancários
 * Padrão BigTech | Zero Mocks | Multi-Provedor com Failover Automático
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { executeUnifiedAiCall } from "./api-orchestrator.functions";
import { extractDocumentMechanically } from "./mechanical-document-extractor.server";

// ─── CONTRATOS DE DADOS DE COTAÇÃO DE OPERADORA B2B ─────────────────────────

export const OperatorFlightItemSchema = z.object({
  airline: z.string().optional(),
  airline_name: z.string().optional(),
  flight_number: z.string().optional(),
  origin_iata: z.string().optional(),
  origin_city: z.string().optional(),
  destination_iata: z.string().optional(),
  destination_city: z.string().optional(),
  departure_time: z.string().optional(),
  arrival_time: z.string().optional(),
  date: z.string().optional(),
  departure_date: z.string().optional(),
  baggage: z.string().optional(),
  baggage_included: z.string().optional(),
  connections_count: z.number().int().optional(),
  stops_count: z.number().int().optional(),
});

export const OperatorHotelItemSchema = z.object({
  hotel_name: z.string().optional().default("Hotel a definir"),
  city: z.string().optional().nullable(),
  room_category: z.string().optional().nullable(),
  meal_plan: z.string().optional().nullable(),
  checkin_date: z.string().optional().nullable(),
  checkout_date: z.string().optional().nullable(),
  nights_count: z.coerce.number().optional().nullable(),
  stars: z.coerce.number().optional().nullable(),
  address: z.string().optional().nullable(),
  price_cents: z.coerce.number().optional().nullable(),
});

export const OperatorQuoteExtractionResultSchema = z.object({
  client_name: z.string().optional().nullable(),
  client_phone: z.string().optional().nullable(),
  client_email: z.string().optional().nullable(),
  client_document: z.string().optional().nullable(),
  operator_name: z.string().optional().nullable(),
  quote_reference_number: z.string().optional().nullable(),
  destination: z.string().optional().default("Destino a definir"),
  travel_start: z.string().optional().nullable(),
  travel_end: z.string().optional().nullable(),
  adults_count: z.coerce.number().int().optional().nullable(),
  children_count: z.coerce.number().int().optional().nullable(),
  flights: z.array(OperatorFlightItemSchema).optional().nullable(),
  hotels: z.array(OperatorHotelItemSchema).optional().nullable(),
  transfers: z.array(z.string()).optional().nullable(),
  tours: z.array(z.string()).optional().nullable(),
  inclusions: z.array(z.string()).optional().nullable(),
  exclusions: z.array(z.string()).optional().nullable(),
  gross_price_cents: z.coerce.number().int().optional().nullable(),
  operator_net_cents: z.coerce.number().int().optional().nullable(),
  suggested_commission_cents: z.coerce.number().int().optional().nullable(),
  max_installments: z.coerce.number().int().optional().nullable(),
  installment_cents: z.coerce.number().int().optional().nullable(),
  currency: z.string().optional().nullable(),
  cancellation_rules: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
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
1. Identifique o passageiro titular / cliente se constar no documento (client_name, client_phone).
2. Identifique a operadora emitente (ex: 'Orinter', 'Trend Viagens', 'CVC', 'Visual Turismo', 'FRT', 'Incomum').
3. Identifique o Destino principal (ex: 'Maceió - AL', 'Cancún - México', 'Gramado - RS').
4. Extraia os voos com precisão:
   - Cia aérea (GOL, LATAM, Azul, TAP, Copa, etc.)
   - Número do voo, origem (IATA e cidade), destino (IATA e cidade)
   - Datas e horários de partida/chegada
   - Bagagem inclusa (se mala despachada 23kg ou apenas mão 10kg)
5. Extraia os hotéis/resorts:
   - Nome do hotel
   - Categoria do quarto (Standard, Luxo, Suíte Vista Mar)
   - Regime de alimentação (Café da Manhã, Meia Pensão, All Inclusive)
   - Datas de check-in e check-out
6. Extraia traslados e passeios inclusos.
7. Extraia a composição financeira:
   - Preço bruto total da venda (gross_price_cents, em centavos)
   - Preço líquido do operador (operator_net_cents, valor pago à operadora)
   - A comissão estimada da agência (gross_price_cents - operator_net_cents)
   - Quantidade de parcelas (ex: 10x, 12x) e valor de cada parcela em centavos
   - Se os valores estiverem em reais com vírgula (ex: R$ 5.480,00), multiplique por 100 para centavos (548000).

Retorne ESTRITAMENTE um JSON compatível com o schema OperatorQuoteExtractionResult:
{
  "client_name": "Simone Costa",
  "client_phone": "499988456758",
  "operator_name": "Orinter",
  "quote_reference_number": "OR-98412",
  "destination": "Maceió - AL",
  "travel_start": "2027-01-09",
  "travel_end": "2027-01-14",
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
      "date": "2027-01-09",
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
      "checkin_date": "2027-01-09",
      "checkout_date": "2027-01-14",
      "nights_count": 5,
      "stars": 5
    }
  ],
  "transfers": ["Traslado Aeroporto de Maceió / Hotel / Aeroporto Regular"],
  "tours": ["City tour em Maceió com Praia do Francês"],
  "inclusions": ["Passagem aérea ida e volta", "5 noites de hospedagem com Meia Pensão", "Traslados in/out", "Seguro viagem GTA"],
  "exclusions": ["Despesas pessoais", "Bebidas nas refeições", "Passeios opcionais"],
  "gross_price_cents": 890000,
  "operator_net_cents": 780000,
  "suggested_commission_cents": 110000,
  "max_installments": 10,
  "installment_cents": 89000,
  "currency": "BRL"
}`;

    let extractedMechanicalText = "";
    if (data.fileBase64) {
      try {
        const mech = await extractDocumentMechanically({
          base64: data.fileBase64,
          mimeType: data.fileMime || "application/pdf",
          name: data.fileName,
        });
        if (mech && mech.text && mech.text.trim().length >= 40) {
          extractedMechanicalText = mech.text.trim();
        }
      } catch (mechErr) {
        console.warn("[travel-operator-ocr] Extração mecânica indisponível:", mechErr);
      }
    }

    const hasRawTextOnly = Boolean(data.rawText?.trim() && !data.fileBase64);
    const hasFile = Boolean(data.fileBase64);

    let userPrompt = "";
    if (hasRawTextOnly) {
      userPrompt = `Analise o seguinte texto estruturado de cotação/orçamento da operadora (${data.fileName || "cotação"}) e extraia todos os dados no formato JSON:\n\n${data.rawText!.trim().slice(0, 30000)}`;
    } else {
      userPrompt = `Analise o documento anexo de cotação/proposta da operadora (${data.fileName || "cotação"}) e extraia todos os dados estruturados no formato JSON.${
        extractedMechanicalText ? `\n\nTexto auxiliar pré-extraído do arquivo:\n${extractedMechanicalText.slice(0, 15000)}` : ""
      }`;
    }

    const aiResponse = await executeUnifiedAiCall({
      preferredProvider: hasRawTextOnly ? "groq" : "gemini",
      feature: "ocr_operator_quote",
      systemPrompt,
      userPrompt,
      fileBase64: hasFile ? data.fileBase64 : undefined,
      fileMime: hasFile ? (data.fileMime || "application/pdf") : undefined,
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

    // Normalização defensiva pré-validação (Blindagem contra formatações mistas de IA)
    if (rawJson && typeof rawJson === "object") {
      const parseCents = (val: any): number | undefined => {
        if (val === null || val === undefined) return undefined;
        if (typeof val === "number") {
          if (!Number.isFinite(val)) return undefined;
          if (val === 0) return 0;
          if (!Number.isInteger(val)) return Math.round(val * 100);
          return val > 50000 ? Math.round(val) : Math.round(val * 100);
        }
        if (typeof val === "string") {
          const cleaned = val.replace(/[^\d.,]/g, "").trim();
          if (!cleaned) return undefined;
          if (cleaned.includes(",")) {
            const num = parseFloat(cleaned.replace(/\./g, "").replace(",", "."));
            return isNaN(num) ? undefined : Math.round(num * 100);
          }
          if (cleaned.includes(".") && cleaned.split(".")[1]?.length === 2) {
            const num = parseFloat(cleaned);
            return isNaN(num) ? undefined : Math.round(num * 100);
          }
          const num = parseInt(cleaned, 10);
          return isNaN(num) ? undefined : (num > 50000 ? num : num * 100);
        }
        return undefined;
      };

      const extractPriceField = (keys: string[]): number | undefined => {
        for (const k of keys) {
          if (rawJson[k] !== undefined && rawJson[k] !== null) {
            const parsed = parseCents(rawJson[k]);
            if (parsed !== undefined) return parsed;
          }
        }
        const containers = [rawJson.pricing, rawJson.financials, rawJson.valores, rawJson.financeiro, rawJson.totais];
        for (const c of containers) {
          if (c && typeof c === "object") {
            for (const k of keys) {
              if (c[k] !== undefined && c[k] !== null) {
                const parsed = parseCents(c[k]);
                if (parsed !== undefined) return parsed;
              }
            }
          }
        }
        return undefined;
      };

      rawJson.gross_price_cents = extractPriceField([
        "gross_price_cents",
        "gross_price",
        "total_price_cents",
        "total_price",
        "total_cents",
        "total",
        "valor_total",
        "total_value_cents",
        "total_value",
        "price",
        "preco",
        "tarifa_total",
        "total_geral",
      ]);

      rawJson.operator_net_cents = extractPriceField([
        "operator_net_cents",
        "operator_net",
        "net_price_cents",
        "net_price",
        "valor_liquido",
        "net_cost_cents",
        "net_cost",
        "custo_operadora",
        "liquido",
      ]);

      rawJson.suggested_commission_cents = extractPriceField([
        "suggested_commission_cents",
        "commission_cents",
        "commission",
        "comissao",
        "over_cents",
        "over",
        "margem",
      ]);

      rawJson.client_name = rawJson.client_name || rawJson.client || rawJson.cliente || rawJson.passageiro || rawJson.titular || rawJson.passenger_name;
      rawJson.client_phone = rawJson.client_phone || rawJson.phone || rawJson.telefone || rawJson.whatsapp || rawJson.celular;
      rawJson.client_email = rawJson.client_email || rawJson.email;
      rawJson.client_document = rawJson.client_document || rawJson.cpf || rawJson.document || rawJson.documento || rawJson.passaporte;
      rawJson.operator_name = rawJson.operator_name || rawJson.operator || rawJson.operadora || rawJson.fornecedor;
      rawJson.destination = rawJson.destination || rawJson.cidade_destino || rawJson.destino;
      rawJson.travel_start = rawJson.travel_start || rawJson.start_date || rawJson.data_ida || rawJson.checkin;
      rawJson.travel_end = rawJson.travel_end || rawJson.end_date || rawJson.data_volta || rawJson.checkout;
      rawJson.adults_count = rawJson.adults_count || rawJson.adults || rawJson.adultos || rawJson.pax_adults;
      rawJson.children_count = rawJson.children_count ?? rawJson.children ?? rawJson.criancas ?? rawJson.pax_children;
      rawJson.max_installments = rawJson.max_installments || rawJson.installments || rawJson.parcelas || rawJson.num_parcelas;

      if (Array.isArray(rawJson.hotels)) {
        rawJson.hotels = rawJson.hotels.map((h: any) => ({
          hotel_name: h.hotel_name || h.name || h.hotel || h.nome || "Hotel a definir",
          city: h.city || h.cidade,
          room_category: h.room_category || h.quarto || h.categoria || h.apartamento,
          meal_plan: h.meal_plan || h.regime || h.alimentacao || h.board_basis,
          checkin_date: h.checkin_date || h.checkin || h.entrada,
          checkout_date: h.checkout_date || h.checkout || h.saida,
          nights_count: h.nights_count ? Number(h.nights_count) : undefined,
          stars: h.stars ? Number(h.stars) : undefined,
          address: h.address || h.endereco,
          price_cents: parseCents(h.price_cents || h.price || h.valor || h.preco || h.total),
        }));
      } else if (rawJson.hotel && typeof rawJson.hotel === "object") {
        rawJson.hotels = [{
          hotel_name: rawJson.hotel.hotel_name || rawJson.hotel.name || "Hotel a definir",
          city: rawJson.hotel.city,
          room_category: rawJson.hotel.room_category,
          meal_plan: rawJson.hotel.meal_plan,
          checkin_date: rawJson.hotel.checkin_date,
          checkout_date: rawJson.hotel.checkout_date,
          price_cents: parseCents(rawJson.hotel.price_cents || rawJson.hotel.price || rawJson.hotel.valor),
        }];
      }

      if (Array.isArray(rawJson.flights)) {
        rawJson.flights = rawJson.flights.map((f: any) => ({
          airline: f.airline || f.airline_name || f.cia || f.companhia,
          airline_name: f.airline_name || f.airline || f.cia || f.companhia,
          flight_number: f.flight_number || f.numero_voo || f.flight || f.voo,
          origin_iata: f.origin_iata || f.origin || f.origem,
          origin_city: f.origin_city || f.cidade_origem,
          destination_iata: f.destination_iata || f.destination || f.destino,
          destination_city: f.destination_city || f.cidade_destino,
          departure_time: f.departure_time || f.horario_partida || f.saida || f.embarque,
          arrival_time: f.arrival_time || f.horario_chegada || f.chegada || f.pouso,
          date: f.date || f.departure_date || f.data,
          departure_date: f.departure_date || f.date || f.data,
          baggage: f.baggage || f.bagagem || f.baggage_included,
          baggage_included: f.baggage_included || f.baggage || f.bagagem,
          connections_count: f.connections_count ?? f.stops_count ?? f.conexoes ?? f.stops,
          stops_count: f.stops_count ?? f.connections_count ?? f.conexoes ?? f.stops,
        }));
      } else if (rawJson.flight && typeof rawJson.flight === "object") {
        rawJson.flights = [{
          airline: rawJson.flight.airline || rawJson.flight.airline_name,
          airline_name: rawJson.flight.airline_name || rawJson.flight.airline,
          flight_number: rawJson.flight.flight_number,
          origin_iata: rawJson.flight.origin_iata || rawJson.flight.origin,
          destination_iata: rawJson.flight.destination_iata || rawJson.flight.destination,
          departure_time: rawJson.flight.departure_time,
          arrival_time: rawJson.flight.arrival_time,
          date: rawJson.flight.date || rawJson.flight.departure_date,
          departure_date: rawJson.flight.departure_date || rawJson.flight.date,
        }];
      }

      if (!rawJson.destination || rawJson.destination === "Destino a definir") {
        rawJson.destination = rawJson.hotels?.[0]?.city || rawJson.flights?.[0]?.destination_city || rawJson.destino || "Destino a definir";
      }
    }

    const validated = OperatorQuoteExtractionResultSchema.parse(rawJson);

    // Persistência no Banco Histórico Perpétuo de Preços (travel_price_observations)
    // Tabela imutável para identificação futura de temperatura, padrões tarifários e sazonalidade
    try {
      const { getServerClient } = await import("@/lib/supabase");
      const supabase = getServerClient();
      if (validated.gross_price_cents && validated.destination) {
        const routeFingerprint = `${(validated.operator_name || "operadora").toLowerCase()}:${validated.destination.toLowerCase().replace(/\s+/g, "-")}`;
        const travelStartDate = validated.travel_start || new Date().toISOString().slice(0, 10);
        await supabase.from("travel_price_observations").insert({
          product_type: "package",
          route_fingerprint: routeFingerprint,
          travel_start_date: travelStartDate,
          travel_end_date: validated.travel_end || null,
          advance_days: 30,
          provider_code: (validated.operator_name || "operadora_b2b").toLowerCase(),
          fare_family: validated.cancellation_rules ? "flexivel" : "padrao",
          price_cents: validated.gross_price_cents,
          currency: validated.currency || "BRL",
          search_context_hash: `ocr:${Date.now()}:${validated.quote_reference_number || "quote"}`,
          availability_state: "available",
        });
      }
    } catch {
      // Falha de persistência analítica é tolerada defensivamente
    }

    return {
      success: true,
      data: validated,
    };
  });

// ─── CONTRATOS DE DADOS DE CARNÊS E BOLETOS BANCÁRIOS ───────────────────────

export const BoletoInstallmentItemSchema = z.object({
  installment_number: z.number().int().optional(),
  total_installments: z.number().int().optional(),
  due_date: z.string(), // YYYY-MM-DD
  amount_cents: z.number().int().positive(),
  digitable_line: z.string().optional(),
  barcode: z.string().optional(),
  bank_name: z.string().optional(),
  beneficiary_name: z.string().optional(),
  beneficiary_document: z.string().optional(),
  status: z.enum(["pending", "paid", "overdue"]).optional(),
});

export const BoletoExtractionResultSchema = z.object({
  beneficiary_name: z.string().optional(),
  beneficiary_document: z.string().optional(),
  payer_name: z.string().optional(),
  total_amount_cents: z.number().int().optional(),
  total_installments: z.number().int().optional(),
  currency: z.string().optional(),
  installments: z.array(BoletoInstallmentItemSchema).optional(),
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
    const sanitizedData: BoletoExtractionResult = {
      ...validated,
      installments: (validated.installments || []).map((inst) => ({
        ...inst,
        digitable_line: inst.digitable_line ? inst.digitable_line.replace(/\D/g, "") : undefined,
        barcode: inst.barcode ? inst.barcode.replace(/\D/g, "") : undefined,
      })),
    };

    return {
      success: true,
      data: sanitizedData,
    };
  });
