# Waesy — Status operacional de execução contínua

**Última atualização:** 2026-10-12 10:27 BRT  
**Estado:** `partial / blocked-for-promotion`  
**Escopo:** correções locais, auditoria estrutural e regressões; nenhum deploy ou migration remota executado.

## Resumo executivo

O repositório permanece compilável e com os contratos BFF/schema locais fechados. Nesta rodada foram corrigidos três grupos de risco: débito de tokens civis concorrente e idempotente; resolução de identidade e autorização sem ownership implícito; e writers de contratos que podiam retornar sucesso parcial ou deixar registros órfãos. A evidência disponível é local: os gates não provam aplicação em Supabase remoto, RLS efetiva, grants, concorrência real ou rollback em produção.

## Quota civil e idempotência

Foi criada `supabase/migrations/20270123000000_atomic_civil_token_debit.sql`. Ela adiciona ledger único por `user_id + idempotency_key`, serialização por lock da quota diária, débito combinado de quota e carteira, auditoria na mesma transação e RPC restrita a `service_role`.

`src/services/token-quota.functions.ts` agora exige `idempotencyKey`, rejeita operações desconhecidas, limita valores customizados, delega o débito à RPC e falha explicitamente em erro. A expressão que marcava jobs de mídia como cobrados por `OR true` foi substituída por verificação de job gratuito ou existência em `ai_job_charges`.

## Identidade e isolamento

`src/lib/identity.server.ts` não reconstrói ownership por email/settings nem persiste auto-heal via `service_role`. Membership deve vir do vínculo canônico. `src/lib/identity-core.ts` não permite mais que role privilegiada atravesse `assertStoreAccess` sem membership verificável, exceto roles globais de plataforma.

## Contratos e assinatura

`generateContractFromOrder` e `generateContractFromDeal` agora iniciam em `draft`, criam versão não selada, verificam todos os retornos de versão/envelope, promovem para `signing` apenas no final e compensam envelopes, versões e contrato em falhas intermediárias. A ordem dos caminhos manual e Gov.br foi alinhada: a promoção só ocorre após releitura do envelope assinado e confirmação da evidência do mesmo digest.

A compensação de aplicação é uma mitigação, não substitui uma RPC única de criação+selagem. Essa RPC permanece como próxima evolução após validar o schema remoto autorizado e grants.

## Validações concluídas

| Gate | Resultado |
|---|---:|
| Testes focados de identidade, isolamento, quota e hardening | 4 arquivos / 25 testes aprovados |
| Testes de assinatura manual e conclusão | 2 arquivos / 12 testes aprovados |
| Testes de quota atômica e contratos | aprovados nas execuções focadas |
| `npm run check:bff` | exit 0; 0 tabelas sem declaração local |
| `npm run check:schema` | exit 0; 500 migrations, versões únicas |
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0; client-leak check aprovado |
| `git diff --check` | exit 0 |

O build ainda emite um warning conhecido de `sideEffects: false` para import bare de `_runtime.mjs`; não bloqueou a geração do worker nem o client-leak check.

## Pendências e próximas fases

1. Executar a migration de débito em Postgres/Supabase autorizado e provar concorrência, rollback, grants, `SECURITY DEFINER` e idempotência com duas requisições simultâneas.
2. Validar em ambiente autorizado que a remoção de auto-heal não quebra onboarding; se necessário, criar fluxo explícito de convite/onboarding, nunca inferência por email.
3. Convergir os writers de contrato para RPC única de criação, hash, versão, envelopes e status.
4. Executar replay E2E com RLS, JWT, actor/tenant alternados e falhas injetadas em cada write.
5. Revisar o warning de empacotamento do `_runtime.mjs` como melhoria de build, sem tratá-lo como falha funcional enquanto o client-leak gate permanecer verde.

Até que essas validações remotas sejam feitas, não marcar a release como promovida e não executar deploy/migration remoto automaticamente.

## Persistência atômica do exchange do Copilot (W4/W5)

Foi adicionada `supabase/migrations/20270124000000_atomic_ai_conversation_exchange.sql`, com a RPC `persist_ai_conversation_exchange_atomic`. A função usa `SECURITY DEFINER`, `search_path` fixo, lock da thread (`FOR UPDATE`) e execução exclusiva por `service_role`. Em uma única transação ela cria o artefato (quando presente), cria a resposta da IA, liga o artefato à mensagem, atualiza o status da mensagem do usuário e grava a memória/timestamp da thread. Qualquer exceção aborta o conjunto.

`sendAiConversationMessage` agora delega a finalização à RPC e só retorna sucesso após receber os IDs/`created_at` persistidos. O fallback de erro da pipeline continua explícito como `FAILED_RETRYABLE`; não há mais gravações separadas de artefato, resposta, status e memória no BFF.

| Gate | Resultado |
|---|---:|
| `ai-conversations-persistence-consistency.test.ts` + `ai-conversations-idempotency.test.ts` | 2 arquivos / 6 testes aprovados |
| `npm run typecheck` | exit 0 |
| `npm run check:schema` | exit 0; 500 migrations, versões únicas |
| Revisão estática da RPC | função, `SECURITY DEFINER`, `search_path`, lock, `REVOKE` e `GRANT` presentes |

**Limitação mantida:** a mensagem do usuário ainda é criada/reaberta antes da execução externa da IA para suportar idempotência e retry. A atomicidade desta rodada cobre a finalização do exchange; a convergência completa de criação da mensagem + execução + persistência exigirá um saga/outbox ou boundary assíncrono, além de replay real em Postgres/Supabase com RLS/JWT.

## Estado executivo após a rodada

O estado continua `partial / blocked-for-promotion`. Nenhuma migration foi aplicada remotamente e nenhum deploy foi executado. Próximos gates prioritários: (1) replay from-zero/segunda aplicação em Postgres autorizado com RLS/JWT e fault injection da nova RPC; (2) consumidor SSE do Copilot no frontend; (3) contratos transacionais de turismo/W12; (4) freeze/rebaseline de candidato limpo antes de merge.
