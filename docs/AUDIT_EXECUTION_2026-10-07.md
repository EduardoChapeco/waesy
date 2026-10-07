# Auditoria de Execução Waesy — 2026-10-07

## Escopo

Auditoria do checkout canônico `EduardoChapeco/waesy`, branch `main` no commit `919c8688`, confrontada com o plano `SPEC-MASTER-COPILOT-AUTONOMOUS-ENGINE` anexado pelo usuário. O foco inicial foi a plataforma inteira (stack, rotas, serviços, migrations, testes e gates) e a validação profunda do Copilot, persistência de execução, RLS, idempotência e UI.

## Inventário confirmado

- **Stack:** React 19, TanStack Router/Start, Vite 8, Tailwind v4, Nitro/Cloudflare Pages, TypeScript 5.8 strict, Vitest 4, Supabase/Postgres.
- **Topologia registrada:** 1.837 arquivos em `src/`, distribuídos entre componentes, rotas, serviços, libs, tipos, hooks e registries.
- **Persistência:** migrations Supabase em `supabase/migrations/`; contratos gerados em `src/integrations/supabase/types.ts`.
- **Copilot:** `ai-conversations.functions.ts`, `autonomous-copilot-orchestrator.ts`, `copilot-execution-persistence.ts`, `copilot-fsm.ts`, `ai-chat-shell.tsx`, `waesy-copilot-drawer.tsx`, `ai-activity-trail.tsx`, `chat-artifact-card.tsx`.
- **IA e ferramentas:** gateway/pool de modelos, MCP registry/server, mineração de Places/CNPJ/DataJud/notícias/PNCP e persistência de execuções/steps.
- **Documentos de auditoria existentes:** inventário de repositório, runtime, banco, contratos, chat, skills, engines, integrações, filas, storage, threat model, observabilidade, cobertura, duplicação, arquitetura atual/alvo, plano de migração e pesquisa de ecossistema.
- **Referência MagicAI:** `docs/MAGICAI_GAP_ANALYSIS_2026-10-05.md`, usada como referência estrutural de timeline, artefatos, redesign incremental e evolução do runtime.

## Achados críticos confirmados no código

1. **RLS de steps incompleta:** a policy anterior permitia leitura de `copilot_execution_steps` somente pela existência do `execution_id`, sem repetir ownership, tenant ou papel do registro pai.
2. **Estado fantasma:** a persistência iniciava execuções com `current_phase = PLANNING`, embora `PLANNING` não exista na FSM canônica de 13 fases.
3. **Status incorreto em falhas:** o insert da resposta AI marcava a mensagem como `delivered` mesmo quando a execução terminava em `FAILED_RETRYABLE` ou `FAILED_FINAL`.
4. **Falha de gravação podia deixar mensagem do usuário em `sending`:** quando o insert da resposta falhava, não havia atualização compensatória do registro do usuário.
5. **Reply incompleto:** `replyToId` chegava ao BFF, mas não era incluído no payload persistido da resposta.
6. **Contratos de ação ainda incompletos:** o fullscreen registra apenas `open_place`; o dispatcher server-side aceita somente quatro ações mutáveis. A superfície estruturada ainda precisa de uma matriz única de ações, fallback seguro e aprovação humana para efeitos de alto impacto.
7. **Gates de schema:** existem três pares históricos de migrations com versões duplicadas, independentes desta branch: `20270106000000`, `20270107000000` e `20270109000000`. A migration desta branch foi nomeada com timestamp único.
8. **Qualidade global:** lint passa sem erros, mas reporta 7.832 warnings, predominantemente `no-explicit-any`, blocos vazios e `prefer-const`.
9. **Performance:** build passa, mas há chunks grandes, incluindo o router SSR (~5,4 MB), mapas, ícones e bundle principal; isso deve ser tratado com code-splitting direcionado, não com aumento silencioso do limite.

## Correções aplicadas nesta branch

Branch: `fix/copilot-p0-integrity-2026-10-07`

