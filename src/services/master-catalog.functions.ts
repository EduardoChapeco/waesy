/**
 * master-catalog.functions.ts — BFF Server Functions para Governança Centralizada de Hotéis, Clubes e Empresas
 * 
 * Permite ao Admin Master:
 * 1. Listar, filtrar e buscar todos os hotéis, pousadas, hostels, resorts e clubes do banco (`hotels_bank`)
 * 2. Editar, refinar e customizar 100% dos dados: mídias, comodidades, quartos, políticas, estrutura e contatos
 * 3. Listar, filtrar e editar todas as empresas do diretório comercial (`directory_listings`)
 * 4. Disparar mineração sob demanda com enriquecimento automático e paridade 100% de dados reais
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/server-access";
import { harvestHotelsAndResorts } from "./mining/hospitality-harvester";
import { harvestLocalPlaces } from "./mining/places-harvester";
import { GLOBAL_MASTER_PRODUCTS_CATALOG, type MasterProductRecord } from "@/lib/data/master-products-catalog";

// ─── 1. GESTÃO MASTER DE HOTÉIS, RESORTS, POUSADAS, HOSTELS E CLUBES ─────────

export const listMasterHotels = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        search: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        stars: z.number().int().optional(),
        tag: z.string().optional(),
        limit: z.number().int().min(1).max(200).default(50),
        offset: z.number().int().min(0).default(0),
      })
      .optional()
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const supabase = getServerClient();

    let query = supabase
      .from("hotels_bank")
      .select("id, name, city, state, country, stars, regime_options, cover_photo_url, photos, phone, website, address, airport_distance, google_maps_url, internal_rating, max_installments, room_categories, policies, structure, tags, is_active, created_at, updated_at", { count: "exact" })
      .order("name", { ascending: true })
      .range(data?.offset || 0, (data?.offset || 0) + (data?.limit || 50) - 1);

    if (data?.city && data.city !== "all") {
      query = query.ilike("city", `%${data.city.trim()}%`);
    }
    if (data?.state && data.state !== "all") {
      query = query.eq("state", data.state.trim().toUpperCase());
    }
    if (data?.stars) {
      query = query.eq("stars", data.stars);
    }
    if (data?.search && data.search.trim()) {
      const q = `%${data.search.trim()}%`;
      query = query.or(`name.ilike.${q},city.ilike.${q},description.ilike.${q}`);
    }
    if (data?.tag && data.tag !== "all") {
      query = query.contains("tags", [data.tag.trim().toLowerCase()]);
    }

    const { data: hotels, error, count } = await query;
    if (error) {
      throw new Error(`Falha ao listar hotéis do banco master: ${error.message}`);
    }

    return {
      hotels: hotels || [],
      total: count || 0,
      limit: data?.limit || 50,
      offset: data?.offset || 0,
    };
  });

export const getMasterHotel = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const supabase = getServerClient();

    const [hotelRes, amenitiesRes, mediaRes] = await Promise.all([
      supabase.from("hotels_bank").select("*").eq("id", data.id).single(),
      supabase.from("hotel_amenities").select("amenity_key, label, is_featured").eq("hotel_id", data.id),
      supabase.from("hotel_media").select("id, media_url, category, caption, sort_order").eq("hotel_id", data.id).order("sort_order", { ascending: true }),
    ]);

    if (hotelRes.error || !hotelRes.data) {
      throw new Error(`Hotel não encontrado: ${hotelRes.error?.message || "Registro inexistente"}`);
    }

    return {
      hotel: hotelRes.data,
      amenities: amenitiesRes.data || [],
      media: mediaRes.data || [],
    };
  });

export const upsertMasterHotel = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid().optional(),
      name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
      city: z.string().min(2, "Cidade é obrigatória"),
      state: z.string().min(2, "Estado é obrigatório"),
      country: z.string().default("Brasil"),
      stars: z.number().int().min(1).max(5).default(4),
      description: z.string().optional().default(""),
      bioBullets: z.array(z.string()).default([]),
      regimeOptions: z.array(z.string()).default(["Café da Manhã"]),
      coverPhotoUrl: z.string().url("URL de capa inválida"),
      photos: z.array(z.string().url()).default([]),
      phone: z.string().optional(),
      website: z.string().optional(),
      address: z.string().min(3, "Endereço é obrigatório"),
      locationLat: z.number().optional(),
      locationLng: z.number().optional(),
      airportDistance: z.string().optional(),
      googleMapsUrl: z.string().optional(),
      internalRating: z.number().min(0).max(10).default(9.0),
      maxInstallments: z.number().int().min(1).max(24).default(12),
      roomCategories: z.record(z.string(), z.any()).default({}),
      policies: z.record(z.string(), z.any()).default({}),
      structure: z.record(z.string(), z.any()).default({}),
      tags: z.array(z.string()).default([]),
      isActive: z.boolean().default(true),
      amenityKeys: z.array(z.string()).default([]),
      mediaGallery: z.array(
        z.object({
          media_url: z.string().url(),
          category: z.enum(["facade", "rooms", "pool", "leisure", "gastronomy", "spa", "general"]),
          caption: z.string().optional(),
          sort_order: z.number().int().default(0),
        })
      ).default([]),
    })
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const supabase = getServerClient();

    // Sanitização anti-Unsplash estrita (Invariante B.8 e B.33)
    if (data.coverPhotoUrl.includes("unsplash.com")) {
      throw new Error("Proibido salvar fotos da Unsplash. Utilize mídias reais ou oficiais.");
    }
    const cleanPhotos = data.photos.filter((p) => !p.includes("unsplash.com"));

    const payload = {
      name: data.name.trim(),
      city: data.city.trim(),
      state: data.state.trim().toUpperCase(),
      country: data.country.trim(),
      stars: data.stars,
      description: data.description.trim(),
      bio_bullets: data.bioBullets,
      regime_options: data.regimeOptions,
      cover_photo_url: data.coverPhotoUrl.trim(),
      photos: cleanPhotos,
      phone: data.phone?.trim() || null,
      website: data.website?.trim() || null,
      address: data.address.trim(),
      location_lat: data.locationLat ?? null,
      location_lng: data.locationLng ?? null,
      airport_distance: data.airportDistance?.trim() || null,
      google_maps_url: data.googleMapsUrl?.trim() || null,
      internal_rating: data.internalRating,
      max_installments: data.maxInstallments,
      room_categories: data.roomCategories,
      policies: data.policies,
      structure: data.structure,
      tags: data.tags.map((t) => t.trim().toLowerCase()),
      is_active: data.isActive,
      updated_at: new Date().toISOString(),
    };

    let hotelId = data.id;

    if (hotelId) {
      const { error } = await supabase.from("hotels_bank").update(payload).eq("id", hotelId);
      if (error) throw new Error(`Falha ao atualizar hotel: ${error.message}`);
    } else {
      const { data: inserted, error } = await supabase.from("hotels_bank").insert(payload).select("id").single();
      if (error || !inserted) throw new Error(`Falha ao criar hotel: ${error?.message || "Sem ID"}`);
      hotelId = inserted.id;
    }

    // Sincronização canônica com `global_hotels`
    const canonicalSlug = data.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    await supabase.from("global_hotels").upsert(
      {
        canonical_slug: canonicalSlug,
        name: data.name.trim(),
        city: data.city.trim(),
        state: data.state.trim().toUpperCase(),
        stars: data.stars,
        description: data.description.trim(),
        cover_image_url: data.coverPhotoUrl.trim(),
        images: cleanPhotos,
        regimes: data.regimeOptions,
        phone: data.phone?.trim() || null,
        email: null,
        website_url: data.website?.trim() || null,
        full_address: data.address.trim(),
        latitude: data.locationLat ?? null,
        longitude: data.locationLng ?? null,
        is_verified: true,
        source_crawler: "master_admin_catalog",
        metadata: {
          airportDistance: data.airportDistance,
          internalRating: data.internalRating,
          roomCategories: data.roomCategories,
          policies: data.policies,
          structure: data.structure,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "canonical_slug" }
    );

    // Sincronização de Comodidades
    if (data.amenityKeys && data.amenityKeys.length > 0) {
      await supabase.from("hotel_amenities").delete().eq("hotel_id", hotelId);
      const amenitiesRows = data.amenityKeys.map((key) => ({
        hotel_id: hotelId,
        amenity_key: key,
        label: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        is_featured: true,
      }));
      await supabase.from("hotel_amenities").insert(amenitiesRows);
    }

    // Sincronização de Mídias
    if (data.mediaGallery && data.mediaGallery.length > 0) {
      await supabase.from("hotel_media").delete().eq("hotel_id", hotelId);
      const mediaRows = data.mediaGallery
        .filter((m) => !m.media_url.includes("unsplash.com"))
        .map((m, idx) => ({
          hotel_id: hotelId,
          media_url: m.media_url,
          category: m.category,
          caption: m.caption || null,
          sort_order: m.sort_order ?? idx,
        }));
      if (mediaRows.length > 0) {
        await supabase.from("hotel_media").insert(mediaRows);
      }
    }

    return { success: true, hotelId };
  });

export const deleteMasterHotel = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const supabase = getServerClient();

    await supabase.from("hotel_amenities").delete().eq("hotel_id", data.id);
    await supabase.from("hotel_media").delete().eq("hotel_id", data.id);
    const { error } = await supabase.from("hotels_bank").delete().eq("id", data.id);

    if (error) throw new Error(`Falha ao remover hotel: ${error.message}`);
    return { success: true };
  });

// ─── 2. GESTÃO MASTER DE EMPRESAS LOCAIS (DIRECTORY LISTINGS) ─────────────────

export const listMasterDirectoryListings = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        search: z.string().optional(),
        category: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        isVerified: z.boolean().optional(),
        limit: z.number().int().min(1).max(200).default(50),
        offset: z.number().int().min(0).default(0),
      })
      .optional()
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const supabase = getServerClient();

    let query = supabase
      .from("directory_listings")
      .select("id, business_name, category, description, address, neighborhood, city, state, latitude, longitude, contact_phone, contact_whatsapp, contact_email, website_url, avatar_url, banner_url, photos, working_hours, specialties, metadata, is_verified, is_crawled, status, data_quality_score, created_at, updated_at", { count: "exact" })
      .order("business_name", { ascending: true })
      .range(data?.offset || 0, (data?.offset || 0) + (data?.limit || 50) - 1);

    if (data?.category && data.category !== "all") {
      query = query.eq("category", data.category.trim());
    }
    if (data?.city && data.city !== "all") {
      query = query.ilike("city", `%${data.city.trim()}%`);
    }
    if (data?.state && data.state !== "all") {
      query = query.eq("state", data.state.trim().toUpperCase());
    }
    if (data?.isVerified !== undefined) {
      query = query.eq("is_verified", data.isVerified);
    }
    if (data?.search && data.search.trim()) {
      const q = `%${data.search.trim()}%`;
      query = query.or(`business_name.ilike.${q},city.ilike.${q},description.ilike.${q},address.ilike.${q}`);
    }

    const { data: listings, error, count } = await query;
    if (error) {
      throw new Error(`Falha ao listar empresas do diretório: ${error.message}`);
    }

    return {
      listings: listings || [],
      total: count || 0,
      limit: data?.limit || 50,
      offset: data?.offset || 0,
    };
  });

export const getMasterDirectoryListing = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const supabase = getServerClient();

    const { data: listing, error } = await supabase
      .from("directory_listings")
      .select("*")
      .eq("id", data.id)
      .single();

    if (error || !listing) {
      throw new Error(`Empresa não encontrada: ${error?.message || "Registro inexistente"}`);
    }

    return { listing };
  });

export const upsertMasterDirectoryListing = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid().optional(),
      businessName: z.string().min(2, "Nome da empresa é obrigatório"),
      category: z.string().min(2, "Categoria é obrigatória"),
      description: z.string().optional().default(""),
      address: z.string().min(3, "Endereço é obrigatório"),
      neighborhood: z.string().optional(),
      city: z.string().min(2, "Cidade é obrigatória"),
      state: z.string().min(2, "Estado é obrigatório"),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      contactPhone: z.string().optional(),
      contactWhatsapp: z.string().optional(),
      contactEmail: z.string().email().optional().or(z.literal("")),
      websiteUrl: z.string().url().optional().or(z.literal("")),
      avatarUrl: z.string().url().optional().or(z.literal("")),
      bannerUrl: z.string().url().optional().or(z.literal("")),
      photos: z.array(z.string().url()).default([]),
      workingHours: z.record(z.string(), z.any()).default({}),
      specialties: z.array(z.string()).default([]),
      metadata: z.record(z.string(), z.any()).default({}),
      isVerified: z.boolean().default(true),
      status: z.enum(["active", "pending", "suspended", "inactive"]).default("active"),
    })
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const supabase = getServerClient();

    // Sanitização anti-Unsplash
    const cleanAvatar = data.avatarUrl?.includes("unsplash.com") ? "" : data.avatarUrl;
    const cleanBanner = data.bannerUrl?.includes("unsplash.com") ? "" : data.bannerUrl;
    const cleanPhotos = data.photos.filter((p) => !p.includes("unsplash.com"));

    const payload = {
      business_name: data.businessName.trim(),
      category: data.category.trim(),
      description: data.description.trim(),
      address: data.address.trim(),
      neighborhood: data.neighborhood?.trim() || null,
      city: data.city.trim(),
      state: data.state.trim().toUpperCase(),
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      contact_phone: data.contactPhone?.trim() || null,
      contact_whatsapp: data.contactWhatsapp?.trim() || null,
      contact_email: data.contactEmail?.trim() || null,
      website_url: data.websiteUrl?.trim() || null,
      avatar_url: cleanAvatar?.trim() || null,
      banner_url: cleanBanner?.trim() || null,
      photos: cleanPhotos,
      working_hours: data.workingHours,
      specialties: data.specialties,
      metadata: {
        ...data.metadata,
        verifiedByAdminMaster: true,
        lastMasterReviewAt: new Date().toISOString(),
      },
      is_verified: data.isVerified,
      status: data.status,
      data_quality_score: 100,
      last_validated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let listingId = data.id;

    if (listingId) {
      const { error } = await supabase.from("directory_listings").update(payload).eq("id", listingId);
      if (error) throw new Error(`Falha ao atualizar empresa: ${error.message}`);
    } else {
      const { data: inserted, error } = await supabase.from("directory_listings").insert(payload).select("id").single();
      if (error || !inserted) throw new Error(`Falha ao cadastrar empresa: ${error?.message || "Sem ID"}`);
      listingId = inserted.id;
    }

    return { success: true, listingId };
  });

export const deleteMasterDirectoryListing = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const supabase = getServerClient();

    const { error } = await supabase.from("directory_listings").delete().eq("id", data.id);
    if (error) throw new Error(`Falha ao remover empresa do diretório: ${error.message}`);
    return { success: true };
  });

// ─── 3. DISPARADOR DE MINERAÇÃO CENTRALIZADA SOB DEMANDA ─────────────────────

export const triggerMasterMiningBatch = createServerFn({ method: "POST" })
  .validator(
    z.object({
      targetType: z.enum(["hospitality", "local_places", "all"]).default("all"),
      city: z.string().default("Chapecó"),
      state: z.string().default("SC"),
    })
  )
  .handler(async ({ data }) => {
    await requireAdmin();

    let hospitalityResult = null;
    let placesResult = null;

    if (data.targetType === "hospitality" || data.targetType === "all") {
      hospitalityResult = await harvestHotelsAndResorts({
        city: data.city,
        state: data.state,
      }).catch((err) => ({ error: err.message }));
    }

    if (data.targetType === "local_places" || data.targetType === "all") {
      placesResult = await harvestLocalPlaces({
        city: data.city,
        state: data.state,
        categories: [
          "gastronomia",
          "saude",
          "lazer_clubes",
          "supermercados_cooperativas",
          "varejo_utilidades",
          "automotivo",
          "servicos_corporativos",
        ],
      }).catch((err) => ({ error: err.message }));
    }

    return {
      success: true,
      timestamp: new Date().toISOString(),
      hospitalityResult,
      placesResult,
    };
  });

// ─── 4. CATÁLOGO MESTRE DE PRODUTOS & INTELIGÊNCIA FISCAL (NCM/CEST/IBS/CBS) ───

const searchMasterProductsSchema = z.object({
  query: z.string().optional().default(""),
  barcode: z.string().optional(),
  category: z.string().optional(),
  limit: z.number().optional().default(20),
});

export const searchMasterCatalogProducts = createServerFn({ method: "GET" })
  .validator((data: unknown) => searchMasterProductsSchema.parse(data ?? {}))
  .handler(async ({ data }) => {
    const query = data?.query;
    const barcode = data?.barcode;
    const category = data?.category;
    const limit = data?.limit ?? 20;

    const cleanQuery = (query || "").trim().toLowerCase();
    const cleanBarcode = (barcode || "").trim();

    try {
      const supabase = getServerClient();
      let dbQuery = supabase.from("global_master_catalog").select("*").limit(limit);

      if (cleanBarcode) {
        dbQuery = dbQuery.eq("barcode_ean", cleanBarcode);
      } else {
        if (category) {
          dbQuery = dbQuery.eq("category", category);
        }
        if (cleanQuery) {
          dbQuery = dbQuery.or(`name.ilike.%${cleanQuery}%,brand_name.ilike.%${cleanQuery}%,ncm_code.ilike.%${cleanQuery}%`);
        }
      }

      const { data: dbProducts, error } = await dbQuery;

      if (!error && dbProducts && dbProducts.length > 0) {
        return {
          products: dbProducts as MasterProductRecord[],
          source: "database" as const,
        };
      }
    } catch {
      // Fallback gracioso para catálogo central em memória
    }

    let filtered = GLOBAL_MASTER_PRODUCTS_CATALOG;

    if (cleanBarcode) {
      filtered = filtered.filter((p) => p.barcode_ean === cleanBarcode);
    } else {
      if (category) {
        filtered = filtered.filter((p) => p.category.toLowerCase() === category.toLowerCase());
      }
      if (cleanQuery) {
        filtered = filtered.filter(
          (p) =>
            p.name.toLowerCase().includes(cleanQuery) ||
            p.brand_name.toLowerCase().includes(cleanQuery) ||
            p.ncm_code.includes(cleanQuery) ||
            p.barcode_ean.includes(cleanQuery) ||
            (p.tags || []).some((t) => t.toLowerCase().includes(cleanQuery))
        );
      }
    }

    return {
      products: filtered.slice(0, limit),
      source: "master_catalog_memory" as const,
    };
  });

const lookupNcmSchema = z.object({
  query: z.string().optional().default(""),
  ncmCode: z.string().optional(),
});

export const lookupNcmTributes = createServerFn({ method: "GET" })
  .validator((data: unknown) => lookupNcmSchema.parse(data ?? {}))
  .handler(async ({ data }) => {
    const query = data?.query;
    const ncmCode = data?.ncmCode;

    const cleanQuery = (query || "").trim().toLowerCase();
    const cleanNcm = (ncmCode || "").replace(/\D/g, "");

    const NCM_KNOWLEDGE_BASE = [
      { ncm: "1006.30.21", cest: "17.001.00", desc: "Arroz polido ou brunido de grão longo", ibs: 0.0, cbs: 0.0, is_exempt: true },
      { ncm: "0713.33.19", cest: "17.002.00", desc: "Feijão preto em grãos secos", ibs: 0.0, cbs: 0.0, is_exempt: true },
      { ncm: "0901.21.00", cest: "17.005.00", desc: "Café torrado não descafeinado", ibs: 0.0, cbs: 0.0, is_exempt: true },
      { ncm: "1701.99.00", cest: "17.011.00", desc: "Açúcar refinado de cana", ibs: 0.0, cbs: 0.0, is_exempt: true },
      { ncm: "1507.90.11", cest: "17.014.00", desc: "Óleo de soja refinado em recipientes até 5 litros", ibs: 0.0, cbs: 0.0, is_exempt: true },
      { ncm: "0401.20.10", cest: "17.018.00", desc: "Leite UHT integral", ibs: 0.0, cbs: 0.0, is_exempt: true },
      { ncm: "2202.10.00", cest: "03.007.00", desc: "Águas minerais gaseificadas e refrigerantes", ibs: 15.5, cbs: 8.8, is_exempt: false },
      { ncm: "2203.00.00", cest: "03.001.00", desc: "Cervejas de malte", ibs: 18.0, cbs: 9.0, is_exempt: false },
      { ncm: "3402.50.00", cest: "11.001.00", desc: "Preparações para lavagem de roupas (sabão/detergente)", ibs: 15.5, cbs: 8.8, is_exempt: false },
      { ncm: "4818.10.00", cest: "11.006.00", desc: "Papel higiênico em rolos", ibs: 15.5, cbs: 8.8, is_exempt: false },
      { ncm: "3306.10.00", cest: "20.001.00", desc: "Dentifrícios (cremes dentais)", ibs: 15.5, cbs: 8.8, is_exempt: false },
      { ncm: "4802.56.10", cest: "19.001.00", desc: "Papel cortado no formato A4 (sulfite)", ibs: 15.5, cbs: 8.8, is_exempt: false },
      { ncm: "8544.42.00", cest: "21.011.00", desc: "Condutores elétricos munidos de peças de conexão (cabos)", ibs: 15.5, cbs: 8.8, is_exempt: false },
      { ncm: "8518.30.00", cest: "21.015.00", desc: "Fones de ouvido mesmo combinados com microfone", ibs: 15.5, cbs: 8.8, is_exempt: false },
      { ncm: "8471.60.53", cest: "21.020.00", desc: "Dispositivos de entrada de dados (mouses ópticos e sem fio)", ibs: 15.5, cbs: 8.8, is_exempt: false },
    ];

    let results = NCM_KNOWLEDGE_BASE;

    if (cleanNcm) {
      results = results.filter((item) => item.ncm.replace(/\D/g, "").includes(cleanNcm));
    } else if (cleanQuery) {
      results = results.filter((item) =>
        item.desc.toLowerCase().includes(cleanQuery) || item.ncm.includes(cleanQuery)
      );
    }

    return {
      tributes: results,
      total: results.length,
    };
  });
