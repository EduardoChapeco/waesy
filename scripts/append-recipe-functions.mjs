import fs from 'fs';
import path from 'path';

const filePath = path.resolve('src/services/mining.functions.ts');
let content = fs.readFileSync(filePath, 'utf-8');

if (content.includes('listPublicRecipesFn')) {
  console.log('listPublicRecipesFn already exists');
  process.exit(0);
}

const recipeFunction = `
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
  created_at: string;
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
      .optional()
  )
  .handler(async ({ data }) => {
    const supabase = getAnonServerClient();
    const limit = data?.limit || 24;
    const offset = data?.offset || 0;

    let query = supabase
      .from("mined_raw_extractions")
      .select("*", { count: "exact" })
      .eq("content_type", "receitas")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (data?.search && data.search.trim()) {
      query = query.ilike("raw_title", \`%\${data.search.trim()}%\`);
    }

    const { data: rows, count, error } = await query;
    if (error) {
      console.error("[listPublicRecipesFn] Error fetching recipes:", error);
      return { recipes: [], total: 0 };
    }

    const recipes: MinedRecipeDTO[] = (rows || []).map((r: any) => {
      const meta = r.type_metadata || {};
      return {
        id: r.id,
        title: r.raw_title,
        description: r.raw_lead || r.raw_body_text?.slice(0, 160) || "",
        cover_image_url: r.cover_image_url || null,
        prep_time: meta.prep_time || null,
        cook_time: meta.cook_time || null,
        total_time: meta.total_time || null,
        recipe_yield: meta.recipe_yield || null,
        category: meta.category || "Geral",
        cuisine: meta.cuisine || null,
        ingredients: Array.isArray(meta.ingredients) ? meta.ingredients : [],
        instructions: Array.isArray(meta.instructions) ? meta.instructions : [],
        source_url: r.source_url,
        source_domain: r.source_domain,
        source_name: r.source_name,
        created_at: r.created_at,
      };
    });

    return {
      recipes,
      total: count || 0,
    };
  });
`;

content = content.trimEnd() + '\n\n' + recipeFunction.trim() + '\n';
fs.writeFileSync(filePath, content, 'utf-8');
console.log('listPublicRecipesFn successfully appended to mining.functions.ts');
