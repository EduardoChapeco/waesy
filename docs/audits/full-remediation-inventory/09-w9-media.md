# Inventário de remediação — W9 imagens, Studio, assets, Storage e provenance

**Data da auditoria:** 2026-10-07  
**Escopo:** somente W9 — geração/ciclo de vida de imagem e mídia, Studio, assets, Supabase Storage, jobs/quota e provenance.  
**Método:** leitura somente; nenhum arquivo de código foi editado, nenhum commit, push, merge, migration aplicada ou deploy executado.

## 1. Estado congelado e limites da evidência

- Repositório auditado: `EduardoChapeco/waesy`.
- Branch atual: `audit/full-remediation-20261007`.
- `HEAD`: `fc8f9fc348389029d6e2ac84c5f37a06b0347f30`.
- `origin/main`: `919c86881db1ce83de3feae7fcf7df5aadb58b7d`.
- Divergência: `HEAD` está 2 commits à frente e 0 atrás de `origin/main`; os commits locais são `fe0417ae` e `fc8f9fc3`, ambos de fluxo turístico/voucher, **não são remediação W9**.
- O worktree já continha artefatos não rastreados (`docs/audits/LEDGER-20261007-FULL-REMEDIATION.md`, este diretório e `docs/specs/SPEC-20261007-FULL-REMEDIATION-EXECUTION.md`). Foram preservados; não usar `git add -A`.
- O masterplan declara como base documental anterior `origin/main` em `2ebb04f...` e, na seção de execução, registra que conclusões de outros SHAs são históricas. A spec ativa fixa a execução em `fc8f9fc3` contra `origin/main` `919c8688`. Portanto, o código observado aqui é o SHA atual; relatórios e claims anteriores não são prova de comportamento atual sem replay.
- Nenhum request real contra Supabase/Storage, provider de imagem, Cloudflare ou browser foi executado nesta frente. A classificação abaixo separa código/teste estático, histórico, hipótese e não verificado.

## 2. Contrato W9 do masterplan

O masterplan (`docs/audits/WAESY_HOLISTIC_REMEDIATION_MASTERPLAN_2026-10-06.md:189-198`) exige quatro gates:

1. **W9.1 — Diferenciar real e determinístico:** provider/job ID, provenance e saída válida; fixture/fallback explicitamente rotulado.
2. **W9.2 — Persistir em Storage:** upload real, path tenant-scoped, MIME, dimensão/bytes, hash, ownership e URL assinada; sobrevivência a reload e isolamento de leitura/escrita.
3. **W9.3 — Quota e jobs:** limites, saldo, idempotência, status/progress, timeout, cancelamento e retry; cobrança única somente segundo a regra de sucesso.
4. **W9.4 — Preview/export/download:** renderização real, artefato vinculado, URL expirável e download seguro; browser abre a imagem real em nova sessão.

A spec ativa (`docs/specs/SPEC-20261007-FULL-REMEDIATION-EXECUTION.md:12-19,33-43`) também impede declarar resolução por typecheck/build/teste estático isolado e proíbe incorporar branches paralelas sem comparação explícita.

## 3. Findings confirmados no código atual

### W9-01 / BUILD-F04 — Studio não hidrata `projectId` antes de editar/salvar

**Severidade histórica:** high. **Estado:** confirmado no código; comportamento de banco/reload não verificado.

**Evidência:**

- `src/routes/workspace.estudio.index.tsx:19` importa `getStudioProjectById`, mas não há chamada a essa função no componente.
- `src/routes/workspace.estudio.index.tsx:27-29` aceita `search.projectId`; `:61-90` inicializa `projectId`, título, background e elemento default (`SUPER OFERTA DA SEMANA`) sem query de hidratação.
- `src/routes/workspace.estudio.index.tsx:117-120` lista projetos, mas não renderiza biblioteca/seleção de reabertura no trecho auditado.
- `src/routes/workspace.estudio.index.tsx:123-145` envia o estado local ao save, inclusive o `projectId`, e exibe toast de sucesso.

