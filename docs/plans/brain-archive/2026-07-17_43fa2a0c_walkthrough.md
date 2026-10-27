# Walkthrough: Slice 9 (Motor Transacional de Carrinho)

Este incremento introduz a refatoração do Motor Transacional do Carrinho de Compras da Hr Shoes, elevando a segurança, integridade e reatividade financeira à camada do PostgreSQL (Supabase).

## 1. O Problema Resolvido
Antes, os cupons de desconto (`%`, `valor fixo` ou `frete grátis`) eram calculados e gravados na tabela `carts` via uma Server Function em TypeScript apenas no momento em que o cliente clicava em "Aplicar". Se o cliente alterasse o carrinho logo depois (adicionando mais produtos ou alterando quantidades), o desconto se tornava obsoleto (ficava "congelado"), causando inconsistências nos cálculos até o checkout final.

## 2. A Solução: Backend Authoritative
Adotamos os princípios de arquitetura robusta de e-commerce transferindo a **matemática financeira** 100% para Triggers no Banco de Dados.

### 2.1 Migração SQL (`0048_cart_totals_trigger.sql`)
Foram criadas:
- A PL/pgSQL `trigger_recalculate_cart()` que, ao ser acionada, soma o total dos itens, lê o cupom, calcula se está no limite de usos, data de validade ou valor mínimo, e em seguida preenche dinamicamente as colunas `discount_cents` e/ou `shipping_cents`.
- Uma trigger **BEFORE UPDATE** na tabela `carts` que orquestra a lógica acima.
- Uma trigger **AFTER INSERT OR UPDATE OR DELETE** na tabela `cart_items` que automaticamente "toca" (touch) o `carts.updated_at`, disparando o recálculo imediato do carrinho sem nenhuma requisição de API adicional.

### 2.2 Refatoração em Typescript (BFF)
- O arquivo `src/services/cart.functions.ts` foi severamente enxugado! A função `applyCouponToCart` agora funciona apenas como um atalho: ela emite um `UPDATE carts SET coupon_code = XYZ`.
- A mágica da validação instantânea é toda feita pelo banco, garantindo tolerância a falhas.
- O Typecheck (`tsc --noEmit`) rodou e validou que nenhum contrato foi quebrado para a interface de usuário!

## 3. Benefícios Práticos
1. **Idempotência Garantida:** Se um administrador adicionar itens manualmente ao carrinho do usuário via backoffice (ou via API), os descontos serão ajustados na mesma fração de segundo.
2. **Experiência Limpa:** O usuário do Storefront não verá um desconto de "R$ 10" preso a um carrinho cujo subtotal agora seja "R$ 500". A reatividade é 100%.

## 4. Próximos Passos
Sugiro darmos `push` ou realizarmos a aplicação destas migrações. O próximo macro-incremento pode envolver o Motor de Recuperação de Abandono de Carrinhos com notificações integradas, ou o avanço para a integração de transportadoras automatizadas.
