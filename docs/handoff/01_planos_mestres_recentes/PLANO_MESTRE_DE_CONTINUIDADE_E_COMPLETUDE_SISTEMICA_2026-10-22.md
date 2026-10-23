# Plano Mestre de Continuidade, Auditoria Forense e Completude Sistêmica
**Documento Normativo do Repositório Waesy**  
**Data de Emissão:** 22 de Outubro de 2026  
**Versão:** 1.0.0 (Master Release Track)  
**Governança:** AGENTS.md (Invariantes B.1 a B.47), Apple HIG, WCAG 2.2 AA, Zero-Trust Architecture  
**Ambiente de Produção Ativo:** Cloudflare Pages (`https://usewaesy.pages.dev`) | Supabase PostgreSQL (`aws-0-sa-east-1.pooler.supabase.com`)  

---

## 1. Sumário Executivo & Diagnóstico Geral do Repositório

Este documento consolida a auditoria forense ponta a ponta realizada no ecossistema Waesy, confrontando o que foi efetivamente entregue e estabilizado versus os itens que permanecem parciais, planejados ou operando sob fallbacks silenciosos.

### 1.1 Estado de Saúde dos Gates de Engenharia
- **Compilação TypeScript (`tsc --noEmit`):** 0 erros (Exit Code 0).
- **Testes Automatizados Vitest:** 326 suítes / 2.167 testes unitários e de integração aprovados (100% verde).
- **Detecção de Código Morto (`dead-code-detector.mjs`):** 0 arquivos órfãos / 0 exports zumbis.
- **Detecção de Dependências Circulares (`check-circular-deps.mjs`):** 0 ciclos detectados.
- **Consolidação de Esquemas e Tipos SSOT (`check-type-duplications.mjs`):** 0 tipos concorrentes.
- **Contratos de Tabelas BFF (`check-bff-table-contracts.mjs`):** 606 tabelas validadas com 1 inconsistência pendente (`travel_contract_templates`).
- **Deploy em Produção:** 974 arquivos estáticos e worker único unificado publicados no Cloudflare Pages com HTTP 200.

---

## 2. Matriz de Confronto: Prometido/Planejado vs Realidade do Código

| Frente Operacional | Prometido / Planejado | Realidade Atual no Código | Gaps e Pendências Reais | Status |
| :--- | :--- | :--- | :--- | :---: |
| **Turismo & Viagens** | Eliminar propostas duplicadas e unificar construtor em 7 abas. | `UnifiedProposalWorkspace` centraliza criação; 3 telas concorrentes deletadas; cálculo de voos e hotéis ativo. | A tabela `travel_contract_templates` não existe no banco de dados; salvar templates customizados falha com erro SQL. | **92%** |
| **Criar Evento Comunitário** | Conectar criação de eventos para usuários civis sem exigir posse de loja. | `PublishSheet`, `QuickCreateModal`, `navigation-registry.ts` e `_store.conta.classificados.novo.tsx` integrados. | Falta rota mobile de scanner de ingressos com câmera (`BarcodeScanner`) para o organizador civil bipar bilhetes na portaria. | **90%** |
| **Mobilidade Urbana (Waesy Go)** | Rastreamento de motorista em tempo real e barreira Zero-Trust CPF para inadimplência. | `_store.mobilidade.tsx` integrado com barreira de CPF; cálculo de tarifas respeita piso e taxa de R$ 0,99. | `watchPosition` do condutor congela quando a aba do navegador fica em segundo plano no mobile; tolerância de 3 min calculada no client. | **70%** |
| **Checkout & Modificadores** | Compra fluida de produtos físicos, digitais e delivery com adicionais. | Carrinho e Checkout suportam etapas 1-3, cupons e seleção de endereços canônicos (DEC-301). | Adicionais em produtos de conveniência/delivery não somam ao preço base em certos combos; cupom mínimo não revalida na exclusão. | **75%** |
| **Estoque de Variações** | Controle de estoque de grade (tamanhos/cores) sincronizado com compras. | `products` e `product_variants` modelados no PostgreSQL e gerenciáveis no Workspace. | A baixa de estoque no checkout decrementa apenas `products.stock_quantity`, deixando `product_variants.stock_quantity` estático. | **80%** |
| **Logística & Frete por KM** | Cálculo preciso de frete por distância entre cliente e loja. | `workspace.logistica.tabelas.tsx` permite configurar taxa base + valor por KM. | Lojas criadas sem coordenadas geográficas (`latitude = null`) causam falha silenciosa no cálculo de frete sem emitir alerta. | **85%** |
| **Plataforma de Endereços** | Padrão Mercado Livre com suporte a S/N, GPS e dados do recebedor. | `SPEC-ADVANCED-ADDRESS-PLATFORM-REFACTOR.md` implementado com migration `20270223000000`. | Endereços legados sem número salvos antes do DEC-301 bloqueiam o checkout exigindo edição manual sem atalho "Marcar S/N". | **95%** |
| **Tabela FIPE de Veículos** | Consulta de referência FIPE e cálculo de desvio percentual de mercado. | `FipeVehicleSelector.tsx` criado e integrado a `_store.conta.classificados.novo.tsx`. | O card de anúncio compacto mobile (grade 2D) ainda não renderiza o badge "Abaixo da FIPE" em destaque. | **90%** |
| **Atendimento WhatsApp Web** | Hub de atendimento tela cheia segregado do Copilot civil. | `workspace.atendimento.index.tsx` funcional com filtro de isolamento `store_id != null`. | Upload de áudio PTT falha se o bucket do Supabase for privado; webhook não processa status de confirmação de leitura (blue check). | **85%** |
| **CMS de Vitrines & Banners** | Banners widescreen 28:9 e vitrines 100% configuráveis via painel Master. | `admin-master.vitrines.*` e `MetamorphicBannerSlider.tsx` conectados; zero imagens Unsplash. | Seções sem produtos ativos renderizam cabeçalhos vazios; agendamento temporal de banners não converte fuso de Brasília. | **92%** |

