# Fluxos End-to-End por Caso de Uso — Auditoria Forense Waesy

## Fluxo 1: Compra Gastronômica & Delivery Waesy Go com Chegada GPS
- **Persona:** Consumidor Civil / Cliente de Delivery
- **Intenção:** Fazer pedido de restaurante com modificadores e acompanhar entrega na portaria.
- **Pré-condição:** Estabelecimento aberto, produto com adicionais configurados.
- **Passos:**
  1. Cliente acessa `/_store/produto/hamburguer-artesanal` -> Carrega produto e grupos de modificadores -> Visualiza opções obrigatórias.
  2. Seleciona adicionais (ex: Ponto da Carne, Queijo Extra) -> Thumb Zone atualiza valor dinâmico -> Clica em "Adicionar à Sacola".
  3. Avança para `/_store/checkout` -> Seleciona endereço salvo em `user_addresses` (com bloco/apartamento e preferência de portaria).
  4. Finaliza com Pix Dinâmico -> Pedido gravado em `orders` com status `paid`.
  5. Motoboy aproxima do raio GPS -> Executa `recordCourierArrival` -> Ativa contagem regressiva de tolerância de 10 min.
  6. Cliente recebe notificação em tempo real na tela de rastreamento `/_store/pedidos/$id/entrega`.
- **Estado final esperado:** Pedido entregue sem estorno indevido e com rastreabilidade auditada.
- **Veredito:** ÍNTEGRO.

## Fluxo 2: Atendimento Presencial no PDV com Planta do Salão de Mesas 2D
- **Persona:** Garçom / Operador de Caixa
- **Intenção:** Abrir mesa no salão, lançar itens do pedido e fechar venda com impressão térmica.
- **Pré-condição:** Caixa aberto com fundo de troco inicial.
- **Passos:**
  1. Operador acessa `/workspace/pdv/` -> Visualiza terminal de vendas.
  2. Clica no seletor de "Mesa / Salão" -> Abre visualizador da Planta do Salão 2D (`store_floor_plans`).
  3. Clica na Mesa 04 (Livre) -> Mesa é vinculada ao ticket ativo.
  4. Bipa itens ou clica nos cards -> Adiciona modificadores de cozinha.
  5. Pressiona F4 ou clica em "Finalizar" -> Seleciona Pix/Cartão -> Processa venda atômica no `cash_registers`.
  6. Imprime cupom térmico ESC/POS e libera a mesa.
- **Ponto de Quebra Original:** O PDV não lia a planta do salão do backend (`getStoreFloorPlan`) nem abria comanda visual na mesa.
- **Veredito:** GAP P1 (Em Correção).

## Fluxo 3: Perícia Visual Anti-Fraude em Trocas e Devoluções (RMA)
- **Persona:** Cliente Solicitando Garantia / Operador de Loja
- **Intenção:** Solicitar troca com foto autêntica e lojista auditar com laudo de IA.
- **Pré-condição:** Pedido entregue nas últimas 48h.
- **Passos:**
  1. Cliente entra em `/_store/conta/trocas` -> Seleciona pedido e faz upload da foto da avaria.
  2. Backend executa `analyzeClaimForScam` -> Inspeciona artefatos de IA sintética, metadados e compressão.
  3. Se autêntico: Emite selo "Foto Autêntica Verificada". Se suspeito: Sinaliza "Suspeita de IA / Golpe".
  4. Lojista em `/workspace/pedidos/trocas` abre o `ResolutionDrawer` -> Analisa foto e laudo pericial antes de aprovar estorno.
- **Estado final esperado:** Proteção total contra golpes de devolução simulada.
- **Veredito:** ÍNTEGRO.