**Risco:** abrir URL com UUID existente e salvar sem hidratar pode sobrescrever `canvas_data` real com defaults; troca de UUID pode deixar estado anterior no componente. Isso é uma inferência operacional forte a partir do fluxo, mas exige teste contra banco para confirmar a perda.

**Gate de fechamento:** teste route/component com mock de projeto real cobrindo título, aspect ratio, background/elements/tracks; teste save após reload sem edição preservando snapshot; teste alternando dois UUIDs; bloqueio de save enquanto loading/error.

### W9-02 / BUILD-F05 + IMAGE-F01 — Ownership ausente/inconsistente no CRUD Studio

**Severidade histórica:** critical. **Estado:** confirmado no código; eficácia final de RLS no banco remoto não verificada.

**Evidência:**

- `src/services/studio.functions.ts:96-115` (`getStudioProjectById`) consulta `.eq("id", data.id)` sem identidade, `store_id` ou `user_id`.
- `src/services/studio.functions.ts:121-171` (`saveStudioProject`) deriva `store_id`/`user_id` do identity no payload, mas em update faz apenas `.eq("id", data.id)` (`:147-153`); não há `assertStoreAccess` nem predicado de proprietário/loja. O update também pode reatribuir o registro ao ator corrente ao enviar novo payload.
- `src/services/studio.functions.ts:176-193` (`deleteStudioProject`) obtém identity, mas exclui apenas por UUID (`:186`), sem usar identity.
- `listStudioProjects` (`:53-91`) tem escopo parcial: se o caller fornece `data.store_id`, o valor arbitrário é usado (`:71-72`); sem ele, combina loja e usuário (`:73-76`). Não há prova de que o `store_id` pedido pertence ao actor.
- Os handlers usam `getServerClient` (`:8,64,103,134,184`), portanto não se deve presumir que RLS compense predicados ausentes; a prova de autorização precisa ser feita com JWT/RLS reais.

**Blast radius:** leitura, alteração e deleção cross-tenant por UUID, sujeito ao comportamento efetivo do client/policy instalada.

**Gate:** matriz anon/civil/owner/tenant externo/admin; teste de update/delete por UUID de outra loja; query real com `SET ROLE`/JWT; verificar erro, count/linha afetada e leitura posterior.

### W9-03 / IMAGE-F02 — Geração de carrossel confia em `storeId` e admite caminho sem identidade

**Estado:** confirmado no código histórico observado no SHA; impacto provider/storage não verificado.

**Evidência:** o finding do masterplan aponta `src/services/studio.functions.ts` para `generateCarouselFromMinedContent`; o trecho de implementação aceita `storeId` derivado do payload/caminho e o fluxo de publicação usa `store_id: storeId || null` (`:1531-1534` no arquivo atual). A auditoria deve tratar qualquer `storeId` vindo do cliente como não confiável até derivá-lo da sessão e verificar acesso.

**Risco:** conteúdo, projeto e post podem ser criados para loja arbitrária ou global (`NULL`). Requer replay do handler exato e request autenticado para provar a exploração; não é prova de que provider externo foi chamado.

**Gate:** remover confiança no body, derivar tenant no servidor e testar A/B; impedir criação com `store_id` nulo quando a regra exigir loja; assert de erro antes de qualquer chamada externa.

### W9-04 / IMAGE-F03 — Caminhos de imagem do Studio não fecham provider → job → Storage → artifact/provenance

**Estado:** confirmado como lacuna de integração no código; não verificado se há worker externo/deploy fora do repositório.

**Evidência:**

- `src/routes/workspace.estudio.index.tsx:213-228` exporta PNG via `exportElementAsImage` no navegador; modo vídeo apenas mostra informação de processamento (`:213-217`), sem render/export real.
- A infraestrutura `src/services/ai-media-jobs.functions.ts:17-39` cria registro em `ai_async_jobs`, mas não chama provider nem faz upload de resultado; `:72-83` apenas delega finalização a RPC.
- A auditoria do masterplan registra que OpenAI/DALL-E e `ai_async_jobs` aparecem em migrations/AI Core, mas não são usados pelo caminho efetivo de imagens Studio; os caminhos usam URLs/`media_urls` diretamente e não apresentam `asset_id`, provenance, licença ou vínculo durável Studio→artifact.
- `studio.functions.ts:1531-1563` publica `media_urls`/`media_url` diretamente em posts/stories e transforma falhas em warning (`:1542-1544`), enquanto o retorno continua utilizável; isso não prova que a mídia existe em Storage.

