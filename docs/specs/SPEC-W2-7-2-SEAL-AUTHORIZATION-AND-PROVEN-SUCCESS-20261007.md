# Spec — W2.7.2: autorização da selagem e sucesso provado

**Data:** 2026-10-07 (UTC−03:00)  
**Repositório:** `EduardoChapeco/waesy`  
**Branch de origem:** `audit/full-remediation-continuation-20261007`  
**HEAD/base observados:** `919c86881db1ce83de3feae7fcf7df5aadb58b7d` (`origin/main`)  
**Autorização:** correção local dedicada confirmada pelo utilizador às 21:20:27 -03:00; preservar os 30 paths preexistentes, sem alterações remotas.

### Adenda de escopo pela continuação autorizada

O pedido de continuação autorizou executar a migration e o fixture de integração exclusivamente na base PostgreSQL local descartável `waesy_w272_test`, atualizar este ledger e `docs/audits/20261007-WAVE-READINESS-W0-W7.md`, e consolidar os ficheiros validados na branch de continuação local. Esta adenda não autoriza aplicar migrations em Supabase/produção, executar RLS real, criar commit, push, PR, merge ou deploy.

**Supersessão de publicação:** a instrução explícita do utilizador em 2026-10-07 21:43:19 -03:00 autoriza agora revisar e documentar os diffs, criar commit local, fazer push da branch de continuação e abrir uma PR com descrição completa dos resultados e pendências. Não autoriza merge nem deploy. A PR será marcada como draft enquanto gates de integração/produção e blockers documentados permanecerem abertos.

## Contexto e findings

A revisão adversarial da W2.7.1 confirmou que `sealAndIssueContract` usa `getIdentity()` apenas como teste de autenticação e depois faz writes via `service_role` sem provar creator/tenant. A operação grava versão selada, estado `signing` e envelopes em chamadas separadas, sem confirmar `error`/linhas afetadas. A mesma revisão confirmou caminhos de resposta com sucesso sem prova suficiente na assinatura manual/Gov.br e um `?signed=true` que permite à rota mostrar assinatura concluída sem reler o envelope persistido.

Esta microfase corrige somente esse P0 e os falsos sucessos diretamente ligados à assinatura. Não fecha a auditoria holística, o finding geral de `service_role`, a migração/transações em integração nem os demais findings da revisão W2.7.1.

## Requisitos EARS

- **Quando** um pedido de selagem chegar ao BFF, **o sistema deve** derivar identidade e papel por `requireStaff()`, exigir que o utilizador autenticado seja o criador do contrato e que o `store_id` ativo corresponda ao `store_id` persistido; nenhum `contractId`, `versionId`, `creatorId` ou `storeId` do cliente será tratado como prova de autorização.
- **Quando** o BFF preparar a selagem, **o sistema deve** consultar contrato/versão por IDs associados, exigir que a versão seja a corrente e rejeitar ausência, erro de leitura ou ownership/tenant divergente antes de calcular o hash ou chamar a RPC.
- **Quando** a selagem for executada, **o banco deve** oferecer uma RPC `SECURITY DEFINER` com `search_path` fixo e `EXECUTE` apenas para `service_role`; a RPC deve travar versão e contrato em ordem estável, verificar novamente actor/creator/store, versão corrente, estado não terminal permitido, ausência de selagem/envelopes prévios e correspondência entre conteúdo/cláusulas lidos e persistidos.
- **Quando** a RPC selar uma versão, **a operação deve** persistir hash, `signature_fields`, `is_sealed`, `sealed_at`, estado `signing` e todos os envelopes em uma única transação. Qualquer erro deve reverter tudo. Contratos `completed`, `cancelled` ou já `signing` não podem ser reabertos nem receber envelopes duplicados.
- **Quando** a RPC de selagem retornar, **o BFF deve** validar o formato/estado/ID do retorno e montar links apenas a partir das linhas realmente retornadas; nunca tratar resposta vazia, erro de PostgREST ou `0 rows` como sucesso.
- **Quando** a assinatura manual encontrar um envelope já `signed`, **o sistema deve** confirmar que existe evidência persistida de consentimento para esse envelope antes de responder sucesso idempotente. Após resposta ambígua, só pode atribuir sucesso à tentativa corrente se encontrar evidência com o digest exato desta tentativa; erro de leitura, ausência de evidência ou digest concorrente deve falhar explicitamente.
- **Quando** Gov.br encontrar envelope já assinado, **o sistema deve** confirmar evidência persistida de consentimento, `gov_br_verified` e nível Gov.br correspondente. Após resposta ambígua, só pode confirmar a tentativa corrente se a evidência persistida corresponder ao digest e nível exatos; status do envelope isolado não basta.
- **Quando** a rota `/assinar/$token` for carregada, **a UI deve** derivar o estado assinado exclusivamente do envelope retornado pelo loader. Parâmetros de query, incluindo `signed=true`, não podem alterar estado funcional. O callback Gov.br deve redirecionar para a rota sem um marcador de sucesso confiado pelo cliente.
- **Quando** qualquer autorização, persistência, confirmação ou reconciliação falhar, **o sistema deve** apresentar erro/estado não confirmado e permitir reload para ler o estado real, sem toast, resposta ou estado local de sucesso fictício.

