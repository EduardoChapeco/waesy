import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient, getAnonServerClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/server-access";

export interface MinedRecipeDTO {
  id: string;
  title: string;
  description: string;
  cover_image_url: string | null;
  prep_time: string | null;
  cook_time: string | null;
  total_time: string | null;
  recipe_yield: string | null;
  category: string;
  cuisine: string | null;
  ingredients: string[];
  instructions: string[];
  source_url: string;
  source_domain: string;
  source_name: string;
  status?: string;
  created_at: string;
  updated_at?: string;
}

function mapRowToRecipeDto(r: any, sliceDescription: boolean): MinedRecipeDTO {
  const meta = r.type_metadata || {};
  return {
    id: r.id,
    title: r.raw_title,
    description: sliceDescription
      ? r.raw_lead || r.raw_body_text?.slice(0, 160) || ""
      : r.raw_lead || r.raw_body_text || "",
    cover_image_url: r.cover_image_url || null,
    prep_time: meta.prep_time || null,
    cook_time: meta.cook_time || null,
    total_time: meta.total_time || null,
    recipe_yield: meta.recipe_yield || null,
    category: meta.category || "Geral",
    cuisine: meta.cuisine || null,
    ingredients: Array.isArray(meta.ingredients) ? meta.ingredients : [],
    instructions: Array.isArray(meta.instructions) ? meta.instructions : [],
    source_url: r.source_url || "",
    source_domain: r.source_domain || "",
    source_name: r.source_name || "Waesy Gastronomia",
    status: r.status || "active",
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

/**
 * Catálogo Público de Receitas Mineradas (Zero-Token Culinária)
 */
export const listPublicRecipesFn = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        category: z.string().optional(),
        search: z.string().optional(),
        limit: z.number().int().min(1).max(50).default(24),
        offset: z.number().int().min(0).default(0),
      })
      .optional(),
  )
  .handler(async ({ data }) => {
    const supabase = getAnonServerClient();
    const limit = data?.limit || 24;
    const offset = data?.offset || 0;

    let query = supabase
      .from("mined_raw_extractions")
      .select("*", { count: "exact" })
      .eq("content_type", "receitas")
      .neq("status", "hidden")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (data?.search && data.search.trim()) {
      query = query.ilike("raw_title", `%${data.search.trim()}%`);
    }

    const { data: rows, count, error } = await query;
    if (error) {
      console.error("[listPublicRecipesFn] Error fetching recipes:", error);
      return { recipes: [], total: 0 };
    }

    return {
      recipes: (rows || []).map((r: any) => mapRowToRecipeDto(r, true)),
      total: count || 0,
    };
  });

/**
 * Consulta Detalhada de Receita Pública por ID
 */
export const getPublicRecipeByIdFn = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const supabase = getAnonServerClient();
    const { data: row, error } = await supabase
      .from("mined_raw_extractions")
      .select("*")
      .eq("id", data.id)
      .eq("content_type", "receitas")
      .maybeSingle();

    if (error != null || row == null) {
      return null;
    }

    return mapRowToRecipeDto(row, false);
  });

/**
 * Listagem Administrativa de Receitas (Master Admin com Filtros de Status)
 */
export const listAdminMinedRecipesFn = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        search: z.string().optional(),
        category: z.string().optional(),
        status: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      })
      .optional(),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const supabase = getServerClient();
    const limit = data?.limit || 50;
    const offset = data?.offset || 0;

    let query = supabase
      .from("mined_raw_extractions")
      .select("*", { count: "exact" })
      .eq("content_type", "receitas")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (data?.status && data.status !== "all") {
      query = query.eq("status", data.status);
    }
    if (data?.search && data.search.trim()) {
      query = query.ilike("raw_title", `%${data.search.trim()}%`);
    }

    const { data: rows, count, error } = await query;
    if (error) {
      console.error("[listAdminMinedRecipesFn] Error fetching admin recipes:", error);
      return { recipes: [], total: 0 };
    }

    return {
      recipes: (rows || []).map((r: any) => mapRowToRecipeDto(r, true)),
      total: count || 0,
    };
  });

const RecipeInputSchema = z.object({
  title: z.string().min(2).max(250),
  description: z.string().max(2000).optional(),
  cover_image_url: z.string().url().nullable().optional(),
  prep_time: z.string().nullable().optional(),
  cook_time: z.string().nullable().optional(),
  total_time: z.string().nullable().optional(),
  recipe_yield: z.string().nullable().optional(),
  category: z.string().min(1),
  cuisine: z.string().nullable().optional(),
  ingredients: z.array(z.string().min(1)),
  instructions: z.array(z.string().min(1)),
});

