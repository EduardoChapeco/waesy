# Waesy — Auditoria end-to-end de repositório, fases e release

**Data da fotografia:** 2026-10-12 16:02 BRT
**Repositório:** [`EduardoChapeco/waesy`](https://github.com/EduardoChapeco/waesy)
**Visibilidade:** público
**Branch padrão:** `main`
**SHA da `main` auditada:** `98c0d2c2f8c01793a327a12f814c17d9de5e2afb` (`98c0d2c2`)
**Decisão executiva:** `BLOCKED / STOP-SHIP` para merge, migration remota, deploy e produção até os gates externos descritos neste documento.

> Este relatório separa **evidência local reproduzida**, **trabalho já codificado** e **evidência externa ausente**. Teste unitário, typecheck, build ou documento não certificam Postgres/RLS, provider, Storage, browser, staging ou produção.

## 1. Identidade e dimensão real

| Item | Resultado observado |
|---|---:|
| Linguagem principal | TypeScript |
| Arquivos TypeScript/TSX em `src/` | 1.986 |
| Arquivos de rotas | 417 |
| Arquivos de serviços | 476 |
| Migrations SQL | 495 |
| Arquivos de teste encontrados no checkout | 278 |
| Testes executados na `main` | 1.735 em 272 arquivos |
| Issues abertas | 0 |
| Workflow GitHub ativo | `CI Unificado — Waesy Quality Gates` |
| Proteção de `main` | ativa; `main` protegido |
| Última execução CI observada na `main` | sucesso no SHA `98c0d2c2` |

A árvore é um **ecossistema all-in-one** com Marketplace, Classificados, Places, Workspace/ERP, turismo, contratos, Copilot/IA, CMS/Studio, CRM, financeiro, suporte, eventos e integrações. Ela não corresponde mais apenas ao briefing inicial de “Waesy Commerce”. Essa expansão é válida como produto, mas exige uma fonte única de fases e critérios; hoje há documentos normativos conflitantes.

## 2. Branches remotos abertos

Foram encontrados **22 branches remotos reais** incluindo `main` (o ref técnico `origin`/`origin/HEAD` foi desconsiderado). A coluna “relação” usa a divergência contra `origin/main`.

| Branch | Relação | PR | Estado / ação recomendada |
|---|---:|---:|---|
| `main` | base | — | Protegida; candidato de produção atual |
| `audit/forensic-baseline-fixes` | já incorporado; 118 commits históricos | — | Arquivo/stale; não reabrir sem necessidade |
| `audit/full-remediation-20261007` | já incorporado; 55 commits históricos | — | Arquivo/stale |
| `audit/full-remediation-continuation-20261007` | já incorporado; 68 commits históricos | — | Arquivo/stale |
| `audit/recursive-p0-remediation` | já incorporado; 109 commits históricos | — | Arquivo/stale |
| `chore/production-remediation-5d8fdbe` | +4 commits | **#29** | Candidato de produção; bloqueado pelo Pages no SHA anterior |
| `chore/recover-waesy-task-2026-10-06` | já incorporado; 74 commits históricos | — | Arquivo/stale |
| `chore/sync-task-qhMPHRy4` | já incorporado; 80 commits históricos | — | Arquivo/stale |
| `codex/merge-open-prs-20261008` | já incorporado; 5 commits históricos | — | Arquivo/stale |
| `docs/dec-196` | +1 commit | **#28** | Documentação; CI/Pages verdes, aguarda decisão/review |
| `docs/waesy-holistic-remediation-2026-10-06` | já incorporado; 80 commits históricos | — | Arquivo/stale |
| `execute/spec-master-travel-20261008` | já incorporado; 55 commits históricos | — | Arquivo/stale |
| `feat/system-merge-improvements-and-classifieds-copilot` | +15 commits | — | Divergente sem PR; triagem obrigatória antes de merge/cherry-pick |
| `feat/waesy-canonical-travel-evolution` | já incorporado; 94 commits históricos | — | Arquivo/stale |
| `feat/waesy-niche-template-factory` | já incorporado; 63 commits históricos | — | Arquivo/stale |
| `feat/waesy-studio-omni-audit` | já incorporado; 103 commits históricos | — | Arquivo/stale |
| `feat/whatsapp-wave1-8-complete-release` | já incorporado; 106 commits históricos | — | Arquivo/stale |
| `fix/commercial-ui-purification-and-copilot-search` | +1 / −3 | — | Divergente; comparar paths antes de recuperar |
| `fix/copilot-concierge-refinement-and-commercial-polish` | +2 / −2 | — | Divergente; comparar paths antes de recuperar |
| `fix/copilot-p0-integrity-2026-10-07` | já incorporado; 61 commits históricos | — | Arquivo/stale |
| `fix/profile-save-skills-biolink-covers` | +1 / −1 | — | Divergente; comparar com PR #28/#29 |
| `perf/login-latency-and-route-caching` | +4 commits | — | Divergente sem PR; triagem de performance |

### PRs abertas

| PR | Título | Estado observado | Leitura executiva |
|---:|---|---|---|
| [#28](https://github.com/EduardoChapeco/waesy/pull/28) | `docs(design): registrar DEC-196...` | `OPEN`, `MERGEABLE`, CI e Cloudflare Pages verdes | Mudança documental isolada; não fecha nenhum blocker de segurança/produção |
| [#29](https://github.com/EduardoChapeco/waesy/pull/29) | `chore: consolidar remediacao completa e gates de producao` | `OPEN`, `MERGEABLE`, merge bloqueado pelo check Pages vermelho no SHA `1cd5140b` | Candidato técnico mais completo; foi a base das correções desta rodada |

Não foram encontradas issues abertas. Isso **não** significa backlog vazio: o backlog está espalhado em documentos, branches, PR #29 e achados de auditoria.

## 3. Fases e requisitos: estado consolidado

### 3.1 Conflito de fontes de verdade

| Fonte | O que declara | Problema |
|---|---|---|
| `README.md` | Fase 0 atual; Fases 1–5 futuras para Commerce | Não cobre o ecossistema all-in-one já presente na árvore |
| `docs/MASTER_PLAN.md` | Waesy comunitária/comercial/operacional, com Fases 0–5 | Já descreve escopo muito maior que o README |
| `docs/canonico/ROADMAP_VIVO.md` | F01–F24 homologadas; S25–S29 implementadas/pendentes de validação | Usa “produção/homologado” sem a prova externa exigida pelo próprio backlog de release |
| `docs/BACKLOG_CANONICO.md` | 7 módulos “concluídos e validados E2E” | A comprovação listada é majoritariamente código/migration/typecheck, não replay real + RLS + browser + provider |
| `docs/audits/NEXT-PHASES-COMPLETENESS-20261011.md` na PR #29 | W0–W17 conservadoramente `partial`, `open` ou `blocked` | É a fonte mais confiável para decisão de release porque explicita evidência faltante |

**Ação de governança:** adotar W0–W17 como status operacional; manter F01–F24/S25–S29 como histórico de produto, mas rebaixar qualquer “homologado/produção” que não possua pacote de evidências independente.

### 3.2 Matriz operacional W0–W17

| Fase | Status atual | Pendência de fechamento |
|---|---|---|
| W0.0 — freeze/rebaseline | **blocked / P0** | Worktree/candidato imutável, SHA/base/ownership e manifest limpos |
| W0.1–W0.3 / W1 — ledger, schema, migration e governança | **partial/blocked** | Replay from-zero, segunda aplicação, ledger 109/109, catálogo, types, ruleset e testes negativos de proteção |
| W2 — segurança, identidade, RLS e quota | **partial / P0** | IDOR/cross-tenant, auto-heal, guest fallback, RPC transacional de quota, concorrência e read-back reais |
| W3 — schema, tipos, contratos BFF e paginação | **blocked** | `Database` tipado efetivamente no Supabase client, 19 relações BFF, catálogo e fixtures reais de paginação |
| W4 — lifecycle, FSM, chat, turismo, OCR e builder | **partial / stop-ship** | CAS, transação/saga, terminal immutável, dedupe, timeout/abort, OCR unique, publish idempotente |
| W5–W6 — Copilot, SSE, provider e cobrança | **partial / open** | Consumidor SSE, `AbortSignal` ponta a ponta, retry/429/5xx, cost ledger e ausência de cobrança duplicada |
| W7 | **não normalizada** | Não há fonte primária W7 no material consolidado; deve ser definida ou formalmente descontinuada |
| W8–W9 — CMS, Studio, mídia, Storage e jobs | **partial / blocked-for-promotion** | Tenant/owner server-side, publish canônico, provenance, SVG/XSS, quota server-side, worker e Storage reais |
| W10 — rotas, UI, design, E2E e autorização | **open** | Conciliação registry/routeTree/menu/CTA, browser por role/tenant, axe, mobile, deep-link e 13.702 violações visualizadas |
| W11-turismo — voucher/contrato/persistência | **partial** | RPC real, grants mínimos, concorrência, cross-store, OCR dedupe, replay/expiração/PII |
| W12 — OCR, booking, comissão, documentos, export e provider | **open** | Migrations/replay, estado externo, callbacks assinados, Storage, browser e M12.0–M12.7 |
| W13–W16 | **blocked por falta de fonte primária** | Relatórios, SHA/base, owners, fixtures, ambientes e evidências individuais ainda não existem no pacote consolidado |
| W17 — Cloudflare/Pages/release | **blocked / P0** | Diagnóstico do log original, correção isolada, Pages verde no mesmo SHA, secrets/bindings e smoke/rollback |
| Cross-cutting | **partial local / blocked operacionalmente** | Unificar evidências locais e externas; formalizar warnings `ignored-bare-import`, CI, staging, produção e rollback |

### 3.3 Requisitos por domínio

- **Identidade/multi-tenant:** membership e `store_id` devem ser derivados no servidor; guest não pode receber a primeira loja; não pode haver auto-heal por e-mail/settings nem `service_role` sem autorização explícita.
- **Catálogo/Marketplace/Classificados/Places:** separar semântica B2B/B2C/C2C, não aceitar ID de loja controlado pelo cliente, manter provenance/mídia/rights e garantir read-after-write.
- **Checkout/pedidos/estoque/pagamentos:** reserva atômica, ledger append-only, idempotência, snapshots, FSM completa, webhook autenticado/deduplicado e nenhum cálculo financeiro autoritativo no browser.
- **Copilot/IA:** boundary único, `clientMessageId` obrigatório, idempotência por thread/operação, abort real, estados `FAILED_RETRYABLE`/`CANCELLED` honestos, custo/quota antes do provider e persistência atômica comprovada no Postgres.
- **Turismo/contratos/vouchers:** transações/RPC, grants, expiração, digest, replay protection, isolamento cross-store, OCR unique, conversão somente após aceite/evidência.
- **CMS/Studio/Storage:** owner/tenant no servidor, publish idempotente por snapshot, rich text/SVG sanitizado, asset privado/provenance/ledger, workers e falha explícita.
- **UI/rotas/acessibilidade:** registry físico e dinâmico conciliado, nenhum 404/deep-link quebrado, loading/empty/error/permission/unconfigured, WCAG 2.2 AA, 44px touch targets, mobile safe-area e sem `100vh` problemático.
- **Operação/release:** candidato limpo, um lockfile, Node fixado, CI bloqueante, Pages no mesmo SHA, staging/smoke/rollback e nenhum deploy com `--commit-dirty`.

## 4. Dívida técnica e riscos

### P0 — impedem merge, migration remota, deploy ou produção

1. **Cloudflare Pages falhou no PR #29**; faltava capturar e correlacionar o log do deployment ao SHA. Não se deve ignorar ou forçar merge.
2. **Ausência de replay de migrations** from-zero e segunda aplicação em Postgres/Supabase autorizado; não há prova de catálogo, policies, grants, owners ou `SECURITY DEFINER` efetivos.
3. **Autorização/tenant:** riscos documentados em Studio, turismo, identidade, assentos/check-in e `service_role`, incluindo IDOR, store arbitrário, exposição de PII e sucesso após falha parcial.
4. **Quota/provider:** débito concorrente, idempotência, preauthorization, seleção de segredo e proteção contra custo antes do gate ainda exigem prova de banco/provider; testes locais não fecham isso.
5. **Lifecycle/transações:** atalhos de FSM, reset/resume sem CAS, writes separados, timeout sem `AbortSignal`, OCR dedupe e publisher legado permanecem como riscos até replay/fault-injection reais.
6. **Evidência externa ausente:** browser/reload, provider, Storage, worker, staging, smoke público, observabilidade e rollback ainda não foram observados no mesmo candidato.

### P1 — qualidade, segurança e governança ainda incompletas

- CI anterior não cobria schema/BFF/audit de dependências; o PR desta rodada adiciona schema, BFF e audit de produção, mas ainda faltam gates de Postgres/RLS/JWT, browser, provider, Storage, staging e deployment.
- `src/integrations/supabase/types.ts`/`src/lib/supabase.ts` precisam ser verificados contra o schema aplicado com `SupabaseClient<Database>` e `createClient<Database>`; há drift reportado e 19 relações BFF sem declaração local no baseline.
- Route parity reportou 177 registros contra 179 arquivos físicos e 18 rotas dinâmicas/auxiliares fora do gate literal; `includes` não é prova suficiente.
- O design lint registra 13.702 violações (1.524 P0, 9.585 P1 na documentação da PR); o ratchet passa porque o teto está congelado, mas isso não equivale a UI saneada.
- A árvore contém muitos `any`, arquivos muito grandes e duplicações/shims de serviços; o relatório de dead code deve ser reconciliado com allowlist, não usado como “zero dívida”.
- Branches já incorporadas permanecem abertas/arquivadas no remoto e branches divergentes não possuem PR/owner; isso aumenta risco de cherry-pick acidental.

### Baseline D-01–D-50

`.audit/DEBTS.md` registra 50 dívidas do baseline P01. Os itens D-01–D-20 incluem hardcodes na viagem, gradiente, duplicações CRM/proposals/boarding/ticket, `100vh`, TODO de auth, emojis, `backdrop-blur`, tokens de radius/padding, `setTimeout` de navegação, hex literal, `h-screen` e `sampleData`. D-21–D-50 são supressões `as any` e cores literais em vários componentes admin.

Esse arquivo é **baseline histórico e está desatualizado**: alguns itens foram marcados como resolvidos em ondas posteriores, mas não há uma reconciliação atual por arquivo/linha. A ação correta é reexecutar a auditoria e marcar cada ID como `resolved`, `reproduced`, `superseded` ou `blocked`, nunca apagar a lista para obter um placar verde.

## 5. Correções aplicadas nesta rodada

Base usada: branch candidata do PR #29, que já continha correções de identidade, tenant isolation, quota/RPC, Copilot, contratos, turismo, migrations reconciliadas, schema/BFF e preflight.

1. **Lockfile único:** removido `pnpm-lock.yaml` conflitante; o repositório volta a declarar somente `package-lock.json`. Isso elimina a ambiguidade que poderia fazer o Cloudflare instalar com pnpm enquanto CI usava npm.
2. **Node reproduzível:** adicionado `.nvmrc` com Node 20, alinhado ao workflow GitHub.
3. **Dependências:** lockfile atualizado sem `--force`; `maplibre-gl` foi fixado em `^6.14.0` e a árvore passou a usar `maplibre-gl 6.14.0`, `dompurify 3.4.17`, `seroval 1.6.9` e `source-map-js 1.2.2`.
4. **Security gate:** adicionado `npm run audit:dependencies` e Gate 0c no CI com `npm audit --omit=dev --audit-level=high`.
5. **Qualidade local:** preservados schema/BFF e os gates já presentes no PR; nenhuma migration remota ou deploy foi executado.

### Resultado local após a correção

| Gate | Resultado |
|---|---:|
| `npm ci --prefer-offline` | PASS |
| `npm run audit:dependencies` | PASS — 0 vulnerabilidades de produção |
| `npm run check:schema` | PASS |
| `npm run check:bff` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS |
| `npm run build` | PASS |
| `npm run lint` | PASS |
| `npm run check:canonical` | PASS |
| `git diff --check` | PASS |

## 6. Ordem segura para fechar tudo

1. **Publicar a correção no PR #29** e aguardar CI + Cloudflare Pages no mesmo SHA.
2. **R1 Pages:** capturar mensagem original, deployment ID, timestamp e classificação da falha; não aceitar “success” histórico de outro SHA.
3. **R2 candidato:** checkout limpo por SHA, `npm ci`, preflight sem dirty, schema/BFF/types/audit/build e manifest/hash da árvore.
4. **R3 banco/segurança:** Postgres descartável autorizado, replay from-zero, segunda aplicação, catálogo/policies/grants/functions, JWT A/B, RLS positivo/negativo, cross-tenant e concorrência/read-after-write.
5. **R4 integrações/browser:** provider/Storage/worker instrumentados, abort/retry/callback/replay/custo, Playwright desktop/mobile/roles/tenant, deep-links, reload, axe e evidência.
6. **R5 staging/release:** staging no mesmo SHA, smoke/rollback/observabilidade, depois merge protegido e novo candidato a partir do SHA de merge.
7. **W13–W16:** criar relatórios primários ou formalizar explicitamente o escopo; não fechar por menções indiretas em W10.
8. **Higiene:** após aprovação do owner, arquivar/deletar branches já incorporadas; abrir PRs somente para branches divergentes que tenham ownership e delta necessário.

## 7. Itens que não foram executados por segurança/autoridade

Não foram executados `supabase db push`, migrations remotas, alterações de RLS/grants em ambiente real, deploy de Cloudflare, merge forçado, alteração de secrets/bindings, staging com credenciais reais ou produção. Essas ações exigem ambiente autorizado, janela, rollback e evidência de impacto; o código foi preparado e validado localmente, mas não deve ser apresentado como certificado em produção.

**Conclusão:** o código candidato está tecnicamente mais forte e todos os gates locais reproduzíveis desta rodada estão verdes. O release ainda não está “completamente concluído” porque os bloqueadores externos — Pages no mesmo SHA, banco/RLS/JWT, provider/Storage, browser, staging e rollback — continuam sem prova independente. A próxima decisão objetiva é o resultado do PR #29 após o push desta correção.

## 8. Atualização pós-publicação — checks verdes no mesmo SHA

Após a publicação da correção no branch do PR #29, os dois checks obrigatórios concluíram com sucesso no mesmo candidato:

| Evidência | Resultado |
|---|---|
| SHA do head do PR #29 | `2a65865362f0c4653727cc80be1972073dc99c63` |
| CI — 5 Quality Gates | `SUCCESS`; [run 38295194433 / job 114964473568](https://github.com/EduardoChapeco/waesy/actions/runs/38295194433/job/114964473568) |
| Cloudflare Pages | `SUCCESS`; [deployment e4936470-372c-4d5e-a8f8-65942510203b](https://dash.cloudflare.com/?to=/696c624373c7b4b57bb681bd299f4aa8/pages/view/usewaesy/e4936470-372c-4d5e-a8f8-65942510203b) |
| Estado do PR | `MERGEABLE` / `CLEAN`; PR continua aberto para revisão |

Isso resolve o bloqueio reproduzível de lockfile/Pages identificado no snapshot anterior. **Não altera** o status dos gates que exigem ambiente autorizado: replay Postgres/Supabase, RLS/JWT/grants, concorrência/read-after-write, provider/Storage/worker, browser E2E, staging, smoke de produção e rollback.

## 9. Execução das próximas fases — ledger W0–W17

Foi criado o ledger machine-readable [`W0-W17-RELEASE-LEDGER-20261012.json`](./W0-W17-RELEASE-LEDGER-20261012.json), com as 18 fases W0–W17, prioridade, status, evidências e gap explícito. O validador `npm run check:release-ledger` foi adicionado ao CI como Gate 0d.

Resultado atual do ledger:

- 18 fases válidas e presentes;
- 10 `partial`;
- 5 `blocked`;
- 3 `open`;
- 0 fases declaradas `verified` indevidamente;
- 12 fases P0 continuam não verificadas e impedem certificação de produção.

O `npm run audit:all` também foi executado localmente: **30 checks conformes e 13 checks abertos**. Os achados abertos são principalmente dívida mensurável de design, `any`, testes com dados sintéticos, duplicações e placeholders; não foram tratados como 13 blockers de release sem revisão individual.

O ledger permite evolução contínua sem mascarar bloqueios: `npm run check:release-ledger -- --require-release` continuará falhando enquanto existir qualquer P0 não verificado. O modo padrão valida a estrutura e mantém o CI informativo sem declarar produção.

## 10. Execução W0 — manifesto do candidato

O freeze W0 foi executado para o baseline de código `cad8e3da`. O manifesto [`CANDIDATE-BASELINE-cad8e3da.json`](./CANDIDATE-BASELINE-cad8e3da.json) registra a base `98c0d2c2`, a árvore Git `ac64f95f`, 4.593 arquivos rastreados, hash do índice, política de lockfile único, checks obrigatórios e ausência de certificação externa.

O validador `npm run check:candidate-baseline` passou com worktree limpo no head de evidência `f307f51f`. O manifesto separa o commit de código congelado dos commits posteriores de evidência/documentação; qualquer alteração de código deve gerar novo baseline e novo manifesto.

## 11. Execução W1 — schema e contratos locais

No head de evidência `97acc3fb`, os gates locais de W1 passaram: `check:schema` encontrou 500 migrations, 621 tabelas declaradas e 213 funções, com versões únicas; `check:bff` encontrou 500 migrations, 632 tabelas declaradas, 495 tabelas referenciadas e zero contratos sem declaração local. O ledger estrutural também passou com as 18 fases presentes.

A evidência foi registrada em [`W1-LOCAL-SCHEMA-EVIDENCE-20261012.md`](./W1-LOCAL-SCHEMA-EVIDENCE-20261012.md). W1 permanece `blocked` para promoção porque ainda falta replay from-zero, segunda aplicação, catálogo efetivo, RLS/JWT/grants e testes cross-tenant em Postgres autorizado.

## 12. Execução W2 — correção local de fallback de tenant

Foi corrigido um finding confirmado em `createCustomerTicket`: quando não havia `storeId` no payload nem `identity.store_id`, o fluxo consultava a primeira loja e associava o ticket a um tenant arbitrário. O código agora exige contexto explícito e falha com `Loja de destino não identificada.` sem consultar uma loja de fallback.

A evidência está em [`W2-LOCAL-SECURITY-FIX-20261012.md`](./W2-LOCAL-SECURITY-FIX-20261012.md). A validação focal passou com 13 testes e `npm run typecheck` passou. O scan ainda encontrou fallbacks em outros domínios — builder, upsell, cart, tourism lifecycle, master e mining — que permanecem abertos para revisão individual. W2 continua parcial e não certificada sem Postgres/JWT/RLS, concorrência e provider.

## 13. Execução — correção de fallbacks em builder, upsell e cart

Foram removidos os fallbacks arbitrários de primeira loja em `builder.functions.ts`, `upsell.functions.ts` e `cart.functions.ts`. O builder agora exige tenant explícito para administrador global; Order Bump e cross-sell exigem `storeId`; e a criação de carrinho falha sem contexto explícito ou tenant resolvido.

A evidência reproduzível está em [`BUILDER-UPSELL-CART-TENANT-FIX-20261012.md`](./BUILDER-UPSELL-CART-TENANT-FIX-20261012.md). A validação passou com 17 testes focais, typecheck, scan sem ocorrências de `firstStore`/`defaultStore` nos três domínios e `git diff --check`. Os fallbacks restantes em turismo lifecycle, master e mining não foram alterados neste ciclo.

## 13. Correção dos fallbacks restantes — travel lifecycle, master e mining

**Commit:** `1a0a6baa3c3c12d9c331fb7adf751888437b2643`
**Evidência:** `docs/audits/TRAVEL-MASTER-MINING-TENANT-FIX-20261012.md`

Foi concluída a remoção dos fallbacks que inferiam tenant sem ação explícita:

- **Travel lifecycle:** listagem, confirmação e criação manual passaram a exigir staff e `identity.store_id`; updates de confirmação também filtram pelo tenant; `storeId` de outro tenant é rejeitado.
- **Master:** `resolvePlatformRootStore` deixou de promover a primeira loja registrada; sem raiz explicitamente configurada, retorna `null`. A criação da raiz permanece apenas no fluxo administrativo explícito.
- **Mining:** curadoria individual e em lote deixaram de buscar `rootStore`/`anyStore`; aprovação sem tenant falha antes da RPC.

### Evidência local desta fase

| Validação | Resultado |
|---|---:|
| Regressões de fallback + travel | **14/14 PASS** |
| `npm run typecheck` | **PASS** |
| `git diff --check` | **PASS** |
| Scan focado dos três handlers | **PASS** |

A remoção não certifica por si só RLS/Postgres, browser, staging ou produção; esses gates continuam explicitamente pendentes no ledger.

### Checks externos pós-publicação

No head publicado do PR #29, os dois checks obrigatórios ficaram verdes:

- GitHub Actions — `CI Unificado — Waesy Quality Gates`: **SUCCESS**
- Cloudflare Pages: **SUCCESS**

Isso fecha a validação de integração do candidato para esta correção. Não equivale à certificação de produção: replay autorizado de Postgres/RLS, browser E2E, staging, smoke, rollback e monitoramento continuam pendentes.

## 14. W1 — gate determinístico do inventário de migrations

**Commit:** `fb5c72244b152299d6a7f5d5f5013d9d46ff82e2`
**Evidência:** `docs/audits/W1-MIGRATION-INVENTORY-GATE-20261012.md`

Foi implementado o `npm run check:migration-inventory`, agora executado no CI como Gate 0e. O subgate analisou 500 migrations SQL e confirmou nomes válidos, versões únicas, arquivos não vazios e hash ordenado reproduzível. `check:schema` e `check:bff` também passaram no mesmo candidato.

Este avanço reduz o risco de árvore de migrations não determinística, mas não fecha o replay de Postgres. W1 continua `blocked` para promoção até haver banco descartável autorizado, replay from-zero, segunda aplicação, snapshot de catálogo/policies/grants/functions e testes negativos RLS/JWT.