- Adicionada `supabase/migrations/20261007130100_copilot_execution_steps_rls_fix.sql` para fazer a policy dos steps herdar a autorização do registro `copilot_executions`.
- `startCopilotExecution` agora grava `RECEIVED`, uma fase oficial da FSM.
- Steps sem fase explícita mantêm a execução em `RUNNING`, evitando `NULL` e estados fantasmas.
- Mensagens de resposta com falha são persistidas como `failed`, não `delivered`.
- Falha ao inserir a resposta marca a mensagem do usuário como `failed` com timestamp e erro sanitizado.
- `replyToId` passou a ser persistido no payload canônico da resposta.
- Testes de persistência foram ampliados para proteger `RECEIVED` e `RUNNING`.

## Validação executada

| Gate | Resultado |
|---|---|
| Testes focados do Copilot | **46/46 passaram** |
| Suíte completa Vitest | **236 arquivos, 1.541 testes passaram** |
| Typecheck | **Passou, exit code 0** |
| Build produção | **Passou, exit code 0** |
| Client/server leak | **Passou: 492 chunks verificados, 0 runtime server-side no client** |
| Lint | **Passou sem erros; 7.832 warnings existentes** |
| `git diff --check` | **Passou** |
| `check:schema` | **Falha somente pelos 3 pares de migrations duplicadas históricas** |
| `check:types-ssot` | Deve ser executado isoladamente após a normalização dos duplicados históricos |

Warnings de ausência de credenciais nos testes foram tratados como falhas honestas/fallbacks controlados; não foram convertidos em dados fictícios.

## Backlog priorizado para continuar a evolução

### P0 — bloquear antes de ampliar autonomia

- Criar um **dispatcher único de ações** para Drawer e fullscreen, com schemas específicos por ação, allowlist de rotas, autorização server-side, audit log e estado `WAITING_APPROVAL` para publicação, booking, demanda jurídica, corrida e qualquer mutação.
- Implementar upload multimodal real no Copilot: Storage isolado por tenant, validação de MIME/tamanho, antivírus/scan, extração de texto e proveniência.
- Tornar as escritas chat + execução + artefato + memória atômicas ou coordenadas por saga/outbox; nenhum erro de persistência pode ser ignorado.
- Certificar RLS em runtime com testes de dois tenants e sessão autenticada, incluindo realtime de `copilot_execution_steps`.
- Remover defaults de negócio apresentados como fato; toda saída externa deve carregar `source_ids`, `provenance`, `synthetic`/`estimated` e falhar honestamente quando a fonte não estiver disponível.
- Alinhar artefatos do Copilot com o Builder: `experience_document_id`, `experience_versions` e `experience_nodes` devem ter um contrato único.

### P1 — integridade e escala

- Persistir `request_id/clientMessageId` em todas as ações mutáveis e criar receipts/constraints para retry seguro.
- Implementar cancelamento propagado até provider, SSE consumido pela UI principal, checkpoint e resume real.
- Evoluir o orquestrador linear para DAG de subagentes com dependências explícitas, concorrência limitada, critic/synthesizer e parada humana P0.
- Fechar paginação/cursor, DTOs completos e consistência de `last_message_snippet/last_message_at`.
- Corrigir as migrations históricas duplicadas com estratégia segura de produção: inventariar quais já foram aplicadas, escolher canonical names e registrar aliases; não renomear arquivos aplicados sem plano de migração.
- Reduzir warnings do lint por domínio, começando por serviços críticos e fronteiras de segurança.
- Dividir os maiores bundles por rota e provider, medir tamanho gzip e estabelecer orçamento por rota.

### P2 — refinamento de produto

- Timeline agrupada por subagente, visualizador de artefatos expandido e comparação de versões.
- Catálogo de skills com capabilities, limites, custo, latência, proveniência e health status.
- Benchmark de tarefas reais do Waesy com critérios de sucesso determinísticos e avaliação adversarial.
- Observabilidade operacional: correlation id, custo real do gateway, métricas de filas, retries, dead-letter e latência por ferramenta.

## Conclusão

O Waesy possui uma base ampla, uma arquitetura documentada e gates maduros, mas os documentos positivos anteriores não devem ser tratados como prova de prontidão do Copilot autônomo. A validação desta execução confirmou que o núcleo compila e tem cobertura de testes forte, enquanto segurança de realtime, aprovação humana, upload, atomicidade, provenance e dispatcher único ainda são trabalho de produção. A branch atual fecha correções P0 objetivas sem mascarar as lacunas restantes.

