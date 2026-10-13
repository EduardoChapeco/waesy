# Auditoria técnica independente — W8/W9 Builders, CMS, mídia, Storage e provenance

**ID:** `w8-w9-builders-media`  
**Escopo:** somente W8 (builders, publicação, templates e CMS) e W9 (Studio, imagens, assets, Storage, jobs/quota e provenance).  
**Data da inspeção:** 2026-10-10  
**Repositório:** `/home/ubuntu/waesy`  
**Método:** leitura de código, migrations e testes; execução somente de testes locais focados. Nenhum código, migration ou configuração foi alterado por esta auditoria; não houve commit, push, merge, deploy, acesso a produção ou aplicação de migration remota.

## 1. Veredito

**Status: `partial`.** Há evidência local suficiente para confirmar defeitos de implementação e lacunas de integração, e os testes unitários focados executam localmente. W8/W9 **não estão verdes, não estão fechadas e não podem ser declaradas prontas**: não existe neste trabalho prova independente de Postgres/Supabase aplicado, RLS/Storage real, bytes/hash persistidos, provider/worker, browser/reload, CI, staging, deploy ou smoke público.

Os riscos mais importantes verificáveis agora são:

1. publicação legada W8 em múltiplos writes best-effort, ignorando erros intermediários;
2. publicação Omni atômica apenas como contrato SQL local, mas com retry de publicação não idempotente;
3. GET público com auto-seed/escrita de conteúdo;
4. Studio sem hidratação de projeto antes de salvar;
5. CRUD Studio sem predicados de tenant/owner e policies históricas permissivas;
6. gerador de carrossel aceitando `storeId` do cliente, fallback anônimo e sucesso com UUID sintético após falha de persistência;
7. publicação social aceitando URLs fornecidas pelo cliente e retornando `success: true` após falhas/parcialidade;
8. SVG gerado por interpolação sem escape/allowlist de URL;
9. `quotaTokens` de job sendo controlado pelo cliente e ausência de worker/provider no checkout;
10. Storage/migrations antigas mantendo buckets e policies públicas amplas, apesar do ledger mais novo de `media_assets`.

## 2. Baseline e separação de evidência

### 2.1 Estado observado

- `HEAD` observado durante esta auditoria: `98c0d2c2f8c01793a327a12f814c17d9de5e2afb`.
- `origin/main` observado: o mesmo SHA `98c0d2c2f8c01793a327a12f814c17d9de5e2afb`.
- Worktree estava suja, com modificações documentais/relatórios, vários arquivos de auditoria não rastreados e deleções/adicionais de migrations fora do escopo desta subauditoria. Não usei `git add`, reset, checkout, stash ou qualquer operação destrutiva.
- Os documentos oficiais pedidos são históricos e registram outro snapshot relevante (`fc8f9fc3`/`919c8688` em partes do inventário). Portanto, claims históricos foram usados como contexto e **não** promovidos automaticamente para o SHA atual. Os achados abaixo que dizem “confirmado no código” foram rechecados no checkout observado.

### 2.2 Níveis de prova

| Nível | Resultado desta auditoria |
|---|---|
| Código/configuração local | Confirmado para os trechos e linhas citados abaixo. |
| Teste unitário local | Executado e verde nos arquivos focados; vários testes são inspeção textual/`toContain` ou fixtures em memória. |
| Banco/Postgres/RLS/grants | **Não executado**; migrations não foram aplicadas em banco vazio nem em banco remoto. |
| Storage real/bytes/headers/CORS/expiração | **Não executado**. |
| Browser/SSR/reload/mobile/URL pública | **Não executado**; a existência de rota foi inspecionada no código. |
| Provider/worker/job real | **Não provado**; não foi localizado consumidor de `claim_ai_async_job`/`finalizeAiMediaJob` no checkout. |
| CI | **Não executado nesta auditoria**. |
| Staging/deploy/produção/smoke | **Não executado nem declarado**. |

## 3. Evidência local executada

### 3.1 Testes focados

Comandos executados sem alterar arquivos:

```text
npx vitest run src/services/omni-builder.functions.test.ts \
  src/services/ai-media-jobs.functions.test.ts \
  src/lib/builder/studio-contract.test.ts \
  src/lib/builder/studio-template-audit.test.ts \
  src/services/studio.functions.test.ts --reporter=verbose
```