**Risco:** preview/local download parece sucesso, mas não há artefato recuperável após reload, nem cadeia auditável de origem/modelo/provider/licença.

**Gate:** contrato único de `MediaAsset`/artifact com `asset_id`, `source_kind`, provider/job ID, hash, MIME, bytes, dimensões, bucket/path, ownership e provenance; fluxo real que só publica após upload e leitura posterior confirmados; worker observável e teste de provider indisponível.

### W9-05 / IMAGE-F04 — Falha de persistência do carrossel pode virar `projectId` fictício/sucesso

**Estado:** finding histórico confirmado pela auditoria documental; replay do bloco completo no SHA atual pendente.

**Evidência histórica:** masterplan `:2048-2086` descreve catch/warning de persistência e fallback de ID como sucesso. No código atual, o padrão de publicação em `studio.functions.ts:1542-1544` confirma que erro de escrita do feed é apenas warning. Não foi possível, com a janela de leitura utilizada, provar cada linha do fallback de `projectId`; classificar o detalhe do ID como **a confirmar**, não como fato novo.

**Gate:** fault injection entre insert de projeto e insert de mídia/post; resposta deve falhar explicitamente ou retornar estado reprocessável, nunca UUID sintético; conferir `error`, linha/count e reload.

### W9-06 / IMAGE-F05 — Publicação não exige artefato vinculado nem falha honesta

**Estado:** confirmado no código quanto à ausência de associação de artifact e ao warning; persistência remota não verificada.

**Evidência:** `src/services/studio.functions.ts:1502-1507` valida somente URLs de capa/slides; `:1531-1537` grava `media_urls` e status `published`; `:1542-1544` apenas registra warning se insert de post falhar; `:1553-1563` insere story com somente `media_url` e campos editoriais. Não aparece `asset_id`, `artifact_id`, hash, bucket/path ou provenance nessa escrita.

**Risco:** feed/story anuncia publicado sem post e sem mídia controlada; URLs remotas podem expirar, quebrar CORS ou mudar conteúdo.

**Gate:** publicação transacional/idempotente após artifact existente, ownership validado e URL assinada/expiração definida; erro de qualquer escrita impede status publicado; reload lê o mesmo artifact.

### W9-07 / IMAGE-F06 — SVG de Stories aceita markup/URL não neutralizados

**Estado:** confirmado como risco no código/finding histórico; execução em browser/download não verificada.

**Evidência histórica:** masterplan `:2087-2118` descreve interpolação de `title`, `subtitle`, `storeName` e `imageUrl` em SVG. Os testes necessários são explicitados pelo documento: `&`, `<`, `>`, aspas, `<script>`/event handlers e esquemas `javascript:`/`data:`. Não foi encontrado teste comportamental W9 que parseie SVG, rejeite esquema ou abra o download; o teste `ai-media-jobs.functions.test.ts` é apenas inspeção textual.

**Gate:** escape XML/serializer, allowlist de URL `https`, download com Content-Disposition seguro, preview em `img/blob` (não `innerHTML`), testes de parser e payload adversarial.

### W9-08 / TEST-F01 — “Gerar Imagem” pode ser fixture/logo e não geração real

**Estado:** histórico/hipótese a replayar no SHA atual; não marcar como produção confirmada.

**Evidência:** masterplan `:2391-2407` registra o finding como teste incapaz de diferenciar logo estático de capa gerada. A implementação observada de export Studio (`workspace.estudio.index.tsx:213-228`) é local e determinística; não há nela provider, job ou Storage. Isso confirma ausência de prova de geração real nessa rota, mas não prova que toda UI denominada “Gerar Imagem” retorna sempre logo.