## Segunda onda — dispatcher de ações do Copilot

Após a primeira validação, foi corrigida uma divergência real entre as duas superfícies do Copilot:

- O fullscreen agora usa `dispatchAiChatAction` para `add_to_cart`, `request_travel_quote`, `submit_legal_demand` e `publish_ad`.
- Navegação interna aceita somente paths relativos iniciados por `/`, evitando URLs externas/injeção de destino.
- O Drawer deixou de executar mutações diretamente e de fabricar defaults como Chapecó, telefone, textos genéricos e orçamento estimado.
- Os caminhos duplicados e inalcançáveis do Drawer foram removidos; mutações passam por um boundary server-side único.
- Falhas de execução agora aparecem como erro explícito ao usuário, em vez de redirecionamento que simulava sucesso.

Validação adicional desta onda:

- Typecheck: passou.
- Testes focados de shell, acesso, comércio e FSM: **29/29 passaram**.
- `git diff --check`: passou.

Próxima etapa P0: adicionar um contrato persistido de aprovação humana para `publish_ad`, `submit_legal_demand` e outras ações de efeito externo, com receipt idempotente, audit log e UI de aprovação/rejeição. O dispatcher único já está preparado para receber esse gate sem reintroduzir caminhos paralelos.

## Terceira onda — aprovação humana persistida

Foi implementado o contrato persistido de aprovação para operações de alto impacto do Copilot.

A migration `20261007132000_copilot_action_approvals.sql` cria a tabela com ownership por usuário/tenant, payload sanitizado, status `pending`, `approved`, `rejected`, `expired` ou `failed`, expiração de 24 horas, chave idempotente, resultado da execução, reviewer e timestamps. A tabela possui índices para pendências, thread e expiração, RLS de leitura e publicação realtime.

O dispatcher agora separa ações de baixo impacto (`add_to_cart`, executada diretamente) de ações de alto impacto (`request_travel_quote`, `submit_legal_demand` e `publish_ad`). Para alto impacto, ele registra a solicitação e retorna `needs_approval`; nenhum efeito externo é executado nesse primeiro passo. Repetições do mesmo usuário e payload retornam a solicitação existente em vez de criar uma nova.

O endpoint `reviewAiChatAction` valida ownership ou papel administrativo do tenant, verifica expiração, rejeita ou faz claim atômico da solicitação, executa a ação uma única vez e grava o resultado. Falhas de execução mudam a solicitação para `failed`, sem apresentar sucesso falso.

Drawer e fullscreen foram ajustados para informar “aguardando aprovação humana” e nunca mostrar “sucesso” antes da execução aprovada. Também foram adicionados testes para classificação de alto impacto e estabilidade da chave idempotente.

Validação da terceira onda:

- Typecheck: passou.
- Testes focados do approval, acesso, shell e FSM: **26/26 passaram**.
- Type SSOT: passou; 1.930 arquivos inspecionados, zero tipos duplicados.
- Build de produção: passou.
- Client/server leak: passou; 492 chunks verificados.
- Schema checker: continua acusando somente os três pares históricos de migrations duplicadas (`20270106000000`, `20270107000000`, `20270109000000`).

Limitação conhecida: a API de revisão já está pronta e protegida, mas ainda falta a superfície visual final — painel/timeline de approvals com resumo do payload, expiração, botões Aprovar/Rejeitar, motivo de rejeição e atualização realtime. Essa é a próxima etapa de produto antes de habilitar aprovação em escala.

## Quarta onda — interface visual e auditoria recursiva

Foi criado o componente `CopilotApprovalPanel`, reutilizado no fullscreen e no Drawer. O painel consulta pendências visíveis pelas policies RLS, exibe apenas um resumo sanitizado do payload, mostra expiração, permite informar motivo de rejeição e oferece as ações **Aprovar e executar** e **Rejeitar**. A revisão chama o boundary server-side `reviewAiChatAction`; a lista é atualizada por subscription realtime autenticada na tabela `copilot_action_approvals`, com fallback para polling inicial quando realtime não estiver disponível.