## Paths autorizados

1. `src/services/contracts.functions.ts`
2. `src/routes/assinar.$token.tsx`
3. `src/routes/api.auth.govbr.callback.ts`
4. `src/integrations/supabase/types.ts`
5. `supabase/migrations/20270115000000_contract_seal_atomic_authorization.sql` (nova; somente arquivo local, sem aplicação)
6. `src/services/contracts-signature-completion-security.test.ts`
7. `src/services/contracts-manual-sign-security.test.ts`
8. `src/services/contracts-govbr-security.test.ts`
9. `docs/specs/SPEC-W2-7-2-SEAL-AUTHORIZATION-AND-PROVEN-SUCCESS-20261007.md`
10. `docs/audits/W2-7-2-SEAL-AUTHORIZATION-AND-PROVEN-SUCCESS-20261007.md`
11. `docs/audits/W2-7-1-CANONICAL-SIGNATURE-COMPLETION-20261007.md`
12. `docs/audits/W2-7-PUBLIC-VERIFICATION-20261007.md`
13. `docs/audits/20261007-W2-CONTINUITY-REVALIDATION.md`
14. `docs/audits/20261007-WAVE-READINESS-W0-W7.md`

Qualquer path adicional exige novo preflight e ampliação escrita do escopo. Os 30 paths já sujos não são autorizados para limpeza, reset ou edição incidental; apenas serão preservados e copiados integralmente para a worktree isolada.

## Reprodução e critérios de aceite

1. Antes da implementação, novas regressões devem falhar na baseline por ausência de guarda creator/tenant e RPC de selagem, retorno manual/Gov.br sem prova de evidência, ou estado visual controlável por `?signed=true`.
2. Após a implementação, os casos positivos e negativos devem cobrir creator correto, usuário não autenticado/role inválido, tenant divergente, contrato não corrente/terminal, duplicação/replay, rollback de falha de envelope, erro de leitura, evidência ausente, digest diferente, Gov.br com nível divergente e reload sem query string.
3. Testes focused W2.1–W2.7.2, typecheck, design-lint ratchet, `git diff --check` e build devem passar no SHA final local.
4. Migration e RPC serão revisadas estaticamente e testadas apenas contra fixture/schema descartável no PostgreSQL local; integração Supabase, aplicação do conjunto completo de migrations desde zero, RLS real, browser, CI e produção permanecem fora desta autorização e por provar.
5. Nenhum `git add`, commit, push, PR, merge, deploy, alteração remota ou reset é autorizado por esta spec.

## Exclusões expressas

- Não corrigir neste passo os findings independentes da revisão W2.7.1: corrida/backfill, escrita direta pós-completion, seleção de versão histórica pelo código, distinção visual de estados `rejected`/`expired`, normalização de hash em maiúsculas ou outros findings fora da lista acima.
- Não reescrever os 30 paths preexistentes nem os seus históricos; preservá-los byte a byte na cópia isolada.
- Não declarar funcionalidade real completa com base apenas em código, mocks, typecheck ou build.