---

## 3. Auditoria Forense Detalhada de Falhas Ocultas

### 3.1 Falha Oculta F-01: Tabela Relacional Inexistente `travel_contract_templates`
- **Gravidade:** P0 (Bloqueio Transacional de Recurso).
- **Localização:** `src/services/travel-contract.functions.ts` (Linhas 758, 800, 806).
- **Mecanismo da Falha:** A função `getAgencyContractTemplates` executa `.from("travel_contract_templates")`. Como a relação inexiste no PostgreSQL físico, a query gera erro de banco. O bloco defensivo `if (error || !rows)` captura a falha e retorna o template canônico padrão em memória. Ao tentar persistir um novo modelo via `saveAgencyContractTemplate`, a instrução `supabase.from("travel_contract_templates").upsert(...)` quebra a requisição com código de erro 42P01.
- **Ação Corretiva Exigida:** Criar a migration DDL criando a tabela com colunas estruturadas (`id`, `store_id`, `title`, `description`, `clauses`, `is_default`, `created_at`, `updated_at`), índices por `store_id` e políticas RLS de tenant.

### 3.2 Falha Oculta F-02: Desacoplamento entre Estoque Master e Estoque de Variações
- **Gravidade:** P1 (Integridade de Dados e Inventário).
- **Localização:** `src/services/orders.functions.ts` (Funções de finalização de pedido).
- **Mecanismo da Falha:** Quando um cliente adquire uma variação específica de produto (ex.: Camiseta Tamanho M / Cor Azul), o sistema processa a transação e executa o decremento na coluna `stock_quantity` da tabela pai `products`. Entretanto, a tabela filha `product_variants` não recebe a baixa da quantidade vendida. Isso permite que a mesma variação continue sendo vendida após o esgotamento real do item físico.
- **Ação Corretiva Exigida:** Implementar procedimento atômico de baixa em lote ou trigger condicional que, na presença de `order_items.variant_id`, decremente `product_variants.stock_quantity` e recalcule `products.stock_quantity` como o somatório das variantes ativas.

### 3.3 Falha Oculta F-03: Sub-Tarifação por Perda de Modificadores em Combos de Conveniência
- **Gravidade:** P1 (Consistência Financeira e Faturamento).
- **Localização:** `src/routes/_store.produto.$slug.tsx` e `src/services/cart.functions.ts`.
- **Mecanismo da Falha:** No nicho de gastronomia e conveniência, modificadores complementares (adicionais pagos) são serializados no array `metadata.modifiers`. Em rotas específicas de adição rápida, o `unit_price_cents` inserido na tabela `cart_items` reflete apenas o valor nominal do produto básico, gerando faturamento incorreto e prejuízo operacional ao lojista.
- **Ação Corretiva Exigida:** Centralizar o cálculo do item no BFF: `item_total_cents = base_price_cents + sum(modifier.price_cents * modifier.quantity)`, impedindo que o cliente frontend envie valores arbitrários que divirjam da soma real.

