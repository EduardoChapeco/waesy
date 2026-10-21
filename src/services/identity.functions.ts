import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerIdentity, clearIdentityCache } from "@/lib/server-access";
import { getServerClient } from "@/lib/supabase";

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

export const createBusinessProfile = createServerFn({ method: "POST" })
 .validator(
 z.object({
 name: z.string().min(2, "O nome deve ter no mínimo 2 caracteres"),
 type: z.enum(["event_producer", "band", "creator", "ecommerce", "physical_store"]),
 document: z.string().optional(),
 }),
 )
 .handler(async ({ data: { name, type, document } }) => {
 const identity = await getServerIdentity();

 if (!identity.id) {
 throw new Error("Não autenticado");
 }

 const adminDb = getServerClient();

 // 1. Criar Organização
 const { data: org, error: orgError } = await adminDb
 .from("organizations")
 .insert({
 name,
 cnpj: document || null,
 status: "active",
 })
 .select("id")
 .single();

 if (orgError) {
 console.error("[createBusinessProfile] Erro ao criar organization", orgError);
 throw new Error("Não foi possível criar o coletivo (Organização).");
 }

 // 2. Criar Store (Loja/Coletivo)
 const storeSlug = name
 .toLowerCase()
 .normalize("NFD")
 .replace(/[\u0300-\u036f]/g, "")
 .replace(/[^a-z0-9]+/g, "-")
 .replace(/^-+|-+$/g, "") + "-" + Math.floor(1000 + Math.random() * 9000);

 const { data: store, error: storeError } = await adminDb
 .from("stores")
 .insert({
 organization_id: org.id,
 name,
 slug: storeSlug,
 settings: { type, segment: type },
 })
 .select("id")
 .single();

 if (storeError) {
 console.error("[createBusinessProfile] Erro ao criar store", storeError);
 throw new Error("Não foi possível criar o perfil do coletivo.");
 }

 // 3. Vincular o usuário em workspace_members (tabela canônica)
 try {
 await adminDb.from("workspace_members").upsert(
 {
 profile_id: identity.id,
 store_id: store.id,
 role: "owner",
 },
 { onConflict: "profile_id,store_id" },
 );
 } catch (err) {
 console.warn("[createBusinessProfile] Erro ao vincular workspace_members:", err);
 }

  // 4. Seta o tenant ativo
  try {
    const { setCookie } = await import("@tanstack/start-server-core");
    setCookie("waesy_active_tenant", store.id, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
  } catch {
    // Ignorado
  }

 return { success: true, store_id: store.id };
 });