Resultado bruto observado: **4 arquivos, 37 testes, todos passed**. `src/services/studio.functions.test.ts` e `src/services/studio-contract.test.ts` no caminho solicitado não existem; os testes de contrato efetivos estavam em `src/lib/builder/`.

```text
npx vitest run src/services/storage.functions.test.ts \
  src/services/studio-machine-escamas.test.ts \
  src/services/social-studio.functions.test.ts \
  src/services/wave4-creative-studio.test.ts --reporter=verbose
```

Resultado bruto observado: **4 arquivos, 18 testes, todos passed**.

Esses passes são **prova local somente**. Em particular:

- `src/services/ai-media-jobs.functions.test.ts:5-6` lê serviço e migration como texto e os testes usam `toContain` (`:8-45`); não executa RPC, provider, worker, quota, Storage ou concorrência.
- `src/services/storage.functions.test.ts:5-7` também lê fonte/migration como texto; as assertions de `:9-71` não enviam bytes, não consultam Storage, não exercitam RLS e não verificam hash/dimensões contra um objeto persistido.
- `src/services/studio-machine-escamas.test.ts` e `social-studio.functions.test.ts` exercitam fixtures/aritmética em memória, não a cadeia generate→job→Storage→Studio→publish.

## 4. Achados W8 — builders, CMS e publicação

### W8-B01 — publicação legada é multi-write best-effort e ignora erros intermediários

**Classificação:** bug verificável no código; integração/produção não provadas.  
**Severidade conservadora:** alta.  
**Evidência:** `src/services/builder.functions.ts:2625-2720` (`publishBuilderVersion`). O fluxo:

1. lê a versão (`:2641-2652`);
2. arquiva publicadas (`:2654-2659`) sem capturar/verificar o erro;
3. apaga nós (`:2661-2662`) sem capturar/verificar o erro;
4. insere nós (`:2664-2703`);
5. só depois marca `published` (`:2705-2713`).

O retorno depende da última atualização. Uma falha silenciosa no archive/delete pode produzir estado parcialmente mutado ou publicar versão sem a substituição de nós esperada. No checkout atual `rg` encontrou a definição, mas não caller de runtime, portanto o caminho pode ser legado/inativo; isso reduz a afirmação de exploração, não elimina o defeito do entry point.

**Correção local de baixo risco:** decidir explicitamente que o caminho é legado. Se suportado, direcioná-lo para a RPC transacional canônica (ou criar uma RPC de negócio); se não suportado, remover/isolá-lo após tracing dos callers e adicionar teste que falha se esse caminho voltar a publicar. Não mascarar erro de cada write.

### W8-B02 — RPC Omni é uma base atômica local, mas retry de publish do mesmo snapshot não é idempotente

**Classificação:** bug verificável na migration; prova de execução no banco ausente.  
**Severidade conservadora:** alta para retries/replay.

`supabase/migrations/20261007000000_builder_versioned_omni_snapshots.sql:38-73` valida actor/store/document e torna save de draft igual idempotente. Porém a condição de idempotência é explicitamente `IF NOT p_publish` (`:64`); quando `p_publish = true`, a função sempre calcula nova versão (`:75`), arquiva a publicada (`:79-92`), insere outra (`:94-104`) e atualiza o documento (`:117-123`). Logo, retry de uma publicação bem-sucedida após perda da resposta cria novas versões publicadas em vez de devolver a mesma operação. A migration usa lock de documento (`:47-51`) e torna o write transacional **se aplicada**, mas isso não corrige a duplicação lógica.

`src/services/omni-builder.functions.ts:219-237` exige `version_status === "published"`, o que é bom como confirmação de resposta, mas não fornece chave de publicação/idempotency key.

**Correção local de baixo risco:** adicionar no RPC uma comparação de snapshot/hash com a última versão publicada para retornar `idempotent: true` no retry, ou introduzir chave de operação única por documento/snapshot; adicionar teste de duas chamadas de publish e uma única versão publicada efetiva. Só depois validar em Postgres efêmero.

### W8-B03 — GET público possui efeitos colaterais de auto-seed

**Classificação:** bug verificável no código.  
**Severidade conservadora:** alta para consistência/isolamento.

`src/services/builder.functions.ts:2274-2325` insere documento, versão `published` e nós durante `getPublicExperienceDocumentBySlug` quando `home` não é encontrada. O mesmo ocorre quando o documento existe mas não possui published version em `:2354-2381`. Isso transforma leitura anônima/SSR em mutação, abre corrida entre requests e pode criar conteúdo “publicado” sem ação administrativa, além de fazer uma página pública preencher banco com seed implícito.