### 3.4 Falha Oculta F-04: Violação de Regra de Pedido Mínimo em Cupons de Desconto
- **Gravidade:** P1 (Segurança de Margem Comercial).
- **Localização:** `src/services/cart.functions.ts` (`calculateCartTotals`, `applyCouponCode`).
- **Mecanismo da Falha:** A validação do campo `minimum_order_cents` do cupom ocorre no momento em que o código promocional é digitado na tela do carrinho. Se o usuário navegar para a tela de checkout e remover um item ou reduzir a quantidade, derrubando o subtotal para um valor inferior ao mínimo exigido pela promoção, o desconto permanece aplicado no payload do pedido.
- **Ação Corretiva Exigida:** Revalidar integralmente todas as condições de elegibilidade de cupons durante a criação do pedido (`createOrderFromCart`), invalidando o cupom e emitindo erro transacional caso o subtotal atual não atinja o piso estipulado.

### 3.5 Falha Oculta F-05: Falha Silenciosa no Frete por Distância em Lojas sem Coordenadas
- **Gravidade:** P2 (Experiência do Consumidor e Logística).
- **Localização:** `src/services/cart.functions.ts` e `workspace.logistica.tabelas.tsx`.
- **Mecanismo da Falha:** Lojas com modelo de frete dinâmico por quilometragem que não preencheram o mapa de localização (`stores.latitude = null`) provocam falha matemática no cálculo de Haversine. A camada de serviço engole o erro e retorna frete zero ou taxa fixa arbitrária sem alertar os envolvidos.
- **Ação Corretiva Exigida:** Implementar barreira de validação no Workspace impedindo a ativação do frete por KM sem geolocalização confirmada, e no Checkout emitir alerta claro com fallback para taxa padrão declarada.

### 3.6 Falha Oculta F-06: Ausência de Validação em Tempo Real de Credenciais de Pagamento
- **Gravidade:** P1 (Continuidade de Vendas).
- **Localização:** `src/routes/workspace.configuracoes.pagamentos.tsx` e `src/services/store-settings.functions.ts`.
- **Mecanismo da Falha:** O lojista cola seu Access Token do Mercado Pago ou chave PIX e o sistema grava a string no banco sem realizar handshake teste com a API emissora. Se a chave possuir espaços extras ou estiver expirada, a falha só é descoberta quando um cliente tenta concluir uma compra e recebe erro 401.
- **Ação Corretiva Exigida:** Adicionar função de teste de conexão com a API do Mercado Pago no momento da gravação, emitindo toast verde de validação e persistindo status `credentials_verified: true`.

---

## 4. Plano Diretor de Continuidade: 8 Microfases Sequenciais (MECE)

### Microfase 1: Infraestrutura Relacional & Contrato de Turismo
- **Objetivo:** Zerar pendências de contrato BFF e assegurar persistência de templates contratuais de agência.
- **Arquivos no Escopo:**
  - `supabase/migrations/20270229000000_travel_contract_templates.sql` (Criação DDL, RLS).
  - `src/services/travel-contract.functions.ts` (Validação Zod e queries).
- **Entradas e Saídas:**
  - Entrada: `store_id`, `title`, `clauses` (JSONB com numeração, texto e obrigatoriedade).
  - Saída: Registro persistido com confirmação criptográfica e recuperação por tenant.
- **Critério de Sucesso:** `node scripts/check-bff-table-contracts.mjs` com **0 tabelas ausentes** e teste de integração aprovado.

### Microfase 2: Integridade Transacional de Estoque de Variações
- **Objetivo:** Sincronizar o estoque de produtos pai com as variantes selecionadas nos pedidos.
- **Arquivos no Escopo:**
  - `src/services/orders.functions.ts` (Funções de baixa de inventário).
  - `src/services/catalog.functions.ts` (Auditoria de níveis de estoque).
- **Entradas e Saídas:**
  - Entrada: Pedido criado com `order_items` contendo `variant_id` e `quantity`.
  - Saída: Baixa atômica simultânea em `product_variants.stock_quantity` e recálculo do total em `products.stock_quantity`.
- **Critério de Sucesso:** Teste automatizado simulando compra de grade e conferência dos saldos de estoque antes e após o pagamento.

### Microfase 3: Blindagem Financeira de Modificadores e Cupons no Checkout
- **Objetivo:** Impedir sub-tarifação de adicionais de conveniência e fraudes de cupom por redução de carrinho.
- **Arquivos no Escopo:**
  - `src/services/cart.functions.ts` (Cálculo de totais, validação de cupons).
  - `src/routes/_store.checkout.tsx` (Interface de revisão final).
- **Entradas e Saídas:**
  - Entrada: Itens com modificadores e cupom aplicado com regra de valor mínimo.
  - Saída: Subtotal com soma auditada server-side e validação de piso antes de despachar a cobrança.
- **Critério de Sucesso:** Testes unitários cobrindo mutações de quantidade e remoção de itens com cupom ativo.

