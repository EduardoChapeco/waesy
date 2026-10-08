# W3 — Drift do schema e migrations

## Estado observado inicialmente (2026-10-06)

O projeto Supabase Waesy reportava 468 migrations aplicadas. Naquele snapshot, o repositório continha três colisões de prefixo de versão: `20270106000000`, `20270107000000` e `20270109000000`, cada uma com dois ficheiros distintos. O histórico remoto também continha nomes de migration que apontavam para datas futuras em relação ao ciclo de execução.

## Estado atual do branch GitHub

Na PR #18, por solicitação explícita do usuário, os três arquivos secundários foram renumerados no branch para IDs únicos: `20270106000001_live_p0_security_hardening.sql`, `20270107000001_document_artifacts_ocr_provenance.sql` e `20270109000001_wave6_tourism_rls_final_hardening.sql`. Nenhum banco foi consultado ou alterado para essa mudança. A unicidade estática do branch foi corrigida; isso **não** demonstra quais conteúdos foram aplicados em produção, não alinha o histórico remoto e não é autorização para deploy. O finding de produção W3.2 permanece aberto.

## Decisão segura antes de aplicação

Como regra geral, não renomear, apagar ou reordenar migrations já aplicadas sem reconciliação do histórico e schema real. Antes de aplicar a PR em qualquer ambiente, capturar o ledger de migrations e schema, testar replay em Postgres efêmero e validar idempotência. Se o conteúdo antigo já foi aplicado sob o ID duplicado, executar um plano de reconciliação explícito em vez de presumir que a nova versão possa ser aplicada sem efeito.

## Contrato real

`src/integrations/supabase/types.ts` foi gerado diretamente do projeto `jfuebqmltksyznovhlwa` e substituiu `Database = any`. O typecheck, a suíte de testes e o build passaram após a alteração.

## Próxima ação

Criar um teste de replay em Postgres efémero que compare o histórico aplicado, o catálogo de objetos e a execução repetida das migrations. Só depois decidir entre normalização dos ficheiros, migration de reconciliação ou congelamento formal do histórico legado.
