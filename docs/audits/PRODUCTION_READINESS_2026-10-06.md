# Waesy — Auditoria e Prontidão de Produção

**Data:** 2026-10-06
**Repositório:** `EduardoChapeco/waesy`
**Branch:** `chore/recover-waesy-task-2026-10-06`
**PR:** [#6](https://github.com/EduardoChapeco/waesy/pull/6)
**Escopo:** exclusivamente o repositório Waesy, a sua branch e o seu PR.

## Veredito

O trabalho histórico foi recuperado e publicado no branch do Waesy. Foram corrigidos problemas adicionais no Copilot, no viewer de artefactos, na persistência FSM e no gate de schema. O branch remoto confirmado mais recentemente é `9bbd33a18087c3b4d901cd4625f72c7475f2c54c`.

**Produção não está confirmada.** No estado mais recente observado em 2026-10-06 às 18:50 (UTC−03), o check **Cloudflare Pages falhou** e o check **CI Unificado — Waesy Quality Gates** ainda estava pendente. Não houve confirmação de deployment público. O OAuth do Wrangler iniciado anteriormente não terminou com uma sessão autenticada.

## Alterações no Waesy

### Copilot, tabelas e artefactos

- `src/components/chat/ai-chat-shell.tsx` normaliza `rows` e `dataRows`, incluindo linhas objeto, mostra o número real de registos e remove o fallback fictício `[["1", "Item", "Ok"]]`.
- A exportação CSV usa as linhas apresentadas no viewer, com BOM UTF-8, CRLF, escaping de aspas/separadores/quebras de linha e proteção contra formula injection.
- O botão “Abrir no Builder” encaminha para o documento ou artefacto identificado.
- `src/components/chat/structured-message-view.tsx` aceita `rows` ou `dataRows` e converte valores de células para texto renderizável.
- A rota `/copilot` passa as ações estruturadas para o dispatcher; o drawer global deixa a ação de cotação de viagem seguir o seu fluxo de domínio.

### FSM, telemetria e cache

- `src/services/copilot-execution-persistence.ts` usa fases FSM canónicas, grava estados terminais explícitos e preserva a fase quando um step não fornece `fsmPhase`.
- Execuções servidas pelo cache são concluídas na telemetria.
- O hash do cache é separado por loja, utilizador ou âmbito público para evitar reutilização cross-tenant.
- Foram adicionados testes de regressão ao viewer, exportação e persistência FSM.

### Migrations

Foram identificadas versões duplicadas de migrations que faziam falhar a consolidação de schema. As migrations afetadas foram renomeadas para versões monotónicas únicas, mantendo o conteúdo SQL. O gate confirmou:

```text
migrations=476
tables_declared=590
functions_declared=188
migration version uniqueness: OK
```

**Cuidado de rollout:** comparar os nomes/versões com o histórico de migrations da base Waesy de destino antes de aplicar. Não reexecutar cegamente versões que já estejam registadas sob os nomes anteriores; usar o procedimento oficial de diff/repair do Supabase quando aplicável.

## Validação do Waesy

| Verificação | Resultado observado |
|---|---|
| `npm run typecheck` | Aprovado após as alterações de código |
| Testes focados Copilot/UI/FSM | 56 aprovados em 5 ficheiros |
| Schema consolidation | Aprovado: 476 migrations, 590 tabelas, 188 funções; versões únicas |
| `npm run check:canonical` | Exit code 0 |
| Naming, dependências circulares, tipos SSOT, duplicação e route budget | Aprovados pelo gate canónico |
| Dívida de decomposição | 511 avisos no gate não bloqueante: 86 críticos, 97 altos, 328 médios |
| CI principal anterior | Os 5 Quality Gates passaram no commit anterior ao hardening final |
| Check do PR no SHA atual | Cloudflare Pages falhou; CI Waesy estava pendente no último estado consultado |
| Deploy público | Não confirmado |

Os 511 avisos de tamanho são dívida técnica existente reportada por `check:size:warn`; o script termina com sucesso, mas isso não significa que a dívida tenha sido resolvida nem que a auditoria considere os monólitos ideais.

## GitHub e próximos passos exclusivos do Waesy

O PR [#6](https://github.com/EduardoChapeco/waesy/pull/6) está aberto contra `main`. O branch local foi atualizado com `git fetch` e `git pull --rebase origin main`; os pushes foram confirmados por comparação entre SHA local e remoto.

Para declarar a publicação Waesy concluída, falta obter os Quality Gates verdes no SHA atual, resolver a configuração/autenticação do check Cloudflare Pages, fazer merge de `#6` para `main`, confirmar o deployment no Cloudflare e executar smoke tests Waesy de status/worker, Copilot, Builder, tabelas/artefactos e rotas principais. Nenhum desses passos deve ser marcado como concluído sem a respetiva confirmação do provedor.