**Correção local de baixo risco:** tornar o loader público estritamente read-only e retornar `not_found`/estado de configuração; mover seed para ação autenticada de criação, migration/fixture ou job idempotente com ownership. O teste deve provar que request GET não cria linhas.

### W8-B04 — scheduling não é aplicado por todos os entry points CMS

**Classificação:** bug verificável no código para lookup por slug; não houve browser/DB.  
**Severidade conservadora:** média/alta.

`src/services/hotpage.functions.ts:129-145` define `isCampaignActive` e várias listagens filtram o resultado (`listHotpages` retorna `filter(isCampaignActive)` nas linhas próximas a `:248-255`; `listHomeHeroCards`, `listSubcategoryChips`, `listEditorialHotpages` também filtram). `src/services/banner.functions.ts:159-174` filtra `starts_at`, `ends_at` e `auto_archive_at` em `listActiveBanners`.

Contudo `src/services/hotpage.functions.ts:336-358` (`getHotpageBySlug`) consulta apenas `.eq("slug", slug).eq("is_active", true)` (`:340-345`) e retorna o registro diretamente (`:351-357`), sem `isCampaignActive`. Uma hotpage fora da janela pode aparecer quando acessada por slug mesmo que desapareça das rails/listagens. A migration de scheduling cria colunas/índice; não garante comportamento uniforme.

**Correção local de baixo risco:** aplicar `isCampaignActive(data)` antes do retorno e criar casos passado/futuro/auto-archive. Depois mapear os demais lookups públicos e decidir semântica de fronteira/timezone.

### W8-B05 — route tree tem renderizador público, mas a prova end-to-end continua ausente

Foi localizada `src/routes/_store.paginas.$slug.tsx:9-34`, que chama `getPublicExperienceDocumentBySlug` e, em `:126-139`, prefere `document.settings.omni_page_published` ou renderiza a árvore legada. O CMS navega para `/paginas/$slug` em `src/routes/workspace.cms.paginas.index.tsx:350-359`; o editor usa `/workspace/builder/$documentId/editor` (`:332-336`). Isso corrige a afirmação histórica “rota não localizada”, mas **não** prova deep link/browser/anon/tenant/cache.

O loader público seleciona a versão publicada por `experience_versions` (`builder.functions.ts:2343-2350`), mas possui fallback de document type (`:2252-2265`) e resolve tenant por contexto (`:2208-2233`), não por uma URL pública explicitamente tenant-scoped. O fluxo de criação CMS usa `document_type: "campaign"` (`workspace.cms.paginas.index.tsx:148-154`), enquanto o link público chama o loader com `document_type: "storefront"`; hoje o fallback “qualquer tipo ativo” pode esconder esse desalinhamento. Não classifico isso como exploração confirmada sem browser/matriz de tenants, mas é um gate W8.1 aberto.

### W8-B06 — auditor de templates está ligado ao publish Omni, não provado como gate universal

`src/services/omni-builder.functions.ts:209-217` chama `auditOmniDocument` e bloqueia findings de publicação; os testes locais em `src/lib/builder/studio-template-audit.test.ts` cobrem assets sem provenance, links inseguros, alt, motion e blocos desconhecidos. Isso é evidência positiva local.

Não há prova de que `getPublicationBlockingFindings` bloqueie `publishBuilderVersion` ou todas as superfícies CMS; o caminho legado continua sem essa chamada. Não promover o auditor como gate global sem tracing e teste de cada endpoint.

## 5. Achados W9 — Studio, mídia, Storage e provenance

### W9-B01 — Studio não hidrata `projectId` antes de editar/salvar

**Classificação:** bug verificável no componente; perda em banco/reload ainda não executada.  
**Severidade conservadora:** alta.

`src/routes/workspace.estudio.index.tsx:19` importa `getStudioProjectById`, mas não o chama. `:61-90` inicializa `projectId`, título, background e elemento default; `:117-120` lista projetos, mas não carrega o projeto selecionado; `:123-145` envia esse estado local ao save. Abrir `/workspace/estudio?projectId=<UUID>` e salvar sem editar pode enviar defaults e sobrescrever o snapshot real. A troca de UUID também não reidrata/resetaria o estado.

**Correção local de baixo risco:** query/mutation de hidratação keyed por `projectId`; bloquear editor/save enquanto loading/error; preencher título, ratio, canvas/tracks e resetar ao trocar UUID; regressão para “open→save without edit preserves exact snapshot” e dois UUIDs. Não considerar toast de save como prova de reload.