A auditoria recursiva dos módulos encontrou um problema de integridade no branch conversacional de rastreio: ele fabricava pedido, token, status, endereço, entregador e telefone (`49999999999`) diretamente no código. Esse comportamento foi removido. O Copilot agora mantém a intenção e o passo de ferramenta para compatibilidade operacional, mas solicita o número do pedido ou token público e não afirma ter consultado uma fonte real sem identificador confirmado.

A varredura também catalogou como backlog P1 os `catch {}` silenciosos em integrações de turismo, WhatsApp, social, leads, carrinho, autenticação, marketplace, admin e mineração; eles devem ser classificados entre fallback aceitável, observabilidade necessária ou erro que precisa chegar à interface. Também foi gerada uma lista inicial de services com mutações Supabase e sem referência explícita a `getServerIdentity`; cada arquivo precisa ser revisado individualmente porque alguns são endpoints públicos legítimos, enquanto outros podem ter autorização implícita incompleta.

Validação adicional desta onda:

- Painel visual, shell e contrato: **28/28 testes focados passaram**.
- Typecheck: passou.
- Build final: passou.
- Client/server leak: passou; 492 chunks verificados.

## Quinta onda — endurecimento P1 de domínio e acesso

Foram corrigidos os seguintes pontos:

- Contratos: `createContract` não aceita mais `storeId` de outro tenant; `sealAndIssueContract` agora busca o contrato, exige criador ou staff autorizado da mesma loja, aceita apenas status `draft` e bloqueia selagem por IDOR.
- Negociações: criação valida que o `sellerId` corresponde ao proprietário real do anúncio e que o anúncio está ativo; respostas rejeitam transições após `rejected`, `cancelled` ou `completed`, impedem contraproposta fora de `negotiating` e impedem conclusão sem negociação aceita.
- Quick-order: valida matematicamente cada `quantity × unitPriceCents` e o subtotal; falha de `order_items` remove o pedido recém-criado e retorna erro, eliminando sucesso falso e pedido órfão.
- Moderação: ações `warn_author` e `ban_author` não são mais marcadas como concluídas sem enforcement persistido; remoção/ocultação verifica erro de atualização e rejeita tipos de conteúdo ainda sem enforcement.
- Rastreio: consulta por UUID agora exige que o solicitante seja cliente do pedido ou staff da loja; acesso anônimo permanece restrito ao token público. A regra recebeu teste anti-IDOR.

Validação P1:

- Typecheck: passou.
- Testes de domínio e segurança: **20/20 passaram**.
- Type SSOT: passou — zero tipos duplicados.
- Schema checker: permanece bloqueado apenas pelos três pares históricos de versões duplicadas já catalogados.

## Sexta onda — catches silenciosos, services e migrations históricas

A varredura dos services com mutações Supabase identificou uma classe crítica nos guards administrativos: cinco módulos podiam promover um usuário master para `platform_admin` em memória mesmo quando o update em `profiles` falhava. Os guards de `master`, `curadoria`, `growth-targets`, `legal` e `admin-360-governance` agora verificam o erro retornado pelo Supabase e falham fechado antes de devolver o privilégio.

Também foram removidos catches vazios em quatro mutações/auditorias relevantes. O envio de comprovante de fatura, a exclusão de segredo, a aprovação de campanha MCP e a atualização de lote após ingresso cortesia agora registram erros operacionais explicitamente. Essas falhas permanecem não bloqueantes quando a mutação principal já foi concluída, mas deixaram de ser invisíveis.

As seis migrations históricas com timestamps repetidos foram consolidadas em três arquivos únicos, mantendo o SQL integral em ordem lexical original:

| Versão | Arquivo consolidado |
|---|---|
| 20270106000000 | `campaign_scheduling_security_consolidated.sql` |
| 20270107000000 | `cms_locality_document_artifacts_consolidated.sql` |
| 20270109000000 | `booking_chat_tourism_rls_consolidated.sql` |

O verificador de schema passou com 471 migrations, 590 tabelas e 193 funções, sem versões duplicadas.

Validação final desta onda: typecheck passou; SSOT passou com zero tipos duplicados; schema uniqueness passou; lint terminou sem erros, com 7.815 warnings legados; testes focados passaram com **28/28**.
