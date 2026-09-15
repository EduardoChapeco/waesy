/**
 * external-events.functions.ts — Módulo de Mineração de Eventos Externos, RSVP e Integração Cruzada
 * 
 * Funcionalidades:
 * 1. Mineração mecânica de eventos externos (Sympla, Eventbrite, Portais Municipais)
 * 2. Publicação canônica na tabela `events` com `is_external = true` e link oficial de ingressos
 * 3. Confirmação de presença em tempo real (RSVP): "Vou", "Tenho interesse", "Não vou"
 * 4. Geração autônoma de matéria jornalística sobre o evento pelo Squad Editorial
 * 5. Indexação cruzada bidirecional entre Notícia e Evento via `event_news_relations`
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";
import { extractContentMechanically } from "../mining/mechanical-extractor";
import { curateWithEditorialSquad } from "../mining/editorial-squad";

const mineEventSchema = z.object({
  url: z.string().url(),
  target_city: z.string().default("Chapecó"),
  target_state: z.string().default("SC"),
  target_store_id: z.string().uuid().optional(),
  generate_news_coverage: z.boolean().default(true),
});

// ============================================================
// 1. Minera e Publica Evento Externo com Matéria Cruzada
// ============================================================
export const mineAndPublishExternalEvent = createServerFn({ method: "POST" })
  .validator((input: unknown) => mineEventSchema.parse(input))
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();

    // 1. Identifica a loja raiz oficial Waesy (se não fornecida)
    let storeId = data.target_store_id;
    if (!storeId) {
      const { data: rootStore } = await supabase
        .from("stores")
        .select("id")
        .eq("is_platform_root", true)
        .maybeSingle();

      storeId = rootStore?.id;
    }

    if (!storeId) {
      const { data: fallbackStore } = await supabase.from("stores").select("id").limit(1).single();
      storeId = fallbackStore?.id;
    }

    if (!storeId) {
      throw new Error("Nenhuma loja válida encontrada para ancorar o evento.");
    }

    // 2. Extrai dados mecanicamente via JSON-LD e seletores
    const extracted = await extractContentMechanically(data.url);
    if (!extracted.title || extracted.title === "Sem título") {
      throw new Error("Não foi possível extrair o título do evento.");
    }

    // Identifica plataforma de origem
    let externalSource = "outro";
    if (data.url.includes("sympla.com")) externalSource = "sympla";
    else if (data.url.includes("eventbrite.com")) externalSource = "eventbrite";
    else if (data.url.includes("bluticket.com")) externalSource = "bluticket";
    else if (data.url.includes("ingressonacional.com")) externalSource = "ingressonacional";

    const eventDate = extracted.eventData?.startDate || new Date(Date.now() + 86400000 * 7).toISOString();
    const venue = extracted.eventData?.venue || extracted.eventData?.location || `${data.target_city} - Centro`;

    // 3. Insere ou atualiza o evento na tabela events
    const { data: eventRow, error: eventErr } = await supabase
      .from("events")
      .upsert(
        {
          store_id: storeId,
          title: extracted.title,
          description: extracted.lead || extracted.bodyText.slice(0, 500),
          event_date: eventDate,
          end_date: extracted.eventData?.endDate || null,
          location: venue,
          venue: venue,
          city: data.target_city,
          state: data.target_state,
          cover_image: extracted.coverImageUrl || null,
          is_external: true,
          external_source: externalSource,
          external_ticket_url: extracted.eventData?.ticketUrl || data.url,
          price_min_cents: extracted.eventData?.priceMin ? Math.round(extracted.eventData.priceMin * 100) : 0,
          price_max_cents: extracted.eventData?.priceMax ? Math.round(extracted.eventData.priceMax * 100) : null,
          status: "published",
        },
        { onConflict: "external_ticket_url" }
      )
      .select("id, title, event_date, location, venue")
      .single();

    if (eventErr || !eventRow) {
      throw new Error(`Falha ao registrar evento: ${eventErr?.message || "Erro desconhecido"}`);
    }

    let newsArticleId: string | null = null;

    // 4. Se solicitado, aciona o Squad Editorial para redigir matéria jornalística de cobertura
    if (data.generate_news_coverage) {
      try {
        const curated = await curateWithEditorialSquad({
          rawTitle: `Evento confirmado: ${extracted.title}`,
          rawText: `${extracted.bodyMarkdown}\n\nLocal: ${extracted.eventData?.venue || data.target_city}.\nData: ${new Date(eventDate).toLocaleDateString("pt-BR")}.\nIngressos disponíveis em: ${data.url}`,
          sourceName: externalSource.toUpperCase(),
          sourceUrl: data.url,
          city: data.target_city,
          tone: "pop_viral",
        });

        const slug = `${extracted.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50)}-${Date.now().toString(36)}`;

        const { data: newsRow, error: newsErr } = await supabase
          .from("news_articles")
          .insert({
            store_id: storeId,
            author_profile_id: identity.userId || null,
            title: curated.title,
            slug,
            kicker: "AGENDA CULTURAL",
            subtitle: curated.subtitle,
            content_sections: curated.mobile_sections,
            cover_media_url: extracted.coverImageUrl || null,
            cover_media_type: "image",
            category: "cultura",
            tags: [...curated.tags, "eventos", data.target_city.toLowerCase()],
            reading_time_minutes: curated.reading_time_minutes,
            status: "published",
            published_at: new Date().toISOString(),
            source_url: data.url,
            source_type: "curated_event",
            curation_status: "approved",
            quality_score: 95,
          })
          .select("id")
          .single();

        if (!newsErr && newsRow) {
          newsArticleId = newsRow.id;

          // Cria vínculo bidirecional entre notícia e evento
          await supabase.from("event_news_relations").upsert(
            {
              event_id: eventRow.id,
              news_article_id: newsRow.id,
              relation_type: "announcement",
            },
            { onConflict: "event_id,news_article_id" }
          );
        }
      } catch (err) {
        console.warn("[mineAndPublishExternalEvent] Aviso na geração da notícia de cobertura:", err);
      }
    }

    return {
      success: true,
      event: eventRow,
      news_article_id: newsArticleId,
    };
  });

const toggleRsvpSchema = z.object({
  event_id: z.string().uuid(),
  status: z.enum(["going", "interested", "not_going"]),
  session_fingerprint: z.string().optional(),
});

// ============================================================
// 2. Confirmação de Presença (RSVP) Real via RPC Atômico
// ============================================================
export const toggleEventRsvpAction = createServerFn({ method: "POST" })
  .validator((input: unknown) => toggleRsvpSchema.parse(input))
  .handler(async ({ data }) => {
    const supabase = getServerClient();

    const { data: rpcRes, error } = await supabase.rpc("toggle_event_rsvp", {
      p_event_id: data.event_id,
      p_status: data.status,
      p_session_fingerprint: data.session_fingerprint || null,
    });

    if (error) throw new Error(`Falha ao registrar RSVP: ${error.message}`);
    return rpcRes;
  });

const getRsvpStatusSchema = z.object({
  event_id: z.string().uuid(),
  session_fingerprint: z.string().optional(),
});

// ============================================================
// 3. Consulta de Status de RSVP do Usuário para o Evento
// ============================================================
export const getEventRsvpStatus = createServerFn({ method: "GET" })
  .validator((input: unknown) => getRsvpStatusSchema.parse(input))
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();

    let query = supabase.from("event_rsvps").select("status").eq("event_id", data.event_id);

    if (identity.userId) {
      query = query.eq("user_id", identity.userId);
    } else if (data.session_fingerprint) {
      query = query.eq("session_fingerprint", data.session_fingerprint);
    } else {
      return { user_status: null };
    }

    const { data: row } = await query.maybeSingle();
    return { user_status: row?.status || null };
  });

const listEventsSchema = z.object({
  city: z.string().optional().default("Chapecó"),
  category: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

// ============================================================
// 4. Listagem de Eventos com Filtros e Notícias Vinculadas
// ============================================================
export const listExternalEvents = createServerFn({ method: "GET" })
  .validator((input: unknown) => listEventsSchema.parse(input))
  .handler(async ({ data }) => {
    const supabase = getServerClient();

    let query = supabase
      .from("events")
      .select(`
        id,
        title,
        description,
        event_date,
        end_date,
        location,
        venue,
        city,
        state,
        cover_image,
        is_external,
        external_source,
        external_ticket_url,
        price_min_cents,
        price_max_cents,
        rsvp_going_count,
        rsvp_interested_count,
        rsvp_not_going_count,
        event_news_relations (
          news_articles (
            id,
            title,
            slug,
            cover_media_url,
            published_at
          )
        )
      `)
      .eq("status", "published")
      .order("event_date", { ascending: true })
      .limit(data.limit);

    if (data.city) {
      query = query.ilike("city", `%${data.city}%`);
    }

    if (data.category && data.category !== "all") {
      query = query.eq("category", data.category);
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(`Falha ao listar eventos: ${error.message}`);

    return rows || [];
  });
