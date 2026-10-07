# Inventário de Remediação — W7 WhatsApp, Webhooks, Outbox, Flows e Providers

**Data da auditoria:** 2026-10-07  
**Repositório:** `EduardoChapeco/waesy`  
**Frente solicitada:** W7 — WhatsApp, webhooks, outbox, flows e providers. No masterplan holístico, esta frente corresponde principalmente à onda **W11 — WhatsApp: webhooks e outbox duráveis** (masterplan, linhas 211–221), com dependências transversais de W2 (tenant/autorização), W3 (schema/migrations), W4 (persistência/FSM), W14 (testes), W15 (observabilidade) e W16/W17 (integração/deploy).  
**Regra de operação:** auditoria somente leitura. Nenhum arquivo de código foi editado, nenhum commit/cherry-pick/push/deploy/migration foi executado.

## 1. Snapshot, base e risco de mistura

| Item | Evidência observada | Classificação |
|---|---|---|
| Branch atual | `audit/full-remediation-20261007` | Confirmado |
| `HEAD` | `fc8f9fc348389029d6e2ac84c5f37a06b0347f30` (`audit: make voucher document apply atomic`) | Confirmado |
| Base local comparada | `origin/main` = `919c86881db1ce83de3feae7fcf7df5aadb58b7d` | Confirmado |
| Commits locais recentes | `fe0417ae` e `fc8f9fc`, ambos relacionados ao fluxo de viagem/voucher, não à implementação WhatsApp | Confirmado pelo log; ownership funcional deve ser preservado |
| Worktree | Sem arquivos modificados rastreados; existem somente não rastreados documentais: `docs/audits/LEDGER-20261007-FULL-REMEDIATION.md`, `docs/audits/full-remediation-inventory/` e a spec de execução | Confirmado |
| Referência histórica do masterplan | O snapshot diz que PRs antigos foram mesclados com checks falhos/cancelados, PRs #5/#6 estavam abertos e não havia prova de deploy; isso é histórico do snapshot, não prova do `HEAD` atual | Histórico, não revalidado no GitHub nesta sessão |
| Branches/PRs remotas | O masterplan lista branches paralelas (`feat/whatsapp-wave1-8-complete-release`, recovery, recursive remediation etc.). A spec proíbe incorporação automática | Risco de mistura; nenhum cherry-pick feito |

**Gate de isolamento:** o relatório não deve ser interpretado como validação de qualquer commit da antiga `feat/whatsapp-wave1-8-complete-release` nem como prova de que PR #3 foi corrigido. O código avaliado é o presente no `HEAD` acima, e não o SHA histórico do PR3 (`557e1bf...`) citado pelo masterplan.

## 2. Evidência executada nesta auditoria

| Evidência | Resultado | O que prova / não prova |
|---|---|---|
| `npx vitest run` nos cinco arquivos WhatsApp | **35/35 testes passados**, 5 arquivos | Prova contratos/normalizadores/adapters e testes estáticos locais; não prova Supabase/RLS/provider/browser real |
| `npm run typecheck` | **Exit 0** no `fc8f9fc` | Prova compilação TypeScript atual; não prova semântica, persistência ou runtime de provider |
| Inspeção de rotas, serviços, migrations e testes | Executada com linhas abaixo | Prova de presença/ausência de lógica no código; não prova execução em ambiente externo |
| `git status`, `rev-parse`, `git log` | Executados | Prova de branch/SHA/base e ausência de mutações de código desta auditoria |
| Postgres efêmero, RLS com JWT, browser, provider real, staging/deploy | **Não executados** | Estado não verificado |

## 3. Mapa de implementação real

