/**
 * travel-operator-ocr.functions.ts — Motor BFF de Extração por Visão Computacional / OCR
 * para Cotações de Operadoras de Viagem B2B e Carnês/Boletos Bancários
 * Padrão BigTech | Zero Mocks | Multi-Provedor com Failover Automático
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { executeUnifiedAiCall } from "./api-orchestrator.functions";
import { extractDocumentMechanically } from "./mechanical-document-extractor.server";
import {
  extractOperatorQuoteDeterministically,
  normalizeExtractedQuoteResult,
  parseMoneyToCents,
} from "@/lib/tourism/quote-ocr-normalizer";

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
  cabin_class: z.string().optional(),
  duration: z.string().optional(),
  connection_wait: z.string().optional(),
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

export const OperatorTransferItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  title: z.string().optional(),
  kind: z.string().optional(),
  type: z.string().optional(),
  route_name: z.string().optional(),
  route: z.string().optional(),
  vehicle: z.string().optional(),
  vehicle_type: z.string().optional(),
  is_private: z.boolean().optional(),
  date: z.string().optional(),
  included: z.boolean().optional(),
  price_cents: z.coerce.number().optional().default(0),
  notes: z.string().optional(),
});

export const OperatorTourItemSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  description: z.string().optional().default(""),
  date: z.string().optional(),
  duration: z.string().optional(),
  included: z.boolean().optional().default(true),
  is_included: z.boolean().optional().default(true),
  price_cents: z.coerce.number().optional().default(0),
  notes: z.string().optional(),
});

export const OperatorQuoteExtractionResultSchema = z.object({
  client_name: z.string().optional().nullable(),
  client_phone: z.string().optional().nullable(),
  client_email: z.string().optional().nullable(),
  client_document: z.string().optional().nullable(),
  operator_name: z.string().optional().nullable(),
  quote_reference_number: z.string().optional().nullable(),
  origin: z.string().optional().nullable(),
  destination: z.string().optional().default("Destino a definir"),
  travel_start: z.string().optional().nullable(),
  travel_end: z.string().optional().nullable(),
  adults_count: z.coerce.number().int().optional().nullable(),
  children_count: z.coerce.number().int().optional().nullable(),
  infants_count: z.coerce.number().int().optional().nullable(),
  children_ages: z.array(z.coerce.number().int()).optional().nullable(),
  flights: z.array(OperatorFlightItemSchema).optional().nullable(),
  hotels: z.array(OperatorHotelItemSchema).optional().nullable(),
  transfers: z.array(z.union([z.string(), OperatorTransferItemSchema])).optional().nullable(),
  tours: z.array(z.union([z.string(), OperatorTourItemSchema])).optional().nullable(),
  inclusions: z.array(z.string()).optional().nullable(),
  exclusions: z.array(z.string()).optional().nullable(),
  taxes_cents: z.coerce.number().int().optional().nullable(),
  products_subtotal_cents: z.coerce.number().int().optional().nullable(),
  gross_price_cents: z.coerce.number().int().optional().nullable(),
  operator_net_cents: z.coerce.number().int().optional().nullable(),
  suggested_commission_cents: z.coerce.number().int().optional().nullable(),
  max_installments: z.coerce.number().int().optional().nullable(),
  installment_cents: z.coerce.number().int().optional().nullable(),
  has_downpayment: z.boolean().optional().nullable(),
  downpayment_pct: z.coerce.number().optional().nullable(),
  downpayment_cents: z.coerce.number().int().optional().nullable(),
  first_installment_due: z.string().optional().nullable(),
  pix_discount_pct: z.coerce.number().optional().nullable(),
  card_installments: z.coerce.number().int().optional().nullable(),
  boleto_installments: z.coerce.number().int().optional().nullable(),
  currency: z.string().optional().nullable(),
  cancellation_rules: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  raw_itinerary_lines: z.array(z.string()).optional().nullable(),
  confidence_by_field: z.record(z.string(), z.number()).optional().nullable(),
  review_flags: z.array(z.string()).optional().nullable(),
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
1. Identifique o passageiro titular / cliente se constar no documento (client_name, client_phone, client_email, client_document).
2. Identifique a operadora emitente (ex: 'Orinter', 'Trend Viagens', 'CVC', 'Visual Turismo', 'FRT', 'Incomum', 'Azul Viagens').
3. Identifique a Origem (origin: cidade e/ou aeroporto IATA, ex: 'Chapecó (XAP)', 'Curitiba (CWB)', 'São Paulo (GRU)').
4. Identifique o Destino principal (destination: apenas o nome do destino/cidade/região, ex: 'Maceió', 'Cancún', 'Gramado'). NUNCA inclua frases ou observações longas no destino.
5. Extraia as datas exatas no formato YYYY-MM-DD:
   - travel_start: Data de início/embarque/check-in
   - travel_end: Data de retorno/desembarque/check-out
6. Extraia a composição de passageiros:
   - adults_count: Quantidade de adultos
   - children_count: Quantidade de crianças
   - children_ages: Array de números com as idades das crianças (ex: [4, 8])
7. Extraia os voos com precisão:
   - Cia aérea (GOL, LATAM, Azul, TAP, Copa, etc.)
   - Número do voo, origem (IATA e cidade), destino (IATA e cidade)
   - Datas e horários de partida/chegada
   - Bagagem inclusa (se mala despachada 23kg ou apenas mão 10kg)
8. Extraia TODOS os hotéis/resorts listados (mesmo que haja 2 ou 3 hospedagens na mesma viagem, cada uma com suas datas de check-in/check-out, cidade, categoria do quarto, regime e price_cents individual).
9. Extraia TODOS os traslados/serviços terrestres como objetos individuais (NUNCA descarte nenhum trecho ou serviço adicional como Cadeirinha para Crianças, Transfer 4x4 ou Intermunicipal):
   - "name": nome completo descritivo do traslado/serviço (ex: "Transfer Aeroporto Fortaleza / Hotel", "Transfer Fortaleza / Jericoacoara 4x4", "Serviço Cadeirinha para Crianças").
   - "kind": "arrival" | "departure" | "round_trip" | "intercity" | "service" | "bus".
   - "vehicle_type": tipo real do veículo ("Veículo 4x4", "Van Executiva", "Transfer Regular", "Ônibus Leito DD", etc.).
   - "is_private": boolean.
   - "date": YYYY-MM-DD se houver data.
   - "price_cents": valor individual em centavos (ex: BRL 243,06 -> 24306). Se um traslado tiver "+ Passeio City Tour ...", separe o passeio também no array "tours"!
10. Extraia TODOS os passeios, ingressos e experiências listados em "tours" como objetos estruturados (title, date em YYYY-MM-DD se informada, duration se houver, included: true, price_cents em centavos).
11. Se o documento contiver roteiro dia a dia descrito ("Dia 1...", "Dia 2..."), capture cada linha em "raw_itinerary_lines".
12. Extraia a composição financeira completa (todos valores em centavos inteiros: R$ 243,06 -> 24306; R$ 10.491,33 -> 1049133):
   - products_subtotal_cents (Tarifa/Produtos), taxes_cents (Impostos e taxas), gross_price_cents (Total com taxas),
   - operator_net_cents (valor líquido operadora se houver), suggested_commission_cents,
   - has_downpayment, downpayment_pct, downpayment_cents, first_installment_due, max_installments, card_installments, boleto_installments, pix_discount_pct.

Retorne ESTRITAMENTE um JSON compatível com o schema OperatorQuoteExtractionResult:
{
  "client_name": "Simone Costa",
  "client_phone": "499988456758",
  "operator_name": "FRT",
  "quote_reference_number": "642225",
  "destination": "Maceió - AL",
  "travel_start": "2027-01-09",
  "travel_end": "2027-01-14",
  "adults_count": 2,
  "children_count": 0,
  "infants_count": 0,
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
      "baggage": "1x Mala de mão 10kg + 1x Despachada 23kg",
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
      "stars": 5,
      "price_cents": 450000
    }
  ],
  "transfers": [
    {
      "name": "Traslado Aeroporto / Hotel / Aeroporto Regular",
      "kind": "round_trip",
      "vehicle_type": "Transfer Regular",
      "is_private": false,
      "price_cents": 24306
    }
  ],
  "tours": [
    {
      "title": "City Tour em Maceió",
      "date": "2027-01-10",
      "included": true,
      "price_cents": 15000
    }
  ],
  "inclusions": ["Passagem aérea ida e volta", "5 noites de hospedagem com Meia Pensão", "Traslados in/out"],
  "exclusions": ["Despesas pessoais", "Passeios opcionais não listados"],
  "products_subtotal_cents": 840000,
  "taxes_cents": 50000,
  "gross_price_cents": 890000,
  "operator_net_cents": 780000,
  "suggested_commission_cents": 110000,
  "max_installments": 10,
  "installment_cents": 89000,
  "currency": "BRL"
}`;

    const cleanB64 = data.fileBase64
      ? (data.fileBase64.includes(",") ? data.fileBase64.split(",")[1].trim() : data.fileBase64.trim())
      : undefined;

    let extractedMechanicalText = "";
    let effectiveBase64 = cleanB64;
    let effectiveMime = data.fileMime || "application/pdf";

    if (cleanB64) {
      try {
        const mech = await extractDocumentMechanically({
          base64: cleanB64,
          mimeType: effectiveMime,
          name: data.fileName,
        });
        if (mech && mech.text && mech.text.trim().length >= 40) {
          extractedMechanicalText = mech.text.trim();
        }
        if (mech && mech.imageBase64) {
          effectiveBase64 = mech.imageBase64;
          effectiveMime = mech.imageMime || "image/jpeg";
        }
      } catch (mechErr) {
        console.warn("[travel-operator-ocr] Extração mecânica indisponível:", mechErr);
      }
    }

    const effectiveText = (data.rawText?.trim() || "") || extractedMechanicalText;
    const deterministicBase = effectiveText.length >= 20 ? extractOperatorQuoteDeterministically(effectiveText) : {};

    const hasRawTextOnly = Boolean(data.rawText?.trim() && !cleanB64);
    const hasFile = Boolean(effectiveBase64);

    let userPrompt = "";
    if (hasRawTextOnly) {
      userPrompt = `Analise o seguinte texto estruturado de cotação/orçamento da operadora (${data.fileName || "cotação"}) e extraia todos os dados no formato JSON:\n\n${data.rawText!.trim().slice(0, 30000)}`;
    } else {
      userPrompt = `Analise o documento anexo de cotação/proposta da operadora (${data.fileName || "cotação"}) e extraia todos os dados estruturados no formato JSON.${
        extractedMechanicalText ? `\n\nTexto auxiliar pré-extraído do arquivo:\n${extractedMechanicalText.slice(0, 15000)}` : ""
      }`;
    }

    let rawJson: any = null;

    // Estratégia Otimizada: Se já possuímos texto mecânico decodificado do PDF (>= 80 caracteres) ou texto puro,
    // priorizamos Groq em modo texto (sub-segundo). Se for imagem/scan ou falhar, recorremos a Gemini/Anthropic multimodal.
    const hasRichExtractedText = (hasRawTextOnly || (extractedMechanicalText && extractedMechanicalText.length >= 80));

    if (hasRichExtractedText) {
      try {
        const textPayloadPrompt = `Analise o seguinte texto estruturado da cotação/orçamento da operadora (${data.fileName || "cotação"}) e extraia todos os dados no formato JSON:\n\n${(data.rawText?.trim() || extractedMechanicalText).slice(0, 30000)}`;
        const textAiResponse = await executeUnifiedAiCall({
          preferredProvider: "groq",
          feature: "ocr_operator_quote_fast_text",
          storeId: data.storeId || undefined,
          systemPrompt,
          userPrompt: textPayloadPrompt,
          responseFormat: "json_object",
          temperature: 0.1,
        });

        try {
          rawJson = JSON.parse(textAiResponse.text);
        } catch {
          const match = textAiResponse.text.match(/\{[\s\S]*\}/);
          if (match) {
            rawJson = JSON.parse(match[0]);
          }
        }
      } catch (fastTextErr) {
        console.warn("[travel-operator-ocr] Extração rápida via texto Groq falhou, tentando multimodal:", fastTextErr);
      }
    }

    // Tentativa Multimodal: se ainda não obteve resultado e há arquivo presente
    if (!rawJson && hasFile) {
      try {
        const aiResponse = await executeUnifiedAiCall({
          preferredProvider: "gemini",
          feature: "ocr_operator_quote_multimodal",
          storeId: data.storeId || undefined,
          systemPrompt,
          userPrompt,
          fileBase64: effectiveBase64,
          fileMime: effectiveMime,
          responseFormat: "json_object",
          temperature: 0.1,
        });

        try {
          rawJson = JSON.parse(aiResponse.text);
        } catch {
          const match = aiResponse.text.match(/\{[\s\S]*\}/);
          if (match) {
            rawJson = JSON.parse(match[0]);
          }
        }
      } catch (aiErr) {
        console.warn("[travel-operator-ocr] Chamada IA multimodal falhou:", aiErr);
      }
    }

    // Tentativa 3: Se ambas as IAs falharam (offline/chaves indisponíveis), recorre ao extrator determinístico nativo
    if (!rawJson) {
      if (effectiveText && effectiveText.length >= 20) {
        rawJson = { ...deterministicBase };
      } else {
        throw new Error("Não foi possível decodificar os dados do documento. Tente outro arquivo ou use o modo Colar Texto.");
      }
    } else if (deterministicBase && typeof deterministicBase === "object") {
      // Mesclagem defensiva: preenche campos omitidos pela IA com a extração determinística
      for (const [k, v] of Object.entries(deterministicBase)) {
        if (v !== undefined && v !== null && (rawJson[k] === undefined || rawJson[k] === null || rawJson[k] === "")) {
          rawJson[k] = v;
        }
      }
    }

    // Normalização defensiva pré-validação (Blindagem contra formatações mistas de IA)
    if (rawJson && typeof rawJson === "object") {
      const parseCents = (val: any, keyIsCents = false): number | undefined =>
        parseMoneyToCents(val, { keyIsCents });

      const extractPriceField = (keys: string[]): number | undefined => {
        for (const k of keys) {
          if (rawJson[k] !== undefined && rawJson[k] !== null) {
            const parsed = parseCents(rawJson[k], k.endsWith("_cents"));
            if (parsed !== undefined) return parsed;
          }
        }
        const containers = [rawJson.pricing, rawJson.financials, rawJson.valores, rawJson.financeiro, rawJson.totais];
        for (const c of containers) {
          if (c && typeof c === "object") {
            for (const k of keys) {
              if (c[k] !== undefined && c[k] !== null) {
                const parsed = parseCents(c[k], k.endsWith("_cents"));
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
      rawJson.origin = rawJson.origin || rawJson.origem || rawJson.cidade_origem || rawJson.origin_city || rawJson.origin_iata;
      rawJson.destination = rawJson.destination || rawJson.cidade_destino || rawJson.destino;
      rawJson.travel_start = rawJson.travel_start || rawJson.start_date || rawJson.data_ida || rawJson.checkin;
      rawJson.travel_end = rawJson.travel_end || rawJson.end_date || rawJson.data_volta || rawJson.checkout;
      rawJson.adults_count = rawJson.adults_count || rawJson.adults || rawJson.adultos || rawJson.pax_adults;
      rawJson.children_count = rawJson.children_count ?? rawJson.children ?? rawJson.criancas ?? rawJson.pax_children;
      rawJson.children_ages = Array.isArray(rawJson.children_ages)
        ? rawJson.children_ages.map(Number).filter((n: any) => !isNaN(n))
        : (Array.isArray(rawJson.idades_criancas)
          ? rawJson.idades_criancas.map(Number).filter((n: any) => !isNaN(n))
          : undefined);
      rawJson.max_installments = rawJson.max_installments || rawJson.installments || rawJson.parcelas || rawJson.num_parcelas;
      rawJson.card_installments = rawJson.card_installments || rawJson.parcelas_cartao || rawJson.max_installments;
      rawJson.boleto_installments = rawJson.boleto_installments || rawJson.parcelas_boleto || rawJson.max_installments;
      rawJson.has_downpayment = typeof rawJson.has_downpayment === "boolean"
        ? rawJson.has_downpayment
        : (typeof rawJson.com_entrada === "boolean"
          ? rawJson.com_entrada
          : (rawJson.downpayment_pct || rawJson.entrada_pct || rawJson.downpayment_cents || rawJson.entrada_valor
            ? true
            : (rawJson.sem_entrada ? false : undefined)));
      rawJson.downpayment_pct = rawJson.downpayment_pct !== undefined
        ? Number(rawJson.downpayment_pct)
        : (rawJson.entrada_pct !== undefined ? Number(rawJson.entrada_pct) : undefined);
      rawJson.downpayment_cents = extractPriceField([
        "downpayment_cents",
        "downpayment",
        "entrada",
        "valor_entrada",
        "entrada_cents",
      ]);
      rawJson.first_installment_due = rawJson.first_installment_due || rawJson.vencimento_primeiro_boleto || rawJson.primeiro_vencimento || rawJson.primeiro_boleto;
      rawJson.pix_discount_pct = rawJson.pix_discount_pct !== undefined
        ? Number(rawJson.pix_discount_pct)
        : (rawJson.desconto_pix !== undefined ? Number(rawJson.desconto_pix) : undefined);

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
          price_cents:
            parseCents(h.price_cents, true) ??
            parseCents(h.price || h.valor || h.preco || h.total, false),
        }));
      } else if (rawJson.hotel && typeof rawJson.hotel === "object") {
        rawJson.hotels = [{
          hotel_name: rawJson.hotel.hotel_name || rawJson.hotel.name || "Hotel a definir",
          city: rawJson.hotel.city,
          room_category: rawJson.hotel.room_category,
          meal_plan: rawJson.hotel.meal_plan,
          checkin_date: rawJson.hotel.checkin_date,
          checkout_date: rawJson.hotel.checkout_date,
          price_cents:
            parseCents(rawJson.hotel.price_cents, true) ??
            parseCents(rawJson.hotel.price || rawJson.hotel.valor, false),
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

      rawJson.taxes_cents = extractPriceField(["taxes_cents", "impostos_taxas", "taxas", "taxes"]);
      rawJson.products_subtotal_cents = extractPriceField(["products_subtotal_cents", "produtos", "tarifa", "subtotal_cents"]);
      rawJson.infants_count = rawJson.infants_count ?? rawJson.infants ?? rawJson.bebes;

      rawJson = normalizeExtractedQuoteResult(rawJson);
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