### Microfase 4: Validação de Credenciais de Pagamento & Geodésia de Frete
- **Objetivo:** Garantir que credenciais de pagamento estejam ativas e que fretes por distância possuam coordenadas válidas.
- **Arquivos no Escopo:**
  - `src/services/store-settings.functions.ts` (Handshake Mercado Pago).
  - `src/routes/workspace.configuracoes.pagamentos.tsx` (Feedback de conexão).
  - `src/services/logistics.functions.ts` (Trava de geolocalização da loja).
- **Critério de Sucesso:** Loja recebe status verificado ao inserir token real e frete emite fallback seguro caso falte GPS.

### Microfase 5: Scanner de Check-in Mobile para Eventos Comunitários
- **Objetivo:** Disponibilizar ferramenta nativa de portaria com câmera para organizadores civis de eventos.
- **Arquivos no Escopo:**
  - `src/routes/_store.conta.eventos.$id.checkin.tsx` (Rota mobile responsiva com câmera).
  - `src/services/classifieds-events.functions.ts` (Validação de QR Code criptográfico WCTS-1).
- **Entradas e Saídas:**
  - Entrada: Leitura de QR Code impresso ou na tela do smartphone do participante.
  - Saída: Confirmação de entrada, prevenção de reuso de ingresso e feedback sonoro/tátil.
- **Critério de Sucesso:** Validador atesta autenticidade da assinatura HMAC-SHA256 e impede duplicidade de check-in.

### Microfase 6: Resiliência de Telemetria no Waesy Go & Tolerância Server-Side
- **Objetivo:** Manter rastreamento de motorista ativo em segundo plano e calcular tolerância de espera no backend.
- **Arquivos no Escopo:**
  - `src/routes/_store.conta.entregador.tsx` (Background tracking / Service Worker).
  - `src/services/mobility.functions.ts` (Cálculo de tolerância de 3 min via timestamp UTC do banco).
- **Critério de Sucesso:** Localização do veículo atualizada no mapa mesmo com o navegador do condutor minimizado e cancelamento por tempo validado estritamente pelo servidor.

### Microfase 7: Omissão Dinâmica de Seções Vazias no CMS & Fuso Horário de Campanhas
- **Objetivo:** Cumprir a Invariante B.29 eliminando blocos de vitrine sem produtos e ajustando agendamento para horário de Brasília.
- **Arquivos no Escopo:**
  - `src/services/surface-cms.functions.ts` (Filtragem de seções vazias nas consultas).
  - `src/components/commerce/modular-surface-feed.tsx` (Renderização condicional estrita).
  - `src/services/banner.functions.ts` (Normalização de UTC-3 em `starts_at`/`ends_at`).
- **Critério de Sucesso:** Seções sem itens em estoque somem 100% da vitrine pública sem lacunas visuais ou quebras de layout.

### Microfase 8: Saneamento Tátil de Acessibilidade (DL-15 em Controles Restantes)
- **Objetivo:** Zerar as 361 violações P0 residuais de DL-15 em elementos interativos não-button (`div`, `DropdownMenuItem`, `Link`).
- **Arquivos no Escopo:**
  - Componentes de interface que possuem eventos `onClick` sem atributos de acessibilidade.
- **Critério de Sucesso:** `node scripts/design-lint.mjs --ratchet` aprovado com 0 violações P0 em todo o repositório.

---

## 5. Protocolo de Execução e Verificação Contínua

Cada microfase deve cumprir estritamente o ciclo de garantia operacional estabelecido pelo Conselho de Engenharia:

```
[ 1. Pré-Voo ] ➔ [ 2. Teste de Falha ] ➔ [ 3. Mutação Cirúrgica ] ➔ [ 4. Testes Verdes ] ➔ [ 5. Build & Lint ] ➔ [ 6. Validação ]
```

1. **Pré-Voo:** Inspeção de branch, worktree limpo e conferência de ausência de conflitos com agentes paralelos.
2. **Reprodução com Teste:** Criação de teste unitário ou de integração comprovando a falha antes da alteração de código.
3. **Mutação Cirúrgica:** Modificação estrita dos arquivos autorizados pela microfase, sem tocar em arquivos de outros módulos.
4. **Verificação de Regressão:** Execução da suíte completa de testes (`npm test`) e compilação de tipos (`npm run typecheck`).
5. **Auditoria de Design Lint:** Execução de `node scripts/design-lint.mjs --ratchet` garantindo conformidade com o piso visual.
6. **Registro em DECISIONS.md:** Documentação formal da decisão adotada, fundamento teórico e consequências para o produto.

---

*Documento gerado e aprovado para inclusão na base de código sob a política de governança de engenharia de software Waesy.*