- **Meta webhook:** `src/routes/api.webhooks.whatsapp.ts:9,104-541`. Handshake GET, assinatura HMAC no POST, resolução de credenciais por `phone_number_id`, inbox, leads, identity, thread, `chat_messages`, flows inbound e delivery callbacks.
- **Evolution/WaSender webhook:** `src/routes/api.webhooks.whatsapp.evolution.$instance.ts:4-10` e `src/routes/api.webhooks.whatsapp.wasender.$instance.ts:4-10`; ambos delegam em `handleUnofficialWhatsAppWebhook`.
- **Boundary unificado de providers:** `src/services/whatsapp-provider-webhook.server.ts:8-171`; normalização, assinatura, deduplicação de provider events, persistência de inbound/delivery e dispatch de flows.
- **Outbox worker:** `src/routes/api.internal.whatsapp-outbox-worker.ts:5-34` e `src/services/whatsapp-outbox.worker.ts:149-233`; token interno, RPC de claim, lease, circuit breaker, adapter, attempts e retries/dead-letter.
- **Adapters:** `src/services/whatsapp-outbound-adapters.server.ts`; Meta, Evolution e WaSender com classificação de erro.
- **Flows/campanhas:** `src/services/whatsapp-automation.runtime.server.ts:43-82` e `src/services/whatsapp-automation.functions.ts:8-114`.
- **Schema:** `supabase/migrations/20261006000002_whatsapp_inbox_delivery_and_outbox.sql`, `20261006000003_whatsapp_worker_and_channel_instances.sql`, `20261006000004_whatsapp_security_provider_metrics.sql`, `20261006000005_whatsapp_identity_flows_campaigns.sql`, `20261006000008_wave4_outbound_provider_adapters.sql`, `20261006000009_wave6_webhook_delivery_isolation.sql` e `20270110010000_whatsapp_webhook_idempotency.sql` (esta última deve ser aplicada/reconciliada em banco antes de qualquer conclusão).

## 4. Findings

### W7-F01 — Vocabulário de provider oficial incompatível entre inbound, identity, instance, campaign e worker

**Estado:** **Confirmado no código atual; integração não verificada.**  
**Severidade sugerida:** P1/high, por risco de perda de roteamento e entrega.

**Evidência:**

- `src/routes/api.webhooks.whatsapp.ts:9` fixa `WHATSAPP_PROVIDER = "whatsapp_cloud_api"`.
- A mesma rota resolve a instância oficial em `:284-290` com `provider = "meta_cloud_api"`, mas chama `resolveWhatsAppIdentity` em `:291-298` com `provider = "whatsapp_cloud_api"`.
- `supabase/migrations/20261006000003_whatsapp_worker_and_channel_instances.sql:46-53` aceita `meta_cloud_api` como provider da instância oficial.
- `src/services/whatsapp-outbox.worker.ts:149-157` exige que `row.provider` seja igual ao provider da instância selecionada.
- `src/services/whatsapp-automation.functions.ts:87-99` força campanhas a `meta_cloud_api`, enquanto o identity criado pelo webhook pode ficar em `whatsapp_cloud_api`.
- O masterplan documenta o mesmo drift como `PR3-F01` (linhas 618–637), originalmente observado no PR histórico; a leitura do `HEAD` atual confirma que a divergência nominal continua presente.

**Impacto:** uma identidade oficial pode não ser encontrada pela audiência/campanha; uma outbox criada com `whatsapp_cloud_api` não casa com a instância `meta_cloud_api` e cai em `INVALID_CHANNEL_INSTANCE`; configuração nova e caminho legado podem selecionar tabelas/credenciais diferentes.

**Não verificado:** se o banco remoto contém dados normalizados, aliases/triggers ou migration posterior que neutralizem o drift. A migration `20270110010000_whatsapp_webhook_idempotency.sql` também não foi aplicada em banco nesta auditoria.

### W7-F02 — Runtime de flows não executa o grafo declarado; edges, trigger e ordem semântica são ignorados

**Estado:** **Confirmado no código; impacto de produção não verificado.**  
**Severidade sugerida:** P1/high.

**Evidência:** `src/services/whatsapp-automation-runtime.server.ts:45-53` seleciona workflows ativos e filtra somente `channel`, `trigger_type`, status, loja e instância. Os nós `condition` são avaliados por `nodes.filter(...)` (`:51-52`), mas `entry_conditions`, trigger específico e `edges` não controlam a execução. Em `:57-72`, todos os nós `type === "action"` são executados na ordem do array, sem seguir `source -> target`, sem rejeitar ciclos/órfãos e sem validar que o caminho começa no trigger.

**Impacto:** um flow visualmente configurado com ramificação/ordem diferente pode executar ações fora do caminho; nós desconectados podem ser executados. `send_text` vazio é simplesmente ignorado em `:64-67`, mas o run segue para `completed` em `:73`.

**Teste atual:** `src/services/whatsapp-automation.contracts.test.ts:5-16` confirma apenas que um JSON com nodes/edge é aceito; não demonstra que as edges são respeitadas. Não existe teste de execução com grafo divergente, nó desconectado, condição falsa/verdadeira ou retry real.

### W7-F03 — Idempotência de flow é derivada de `run.id`, portanto redelivery pode criar nova outbox

**Estado:** **Confirmado no código; concorrência/DB não verificados.**  
**Severidade sugerida:** P1/high.

