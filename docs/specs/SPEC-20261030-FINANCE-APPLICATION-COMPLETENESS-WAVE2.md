# SPEC-20261030 — Solicitação Real de Crédito (Onda 2)

## Requisitos EARS

- **Quando** o usuário confirmar uma simulação válida, **o sistema deverá** persistir uma solicitação de crédito vinculada à identidade autenticada, com status `pending_review`.
- **Quando** a solicitação for persistida, **o sistema deverá** retornar seu identificador e exibir somente confirmação de envio para análise; nunca deverá afirmar contratação, aprovação ou liberação de Pix.
- **Quando** a solicitação falhar, **o sistema deverá** manter a tela aberta, mostrar erro e não abrir cronograma nem gerar sucesso fictício.
- **Quando** a oferta real não estiver disponível no backend, **o sistema deverá** remover a promessa visual de pré-aprovação e contratação imediata.

## Invariantes

1. O cliente envia somente intenção e parâmetros da simulação; a identidade vem do servidor.
2. A tabela de solicitações não aceita INSERT/UPDATE/DELETE direto de `anon` ou `authenticated`.
3. O status `pending_review` não representa contrato financeiro nem desembolso.
4. Não existe cronograma de parcelas antes de uma solicitação aprovada e persistida como plano real.

## Escopo autorizado

- `src/components/finance/LoanSimulationSheet.tsx`
- `src/routes/_store.conta.financas.tsx`
- `src/services/loan-applications.functions.ts`
- `src/components/finance/financial-cards-loans.test.tsx`
- `src/integrations/supabase/types.ts`
- `supabase/migrations/20261030171000_loan_application_request.sql`

## Evidência

- teste unitário de validação e estados de erro;
- leitura de retorno persistido antes do toast de sucesso;
- `git diff --check` e typecheck global.
