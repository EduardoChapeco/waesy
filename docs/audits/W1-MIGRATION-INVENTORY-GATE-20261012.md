# W1 — Gate determinístico do inventário de migrations

**Candidato:** `fb5c72244b152299d6a7f5d5f5013d9d46ff82e2`
**PR:** #29
**Data:** 2026-10-13
**Ambiente:** checkout local; nenhum Postgres/Supabase remoto alterado.

## Implementação

Foi criado `scripts/audit/validate-migration-inventory.mjs` e o comando `npm run check:migration-inventory`. O gate verifica, de forma determinística:

- todos os arquivos SQL em `supabase/migrations` seguem o padrão `<versão>_<nome>.sql`;
- não existem versões duplicadas;
- não existem migrations vazias;
- o primeiro e o último arquivo são identificáveis;
- o inventário possui hash SHA-256 reproduzível;
- o gate está incluído no workflow CI como `Gate 0e`.

## Resultado

| Item | Resultado |
|---|---:|
| Arquivos SQL analisados | **500** |
| Primeiro arquivo | `0001_foundation.sql` |
| Último arquivo | `20270124000000_atomic_ai_conversation_exchange.sql` |
| Nomes inválidos | **0** |
| Arquivos vazios | **0** |
| Versões duplicadas | **0** |
| Hash do inventário ordenado | `47447178267c0e76056083d5f58ef89bd0f0d02c263ab53d3d53969f1eeb555f` |
| `npm run check:migration-inventory` | **PASS** |
| `npm run check:schema` | **PASS** — 500 migrations, 621 tabelas, 213 funções |
| `npm run check:bff` | **PASS** — 495 tabelas BFF, 0 sem declaração local |
| `git diff --check` | **PASS** |

## Limite explícito

Este subgate fecha apenas a **integridade estrutural do inventário no checkout**. Ele não prova replay from-zero, segunda aplicação, catálogo efetivo, policies, grants, `SECURITY DEFINER`, owners, RLS/JWT ou isolamento cross-tenant no Postgres. Esses gates continuam bloqueados até existir um banco descartável autorizado e seus logs preservados.

## Critério de promoção

W1 permanece `blocked` para promoção. A evidência local agora impede que o CI aceite uma árvore com migration SQL vazia, nome inválido ou versão duplicada, reduzindo o risco de candidato não determinístico sem declarar falsa certificação de banco.