**Evidência:** `src/services/whatsapp-automation-runtime.server.ts:53-54` insere um novo `whatsapp_flow_runs` por dispatch. A chave de outbox em `:67` é `flow:${flow.id}:run:${run.id}:node:${node.id}`. O schema em `20261006000002...sql:72-90` garante unicidade da chave, mas como `run.id` muda a cada redelivery, a constraint não deduplica o mesmo evento lógico.

**Contraste:** os handlers atuais contêm guardas de duplicata (`api.webhooks.whatsapp.ts:273-275`; `whatsapp-provider-webhook.server.ts:121-123`). Isso é **melhoria aparente/código presente**, mas não substitui um claim transacional/lease: `ignoreDuplicates` pode retornar `data = null`, e não há teste de duas requisições reais contra Postgres provando que exatamente uma delas executa o flow.

**Histórico:** corresponde a `PR3-F03` do masterplan (linhas 656–671). O finding histórico não deve ser marcado como corrigido somente porque a guarda textual existe.

### W7-F04 — Campanha `messageType=text` aceita corpo ausente e enfileira `{text: ""}`

**Estado:** **Confirmado no código e reproduzível por contrato; não verificado em banco/provider.**  
**Severidade sugerida:** P1/medium-high.

**Evidência:** `src/services/whatsapp-automation.functions.ts:54-57` não exige texto para `messageType === "text"`. Em `:97-100`, o payload é `{ text: campaign.description || "" }`; `description` é descrição administrativa opcional, não campo de mensagem. O adapter rejeita texto vazio em `src/services/whatsapp-outbound-adapters.server.ts:63-76`. A migration `20261006000005...sql:79-99` não possui coluna `message_text`/`text` própria.

**Teste negativo ausente:** `whatsapp-automation.contracts.test.ts` cobre template sem nome (`:41-44`), mas não `text` sem corpo. O caso exigido pelo masterplan `PR3-F04` permanece aberto.

### W7-F05 — Outbox/worker tem fronteiras de escrita parcial e estados que não equivalem a entrega externa

**Estado:** **Confirmado no código; resultado real de provider e persistência posterior não verificados.**  
**Severidade sugerida:** P1/high.

**Evidência:**

- `src/services/whatsapp-outbox.worker.ts:169-179` chama adapter, atualiza outbox para `accepted`, grava delivery event, eventualmente insere `chat_messages` e registra attempt. Os writes posteriores não checam/propagam erro (`:171-179`); se o provider aceitou e uma escrita local falhar, o item pode ficar aceito sem trilha completa.
- O status `accepted` é confirmado pelo retorno do adapter, não por callback externo. `whatsapp-provider-webhook.server.ts:92-111` e Meta route `:474-520` processam callbacks depois, mas não há prova de que todo provider retorne/entregue callback com contrato consistente.
- A migration `20261006000002...sql:8` dá default `delivery_status = 'sent'` para `chat_messages`; portanto qualquer caminho legado que insira sem explicitar status pode representar sucesso falso. O worker atual explicita `accepted` em `:177`, mas o caminho histórico/legado deve permanecer bloqueado até inventário completo de callers.
- `finalizeFailure` (`:121-145`) faz updates múltiplos sem validar contagem/erro de cada write; uma falha ao atualizar recipient/campaign não é transformada em erro operacional.

**Dependências:** fechamento exige W4 (FSM/atomicidade), W3 (schema real) e teste de fault injection com Postgres.

### W7-F06 — Callers/caminhos paralelos não foram demonstrados como eliminados

**Estado:** **Confirmado como risco arquitetural; existência de tráfego de produção não verificada.**  
**Evidência histórica:** o masterplan `PR3-F02` documenta `sendChatMessage -> sendWhatsAppNotification` em `src/services/chat.functions.ts` e `src/services/integrations.functions.ts` como caminho direto fora do worker. O snapshot atual contém esses arquivos no repositório; nesta auditoria não foi declarado que o caminho foi removido, porque não houve inventário exaustivo de todos os callers nem teste de integração do reply.

**Ação de verificação necessária:** localizar todos os writes em `whatsapp_outbox`, `chat_messages` com `channel = whatsapp` e chamadas a `sendWhatsAppNotification`; cada reply deve produzir uma única intenção idempotente, associada a `channel_instance_id`, sem `fetch` direto no BFF.

### W7-F07 — Assinatura/replay e redaction têm cobertura unitária, mas não há prova de boundary real