**Gate:** teste contra provider/job real ou fixture explicitamente rotulada; resposta deve conter `provenance`, provider/model/job ID, bytes válidos e artifact persistido. Falha deve deixar estado retryable sem toast de sucesso.

## 4. Storage, assets e provenance — inventário transversal

### Confirmado

- `src/services/storage.functions.ts:7-24` aceita MIME amplo, incluindo `image/svg+xml` e `application/octet-stream`; `:76-83` valida apenas o header informado, não magic bytes/decodificação universal.
- `getSignedUploadUrl` (`:113-183`) autentica identidade, aplica rate limit, cria path baseado em `store_id || userId` (`:146-153`) e retorna signed/public URL (`:155-177`). Contudo, não grava `media_assets`, não exige hash/dimensões/bytes reais e expõe `publicUrl` para buckets não privados; upload direto não é prova de vínculo de asset.
- `getPostMediaSignedUrl` (`:196-233`) usa path por `identity.id`, retorna `publicUrl` e não cria registro de asset/provenance.
- `uploadStoreMedia` (`:238-283`) exige staff e path `stores/${folder}/...`, mas aceita bucket arbitrário permitido e faz `upsert: true`; não cria `media_assets`, não verifica bytes mágicos e retorna URL pública.
- `supabase/migrations/0067_media_assets_pipeline.sql:3-16` possui `media_assets` com store, nome, tamanho, MIME, bucket/path, URL e uploader, mas não hash, dimensões, provider/job ou provenance. `:25-50` usa policies com `(SELECT id FROM public.stores LIMIT 1)`, que não é escopo do tenant autenticado e é um bloqueador de segurança confirmado no arquivo versionado.
- A mesma migration (`:55-99`) torna `product-media` público e permite SELECT público por bucket (`:64-66`); upload/update/delete usam somente role de perfil e não demonstram vínculo da pasta ao store. Isso contradiz W9.2 para mídia privada/tenant-scoped.
- `supabase/migrations/20270107000000_document_artifacts_ocr_provenance.sql:4-32,34-45,54-79,98-101` cria `document_artifacts`/links com bucket/path, sha256, source_kind, provenance e RLS `is_store_staff`. É um precedente de provenance para documentos, **não** uma prova de que Studio/imagens usam o modelo.
- `supabase/migrations/20261007000001_ai_media_jobs_quota_lifecycle.sql` define job lifecycle/RPCs com claim `FOR UPDATE SKIP LOCKED`, cancelamento, retry e finalização; `:106-146` cobra em sucesso via `ai_job_charges`/`consume_store_tokens_scoped`, com idempotência de charge e grants a `service_role`. Isso comprova contrato SQL versionado, não execução de worker/provider.

### Não verificado / dependências

- Ordem e aplicação efetiva das migrations no projeto remoto, policies ativas e existência/configuração real dos buckets.
- Worker que consuma `ai_async_jobs`, provider de imagem, timeout e callback; nenhum consumidor evidente foi localizado no repositório.
- Implementação/deploy da Edge Function `sw-brand-generate`.
- CORS, disponibilidade, expiração e conteúdo das URLs externas; browser preview/download e sobrevivência após nova sessão.
- Quota/saldo efetivamente debitados em ambiente com tokens reais; o teste existente não executa Postgres/RPC.

## 5. Testes e qualidade da evidência

`src/services/ai-media-jobs.functions.test.ts:1-45` existe, mas lê os arquivos como texto (`fs.readFileSync`) e usa `toContain` para comprovar strings. Ele verifica presença nominal de idempotency, filtros, `SKIP LOCKED`, retry, charge e grants; **não** prova handler, RLS, provider, upload, bytes, artifact, provenance, concorrência, retry real ou browser. Não foi localizado teste de integração equivalente para `studio.functions.ts`/Storage que execute Supabase real, nem teste browser do Studio/Stories. Logo, W9.3 tem contrato estático parcialmente documentado; W9.1, W9.2 e W9.4 permanecem abertos.

## 6. Riscos de mistura com branches remotas e histórico

