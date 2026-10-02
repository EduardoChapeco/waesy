# SPEC-F08: Checkout do Marketplace (Fluxo Transacional B2C com Wizard de 3 Etapas)

## 1. Metadados e Controle Normativo
- **Fase:** F08 (Checkout do Marketplace B2C).
- **Plano:** Plano Mestre de Estabilização e Desentrelaçamento dos 4 Pilares.
- **Autoridade:** BigTech Executive Board & Red Team.
- **Invariantes:** M01 (Zero Mocks), M03 (Auditabilidade), M04 (Idempotência), M08 (Integridade Transacional), M10 (Isolamento Multi-Tenant), WCAG 2.2 AA.

---

## 2. Requisitos em Sintaxe EARS

### [REQ-F08-01] Fluxo de Compra em 3 Etapas Estruturadas (Wizard Canônico)
- **EARS (Quando acionado):** QUANDO o consumidor acessar a rota `/marketplace/checkout`, O SISTEMA DEVE apresentar um fluxo transacional ordenado em 3 etapas sequenciais com validação por etapa:
  1. **Etapa 1 (Itens & Sacola):** Revisão quantitativa de produtos selecionados, conferência de preços por centavos inteiros e identificação da loja credenciada vendedora.
  2. **Etapa 2 (Endereço & Frete):** Coleta de endereço de entrega, validação de CEP e seleção da modalidade de entrega com cálculo automático de taxa e prazo.
  3. **Etapa 3 (Pagamento & Confirmação):** Escolha da forma de pagamento (Pix instantâneo, Cartão de Crédito ou Pagamento na Entrega), geração de idempotency_key e confirmação final.

### [REQ-F08-02] Cálculo Determinístico de Frete e Estimativa de Entrega
- **EARS (Quando acionado):** QUANDO o consumidor informar ou selecionar o endereço na Etapa 2, O SISTEMA DEVE invocar a Server Function `calculateMarketplaceShippingFn` informando `storeId`, `cep` e `weightGrams`, retornando as opções disponíveis (Entrega Expressa MotoLink, Padrão ou Retirada no Local) com taxa em centavos inteiros.

### [REQ-F08-03] Criação Atômica de Pedido com Reserva de Estoque e Isolamento de Pilar
- **EARS (Quando acionado):** QUANDO o consumidor finalizar a compra na Etapa 3, O SISTEMA DEVE invocar a Server Function transacional `createMarketplaceOrderFn`:
  - Validar payload com schema Zod rigoroso (`CreateMarketplaceOrderInputSchema`).
  - Gravar pedido na tabela `orders` associando `store_id` e metadados de pilar `pilar: "marketplace"`.
  - Deduzir ou reservar estoque em `product_variants` / `products`.
  - Disparar evento de domínio `order.created` no barramento outbox com rastreabilidade auditável.
  - Retornar ID do pedido e confirmação com instruções de acompanhamento.

### [REQ-F08-04] Ergonomia Visual, Design Silencioso e Acessibilidade (WCAG 2.2 AA)
- **EARS (Ubíquo):** Todos os controles táteis DEVEM ter altura mínima de 44px (`h-11`), anel de foco teclado `:focus-visible:ring-2`, tipografia da escala de tokens, ausência de valores arbitrários entre colchetes (DL-02), conformidade estrita com a grade modular de 4px e respeito a `motion-reduce`.

---

## 3. Critérios de Aceite e Métricas
1. `src/services/marketplace-checkout.functions.ts` exporta `createMarketplaceOrderFn` e `calculateMarketplaceShippingFn` validados com Zod.
2. `src/routes/_store.marketplace.checkout.tsx` implementa o stepper de 3 etapas com matriz de estados (loading, empty se carrinho vazio, error, dados).
3. Suíte de testes `src/services/marketplace-checkout.functions.test.ts` com testes unitários cobrindo cálculo de frete, validação de schemas e criação de pedido.
4. `npm run typecheck` Exit Code 0.
5. `node scripts/design-lint.mjs --ratchet` Exit Code 0 (0 regressões).
