import fs from 'fs';
import path from 'path';

const filePath = path.resolve('src/services/mining.functions.ts');
let content = fs.readFileSync(filePath, 'utf-8');

if (content.includes('batchCurateMineArticlesFn')) {
  console.log('batchCurateMineArticlesFn already exists!');
  process.exit(0);
}

const batchFunctionCode = `
// ============================================================
// 6.1 Curadoria em Lote (OpenSquad Batch Curate)
// ============================================================
export const batchCurateMineArticlesFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      mined_article_ids: z.array(z.string().uuid()).min(1),
      action: z.enum(["approve", "reject"]),
      store_id: z.string().uuid().optional(),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    if (!identity?.id) throw new Error("Não autenticado");

    let storeId = data.store_id || identity.store_id;
    if (!storeId && data.action === "approve") {
      const { data: rootStore } = await supabase
        .from("stores")
        .select("id")
        .eq("is_platform_root", true)
        .maybeSingle();
      storeId = rootStore?.id;
      if (!storeId) {
        const { data: anyStore } = await supabase.from("stores").select("id").limit(1).maybeSingle();
        storeId = anyStore?.id;
      }
    }

    let processedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const articleId of data.mined_article_ids) {
      try {
        const result = await supabase.rpc("process_mined_article", {
          p_mined_article_id: articleId,
          p_curator_profile_id: identity.id,
          p_action: data.action,
          p_curator_notes: "Curadoria em lote (OpenSquad)",
          p_title_override: null,
          p_kicker_override: null,
          p_category_override: null,
          p_store_id_override: storeId || null,
        });

        if (result.error) {
          failedCount++;
          errors.push(result.error.message);
        } else {
          processedCount++;
        }
      } catch (err: any) {
        failedCount++;
        errors.push(err?.message || "Erro desconhecido");
      }
    }

    return {
      success: true,
      action: data.action,
      total: data.mined_article_ids.length,
      processed: processedCount,
      failed: failedCount,
      errors: errors.slice(0, 3),
    };
  });
`;

const anchor = 'export const aiRewriteMinedArticle = createServerFn';
if (content.includes(anchor)) {
  content = content.replace(anchor, batchFunctionCode + '\n' + anchor);
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('Successfully inserted batchCurateMineArticlesFn before aiRewriteMinedArticle');
} else {
  console.error('Could not find anchor: ' + anchor);
  process.exit(1);
}
