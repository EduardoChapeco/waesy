# Waesy — evidência autorizada do Supabase

**Data:** 2026-10-13 16:26 UTC  
**Projeto:** `Waesy` (`jfuebqmltksyznovhlwa`)  
**Região:** `sa-east-1`  
**Estado reportado:** `ACTIVE_HEALTHY`  
**Escopo:** somente leitura; nenhuma migration, policy, grant, dado ou secret foi alterado.

## Evidência observada

| Medição | Resultado |
|---|---:|
| Migrations registradas pelo Supabase | 258 |
| Tabelas públicas | 585 |
| Tabelas públicas com RLS habilitado | 585 |
| Policies públicas | 1.098 |
| Grants de tabela para `anon`, `authenticated` e `service_role` | 12.356 |
| Advisories de segurança | 2 warnings |
| Advisories de performance | 509 infos de foreign keys sem índice cobrindo |

### Advisories de segurança

1. `pg_trgm` instalado no schema `public`; recomendação: mover para schema dedicado — [Supabase Database Linter 0014](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public).
2. Proteção contra senhas vazadas desabilitada — [Supabase Auth password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

### Interpretação de governança

Esta evidência confirma que o banco está acessível, saudável e com RLS habilitado em todas as 585 tabelas públicas observadas. **Não fecha W1/W2/W3:** ainda faltam replay from-zero, segunda aplicação, fingerprint do catálogo/types, matriz JWT/RLS/grants com atores A/B, concorrência e prova negativa cross-tenant. A execução de alterações corretivas foi deliberadamente não realizada nesta etapa.

## Reproduções somente leitura

- `list_migrations(project_id=jfuebqmltksyznovhlwa)`
- `list_tables(project_id=jfuebqmltksyznovhlwa, schemas=[public], verbose=false)`
- `execute_sql(project_id=jfuebqmltksyznovhlwa)`:
  `select count(_applied_migrations), count(public tables), count(RLS-enabled public tables), count(pg_policies), count(public role grants) limit 1`
- `get_advisors(type=security)` e `get_advisors(type=performance)`

## Próximo passo bloqueado

Para fechar P0, ainda é necessário um ambiente de staging/branch de banco autorizado para replay descartável, testes JWT por papel e tenants A/B, concorrência e evidências preservadas. O projeto de produção não deve receber migrations corretivas sem janela, backup/rollback e aprovação do responsável.
