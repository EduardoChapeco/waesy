/**
 * travel-reviews.functions.ts — Classificador Tripartite de Avaliações & Agregação de Scores de Hotéis
 * Padrão BigTech | Zero Mocks | Tripartite: hotel_rating, destination_rating, agency_service_rating
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";
import { executeUnifiedAiCall } from "./api-orchestrator.functions";

export const SubmitHotelReviewSchema = z.object({
  globalHotelId: z.string().uuid(),
  comment: z.string().trim().min(5, "Comentário deve ter no mínimo 5 caracteres").max(2000),
  hotelRating: z.number().min(0).max(5).optional(),
  destinationRating: z.number().min(0).max(5).optional(),
  agencyServiceRating: z.number().min(0).max(5).optional(),
});

export type SubmitHotelReviewInput = z.infer<typeof SubmitHotelReviewSchema>;

export interface HotelReviewDTO {
  id: string;
  global_hotel_id: string;
  author_profile_id?: string | null;
  hotel_rating: number;
  destination_rating: number;
  agency_service_rating: number;
  comment: string;
  classifier_status: "needs_review" | "classified" | "rejected";
  created_at: string;
}

export interface HotelScoresAggregateDTO {
  global_hotel_id: string;
  hotel_score: number;
  destination_score: number;
  agency_service_score: number;
  reviews_count: number;
}

/**
 * Classifica e registra avaliação tripartite com agregação em tempo real em global_hotels.
 */
export const submitAndClassifyHotelReview = createServerFn({ method: "POST" })
  .validator(SubmitHotelReviewSchema)
  .handler(async ({ data }): Promise<{ success: boolean; reviewId: string; aggregate: HotelScoresAggregateDTO }> => {
    const identity = await getServerIdentity().catch(() => null);
    const supabase = getServerClient();

    // 1. Verificar se o hotel existe
    const { data: hotel, error: hotelErr } = await supabase
      .from("global_hotels")
      .select("id, name, city")
      .eq("id", data.globalHotelId)
      .maybeSingle();

    if (hotelErr || !hotel) {
      throw new Error("Hotel canônico não encontrado.");
    }

    let finalHotelRating = data.hotelRating;
    let finalDestRating = data.destinationRating;
    let finalAgencyRating = data.agencyServiceRating;

    // Se alguma nota não foi passada, calibra a classificação via IA
    if (
      finalHotelRating === undefined ||
      finalDestRating === undefined ||
      finalAgencyRating === undefined
    ) {
      try {
        const aiRes = await executeUnifiedAiCall({
          systemPrompt: `Você é um Classificador de Avaliações Turísticas Tripartite.
Sua missão é ler o comentário de um viajante sobre sua viagem/estadia e atribuir notas de 0.0 a 5.0 (com uma casa decimal) para três dimensões independentes:
1. "hotel_rating": avaliação da infraestrutura, quarto, limpeza, conforto e comida do hotel/resort (${hotel.name}).
2. "destination_rating": avaliação da cidade/destino turístico (${hotel.city}).
3. "agency_service_rating": avaliação do serviço da agência, atendimento e suporte.

Se o comentário não mencionar uma das dimensões, use 5.0 como nota neutra padrão.
Retorne ESTRITAMENTE um JSON:
{
  "hotel_rating": 4.5,
  "destination_rating": 5.0,
  "agency_service_rating": 4.0
}`,
          userPrompt: `Comentário: "${data.comment}"`,
          taskType: "fast_json",
          feature: "travel_reviews_classification",
          isSystemTask: true,
          ownerId: identity?.id || undefined,
          responseFormat: "json_object",
          expectJson: true,
          temperature: 0.1,
        });

        if (aiRes?.parsedJson) {
          const parsed = aiRes.parsedJson as Record<string, any>;
          if (finalHotelRating === undefined && typeof parsed.hotel_rating === "number") {
            finalHotelRating = Math.max(0, Math.min(5, Number(parsed.hotel_rating.toFixed(1))));
          }
          if (finalDestRating === undefined && typeof parsed.destination_rating === "number") {
            finalDestRating = Math.max(0, Math.min(5, Number(parsed.destination_rating.toFixed(1))));
          }
          if (finalAgencyRating === undefined && typeof parsed.agency_service_rating === "number") {
            finalAgencyRating = Math.max(0, Math.min(5, Number(parsed.agency_service_rating.toFixed(1))));
          }
        }
      } catch (err) {
        console.warn("[submitAndClassifyHotelReview] Classificador IA fallback:", err);
      }
    }

    // Fallback defensivo com base nas notas disponíveis
    finalHotelRating = finalHotelRating ?? 5.0;
    finalDestRating = finalDestRating ?? 5.0;
    finalAgencyRating = finalAgencyRating ?? 5.0;

    // 2. Inserir a review classificada
    const { data: inserted, error: insertErr } = await supabase
      .from("hotel_reviews")
      .insert({
        global_hotel_id: data.globalHotelId,
        author_profile_id: identity?.id || null,
        hotel_rating: finalHotelRating,
        destination_rating: finalDestRating,
        agency_service_rating: finalAgencyRating,
        comment: data.comment,
        classifier_status: "classified",
      })
      .select("id")
      .single();

    if (insertErr || !inserted) {
      throw new Error(`Falha ao registrar avaliação: ${insertErr?.message || "Erro desconhecido"}`);
    }

    // 3. Agregar notas no global_hotels
    const aggregate = await aggregateHotelScores(data.globalHotelId);

    return {
      success: true,
      reviewId: inserted.id,
      aggregate,
    };
  });