**Estado:** **Parcialmente confirmado: código e testes locais presentes; integração não verificada.**

**Evidência positiva:**

- Meta verifica assinatura do corpo bruto em `api.webhooks.whatsapp.ts:175-220` e limita payload em `:170-177`.
- Providers não oficiais verificam segredo/assinatura em `whatsapp-provider-webhook.server.ts:142-169`.
- Redaction é aplicado em Meta (`:266`, `:468`) e normalizadores não oficiais (`whatsapp-provider-webhook.server.ts:67`, `:76`).
- `whatsapp-w11-webhook.test.ts:16-26` cobre ausência, replay de 301s e HMAC válido; `whatsapp-wave8-security.test.ts:20-30` cobre redaction; 13 testes de falha HTTP cobrem retryable/permanente.

**Lacunas:** não foi testada a associação assinatura -> instância -> tenant com múltiplas credenciais reais; não foi testado header/algoritmo oficial de cada provider contra payload real; não foi executado replay concorrente em Postgres; o teste `whatsapp-w11-webhook.test.ts:29-35` verifica strings do fonte, não efeitos.

### W7-F08 — RLS e claim server-only estão definidos em SQL, porém sem execução contra banco

**Estado:** **Confirmado no SQL; RLS efetiva não verificada.**

**Evidência:** inbox/delivery/outbox têm `ENABLE/FORCE ROW LEVEL SECURITY` e deny para `anon, authenticated` em `20261006000002...sql:99-116`; attempts/instances/audit têm equivalente em `20261006000003...sql:147-162`; a RPC `claim_whatsapp_outbox` exige `service_role` em `:101-145`. Isso atende a intenção de isolamento server-only.

**Lacunas:** não foi aplicado o conjunto de migrations em Postgres vazio; não foram testados `anon`, `authenticated`, usuário A/B, lojas cruzadas e `service_role`; não foi verificado `search_path`, grants existentes e efeito de migrations anteriores/posteriores. A política SQL não é prova de runtime.

### W7-F09 — Observabilidade/LGPD técnica é reforçada, mas prontidão operacional/jurídica permanece aberta

**Estado:** **Confirmado no código/documentos para minimização; não verificado em operação.**

`docs/WHATSAPP_WAVE8_SECURITY_LGPD_AUDIT_2026-10-06.md:6-24` e `src/services/whatsapp-outbox.worker.ts:45-60,217-231` registram redaction, heartbeat, attempts e circuit breaker. A auditoria histórica também declara 26 testes e ausência de carga contra staging. Permanecem não verificadas: retenção/eliminação, base legal por finalidade, DPA/transferência de Meta/Evolution/WaSender, RIPD, runbook de incidentes e correlação de logs por tenant em ambiente executando.

## 5. Distinção de evidência

### Confirmado no código/teste atual

1. Branch/SHA/base e ausência de mutações de código nesta auditoria.
2. `npm run typecheck` verde no SHA atual.
3. 35 testes WhatsApp focados verdes, todos unitários/contratuais/estáticos; nenhum é E2E real.
4. Drift `whatsapp_cloud_api` versus `meta_cloud_api` entre webhook/identity e instance/campaign/worker.
5. Runtime ignora `edges` para ordenar/selecionar ações e permite no-op `completed`.
6. Idempotency key de flow inclui `run.id` novo.
7. Campanha text usa `description || ""` e schema não exige corpo.
8. Migrations declaram RLS fail-closed, claim com `SKIP LOCKED` e outbox lease; efetividade do banco não foi provada.

### Histórico/documental

- `PR3-F01` a `PR3-F04` e `PR3-F03` estão descritos no masterplan nas linhas 618–688, referentes ao diff histórico do PR #3. Foram usados como hipóteses/rastreabilidade e reapresentados somente quando o código atual confirmou o padrão.
- `docs/WHATSAPP_INTEGRATION_AUDIT_2026-10-06.md` e `docs/WHATSAPP_WAVE8_SECURITY_LGPD_AUDIT_2026-10-06.md` afirmam reforços das ondas 7/8 e testes locais. Essas afirmações não equivalem a integração com provider real, banco remoto, browser, CI ou deploy.
- O masterplan declara explicitamente que não houve aplicação de migration, alteração de runtime, RLS remoto, deploy ou confirmação de provider real (linhas 51–56).

### Hipótese / não verificado

