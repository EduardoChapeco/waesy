# Comércio, Delivery e Serviços no Chat: Do Pedido à Entrega (Prompt 10)

## 1. Princípio da Verdade Única Canônica
O chat é uma superfície de entrada conversacional; o módulo transacional (`src/services/orders.functions.ts`, `src/services/cart.functions.ts`) é a fonte única da verdade. Nenhuma compra, reserva ou entrega existe apenas no histórico do chat.

## 2. Ciclo Transacional Completo no Chat

```
[Seleção de Itens no Catálogo]
            ↓
[Adição ao Carrinho Canônico com Validação de Estoque Real]
            ↓
[Cálculo de Frete e Janela de Entrega / Retirada]
            ↓
[Emissão de Cobrança PIX / Cartão / Saldo]
            ↓
[Confirmação de Pagamento via Webhook Seguro]
            ↓
[Despacho MotoLink com Telemetria em Tempo Real]
            ↓
[Entrega Confirmada com Assinatura ou PIN]
```

## 3. Rastreio em Tempo Real via Eventos
- Sem simulações ou tempos artificiais: o status do pedido avança conforme atualizações reais no painel do lojista (`workspace/pedidos/gestor`) e aplicativo do entregador (`motolink`).
- Bloco visual de progresso dinâmico:
  1. `received` (Pedido recebido pela loja)
  2. `confirmed` (Loja aceitou o pedido)
  3. `preparing` (Em preparação na cozinha/separação)
  4. `dispatched` (Entregador em trânsito)
  5. `delivered` (Concluído)

## 4. Agendamento de Serviços e Prestadores
- Checagem determinística de conflitos de horário com `calendar_bookings`.
- Confirmação imediata com envio de lembrete por WhatsApp e notificação push PWA.