/**
 * Atualização Completa de Receita Minerada (Master Admin)
 */
export const updateMinedRecipeFn = createServerFn({ method: "POST" })
  .validator(RecipeInputSchema.extend({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const supabase = getServerClient();

    const { data: current, error: fetchErr } = await supabase
      .from("mined_raw_extractions")
      .select("type_metadata")
      .eq("id", data.id)
      .single();

    if (fetchErr != null || current == null) {
      throw new Error("Receita não encontrada para atualização.");
    }

    const updatedMetadata = {
      ...(current.type_metadata || {}),
      category: data.category,
      cuisine: data.cuisine || null,
      prep_time: data.prep_time || null,
      cook_time: data.cook_time || null,
      total_time: data.total_time || null,
      recipe_yield: data.recipe_yield || null,
      ingredients: data.ingredients,
      instructions: data.instructions,
    };

    const { error: updateErr } = await supabase
      .from("mined_raw_extractions")
      .update({
        raw_title: data.title,
        raw_lead: data.description || "",
        raw_body_text: data.description || "",
        cover_image_url: data.cover_image_url || null,
        type_metadata: updatedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    if (updateErr) {
      console.error("[updateMinedRecipeFn] Error:", updateErr);
      throw new Error(`Falha ao salvar receita: ${updateErr.message}`);
    }

    return { success: true };
  });

/**
 * Alternar Visibilidade de Receita (Ocultar / Publicar)
 */
export const toggleMinedRecipeVisibilityFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      status: z.enum(["active", "hidden", "archived"]),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const supabase = getServerClient();
    const { error } = await supabase
      .from("mined_raw_extractions")
      .update({
        status: data.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    if (error) {
      console.error("[toggleMinedRecipeVisibilityFn] Error:", error);
      throw new Error(`Erro ao alterar visibilidade: ${error.message}`);
    }

    return { success: true, status: data.status };
  });

/**
 * Duplicar Receita Minerada (Clona no Banco Real com Sufixo)
 */
export const duplicateMinedRecipeFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const supabase = getServerClient();

    const { data: original, error: fetchErr } = await supabase
      .from("mined_raw_extractions")
      .select("*")
      .eq("id", data.id)
      .single();

    if (fetchErr != null || original == null) {
      throw new Error("Receita original não encontrada.");
    }

    const { id: _, created_at: __, updated_at: ___, ...rest } = original;
    const newTitle = `${original.raw_title} (Cópia)`;

    const { data: inserted, error: insertErr } = await supabase
      .from("mined_raw_extractions")
      .insert({
        ...rest,
        raw_title: newTitle,
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertErr != null || inserted == null) {
      console.error("[duplicateMinedRecipeFn] Error:", insertErr);
      throw new Error(`Erro ao duplicar receita: ${insertErr?.message}`);
    }

    return { success: true, newId: inserted.id };
  });

/**
 * Exclusão Real de Receita do Banco de Dados
 */
export const deleteMinedRecipeFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const supabase = getServerClient();
    const { error } = await supabase.from("mined_raw_extractions").delete().eq("id", data.id);

    if (error) {
      console.error("[deleteMinedRecipeFn] Error:", error);
      throw new Error(`Erro ao excluir receita: ${error.message}`);
    }

    return { success: true };
  });

/**
 * Criação Manual de Nova Receita Curada (Master Admin / Workspace)
 */
export const createMinedRecipeFn = createServerFn({ method: "POST" })
  .validator(RecipeInputSchema)
  .handler(async ({ data }) => {
    await requireAdmin();
    const supabase = getServerClient();

    const typeMetadata = {
      category: data.category,
      cuisine: data.cuisine || null,
      prep_time: data.prep_time || null,
      cook_time: data.cook_time || null,
      total_time: data.total_time || null,
      recipe_yield: data.recipe_yield || null,
      ingredients: data.ingredients,
      instructions: data.instructions,
    };

    const { data: inserted, error: insertErr } = await supabase
      .from("mined_raw_extractions")
      .insert({
        source_domain: "manual_curation",
        source_url: `https://usewaesy.com/receitas/manual-${Date.now()}`,
        extraction_type: "recipe",
        raw_title: data.title,
        raw_lead: data.description || "",
        raw_body_text: data.description || "",
        cover_image_url: data.cover_image_url || null,
        type_metadata: typeMetadata,
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertErr != null || inserted == null) {
      console.error("[createMinedRecipeFn] Error:", insertErr);
      throw new Error(`Erro ao cadastrar receita: ${insertErr?.message}`);
    }

    return { success: true, id: inserted.id };
  });
