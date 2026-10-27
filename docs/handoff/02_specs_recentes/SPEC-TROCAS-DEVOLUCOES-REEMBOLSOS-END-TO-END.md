# SPEC-TROCAS-DEVOLUCOES-REEMBOLSOS-END-TO-END.md — Especificação Canônica do Módulo Trocas, Devoluções, Garantias e Reembolsos

## 1. Visão Geral e Arquitetura de Domínio
O módulo de **Trocas, Devoluções, Garantias e Reembolsos** é a extensão natural do ciclo de vida pós-venda dos pedidos na plataforma Waesy.
- **Princípio da Linguagem Comercial Limpa:** Toda a complexidade técnica interna (RMA, disposition, warehouse inspection, reverse logistics, SLA, webhook settlement) é encapsulada no backend e no Workspace. Para o cliente final, a interface comunica-se estritamente através de conceitos comerciais intuitivos: **Trocas • Devoluções • Garantias • Reembolsos • Acompanhar Solicitação**.
- **Princípio da Segregação de Dados Privados:** Nenhuma anotação interna, comentário operacional, análise antifraude, margem ou score privado da empresa é retornado pelos endpoints do cliente. A separação é feita no nível do BFF e DTO, e nunca apenas por CSS/ocultação de tela.
- **Princípio da Vinculação Real de Pedidos:** Nenhuma solicitação comercial existe no vácuo. Toda solicitação nasce de um pedido real (`orders`) e itens específicos (`order_items`), preservando imutabilidade histórica mesmo se o produto for posteriormente alterado no catálogo.

---

## 2. Requisitos Estruturados em Sintaxe EARS

### EARS-01: Linguagem 100% Comercial e Amigável ao Consumidor
- **O sistema deve** apresentar todas as telas, modais, status, notificações e recibos do consumidor em linguagem comercial transparente:
  - `"pending"` → `"Aguardando Análise da Loja"`.
  - `"authorized"` → `"Devolução Aprovada • Envie o Produto"`.
  - `"shipped_back"` → `"Produto a Caminho da Loja"`.
  - `"received"` → `"Produto Recebido pela Loja"`.
  - `"inspected"` → `"Em Avaliação Técnica"`.
  - `"resolved"` → `"Solicitação Concluída • Reembolso Realizado"`.
  - `"rejected"` → `"Solicitação Não Aprovada"`.
- **O sistema não deve** expor ao cliente siglas como `RMA`, termos como `Logística Reversa` ou enums crus.

### EARS-02: Seleção Estruturada por Item e Quantidade do Pedido
- **Quando** o cliente inicia uma solicitação de pós-venda,
- **O sistema deve** exibir a lista de compras/pedidos reais entregues ou concluídos da sua conta, permitindo selecionar o item específico (`order_item_id`) e a quantidade a ser trocada ou devolvida (respeitando `qty <= item.quantity`).
- **O sistema não deve** exigir que o cliente digite novamente número de pedido, valor, nome da loja ou data da compra.

### EARS-03: Tripla Bifurcação: Troca, Devolução ou Garantia
- **Quando** o cliente seleciona a solução desejada,
- **O sistema deve** orientar o fluxo com base em 3 opções canônicas:
  1. **Trocar Produto:** Troca por outro tamanho, cor ou variação compatível com estoque verificado.
  2. **Devolver e Receber Reembolso:** Desistência no prazo legal (Art. 49 CDC) com estorno integral no meio de pagamento ou vale-compras.
  3. **Problema ou Garantia:** Acionamento de garantia legal/contratual por defeito funcional ou vício oculto com suporte a evidência fotográfica.

### EARS-04: Segregação Rigorosa de Notas Internas (Zero Leaking)
- **O backend/BFF do cliente deve** retornar estritamente os campos públicos e mensagens compartilhadas (`public_messages`, `trackingCode`, `status`, `resolutionType`).
- **O sistema nunca deve** retornar observações operacionais da equipe, análises periciais confidenciais (`[LAUDO_PERICIAL]`), antifraude ou anotações internas da loja para a sessão do consumidor.

### EARS-05: Sincronização Bidirecional com o Workspace da Loja
- **Quando** o cliente abre uma solicitação,
- **O sistema deve** disponibilizá-la instantaneamente no painel da loja (`/workspace/pedidos/trocas`) com colunas operacionais (Novas, Em Andamento, Concluídas, Rejeitadas).
- **Quando** o lojista aprova a devolução, gera código de postagem ou emite crédito/reembolso, o status reflete em tempo real na conta do cliente sem dessincronização.

### EARS-06: Prevenção de Fraudes e Idempotência de Reembolsos
- **O sistema deve** garantir que:
  1. Uma mesma unidade de item não possa ter duas solicitações ativas concorrentes.
  2. O valor do reembolso não exceda o valor efetivamente pago pelo item (considerando rateio de cupons e descontos).
  3. Solicitações com upload de imagem passem por verificação de autenticidade sem travar a experiência do usuário idôneo.

### EARS-07: Ergonomia de Design & WCAG 2.2 AA
- **O sistema deve** adotar:
  - Mobile (< 600px): `NativeMobileHeader` com fallback `/conta`, cards verticais em squircle `rounded-xl`, alvos de toque mínimos de 44px (`h-11 min-h-11`), zero `truncate` e upload de foto integrado via câmera ou galeria.
  - Desktop (>= 840px): Layout widescreen `max-w-5xl mx-auto`, tabela/kanban com badges de status semânticos e atalhos rápidos para o suporte.
