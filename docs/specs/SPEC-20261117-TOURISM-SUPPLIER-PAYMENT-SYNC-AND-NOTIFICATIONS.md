# SPEC-20261117: Sincronização E2E de Pagamento por Fornecedor, Aviso de Base Dupla e Notificações Visuais

## 1. Contexto e Problema
- Condições de pagamento/parcelamento (ex.: 16x, 18x, 24x, Pix, Boleto, Cartão) não existem no cadastro de `travel_suppliers` e sofrem deriva em cada etapa do funil: Cotação -> Editor PDF (`studio-sidebar-editor`) -> Lâmina (`proposal-canvas-renderer`) -> Página Web (`_store.proposta.$token`) -> Modal de Aceite (`travel-proposal-checkout-modal`) -> Banco (`travel_proposal_acceptances_payment_installments_check`) -> Reserva (`SmartTravelBookingModal`), com tetos hardcoded em `12x` ou `10x`.
- Pacotes/ofertas anunciados para 2 adultos (base dupla) que permitem incluir crianças ou alterar passageiros não exibem aviso explícito de que o acréscimo será cotado e atualizado para aceite.
- Aceites de propostas (`approveTravelProposal`), reservas de excursão (`bookGroupTourReservation`) e compras (`orders`/`checkout`) não geram notificações visuais na tabela `notifications` para o dono/equipe da loja no Workspace (`NotificationBell`), nem destacam aceites pendentes de conversão no Kanban (`/workspace/turismo`).

## 2. Requisitos em Sintaxe EARS
1. **R1 (Política de Pagamento no Fornecedor — SSOT):**
   Quando um fornecedor (`travel_suppliers`) é criado ou editado, o sistema deve persistir `max_card_installments` (1..36), `max_boleto_installments` (1..36), `card_interest_free` (boolean), `boleto_requires_downpayment` (boolean), `boleto_downpayment_pct` (0..100), `pix_discount_pct` (0..100), `allowed_payment_methods` (array) e `payment_terms_template` (texto).
2. **R2 (Sincronização Automática em Cotação, Proposta, PDF e Web):**
   Quando um fornecedor é selecionado na Cotação (`UnifiedProposalWorkspace`) ou no Editor Studio (`StudioSidebarEditor`), o sistema deve preencher automaticamente `installments_options` e `payment_terms` a partir do fornecedor sem teto artificial de 12x, propagando os mesmos valores para `ProposalCanvasRenderer`, `proposalToEditorialClassified` e `_store.proposta.$token`.
3. **R3 (Desbloqueio de Parcelas no Aceite e Reserva):**
   Enquanto a proposta ou reserva configurar `max_installments` até 36x, `TravelProposalCheckoutModal`, `approveTravelProposal`, a constraint `travel_proposal_acceptances_payment_installments_check` e `SmartTravelBookingModal` devem aceitar e exibir o máximo configurado pela operadora/proposta (ex.: 16x).
4. **R4 (Aviso de Base 2 Adultos / Recotação de Crianças e Extras):**
   Quando um cliente ou operador interage com pacote de base dupla (2 adultos) e altera a quantidade de adultos ou inclui crianças (`SmartTravelBookingModal` / `TravelPromoFlyerModal`), a interface deve exibir aviso explícito informando que o valor base refere-se a 2 adultos e que alterações de hóspedes/crianças serão cotadas e atualizadas para aceite.
5. **R5 (Notificações Visuais de Aceites, Reservas e Compras):**
   Quando uma proposta é aceita (`approveTravelProposal`), uma reserva é confirmada (`bookGroupTourReservation`) ou um pedido é criado (`createOrder` / `createCheckoutOrder`), o BFF deve inserir notificação para os responsáveis da loja (`owner_id` + `store_members` ativos) na tabela `notifications`, alimentando o `NotificationBell` em tempo real, e o Kanban (`/workspace/turismo`) deve exibir banner/contador visual de propostas aceitas aguardando conversão em viagem.

## 3. Arquivos Autorizados
- `supabase/migrations/20270117000001_supplier_payment_policy_and_installments_36.sql` (novo)
- `src/lib/tourism/payment-policy.ts` (novo)
- `src/lib/notifications/store-staff-notify.ts` (novo)
- `src/types/travel-suppliers.ts`
- `src/services/travel-suppliers.functions.ts`
- `src/components/tourism/suppliers/new-supplier-wizard.tsx`
- `src/components/tourism/unified-proposal-workspace.tsx`
- `src/components/tourism/studio/studio-sidebar-editor.tsx`
- `src/components/tourism/studio/proposal-canvas-renderer.tsx`
- `src/lib/tourism/proposal-editorial-mapper.ts`
- `src/components/tourism/studio/travel-proposal-checkout-modal.tsx`
- `src/routes/_store.proposta.$token.tsx`
- `src/services/travel-proposal.functions.ts`
- `src/components/tourism/booking/SmartTravelBookingModal.tsx`
- `src/components/tourism/promotional-flyer/travel-promo-flyer-modal.tsx`
- `src/services/group-tours.functions.ts`
- `src/services/checkout.functions.ts`
- `src/services/orders.functions.ts`
- `src/routes/workspace.turismo.index.tsx`
- `src/lib/tourism/__tests__/payment-policy.test.ts` (novo)

## 4. Critérios de Aceite & Evidências
- Testes unitários em `src/lib/tourism/__tests__/payment-policy.test.ts` validando geração de `installments_options` até 24x/36x e fallback seguro.
- Migration aplicada no Supabase `jfuebqmltksyznovhlwa` com zero erros.
- `npm.cmd run lint:design`, `npm.cmd run audit:buttons`, `npm.cmd run check:bff`, `npm.cmd run typecheck` e `npm.cmd run build` com exit code 0.
