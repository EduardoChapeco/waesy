# SPEC-W3 — Contrato Supabase derivado do schema

## Escopo

Substituir o placeholder `Database = any` pelo contrato TypeScript gerado do projeto Supabase Waesy `jfuebqmltksyznovhlwa`.

## Requisitos EARS

- **Quando** o schema do projeto Waesy for consultado, **o sistema deve** persistir os tipos de tabelas, views, relações, funções e enums no ficheiro canónico.
- **Quando** um consumidor usar o cliente Supabase tipado, **o compilador deve** detectar nome de tabela, coluna e payload incompatíveis.
- **Quando** o schema mudar, **o CI deve** permitir regeneração/revisão do contrato sem manter `Database = any`.

## Critérios de aceite

1. `src/integrations/supabase/types.ts` contém `Database` estruturado e não contém `Database = any`.
2. O tipo foi gerado diretamente do projeto Supabase Waesy, não reconstruído manualmente.
3. Typecheck, testes e build passam; erros de consumidores são corrigidos apenas quando causados pelo contrato real.
4. O tamanho e a proveniência do artefacto ficam registrados no ledger.