- Não incorporar automaticamente `origin/feat/waesy-studio-omni-audit`, `origin/feat/waesy-niche-template-factory`, `origin/chore/recover-waesy-task-2026-10-06`, `origin/audit/recursive-p0-remediation` ou outras branches. O masterplan lista essas linhas como paralelas e exige comparar paths/commits/ownership.
- A branch `origin/feat/waesy-niche-template-factory` está em `a6afc304`, fora do histórico atual, e adiciona pipeline de nicho/Unsplash; isso pode parecer remediação de imagem, mas não foi cherry-picked nem validado contra W9.
- O diff atual contra `origin/main` é dominado por turismo/voucher e design, não W9. Não inferir que os dois commits locais fecharam mídia/Studio.
- Relatórios no masterplan e claims de PRs #1–#6 são históricos; check/deploy remoto e produção não foram revalidados nesta frente.

## 7. Microfases atômicas e gates propostos

1. **W9.0 — Baseline e ownership ledger (bloqueante):** congelar SHA, branches, paths e findings W9; registrar reprodução mínima sem mutação. Gate: `git status`, diff contra base e matriz de paths aprovados arquivados.
2. **W9.1a — Canonical media contract:** definir DTO/schema único para `asset_id`, owner/store, source kind, provider/model/job, provenance, hash, MIME/bytes/dimensões, bucket/path e status. Gate: contract tests rejeitam URL sem artifact/provenance e não confundem fixture com provider real.
3. **W9.1b — Provider/job boundary:** conectar somente a geração real ao `ai_async_jobs`; derivar tenant da sessão, registrar provider/job ID, timeout/cancel/retry e fallback explicitamente `deterministic`. Gate: provider indisponível não retorna sucesso nem cobra; replay é idempotente.
4. **W9.2a — Storage quarantine/upload:** validar MIME por bytes, limites de dimensão/tamanho, SHA-256, path tenant-scoped e upload; inserir `media_assets` atomicamente. Gate: leitura/escrita A/B e anon falham; registro e objeto sobrevivem a reload.
5. **W9.2b — RLS/migration repair:** substituir policies `SELECT id FROM stores LIMIT 1`, revisar bucket público, grants e sequência das migrations em Postgres vazio e banco representativo. Gate: JWT/role matrix e diff de schema confirmam isolamento; sem produção nesta microfase.
6. **W9.3 — Quota/job integration:** exercitar RPCs reais com saldo, retry, cancelamento, concorrência e falha entre provider e charge. Gate: exatamente uma cobrança em sucesso; zero cobrança em falha/cancelamento; estado retryable observável.
7. **W9.4a — Studio rehydrate/CRUD:** implementar e testar get-by-ID, seleção de biblioteca, troca de projeto e update/delete com ownership. Gate: save sem edição preserva snapshot; UUID tenant externo não lê/altera/exclui.
8. **W9.4b — Publish/artifact:** publicação só aceita assets existentes e owned, cria links duráveis e não usa `media_urls` remota como fonte de verdade; falhas não viram warning-success. Gate: erro entre writes é recuperável/idempotente e reload mostra o mesmo artifact.
9. **W9.4c — SVG/preview/download security:** escapar XML, allowlist HTTPS, remover handlers, preview seguro e Content-Disposition. Gate: payload adversarial parseia sem script/injeção; browser abre somente conteúdo permitido.
10. **W9.5 — Browser/provider release gate:** Playwright com sessão/dados por tenant cobre gerar→job→Storage→Studio→publish→reload→download; provider e deploy/staging devem ser rotulados separadamente. Gate: CI no SHA candidato verde; produção somente com autorização explícita.

## Veredito

A frente **W9 está aberta e não pronta para encerramento**. Há contratos SQL recentes para jobs/quota e um teste estático que documenta parte deles, mas o caminho efetivo Studio/imagem ainda não demonstra a cadeia exigida pelo auditor — ação→identidade/tenant→provider/job→Storage→asset/artifact→provenance→preview/download→reload. Os problemas de ownership no CRUD Studio, ausência de vínculo asset/provenance, publicação tolerante a falha e policies Storage permissivas estão confirmados no código/migrations; provider real, worker, banco remoto, browser e produção permanecem não verificados.
