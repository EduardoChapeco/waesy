# Auditoria real de RLS, Storage e pagamentos — 2026-10-07

## Escopo

Auditoria do projeto Supabase `jfuebqmltksyznovhlwa` e dos BFFs de carrinho, checkout, pagamentos, faturas e webhooks de marketplace.

## Achados confirmados e correções

1. **Storage:** `classified-media` estava `public = true` no banco e também entrava na policy pública `media_public_read`. A migration `storage_tenant_boundary_hardening` foi aplicada no banco real; o bucket agora está privado e a policy pública não o inclui.
2. **Storage upload:** a policy genérica de INSERT aceitava qualquer caminho dentro dos buckets de mídia para qualquer usuário autenticado. A policy aplicada agora exige ownership, caminho com UID, caminho com store pertencente ao workspace ou role administrativa.
3. **Pagamento:** `initiatePaymentTransaction` criava referências locais (`pending_ext_*`) e retornava sucesso sem chamada ao gateway. O caminho não manual agora chama `createGatewayPayment` e só persiste a referência retornada pelo provider. Se não houver provider configurado, a chamada falha explicitamente.
4. **Pagamento manual:** não é mais reportado como cobrança gerada/sucesso; fica `pending` aguardando comprovante.
5. **Faturas:** removidos chave Pix, beneficiário e payload copia-e-cola hardcoded. A função exige `PLATFORM_PIX_KEY` e `PLATFORM_PIX_BENEFICIARY_NAME`; sem configuração, falha explicitamente.
6. **Marketplace:** removido `simulateMarketplaceOrder`, que fabricava cliente, endereço, SKU, taxas e pedido externo. A documentação foi atualizada para não anunciar a função removida.
7. **Carrinho:** removido fallback que escolhia a primeira loja existente do banco quando o tenant/produto não resolvia a loja; agora retorna estado não configurado.

## Evidência de validação

- `npm run typecheck`: PASS.
- Testes direcionados de pagamento, checkout e carrinho: PASS — 1 arquivo, 7 testes.
- `git diff --check`: PASS.
- Migration aplicada no Supabase real como `storage_tenant_boundary_hardening`.
- Verificação pós-migration: `classified-media.public = false`; `media_public_read` lista buckets públicos e não inclui `classified-media`.

## Limites honestos

Esta auditoria não afirma que qualquer gateway externo esteja configurado. O código agora distingue provider real de ausência de configuração e não inventa cobrança, Pix, pedido, cliente ou resposta externa. Também não equivale a um teste de pagamento real, webhook real ou deploy em produção.
