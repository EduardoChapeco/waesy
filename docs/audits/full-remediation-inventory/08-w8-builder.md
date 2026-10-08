# Inventário de Remediação — W8 Builders, publicação, templates e CMS

**Data da auditoria:** 2026-10-07  
**Repositório:** `EduardoChapeco/waesy`  
**Branch auditada:** `audit/full-remediation-20261007`  
**HEAD:** `fc8f9fc348389029d6e2ac84c5f37a06b0347f30` (`audit: make voucher document apply atomic`)  
**Base local observada:** `origin/main` / `919c86881db1ce83de3feae7fcf7df5aadb58b7d`  
**Escopo:** W8 do masterplan: builders/Studio, salvar/reabrir/publicar, templates, editor/biblioteca e CMS/publicação relacionada.  
**Regra aplicada:** este documento é somente auditoria; nenhum arquivo de código, migration, commit, push, deploy ou banco foi alterado.

## 1. Veredito executivo

**W8 permanece aberto e não verificável end-to-end.** Há uma base de contratos, testes unitários e uma migration de snapshot Omni que aparenta endereçar parte de ownership, versionamento e idempotência, mas isso não prova a jornada real `create → edit → save → reload → reopen → publish → URL pública`, nem prova RLS/provider/browser/deploy. O caminho legado `publishBuilderVersion` ainda contém uma sequência multi-write best-effort e não verifica os erros de arquivamento e exclusão antes de continuar. A publicação, portanto, não pode ser classificada como atômica nem como comprovadamente recuperável.

O estado atual também contém **duas famílias de contratos**: o builder legado baseado em `experience_nodes`/`experience_versions` e o Omni baseado em snapshot JSON/RPC. Os adapters e testes cobrem conversão e contratos em memória, mas a auditoria não encontrou prova de que todos os entry points, deep links, editores e superfícies públicas usam uma única cadeia canônica. O inventário de rotas encontrou links para `/paginas/$slug`, porém a existência, loader público, filtro estrito de versão publicada e comportamento anônimo desse destino não foram provados no SHA auditado.

CMS possui campos/migrations de agendamento (`starts_at`, `ends_at`, `auto_archive_at`) e interfaces de hotpages/publicações, mas a presença de colunas e filtros de serviço não é prova de que **todas** as queries públicas (banners, hotpages, marketplace sections e páginas) ocultam itens fora da janela e seções vazias. Não foi executado banco efêmero, RLS com JWT, browser, reload, smoke público ou CI do SHA final.

## 2. Snapshot e risco de mistura

- `git status --short --branch` mostrou a branch correta, mas com artefatos não rastreados preexistentes de auditoria: `docs/audits/LEDGER-20261007-FULL-REMEDIATION.md`, `docs/audits/full-remediation-inventory/` e a spec ativa. Eles foram preservados; este relatório é o único arquivo solicitado neste escopo.
- Não há código W8 modificado pelo trabalho desta auditoria. O diff de `HEAD` contra `origin/main` é principalmente a trilha P0 de turismo/voucher; não deve ser confundido com implementação de W8.
- A documentação histórica do masterplan registra PR #4 (`feat/waesy-studio-omni-audit`, head `0bc67e4`) fechado, PR #5 aberto e PR #6 aberto no snapshot documental, com checks Cloudflare falhos. Esses estados são históricos e não substituem uma consulta/reexecução no SHA atual.
- Existem branches remotas com sobreposição material: `origin/feat/waesy-studio-omni-audit`, `origin/feat/waesy-niche-template-factory`, `origin/chore/sync-task-qhMPHRy4`, `origin/audit/recursive-p0-remediation` e `origin/chore/recover-waesy-task-2026-10-06`. A branch `feat/waesy-niche-template-factory` tem 312 paths W8-like contra 299 em `HEAD` e commit `a6afc304`; não incorporar/cherry-pickar sem diff por path, ownership e revisão de contratos.
- **Risco de mistura:** os commits históricos incluem alterações de `src/components/builder/*`, `src/lib/builder/*`, `src/services/omni-builder.functions.ts`, `src/services/builder.functions.ts`, docs e migrations. Um merge amplo pode trazer templates/AI/Unsplash ou migrations fora de W8, duplicar registries ou substituir os caminhos legados sem atualizar rotas/tests.