### W9-B02 — CRUD Studio não impõe ownership/tenant no BFF, e migration histórica permite tudo

**Classificação:** bug verificável no código e na configuração SQL versionada; eficácia no DB remoto não provada.  
**Severidade conservadora:** crítica/alta.

Em `src/services/studio.functions.ts`:

- `getStudioProjectById:97-117` faz `.eq("id", data.id)` sem `store_id`/`user_id`;
- `saveStudioProject:122-171` deriva payload da identity, mas no update faz apenas `.eq("id", data.id)` (`:148-153`), podendo reatribuir a linha ao ator corrente;
- `deleteStudioProject:177-194` exclui somente `.eq("id", data.id)`;
- `listStudioProjects:54-91` aceita `data.store_id` arbitrário (`:72-73`) sem provar que pertence à identity; o ramo sem parâmetro combina loja/usuário (`:74-78`).

`supabase/migrations/20260827270000_studio_projects_and_templates.sql:23-36` cria policies `USING (true)`, `WITH CHECK (true)` e `DELETE USING (true)` para `studio_projects`. Mesmo que um deployment posterior altere isso, a árvore from-zero contém uma janela explicitamente permissiva e o BFF não deve depender de RLS para compensar predicados ausentes.

**Correção local de baixo risco:** derivar tenant no servidor, ignorar `store_id` arbitrário ou validar membership, restringir get/update/delete por `store_id` e owner/role, exigir `WITH CHECK`/`USING` equivalentes em migration nova. Adicionar testes A/B com UUID de outro tenant e verificar linhas afetadas/read-back em Postgres.

### W9-B03 — gerador de carrossel aceita tenant do cliente, funciona sem sessão e mascara falha de persistência

**Classificação:** bug verificável no código; provider/DB não executados.  
**Severidade conservadora:** crítica/alta.

`src/services/studio.functions.ts:1172-1188` faz `getServerIdentity().catch(() => ({ id: "0000...", store_id: null }))` e define `targetStoreId = data.storeId || identity.store_id`. O schema aceita `storeId` do request (`:1175-1182`). O insert em `:1477-1490` grava `store_id: targetStoreId || null` e `user_id: null` para o actor fictício. Em `:1492-1503`, qualquer erro é apenas `console.warn`; o retorno usa `savedProject?.id || carouselProject.id`, sendo o segundo um UUID gerado em memória que não corresponde a uma linha persistida.

**Correção local de baixo risco:** exigir identity/admin antes de qualquer brand/provider/persistência; rejeitar `storeId` ausente ou divergente da sessão; não aceitar global `NULL` para projeto de loja; lançar erro no insert e nunca retornar UUID sintético como sucesso. Adicionar fault injection entre insert e retorno e read-back obrigatório.

### W9-B04 — publicação social aceita URLs sem artifact/provenance e retorna sucesso após erro/partial write

**Classificação:** bug verificável no código.  
**Severidade conservadora:** alta.

`src/services/studio.functions.ts:1510-1521` aceita `coverImageUrl`/`slideImages` como strings URL vindas do cliente e não exige `projectId` existente, `asset_id`, bucket/path, hash ou provenance. `:1531-1536` transforma as URLs em `mediaList`; `:1540-1558` insere o post e apenas avisa em `postErr`; `:1562-1583` faz o mesmo para story. Apesar de falhas, `:1586-1597` sempre retorna `success: true`, com `postId`/`storyId` potencialmente `null` e mensagem de sucesso. No destino `both`, pode haver post sem story ou story sem post.

**Correção local de baixo risco:** carregar `projectId` server-side, resolver assets do ledger da loja e recusar URLs arbitrárias; converter feed/story para RPC/transação/saga idempotente com estados; retornar erro ou estado retryable quando qualquer write falhar; testes negativos para cada write e read-back.

### W9-B05 — SVG de Story é interpolado sem escape XML e sem allowlist de esquema

**Classificação:** risco/bug verificável na geração de string; parser/browser/download não executados.  
**Severidade conservadora:** alta.

`src/services/studio.functions.ts:1048-1061` valida `imageUrl`/`targetUrl` somente com `z.string().url()`. Em `:1077-1142`, `storeName`, `imageUrl`, `title`, `subtitle` e preço entram diretamente no SVG (`:1096-1103`, `:1121-1128`). Não há escape de `&`, `<`, `>`, aspas nem allowlist explícita de `https:` para `imageUrl`/`targetUrl`. `z.url()` não substitui serialização XML segura. O campo `href` de `<image>` é uma superfície particularmente sensível.

