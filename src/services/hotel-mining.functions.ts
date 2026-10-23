/**
 * hotel-mining.functions.ts — Motor de Mineração, Scraping & Estruturação Canônica de Hotéis e Destinos
 * Padrão BigTech | Zero Mocks | Integração com executeUnifiedAiCall & Coordenadas Reais
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { requireStaff } from "@/lib/server-access";
import { enforceRateLimit } from "@/lib/rate-limiter";
import { executeUnifiedAiCall } from "./api-orchestrator.functions";
import { normalizeHotelName } from "@/lib/data/hotels-resorts-catalog";
import type { HotelRoomCategory, HotelPolicies, HotelStructure, HotelBankDTO } from "./travel-catalog.functions";

// ─── SCHEMAS DE VALIDAÇÃO ───────────────────────────────────────────────────

export const MineHotelInputSchema = z
  .object({
    url: z.string().url("URL inválida.").optional().or(z.literal("")),
    rawText: z.string().max(100_000, "Texto excede limite de 100.000 caracteres.").optional(),
    hotelNameHint: z.string().optional(),
    destinationHint: z.string().optional(),
    autoSaveToBank: z.boolean().default(false),
  })
  .refine((data) => Boolean(data.url || data.rawText?.trim()), {
    message: "Informe ao menos a URL oficial ou o texto do hotel para mineração.",
  });

export const MinedHotelStructuredSchema = z.object({
  name: z.string(),
  city: z.string(),
  state: z.string().default("SC"),
  country: z.string().default("Brasil"),
  stars: z.number().int().min(1).max(5).default(4),
  regime_options: z.array(z.string()).default(["Café da Manhã"]),
  description: z.string().default(""),
  bio_bullets: z.array(z.string()).default([]),
  badges: z.array(z.string()).default([]),
  address: z.string().optional().nullable(),
  airport_distance: z.string().optional().nullable(),
  google_maps_url: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  internal_rating: z.number().default(4.8),
  policies: z.object({
    check_in_time: z.string().default("15:00"),
    check_out_time: z.string().default("12:00"),
    children_policy: z.string().default("Consulte a política para crianças"),
    pet_friendly: z.boolean().default(false),
    pet_policy: z.string().optional().nullable(),
    cancellation_policy: z.string().default("Consulte condições de cancelamento"),
    voltage: z.string().default("220V"),
    accessibility_pcd: z.boolean().default(true),
    smoking_policy: z.string().default("100% não fumante nas acomodações"),
  }),
  structure: z.object({
    pools_count: z.number().int().default(1),
    beach_setup: z.string().default("Consulte serviço de praia"),
    kids_club: z.boolean().default(false),
    kids_club_details: z.string().optional().nullable(),
    spa: z.boolean().default(false),
    spa_brand: z.string().optional().nullable(),
    gym: z.boolean().default(true),
    sports: z.array(z.string()).default([]),
    restaurants: z
      .array(
        z.object({
          name: z.string(),
          cuisine: z.string(),
          regime: z.string().default("Incluso"),
        }),
      )
      .default([]),
  }),
  room_categories: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        description: z.string().default(""),
        capacity_adults: z.number().int().default(2),
        capacity_children: z.number().int().default(1),
        max_guests: z.number().int().default(3),
        bedding: z.string().default("1 Cama Casal"),
        size_m2: z.number().int().default(28),
        daily_rate_reference_cents: z.number().int().default(0),
        amenities: z.array(z.string()).default([]),
        cover_photo_url: z.string().optional().nullable(),
        photos: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  nearby_attractions: z
    .array(
      z.object({
        name: z.string(),
        category: z.string().default("Praia"),
        distance_km: z.number().default(1.0),
      }),
    )
    .default([]),
  confidence_score: z.number().min(0).max(1).default(0.9),
});

export type MinedHotelStructuredDTO = z.infer<typeof MinedHotelStructuredSchema>;

// ─── 1. MINERAÇÃO ESTRUTURADA DE HOTEL / RESORT ─────────────────────────────

export const mineHotelStructuredData = createServerFn({ method: "POST" })
  .validator(MineHotelInputSchema)
  .handler(async ({ data }): Promise<{ success: boolean; hotel: MinedHotelStructuredDTO; saved_id?: string }> => {
    const identity = await requireStaff();
    enforceRateLimit(`${identity.store_id}:${identity.id}`, "ai_generation");
    const db = getServerClient();

    let textToAnalyze = data.rawText?.trim() || "";

    // Se tiver URL e não tiver texto bruto, busca conteúdo via leitor seguro
    if (!textToAnalyze && data.url) {
      try {
        const response = await fetch(data.url, {
          headers: { "User-Agent": "WaesyBot-TravelCrawler/1.0" },
        });
        if (response.ok) {
          const html = await response.text();
          // Remove scripts e tags pesadas
          textToAnalyze = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .slice(0, 30_000);
        }
      } catch (err: any) {
        console.warn("[mineHotelStructuredData] Falha ao raspar URL direta, prosseguindo com metadados:", err?.message);
      }
    }

    const systemPrompt = `Você é o Agente Especialista de Mineração e Curadoria Hoteleira da Plataforma Waesy.
Sua missão é extrair dados ESTRUTURADOS e 100% FIÉIS para o Banco Central Canônico de Hotéis, Resorts e Pousadas.

DIRETRIZES DE EXTRAÇÃO RIGOROSA (PADRÃO BIGTECH - ZERO ALUCINAÇÃO):
1. Identifique o nome oficial exato do estabelecimento (ex: "Salinas do Maragogi All Inclusive Resort", "Nannai Muro Alto Resort & Spa").
2. Identifique a localização: Cidade, Estado (UF), País, endereço completo e distância aproximada de aeroportos.
3. Regimes alimentares suportados (All Inclusive, Café da Manhã, Meia Pensão, Pensão Completa).
4. Políticas detalhadas:
   - Horários de Check-in e Check-out (ex: "15:00" e "12:00").
   - Política de crianças (idade máxima cortesia, limite de gratuidade).
   - Pet friendly (true/false) e regras.
   - Cancelamento e voltagem elétrica.
5. Estrutura de lazer e complexo:
   - Número de piscinas ou complexo aquático.
   - Pé na areia / praia (true/false) e serviço de praia.
   - Kids club (idade de monitores).
   - Spa (marca/bandeira).
   - Restaurantes temáticos (nome, especialidade).
6. Categorias de Acomodação (Quartos):
   - Nome do quarto (ex: "Suíte Luxo Frente Mar", "Apartamento Standard").
   - Metragem em m², configuração de camas, capacidade máxima de adultos e crianças.
   - Comodidades do quarto (Ar condicionado, Varanda com rede, Máquina de café, Banheira).
7. Atrações e praias próximas com distância estimada em km.

Retorne ESTRITAMENTE um JSON compatível com o schema MinedHotelStructuredSchema.`;

    const userPrompt = `Analise o seguinte conteúdo sobre o estabelecimento hoteleiro${data.hotelNameHint ? ` ("${data.hotelNameHint}")` : ""}${data.destinationHint ? ` em "${data.destinationHint}"` : ""}:

${textToAnalyze.slice(0, 25_000)}`;

    const aiResponse = await executeUnifiedAiCall({
      systemPrompt,
      userPrompt,
      temperature: 0.1,
      responseFormat: "json_object",
    });

    let parsedJson: any;
    try {
      parsedJson = JSON.parse(aiResponse.content);
    } catch {
      throw new Error("Falha ao interpretar a resposta estruturada do modelo de mineração.");
    }

    const validated = MinedHotelStructuredSchema.parse({
      ...parsedJson,
      name: parsedJson.name || data.hotelNameHint || "Hotel sem Nome",
      city: parsedJson.city || data.destinationHint || "Destino",
    });

    let savedId: string | undefined;

    // Se solicitado autoSaveToBank, persiste em hotels_bank para a agência ativa
    if (data.autoSaveToBank && identity.store_id) {
      const { data: inserted, error: insertErr } = await db
        .from("hotels_bank")
        .insert({
          store_id: identity.store_id,
          created_by_profile_id: identity.id,
          name: validated.name.trim(),
          city: validated.city.trim(),
          state: validated.state?.trim() || null,
          country: validated.country.trim(),
          stars: validated.stars,
          regime_options: validated.regime_options,
          description: validated.description?.trim() || null,
          bio_bullets: validated.bio_bullets || [],
          badges: validated.badges || [],
          address: validated.address || null,
          airport_distance: validated.airport_distance || null,
          google_maps_url: validated.google_maps_url || null,
          website: validated.website || null,
          phone: validated.phone || null,
          internal_rating: validated.internal_rating,
          policies: validated.policies,
          structure: validated.structure,
          room_categories: validated.room_categories,
          is_active: true,
        })
        .select("id")
        .single();

      if (!insertErr && inserted) {
        savedId = inserted.id;
      }
    }

    return {
      success: true,
      hotel: validated,
      saved_id: savedId,
    };
  });