## 3. Contrato normativo e cartão W8

O masterplan define W8 em `docs/audits/WAESY_HOLISTIC_REMEDIATION_MASTERPLAN_2026-10-06.md:177-186`:

1. **W8.1 — Unificar roteamento:** route tree, registries, menus, deep links, redirects e URL do artefato chegam ao mesmo builder/draft autorizado.
2. **W8.2 — CRUD persistente:** create→edit→save→reload→reopen recupera o mesmo conteúdo/versão.
3. **W8.3 — Publicação/preview:** separar draft/published, validar slug/permissão/cache e render público; rollback sem perda.
4. **W8.4 — Editor/biblioteca:** templates, mídia, preview, undo/redo, seleção, atalhos, estados e responsividade persistem; upload falho não perde edição.
5. **W8.5 — Segurança/multi-tenant:** IDs de projeto/template/publicação não cruzam tenant; actions revalidam server-side; RLS real e logs sem conteúdo privado.

A spec ativa (`SPEC-20261007-FULL-REMEDIATION-EXECUTION.md:12-19,33-43`) exige baseline e paths antes de editar, microfases atômicas, escrita terminal tenant-aware/idempotente/atômica, estados UI honestos e separação de evidência local, integração, browser, CI e produção. Nenhum desses gates deve ser promovido por inferência.

## 4. Evidências confirmadas no código/artefatos

### W8-C01 — Existem duas cadeias de persistência/publicação; a cadeia legada não é transacional

**Estado:** confirmado no código; correção não declarada.  
**Evidência:** `src/services/builder.functions.ts:2625-2720` implementa `publishBuilderVersion`: busca a versão e resolve store (`:2641-2652`), arquiva publicadas (`:2654-2659`), apaga nós (`:2661-2662`), reinsere nós (`:2664-2703`) e só depois atualiza status para `published` (`:2705-2713`). Os erros do `update` de arquivamento e do `delete` de nós não são capturados/verificados antes da próxima escrita. O método faz múltiplas operações separadas no cliente e não demonstra RPC/transação/compensação. O retorno `success` depende apenas da última atualização e pode deixar estado parcial se uma operação anterior falhar silenciosamente.

**Impacto:** publicação pode arquivar a versão anterior, remover nós e falhar antes de inserir/marcar a nova; ou publicar com remoção/arquivamento não confirmados. A falha pode afetar o isolamento entre draft e published, rollback e render público.

**Dependência:** decidir se `publishBuilderVersion` é caminho suportado ou legado morto. Se suportado, precisa de uma operação única; se legado, provar que nenhum editor/rota o chama e removê-lo somente em fase própria.

### W8-C02 — Há uma migration Omni promissora, mas sua integração com todas as superfícies não está provada

**Estado:** confirmado que o contrato/migration existe; integração não verificada.  
**Evidência:** `supabase/migrations/20261007000000_builder_versioned_omni_snapshots.sql:38-53` verifica actor/store e documento; `:56-73` localiza draft e retorna idempotência para snapshot igual; `:75-104` calcula versão, arquiva publicada e insere draft/published; `:117-123` atualiza o documento; `:136-138` revoga grants públicos e concede execução apenas a `service_role`. Os testes `src/services/omni-builder.functions.test.ts:24-68` cobrem por análise textual/mocks a chamada RPC, publicação confirmada, reidratação e propriedades da migration.

**Limite da prova:** não foi aplicado o conjunto de migrations em Postgres vazio, não foi executado com JWT/roles, não foi verificado que o caminho UI usa a RPC em todos os casos, e não houve leitura posterior real após reload. O teste de migration não é prova de banco, RLS ou browser.

