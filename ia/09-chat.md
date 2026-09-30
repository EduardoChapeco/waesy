# Chat AI-First: Mensagem Estruturada, Widgets e Ações Tipadas (Prompt 09)

## 1. Princípio do Chat de Interface
O chat do Waesy não responde meros blocos de texto corrido. Toda resposta relevante é uma composição de **Widgets Tipados** desenhados com os mesmos componentes do ecossistema (`src/components/builder/registry.ts`).

## 2. Protocolo de Mensagem Estruturada

```typescript
export interface AIChatMessagePayload {
  id: string;
  sender_role: "user" | "assistant" | "system" | "agent";
  agent_id?: string;
  text?: string;
  blocks?: Array<{
    type: "product_card" | "carousel" | "table" | "order_tracker" | "form" | "action_button";
    data: Record<string, any>;
  }>;
  actions?: Array<{
    id: string;
    label: string;
    action_type: "navigate" | "open_checkout" | "add_to_cart" | "book_date" | "confirm_proposal";
    payload: Record<string, any>;
  }>;
  telemetry: {
    latency_ms: number;
    tokens_used: number;
    model: string;
  };
}
```

## 3. Catálogo de Ações do Menu "+"
- **Buscar no Catálogo**: Seleciona e insere produtos reais da loja corrente.
- **Criar Orçamento / Proposta**: Gera negociação com cálculo automático de parcelas.
- **Enviar Localização**: Ponto no mapa via MapLibre.
- **Solicitar Entrega MotoLink**: Dispara cotação instantânea para entregadores.
- **Agendar Atendimento**: Seleciona horários livres na agenda do lojista.

## 4. Experiência de Mensageria
- Envio otimista com tratamento visual de reenvio em caso de falha de conexão.
- Agrupamento temporal inteligente de mensagens consecutivas do mesmo autor.
- Rolagem suave com ancoragem inferior automática e botão de salto para o final.
