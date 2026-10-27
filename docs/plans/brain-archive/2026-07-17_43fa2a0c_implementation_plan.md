# Plano de Implementação: Slice 9 (Motor Transacional de Carrinho e Promoções)

## Contexto e Objetivo
Atualmente, a aplicação de cupons no carrinho (arquivo `cart.functions.ts`) calcula o desconto e salva em `carts.discount_cents` no exato momento do clique. 

**O Problema (Vulnerabilidade E-commerce):** Se o cliente aplica um cupom de 10% de desconto (tendo R$ 100 no carrinho, gerando R$ 10 de desconto), e depois **adiciona outro produto de R$ 50**, o carrinho continua mostrando R$ 10 de desconto na interface, porque o recálculo só acontece para valer na RPC final de checkout (`process_checkout_atomic`). Isso gera inconsistência visual severa e atrito de conversão.

**A Solução (Backend Authoritative):** O Supabase deve governar os totais. Criaremos Triggers no banco de dados (`cart_items` e `carts`) para recalcular automaticamente o subtotal, o frete e o desconto em tempo real. Assim que um item for adicionado/removido, o banco reavalia o cupom, atualizando os campos na raiz do `carts`.

## User Review Required

> [!WARNING]
> Este plano fará com que o cálculo do carrinho se torne 100% automático no banco de dados (Triggers e Functions em PL/pgSQL). 
> As funções antigas do Node.js/TypeScript que tentavam calcular matemática financeira (`cart.functions.ts`) serão **deletadas e simplificadas**, agindo apenas como pass-through. Você concorda com essa migração arquitetural para o PostgreSQL?

## Proposed Changes

---

### Módulo de Banco de Dados (Supabase / PLpgSQL)

#### [NEW] [supabase/migrations/0048_cart_totals_trigger.sql](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Music/hr-shoes-opus/supabase/migrations/0048_cart_totals_trigger.sql)
- Criar a função `calculate_cart_totals_and_promotions()`.
- Lógica interna: 
  - Soma `(qty * price_snapshot_cents)` de todos os itens do carrinho;
  - Se houver `coupon_code` na tabela `carts`, cruza com a tabela `coupons` verificando validade e limite.
  - Aplica a matemática de `%`, `valor fixo` ou `frete grátis`.
  - Atualiza os campos na linha principal do `carts`.
- Criar trigger em `cart_items` para `AFTER INSERT OR UPDATE OR DELETE` (para cada vez que o cliente alterar itens).
- Criar trigger em `carts` para `AFTER UPDATE OF coupon_code` (para reavaliar sempre que o código for setado/removido).

---

### Módulo de Operações (BFF)

#### [MODIFY] [src/services/cart.functions.ts](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Music/hr-shoes-opus/src/services/cart.functions.ts)
- Eliminar o bloco massivo de cálculos dentro de `applyCouponToCart`. Agora a função simplesmente fará um `UPDATE carts SET coupon_code = 'XYZ'`. Todo o cálculo será delegado à nossa nova Trigger do Banco.
- Expor `removeCouponFromCart` de forma limpa (`UPDATE carts SET coupon_code = NULL`).

#### [MODIFY] [src/routes/_store.carrinho.tsx](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Music/hr-shoes-opus/src/routes/_store.carrinho.tsx)
- O Storefront ficará mais fluido e sem estado fantasma, pois a resposta do banco sempre voltará com o total financeiro exato de acordo com as regras atuais.

---

## Verification Plan

### Automated Tests
- Rodar `npm run typecheck`.

### Manual Verification
1. Adicionar 1 par de tênis ao carrinho.
2. Aplicar um cupom de % (ex. 10%).
3. Verificar na interface o desconto exato.
4. Adicionar um **segundo** par de tênis.
5. Observar se o desconto (no resumo financeiro) é **recalculado automaticamente** (sem precisar reapertar "Aplicar cupom") devido à mágica das triggers de banco de dados.
