# Waesy — Ledger de execução holística W0–W17

## Snapshot e escopo

- Data/hora: 2026-10-07T03:16:00Z
- Repositório: `EduardoChapeco/waesy`
- Branch de execução: `execute/waesy-holistic-waves`
- HEAD inicial da execução: `96dfd321` (merge do pacote metodológico do PR #7 sobre `90e40782`)
- Base remota comparada: `origin/main` em `90e40782187ae77030d11b05f46856bb8ddf9b1c`
- PRs observados: #1–#4 merged; #5, #6 e #7 abertos no início; #8 merged.
- Estado do worktree: limpo antes da branch de execução; worktrees `/home/ubuntu/waesy-pr5`, `/home/ubuntu/waesy-pr6` e `/home/ubuntu/waesy-pr7` preservados para comparação.
- Ambiente: Node 22.13.0, npm 10.x, Ubuntu 24.04, Vitest 4.1.10.
- Escopo: execução integral do masterplan `docs/audits/WAESY_HOLISTIC_REMEDIATION_MASTERPLAN_2026-10-06.md`, W0–W17, com microfases e prova por níveis.
- Regra: documentação, código, teste, CI, deployment e runtime são evidências independentes.

## Preflight por onda

| Onda.microfase | Leituras obrigatórias | Estado inicial | Ação | Resultado |
|---|---|---|---|---|
| W0.1–W0.3 | `AGENTS.md`, skill de integridade, masterplan, template de ledger, package.json, CI | `90e40782`, worktree main limpo, PR7 não mesclado | Criar branch de execução, preservar worktrees e registrar baseline | Em execução |
| W1.1–W1.4 | masterplan W1, `.github/workflows/ci.yml`, API GitHub, checks PR | `main` sem proteção; rulesets vazio; checks históricos contraditórios | Aplicar proteção e exigir gates no mesmo SHA | Bloqueado até confirmação da API |

## Gates e resultados da baseline

| Comando/ambiente | SHA | Resultado | Evidência | Não prova |
|---|---|---:|---|---|
| `npm ci --no-audit --no-fund` | `90e40782` | PASS / 0 | `/tmp/waesy-w0-install.log` | não prova runtime |
| `npm run typecheck` | `90e40782` | PASS / 0 | `/tmp/waesy-w0-typecheck.log` | não prova persistência |
| `npm test -- --reporter=dot` | `90e40782` | PASS / 0 | `/tmp/waesy-w0-test-correct.log` | não prova provider/RLS/browser |
| `npm run build` | `90e40782` | PASS / 0 | `/tmp/waesy-w0-build.log`; client-leak OK | não prova navegação/produção |
| `npm test -- --runInBand` | `90e40782` | FAIL / opção inválida | Vitest rejeitou `--runInBand` | não é falha de aplicação; comando incorreto |
| GitHub protection | `90e40782` | FAIL / não protegido | `GET /branches/main/protection` = 404; rulesets = [] | não prova permissões de runtime |
| Cloudflare Pages | `90e40782` | deployment em execução/validar | projeto correto `usewaesy`; build `npm run build`, output `dist` | não prova todos os fluxos |

## Bloqueios e decisões

- W1 bloqueador confirmado: `main` não estava protegido e não havia ruleset.
- A configuração Cloudflare incorreta em `wider` foi desligada; `usewaesy` aponta para `EduardoChapeco/waesy`, preservando `waesy.com.br`.
- Não aplicar migrations em produção por inferência; W3/W12 exigem banco de teste/efémero e evidência de schema/RLS.
- Não tratar PR5/PR6 como concluídos enquanto não houver merge e gates no SHA final.
- Testes Vitest com `--runInBand` não devem ser usados; o comando canônico é `npm test`.

## Fechamento provisório

- Findings fechados com prova completa: nenhum ainda; W0 baseline local fechado parcialmente.
- Findings abertos/bloqueados: W1 governança; todas as ondas W2–W17 aguardam execução ordenada.
- Paths alterados nesta fase: documentação de auditoria e pacote metodológico; nenhum runtime alterado.
- Revisão adversarial: pendente após cada microfase; não declarar produção antes de CI, provider e smoke público.


## W2 — Segurança e advisories (execução delta)

- Preflight: branch `execute/w2-security-advisories`, base `origin/main` em `75b7177f`; worktree limpa; scope: `docs/specs/SPEC-W2-SECURITY-ADVISORIES.md`, migration `20270113000000_security_advisory_remediation.sql` e este ledger.
- Baseline runtime: 24 tabelas com RLS sem policy; `unified_listings_view` security definer; `dispatch_mining_cron` e `touch_document_artifact` com search_path mutável; 53 RPCs security-definer executáveis por anon; 509 FKs sem índices.
- Decisão: fechar primeiro os findings determinísticos de segurança P0/P1 com deny-by-default e sem tocar no contrato público de checkout/telemetry; a indexação de FKs fica para W3/PERF após plano gerado a partir do catálogo real.
- Migration: criada localmente; não aplicada diretamente em produção nesta sessão, conforme o protocolo de integridade. Nenhum finding é declarado fechado antes da evidência pós-migration.


## W3.3 — Tipos reais derivados do Supabase

- Preflight: branch `execute/w2-security-advisories`, SHA `cd5c3298`; scope ampliado explicitamente para `src/integrations/supabase/types.ts`, `docs/specs/SPEC-W3-SUPABASE-TYPES.md` e este ledger.
- Finding confirmado: `src/integrations/supabase/types.ts:9` continha `export type Database = any`.
- Ação: gerado o contrato pelo projeto Supabase Waesy `jfuebqmltksyznovhlwa` através da ferramenta autorizada `generate_typescript_types`; resultado persistido com 45.635 linhas e 1.426.638 bytes.
- Estado: typecheck de consumidores ainda pendente após a substituição; não declarar W3 fechado até validar typecheck, testes, build e revisão do diff.


## W3.2 — Drift de migrations

- Inventário local: 468 ficheiros de migration; colisões de prefixo em `20270106000000`, `20270107000000` e `20270109000000`.
- Estado: finding aberto; não renomear nem reordenar histórico aplicado sem Postgres efémero e replay completo.
- Evidência: `docs/audits/W3_SCHEMA_DRIFT.md`.


## W2 — Aplicação e validação em produção

- Migration `security_advisory_remediation_w2` aplicada com sucesso no projeto Supabase `jfuebqmltksyznovhlwa`.
- Evidência pós-aplicação: `policyless_rls=0`, `w2_policies=24`, `search_path_mutable=0`, `invoker_view=1`, `public_execute_restricted=0`.
- Advisories remanescentes: extensões `pg_trgm`/`btree_gist` em `public` e 50 funções SECURITY DEFINER ainda executáveis por `anon`; são contratos públicos/legados e ficam para uma matriz dedicada, não foram revogados por inferência.

## W4 — Persistência e idempotência do Copilot

- Finding alvo: retry gerava novo UUID, inseria outra mensagem e podia executar IA/cobrança novamente; o BFF não fazia replay da resposta persistida.
- Ação na branch `execute/w4-persistence-idempotency`: retry reutiliza a chave original; BFF procura `(thread_id, client_message_id, sender_id)` antes do pipeline; resposta persistida inclui a chave e o ID da mensagem de origem; mensagens falhadas podem ser reabertas sem novo registo.
- Estado: **fechado no código e integrado em `main` pelo PR #12**. Typecheck, 226 ficheiros/1.499 testes, build, CI remoto e Cloudflare Pages passaram. A validação funcional live de dois POSTs idênticos continua como teste operacional recomendado, não foi inventada como evidência.


## W5 — Copilot e chat funcional de ponta a ponta

- **W5.1:** fechado no código: drawer global usa `executeCopilotDrawerMessage` e já não importa `executeAiCopilotPipeline` no componente React.
- **W5.2/W5.3:** fechado parcialmente no código: rate limit/política guest, autorização por participante/atribuição/papel, enumeração restrita e teste unitário negativo/positivo adicionados.
- **W5.4:** fechado no contrato local: `rows`/`dataRows`, células numéricas/objeto e CSV são normalizados sem fixtures sintéticos; Places deixa de inventar `rating=4.8` e `is_open=true`.
- **W5.5:** `open_place`, pin e archive têm handlers BFF/UI; ações não implementadas continuam a mostrar aviso explícito em vez de fingir sucesso.
- **W5.6:** troca de thread, retryable failure e limpeza de estado foram corrigidos; SSE/provider abort e browser E2E permanecem bloqueados à validação de staging real.
- **Gates locais:** typecheck PASS; 227 ficheiros/1.501 testes PASS; build Cloudflare PASS; `git diff --check` PASS.
- **Estado:** **fechada no código e integrada em `main` pelo PR #14**. CI e Cloudflare Pages passaram no SHA final. Browser E2E, abort real do provider e validação com dois utilizadores no Supabase de staging permanecem explicitamente como integração operacional pendente; não são inferidos pelo build.

## Retomada 2026-10-07 — reconciliação do estado real
- **Fonte histórica lida:** tarefa referenciada `e0909yp9czEANqGuDQRQvR`, ledger entregue `20261007-holistic-execution-ledger.md` e arquivo de execução anexado.
- **Checkout atual verificado:** repositório `EduardoChapeco/waesy`, branch `execute/waesy-resumption-2026-10-07`, base `main`, HEAD inicial `67a056a325180b4257571e64e0a9e9374f1458a0`, worktree limpo antes deste registro.
- **Estado remoto observado:** PR #7 aberto, branch `docs/waesy-holistic-remediation-2026-10-06` em `a57eda21`; checks de `main` no SHA `67a056a3`: `5 Quality Gates=success` e `Cloudflare Pages=success`; proteção de `main` não confirmada porque a API respondeu HTTP 401 sem credencial.
- **Reconcilição crítica:** o ledger histórico relata alterações locais não commitadas das W7/W8 e provas locais posteriores, mas esses paths não estão no checkout atual. Portanto tais resultados são evidência histórica, não estado implementado neste SHA; nenhum W7/W8 é herdado como concluído sem revalidação.
- **Regra de preservação:** não foram descartados nem sobrescritos diffs; não havia diffs locais neste checkout. O arquivo anexado exige execução no repositório Waesy, ledger por microfase, testes negativos e não declarar produção sem prova.
- **Próxima microfase:** W8.1, preflight contra route tree, entry points, BFF, autorização e testes reais deste SHA; W8.2 só pode avançar depois de W8.1.

### W8.1/W8.2/W8.3 — Preflight de retomada no SHA 67a056a3
- **Leituras concluídas antes da edição:** `AGENTS.md`, skill de integridade, cartões W8.1–W8.3 do masterplan, template do ledger, route tree, `workspace.builder.$documentId.editor.tsx`, entry points CMS/bio/vitrine, `builder.functions.ts`, `omni-builder.functions.ts`, `_store.paginas.$slug.tsx`, `chat-artifact-card.tsx`, migration `0048_builder_platform_core.sql` e testes existentes de builder/Omni.
- **W8.1 reprodução:** `ChatArtifactCard` enviava artefatos para `/workspace/builder?doc=...` e `/workspace/builder?artifactId=...`, destinos sem a rota canônica `$documentId/editor`; entry points de CMS já apontavam para o editor canônico.
- **W8.2 reprodução:** `getOmniPageDocument` consultava `experience_documents` apenas por UUID, sem `store_id`; save/get usavam `settings.omni_page` sem versionamento em `experience_versions`; falha de resolução do loader podia ser convertida em documento vazio.
- **W8.3 reprodução:** save/publicação compartilhavam `settings.omni_page`; a rota pública renderizava esse snapshot, permitindo que draft substituísse o conteúdo público.
- **Escopo autorizado:** corrigir links para o destino canônico, reforçar filtro de tenant no get Omni, separar `omni_page_draft`/`omni_page_published`, fazer editor reabrir draft e vitrine renderizar apenas published; não aplicar migration nem alterar produção.
- **Finding W8.1-01:** confirmado em código; rota stale no cartão de artefato. Correção aplicada em `chat-artifact-card.tsx`.
- **Finding W8.2-01:** confirmado em código; leitura Omni sem filtro de tenant. Correção aplicada em `omni-builder.functions.ts`; versionamento transacional completo continua aberto.
- **Finding W8.3-01:** confirmado em código; draft podia vazar para público. Correção aplicada em `omni-builder.functions.ts`, `workspace.builder.$documentId.editor.tsx` e `_store.paginas.$slug.tsx`.
- **Limitações:** ainda não há prova DB/RLS com dois tenants, browser de deep-link, reload em nova sessão, rollback, cache/CDN ou publicação real; não marcar W8.2/W8.3 como concluídas antes dos gates.

### W8 — Revalidação final e estado atual
- **Finding adicional W8.1-02:** revisão adversarial encontrou `previewUrl` stale em `autonomous-copilot-orchestrator.ts`; corrigido para `/workspace/builder/:documentId/editor`.
- **Gates finais locais:** build de produção passou; `check-client-server-leak` passou; typecheck passou; `git diff --check` passou; regressão completa passou com **227 arquivos e 1501 testes**; revalidação direcionada passou com **3 arquivos e 39 testes**; busca de `workspace/builder?doc` e `workspace/builder?artifactId` não encontrou ocorrências.
- **Estado W8.1:** correções de convergência de entry points aplicadas e revalidadas estaticamente; deep-link real em browser ainda não provado.
- **Estado W8.2:** filtro de tenant no `getOmniPageDocument` aplicado; persistência ainda não é versionamento transacional em `experience_versions`, portanto a microfase permanece **parcial/bloqueada**.
- **Estado W8.3:** draft e published foram separados no snapshot Omni; editor lê draft e rota pública lê somente published; publicação real, reload entre sessões, rollback e cache/CDN ainda não provados.
- **Decisão de produção:** não publicar, não fazer deploy e não marcar produção verde sem as provas ausentes e sem resolver o versionamento canônico.

### W13 — Design system e regressão visual (2026-10-07)
- **Evidência:** `node scripts/design-lint.mjs --changed` terminou com P0=0, P1=0, P2=0, P3=0 em 16 arquivos; `node scripts/token-sync.mjs --check` confirmou 134 tokens, 0 aliases quebrados e paridade 100% com `src/styles.css`.
- **Correções:** checkout turístico normalizado para tokens/classes canônicas, foco visível, targets de 44px, movimento reduzido e placeholder SVG sem hex literal; sem alteração da baseline.
- **Testes:** 16 testes de design/acessibilidade/travel passaram; typecheck passou.
- **Estado:** fechada em código e validação local; screenshot/browser visual ainda não inferido.

### W14 — Qualidade dos testes e gates (2026-10-07)
- **Evidência:** suíte completa `npm test` passou com 233 arquivos e 1.527 testes; typecheck, lint, build, client-leak guard e `git diff --check` passaram no mesmo working tree.
- **Matriz:** `docs/audits/20261007-w14-evidence-matrix.md` separa unit, contract harness, integration DB, browser E2E, CI e production smoke.
- **Finding:** vários testes chamados E2E são contract harness em memória; isso está explicitamente classificado, não promovido a E2E real.
- **Estado:** gates locais fechados; integração com Postgres/Storage/provider e browser E2E continuam pendentes.

### W15 — Observabilidade e redaction (2026-10-07)
- **Correções:** criado `src/lib/telemetry/operational-logger.ts` com contexto request/trace/job/conversation/tenant, redaction recursiva de segredo/conteúdo e envelope estruturado; AI Gateway integrado nos erros de provider e persistência de telemetria.
- **Evidência:** `operational-logger.test.ts`, `error-correlator.test.ts`, `ai-core-gateway.test.ts` e `whatsapp-w11-webhook.test.ts`: 18 testes passaram; typecheck passou.
- **Limite:** ainda há logs legados fora dos fluxos tocados; migração total para logger estruturado e alertas/SLO conectados a infraestrutura real exigem uma etapa operacional adicional.
