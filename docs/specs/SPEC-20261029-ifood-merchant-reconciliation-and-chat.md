# SPEC-20261029: Reconciliação Inteligente de Pedidos iFood & Vínculo ao Chat Mobile

## 1. Contexto e Objetivo
Restaurantes, mercados e conveniências conectados ao Waesy recebem pedidos por múltiplos canais: vitrines públicas, chat transacional e marketplaces externos (como o iFood).
Devido a restrições de privacidade (LGPD), pedidos recebidos via iFood Merchant API não fornecem telefone e CPF desmascarados do consumidor.
Esta especificação define o **Motor de Reconciliação Multi-Fatorial e Mapeamento de Clientes**, permitindo à loja:
1. Conectar credenciais oficiais da Merchant API do iFood (`client_id`, `client_secret`, `merchant_id`) de forma segura e criptografada na Central de Integrações.
2. Ingerir eventos e pedidos externos via BFF.
3. Executar reconciliação determinística multi-camada (Geolocalização Haversine < 50m, endereço fuzzy, tokens de nome, janela temporal do chat e correlação de itens/observações).
4. Vincular o pedido do iFood ao cliente e à conversa ativa no Chat Mobile, exibindo status em tempo real (`MILESTONES`), código de entrega e estimativas.

---

## 2. Requisitos em Sintaxe EARS (Easy Approach to Requirements Syntax)

### EARS-01: Conexão Segura de Credenciais (Central de Integrações)
- **WHEN**: O lojista submeter as credenciais da Merchant API do iFood (`merchantId`, `clientId`, `clientSecret`) na Central de Integrações.
- **THEN**: O sistema DEVE criptografar os segredos no cofre de dados (`encryptSecret`), persistir na tabela `integration_credentials` sob o provedor `ifood` isolado por `store_id`, e auditar a ação sem registrar segredos em texto plano.

### EARS-02: Algoritmo de Reconciliação Multi-Fatorial
- **WHEN**: Um pedido externo do iFood for recebido pela loja.
- **THEN**: O motor de reconciliação DEVE calcular a pontuação de similaridade (0 a 100) contra clientes com conversas de chat ou endereços cadastrados na loja:
  - **Camada Geoespacial (35 pts)**: Proximidade Haversine entre coordenadas do pedido e do cliente ($\le 50\text{m} = 35\text{ pts}$; $\le 150\text{m} = 25\text{ pts}$; $\le 500\text{m} = 10\text{ pts}$).
  - **Camada Endereço Fuzzy (25 pts)**: Normalização textual de logradouro, equivalência estrita de número residencial e compatibilidade de CEP.
  - **Camada Nome do Cliente (20 pts)**: Token overlap e Levenshtein no nome e sobrenome do destinatário.
  - **Camada Janela Temporal de Chat (15 pts)**: Mensagem enviada pelo cliente no chat da loja nos últimos 30 min (15 pts) ou 2 horas (8 pts).
  - **Camada Observações e Produtos (5 pts)**: Correlação entre observações do pedido (ex: número de interfone/apartamento) ou itens discutidos no chat.

### EARS-03: Classificação de Confiança e Vínculo
- **WHEN**: O score de reconciliação for calculado.
- **THEN**:
  - Score $\ge 80\%$: classificado como `HIGH_CONFIDENCE`, elegível a auto-associação com o chat do cliente.
  - Score $50\% - 79\%$: classificado como `PROBABLE_MATCH`, apresentado ao lojista no Workspace para confirmação em 1 clique.
  - Score $< 50\%$: classificado como `LOW_CONFIDENCE`, mantido desacoplado aguardando dados adicionais.

### EARS-04: Apresentação no Chat Mobile e Rastreio em Tempo Real
- **WHEN**: Um pedido iFood for vinculado a uma conversa de chat ativa do cliente.
- **THEN**: O chat mobile DEVE renderizar o card de pedido integrado com:
  - Identificação de canal ("Pedido iFood integrado").
  - Status em tempo real seguindo os 11 níveis canônicos (`MILESTONES`).
  - Código de entrega OTP (quando aplicável).
  - Previsão dinâmica de entrega e identificação do entregador/modal.

---

## 3. Modelo de Dados e Invariantes
- **Isolamento Multi-Tenant**: Consultas e persistências DEVEM conter filtro mandatório por `store_id`.
- **Criptografia Zero-Trust**: `client_secret` e tokens de acesso NUNCA devem ser expostos ao cliente web/mobile.
- **Idempotência**: Pedidos do iFood com o mesmo `orderId` externo não devem duplicar registros no histórico de reconciliação.
