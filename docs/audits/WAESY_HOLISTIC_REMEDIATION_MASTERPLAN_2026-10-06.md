# Waesy — Plano Mestre Holístico de Auditoria e Remediação End-to-End

**Snapshot:** 2026-10-06 (atualização documental observada em 2026-10-06 21:38 -03)
**Repositório:** `EduardoChapeco/waesy` — escopo exclusivo Waesy
**Base documental:** `origin/main` em `2ebb04f8188b43255e51b1c5377962aaaec1ab87`
**Branch deste handoff:** `docs/waesy-holistic-remediation-2026-10-06`
**Natureza:** documentação e metodologia; não é prova de correção de código nem autorização de deploy.

> **Veredito:** o repositório não pode ser declarado completo ou pronto para produção. Os PRs #1–#4 foram mesclados mesmo com checks falhos/cancelados; #5 e #6 seguem abertos e o check Cloudflare falha nos dois. A API GitHub respondeu HTTP 404 ao consultar proteção de `main`. O deploy público não foi confirmado. Além disso, há 13 alterações locais de código ainda não commitadas no worktree de recuperação; foram preservadas e deliberadamente excluídas desta branch documental.

## 1. Propósito e regra de uso

Este documento transforma as auditorias de PRs #1–#6 e dos módulos Copilot, chat/stream, tabelas, design, builders, imagem, rotas, persistência e testes em uma sequência executável de ondas e microfases. Cada item precisa terminar com prova verificável da causa-raiz removida, do contrato preservado e da ausência de regressão; o texto não declara que qualquer finding foi corrigido.

Este plano deve ser executado junto com `AGENTS.md`, `skills/waesy-integrity-auditor/SKILL.md` e o ledger em `skills/waesy-integrity-auditor/references/waesy-evidence-ledger-template.md`. O preflight de leitura e escopo é obrigatório antes de **cada onda e cada microfase**. Se não houver reprodução/evidência ou se a semântica de produto estiver ambígua, parar e registrar o bloqueio — não adivinhar nem simular sucesso.

## 2. Snapshot GitHub e conclusão de commit/push

- PRs auditados: **6**; paths alterados nas seis PRs: **371** (paths únicos entre PRs: **353**). Branches remotas observadas: `audit/forensic-baseline-fixes`, `audit/recursive-p0-remediation`, `chore/recover-waesy-task-2026-10-06`, `chore/sync-task-qhMPHRy4`, `feat/waesy-canonical-travel-evolution`, `feat/waesy-studio-omni-audit`, `feat/whatsapp-wave1-8-complete-release`, `main`.
- #1–#4: merged em `main`; os resultados históricos dos checks não certificam produção. #5 e #6: branches publicados e PRs abertos, não mesclados.
- #5: `5 Quality Gates=SUCCESS`; `Cloudflare Pages=FAILURE`. #6: `5 Quality Gates=SUCCESS`; `Cloudflare Pages=FAILURE`. Não houve confirmação pública do deploy.
- #1: `5 Quality Gates=CANCELLED`; `Cloudflare Pages=FAILURE`. #2: `5 Quality Gates=FAILURE`; `Cloudflare Pages=FAILURE`. #3: check Cloudflare falhou; ausência de um check de qualidade visível não é sucesso. #4: `5 Quality Gates=FAILURE`; `Cloudflare Pages=FAILURE`.
- Proteção de `main`: endpoint `GET /repos/EduardoChapeco/waesy/branches/main/protection` retornou HTTP 404 nesta auditoria. Confirmar e corrigir com regra/ruleset antes de novos merges.
- **Não está tudo commitado/pushado:** no worktree `/home/ubuntu/waesy-audit`, branch `chore/recover-waesy-task-2026-10-06`, o `HEAD` observado é `8e1b2c4972c8bb76c7cf1c59ade41e71c6e2b96d`, mas existem 11 arquivos modificados e 2 não rastreados (13 paths ao todo). Eles não entram neste commit documental; preservar e revisar separadamente, sem `git add -A` ou reset.
- No snapshot, `docs/waesy-holistic-remediation-2026-10-06` partia de `origin/main` em `2ebb04f8188b43255e51b1c5377962aaaec1ab87` e ainda não tinha commit/push documental. Conferir o estado remoto da branch após o handoff; essa afirmação é temporal. Não mesclar PR #5/#6 nem declarar produção durante este handoff.
- O relatório `docs/audits/PRODUCTION_READINESS_2026-10-06.md` registra evidências de código no SHA `4b76520`; o head atual observado do PR #6 é `8e1b2c4972c8bb76c7cf1c59ade41e71c6e2b96d`. Tratar as afirmações do relatório como históricas para aquele SHA e usar os checks atuais do GitHub para o head exato; reexecutar todos os gates no candidato final.

### 2.1 Inventário das alterações locais preservadas

**Modificados:**

- `src/components/chat/waesy-copilot-drawer.tsx`
- `src/routes/api.internal.whatsapp-outbox-worker.ts`
- `src/routes/api.webhooks.whatsapp.evolution.$instance.ts`
- `src/routes/api.webhooks.whatsapp.ts`
- `src/routes/api.webhooks.whatsapp.wasender.$instance.ts`
- `src/routes/workspace.catalogo.produtos.index.tsx`
- `src/services/admin-catalog.functions.ts`
- `src/services/ai-conversations.functions.ts`
- `src/services/copilot-fsm.test.ts`
- `src/services/copilot-pipeline-boundaries.test.ts`
- `src/types/catalog.ts`

**Não rastreados:**

- `src/services/admin-catalog-tenant-scope.test.ts`
- `supabase/migrations/20270118000000_catalog_archive_status.sql`

Próximo agente: abrir o diff desses paths separadamente, confirmar se pertencem ao usuário/à recuperação, revisar schema e testes correspondentes e só então decidir commit/PR. A presença de arquivo de migration exige sequência/idempotência/RLS e aprovação de rollout; não aplicar em produção por inferência.

## 3. Escopo e evidência-fonte

- Auditoria paralela: **15 unidades**, **109 findings distintos**, **0 falhas de execução** no envelope estruturado. SHA-256 do arquivo fonte local `/home/ubuntu/.manus-jobs/3e0b13592238/output.txt`: `2d9a5748ef684704cbff100ceff737e9071b5d174ba6a2553a41817b560ec5cb`. O documento abaixo transcreve os findings com evidência, causa-raiz, correção sugerida, reprodução/testes e riscos não verificados.
- As severidades do material original usam escalas incompatíveis (`critical`, `high`, `medium-high`, `medium`, `P1`, `P2`, `alta`, `média`). Não reinterpretar sem registrar uma normalização conservadora na Onda W0. Contagem bruta: `alta`=12, `critical`=7, `high`=48, `medium`=25, `medium-high`=2, `média`=6, `p1`=6, `p2`=3.
- Achados de PRs e módulos têm naturezas distintas: parte descreve defeito de runtime, parte descreve teste incapaz de detectar o defeito, risco inferido ainda não verificado ou dívida de integração. O tipo de evidência de cada finding está mantido no registro; não converter lacuna de teste automaticamente em falha de produção confirmada.
- Não houve nesta fase aplicação de migrations, edição de runtime, alteração de RLS no banco, deploy ou confirmação de comportamento de provider real.

### 3.1 Fontes documentais preservadas

As fontes abaixo estão versionadas na branch documental quando ausentes de `main`; relatórios/specs já existentes em `main` permanecem como fonte, sem cópia redundante. O apêndice de paths por PR registra todos os arquivos alterados nas seis PRs.

- `docs/audits/PRODUCTION_READINESS_2026-10-06.md` (PR #6; veredito de prontidão e Cloudflare).
- `docs/audits/BFF_CONTRACT_CLOSURE_WAVE2_2026-10-06.md` e `docs/audits/BFF_TABLE_CONTRACT_BASELINE_2026-10-06.md` (PR #5).
- `docs/specs/SPEC-20261006-BUILDER-STABILIZATION-WAVE1.md`, `docs/specs/SPEC-20261006-E2E-MOBILE-HIG-STABILIZATION.md`, `docs/specs/SPEC-20261006-TYPECHECK-AND-BFF-SCHEMA-CLOSURE.md` (PR #5).
- `docs/design/LINT_DASHBOARD.md` e `docs/simlab-demographic-calibration.md` (PR #6).
- Fontes já em `main`: `docs/audits/20261006-completeness-status.md`, `docs/audits/20261006-design-system-audit.md`, `docs/audits/20261006-wave6-no-cost-validation.md`.
- Auditorias históricas já em `main`: `docs/AUDITORIA_FORENSE_2026-10-05.md`, `docs/AUDITORIA_RECURSIVA_MODULAR_2026-10-05.md`, `docs/MAGICAI_AUDIT_PLAN.md`, `docs/MAGICAI_GAP_ANALYSIS_2026-10-05.md`, `docs/PROMPTS_HISTORICO_500_INTEGRA.md`, `docs/SUPABASE_ENV_PRODUCTION.md`, `docs/WHATSAPP_INTEGRATION_AUDIT_2026-10-06.md`, `docs/WHATSAPP_WAVE8_SECURITY_LGPD_AUDIT_2026-10-06.md`, documentos `docs/builder/`, `docs/canonico/ROADMAP_VIVO.md`, `docs/prompts/WAESY-STUDIO-TEMPLATE-FACTORY.md`.

## 4. Causas-raiz transversais — hipótese operacional para validar em cada microfase

1. **Sucesso sem efeito:** resposta HTTP/Toast/estado terminal pode ser emitido sem provider real, linhas afetadas ou persistência relida; testes aceitam somente a ausência de segredo, não sucesso funcional.
2. **Isolamento incompleto:** funções com `service_role`, streams públicos, policies permissivas e `NULL` tratado como escopo global ampliam blast radius entre tenants.
3. **Contratos divergentes:** UI, route tree, DTO/Zod, BFF, schema e migrations podem usar nomes, tipos, limites ou estados distintos; `Database = any` impede detectar parte do drift.
4. **Implementação paralela:** handlers, adapters, pools, builders, rotas e fluxos de chat duplicados podem fazer a UI chamar caminho diferente do testado.
5. **Persistência parcial:** sequências best-effort, callbacks externos, ausência de idempotência/outbox e falhas entre writes criam estado “concluído” não recuperável.
6. **Testes de baixa discriminação:** doubles globais de sucesso, mocks em memória e fixtures fixas não exercitam HTTP, SSR, providers, RLS, banco, Storage, concorrência ou browser real.
7. **Governança de release fraca:** checks falhos/cancelados não bloquearam merges; status do PR foi confundido com build/deploy aceito.
8. **Desconexão visual-funcional:** botão/rota/tabela/editor podem parecer completos sem handler, dados reais, permissão, loading/empty/error, estado persistido e target acessível.

## 5. Sequência executável: 18 ondas e 81 microfases

Cada microfase é atômica e precisa de ledger próprio ou linha individual: pre-read registrado; baseline reproduzida; paths exatos autorizados; hipótese de causa-raiz; implementação mínima; teste de regressão positivo e negativo; validação aplicável; revisão adversarial; status final. O revisor não pode ser autor único da correção e da aprovação sem declarar essa limitação.

### W0 — Congelar baseline e separar diffs

**Unidades/finding groups:** Todos os findings; inventário de PRs/branches.

| Microfase | Ação verificável | Evidência de saída exigida |
|---|---|---|
| W0.1 — Capturar snapshot | Registrar SHA/base, branches, PRs, checks, worktrees, versions e datas em ledger imutável. | Ledger preenchido com saída GitHub/API e hashes; nenhum finding herdado como atual sem replay. |
| W0.2 — Separar código e documentação | Manter a branch documental independente; preservar 13 paths sujos do worktree de código sem staging, reset ou cherry-pick. | `git status` por worktree arquivado; nenhum arquivo-fonte entrou no escopo documental. |
| W0.3 — Fixar reprodução e ownership | Converter cada finding em issue/ID estável, responsável, baseline reproduzível, risco, dependência e artefato de prova. | 109/109 findings estão no registro e vinculados a ondas; gaps não reproduzíveis marcados como bloqueados, não como corrigidos. |

### W1 — Governança de merge e gate de release

**Unidades/finding groups:** PR1, PR5, PR6; checks e política de main.

| Microfase | Ação verificável | Evidência de saída exigida |
|---|---|---|
| W1.1 — Proteger main | Criar ruleset com PR obrigatório e checks obrigatórios; impedir merge em failed, cancelled, pending ou skipped. | Consulta da API confirma regra ativa; teste de política mostra bloqueio ao remover/falhar cada check. |
| W1.2 — Definir checks completos | Exigir 5 Quality Gates e Cloudflare Pages (ou gate de deploy equivalente) para o escopo de publicação. | Workflow executa os passos declarados e apresenta conclusão success no mesmo SHA candidato. |
| W1.3 — Investigar Cloudflare | Obter logs completos do provider para #1–#6, reproduzir build e isolar causa; não inferir causa por status genérico. | Log com erro-raiz e correção reproduzível; check Cloudflare verde para candidato final. |
| W1.4 — Bloquear promoção do snapshot | Manter #5 e #6 abertos até todos os checks obrigatórios passarem; revisar os merges históricos #1–#4. | Nenhum merge/deploy declarado pronto com checks failed/cancelled; PR e SHA final registrados. |

### W2 — Autorização, identidade e isolamento multi-tenant

**Unidades/finding groups:** PR2, PR6, Copilot, Chat, Tables, Builders, Imagegen, Persistence.

| Microfase | Ação verificável | Evidência de saída exigida |
|---|---|---|
| W2.1 — Modelar identidade confiável | Mapear user/store/role derivado no servidor para cada endpoint, job, stream, RPC e serviço; rejeitar contexto vindo apenas do body. | Matriz endpoint×identidade×role×tenant completa; requests anon sem privilégio não iniciam operação. |
| W2.2 — Fechar service_role | Inventariar clientes service-role e provar autorização antes de toda query/mutation; restringir select/update por tenant/owner. | Testes com usuário A/B, stores diferentes e admin comprovam ausência de leitura/escrita cruzada. |
| W2.3 — Corrigir policies RLS | Revisar policies por tabela/coluna; remover `store_id IS NULL` como bypass, `USING(true)` e `WITH CHECK(true)` permissivos. | RLS exercitada com JWT real e `SET ROLE` em Postgres; nenhuma policy permissiva sem justificativa explícita. |
| W2.4 — Fechar grants e SECURITY DEFINER | Auditar owner, search_path, EXECUTE grants e validação de tenant em RPCs/security definer. | Dump comparativo de grants + testes anon/authenticated/owner/tenant-alheio/admin/service role. |
| W2.5 — Cotas antes de custo externo | Garantir auth, quota, rate limit e cobrança antes de selecionar chave ou iniciar provider/job. | Sem sessão/saldo/quota o teste prova zero chamada de provider e zero débito de chave. |

### W3 — Schema, migrations e contratos de banco

**Unidades/finding groups:** PR5, Tables, Persistence, relatório de completude/validação.

| Microfase | Ação verificável | Evidência de saída exigida |
|---|---|---|
| W3.1 — Aplicar banco vazio | Executar todas as migrations em Postgres efêmero, em ordem, partindo de zero, sem pular arquivo. | Aplicação limpa concluída e snapshot de schema arquivado; todas constraints, triggers e funções compilam. |
| W3.2 — Testar drift e idempotência | Comparar banco legado com migrations e testar reparo/rename de versões duplicadas sem reaplicação cega. | Histórico comparado por migration ID; operação repetida não duplica objetos nem perde dado. |
| W3.3 — Gerar tipos reais | Gerar `src/integrations/supabase/types.ts` do schema aplicado; remover `Database = any` e corrigir consumidores. | Tipos derivados do banco/CI; nenhuma tabela/coluna nova fica sem contrato verificável. |
| W3.4 — Fechar DTO↔query↔coluna | Validar projections e Zod de cada BFF contra colunas reais, nullability, enums, FK e cardinalidade. | Contract tests detectam nome/tipo/nullable incorreto; script não valida apenas strings presentes. |
| W3.5 — Paginação e limites no contrato | Definir cursor/offset, total, ordenação estável, filtros, limites máximos e proteção contra query ampla. | Fixtures >1 página provam sem lacuna/duplicação; total e última página batem com banco. |

### W4 — Persistência, FSM e consistência transacional

**Unidades/finding groups:** PR3, PR6, Copilot, Chat, Builders, Persistence.

| Microfase | Ação verificável | Evidência de saída exigida |
|---|---|---|
| W4.1 — Canonizar FSM | Documentar máquina de estados única, estados terminais, transições autorizadas e efeitos laterais por entidade. | Testes de transição rejeitam saltos e estado `completed` prematuro; eventos auditáveis persistem. |
| W4.2 — Tornar escritas atômicas | Agrupar writes que representam uma operação de negócio em transaction/RPC; definir compensação para integrações externas. | Fault injection entre writes demonstra rollback ou compensação sem registro parcial falso. |
| W4.3 — Idempotência e replay | Adicionar event/idempotency key e dedupe nos webhooks, jobs, geração, publicação e reprocessamento. | Mesmo evento/retry concorrente produz um efeito lógico, ledger e custo únicos. |
| W4.4 — Recuperar estados parciais | Implementar retry/backoff, dead-letter, cancelamento, timeout e reconciliação observável. | Falha real termina em estado recuperável, sem sucesso fictício; reprocessamento conclui ou expõe erro. |

### W5 — Copilot e chat funcional de ponta a ponta

**Unidades/finding groups:** PR6, Copilot, Chat-stream, Tables, Tests.

| Microfase | Ação verificável | Evidência de saída exigida |
|---|---|---|
| W5.1 — Eleger um pipeline canônico | Mapear drawer, rota `/copilot`, chat shell, server function, dispatcher e pipeline; remover bifurcações mortas/duplicadas. | Um fluxo de produção identificado por teste de navegação e telemetria correlacionada. |
| W5.2 — Eliminar saudação como falso sucesso | Verificar que submit invoca modelo/provider real e texto/contexto válido; greeting só pode ser estado inicial explicitamente identificado. | Teste falha se provider não for chamado ou se conteúdo da resposta for vazio/fixture/default. |
| W5.3 — Proteger threads e contexto | Validar ownership/tenant ao ler, listar, anexar artefato e continuar conversa, inclusive IDs manipulados. | Usuário B não enumera nem acessa thread/artefato de A; browser confirma 403/empty conforme contrato. |
| W5.4 — Contratos de conteúdo estruturado | Alinhar rows/dataRows, actions, artefatos e mensagens estruturadas entre provider→DTO→viewer→CSV. | Fixtures de tabela multi-página e células não string persistem; CSV exporta exatamente linhas visíveis. |
| W5.5 — Executar ações em serviços reais | Ligar cada tool/action ao BFF canônico, validar schema/auth e exibir resultado real com pending/error/success. | Teste segue clique→serviço→persistência→releitura; nenhum toast substitui o efeito. |
| W5.6 — UX de erro, stream e cancelamento | Exibir loading/error/retry/cancel; fechar stream e liberar recursos quando cliente aborta. | Browser reproduz timeout, 429, JSON inválido, disconnect e retry sem duplicar thread/custo. |

### W6 — Gateway de IA, pools e proteção de chaves

**Unidades/finding groups:** PR2, PR5, Chat-stream, Imagegen.

| Microfase | Ação verificável | Evidência de saída exigida |
|---|---|---|
| W6.1 — Unificar gateway e pool | Eleger contratos canônicos de secret vault/API key pool, escopo, fallback, health e rotação. | Nenhuma rota/provider usa pool paralelo sem justificativa; tenant/platform isolation testada. |
| W6.2 — Remover segredos de URL/logs | Usar header seguro onde suportado; redigir headers/body/telemetria; revisar stack traces e cache. | Captura de request/log/response prova segredo ausente; URLs não contêm chave. |
| W6.3 — Providers e parsing por contrato | Separar adapters OpenAI/Gemini/etc.; validar shape, conteúdo vazio, streaming e erros 4xx/5xx. | Contrato por provider + fallback ordenado; provider errado ou parser vazio causa failure explícito. |
| W6.4 — Timeout, retry, circuit breaker | Aplicar abort signal, timeout, retry seletivo, circuit breaker, quota e limites de concorrência. | Teste controlado de timeout/429/5xx prova aborto, fallback limitado e contabilidade correta. |
| W6.5 — Custo e telemetria | Registrar modelo/provider, tokens/custo, tenant, latência e resultado sem payload sensível. | Contagem reconcilia com chamadas; erro não é contado como sucesso nem quota fictícia. |

### W7 — Tabelas e catálogo completos

**Unidades/finding groups:** PR5, PR6, Tables, Copilot, Builders.

| Microfase | Ação verificável | Evidência de saída exigida |
|---|---|---|
| W7.1 — Contrato de dados e colunas | Mapear cada coluna visível → DTO → projection → coluna/schema; corrigir seletores parciais e formatos. | Teste schema-contract cobre colunas obrigatórias/nullables e falha se UI inventar valor. |
| W7.2 — Paginação, busca e ordenação reais | Implementar controles com estado URL/query e servidor; total e cursor coerentes. | Dataset > páginas prova next/previous, busca global, ordenação estável e zero duplicados. |
| W7.3 — Ações de linha e lote | Validar editar/arquivar/apagar/exportar/seleção, role, tenant, bulk atomicity e feedback. | Cada CTA prova request, resposta, affected count, persistência e reload; ação proibida retorna erro claro. |
| W7.4 — Estados e responsividade | Loading, empty, error/retry, skeleton, stale-data e layouts compact/medium/expanded sem tabela invisível. | Browser em 360/600/840/1280px prova estados e affordances; teclado e foco operam. |
| W7.5 — CSV e acessibilidade | Alinhar exportação aos dados filtrados/visíveis, escape, BOM, CRLF e proteção de formula injection. | Ficheiro exportado validado com strings hostis, acentos, linhas multilinha e filtro aplicado. |

### W8 — Builders/Studio: salvar, reabrir e publicar

**Unidades/finding groups:** PR4, PR6, Builders, Tests.

| Microfase | Ação verificável | Evidência de saída exigida |
|---|---|---|
| W8.1 — Unificar roteamento de builder | Verificar route tree, registries, menus, deep links, redirects e URL do artefato. | Abrir por cada entry point chega ao mesmo builder/draft autorizado; rota antiga não fica morta. |
| W8.2 — CRUD persistente | Implementar create→edit→save→reload→reopen com ownership e versionamento. | Teste DB e browser recuperam o mesmo conteúdo/versão após reload e nova sessão. |
| W8.3 — Publicação e preview | Separar draft/published; validar slug, permissão, cache invalidation e render público. | Publicar e abrir URL anônima exibe versão certa; rollback retorna versão anterior sem perda. |
| W8.4 — Editor e biblioteca | Validar templates, mídia, preview, undo/redo, seleção, atalhos, estados e responsividade. | Interações do editor persistem; controles não são decorativos; erro de upload não perde alterações. |
| W8.5 — Segurança e multi-tenant | Provar que IDs de projeto/template/publicação não atravessam tenant e que actions server-side revalidam. | Teste de IDOR por usuário/store e policy RLS real; logs sem conteúdo privado. |

### W9 — Geração e ciclo de vida de imagem/mídia

**Unidades/finding groups:** PR4, PR6, Imagegen, Builders, Tests.

| Microfase | Ação verificável | Evidência de saída exigida |
|---|---|---|
| W9.1 — Diferenciar real e determinístico | Identificar rotas/providers e rotular simulações/fixtures; remover UI que apresenta fixture como imagem gerada. | Resposta contém provenance, provider/job ID e saída válida; fallback determinístico é explícito. |
| W9.2 — Persistir em Storage | Validar upload, path tenant-scoped, MIME, dimensão/bytes, hash, ownership e URL assinada. | Imagem permanece disponível após reload; unauthorized user não lê/reescreve objeto. |
| W9.3 — Quota e jobs | Implementar limites, saldo, idempotência, status, progress, timeout, cancelamento e retry. | Quota debitada uma vez e só em sucesso conforme regra; job falho pode recuperar sem cobrança duplicada. |
| W9.4 — Preview/export/download | Provar renderização, seleção, artefato vinculado, URL expirável e download seguro. | Browser abre imagem real com fallback de erro e persistência em nova sessão. |

### W10 — Rotas, navegação e boundaries

**Unidades/finding groups:** PR4, PR6, Routes, Builders.

| Microfase | Ação verificável | Evidência de saída exigida |
|---|---|---|
| W10.1 — Inventário de route tree | Comparar arquivos route, routeTree.gen, router/server e manifest/registry. | Cada rota pública e autenticada existe uma vez e é alcançável; órfãs e paths sem arquivo são listados. |
| W10.2 — Menus e links | Comparar menus/sidebars/CTA/deep links a rotas e permissões reais. | Crawler/browser executa todos os links declarados sem 404 ou redirect circular. |
| W10.3 — Guards e loaders | Exercitar anon, civil, staff, owner, admin e tenant externo em loaders/actions. | Matriz de autorização com status/redirect/intended URL documentados e testados. |
| W10.4 — Erros e SSR | Verificar streaming/cache headers, server/client split, SSR, route params e API route contracts. | Smoke de build worker e browser SSR sem vazamento público de cache/sessão. |

### W11 — WhatsApp: webhooks e outbox duráveis

**Unidades/finding groups:** PR3, Persistence, Copilot.

| Microfase | Ação verificável | Evidência de saída exigida |
|---|---|---|
| W11.1 — Autenticar inbound | Validar assinatura, secret/instance, replay timestamp, payload/schema e tenant derivado. | Assinatura inválida e replay não chamam handlers nem persistem efeitos. |
| W11.2 — Deduplicar e persistir evento | Modelar inbox/evento idempotente, correlação e estados de processamento. | Webhook reenviado gera uma única mensagem/lead e evento auditado. |
| W11.3 — Outbox e workers | Persistir intenção antes de enviar; aplicar lease/lock, retry/backoff e dead-letter. | Worker concorrente não duplica envio; falha externa retém mensagem recuperável. |
| W11.4 — Status e billing | Alinhar queued/sent/delivered/failed com callbacks provider e cobrança. | Nenhum status avança sem confirmação externa; callback atrasado/reordenado é idempotente. |
| W11.5 — Observabilidade e LGPD | Redigir PII, retenção, logs, rate limit e tracing por tenant/conversa. | Teste de logs/retention prova minimização e pesquisa de incidentes correlaciona IDs. |

### W12 — Turismo e integrações operacionais

**Unidades/finding groups:** Persistence, PR5/PR6, relatório de completude e Wave 6.

| Microfase | Ação verificável | Evidência de saída exigida |
|---|---|---|
| W12.1 — Fechar schemas e RLS vivos | Aplicar migrations e validar objetos turísticos no banco instalado, políticas e grants reais. | RLS testada por roles; policies permissivas históricas removidas efetivamente no schema alvo. |
| W12.2 — Fluxo OCR/reconciliação | Conectar upload, OCR, resolução unitária/lote, provenance, revisão e aplicação. | Fixture anonimizada percorre UI→provider→storage→reconciliation→write com histórico. |
| W12.3 — Reserva, assento, comissão e ledger | Integrar transações, constraints, FSM, cálculo e ledger com RPCs reais. | Operações concorrentes não vendem assento em duplicado e reconciliam comissão/ledger. |
| W12.4 — Builders/documentos turísticos | Provar proposta, contrato, voucher e PDF/HTML efetivamente produzidos. | Artefatos abrem no browser, contêm dados persistidos e guardam versão/provenance. |
| W12.5 — Integração externa e recovery | Testar provider de OCR/operadora, timeout, webhook, fallback e retentativa. | Falhas externas viram estado observável/reprocessável; mock não é apresentado como integração real. |

### W13 — Design system e completude visual

**Unidades/finding groups:** PR4, Design, Builders.

| Microfase | Ação verificável | Evidência de saída exigida |
|---|---|---|
| W13.1 — Baseline por módulo | Separar backlog global do escopo corrigido; manter contagem de severidade e histórico por SHA. | Lint reproduzível com baseline hash; debt global não é mascarada como regressão zero. |
| W13.2 — Resolver P0/P1 por fluxo | Corrigir contraste, foco, touch targets, cores, espaçamento e estados de dados por módulo. | 0 P0/P1 nos módulos promovidos; relatório path:linha, WCAG e screenshots. |
| W13.3 — Compact/medium/expanded | Validar viewport 360, 600, 840, 1024 e 1280; tabela não vira superfície inutilizável. | Visual regression, teclado, foco e screenshot baseline aprovado para cada janela. |
| W13.4 — Tokens e estados canônicos | Resolver drift tokens/CSS, loading/empty/error/retry e componentes duplicados. | Tokens checksum/parity e lint sem baseline editado para suprimir finding. |

### W14 — Qualidade dos testes e resistência a regressão

**Unidades/finding groups:** Todos os findings de teste/CI; Tests; PR1–6.

| Microfase | Ação verificável | Evidência de saída exigida |
|---|---|---|
| W14.1 — Auditar cada teste contra falha removida | Para cada fix, verificar que o teste falha na baseline ou após retirar a proteção. | Regressão demonstrada em baseline; mutation/fault injection ou prova equivalente anexada. |
| W14.2 — Substituir doubles universais | Mockar apenas fronteira necessária, validar chamada/body/headers/resultado; tratar adapters por provider. | Teste falha com URL/body/parsing/erro incorreto; mocks não simulam sucesso silenciosamente. |
| W14.3 — Distinguir níveis de evidência | Rotular unit, contract harness, integration DB, browser E2E, CI e production smoke separadamente. | Relatório não chama contract harness em memória de E2E real; cada jornada tem ambiente nomeado. |
| W14.4 — Testar negativo/falha parcial | Cobrir tenant adversarial, 4xx/5xx, timeout, malformed payload, abort, erro entre writes, duplicate/retry. | Falha negativa comprovada; estados terminais e efeitos persistidos continuam coerentes. |
| W14.5 — CI determinístico | Rodar testes, typecheck, lint, build e dead-code; capturar logs e exigir cada step no SHA. | Quality Gates completos no mesmo SHA, sem job cancelado/skipped/empty steps. |

### W15 — Observabilidade, auditoria e operação

**Unidades/finding groups:** Copilot, AI Gateway, WhatsApp, Persistence, Builders.

| Microfase | Ação verificável | Evidência de saída exigida |
|---|---|---|
| W15.1 — Correlation IDs | Propagar request/job/conversation/tenant IDs por UI, BFF, DB, provider e worker. | Uma jornada é rastreável sem registrar segredo ou payload sensível. |
| W15.2 — Métricas e alertas | Instrumentar latência, falha, retry, quota, fila, cache, provider e erro de persistência. | Dashboard/alerta acionável com SLO e teste sintético; alerta recebe falha injetada. |
| W15.3 — Audit logs e redaction | Persistir ator/ação/objeto/tenant/resultado com política de retenção e sanitização. | Consulta de auditoria reproduz a ação; secrets/PII sensível ausentes dos logs. |

### W16 — Jornadas E2E do produto integrado

**Unidades/finding groups:** Routes, Tests, Copilot, Tables, Builders, Imagegen, Persistence.

| Microfase | Ação verificável | Evidência de saída exigida |
|---|---|---|
| W16.1 — Catálogo/tabelas | Login→lista→filtro/página→editar/arquivar→releitura como mesmo tenant e negativa como outro. | Browser + DB provam o mesmo conjunto/valor e bloqueio cross-tenant. |
| W16.2 — Copilot/artefatos | Abrir chat→prompt→provider→resposta/tabela→ação→persistência→export/reopen. | Resposta real e artefato persistente; erro provider não gera saudação/sucesso falso. |
| W16.3 — Builder/mídia | Criar→editar→upload→salvar→reload→publicar→visitar URL pública. | Conteúdo e mídia persistem; versão publicada e URL pertencem ao tenant esperado. |
| W16.4 — WhatsApp/turismo | Webhook→inbox/outbox ou OCR→workflow→transição→ledger/artefato. | Teste com DB e providers de teste confirma status, dedupe, recuperação e trilha de auditoria. |
| W16.5 — Matriz móvel/acessível | Reexecutar fluxos em compact/medium/expanded, teclado, focus-visible e leitor de tela. | Evidência browser por viewport e estado, sem CTA sem handler ou destino. |

### W17 — Candidato de release, deployment e verificação pública

**Unidades/finding groups:** Todos os waves; PR5/6 e gates de release.

| Microfase | Ação verificável | Evidência de saída exigida |
|---|---|---|
| W17.1 — Congelar SHA candidato | Resolver diffs, atualizar branch com base aprovada e publicar checklist/hash dos artefatos. | Worktree limpo no candidato; paths, migrations, build artifacts e ledger assinados por hash. |
| W17.2 — Gates e aprovação de merge | Executar suite completa e esperar Quality Gates+Cloudflare success; revisão independente e owners. | Checks finalizados success no mesmo SHA; nenhum status pending/cancelled/failed. |
| W17.3 — Deploy controlado | Aplicar migration via plano de rollout/recovery aprovado; confirmar deploy do provider após merge autorizado. | Provider informa deployment ativo para o SHA correto; logs do deploy guardados. |
| W17.4 — Smoke e rollback | Executar rotas e jornadas críticas após deploy, monitorar métricas e rollback testado. | Smoke de status, worker, chat, tabelas, builder, mídia e fluxo crítico; rollback operacional e evidências anexadas. |

### 5.1 Dependências e ordem de execução

Executar W0 primeiro. W1 e W2 são bloqueios de release; W2 (segurança) tem prioridade operacional imediata e pode ser conduzida em paralelo com W1 somente por responsáveis diferentes e com worktrees separados. W3 precede mudanças de contrato e persistência W4–W12. W14 acompanha todas as ondas, não é uma validação tardia. W5–W13 fecham os módulos por trilhas pequenas. W16 só começa quando seus fluxos têm contracts/serviços e ambiente de teste. W17 é gate de promoção, não etapa de “acabar checklist” sem evidência.

Waves podem ser reordenadas apenas com dependência e risco documentados. Não lançar uma fase grande com centenas de paths não revisados; separar por causa-raiz e, em cada PR, limitar escopo, migrations e regressão.

## 6. Routing dos findings para as ondas

Cada unidade abaixo recebe IDs estáveis como `PR1-F01` ou `CHAT-F03`; o número deriva da ordem no relatório-fonte e não deve ser renumerado ao resolver. As ondas indicadas são o destino primário para triagem; linkar ondas secundárias no ledger quando o finding cruzar mais de uma camada. O registro completo de evidências segue na seção 9.

| Unidade | Findings | Ondas primárias |
|---|---:|---|
| `pr-1` (`PR1-Fnn`) | 3 | W1, W14, W17 |
| `pr-2` (`PR2-Fnn`) | 11 | W2, W6, W14 |
| `pr-3` (`PR3-Fnn`) | 9 | W4, W11, W14 |
| `pr-4` (`PR4-Fnn`) | 5 | W8, W9, W10, W13, W14 |
| `pr-5` (`PR5-Fnn`) | 5 | W3, W4, W6, W7, W14 |
| `pr-6` (`PR6-Fnn`) | 6 | W2, W4, W5, W7, W8, W9, W10, W14 |
| `copilot` (`COP-Fnn`) | 6 | W2, W4, W5, W7 |
| `chat-stream` (`CHAT-Fnn`) | 15 | W2, W4, W5, W6 |
| `tables` (`TABLE-Fnn`) | 9 | W2, W3, W7 |
| `design` (`DESIGN-Fnn`) | 8 | W13 |
| `builders` (`BUILD-Fnn`) | 8 | W2, W4, W8, W9, W10, W13 |
| `imagegen` (`IMAGE-Fnn`) | 6 | W2, W4, W6, W9 |
| `routes` (`ROUTE-Fnn`) | 2 | W10 |
| `persistence` (`PERSIST-Fnn`) | 10 | W2, W3, W4, W12 |
| `tests` (`TEST-Fnn`) | 6 | W14, W16 |

## 7. Invariantes de aceitação por superfície

| Superfície | Não aceitar como prova | Prova mínima de fechamento |
|---|---|---|
| Copilot/chat | Mensagem padrão, mock universal ou HTTP 200 | Chamada real validada, resposta útil, thread autorizada, ação/artefato persistido, reload e erros explícitos |
| Tabelas | Linhas estáticas, contagem fixa, paginação visual | Cada coluna vem do schema/DTO; >1 página; busca/ordenação/export; ações e affected count; estados vazio/erro/loading; RLS |
| Builders/Studio | Editor renderiza ou salva somente local | Create→save→reload→reopen→publish→URL pública, tenant ownership e versão |
| Imagens/arquivos | Fixture chamada “gerada” ou preview temporário | Provider/provenance, quota, upload/Storage, MIME/ownership, URL segura, preview/download/reload |
| Rotas | Arquivo existe ou aparece no menu | Route tree, registry, guard, loader/action, navegação real e destino final sem 404 |
| Migrations/schema | Arquivo SQL existe ou lint lexical passa | Aplicação integral desde zero + atualização de base, tipos gerados, constraints, grants, RLS e testes reais |
| WhatsApp/integrações | Webhook 200 ou job queued | Assinatura validada, dedupe, outbox, entrega/provider ack, retry/idempotência, estado e auditoria |
| Release | Merge, typecheck local ou PR aberto | Checks obrigatórios verdes no SHA, deploy do provider confirmado, smoke test e caminho de rollback ensaiado |

## 8. Máquina de estados de evidência (sem atalho)

Cada finding progride separadamente por estes estados: `não verificado → reproduzido na baseline → causa confirmada → correção implementada → regressão unitária → contrato/componente → integração (DB/provider real de teste) → browser E2E → CI no SHA final → deploy observado → smoke em produção`. Marcar `bloqueado` quando faltar decisão, credencial, ambiente ou autoridade. Um estado posterior nunca é inferido de estado anterior; `corrigido no código` não significa `verificado em produção`.

Para fechar, registrar SHA/path/linhas, output ou link, fixture/role/tenant, condição positiva e negativa, reload, revisão adversarial e riscos remanescentes. Teste não discriminante é ele próprio um finding de qualidade de evidência; corrigi-lo não fecha automaticamente o defeito funcional subjacente.

## 9. Registro integral dos findings auditados

**Total: 109.** Evidência, causa, proposta e testes abaixo vêm do snapshot estruturado; os riscos de cada unidade seguem após seus findings. Preserve os rótulos e limites de verificação.

### Unidade `pr-1` — pr: 3 findings

**Confiança declarada pela auditoria:** Alta para escopo, base/head, arquivos tocados, estados dos checks GitHub, instalação e resultados Vitest local; alta para as lacunas evidenciadas nos testes; média para a causa específica da falha Cloudflare e para qualquer comportamento real de infraestrutura não acessível em modo somente leitura.

**Escopo:** Auditoria somente leitura e exclusivamente do PR #1 em EduardoChapeco/waesy. PR merged: base main 920d6fffaaeddff91b5722ff0fedddd146752726; head/merge commit 5584f48f4ac2b6031b8f8328cc9cb1ba7f127a41; mergedAt 2026-10-06T12:34:39Z. Diff: 5 arquivos, +225/-2: docs/AUDITORIA_FORENSE_2026-10-05.md, package-lock.json, src/lib/cache/edge-cache.test.ts, src/services/ai-core-gateway.test.ts e src/services/classifieds-lifecycle-authority.test.ts. Nenhum código de runtime foi alterado; os testes referidos foram auditados contra edge-cache.ts, ai-core-gateway.functions.ts e classifieds.functions.ts.

**Ondas primárias:** W1, W14, W17.

#### PR1-F01 — PR foi mesclado sem um gate CI/deploy bem-sucedido

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- .github/workflows/ci.yml
**Evidência:** Para head 5584f48f4ac2b6031b8f8328cc9cb1ba7f127a41, gh pr checks 1 retornou Cloudflare Pages=fail e 5 Quality Gates=fail. gh run view 37369638796 mostra workflow CI Unificado — Waesy Quality Gates com conclusão failure, job 5 Quality Gates concluído como cancelled em 2026-10-05T20:40:28Z e steps=[]. O workflow .github/workflows/ci.yml:29-45 define npm ci, typecheck, design lint, testes, build e dead-code como os cinco gates, portanto nenhum resultado CI completo ficou disponível. A API de proteção de main retornou 404 Branch not protected; rulesets=[]; o PR foi merged=true por EduardoChapeco com merge_commit_sha igual ao head.
**Causa-raiz:** A branch main não possui regra de proteção/ruleset exigindo checks bem-sucedidos, permitindo o merge manual apesar do cancelamento do gate principal e da falha do check Cloudflare. A causa específica da falha Cloudflare não pôde ser confirmada porque o detalhe está em endpoint externo do Cloudflare; isso permanece risco não verificado.
**Correção recomendada:** Investigar e corrigir a falha do Cloudflare, reexecutar o workflow completo no SHA 5584f48f4ac2b6031b8f8328cc9cb1ba7f127a41 e só aceitar a baseline após conclusão success. Configurar branch protection/ruleset em main exigindo 5 Quality Gates e o check de deploy quando aplicável, bloqueando merge em cancelled/failure.
**Reprodução/validação:** Executar gh pr checks 1 --repo EduardoChapeco/waesy e gh run view 37369638796 --repo EduardoChapeco/waesy --json status,conclusion,jobs reproduz os estados fail/cancelled. Executar gh api repos/EduardoChapeco/waesy/branches/main/protection reproduz {message: Branch not protected, status:404}. Os gates locais não substituem a ausência do resultado CI do commit mesclado.
**Testes de regressão:**
- Teste de política/repositório que verifique que main exige o check 5 Quality Gates com conclusão success antes do merge.
- Teste de CI que falhe se um workflow for cancelado, expirar ou não executar algum dos cinco steps definidos em .github/workflows/ci.yml.
- Smoke/deploy check reproduzível que publique ou valide o artefato Cloudflare e preserve o log da falha quando o deploy não for aceito.

#### PR1-F02 — O teste de zero-segredos do gateway fica satisfeito mesmo sem uma chamada de provedor bem-sucedida

**Severidade reportada:** `medium`.

**Arquivos/linhas:**
- src/services/ai-core-gateway.test.ts
- src/services/ai-core-gateway.functions.ts
**Evidência:** O diff adiciona src/services/ai-core-gateway.test.ts:76-89, um vi.stubGlobal('fetch', ...) global que sempre devolve HTTP 200 com JSON fixo no formato OpenAI, sem inspecionar URL, método, body, headers ou chamadas. O teste Fase 6 em :230-244 apenas serializa response e verifica ausência de sample-secret-do-not-leak, sk-live e Bearer; não verifica response.success, result.text, provider, fetch.mock.calls ou que a chamada tenha ocorrido. Em ai-core-gateway.functions.ts:696-755, o caminho de todos os provedores indisponíveis devolve response com callId/promptVersion e sem segredo, exatamente os campos que o teste verifica; as requisições reais incluem Authorization em :251-269 e :342-370, mas o stub descarta os argumentos.
**Causa-raiz:** A correção troca a dependência de rede por um sucesso sintético, mas o caso de segurança não prova sucesso funcional nem observa a fronteira HTTP. Assim, uma regressão de rota, de parsing, de timeout/fallback ou de exposição em argumentos do fetch pode continuar verde; inclusive o formato fixo não representa respostas Gemini, que são lidas via candidates em ai-core-gateway.functions.ts:289-339.
**Correção recomendada:** Separar o caso de segurança do caso de sucesso: capturar o mock de fetch, exigir response.success=true, texto/provider esperados e chamada ao endpoint correto; verificar que segredo não aparece no retorno, telemetria ou logs sem transformar o teste em chamada de rede. Adicionar respostas/erros específicos por provedor e casos 4xx, timeout, JSON inválido e fallback.
**Reprodução/validação:** npm exec vitest run src/services/ai-core-gateway.test.ts passou 6/6, mas o teste não contém nenhuma asserção de success/result nem consulta vi.mocked(fetch).mock.calls. Pela implementação, se todos os provedores falharem, o retorno em :708-755 ainda contém callId e promptVersion e não contém as strings proibidas, satisfazendo :236-244. O mesmo gate também não diferenciaria uma rota Gemini que retornasse texto vazio porque o fixture só fornece choices.
**Testes de regressão:**
- Chat síncrono happy-path que verifica success=true, texto não vazio, provider/model esperados e fetch chamado com URL/método/body corretos.
- Teste que faz o primeiro provedor retornar 500 e o segundo responder no formato correto, verificando fallbackUsed, attemptsCount e ausência de segredo no retorno.
- Teste Gemini com payload candidates e teste de resposta malformada/timeout, verificando que não há falso sucesso com texto vazio.
- Teste de não exposição que inspeciona o retorno e os registros/argumentos observáveis sem depender de um fixture HTTP universal.

#### PR1-F03 — O novo teste de edge cache cobre apenas a ramificação RPC e deixa desprotegido o bloqueio de cache público em SSR

**Severidade reportada:** `medium`.

**Arquivos/linhas:**
- src/lib/cache/edge-cache.test.ts
- src/lib/cache/edge-cache.ts
**Evidência:** O diff fixa src/lib/cache/edge-cache.test.ts:25-27 para getRequest() retornar sempre https://test.local/_serverFn/edge-cache. O único teste de applyServerFnEdgeCache em :71-80 espera PUBLIC_DYNAMIC/s-maxage=300. Já edge-cache.ts:131-139 contém a ramificação crítica que deve trocar qualquer requisição que não seja /_serverFn/ por PRIVATE_MUTABLE e capturar contexto HTTP inválido; nenhum teste do diff usa uma URL de documento normal, getRequest lançando exceção ou ambiente client.
**Causa-raiz:** O mock foi criado para destravar o import de createIsomorphicFn, mas codifica o único contexto positivo. Isso torna o gate incapaz de detectar uma regressão em isServerFnRpcRequest/effectiveProfile que passasse a enviar Cache-Control público para HTML SSR, justamente o risco de sessão/HTML obsoleto documentado em edge-cache.ts:13-16.
**Correção recomendada:** Adicionar testes com getRequest retornando https://test.local/products/1 e com getRequest lançando erro, ambos exigindo Cache-Control private, no-cache, no-store, must-revalidate e ausência de Cache-Tag/CDN-Cache-Control; adicionar caso client que não tente ler request server.
**Reprodução/validação:** npm exec vitest run src/lib/cache/edge-cache.test.ts passou 6/6. A suíte não possui assert de private/no-store para applyServerFnEdgeCache; uma alteração que removesse a seleção PRIVATE_MUTABLE em edge-cache.ts:132 continuaria satisfazendo o teste porque getRequest está permanentemente em /_serverFn/. A correção funcional não foi mutada no repositório; o defeito confirmado aqui é a lacuna do teste, e a segurança do ramo SSR permanece não verificada.
**Testes de regressão:**
- applyServerFnEdgeCache em URL de documento/SSR deve forçar PRIVATE_MUTABLE.
- applyServerFnEdgeCache quando getRequest falha deve manter fallback privado.
- RPC /_serverFn/ deve continuar aceitando o perfil público e tags esperados.
- Verificação explícita de ausência de Cache-Tag e CDN-Cache-Control no caminho privado.

**Padrões transversais observados:**
- O runtime de produção não foi alterado no PR; a mudança depende de doubles de teste, lockfile e documentação, portanto a força da evidência depende da fidelidade desses doubles.
- Os novos doubles cobrem somente o caminho determinístico de sucesso/RPC: o fetch universal descarta a fronteira HTTP e o request universal fixa /_serverFn/, deixando falhas de provedor, parsing e SSR fora do gate.
- A validação local é forte para instalação e testes unitários, mas não foi promovida a evidência de merge porque o workflow GitHub foi cancelado e main não exige checks.
**Riscos não verificados da unidade:**
- A causa da falha Cloudflare Pages não foi confirmada: o detailsUrl aponta para o painel Cloudflare, sem log de falha acessível pela API GitHub; deployabilidade do head permanece não verificada.
- Não há evidência end-to-end de browser real, Supabase remoto/RLS, persistência real de classifieds, jobs, Cloudflare edge-cache ou credenciais/provedores de IA. O próprio documento adicionado em docs/AUDITORIA_FORENSE_2026-10-05.md:15 e :133-140 declara esses limites.
- As afirmações locais do documento (205 arquivos/1.400 testes e build aprovado) não são um check CI do commit: o job 5 Quality Gates foi cancelado. A suíte local e o build foram reproduzidos; o typecheck separado não produziu diagnóstico antes do processo terminar, mas o código de saída dessa execução não foi capturado.
- O teste de classifieds continua usando Supabase, identidade e TanStack Start totalmente mockados; a autoridade testada é lógica em memória, não RLS/persistência/transação em ambiente implantado.
- O formato do fixture fetch não valida respostas Gemini nem contratos de erro/timeout/429; a correção elimina rede acidental, mas a cobertura end-to-end do gateway permanece ausente.
- O ramo SSR privado de edge-cache foi inferido no código e não reproduzido contra runtime TanStack Start real; apenas o mock RPC foi executado.
**Resumo da unidade:** O lockfile adicionado em package-lock.json:10896-10903 é consistente: npm ci --no-audit --no-fund --ignore-scripts instalou 977 pacotes e npm install --package-lock-only --dry-run reportou up to date. Os três testes tocados passaram (3 arquivos/16 testes) e a suíte local passou (205 arquivos/1.400 testes); o build local terminou criando dist/_worker.js e reportou client-leak OK. git diff --check passou. Entretanto, a evidência GitHub do próprio PR não é verde: gh pr checks reporta Cloudflare Pages=fail e 5 Quality Gates=fail; gh run view 37369638796 mostra o job 5 Quality Gates como cancelled, sem steps executados. O PR foi mesclado enquanto main não tinha proteção (API retornou 404 Branch not protected e rulesets=[]). Não há defeito confirmado no runtime introduzido pelo diff, mas há defeitos de qualidade dos gates de regressão e um defeito de governança de merge que impedem tratar a baseline como certificada end-to-end.

### Unidade `pr-2` — pr: 11 findings

**Confiança declarada pela auditoria:** high

**Escopo:** Auditoria somente leitura e exclusiva de EduardoChapeco/waesy PR #2, base main@920d6fffaaeddff91b5722ff0fedddd146752726, head audit/recursive-p0-remediation@af9853dc87c95f1ee3564079a6df33ddc97268c7, merge commit b545d3ba0938f9e3be7169434c0ab853d76483e5. PR merged em 2026-10-06T12:34:39Z; GitHub API reportou 147 arquivos, 3908 adições e 473 deleções. Foram revisados diff mergeado, AI pool/gateway, rotas SSE/webhooks, migração ReAct, testes e checks; nenhum outro repositório foi auditado ou clonado.

**Ondas primárias:** W2, W6, W14.

#### PR2-F01 — Rota SSE pública pode gastar chaves de IA da plataforma sem autenticação, quota ou cobrança

**Severidade reportada:** `critical`.

**Arquivos/linhas:**
- src/routes/api.ai.stream.ts
- src/services/ai-core-gateway.functions.ts
**Evidência:** src/routes/api.ai.stream.ts:16-65 registra POST /api/ai/stream, valida apenas o JSON e chama executeAiCoreGatewayStream com authContext: {} na linha 45; não há getServerIdentity/requireRole/enforceRateLimit/tollbooth. src/services/ai-core-gateway.functions.ts:937-958 seleciona getNextActiveKey() e faz fetch ao provider. A rota devolve HTTP 200/SSE mesmo sem qualquer guarda de identidade.
**Causa-raiz:** A nova superfície HTTP foi ligada diretamente ao gateway de baixo nível e não reutiliza as guardas aplicadas por generateText (src/services/ai.functions.ts:20-27). O gateway presume que o chamador já autenticou e, no caminho SSE, recebe contexto vazio.
**Correção recomendada:** Exigir identidade autenticada antes de abrir o stream, derivar user/store do servidor (não do body), aplicar rate limit e saldo/tollbooth por usuário/loja, registrar telemetria e rejeitar 401/429/402 antes de selecionar uma chave.
**Reprodução/validação:** Reprodução estática: um POST sem Authorization para /api/ai/stream com {"task":"chat","prompt":"teste"} passa toda a validação mostrada nas linhas 20-25 e chega ao getNextActiveKey/fetch; com uma chave ativa em api_key_pools, o request dispara uma chamada externa. Um teste de integração pode mockar getNextActiveKey e fetch e afirmar que a chamada ocorre para request sem sessão.
**Testes de regressão:**
- POST SSE sem sessão deve retornar 401/403 e não chamar getNextActiveKey nem fetch.
- Sessão autenticada sem saldo ou acima do rate limit deve retornar 402/429 e não chamar provider.
- Sessão válida deve propagar userId/storeId reais ao gateway e registrar uma chamada.

#### PR2-F02 — Política RLS de copilot_executions expõe execuções sem store_id para qualquer usuário autenticado

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- supabase/migrations/20270101010000_copilot_react_execution_persistence.sql
**Evidência:** supabase/migrations/20270101010000_copilot_react_execution_persistence.sql:52-65 habilita RLS, mas a policy select_own permite `e.user_id = auth.uid() OR e.store_id IS NULL OR e.store_id = ANY(auth_user_store_ids()) OR is_platform_admin()`. A policy dos steps repete a mesma condição via EXISTS na linha 64. Como user_id e store_id são anuláveis (linhas 8-9), qualquer execução pessoal/global com store_id NULL satisfaz a segunda disjunção, independentemente do user_id.
**Causa-raiz:** NULL foi tratado como registro público em vez de como contexto sem tenant. Isso conflita com o nome select_own e com a presença de user_id opcional; os passos herdam o mesmo vazamento.
**Correção recomendada:** Remover `store_id IS NULL` como permissão ampla. Permitir user_id = auth.uid(); para execuções de loja, exigir store_id não nulo e membership; tratar execuções de sistema explicitamente com uma flag/policy separada e nunca inferir publicidade de NULL.
**Reprodução/validação:** Em um banco com a migration aplicada, usuário A cria (ou o serviço insere) uma copilot_executions com user_id=A e store_id=NULL. Autenticado como B, SELECT nessa tabela retorna a linha porque `store_id IS NULL` é verdadeiro; SELECT em copilot_execution_steps também retorna seus passos pela policy de linha 64. A condição pode ser validada diretamente com EXPLAIN/SELECT sob dois JWTs.
**Testes de regressão:**
- Usuário B não pode SELECT uma execução de A com store_id NULL.
- Usuário de outra loja não pode SELECT execução/steps de loja diferente.
- Usuário A e platform_admin continuam podendo ler seus próprios registros.

#### PR2-F03 — Chave Gemini é enviada na URL e fica exposta a logs/proxies

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- src/services/ai-pool.ts
- src/services/ai-core-gateway.functions.ts
**Evidência:** src/services/ai-pool.ts:109 monta `...generateContent?key=${encodeURIComponent(apiKey)}`; src/services/ai-core-gateway.functions.ts:295-296 faz o mesmo no caminho síncrono e a nova função SSE em :949-950 monta `streamGenerateContent?...&key=${activeKey.rawKey}`. A chave portanto faz parte de Request.url, ao contrário dos providers que usam Authorization/x-api-key em headers.
**Causa-raiz:** O adapter Gemini interpolou o segredo no query string por conveniência e não há camada de redaction para URL/outbound logging. No stream, o valor nem sequer é codificado.
**Correção recomendada:** Usar o header suportado pelo provider (por exemplo x-goog-api-key) e manter a URL sem credenciais; adicionar redaction de Authorization/query em logs e nunca incluir segredo em erros.
**Reprodução/validação:** Mockar global fetch e inspecionar o primeiro argumento: `new URL(url).searchParams.get('key')` devolve exatamente o segredo. Qualquer log de URL, trace de edge ou proxy que registre a URL captura a credencial; no SSE o segredo cru também pode quebrar a URL quando contém caracteres reservados.
**Testes de regressão:**
- Cada chamada Gemini deve ter URL sem `key`/segredo e header de autenticação presente.
- Teste SSE com chave contendo caracteres reservados deve produzir URL válida sem expor o valor.
- Serialização de erro/log não pode conter a chave.

#### PR2-F04 — aiPool.chat não usa a pool global do Admin e passa storeId no parâmetro errado para BYOK

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- src/services/ai-pool.ts
- src/services/secret-vault.functions.ts
- src/services/api-orchestrator.functions.ts
**Evidência:** src/services/ai-pool.ts:8 importa apenas getActiveSecretForProvider; :148-154 tenta cada provider e chama `getActiveSecretForProvider(provider, storeId)`. A assinatura real em src/services/secret-vault.functions.ts:150-154 é `(provider, ownerId?, storeId?)`; o segundo argumento filtra `secret_vault.owner_id` nas linhas 164-177, não `store_id`. O caminho de pool gerenciada está separado em src/services/api-orchestrator.functions.ts:323-370, que lê api_key_pools, mas nunca é chamado por ai-pool.ts.
**Causa-raiz:** Existem dois resolvedores de chave não-canônicos. O AI pool novo chama o resolver BYOK com argumentos posicionais errados e não chama getNextActiveKey; consequentemente uma chave cadastrada somente em api_key_pools é invisível para aiPool.chat, e uma chave de secret_vault pertencente ao usuário não é encontrada quando storeId é usado como ownerId.
**Correção recomendada:** Unificar aiPool.chat no resolvedor usado pelo gateway ou chamar explicitamente `getActiveSecretForProvider(provider, identity?.id, storeId)` e, depois, getNextActiveKey/rotação/env fallback conforme política. Adicionar autorização explícita para impedir que data.storeId escolha tenant arbitrário.
**Reprodução/validação:** Configurar uma linha ativa em api_key_pools (via saveApiKeyToPool) sem secret_vault e chamar aiPool.chat: cada provider registra missing_key e termina em Nenhum provider de texto disponível. Alternativamente, configurar secret_vault.owner_id = identity.id com identity.storeId distinto: o filtro enviado é owner_id = storeId e não encontra a chave. O código permite reproduzir isso com mocks do Supabase que registram os filtros.
**Testes de regressão:**
- Chave somente em api_key_pools deve ser usada por aiPool.chat.
- Chave BYOK owner_id=userId e store_id=storeId deve ser encontrada com os dois filtros corretos.
- Usuário não pode fornecer storeId de outra loja para selecionar segredo.

#### PR2-F05 — executeAiBrowse retorna completed sem executar Steel nem a tarefa solicitada

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- src/services/ai-pool.ts
**Evidência:** src/services/ai-pool.ts:190-196 recupera uma chave Steel, mas, se ela existir, apenas retorna `{ status: "completed", result: "Sessão de navegação headless iniciada..." }`; não existe fetch, criação de sessão, polling ou validação de resposta do provider. A validação aceita task e url nas linhas 54-59.
**Causa-raiz:** O adapter de browser é um stub protegido apenas por presença de credencial, mas converte essa presença em sucesso funcional.
**Correção recomendada:** Implementar a API de sessão/execução Steel e retornar completed somente após resultado confirmado; até lá retornar failed com código explícito `NOT_IMPLEMENTED`/`PROVIDER_UNAVAILABLE` e não simular sucesso.
**Reprodução/validação:** Com qualquer chave Steel não vazia, chamar `executeAiBrowse({task:'abra uma URL inexistente', url:'https://example.invalid'})` retorna completed imediatamente e não gera nenhuma requisição externa. Um mock de fetch com contador permanece em zero.
**Testes de regressão:**
- Com chave válida, deve haver chamada Steel e o status refletir a resposta real.
- Erro/time-out do provider deve retornar failed.
- Nenhuma resposta completed pode ser produzida sem evidência de execução.

#### PR2-F06 — Fallback do AI pool reutiliza modelo incompatível no provider seguinte

**Severidade reportada:** `medium`.

**Arquivos/linhas:**
- src/services/ai-pool.ts
- src/lib/ai/provider-registry.ts
**Evidência:** src/services/ai-pool.ts:148-156 usa `const model = data.model \|\| getTextProviderDefinition(provider).defaultModel`; quando o chamador fornece data.model, o mesmo valor é enviado a todos os providers. Os adapters em :89-121 e :129-137 colocam esse model diretamente nos requests Anthropic/Gemini/OpenAI-compatible. buildFallbackChain em src/lib/ai/provider-registry.ts:92-100 percorre providers heterogêneos.
**Causa-raiz:** Override de modelo não é validado nem remapeado por provider; fallback muda protocolo/provider mas conserva um identificador de modelo que pode só existir no provider original.
**Correção recomendada:** Aceitar override por provider (mapa) ou descartar override ao cruzar provider; validar o modelo contra a definição do provider antes de executar.
**Reprodução/validação:** Enviar provider=openrouter, model=anthropic/claude-3.5-sonnet e forçar o primeiro request a retornar HTTP 429. A tentativa seguinte para gemini receberá exatamente `models/anthropic/claude-3.5-sonnet:generateContent`; o fallback então falha por modelo inexistente ou pode usar comportamento inesperado.
**Testes de regressão:**
- Após fallback openrouter->gemini, o request Gemini deve usar gemini default, não o modelo OpenRouter.
- Modelo incompatível deve ser rejeitado antes de chamar provider.
- Fallback deve manter uma resposta não vazia e provider/model coerentes.

#### PR2-F07 — Streaming não respeita timeout nem cancelamento do cliente

**Severidade reportada:** `medium`.

**Arquivos/linhas:**
- src/routes/api.ai.stream.ts
- src/services/ai-core-gateway.functions.ts
**Evidência:** src/routes/api.ai.stream.ts:13 aceita constraints.timeoutMs, mas :61-63 declara cancel() sem abortar nada e só comenta que o gateway mantém timeouts. Em src/services/ai-core-gateway.functions.ts:958 o fetch do stream não fornece signal; :960-977 lê reader até done. Não há AbortSignal.timeout nem ligação a request.signal.
**Causa-raiz:** O código SSE foi implementado como loop de leitura sem AbortController. O parâmetro timeout é aceito no contrato, mas ignorado no adapter, e cancel() não cancela fetch/reader.
**Correção recomendada:** Criar AbortController, combinar request.signal com timeoutMs/default, abortar fetch e reader em cancel(), e limitar duração/bytes/deltas do stream.
**Reprodução/validação:** Mockar fetch para retornar Response com ReadableStream que nunca fecha, ou desconectar o cliente enquanto o provider permanece aberto. A promise de executeAiCoreGatewayStream continua aguardando `reader.read()`; o timeoutMs do payload não altera esse comportamento.
**Testes de regressão:**
- Provider que nunca fecha deve produzir erro de timeout dentro do limite.
- Abort do Request deve cancelar fetch/reader e liberar a execução.
- timeoutMs enviado no payload deve ser aplicado, com valor máximo validado.

#### PR2-F08 — Streaming reporta custo/uso zero e não grava ai_telemetry_logs

**Severidade reportada:** `medium`.

**Arquivos/linhas:**
- src/services/ai-core-gateway.functions.ts
- src/routes/api.ai.stream.ts
**Evidência:** src/services/ai-core-gateway.functions.ts:931 define baseMeta com inputTokens/outputTokens/totalTokens e costUsd todos 0; :979 retorna essa metadata após receber deltas, sem contar tokens. O trecho :927-985 não insere ai_telemetry_logs, ao contrário do caminho síncrono :701-728. src/routes/api.ai.stream.ts:51-52 envia ao cliente apenas done com callId/provider/model.
**Causa-raiz:** O streaming foi adicionado como um caminho paralelo sem reutilizar o cálculo de custo/telemetria do gateway síncrono e sem consumir usage do evento final do provider.
**Correção recomendada:** Processar usage no evento final quando disponível, fazer fallback para estimativa controlada, calcular custo por provider/model e inserir telemetry tanto em sucesso quanto em erro/fallback.
**Reprodução/validação:** Com um provider que envia qualquer delta e encerra normalmente, executeAiCoreGatewayStream retorna success=true com metadata.usage.totalTokens=0 e costUsd=0; um mock de Supabase não recebe insert em ai_telemetry_logs. Isso torna chamadas reais invisíveis ao FinOps.
**Testes de regressão:**
- Stream bem-sucedido deve retornar tokens/custo não-zero quando provider envia usage.
- Cada stream deve gravar exatamente um log de telemetria com callId.
- Falha/fallback deve registrar status, attempts e error_code.

#### PR2-F09 — Cache de respostas usa fingerprint global sem tenant, provider, modelo ou limites completos

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- src/services/ai-core-gateway.functions.ts
- supabase/migrations/20261206000000_v142_ai_core_gateway_pools_and_telemetry.sql
- src/lib/supabase.ts
**Evidência:** src/services/ai-core-gateway.functions.ts:222-231 inclui apenas task, prompt, systemPrompt, responseFormat, temperature e imagesCount; exclui authContext/storeId, provider/model, maxTokens e conteúdo das imagens. O lookup :477-482 usa apenas fingerprint_hash. A migration supabase/migrations/20261206000000_v142_ai_core_gateway_pools_and_telemetry.sql:55-70 torna fingerprint_hash global UNIQUE, e :127-162 não cria policy para ai_response_cache; o gateway usa getServerClient com service_role (src/lib/supabase.ts:140-154).
**Causa-raiz:** O cache foi modelado como global por hash de prompt e o hash omite dimensões que alteram a resposta. O service-role bypassa RLS, então não há isolamento implícito no acesso do gateway.
**Correção recomendada:** Incluir tenant/user/context relevante, provider/model, maxTokens, imagens (ou bloquear cache multimodal) e versão do prompt no fingerprint; ou particionar cache por tenant e aplicar políticas/queries explícitas. Nunca retornar cache de outra identidade.
**Reprodução/validação:** Executar uma chamada com o mesmo prompt/systemPrompt em duas lojas, mas authContext, provider/model ou maxTokens diferentes. A primeira grava response_payload; a segunda consulta o mesmo fingerprint e recebe cacheHit=true, provider/model e texto da primeira chamada. A colisão também ocorre entre providers quando apenas authContext/model muda.
**Testes de regressão:**
- Mesmo prompt em duas lojas deve gerar fingerprints diferentes e nunca compartilhar response_payload.
- Alterar provider/model/maxTokens deve invalidar cache.
- Cache-hit deve preservar somente resposta do mesmo tenant e contrato.

#### PR2-F10 — Proteção de replay prometida para marketplaces não existe no caminho de assinaturas padrão

**Severidade reportada:** `medium`.

**Arquivos/linhas:**
- src/routes/api.webhooks.marketplaces.ts
- src/lib/webhook-signature.ts
**Evidência:** src/routes/api.webhooks.marketplaces.ts:5-7 documenta HMAC com replay window <=300s e GET :177-178 anuncia 300s_window. Porém o ramo padrão :51-67 só calcula HMAC de rawText e compara x-hub/x-ifood/x-shopee/x-bling; não lê timestamp nem verifica idade. Apenas o ramo Mercado Livre :35-40 aplica janela de 300s.
**Causa-raiz:** A implementação trata timestamp apenas para Mercado Livre; assinaturas padrão são aceitas indefinidamente enquanto o corpo e o segredo não mudarem, apesar do contrato/documentação declarar proteção contra replay.
**Correção recomendada:** Exigir timestamp/nonce quando o provider suportar, ou implementar dedupe obrigatório por event id/idempotency key com TTL e rejeição de replay; documentar claramente providers sem timestamp.
**Reprodução/validação:** Capturar um body válido e seu x-hub-signature-256/x-ifood-signature. Reenviar o mesmo par repetidamente: o ramo padrão recalcula o mesmo HMAC e não há qualquer comparação com Date.now(). A deduplicação só ajuda quando eventId é extraído e já registrado; não é uma proteção criptográfica geral.
**Testes de regressão:**
- Assinatura padrão fora da janela deve ser rejeitada quando timestamp estiver presente.
- Reenvio do mesmo eventId deve ser rejeitado/duplicado antes de efeitos.
- Cada provider suportado deve ter teste do header real e da política de replay.

#### PR2-F11 — PR foi mergeado com checks de CI falhando e regressão explícita no design ratchet

**Severidade reportada:** `medium`.

**Arquivos/linhas:**
- src/styles.css
- scripts/design-lint.mjs
**Evidência:** `gh pr checks 2 --repo EduardoChapeco/waesy` retornou 0 successful, 2 failing: `CI Unificado — Waesy Qua...` e `Cloudflare Pages`. GitHub check run 5 Quality Gates (run 37389188580, job 112029938299) terminou failure; o log registra P0 1561 vs baseline 1558 (+3), DL-04 3->7 (+4), módulo styles 9->13 (+4), total 14288 em 879/1869 e `Process completed with exit code 1`. O diff do PR toca src/styles.css.
**Causa-raiz:** Alterações visuais do PR aumentaram violações proibidas pelo ratchet e a política de merge não bloqueou o PR; o check Cloudflare também falhou, mas sua causa detalhada não está disponível no log público retornado.
**Correção recomendada:** Corrigir/reverter as quatro regressões DL-04 ou atualizar a baseline somente com justificativa; tornar Quality Gates e deploy check required e impedir merge quando qualquer check estiver failure. Investigar Cloudflare antes de certificar release.
**Reprodução/validação:** Reexecutar `gh run view 37389188580 --repo EduardoChapeco/waesy --log-failed` mostra a falha determinística do design-lint; `gh api repos/EduardoChapeco/waesy/commits/af9853dc87c95f1ee3564079a6df33ddc97268c7/check-runs` mostra ambas as conclusões failure. O mesmo head SHA foi mergeado em b545d3ba apesar disso.
**Testes de regressão:**
- Branch protection deve rejeitar merge com qualquer check failure.
- CI deve falhar se P0 ou DL-04 aumentar em relação à baseline.
- Smoke build/deploy deve ser executado em Node compatível e produzir logs acessíveis.

**Padrões transversais observados:**
- A entrada pública SSE não compartilha as mesmas guardas de identidade, quota, billing e telemetria usadas por generateText.
- Há dois caminhos de segredo/pool (secret_vault e api_key_pools) com contratos e escopos diferentes; o AI pool novo não é a porta única real.
- O novo streaming foi implementado em paralelo ao caminho síncrono, duplicando provider adapters e deixando timeout, custo, circuit breaker/markKeyError e telemetria divergentes.
- As políticas RLS tratam NULL como acesso amplo em vez de isolamento explícito, contrariando os nomes select_own.
- A suíte adicionada é majoritariamente unitária e mockada; não há prova end-to-end de sessão, RLS remoto, pool global, provider real, SSE abortado ou build Cloudflare.
**Riscos não verificados da unidade:**
- A causa detalhada do check Cloudflare Pages não foi confirmada: o check retornou apenas Build failed e apontou para o dashboard externo; não houve deploy nem acesso a logs privados.
- src/services/ai-pool.ts não tem import encontrado em src além de suas próprias exportações; a exposição efetiva de executeAiChat/executeAiBrowse fora do módulo não foi confirmada. Se o módulo for alcançável por Server Function, o caso sem identidade chama getActiveSecretForProvider sem ownerId e pode selecionar o primeiro segredo ativo global via service_role.
- Não foi verificado se a migration 20270101010000 foi aplicada no Supabase remoto nem se as policies existentes/roles do ambiente alteram o resultado; o vazamento é confirmado pelo SQL da migration.
- A compatibilidade dos headers HMAC reais de cada marketplace e a disponibilidade atual dos modelos nos providers não foram validadas com rede/credenciais; o replay gap padrão é confirmado pelo código, mas o contrato de timestamp de cada fornecedor permanece não verificado.
- Não foram executados browser tests, integrações Supabase/RLS, providers reais ou deploy; portanto a auditoria não certifica fluxos de produção.
**Resumo da unidade:** A implementação adiciona uma matriz de providers, fallback, gateway e uma rota SSE, mas há gaps end-to-end relevantes: a nova entrada SSE é pública e consome chaves gerenciadas sem autenticação/rate-limit/billing; o AI pool legado não usa a pool global configurada pelo Admin e contém lookup BYOK posicionalmente incorreto; Gemini envia segredo na query string; a persistência ReAct permite leitura entre tenants; e streaming não tem timeout nem telemetria real. O PR foi mergeado apesar de 2 checks falharem: 5 Quality Gates falhou no design-lint ratchet (P0 1558->1561, DL-04 3->7, styles 9->13) e Cloudflare Pages reportou Build failed. O typecheck chegou a executar sem erro registrado antes da falha do design gate, mas isso não certifica build/deploy.

### Unidade `pr-3` — pr: 9 findings

**Confiança declarada pela auditoria:** high

**Escopo:** Auditoria somente leitura do PR #3 de EduardoChapeco/waesy: base main@74d4bd7bd23f18138fedfa18030cad7641858786, head feat/whatsapp-wave1-8-complete-release@557e1bf9e24a2ba7b6abf7eb1a92c19a1cc3771c, merge 60a603be34d620dc830999228b355c6d092e07cc. Examinei as 59 mudanças do diff, rotas, serviços, UI, migrações e testes WhatsApp; não acessei nem clonei outro repositório.

**Ondas primárias:** W4, W11, W14.

#### PR3-F01 — Provider IDs incompatíveis quebram inbound oficial, flows, campanhas e a configuração de instância nova

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- src/routes/api.webhooks.whatsapp.ts:9,282-294
- src/services/whatsapp-automation-runtime.server.ts:53-69
- src/services/whatsapp-outbox.worker.ts:149-157
- src/services/whatsapp-automation.functions.ts:87-100
- src/services/whatsapp-channel-instances.functions.ts:90-113
- src/services/integrations.functions.ts:541-543
- supabase/migrations/20261006000003_whatsapp_worker_and_channel_instances.sql:46-53
**Evidência:** A rota oficial fixa WHATSAPP_PROVIDER='whatsapp_cloud_api' (src/routes/api.webhooks.whatsapp.ts:9) e grava identidades com esse provider (289-294), mas a tabela de instâncias aceita provider 'meta_cloud_api' para o canal oficial (supabase/migrations/20261006000003_whatsapp_worker_and_channel_instances.sql:46-53). O runtime copia input.provider para a outbox (src/services/whatsapp-automation-runtime.server.ts:53-69); o worker exige simultaneamente row.channel_instance_id e row.provider iguais ao provider da instância (src/services/whatsapp-outbox.worker.ts:149-157), logo uma ação de flow oficial enfileirada como whatsapp_cloud_api termina INVALID_CHANNEL_INSTANCE. Campanhas filtram identidades por instance.provider (src/services/whatsapp-automation.functions.ts:87-100), portanto não encontram as identidades gravadas como whatsapp_cloud_api. A UI de instâncias grava somente whatsapp_channel_instances (src/services/whatsapp-channel-instances.functions.ts:90-113), enquanto o chat legado procura integration_credentials com provider whatsapp_cloud_api (src/services/integrations.functions.ts:541-543).
**Causa-raiz:** Foram introduzidos dois vocabulários e dois modelos de configuração para o mesmo canal (whatsapp_cloud_api em integration_credentials/webhook e meta_cloud_api em channel_instances/worker) sem um mapeamento canônico ou constraint de compatibilidade.
**Correção recomendada:** Definir um único enum/ID canônico (por exemplo meta_cloud_api) em webhook, identidade, outbox, campanhas e BFFs; migrar/normalizar registros antigos e fazer a seleção por instance_id, não por strings independentes. Adicionar um teste de integração que percorra webhook oficial -> identidade -> thread -> flow/campanha -> claim -> adapter.
**Reprodução/validação:** 1. Salve uma instância ativa pelo novo BFF/UI com provider=meta_cloud_api. 2. Envie um POST Meta assinado associado à integration_credentials antiga; a identidade criada terá provider=whatsapp_cloud_api. 3. Lance uma campanha para a instância: a consulta em whatsapp_contact_identities usa provider=meta_cloud_api e retorna zero/queued=0. 4. Publique um flow send_text: a outbox recebe provider=whatsapp_cloud_api e o worker não encontra a instância meta_cloud_api. 5. Responda no chat usando somente a configuração nova: sendWhatsAppNotification procura a tabela antiga e retorna credencial não configurada.
**Testes de regressão:**
- POST oficial cria identidade com o mesmo provider/instance_id consumido pela campanha e pelo worker.
- Flow oficial send_text é claimado pelo worker e chega ao adapter Meta usando a instância selecionada.
- Instância salva pela UI permite reply do chat sem depender de integration_credentials legado.

#### PR3-F02 — Reply do chat é persistido como enviado antes da entrega e falha silenciosamente fora do outbox/worker

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- src/services/chat.functions.ts:282-318
- src/services/integrations.functions.ts:531-615
- supabase/migrations/20261006000002_whatsapp_inbox_delivery_and_outbox.sql:5-14
**Evidência:** sendChatMessage insere a mensagem antes do dispatch, usando apenas ciphertext e sem channel, external_message_id ou delivery_status explícitos (src/services/chat.functions.ts:282-297); em seguida chama sendWhatsAppNotification sem threadId e ignora o resultado, inclusive sent=false (308-318). A função chamada cria uma linha em whatsapp_outbox como processing/attempts=1 (src/services/integrations.functions.ts:563-580), faz fetch direto à Graph API (582-615), e em erro retorna false (598-607) sem que o caller altere a mensagem já persistida. O schema dá delivery_status default='sent' (supabase/migrations/20261006000002_whatsapp_inbox_delivery_and_outbox.sql:5-14), então uma falha de credencial/rede pode aparecer ao atendente como mensagem enviada, sem external id, sem tentativa registrada e sem retry/circuit breaker. O caminho também não usa o channel_instance_id do novo modelo.
**Causa-raiz:** O PR manteve um caminho legado de envio direto em paralelo ao worker/outbox novo e confirmou a escrita local antes de conhecer o resultado do provider; não existe transição de estado da mensagem local baseada no resultado nem propagação do erro ao BFF/UI.
**Correção recomendada:** Usar uma única operação de enqueue determinística que grave outbox com instance_id e deixe o worker entregar; só mostrar/registrar a mensagem outbound como pending/accepted/sent/failed conforme estados reais. Propagar falha para a UI ou manter retry observável; não executar fetch direto no chat.
**Reprodução/validação:** Com uma thread context_type=whatsapp, chame sendChatMessage enquanto a credencial estiver ausente ou a Graph API retornar 500. O insert local é concluído, sendWhatsAppNotification retorna {sent:false}, mas sendChatMessage retorna msg com sucesso. A linha não tem external_message_id e permanece com default sent; nenhum worker é acionado porque a função fez fetch síncrono e o caller descartou o resultado.
**Testes de regressão:**
- Falha HTTP/credencial em reply não retorna sucesso nem deixa chat_messages com delivery_status=sent.
- Reply cria exatamente uma entrada local ligada ao outbox_id/external_message_id e o worker registra attempt/circuit state.
- Teste de retry confirma que a mensagem continua pending/failed recuperável, não uma confirmação falsa.

#### PR3-F03 — Redelivery do mesmo webhook oficial pode reexecutar flows e enviar duplicatas

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- src/routes/api.webhooks.whatsapp.ts:257-273,385-431
- src/services/whatsapp-automation-runtime.server.ts:53-69
- supabase/migrations/20261006000002_whatsapp_inbox_delivery_and_outbox.sql:28-43
**Evidência:** O handler faz upsert do inbox com onConflict=store_id,event_key e ignoreDuplicates, mas só faz skip quando a linha retornada tem status processed/ignored (src/routes/api.webhooks.whatsapp.ts:257-273). No conflito DO NOTHING, não há segunda leitura por event_key; a resposta pode ser nula e o fluxo continua. A checagem posterior de duplicateMessage impede apenas um segundo chat_messages (385-419), mas dispatchWhatsAppInboundFlows é chamado incondicionalmente depois (421-431). O runtime cria novo whatsapp_flow_runs e a idempotency_key do send_text inclui o novo run.id (src/services/whatsapp-automation-runtime.server.ts:53-69), portanto cada redelivery pode gerar outbox/key diferentes.
**Causa-raiz:** A deduplicação foi aplicada somente à inserção da mensagem, não como uma guarda atômica que cobre a dispatch de automações; a rotina não relê nem reivindica um evento existente antes de executar efeitos.
**Correção recomendada:** Implementar claim idempotente de evento (insert returning id; em conflito, buscar status e retornar sem efeitos se processed; se received, lock/lease) e colocar a execução do flow sob essa mesma decisão. A idempotência outbound deve ser derivada de event_key+workflow+node, não de um run recriado por redelivery.
**Reprodução/validação:** Envie duas vezes o mesmo body Meta assinado, com o mesmo phone_number_id e message.id. Na primeira execução o inbox fica processed e um flow_run/outbox é criado. Na segunda, o upsert ignoreDuplicates não devolve nova representação, duplicateMessage bloqueia só a mensagem, e o dispatch cria outro flow_run; observe duas idempotency_keys por flow devido aos run IDs distintos. Falta teste de handler/DB que detecte isso.
**Testes de regressão:**
- Reenviar o mesmo webhook assinado duas vezes produz um único flow_run e uma única outbox row.
- Redelivery durante processamento received/failed não gera dois efeitos concorrentes.
- Teste verifica que duplicateMessage e status do inbox não são caminhos independentes para dispatch.

#### PR3-F04 — Campanha de texto válida enfileira texto vazio e falha permanentemente no adapter

**Severidade reportada:** `medium`.

**Arquivos/linhas:**
- src/services/whatsapp-automation.functions.ts:54-57,80-103
- src/services/whatsapp-outbound-adapters.server.ts:63-76
- src/routes/workspace.whatsapp.automacoes.tsx:62-67
**Evidência:** whatsappCampaignInputSchema aceita messageType='text' sem exigir corpo (src/services/whatsapp-automation.functions.ts:54-57). No launch, o payload text é construído de campaign.description (97-100), campo opcional de descrição administrativa; com description nula resulta {text:''}. O adapter Meta rejeita texto vazio como UNSUPPORTED_MESSAGE (src/services/whatsapp-outbound-adapters.server.ts:63-76, especialmente 68-71). A UI só cria campanha template e envia description:null (src/routes/workspace.whatsapp.automacoes.tsx:62-67), portanto não há caminho UI para fornecer corpo de texto.
**Causa-raiz:** Não existe campo message_body/text no contrato/schema/UI; o código reutiliza description para conteúdo de envio e não valida que text tenha corpo antes de materializar destinatários.
**Correção recomendada:** Adicionar messageText obrigatório para messageType=text, validar trim().min(1), persistir campo próprio e usar esse campo no payload; ou remover text do enum até haver UI/runtime completo. Verificar erro de outbox antes de marcar recipient/campaign.
**Reprodução/validação:** Chame createWhatsAppCampaign com messageType=text, instância Meta ativa e sem description (o schema aceita). Chame launchWhatsAppCampaign: o outbox recebe payload {text:''}; ao ser processado, sendMeta lança UNSUPPORTED_MESSAGE com retryable=false, recipient fica failed/dead-letter e a campanha não entrega.
**Testes de regressão:**
- Schema rejeita campanha text sem corpo e aceita corpo não vazio.
- Launch text materializa payload com messageText e adapter Meta envia o mesmo corpo.
- UI oferece e persiste o corpo do texto; campanha sem corpo nunca entra na outbox.

#### PR3-F05 — Runtime de flows ignora edges/ordem/trigger e marca no-op como completed

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- src/services/whatsapp-automation-runtime.server.ts:43-83
- src/services/whatsapp-automation.functions.ts:6-24
- src/routes/workspace.whatsapp.automacoes.tsx:25-27,44-49
**Evidência:** O runtime seleciona flows por store/channel/trigger_type/status, testa apenas todos os nodes condition e depois itera todos os nodes action em ordem de array, sem consultar edges ou o trigger (src/services/whatsapp-automation-runtime.server.ts:43-58). A validação aceita qualquer nodes/edges não vazios sem verificar um trigger, conectividade ou ação executável (src/services/whatsapp-automation.functions.ts:6-24). A UI cria o flow padrão com assign_agent sem profile_id (src/routes/workspace.whatsapp.automacoes.tsx:25-27,44-49); o runtime só atribui se profile_id existir (runtime:62-64), mas mesmo sem ação efetiva grava completed e incrementa execution_count (runtime:71-75).
**Causa-raiz:** A fonte de verdade declarada nodes/edges não é interpretada como grafo; o executor usa um filtro linear e não valida configurações obrigatórias das ações, transformando fluxos inválidos em execuções aparentemente bem-sucedidas.
**Correção recomendada:** Validar exatamente um trigger, referências das edges e configs por ação; executar um grafo alcançável a partir do trigger, respeitando condições/branches e estados waiting. Reportar no-op como failed/invalid, não como completed.
**Reprodução/validação:** Crie/publice um flow com trigger -> condição falsa -> action A e uma edge separada para action B; o executor coleta todas as conditions e, se passarem, executa A e B independentemente das edges. Publique o flow padrão da UI e envie inbound: o run termina completed embora assign_agent não tenha profile_id e não altere a thread.
**Testes de regressão:**
- Flow com branch executa somente o caminho alcançável.
- Flow padrão da UI exige profile_id ou não oferece assign_agent sem configuração.
- Ação inválida produz run failed e não incrementa execução como sucesso.

#### PR3-F06 — Políticas RLS Wave 2 permitem reparenting de threads/mensagens entre tenants

**Severidade reportada:** `critical`.

**Arquivos/linhas:**
- supabase/migrations/20261006000006_wave2_conversation_isolation.sql:41-56,58-92
**Evidência:** A policy de UPDATE de chat_threads autoriza o row antigo se o usuário for supervisor da loja atual, mas o WITH CHECK só exige store_id IS NOT NULL (supabase/migrations/20261006000006_wave2_conversation_isolation.sql:49-51). A policy de UPDATE de chat_messages verifica acesso à thread antiga no USING, mas tem WITH CHECK(true), sem validar a nova thread/loja (85-91). Assim, um usuário autorizado a editar uma thread/mensagem pode alterar store_id ou thread_id para outro tenant/atendimento e o novo row passa o check; políticas de SELECT do tenant destino passam a expor a conversa/mensagem.
**Causa-raiz:** A migração restringiu somente a linha pré-update e deixou o estado pós-update sem invariantes de tenant/assignment; não há WITH CHECK que mantenha store_id e thread/store consistentes.
**Correção recomendada:** Usar WITH CHECK que exija store_id inalterado e membership do novo store, e para mensagens exija EXISTS de chat_threads.new.thread_id com a mesma loja e autorização. Bloquear alterações de store_id/thread_id para clientes/atendentes, além de testes SQL de cross-tenant update.
**Reprodução/validação:** Com sessão authenticated de supervisor da loja A, execute UPDATE em chat_threads de A definindo store_id de B, ou UPDATE em chat_messages de uma thread acessível definindo thread_id de B. O USING consulta o row antigo e passa; store_id IS NOT NULL/true passa no WITH CHECK. Validar depois com um membro de B que o row aparece nas policies de SELECT.
**Testes de regressão:**
- Supervisor da loja A não consegue mover thread para store B.
- Nenhum authenticated consegue mudar chat_messages.thread_id para thread de outra loja.
- Testes RLS cobrem USING e WITH CHECK pós-update, não apenas SELECT.

#### PR3-F07 — Migração de segredo não converte linhas WhatsApp existentes e ainda torna o fallback antigo vazio

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- supabase/migrations/20261006000001_whatsapp_credential_secret_encryption.sql:1-17
- supabase/migrations/20260731131900_fase5_growth_integrations.sql:8-34
- src/services/integrations.functions.ts:14-35,178-197
**Evidência:** A migration de Wave 8 apenas adiciona public_metadata e secret_payload_encrypted/index; não há UPDATE que cifre token_payload legado nem que o limpe (supabase/migrations/20261006000001_whatsapp_credential_secret_encryption.sql:1-17). A migração anterior documenta token_payload como local de API keys/secrets (supabase/migrations/20260731131900_fase5_growth_integrations.sql:8-19,26-34). O saveIntegrationCredential só cifra novos saves (src/services/integrations.functions.ts:178-197). Para uma linha antiga, public_metadata recebe '{}' por default; getActiveIntegrationPayload escolhe public_metadata com `data.public_metadata \|\| data.token_payload` e, sem secret_payload_encrypted, retorna `{}` (src/services/integrations.functions.ts:14-35), não os tokens antigos. Assim o segredo permanece em claro no banco e o envio legado deixa de funcionar até re-salvar a credencial.
**Causa-raiz:** A mudança foi implementada somente no writer futuro; não houve backfill/rotação segura dos dados existentes, e o reader trata JSONB vazio como fallback válido por usar truthiness em vez de detectar objeto vazio.
**Correção recomendada:** Fazer migração server-side transacional que leia o legado, cifre com VAULT_MASTER_KEY, grave somente public_metadata não secreto e nulifique/remova token_payload/credentials; ajustar reader para distinguir objeto vazio. Registrar falhas e exigir re-save/rotation antes de habilitar a conexão.
**Reprodução/validação:** Crie uma linha preexistente com provider=whatsapp_cloud_api e token_payload contendo phone_number_id/access_token/app_secret; aplique as migrations sem chamar saveIntegrationCredential. public_metadata fica {} e secret_payload_encrypted NULL. getActiveIntegrationPayload retorna {}, enquanto token_payload ainda contém o segredo em claro; a rota oficial, que usa outro fallback, continua capaz de ler o registro antigo, confirmando estado inconsistente.
**Testes de regressão:**
- Migration de fixture legada deixa token_payload sem access_token/app_secret e preenche secret_payload_encrypted descriptografável.
- Reader de fixture legada retorna credenciais após backfill, mas nunca expõe segredo em public_metadata.
- Teste de rotação/re-save verifica que webhook e outbound usam o mesmo formato migrado.

#### PR3-F08 — Circuit breaker consome tentativas quando apenas bloqueia o provider e deixa item não claimable

**Severidade reportada:** `medium`.

**Arquivos/linhas:**
- supabase/migrations/20261006000003_whatsapp_worker_and_channel_instances.sql:119-140
- src/services/whatsapp-outbox.worker.ts:108-112,160-167
**Evidência:** claim_whatsapp_outbox seleciona attempts < max_attempts e incrementa attempts durante o claim, antes de saber se haverá permissão do circuito (supabase/migrations/20261006000003_whatsapp_worker_and_channel_instances.sql:119-140). Quando o circuito está aberto, o worker chama deferCircuitOpen, que apenas muda status para failed/next_attempt_at e não reverte attempts (src/services/whatsapp-outbox.worker.ts:108-112,160-167). Ao atingir max_attempts, a função de claim nunca mais seleciona o row, e também não o marca dead_letter.
**Causa-raiz:** A contagem de tentativas do provider foi acoplada ao claim da fila; skips por circuit-open são tratados como tentativa real e não possuem transição terminal explícita quando o contador chega ao limite.
**Correção recomendada:** Não incrementar attempts em circuit-open (ou adicionar contador separado de deferrals), manter a linha claimable até cooldown e garantir uma transição/alerta terminal explícita somente após tentativas reais do provider.
**Reprodução/validação:** Crie outbox pending com max_attempts=1, force o breaker da instância para open e execute o worker. O claim altera attempts para 1; acquire retorna allowed=false; defer deixa status failed. Em execuções futuras attempts<max_attempts é falso, portanto o item fica failed sem ser reenviado ou dead-lettered, embora nenhum request ao provider tenha ocorrido.
**Testes de regressão:**
- Circuit-open não incrementa provider_attempts nem perde item pending após várias execuções.
- Após cooldown, o item é claimado e enviado normalmente.
- Exaustão de tentativas reais produz dead_letter com attempt audit correspondente.

#### PR3-F09 — Índice global de external_message_id contradiz isolamento por store/provider/instância

**Severidade reportada:** `medium`.

**Arquivos/linhas:**
- supabase/migrations/20261006000004_whatsapp_security_provider_metrics.sql:24-31
- supabase/migrations/20261006000002_whatsapp_inbox_delivery_and_outbox.sql:48-50,53-66
- src/services/whatsapp-outbound-adapters.server.ts:110-140
**Evidência:** Wave 6 cria índice UNIQUE global em chat_messages(external_message_id) (supabase/migrations/20261006000004_whatsapp_security_provider_metrics.sql:24-31), embora a deduplicação da inbox seja por store_id/event_key e delivery_events seja por store_id/external_message_id/status (supabase/migrations/20261006000002_whatsapp_inbox_delivery_and_outbox.sql:48-50,53-66). O PR suporta múltiplos providers/instâncias; adapters aceitam IDs numéricos WaSender e IDs de Evolution/Meta (src/services/whatsapp-outbound-adapters.server.ts:110-140). Dois providers ou duas lojas podem legitimamente produzir o mesmo external ID e a segunda mensagem falha no índice global, causando perda de inbound/status.
**Causa-raiz:** A chave global foi adicionada para idempotência sem incluir store_id/provider/channel_instance_id, apesar de o restante do modelo declarar isolamento multi-tenant/multi-provider.
**Correção recomendada:** Escopar a unicidade por store_id + channel_instance_id/provider + external_message_id, ou usar uma tabela de mensagens externas com chave composta; alinhar filtros de status/dedup e adicionar teste multi-tenant/provider.
**Reprodução/validação:** Inserir duas chat_messages de stores diferentes (ou providers diferentes) com o mesmo external_message_id; a segunda falha em uq_chat_messages_external_message. O handler oficial captura erro de inserção e incrementa processingErrors, sem reprocessar com outra chave.
**Testes de regressão:**
- Mesmo external ID em duas lojas/providers não colide.
- Redelivery do mesmo provider/instância continua idempotente.
- Status de delivery atualiza apenas a mensagem da mesma loja/instância.

**Padrões transversais observados:**
- Há dois modelos paralelos de credencial/configuração (integration_credentials versus whatsapp_channel_instances) e dois caminhos de envio (fetch direto versus outbox/worker), sem uma fronteira canônica.
- As migrações declaram isolamento forte, mas algumas constraints/policies não carregam store_id/instance_id para o estado pós-update e uma chave externa é global.
- A cobertura adicionada está concentrada em contratos Zod, normalização, HMAC, adapters e crypto; faltam testes de handler, Supabase persistence, claim/retry/circuit, RLS, rotas publicadas, UI e provider real.
- O executor de automações e o lifecycle de campanha persistem estados de sucesso sem validar que um efeito externo foi realmente entregue.
- A validação de build/deploy não foi verde: o check Cloudflare Pages falhou no PR e a execução local de tsc não terminou por memória insuficiente.
**Riscos não verificados da unidade:**
- Não há caller/cron/trigger no repositório para POST /api/internal/whatsapp-outbox-worker nem scheduler para status scheduled de campanhas; a operação pode depender de configuração externa não visível. Sem essa configuração, filas e campanhas agendadas permanecem pendentes.
- Não foi possível reproduzir contra Supabase/Cloudflare/provider real porque não havia banco, credenciais ou endpoint de staging; os achados de RLS/migrations foram validados estaticamente.
- A suíte whatsapp-automation.contracts.test.ts não iniciou por @tanstack/react-start ausente no ambiente instalado; como o import e a ausência de dependência já existem no base, não classifiquei isso como defeito exclusivo do PR #3. tsc terminou em OOM; o Cloudflare check falhou sem logs acessíveis.
- A rotina de redaction normaliza chaves para lowercase, mas SECRET_KEYS não contém variantes como accesstoken/verifytoken/webhook_secret; não confirmei payload de provider que contenha esses campos.
- O harness scripts/whatsapp-wave8-load-test.mjs é apenas um gerador guardado por flags e a própria documentação diz que não foi executado em staging; não há evidência de carga/E2E real.
**Resumo da unidade:** PR #3 foi merged apesar de gh pr checks reportar 0 checks bem-sucedidos e 1 falha (Cloudflare Pages). A implementação não fecha o caminho end-to-end: há namespaces de provider incompatíveis entre credenciais/instâncias, o reply do chat confirma localmente antes de entregar, webhook duplicado pode reexecutar automações, campanhas text podem enfileirar payload vazio, o runtime ignora o grafo, e políticas RLS permitem reparenting de tenant. Os testes adicionados cobrem normalizadores/adapters/crypto superficiais, mas não exercitam handlers com Supabase, worker, migrações/RLS, UI ou provider real. Validação local: 35 testes direcionados passaram; a suíte de contratos falhou antes de executar por módulo ausente @tanstack/react-start no checkout instalado, e tsc abortou por OOM; portanto o build independente não foi certificado.

### Unidade `pr-4` — pr: 5 findings

**Confiança declarada pela auditoria:** high para os quatro defeitos de código e para os dois checks falhos; medium para a inferência de causa-raiz da permissão de merge e para a causa do Cloudflare (não verificável).

**Escopo:** Auditoria somente leitura do PR #4 de EduardoChapeco/waesy: base main@74d4bd7bd23f18138fedfa18030cad7641858786, head feat/waesy-studio-omni-audit@0bc67e435f82b3db80a8284ad0d152935fc2d232. Examinei diff, fontes/testes referidos, call sites de rotas, checks via gh e reproduções locais; nenhum outro repositório foi usado.

**Ondas primárias:** W8, W9, W10, W13, W14.

#### PR4-F01 — Gate de publicação não valida o tipo/registro do bloco; blocos desconhecidos podem ser publicados e somem na renderização

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- src/types/omni-builder.ts:234-241
- src/lib/builder/studio-template-audit.ts:216-221
- src/components/commerce/experience-renderer.tsx:172-203,706-717
- src/components/builder/OmniPageRenderer.tsx:53-58
**Evidência:** O contrato aceita qualquer tipo em src/types/omni-builder.ts:234-241 (type: z.string()). auditOmniDocument apenas delega para auditStudioTemplate em src/lib/builder/studio-template-audit.ts:216-218, e getPublicationBlockingFindings só filtra findings de severity=error em :220-221; não há validação contra o registry. No ExperienceRenderer, apenas os IDs de OMNI_BLOCK_RENDERER_IDS são registrados em src/components/commerce/experience-renderer.tsx:172-203; o dispatch retorna null para tipo sem componente em :706-717. O renderer público também ignora bloco não registrado em src/components/builder/OmniPageRenderer.tsx:53-58. Reprodução local passou: um documento com type='future_block' foi aceito por OmniPageDocumentSchema, audit.status='pass', getPublicationBlockingFindings=[] e o markup não continha o conteúdo do bloco.
**Causa-raiz:** O schema/gate trata type como string aberta e a auditoria cobre somente licença, acessibilidade e orçamento estático; o registry é consultado apenas no render, onde o fallback de produção é silêncio (null). Assim, publicar sucesso não garante que a árvore AST seja renderizável.
**Correção recomendada:** Validar cada block.type contra getSiteBlockByIdStrict/uma enumeração canônica durante o validator e também no gate de publicação; retornar finding error com path do bloco. Evitar silenciosamente descartar tipos desconhecidos no caminho público.
**Reprodução/validação:** Teste Vitest temporário sobre o head do PR: schema parse + audit de future_block resultaram em zero findings bloqueantes e status pass; renderToStaticMarkup(<ExperienceRenderer document={parsed}/>) omitiu o texto do bloco. Os testes existentes não exercitam tipo desconhecido nem exigem que todo bloco publicado seja renderizado.
**Testes de regressão:**
- Documento com type desconhecido deve falhar OmniPageDocumentSchema ou o gate com finding BLOCK_TYPE_UNKNOWN.
- Teste de publicação deve comprovar que qualquer bloco aceito pelo schema possui renderer registrado.
- Teste público deve falhar se um bloco aceito desaparecer do HTML renderizado.

#### PR4-F02 — Upload do Studio não cria assetRefs/provenance, então imagens reais são bloqueadas pelo próprio gate

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- src/components/builder/OmniEditor.tsx:132-145,193-203,277-287,352-360
- src/components/admin/builder/MediaUploader.tsx:23-32,91-110,128-145
- src/services/storage.functions.ts:255-261
- src/lib/builder/studio-template-audit.ts:145-160
- src/types/omni-builder.ts:234-241
**Evidência:** Os call sites do editor só atualizam a URL: src/components/builder/OmniEditor.tsx:132-145 chama onUpdateConfig('imageUrl', url), :193-203 atualiza item.imageUrl, :277-287 atualiza slide.imageUrl e :352-360 atualiza avatarUrl; nenhum cria/atualiza block.assetRefs. MediaUploader recebe apenas onChange(value:string) em src/components/admin/builder/MediaUploader.tsx:23-32 e, após upload, chama onChange(res.url) em :91-110 e :128-145. O upload retorna URL/path, sem BuilderAssetRef, em src/services/storage.functions.ts:255-261. Por outro lado, src/lib/builder/studio-template-audit.ts:145-160 produz LICENSE_PROVENANCE_MISSING quando uma URL https não tem assetRef correspondente e LICENSE_NOT_PUBLICATION_READY quando a referência é incompleta.
**Causa-raiz:** O PR adiciona o contrato assetRefs e torna provenance obrigatório para URLs remotas, mas não conecta o único fluxo de upload do editor a esse contrato. A URL pública HTTPS do Storage é detectada como externa; como não há referência vinculada, o gate bloqueia a publicação de uma mídia que o próprio UI anuncia como upload real.
**Correção recomendada:** Fazer MediaUploader retornar metadados suficientes ou criar um asset record/ref no handler de upload e atualizar atomicamente imageUrl + block.assetRefs (incluindo source_url/source_asset_id, mime/bytes e estado de provenance). Alternativamente, distinguir upload proprietário/user-provided de URL remota sem relaxar licença de terceiros.
**Reprodução/validação:** Validação estática do fluxo: uploadMediaUniversal retorna apenas url/path; todos os handlers do editor persistem somente a string no config; auditLicenses então não encontra assetRef e adiciona LICENSE_PROVENANCE_MISSING. O teste positivo existente só monta manualmente assetRefs completos em src/lib/builder/studio-template-audit.test.ts:62-84; não há teste editor-upload→save→publish.
**Testes de regressão:**
- Simular upload do Storage e verificar que o bloco contém assetRefs vinculada à URL.
- Fluxo E2E upload→save→publish deve passar para asset user-provided/verified.
- URL externa sem ref de provenance deve continuar bloqueando publicação.

#### PR4-F03 — Adapter Omni quebra uma configuração válida do schema ao clonar callbacks com structuredClone

**Severidade reportada:** `medium`.

**Arquivos/linhas:**
- src/types/omni-builder.ts:62-67
- src/components/builder/blocks/HeroMinimalSplit.tsx:47-53
- src/lib/builder/omni-experience-adapter.ts:14-26
- src/components/commerce/experience-renderer.tsx:317-331
**Evidência:** O schema de CTA permite explicitamente callback em src/types/omni-builder.ts:62-67 (z.custom<() => void>().optional()), e HeroMinimalSplit usa esse callback em src/components/builder/blocks/HeroMinimalSplit.tsx:47-53. O novo adapter faz structuredClone(block.config) em src/lib/builder/omni-experience-adapter.ts:24-26. ExperienceRenderer executa omniPageToExperienceNodes(document) na linha 317, antes de montar os BlockErrorBoundary das linhas 321-331; portanto DataCloneError escapa do boundary e pode derrubar a renderização inteira.
**Causa-raiz:** O contrato de conteúdo ainda admite funções de interação, mas o adapter trata config como JSON-clonável. A fronteira de erro é criada depois do clone, portanto não protege esse caso.
**Correção recomendada:** Definir o AST persistido como JSON-only e remover callback do schema/passar ações por action_bindings, ou fazer clone seguro que preserve/retire funções conforme contrato. Mover proteção para a fronteira de conversão e testar SSR/local editor.
**Reprodução/validação:** Reprodução Vitest local no head: OmniPageDocumentSchema.parse de um hero com primaryCta.onClick=()=>{} foi bem-sucedido, mas omniPageToExperienceNodes(parsed) lançou erro de clone/DataCloneError. Os testes do PR cobrem somente config JSON sem função.
**Testes de regressão:**
- Hero com onClick permitido pelo contrato deve renderizar sem DataCloneError.
- Documento serializável/persistido não deve conter funções; callbacks devem ser resolvidos por action_bindings.
- Teste de ExperienceRenderer deve cobrir erro durante adaptação antes do boundary.

#### PR4-F04 — Novo loader Omni não está integrado à rota efetiva do editor

**Severidade reportada:** `medium`.

**Arquivos/linhas:**
- src/routes/workspace.builder.$documentId.editor.tsx:5-10,16-21,54-65
- src/services/omni-builder.functions.ts:82-143
**Evidência:** A rota src/routes/workspace.builder.$documentId.editor.tsx:5-10 importa getExperienceDocument e as funções de save/publish, mas não importa getOmniPageDocument. O loader efetivo usa getExperienceDocument em :16-21. A hidratação local em :54-65 lê settings.omni_page manualmente e, se ausente/inválido, aplica sempre template_gastronomy. O novo getOmniPageDocument está definido em src/services/omni-builder.functions.ts:82-143, mas a busca de call sites mostrou somente a definição; nenhum consumidor o chama.
**Causa-raiz:** Há dois caminhos concorrentes de carregamento: o novo BFF Omni (com parse, regeneração e escolha por document_type) e o loader legado da rota (nodes/versions + fallback client-side). O PR conectou save/publish, mas não conectou o carregamento, deixando as garantias e a hidratação do novo caminho fora do fluxo usado pelo Studio.
**Correção recomendada:** Fazer o loader da rota chamar getOmniPageDocument para o mesmo documentId, ou remover o caminho morto e centralizar parse/hidratação/template materialization no BFF. Adicionar teste de rota para documento Omni existente, corrompido e vazio.
**Reprodução/validação:** Inspeção do código e rg de referências confirmaram que a rota chama getExperienceDocument; não há chamada a getOmniPageDocument fora da própria definição. Um documento sem settings.omni_page recebe template_gastronomy no cliente, enquanto getOmniPageDocument escolheria gastronomy somente para storefront e legal para os demais tipos.
**Testes de regressão:**
- Loader do editor deve chamar getOmniPageDocument e retornar OmniPageDocument parseado.
- Documento Omni corrompido deve seguir uma única política de recuperação.
- Template inicial deve respeitar document_type/niche e registrar source_template_id/version.

#### PR4-F05 — PR foi mergeado apesar de os quality gates e deploy check estarem falhos

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- .github/workflows/ci.yml:32-45
- design-lint.baseline.json
- design-lint.report.json
- src/lib/builder/* (módulo reportado como regressão)
**Evidência:** gh pr view/checks para PR #4 reportou state=MERGED, mergedAt=2026-10-06T19:54:37Z, com 0 successful e 2 failing: '5 Quality Gates' e 'Cloudflare Pages'. O log de https://github.com/EduardoChapeco/waesy/actions/runs/37514017414 mostra que typecheck terminou e o Gate 2 design-lint falhou com baseline 10033→10034 P1, DL-02 4914→4915, DL-01 1006→1011 e módulo lib 256→265; o workflow declara Gate 2 como passo impeditivo em .github/workflows/ci.yml:35-39. O check Cloudflare Pages também está failure via API, com summary 'Build failed'.
**Causa-raiz:** O workflow falhou de forma determinística por regressão de lint, e o repositório permitiu o merge apesar do check vermelho; a configuração exata de branch protection/required checks não é visível no escopo. A causa do Cloudflare build não foi acessível pelo dashboard externo.
**Correção recomendada:** Corrigir as regressões DL-01/DL-02 introduzidas nos arquivos alterados e tornar o check '5 Quality Gates' realmente obrigatório para merge; investigar o log do Cloudflare antes de novo deploy. Não considerar os testes locais passantes como substituto dos gates de CI.
**Reprodução/validação:** Reprodução/validação por gh pr checks e gh run view do próprio PR: 2 checks failing. O log mostra o processo encerrando no Gate 2 com exit code 1 antes de testes/build subsequentes; o check Cloudflare API também registra failure.
**Testes de regressão:**
- PR com qualquer incremento P0/P1/DL-01/DL-02 deve permanecer bloqueada.
- Branch protection deve exigir o check de quality-gates e o status de deploy aplicável.
- Reexecutar CI completo (typecheck, lint, test, build, dead-code) e Cloudflare após correção.

**Padrões transversais observados:**
- Contratos de schema, registry, editor, renderer e publicação não são uma única fonte de verdade: type é string aberta, render silencioso e audit sem validação de registry.
- O PR implementa contratos de provenance, mas o editor/upload não produz os metadados exigidos pelo gate; os testes usam fixtures manuais e não cobrem o fluxo E2E.
- Há duplicação de caminhos de carregamento Omni/legacy; save/publish foram conectados, mas o load/render público e o editor não compartilham o mesmo contrato.
- CI do PR não chegou a executar testes/build após a falha do design-lint; portanto os resultados alegados no corpo da PR não são evidência do head/merge check.
**Riscos não verificados da unidade:**
- Não foi possível confirmar a causa-raiz do Cloudflare Pages failure porque o link exige acesso ao dashboard; apenas o status failure e summary 'Build failed' foram verificáveis via GitHub API.
- Não executei E2E contra Supabase/Storage real nem contra navegador/Lighthouse; a auditoria estática declara essas limitações em src/lib/builder/studio-template-audit.ts:177-180.
- A ausência de filtro store_id em getOmniPageDocument (src/services/omni-builder.functions.ts:97-101) é um risco de isolamento a revisar, mas não a classifiquei como defeito do PR porque o diff não alterou esse trecho e a rota efetiva atualmente não chama esse loader.
- O arquivo temporário de reprodução foi removido ou ficou fora do escopo do repositório auditado; nenhum arquivo versionado foi editado, staged, committed, pushed, merged ou deployed pelo auditor.
**Resumo da unidade:** PR #4 está MERGED (2026-10-06T19:54:37Z), mas chegou ao merge com os dois checks reportados como FAILED: 5 Quality Gates e Cloudflare Pages. Os testes focados disponíveis passaram (3 arquivos/29 testes, mais omni-builder.test.ts isolado: 16/16), porém há gaps confirmados no caminho end-to-end Omni/Studio: o gate de publicação aceita tipos de bloco desconhecidos que desaparecem no renderer; o fluxo real de upload grava apenas URL e não cria assetRefs/provenance, portanto imagens reais remotas são bloqueadas na publicação; e o adapter usa structuredClone em uma configuração que o próprio schema permite conter callback. Também confirmei que o novo loader getOmniPageDocument não é chamado pela rota efetiva do editor.

### Unidade `pr-5` — pr: 5 findings

**Confiança declarada pela auditoria:** Alta para o estado dos checks, drift documental, wiring ausente, escopo do scanner e risco de concorrência/fail-open; média para a causa subjacente do Cloudflare e para riscos que dependem do schema/produtor Supabase remoto.

**Escopo:** Auditoria somente leitura e exclusivamente do PR #5 em EduardoChapeco/waesy: base main (2ebb04f8188b43255e51b1c5377962aaaec1ab87), head chore/sync-task-qhMPHRy4 (713c0c96f04d5db7e78b667078d40a77d9246f80), aberto, 1 commit e 7 ficheiros adicionados. Foram verificados diff, código-fonte/migrations referidos, checks e sobreposição de caminhos com o PR #6. Não foram auditados outros repositórios nem PRs #1–#4.

**Ondas primárias:** W3, W4, W6, W7, W14.

#### PR5-F01 — Os artefactos de auditoria afirmam 11 pendências/8 remoções, mas o checker no próprio head encontra 19 e o código ainda contém as referências supostamente removidas

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- docs/audits/BFF_CONTRACT_CLOSURE_WAVE2_2026-10-06.md
- docs/audits/BFF_TABLE_CONTRACT_BASELINE_2026-10-06.md
- scripts/check-bff-table-contracts.mjs
- src/services/cart.functions.ts
- src/services/marketplace-hub.functions.ts
- src/services/chat.functions.ts
- src/services/chat-commerce.functions.ts
- src/services/social.functions.ts
- src/services/ai-conversations.functions.ts
- src/services/stories.functions.ts
**Evidência:** docs/audits/BFF_CONTRACT_CLOSURE_WAVE2_2026-10-06.md:14-27 diz que o baseline caiu de 28 para 11 e que ads, channel_vault_credentials, direct_conversations, direct_messages, immutable_ledger_entries, post_media, store_orders e store_stories foram removidas/substituídas. Executando `node scripts/check-bff-table-contracts.mjs` sobre o snapshot exato do head 713c0c96 (com a dependência glob disponível) retorna exit 1, 468 migrations, 600 declarações, 488 referências e 19 `MISSING_TABLE`, incluindo os 8 nomes acima. Há evidência de código ainda ativo: src/services/cart.functions.ts:1245-1251 faz `.from("ads")`; marketplace-hub.functions.ts:1802-1806 lê `channel_vault_credentials`; chat.functions.ts:931-938 apaga `direct_messages`/`direct_conversations`; chat-commerce.functions.ts:803-805 consulta `immutable_ledger_entries`; social.functions.ts:2443-2447 lê `post_media`; ai-conversations.functions.ts:1432-1436 lê `store_orders`; stories.functions.ts:337-341 lê `store_stories`. O baseline adicionado em docs/audits/BFF_TABLE_CONTRACT_BASELINE_2026-10-06.md:9 também registra números incompatíveis (439/552/471/28).
**Causa-raiz:** Os documentos parecem ter sido sincronizados a partir de uma execução/snapshot diferente do conteúdo que está no head; não existe geração/reconciliação automática do baseline, e o diff do PR só adiciona documentação/checker/migration, sem remover essas chamadas do código.
**Correção recomendada:** Regenerar os documentos a partir do mesmo SHA e decidir para cada uma das 19 relações: remover/substituir a chamada, adicionar DDL real verificado, ou documentar explicitamente um contrato remoto. Não publicar o baseline como 11 enquanto o checker reportar 19.
**Reprodução/validação:** No snapshot PR5, instalar apenas a dependência `glob` e executar `node scripts/check-bff-table-contracts.mjs` reproduz os 19 missing e a falha. `grep -n` nos caminhos acima reproduz cada chamada ainda presente.
**Testes de regressão:**
- Executar o checker no CI e comparar sua saída com o artefacto versionado; falhar se contagem/lista divergirem.
- Adicionar teste de snapshot que assegure que cada relação declarada como removida não aparece em chamadas `.from()` do head.

#### PR5-F02 — O gate check:bff-tables não é um comando npm nem um gate de CI, apesar de os artefactos o apresentarem como executável/obrigatório

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- scripts/check-bff-table-contracts.mjs
- package.json
- .github/workflows/ci.yml
- docs/audits/BFF_TABLE_CONTRACT_BASELINE_2026-10-06.md
**Evidência:** scripts/check-bff-table-contracts.mjs:251-256 implementa o scanner e docs/audits/BFF_TABLE_CONTRACT_BASELINE_2026-10-06.md:4 chama `npm run check:bff-tables`; porém package.json:scripts não contém `check:bff-tables`, e .github/workflows/ci.yml só executa os Gates 1–5 (typecheck, design lint, test, build e dead-code), sem o checker. A própria mensagem do script em scripts/check-bff-table-contracts.mjs:293 menciona allowlist, mas não há script/entrypoint configurado para executá-lo no fluxo de release.
**Causa-raiz:** O novo script foi adicionado sem registrar o correspondente package script e sem adicionar um step ao workflow; portanto o sucesso do check `5 Quality Gates` do PR não cobre contratos BFF↔migrations.
**Correção recomendada:** Adicionar `check:bff-tables: node scripts/check-bff-table-contracts.mjs` ao package.json e um step obrigatório do ci.yml (e/ou incluir no check:canonical/release), preservando o exit code 1 enquanto houver missing tables.
**Reprodução/validação:** No snapshot PR5, `npm run check:bff-tables` retorna `npm error Missing script: "check:bff-tables"`. `gh run view 37529835087` mostra somente os Gates 1–5 como concluídos com sucesso, sem execução do checker.
**Testes de regressão:**
- CI deve executar explicitamente `npm run check:bff-tables` e falhar para o estado atual não fechado.
- Smoke test de package scripts que invoque o comando em um checkout limpo e verifique que ele não retorna Missing script.

#### PR5-F03 — O scanner tem escopo incompleto e deixa passar referências de banco reais fora de src/services/**/*.functions.ts

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- scripts/check-bff-table-contracts.mjs
- src/services/onboarding-pipeline.server.ts
- src/registries/mcp-tool-registry.ts
**Evidência:** scripts/check-bff-table-contracts.mjs:252 restringe `serviceFiles` a `src/services/**/*.functions.ts`. No mesmo head existem chamadas diretas fora desse glob: src/services/onboarding-pipeline.server.ts:434-440 faz `.from("google_business_connections")` (não há `CREATE TABLE/VIEW` correspondente em supabase/migrations), e src/registries/mcp-tool-registry.ts:1007-1011 faz `.from("commercial_proposals")` (também sem DDL correspondente em supabase/migrations). O output do checker não lista nenhum desses nomes, embora uma busca de todo src encontre-os.
**Causa-raiz:** A implementação assume que todos os consumidores BFF são arquivos com o sufixo *.functions.ts; handlers server-side, registries e outros módulos com acesso Supabase ficam fora do inventário. O parser também só reconhece `.from()` com literal simples.
**Correção recomendada:** Definir o universo de consumidores por análise de todos os módulos server-side/rotas/registries, ou usar uma regra explícita para excluir apenas código client-side; suportar chamadas dinâmicas/aliases de forma segura e manter uma lista de exceções verificável. Recalcular o baseline depois disso.
**Reprodução/validação:** `grep -n` nos dois caminhos reproduz as chamadas. Uma varredura de todos os .ts/.tsx do head encontra `google_business_connections` e `commercial_proposals`, enquanto `grep -R CREATE ... supabase/migrations` não encontra DDL e a execução do checker não os imprime.
**Testes de regressão:**
- Teste fixture com uma referência ausente em *.server.ts e outra em registry deve fazer o gate falhar.
- Teste de cobertura que compare referências Supabase encontradas em todo src server-side com as relações declaradas/justificadas.

#### PR5-F04 — A nova tabela de quota não fecha o débito end-to-end: o protocolo de leitura-modificação-escrita perde débitos concorrentes e ignora erros

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- supabase/migrations/20270109000000_close_bff_quota_and_whatsapp_lead_contracts.sql
- src/services/token-quota.functions.ts
**Evidência:** A migration adicionada em supabase/migrations/20270109000000_close_bff_quota_and_whatsapp_lead_contracts.sql:4-13 cria `user_daily_token_quotas` com `UNIQUE(user_id, quota_date)`, mas src/services/token-quota.functions.ts:153-171 lê a linha e calcula o saldo em separado; src/services/token-quota.functions.ts:195-211 faz depois um UPDATE ou INSERT separado. As respostas de erro desses reads/writes não são verificadas (por exemplo :153 e :205-211). O débito de `user_token_wallets` também é uma atualização separada em :175-192. Não há RPC/transação/lock/idempotency key no diff.
**Causa-raiz:** A migration fornece apenas a constraint de unicidade, enquanto o BFF mantém um read-then-write não-atómico fora de uma transação; concorrência pode sobrescrever `used_tokens` ou causar conflito de INSERT, e falhas de banco são transformadas em sucesso aparente por erros ignorados.
**Correção recomendada:** Mover quota e carteira para uma função SQL transacional/RPC com lock por `(user_id, quota_date)`, `INSERT ... ON CONFLICT ... DO UPDATE`, débito atómico da wallet, idempotency key e validação de todos os `error`; só retornar sucesso após commit.
**Reprodução/validação:** Para um usuário/data sem linha, dispare duas chamadas concorrentes a `consumeCivilTokens`: ambas podem observar `quotaRow=null`, calcular o mesmo `usedToday=0` e tentar inserir. Uma falha na UNIQUE ou uma atualização perdida ainda deixa a função retornando `{success:true}`; o total persistido fica abaixo do total reportado. Se a tabela/migration ainda não estiver aplicada, o insert falha mas o caminho continua até o retorno de sucesso. A sequência é diretamente visível nas linhas citadas e pode ser coberta com um mock Supabase que devolva conflito/erro.
**Testes de regressão:**
- Teste concorrente com N consumos do mesmo usuário/data deve persistir exatamente a soma e nunca ultrapassar o limite.
- Teste de erro de INSERT/UPDATE da quota deve rejeitar a operação e não retornar `success:true`.
- Teste de conflito de primeira criação deve ser coberto via integração Supabase/RPC.

#### PR5-F05 — O check obrigatório Cloudflare Pages falha, deixando o PR #5 UNSTABLE mesmo com a suíte GitHub verde

**Severidade reportada:** `medium`.

**Evidência:** `gh pr view 5`/`gh pr checks 5` no head 713c0c96 mostram `Cloudflare Pages: completed/failure` (check URL https://github.com/EduardoChapeco/waesy/runs/112496138514), `5 Quality Gates: completed/success` e `mergeStateStatus: UNSTABLE`; `gh pr checks` resume 0 cancelled, 1 failing, 1 successful, 0 skipped, 0 pending. O run GitHub 37529835087 confirma todos os cinco gates de CI verdes, portanto o bloqueio é especificamente Pages.
**Causa-raiz:** A causa imediata confirmada é a conclusão FAILURE do provedor Cloudflare Pages; o detalhe da falha não está exposto no GitHub CLI e exige acesso ao dashboard externo, logo a causa técnica exata permanece não confirmada.
**Correção recomendada:** Abrir o detalhe do check Cloudflare, corrigir a causa de build/deploy/configuração e reexecutar no SHA 713c0c96 até o check Pages passar; manter o PR bloqueado enquanto houver FAILURE.
**Reprodução/validação:** Consultar `gh pr checks 5 --repo EduardoChapeco/waesy` e `gh run view 37529835087 --repo EduardoChapeco/waesy`; ambos reproduzem o estado no momento da auditoria.
**Testes de regressão:**
- Reexecutar o deployment/check de Pages no SHA auditado e exigir conclusão SUCCESS.
- Adicionar observabilidade/URL de logs acionável ao check para que a causa possa ser validada sem acesso manual ao dashboard.

**Padrões transversais observados:**
- Drift entre documentação de auditoria e o estado efetivo do código/checker; os números e a lista de pendências não são derivados automaticamente do SHA auditado.
- Contratos Supabase são verificados apenas contra DDL local e Database = any, sem validação do schema remoto ou tipos gerados.
- Gates novos são adicionados como scripts isolados, mas não são expostos nos scripts npm nem no workflow que define o status obrigatório.
- Operações de quota/ledger usam múltiplas chamadas client-side e tratamento permissivo de erros, o que pode transformar falha de persistência em sucesso de negócio.
**Riscos não verificados da unidade:**
- Não há acesso autorizado ao projeto Supabase nesta auditoria; não foi possível confirmar se a migration 20270109000000 foi aplicada no remoto, se já existiam tabelas com schema divergente, ou se as policies compilam/funcionam nesse ambiente. Como usa `CREATE TABLE IF NOT EXISTS`, uma tabela remota preexistente pode fazer a migration saltar a criação sem reconciliar colunas/constraints.
- No código do head há apenas SELECT/UPDATE de `whatsapp_leads` em src/services/crm.functions.ts:2316-2358; as rotas/serviços locais gravam `whatsapp_lead_conversions`, não `whatsapp_leads`. Pode existir um produtor externo, mas sem introspecção/telemetria remota não é possível confirmar que leads serão criados e o fluxo end-to-end não ficará sempre vazio.
- A causa técnica da falha Cloudflare Pages não pôde ser confirmada porque o detalhe está em dashboard externo; apenas o status FAILURE é evidenciado pelo GitHub.
- Não foram encontrados testes de integração/contrato adicionados para a nova migration; a execução GitHub verde cobre TypeScript/testes/build da aplicação, não prova RLS, concorrência ou aplicação remota do SQL.
**Resumo da unidade:** O PR é mergeable no GitHub, mas está UNSTABLE: CI Unificado — Waesy Quality Gates passou (typecheck, design lint, testes, build e dead-code) e Cloudflare Pages falhou; o rollup fica pending. O PR #5 e o #6 têm a mesma base main e não têm interseção de caminhos alterados (7 contra 124 ficheiros), portanto não há conflito textual direto; o #6 não transporta os novos artefactos/migration do #5. A cobertura encontrou drift material entre documentação e o checker executado, o gate novo não está ligado ao npm/CI, o scanner omite referências reais fora de *.functions.ts e o contrato de quota continua não-atómico/fail-open.

### Unidade `pr-6` — pr: 6 findings

**Confiança declarada pela auditoria:** Alta para os cinco defeitos de código (e-mail/WhatsApp, origem ausente, rota inexistente, FSM e telemetria), alta para o status de check Cloudflare; média para impacto operacional em produção por ausência de ambiente Supabase/Cloudflare de execução.

**Escopo:** Auditoria somente leitura de EduardoChapeco/waesy#6 (aberto; base main@2ebb04f8188b43255e51b1c5377962aaaec1ab87; head chore/recover-waesy-task-2026-10-06@8e1b2c4972c8bb76c7cf1c59ade41e71c6e2b96d). PR #6: 124 arquivos, +10424/-10372, MERGEABLE porém UNSTABLE. PR #5 foi verificado apenas quanto à interação: também parte do mesmo main, head 713c0c96f04d5db7e78b667078d40a77d9246f80, sem arquivos sobrepostos; não foi auditado. Nenhuma edição/stage/commit/push/merge/deploy foi feita.

**Ondas primárias:** W2, W4, W5, W7, W8, W9, W10, W14.

#### PR6-F01 — Ação de orçamento de viagem sempre falha por contrato UI→dispatcher incompatível

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- src/components/chat/structured-message-view.tsx
- src/services/ai-conversations.functions.ts
**Evidência:** src/components/chat/structured-message-view.tsx:1187-1197 cria action_type=request_travel_quote com destination, duration_days, passengers_count, estimated_budget_cents e days, mas não inclui origin_city. src/services/ai-conversations.functions.ts:2066-2070 lê data.payload.origin_city e lança 'Origem, destino e dados de contato são obrigatórios' quando origin está vazio, antes de chamar requestTravelQuote.
**Causa-raiz:** O schema implícito do bloco estruturado e o contrato do dispatcher foram implementados separadamente; a UI produz apenas destino, enquanto o backend exige origem.
**Correção recomendada:** Definir uma única DTO/schema compartilhada. Incluir origem explícita no bloco ou derivá-la de localização/workspace de forma auditável; só então chamar requestTravelQuote.
**Reprodução/validação:** Autenticado, renderizar um bloco de itinerary e clicar 'Solicitar Orçamento a Agencia Credenciada'. A ação chega com destination preenchido e origin_city undefined; o caminho determinístico lança o erro da linha 2070. O handler requestTravelQuote exige origin_city em tourism.functions.ts:656.
**Testes de regressão:**
- Teste do StructuredMessageView deve afirmar que request_travel_quote contém origin_city.
- Teste do dispatcher com payload exatamente produzido pelo bloco deve chegar ao mock de requestTravelQuote, não lançar validação.

#### PR6-F02 — Dispatcher de viagem persiste e-mail no campo contact_whatsapp

**Severidade reportada:** `medium`.

**Arquivos/linhas:**
- src/services/ai-conversations.functions.ts
- src/services/tourism.functions.ts
**Evidência:** src/services/ai-conversations.functions.ts:2068-2069 obtém contactEmail de identity.email e exige apenas esse valor; em :2081 envia contact_whatsapp: String(identity.email \|\| ''), e em :2082 envia o mesmo valor como contact_email. tourism.functions.ts:668-670 valida contact_whatsapp somente como string com mínimo de 8 caracteres e :678-695 persiste o valor sem transformação.
**Causa-raiz:** Provável copy/paste: o campo WhatsApp foi preenchido a partir de identity.email, sem usar o telefone/WhatsApp da identidade nem solicitar esse contato no payload.
**Correção recomendada:** Usar o campo telefônico canônico da identidade ou exigir contact_whatsapp validado; não usar e-mail como fallback silencioso. Manter e-mail somente em contact_email.
**Reprodução/validação:** Após fornecer origin_city para passar a primeira validação, execute a ação com identity.email='ana@example.com'. requestTravelQuote aceita a string (comprimento >=8) e grava 'ana@example.com' em travel_quotes.contact_whatsapp; o contato operacional de WhatsApp fica inválido.
**Testes de regressão:**
- Teste de dispatcher deve verificar contact_whatsapp igual ao telefone e contact_email igual ao e-mail.
- Teste deve rejeitar ausência/valor não telefônico de WhatsApp antes do insert.

#### PR6-F03 — Abertura de artefato aponta para /workspace/builder, mas não há rota registrada

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- src/components/chat/ai-chat-shell.tsx
- src/routeTree.gen.ts
- src/routes/
**Evidência:** PR #6 alterou src/components/chat/ai-chat-shell.tsx:492-498 para abandonar o painel local e executar window.location.assign(`/workspace/builder?${query}`), usando doc ou artifactId. A inspeção da árvore src/routes e de src/routeTree.gen.ts não encontrou rota/arquivo /workspace/builder; os únicos usos são links/preview para esse caminho, não um route module registrado.
**Causa-raiz:** A mudança hardcodou uma URL de destino sem registrar a rota correspondente nem implementar resolução de artifactId; a navegação é tratada como se o Builder fosse uma rota existente.
**Correção recomendada:** Apontar para a rota Builder realmente registrada ou adicionar/registrar essa rota e implementar ambos os parâmetros; cobrir navegação em teste de rota/browser.
**Reprodução/validação:** Renderizar qualquer ChatArtifactCard e clicar em abrir Builder. O navegador é redirecionado para /workspace/builder?doc=... ou ?artifactId=..., caminho ausente da árvore de rotas, resultando em 404/rota não encontrada em vez de abrir o artefato.
**Testes de regressão:**
- Teste de route tree deve resolver /workspace/builder?doc=<uuid>.
- Teste do ChatArtifactCard deve verificar que o clique chega a uma rota registrada e que artifactId é resolvido ou rejeitado com mensagem explícita.

#### PR6-F04 — FSM persiste NEEDS_CLARIFICATION como current_phase RUNNING e resume deixa status/fase divergentes

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- src/services/autonomous-copilot-orchestrator.ts
- src/services/copilot-execution-persistence.ts
- src/types/copilot-fsm.ts
**Evidência:** src/services/autonomous-copilot-orchestrator.ts:427-445 chama completeCopilotExecution com status 'paused' e retorna fsmPhase 'NEEDS_CLARIFICATION' quando needsCityClarification é verdadeiro (predicado em :95-97). src/services/copilot-execution-persistence.ts:67-76 mapeia completed/failed/cancelled, mas qualquer status restante, inclusive paused, cai em currentPhase='RUNNING'. O mesmo arquivo :98-105 altera resume para status='running' sem alterar current_phase, deixando FAILED_RETRYABLE/NEEDS_CLARIFICATION no registro.
**Causa-raiz:** A enumeração PersistedExecutionStatus inclui paused, mas a tabela de conversão status→fase não contempla paused nem faz transição explícita de resume para RUNNING.
**Correção recomendada:** Mapear paused para NEEDS_CLARIFICATION (ou persistir a fase efetiva como argumento obrigatório) e, no resume, atualizar status e current_phase atomically para RUNNING, registrando a transição.
**Reprodução/validação:** Chamar executeAutonomousCopilotTask('quero hotéis') sem activeCity: o resultado retorna NEEDS_CLARIFICATION, enquanto a linha copilot_executions é atualizada para status=paused,current_phase=RUNNING. Para uma execução FAILED_RETRYABLE, chamar resumeCopilotExecution: status vira running mas current_phase permanece FAILED_RETRYABLE.
**Testes de regressão:**
- Teste de persistência de clarification deve afirmar status=paused,current_phase=NEEDS_CLARIFICATION.
- Teste de resume deve afirmar status=running,current_phase=RUNNING e histórico/transição consistente.

#### PR6-F05 — Telemetry de passos fica stale após mutações de status

**Severidade reportada:** `medium`.

**Arquivos/linhas:**
- src/services/copilot-execution-persistence.ts
- src/services/autonomous-copilot-orchestrator.ts
**Evidência:** src/services/copilot-execution-persistence.ts:52-57 faz upsert de copilot_execution_steps uma vez por passo; :79-93 o Proxy intercepta somente push e agenda essa única gravação. O orchestrator muta depois os mesmos objetos, por exemplo :722-723 e :776-777 marcam o passo como completed, mas não chama nova persistência. A rotina final :362-381 apenas insere um snapshot separado em copilot_activity_steps; resumeCopilotExecution lê copilot_execution_steps em :101-104.
**Causa-raiz:** Dois caminhos de telemetria não compartilham atualização: o upsert normaliza o estado no push, enquanto o executor altera o objeto em memória após o retorno da ferramenta sem fazer update do row correspondente.
**Correção recomendada:** Persistir atualização final de cada passo por step_id/sequence_no após a mutação, ou usar um único snapshot/upsert final que resume também consulte; tratar falhas de escrita sem quebrar a fila de passos.
**Reprodução/validação:** Executar um domínio com ferramenta, como job_opportunities: o passo é persistido como running durante a chamada; após o fluxo retornar sucesso e completeCopilotExecution marcar COMPLETED, o row correspondente em copilot_execution_steps continua running/completed_at nulo, embora o resultado e o snapshot aggregate indiquem completed. Resume consulta justamente a tabela stale.
**Testes de regressão:**
- Mockar Supabase, executar um passo que muda running→completed e verificar segundo upsert com status completed/completed_at.
- Verificar que resumeCopilotExecution devolve os mesmos estados do snapshot final.

#### PR6-F06 — Check de deploy Cloudflare Pages está vermelho; PR permanece UNSTABLE

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- .github/workflows/
- wrangler.toml
- package.json
**Evidência:** gh pr view 6 reporta state OPEN, mergeable MERGEABLE e mergeStateStatus UNSTABLE. gh pr checks 6 reporta 1 failing/1 successful: 'X Cloudflare Pages' e '✓ CI Unificado — Waesy Qua...'. O check de CI passou, mas o check de Pages falhou.
**Causa-raiz:** A causa interna do build/deploy não está exposta pelo resumo do check; o fato confirmado é que o gate Cloudflare Pages falha no head atual.
**Correção recomendada:** Obter o log do check Cloudflare, corrigir o erro de build/deploy e reexecutar o gate; não considerar o PR pronto enquanto Pages continuar falhando.
**Reprodução/validação:** Executar gh pr checks 6 --repo EduardoChapeco/waesy no head 8e1b2c4972c8bb76c7cf1c59ade41e71c6e2b96d: retorna 'Some checks were not successful', Cloudflare Pages X e CI ✓.
**Testes de regressão:**
- Manter CI typecheck/test e adicionar/validar build de produção no mesmo ambiente do Pages.
- Exigir check Cloudflare Pages verde antes do merge.

**Padrões transversais observados:**
- Contratos Copilot não são validados de ponta a ponta: payloads estruturados, dispatcher, rotas e campos de persistência divergem sem teste de integração correspondente.
- A FSM tem estados definidos em tipos, mas a camada de persistência usa um mapeamento parcial e não registra todas as transições efetivas.
- Telemetria possui tabela de passos e snapshot agregado com fontes de verdade diferentes; o CI verde não cobre consistência de estado após mutações assíncronas.
- PR #6 e PR #5 são branches independentes do mesmo main e não compartilham arquivos; não há evidência de que #6 dependa de #5.
- A cobertura local focada passou 41/41 testes e typecheck, mas esses testes não exercitam os quatro caminhos end-to-end acima.
- O check de qualidade CI passa enquanto o check de Pages falha, portanto MERGEABLE não equivale a pronto para release.
**Riscos não verificados da unidade:**
- Não foi possível atribuir a causa do Cloudflare Pages sem o log privado/detalhado do provedor; o failure é confirmado, a causa permanece não verificada.
- Não houve acesso a um banco Supabase de produção; RLS/FK/grants e o histórico real de migrations não foram executados contra ambiente vivo.
- A auditoria não clonou nem inspecionou outro repositório; PR #5 foi usado somente para base/head/ancestry/overlap conforme o escopo.
- Não foi feita reprodução browser contra ambiente hospedado nem chamada autenticada real; as reproduções de ações/FSM são derivadas de caminhos determinísticos do código e mocks/testes locais.
**Resumo da unidade:** Foram confirmados cinco gaps de código/end-to-end, principalmente contratos Copilot UI→dispatcher/rota e persistência FSM/telemetria. O botão de orçamento de viagem não envia origem embora o dispatcher a exija; depois de corrigido isso, o dispatcher grava o e-mail no campo WhatsApp. O card de arte navega para uma rota Builder não registrada. A persistência grava status paused como fase RUNNING e resume deixa fase antiga; passos de execução ficam stale porque mutações posteriores não atualizam copilot_execution_steps. Validação local: npm run typecheck passou e suíte focada passou 5 arquivos/41 testes. GitHub: CI Unificado passou, Cloudflare Pages falhou; portanto o PR segue UNSTABLE.

### Unidade `copilot` — module: 6 findings

**Confiança declarada pela auditoria:** alta para as cadeias estáticas e para o finding da mensagem padrão, streaming desconectado, ação de cotação e mutação não persistida; média-alta para o impacto runtime do import server-only e para o abuso do guest, pois não houve browser/produção.

**Escopo:** Auditoria somente leitura do fluxo Copilot no repositório EduardoChapeco/waesy, branch chore/recover-waesy-task-2026-10-06. Cobertura: AppShell/drawer global e rota /copilot; ChatComposer/AIChatShell; server functions de threads/mensagens/guest/actions; executeAiCopilotPipeline; Prompt Shield, busca interna, MCP, FSM; gateway/providers/modelos/endpoints; SSE; orquestrador autônomo; estados, telemetria e persistência Supabase. Não houve edição, stage, commit, push, merge ou deploy; git status permaneceu limpo.

**Ondas primárias:** W2, W4, W5, W7.

#### COP-F01 — Falha do gateway/JSON inválido é mascarada como conversa concluída com a mensagem padrão

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- src/services/ai-conversations.functions.ts:706-786
- src/services/ai-conversations.functions.ts:1490-1519
- src/services/ai-conversations.functions.ts:1727-1892
- src/routes/_store.copilot.tsx:213-235
- src/components/chat/waesy-copilot-drawer.tsx:93-116
- src/services/copilot-fsm.test.ts:234-240
**Evidência:** executeAiCopilotPipeline captura qualquer erro/ausência de chave do gateway e apenas registra warning, sem guardar o erro ou alterar a FSM (src/services/ai-conversations.functions.ts:706-786). Quando nenhuma heurística casa, o ramo de conversa geral define exatamente a mensagem padrão em :1490-1510 e depois transiciona para VALIDATING/COMPLETED em :1513-1519. O resultado chega à UI como aiMessage entregue em /copilot (:1856-1892) ou como execution.responseMessage no guest/drawer (_store.copilot.tsx:213-235; waesy-copilot-drawer.tsx:93-116), portanto uma indisponibilidade de provider, resposta JSON sem message ou prompt fora das palavras-chave pode parecer que o Copilot ficou preso na saudação. O teste existente de conversa geral só exige COMPLETED e string definida (src/services/copilot-fsm.test.ts:234-240), e os 48 testes executados não cobrem gateway indisponível + prompt geral.
**Causa-raiz:** O boundary do gateway é fail-open para a resposta heurística: o erro é engolido, intent vira general_chat e a mensagem de boas-vindas é usada como resposta válida; a mesma execução é marcada COMPLETED/DELIVERED, eliminando a distinção entre resposta real e indisponibilidade.
**Correção recomendada:** Preservar o erro do gateway no contexto da execução. Se não houver resposta semântica válida e não houver um fallback determinístico específico para a intenção, anexar passo failed, retornar FAILED_RETRYABLE com mensagem explícita de indisponibilidade e não marcar a mensagem como entregue/sucesso. Validar também schema mínimo do JSON do modelo antes de aceitar gatewayResponse.
**Reprodução/validação:** No teste de fronteira já existente, faça gatewayMock.mockRejectedValue(new Error('no key')) e chame executeAiCopilotPipeline com um prompt de três ou mais palavras que não contenha uma intenção heurística, por exemplo 'explique a política internacional'. Com uma busca interna sem cards, o retorno atual é fsmPhase COMPLETED e a saudação padrão, não FAILED_RETRYABLE. Na UI, envie o prompt com provider indisponível/JSON vazio e compare o texto do assistant com a mensagem inicial; a requisição termina sem erro visível e repete a mensagem padrão.
**Testes de regressão:**
- Adicionar caso em copilot-pipeline-boundaries.test.ts para gateway rejeitado + prompt geral: esperar FAILED_RETRYABLE, mensagem de indisponibilidade e nunca a saudação padrão.
- Adicionar caso para gateway success com parsedJson sem message/texto: esperar erro de resposta vazia, não COMPLETED.
- Testar sendAiConversationMessage/guest UI contract para que a resposta falha seja exibida como failed e permita retry.

#### COP-F02 — O drawer global chama serviço server-only diretamente no bundle cliente

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- src/components/shell/app-shell.tsx:333-334
- src/components/chat/waesy-copilot-drawer.tsx:14,79-103
- src/services/ai-conversations.functions.ts:551-555,638-647
- src/lib/supabase.ts:4-15,129-160
- src/routes/_store.copilot.tsx:9-17,169-219
**Evidência:** O AppShell monta o drawer global (src/components/shell/app-shell.tsx:333-334) e o handler de clique chama diretamente executeAiCopilotPipeline (src/components/chat/waesy-copilot-drawer.tsx:14,79-103). Essa função é um export async comum, não um createServerFn (src/services/ai-conversations.functions.ts:551-555), e importa getServerClient/getServerIdentity como dependências de servidor (:8-17); ela executa getServerClient na própria pipeline em :638-647. O contrato do cliente Supabase declara explicitamente que getServerClient usa service_role, é server-side only e só deve ser chamado em createServerFn/API route (src/lib/supabase.ts:4-15,129-160). Em contraste, /copilot chama somente os wrappers createServerFn sendAiConversationMessage/executeGuestCopilotMessage (_store.copilot.tsx:9-17,169-219). Fato confirmado: a entrada drawer não atravessa nenhuma fronteira RPC suportada; o resultado em browser/build depende de comportamento incidental do bundler e não do contrato do framework.
**Causa-raiz:** A implementação duplicada do drawer importou a função interna de orquestração em vez de expor uma server function/API; isso permite que um evento React no navegador alcance código que exige env/service_role e contexto de request server.
**Correção recomendada:** Criar um único executeCopilot server function/API handler (com autenticação, rate limit e contexto de request) e fazer o drawer chamá-lo; nunca importar executeAiCopilotPipeline ou getServerClient alcançável pelo componente. Reusar o mesmo contrato de /copilot para evitar divergência de stream, persistência e ações.
**Reprodução/validação:** Validação estática: abra qualquer rota diferente de /copilot, onde AppShell monta o drawer, e inspecione o clique/submissão: não há chamada ao wrapper createServerFn nem ao endpoint SSE. Validação browser pendente: em uma build com apenas env VITE_* (sem SUPABASE_SERVICE_ROLE_KEY no cliente), submeter uma mensagem deve resultar em falha ao alcançar getServerClient ou em import server-only rejeitado; em ambos os casos não há contrato de sucesso suportado. Não existe teste de browser para fechar essa lacuna.
**Testes de regressão:**
- Teste browser que monta AppShell em rota não-/copilot, abre o drawer e verifica chamada ao RPC/endpoint server, sem getServerClient no bundle cliente.
- Teste de build/artefato que falha se ai-conversations.functions.ts ou getServerClient for alcançável estaticamente pelo bundle do drawer.
- Teste de integração comparando drawer e /copilot para o mesmo prompt e mesmo fsm/status/persistência.

#### COP-F03 — Passos autônomos ficam permanentemente em running na persistência/realtime

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- src/services/copilot-execution-persistence.ts:79-94
- src/services/autonomous-copilot-orchestrator.ts:514-538
- src/services/autonomous-copilot-orchestrator.ts:564-575
- src/services/autonomous-copilot-orchestrator.ts:597-613
- src/services/autonomous-copilot-orchestrator.ts:701-723
- src/services/autonomous-copilot-orchestrator.ts:748-777
- src/services/autonomous-copilot-orchestrator.ts:792-812
- src/services/autonomous-copilot-orchestrator.ts:826-856
- src/services/autonomous-copilot-orchestrator.ts:876-895
- src/components/chat/ai-activity-trail.tsx:64-105
**Evidência:** createPersistedActivitySteps intercepta somente Array.push e enfileira um snapshot para persistCopilotExecutionStep (src/services/copilot-execution-persistence.ts:79-94). O orquestrador adiciona o passo de harvest com status running em :514-523, aguarda a chamada externa e apenas muta o mesmo objeto para completed em :525-538 (o mesmo padrão ocorre em :564-575, :597-613, :701-723, :748-777, :792-812, :826-856 e :876-895); não há nova chamada de persistência após essas mutações. O AIActivityTrail prefere os eventos persistidos assim que recebe qualquer row (src/components/chat/ai-activity-trail.tsx:64-95), e calcula spinner a partir de persistedSteps.status=running (:100-155). Logo a resposta in-memory pode vir completed, mas o row realtime/recarregado pode continuar running e mostrar a execução presa.
**Causa-raiz:** A persistência trata steps como append-only, enquanto a execução trata-os como objetos mutáveis. As transições running→completed/failed alteram apenas a referência local; o banco não recebe upsert de atualização depois do primeiro insert.
**Correção recomendada:** Expor updatePersistedActivityStep/upsert por execution_id+step_id e chamar a atualização a cada transição de status, completedAt, detail e fsmPhase; ou tornar push persistir snapshots imutáveis e usar uma função explícita finalizeStep. O estado terminal da execução deve ser escrito somente após todos os upserts aguardarem.
**Reprodução/validação:** Enviar em /copilot um prompt autônomo como 'minerar leads de padarias em Chapecó'. Enquanto harvestAndPersistPlaces está pendente, consultar copilot_execution_steps pelo execution_id: o passo é inserido running. Depois da conclusão, consultar novamente ou recarregar a conversa; o caminho atual não emite update e a trilha que recebeu a row persistida mantém Loader2/running, embora execution.steps retornado possa indicar completed. O teste existente de persistência só verifica dois pushes já completed e ordem (:54-61), não uma mutação pós-push.
**Testes de regressão:**
- Teste de persistência que faz push de step running, muta/finaliza o step e espera o write final: payload do banco deve ser completed com completed_at.
- Teste de falha de harvester: step deve ser failed no banco e a execução failed_retryable, nunca running após completeCopilotExecution.
- Teste de AIActivityTrail com evento realtime running seguido de completed, verificando que o spinner desaparece e persistedSteps não mascara steps finais.

#### COP-F04 — Streaming SSE implementado, mas nenhuma entrada do Copilot o utiliza

**Severidade reportada:** `medium-high`.

**Arquivos/linhas:**
- src/routes/api.ai.stream.ts:40-193
- src/services/ai-core-gateway.functions.ts:926-986
- src/routes/_store.copilot.tsx:149-245,252-256,352-365
- src/components/chat/ai-chat-shell.tsx:80-116,475-483,587-593
- src/components/chat/waesy-copilot-drawer.tsx:426-434
**Evidência:** A rota SSE valida autenticação/rate limit, emite status/delta/done/error e chama executeAiCoreGatewayStream (src/routes/api.ai.stream.ts:40-193); o gateway implementa stream para Anthropic, Gemini e endpoints OpenAI-compatible (src/services/ai-core-gateway.functions.ts:926-986). Porém a busca por api/ai/stream/executeAiCoreGatewayStream no código encontrou apenas a própria rota, routeTree e implementação; as UIs chamam executeAiCopilotPipeline via drawer (:93-103) ou aguardam sendAiConversationMessage/executeGuestCopilotMessage (_store.copilot.tsx:169-219). AIChatShell recebe isStreaming opcional, mas /copilot só passa isSending (:_store.copilot.tsx:352-365; ai-chat-shell.tsx:80-116), e o drawer só mostra 'Processando instrucao...' enquanto aguarda a Promise (:426-434). Cancelar incrementa activeRunRef e muda a UI, mas não aborta a chamada server/external (_store.copilot.tsx:252-256).
**Causa-raiz:** Há três contratos de execução não conectados: pipeline síncrono de chat, server functions que aguardam execução completa e endpoint SSE independente. A camada visual não consome eventos status/delta/done nem possui AbortSignal ligado ao pipeline.
**Correção recomendada:** Escolher um contrato único: fazer drawer e /copilot consumirem SSE e aplicar deltas/estados na mensagem, ou implementar streaming nativo no server function. Encaminhar AbortSignal/request abort ao gateway e harvesters; emitir estado terminal failed/cancelled e persistir a transição.
**Reprodução/validação:** Com um provider/harvester lento, enviar uma mensagem e observar a rede: não surge POST para /api/ai/stream; a UI mostra somente estado global de envio/processamento até a Promise completar. Ao clicar cancelar, a UI libera o composer, mas a operação server continua. Validação estática é confirmada pela ausência de referências da UI ao endpoint; teste browser de latência/cancelamento não existe.
**Testes de regressão:**
- Teste de rota SSE com provider mockado em chunks: esperar planning/running, múltiplos deltas, verifying/done e error sem delta vazio.
- Teste browser do Copilot lento: validar que deltas aparecem antes do fim e cancelar encerra o request, muda FSM para CANCELLED e não deixa spinner.
- Teste de wiring que falhe se o submit do drawer ou /copilot não usar o contrato de stream escolhido.

#### COP-F05 — A ação de cotação de viagem do drawer grava origem/contato artificiais e diverge do dispatcher autenticado

**Severidade reportada:** `medium-high`.

**Arquivos/linhas:**
- src/components/chat/structured-message-view.tsx:1190
- src/routes/_store.copilot.tsx:259-276
- src/components/chat/waesy-copilot-drawer.tsx:124-143,158-195
- src/services/ai-conversations.functions.ts:2046-2084
**Evidência:** StructuredMessageView produz request_travel_quote (src/components/chat/structured-message-view.tsx:1190), e /copilot o encaminha ao dispatcher central junto com add_to_cart/submit_legal_demand/publish_ad (_store.copilot.tsx:259-276). O drawer, porém, exclui request_travel_quote da lista dispatchable e executa uma implementação própria (src/components/chat/waesy-copilot-drawer.tsx:124-143,158-195): fixa origin_city='Chapecó', usa telefone session user_metadata ou o fallback literal '49999999999' e monta special_notes localmente. O dispatcher server-side exige origem, destino, nome e email reais antes de chamar requestTravelQuote (src/services/ai-conversations.functions.ts:2046-2084), enquanto o drawer pode prosseguir com contato falso/ausente e origem errada para o usuário.
**Causa-raiz:** A segunda superfície do Copilot duplicou o executor de ações e não reutiliza as validações canônicas do dispatcher; defaults de demonstração foram deixados em um caminho que grava solicitação de negócio.
**Correção recomendada:** Remover a implementação local de request_travel_quote e encaminhar todas as ações pelo dispatcher server-side. Exigir contato/origem verdadeiros, derivar cidade do contexto autorizado ou pedir confirmação, e nunca usar telefone fictício para persistir uma cotação.
**Reprodução/validação:** Usar o drawer global como usuário sem telefone no metadata, ou fora de Chapecó, solicitar um roteiro e clicar na ação de cotação. A chamada local envia origin_city Chapecó e contact_whatsapp 49999999999; se requestTravelQuote aceitar os demais campos, a cotação persistida terá lead e origem incorretos. Comparar com o mesmo card em /copilot, que cai em dispatchAiChatAction e rejeita dados de contato incompletos.
**Testes de regressão:**
- Teste de ação no drawer sem telefone: esperar erro de dados obrigatórios e zero inserção de cotação.
- Teste com cidade ativa diferente de Chapecó: payload enviado deve usar cidade autorizada/confirmada, nunca valor fixo.
- Teste de paridade drawer vs /copilot para request_travel_quote, incluindo validação server-side e idempotência.

#### COP-F06 — Rota guest sem rate limit/quota permite executar provider e mineração externa sem autenticação e perde o histórico

**Severidade reportada:** `medium`.

**Arquivos/linhas:**
- src/routes/_store.copilot.tsx:122-147,212-235
- src/services/ai-conversations.functions.ts:2020-2039,760-771,789-884
- src/routes/api.ai.stream.ts:54-64
- supabase/migrations/20270112000001_chat_message_idempotency.sql:1-7
**Evidência:** Quando não há effectiveUserId, /copilot usa executeGuestCopilotMessage (_store.copilot.tsx:212-235). O handler público apenas valida texto e chama withCopilotTimeout/executeAiCopilotPipeline (src/services/ai-conversations.functions.ts:2020-2039); não chama getServerIdentity, enforceRateLimit ou requireTokensOrTollbooth. A cobrança/tollbooth do pipeline só é acionada quando context.storeId existe (:760-771), que nunca é enviado pelo guest handler. O mesmo caminho pode entrar na mineração autônoma externa (:789-884). Diferentemente do SSE, que exige identidade e enforceRateLimit (src/routes/api.ai.stream.ts:54-64), o guest pode repetir chamadas de provider/harvester até o timeout. Além disso, o guest handler não insere chat_messages/chat_threads; apenas retorna execution, e a UI mantém tudo em state local (:122-147,213-235), portanto refresh perde o histórico.
**Causa-raiz:** O caminho guest foi implementado como chamada síncrona sem limite por sessão/IP e sem política explícita de recursos; o contrato de persistência só existe no wrapper autenticado sendAiConversationMessage.
**Correção recomendada:** Aplicar rate limit por IP+guest session e orçamento/capability para guest antes do pipeline; bloquear ou exigir login para mineração, ações e providers caros. Definir se guest é deliberadamente efêmero; se o produto exige histórico, usar guest thread/token isolado com TTL e persistência limitada.
**Reprodução/validação:** Abrir /copilot sem sessão, enviar repetidamente prompts de até 2.000 caracteres, incluindo mineração, e observar que não há 401/429/quota e o backend continua tentando pipeline/provider/harvester; atualizar a página e observar que as mensagens guest desaparecem. A ausência de rate-limit e de inserts é fato no código; impacto de custo/provedor depende de ambiente configurado.
**Testes de regressão:**
- Teste de endpoint guest repetido: após o limite, retornar 429 sem chamar gateway/harvester.
- Teste guest sem sessão para mineração: negar capability ou exigir autenticação antes de executar ferramenta externa.
- Teste de contrato de UX: histórico guest deve sobreviver ao refresh se essa for a especificação, ou exibir explicitamente estado efêmero.

**Padrões transversais observados:**
- As superfícies drawer, /copilot e SSE têm contratos duplicados: entrada, erro, stream, persistência e ações não compartilham uma única função server-side; isso explica divergência funcional entre o botão flutuante e a rota dedicada.
- Os boundaries de erro e telemetria são assimétricos: o gateway converte falha em fallback aparentemente bem-sucedido, enquanto a persistência assíncrona engole falhas; os testes cobrem funções puras/serviços, mas não comprovam navegador, provider real, migrations aplicadas ou realtime.
- A UI prefere estado local/in-memory até receber o primeiro evento persistido; qualquer inconsistência entre mutação local e row Supabase pode deixar a trilha visual em estado running mesmo com a resposta já emitida.
**Riscos não verificados da unidade:**
- Não foi executado browser/e2e nem build de produção; portanto o comportamento exato do bundler ao empacotar a chamada server-only do drawer e a resposta visual em navegador precisa ser confirmado em ambiente de execução.
- Não foram testadas credenciais, latências ou formatos reais de Groq/Gemini/Anthropic/DeepSeek/OpenRouter; o finding da mensagem padrão é confirmado por cadeia estática/testável, mas a frequência em produção depende da disponibilidade e do JSON dos providers.
- Não foi aplicado um Supabase real nesta auditoria; RLS, realtime publication e todas as migrations devem ser validados em banco de staging. A persistência de steps running deriva diretamente do código de append/mutação e precisa de uma execução com subscription para confirmar a observação no cliente.
- Não foi possível inferir se o histórico guest efêmero é requisito ou decisão de produto; foi reportado como risco funcional/operacional, não como violação de um requisito não localizado.
**Resumo da unidade:** O fluxo tem duas entradas divergentes. AppShell monta WaesyCopilotDrawer em todas as rotas (src/components/shell/app-shell.tsx:333-334), exceto quando o drawer se auto-oculta em /copilot (src/components/chat/waesy-copilot-drawer.tsx:304-305). No drawer, o submit chama diretamente executeAiCopilotPipeline (waesy-copilot-drawer.tsx:79-121); em /copilot, o ChatComposer chama sendAiConversationMessage para thread autenticada ou executeGuestCopilotMessage para visitante (_store.copilot.tsx:149-245). O pipeline faz Prompt Shield, busca interna, depois gateway de IA e fallback heurístico; o gateway estático roteia chat para Groq llama-3.3-70b-versatile, Gemini 2.5 Flash, Anthropic Claude 3.5 Sonnet, DeepSeek ou OpenRouter Gemma free (ai-core-gateway.functions.ts:166-173), com endpoints em :257-410 e cascata em :597-790. Pedidos de mineração/planilha/hotel/vagas/eventos/CNPJ/processo/builder seguem o orquestrador autônomo (ai-conversations.functions.ts:789-884), com harvesters, cache, artefato e copilot_executions. O SSE /api/ai/stream existe e chama executeAiCoreGatewayStream (api.ai.stream.ts:40-193; ai-core-gateway.functions.ts:926-986), mas não é chamado por nenhuma UI Copilot. Mensagens autenticadas são gravadas em chat_messages e a memória em chat_threads (ai-conversations.functions.ts:1727-1892); o guest handler somente retorna a execução (:2027-2039). Testes de serviço executados: 5 arquivos, 48 testes passaram; npm run typecheck passou. Esses gates não têm teste browser/e2e do drawer, da rota /copilot, do SSE nem do contrato de persistência real.

### Unidade `chat-stream` — module: 15 findings

**Confiança declarada pela auditoria:** Alta para os defeitos de fluxo visíveis no código (rotas, callbacks, writes e policies); média para efeitos dependentes de runtime/build/DB, explicitamente marcados em unverified_risks.

**Escopo:** Auditoria somente leitura em /home/ubuntu/waesy-audit, cobrindo src/components/chat/ai-chat-shell.tsx, waesy-copilot-drawer.tsx, structured-message-view.tsx e ai-activity-trail.tsx; src/routes/_store.copilot.tsx e api.ai.stream.ts; src/services/ai-conversations.functions.ts, ai-core-gateway.functions.ts e copilot-execution-persistence.ts; src/lib/ai/sse.ts; identidade/Supabase; migrations e testes reais de chat/Copilot/SSE/persistência. Não clonei nem auditei outro repositório e não editei o alvo.

**Ondas primárias:** W2, W4, W5, W6.

#### CHAT-F01 — Drawer global executa pipeline server-side diretamente no cliente, fora de RPC/SSE

**Severidade reportada:** `critical`.

**Arquivos/linhas:**
- src/components/chat/waesy-copilot-drawer.tsx:14-17,95-103
- src/services/ai-conversations.functions.ts:551-555,638
- src/lib/supabase.ts:128-160
**Evidência:** Fato confirmado no grafo: WaesyCopilotDrawer importa executeAiCopilotPipeline e o chama diretamente em src/components/chat/waesy-copilot-drawer.tsx:14-17,95-103. A função é um export async comum em src/services/ai-conversations.functions.ts:551-555, não um createServerFn. Ela chama getServerClient() em :638; esse cliente usa SUPABASE_SERVICE_ROLE_KEY e explicitamente bypassa RLS em src/lib/supabase.ts:140-154. O contrato de server-access diz que esse cliente só deve ser chamado dentro de createServerFn/server-only.
**Causa-raiz:** O caminho dedicado do drawer não foi encapsulado em uma server function/BFF; a exportação do pipeline ficou alcançável pelo bundle React cliente. O resultado em produção depende do bundler: pode falhar por env server ausente ou, se o módulo for empacotado, quebrar a fronteira de segredo/service-role.
**Correção recomendada:** Remover a importação direta do pipeline do componente. Expor uma única server function autenticada para o drawer, ou fazer ambos os clientes usarem o endpoint SSE/BFF; manter getServerClient e providers somente em módulos server.
**Reprodução/validação:** Abrir qualquer rota diferente de /copilot, abrir o drawer e enviar uma mensagem. Inspecionar o bundle/network: o fluxo não chama uma função RPC criada por createServerFn nem /api/ai/stream; executar o build com análise do chunk cliente deve provar se o import é rejeitado ou se código server-only é incluído.
**Testes de regressão:**
- Teste de build que falhe se waesy-copilot-drawer importar executeAiCopilotPipeline ou qualquer módulo que contenha getServerClient.
- Teste de navegador/rede do drawer confirmando chamada somente ao BFF/server function e ausência de SUPABASE_SERVICE_ROLE_KEY no bundle.

#### CHAT-F02 — Autorização BFF concede qualquer thread da loja a qualquer membro, ignorando papel e atribuição

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- src/services/ai-conversations.functions.ts:88-99,1655-1683,1727-1767,1899-2007
- src/lib/supabase.ts:140-154
- supabase/migrations/20261006000006_wave2_conversation_isolation.sql:41-70
**Evidência:** assertAiThreadAccess aceita acesso se identity.store_id ou qualquer identity.memberships.store_id coincidir com thread.store_id, sem verificar role nem assigned_to_profile_id, em src/services/ai-conversations.functions.ts:88-99. get/send/save/pin/delete chamam esse helper (:1676,1747,1915,1962,2003), mas todas as consultas usam getServerClient/service-role. A policy canônica da migration exige owner/admin/manager/platform/master ou thread atribuída ao atendente em supabase/migrations/20261006000006_wave2_conversation_isolation.sql:41-70; ela é bypassada pelo BFF.
**Causa-raiz:** A camada server-side duplicou a autorização de objeto de forma mais ampla que RLS: membership é tratado como autorização administrativa plena e o campo de atribuição nem é carregado/verificado.
**Correção recomendada:** Centralizar assertThreadAccess com papéis explícitos e assigned_to_profile_id; exigir owner/admin/manager/platform/master para fila/ações destrutivas e participante/assigned para leitura/envio. Preferir cliente SSR/RLS ou aplicar os mesmos predicados em todas as funções.
**Reprodução/validação:** Criar usuário B com workspace_members em uma loja, sem ser customer/recipient e com papel seller/support ou sem atribuição; chamar getAiConversationThread, sendAiConversationMessage ou deleteAiConversationThread para thread de outro cliente da mesma loja. O helper retorna sem erro e service-role executa a operação.
**Testes de regressão:**
- Teste negativo para seller/support não atribuído tentando ler, enviar, fixar, salvar artifact e excluir thread de outro cliente.
- Teste positivo para participante e supervisor autorizado; teste cross-store negativo.

#### CHAT-F03 — Retry não é idempotente e pode duplicar mensagem, geração e cobrança

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- src/routes/_store.copilot.tsx:149-164,247-250
- src/services/ai-conversations.functions.ts:1749-1767,759-770
- supabase/migrations/20270112000001_chat_message_idempotency.sql:1-7
**Evidência:** A migration cria unique index em (thread_id, client_message_id) e declara que o cliente mantém o mesmo UUID em supabase/migrations/20270112000001_chat_message_idempotency.sql:1-7. Porém handleRetryMessage descarta o id original e chama handleSendMessage, que cria novo crypto.randomUUID() em src/routes/_store.copilot.tsx:149-164,247-250. No servidor, sendAiConversationMessage faz insert simples sem lookup/upsert/conflito em :1749-1767; o idempotency key de cobrança é derivado do startTime em src/services/ai-conversations.functions.ts:759-770.
**Causa-raiz:** O contrato de idempotência existe no schema, mas o retry UI gera outro clientMessageId e o BFF não recupera uma execução já iniciada nem torna a saga mensagem→IA→resposta atômica/idempotente.
**Correção recomendada:** Persistir clientMessageId no estado da mensagem e reutilizá-lo no retry; no BFF, buscar a mensagem existente por thread/clientMessageId e retornar resultado já persistido ou usar saga/outbox idempotente. Derivar cobrança da mesma chave estável.
**Reprodução/validação:** Enviar uma mensagem, deixar o servidor persistir user message/AI response e simular perda/erro da resposta HTTP; clicar no retry. O segundo POST terá outro clientMessageId, será aceito e executará IA novamente. Se um cliente repetir o mesmo UUID, o insert retorna unique violation sem recuperar a resposta existente.
**Testes de regressão:**
- Dois POSTs iguais com mesmo threadId/clientMessageId devem gerar uma única user message, uma resposta e uma cobrança.
- Retry após resposta HTTP perdida deve retornar a execução original, não executar gateway novamente.

#### CHAT-F04 — Falha retryable aparece como usuário entregue e não oferece retry

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- src/services/ai-conversations.functions.ts:1770-1803
- src/routes/_store.copilot.tsx:181-205,220-240
- src/components/chat/ai-chat-shell.tsx:515-543
**Evidência:** sendAiConversationMessage captura timeout/erro do pipeline e fabrica execution com fsmPhase FAILED_RETRYABLE em src/services/ai-conversations.functions.ts:1770-1803. A rota então sempre altera a mensagem do usuário para delivered em src/routes/_store.copilot.tsx:181-186, enquanto somente a mensagem AI recebe status failed em :197-204,228. O botão de retry do shell só é renderizado para isUser em src/components/chat/ai-chat-shell.tsx:531-543. Portanto a resposta de erro fica sem ação e a mensagem do usuário mostra check de entregue.
**Causa-raiz:** O modelo de estado separa erro da resposta AI, mas a UI só permite retry de mensagens do usuário e o status do usuário é marcado delivered antes de interpretar o estado final da execução.
**Correção recomendada:** Propagar estado retryable ao item de usuário, manter sua mensagem failed quando a execução não conclui e oferecer retry associado ao clientMessageId; ou renderizar retry explícito na mensagem AI com deduplicação.
**Reprodução/validação:** Forçar falha do provider, timeout ou erro de ferramenta. A chamada server function retorna normalmente com aiMessage.status=failed; observar no /copilot: mensagem do usuário entregue, bolha AI falha e nenhum ícone de retry clicável.
**Testes de regressão:**
- Falha retryable deve renderizar retry e não check delivered na mensagem do usuário.
- Retry da mensagem falha deve manter a mesma idempotency key e produzir uma única resposta.

#### CHAT-F05 — SSE canônico está órfão: nenhum shell faz parsing/consumo de /api/ai/stream

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- src/routes/api.ai.stream.ts:40-190
- src/lib/ai/sse.ts:1-18
- src/lib/ai/sse.test.ts:4-15
- src/routes/_store.copilot.tsx:169-219
- src/components/chat/waesy-copilot-drawer.tsx:95-103
**Evidência:** O endpoint implementa ReadableStream/SSE em src/routes/api.ai.stream.ts:40-190 e sse.ts só fornece encoder/headers em :1-18. O teste existente verifica apenas framing/headers em src/lib/ai/sse.test.ts:4-15; não há parser nem fetch/EventSource consumidor no código. O fullscreen usa sendAiConversationMessage em src/routes/_store.copilot.tsx:169-179 e o drawer chama executeAiCopilotPipeline em waesy-copilot-drawer.tsx:95-103.
**Causa-raiz:** Existem contratos de framing e uma rota de stream, mas nenhum consumidor integrado à UI nem persistência/estado incremental para esses eventos; o caminho real continua síncrono.
**Correção recomendada:** Escolher o caminho canônico: integrar ambos os shells a um consumidor SSE que trate status/delta/structured/done/error, AbortController, persistência final e deduplicação; ou remover o endpoint e não anunciar streaming.
**Reprodução/validação:** Abrir /copilot, enviar mensagem e observar Network: não aparece POST para /api/ai/stream; a UI só recebe resultado após sendAiConversationMessage resolver e não renderiza deltas/status SSE. Busca estática não encontrou EventSource, fetch da rota ou parser.
**Testes de regressão:**
- Teste de integração da rota/UI que consuma múltiplos frames, atualize texto incremental e finalize em done/error.
- Teste que falhe se /copilot enviar pela função síncrona sem o consumidor SSE escolhido.

#### CHAT-F06 — Timeout e cancelamento apenas abandonam a UI; provider e ferramentas continuam executando

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- src/services/ai-conversations.functions.ts:540-547
- src/routes/_store.copilot.tsx:252-257
- src/routes/api.ai.stream.ts:31-36,71-75,121-189
- src/services/ai-core-gateway.functions.ts:958-985
**Evidência:** withCopilotTimeout usa Promise.race e só rejeita o wrapper, sem AbortSignal/cancelamento da promise subjacente, em src/services/ai-conversations.functions.ts:540-547. handleCancelActiveRun apenas incrementa activeRunRef, marca itens failed e libera composer em src/routes/_store.copilot.tsx:252-257; não cancela request/provider. No SSE, request.signal só impede enqueue em api.ai.stream.ts:71-75, enquanto gateway fetch/reader não recebem signal em src/services/ai-core-gateway.functions.ts:958-978. O constraints.timeoutMs é validado na rota (:31-36), mas não é aplicado ao gateway stream.
**Causa-raiz:** Não há um AbortController propagado da UI/Request até fetch do provider e ferramentas; timeout é somente uma corrida de promises e cancelamento é somente controle visual.
**Correção recomendada:** Propagar AbortSignal por server function/gateway/tools, usar fetch(...,{signal}) e reader.cancel(), limpar timers no finally e tornar timeoutMs efetivo. Persistir CANCELLED sem permitir side effects posteriores.
**Reprodução/validação:** Usar provider/fetch artificialmente lento, cancelar no chat ou enviar timeoutMs baixo. A UI libera o envio e marca falha, mas o promise/provider continua; em SSE o upstream segue lendo até concluir. Instrumentar fetch/mock reader para verificar ausência de abort.
**Testes de regressão:**
- Mock provider bloqueado: cancelamento deve disparar signal.aborted e interromper reader/fetch.
- Timeout de 100ms deve abortar provider e impedir ferramenta/mutação posterior.

#### CHAT-F07 — Fallback silencioso troca usuário autenticado por thread guest e perde persistência

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- src/routes/_store.copilot.tsx:40-69,94-105,168-235
- src/services/ai-conversations.functions.ts:2027-2040
**Evidência:** O loader engole falhas de sessão/listagem em src/routes/_store.copilot.tsx:40-45 e falhas de criação da thread inicial em :50-69. Com initialThreads vazio, cria thread local DEFAULT_GUEST_THREAD_ID em :94-105. Mesmo com effectiveUserId, o envio escolhe executeGuestCopilotMessage quando a thread é esse sentinel em :168-219; esse caminho não grava chat_messages/chat_threads.
**Causa-raiz:** Erro de infraestrutura/autorização é tratado como ausência normal de conversas, sem estado de erro ou bloqueio; o sentinel guest é usado para continuar a sessão sem persistência.
**Correção recomendada:** Não fazer fallback guest para identidade autenticada. Exibir erro/retry de carregamento e impedir envio persistente até criar thread; guest deve ser explicitamente não autenticado e sinalizado.
**Reprodução/validação:** Usuário autenticado com falha de listAiConversationThreads ou createAiConversationThread (DB indisponível, schema/RLS/permission error). A página exibe Copilot Geral sem erro; enviar chama executeGuestCopilotMessage e nenhuma mensagem fica no histórico ao recarregar.
**Testes de regressão:**
- Falha de list/create para usuário autenticado deve renderizar erro e nunca chamar executeGuestCopilotMessage.
- Após reload, uma mensagem enviada em erro de persistência não pode desaparecer silenciosamente.

#### CHAT-F08 — Persistência de artifact pode falhar e a resposta ainda é marcada entregue com artifact fantasma

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- src/services/ai-conversations.functions.ts:1805-1857
- src/components/chat/ai-chat-shell.tsx:487-501
- supabase/migrations/20261215000000_ai_chat_shell_artifacts_and_projects.sql:27-40
**Evidência:** O insert em chat_artifacts é feito em operação separada em src/services/ai-conversations.functions.ts:1805-1829; seu error é ignorado e apenas artDoc é testado. Em seguida a mensagem AI persiste execution.artifact e status delivered em :1832-1857, mesmo que não exista linha de artifact. O shell renderiza o card baseado no payload em ai-chat-shell.tsx:487-501.
**Causa-raiz:** Writes de usuário, artifact, resposta e memória não são transacionais; o erro do artifact não altera o estado final nem é retornado ao cliente.
**Correção recomendada:** Usar transação/RPC ou saga idempotente; falhar a execução quando artifact obrigatório não persistir, ou retirar artifact do payload e marcar a resposta retryable. Associar message_id após criação da resposta.
**Reprodução/validação:** Mockar/induzir erro de insert em chat_artifacts (constraint, DB indisponível ou RLS). sendAiConversationMessage continua até inserir resposta, retorna delivered com artifact.id em memória; abrir o artifact/recarregar a thread revela que o registro não existe.
**Testes de regressão:**
- Falha de artifact insert não pode produzir resposta delivered com card persistente falso.
- Fluxo sucesso deve criar artifact e resposta na mesma unidade idempotente.

#### CHAT-F09 — saveAiChatArtifact usa a loja ativa da identidade, não a loja da thread

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- src/services/ai-conversations.functions.ts:1899-1937
- supabase/migrations/20261215000000_ai_chat_shell_artifacts_and_projects.sql:54-93
**Evidência:** Após verificar acesso, saveAiChatArtifact só rejeita storeId quando o chamador o envia explicitamente em src/services/ai-conversations.functions.ts:1909-1917. O insert usa data.storeId \|\| identity.store_id em :1919-1926; não usa thread.store_id nem rejeita thread sem loja. Em contexto multi-store, um usuário membro de A e B pode acessar thread A enquanto a identidade ativa aponta para B e criar artifact thread=A/store_id=B.
**Causa-raiz:** A função valida o alvo opcional contra a identidade, mas não deriva nem impõe o tenant canônico da thread; o service-role bypassa qualquer correção de RLS.
**Correção recomendada:** Carregar thread.store_id e definir o artifact com esse valor; rejeitar storeId divergente e exigir regra explícita para thread sem loja. Testar sempre cross-store.
**Reprodução/validação:** Usuário com memberships A/B, contexto ativo B, thread pertencente a A; chamar saveAiChatArtifact sem storeId. A linha inserida tem thread_id de A e store_id B, podendo aparecer/ser administrada pelas policies do tenant B.
**Testes de regressão:**
- Artifact sem storeId em thread A deve persistir store_id A, mesmo com contexto ativo B.
- storeId B para thread A deve ser rejeitado.

#### CHAT-F10 — Guest Copilot não tem rate limit, identidade nem tollbooth e pode acionar providers/mineração

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- src/services/ai-conversations.functions.ts:2020-2040,758-825
- src/routes/_store.copilot.tsx:212-219
- src/routes/api.ai.stream.ts:54-64
**Evidência:** executeGuestCopilotMessage é uma createServerFn pública com apenas schema de texto/coords em src/services/ai-conversations.functions.ts:2020-2040; não chama getServerIdentity nem enforceRateLimit. No pipeline, quando context.storeId é ausente, executeAiCoreGateway é chamado diretamente sem requireTokensOrTollbooth em :758-771. O mesmo pipeline roteia pedidos autônomos/mineração e ferramentas externas (:789-825).
**Causa-raiz:** O caminho guest foi tratado como fallback funcional, mas não recebeu orçamento/rate limit por sessão/IP nem limites de custo/provider; a proteção existente só cobre a rota SSE autenticada.
**Correção recomendada:** Aplicar rate limit por IP/guest session, orçamento/capability allowlist e timeout/abort a guest; negar mineração e mutations para guest; cobrar/telemetrar explicitamente antes de chamar provider.
**Reprodução/validação:** Sem sessão, POSTar repetidamente mensagens de 2.000 caracteres pedindo mineração/LLM. Cada chamada entra no pipeline e pode alcançar provider ou crawler, sem identidade, token tollbooth ou rate limit local.
**Testes de regressão:**
- Burst de guest deve ser bloqueado pelo rate limit antes do provider.
- Guest não pode executar intents de mineração/mutação nem chamar tollbooth sem uma política explícita.

#### CHAT-F11 — Ações estruturadas divergem: open_place funciona no drawer, mas falha no /copilot fullscreen

**Severidade reportada:** `medium`.

**Arquivos/linhas:**
- src/components/chat/structured-message-view.tsx:853-962
- src/routes/_store.copilot.tsx:259-294
- src/components/chat/waesy-copilot-drawer.tsx:124-156
**Evidência:** PlacesCarouselBlock emite open_place com payload placeId/slug/storeId, sem href, em src/components/chat/structured-message-view.tsx:950-962. O handler do fullscreen só trata href/url, open_checkout e call_ride; open_place cai no toast genérico em src/routes/_store.copilot.tsx:278-294. O drawer possui case open_place e navega em src/components/chat/waesy-copilot-drawer.tsx:145-149.
**Causa-raiz:** Os dois consumidores implementam action_type em listas diferentes e o fullscreen não normaliza placeId/slug para rota; a mesma mensagem tem comportamento diferente conforme o shell.
**Correção recomendada:** Centralizar dispatcher de ações e implementar open_place no fullscreen; normalizar payload para slug/ID e definir handlers explícitos ou remover action_types não suportados.
**Reprodução/validação:** No /copilot, buscar estabelecimento e clicar Ver Perfil. A ação é capturada, mas sem href/url cai em toast 'ação disponível...' e não navega. No drawer global, a mesma ação navega para /places/....
**Testes de regressão:**
- Renderizar places_carousel em cada shell e clicar Ver Perfil; ambos devem navegar para o mesmo destino.
- Tabela de contrato deve cobrir confirm_proposal, rsvp_event, apply_job, reconcile_entry e demais tipos emitidos.

#### CHAT-F12 — Thread switch pode exibir histórico da thread anterior ou nunca limpar thread vazia

**Severidade reportada:** `medium`.

**Arquivos/linhas:**
- src/routes/_store.copilot.tsx:137-147,350-357
**Evidência:** Ao selecionar thread, a rota apenas faz setActiveThreadId em src/routes/_store.copilot.tsx:350-357. O effect busca a thread e só chama setMessages quando messages.length > 0 em :137-147; não limpa no retorno vazio e não verifica se a resposta ainda corresponde ao activeThreadId atual.
**Causa-raiz:** Fetch de histórico não tem request sequence/AbortController e o estado anterior permanece durante carregamento e quando a thread nova é vazia.
**Correção recomendada:** Limpar mensagens imediatamente ao trocar thread, associar resposta a requestId/threadId antes de aplicar e tratar explicitamente lista vazia/erro com estado de loading/error.
**Reprodução/validação:** Com mensagens em A, selecionar rapidamente B e atrasar a resposta de A; a resposta tardia sobrescreve B. Selecionar uma thread persistida sem mensagens; o histórico de A permanece porque o retorno vazio não chama setMessages([]).
**Testes de regressão:**
- Resposta atrasada de A não pode alterar mensagens de B.
- Thread vazia deve renderizar zero mensagens, não histórico anterior.

#### CHAT-F13 — Places exibe aberto e rating sintéticos como se fossem dados reais

**Severidade reportada:** `medium`.

**Arquivos/linhas:**
- src/services/ai-conversations.functions.ts:1008-1036
- src/components/chat/structured-message-view.tsx:884-933
**Evidência:** A query seleciona working_hours e rating em src/services/ai-conversations.functions.ts:1008-1012, mas o mapper descarta working_hours e define is_open:true e rating:l.rating \|\| 4.8 em :1019-1036. O renderer converte isso diretamente em 'Aberto Agora' e estrela numérica em src/components/chat/structured-message-view.tsx:884-933.
**Causa-raiz:** Fallbacks de demonstração foram colocados no DTO de produção, sem cálculo por horário/ timezone e sem distinguir ausência de rating de rating observado.
**Correção recomendada:** Calcular abertura a partir de working_hours/timezone e retornar null/indisponível para rating ausente; rotular estimativas e não inventar defaults.
**Reprodução/validação:** Inserir/listar directory_listing ativo com working_hours indicando fechado e rating NULL; perguntar por locais no Copilot. O card mostra Aberto Agora e 4.8, embora a fonte não confirme nenhum dos dois.
**Testes de regressão:**
- Fixture fechado deve renderizar Fechado; rating NULL não deve renderizar 4.8.
- Fixture com horário e rating reais deve preservar valores da fonte.

#### CHAT-F14 — Telemetria sem store fica legível por qualquer usuário autenticado

**Severidade reportada:** `medium`.

**Arquivos/linhas:**
- supabase/migrations/20270101000000_copilot_activity_steps_telemetry.sql:28-45
- src/services/autonomous-copilot-orchestrator.ts:395-412
**Evidência:** A policy de copilot_activity_steps permite SELECT quando store_id IS NULL para qualquer authenticated em supabase/migrations/20270101000000_copilot_activity_steps_telemetry.sql:28-41. O orquestrador inicia execuções com storeId opcional em src/services/autonomous-copilot-orchestrator.ts:395-412; guest/execuções sem tenant passam null. Logo logs userless ficam globalmente visíveis, apesar do comentário 'own store'.
**Causa-raiz:** store_id NULL foi usado como condição de visibilidade universal, sem user_id/tenant/session owner na tabela de telemetria.
**Correção recomendada:** Persistir owner/user_id ou vincular task_id a execução/thread e usar esse vínculo na policy; remover store_id IS NULL como wildcard. Se logs forem públicos, separar tabela/escopo explicitamente.
**Reprodução/validação:** Criar uma execução sem store_id via guest/usuário civil e consultar copilot_activity_steps como outro usuário authenticated; a policy satisfaz store_id IS NULL e retorna o registro.
**Testes de regressão:**
- Usuário outsider não pode ler step de execução sem store_id de outro usuário.
- Admin autorizado e owner da execução devem continuar lendo seus próprios logs.

#### CHAT-F15 — Fixar/arquivar existe no contrato do shell, mas não é conectado no /copilot

**Severidade reportada:** `medium`.

**Arquivos/linhas:**
- src/components/chat/ai-chat-shell.tsx:80-92,306-327,1058-1088
- src/routes/_store.copilot.tsx:350-366
- src/services/ai-conversations.functions.ts:1946-1973
**Evidência:** AIChatShell recebe onTogglePinThread/onToggleArchiveThread em src/components/chat/ai-chat-shell.tsx:80-92 e repassa ao item (:306-327), mas _store.copilot.tsx:350-366 não passa nenhum dos dois. ThreadListItem só mostra ícone Pin sem interação e não renderiza controle de archive em :1058-1088; toggleAiThreadPinned existe no serviço (:1946-1973) mas não tem consumidor encontrado.
**Causa-raiz:** A UI foi generalizada para callbacks de ciclo de vida, mas a rota dedicada não os conecta nem implementa archive; o filtro Arquivadas fica sem mutação correspondente.
**Correção recomendada:** Conectar handlers autenticados de pin/archive, persistir is_pinned/status e atualizar estado local; ou remover os controles/filtros não suportados.
**Reprodução/validação:** No /copilot, passar o mouse na thread e procurar ação de fixar/arquivar: não há botão acionável; chamar toggleAiThreadPinned não ocorre pelo UI e a aba Arquivadas não pode ser populada nesse fluxo.
**Testes de regressão:**
- Clique de pin deve persistir e refletir após reload.
- Archive deve mover thread entre filtros e não permitir acesso indevido.

**Padrões transversais observados:**
- Dois caminhos de Copilot (drawer direto e /copilot server-function) têm contratos de ação, erro, persistência e loading diferentes; não existe um runtime canônico.
- O BFF usa service-role/bypass RLS e depende de checks manuais, mas esses checks não reproduzem o isolamento por papel/atribuição definido nas migrations.
- Mensagens, artifacts, memória, cobrança e telemetria são writes separados, sem saga transacional/idempotente uniforme.
- SSE tem framing/headers, mas não tem parser/consumidor/UI state machine; cancelamento e timeout não percorrem a cadeia.
- Há defaults sintéticos em DTOs de produção que chegam ao renderer com aparência de dados verificados.
- Os testes existentes cobrem helpers/FSM/framing e mocks, não rota HTTP SSE, browser, provider abort, Supabase/RLS real ou retry idempotente.
**Riscos não verificados da unidade:**
- Não foi possível executar os testes direcionados: pnpm tentou instalar dependências e terminou com ERR_PNPM_IGNORED_BUILDS antes do Vitest; os arquivos de teste foram lidos, mas não há resultado de execução nesta auditoria.
- Não houve ambiente Supabase/browser/provider disponível nesta sessão; os cenários de RLS, bundle cliente, resposta HTTP perdida, provider lento e constraints foram validados estaticamente e devem ser reproduzidos em integração.
- O efeito final do import direto do pipeline server-side no bundle depende da configuração do bundler/TanStack; o fato confirmado é a violação de boundary (export plain chamado pelo componente cliente), não uma afirmação de que a service-role key já vazou em produção.
- Não foi localizado consumidor de copilot_activity_steps no UI auditado; o vazamento de leitura é confirmado pela policy, mas impacto observável ao usuário depende de existência de endpoint/consulta adicional.
**Resumo da unidade:** O fluxo possui dois Copilots distintos e não equivalentes: o drawer global chama diretamente executeAiCopilotPipeline, enquanto /copilot usa server functions síncronas; nenhum deles consome /api/ai/stream. A cobertura estática confirmou falhas de autorização por objeto, idempotência/persistência, cancelamento/timeout, retry/erro, roteamento de ações e proveniência de dados. Os testes direcionados existentes foram lidos; a tentativa de executá-los não chegou a iniciar o Vitest porque pnpm tentou instalar dependências e falhou em scripts de build ignorados (ERR_PNPM_IGNORED_BUILDS).

### Unidade `tables` — module: 9 findings

**Confiança declarada pela auditoria:** Alta para os defeitos de select/DTO, status CHECK, service-role/tenant scope, erro colapsado e cap de 100; média-alta para o comportamento de zero-row delete, que depende da semântica padrão do cliente Supabase/PostgREST. Nenhum arquivo foi editado, staged, committed, pushed, merged ou deployed.

**Escopo:** Auditoria somente leitura do módulo de tabelas do catálogo administrativo: src/routes/workspace.catalogo.produtos.index.tsx, workspace.catalogo.categorias.index.tsx/$id, workspace.catalogo.colecoes.index.tsx/$id, workspace.catalogo.tipos.tsx; BFF src/services/admin-catalog.functions.ts; DTO src/types/catalog.ts; persistência/policies em supabase/migrations/0002_catalog.sql, 0013_collections.sql e 20260730234419_refactor_identity_and_tenancy.sql; credenciais em src/lib/supabase.ts. Foram lidos testes reais do catálogo, mas não há testes de rota/contrato que cubram estes fluxos de tabela.

**Ondas primárias:** W2, W3, W7.

#### TABLE-F01 — A listagem de tipos de produto vaza linhas de outros tenants

**Severidade reportada:** `P1`.

**Arquivos/linhas:**
- src/services/admin-catalog.functions.ts:20-43
- src/lib/supabase.ts:126-160
- supabase/migrations/0002_catalog.sql:18-50
- src/routes/workspace.catalogo.tipos.tsx:54-68
- src/routes/workspace.catalogo.tipos.tsx:364-416
**Evidência:** _listProductTypes() faz select de product_types sem .eq("store_id", store_id) em src/services/admin-catalog.functions.ts:20-30. listProductTypes exige requireAdmin, mas lê via getServerClient(); src/lib/supabase.ts:126-160 documenta que este cliente usa SUPABASE_SERVICE_ROLE_KEY e bypassa RLS. A tabela product_types é tenant-scoped por store_id em supabase/migrations/0002_catalog.sql:18-29. A rota renderiza o retorno diretamente em workspace.catalogo.tipos.tsx:54-68 e :364-416.
**Causa-raiz:** O contrato de leitura da tabela não recebe/resolve o store_id, embora o cliente servidor seja service-role; a proteção RLS que existe na tabela não é aplicada nessa consulta.
**Correção recomendada:** Após requireAdmin/getServerIdentity, obter store_id e aplicar .eq("store_id", store_id) no select; para platform_admin, definir explicitamente se deve haver escopo global e não depender do bypass implícito. Preferir cliente SSR/RLS ou adicionar uma asserção de tenant em toda função admin de leitura.
**Reprodução/validação:** Com dois stores contendo product_types distintos, autenticar como admin do store A e abrir /workspace/catalogo/tipos; observar no payload/DOM que aparecem tipos do store B. Validar também que a query montada não contém filtro store_id. O acesso é reproduzível sem depender de ID previsível porque a própria resposta lista os registros estrangeiros.
**Testes de regressão:**
- Mockar getServerIdentity como store-A e o builder Supabase com linhas de store-A/store-B; afirmar que listProductTypes só retorna store-A.
- Teste de integração com dois stores: GET /workspace/catalogo/tipos nunca deve incluir id, slug ou nome do segundo store.

#### TABLE-F02 — IDs de categoria/coleção permitem leitura e mutação cross-tenant no detalhe e nas ações da tabela

**Severidade reportada:** `P1`.

**Arquivos/linhas:**
- src/services/admin-catalog.functions.ts:619-657
- src/services/admin-catalog.functions.ts:784-827
- src/lib/supabase.ts:126-160
- src/routes/workspace.catalogo.categorias.$id.tsx:19-22
- src/routes/workspace.catalogo.colecoes.$id.tsx:19-27
- src/routes/workspace.catalogo.categorias.index.tsx:202-220
- src/routes/workspace.catalogo.colecoes.index.tsx:188-223
**Evidência:** _getCategoryById() e _updateCategory() filtram apenas por id em src/services/admin-catalog.functions.ts:619-657; _getCollectionById() e _updateCollection() também filtram apenas por id em :784-827. As funções usam getServerClient() service-role, que bypassa RLS (src/lib/supabase.ts:126-160), então as policies tenant-scoped de categories/collections não compensam a ausência do store_id. As rotas de detalhe recebem params.id diretamente (workspace.catalogo.categorias.$id.tsx:19-22; workspace.catalogo.colecoes.$id.tsx:19-27), e as tabelas enviam cat.id/col.id às ações (categorias.index.tsx:202-220 e :299-320; colecoes.index.tsx:188-223 e :319-351).
**Causa-raiz:** As operações de detalhe/edição confiam exclusivamente em requireAdmin e em RLS, mas o acesso ao banco é service-role; não há filtro explícito por identity.store_id nem assertStoreAccess antes de select/update.
**Correção recomendada:** Resolver identity uma vez no handler e adicionar .eq("store_id", identity.store_id) em get/update; rejeitar zero/múltiplas linhas com erro de autorização. Aplicar o mesmo escopo nos loaders de detalhe e, para ações de platform_admin, exigir uma API separada e explicitamente global.
**Reprodução/validação:** Com UUID de uma categoria/coleção de store-B, manter sessão admin ativa de store-A e navegar diretamente para /workspace/catalogo/categorias/<uuid> ou /workspace/catalogo/colecoes/<uuid>; o loader consulta e renderiza o registro B. Enviar a ação de status com o mesmo UUID e verificar que o update por id pode alterar B. Validar no mock que a cadeia contém somente .eq("id", id).
**Testes de regressão:**
- Com identidade store-A e row store-B, _getCategoryById/_getCollectionById devem retornar erro/not-found e não o row B.
- Com identidade store-A, updateCategory/updateCollection usando id de store-B deve produzir zero-row authorization error e não chamar update sem store_id.

#### TABLE-F03 — Arquivar categoria sempre falha contra o CHECK do schema

**Severidade reportada:** `P1`.

**Arquivos/linhas:**
- src/routes/workspace.catalogo.categorias.index.tsx:44-78
- src/routes/workspace.catalogo.categorias.index.tsx:202-220
- src/services/admin-catalog.functions.ts:640-689
- supabase/migrations/0002_catalog.sql:55-70
**Evidência:** As tabelas de categorias exibem aba Arquivo Morto, contam status === archived e chamam updateCategory(... status: "archived") em workspace.catalogo.categorias.index.tsx:44-60, :63-78, :202-220 e :299-320. O validator aceita archived em src/services/admin-catalog.functions.ts:660-672 e _updateCategory envia o valor sem conversão em :640-657. Entretanto categories.status só aceita active/inactive em supabase/migrations/0002_catalog.sql:55-70. O erro cai no catch da rota, portanto a ação não move a linha para a aba arquivada.
**Causa-raiz:** A UI/BFF inventaram um terceiro estado archived que não existe no CHECK persistente; ao contrário de collections, category não faz mapeamento para inactive nem possui coluna/archive semantics compatível.
**Correção recomendada:** Escolher um contrato único: adicionar archived ao CHECK/migração e atualizar todas as queries/labels, ou remover archived da UI e mapear arquivo para inactive com campo separado (archived_at/is_archived). Não aceitar archived no Zod enquanto a persistência não o suportar.
**Reprodução/validação:** Criar uma categoria active, clicar Arquivar no desktop ou mobile, observar request com status=archived e erro de constraint do banco/toast de erro; recarregar e constatar que ela permanece active/inactive e a aba Arquivo Morto continua vazia.
**Testes de regressão:**
- Teste de contrato que parseia o status enviado pela UI e confirma persistência de archived, ou confirma explicitamente o mapeamento escolhido.
- Teste de integração: clicar Arquivar deve alterar a linha exibida e fazê-la aparecer somente na aba correspondente após reload.

#### TABLE-F04 — Arquivar coleção reporta sucesso, mas nunca a envia para a aba Arquivo Morto

**Severidade reportada:** `P1`.

**Arquivos/linhas:**
- src/routes/workspace.catalogo.colecoes.index.tsx:29-64
- src/routes/workspace.catalogo.colecoes.index.tsx:207-222
- src/routes/workspace.catalogo.colecoes.index.tsx:336-351
- src/services/admin-catalog.functions.ts:805-860
- supabase/migrations/0013_collections.sql:7-21
**Evidência:** A tabela filtra active como status !== archived e archived como status === archived em workspace.catalogo.colecoes.index.tsx:29-46; a ação chama updateCollection(... status: "archived") em :48-64, :207-222 e :336-351. O serviço aceita archived, mas converte-o sempre para inactive em src/services/admin-catalog.functions.ts:805-827 (linhas :817-819). O schema collections só aceita active/inactive em supabase/migrations/0013_collections.sql:7-21. Assim a mutation retorna dado e a rota mostra toast de sucesso, mas o registro continua na aba Ativas (inactive) e nunca satisfaz o filtro archived.
**Causa-raiz:** A camada de serviço mascara um status não persistível como inactive sem informar a UI; a UI, por sua vez, depende de archived para segmentação.
**Correção recomendada:** Persistir archived de verdade com migração/check e usar esse valor no serviço, ou retirar a aba/ações archived e modelar inatividade com o mesmo contrato. Em ambos os casos, retornar à UI o estado efetivamente persistido e testar a transição.
**Reprodução/validação:** Criar coleção active, clicar Arquivar, observar toast de sucesso, recarregar: a coleção continua em Ativas como Inativa; abrir Arquivo Morto não a encontra. Inspecionar a resposta e confirmar status inactive.
**Testes de regressão:**
- Teste de mutation que verifica que status=archived não é silenciosamente convertido em inactive se a UI depende de archived.
- Teste E2E de arquivar/recarregar/abrir aba Arquivo Morto com assert de presença exclusiva no filtro archived.

#### TABLE-F05 — A tabela de produtos é truncada em 100 linhas e exporta apenas o subconjunto carregado

**Severidade reportada:** `P1`.

**Arquivos/linhas:**
- src/services/admin-catalog.functions.ts:190-225
- src/routes/workspace.catalogo.produtos.index.tsx:32-48
- src/routes/workspace.catalogo.produtos.index.tsx:239-265
- src/routes/workspace.catalogo.produtos.index.tsx:547-578
- src/routes/workspace.catalogo.produtos.index.tsx:696-804
- src/routes/workspace.catalogo.produtos.index.tsx:361-373
**Evidência:** _listAdminProducts aceita cursor mas nunca o usa e sempre faz .limit(Math.min(Math.max(options?.limit \|\| 100, 1), 200)) sem count/range/next cursor em src/services/admin-catalog.functions.ts:190-212. A rota chama listAdminProducts() sem opções em workspace.catalogo.produtos.index.tsx:32-48. Não há Pagination, currentPage, cursor UI, total ou sort control; a renderização é apenas filteredProducts.map (linhas :547-578, :696-804). A exportação serializa exatamente filteredProducts em :361-373. Portanto os registros além dos 100 mais recentes ficam invisíveis, não pesquisáveis e não exportáveis.
**Causa-raiz:** O contrato de listagem oferece parâmetros de paginação apenas nominalmente; o backend corta em 100, não retorna total/continuation e o frontend trata o primeiro lote como conjunto completo, aplicando filtros/exportação localmente.
**Correção recomendada:** Implementar paginação keyset/range real com cursor estável (created_at,id), total opcional/explicitamente rotulado, estados hasNext/hasPrevious e controles de página; mover filtros/sort para o BFF ou fazer fetch de todos os lotes antes de exportar. Exibir ao usuário o total e o escopo exportado.
**Reprodução/validação:** Inserir 101+ produtos no mesmo store, com um item antigo cujo slug seja conhecido; abrir a tabela e buscar esse slug: não aparece. Exportar JSON e contar IDs: no máximo 100 e o item antigo não está no arquivo. O serviço confirma limit=100 quando chamado sem options.
**Testes de regressão:**
- Teste do serviço com 201 rows simuladas: primeira resposta deve trazer pageSize e nextCursor, nunca declarar o conjunto completo.
- Teste de rota: procurar um registro além do primeiro lote e exportar deve encontrá-lo após paginação/fetch completo; assert que não há truncamento silencioso.

#### TABLE-F06 — A coluna Estoque da tabela de produtos mostra zero mesmo quando existem saldos

**Severidade reportada:** `P1`.

**Arquivos/linhas:**
- src/services/admin-catalog.functions.ts:196-212
- src/types/catalog.ts:278-291
- src/routes/workspace.catalogo.produtos.index.tsx:648-668
- src/routes/workspace.catalogo.produtos.index.tsx:791-797
- supabase/migrations/0002_catalog.sql:153-174
**Evidência:** O BFF retorna product_variants com stock_on_hand, mas não retorna nem calcula um campo product.stock em src/services/admin-catalog.functions.ts:196-208. O contrato AdminProductRow também não declara stock nem product_variants em src/types/catalog.ts:278-291. A tabela mobile e desktop passam initialStock={(product as any).stock ?? 0} em workspace.catalogo.produtos.index.tsx:648-668 e :791-797. Em runtime, o campo product.stock não existe no payload mostrado, então o fallback é sempre 0 e a tabela contradiz a persistência.
**Causa-raiz:** O contrato de coluna foi desenhado como product-level stock, enquanto a persistência guarda o saldo em product_variants.stock_on_hand; não há normalização de soma/variante default entre service e UI.
**Correção recomendada:** Definir semântica da coluna (soma de variantes, variante default ou ‘N variantes’) e materializar esse campo no BFF/DTO; remover any e tipar o payload. A ação de edição deve usar o variant id correto e atualizar a mesma entidade exibida.
**Reprodução/validação:** Criar produto com uma variante stock_on_hand=7, abrir a tabela e observar Estoque: 0 un em mobile e desktop; inspecionar o payload e confirmar product_variants[0].stock_on_hand=7 sem product.stock.
**Testes de regressão:**
- Fixture com product_variants stock_on_hand=7 deve renderizar 7 (ou a semântica documentada) em ambas as variantes de layout.
- Teste de contrato deve falhar se o DTO de listagem não contém o campo derivado que a coluna usa.

#### TABLE-F07 — Miniaturas de categorias e coleções são sempre omitidas pelo contrato de listagem

**Severidade reportada:** `P2`.

**Arquivos/linhas:**
- src/services/admin-catalog.functions.ts:527-541
- src/services/admin-catalog.functions.ts:695-709
- src/routes/workspace.catalogo.categorias.index.tsx:143-152
- src/routes/workspace.catalogo.categorias.index.tsx:256-265
- src/routes/workspace.catalogo.colecoes.index.tsx:123-134
- src/routes/workspace.catalogo.colecoes.index.tsx:252-264
- supabase/migrations/0002_catalog.sql:55-70
- supabase/migrations/0013_collections.sql:7-21
**Evidência:** _listCategories seleciona somente id,name,slug,status,sort_order,parent_id em src/services/admin-catalog.functions.ts:527-541, mas as duas versões da tabela leem cat.cover_url em workspace.catalogo.categorias.index.tsx:143-152 e :256-265. _listCollections seleciona somente id,name,slug,status,sort_order em :695-709, enquanto a UI le col.cover_url \|\| col.image_url em workspace.catalogo.colecoes.index.tsx:123-134 e :252-264. Ambas as tabelas persistem cover_url (0002_catalog.sql:55-70; 0013_collections.sql:7-21).
**Causa-raiz:** A camada de leitura não seleciona cover_url; o componente testa uma propriedade ausente e sempre cai no fallback de iniciais. image_url usado em collections nem existe no schema canônico citado.
**Correção recomendada:** Adicionar cover_url ao select e ao DTO tipado de ambas as listagens; remover image_url se não for coluna canônica ou definir uma migração/adapter explícita.
**Reprodução/validação:** Cadastrar categoria/coleção com cover_url válido, voltar à lista em mobile e desktop e observar iniciais em vez da imagem; inspecionar resposta de listCategories/listCollections e confirmar ausência de cover_url.
**Testes de regressão:**
- Fixture de listCategories/listCollections com cover_url deve renderizar img.src no mobile e desktop.
- Teste de contrato deve comparar propriedades usadas nas células com o select/DTO retornado.

#### TABLE-F08 — Falhas de leitura são apresentadas como tabela vazia, sem estado de erro/retry

**Severidade reportada:** `P2`.

**Arquivos/linhas:**
- src/routes/workspace.catalogo.categorias.index.tsx:23-35
- src/routes/workspace.catalogo.colecoes.index.tsx:15-21
- src/routes/workspace.catalogo.tipos.tsx:43-49
- src/routes/workspace.catalogo.produtos.index.tsx:34-47
- src/services/admin-catalog.functions.ts:214-225
- src/routes/workspace.catalogo.categorias.index.tsx:100-126
- src/routes/workspace.catalogo.colecoes.index.tsx:85-111
- src/routes/workspace.catalogo.tipos.tsx:364-366
**Evidência:** Os loaders de categorias, coleções e tipos capturam qualquer exceção e retornam [] em workspace.catalogo.categorias.index.tsx:23-35, workspace.catalogo.colecoes.index.tsx:15-21 e workspace.catalogo.tipos.tsx:43-49. Os componentes não recebem isLoading/error; ao receber [] exibem o mesmo empty state de banco vazio (categorias.index.tsx:100-126, colecoes.index.tsx:85-111, tipos.tsx:364-366). Produtos tem o mesmo padrão: listAdminProducts().catch(() => []) em produtos.index.tsx:34-47 e o BFF também retorna [] em admin-catalog.functions.ts:214-225.
**Causa-raiz:** Erro de rede, Supabase indisponível e ‘sem registros’ são colapsados no mesmo valor [] em loaders/BFF; não existe contrato discriminado de estado apesar de CatalogResult definir status error/empty em src/types/catalog.ts:245-267.
**Correção recomendada:** Preservar estado discriminado {status: error\|empty\|ok, message/data} ou deixar o erro chegar ao errorComponent; adicionar loading/pending e retry sem transformar falha em lista vazia. Não exibir CTA de primeiro cadastro quando a leitura falhou.
**Reprodução/validação:** Forçar listCategories/listCollections/listProductTypes/listAdminProducts a lançar erro ou bloquear a chamada Supabase; navegar às listas e observar ‘Nenhuma ... cadastrada’ com CTA de criação, sem mensagem de falha nem retry. Comparar com os catches que retornam [].
**Testes de regressão:**
- Mockar cada list function para rejeitar e afirmar que a rota renderiza ErrorState/retry, não EmptyState.
- Mockar resposta vazia válida e afirmar que somente nesse caso a tabela mostra empty state e CTA de criação.

#### TABLE-F09 — Excluir tipo de produto pode mostrar sucesso em uma linha estrangeira/no-op

**Severidade reportada:** `P2`.

**Arquivos/linhas:**
- src/services/admin-catalog.functions.ts:156-184
- src/routes/workspace.catalogo.tipos.tsx:146-153
- src/routes/workspace.catalogo.tipos.tsx:364-416
**Evidência:** A tabela de tipos pode exibir rows de outros stores por causa do finding de listagem. _deleteProductType filtra id e store_id, mas faz delete sem .select/.single e retorna true sempre que não há erro em src/services/admin-catalog.functions.ts:156-169; uma exclusão de zero rows não é diferenciada. A rota ignora o resultado, mostra toast de sucesso e invalida em workspace.catalogo.tipos.tsx:146-153.
**Causa-raiz:** O serviço não verifica affected-row count e a UI trata conclusão HTTP como exclusão efetiva; em combinação com a listagem sem tenant, a ação sobre row estrangeiro confirma sucesso embora nada tenha sido removido.
**Correção recomendada:** Usar delete(...).eq(id).eq(store_id).select("id").single() ou retornar count e tratar zero como not-found/forbidden; só emitir toast após confirmação de uma linha removida.
**Reprodução/validação:** Com sessão do store-A e id de tipo do store-B visível na tabela, confirmar exclusão; a query delete contém store_id=store-A, não encontra row, não lança e a UI mostra ‘Tipo de produto excluído!’, mas o row B permanece no banco/listagem global.
**Testes de regressão:**
- Teste de delete com zero rows deve retornar erro/not-found e nunca status success.
- Teste de UI deve manter a linha e mostrar erro quando a mutação não afetar nenhum registro.

**Padrões transversais observados:**
- As tabelas administrativas usam respostas raw/any e selects manuais sem DTO verificável; propriedades como cover_url e stock são lidas sem existir no payload selecionado.
- Serviços admin usam service_role e, por isso, cada query precisa aplicar tenant scope explicitamente; confiar em RLS é incorreto neste grafo.
- Estados vazios, erro e loading não são discriminados; vários loaders e BFFs convertem falhas em [] e ocultam a causa.
- A paginação é declarada apenas nominalmente em listAdminProducts (limit/cursor), sem cursor/total/controles, e filtros/exportação são locais ao primeiro lote.
- Contratos de status entre UI e CHECK do banco não estão centralizados: a UI assume archived enquanto categories/collections persistem somente active/inactive.
**Riscos não verificados da unidade:**
- Não executei chamadas contra um projeto Supabase real nem migrações; as reproduções acima são derivadas dos contratos estáticos e devem ser confirmadas em ambiente com dois stores e dados reais.
- Não foi auditado o universo completo de tabelas fora do módulo de catálogo indicado pelo task.md; rotas de clientes, pedidos, turismo e demais grids ficaram fora do escopo.
- Não foi executado build/typecheck conforme restrições do repositório; os testes existentes não cobrem os contratos de tabela encontrados.
- A semântica exata do RPC batch_upsert_variant_matrix_v5 e do cálculo desejado de estoque por produto requer validação de produto; o finding reporta somente a discrepância confirmada entre payload selecionado, DTO e coluna renderizada.
**Resumo da unidade:** Foram confirmados defeitos de contrato UI↔service↔persistência em colunas, status, tenant, estados de erro, estoque e paginação/exportação. O conjunto mais grave está no uso de getServerClient() com service_role (bypassa RLS) combinado com consultas sem store_id; o produto/tipo e os detalhes/ações de categorias e coleções não mantêm isolamento por serviço. Também há tabelas que apresentam subconjunto silenciosamente, sem total/paginação, e exportam apenas o subconjunto carregado.

### Unidade `design` — module: 8 findings

**Confiança declarada pela auditoria:** alta

**Escopo:** Auditoria somente leitura do módulo Design System/UI canônico: /home/ubuntu/waesy-audit/src/routes/workspace.design-system.tsx, src/components/design-system/*, src/components/ui/canonical/* e src/styles.css. A rota é filha de /workspace, cujo guard usa getUserSession em src/routes/workspace.tsx; a página auditada não chama service/API/schema/persistência, apenas estado local para a showcase.

**Ondas primárias:** W13.

#### DESIGN-F01 — CanonicalMediaFrame fica permanentemente em erro após falha, mesmo quando a mídia é corrigida

**Severidade reportada:** `alta`.

**Arquivos/linhas:**
- /home/ubuntu/waesy-audit/src/components/ui/canonical/media-family.tsx:39-45
- /home/ubuntu/waesy-audit/src/components/ui/canonical/media-family.tsx:59-68
- /home/ubuntu/waesy-audit/src/components/ui/canonical/media-family.tsx:118-124
**Evidência:** Em /home/ubuntu/waesy-audit/src/components/ui/canonical/media-family.tsx:39, hasError começa false; :44-71 retorna exclusivamente a tela de erro quando errorMessage \|\| hasError; :122 apenas faz setHasError(true) no onError; o onRetry de :59-68 só chama o callback e não limpa hasError. Não existe reset quando src/errorMessage muda.
**Causa-raiz:** Estado interno de erro é monotônico e não é invalidado por nova URL, remoção de errorMessage ou retry; a UI não consegue voltar ao caminho pronto.
**Correção recomendada:** Resetar hasError em useEffect quando src/errorMessage mudar e encapsular o retry para limpar o estado antes de chamar onRetry; opcionalmente acrescentar cache-buster quando a mesma URL for repetida.
**Reprodução/validação:** Monte CanonicalMediaFrame com src quebrado e onRetry que troca src para uma URL válida; após o erro, execute retry e re-renderize. O ramo :44 continua verdadeiro por hasError e a imagem válida nunca é montada. Validar também removendo errorMessage após uma falha.
**Testes de regressão:**
- Teste RTL: renderizar src inválido, disparar error, trocar src para válido e verificar que img volta ao DOM.
- Teste RTL: clicar Recarregar e garantir que o estado de erro desaparece antes do callback; cobrir também errorMessage removido.

#### DESIGN-F02 — CanonicalConfirmDialog perde nome e descrição acessíveis durante isLoading

**Severidade reportada:** `alta`.

**Arquivos/linhas:**
- /home/ubuntu/waesy-audit/src/components/ui/canonical/canonical-overlay.tsx:109-124
- /home/ubuntu/waesy-audit/src/components/ui/canonical/canonical-overlay.tsx:126-140
**Evidência:** Em /home/ubuntu/waesy-audit/src/components/ui/canonical/canonical-overlay.tsx:116-124, isLoading retorna somente Skeletons. DialogPrimitive.Title e DialogPrimitive.Description só são renderizados no ramo não-loading em :134-139. Assim, DialogPrimitive.Content existe sem título acessível durante o loading.
**Causa-raiz:** A árvore acessível do dialog depende de um cabeçalho que é removido junto com o conteúdo visual durante o estado de carregamento; o skeleton não substitui o nome obrigatório do diálogo.
**Correção recomendada:** Manter DialogPrimitive.Title e Description sempre montados (visualmente ocultos no skeleton, se necessário), marcar o conteúdo com aria-busy=true e manter a descrição contextual durante o loading.
**Reprodução/validação:** Abrir CanonicalConfirmDialog com isLoading=true e inspecionar a árvore de acessibilidade/console do Radix: não há Dialog.Title/Description no Content. Alternar isLoading de false para true reproduz a perda de nome.
**Testes de regressão:**
- Teste RTL com isLoading=true deve encontrar exatamente um título acessível no dialog e sua descrição.
- Teste de alternância false→true deve manter o accessible name e não emitir warning de Dialog.Content sem Title.

#### DESIGN-F03 — Breadcrumbs canônicos oferecem navegação morta e ignoram href

**Severidade reportada:** `alta`.

**Arquivos/linhas:**
- /home/ubuntu/waesy-audit/src/components/ui/canonical/navigation-shell.tsx:173-205
- /home/ubuntu/waesy-audit/src/components/design-system/navigation-family.tsx:71-79
**Evidência:** A interface BreadcrumbCrumb declara href em /home/ubuntu/waesy-audit/src/components/ui/canonical/navigation-shell.tsx:173-178, mas o ramo não-current em :197-204 sempre renderiza button usando somente crumb.onClick; href nunca é usado. O item inicial em :187-189 é um span com cursor-pointer, sem href, onClick, role ou foco. A showcase real passa três crumbs sem href/onClick em /home/ubuntu/waesy-audit/src/components/design-system/navigation-family.tsx:72-77.
**Causa-raiz:** O contrato público de breadcrumb não é conectado ao elemento de navegação; o item Home é apenas decorado e links declarativos são descartados.
**Correção recomendada:** Renderizar <a>/<Link> quando href existir, button somente quando onClick existir e texto não-current sem ação quando nenhum destino for fornecido; adicionar prop onHomeClick/href de Home e foco visível no item Home.
**Reprodução/validação:** Renderizar com {label:'Pedidos', href:'/pedidos'}: o DOM contém button sem href e clicar não muda a rota. Na showcase, clicar/usar teclado no ícone Home não executa ação; os demais crumbs também são buttons sem callback.
**Testes de regressão:**
- Teste RTL deve verificar que crumb.href produz link com href e que click dispara navegação.
- Teste de teclado/click no Home deve disparar o destino configurado; testar também crumb sem callback como não-interativo.

#### DESIGN-F04 — Shell canônico usa breakpoint md=768 apesar do contrato declarar 600/840, quebrando a faixa tablet

**Severidade reportada:** `média`.

**Arquivos/linhas:**
- /home/ubuntu/waesy-audit/src/components/ui/canonical/navigation-shell.tsx:50-51
- /home/ubuntu/waesy-audit/src/components/ui/canonical/navigation-shell.tsx:69-75
- /home/ubuntu/waesy-audit/src/components/ui/canonical/navigation-shell.tsx:109-134
- /home/ubuntu/waesy-audit/src/styles.css:607-614
**Evidência:** /home/ubuntu/waesy-audit/src/components/ui/canonical/navigation-shell.tsx:50-51 documenta BottomBar móvel <600px, mas :73 usa md:hidden; o mesmo arquivo documenta GlobalRail desktop >=840px em :109, mas :133 usa hidden md:flex. O CSS global trata mobile como max-width:767px em /home/ubuntu/waesy-audit/src/styles.css:607-614, confirmando que md começa em 768. Portanto em 768–839px o rail desktop aparece e a bottom bar some; em 600–767px a bottom bar ainda aparece contra o contrato.
**Causa-raiz:** Comentários e regras responsivas não compartilham os mesmos tokens/breakpoints; utilitários md padrão substituem os limites normativos declarados.
**Correção recomendada:** Centralizar os limites canônicos em breakpoints reais (por exemplo max-[599px] para BottomBar e min-[840px] para GlobalRail) ou alterar formalmente o contrato/documentação e todos os consumidores para 768px.
**Reprodução/validação:** Em viewport 767px, BottomBar continua visível; em 768px, BottomBar fica display:none e GlobalRail display:flex; em 839px o rail permanece desktop. Validar via computed style ou screenshot nos limites 599/600/767/768/839/840.
**Testes de regressão:**
- Teste visual/Playwright nos seis limites deve verificar exclusividade da navegação compacta/expandida.
- Teste CSS/DOM deve garantir que 768–839px não exiba rail desktop sem navegação mobile equivalente.

#### DESIGN-F05 — CanonicalHooberThumbZone não aplica safe area no rodapé apesar de declarar suporte

**Severidade reportada:** `média`.

**Arquivos/linhas:**
- /home/ubuntu/waesy-audit/src/components/ui/canonical/viewport-container.tsx:172-190
- /home/ubuntu/waesy-audit/src/styles.css:279-283
- /home/ubuntu/waesy-audit/src/styles.css:723-729
- /home/ubuntu/waesy-audit/src/styles.css:991-994
- /home/ubuntu/waesy-audit/src/components/design-system/viewports-family.tsx:83-94
**Evidência:** /home/ubuntu/waesy-audit/src/components/ui/canonical/viewport-container.tsx:177-185 aplica a classe literal safe-area-bottom. Em /home/ubuntu/waesy-audit/src/styles.css, existem as utilities bottom-safe e pb-safe em :724-729 e safe-bottom em :992-994, mas não existe utility/selector safe-area-bottom; a única ocorrência adicional é a variável CSS --safe-area-bottom em :281. A showcase usa a zona em /home/ubuntu/waesy-audit/src/components/design-system/viewports-family.tsx:83-94.
**Causa-raiz:** Nome da classe usado pelo componente não corresponde a nenhuma utility global; o env(safe-area-inset-bottom) nunca vira padding no thumb zone.
**Correção recomendada:** Trocar safe-area-bottom pela utility existente pb-safe ou definir uma utility única que use padding-bottom:max(1rem, env(safe-area-inset-bottom, 0px)); manter teste de contrato para impedir classe órfã.
**Reprodução/validação:** Em iPhone/simulador com home indicator, inspecionar computed padding-bottom de CanonicalHooberThumbZone: não há padding de safe area. Colocar ação no limite inferior reproduz risco de obstrução/alcance reduzido.
**Testes de regressão:**
- Teste de build/estático deve falhar se safe-area-bottom for usado sem definição global.
- Teste visual mobile com safe-area-inset-bottom simulado deve confirmar que o conteúdo e alvo de ação ficam acima do indicador do sistema.

#### DESIGN-F06 — CanonicalField não associa o erro ao controle de entrada

**Severidade reportada:** `média`.

**Arquivos/linhas:**
- /home/ubuntu/waesy-audit/src/components/ui/canonical/canonical-form.tsx:57-82
- /home/ubuntu/waesy-audit/src/components/ui/canonical/canonical-form.tsx:85-113
- /home/ubuntu/waesy-audit/src/components/design-system/forms-family.tsx:153-167
**Evidência:** Em /home/ubuntu/waesy-audit/src/components/ui/canonical/canonical-form.tsx:87-113, CanonicalField aceita htmlFor e renderiza CanonicalFieldError, mas não gera id para o erro, não aplica aria-describedby/aria-invalid ao children e não expõe um contrato de errorId. Na showcase, /home/ubuntu/waesy-audit/src/components/design-system/forms-family.tsx:155-166 marca aria-invalid manualmente no input, porém não o associa ao texto de erro.
**Causa-raiz:** A primitiva só associa label→controle; a relação controle→mensagem de erro depende de implementação manual que a API não suporta, deixando consumidores canônicos sem anúncio contextual do erro.
**Correção recomendada:** Gerar id estável para erro/hint, clonar ou exigir props de acessibilidade no controle filho, aplicar aria-invalid quando error existir e usar aria-describedby apontando para o texto correspondente; preservar IDs customizados.
**Reprodução/validação:** Montar o campo com erro e consultar o input: ele tem aria-invalid apenas quando o caller lembra de incluir, mas getAttribute('aria-describedby') é null e não aponta para CanonicalFieldError; validar com leitor de tela/foco no campo.
**Testes de regressão:**
- Teste RTL deve verificar label htmlFor, aria-invalid=true e aria-describedby apontando para o texto CanonicalFieldError.
- Teste sem erro deve remover aria-invalid e manter associação do hint quando houver.

#### DESIGN-F07 — CanonicalUploadDropzone não implementa o comportamento que sua cópia promete

**Severidade reportada:** `média`.

**Arquivos/linhas:**
- /home/ubuntu/waesy-audit/src/components/ui/canonical/media-family.tsx:191-210
- /home/ubuntu/waesy-audit/src/components/ui/canonical/media-family.tsx:249-288
**Evidência:** A primitiva declara título padrão 'Arraste ou selecione' e descrição '...até 10MB' em /home/ubuntu/waesy-audit/src/components/ui/canonical/media-family.tsx:202-210, mas o elemento interativo em :251-265 só tem onClick/onKeyDown; não há onDragOver/onDrop. O input em :266-275 só usa accept=image/* e chama onFileSelect para qualquer arquivo selecionado, sem validar tamanho de 10MB, MIME ou extensão.
**Causa-raiz:** A API apresenta restrições e um modo de interação não implementados; accept é apenas filtro de seletor e não validação de entrada, e o contêiner não é drop target.
**Correção recomendada:** Implementar dragenter/dragover/drop acessíveis e uma função única de validação de MIME/extensão/tamanho antes de onFileSelect; exibir errorMessage e limpar input para permitir selecionar novamente o mesmo arquivo.
**Reprodução/validação:** Arrastar arquivo sobre a dropzone não chama callback. Selecionar arquivo maior que 10MB (ou arquivo incompatível via picker/devtools) ainda chama onFileSelect sem erro. A única chamada encontrada está na showcase, então o impacto confirmado é no caminho canônico demonstrado; uso produtivo adicional não foi localizado.
**Testes de regressão:**
- Teste RTL de drop deve prevenir default e chamar onFileSelect para arquivo válido.
- Testes de arquivo >10MB e MIME inválido devem rejeitar, expor erro e não chamar callback.
- Teste de seleção do mesmo arquivo após erro/rejeição deve disparar novamente.

#### DESIGN-F08 — AdaptiveModal não limita nem rola conteúdo no desktop

**Severidade reportada:** `média`.

**Arquivos/linhas:**
- /home/ubuntu/waesy-audit/src/components/ui/canonical/adaptive-modal.tsx:40-51
- /home/ubuntu/waesy-audit/src/components/ui/canonical/adaptive-modal.tsx:70-79
**Evidência:** Em /home/ubuntu/waesy-audit/src/components/ui/canonical/adaptive-modal.tsx:43-50, o ramo mobile recebe max-h-full overflow-y-auto, mas o ramo desktop só recebe posição, largura, padding e max-width; não há max-height nem overflow-y-auto para DialogPrimitive.Content. O corpo em :70-71 também não tem rolagem.
**Causa-raiz:** A adaptação de modal considera overflow apenas no bottom sheet mobile; conteúdo de formulário longo no dialog desktop pode ultrapassar o viewport e ocultar ações/fechamento.
**Correção recomendada:** Aplicar max-h-[calc(100dvh-2rem)] e overflow-y-auto no desktop, ou separar header/body/footer com body scrollável e footer fixo; considerar safe-area no mobile.
**Reprodução/validação:** Abrir AdaptiveModal em viewport desktop com children maiores que a altura disponível (por exemplo 150vh). O Content cresce além do viewport e não possui área de scroll; footer/últimos campos ficam inacessíveis pelo teclado e pela visão.
**Testes de regressão:**
- Teste visual/Playwright com conteúdo > viewport deve manter título, corpo rolável, footer e botão Fechar acessíveis.
- Teste de teclado deve alcançar a última ação sem depender de scroll da página atrás do modal.

**Padrões transversais observados:**
- Os testes canônicos existentes validam apenas existência de exports, constantes de viewport e strings de modo; não validam comportamento DOM, semântica ARIA, navegação, limites responsivos, safe area ou recuperação de erro.
- Há divergência repetida entre contratos/cópia declarados e implementação efetiva (breakpoints 600/840 versus md=768, safe-area-bottom sem utility, href sem navegação, upload sem drop/validação).
- A rota da showcase usa estado local e dados demonstrativos; não há service/API/schema/persistência no módulo, portanto os estados exibidos não comprovam integração com dados reais.
**Riscos não verificados da unidade:**
- Não foi executado navegador real, leitor de tela ou teste de screenshot; as quebras acima são confirmadas por código/contrato e devem receber validação visual nos viewports indicados.
- A busca de callers encontrou uso produtivo confirmado principalmente na showcase para várias primitivas canônicas; o alcance em outras superfícies pode ser maior, mas não foi inferido sem caller real.
- O typecheck foi iniciado e o teste focado passou, mas a saída do typecheck não foi observada até o encerramento do comando; não há evidência de erro de compilação específica deste módulo.
**Resumo da unidade:** Foram confirmadas 8 quebras funcionais de UI/acessibilidade/responsividade no caminho canônico. O teste focado existente passa 8/8, mas só verifica exports e tipos de modo; não monta DOM, não exercita teclado, overlay, upload, erro, viewport ou recuperação. Typecheck foi iniciado sem evidência de erro do módulo; git status permaneceu limpo.

### Unidade `builders` — module: 8 findings

**Confiança declarada pela auditoria:** Alta para os defeitos de fluxo e código citados; baseada em leitura de fonte, migrações e testes reais do repositório. Limitação: sem execução contra banco/browser, portanto confirmação E2E dos efeitos depende dos testes de regressão recomendados.

**Escopo:** Auditoria forense somente leitura do repositório EduardoChapeco/waesy, cobrindo Omni Builder/OmniEditor, Builder route/service/renderer, Waesy Studio gráfico/vídeo, Studio Machine/Carousel editor, server functions, schemas, migrações RLS e testes reais. Não houve edição, stage, commit, push, merge, deploy nem execução contra banco/browser real.

**Ondas primárias:** W2, W4, W8, W9, W10, W13.

#### BUILD-F01 — Omni Editor descarta a versão/nós carregados e substitui template escolhido por template Gastronomia

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- src/routes/workspace.builder.$documentId.editor.tsx:54-66
- src/services/builder.functions.ts:582-629
- src/services/builder.functions.ts:682-693
- src/types/omni-builder.ts:246-267
**Evidência:** getExperienceDocument carrega a versão mais recente e seus nodes em src/services/builder.functions.ts:582-629, mas workspace.builder.$documentId.editor.tsx:54-66 só lê settings.omni_page; se ausente, cria documento vazio e chama applyTemplateToPage(..., "template_gastronomy"). initialData.version e initialData.nodes nunca são convertidos para OmniPageDocument. Portanto uma página criada com template_id/versioned nodes abre outra árvore no editor; editar/salvar consolida a árvore errada em settings.omni_page.
**Causa-raiz:** O carregamento clássico versionado e o carregamento Omni não têm adaptador de mão dupla no route. O route recebe document/version/nodes, mas usa apenas document.settings.omni_page ou um fallback hard-coded.
**Correção recomendada:** Definir uma única fonte de verdade. Ao abrir, converter nodes da versão selecionada para OmniPageDocument, ou materializar settings.omni_page no momento da criação; nunca aplicar template fixo quando há uma versão/nós existentes. Persistir a versão selecionada e reidratar o mesmo formato após save.
**Reprodução/validação:** Criar uma experience_document com document_type campaign e template_id diferente de Gastronomia; confirmar no banco que a versão draft possui nodes do template; abrir /workspace/builder/<id>/editor. O canvas mostra os blocos de template_gastronomy. Alterar um campo, salvar, recarregar e comparar settings.omni_page com os nodes originais para confirmar a substituição.
**Testes de regressão:**
- Teste de integração route/service: documento com template_id landing_page e sem settings.omni_page deve renderizar os nodes landing_page, não template_gastronomy.
- Teste de round-trip: carregar, editar, salvar e carregar novamente deve preservar ids, tipos, ordem e conteúdo dos blocos.

#### BUILD-F02 — Omni Publish pode reportar sucesso sem tornar a página pública; Save também não é separado de publicação

**Severidade reportada:** `critical`.

**Arquivos/linhas:**
- src/services/builder.functions.ts:682-689
- src/services/omni-builder.functions.ts:17-79
- src/services/omni-builder.functions.ts:154-227
- src/services/builder.functions.ts:2343-2414
- src/routes/_store.paginas.$slug.tsx:126-137
**Evidência:** createExperienceDocument cria somente experience_versions.status='draft' em src/services/builder.functions.ts:682-689. publishOmniPageDocument valida o documento e atualiza apenas experience_documents.settings.omni_page/is_active em src/services/omni-builder.functions.ts:179-213, retornando status ok/public_url em 215-219 sem inserir, copiar ou atualizar experience_versions. O público exige uma versão status='published' em src/services/builder.functions.ts:2343-2384; para slugs não-home sem essa versão retorna not_found. Em sentido inverso, depois de existir uma versão publicada, Save atualiza o mesmo settings.omni_page em omni-builder.functions.ts:34-71 e _store.paginas.$slug.tsx:126-130 prioriza esse JSON e o exibe antes da árvore publicada, tornando um rascunho público sem clicar Publish.
**Causa-raiz:** O fluxo Omni grava o JSON vivo na linha do documento, enquanto o renderizador público decide disponibilidade pelo status da tabela de versões. Não existe transação que crie/atualize versão publicada no Publish nem campo/linha separada para draft no Save.
**Correção recomendada:** Fazer Save criar/atualizar uma versão draft imutável ou um draft separado; fazer Publish validar e, em uma transação/RPC, gravar nós/settings na nova versão, arquivar a anterior e marcar exatamente uma published. O público deve ler somente a versão published, nunca settings de trabalho.
**Reprodução/validação:** Cenário A: criar uma página normal no CMS (o fluxo usa document_type campaign em workspace.cms.paginas.index.tsx:148-154), abrir o editor e clicar Publicar; a UI mostra sucesso, mas GET /paginas/<slug> não encontra versão publicada. Cenário B: usar home ou documento com uma versão published existente, alterar o título no editor e clicar apenas Salvar; consultar /paginas/<slug> e observar o título/JSON novo antes de Publish.
**Testes de regressão:**
- Teste E2E com documento draft-only: Publish deve criar uma experience_version published e a rota pública deve renderizar o documento.
- Teste de isolamento draft/publicado: após salvar uma alteração sem publicar, a rota pública permanece no conteúdo anterior; após Publish, muda para o novo conteúdo.
- Teste de falha transacional: erro ao inserir versão/nós não pode retornar status ok nem alterar is_active.

#### BUILD-F03 — O schema Omni aceita bloco desconhecido/configuração inválida e o public renderer o ignora silenciosamente

**Severidade reportada:** `medium`.

**Arquivos/linhas:**
- src/types/omni-builder.ts:234-267
- src/lib/builder/studio-template-audit.ts:198-221
- src/components/builder/OmniPageRenderer.tsx:50-69
- src/services/omni-builder.functions.ts:17-23
**Evidência:** OmniBlockInstanceSchema define type como z.string() e config como z.record(z.any()) em src/types/omni-builder.ts:234-242; o envelope OmniPageDocumentSchema não faz dispatch para schemas específicos em 246-267. A auditoria usada no Publish só verifica licenciamento, acessibilidade e orçamento em studio-template-audit.ts:198-221, sem conferir registry/type/config. OmniPageRenderer procura o bloco no registry e, se desconhecido, retorna null em 50-59. Assim um documento com type='does-not-exist' passa o validator/audit, pode ser salvo/publicado e aparece como página vazia/sem seção.
**Causa-raiz:** Validação estrutural permissiva no boundary do server e ausência de uma regra de integridade contra o catálogo canônico; o renderer trata dado inválido como conteúdo ausente.
**Correção recomendada:** Usar discriminatedUnion por block.type ou validar type contra getSiteBlockByIdStrict e aplicar o schema de dados de cada bloco; bloquear save/publish quando houver bloco desconhecido/config inválida e apresentar o caminho do erro ao editor.
**Reprodução/validação:** Enviar para saveOmniPageDocument/publishOmniPageDocument um documento válido no envelope, mas com blocks:[{id:'x',type:'does-not-exist',config:{}}]. O Zod aceita, auditOmniDocument não cria finding bloqueante e o renderer retorna null para esse bloco.
**Testes de regressão:**
- Teste server-side: bloco desconhecido deve falhar o validator/publish com erro de schema.
- Teste por bloco: config inválida para cada tipo registrado deve falhar antes da persistência.
- Teste público: nenhum documento publicado pode renderizar zero blocos por causa de tipo não registrado.

#### BUILD-F04 — Studio gráfico não reabre projetos: projectId é aceito, mas o estado sempre começa com defaults e Salvar pode sobrescrever o projeto

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- src/routes/workspace.estudio.index.tsx:19-145
- src/services/studio.functions.ts:97-117
- src/services/studio.functions.ts:122-172
**Evidência:** workspace.estudio.index.tsx:27-29 aceita search.projectId e :61 guarda o ID, mas :68-90 inicializa sempre o canvas com "SUPER OFERTA DA SEMANA"; não há useEffect/query para getStudioProjectById. A função é importada em :19, porém nunca usada. A lista userProjects é consultada em :117-120, mas não é renderizada nem usada para selecionar projeto. Ao salvar, :123-145 chama saveStudioProject com o projectId e o estado default/local. O update do service usa somente .eq('id', data.id) em studio.functions.ts:148-159.
**Causa-raiz:** A tela implementa somente um editor novo; o identificador de projeto não dispara hidratação e o resultado da listagem não possui UI de reabertura. Como o mesmo ID é enviado no save, abrir um projeto por URL e salvar pode substituir canvas_data persistido pelo canvas default.
**Correção recomendada:** Adicionar query getStudioProjectById habilitada por projectId, estado de loading/error e hidratação completa de title/project_type/aspect_ratio/canvas_data antes de permitir edição/save; renderizar userProjects como biblioteca com links de reabertura; resetar o estado ao trocar projectId e bloquear save enquanto carrega.
**Reprodução/validação:** Salvar um projeto gráfico com título/conteúdo distinto; abrir /workspace/estudio/?projectId=<UUID>. O título e os elementos não são carregados. Clicar Salvar e consultar studio_projects.canvas_data confirma que o snapshot default foi gravado no mesmo UUID.
**Testes de regressão:**
- Teste de route com projectId: mock de getStudioProjectById deve preencher título, background, elements/tracks e aspect ratio.
- Teste de reabertura: salvar, desmontar, abrir pelo UUID e salvar sem edição não pode alterar canvas_data.
- Teste de troca de projeto: dois UUIDs consecutivos não podem compartilhar estado local.

#### BUILD-F05 — Studio BFF permite leitura, alteração e exclusão por UUID sem verificar proprietário/loja

**Severidade reportada:** `critical`.

**Arquivos/linhas:**
- src/services/studio.functions.ts:54-194
- src/lib/supabase.ts:125-161
- supabase/migrations/20261011000000_security_hardening_rls_and_attack_telemetry.sql:88-96
- supabase/migrations/20261014000000_rls_security_hardening_confidential_tables.sql:19-29
**Evidência:** getStudioProjectById consulta studio_projects por id sem getServerIdentity, assertStoreAccess ou filtro de user/store em src/services/studio.functions.ts:97-117. saveStudioProject atualiza por id somente em :148-159; deleteStudioProject faz o mesmo em :177-194. Esses handlers usam getServerClient, explicitamente service_role que bypassa RLS, em src/lib/supabase.ts:140-154. A política RLS final depende de auth/store, mas não protege consultas feitas com esse client.
**Causa-raiz:** O BFF confia em RLS embora o client escolhido ignore RLS e não aplica autorização de objeto. O update também reatribui user_id/store_id do payload do chamador ao objeto identificado apenas pelo UUID.
**Correção recomendada:** Em todo get/update/delete, obter identity, resolver store permitido e filtrar por (user_id=identity.id OR store_id autorizado OR platform admin), verificando também role. Não aceitar store_id/user_id do cliente para reatribuição; usar valores derivados da sessão. Retornar not-found/forbidden sem revelar existência.
**Reprodução/validação:** Com dois projetos de usuários/lojas diferentes, chamar getStudioProjectById com o UUID do projeto B; o handler retorna a linha. Chamar saveStudioProject com esse id e dados do usuário A; o update atinge B. Chamar deleteStudioProject com o mesmo UUID; a linha é removida. Validar com teste de integração usando service-role client simulado e asserts de query.
**Testes de regressão:**
- Matriz de autorização por usuário, staff da loja e platform admin para get/update/delete de projeto próprio e alheio.
- Teste de update cross-tenant deve afetar zero linhas e retornar forbidden/not-found.
- Teste de delete cross-tenant deve preservar a linha do outro tenant.

#### BUILD-F06 — Publicação social do Studio retorna sucesso mesmo quando nenhum post/story foi persistido

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- src/services/studio.functions.ts:1510-1598
- src/components/studio/carousel-studio-editor.tsx:253-280
**Evidência:** publishStudioCarouselToSocial captura postErr/storyErr apenas com console.warn em src/services/studio.functions.ts:1538-1584 e sempre retorna success:true, IDs possivelmente null e mensagem de publicação em 1586-1597. Para destination='story' com mediaList vazio, a inserção nem é executada (:1561-1563), mas a função ainda informa Story publicado. CarouselStudioEditor exibe toast.success(res.message) em carousel-studio-editor.tsx:253-277.
**Causa-raiz:** Erros de persistência e pré-condições são tratados como avisos não-fatais, mas o contrato de resposta permanece success=true e a UI não inspeciona postId/storyId.
**Correção recomendada:** Validar mediaList antes da publicação; lançar erro ou retornar status failed/partial quando o destino solicitado não for persistido. Para both, usar transação/outbox ou resposta explícita por destino e fazer a UI exibir sucesso somente para IDs criados.
**Reprodução/validação:** Chamar publishStudioCarouselToSocial com destination='feed' sob falha de insert em posts: resposta success=true/postId=null e toast de publicado. Chamar destination='story' com slideImages=[] e coverImageUrl=null: nenhum insert em stories, storyId=null e mensagem de sucesso.
**Testes de regressão:**
- Falha no insert de posts deve rejeitar destination feed e não exibir sucesso.
- Story sem mídia deve falhar antes do insert.
- Destination both com uma falha deve retornar partial/failed e nunca mensagem de ambos publicados.

#### BUILD-F07 — Studio Machine pode confirmar geração sem persistir o projeto

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- src/services/studio.functions.ts:1167-1504
- src/routes/workspace.noticias.index.tsx:97-120
- src/routes/admin-master.mining.tsx:101-115
**Evidência:** generateCarouselFromMinedContent tenta inserir em studio_projects em src/services/studio.functions.ts:1477-1489, mas em erro apenas faz console.warn em 1492-1494; em seguida usa o UUID local como finalId e retorna project/projectId em 1496-1503. O consumidor exibe "Carrossel gerado no Studio Machine!" em workspace.noticias.index.tsx:101-115.
**Causa-raiz:** A persistência foi tratada como best-effort, porém o contrato não retorna persisted=false nem falha. O projeto local segue no modal e aparenta ter sido salvo, embora não exista linha no banco.
**Correção recomendada:** Tornar o insert obrigatório: lançar erro e não devolver projeto persistido quando falhar; se offline/draft local for intencional, retornar explicitamente persisted:false e impedir publicar/reabrir como se fosse salvo.
**Reprodução/validação:** Forçar erro de INSERT em studio_projects (credencial, constraint ou indisponibilidade); a função ainda devolve status normal/projectId local e o route mostra toast de sucesso. Fechar/reabrir o modal ou buscar pelo UUID confirma ausência da linha.
**Testes de regressão:**
- Erro de INSERT deve rejeitar generateCarouselFromMinedContent e impedir toast de geração persistida.
- Sucesso deve exigir linha retornada pelo banco e UUID persistido antes de abrir editor/publicar.
- Teste fechar/reabrir após geração deve recuperar exatamente o projeto salvo.

#### BUILD-F08 — Video Studio oferece Exportar, mas o handler não renderiza nem baixa vídeo e o preview é um placeholder

**Severidade reportada:** `medium`.

**Arquivos/linhas:**
- src/routes/workspace.estudio.index.tsx:213-229
- src/routes/workspace.estudio.index.tsx:396-435
- src/routes/workspace.estudio.index.tsx:531-548
- src/services/studio.functions.ts:122-172
**Evidência:** workspace.estudio.index.tsx:213-217 retorna imediatamente para studioMode='video' após apenas toast.info("A renderização ... está em processamento"), sem iniciar job, upload, polling ou download. A área de preview em :531-548 exibe somente ícone Film e texto "Vídeo Preview (4K Canvas)". Importar arquivo em :396-435 guarda apenas nome/duração em videoTracks; o File/blob não é armazenado nem passado ao renderer.
**Causa-raiz:** A UI apresenta ações de export/preview que não têm pipeline de mídia; o modelo persistido contém somente metadados de tracks/clips e não um artefato ou job de renderização.
**Correção recomendada:** Implementar upload/asset refs para os arquivos, preview com URLs reais e job de renderização com estado persisted/polling/download; ou remover/desabilitar Exportar até existir pipeline e informar claramente indisponibilidade, sem chamar isso de processamento iniciado.
**Reprodução/validação:** Selecionar Video Studio, importar um MP4, clicar Exportar e observar que não há request/download/arquivo; o canvas continua sendo o placeholder. Reabrir o projeto, se carregamento for corrigido, também não terá mídia binária para reprodução.
**Testes de regressão:**
- Teste de UI: export vídeo deve criar job/artefato e download somente após status concluído.
- Teste de erro: falha de upload/render deve exibir erro e não estado de processamento indefinido.
- Teste de reabertura: tracks e assets referenciados devem reproduzir o mesmo preview.

**Padrões transversais observados:**
- Duas fontes de verdade para o Builder (settings JSONB e experience_versions/experience_nodes) não são sincronizadas nem cobertas por round-trip público.
- Handlers server-side usam service_role; toda autorização por objeto/tenant precisa ser explícita, mas o Studio omite filtros em operações por UUID.
- Erros de persistência são convertidos em warnings/retornos success em Studio Machine e publicação social, criando estados que parecem concluídos sem linha/artefato.
- Os testes existentes concentram-se em funções puras, catálogo/template e auditoria estática; não há testes reais de API + banco + rota pública para carregar, salvar, publicar e reabrir.
**Riscos não verificados da unidade:**
- Não foi executado banco Supabase, browser ou E2E; os impactos públicos foram traçados estaticamente a partir dos handlers/rotas e devem ser confirmados em ambiente de integração.
- Não foi encontrado caminho de autosave/debounce no OmniEditor nem no Studio gráfico; ambos dependem de clique explícito em Salvar, portanto crash/fechamento antes do clique perde estado local. Tratar como defeito se o contrato do produto promete autosave.
- studio_projects possui somente o snapshot atual (sem tabela/campo de versões/rollback) e OmniEditor não expõe histórico; a perda de histórico é confirmada no schema, mas a exigência de versionamento do Studio não está declarada no código.
- A auditoria de publicação mede licença/acessibilidade/orçamento, mas não mede navegador/Core Web Vitals nem valida todos os schemas de bloco; limitações já declaradas em src/lib/builder/studio-template-audit.ts:177-180.
**Resumo da unidade:** Foram confirmados defeitos no ciclo carregar/editar/salvar/publicar/reabrir/exportar. O Omni Builder mantém duas fontes incompatíveis (settings.omni_page versus experience_versions/experience_nodes): o editor ignora a versão carregada, Publish pode exibir sucesso sem criar versão publicada, e Save pode expor rascunho. O Studio gráfico salva, mas não hidrata projectId nem oferece reabertura pela lista; o BFF usa service_role sem escopo de proprietário em operações por ID. O Studio social e o gerador de carrossel convertem falhas de persistência/publicação em respostas de sucesso. O export de vídeo é somente um toast/placeholder. Os testes existentes cobrem helpers puros, catálogo e auditoria estática, não os round-trips server/publicos que falham aqui.

### Unidade `imagegen` — module: 6 findings

**Confiança declarada pela auditoria:** alta para os seis achados: todos têm cadeia causal observável em código/migrations e callsites reais; limites estão explicitados em unverified_risks.

**Escopo:** Auditoria forense somente leitura dentro de /home/ubuntu/waesy-audit (repositório EduardoChapeco/waesy): rotas workspace.marketing.stories, workspace.marketing.studio, workspace.estudio e workspace.noticias; src/services/studio.functions.ts, api-orchestrator.functions.ts, ai-core-gateway.functions.ts, storage.functions.ts; componentes de Studio; migrations de Studio/AI/Storage; e testes reais encontrados. Nenhum arquivo foi editado, staged, commitado ou enviado.

**Ondas primárias:** W2, W4, W6, W9.

#### IMAGE-F01 — CRUD de studio_projects usa service_role sem ownership e permite leitura, alteração e exclusão cross-tenant

**Severidade reportada:** `critical`.

**Arquivos/linhas:**
- src/services/studio.functions.ts:54-194
- src/lib/supabase.ts:140-154
- supabase/migrations/20260827270000_studio_projects_and_templates.sql:6-36
- supabase/migrations/20261011000000_security_hardening_rls_and_attack_telemetry.sql:88-96
**Evidência:** getStudioProjectById cria getServerClient() e busca somente por id (src/services/studio.functions.ts:97-116), sem sequer exigir identidade. saveStudioProject atualiza por .eq("id", data.id), mas não restringe user_id/store_id (src/services/studio.functions.ts:148-159); deleteStudioProject faz .delete().eq("id", data.id) sem ownership (src/services/studio.functions.ts:177-194); listStudioProjects aceita store_id fornecido pelo cliente e o usa diretamente no filtro (src/services/studio.functions.ts:54-91). getServerClient usa SUPABASE_SERVICE_ROLE_KEY e bypassa RLS (src/lib/supabase.ts:140-154), portanto a política posterior studio_projects_manage_own não compensa a ausência de checagem no BFF (supabase/migrations/20261011000000_security_hardening_rls_and_attack_telemetry.sql:88-96).
**Causa-raiz:** As server functions tratam service_role como se RLS fosse aplicado ao usuário, mas o cliente server-side ignora RLS. Os handlers não fazem assertStoreAccess/checagem de dono em get, update e delete; no update ainda substituem o dono pelo identity atual após localizar apenas pelo UUID.
**Correção recomendada:** Exigir identidade autenticada em todas as funções; remover filtros de store_id arbitrários ou aceitar store_id somente após validar que é a loja ativa e que o caller é staff/admin; em cada get/update/delete aplicar predicados de user_id/store_id e verificar o resultado afetado. Alternativamente usar cliente anon com sessão/RLS para operações de usuário, mantendo service_role apenas para operações administrativas explicitamente autorizadas.
**Reprodução/validação:** Com dois usuários/lojas e um UUID de projeto da loja A, chamar diretamente a server function/endpoint getStudioProjectById({id}) sem identidade deve retornar o projeto; como usuário B, chamar saveStudioProject({id:<uuid-A>, canvas_data:<payload>}) ou deleteStudioProject({id:<uuid-A>}) passa pela consulta por id, pois não há predicado de ownership. Também validar listStudioProjects({store_id:<uuid-A>}) como usuário B. O comportamento é determinístico no código e independe das policies porque getServerClient é service_role.
**Testes de regressão:**
- getStudioProjectById sem sessão deve falhar e não retornar canvas_data.
- Usuário B não consegue ler, atualizar, excluir ou listar projeto da loja A mesmo conhecendo o UUID/store_id.
- Dono/staff autorizado consegue CRUD apenas no próprio escopo e save com id inexistente não converte silenciosamente em sucesso.

#### IMAGE-F02 — generateCarouselFromMinedContent confia em storeId arbitrário e tem fallback explícito para chamada sem identidade

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- src/services/studio.functions.ts:1172-1204
- src/services/studio.functions.ts:1477-1503
- src/lib/supabase.ts:140-154
**Evidência:** O handler captura qualquer falha de getServerIdentity e cria uma identidade sintética com UUID zero (src/services/studio.functions.ts:1184-1186). Em seguida define targetStoreId = data.storeId \|\| identity.store_id, sem assertStoreAccess ou validação de que data.storeId pertence ao caller (src/services/studio.functions.ts:1188-1189), e lê brand_kits/stores desse tenant (src/services/studio.functions.ts:1193-1204). A persistência usa getServerClient/service_role e grava o targetStoreId e user_id nulo para a identidade sintética (src/services/studio.functions.ts:1477-1488; src/lib/supabase.ts:140-154).
**Causa-raiz:** O endpoint mistura caminho de usuário e caminho de admin, aceita storeId vindo do payload e transforma ausência/falha de autenticação em uma identidade válida de fallback. Como as queries usam service_role, nem RLS nem a política de studio_projects impede leitura de metadados da loja indicada ou inserção de projeto atribuído a outra loja.
**Correção recomendada:** Não capturar falha de autenticação como identidade sintética; exigir sessão. Ignorar data.storeId para usuários comuns e usar exclusivamente identity.store_id. Para platform_admin, validar explicitamente a permissão de impersonação/tenant. Antes de ler Brand Kit ou inserir projeto, chamar assertStoreAccess e persistir sempre um user_id autenticado.
**Reprodução/validação:** Como usuário de uma loja A, chamar generateCarouselFromMinedContent com storeId igual ao UUID da loja B e um title/summary válidos; o handler consulta o Brand Kit e stores de B e tenta inserir um projeto com store_id de B e user_id de A. Repetir sem sessão: o catch cria o UUID zero e o retorno ainda pode ser produzido; confirmar em DB que user_id é nulo quando o insert é aceito. Validar no código que não existe assertStoreAccess nesse handler.
**Testes de regressão:**
- Caller autenticado não pode gerar projeto para storeId de outra loja.
- Chamada sem sessão retorna erro de autenticação e não lê Brand Kit nem grava studio_projects.
- Platform admin autorizado pode informar outro tenant somente por caminho explícito e auditável.

#### IMAGE-F03 — Os geradores de imagem/asset do Studio não usam o provedor de imagem, quota, task status, storage ou artifact persistente declarados

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- src/services/studio.functions.ts:1048-1155
- src/services/studio.functions.ts:1172-1504
- src/routes/workspace.marketing.stories.tsx:54-114
- src/routes/workspace.marketing.studio.tsx:198-224
- src/services/ai-core-gateway.functions.ts:166-216
- src/services/ai-core-gateway.functions.ts:238-405
- supabase/migrations/20261206000000_v142_ai_core_gateway_pools_and_telemetry.sql:89-124
**Evidência:** A migration declara a tarefa imagem com OpenAI/DALL-E e fallback Recraft e cria ai_async_jobs com status queued/processing/completed/failed (supabase/migrations/20261206000000_v142_ai_core_gateway_pools_and_telemetry.sql:89-124). Porém o AI Core implementa esses candidatos como chat/completions: CANONICAL_TASK_ROUTES apenas declara imagem (src/services/ai-core-gateway.functions.ts:166-216) e callProviderLowLevel usa /v1/chat/completions para openai/openrouter (src/services/ai-core-gateway.functions.ts:238-405), sem endpoint de imagens. generateSocialStoryCard apenas concatena um SVG e retorna svgMarkup (src/services/studio.functions.ts:1048-1155); a UI chama o endpoint e mantém o resultado somente em state, copiando/baixando Blob SVG (src/routes/workspace.marketing.stories.tsx:54-114). generateCarouselFromMinedContent monta JSON e grava opcionalmente studio_projects.canvas_data, usando coverUrl externo, sem ai_async_jobs, quota ou asset storage (src/services/studio.functions.ts:1172-1504). A rota workspace.marketing.studio também só compõe estado local e chama exportElementAsImage/exportElementAsPdf (src/routes/workspace.marketing.studio.tsx:198-224; 587-624).
**Causa-raiz:** Há contratos de routing/fila que não estão conectados ao caminho de geração visual. Os endpoints do Studio são síncronos e determinísticos, retornam markup/JSON ou download local e não criam um registro de asset/artifact, não reservam/debitam quota e não registram status/provider. O DALL-E declarado sequer é despachado pelo low-level provider, que envia chat completions.
**Correção recomendada:** Definir um único contrato de geração visual: validar sessão/tenant, reservar quota de imagem, criar ai_async_jobs, despachar para endpoint de imagem real, atualizar status/progresso/erro, materializar o resultado em bucket privado/público conforme política, criar registro de asset/artifact com provider/model/provenance e associá-lo ao projeto. A UI deve consultar/polling do job, mostrar failed/cancelled e usar signed/public preview/download do asset persistido. Se SVG determinístico for mantido, tratá-lo como um asset de primeira classe com o mesmo lifecycle e sem chamá-lo de provider-generated AI.
**Reprodução/validação:** Abrir /workspace/marketing/stories, gerar um card e observar que o retorno contém somente svgMarkup/shareUrl; verificar que não surge linha em ai_async_jobs, ai_telemetry_logs, storage.objects ou tabela de asset/artifact, e que recarregar a página perde o card. Gerar carrossel a partir de uma notícia e repetir a inspeção: há no máximo studio_projects, com URLs de capa em canvas_data/thumbnail_url. Como validação adicional, chamar AI Core task imagem: o candidato OpenAI/dall-e-3 é enviado ao ramo chat/completions, não a /v1/images/generations.
**Testes de regressão:**
- Geração de imagem cria job queued e percorre processing/completed ou failed, sem sucesso antes do resultado.
- Quota é reservada/debitada uma única vez por request e uma falha de provider não deixa débito fantasma.
- Resultado cria asset/artifact persistido com provider/model/provenance, preview e download, e sobrevive a reload.
- AI Core task imagem usa endpoint de imagens compatível com o provider ou rejeita explicitamente modelo DALL-E no gateway de chat.

#### IMAGE-F04 — Falha de persistência do carrossel é engolida e o endpoint retorna um projectId fictício como sucesso

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- src/services/studio.functions.ts:1477-1503
- src/components/studio/carousel-studio-editor.tsx:126-143
- src/services/studio.functions.ts:148-159
**Evidência:** Após insert em studio_projects, o handler apenas registra warning se houver erro (src/services/studio.functions.ts:1477-1494), usa carouselProject.id aleatório quando savedProject é nulo e sempre retorna projectId/project (src/services/studio.functions.ts:1496-1503). O editor mostra o projeto recebido e somente tenta persistir depois, chamando saveStudioProject com id já preenchido (src/components/studio/carousel-studio-editor.tsx:126-143); esse caminho faz update por id e falha caso o insert original não tenha ocorrido (src/services/studio.functions.ts:148-159).
**Causa-raiz:** O insert é tratado como best-effort, mas o contrato de retorno promete um ID persistido. O fallback para UUID de memória não é marcado como transient e o editor não distingue projeto salvo de projeto somente em memória.
**Correção recomendada:** Falhar a geração se a persistência obrigatória falhar, ou retornar explicitamente persisted:false/transientId e manter o editor em modo não salvo. Preferível usar insert transacional e retornar somente o id do registro efetivamente criado; o salvamento posterior deve fazer upsert somente quando o registro existe e dentro do escopo autorizado.
**Reprodução/validação:** Forçar erro do insert (indisponibilidade do DB, constraint/policy inválida ou mock que retorna error) ao chamar generateCarouselFromMinedContent. O endpoint retorna success/projectId mesmo sem linha em studio_projects; abrir o editor e clicar Salvar dispara update .eq(id,<UUID não persistido>) e recebe erro. Recarregar/listar projetos confirma que a arte desapareceu.
**Testes de regressão:**
- Erro do insert faz a server function rejeitar e a UI exibir falha, sem toast de sucesso.
- Um projectId retornado sempre corresponde a uma linha em studio_projects.
- Editor consegue reabrir após reload o carrossel recém-gerado e não tenta update de UUID transitório.

#### IMAGE-F05 — Publicação ignora projectId/ownership, não cria associação de artefato e anuncia sucesso em falhas ou sem mídia

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- src/services/studio.functions.ts:1510-1597
- src/components/studio/carousel-studio-editor.tsx:253-277
**Evidência:** publishStudioCarouselToSocial valida projectId mas nunca o consulta; o handler usa diretamente title, coverImageUrl e slideImages do payload para montar mediaList (src/services/studio.functions.ts:1510-1537). Insere somente media_urls/media_url em posts/stories, sem project_id, artifact_id ou asset reference (src/services/studio.functions.ts:1538-1577). Erros de insert são apenas warnings (src/services/studio.functions.ts:1554-1557 e 1579-1583) e a função retorna success:true sempre (src/services/studio.functions.ts:1586-1597). Para destination=story com mediaList vazia, o insert nem é tentado, mas a resposta ainda diz Story publicado. O editor passa o projectId, as URLs e publica sem validação adicional (src/components/studio/carousel-studio-editor.tsx:253-277).
**Causa-raiz:** O endpoint trata projectId como metadado não vinculante e aceita o conjunto final de URLs do cliente; não carrega/verifica o projeto nem persiste a relação com o artefato. O contrato de erro não é transacional: falhas de feed/story e ausência de mídia são convertidas em sucesso.
**Correção recomendada:** Carregar o projeto por projectId com escopo de tenant, derivar as mídias do canvas/asset refs persistidos ou validar explicitamente os assets enviados, e gravar project_id/asset association em uma tabela/coluna de publicação. Rejeitar destination story/both sem mídia. Propagar erros de insert; para destino both, retornar estado parcial explícito e não mensagem de sucesso total quando apenas um lado foi criado.
**Reprodução/validação:** Chamar publishStudioCarouselToSocial com projectId inexistente/de outra loja e URLs próprias válidas: o handler tenta publicar sem consultar o projeto ou ownership. Chamar com destination=story, slideImages=[], coverImageUrl=null: retorna success:true/storyId:null e mensagem de Story publicado, embora nenhum story exista. Também simular erro de insert em posts/stories e confirmar a mesma resposta de sucesso.
**Testes de regressão:**
- projectId inexistente ou fora do tenant rejeita publicação e não cria posts/stories.
- Publicação story sem mídia rejeita com erro e não retorna success:true.
- Falha no insert de feed/story é propagada; destino both testa sucesso total, parcial e rollback/compensação.
- Publicação aprovada grava a associação entre projeto, asset e post/story.

#### IMAGE-F06 — SVG gerado interpola entrada do usuário sem escaping XML/URL, produzindo markup inválido e potencial execução ao abrir o asset

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- src/services/studio.functions.ts:1048-1155
- src/routes/workspace.marketing.stories.tsx:72-113
**Evidência:** generateSocialStoryCard incorpora diretamente storeName, title e subtitle em nós <text> e imageUrl em atributo href (src/services/studio.functions.ts:1078-1104 e 1093-1128) sem escapar &, <, >, aspas ou validar esquema de URL além de z.string().url(). A UI recebe dados livres do usuário (src/routes/workspace.marketing.stories.tsx:72-86) e baixa o retorno como Blob image/svg+xml (src/routes/workspace.marketing.stories.tsx:102-113).
**Causa-raiz:** O SVG é montado por interpolação de string e o payload é tratado como texto confiável. Não existe escape XML para texto/atributos nem allowlist explícita de URL https/data segura; o mesmo markup pode ser inválido ou interpretado como conteúdo ativo quando aberto/renderizado como SVG.
**Correção recomendada:** Escapar XML em todo texto e atributo (ou gerar SVG via DOM/serializer), validar imageUrl por allowlist de https e/ou copiar a imagem para storage controlado antes de inserir, e remover scripts/event handlers do SVG. Para preview, usar img/blob seguro em vez de innerHTML e aplicar Content-Disposition apropriado no download.
**Reprodução/validação:** Na tela de Stories, informar title="R&D <Oferta>" e gerar/baixar; o retorno contém literalmente R&D/<Oferta> no XML, podendo quebrar o parser/preview. Para validar o impacto de segurança, usar title="</text><script>alert(1)</script><text>" ou imageUrl com esquema não permitido e abrir o SVG baixado em um visualizador/browser; confirmar que o markup não foi neutralizado. O teste unitário pode inspecionar que nenhum <script> ou tag injetada aparece no svgMarkup e que & vira &amp;.
**Testes de regressão:**
- Título/subtítulo/storeName com &, <, > e aspas gera SVG XML bem formado e preserva texto visível.
- Payload com tags script/event handlers ou URL javascript/data não permitida não executa e é rejeitado/escapado.
- Imagem externa permitida continua renderizando no preview e download sem alterar o XML.

**Padrões transversais observados:**
- Server functions de Studio usam getServerClient/service_role e dependem de checagens manuais; qualquer handler sem assertStoreAccess ignora a separação multi-tenant apesar de RLS posterior.
- Os caminhos de imagem usam URLs remotas e media_urls/media_url diretamente, sem asset_id, provenance, licença, bucket controlado ou associação durável ao projeto/artefato.
- Erros de persistência/publicação são frequentemente tratados como warning e transformados em retorno success, deixando preview/local download aparentemente correto mas sem estado recuperável.
- Há implementações paralelas (Marketing Studio local, Estúdio gráfico e Stories SVG/ESCAMAS) sem contrato único para provider, quota, task status, storage, preview e download.
**Riscos não verificados da unidade:**
- Não foi possível confirmar a implementação/deploy da Edge Function sw-brand-generate, portanto quota/provider/storage do fluxo Brand Kit gerado por IA permanecem não verificáveis dentro deste repositório.
- Não há worker de imagem evidente consumindo ai_async_jobs neste repositório; não foi possível provar se existe consumidor externo no ambiente implantado.
- Não foi executado um request contra Supabase/Cloudflare real nem verificada a ordem efetiva das migrations no projeto remoto; as conclusões de autorização decorrem do código server-side service_role e das migrations versionadas.
- CORS e disponibilidade de cada URL externa de capa não foram testados em navegador; ainda assim o código confirma que essas URLs são tratadas como assets duráveis sem cópia/validação.
**Resumo da unidade:** Foram rastreados três caminhos distintos: (1) Stories, que chama generateSocialStoryCard e baixa um SVG gerado no BFF; (2) Studio/ESCAMAS, que monta JSON de carrossel, persiste opcionalmente em studio_projects, edita/exporta no navegador e publica URLs em posts/stories; e (3) Estúdio gráfico, que salva canvas_data e exporta PNG localmente. O provedor OpenAI/DALL-E e a fila ai_async_jobs aparecem em migrations/AI Core, mas não são usados pelo caminho de imagens do Studio. O fluxo efetivo não tem um asset/artifact de imagem persistente, não mantém status de task de geração e não aplica quota/telemetria do gateway nos geradores SVG/carrossel. Foram confirmados problemas de autorização, sucesso falso, associação de artefato e escaping XML.

### Unidade `routes` — module: 2 findings

**Confiança declarada pela auditoria:** high para os dois findings condicionais descritos: o drift de registry/menu é reproduzido pelos scripts e fontes reais; o 500 do worker decorre diretamente de Buffer.from(undefined) fora do try. Média para impacto de produto da primeira, pois a acessibilidade depende do papel/módulos exibidos.

**Escopo:** Auditoria somente leitura de src/routes, src/routeTree.gen.ts, src/router.tsx, src/server.ts, src/lib/{routes,workspace-navigation,tenant.server,auth-guards.server,server-access,return-path,http-cookies}, componentes de navegação/workspace, handlers API de auth/worker/webhook e serviços diretamente chamados. Foram executados os testes reais src/routes/__tests__/store-route-loaders.test.ts (3/3 aprovados), auditorias existentes de paridade/unmapped routes e checagens estáticas independentes. Não houve edição deliberada de código, stage, commit, push, merge ou deploy; artefatos temporários gerados pela auditoria foram restaurados e git status ficou limpo.

**Ondas primárias:** W10.

#### ROUTE-F01 — Rotas workspace reais ficam invisíveis na navegação canônica por ausência no registry

**Severidade reportada:** `medium`.

**Arquivos/linhas:**
- src/routes/workspace.design-system.tsx
- src/routes/workspace.financeiro.index.tsx
- src/routes/workspace.turismo.comissoes.tsx
- src/routes/workspace.turismo.documentos-ocr.tsx
- src/routes/workspace.whatsapp.automacoes.tsx
- src/lib/routes.ts
- src/lib/workspace-navigation.ts
- scripts/audit-route-parity.mjs
- scripts/check-unmapped-routes.mjs
**Evidência:** A auditoria existente scripts/audit-route-parity.mjs reporta 5 arquivos físicos workspace sem registro em src/lib/routes.ts: src/routes/workspace.design-system.tsx -> /workspace/design-system; src/routes/workspace.financeiro.index.tsx -> /workspace/financeiro; src/routes/workspace.turismo.comissoes.tsx -> /workspace/turismo/comissoes; src/routes/workspace.turismo.documentos-ocr.tsx -> /workspace/turismo/documentos-ocr; src/routes/workspace.whatsapp.automacoes.tsx -> /workspace/whatsapp/automacoes. A busca por esses caminhos em src/lib/routes.ts não encontra entradas, enquanto src/lib/workspace-navigation.ts e a shell resolvem grupos/itens a partir de listas canônicas e scripts/check-unmapped-routes.mjs reporta 4 deles como UNMAPPED in Navigation/Tools/Sidebar. As rotas existem e estão na árvore gerada; portanto não é 404, é perda de descoberta e acesso pelos menus oficiais. O index financeiro é um shim que redireciona para /workspace/financeiro/caixa (src/routes/workspace.financeiro.index.tsx:3-7), mas também quebra a promessa de fonte única e pode ficar sem label/permission metadata.
**Causa-raiz:** A execução física das rotas e o catálogo usado por sidebar/tools/metadata são fontes distintas; novas rotas foram adicionadas em src/routes sem ingestão no registry. A própria documentação de src/config/route-registry.ts diz que o catálogo é a fonte canônica, mas não existe gate que falhe quando uma rota workspace de produto fica sem registro.
**Correção recomendada:** Adicionar as quatro feature routes ao registry e aos grupos/permissões de src/lib/workspace-navigation.ts (ou gerar esses menus diretamente da árvore/registry), incluindo o shim financeiro apenas se /workspace/financeiro for uma URL pública desejada. Remover/ajustar a fonte duplicada e transformar a paridade física-versus-registry em gate CI.
**Reprodução/validação:** Autenticado no workspace, abrir a sidebar e o diálogo de todas as ferramentas e pesquisar Design System, Comissões de Turismo, Documentos OCR ou Automações WhatsApp: nenhum item é produzido pelos grupos canônicos. Navegar diretamente para /workspace/design-system, /workspace/turismo/comissoes, /workspace/turismo/documentos-ocr ou /workspace/whatsapp/automacoes confirma que os arquivos/rotas existem e carregam; comparar com node scripts/audit-route-parity.mjs e node scripts/check-unmapped-routes.mjs reproduz a discrepância.
**Testes de regressão:**
- Teste de paridade deve falhar quando qualquer src/routes/workspace*.tsx sem teste auxiliar não tiver entrada em src/lib/routes.ts.
- Teste de navegação para cada uma das quatro rotas deve chamar resolveWorkspaceNavigation/getSidebarConfig e afirmar presença do path para owner/admin com módulos habilitados.
- Teste de integração deve clicar cada item do menu e afirmar pathname final e ausência de 404/redirect inesperado.

#### ROUTE-F02 — Worker interno retorna 500 não controlado quando WHATSAPP_WORKER_TOKEN não está configurado

**Severidade reportada:** `medium`.

**Arquivos/linhas:**
- src/routes/api.internal.whatsapp-outbox-worker.ts
- src/routes/api.mining.worker.ts
- src/services/whatsapp-outbox.worker.ts
**Evidência:** Em src/routes/api.internal.whatsapp-outbox-worker.ts:5-11, authorized(request) lê const expected = process.env.WHATSAPP_WORKER_TOKEN e chama Buffer.from(expected) sem verificar undefined/null. Em :17-18, authorized(request) é executado antes do try que começa em :19; logo a falha de configuração não é convertida na resposta JSON 401/503 do handler. A mesma classe de endpoint mining trata segredo ausente explicitamente em src/routes/api.mining.worker.ts:11-16, evidenciando o contrato esperado de erro controlado.
**Causa-raiz:** A guarda de autenticação assume que a variável de ambiente sempre existe e fica fora do bloco de tratamento. Em Cloudflare/Nitro isso pode ocorrer em preview, novo ambiente ou deploy sem binding do segredo.
**Correção recomendada:** Antes de Buffer.from, validar expected como string não vazia e retornar 503 {error:'Worker is not configured'} (ou 401 se a política assim definir). Manter a comparação timing-safe somente depois de verificar comprimentos e mover a própria chamada authorized para dentro do try, sem vazar detalhes do segredo.
**Reprodução/validação:** Executar o handler em ambiente sem WHATSAPP_WORKER_TOKEN e fazer POST para /api/internal/whatsapp-outbox-worker (com ou sem body). Buffer.from(undefined) lança TypeError em authorized antes do try, produzindo erro SSR/HTTP 500 em vez de resposta determinística de configuração ausente. Validar com teste unitário que importa/mocka a função com process.env.WHATSAPP_WORKER_TOKEN ausente.
**Testes de regressão:**
- POST sem WHATSAPP_WORKER_TOKEN deve retornar 503/401 JSON, nunca lançar nem retornar 500.
- POST com token ausente, token vazio, token de tamanho diferente e token correto deve cobrir todos os ramos de authorized.
- Teste de produção/preview deve verificar que o binding configurado chega ao handler Cloudflare/Nitro.

**Padrões transversais observados:**
- A árvore gerada (src/routeTree.gen.ts) contém todas as declarações físicas auditadas; o problema confirmado é propagação para registry/menus, não geração de rota.
- Há múltiplas fontes de navegação (src/lib/routes.ts, src/lib/workspace-navigation.ts, listas em workspace-all-tools-dialog.tsx), o que permite drift entre URL executável, metadata/RBAC e UI.
- Os handlers de worker usam contratos de configuração diferentes: api.mining.worker retorna 503 quando o segredo falta, enquanto api.internal.whatsapp-outbox-worker lança antes do try.
- A resolução de tenant usa cookie/subdomínio, mas as funções de servidor e RLS não foram submetidas a execução contra banco real nesta auditoria; não foi elevado nenhum caso de IDOR apenas por suspeita estática.
**Riscos não verificados da unidade:**
- Não foi possível executar build/typecheck completo: npx tsc --noEmit sem o limite aumentado abortou por OOM; o script npm typecheck usa --max-old-space-size=6144 e não foi repetido para evitar custo/pressão de memória.
- Não foi feito deploy nem smoke test HTTP público; o comportamento do binding process.env em cada ambiente Cloudflare/Nitro não foi observado em runtime. O finding do worker é confirmado condicionalmente para segredo ausente.
- Não foram confirmadas por banco real as políticas RLS, validade de IDs de tenant em cookie, nem todos os contratos dos webhooks; ficam fora dos findings por falta de reprodução runtime.
- Links dinâmicos e parâmetros foram checados estaticamente e não apareceu destino literal não mapeado além da raiz /; não houve evidência confirmada de mismatch de params TanStack.
**Resumo da unidade:** Foram confirmados dois defeitos funcionais de fronteira de navegação/worker. A árvore TanStack está sincronizada com 402 declarações de rota, e a checagem de loaders de loja passou. A maior lacuna de navegação está no catálogo canônico: quatro páginas workspace reais não aparecem na sidebar/tools e um index financeiro também está fora do registry. Também há um caminho de configuração de worker que termina em 500 não tratado quando o segredo não está configurado.

### Unidade `persistence` — module: 10 findings

**Confiança declarada pela auditoria:** alta para os defeitos de código/migration demonstrados; média para o impacto operacional exato sem banco de produção.

**Escopo:** Auditoria somente leitura no repositório /home/ubuntu/waesy-audit, branch chore/recover-waesy-task-2026-10-06. Tracei os fluxos ativos de Turismo (reserva/check-in/assentos), OCR documental de viagens e seus server functions, Supabase service/anon clients, migrations/RLS/constraints e testes reais relacionados; não auditei legacy_quarantine, não usei outro repositório e não alterei o working tree.

**Ondas primárias:** W2, W3, W4, W12.

#### PERSIST-F01 — Reserva turística confirma sucesso com espelho de assento não persistido, deixando dados parciais/invisíveis

**Severidade reportada:** `alta`.

**Arquivos/linhas:**
- src/services/tourism.functions.ts:268-340
- src/services/tourism.functions.ts:354-389
- src/services/tourism-operations.functions.ts:101-112
- supabase/migrations/20260827280000_enterprise_mega_ecosystem_expansion.sql:367-380
**Evidência:** Em src/services/tourism.functions.ts:313-324 a atualização de tourism_experiences.seats/available_seats é validada; em :326-340 o insert do espelho trip_seat_reservations é aguardado, mas seu retorno {error} é descartado. O try/catch não captura o erro normal retornado pelo Supabase. Depois, :354-389 grava tourism_inquiries e retorna success. O caminho de consulta src/services/tourism-operations.functions.ts:101-112 lê somente trip_seat_reservations. A migration supabase/migrations/20260827280000_enterprise_mega_ecosystem_expansion.sql:367-378 declara passenger_doc NOT NULL, enquanto o payload usa data.passengers?.[0]?.document \|\| null (:329-335); portanto selectedSeats sem passengers falha deterministicamente no espelho, mas a reserva principal continua confirmada.
**Causa-raiz:** Duas projeções são gravadas em etapas separadas, sem transação/RPC atômica; o write secundário não verifica error e a UI/listagem usa apenas a projeção secundária.
**Correção recomendada:** Mover a reserva e o espelho para uma RPC transacional que valide passageiro, faça lock/controle de capacidade e só confirme após ambas as escritas; alternativamente verificar explicitamente o retorno do insert e fazer compensação/rollback antes de emitir voucher. Não manter duas fontes de verdade sem reconciliação.
**Reprodução/validação:** Invocar o fluxo de reserva com selectedSeats=[1] e sem passengers/documento. tourism_experiences será atualizado e tourism_inquiries poderá ser criado; o insert de trip_seat_reservations viola passenger_doc NOT NULL, mas o handler continua e retorna voucher/success. Consultar listExperienceSeatReservations para a mesma experience_id: o assento não aparece.
**Testes de regressão:**
- Teste de integração: selectedSeats sem passengers deve falhar sem alterar tourism_experiences nem tourism_inquiries.
- Teste de integração: erro de insert do espelho deve impedir success e deixar as duas projeções consistentes.
- Teste de leitura: uma reserva confirmada deve aparecer em listExperienceSeatReservations.

#### PERSIST-F02 — Endpoint de reserva de assento grava com service_role sem autenticação ou vínculo de tenant

**Severidade reportada:** `alta`.

**Arquivos/linhas:**
- src/services/tourism-operations.functions.ts:118-151
- src/lib/supabase.ts:140-154
- supabase/migrations/20260827280000_enterprise_mega_ecosystem_expansion.sql:367-380
- supabase/migrations/20260827280000_enterprise_mega_ecosystem_expansion.sql:529-548
**Evidência:** src/services/tourism-operations.functions.ts:118-151 expõe reserveExperienceSeat sem requireStaff/getServerIdentity/assertStoreAccess; usa getServerClient() em :121 e valida apenas disponibilidade por experience_id antes de inserir. src/lib/supabase.ts:140-154 confirma que getServerClient usa SUPABASE_SERVICE_ROLE_KEY e bypassa RLS. A migration só habilita RLS em :529 e cria política pública de SELECT em :547, sem política de mutação para cliente. O handler também não verifica que experience_id/order_id pertencem ao contexto do chamador.
**Causa-raiz:** A função usa credencial que ignora RLS e não impõe autorização de ator, store ou propriedade da experiência/pedido.
**Correção recomendada:** Exigir autorização explícita (staff do store da experiência ou RPC de checkout público com regras próprias), resolver o store pela experiência e validar order_id/cliente; não usar service_role em caminho client-invocable sem camada de autorização. Preferir SSR/anon com RLS ou RPC SECURITY DEFINER estreita e auditada.
**Reprodução/validação:** Chamar reserveExperienceSeat sem sessão válida, fornecendo UUID de uma experience de outro tenant, seat_number válido e passenger_doc >= 5. O código não rejeita por autenticação/tenant e tenta inserir diretamente com service_role; validar no banco a nova linha com o experience_id alvo.
**Testes de regressão:**
- Teste sem sessão deve retornar 401/403 e não inserir linha.
- Teste de usuário de tenant B com experience de A deve retornar 403 e não inserir.
- Teste de order_id pertencente a outro tenant deve ser rejeitado.

#### PERSIST-F03 — Listagem anônima de assentos expõe nome de passageiro de qualquer experiência

**Severidade reportada:** `alta`.

**Arquivos/linhas:**
- src/services/tourism-operations.functions.ts:101-112
- supabase/migrations/20260827280000_enterprise_mega_ecosystem_expansion.sql:367-380
- supabase/migrations/20260827280000_enterprise_mega_ecosystem_expansion.sql:529-547
**Evidência:** src/services/tourism-operations.functions.ts:101-112 usa getAnonServerClient() e seleciona passenger_name (:106-109), sem autenticação ou filtro de tenant. A migration supabase/migrations/20260827280000_enterprise_mega_ecosystem_expansion.sql:529-547 habilita RLS e cria trip_seat_reservations_public_read USING (true), o que autoriza leitura pública de todas as linhas e inclui passenger_name no contrato do serviço.
**Causa-raiz:** Política de leitura global e seleção de PII para uma API anônima; a tabela não possui store_id próprio para um filtro RLS direto.
**Correção recomendada:** Remover passenger_name da leitura pública e expor somente disponibilidade/seat_number; para nomes, exigir staff/cliente autorizado e aplicar RLS via relação segura experience->store. Substituir USING(true) por política mínima de descoberta.
**Reprodução/validação:** Com cliente anônimo, chamar listExperienceSeatReservations com o UUID de qualquer experience que possua reservas. A resposta contém seat_number, status e passenger_name sem prova de membership.
**Testes de regressão:**
- Teste anônimo deve receber apenas disponibilidade, nunca passenger_name/documento.
- Teste de tenant B não deve ler detalhes de reservas de A.
- Teste de staff autorizado deve continuar lendo somente sua store.

#### PERSIST-F04 — Reserva de assento tem TOCTOU e nenhum constraint de unicidade, permitindo dupla ocupação

**Severidade reportada:** `alta`.

**Arquivos/linhas:**
- src/services/tourism-operations.functions.ts:123-151
- supabase/migrations/20260827280000_enterprise_mega_ecosystem_expansion.sql:367-380
**Evidência:** src/services/tourism-operations.functions.ts:123-134 faz SELECT de disponibilidade e :136-149 faz INSERT separado. A tabela definida em supabase/migrations/20260827280000_enterprise_mega_ecosystem_expansion.sql:367-378 tem apenas id como PK; não existe UNIQUE/índice parcial para (experience_id, seat_number) nos status ativos (apenas índice simples em :380). Duas requisições concorrentes podem passar pelo SELECT vazio e inserir ambas.
**Causa-raiz:** Disponibilidade é validada fora da mesma operação atômica do insert e o banco não fornece a última barreira de integridade.
**Correção recomendada:** Usar RPC transacional com SELECT FOR UPDATE/lock por experiência ou constraint de unicidade parcial, por exemplo UNIQUE (experience_id, seat_number) WHERE status IN ('reserved','confirmed','boarded'), tratando conflito como resposta idempotente/ocupado.
**Reprodução/validação:** Disparar duas chamadas simultâneas para a mesma experience_id/seat_number antes de qualquer uma concluir; ambas podem observar ausência e criar linhas confirmed. Validar duas linhas ativas para o mesmo assento.
**Testes de regressão:**
- Teste concorrente com duas chamadas deve produzir no máximo uma reserva ativa.
- Teste de status cancelled deve permitir nova reserva sem quebrar a unicidade ativa.
- Teste de conflito de constraint deve mapear para erro de assento ocupado, não 500 genérico.

#### PERSIST-F05 — Check-in de ingresso pode alterar qualquer tenant autenticado, pois o handler usa QR global e service_role sem autorização de evento

**Severidade reportada:** `alta`.

**Arquivos/linhas:**
- src/services/tourism-operations.functions.ts:158-196
- src/lib/supabase.ts:140-154
- supabase/migrations/20260827280000_enterprise_mega_ecosystem_expansion.sql:407-419
- supabase/migrations/20260827280000_enterprise_mega_ecosystem_expansion.sql:529-548
**Evidência:** src/services/tourism-operations.functions.ts:158-164 apenas verifica que existe identity.id; não exige staff nem membership. A busca em :166-170 filtra somente qr_code_hash e a atualização em :189-196 filtra apenas id. Não há store_id/event ownership/role check. getServerClient bypassa RLS em src/lib/supabase.ts:140-154. A migration define event_checkins com event_id/attendee/QR em :407-419 e habilita RLS em :532, mas não cria política para event_checkins (as políticas públicas próximas são apenas event_ticket_batches em :547-548).
**Causa-raiz:** A autorização é reduzida a autenticação, enquanto a credencial do servidor ignora RLS e a query não ancora o ticket ao store/evento autorizado.
**Correção recomendada:** Resolver o evento e seu store em uma RPC/consulta autorizada, exigir papel de staff da store do evento, verificar membership antes do update e não usar service_role sem repassar/validar o ator. Manter a operação em uma transação condicional.
**Reprodução/validação:** Usuário autenticado fora do tenant do evento, munido de um qr_code_hash válido, chama validateEventTicketCheckin. O SELECT encontra a linha por hash e o UPDATE por id marca checked_in_by com o usuário externo.
**Testes de regressão:**
- Usuário autenticado sem membership do evento deve receber 403 e a linha permanecer inalterada.
- Staff do tenant correto deve conseguir marcar o ingresso.
- Teste deve garantir que checked_in_by só aceite ator autorizado.

#### PERSIST-F06 — Check-in retorna sucesso mesmo quando o update de persistência falha

**Severidade reportada:** `alta`.

**Arquivos/linhas:**
- src/services/tourism-operations.functions.ts:187-204
**Evidência:** Em src/services/tourism-operations.functions.ts:189-196 o resultado do update de event_checkins é completamente ignorado; em :198-204 a função retorna success:true sem verificar error ou quantidade atualizada. Portanto o contrato da UI pode dizer ACESSO LIBERADO enquanto is_checked_in continua false.
**Causa-raiz:** Confusão entre rejeição de Promise e erro retornado no objeto Supabase; ausência de checagem de error/row count e de retorno transacional.
**Correção recomendada:** Desestruturar {data,error}, rejeitar qualquer error e exigir uma linha atualizada com filtro condicional .eq('is_checked_in', false). Fazer o update e a resposta de autorização em RPC atômica.
**Reprodução/validação:** Forçar erro de UPDATE em teste de integração (ou mockar o chain para retornar {data:null,error}) mantendo a leitura do ticket válida. O handler ainda retorna success:true; reler event_checkins mostra o ticket não marcado.
**Testes de regressão:**
- Mock/integração com erro no UPDATE deve retornar falha, nunca success:true.
- Atualização sem linha afetada deve retornar conflito/erro.
- Após success, uma leitura autorizada deve confirmar is_checked_in=true.

#### PERSIST-F07 — Aplicação de voucher no trip corrompe tenant e mistura linhas quando recebe tripId de outra loja

**Severidade reportada:** `alta`.

**Arquivos/linhas:**
- src/services/travel-canonical-pipeline.functions.ts:228-307
- src/services/travel-lifecycle.functions.ts:1419-1507
- src/services/travel-lifecycle.functions.ts:1558-1691
**Evidência:** src/services/travel-canonical-pipeline.functions.ts:228-296 verifica ingestion por identity.store_id, mas aceita tripId arbitrário e passa data.storeId=identity.store_id para applyParsedVoucherToTrip. Em src/services/travel-lifecycle.functions.ts:1446-1457 o trip é buscado apenas por id, sem store_id; em :1486-1507 é atualizado apenas por id. Passageiros/itens/voucher são inseridos depois com store_id efetivo da identidade (:1580-1591, :1597-1640, :1677-1691). Assim uma ingestão legítima de B pode alterar tourism_trips de A e anexar filhos com store_id B.
**Causa-raiz:** A fronteira da ingestão é tenant-scoped, mas a fronteira do trip não é; o helper de aplicação confia no UUID de trip e grava com outro store_id sem validar que a entidade pai pertence ao mesmo tenant.
**Correção recomendada:** Antes de aplicar, buscar trip com .eq('id', tripId).eq('store_id', identity.store_id) e rejeitar ausência; repetir a condição em todos os writes ou encapsular em RPC SECURITY DEFINER que valide pai/tenant. Adicionar foreign-key/constraint composta quando possível.
**Reprodução/validação:** Como staff de B, obter/fornecer um ingestionId de B e tripId de A ao endpoint applyReviewedTravelDocumentToTrip. A consulta encontra o trip A e o update por id executa; os inserts derivados usam store_id B. Validar auditando tourism_trips A e os filhos criados com store_id B.
**Testes de regressão:**
- Teste cross-tenant com ingestion B + trip A deve retornar 403/erro e não alterar A.
- Teste deve garantir store_id igual entre trip pai e passageiros/confirmation_items/voucher.
- Teste de trip inexistente deve falhar antes de qualquer child insert.

#### PERSIST-F08 — Aplicação de voucher marca OCR como applied mesmo com writes internos parciais ou falhos

**Severidade reportada:** `alta`.

**Arquivos/linhas:**
- src/services/travel-lifecycle.functions.ts:1486-1507
- src/services/travel-lifecycle.functions.ts:1558-1691
- src/services/travel-canonical-pipeline.functions.ts:289-315
- supabase/migrations/20261006120000_canonical_travel_document_pipeline.sql:7-37
**Evidência:** src/services/travel-lifecycle.functions.ts:1486-1507 ignora o erro do update de tourism_trips; :1562-1592 ignora erros de passenger upsert/insert; :1597-1640 ignora erros de trip_confirmation_items; :1677-1691 ignora erros de tourism_vouchers. O chamador src/services/travel-canonical-pipeline.functions.ts:290-315 trata qualquer retorno como sucesso, marca travel_document_ingestions extraction_status='applied' e grava timeline. Não há transação que una esses writes.
**Causa-raiz:** O helper usa await sem desestruturar/validar {error}; o orquestrador atualiza o estado canônico independentemente do resultado real das tabelas derivadas.
**Correção recomendada:** Criar uma RPC transacional idempotente que atualize trip, passageiros, confirmation_items, voucher e ingestion na mesma transação; se permanecer no app, validar todo retorno, abortar e não marcar applied sem confirmação de cada write. Usar chaves naturais/unique para itens e upsert para replay seguro.
**Reprodução/validação:** Introduzir no parsedData um valor que viole constraint de uma tabela filha ou simular erro em uma dessas chamadas. applyParsedVoucherToTrip ainda alcança return success; o caller marca a ingestão applied. Reabrir o trip e consultar passageiros/itens/voucher evidencia a ausência parcial, enquanto OCR não pode mais ser reaplicado pelo status.
**Testes de regressão:**
- Cada write filho com erro deve fazer o comando falhar e manter ingestion em needs_review/processing, sem success.
- Teste de replay após falha deve ser seguro e não duplicar itens.
- Teste de sucesso deve verificar a presença de todos os agregados antes de retornar applied.

#### PERSIST-F09 — RPC de aplicar OCR não recebe nem valida store_id e permite aplicar documento de outro tenant

**Severidade reportada:** `alta`.

**Arquivos/linhas:**
- src/services/travel-canonical-pipeline.functions.ts:161-173
- src/lib/supabase.ts:140-154
- supabase/migrations/20261006120000_canonical_travel_document_pipeline.sql:353-463
**Evidência:** src/services/travel-canonical-pipeline.functions.ts:161-173 chama requireStaff(), descarta o identity retornado e envia apenas p_ingestion_id/lead/client fields ao RPC. A função SQL supabase/migrations/20261006120000_canonical_travel_document_pipeline.sql:353-379 é SECURITY DEFINER e faz SELECT por id sem store check; todos os inserts posteriores usam v_ingestion.store_id (:393-455). O grant em :462-463 permite execução a authenticated; o handler usa getServerClient service_role.
**Causa-raiz:** A camada HTTP autentica somente papel staff, mas não propaga a store autorizada para a função SECURITY DEFINER; a função deriva o tenant do registro alvo, tornando o UUID um capability cross-tenant.
**Correção recomendada:** Adicionar p_store_id/actor_profile_id ao RPC e validar membership dentro da própria função; ou consultar a ingestão com store_id antes e usar RPC com contexto/claims. Nunca confiar apenas em requireStaff externo quando o SQL é SECURITY DEFINER.
**Reprodução/validação:** Staff de B chama applyTravelOcrToDraft com ingestionId de A e dados de cliente. O RPC encontra A, cria budget/proposal/lead em A e atualiza a ingestão de A, sem comparar identity.store_id com v_ingestion.store_id.
**Testes de regressão:**
- Staff B + ingestion A deve ser rejeitado e não criar lead/budget/proposal.
- Staff A deve aplicar somente registros de A.
- Teste direto do RPC authenticated deve falhar quando p_store_id não corresponde à ingestão.

#### PERSIST-F10 — content_sha256 é calculado mas não implementa idempotência de ingestão OCR

**Severidade reportada:** `média`.

**Arquivos/linhas:**
- src/services/travel-canonical-pipeline.functions.ts:46-75
- supabase/migrations/20261006120000_canonical_travel_document_pipeline.sql:7-67
- supabase/migrations/20261006120000_canonical_travel_document_pipeline.sql:155-156
**Evidência:** src/services/travel-canonical-pipeline.functions.ts:51-67 calcula contentSha256 e o salva, mas sempre executa INSERT novo em travel_document_ingestions. A definição supabase/migrations/20261006120000_canonical_travel_document_pipeline.sql:7-37 não tem UNIQUE para (store_id, content_sha256) nem constraint em content_sha256; o único índice do fluxo em :155-156 é store/status/created_at. A unicidade de travel_budgets em :39-67 usa source_ingestion_id, portanto IDs distintos permitem drafts duplicados.
**Causa-raiz:** Hash é apenas metadado; não há lookup/upsert/constraint e o retry da UI cria uma nova ingestão e repete OCR.
**Correção recomendada:** Definir chave de idempotência explícita (por exemplo UNIQUE(store_id, source_kind, content_sha256)), usar INSERT ... ON CONFLICT/retorno do registro existente e controlar estados de retry sem disparar nova extração quando já houver resultado aplicável.
**Reprodução/validação:** Enviar duas vezes o mesmo arquivo/mesmo rawText para o mesmo store. Validar duas linhas com mesmo store_id/content_sha256 e dois IDs; aplicar ambas cria budgets/proposals distintos porque source_ingestion_id é diferente.
**Testes de regressão:**
- Duas submissões idênticas devem retornar o mesmo ingestionId e executar no máximo uma extração.
- Mesmo conteúdo em source_kind diferente deve seguir a regra documentada (deduplicar ou não), coberta por teste.
- Retry após timeout deve retomar a linha existente e não criar segundo draft.

**Padrões transversais observados:**
- getServerClient() usa service_role e bypassa RLS; vários server functions client-invocable não fazem requireStaff/assertStoreAccess nem validam ownership de IDs.
- Chamadas Supabase aguardadas sem desestruturar {error} não lançam automaticamente; isso produz respostas de sucesso com dados parciais.
- Fluxos multi-tabela não têm RPC/transação única e marcam estados canônicos (applied/confirmed) antes de provar persistência de todos os agregados.
- Tabelas de projeção/espelho não têm constraints compostas e algumas políticas RLS usam USING(true), deixando leitura ou integridade dependente apenas do código.
- Os testes reais lidos são majoritariamente unitários/sintéticos; tourism-seats-and-invoices.test.ts:15-31 testa arrays em memória, não o server function, RLS, concorrência ou banco real; não encontrei regressão para os fluxos confirmados acima.
**Riscos não verificados da unidade:**
- Não foi feita conexão ao banco Supabase de produção nem inspeção de pg_catalog; uma constraint/RLS adicional aplicada fora das migrations versionadas poderia alterar o comportamento observado, embora não corrija os caminhos de código que ignoram {error}.
- A exposição externa exata das URLs geradas por createServerFn depende do runtime TanStack; a ausência de guard no handler e o uso de service_role permanecem fatos confirmados.
- Não validei a ordem de aplicação das migrations em um projeto novo; a auditoria comparou os arquivos versionados e o código ativo, não o estado efetivo do banco.
**Resumo da unidade:** Foram confirmados defeitos de persistência parcial, divergência entre projeções, ausência de idempotência/constraints, bypass de tenant por service_role e visibilidade indevida de PII. O padrão recorrente é chamar getServerClient() (service_role) em funções expostas sem autorização de tenant, além de descartar o objeto {error} retornado pelo Supabase e marcar o fluxo como sucesso/applied sem transação ou verificação de todas as escritas.

### Unidade `tests` — module: 6 findings

**Confiança declarada pela auditoria:** Alta para os defeitos de geração de imagem, navegação, TDZ do Builder, ausência de E2E/configuração Vitest e falha local de typecheck; média-alta para o efeito operacional exato no GitHub Actions e para riscos que dependem de RLS/Storage remoto não disponível.

**Escopo:** Auditoria somente leitura do repositório EduardoChapeco/waesy, cobrindo Copilot (resposta/persistência), artefatos/tabelas, Builder (salvar/reabrir/publicar), geração de imagem e navegação, além da configuração Vitest/CI. Foram lidos fonte, rotas, serviços, schemas/migrations e testes reais; não houve edição. npm test executou 232 arquivos/1540 testes e passou, mas isso não representa E2E de navegador nem persistência real.

**Ondas primárias:** W14, W16.

#### TEST-F01 — ‘Gerar Imagem’ retorna sempre o logo estático e não gera nem persiste uma capa

**Severidade reportada:** `critical`.

**Arquivos/linhas:**
- src/services/travel-proposal.functions.ts:1192-1203
- src/components/tourism/studio/sections/SectionCover.tsx:155-181
- src/services/wave4-creative-studio.test.ts:4-65
**Evidência:** Fato confirmado: `src/services/travel-proposal.functions.ts:1194-1203` declara `generateProposalCoverAI`, recebe `prompt` e `proposalId`, mas o handler ignora ambos e sempre retorna `{ url: "/brand-logo.png" }`. A UI trata qualquer URL como imagem gerada e salva como capa em `src/components/tourism/studio/sections/SectionCover.tsx:163-171`. Não existe teste que importe/chame `generateProposalCoverAI`; `src/services/wave4-creative-studio.test.ts:4-65` testa somente registro de blocos e um slide construído em memória.
**Causa-raiz:** Um stub de BFF foi deixado atrás de uma ação de produção que promete geração por IA. O contrato de retorno `{url}` mascara a ausência de provider, Storage e vínculo autorizado com a proposta.
**Correção recomendada:** Substituir o stub por um provider de geração aprovado, validar/autorizar `proposalId`, persistir o binário em bucket de Storage com MIME/ownership/proveniência e retornar URL assinada/pública conforme o contrato. Em caso de provider indisponível, falhar sem alterar `cover_image_url`.
**Reprodução/validação:** No servidor, invoque `generateProposalCoverAI` com dois prompts diferentes e/ou clique em ‘Gerar Imagem’ na capa de uma proposta: ambos retornam/aplicam exatamente `/brand-logo.png`, independentemente do prompt e da proposta. Validar também que nenhum objeto de Storage ou atualização de proposta é produzido por esse handler.
**Testes de regressão:**
- Teste de serviço com provider mockado: propagar prompt e proposalId, rejeitar provider sem URL e garantir URL diferente do asset estático.
- Teste de integração com Supabase/Storage fake: gerar, persistir o objeto, atualizar a proposta e reler `cover_image_url`/`cover_prompt`.
- Teste browser do SectionCover: clicar em Gerar Imagem, verificar loading/erro e confirmar que a prévia usa a URL retornada, não `/brand-logo.png`.

#### TEST-F02 — Abertura de artefato do Copilot aponta para `/workspace/builder` sem rota; o Builder não abre

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- src/components/chat/chat-artifact-card.tsx:206-215
- src/components/chat/ai-chat-shell.tsx:488-498
- src/services/autonomous-copilot-orchestrator.ts:687-696
- src/routes/workspace.builder.$documentId.editor.tsx:12-18
- src/routes/workspace.cms.paginas.index.tsx:165-184
**Evidência:** Fato confirmado: `src/components/chat/chat-artifact-card.tsx:206-215`, `src/components/chat/ai-chat-shell.tsx:488-498` e `src/services/autonomous-copilot-orchestrator.ts:687-696` geram `/workspace/builder?doc=...` ou `/workspace/builder?artifactId=...`. A única rota de editor existente é `src/routes/workspace.builder.$documentId.editor.tsx:12`, correspondente a `/workspace/builder/$documentId/editor`; `find src/routes` não encontrou índice `/workspace/builder`. Os links internos corretos do CMS usam essa rota parametrizada em `src/routes/workspace.cms.paginas.index.tsx:165-184`.
**Causa-raiz:** A implementação de artefatos usa uma convenção antiga de query string, enquanto a árvore TanStack Router expõe somente o parâmetro de arquivo `$documentId` e o segmento `/editor`. Não há adaptador/rota de compatibilidade.
**Correção recomendada:** Construir o destino como `/workspace/builder/${encodeURIComponent(documentId)}/editor` e usar `navigate`/`Link` tipado. Se `artifactId` for suportado, criar uma rota/loader explícito que resolva o artefato para documentId; não enviar query para uma rota inexistente.
**Reprodução/validação:** Produza um artefato `landing_page` com `experience_document_id` e clique em ‘Abrir no Builder’, ou abra o link retornado pelo Copilot. O browser navega para `/workspace/builder?doc=<uuid>`; essa URL não corresponde ao arquivo de rota editor e resulta em rota não encontrada/estado errado. Repetir sem documentId reproduz o mesmo problema via `artifactId`.
**Testes de regressão:**
- Teste de rota que enumere o destino emitido para `documentId` e confirme correspondência com `/workspace/builder/$documentId/editor`.
- Teste browser: Copilot gera artefato, clicar Abrir no Builder, verificar URL do editor, carregamento do documento e retorno ao CMS.
- Teste de fallback sem documentId: exigir erro explícito ou resolver artifactId, nunca navegar silenciosamente para `/workspace/builder?artifactId=...`.

#### TEST-F03 — Copilot pode deixar mensagem do usuário presa em `sending` quando a persistência da resposta falha

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- src/services/ai-conversations.functions.ts:1727-1874
- src/routes/_store.copilot.tsx:237-243
- src/services/copilot-pipeline-boundaries.test.ts:32-132
**Evidência:** Fato confirmado no encadeamento: `src/services/ai-conversations.functions.ts:1750-1767` insere a mensagem do usuário com `status: "sending"`; depois o pipeline executa (`1771-1803`), artefato pode ser inserido (`1805-1829`) e a resposta AI é inserida (`1834-1857`). Somente após sucesso da inserção AI o código atualiza a mensagem original para `failed/delivered` e atualiza memória/thread (`1860-1874`). Se a inserção da resposta falhar, lança em 1857 sem rollback/compensação. A UI apenas altera estado local em `src/routes/_store.copilot.tsx:237-240`; não corrige a linha persistida. Não há teste que importe `sendAiConversationMessage`; `copilot-pipeline-boundaries.test.ts` cobre somente pipeline com gateway/MCP mockados.
**Causa-raiz:** Múltiplas escritas dependentes (`chat_messages` usuário, `chat_artifacts`, resposta AI, update de status e memória) são executadas sequencialmente como requests independentes, sem RPC/transação nem compensação para falha intermediária.
**Correção recomendada:** Encapsular a operação em RPC transacional/outbox idempotente, ou em compensação garantida que marque a mensagem do usuário como `failed` e reverta artefato parcial. A resposta ao cliente deve indicar o estado persistido e `clientMessageId` deve ser usado para replay sem duplicação.
**Reprodução/validação:** Com um fake de Supabase que aceita o primeiro insert em `chat_messages` e falha no segundo insert (resposta AI), chame `sendAiConversationMessage`: a função rejeita, mas a linha do usuário permanece no banco como `status='sending'` e não há resposta. Validar depois por `getAiConversationThread`/consulta da tabela.
**Testes de regressão:**
- Teste de integração com falha no insert da resposta: verificar ausência de `sending` órfão, status `failed`, nenhuma memória parcialmente atualizada e retry idempotente.
- Teste de falha no insert de artefato e no update de thread para comprovar rollback/compensação de cada etapa.
- Teste browser: enviar, simular erro de rede, recarregar a thread e confirmar que o estado persistido coincide com o estado visual e permite retry.

#### TEST-F04 — Hidratação do Builder tem `ReferenceError` em blocos `marketing_banners`

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- src/services/builder.functions.ts:75-138
- src/services/builder.functions.ts:158-173
- src/services/builder.functions.ts:611-625
- src/services/builder.functions.ts:2387-2414
- src/components/admin/builder/builder-inspector.tsx:1145
- src/services/builder.functions.test.ts:72-96
**Evidência:** Fato confirmado no código: `hydrateBindings` percorre nós em `src/services/builder.functions.ts:100-138` e, na linha 128, executa `needsMarketingBanners = true`; a declaração `let needsMarketingBanners = false` só ocorre na linha 161. Isso é acesso à variável lexical antes da inicialização (TDZ). A função é chamada no carregamento autenticado em `builder.functions.ts:611-625` e na vitrine publicada em `builder.functions.ts:2387-2399`. O inspector oferece esse binding em `src/components/admin/builder/builder-inspector.tsx:1145`. Os testes de Builder não executam a função: `src/services/builder.functions.test.ts:72-96` apenas lê o arquivo e verifica que strings/exportações existem.
**Causa-raiz:** A variável foi declarada depois do loop que a utiliza; ausência de teste de execução da hidratação deixou passar o erro de runtime. O catch amplo da vitrine converte a exceção em `not_found`, mascarando o defeito como página inexistente.
**Correção recomendada:** Mover `let needsMarketingBanners = false` para antes do `nodes.forEach` e substituir o catch amplo por erro observável/estado de falha distinguível de `not_found`. Validar cada binding por teste de execução, não por leitura textual do arquivo.
**Reprodução/validação:** Publique/crie uma versão com um nó cuja `data_bindings.source` seja `marketing_banners` e carregue a página pública pelo slug, ou chame o loader do editor com esse nó. A execução entra na linha 128 antes da declaração e lança `ReferenceError`; na vitrine, o catch de `builder.functions.ts:2415-2421` retorna `not_found`.
**Testes de regressão:**
- Teste de unidade/integrado de `hydrateBindings` com `marketing_banners`, mockando queries de banners e verificando `transient_data.banners`.
- Teste de loader público com versão publicada contendo esse binding: esperar `status='ok'` e árvore com banners.
- Teste browser de reabrir/publicar Builder com bloco de banners e conferir que a vitrine publicada renderiza dados.

#### TEST-F05 — Quality gate de typecheck está quebrado antes da etapa de testes nesta revisão

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- .github/workflows/ci.yml
- src/routes/api.internal.whatsapp-outbox-worker.ts:15-17
- src/routes/api.webhooks.whatsapp.evolution.$instance.ts:5-7
- src/routes/api.webhooks.whatsapp.ts:105-168
- src/routes/api.webhooks.whatsapp.wasender.$instance.ts:5-7
**Evidência:** Fato confirmado localmente: `npm run typecheck` terminou com exit 2 e erros em `src/routes/api.internal.whatsapp-outbox-worker.ts:15,17`, `src/routes/api.webhooks.whatsapp.evolution.$instance.ts:5,7`, `src/routes/api.webhooks.whatsapp.ts:105,111,168` e `src/routes/api.webhooks.whatsapp.wasender.$instance.ts:5,7`. Os erros são `server` não permitido no objeto de rota e bindings `request/params` implicitamente `any`. O workflow `.github/workflows/ci.yml` executa Gate 1 `npm run typecheck` antes de Gate 3 `npm run test`; portanto, se o runner reproduzir o estado da branch, o CI para antes da suíte. A execução isolada de `npm test` passou (232/1540), mas isso não prova que o workflow completo esteja verde.
**Causa-raiz:** As rotas API usam uma opção/configuração `server` incompatível com os tipos atuais do TanStack Router e deixam handlers sem tipagem inferida. O CI não possui uma estratégia de continuar e reportar testes quando o typecheck falha.
**Correção recomendada:** Adaptar as quatro rotas para a API de route handlers suportada pela versão instalada, tipar explicitamente `request`/`params` e regenerar/verificar a árvore de rotas. Manter typecheck como bloqueio, mas registrar claramente que nenhum teste de regressão foi executado quando ele falhar.
**Reprodução/validação:** Executar `npm run typecheck` na branch auditada reproduz exit 2. Validar no GitHub Actions o primeiro job: a etapa Gate 1 deve ser observada antes de qualquer conclusão de Gate 3; o status remoto não foi consultado nesta auditoria.
**Testes de regressão:**
- Rodar `npm run typecheck` em CI e exigir exit 0.
- Adicionar smoke tests dos quatro route handlers com request/params tipados.
- No job CI, publicar relatório de testes/build mesmo em falha de gate ou separar o job de testes para que a ausência de execução fique explícita.

#### TEST-F06 — Não existe execução de browser/E2E; o único teste TSX é excluído pelo Vitest configurado no CI

**Severidade reportada:** `high`.

**Arquivos/linhas:**
- vitest.config.ts:1-10
- src/components/commerce/experience-renderer.test.tsx:1-48
- .github/workflows/ci.yml
- src/routes/__tests__
**Evidência:** Fato confirmado: `vitest.config.ts:6-9` usa `environment: "node"` e `include: ["src/**/*.test.ts"]`; o único arquivo UI `src/components/commerce/experience-renderer.test.tsx` não corresponde ao glob e não foi executado. O workflow `.github/workflows/ci.yml` chama somente `npm run test` (Vitest) e não instala/executa Playwright, Cypress ou Chromium. Os testes de rota existentes cobrem loaders/strings de rotas não relacionadas ao Copilot/Builder/Studio; não há teste de `_store.copilot.tsx`, `workspace.builder.$documentId.editor.tsx` ou `workspace.marketing.studio.tsx`.
**Causa-raiz:** A configuração seleciona apenas testes TypeScript em ambiente Node, enquanto as jornadas críticas são componentes React, loaders TanStack Router e efeitos de navegador (`window.location`, canvas, download, geolocation). Não há harness E2E nem banco/Storage real no pipeline.
**Correção recomendada:** Adicionar projeto Playwright com fixtures autenticadas e ambiente Supabase/Storage de teste; cobrir os fluxos completos Copilot→mensagem persistida→reload, tabela→CSV/UI, artefato→Builder→save→reopen→publish→URL pública, imagem→Storage/download e navegação mobile/desktop. Ajustar Vitest para incluir `.test.tsx` em ambiente DOM apropriado, sem confundir isso com E2E.
**Reprodução/validação:** Executar `npm test` e observar 232 arquivos/1540 testes sem `experience-renderer.test.tsx`; procurar no workflow por Playwright/Cypress/browser não encontra nenhuma etapa. Alterações que quebrem clique, rota, canvas, reabertura ou publicação continuam podendo deixar a suíte verde (ou nem chegam a rodar quando Gate 1 falha).
**Testes de regressão:**
- Smoke E2E autenticado das cinco jornadas críticas em CI.
- Testes de componente para `ChatArtifactCard`, `AIChatShell`, `SectionCover` e `OmniEditor` em jsdom/harness DOM.
- Gate que falha se o número de specs E2E descobertas for zero e relatório separado para testes não executados.

**Padrões transversais observados:**
- O teste verde atual é predominantemente determinístico e em memória; fronteiras Supabase, Storage, providers de IA e router browser são mockadas ou não chamadas.
- Há testes que verificam texto de arquivo/manifesto em vez de executar o BFF: `builder.functions.test.ts:72-96` comprova apenas que exportações existem.
- Artefatos e tabelas têm helpers unitários (`getArtifactTableRows`/`buildArtifactCsv`), mas não há teste que compare a mesma resposta real persistida com o renderer visual e o CSV.
- A CI atual mistura gates sequenciais e não oferece evidência separada de testes pulados após typecheck falhar.
**Riscos não verificados da unidade:**
- Não foi possível confirmar contra um Supabase/Storage remoto se RLS, versionamento, blobs e publicação concorrente funcionam; os conectores remotos não foram usados.
- A fidelidade de tabelas para dados canônicos reais permanece não verificada: os testes cobrem rows sintéticas e helpers, não `searchPlatformForCopilot`/consultas de catálogo/ordens contra schema vivo nem UI+CSV lado a lado.
- O comportamento de providers externos de geração, timeout, retry e MIME não foi exercitado; o defeito confirmado do endpoint atual já impede declarar geração de imagem concluída.
- O resultado remoto do GitHub Actions não foi consultado; a falha de typecheck foi reproduzida localmente e a interrupção do workflow é a consequência esperada da ordem declarada, não uma afirmação de status remoto.
**Resumo da unidade:** A suíte atual valida principalmente funções puras, FSM, schemas e dublês de fronteira. O pipeline CI roda somente typecheck, lint, Vitest em ambiente Node e build; não há Playwright/Cypress, banco/Storage Supabase real, ou fluxo browser de Copilot → persistência, artefato/tabela → Builder → publicação → vitrine. Foram confirmados defeitos funcionais que escapam desse desenho: o endpoint de geração de capa devolve sempre o logo, os links de abertura do Builder apontam para uma rota inexistente, e a hidratação de banners do Builder tem acesso a variável em TDZ. Também há falha atual de typecheck que impede o CI de chegar aos testes nesta revisão.

## 10. Inventário completo de paths alterados nos PRs #1–#6

Lista obtida diretamente da API GitHub para cada PR, não inferida dos findings. Colunas incluem path, status e contagens de adições/remoções reportadas pela API. Paths de um PR podem reaparecer em outro; por isso o total de alterações e o número único são apresentados separadamente.

### PR #1 — fix(audit): restore clean install and deterministic test gates

**Estado atual:** `closed`; **branch:** `audit/forensic-baseline-fixes`; **head:** `5584f48f4ac2b6031b8f8328cc9cb1ba7f127a41`; **base:** `main`; **URL:** https://github.com/EduardoChapeco/waesy/pull/1.

| Path | Estado | + | − |
|---|---|---:|---:|
| `docs/AUDITORIA_FORENSE_2026-10-05.md` | `added` | 155 | 0 |
| `package-lock.json` | `modified` | 8 | 0 |
| `src/lib/cache/edge-cache.test.ts` | `modified` | 27 | 1 |
| `src/services/ai-core-gateway.test.ts` | `modified` | 12 | 1 |
| `src/services/classifieds-lifecycle-authority.test.ts` | `modified` | 23 | 0 |

### PR #2 — Audit Waesy against MagicAI plan and harden AI pool

**Estado atual:** `closed`; **branch:** `audit/recursive-p0-remediation`; **head:** `af9853dc87c95f1ee3564079a6df33ddc97268c7`; **base:** `main`; **URL:** https://github.com/EduardoChapeco/waesy/pull/2.

| Path | Estado | + | − |
|---|---|---:|---:|
| `docs/AUDITORIA_FORENSE_2026-10-05.md` | `added` | 155 | 0 |
| `docs/AUDITORIA_RECURSIVA_MODULAR_2026-10-05.md` | `added` | 111 | 0 |
| `docs/MAGICAI_AUDIT_PLAN.md` | `added` | 2027 | 0 |
| `docs/MAGICAI_GAP_ANALYSIS_2026-10-05.md` | `added` | 61 | 0 |
| `docs/PROMPTS_HISTORICO_500_INTEGRA.md` | `modified` | 1 | 1 |
| `docs/SUPABASE_ENV_PRODUCTION.md` | `modified` | 39 | 81 |
| `package-lock.json` | `modified` | 8 | 0 |
| `package.json` | `modified` | 2 | 2 |
| `scripts/add-missing-mining-constraints.mjs` | `modified` | 1 | 1 |
| `scripts/add-processed-at.mjs` | `modified` | 1 | 1 |
| `scripts/apply-20261002-migration.mjs` | `modified` | 1 | 1 |
| `scripts/apply-20261010-migration.mjs` | `modified` | 1 | 1 |
| `scripts/apply-20261011-migration.mjs` | `modified` | 1 | 1 |
| `scripts/apply-20261012-migration.mjs` | `modified` | 1 | 1 |
| `scripts/apply-20261013-migration.mjs` | `modified` | 1 | 1 |
| `scripts/apply-20261014-migration.mjs` | `modified` | 1 | 1 |
| `scripts/apply-20261015-migration.mjs` | `modified` | 1 | 1 |
| `scripts/apply-20261018-migration.mjs` | `modified` | 1 | 1 |
| `scripts/apply-20261019-migration.mjs` | `modified` | 1 | 1 |
| `scripts/apply-20261101-migration.mjs` | `modified` | 1 | 1 |
| `scripts/apply-20261102-and-20261103-migrations.mjs` | `modified` | 1 | 1 |
| `scripts/apply-20261104-migration.mjs` | `modified` | 1 | 1 |
| `scripts/apply-20261105-migration.mjs` | `modified` | 1 | 1 |
| `scripts/apply-20261106-migration.mjs` | `modified` | 1 | 1 |
| `scripts/apply-20261107-migration.mjs` | `modified` | 1 | 1 |
| `scripts/apply-20261116-migration.mjs` | `modified` | 1 | 1 |
| `scripts/apply-ai-migrations.mjs` | `modified` | 1 | 1 |
| `scripts/apply-all-pending-migrations.mjs` | `modified` | 8 | 2 |
| `scripts/apply-canonical-mining-schema.mjs` | `modified` | 1 | 1 |
| `scripts/apply-flyers-migration.mjs` | `modified` | 1 | 1 |
| `scripts/apply-legal-docs.mjs` | `modified` | 1 | 1 |
| `scripts/apply-tollbooth-migration.cjs` | `modified` | 1 | 1 |
| `scripts/apply-v145-migration.mjs` | `modified` | 1 | 1 |
| `scripts/apply-waesy-migration.mjs` | `modified` | 1 | 1 |
| `scripts/audit-db-hotpages.mjs` | `modified` | 1 | 1 |
| `scripts/audit-db-security.mjs` | `modified` | 1 | 1 |
| `scripts/audit-niche-modules-integrity.mjs` | `modified` | 1 | 1 |
| `scripts/audit-rls-status.mjs` | `modified` | 1 | 1 |
| `scripts/audit-system-completion.mjs` | `modified` | 1 | 1 |
| `scripts/check-delivery-tables.mjs` | `modified` | 1 | 1 |
| `scripts/check-legal-docs.mjs` | `modified` | 1 | 1 |
| `scripts/check-mined-articles.mjs` | `modified` | 1 | 1 |
| `scripts/check-movements-table.mjs` | `modified` | 1 | 1 |
| `scripts/check-rpc-def.mjs` | `modified` | 1 | 1 |
| `scripts/check-rpc-mined.mjs` | `modified` | 1 | 1 |
| `scripts/check-rpc.mjs` | `modified` | 1 | 1 |
| `scripts/check-unapplied-migrations.mjs` | `modified` | 1 | 1 |
| `scripts/clean-null-hotpages.mjs` | `modified` | 1 | 1 |
| `scripts/deep-mining-audit.mjs` | `modified` | 1 | 1 |
| `scripts/deploy-mining-schedules.mjs` | `modified` | 1 | 1 |
| `scripts/deploy-production-migrations.mjs` | `modified` | 1 | 1 |
| `scripts/find-concursos-tables.mjs` | `modified` | 1 | 1 |
| `scripts/fix-admin-master-and-brand.mjs` | `modified` | 1 | 1 |
| `scripts/fix-canonical-modules-db.mjs` | `modified` | 1 | 1 |
| `scripts/fix-migration-state.mjs` | `modified` | 1 | 1 |
| `scripts/fix-mining-and-schema.mjs` | `modified` | 1 | 1 |
| `scripts/inspect-agencies-cols.mjs` | `modified` | 1 | 1 |
| `scripts/inspect-all-errors.mjs` | `modified` | 1 | 1 |
| `scripts/inspect-all-five.mjs` | `modified` | 1 | 1 |
| `scripts/inspect-all-tables.mjs` | `modified` | 1 | 1 |
| `scripts/inspect-api-key-pools.mjs` | `modified` | 1 | 1 |
| `scripts/inspect-constraints.mjs` | `modified` | 1 | 1 |
| `scripts/inspect-db.mjs` | `modified` | 1 | 1 |
| `scripts/inspect-edu-identities.mjs` | `modified` | 1 | 1 |
| `scripts/inspect-invite-scores.mjs` | `modified` | 1 | 1 |
| `scripts/inspect-legal-recipes-events.mjs` | `modified` | 1 | 1 |
| `scripts/inspect-mining-schedules.mjs` | `modified` | 1 | 1 |
| `scripts/inspect-mining-schema.mjs` | `modified` | 1 | 1 |
| `scripts/inspect-mining-telemetry.mjs` | `modified` | 1 | 1 |
| `scripts/inspect-more-cols.mjs` | `modified` | 1 | 1 |
| `scripts/inspect-orders-exchanges.mjs` | `modified` | 1 | 1 |
| `scripts/inspect-pixel-tables.mjs` | `modified` | 1 | 1 |
| `scripts/inspect-raffles-checkout.mjs` | `modified` | 1 | 1 |
| `scripts/inspect-sponsors-and-stores.mjs` | `modified` | 1 | 1 |
| `scripts/inspect-stores-cols.mjs` | `modified` | 1 | 1 |
| `scripts/inspect-system-error-logs.mjs` | `modified` | 1 | 1 |
| `scripts/inspect-tables.mjs` | `modified` | 1 | 1 |
| `scripts/inspect-target-cols.mjs` | `modified` | 1 | 1 |
| `scripts/inspect-token-ledger.cjs` | `modified` | 1 | 1 |
| `scripts/inspect-token-schema.cjs` | `modified` | 1 | 1 |
| `scripts/inspect-workspace-members.mjs` | `modified` | 1 | 1 |
| `scripts/investigate-media-and-payments.mjs` | `modified` | 1 | 1 |
| `scripts/list-all-db-tables.mjs` | `modified` | 1 | 1 |
| `scripts/list-no-rls.mjs` | `modified` | 1 | 1 |
| `scripts/list-permissive-writes.mjs` | `modified` | 1 | 1 |
| `scripts/process-one-queue-item.mjs` | `modified` | 1 | 1 |
| `scripts/repair-all-migrations.cjs` | `modified` | 1 | 1 |
| `scripts/seed-central-knowledge.ts` | `modified` | 1 | 1 |
| `scripts/sync-hotpages.mjs` | `modified` | 1 | 1 |
| `scripts/test-anti-cheat.cjs` | `modified` | 1 | 1 |
| `scripts/test-exchanges-query.mjs` | `modified` | 1 | 1 |
| `scripts/test-live-mining-fetch.mjs` | `modified` | 1 | 1 |
| `scripts/test-mechanical-extraction.mjs` | `modified` | 1 | 1 |
| `scripts/test-mining-advanced-suite.mjs` | `modified` | 1 | 1 |
| `scripts/test-profiles-search.mjs` | `modified` | 1 | 1 |
| `scripts/test-receivables-query.mjs` | `modified` | 2 | 2 |
| `scripts/test-rpc-call.mjs` | `modified` | 1 | 1 |
| `scripts/test-solvency.mjs` | `modified` | 1 | 1 |
| `scripts/test-supabase-exchanges.mjs` | `modified` | 1 | 1 |
| `scripts/test-tender-unlock.cjs` | `modified` | 1 | 1 |
| `scripts/test-tollbooth.cjs` | `modified` | 1 | 1 |
| `scripts/update-bucket-post-media.mjs` | `modified` | 1 | 1 |
| `scripts/verify-prod-db.mjs` | `modified` | 1 | 1 |
| `scripts/verify-supabase-full.mjs` | `modified` | 1 | 1 |
| `src/components/chat/ai-activity-trail.tsx` | `modified` | 45 | 9 |
| `src/components/chat/ai-chat-shell.tsx` | `modified` | 2 | 0 |
| `src/components/chat/waesy-copilot-drawer.tsx` | `modified` | 3 | 1 |
| `src/lib/ai/provider-registry.test.ts` | `added` | 19 | 0 |
| `src/lib/ai/provider-registry.ts` | `added` | 101 | 0 |
| `src/lib/ai/skill-registry.test.ts` | `added` | 12 | 0 |
| `src/lib/ai/skill-registry.ts` | `added` | 35 | 0 |
| `src/lib/ai/sse.test.ts` | `added` | 16 | 0 |
| `src/lib/ai/sse.ts` | `added` | 18 | 0 |
| `src/lib/cache/edge-cache.test.ts` | `modified` | 27 | 1 |
| `src/lib/mining/continuous-crawler.engine.ts` | `modified` | 2 | 2 |
| `src/lib/webhook-signature.test.ts` | `added` | 36 | 0 |
| `src/lib/webhook-signature.ts` | `added` | 55 | 0 |
| `src/routeTree.gen.ts` | `modified` | 21 | 0 |
| `src/routes/__root.tsx` | `modified` | 5 | 5 |
| `src/routes/_store.classificados.$id.tsx` | `modified` | 3 | 2 |
| `src/routes/_store.conta.classificados.novo.tsx` | `modified` | 1 | 0 |
| `src/routes/_store.copilot.tsx` | `modified` | 1 | 0 |
| `src/routes/_store.tsx` | `modified` | 5 | 4 |
| `src/routes/api.ai.stream.ts` | `added` | 69 | 0 |
| `src/routes/api.cron.mining-worker.ts` | `modified` | 9 | 5 |
| `src/routes/api.mining.worker.ts` | `modified` | 30 | 27 |
| `src/routes/api.webhooks.marketplaces.ts` | `modified` | 14 | 17 |
| `src/routes/api.webhooks.pix.ts` | `modified` | 10 | 1 |
| `src/routes/api.webhooks.shipment.ts` | `modified` | 10 | 1 |
| `src/routes/workspace.tsx` | `modified` | 9 | 7 |
| `src/services/ai-conversations.functions.ts` | `modified` | 59 | 5 |
| `src/services/ai-core-gateway.functions.ts` | `modified` | 99 | 2 |
| `src/services/ai-core-gateway.test.ts` | `modified` | 12 | 1 |
| `src/services/ai-pool.ts` | `modified` | 111 | 178 |
| `src/services/ai-react-loop.test.ts` | `added` | 27 | 0 |
| `src/services/ai-react-loop.ts` | `added` | 68 | 0 |
| `src/services/ai-sdr.functions.ts` | `modified` | 91 | 3 |
| `src/services/ai-sdr.test.ts` | `added` | 23 | 0 |
| `src/services/autonomous-copilot-orchestrator.ts` | `modified` | 21 | 1 |
| `src/services/classifieds-lifecycle-authority.test.ts` | `modified` | 23 | 0 |
| `src/services/copilot-execution-persistence.ts` | `added` | 84 | 0 |
| `src/services/mining/react-mining-adapter.test.ts` | `added` | 27 | 0 |
| `src/services/mining/react-mining-adapter.ts` | `added` | 44 | 0 |
| `src/styles.css` | `modified` | 70 | 11 |
| `supabase/migrations/20270101010000_copilot_react_execution_persistence.sql` | `added` | 78 | 0 |
| `wrangler.example.toml` | `modified` | 1 | 1 |
| `wrangler.toml` | `modified` | 4 | 7 |

### PR #3 — feat: complete WhatsApp integration waves 1-8

**Estado atual:** `closed`; **branch:** `feat/whatsapp-wave1-8-complete-release`; **head:** `557e1bf9e24a2ba7b6abf7eb1a92c19a1cc3771c`; **base:** `main`; **URL:** https://github.com/EduardoChapeco/waesy/pull/3.

| Path | Estado | + | − |
|---|---|---:|---:|
| `docs/WHATSAPP_INTEGRATION_AUDIT_2026-10-06.md` | `added` | 26 | 0 |
| `docs/WHATSAPP_WAVE8_SECURITY_LGPD_AUDIT_2026-10-06.md` | `added` | 74 | 0 |
| `pnpm-lock.yaml` | `added` | 11846 | 0 |
| `pnpm-workspace.yaml` | `added` | 5 | 0 |
| `scripts/whatsapp-wave8-load-test.mjs` | `added` | 41 | 0 |
| `src/components/chat/whatsapp-operations-metrics-panel.tsx` | `added` | 73 | 0 |
| `src/lib/conversation-crypto-v2.test.ts` | `added` | 35 | 0 |
| `src/lib/conversation-crypto.server.ts` | `added` | 106 | 0 |
| `src/lib/conversation-crypto.test.ts` | `added` | 29 | 0 |
| `src/lib/crypto-vault.server.ts` | `modified` | 7 | 6 |
| `src/lib/webhook-signature.test.ts` | `modified` | 17 | 1 |
| `src/lib/webhook-signature.ts` | `modified` | 25 | 0 |
| `src/registries/integration-registry.ts` | `modified` | 3 | 3 |
| `src/routeTree.gen.ts` | `modified` | 104 | 5 |
| `src/routes/admin-master.integracoes.tsx` | `modified` | 17 | 3 |
| `src/routes/api.internal.whatsapp-outbox-worker.ts` | `added` | 34 | 0 |
| `src/routes/api.webhooks.whatsapp.evolution.$instance.ts` | `added` | 10 | 0 |
| `src/routes/api.webhooks.whatsapp.ts` | `modified` | 415 | 111 |
| `src/routes/api.webhooks.whatsapp.wasender.$instance.ts` | `added` | 10 | 0 |
| `src/routes/workspace.atendimento.index.tsx` | `modified` | 5 | 0 |
| `src/routes/workspace.automacoes.tsx` | `modified` | 16 | 8 |
| `src/routes/workspace.configuracoes.integracoes.tsx` | `modified` | 70 | 2 |
| `src/routes/workspace.whatsapp.automacoes.tsx` | `added` | 89 | 0 |
| `src/services/chat.functions.ts` | `modified` | 44 | 22 |
| `src/services/integrations.functions.ts` | `modified` | 124 | 13 |
| `src/services/linkedin-omni-bridge.test.ts` | `modified` | 5 | 1 |
| `src/services/master.functions.ts` | `modified` | 17 | 3 |
| `src/services/truth-engine-v143.test.ts` | `modified` | 5 | 1 |
| `src/services/whatsapp-automation-runtime.server.ts` | `added` | 85 | 0 |
| `src/services/whatsapp-automation.contracts.test.ts` | `added` | 45 | 0 |
| `src/services/whatsapp-automation.functions.ts` | `added` | 113 | 0 |
| `src/services/whatsapp-channel-instances.functions.ts` | `added` | 154 | 0 |
| `src/services/whatsapp-contact-identity.functions.ts` | `added` | 78 | 0 |
| `src/services/whatsapp-operations-metrics.functions.ts` | `added` | 30 | 0 |
| `src/services/whatsapp-outbound-adapters.server.ts` | `added` | 148 | 0 |
| `src/services/whatsapp-outbound-adapters.test.ts` | `added` | 76 | 0 |
| `src/services/whatsapp-outbox.worker.ts` | `added` | 233 | 0 |
| `src/services/whatsapp-provider-webhook.server.ts` | `added` | 167 | 0 |
| `src/services/whatsapp-provider-webhook.test.ts` | `added` | 28 | 0 |
| `src/services/whatsapp-wave8-security.test.ts` | `added` | 42 | 0 |
| `supabase/migrations/20260731131900_fase5_growth_integrations.sql` | `modified` | 22 | 1 |
| `supabase/migrations/20260827280000_enterprise_mega_ecosystem_expansion.sql` | `modified` | 8 | 0 |
| `supabase/migrations/20261006000001_whatsapp_credential_secret_encryption.sql` | `added` | 17 | 0 |
| `supabase/migrations/20261006000002_whatsapp_inbox_delivery_and_outbox.sql` | `added` | 123 | 0 |
| `supabase/migrations/20261006000003_whatsapp_worker_and_channel_instances.sql` | `added` | 167 | 0 |
| `supabase/migrations/20261006000004_whatsapp_security_provider_metrics.sql` | `added` | 179 | 0 |
| `supabase/migrations/20261006000005_whatsapp_identity_flows_campaigns.sql` | `added` | 149 | 0 |
| `supabase/migrations/20261006000006_wave2_conversation_isolation.sql` | `added` | 102 | 0 |
| `supabase/migrations/20261006000007_wave3_realtime_operations_telemetry.sql` | `added` | 83 | 0 |
| `supabase/migrations/20261006000008_wave4_outbound_provider_adapters.sql` | `added` | 12 | 0 |
| `supabase/migrations/20261006000009_wave6_webhook_delivery_isolation.sql` | `added` | 14 | 0 |
| `supabase/migrations/20261006000010_wave7_resilience_circuit_breaker.sql` | `added` | 113 | 0 |
| `supabase/migrations/20261006000011_wave8_lgpd_security_and_test_foundation.sql` | `added` | 42 | 0 |
| `supabase/reference-migrations/travelagencias/20260612000009_omnichannel_triggers.sql` | `modified` | 35 | 25 |
| `supabase/reference-migrations/travelagencias/20260612000011_update_omnichannel_triggers.sql` | `modified` | 33 | 15 |
| `supabase/reference-migrations/travelagencias/20260627000000_omnichannel_email_triggers.sql` | `modified` | 23 | 6 |
| `supabase/reference-migrations/travelagencias/20260730000001_p1_rls_whatsapp_token_restriction.sql` | `modified` | 2 | 2 |
| `supabase/reference-migrations/travelagencias/20260804000000_meta_connections_evolution.sql` | `modified` | 17 | 0 |
| `supabase/reference-migrations/travelagencias/20260900000006_ai_processor_umbler_migration.sql` | `modified` | 7 | 3 |

### PR #4 — feat(builder): integrar Omni AST e gates de qualidade Studio

**Estado atual:** `closed`; **branch:** `feat/waesy-studio-omni-audit`; **head:** `0bc67e435f82b3db80a8284ad0d152935fc2d232`; **base:** `main`; **URL:** https://github.com/EduardoChapeco/waesy/pull/4.

| Path | Estado | + | − |
|---|---|---:|---:|
| `design-lint.report.json` | `modified` | 406 | 406 |
| `docs/builder/SPEC-WAESY-STUDIO-LIBRARY.md` | `added` | 100 | 0 |
| `docs/builder/STUDIO-TEMPLATE-AUDIT.md` | `added` | 32 | 0 |
| `docs/builder/research-2026-10-06-manus-enter-builders.md` | `added` | 35 | 0 |
| `docs/builder/template-audit-report.json` | `added` | 182 | 0 |
| `docs/canonico/ROADMAP_VIVO.md` | `modified` | 3 | 1 |
| `docs/design/LINT_DASHBOARD.md` | `modified` | 1 | 1 |
| `docs/prompts/WAESY-STUDIO-TEMPLATE-FACTORY.md` | `added` | 52 | 0 |
| `package.json` | `modified` | 1 | 0 |
| `scripts/audit/audit-studio-templates.mjs` | `added` | 35 | 0 |
| `src/components/builder/OmniEditor.tsx` | `modified` | 5 | 4 |
| `src/components/builder/OmniPageRenderer.tsx` | `modified` | 8 | 2 |
| `src/components/builder/omni-builder.test.ts` | `modified` | 3 | 1 |
| `src/components/builder/registry.ts` | `modified` | 8 | 0 |
| `src/components/builder/types.ts` | `modified` | 3 | 0 |
| `src/components/commerce/experience-renderer.test.tsx` | `added` | 49 | 0 |
| `src/components/commerce/experience-renderer.tsx` | `modified` | 87 | 62 |
| `src/lib/builder/asset-contract.ts` | `added` | 72 | 0 |
| `src/lib/builder/motion-runtime.ts` | `added` | 49 | 0 |
| `src/lib/builder/omni-experience-adapter.ts` | `added` | 48 | 0 |
| `src/lib/builder/omni-templates.ts` | `modified` | 3 | 0 |
| `src/lib/builder/studio-catalog.ts` | `added` | 132 | 0 |
| `src/lib/builder/studio-contract.test.ts` | `added` | 76 | 0 |
| `src/lib/builder/studio-template-audit.test.ts` | `added` | 118 | 0 |
| `src/lib/builder/studio-template-audit.ts` | `added` | 235 | 0 |
| `src/services/ai-builder-composition.functions.ts` | `modified` | 1 | 0 |
| `src/services/omni-builder.functions.ts` | `modified` | 11 | 0 |
| `src/test/setup.ts` | `modified` | 6 | 0 |
| `src/types/omni-builder.ts` | `modified` | 6 | 0 |

### PR #5 — chore: sincronizar artefactos completos da auditoria Waesy

**Estado atual:** `open`; **branch:** `chore/sync-task-qhMPHRy4`; **head:** `713c0c96f04d5db7e78b667078d40a77d9246f80`; **base:** `main`; **URL:** https://github.com/EduardoChapeco/waesy/pull/5.

| Path | Estado | + | − |
|---|---|---:|---:|
| `docs/audits/BFF_CONTRACT_CLOSURE_WAVE2_2026-10-06.md` | `added` | 81 | 0 |
| `docs/audits/BFF_TABLE_CONTRACT_BASELINE_2026-10-06.md` | `added` | 50 | 0 |
| `docs/specs/SPEC-20261006-BUILDER-STABILIZATION-WAVE1.md` | `added` | 21 | 0 |
| `docs/specs/SPEC-20261006-E2E-MOBILE-HIG-STABILIZATION.md` | `added` | 30 | 0 |
| `docs/specs/SPEC-20261006-TYPECHECK-AND-BFF-SCHEMA-CLOSURE.md` | `added` | 28 | 0 |
| `scripts/check-bff-table-contracts.mjs` | `added` | 51 | 0 |
| `supabase/migrations/20270109000000_close_bff_quota_and_whatsapp_lead_contracts.sql` | `added` | 99 | 0 |

### PR #6 — feat: finalize SimLab and provenance hardening

**Estado atual:** `open`; **branch:** `chore/recover-waesy-task-2026-10-06`; **head:** `8e1b2c4972c8bb76c7cf1c59ade41e71c6e2b96d`; **base:** `main`; **URL:** https://github.com/EduardoChapeco/waesy/pull/6.

| Path | Estado | + | − |
|---|---|---:|---:|
| `.audit/BASELINE.json` | `modified` | 57 | 57 |
| `.audit/BASELINE.md` | `modified` | 23 | 23 |
| `.audit/ROUTES.json` | `modified` | 1533 | 1553 |
| `.audit/ROUTES.md` | `modified` | 40 | 40 |
| `.audit/audit-report.html` | `modified` | 14 | 14 |
| `.audit/audit-report.json` | `modified` | 34 | 34 |
| `.audit/checks-raw.json` | `modified` | 19 | 19 |
| `dead-code.report.json` | `modified` | 65 | 58 |
| `design-lint.report.json` | `modified` | 432 | 432 |
| `docs/audits/PRODUCTION_READINESS_2026-10-06.md` | `added` | 65 | 0 |
| `docs/design/LINT_DASHBOARD.md` | `modified` | 20 | 20 |
| `docs/simlab-demographic-calibration.md` | `added` | 24 | 0 |
| `ia/reference-benchmarks.json` | `modified` | 15 | 14 |
| `scripts/audit/button-ast-audit.json` | `modified` | 10 | 10 |
| `src/components/adtech/campaign-draft-card.tsx` | `modified` | 51 | 52 |
| `src/components/chat/ai-chat-shell.test.ts` | `modified` | 25 | 0 |
| `src/components/chat/ai-chat-shell.tsx` | `modified` | 85 | 27 |
| `src/components/chat/structured-message-view.tsx` | `modified` | 19 | 2 |
| `src/components/chat/waesy-copilot-drawer.tsx` | `modified` | 1 | 1 |
| `src/components/commerce/dynamic-sections/reputation-badges-strip.tsx` | `modified` | 38 | 28 |
| `src/components/commerce/dynamic-sections/reputation-score-header.tsx` | `modified` | 25 | 23 |
| `src/components/commerce/dynamic-sections/reputation-timeline-feed.tsx` | `modified` | 79 | 129 |
| `src/components/commerce/reputation-phase5.test.ts` | `modified` | 17 | 9 |
| `src/components/simlab/observed-experiment-panel.tsx` | `added` | 375 | 0 |
| `src/components/simlab/simlab-research-panel.tsx` | `modified` | 108 | 192 |
| `src/components/simlab/simlab-review-panel.tsx` | `modified` | 96 | 322 |
| `src/components/workspace/workspace-all-tools-dialog.tsx` | `modified` | 3 | 3 |
| `src/lib/ad-tech/campaign-intent.test.ts` | `added` | 41 | 0 |
| `src/lib/ad-tech/campaign-intent.ts` | `added` | 62 | 0 |
| `src/lib/brand-source-url.test.ts` | `added` | 25 | 0 |
| `src/lib/brand-source-url.ts` | `added` | 36 | 0 |
| `src/lib/builder/builder-registry.ts` | `modified` | 23 | 18 |
| `src/lib/color-extractor.test.ts` | `added` | 27 | 0 |
| `src/lib/color-extractor.ts` | `modified` | 16 | 24 |
| `src/lib/data/ibge-demographics.ts` | `removed` | 0 | 366 |
| `src/lib/engines/engines.test.ts` | `modified` | 0 | 23 |
| `src/lib/engines/multi-niche-e2e.test.ts` | `modified` | 2 | 13 |
| `src/lib/engines/simlab-v2-engine.ts` | `removed` | 0 | 249 |
| `src/lib/simlab-calibrated-personas.ts` | `removed` | 0 | 5 |
| `src/lib/simlab/brazil-demographics.ts` | `modified` | 13 | 160 |
| `src/lib/simlab/calibrated-personas.ts` | `removed` | 0 | 277 |
| `src/lib/simlab/econometric-engine.ts` | `removed` | 0 | 357 |
| `src/lib/simlab/experiment-statistics.test.ts` | `added` | 149 | 0 |
| `src/lib/simlab/experiment-statistics.ts` | `added` | 551 | 0 |
| `src/lib/simlab/seed-personas.ts` | `removed` | 0 | 226 |
| `src/lib/simlab/simulator.ts` | `removed` | 0 | 214 |
| `src/registries/mcp-tool-registry.ts` | `modified` | 61 | 35 |
| `src/routes/_store.copilot.tsx` | `modified` | 40 | 0 |
| `src/routes/_store.match-time.tsx` | `modified` | 44 | 22 |
| `src/routes/admin-master.mining.tsx` | `modified` | 28 | 18 |
| `src/routes/admin-master.simlabs.tsx` | `modified` | 119 | 234 |
| `src/routes/claim.reputacao.$entityId.tsx` | `modified` | 52 | 40 |
| `src/routes/workspace.inteligencia.radar.tsx` | `modified` | 32 | 13 |
| `src/routes/workspace.marketing.anuncios.tsx` | `modified` | 110 | 71 |
| `src/routes/workspace.marketing.brand-kit.tsx` | `modified` | 82 | 24 |
| `src/routes/workspace.marketing.canvas-bmc.tsx` | `modified` | 10 | 5 |
| `src/routes/workspace.marketing.canvas-pecados.tsx` | `modified` | 39 | 50 |
| `src/routes/workspace.marketing.carrinhos.tsx` | `modified` | 38 | 19 |
| `src/routes/workspace.marketing.social.tsx` | `modified` | 30 | 23 |
| `src/routes/workspace.marketing.swot.tsx` | `modified` | 28 | 17 |
| `src/routes/workspace.simlab.focus-group.tsx` | `modified` | 63 | 197 |
| `src/routes/workspace.simulacao.tsx` | `modified` | 80 | 164 |
| `src/routes/workspace.squads.index.tsx` | `modified` | 8 | 9 |
| `src/services/ads-provenance.test.ts` | `added` | 59 | 0 |
| `src/services/ads.functions.ts` | `modified` | 214 | 172 |
| `src/services/ai-quality-evaluator.engine.ts` | `modified` | 15 | 1 |
| `src/services/ai-quality-evaluator.test.ts` | `modified` | 30 | 1 |
| `src/services/autonomous-copilot-orchestrator.ts` | `modified` | 17 | 4 |
| `src/services/brand-kit.functions.ts` | `modified` | 235 | 148 |
| `src/services/canvas-bmc.functions.ts` | `modified` | 102 | 82 |
| `src/services/canvas-bmc.test.ts` | `modified` | 5 | 4 |
| `src/services/central-knowledge-phase14.test.ts` | `modified` | 10 | 37 |
| `src/services/central-knowledge.functions.ts` | `modified` | 8 | 18 |
| `src/services/claim-intelligence.functions.ts` | `modified` | 11 | 79 |
| `src/services/claim-intelligence.test.ts` | `modified` | 2 | 61 |
| `src/services/company-mvp.functions.ts` | `modified` | 97 | 113 |
| `src/services/copilot-execution-persistence.test.ts` | `modified` | 2 | 2 |
| `src/services/copilot-execution-persistence.ts` | `modified` | 14 | 3 |
| `src/services/deep-regression-v8-audit.test.ts` | `modified` | 8 | 14 |
| `src/services/events/external-events.functions.ts` | `modified` | 104 | 55 |
| `src/services/linkedin-omni-bridge.test.ts` | `modified` | 7 | 2 |
| `src/services/magic-onboarding.functions.ts` | `modified` | 20 | 5 |
| `src/services/market-radar.functions.ts` | `modified` | 301 | 339 |
| `src/services/market-radar.test.ts` | `modified` | 58 | 19 |
| `src/services/marketing.functions.test.ts` | `added` | 252 | 0 |
| `src/services/marketing.functions.ts` | `modified` | 167 | 118 |
| `src/services/mcp-orchestrator.functions.ts` | `modified` | 115 | 112 |
| `src/services/mcp-server.test.ts` | `modified` | 50 | 9 |
| `src/services/mining/industrial-crawlers.test.ts` | `modified` | 15 | 0 |
| `src/services/mining/mechanical-extractor.ts` | `modified` | 43 | 9 |
| `src/services/mining/specialized-extractors.ts` | `modified` | 20 | 17 |
| `src/services/onboarding-e2e-verification.test.ts` | `modified` | 3 | 2 |
| `src/services/onboarding-pipeline.server.ts` | `modified` | 228 | 202 |
| `src/services/seven-sins-simlab.functions.ts` | `modified` | 131 | 282 |
| `src/services/seven-sins-simlab.test.ts` | `modified` | 34 | 77 |
| `src/services/simlab-and-squads.test.ts` | `modified` | 45 | 226 |
| `src/services/simlab-observed-experiments.functions.ts` | `added` | 347 | 0 |
| `src/services/simlab.functions.ts` | `modified` | 0 | 0 |
| `src/services/squad-content.functions.ts` | `modified` | 0 | 0 |
| `src/services/squads-runtime.functions.ts` | `modified` | 0 | 0 |
| `src/services/squads-runtime.test.ts` | `modified` | 239 | 42 |
| `src/services/store.functions.ts` | `modified` | 3 | 2 |
| `src/services/studio.functions.ts` | `modified` | 74 | 52 |
| `src/services/truth-engine-v143.test.ts` | `modified` | 7 | 2 |
| `src/services/vertical-ai-modules.functions.ts` | `modified` | 334 | 758 |
| `src/services/vertical-ai-modules.test.ts` | `modified` | 158 | 178 |
| `src/types/ad-tech-mcp.ts` | `modified` | 14 | 14 |
| `src/types/json-value.ts` | `added` | 20 | 0 |
| `src/types/simlab.ts` | `modified` | 72 | 41 |
| `src/types/squads-and-onboarding.ts` | `modified` | 25 | 14 |
| `src/types/studio.ts` | `modified` | 8 | 0 |
| `supabase/migrations/20270106000001_live_p0_security_hardening.sql` | `renamed` | 0 | 0 |
| `supabase/migrations/20270107000001_document_artifacts_ocr_provenance.sql` | `renamed` | 0 | 0 |
| `supabase/migrations/20270109000001_simlab_observed_experiments_and_provenance.sql` | `added` | 181 | 0 |
| `supabase/migrations/20270109000002_wave6_tourism_rls_final_hardening.sql` | `renamed` | 0 | 0 |
| `supabase/migrations/20270110000001_squad_marketing_ai_provenance.sql` | `added` | 17 | 0 |
| `supabase/migrations/20270111000001_remove_unvalidated_bmc_confidence.sql` | `added` | 56 | 0 |
| `supabase/migrations/20270112000000_brand_kit_provenance_and_human_review.sql` | `added` | 35 | 0 |
| `supabase/migrations/20270112000001_chat_message_idempotency.sql` | `renamed` | 0 | 0 |
| `supabase/migrations/20270113000000_brand_kits_contract_and_provenance.sql` | `added` | 40 | 0 |
| `supabase/migrations/20270114000000_competitor_snapshot_provenance.sql` | `added` | 24 | 0 |
| `supabase/migrations/20270115000000_external_event_source_provenance.sql` | `added` | 6 | 0 |
| `supabase/migrations/20270116000000_simlab_tenant_integrity_and_rbac.sql` | `added` | 122 | 0 |
| `supabase/migrations/20270117000000_remove_event_and_mining_fake_defaults.sql` | `added` | 34 | 0 |

## 11. Checklist de execução para o próximo agente

1. Confirmar que está no repositório `EduardoChapeco/waesy`; ler `AGENTS.md`, a skill, este plano (seções 1–8 e onda escolhida) e relatório/spec vinculado antes de qualquer alteração.
2. Verificar `git status` em todos os worktrees; preservar os 13 paths sujos listados na seção 2.1; não misturar a branch documental com o código local de recuperação.
3. Começar por W0.2/W1/W2: criar ledger, reproduzir P0s de segurança, proteger main e resolver Cloudflare. Não implementar dezenas de correções sem CI e integração mínima.
4. Escolher uma microfase por PR; registrar paths permitidos, critérios, migrations e plano de recuperação; testar baseline antes de modificar.
5. Publicar resultados e blockers no ledger e PR; não declarar “100% pronto” com qualquer finding crítico/high aberto, migration não validada, provider/Storage não integrado, Cloudflare falhando ou deploy não observado.
6. Só iniciar a fase seguinte após revisão adversarial e gate de saída da anterior; usar findings como checklist de reteste, não como autorização para ampliar escopo.

## 12. Limites, riscos e declaração final

Este plano consolida um snapshot forense do Waesy e entrega uma metodologia de prova. Ele **não** corrige os 109 findings, não certifica o estado atual de cada runtime, não garante que todo branch histórico foi recuperado, não confirma o banco instalado nem o deploy. A fonte estruturada observada tinha 15 unidades e 109 findings; a API mostrou PRs #1–#6 e branches disponíveis no instante consultado. Findings surgidos depois, branches não expostos pela API, divergência do banco ou comportamento de produção ainda precisam de auditoria direcionada.

**Critério para o veredito mudar:** todos os gates de W17 precisam apontar para um SHA específico, checks obrigatórios verdes, migrações e RLS validadas em ambiente representativo, jornadas browser reais concluídas, artefato publicado confirmado pelo provedor e smoke test/rollback documentados. Até lá, status correto: **remediação planejada, produção não comprovada**.
