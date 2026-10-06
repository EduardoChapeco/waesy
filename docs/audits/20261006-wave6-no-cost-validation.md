# Onda 6 — Validação sem custo adicional

**Data:** 2026-10-06  
**Branch:** `feat/waesy-canonical-travel-evolution`  
**Supabase:** revisão somente leitura no projeto `Waesy` (`jfuebqmltksyznovhlwa`)  
**Branch efêmera:** não criada; nenhum custo adicional gerado.

## Resultado dos gates locais

| Gate | Resultado |
|---|---|
| `npm run check:schema` | **Aprovado** — 446 migrations locais, 568 tabelas declaradas, 177 funções, versões únicas |
| `npm run test:e2e:travel` | **Aprovado** — 12/12 testes do pipeline turístico |
| Migration RLS nova | **Aprovada na validação textual** — sem `USING (true)` ou `WITH CHECK (true)` |
| TypeScript global | **Bloqueado pelo baseline legado** — 136 erros em 48 rotas, nenhum apontado nos serviços novos de turismo |

## Evidências somente leitura do Supabase

### Policies permissivas encontradas

- `public.proposals`: policy `Public read proposals by token` com `USING (true)`.
- `public.traveler_forms`: policies públicas de leitura e atualização baseadas apenas em token não validado pela policy.
- `public.travel_vouchers`: leitura anônima para vouchers emitidos/usados.
- `public.bus_seat_assignments`: leitura pública de assentos ocupados.
- `public.proposal_items` e `public.group_tour_enrollments`: RLS ativo sem policy efetiva.

### Outros advisors

- 26 tabelas com RLS ativo sem policy.
- 48 funções `SECURITY DEFINER` executáveis por `anon` segundo o advisor de segurança.
- 118 funções `SECURITY DEFINER` executáveis por `authenticated` segundo o advisor de segurança.
- 428 foreign keys sem índice segundo o advisor de performance.
- `pg_trgm` e `btree_gist` instaladas no schema `public`.

Esses pontos foram apenas lidos; nenhum advisor foi aplicado automaticamente.

## Implementação entregue no GitHub

A migration `20270109000000_wave6_tourism_rls_final_hardening.sql`:

1. remove policies públicas permissivas das tabelas de turismo;
2. revoga acesso direto de `anon` às entidades confidenciais;
3. aplica escopo por `store_id` usando `is_store_staff`;
4. resolve entidades ligadas por `agency_id` através de `agencies.store_id`;
5. protege `proposal_items`, passageiros, vouchers, excursões, custos e layouts;
6. preserva a aplicação operacional via BFF/server functions, não via acesso direto público às tabelas;
7. usa as colunas confirmadas no schema vivo, incluindo `group_tour_costs.tour_id` e `trip_passengers.store_id`.

## Limitação atual explicitada

O typecheck global ainda precisa de uma frente separada de saneamento de rotas legadas. Os erros estão concentrados em:

- callbacks de busca TanStack com `prev` sem tipo;
- rotas API com contrato `server` incompatível com a versão instalada;
- coleções de marketing/financeiro inferidas como `any`;
- um erro de `unknown` em página pública e alguns acessos indexados.

Não foi mascarado nenhum desses erros nem aplicado `skipLibCheck`/relaxamento global.

## Próximo passo recomendado

1. abrir Onda 6A para corrigir o contrato das rotas API TanStack Start;
2. gerar e versionar `src/integrations/supabase/types.ts` a partir do schema real;
3. corrigir os tipos de DTOs de marketing/financeiro;
4. executar novamente `npm run typecheck`, build e auditoria de rotas;
5. somente após revisão no PR, aplicar a migration no ambiente escolhido pelo usuário.
