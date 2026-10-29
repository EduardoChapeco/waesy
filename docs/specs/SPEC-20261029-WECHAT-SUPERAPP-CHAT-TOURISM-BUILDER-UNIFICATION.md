# SPEC-20261029: Unificação SuperApp WeChat Brasileiro, Chat Transacional, Intranet Corporativa, Locação InfoTravel/Wooba e Seções Canônicas Omni-Builder

**Data:** 2026-10-29  
**Status:** Aprovado para Execução  
**Escopo:** Navegação SuperApp (Chat-First + Noor Dock + Compras Unificadas), Chat Transacional (Carrinho no Chat, Mini-Mapa de Entrega, Formulários/Eventos Rápidos), Intranet Corporativa com Linha do Tempo e Preview de Planilhas, Locação de Carros (InfoTravel B2C / Wooba B2B com cálculo de 3 diárias), Unificação de Seções Canônicas no Omni-Builder e Correção Integral de Tipagem TypeScript.

---

## 1. Requisitos em Sintaxe EARS (Easy Approach to Requirements Syntax)

### Eixo 1: Arquitetura de Navegação SuperApp (Estilo WhatsApp iOS 2024 + WeChat + Noor)
- **UBIQUITOUS-01:** O sistema DEVE adotar títulos simples de palavra única (ex.: `Conversas`, `Explorar`, `Marketplace`, `Classificados`, `Comunidades`, `Compras`, `Perfil`, `Intranet`) em todos os cabeçalhos, abas e barras de navegação, erradicando títulos compostos prolixos.
- **EVENT-01 (Dock Superior Noor Auto-Ocultável):** WHEN o usuário visualizar o Hub de Chat (`/conta/conversas` ou `/chat`) ou a superfície mobile principal e rolar a lista para baixo, THE SYSTEM SHALL recolher suavemente o menu horizontal de botões squircle editáveis estilo Noor (`Explorar`, `Marketplace`, `Classificados`, `Mobilidade`, `Bank`, `Serviços`, `Eventos`, `Empregos`), e WHEN rolar para cima, THE SYSTEM SHALL reexibir o menu imediatamente.
- **EVENT-02 (Barra Inferior Auto-Ocultável e Long-Press Global Create):** WHEN o usuário navegar em superfícies móveis (`< 768px`), THE SYSTEM SHALL exibir a barra inferior canônica com 5 destinos (`Chat`, `Feed`, `Comunidades`, `Compras`, `Perfil`), ocultando-a ao rolar para baixo e revelando-a ao rolar para cima; WHEN o usuário mantiver pressionado qualquer item da barra inferior ou acionar o botão `+` contextual no topo / botão `Criar` no menu lateral, THE SYSTEM SHALL abrir o modal global de criação rápida (`GlobalQuickCreateModal`).
- **EVENT-03 (Filtro Tripartido Explorar / Marketplace / Classificados):** WHEN o usuário alternar entre `Explorar`, `Marketplace` e `Classificados` na vitrine principal (`_store.index.tsx`), THE SYSTEM SHALL exibir todos os itens do ecossistema em `Explorar`, filtrar exclusivamente ofertas e catálogos de empresas (`origin = "workspace"`) em `Marketplace`, e filtrar anúncios P2P civis em `Classificados`.
- **EVENT-04 (Busca Estilo WhatsApp de Contatos e Empresas):** WHEN o usuário clicar no ícone de lupa no cabeçalho do Chat ou da vitrine mobile, THE SYSTEM SHALL abrir a busca rápida unificada de contatos, conversas, departamentos e empresas verificadas em formato de lista minimalista WhatsApp.

### Eixo 2: Hub "Compras" Unificado & Chat Transacional com Mini-Mapa e Formulários
- **STATE-01 (Unificação de Compras e Carrinhos Multi-Loja Colapsáveis):** WHILE o usuário estiver na superfície `Compras` (`/conta/pedidos`), THE SYSTEM SHALL consolidar em abas simples (`Pedidos`, `Carrinhos`, `Agendamentos`) todos os pedidos realizados, reservas/agendamentos e carrinhos ativos de múltiplas lojas (`globalCarts`), exibindo cada loja colapsada com avatar, resumo de frete, quantidade de itens/serviços, subtotal, acesso ao perfil da loja e expansão in-place para edição de itens.
- **EVENT-05 (Carrinho, Pagamento Rápido, Mini-Mapa e Código de Retirada no Chat):** WHEN o cliente conversar com uma empresa em `/conta/conversas/$id`, THE SYSTEM SHALL permitir filtrar a thread por `Tudo`, `Pedidos` e `Suporte`, visualizar e editar o carrinho ativo da loja dentro do chat, realizar pagamento rápido in-chat e acompanhar o pedido com mini-mapa expansível (`MapLibreCanvas`) mostrando a localização em tempo real do entregador e o código de retirada (`pickupCode`).
- **EVENT-06 (Formulários Rápidos, Secretos/Anônimos, Eventos e Preview de Planilhas no Chat):** WHEN o usuário ou atendente abrir a bandeja de anexos (`+`) no chat, THE SYSTEM SHALL disponibilizar a criação de **Formulário Rápido** (`Padrão`, `Anônimo`, `Secreto`), **Evento Rápido** (com data, horário, local/link e confirmação de presença RSVP), **Stickers**, **Carrinho/Cobrança** e visualização interativa de planilhas/documentos (`ArtifactInteractiveTable`).

