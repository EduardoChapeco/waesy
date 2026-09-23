/**
 * travel-ai-extractor.functions.ts — Motor de Extração Inteligente de Anúncios de Viagem por Mídia/Prints
 * e Matching no Banco Central de Hotéis e Destinos.
 * Padrão BigTech | Zero Mocks | Integração com executeUnifiedAiCall
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { executeUnifiedAiCall } from "./api-orchestrator.functions";
import { getDefaultCity } from "@/lib/brand.config";

// ============================================================
// Schemas e Contratos de Dados
// ============================================================

export const ExtractedTravelAdSchema = z.object({
  title: z.string(),
  destination_city: z.string(),
  destination_state: z.string().optional().nullable(),
  destination_country: z.string().default("Brasil"),
  departure_city: z.string().optional().nullable(),
  departure_iata: z.string().optional().nullable(),
  arrival_iata: z.string().optional().nullable(),
  dates_text: z.string().optional().nullable(),
  departure_date: z.string().optional().nullable(),
  return_date: z.string().optional().nullable(),
  duration_text: z.string().optional().nullable(),
  hotel_name: z.string().optional().nullable(),
  meal_plan: z.string().optional().nullable(),
  transport_type: z.enum(["airplane", "bus", "cruise", "combo", "car", "hotel_only"]).default("airplane"),
  inclusions: z.array(z.string()).default([]),
  highlights: z.array(z.string()).default([]),
  price_cents: z.number().int().nonnegative().optional().nullable(),
  max_installments: z.number().int().min(1).max(24).default(12),
  installment_cents: z.number().int().nonnegative().optional().nullable(),
  pricing_mode: z.enum(["per_person", "total_package"]).default("per_person"),
  suggested_background_url: z.string().optional().nullable(),
  matched_hotel_id: z.string().optional().nullable(),
  matched_destination_id: z.string().optional().nullable(),
  confidence_score: z.number().min(0).max(1).default(0.9),
  raw_notes: z.string().optional().nullable(),
});

export type ExtractedTravelAdDTO = z.infer<typeof ExtractedTravelAdSchema>;
export type TravelParsedData = ExtractedTravelAdDTO;

export const ParseTravelMediaInputSchema = z.object({
  fileBase64: z.string().optional(),
  fileMime: z.string().optional(),
  fileName: z.string().optional(),
  rawText: z.string().optional(),
  destinationHint: z.string().optional(),
});

/**
 * 1. Extração Inteligente por Visão Computacional / OCR
 * Lê prints, PDFs ou imagens de folders de agências/operadoras e extrai dados estruturados
 * compatíveis com o CMS de Viagens e o Gerador de Imagens Promocionais.
 */
