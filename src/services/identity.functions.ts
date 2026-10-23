import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerIdentity, clearIdentityCache, getSSRClient } from "@/lib/server-access";
import { getServerClient } from "@/lib/supabase";
import { resolveUniqueStoreSlug } from "@/lib/slug-utils";

export const getIdentity = createServerFn({ method: "GET" }).handler(async () => {
  return await getServerIdentity();
});

export const setTenantContext = createServerFn({ method: "POST" })
  .validator(z.object({ store_id: z.string().uuid().nullable() }))
  .handler(async ({ data: { store_id } }) => {
    const identity = await getServerIdentity();
    const adminDb = getServerClient();
    const { setCookie } = await import("@tanstack/start-server-core");

    if (store_id === null) {
      try {
        setCookie("waesy_active_context", "civil", {
          path: "/",
          maxAge: 60 * 60 * 24 * 365,
          httpOnly: false,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
        });
        setCookie("waesy_active_tenant", "", {
          path: "/",
          maxAge: 0,
          httpOnly: false,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
        });
        setCookie("waesy_store_id", "", {
          path: "/",
          maxAge: 0,
          httpOnly: false,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
        });
        setCookie("waesy_active_creator", "", {
          path: "/",
          maxAge: 0,
          httpOnly: false,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
        });
      } catch {
        // Ignorado se header já foi enviado
      }
      try {
        await clearIdentityCache();
      } catch (err) { console.warn("[identity] caught notice:", err); }
      return { success: true, store_id: null };
    }

    // 1. Exige autenticação
    if (!identity.id) {
      throw new Error("Não autenticado: faça login para acessar este espaço de trabalho.");
    }

    // 2. Verifica se a store solicitada existe no banco de dados
    const { data: targetStore, error: storeErr } = await adminDb
      .from("stores")
      .select("id, name, slug, is_active")
      .eq("id", store_id)
      .maybeSingle();

    if (storeErr || !targetStore) {
      throw new Error("Loja ou espaço de trabalho não encontrado.");
    }

    // 3. Validação estrita de autorização de tenant:
    // O usuário DEVE possuir registro legítimo em workspace_members para este store_id,
    // a menos que seja um platform_admin / master global.
    const isPlatformAdmin =
      identity.role === "platform_admin" ||
      identity.role === "master" ||
      identity.role === "superadmin" ||
      identity.isPlatformAdmin === true;

    if (!isPlatformAdmin) {
      const { data: membership, error: memErr } = await adminDb
        .from("workspace_members")
        .select("role")
        .eq("profile_id", identity.id)
        .eq("store_id", store_id)
        .maybeSingle();

      if (memErr || !membership) {
        throw new Error("Acesso não autorizado: você não é membro desta empresa ou workspace.");
      }
    }

    // 3. Persiste o cookie do tenant ativo e contexto de loja atomicamente
    try {
      setCookie("waesy_active_context", "store", {
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
      setCookie("waesy_active_tenant", store_id, {
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
      setCookie("waesy_store_id", store_id, {
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
      setCookie("waesy_active_creator", "", {
        path: "/",
        maxAge: 0,
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
    } catch {
      // Ignorado
    }

    try {
      await clearIdentityCache();
    } catch (err) { console.warn("[identity] caught notice:", err); }

    return { success: true, store_id, storeName: targetStore.name };
  });

export const createStoreSchema = z.object({
  name: z.string().min(2, "O nome deve ter no mínimo 2 caracteres").max(100, "O nome não pode exceder 100 caracteres"),
  slug: z.string().min(2).max(100).optional(),
  type: z.string().optional().default("retail"),
  segment: z.string().optional(),
  category: z.string().optional(),
  document: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  logoUrl: z.string().url().optional().or(z.literal("")),
  bannerUrl: z.string().url().optional().or(z.literal("")),
});

export type CreateStoreInput = z.infer<typeof createStoreSchema>;

export const createStore = createServerFn({ method: "POST" })
  .validator(createStoreSchema)
  .handler(async ({ data }) => {
    let identity: any = null;
    try {
      identity = await getServerIdentity();
    } catch {
      identity = null;
    }

    let userId = identity?.id || null;
    if (!userId) {
      try {
        const ssrClient = await getSSRClient();
        const { data: authData } = await ssrClient.auth.getUser();
        userId = authData?.user?.id || null;
      } catch {
        userId = null;
      }
    }

    if (!userId) {
      throw new Error("Sessão não autenticada. Faça login para cadastrar sua loja.");
    }

    const adminDb = getServerClient();

    // 0. Garantir existência de perfil no banco com role 'owner'
    const { data: existingProfile } = await adminDb
      .from("profiles")
      .select("id, role")
      .eq("id", userId)
      .maybeSingle();

    if (!existingProfile) {
      await adminDb.from("profiles").insert({
        id: userId,
        role: "owner",
      });
    } else if (existingProfile.role === "customer" || !existingProfile.role) {
      await adminDb.from("profiles").update({ role: "owner" }).eq("id", userId);
    }

    // 1. Resolver slug único e limpo sem números aleatórios espúrios (DEC-297 / Microfase 2)
    const storeSlug = await resolveUniqueStoreSlug(adminDb, data.name, data.slug);

    // 2. Criar Organização com slug correspondente
    const { data: org, error: orgError } = await adminDb
      .from("organizations")
      .insert({
        name: data.name,
        slug: storeSlug,
        cnpj: data.document || null,
        status: "active",
      })
      .select("id")
      .single();

    if (orgError) {
      console.error("[createStore] Erro ao criar organização:", orgError);
      throw new Error("Não foi possível criar a organização do negócio: " + orgError.message);
    }

    // 3. Montar settings estruturado
    const resolvedSegment = data.segment || data.type || data.category || "retail";
    const settings = {
      type: resolvedSegment,
      segment: resolvedSegment,
      category: data.category || resolvedSegment,
      niche: resolvedSegment,
      logoUrl: data.logoUrl || null,
      bannerUrl: data.bannerUrl || null,
      created_by: userId,
      created_via: "create_store_direct",
    };

    // 4. Criar Loja vinculando context_profile_id e is_active = true
    const storePayload = {
      organization_id: org.id,
      name: data.name,
      slug: storeSlug,
      cnpj: data.document || null,
      city: data.city || null,
      state: data.state || null,
      address: data.address || null,
      phone: data.phone || null,
      email: data.email || null,
      logo_url: data.logoUrl || null,
      banner_url: data.bannerUrl || null,
      settings,
      context_profile_id: userId,
      is_active: true,
    };

    const { data: store, error: storeError } = await adminDb
      .from("stores")
      .insert(storePayload)
      .select("id, name, slug")
      .single();

    if (storeError) {
      console.error("[createStore] Erro ao criar loja. Executando rollback:", storeError);
      await adminDb.from("organizations").delete().eq("id", org.id);
      throw new Error("Não foi possível criar a loja: " + storeError.message);
    }

    // 5. Vincular usuário como Owner em workspace_members com Rollback Atômico (Anti-Zombie Store)
    const { error: memberError } = await adminDb.from("workspace_members").upsert(
      {
        profile_id: userId,
        user_id: userId,
        store_id: store.id,
        role: "owner",
        is_active: true,
      },
      { onConflict: "profile_id,store_id" }
    );

    if (memberError) {
      console.error("[createStore] Falha no vínculo seguro de workspace_members. Executando rollback atômico:", memberError);
      await adminDb.from("stores").delete().eq("id", store.id);
      await adminDb.from("organizations").delete().eq("id", org.id);
      throw new Error("A loja não foi ativada porque o vínculo seguro do proprietário falhou: " + memberError.message);
    }

    // 6. Atualizar cookies de sessão para o novo tenant ativo
    try {
      const { setCookie } = await import("@tanstack/start-server-core");
      const isProd = process.env.NODE_ENV === "production";
      const cookieOpts = {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        httpOnly: false,
        secure: isProd,
        sameSite: "lax" as const,
      };
      setCookie("waesy_active_context", "store", cookieOpts);
      setCookie("waesy_active_tenant", store.id, cookieOpts);
      setCookie("waesy_store_id", store.id, cookieOpts);
      setCookie("waesy_active_creator", "", { path: "/", maxAge: 0, sameSite: "lax", secure: isProd });
    } catch (cookieErr) {
      console.warn("[createStore] Aviso ao definir cookies:", cookieErr);
    }

    // 7. Invalidar cache de identidade
    try {
      await clearIdentityCache();
    } catch {
      // Silencioso
    }

    return {
      success: true,
      storeId: store.id,
      storeName: store.name,
      storeSlug: store.slug,
    };
  });

export const createBusinessProfile = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().min(2, "O nome deve ter no mínimo 2 caracteres"),
      type: z.enum(["event_producer", "band", "creator", "ecommerce", "physical_store"]),
      document: z.string().optional(),
    }),
  )
  .handler(async ({ data: { name, type, document } }) => {
    return await createStore({
      data: {
        name,
        type,
        segment: type,
        document,
      },
    });
  });