### Eixo 3: Atendimento Segmentado & Intranet Corporativa (Estilo Slack + Linha do Tempo)
- **STATE-02 (Intranet Corporativa e Linha do Tempo Interna):** WHILE o membro da equipe operar em `/workspace/atendimento`, THE SYSTEM SHALL disponibilizar a aba `Intranet` com canais internos segmentados por setor (`#executivo`, `#comercial`, `#marketing`, `#operacoes`, `#financeiro`, `#suporte`), controle de privacidade (`public`, `private`), filtros por criador/escopo, nós de **Linha do Tempo Operacional** dentro do chat e visualização embutida de tabelas de dados (`ArtifactInteractiveTable`) com preview rápido e exportação.

### Eixo 4: Locação de Carros (3 Diárias) — InfoTravel (B2C) & Wooba (B2B)
- **EVENT-07 (Card Canônico de Locação 3 Diárias Decolar/InfoTravel/Wooba):** WHEN o usuário visualizar a seção `"Precisa de um carro?"` ou o canal `Aluguel de Carros` em `/_store/turismo`, THE SYSTEM SHALL renderizar o componente canônico `CarRentalOfferCard` com filtro editável de período (padrão `3 dias`), selo da locadora, foto limpa do veículo, categoria (`Carros Pequenos`, `SUVs e Caminhonetes`, `Executivo`), selo `Cancelamento grátis`, local de retirada/devolução, modalidade `"Pague ao retirar"` e valor total calculado para as diárias selecionadas, abrindo modal de detalhes completos ao clicar.
- **STATE-03 (Roteamento B2C InfoTravel vs B2B Wooba):** WHILE a busca de carros ocorrer na vitrine civil B2C, THE SYSTEM SHALL consultar `infotravelSearchCarRentals` (`src/services/infotravel.ts`); WHILE a busca ocorrer no contexto corporativo B2B (`/workspace/empresa/viagens` ou aba Corporativo), THE SYSTEM SHALL consultar `searchWoobaCars` (`src/services/travel-wooba-connector.service.ts`) via `travel-supply-orchestrator.service.ts`.

### Eixo 5: Seções Canônicas Reutilizáveis no Omni-Builder & Zero Erros TypeScript
- **UBIQUITOUS-02 (Reutilização Canônica sem Duplicação):** Todas as seções de vitrine (`vitrine_vertical_carousel`, `media_gallery_mosaic`, `video_section` com `CanonicalVideoPlayer`, `tourism_car_rental_rail`, `custom_buttons_rail` Noor, `social_posts_rail`, `classifieds_spotlight`, `banner_trio_bento`) DEVEM estar registradas como fontes canônicas únicas consumíveis tanto pelo `ModularSurfaceFeed` (`admin-master.vitrines.tsx`) quanto pelo `OmniEditor` (`registry.ts`).
- **UBIQUITOUS-03 (Conformidade Estrita de Compilação e Design Lint):** O repositório DEVE compilar com **0 erros** em `npm run typecheck` e manter **0 violações P0** no `node scripts/design-lint.mjs --ratchet`.

---

## 2. Invariantes e Garantias de Não-Regressão
1. **Regra Pétrea de Mutação Cirúrgica (B.7):** Arquivos existentes são refinados exclusivamente via `edit_file`, preservando 100% das rotas, queries e regras existentes.
2. **Design System & Piso Tátil (B.4 / B.26 / B.31 / B.32):** Todos os controles interativos mantêm altura mínima de `44px` (`h-11`), `:focus-visible:ring-2`, tokens semânticos de cor (`bg-card`, `text-foreground`, `border-border`, `bg-primary`) e zero Containeritis (DL-31) ou Grid-in-Grid (DL-32).
