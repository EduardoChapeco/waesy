

## Fechamento da continuidade — 2026-10-07 17:18 -03

A microfase foi continuada na branch `audit/p0-public-acceptance-conversion-20261007` após recuperação dos artefatos históricos. O fluxo público/staff foi endurecido sem deploy ou aplicação de migration:

1. `getPublicVoucherByToken` e o contexto da ficha para tokens `vch_` usam exclusivamente a RPC `get_public_tourism_voucher_by_token`, com allowlist e sem cache.
2. A RPC pública concede `EXECUTE` somente à função para `anon/authenticated`; tabelas de vouchers, viagens e lojas continuam sem leitura direta pública.
3. A conversão staff removeu o conversor legado e exige identidade staff + loja derivada do servidor no BFF e membership no SQL, com operação transacional/idempotente.
4. O contrato de aceite continua sendo preferência de pagamento, não cobrança: nenhum Pix, cartão, boleto, reserva, bilhete ou voucher é criado no aceite.
5. O modal preserva a mensagem de preço confirmado e os testes W12 foram alinhados ao contrato atual `paymentPreference`.

**Provas locais finais:** 29/29 regressões P0, 240 arquivos/1.570 testes amplos, typecheck exit 0, build de produção exit 0 com `client-leak` OK em 491 chunks, `git diff --check` exit 0 e design ratchet sem regressão (redução líquida de 547 violações). A prova SQL/RLS real continua bloqueada pela ausência de `psql`/Supabase CLI/Docker e pela regra de não aplicar migrations sem autorização.
