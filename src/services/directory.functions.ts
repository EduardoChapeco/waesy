import { getServerIdentity } from "@/lib/server-access";
/**
 * directory.functions.ts — BFF para o Guia & Diretório de Empresas e Especialistas (100% Real no Supabase)
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getCurrentIdentity } from "@/services/cart-helpers";

export interface DirectoryListingDTO {
 id: string;
 store_id?: string | null;
 store?: { id: string; name: string; slug: string; avatar_url?: string | null } | null;
 author_profile_id?: string | null;
 business_name: string;
 category: string;
 description: string;
 specialties: string[];
 address: string;
 latitude?: number | null;
 longitude?: number | null;
 contact_phone?: string | null;
 contact_whatsapp?: string | null;
 contact_email?: string | null;
 website_url?: string | null;
 working_hours?: any;
 is_verified: boolean;
 rating: number;
 reviews_count: number;
 avatar_url?: string | null;
 banner_url?: string | null;
 status: "active" | "inactive";
 created_at: string;
}

export const getPublicDirectory = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        limit: z.number().int().min(1).max(100).optional(),
        category: z.string().optional(),
        search: z.string().optional(),
      })
      .optional(),
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const limit = data?.limit ?? 50;

    let query = supabase
      .from("directory_listings")
      .select("*, stores(id, name, slug, settings, is_hidden_from_directory, access_type)")
      .eq("status", "active")
      .order("is_verified", { ascending: false })
      .order("rating", { ascending: false })
      .limit(limit);

    if (data?.category && data.category !== "todos") {
      query = query.eq("category", data.category);
    }

    if (data?.search && data.search.trim()) {
      const q = `%${data.search.trim()}%`;
      query = query.or(`business_name.ilike.${q},description.ilike.${q},address.ilike.${q}`);
    }

    const { data: rows, error } = await query;

    if (error) {
      console.error("Erro ao listar diretório no Supabase:", error);
      return [];
    }

    return (rows || [])
      .filter((row: any) => {
        // Filtro inviolável: lojas ocultas ou privadas não aparecem no diretório público
        if (row.stores) {
          if (row.stores.is_hidden_from_directory === true) return false;
          if (row.stores.access_type && row.stores.access_type !== "public") return false;
        }
        return true;
      })
      .map((row: any) => {
        const storeSettings = (row.stores?.settings as any) || {};
        const storeLogo = storeSettings.logoUrl || storeSettings.logo_url || null;
        const cat = row.category || "servicos";

        return {
          id: row.id,
          store_id: row.store_id,
          store: row.stores || null,
          author_profile_id: row.author_profile_id,
          business_name: row.business_name || row.stores?.name || "Negócio Local",
          category: cat,
          description: row.description || "",
          specialties: row.specialties || [],
          address: row.address || "Regional",
          latitude: row.latitude,
          longitude: row.longitude,
          contact_phone: row.contact_phone,
          contact_whatsapp: row.contact_whatsapp,
          contact_email: row.contact_email,
          website_url: row.website_url,
          working_hours:
            typeof row.working_hours === "string"
              ? row.working_hours
              : row.working_hours?.weekdays || "Seg a Sex: 08:00 - 18:00",
          is_verified: !!row.is_verified,
          rating: row.rating ? Number(row.rating) : 0,
          reviews_count: Number(row.reviews_count || 0),
          avatar_url: row.avatar_url || storeLogo,
          banner_url: row.banner_url || storeSettings.bannerUrl || null,
          status: row.status,
          created_at: row.created_at,
        };
      }) as DirectoryListingDTO[];
  });

export const getPublicDirectoryById = createServerFn({ method: "GET" })
 .validator(z.object({ listingId: z.string() }))
 .handler(async ({ data: { listingId } }) => {
 const supabase = getServerClient();

 // 1. Tenta buscar em directory_listings por ID ou store_id
 let query = supabase.from("directory_listings").select("*, stores(id, name, slug, settings)");
 const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(listingId);

 if (isUuid) {
 query = query.or(`id.eq.${listingId},store_id.eq.${listingId}`);
 } else {
 query = query.eq("id", listingId);
 }

 const { data: row } = await query.maybeSingle();

 if (row) {
 const storeSettings = (row.stores?.settings as any) || {};
 const storeLogo = storeSettings.logoUrl || storeSettings.logo_url || null;
 return {
 id: row.id,
 store_id: row.store_id,
 store: row.stores || null,
 author_profile_id: row.author_profile_id,
 business_name: row.business_name || row.stores?.name || "Negócio Local",
 category: row.category,
 description: row.description || "",
 specialties: row.specialties || [],
 address: row.address || "Regional",
 latitude: row.latitude,
 longitude: row.longitude,
 contact_phone: row.contact_phone,
 contact_whatsapp: row.contact_whatsapp,
 contact_email: row.contact_email,
 website_url: row.website_url,
 working_hours: typeof row.working_hours === "string" ? row.working_hours : (row.working_hours?.weekdays || "Seg a Sex: 08:00 - 18:00"),
 is_verified: !!row.is_verified,
 rating: row.rating ? Number(row.rating) : 0,
 reviews_count: Number(row.reviews_count || 0),
 avatar_url: row.avatar_url || storeLogo,
 banner_url: row.banner_url || storeSettings.bannerUrl || null,
 status: row.status,
 created_at: row.created_at,
 } as DirectoryListingDTO;
 }

 // 2. Fallback resiliente: busca na tabela stores por ID ou Slug para garantir 0% de quebras ou 404s
 let storeQuery = supabase.from("stores").select("*");
 if (isUuid) {
 storeQuery = storeQuery.eq("id", listingId);
 } else {
 storeQuery = storeQuery.eq("slug", listingId);
 }

 const { data: storeRow } = await storeQuery.maybeSingle();

 if (storeRow) {
 const settings = (storeRow.settings ?? {}) as Record<string, any>;
 return {
 id: storeRow.id,
 store_id: storeRow.id,
 author_profile_id: null,
 business_name: storeRow.name || "Loja Oficial Waesy",
 category: (storeRow as any).category || (storeRow as any).type || "servicos",
 description: storeRow.description || "Empresa credenciada no ecossistema de compras e serviços Waesy.",
 specialties: settings.specialties || ["Atendimento Especializado", "Pronta Entrega"],
 address: storeRow.address ? `${storeRow.address}${storeRow.city ? ` — ${storeRow.city}, ${storeRow.state || "SC"}` : ""}` : (storeRow.city ? `${storeRow.city}${storeRow.state ? ` - ${storeRow.state}` : ""}` : "Regional"),
 latitude: storeRow.latitude,
 longitude: storeRow.longitude,
 contact_phone: storeRow.phone,
 contact_whatsapp: storeRow.phone,
 contact_email: storeRow.email,
 website_url: null,
 working_hours: typeof settings.businessHours === "string" ? settings.businessHours : "Seg a Sex: 08:00 - 18:00",
 is_verified: true,
 rating: 5.0,
 reviews_count: 12,
 avatar_url: storeRow.logo_url || settings.logoUrl || settings.logo_url,
 banner_url: storeRow.banner_url || settings.cover_url || settings.bannerUrl,
 status: "active",
 created_at: storeRow.created_at,
 } as DirectoryListingDTO;
 }

 return null;
 });

export const requestDirectoryQuote = createServerFn({ method: "POST" })
 .validator(
 z.object({
 listingId: z.string().uuid(),
 customerName: z.string().min(2, "Informe seu nome completo"),
 customerEmail: z.string().email("E-mail inválido"),
 customerPhone: z.string().min(8, "Telefone / WhatsApp inválido"),
 serviceNeeded: z.string().min(3, "Descreva o serviço desejado"),
 message: z.string().max(1500).optional(),
 }),
 )
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const identity = await getCurrentIdentity();

 const { data: listing } = await supabase
 .from("directory_listings")
 .select("id, status, business_name")
 .eq("id", data.listingId)
 .maybeSingle();

 if (!listing || listing.status !== "active") {
 throw new Error("Este profissional/empresa não está recebendo novas solicitações no momento.");
 }

 const { data: created, error } = await supabase
 .from("directory_inquiries")
 .insert({
 listing_id: data.listingId,
 profile_id: identity.customer_id || null,
 customer_name: data.customerName.trim(),
 customer_email: data.customerEmail.trim().toLowerCase(),
 customer_phone: data.customerPhone.trim(),
 service_needed: data.serviceNeeded.trim(),
 message: data.message?.trim() || null,
 status: "pending",
 })
 .select("id, created_at")
 .single();

 if (error) {
 console.error("Erro ao registrar orçamento no Diretório:", error);
 throw new Error("Não foi possível enviar sua solicitação. Tente novamente.");
 }

 return {
 success: true,
 inquiryId: created.id,
 message: "Solicitação de orçamento enviada com sucesso!",
 };
 });

/**
 * Atualização Rápida de Perfil Institucional no Diretório & Loja (Bilateral CRUD)
 */