/**
 * Função para recomputar e persistir os scores agregados de um hotel canônico.
 */
export async function aggregateHotelScores(globalHotelId: string): Promise<HotelScoresAggregateDTO> {
  const supabase = getServerClient();

  const { data: reviews, error } = await supabase
    .from("hotel_reviews")
    .select("hotel_rating, destination_rating, agency_service_rating")
    .eq("global_hotel_id", globalHotelId)
    .eq("classifier_status", "classified");

  if (error || !reviews || reviews.length === 0) {
    return {
      global_hotel_id: globalHotelId,
      hotel_score: 0,
      destination_score: 0,
      agency_service_score: 0,
      reviews_count: 0,
    };
  }

  const count = reviews.length;
  const sumHotel = reviews.reduce((acc, r) => acc + (Number(r.hotel_rating) || 0), 0);
  const sumDest = reviews.reduce((acc, r) => acc + (Number(r.destination_rating) || 0), 0);
  const sumAgency = reviews.reduce((acc, r) => acc + (Number(r.agency_service_rating) || 0), 0);

  const hotelScore = Number((sumHotel / count).toFixed(2));
  const destScore = Number((sumDest / count).toFixed(2));
  const agencyScore = Number((sumAgency / count).toFixed(2));

  await supabase
    .from("global_hotels")
    .update({
      hotel_score: hotelScore,
      destination_score: destScore,
      agency_service_score: agencyScore,
      reviews_count: count,
      updated_at: new Date().toISOString(),
    })
    .eq("id", globalHotelId);

  return {
    global_hotel_id: globalHotelId,
    hotel_score: hotelScore,
    destination_score: destScore,
    agency_service_score: agencyScore,
    reviews_count: count,
  };
}

export const getHotelReviewsAndScores = createServerFn({ method: "GET" })
  .validator(z.object({ globalHotelId: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ reviews: HotelReviewDTO[]; scores: HotelScoresAggregateDTO | null }> => {
    const supabase = getServerClient();

    const [reviewsRes, hotelRes] = await Promise.all([
      supabase
        .from("hotel_reviews")
        .select("id, global_hotel_id, author_profile_id, hotel_rating, destination_rating, agency_service_rating, comment, classifier_status, created_at")
        .eq("global_hotel_id", data.globalHotelId)
        .eq("classifier_status", "classified")
        .order("created_at", { ascending: false }),
      supabase
        .from("global_hotels")
        .select("id, hotel_score, destination_score, agency_service_score, reviews_count")
        .eq("id", data.globalHotelId)
        .maybeSingle(),
    ]);

    const reviews = (reviewsRes.data || []) as HotelReviewDTO[];
    const scores: HotelScoresAggregateDTO | null = hotelRes.data
      ? {
          global_hotel_id: hotelRes.data.id,
          hotel_score: Number(hotelRes.data.hotel_score || 0),
          destination_score: Number(hotelRes.data.destination_score || 0),
          agency_service_score: Number(hotelRes.data.agency_service_score || 0),
          reviews_count: Number(hotelRes.data.reviews_count || 0),
        }
      : null;

    return { reviews, scores };
  });