**Correção local de baixo risco:** escape XML por serializer, permitir apenas `https:` com host/política definida para imagens, evitar `innerHTML`/SVG não sanitizado no preview e adicionar testes com `&`, `<script>`, atributos, `javascript:`/`data:` e parser de XML. A geração de string local não prova XSS explorável no browser, portanto manter essa distinção.

### W9-B06 — Storage legado ainda permite URLs/objetos públicos e não registra asset

**Classificação:** bug verificável no código/migrations; estado efetivo remoto não provado.

`src/services/storage.functions.ts:114-184` (`getSignedUploadUrl`) valida apenas MIME declarado (`:140-143`), cria path e signed upload (`:153-170`), mas não grava `media_assets`, não captura hash/dimensões/bytes reais e retorna `publicUrl` para buckets não listados como privados (`:170-178`). `getPostMediaSignedUrl:197-234` também retorna URL pública sem ledger.

O caminho mais novo `uploadMediaUniversal:388-546` é melhor: usa `assertAllowedBffBucket`, namespace de tenant, `upsert: false`, decodifica bytes, calcula SHA-256/dimensões e no Studio grava `media_assets` (`:446-506`). Isto é prova de código local, não de Storage real. Além disso, callers legados continuam existindo; não declarar o contrato novo como universal sem inventário de callers.

**Correção local de baixo risco:** consolidar callers no upload universal/asset manager; remover ou marcar APIs legadas; persistir `asset_id`/hash/path/MIME/dimensões em cada publicação; testar bytes reais, expiração, reload e objeto inexistente.

### W9-B07 — `media_assets` e Storage têm histórico de RLS/buckets públicos incompatível com tenant-scoped privado

`supabase/migrations/0067_media_assets_pipeline.sql:25-50` usa `store_id = (SELECT id FROM public.stores LIMIT 1)`, que não é membership do actor. `:55-99` torna `product-media` público e cria SELECT público por bucket (`:64-66`), enquanto insert/update/delete não amarram o path ao tenant. `supabase/migrations/20260819120000_storage_and_media_rls_hardening.sql:8-50` amplia buckets públicos e policies `USING/WITH CHECK` por `bucket_id`, inclusive upload/update/delete sem namespace de usuário.

`supabase/migrations/20270114020000_studio_upload_asset_rights_ledger.sql:37-65` corrige as policies de `media_assets` para membership e bloqueia insert direto de anon/authenticated, mas não revoga/reformula todas as policies de `storage.objects` nem torna os buckets históricos privados. A efetividade e ordem de migrations não foram testadas from-zero; esse item permanece bloqueador W9.2.

**Correção local de baixo risco:** migration aditiva revisada com membership/path prefix para `storage.objects`, separar buckets públicos de privados, eliminar `LIMIT 1` e policies bucket-wide; somente aplicar após replay completo, snapshot de `pg_policies`/buckets e teste JWT A/B.

### W9-B08 — quota/job é contrato SQL local, mas custo é controlado pelo cliente e não há worker/provider no checkout

`src/services/ai-media-jobs.functions.ts:17-38` aceita `quotaTokens` no request (`:18`) e grava diretamente `quota_tokens: data.quotaTokens` (`:34`). Um cliente pode fornecer zero ou valor inadequado para a cobrança esperada. A função cria/consulta `ai_async_jobs`, mas não chama provider.

A migration `20261007000001_ai_media_jobs_quota_lifecycle.sql:33-61` implementa claim com `FOR UPDATE SKIP LOCKED`; `:64-104` cancel/retry; `:106-135` finalização/charge. Porém `src/services/ai-media-jobs.functions.ts:72-82` só expõe finalização “chamada somente pelo worker confiável”, e não foi localizado consumidor de `claim_ai_async_job`/`finalizeAiMediaJob` nem provider de imagem no checkout. O teste `ai-media-jobs.functions.test.ts` apenas confirma strings.

Há ainda uma expressão sem sentido/invariante fraca em `:131`: `quota_charged = (v_job.quota_tokens = 0 OR true)`, que sempre resulta `true`. Embora a cobrança esteja antes e a transação deva abortar em caso de quota insuficiente, a expressão mascara o fato e merece correção/teste de idempotência.

