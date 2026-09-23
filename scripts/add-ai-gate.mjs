import fs from 'fs';
const path = 'src/services/mining.functions.ts';
let content = fs.readFileSync(path, 'utf-8');

// 1. Add import
if (!content.includes('checkAiCurationAccess')) {
  content = content.replace(
    'import { curateWithEditorialSquad } from "./mining/editorial-squad";',
    'import { curateWithEditorialSquad } from "./mining/editorial-squad";\nimport { checkAiCurationAccess } from "./mining/ai-curator-gate";'
  );
  console.log('Import checkAiCurationAccess added');
}

// 2. Add gate check inside aiRewriteMinedArticle handler
const rewriteAnchor = 'const { data: mined, error: fetchErr } = await supabase';
const gateCheckCode = `// Validação do Gate de Monetização da IA (Master Prompt V18 - Fase 5)
    const targetStoreId = input.store_id || identity?.store_id;
    const access = await checkAiCurationAccess(targetStoreId, identity?.id);
    if (!access.allowed) {
      throw new Error(access.message || "Acesso à reescrita por IA restrito. Ative um plano Premium ou insira sua chave própria (BYOK).");
    }

    const { data: mined, error: fetchErr } = await supabase`;

if (content.includes(rewriteAnchor) && !content.includes('Validação do Gate de Monetização da IA')) {
  content = content.replace(rewriteAnchor, gateCheckCode);
  console.log('Gate check added to aiRewriteMinedArticle');
}

// 3. Add checkAiCuratorAccessFn
const fnCode = `
/**
 * Consulta de status do Gate de Curadoria IA (BYOK / Plano Premium)
 */
export const checkAiCuratorAccessFn = createServerFn({ method: "GET" })
  .validator(z.object({ store_id: z.string().uuid().optional() }).optional())
  .handler(async ({ data }) => {
    const identity = await getServerIdentity().catch(() => null);
    const targetStoreId = data?.store_id || identity?.store_id;
    return await checkAiCurationAccess(targetStoreId, identity?.id);
  });
`;

if (!content.includes('checkAiCuratorAccessFn')) {
  content = content.trimEnd() + '\n\n' + fnCode.trim() + '\n';
  console.log('checkAiCuratorAccessFn added to mining.functions.ts');
}

fs.writeFileSync(path, content, 'utf-8');
console.log('mining.functions.ts successfully updated with AI Monetization Gate!');
