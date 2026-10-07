

## Fechamento da retomada — 2026-10-07 17:18 -03

### Estado recuperado e implementação concluída

- Branch de continuidade preservada: `audit/p0-public-acceptance-conversion-20261007`.
- Artefatos históricos das fases A/B/B1 foram recuperados e reaplicados sem descartar o WIP preexistente; o `pnpm-lock.yaml` não foi incluído implicitamente.
- Aceite público permanece separado de reserva/pagamento: a RPC grava aceite, manifesto, fingerprint, opção e preferência pendente; não cria cobrança, Pix, bilhete, voucher ou reserva externa.
- Conversão passou a ser exclusivamente staff-only, tenant-scoped e atômica no RPC `convert_accepted_travel_proposal_staff`, com snapshot/aceite/opção/manifesto verificados, idempotência e estados `pending_review`/`pending`; o fallback legado e os writes diretos foram removidos do BFF.
- Contratos públicos passaram a usar RPCs token-bound allowlisted; a migration `20270115000000_p0_secure_public_contract_access.sql` revoga leitura direta de tabelas/envelopes e a emissão staff exige membership/tenant.
- Voucher público passou a usar `get_public_tourism_voucher_by_token(TEXT)` com `SECURITY DEFINER`, allowlist, observações sempre nulas, passageiros normalizados e `Cache-Control: no-store, private`; somente a função recebe `EXECUTE` para `anon/authenticated`.
- Guards de TypeScript foram corrigidos em rotas/editor/listagem e mocks RPC; o modal de checkout mantém a barreira de preço confirmado e o contrato de preferência sem cobrança.
- O caminho legado de conversão foi removido também para evitar código morto, writes parciais e falsos caminhos de autorização.

### Gates executados após as correções

| Gate | Resultado | Limite da prova |
|---|---|---|
| Testes focados P0 | **29/29 pass** em 4 arquivos | Mocks/contratos; não substitui Postgres/RLS real |
| Suíte ampla Vitest | **240 arquivos / 1.570 testes pass** | Testes locais; providers externos usam fallbacks determinísticos em cenários previstos |
| TypeScript | **`npm run typecheck` pass, exit 0** | Não prova execução de migrations |
| Build produção | **pass**; worker gerado e `client-leak` OK em 491 chunks | Não é deploy |
| Design lint completo | exit 0; baseline atual observada: **13.745 violações** (1.524 P0, 9.585 P1, 1.297 P2, 1.339 P3) | Débito histórico global; não declarar design system limpo |
| Design ratchet | **pass**; débito reduzido em 547 violações | Não baixa baseline automaticamente |
| `git diff --check` | **pass** | Não prova SQL/RLS |
| Migration voucher estática | referências de tabela/coluna e grants conferidos | `psql`, Supabase CLI e Docker não estão disponíveis nesta sessão |

### Fechamento e bloqueios honestos

- Não foi aplicada migration em Supabase/produção, não foi feito deploy, merge ou publicação externa; isso permanece fora da autorização registrada.
- A aplicação real das migrations `20270114000000`, `20270115000000`, `20270116000000` e `20270117000000`, dump de policies/grants com `SET ROLE anon`, concorrência/idempotência em Postgres, browser smoke e CI Cloudflare continuam pendentes por falta de ambiente/autoridade.
- O design lint global ainda reporta dívida histórica relevante; a catraca ratchet está verde e não houve nova regressão após corrigir o único DL-19 introduzido pela retomada.
- Próxima ação segura para promoção: aplicar as migrations em banco de staging autorizado, executar os testes de grants/RLS e concorrência, revisar o diff/PR e só então solicitar aprovação explícita para merge/deploy.