**Correção local de baixo risco:** calcular quota server-side a partir do plano/prompt/modelo; reservar antes de iniciar provider; impedir `quotaTokens` arbitrário; implementar worker autorizado ou declarar o job explicitamente não executável; corrigir a expressão e testar sucesso/falha/cancelamento/retry/duplo finalize em Postgres.

## 6. O que está positivo, mas não fecha a wave

- `src/services/omni-builder.functions.ts:166-217` valida ledger Unsplash e `media_assets` por `identity.store_id` antes de RPC e chama auditor de publicação.
- `src/lib/builder/asset-contract.ts:79-115` tem regras conservadoras para provenance; `:121-154` verifica correspondência de upload com ledger/path/tenant/attestation.
- `uploadMediaUniversal` tem assinatura de bytes para raster Studio (`storage.functions.ts:435-445`), SHA-256 (`:446`), dimensões (`:447`) e cleanup em falha antes de retornar (`:532-545`).
- A migration de rights ledger substitui a policy `LIMIT 1` de `media_assets` por membership (`20270114020000:37-65`). Isso é uma melhoria local clara, mas não demonstra que migrations posteriores estão aplicadas nem corrige automaticamente `storage.objects` público.
- O renderer público e o editor Omni existem no SHA atual; a lacuna é a jornada executada, não a inexistência textual da rota.

## 7. Bloqueadores para fechar W8/W9

1. **Banco:** nenhuma aplicação das migrations from-zero, segunda aplicação, snapshot de constraints/triggers/functions/policies/grants ou teste de idempotência.
2. **RLS/tenant:** nenhum JWT real/`SET ROLE` A/B para Studio, builders, `media_assets`, `storage.objects` ou RPCs.
3. **Storage:** nenhum upload de bytes reais, verificação de hash/dimensões/MIME, path, bucket, expiração, CORS, download e isolamento.
4. **Provider/worker:** nenhum provider autorizado/sandbox e nenhum worker observável ligado ao lifecycle de AI media.
5. **Browser:** nenhum Playwright/SSR/reload/nova sessão para create→save→reload→reopen→publish→rollback ou generate→Storage→Studio→publish→download.
6. **CMS:** falta teste por todas as consultas públicas de scheduling, incluindo `getHotpageBySlug`, e teste de seções vazias.
7. **CI/release:** os testes locais não são CI; não há check CI/deploy/smoke no mesmo SHA candidato neste trabalho.
8. **Baseline candidato:** worktree está suja e contém mudanças/deleções de outras frentes; não usar esse estado como SHA de promoção sem freeze/reconciliação W0/W1.

## 8. Safe fixes recomendados ao agente principal

As ações abaixo são locais, reversíveis e de baixo risco relativo, mas não devem ser apresentadas como fechamento de wave sem as provas acima:

1. **Studio hydration/ownership:** implementar hidratação keyed por `projectId`, bloquear save durante loading/error, derivar tenant server-side, restringir get/update/delete/list e adicionar regressões cross-tenant.
2. **Carrossel:** remover fallback anônimo/global, rejeitar `storeId` divergente, transformar erro de insert em falha explícita e eliminar UUID sintético de sucesso.
3. **Social publish:** exigir projeto/asset ledger, rejeitar URL arbitrária, usar operação transacional/idempotente e não retornar `success: true` com `postId`/`storyId` nulos.
4. **SVG:** serializar/escapar XML, allowlist HTTPS e testes adversariais.
5. **Omni publish:** tornar retry do mesmo snapshot idempotente no RPC; manter o legado fora do caminho suportado ou fazer com que use a mesma transação.
6. **GET público:** remover auto-seed de loaders; sem mutação em request público.
7. **Scheduling:** aplicar `isCampaignActive` ao lookup por slug e revisar todas as queries públicas.
8. **Storage/provenance:** convergir callers ao upload universal, manter `asset_id` como vínculo canônico e aditivar policies tenant/path-scoped somente após replay local.
9. **Jobs/quota:** não aceitar preço/quota do cliente; adicionar worker/provider real autorizado e testes de DB/fault injection.

## 9. Conclusão de auditoria

O resultado é **parcial, não bloqueado para inspeção local, mas bloqueado para promoção/fecho W8/W9**. Os testes focados passam como prova local; eles não invalidam os bugs confirmados nem substituem banco, Storage, provider, browser, CI ou deploy. Nenhuma wave foi declarada concluída.