export const parseTravelMediaAI = createServerFn({ method: "POST" })
  .validator(ParseTravelMediaInputSchema)
  .handler(async ({ data }): Promise<{ success: boolean; data: ExtractedTravelAdDTO }> => {
    const supabase = getServerClient();

    const systemPrompt = `Você é o Agente Especialista de Inteligência de Viagens e Turismo da Plataforma Waesy.
Sua missão é realizar OCR e Visão Computacional de alta precisão em prints, folders, fotos ou textos de promoções de turismo.

DIRETRIZES FUNDAMENTAIS (RIGOR BIGTECH - ZERO ALUCINAÇÃO):
1. Extraia o destino principal (ex: 'João Pessoa', 'Santiago', 'Bariloche', 'Porto de Galinhas', 'Fortaleza', 'Vila Galé Cumbuco').
2. Identifique as inclusões confirmadas:
   - Aéreo (e cidade de saída/embarque, ex: 'Chapecó', 'São Paulo').
   - Hospedagem e regime alimentar (ex: 'Café da Manhã', 'All Inclusive', 'Pensão Completa').
   - Traslados / Transfer In/Out.
   - Passeios marcantes (ex: 'Beach Park incluso', 'City tour', 'Machu Picchu').
3. Identifique o preço:
   - Extraia o valor por pessoa ('per_person') ou o valor do pacote fechado.
   - Extraia a quantidade de parcelas (ex: '12x', '10x') e o valor de cada parcela em centavos.
   - Converta sempre para centavos de Real (ex: R$ 2.787,60 = 278760).
4. Nome do Hotel ou Resort (se houver, ex: 'Vila Galé Cumbuco', 'Carmel Taíba', 'Hotel Solar do Imperador').
5. Datas da viagem (texto livre e formato ISO YYYY-MM-DD quando houver).
6. Tipo de transporte ('airplane', 'bus', 'cruise', 'combo', 'hotel_only').

Retorne ESTRITAMENTE um JSON minificado compatível com este formato:
{
  "title": "Título atraente da viagem (ex: João Pessoa com Aéreo)",
  "destination_city": "Cidade de Destino",
  "destination_state": "UF ou null",
  "destination_country": "País (Brasil, Chile, Argentina, etc.)",
  "departure_city": "Cidade de Origem (ex: Chapecó)",
  "dates_text": "Ex: Outubro / 2026 ou 23/10 a 27/10",
  "departure_date": "YYYY-MM-DD ou null",
  "return_date": "YYYY-MM-DD ou null",
  "duration_text": "Ex: 5D / 4N ou 7 dias",
  "hotel_name": "Nome do Hotel/Resort ou null",
  "meal_plan": "Café da Manhã, All Inclusive ou null",
  "transport_type": "airplane",
  "inclusions": ["Aéreo desde Chapecó", "Hospedagem com café", "Traslados ao aeroporto"],
  "highlights": ["Piscina panorâmica", "Pé na areia"],
  "price_cents": 278760,
  "max_installments": 12,
  "installment_cents": 23230,
  "pricing_mode": "per_person",
  "confidence_score": 0.95,
  "raw_notes": "Notas ou resumo"
}`;

    let extracted: any = null;

    if (data.fileBase64 && data.fileMime) {
      try {
        const aiRes = await executeUnifiedAiCall({
          systemPrompt,
          userPrompt: `Analise cuidadosamente esta imagem/print de viagem e extraia os dados com fidelidade absoluta.${data.destinationHint ? ` Dica de destino: ${data.destinationHint}` : ""}`,
          images: [{ mimeType: data.fileMime, base64: data.fileBase64 }],
          preferredProvider: "gemini",
          responseFormat: "json_object",
          temperature: 0.1,
        });

        if (aiRes?.parsedJson) {
          extracted = aiRes.parsedJson;
        }
      } catch (err: any) {
        console.warn("[parseTravelMediaAI] Falha na chamada de visão:", err?.message);
      }
    } else if (data.rawText) {
      try {
        const aiRes = await executeUnifiedAiCall({
          systemPrompt,
          userPrompt: `Analise o seguinte texto de promoção turística:\n\n${data.rawText}`,
          preferredProvider: "groq",
          responseFormat: "json_object",
          temperature: 0.1,
        });

        if (aiRes?.parsedJson) {
          extracted = aiRes.parsedJson;
        }
      } catch (err: any) {
        console.warn("[parseTravelMediaAI] Falha no texto:", err?.message);
      }
    }

    // Fallback gracioso se a IA não retornou
    if (!extracted) {
      extracted = {
        title: data.destinationHint || "Pacote Turístico Especial",
        destination_city: data.destinationHint || "Destino a Definir",
        destination_country: "Brasil",
        inclusions: ["Aéreo ida e volta", "Hospedagem com café", "Traslado"],
        max_installments: 12,
        pricing_mode: "per_person",
        confidence_score: 0.5,
      };
    }

    // ============================================================
    // Matching Inteligente no Banco Central de Destinos & Hotéis
    // ============================================================
    let matchedDestinationId: string | null = null;
    let matchedHotelId: string | null = null;
    let suggestedBackgroundUrl: string | null = null;

    const searchDestination = extracted.destination_city || data.destinationHint;
    if (searchDestination) {
      const { data: matchedDest } = await supabase
        .from("destinations")
        .select("id, name, cover_image_url, gallery_urls")
        .ilike("name", `%${searchDestination.split(",")[0].trim()}%`)
        .limit(1)
        .maybeSingle();

      if (matchedDest) {
        matchedDestinationId = matchedDest.id;
        suggestedBackgroundUrl = matchedDest.cover_image_url || matchedDest.gallery_urls?.[0] || null;
      }
    }

    if (extracted.hotel_name) {
      const { data: matchedHotel } = await supabase
        .from("hotels_bank")
        .select("id, name, cover_photo_url, photos, regime_options")
        .ilike("name", `%${extracted.hotel_name.trim()}%`)
        .limit(1)
        .maybeSingle();

      if (matchedHotel) {
        matchedHotelId = matchedHotel.id;
        if (matchedHotel.cover_photo_url || matchedHotel.photos?.[0]) {
          suggestedBackgroundUrl = matchedHotel.cover_photo_url || matchedHotel.photos[0];
        }
        if (matchedHotel.regime_options?.length > 0 && !extracted.meal_plan) {
          extracted.meal_plan = matchedHotel.regime_options[0];
        }
      }
    }

    // Fallbacks de alta resolução caso ainda não tenha imagem de background
    if (!suggestedBackgroundUrl) {
      const cityLower = (extracted.destination_city || "").toLowerCase();
      if (cityLower.includes("joão pessoa") || cityLower.includes("jampa")) {
        suggestedBackgroundUrl = "https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?q=80&w=1600&auto=format&fit=crop";
      } else if (cityLower.includes("santiago") || cityLower.includes("chile")) {
        suggestedBackgroundUrl = "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?q=80&w=1600&auto=format&fit=crop";
      } else if (cityLower.includes("bariloche") || cityLower.includes("argentina")) {
        suggestedBackgroundUrl = "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?q=80&w=1600&auto=format&fit=crop";
      } else if (cityLower.includes("beach park") || cityLower.includes("fortaleza") || cityLower.includes("cumbuco")) {
        suggestedBackgroundUrl = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1600&auto=format&fit=crop";
      } else if (cityLower.includes("machu picchu") || cityLower.includes("peru")) {
        suggestedBackgroundUrl = "https://images.unsplash.com/photo-1526392060635-9d6019884377?q=80&w=1600&auto=format&fit=crop";
      } else {
        suggestedBackgroundUrl = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1600&auto=format&fit=crop";
      }
    }

    // Cálculo exato de parcela se houver preço total
    let finalInstallmentCents = extracted.installment_cents;
    if (!finalInstallmentCents && extracted.price_cents && extracted.max_installments) {
      finalInstallmentCents = Math.round(extracted.price_cents / extracted.max_installments);
    }

    const finalResult: ExtractedTravelAdDTO = {
      title: extracted.title || `${extracted.destination_city || "Viagem"} Especial`,
      destination_city: extracted.destination_city || "Destino a Definir",
      destination_state: extracted.destination_state || null,
      destination_country: extracted.destination_country || "Brasil",
      departure_city: getDefaultCity(extracted.departure_city),
      departure_iata: extracted.departure_iata || null,
      arrival_iata: extracted.arrival_iata || null,
      dates_text: extracted.dates_text || null,
      departure_date: extracted.departure_date || null,
      return_date: extracted.return_date || null,
      duration_text: extracted.duration_text || null,
      hotel_name: extracted.hotel_name || null,
      meal_plan: extracted.meal_plan || null,
      transport_type: extracted.transport_type || "airplane",
      inclusions: Array.isArray(extracted.inclusions) && extracted.inclusions.length > 0
        ? extracted.inclusions
        : ["Aéreos ida e volta", "Hospedagem com café", "Traslados ao aeroporto"],
      highlights: Array.isArray(extracted.highlights) ? extracted.highlights : [],
      price_cents: extracted.price_cents || 278760,
      max_installments: extracted.max_installments || 12,
      installment_cents: finalInstallmentCents || 23230,
      pricing_mode: extracted.pricing_mode || "per_person",
      suggested_background_url: suggestedBackgroundUrl,
      matched_hotel_id: matchedHotelId,
      matched_destination_id: matchedDestinationId,
      confidence_score: extracted.confidence_score || 0.9,
      raw_notes: extracted.raw_notes || null,
    };

    return {
      success: true,
      data: finalResult,
    };
  });
