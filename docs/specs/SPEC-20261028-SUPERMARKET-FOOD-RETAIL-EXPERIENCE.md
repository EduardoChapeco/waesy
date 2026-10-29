# SPEC-20261028: Ecossistema Canônico de Supermercados, Açougues, Padarias e Varejo Alimentar (Paridade OSuper, Clube K, Koch e Komprão)

## 1. Escopo e Objetivos
Definir e implementar a experiência especializada e imersiva para o nicho de supermercados, atacarejos, mercearias, padarias, açougues, conveniências e hortifrútis no ecossistema Waesy, assegurando:
1. **Vitrine Pública (`_store.mercado.tsx`):**
   - Capa Hero imersiva 100% da largura com cantos inferiores arredondados (`rounded-b-3xl`) e carrossel de mídia contínuo estilo Instagram sem quebras.
   - Header com seletor de loja/filial, barra de busca centralizada formato pílula com microfone e leitor de código de barras.
   - Seletor de modalidade e janela de entrega (`SupermarketFulfillmentPill`): Entrega vs Retirada com horários e taxas em tempo real.
   - Dock de categorias circulares com fotografia e rótulo canônico de 12px.
   - Feed de ofertas do clube com badges em fita (`Clube`, `Leve X Pague Y`, `Limite por CPF`, `Cashback`, countdown amarela e validade sujeita a estoque).
2. **Página de Detalhes de Produto (`ConvenienceShowcaseView` / `SupermarketProductDetailView`):**
   - Seletor fracionado de Unidade vs Peso (`Kg` / `g`).
   - Seletor de maturidade para hortifrúti (Menos maduro, Maduro, Mais maduro).
   - Seletor de corte para açougue (Bife fino, Pedaço, Moído).
   - Campo de instrução especial para o separador de compras.
   - Cálculo visual em tempo real de descontos por volume e aviso de regras fiscais/CPF.
3. **Carrinho Unificado & Checkout Especializado (`SupermarketCartSheet`):**
   - Agrupamento de itens por departamento.
   - Stepper adaptado para peso fracionado (`2 kg`, `500 g`, `1 un`).
   - Bloco de recomendação em linha (`⚡ Oferta relâmpago` / Order Bump).
   - Barra de progresso para meta de Frete Grátis com incentivo visual.
   - Comentários individuais por item para substituição no estoque.
   - Fluxo de 3 etapas com aviso legal obrigatório de pesagem na separação.
4. **Dashboard do Membro do Clube (`SupermarketClubDashboardView`):**
   - Economizômetro mensal (total em R$ economizados pelo cliente).
   - Saldo de cashback disponível com extrato real do Supabase.
   - Cupons ativos e integração com carteira de pagamentos.
5. **Painel do Lojista (Workspace / Catálogo de Produtos):**
   - Sheet rápido para configuração em 3 colunas de preços: Preço Online, Preço de Clube e Preço Balcão/Físico.
   - Regras comerciais configuráveis (`Leve X Pague Y`, Limite por CPF, Restrição de idade +18, SKU e dados fiscais).

## 2. Requisitos EARS (Easy Approach to Requirements Syntax)

### 2.1 Vitrine Pública
- **UBIQUITOUS:** O sistema DEVE renderizar a capa hero com proporção canônica e carrossel de banners contínuos com transição suave sem recortes laterais.
- **EVENT-DRIVEN:** QUANDO o usuário clicar na pílula de cumprimento (`SupermarketFulfillmentPill`), O sistema DEVE abrir um Sheet inferior com as janelas ativas de agendamento de entrega e filiais para retirada.
- **STATE-DRIVEN:** ENQUANTO o usuário estiver autenticado e vinculado ao clube da bandeira, O sistema DEVE destacar automaticamente os preços e benefícios exclusivos do membro com fitas angulares e cálculo de economia.
- **UNWANTED BEHAVIOR:** SE não houver produtos cadastrados em uma categoria circular, O sistema NÃO DEVE quebrar a grade nem renderizar contêineres vazios, mantendo o layout coeso.

### 2.2 Produtos Fracionados & Promoções
- **EVENT-DRIVEN:** QUANDO o produto pertencer à categoria hortifrúti ou açougue, O sistema DEVE exibir o alternador entre Unidade e Peso (Kg) e a seleção de maturidade ou corte.
- **STATE-DRIVEN:** SE o produto possuir regra ativa de "Leve X, Pague Y", O sistema DEVE exibir a tag explicativa e abater o valor no carrinho estritamente a cada lote completo de X unidades.
- **UNWANTED BEHAVIOR:** SE o cliente adicionar quantidade superior ao limite configurado por CPF, O sistema DEVE travar o stepper e emitir alerta discreto informando o teto promocional.

### 2.3 Checkout e Carrinho
- **UBIQUITOUS:** O sistema DEVE exibir na tela de revisão o aviso legal de que produtos pesáveis poderão sofrer pequenas variações de valor após a pesagem física na loja.
- **EVENT-DRIVEN:** QUANDO o subtotal atingir ou superar o limiar de frete grátis da loja, O sistema DEVE zerar a taxa de entrega e atualizar a barra de progresso para 100% preenchida.

## 3. Invariantes do Repositório
- **Piso Anti-Fake (B.33):** Zero dados fictícios ou valores sintéticos. Todos os preços, lojas, estoques e saldos de cashback devem provir de tabelas reais do banco de dados.
- **Conformidade de Design (B.4 / B.8):** Alvos de toque móveis com altura mínima de 44px (`h-11 min-h-11`), foco teclado visível (`:focus-visible:ring-2`), sem uso de `!important`, sombras utilitárias ou gradientes decorativos em superfícies de aplicação.
- **Mutação Cirúrgica (B.7):** Preservar componentes canônicos existentes e estender de forma modular.
