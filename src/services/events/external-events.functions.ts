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
import { assertStoreAccess, getServerIdentity } from "@/lib/server-access";
import { extractContentMechanically } from "../mining/mechanical-extractor";
import { curateWithEditorialSquad } from "../mining/editorial-squad";
import { validateBrandSourceUrl } from "@/lib/brand-source-url";

const mineEventSchema = z.object({
  url: z.string().url(),
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

    const storeId = data.target_store_id || identity.store_id;
    if (!identity.id) throw new Error("Autenticação necessária para minerar eventos.");
    if (!storeId) throw new Error("Selecione um workspace para salvar o evento extraído.");
    assertStoreAccess(identity, ["owner", "store_owner", "proprietario", "admin", "manager", "gerente"], storeId);

    // 2. Extrai dados mecanicamente via JSON-LD e seletores
    const sourceUrl = validateBrandSourceUrl(data.url).toString();
    const extracted = await extractContentMechanically(sourceUrl);
    if (!extracted.title || extracted.title === "Sem título") {
      throw new Error("Não foi possível extrair o título do evento.");
    }

    // Identifica plataforma de origem
    let externalSource = "outro";
    if (sourceUrl.includes("sympla.com")) externalSource = "sympla";
    else if (sourceUrl.includes("eventbrite.com")) externalSource = "eventbrite";
    else if (sourceUrl.includes("bluticket.com")) externalSource = "bluticket";
    else if (sourceUrl.includes("ingressonacional.com")) externalSource = "ingressonacional";

    const candidateStartDate = extracted.eventData?.startDate;
    const parsedStart = candidateStartDate ? Date.parse(candidateStartDate) : Number.NaN;
    const eventDate = Number.isFinite(parsedStart) ? new Date(parsedStart).toISOString() : null;
    const candidateEndDate = extracted.eventData?.endDate;
    const parsedEnd = candidateEndDate ? Date.parse(candidateEndDate) : Number.NaN;
    const endDate = Number.isFinite(parsedEnd) && (!eventDate || parsedEnd > parsedStart)
      ? new Date(parsedEnd).toISOString()
      : null;
    const venue = extracted.eventData?.venue || extracted.eventData?.address || null;
    const city = extracted.eventData?.city?.trim() || null;
    const state = extracted.eventData?.state?.trim() || null;
    const observedPriceMin = extracted.eventData?.isFree === true
      ? 0
      : extracted.eventData?.priceMin != null && Number.isFinite(extracted.eventData.priceMin) && extracted.eventData.priceMin >= 0
        ? Math.round(extracted.eventData.priceMin * 100)
        : null;
    const observedPriceMax = extracted.eventData?.priceMax != null && Number.isFinite(extracted.eventData.priceMax) && extracted.eventData.priceMax >= 0
      ? Math.round(extracted.eventData.priceMax * 100)
      : null;

    // 3. Insere ou atualiza o evento na tabela events
    const { data: eventRow, error: eventErr } = await supabase
      .from("events")
      .upsert(
        {
          store_id: storeId,
          title: extracted.title,
          description: extracted.lead || extracted.bodyText.slice(0, 500),
          event_date: eventDate,
          end_date: endDate,
          location: venue,
          venue: venue,
          city,
          state,
          cover_image: extracted.coverImageUrl || null,
          is_external: true,
          external_source: externalSource,
          source_url: sourceUrl,
          external_ticket_url: extracted.eventData?.ticketUrl || null,
          price_min_cents: observedPriceMin,
          price_max_cents: observedPriceMax,
          field_provenance: {
            record_kind: "mechanical_event_extraction",
            overall_status: "draft_unreviewed",
            source_url: "validated_public_source",
            event_date: eventDate ? "observed_in_source" : "not_observed",
            end_date: endDate ? "observed_in_source" : "not_observed",
            city: city ? "observed_in_source" : "not_observed",
            state: state ? "observed_in_source" : "not_observed",
            venue: venue ? "observed_in_source" : "not_observed",
            price: observedPriceMin != null || observedPriceMax != null ? "observed_in_source" : "not_observed",
            ticket_url: extracted.eventData?.ticketUrl ? "observed_public_offer_url" : "not_observed",
            captured_at: new Date().toISOString(),
          },
          status: "draft",
        },
        { onConflict: "store_id,source_url" }
      )
      .select("id, title, event_date, location, venue, city, state, external_ticket_url, source_url, status")
      .single();

    if (eventErr || !eventRow) {
      throw new Error(`Falha ao registrar evento: ${eventErr?.message || "Erro desconhecido"}`);
    }

    let newsArticleId: string | null = null;
    let newsGenerationError: string | null = null;

    // 4. Se solicitado, aciona o Squad Editorial para redigir matéria jornalística de cobertura
    if (data.generate_news_coverage) {
      try {
        const curated = await curateWithEditorialSquad({
          rawTitle: extracted.title,
          rawText: `${extracted.bodyMarkdown}\n\nLocal extraído: ${[venue, city, state].filter(Boolean).join(", ") || "não informado na fonte"}.\nData extraída: ${eventDate ? new Date(eventDate).toLocaleDateString("pt-BR") : "não informada na fonte"}.\nFonte pública: ${sourceUrl}\nLink de ingresso extraído: ${extracted.eventData?.ticketUrl || "não identificado"}`,
          sourceName: externalSource.toUpperCase(),
          sourceUrl,
          city: city || "não informada na fonte",
          tone: "pop_viral",
        });

        const slug = `${extracted.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50)}-${Date.now().toString(36)}`;

        const { data: newsRow, error: newsErr } = await supabase
          .from("news_articles")
          .insert({
            store_id: storeId,
            author_profile_id: identity.id,
            title: curated.title,
            slug,
            kicker: "AGENDA CULTURAL",
            subtitle: curated.subtitle,
            content_sections: curated.mobile_sections,
            cover_media_url: extracted.coverImageUrl || null,
            cover_media_type: "image",
            category: "cultura",
            tags: [...curated.tags, "eventos"],
            reading_time_minutes: curated.reading_time_minutes,
            status: "draft",
            published_at: null,
            source_url: sourceUrl,
            source_type: "curated_event",
            curation_status: "pending_review",
          })
          .select("id")
          .single();

        if (!newsErr && newsRow) {
          newsArticleId = newsRow.id;

          // Cria vínculo bidirecional entre notícia e evento
          const { error: relationError } = await supabase.from("event_news_relations").upsert(
            {
              event_id: eventRow.id,
              news_article_id: newsRow.id,
              relation_type: "announcement",
            },
            { onConflict: "event_id,news_article_id" }
          );
          if (relationError) {
            newsGenerationError = `Rascunho editorial salvo, mas a relação com o evento falhou: ${relationError.message}`;
          }
        } else if (newsErr) {
          newsGenerationError = newsErr.message;
          console.warn("[mineAndPublishExternalEvent] Falha ao persistir rascunho editorial:", newsErr.message);
        }
      } catch (err) {
        newsGenerationError = err instanceof Error ? err.message : "Falha desconhecida ao gerar matéria.";
        console.warn("[mineAndPublishExternalEvent] Aviso na geração da notícia de cobertura:", err);
      }
    }

    return {
      success: true,
      event: eventRow,
      event_status: "draft_pending_human_review",
      news_article_id: newsArticleId,
      news_article_status: newsArticleId ? "draft_pending_human_review" : "not_created",
      news_generation_error: newsGenerationError,
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
  city: z.string().trim().min(2).max(100).optional(),
  storeId: z.string().uuid().optional(),
  category: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

// ============================================================
// 4. Listagem de Eventos com Filtros e Notícias Vinculadas
// ============================================================
export const listExternalEvents = createServerFn({ method: "GET" })
  .validator((input: unknown) => listEventsSchema.parse(input))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    if (!identity.id) throw new Error("Autenticação necessária para listar eventos do workspace.");
    const storeId = data.storeId || identity.store_id;
    const isPlatformAdmin = identity.role === "platform_admin" || identity.role === "master";
    if (storeId) {
      assertStoreAccess(identity, ["owner", "store_owner", "proprietario", "admin", "manager", "gerente", "content"], storeId);
    } else if (!isPlatformAdmin) {
      throw new Error("Nenhum workspace ativo foi informado.");
    }
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
        source_url,
        external_ticket_url,
        price_min_cents,
        price_max_cents,
        field_provenance,
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
      .in("status", ["draft", "published"])
      .order("event_date", { ascending: true })
      .limit(data.limit);

    if (storeId) query = query.eq("store_id", storeId);

    if (data.city) {
      query = query.ilike("city", `%${data.city}%`);
    }

    if (data.category && data.category !== "all") {
      query = query.eq("category", data.category);
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(`Falha ao listar eventos: ${error.message}`);

    return (rows || []).map((row) => {
      const safeUrl = (value: unknown): string | null => {
        if (typeof value !== "string") return null;
        try { return validateBrandSourceUrl(value).toString(); } catch { return null; }
      };
      return {
        ...row,
        source_url: safeUrl(row.source_url),
        external_ticket_url: safeUrl(row.external_ticket_url),
      };
    });
  });
