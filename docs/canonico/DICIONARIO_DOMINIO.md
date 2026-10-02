# DICIONARIO DE DOMINIO UBÍQUO — WAESY v2.0

## 1. Declaracao de Escopo e Soberania Semantica
Este documento estabelece o glossario normativo da plataforma Waesy. Os termos aqui declarados sao mandatorios e devem ser utilizados de forma homogenea em schemas Zod, modelos de banco de dados, nomes de funcoes de servico, rotas e documentacao tecnica.

---

## 2. Os Quatro Pilares Canônicos

### 2.1 Places (`/places`, `/diretorio`)
- **Definicao:** Guia publico local de estabelecimentos comerciais, servicos, utilidades civis e pontos de interesse com localizacao fisica delimitada.
- **Entidade Principal:** `places` / `stores` com flag `is_physical_location = true`.
- **Invariante:** Nao comercializa produtos diretamente no fluxo publico; oferece dados de contato, endereco geocodificado, horarios de funcionamento e reputacao local.

### 2.2 Classificados (`/classificados`)
- **Definicao:** Hub C2C para anuncios pontuais e desapegos comunitarios realizados por pessoas fisicas.
- **Entidade Principal:** `classifieds`.
- **Invariante:** Validade temporal estrita (ciclo padrao de 30 dias). Proibida a operacao como loja formal sem processo de promocao (upgrade bridge via `listing-promotion.functions.ts`).

### 2.3 Marketplace (`/marketplace`)
- **Definicao:** Vitrine rica B2C de produtos ofertados por estabelecimentos credenciados, integrando busca facetada, calculo de frete e checkout transacional.
- **Entidades Principais:** `products`, `product_variants`, `stores`.
- **Invariante:** Todo produto deve pertencer a uma loja formal com CNPJ ou registro comercial verificado. Precos estritamente expressos em centavos inteiros.

### 2.4 Workspace Pro (`/workspace`)
- **Definicao:** Painel operacional corporativo fechado destinado a lojistas, administradores e operadores de servicos locais (SaaS / ERP modular).
- **Modulos Centrais:** Catalogo, Pedidos, Finanças, CRM, Logistica e Suporte.
- **Invariante:** Acesso estritamente autenticado e isolado por `store_id` atraves da barreira `assertStoreAccess`. Proibido vazamento de dados entre concorrentes.

---

## 3. Entidades Fundamentais e Schemas

### 3.1 Loja / Estabelecimento (`Store`)
- **Identificador:** UUIDv4 unico (`id`).
- **Campos Normativos:** `slug` (identificador textual de URL amigavel), `name`, `status` (`active`, `pending`, `suspended`), `is_physical_location`, `settings` (armazenamento JSONB com coordenadas GPS, horarios e frete).

### 3.2 Produto (`Product`) e Variante (`ProductVariant`)
- **Produto:** Unidade mestre de comercializacao associada obrigatoriamente a uma `store_id`.
  - **Status:** `draft` (em edicao, oculto), `published` (ativo no catalogo), `archived` (soft-delete, preservado para integridade transacional).
- **Variante:** Especificacao fisica com controle de estoque e precificacao (`sku`, `title`, `price_cents`, `compare_at_cents`, `stock_on_hand`, `allow_backorder`).

### 3.3 Pedido (`Order`) e Item de Pedido (`OrderItem`)
- **Pedido:** Transacao comercial acordada entre cliente e loja.
  - **Valores:** `subtotal_cents`, `shipping_cents`, `discount_cents`, `total_cents` (satisfazendo a equacao: `total = subtotal + shipping - discount`).
  - **Status Transacionais:**
    1. `pending`: Aguardando processamento de pagamento.
    2. `confirmed`: Pagamento liquidado e autorizado.
    3. `processing`: Pedido em separacao e embalagem na loja.
    4. `shipped`: Entregue a transportadora ou mensageiro (MotoLink).
    5. `delivered`: Entrega concluida e atestada com sucesso.
    6. `cancelled`: Transacao abortada com estorno registrado.

### 3.4 Cliente CRM (`CustomerCRM`)
- **Definicao:** Registro individual do comprador no escopo de uma loja especifica.
- **Metricas Calculadas no Servidor:** `ltv_cents` (soma total de centavos em pedidos entregues), `orders_count`, `last_order_at`.

### 3.5 Lancamento Financeiro (`FinancialEntry`)
- **Definicao:** Movimentacao de caixa no livro-razao da loja.
- **Tipos Permitidos:** `revenue_sale`, `revenue_pos_sale`, `expense_operational`, `expense_supplier`, `tax_deduction`, `platform_fee`.
- **Regra Petrea:** Receitas de vendas nao podem ser criadas manualmente por operadores; sao geradas automaticamente por transacoes de pedidos.

### 3.6 Chamado de Suporte (`SupportTicket`)
- **Definicao:** Ticket de atendimento interno ou assistencia tecnica.
- **Campos:** `ticket_id`, `category` (`technical`, `billing`, `operations`, `account`), `priority` (`low`, `medium`, `high`, `urgent`), `status` (`open`, `in_progress`, `waiting_client`, `resolved`, `closed`), `sla_due_at`.

---

## 4. Invariantes de Dados e Normas de Integridade

1. **Aritmetica Inteira de Centavos (Zero-Float Rule):** Valores financeiros (`price_cents`, `total_cents`, `fee_cents`) sao sempre inteiros positivos. Proibido tipo de ponto flutuante em calculos transacionais.
2. **Deny-by-Default em Multi-Tenancy:** Nenhuma leitura ou escrita no Workspace pode ser executada sem a injecao explicita de `store_id` obtido da sessao assinada.
3. **Imutabilidade Historica de Pedidos:** Apos a criacao do pedido, snapshots de preco unitario, nome do produto e dados de envio tornam-se imutaveis em `order_items`.
4. **Zero Fallbacks Sinteticos (Regra M01):** Ausencia de dados reais deve resultar em estado vazio canônico (`EmptyState`), nunca em dados ficticios ou mocks estaticos.
