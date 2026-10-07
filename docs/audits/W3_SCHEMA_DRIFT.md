# W3 — Drift do schema e migrations

## Estado observado

O projeto Supabase Waesy reporta 468 migrations aplicadas. O repositório contém três colisões de prefixo de versão: `20270106000000`, `20270107000000` e `20270109000000`, cada uma com dois ficheiros distintos. O histórico remoto também contém nomes de migration que apontam para datas futuras em relação ao ciclo de execução atual.

## Decisão segura

Não renomear, apagar ou reordenar migrations aplicadas. Uma correção de IDs exige primeiro snapshot do histórico, banco efémero carregado desde zero e teste de replay/idempotência. Até essa evidência existir, as colisões ficam como finding W3.2 aberto, não como “corrigido” por alteração cosmética no repositório.

## Contrato real

`src/integrations/supabase/types.ts` foi gerado diretamente do projeto `jfuebqmltksyznovhlwa` e substituiu `Database = any`. O typecheck, a suíte de testes e o build passaram após a alteração.

## Próxima ação

Criar um teste de replay em Postgres efémero que compare o histórico aplicado, o catálogo de objetos e a execução repetida das migrations. Só depois decidir entre normalização dos ficheiros, migration de reconciliação ou congelamento formal do histórico legado.