### W8-C03 — O catálogo/adapter/auditor de templates tem contratos estáticos relevantes

**Estado:** confirmado no código/teste unitário; publicação real não verificada.  
**Evidência:** `src/lib/builder/omni-experience-adapter.ts:14-48` preserva IDs, ordem, config, estilos, visibilidade e assets ao converter documento Omni para nós. `src/lib/builder/studio-template-audit.ts:198-235` audita licenças, acessibilidade, performance, contraste e expõe `getPublicationBlockingFindings` (`:220-222`). `src/lib/builder/studio-contract.test.ts:32-82` cobre origem/versionamento, provenance/asset desconhecido, motion-safe e lookup estrito; `studio-template-audit.test.ts:45-118` cobre imagens, alt, orçamento estrutural, catálogo e findings bloqueantes.

**Limite da prova:** são funções puras/unitárias. Não há prova de que `getPublicationBlockingFindings` seja uma barreira obrigatória no endpoint que publica o builder legado ou em todas as publicações CMS. Não prova assets existentes no Storage, licença real, upload, preview, performance de browser ou render público.

### W8-C04 — A migration CMS adiciona scheduling, mas é apenas schema/index

**Estado:** confirmado no código; comportamento end-to-end não verificado.  
**Evidência:** `supabase/migrations/20270107000000_cms_locality_and_banner_auto_archive.sql:4-12` adiciona `hotpages.city_filter`, `banners.auto_archive_at` e índice `idx_banners_scheduling(starts_at, ends_at, auto_archive_at)`. A listagem de serviços contém campos/status de hotpages e publicação, e `src/routes/workspace.marketing.publicacoes.tsx:41-44` exibe estados `draft`, `scheduled`, `publishing` e `published`.

**Limite da prova:** índice/coluna não implementam automaticamente filtragem. É necessário provar cada query pública, timezone/null semantics, `starts_at`/`ends_at` inclusivos ou exclusivos, auto-arquivamento, ocultação de seções vazias e ausência de layout quebrado.

### W8-C05 — Entry points visuais existem, mas a unificação de route tree/URL pública não está comprovada

**Estado:** hipótese operacional forte / não verificado end-to-end, com evidência parcial de UI.  
**Evidência parcial:** `src/routes/workspace.builder.$documentId.editor.tsx` é um entry point de edição; `src/routes/workspace.cms.paginas.index.tsx` navega para `/workspace/builder/$documentId/editor` e oferece ação “Ver” para `/paginas/$slug` (linhas observadas no arquivo, card e ações em torno de `:330-359`, `:374-400`). O inventário de rotas encontrou referências ao destino público.

**Gap:** não foi demonstrado neste SHA um loader público de `/paginas/$slug` que selecione exclusivamente a versão publicada do tenant correto, nem que o deep link, menu, redirect e editor reabram a mesma entidade/versão. Isso deve permanecer como não verificado, não como bug de produção confirmado, até reprodução browser/servidor.

### W8-C06 — Testes existentes têm boa cobertura de contratos locais, mas não fecham W8

**Estado:** confirmado no inventário de testes; cobertura E2E ausente/não executada.  
**Evidência:** `src/services/omni-builder.functions.test.ts` tem apenas quatro cenários declarados (RPC/save, publish, get/reload conceitual e migration/grants); `src/components/builder/omni-builder.test.ts` cobre árvore/imutabilidade/templates em memória; `src/lib/builder/studio-contract.test.ts` e `studio-template-audit.test.ts` cobrem contratos puros; `src/services/builder.functions.test.ts` e `src/services/pwa-omni-builder-v145.test.ts` existem, mas o inventário não demonstrou uma jornada com Postgres/Storage/browser real.

**Ausências que permanecem:** caso negativo de tenant/IDOR com JWT real, erro de cada write, retry concorrente, rollback real, slug duplicado, cache invalidation, reload nova sessão, upload parcial, mídia faltante, rota pública anônima, desktop/mobile/foco e deploy.

## 5. Findings classificados