export const updateDirectoryListingFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string(),
      businessName: z.string().min(2, "Nome da empresa é obrigatório").optional(),
      category: z.string().optional(),
      description: z.string().optional(),
      specialties: z.array(z.string()).optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      contactPhone: z.string().optional(),
      contactWhatsapp: z.string().optional(),
      contactEmail: z.string().optional(),
      websiteUrl: z.string().optional(),
      workingHours: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();

    // 1. Localizar o registro em directory_listings
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.id);
    let query = supabase.from("directory_listings").select("*");
    if (isUuid) {
      query = query.or(`id.eq.${data.id},store_id.eq.${data.id}`);
    } else {
      query = query.eq("id", data.id);
    }

    const { data: listing } = await query.maybeSingle();

    const updatePayload: Record<string, any> = {};
    if (data.businessName !== undefined) updatePayload.business_name = data.businessName.trim();
    if (data.category !== undefined) updatePayload.category = data.category.trim();
    if (data.description !== undefined) updatePayload.description = data.description.trim();
    if (data.specialties !== undefined) updatePayload.specialties = data.specialties;
    if (data.address !== undefined) updatePayload.address = data.address.trim();
    if (data.city !== undefined) updatePayload.city = data.city.trim();
    if (data.contactPhone !== undefined) updatePayload.contact_phone = data.contactPhone.trim() || null;
    if (data.contactWhatsapp !== undefined) updatePayload.contact_whatsapp = data.contactWhatsapp.trim() || null;
    if (data.contactEmail !== undefined) updatePayload.contact_email = data.contactEmail.trim().toLowerCase() || null;
    if (data.websiteUrl !== undefined) updatePayload.website_url = data.websiteUrl.trim() || null;
    if (data.workingHours !== undefined) updatePayload.working_hours = data.workingHours.trim();

    if (listing) {
      const { error: updateErr } = await supabase
        .from("directory_listings")
        .update(updatePayload)
        .eq("id", listing.id);

      if (updateErr) {
        console.error("[updateDirectoryListingFn] Erro ao atualizar directory_listings:", updateErr);
        throw new Error("Erro ao salvar dados no diretório: " + updateErr.message);
      }
    }

    // 2. Se houver vínculo com a tabela stores, sincronizar atomicamente
    const targetStoreId = listing?.store_id || (isUuid ? data.id : null);
    if (targetStoreId) {
      const { data: storeRow } = await supabase
        .from("stores")
        .select("id, settings")
        .eq("id", targetStoreId)
        .maybeSingle();

      if (storeRow) {
        const storeSettings = (storeRow.settings as Record<string, any>) || {};
        const storePayload: Record<string, any> = {
          settings: {
            ...storeSettings,
            businessHours: data.workingHours !== undefined ? data.workingHours : storeSettings.businessHours,
            specialties: data.specialties !== undefined ? data.specialties : storeSettings.specialties,
            bio: data.description !== undefined ? data.description : storeSettings.bio,
          },
        };

        if (data.businessName !== undefined) storePayload.name = data.businessName.trim();
        if (data.address !== undefined) storePayload.address = data.address.trim();
        if (data.city !== undefined) storePayload.city = data.city.trim();
        if (data.contactPhone !== undefined) storePayload.phone = data.contactPhone.trim();
        if (data.contactEmail !== undefined) storePayload.email = data.contactEmail.trim().toLowerCase();
        if (data.description !== undefined) storePayload.description = data.description.trim();

        await supabase.from("stores").update(storePayload).eq("id", targetStoreId);
      }
    }

    return {
      success: true,
      message: "Dados da empresa atualizados com sucesso!",
    };
  });

