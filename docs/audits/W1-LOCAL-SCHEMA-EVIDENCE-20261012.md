# W1 — Evidência local de schema, migrations e contratos BFF

**Candidato local:** `97acc3fb4e6318f839450ee5122e946a26e276b8`
**Data da execução:** `2026-10-12T23:01:57Z`
**Ambiente:** checkout local reproduzível; sem Postgres/Supabase remoto alterado.

## Resultado

| Gate | Resultado | Evidência |
|---|---:|---|
| `npm run check:schema` | PASS | 500 migrations; 621 tabelas declaradas; 213 funções declaradas; unicidade de versões OK |
| `npm run check:bff` | PASS | 500 migrations; 632 tabelas declaradas; 495 referenciadas pelo BFF; 0 sem declaração local |
| `npm run check:release-ledger` | PASS | 18 fases W0–W17 presentes; 10 partial, 5 blocked, 3 open |

## Limite da evidência

Esses comandos validam arquivos e contratos no checkout. Eles **não** provam que as 500 migrations aplicam do zero em Postgres, que uma segunda aplicação é idempotente, nem que policies, grants, functions, `SECURITY DEFINER`, owners, RLS/JWT e constraints estão efetivos no banco aplicado.

Para fechar W1, ainda é obrigatório executar em um banco descartável autorizado:

1. replay from-zero das 500 migrations;
2. segunda aplicação sem drift;
3. snapshot de tabelas, colunas, índices, FKs, triggers, functions, policies e grants;
4. fingerprint comparável com `types.ts`;
5. testes negativos de RLS/JWT e isolamento cross-tenant;
6. preservação de logs e artefatos vinculados ao SHA candidato.

**Status W1:** `blocked` para promoção; `local evidence PASS`.
