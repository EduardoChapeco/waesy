import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getIdentity } from "@/services/identity.functions";

const favoriteInput = z.object({
 entityType: z.enum(["classified", "post", "event", "product"]),
 entityId: z.string(),
});

// ---------------------------------------------------------------------------
// 1. TOGGLE FAVORITE (Salvar / Remover dos Salvos)
// ---------------------------------------------------------------------------

export const toggleFavorite = createServerFn({ method: "POST" })
 .validator(favoriteInput)
 .handler(async ({ data: input }) => {
 const supabase = getServerClient();
 const identity = await getIdentity();

 if (!identity || !identity.id) {
 throw new Error("Você precisa estar autenticado para salvar itens nos favoritos.");
 }

 // 1. Verifica se já existe
 const { data: existing, error: findErr } = await supabase
 .from("user_favorites")
 .select("id")
 .eq("profile_id", identity.id)
 .eq("entity_type", input.entityType)
 .eq("entity_id", input.entityId)
 .maybeSingle();

 if (findErr) {
 console.error("[favorites] find error:", findErr);
 throw new Error("Erro ao verificar favoritos.");
 }

 if (existing) {
 // Remove
 const { error: delErr } = await supabase
 .from("user_favorites")
 .delete()
 .eq("id", existing.id);

 if (delErr) {
 console.error("[favorites] delete error:", delErr);
 throw new Error("Erro ao remover dos favoritos.");
 }

 return { favorited: false };
 } else {
 // Insere
 const { error: insErr } = await supabase.from("user_favorites").insert({
 profile_id: identity.id,
 entity_type: input.entityType,
 entity_id: input.entityId,
 });

 if (insErr) {
 console.error("[favorites] insert error:", insErr);
 throw new Error("Erro ao salvar nos favoritos.");
 }

 return { favorited: true };
 }
 });

// ---------------------------------------------------------------------------
// 2. GET FAVORITE STATUS (Verifica se está favoritado)
// ---------------------------------------------------------------------------

export const getFavoriteStatus = createServerFn({ method: "GET" })
 .validator(favoriteInput)
 .handler(async ({ data: input }) => {
 const supabase = getServerClient();
 const identity = await getIdentity().catch(() => null);

 if (!identity || !identity.id) {
 return { favorited: false };
 }

 const { data, error } = await supabase
 .from("user_favorites")
 .select("id")
 .eq("profile_id", identity.id)
 .eq("entity_type", input.entityType)
 .eq("entity_id", input.entityId)
 .maybeSingle();

 if (error) {
 console.error("[favorites] getFavoriteStatus error:", error);
 return { favorited: false };
 }

 return { favorited: !!data };
 });

// ---------------------------------------------------------------------------
// 3. LIST USER FAVORITES (Área Pessoal / Salvos com Dados Enriquecidos)
// ---------------------------------------------------------------------------

const listFavoritesInput = z.object({
 entityType: z.enum(["all", "classified", "post", "event", "product"]).optional().default("all"),
});

export const listUserFavorites = createServerFn({ method: "GET" })
 .validator(listFavoritesInput.optional())
 .handler(async ({ data: input }) => {
 const supabase = getServerClient();
 const identity = await getIdentity();

 if (!identity || !identity.id) {
   return [];
 }

 let query = supabase
 .from("user_favorites")
 .select("id, entity_type, entity_id, created_at")
 .eq("profile_id", identity.id)
 .order("created_at", { ascending: false });

 if (input?.entityType && input.entityType !== "all") {
 query = query.eq("entity_type", input.entityType);
 }

 const { data: favorites, error } = await query;

 if (error) {
 console.error("[favorites] listUserFavorites error:", error);
 throw new Error("Erro ao carregar favoritos.");
 }

 if (!favorites || favorites.length === 0) {
 return [];
 }

  // Enriquece itens de classificados
  const classifiedIds = favorites
    .filter((f) => f.entity_type === "classified")
    .map((f) => f.entity_id);

  let classifiedMap: Record<string, any> = {};
  if (classifiedIds.length > 0) {
    const { data: classifieds, error: cErr } = await supabase
      .from("classifieds")
      .select("id, title, content, price_cents, images, category, status, location_name")
      .in("id", classifiedIds);

    if (cErr) {
      console.warn("[favorites] classifieds fetch warning:", cErr.message);
    }

    (classifieds || []).forEach((c) => {
      const mediaList = Array.isArray(c.images) ? c.images : (c.images ? [c.images] : []);
      classifiedMap[c.id] = {
        ...c,
        media: mediaList,
        images: mediaList,
      };
    });
  }

 // Enriquece itens de produtos e serviços
 const productIds = favorites.filter((f) => f.entity_type === "product").map((f) => f.entity_id);

 let productMap: Record<string, any> = {};
 if (productIds.length > 0) {
   const { data: products } = await supabase
     .from("products")
     .select("id, name, slug, price_cents, images, status")
     .in("id", productIds);

   (products || []).forEach((p) => {
     productMap[p.id] = p;
   });

   // Se algum ID não foi encontrado em produtos, busca em booking_services (serviços e agendamentos)
   const missingProductIds = productIds.filter((id) => !productMap[id]);
   if (missingProductIds.length > 0) {
     const { data: services } = await supabase
       .from("booking_services")
       .select("id, title, price_cents, image_url, category, duration_minutes, status")
       .in("id", missingProductIds);

     (services || []).forEach((s) => {
       productMap[s.id] = {
         id: s.id,
         name: s.title,
         title: s.title,
         price_cents: s.price_cents,
         images: s.image_url ? [s.image_url] : [],
         category: s.category,
         duration_minutes: s.duration_minutes,
         status: s.status,
         is_service: true,
       };
     });
   }
 }

 // Enriquece itens de eventos
 const eventIds = favorites.filter((f) => f.entity_type === "event").map((f) => f.entity_id);

 let eventMap: Record<string, any> = {};
 if (eventIds.length > 0) {
 const { data: events } = await supabase
 .from("events")
 .select("id, title, description, cover_image, event_date, location_name")
 .in("id", eventIds);

 (events || []).forEach((e) => {
 eventMap[e.id] = e;
 });
 }

 return favorites.map((fav) => ({
 id: fav.id,
 entity_type: fav.entity_type,
 entity_id: fav.entity_id,
 created_at: fav.created_at,
 details:
 fav.entity_type === "classified"
 ? classifiedMap[fav.entity_id] || { id: fav.entity_id, title: "Anúncio Salvo", content: "Item salvo nos seus favoritos.", price_cents: 0, images: [] }
 : fav.entity_type === "product"
 ? productMap[fav.entity_id] || { id: fav.entity_id, name: "Item Salvo", title: "Item Salvo", price_cents: 0, images: [] }
 : fav.entity_type === "event"
 ? eventMap[fav.entity_id] || { id: fav.entity_id, title: "Evento Salvo", description: "", cover_image: null }
 : null,
 }));
 });