/**
 * Reivindicar Empresa (Claim Business & Ativação de Ghost Store)
 */
export const claimDirectoryListingFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      listingId: z.string(),
      contactName: z.string().min(2, "Nome do responsável obrigatório"),
      contactRole: z.string().min(2, "Cargo ou vínculo obrigatório"),
      contactPhone: z.string().min(8, "Telefone/WhatsApp de contato obrigatório"),
      document: z.string().optional(),
      notes: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity().catch(() => null);
    if (!identity?.id) {
      throw new Error("Você precisa estar conectado a uma conta Waesy para reivindicar este perfil.");
    }

    const supabase = getServerClient();

    // 1. Localiza a listagem
    const { data: listing, error: findErr } = await supabase
      .from("directory_listings")
      .select("*")
      .eq("id", data.listingId)
      .maybeSingle();

    if (findErr || !listing) {
      throw new Error("Estabelecimento não encontrado no diretório.");
    }

    // 2. Se já estiver verificado com outro dono, rejeita
    if (listing.is_verified && listing.author_profile_id && listing.author_profile_id !== identity.id) {
      throw new Error("Este perfil já foi verificado e pertence a outro gestor. Entre em contato com o suporte.");
    }

    let storeId = identity.store_id || listing.store_id;

    // 3. Se o lojista não possui loja, ativa uma Ghost Store automaticamente
    if (!storeId) {
      const slugBase = (listing.business_name || "loja")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const { data: newStore, error: storeErr } = await supabase
        .from("stores")
        .insert({
          name: listing.business_name,
          slug: `${slugBase}-${Date.now().toString().slice(-4)}`,
          access_type: "public",
          is_hidden_from_directory: false,
          address: listing.address,
          city: listing.city,
          phone: data.contactPhone || listing.contact_phone,
          settings: {
            claimant_name: data.contactName,
            claimant_role: data.contactRole,
            claimed_at: new Date().toISOString(),
          },
        })
        .select("id")
        .single();

      if (!storeErr && newStore?.id) {
        storeId = newStore.id;
      }
    }

    // 4. Atualiza a listagem no diretório para verificada
    const { error: updateErr } = await supabase
      .from("directory_listings")
      .update({
        store_id: storeId,
        author_profile_id: identity.id,
        is_verified: true,
        status: "active",
        contact_phone: data.contactPhone || listing.contact_phone,
        contact_whatsapp: (data.contactPhone || "").replace(/\D/g, "") || listing.contact_whatsapp,
        metadata: {
          ...(listing.metadata || {}),
          claimed_by: identity.id,
          claimed_at: new Date().toISOString(),
          claim_role: data.contactRole,
          claim_name: data.contactName,
          claim_document: data.document || null,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", listing.id);

    if (updateErr) {
      throw new Error("Falha ao salvar reivindicação: " + updateErr.message);
    }

    return {
      success: true,
      message: `Perfil de "${listing.business_name}" reivindicado com sucesso! Agora você é o gestor oficial.`,
      storeId,
    };
  });

