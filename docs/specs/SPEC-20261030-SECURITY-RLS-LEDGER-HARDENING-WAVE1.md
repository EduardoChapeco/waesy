# SPEC-20261030 — Hardening de RLS, ledger e criptografia

## Objetivo

Converter os candidatos de segurança da auditoria em correções comprovadas sem quebrar ingestões públicas legítimas, fluxos financeiros, tenants ou registros legados.

## Ordem obrigatória

1. Classificar as 23 policies anon/public permissivas por domínio, dado aceito, abuso possível e necessidade real de anonimato.
2. Separar policies de `service_role` das policies de cliente e confirmar grants efetivos.
3. Rastrear as mutations financeiras até RPC, persistência, idempotência, ledger e telemetria.
4. Inventariar registros criptográficos legados e preparar migração AES-256-GCM com readback antes de bloquear compatibilidade.
5. Corrigir um domínio financeiro por microfase, com teste positivo, negativo, tenant cruzado, retry, concorrência e reload.

## Requisitos EARS

- Quando uma policy permitir escrita anon/public, o banco deve limitar a operação ao payload mínimo necessário, sem aceitar campos de identidade, tenant, preço, saldo ou status privilegiado.
- Quando uma mutation financeira alterar valor, saldo, comissão, pagamento, pedido ou caixa, o sistema deve persistir a operação de forma idempotente, server-side e auditável.
- Quando a operação financeira falhar no ledger, o sistema deve falhar de forma visível ou permanecer transacionalmente pendente; nunca deve confirmar sucesso com divergência silenciosa.
- Quando um segredo legado estiver em base64, o servidor deve migrá-lo para AES-256-GCM antes de permitir novo uso persistente e deve registrar a migração sem expor o plaintext.
- Quando uma função de auditoria registrar telemetria, o payload deve excluir segredo, token, documento integral, cartão e conteúdo sensível não necessário.

## Invariantes

- Nenhuma policy pública será removida sem identificar o CTA, BFF, migration e fluxo que a utiliza.
- Nenhuma policy será ampliada para corrigir erro de acesso.
- Nenhuma alteração financeira confiará em preço, tenant, role ou identidade enviados pelo cliente.
- Nenhum segredo será logado, retornado ao cliente ou armazenado em base64 como proteção.
- Toda migration terá rollback lógico, teste em banco efêmero e readback das policies.

## Escopo da primeira implementação

A primeira implementação trata somente o agregado `group_tour_cash_ledger`; as demais 23 policies permanecem em classificação própria. O escopo desta onda é:

- `supabase/migrations/20261030122933_group_tour_cash_atomic_ledger.sql`: idempotência, RPC server-side atômica, RLS de leitura por equipe, grants mínimos e vínculo ao caixa central.
- `src/services/group-tour-cash.functions.ts`: BFF sem INSERT/DELETE direto, com identidade server-side e erro propagado.
- `src/components/tourism/groups/group-tour-cash-ledger.tsx`: ação de exclusão convertida em estorno explícito.
- `src/integrations/supabase/types.ts` e `src/services/group-tour-cash.test.ts`: contrato e regressão do caminho RPC.

O lançamento original nunca é apagado. Quando houver vínculo com o caixa central, o estorno cria também a entrada compensatória no caixa central aberto; se esse caixa não existir, a operação falha sem confirmar sucesso.

## Evidências de aceite

- Catálogo remoto antes/depois das policies e grants.
- Testes JWT para `anon`, `authenticated`, tenant correto, tenant cruzado e `service_role`.
- Teste de retry idempotente e falha de ledger sem confirmação falsa.
- Inventário de registros base64, migração AES validada e nenhum plaintext em logs.
- `check-bff-table-contracts`, testes focados, `check-circular-deps` e diff cirúrgico aprovados.
- Código local, migration e contrato TypeScript devem passar antes de qualquer aplicação remota; aplicação Supabase e readback de produção continuam evidências separadas.