| ID | Classificação | Severidade conservadora | Prova atual | O que não afirmar |
|---|---|---:|---|---|
| W8-C01 | **Confirmado no código** | Alta | Multi-write best-effort em `builder.functions.ts:2654-2713`; erros intermediários ignorados | Não afirmar que ocorre em produção sem reprodução/provider/DB |
| W8-C02 | **Confirmado no código; integração não verificada** | Alta | RPC/migration Omni com lock/ownership/idempotência e grants em migration `20261007000000...` | Não afirmar RLS/atomicidade real sem Postgres |
| W8-C03 | **Confirmado no código/teste unitário** | Média | Auditor de templates e testes de provenance/a11y/unknown block | Não afirmar que bloqueia toda publicação ou que licença/asset são reais |
| W8-C04 | **Confirmado no schema; comportamento não verificado** | Alta | Migration CMS cria scheduling columns/index | Não afirmar auto-archive/omissão pública sem query e browser |
| W8-C05 | **Não verificado; hipótese de divergência de routing/public URL** | Alta | Entry points/links observados; cadeia pública completa não provada | Não converter ausência de prova em bug confirmado |
| W8-C06 | **Confirmado como lacuna de cobertura** | Alta | Testes são unitários/mocks/contratos locais | Não chamar a implementação “quebrada” só por faltar E2E |
| W8-H01 | **Hipótese** | Alta | Coexistência de legado e Omni e branches de template | Pode haver adapter/route canônico não localizado; requer tracing de callers |
| W8-N01 | **Não verificado** | Alta | RLS, browser, cache, Storage, CI/deploy não executados nesta auditoria | Não marcar como corrigido, integrado ou produção |

## 6. Microfases atômicas propostas e gates

### W8.0 — Congelar ownership e grafo de chamadas

**Paths de leitura:** `AGENTS.md`, skill, masterplan, spec, `src/routes/workspace.builder.$documentId.editor.tsx`, `src/routes/workspace.cms.paginas.index.tsx`, registries, `builder.functions.ts`, `omni-builder.functions.ts`, testes e migrations listadas.  
**Ação:** gerar matriz `entry point → route → server function → tabela/RPC → renderer público`; mapear callers de `publishBuilderVersion`, RPC Omni e hotpage/CMS queries; comparar somente os commits `HEAD`, `origin/main`, PR #4 e `origin/feat/waesy-niche-template-factory`.  
**Gate:** nenhuma edição; matriz com SHA e paths; confirmação de qual fluxo é canônico e quais são legados. Bloquear se houver decisão de produto pendente.

### W8.1 — Unificar roteamento e identidade do documento

**Ação:** reproduzir cada entry point, deep link, menu e `/paginas/$slug`; conferir `document_id`, `store_id`, slug, role e redirect no servidor.  
**Gate positivo:** todos chegam ao mesmo draft autorizado e o público chega ao published correto.  
**Gate negativo:** ID de outro tenant, usuário sem role, slug inexistente/duplicado e draft sem published retornam erro/404 honesto; nenhum conteúdo privado é renderizado.

### W8.2 — CRUD persistente e reidratação

**Ação:** em Postgres efêmero, testar create→edit→save→reload→reopen em nova sessão; comparar snapshot/nós, versão e IDs estáveis.  
**Gate:** leitura posterior confirma linha/versão/conteúdo; retry do mesmo snapshot é idempotente; concorrência não duplica versão; falha de DB não retorna sucesso.

### W8.3 — Publicação atômica e rollback

**Ação:** escolher explicitamente RPC Omni ou novo RPC canônico; eliminar/isolá-lo do caminho suportado legado; cobrir archive/write/status em transação, slug, cache e rollback.  
**Gate:** fault injection em cada write mantém published anterior intacto; publicação só retorna sucesso após confirmação de versão e nós; URL anônima mostra nova versão; rollback mostra anterior sem perda. Testar também publicação vazia, nodes inválidos e retry.

### W8.4 — Templates, mídia e editor

