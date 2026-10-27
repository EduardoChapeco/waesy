# SPEC-PEDIDOS-ORDERS-END-TO-END-REMEDIATION — Auditoria, Correção e Refatoração End-to-End do Módulo de Pedidos e Histórico

## 1. Contexto e Motivação
A tela de Pedidos (`/_store/conta/pedidos/`) e Detalhes do Pedido (`/_store/conta/pedidos/$id`) carrega a promessa explícita:
> *"Suas compras em lojas e restaurantes parceiros aparecerão aqui com rastreamento em tempo real."*

A presente auditoria identificou e corrige os seguintes pontos críticos:
1. **Dados Incompletos nas Consultas BFF**: `listCustomerOrders` e `getCustomerOrder` não selecionavam os dados do estabelecimento (`stores`), o número oficial do pedido (`order_number`), o código de rastreamento (`tracking_code`) nem a imagem do produto (`image_url` em `order_items`), resultando em títulos genéricos, ausência de logos/nomes de lojas e fotos quebradas;
2. **Ausência de Rastreamento em Tempo Real**: Nenhuma subscrição Realtime existia no cliente, descumprindo a promessa da tela caso o restaurante ou expedição atualizasse o pedido para "Em Preparo", "Pronto" ou "A Caminho";
3. **Ausência de Linha do Tempo Visual (Order Timeline)**: Embora a tabela `order_events` e a função `getOrderTimelineEvents` existissem no backend, a tela de detalhes não renderizava a esteira visual com timestamps reais de cada transição de estado;
4. **Ausência de Cancelamento pelo Cliente**: Clientes com pedidos em `awaiting_payment`, `paid` ou `processing` não possuíam botão ou função para solicitar cancelamento com estorno e devolução de estoque;
5. **Ausência de Recompra ("Pedir Novamente")**: Não havia fluxo de recompra revalidando preços de catálogo e disponibilidade atual;
6. **Ausência de Suporte Contextualizado**: Ao precisar de suporte, o usuário era direcionado sem o transporte automático de `order_id`, itens, valores e estabelecimento.

---

## 2. Requisitos em Sintaxe EARS

### [EARS-01] Paridade Completa de Dados no Histórico do Cliente
- **Quando** o cliente acessar o histórico de pedidos (`listCustomerOrders`) ou os detalhes (`getCustomerOrder`);
- **O sistema DEVE** retornar os dados canônicos enriquecidos: `order_number`, dados da loja (`stores.name`, `stores.slug`, `stores.avatar_url`, `stores.phone`), snapshots dos itens (`order_items.image_url`, `order_items.product_title`, `order_items.unit_price_cents`), rastreio (`tracking_code`), modalidade de entrega (`shipping_method`) e endereço (`shipping_address`);
- **Invariante:** Mudanças posteriores de catálogo (preço ou exclusão de produto) NÃO DEVEM alterar os snapshots congelados do pedido.

### [EARS-02] Rastreamento em Tempo Real com Fallback Resiliente
- **Quando** o cliente estiver visualizando a lista de pedidos ou o detalhe de um pedido ativo (`awaiting_payment`, `paid`, `processing`, `shipped`, `ready_for_pickup`);
- **O sistema DEVE** escutar atualizações via Supabase Realtime no canal da tabela `orders` e manter um ciclo de auto-revalidação (polling adaptativo a cada 8 segundos) como fallback de resiliência;
- **Invariante:** Transições disparadas pelo Workspace do estabelecimento (ex: `paid` → `processing` → `ready_for_pickup` → `shipped`) DEVEM refletir na tela do cliente sem necessidade de recarregamento manual da página.

### [EARS-03] Linha do Tempo Visual de Transições com Timestamps Reais
- **Quando** o cliente abrir a rota de detalhes (`/_store/conta/pedidos/$id`);
- **O sistema DEVE** renderizar uma timeline visual progressiva das etapas do pedido (Realizado → Confirmado → Em Preparo → Pronto / A Caminho → Entregue), indicando o status ativo e os horários reais registrados em `order_events` ou timestamps da tabela `orders`;
- **Invariante:** Pedidos cancelados devem exibir imediatamente o banner destrutivo com o motivo e timestamp do cancelamento.

### [EARS-04] Cancelamento Transacional pelo Cliente com Desbloqueio de Estoque
- **Quando** o cliente solicitar cancelamento via `cancelCustomerOrder` para um pedido em estado elegível (`draft`, `awaiting_payment`, `paid`, `processing`);
- **O sistema DEVE** executar o cancelamento atômico (`cancel_order` RPC), registrar o evento em `order_events` com ator `customer`, estornar eventuais reservas de estoque e notificar o estabelecimento;
- **Invariante:** Pedidos já enviados (`shipped`), prontos para retirada ou entregues (`delivered`) NÃO PODEM ser cancelados diretamente (devem seguir o fluxo de RMA / Devolução).

### [EARS-05] Recompra Revalidada ("Pedir Novamente")
- **Quando** o cliente acionar a ação "Pedir Novamente" (`reorderCustomerOrder`);
- **O sistema DEVE** inspecionar os itens do pedido anterior, revalidar os preços vigentes no catálogo e a disponibilidade de estoque, adicionar os itens válidos ao carrinho ativo do usuário e direcioná-lo ao checkout;
- **Invariante:** A recompra nunca deve aplicar preços defasados sem consentimento do usuário.

### [EARS-06] Suporte e Atendimento com Contexto Automático
- **Quando** o cliente clicar em "Ajuda / Suporte deste Pedido";
- **O sistema DEVE** transportar automaticamente os parâmetros da transação (`order_id`, `order_number`, `store_id`, `total_cents`, `status`) para a rota de suporte, eliminando a necessidade de redigitação manual pelo cliente;
- **Invariante:** O ticket de suporte nasce vinculado de forma imutável ao UUID do pedido.

---

## 3. Matriz de Aceite e Evidências
1. BFF `src/services/order.functions.ts` enriquecido com `cancelCustomerOrder`, `reorderCustomerOrder`, e selects completos de `stores`, `order_number`, `order_items.image_url`.
2. Componente de timeline e rastreamento em tempo real implementado em `src/routes/_store.conta.pedidos.$id.tsx` e `src/routes/_store.conta.pedidos.index.tsx`.
3. Modal de cancelamento pelo cliente com motivo e confirmação integrado.
4. Botão de suporte contextualizado com transporte de parâmetros transacionais.
5. Suíte de testes automatizados `src/services/__tests__/customer-orders-end-to-end.test.ts` cobrindo 100% dos requisitos EARS.
6. `npm run typecheck` com Exit Code 0.
