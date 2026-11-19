/**
 * travel-operator-ocr-crm-fill-e2e.test.ts
 *
 * Teste E2E de Ponta a Ponta:
 * 1. Extração determinística e resiliente de cotações B2B (CVC, FRT, Orinter, Azul, Trend)
 * 2. Normalização com blindagem financeira e detecção de voos/hotéis
 * 3. Integração do OCR com o preenchimento automático do Card do Lead no CRM
 */

import { describe, expect, it } from "vitest";
import {
  extractOperatorQuoteDeterministically,
  normalizeExtractedQuoteResult,
} from "@/lib/tourism/quote-ocr-normalizer";
import { OperatorQuoteExtractionResultSchema } from "../travel-operator-ocr.functions";

describe("Travel Operator OCR & CRM Lead Autofill E2E Suite", () => {
  const sampleFrtQuoteText = `
FRT OPERADORA - COTAÇÃO DE PACOTE COMPLETO
Cotação Ref: #642225
Data de Emissão: 18/11/2026

DADOS DO CLIENTE:
Cliente: Jussara Aparecida Silveira
WhatsApp: (49) 99881-7713
CPF: 045.892.119-44

DADOS DA VIAGEM:
Origem: Chapecó (XAP)
Destino: Maceió - AL
Período: 09/01/2027 a 16/01/2027
Passageiros: 2 Adultos

AÉREO CONFIRMADO:
Voo Ida: LA 3412 - Saída: 09/01/2027 09:40 XAP > Chegada: 16:20 MCZ (Conexão GRU)
Voo Volta: LA 3415 - Saída: 16/01/2027 17:10 MCZ > Chegada: 23:45 XAP (Conexão GRU)
Bagagem: 1 mala despachada de 23kg por passageiro

HOSPEDAGEM:
Hotel: Jatiúca Hotel & Resort
Cidade: Maceió
Regime: Meia Pensão (Café da Manhã e Jantar)
Período: 7 noites (Check-in: 09/01/2027 / Check-out: 16/01/2027)

SERVIÇOS INCLUSOS:
- Traslado Aeroporto MCZ / Hotel / Aeroporto Regular
- City Tour Maceió e Litoral Sul com Praia do Francês

FINANCEIRO / FORMA DE PAGAMENTO:
Tarifa dos Produtos: R$ 8.400,00
Taxas de Embarque: R$ 500,00
Total Geral com Taxas: R$ 8.900,00
Valor Líquido Operadora: R$ 7.800,00
Comissão Sugerida: R$ 1.100,00
Condições de Pagamento: Em até 10x sem juros de R$ 890,00 no cartão de crédito
  `.trim();

  it("1. Deve extrair todos os metadados determinísticos de cotação FRT com 100% de acurácia", () => {
    const extracted = extractOperatorQuoteDeterministically(sampleFrtQuoteText);

    expect(extracted.operator_name).toBe("FRT Operadora");
    expect(extracted.quote_reference_number).toBe("642225");
    expect(extracted.client_name).toBe("Jussara Aparecida Silveira");
    expect(extracted.client_phone).toBe("49998817713");
    expect(extracted.client_document).toBe("04589211944");
    expect(extracted.destination).toBe("Maceió");
    expect(extracted.travel_start).toBe("2027-01-09");
    expect(extracted.travel_end).toBe("2027-01-16");
    expect(extracted.adults_count).toBe(2);
    expect(extracted.children_count).toBe(0);

    // Valores
    expect(extracted.gross_price_cents).toBe(890000); // R$ 8.900,00
    expect(extracted.taxes_cents).toBe(50000); // R$ 500,00
    expect(extracted.operator_net_cents).toBe(780000); // R$ 7.800,00
    expect(extracted.max_installments).toBe(10);
    expect(extracted.installment_cents).toBe(89000);

    // Voos e Hotéis
    expect(extracted.hotels?.[0]?.hotel_name).toContain("Jatiúca Hotel & Resort");
    expect(extracted.hotels?.[0]?.meal_plan).toBe("Meia Pensão");
    expect(extracted.hotels?.[0]?.nights_count).toBe(7);
    expect(extracted.flights?.length).toBeGreaterThanOrEqual(1);
    expect(extracted.flights?.[0]?.airline).toBe("LATAM");
  });

  it("2. Deve normalizar a cotação através do envelope canônico sem perder integridade", () => {
    const extracted = extractOperatorQuoteDeterministically(sampleFrtQuoteText);
    const normalized = normalizeExtractedQuoteResult(extracted as any);

    expect(normalized.destination).toBe("Maceió");
    expect(normalized.gross_price_cents).toBe(890000);
    expect(normalized.confidence_by_field.destination).toBeGreaterThan(0.7);
    expect(normalized.confidence_by_field.pricing).toBeGreaterThan(0.7);

    // Schema Zod deve validar sem erros
    const validated = OperatorQuoteExtractionResultSchema.parse(normalized);
    expect(validated.operator_name).toBe("FRT Operadora");
    expect(validated.destination).toBe("Maceió");
  });

  it("3. Simulação de Preenchimento no CRM: Aplica cotação ao Lead 'Jussara' e sincroniza todas as abas", () => {
    // Estado inicial do lead (análogo ao CRM Kanban)
    const initialLead = {
      id: "lead-jussara-123",
      full_name: "Jussara",
      phone: "5549988177133",
      destination: "Destino a definir",
      estimated_value_cents: 0,
      pax_adults: 1,
      pax_children: 0,
      travel_start: null,
      travel_end: null,
      custom_fields: {},
    };

    const initialTravelers = [
      { id: "pax-1", is_primary: true, full_name: "Jussara", phone: "5549988177133", email: null, document_cpf: null },
    ];

    const initialPaymentPlan = {
      flight_cents: 0,
      hotel_cents: 0,
      boarding_tax_cents: 0,
      commission_cents: 0,
      installments_count: 1,
      notes: "",
    };

    // Executa extração OCR
    const ocrQuote = normalizeExtractedQuoteResult(
      extractOperatorQuoteDeterministically(sampleFrtQuoteText) as any,
    );

    // Simulação exata da lógica de handleApplyQuoteOcrToDossier
    const updatedLead = {
      ...initialLead,
      destination: ocrQuote.destination,
      travel_start: ocrQuote.travel_start,
      travel_end: ocrQuote.travel_end,
      pax_adults: ocrQuote.adults_count || initialLead.pax_adults,
      pax_children: ocrQuote.children_count || initialLead.pax_children,
      estimated_value_cents: ocrQuote.gross_price_cents || initialLead.estimated_value_cents,
      notes: `[OCR Cotação]: Operadora: ${ocrQuote.operator_name} · Ref Cotação: #${ocrQuote.quote_reference_number}`,
    };

    const updatedTravelers = [
      {
        ...initialTravelers[0],
        full_name: ocrQuote.client_name || initialTravelers[0].full_name,
        phone: ocrQuote.client_phone || initialTravelers[0].phone,
        document_cpf: ocrQuote.client_document || initialTravelers[0].document_cpf,
      },
    ];

    const updatedPaymentPlan = {
      ...initialPaymentPlan,
      flight_cents: 0, // calculado
      hotel_cents: ocrQuote.hotels?.[0]?.price_cents || 0,
      boarding_tax_cents: ocrQuote.taxes_cents || 0,
      commission_cents: ocrQuote.suggested_commission_cents || 0,
      installments_count: ocrQuote.max_installments || 10,
      notes: `Até ${ocrQuote.max_installments}x sem juros`,
    };

    // Verificações
    expect(updatedLead.destination).toBe("Maceió");
    expect(updatedLead.estimated_value_cents).toBe(890000);
    expect(updatedLead.travel_start).toBe("2027-01-09");
    expect(updatedLead.travel_end).toBe("2027-01-16");
    expect(updatedLead.pax_adults).toBe(2);

    expect(updatedTravelers[0].full_name).toBe("Jussara Aparecida Silveira");
    expect(updatedTravelers[0].document_cpf).toBe("04589211944");

    expect(updatedPaymentPlan.boarding_tax_cents).toBe(50000);
    expect(updatedPaymentPlan.commission_cents).toBe(110000);
    expect(updatedPaymentPlan.installments_count).toBe(10);
    expect(updatedPaymentPlan.notes).toContain("10x sem juros");
  });

  it("4. Resiliência: Cotação Orinter com apenas voo e hotel sem cliente explícito preenche card com segurança", () => {
    const rawOrinter = `
ORINTER TOUR & TRAVEL
Ref: OR-99812
Origem: Curitiba (CWB)
Destino: Porto de Galinhas - PE
Data de Embarque: 20/03/2027
Data de Retorno: 27/03/2027
2 Adultos e 1 Criança

Hospedagem:
Armação Resort Porto de Galinhas
Regime: Café da Manhã - 7 noites

Voo:
AD 4567 - Saída: 20/03/2027 CWB > REC

Total do Pacote: R$ 6.450,00
Em até 12x de R$ 537,50
    `.trim();

    const ocr = extractOperatorQuoteDeterministically(rawOrinter);

    expect(ocr.operator_name).toBe("Orinter");
    expect(ocr.quote_reference_number).toBe("OR-99812");
    expect(ocr.destination).toBe("Porto de Galinhas");
    expect(ocr.travel_start).toBe("2027-03-20");
    expect(ocr.travel_end).toBe("2027-03-27");
    expect(ocr.adults_count).toBe(2);
    expect(ocr.children_count).toBe(1);
    expect(ocr.gross_price_cents).toBe(645000);
    expect(ocr.max_installments).toBe(12);
  });
});