**Ação:** ligar auditoria de templates à barreira real de publicação; testar aplicação como instância imutável com `source_template_id`/versão; upload/provenance/unknown block/undo-redo/preview e motion reduced.  
**Gate:** template não é mutado; unknown block produz diagnóstico seguro; asset sem provenance bloqueia; falha de upload preserva draft; preview não muta published; desktop/mobile/teclado/foco passam.

### W8.5 — CMS scheduling e superfícies vazias

**Ação:** auditar todas as queries BFF de banners, hotpages, marketplace sections e páginas contra `starts_at`, `ends_at`, `auto_archive_at`, timezone e localidade.  
**Gate:** antes/durante/depois da janela, item não elegível não aparece; item auto-arquivado não aparece; seção sem itens é completamente omitida sem gap/layout inválido; teste de null/tenant/role e paginação.

### W8.6 — RLS/IDOR real

**Ação:** aplicar migrations em banco efêmero e executar JWT de usuário/store A, B, admin, anon e `service_role`; testar IDs de projeto/template/versão/nó/publicação.  
**Gate:** cross-tenant select/update/delete/publish falha; grants da RPC conferidos; logs não contêm snapshot privado/segredo; `service_role` continua com autorização explícita.

### W8.7 — E2E browser e release evidence

**Ação:** Playwright autenticado e anônimo cobrindo jornada completa, reload e URLs; executar typecheck, lint/design, testes, build, migration-from-zero, CI e smoke somente se autorizado.  
**Gate:** evidência no mesmo SHA; separar `code`, `unit`, `integration`, `browser`, `CI`, `deploy`; nenhum status failed/cancelled/pending tratado como sucesso. W8 só pode ser encerrado com ledger preenchido e revisão adversarial independente.

## 7. Dependências, riscos e bloqueios

- **Dependências técnicas:** Postgres efêmero/Supabase de teste, fixtures de dois tenants, sessão JWT, Storage de teste, Playwright e provider/cache observável.
- **Dependências de produto:** definição única para slug duplicado, janela temporal, rollback, publicação vazia, semântica de preview e se `experience_nodes` legado continua suportado.
- **Risco de segurança:** confiar somente em `store_id` vindo do documento carregado ou em service-role; confirmar owner/role no servidor e RLS real.
- **Risco de consistência:** archive/delete/insert/update separados podem criar published sem nós, published antigo arquivado sem sucessor ou draft alterado durante publish.
- **Risco de routing:** `/paginas/$slug` pode ser link morto, rota duplicada ou consulta que não filtra `status=published`; só browser + resposta/DB fecham isso.
- **Risco CMS:** scheduling implementado em schema não garante filtragem uniforme; múltiplos serviços/queries podem exibir conteúdo fora da janela.
- **Risco de branches:** `origin/feat/waesy-niche-template-factory` e PR #4 têm sobreposição em registries/templates/Omni. Nenhuma mudança deve ser incorporada por merge amplo; fazer diff path-a-path e revalidar migrations em ordem.
- **Bloqueio atual:** não há prova no SHA auditado de Postgres/RLS/browser/CI/deploy para W8. Findings dependentes desses níveis permanecem **não verificados/bloqueados**, não corrigidos.

## 8. Conclusão

O estado atual tem trabalho substancial e testes de contrato úteis, especialmente no snapshot Omni e no auditor de templates, mas a definição W8 do masterplan exige efeito persistido e jornada pública verificável. O finding mais objetivo é `W8-C01`: a função de publicação legada executa uma sequência best-effort e ignora erros intermediários. O segundo risco é de integração: coexistem caminhos legado/Omni e superfícies CMS/publicação sem prova consolidada de que todos convergem para a mesma versão, tenant e URL pública. A próxima ação segura é W8.0, sem código, seguida de W8.1/W8.2 em ambiente representativo; não aprovar merge, release ou produção com base apenas nos testes unitários existentes.

**Status final da frente:** `aberta — evidência local parcial; integração, browser, CI e produção não verificados`. 