- Se aliases ou dados de produção neutralizam o drift de provider.
- Se duas entregas concorrentes atravessam o guard de `ignoreDuplicates` e geram dois flow runs/outbox.
- Se o caminho de reply legado ainda é alcançável pela UI atual.
- Se as migrations, grants, RPCs e RLS estão aplicadas exatamente no Supabase remoto.
- Se Evolution/WaSender aceitam os headers, timestamp e formato de assinatura implementados para cada instalação real.
- Se callbacks externos são recebidos e correlacionados monotonicamente para todos os adapters.
- Se falhas parciais nos writes do worker deixam inconsistência real no banco.
- Deploy público, Cloudflare, CI do SHA atual, carga e smoke de produção.

## 6. Microfases atômicas propostas e gates

| Microfase | Escopo mínimo | Gate de saída |
|---|---|---|
| **W7.0 — Congelar e reconciliar** | Ledger com SHA/base/status, diff de branches, inventário de callers e paths, sem incorporar PR/branch remota | Nenhum path de código remoto entra sem diff/ownership; IDs W7-F01..F09 classificados |
| **W7.1 — Canonicalizar provider/instance** | Escolher um enum canônico; alinhar Meta webhook, identity, thread, campaign, outbox, worker e adapters; migration/backfill somente após aprovação | Contract test webhook -> identity -> campaign/flow -> outbox -> worker; negativo com provider incompatível; schema/constraint e banco efêmero verdes |
| **W7.2 — Claim idempotente inbound** | Centralizar claim de mensagem/status por `(store, provider, instance, event_key)` com lock/lease; dispatch somente após claim | Duas requisições concorrentes e replay sequencial geram 1 evento, 1 mensagem/lead, 1 flow run e 1 outbox; caso `received/failed` recupera sem duplicar |
| **W7.3 — Executor de grafo de flows** | Validar trigger, edges, nós alcançáveis, condições e ciclo; executar transições persistidas; derivar idempotência de evento + workflow + node, não run | Testes de grafo conectado/desconectado, condição falsa/verdadeira, ciclo, nó inválido, retry/replay e reload; nenhum no-op marca completed sem política explícita |
| **W7.4 — Outbox como única intenção outbound** | Remover/encapsular `fetch` direto legado; reply cria intenção pendente com instance ID; writes de sucesso/falha e chat message têm contrato atômico/compensável | Provider 2xx, 4xx, 5xx, timeout, erro entre writes, retry e dead-letter; status local nunca é `sent` antes da confirmação definida; exatamente uma linha por idempotency key |
| **W7.5 — Campanhas e consentimento** | Adicionar `messageText`/contrato equivalente para text; validar trim/min(1), persistir campo próprio e impedir materialização vazia; revisar audience filter | Schema negativo text sem corpo; positivo preserva corpo; campanha sem audiência/consentimento não cria outbox; pausa/retry/reload coerentes |
| **W7.6 — Security/RLS/provider contract** | Aplicar migrations em Postgres efêmero desde zero, testar grants/RLS por role/tenant e headers HMAC de cada provider | `anon`/`authenticated` não leem/escrevem; A não acessa B; service role limitado; replay/assinatura inválida não produz efeitos |
| **W7.7 — Observabilidade e integração** | Correlation IDs tenant/instance/event/outbox/attempt, redaction, retenção aprovada, carga somente staging autorizado | Fault injection e carga em staging, P95/status/attempts, busca de incidente; documentos LGPD e runbook aprovados |
| **W7.8 — Fechamento independente** | Revisor adversarial não autor da implementação reexecuta positivo/negativo, browser e reload | Typecheck, testes, lint/design, build, CI no SHA exato, browser E2E e provider/staging rotulados separadamente; nenhum finding chamado “produção” sem smoke observado |

## 7. Decisão de auditoria

**Veredito:** a frente está em remediação, não pronta. Há reforços reais no código (assinatura/replay básico, redaction, adapters, lease/claim, circuit breaker e testes locais), mas não há prova end-to-end e permanecem defeitos confirmados de contrato/semântica: principalmente o drift de provider, o executor de flows que ignora edges, a idempotência baseada em `run.id` e campanha text sem corpo. Typecheck e 35 testes verdes não fecham nenhum finding de integração.

**Dependências/bloqueios:** decisão de provider canônico; inventário de callers legado; ambiente Postgres efêmero com todas migrations; credenciais/instâncias de staging para Meta/Evolution/WaSender; definição de semântica `accepted/sent/delivered`; política de retenção/base legal LGPD; revisor adversarial independente. Não aplicar migration em produção, não mesclar branches remotas e não declarar deploy/produção até os gates correspondentes serem observados.
