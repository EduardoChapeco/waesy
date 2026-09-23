# Waesy Platform — Catálogo Canônico de Páginas (Page Catalog)

**Versão:** 1.0 — Fonte única de verdade para anatomia, fluxo e design de cada tela.
**Legenda de Status:**

- `✅ IMPLEMENTADO` — Rota existe e funciona.
- `⚠️ LEGADO` — Rota existe mas tem dívida de design system.
- `🔴 GAP` — Rota projetada, ainda não implementada.
- `🔵 PARCIAL` — Existe mas com funcionalidades faltando.

> **Como usar:** Cada verbete descreve UMA rota canônica. A ordem segue a jornada do ator. Para detalhes de regras de negócio, ver `BUSINESS_FLOWS.md`. Para tokens e shells, ver `DESIGN.md`.

---

# Família 1 — Comercial, Descoberta & Social (_store.*)

---

## P-001 · Home / Marketplace & Discovery Hub

**Rota:** `/_store/` (`_store.index.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Commercial Hub Shell | **Padrão:** marketplace-discovery | **Ator:** Todos

### Anatomia Desktop (1440px)

```
[Context Sidebar 260px] [Main Viewport max-w-7xl]
- TopBar: Logo Waesy + Master Location Pill (GPS/Manual) + Smart Search (Ctrl+K) + Cart/Profile
- 1. Top Banners Hero Carousel: Vídeo/GIF/Imagem (21:9 desktop, 16:9 mobile), proporção fixa, máscara/textos configuráveis
- 2. Stories Rápidos de Lojas e Marcas Locais
- 3. Hotpages / Categorias Panorâmicas: Grid 6 colunas, cards 16:10 / 4:3, suporte a arte limpa sem texto
- 4. Rail de Ofertas Relâmpago: Cards retangulares horizontais 320px com Timer Dinâmico (Verde >12h, Amarelo 2-12h, Vermelho <2h)
- 5. Rail de Lojas & Negócios Locais: Cards ampliados (384px) com banners 160px e avatars 72px
- 6. Trilhos de Produtos por Nicho: Gastronomia, Mercado, Beleza, Moda
- 7. Banner de Conversão: "Venda no Waesy / Abra sua Loja"
```

---

## P-002 · Mural Social da Comunidade

**Rota:** `/_store/mural` (`_store.mural.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Social Shell | **Padrão:** social-feed | **Ator:** Todos / Autenticado

### Anatomia

```
[Mural Feed max-w-3xl]
- 1. StoryRail no topo com fotos e moments
- 2. InlinePostComposer com upload de fotos e tags de comércio/classificado
- 3. Abas de Filtro: [Para Você] [Moments da Rua] [Desapegos]
- 4. Stream de PostCards com curtidas, comentários, salvos e denúncia
```

- **Empty:** "Você ainda não segue ninguém. [Explorar perfis]".

---

## P-003 · Explorar e Busca

**Rota:** `/_store/buscar` (`_store.buscar.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Public Discovery Shell | **Padrão:** search | **Ator:** Todos

### Anatomia Desktop

```
[Search bar full-width topo]
[Filtros de tipo: Tudo | Lojas | Produtos | Eventos | Pessoas | Classificados]
[Resultados em grid/list conforme tipo]
```

### Anatomia Mobile

- Search bar sticky no topo.
- Chips horizontais com scroll para filtrar tipo.
- Resultados em lista (não grid) para leitura rápida.

### Estados

- **Inicial (sem query):** Trending searches, categorias populares.
- **Com resultado:** Seções por tipo (ex: "3 lojas encontradas", "12 produtos").
- **Empty:** "Nenhum resultado para '{q}'. Tente outro termo."

### Ações

- Clicar em resultado → rota específica da entidade.
- Salvar busca (futuro).

---

## P-004 · Perfil Pessoal

**Rota:** `/_store/conta/perfil` (`_store.conta.perfil.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Social Shell | **Padrão:** profile | **Ator:** Próprio usuário / Visitantes

### Anatomia

```
[Avatar 80px] [Nome] [Username] [Bio] [Links externos]
[Seguidores | Seguindo | Posts]
[Tabs: Publicações | Avaliações | Salvos]
[Grid/lista de conteúdo da tab ativa]
```

### Modo Edição

- Desktop: right sheet com FormField canônico para cada campo.
- Mobile: página full-screen `/conta/perfil/editar`.

### Ações (próprio perfil)

- Editar Perfil (abre sheet/página).
- Compartilhar Perfil (copia link).

### Ações (perfil alheio)

- Seguir / Deixar de Seguir.
- Enviar Mensagem → P-008.
- Reportar perfil.

---

## P-005 · Publicação / Thread

**Rota:** `/_store/publicacao/$id` (`_store.publicacao.$id.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Social Shell | **Padrão:** post | **Ator:** Todos

### Anatomia

```
[Post original com mídia expandida]
[Ações: Curtir, Comentar, Compartilhar]
[Seção de comentários / respostas]
[Composer de resposta inline]
```

### Conexões

- Entidade referenciada no post → página da entidade (produto, evento, serviço).

---

## P-006 · Atividade / Notificações

**Rota:** `/_store/conta/notificacoes` (`_store.conta.notificacoes.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Social Shell | **Padrão:** activity | **Ator:** Autenticado

### Anatomia

```
[Tabs: Tudo | Curtidas | Comentários | Seguimentos | Pedidos]
[Lista de eventos com: ícone-tipo, ator, ação, objeto, timestamp]
```

### Tipos de notificação

- Alguém curtiu seu post.
- Alguém comentou.
- Alguém te seguiu.
- Pedido atualizado.
- Agendamento confirmado.
- Orçamento aprovado.

---

## P-007 · Salvos / Coleção

**Rota:** `/_store/conta/salvos` (`_store.conta.salvos.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Social Shell | **Padrão:** collection | **Ator:** Autenticado

### Anatomia

```
[Tabs: Todos | Produtos & Serviços | Classificados | Eventos]
[Grid de itens salvos com SSR instantâneo, touch targets 44px e remoção otimista]
```

---

## P-007b · Detalhe do Classificado Público (Mobg-Style)

**Rota:** `/_store/classificados/$id` (`_store.classificados.$id.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Social / Public Shell | **Padrão:** classified-detail | **Ator:** Todos

### Anatomia Desktop (Split Grid 7/5)

```
[Coluna Esquerda 7 cols]
- Galeria de Mídia (4:3/16:10) com player de vídeo integrado e thumbnails
- Descrição Completa do Anúncio (whitespace-pre-wrap)
- Ficha Técnica Dinâmica da Categoria (Veículos, Imóveis, Serviços ou Desapego)
- Localização Aproximada (Privacidade Protegida, sem número exato)

[Coluna Direita Sticky 5 cols]
- Card Flutuante de Negociação: Categoria Badge + Timestamp
- Título do Anúncio (H1)
- Valor Destaque (formatMoney ou "A Combinar") + Indicação "Aceita Propostas"
- Botão Primário: "Conversar no WhatsApp" (com mensagem pré-formatada)
- Botão Secundário: "Compartilhar Anúncio" (Web Share API)
- Card do Anunciante: Avatar, Nome e link para Perfil Público
- Dica de Segurança e Negociação
```

---

## P-007c · Editor de Classificados Split-View & Live Preview

**Rota:** `/_store/conta/classificados/novo` (`_store.conta.classificados.novo.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Dedicated In-Page Editor | **Padrão:** split-editor | **Ator:** Autenticado

### Anatomia Desktop

```
[Topbar Operacional 56px: Voltar, Título, Ações (Publicar Anúncio)]
[Painel Esquerdo 440px-480px (Scroll Interno)]
- 1. Seleção de Categoria (Desapego, Veículo, Imóvel, Serviço, Vaga)
- 2. Informações Básicas (Título, Descrição, Valor R$, Negociável, Condição)
- 3. Atributos da Categoria (Marca, Modelo, Ano, Km, Câmbio, m², Quartos, etc.)
- 4. MediaUploader (Fotos e Vídeos com dropzone)
- 5. Localização (Bairro Público) e WhatsApp

[Painel Direito flex-1 (Canvas de Preview Vivo)]
- Live Truthful Preview: Renderiza exatamente o layout público em tempo real
```

### Anatomia Mobile

```
[Topbar com Switcher: [Editar] / [Prévia]]
[Editor Full-Screen ou Preview Full-Screen conforme tab ativa]
[Barra Inferior Fixa com Botão "Publicar Anúncio"]
```

---

## P-008 · Mensagens — Inbox

**Rota:** `/_store/conta/conversas/$id` (`_store.conta.conversas.$id.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Social Shell | **Padrão:** inbox + conversation | **Ator:** Autenticado

### Anatomia Desktop (Master-Detail)

```
[Lista de conversas 320px] [Thread ativa flex-1]
- Lista: avatar, nome, último preview, timestamp, não-lido badge
- Thread: histórico de mensagens, input de resposta, attachment
```

### Anatomia Mobile

- Rota `/conta/conversas` = lista de conversas (empilhado).
- Clicar = navega para `/conta/conversas/$id` (thread full-screen).

### Ações

- Enviar mensagem de texto.
- Anexar imagem.
- Referenciar entidade (produto, pedido, orçamento).
- Arquivar conversa.
- Bloquear remetente.

---

## P-009 · Diretório de Negócios

**Rota:** `/_store/diretorio` (`_store.diretorio.index.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Public Discovery Shell | **Padrão:** directory | **Ator:** Todos

### Anatomia Desktop

```
[Filtros: Categoria, Bairro, Status] [Listing principal]
[Card: logo, nome, categoria, bairro, status, ação (WhatsApp/Rota)]
```

### Anatomia Mobile

- Search bar + chips de categoria no topo.
- Cards em lista (não grid 2 colunas).
- Mapa em sheet separado.

---

## P-010 · Eventos — Explorar

**Rota:** `/_store/evento/$id` (`_store.evento.$id.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Public Discovery Shell | **Padrão:** cards | **Ator:** Todos

### Anatomia (Listing — GAP, existe só o detalhe)

- Grid 2-4 colunas: mídia 4:3, data, título, local, preço.

### Anatomia (Detalhe do Evento)

```
[Mídia hero]
[Nome do Evento] [Data e Hora] [Local]
[CTA: Comprar Ingresso / Confirmar Presença]
[Programação / Lineup]
[Mapa]
[Updates da organização]
```

---

## P-011 · Classificados

**Rota:** `/_store/conta/classificados` (`_store.conta.classificados.index.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Public Discovery Shell | **Padrão:** cards | **Ator:** Todos

### Anatomia Listing

- Busca, filtros (categoria, localização, preço, condição).
- Grid de cards: foto, título, preço, condição, localização.

### Anatomia Detalhe

- Galeria, nome, preço, condição, localização, perfil do vendedor.
- Ação: Contatar (abre mensagem ou WhatsApp).
- Segurança/Denúncia.

---

## P-012 · Mercado — Home de Lojas

**Rota:** `/_store/mercado` (`_store.mercado.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Public Discovery Shell | **Padrão:** market | **Ator:** Todos

### Anatomia

```
[Search bar]
[Chips de categoria horizontal]
[Seção "Lojas perto de você" — se provider geolocation ativo]
[Seção "Lojas em Destaque"]
[Seção "Produtos recentes"]
```

---

## P-013 · Storefront / Loja Pública

**Rota:** `/_store/vendedora/$slug` (`_store.vendedora.$slug.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Public Discovery Shell | **Padrão:** storefront | **Ator:** Todos

### Anatomia

```
[Cover image full-width]
[Logo + Nome + Status (Aberto/Fechado)]
[CTAs: WhatsApp, Agendar, Ver Catálogo]
[Tabs: Catálogo | Serviços | Eventos | Avaliações | Sobre]
[Conteúdo da tab ativa]
```

### Estados

- **Loja fechada:** banner "Fechado" com horário de abertura.
- **Loja inativa/suspensa:** página de erro.

---

## P-014 · Produto Público (Detalhe)

**Rota:** `/_store/produto/$slug` (`_store.produto.$slug.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Public Discovery Shell | **Padrão:** entity | **Ator:** Todos

### Anatomia Desktop

```
[Galeria ~50% esquerda] [Info + Ação ~50% direita]
- Galeria: imagem principal + miniaturas, zoom hover
- Info: breadcrumb, nome, preço/compare_at, variantes, quantidade, extras, CTA
- Abaixo: Descrição, Atributos, Avaliações, Produtos Relacionados
```

### Anatomia Mobile

```
[Galeria hero full-width]
[Nome, preço, variantes]
[Acordeão: Descrição | Detalhes | Avaliações]
[Sticky Bottom Bar: Quantidade + "Adicionar ao Carrinho"]
```

### Estados especiais

- **Esgotado:** CTA "Avise-me quando chegar" (captura e-mail).
- **Pré-venda ativa:** CTA "Fazer pré-venda" com data estimada.
- **Produto com agendamento:** CTA "Agendar" → `/agendar`.

---

## P-015 · Serviço Público (Detalhe)

**Rota:** `/_store/agendar` (`_store.agendar.index.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Public Discovery Shell | **Padrão:** service_public | **Ator:** Todos

### Anatomia

```
[Mídia / Portfolio do serviço]
[Nome | Duração | Preço]
[Profissional/Recurso disponível]
[Calendário de disponibilidade]
[CTA: Agendar Agora]
[Descrição detalhada]
[Política de cancelamento]
```

---

## P-016 · Link-in-Bio Público

**Rota:** `/_store/bio/$slug` (`_store.bio.$slug.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Minimal (sem nav padrão) | **Padrão:** biolink | **Ator:** Todos

### Anatomia

- Renderizado pelo Editorial Presentation System.
- Qualquer preset visual configurado pelo dono.
- Sem shell operacional ao redor.

---

## P-017 · Agendamento — Seleção de Slot

**Rota:** `/_store/agendar` (`_store.agendar.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Public Discovery Shell | **Padrão:** stepper | **Ator:** Todos

### Fluxo em Etapas

1. Selecionar serviço (se não veio de produto específico).
2. Selecionar profissional/recurso (se loja permite escolha).
3. Selecionar data no calendário.
4. Selecionar horário disponível.
5. Preencher dados pessoais.
6. Confirmar → e-mail enviado.

---

# Família 2 — Conta do Cliente (_store.conta.*)

---

## P-018 · Painel da Conta

**Rota:** `/_store/conta` (`_store.conta.index.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Minimal (autenticado) | **Padrão:** dashboard compacto | **Ator:** Cliente autenticado

### Anatomia

```
[Avatar + Nome + Email]
[Links rápidos: Pedidos, Endereços, Configurações]
[Últimos pedidos (3)]
[Próximos agendamentos (2)]
```

### Regra Anti-Protótipo

Sem KPI cards decorativos. Apenas links diretos e resumo real de atividade.

---

## P-019 · Meus Pedidos (Lista)

**Rota:** `/_store/conta/pedidos` (`_store.conta.pedidos.index.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Minimal | **Padrão:** list | **Ator:** Cliente

### Anatomia

```
[Tabs: Todos | Em andamento | Entregues | Cancelados]
[Rows: número, data, status, valor, ação]
```

---

## P-020 · Detalhe do Pedido (Cliente)

**Rota:** `/_store/conta/pedidos/$id` (`_store.conta.pedidos.$id.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Minimal | **Padrão:** entity detail | **Ator:** Cliente

### Anatomia

```
[Número do pedido | Status badge]
[Timeline do status]
[Itens comprados]
[Endereço de entrega]
[Resumo financeiro]
[Rastreamento (se disponível)]
[Ações: Solicitar Troca | Avaliar | Baixar Recibo]
```

### Regras

- Botão "Solicitar Troca" aparece apenas dentro do prazo.
- Link de rastreio abre transportadora real (nunca simulado).

---

## P-021 · Solicitar Troca/Devolução (Cliente)

**Rota:** `/_store/conta/trocas` (`_store.conta.trocas.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Minimal | **Padrão:** grouped-cards + modal | **Ator:** Cliente

### Anatomia

- Header minimalista com badge de contagem de solicitações ativas.
- Cards agrupados Apple HIG com status, código de postagem reversa, valor envolvido e download de declaração de conteúdo.
- Modal integrado para abertura direta de solicitação de RMA a partir dos pedidos recentes com seleção de tipo (devolução/estorno, troca ou garantia) e motivo legal (Art. 49 CDC).

---

## P-022 · Endereços

**Rota:** `/_store/conta/enderecos` (`_store.conta.enderecos.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Minimal | **Padrão:** apple-hig-inset-grouped | **Ator:** Cliente

### Anatomia

- Formulário e cartões no padrão Apple HIG Inset-Grouped List com touch targets mínimos de 44px (`h-11`).
- Preenchimento inteligente de CEP via ViaCEP integrado.
- Seleção direta de endereço padrão com indicador e remoção com confirmação defensiva.

---

## P-023 · Créditos em Conta

**Rota:** `/_store/conta/creditos` (`_store.conta.creditos.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Minimal | **Padrão:** ledger | **Ator:** Cliente

### Anatomia

- Saldo atual em destaque.
- Histórico de créditos/débitos com tipo e data.

---

## P-024 · Gift Cards

**Rota:** `/_store/conta/gift-cards` (`_store.conta.gift-cards.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Minimal | **Padrão:** list | **Ator:** Cliente

---

## P-025 · Histórico de Pagamentos

**Rota:** `/_store/conta/pagamentos` (`_store.conta.pagamentos.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Minimal | **Padrão:** ledger | **Ator:** Cliente

---

## P-026 · Avaliações do Cliente

**Rota:** `/_store/conta/avaliacoes` (`_store.conta.avaliacoes.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Minimal | **Padrão:** list | **Ator:** Cliente

---

## P-027 · Suporte / Tickets

**Rota:** `/_store/conta/suporte` (`_store.conta.suporte.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Minimal | **Padrão:** inbox | **Ator:** Cliente

---

## P-028 · Comissões do Parceiro/Afiliado (Cliente)

**Rota:** `/_store/conta/comissoes` (`_store.conta.comissoes.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Minimal | **Padrão:** ledger | **Ator:** Parceiro/Afiliado autenticado

### Anatomia

```
[Saldo disponível para saque]
[Saldo em hold (aguardando prazo)]
[Histórico: data, pedido, valor, status]
[Botão: Gerar Fatura/PayoutRequest]
```

---

# Família 3 — Workspace de Gestão (workspace.*)

---

## W-001 · Painel Inicial

**Rota:** `/workspace` (`workspace.index.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Organization Workspace Shell | **Padrão:** dashboard operacional | **Ator:** Staff

### Anatomia CORRETA (anti-protótipo)

```
[Toolbar: período selector]
[Strip de métricas: Pedidos hoje | Faturamento hoje | Agendamentos hoje | Alertas]
[Painel "Operação Agora": últimos pedidos, próximos agendamentos, estoque em alerta]
[Sem 8 KPI cards decorativos]
```

### Regra

Mostrar apenas o que gera decisão. Lojista bate o olho e sabe o que precisa fazer.

---

## W-002 · PDV — Frente de Caixa

**Rota:** `/workspace/pdv` (`workspace.pdv.index.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Workspace (sem sidebar, modo full-screen) | **Padrão:** pos | **Ator:** Seller, Owner

### Anatomia Desktop

```
[Product Browser 65-72%] [Cart + Payment 28-35%]
- Product Browser: search, barcode input, category tabs, product grid
- Cart: items com qty, discounts, coupon, gift card, payment methods, total
```

### Anatomia Mobile

- Tela 1: busca + grid de produtos.
- Tela 2 (FAB com contador): carrinho + pagamento.

---

## W-003 · Comandas (PDV Adicional)

**Rota:** `/workspace/pdv/comandas` (`workspace.pdv.comandas.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Workspace | **Padrão:** operational board | **Ator:** Seller, Owner

### Conceito

Para restaurantes/bares: mesas e comandas abertas por mesa.

---

## W-004 · Pedidos — Lista/Board

**Rota:** `/workspace/pedidos` (`workspace.pedidos.index.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Workspace | **Padrão:** orders | **Ator:** Owner, Manager, Seller

### Anatomia

- Toggle: Board (Kanban) / Lista (DataGrid).
- Board: colunas de status com drag-and-drop.
- DataGrid: busca, filtros, bulk actions, impressão.

---

## W-005 · Detalhe do Pedido (Lojista)

**Rota:** `/workspace/pedidos/$id` (`workspace.pedidos.$id.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Workspace | **Padrão:** order_detail | **Ator:** Owner, Manager

### Anatomia

Ver `BUSINESS_FLOWS.md — Módulo 3.2` para anatomia completa.

---

## W-006 · Gestor Avançado de Pedidos (KDS & Omnichannel)

**Rota:** `/workspace/pedidos/gestor` (`workspace.pedidos.gestor.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Workspace Clean Shell | **Padrão:** operational board (KDS Kanban) | **Ator:** Operador de Caixa, Chefe de Cozinha, Gerente

### Anatomia Desktop (1440px) & Mobile
```
[Header Superior: Indicador Ao Vivo WebSocket + Alerta Sonoro WebAudio + Toggle Tela Cheia KDS + Alternador Kanban/Grid]
[Subheader Operacional:
  - Abas de Produção: [Agora (N)] vs [Agendados (N)] com contagem dinâmica em tempo real
  - Chips Omnichannel: [Todos] [iFood] [WhatsApp] [Cardápio Próprio] [Delivery] [Balcão / Mesa]
  - Campo de Busca Instantânea com filtro reativo por cliente, comanda e endereço]
[Board Kanban KDS 4 Colunas com Barra de SLA (Verde <20m, Amarelo 20-30m, Vermelho >30m):
  - 1. Novos / Pendentes (Ação: Iniciar Preparo ou Recusar)
  - 2. Em Preparo / Cozinha (Ação: Concluir Preparo / Pronto)
  - 3. Pronto / Despacho (Ação: Despachar / Retirar)
  - 4. Finalizados (Histórico de entregas e comandas pagas)
  - Ações Rápidas em Cada Card: Botão de Impressão Térmica 80mm com 1 clique + Botão WhatsApp do Cliente]
[Sheet / Drawer Lateral de Detalhes (Desktop Drawer / Mobile Fullpage na Thumb Zone):
  - Tabs Apple HIG: [Detalhes dos Itens] [Cliente & Entrega] [Histórico & SLAs]
  - Visualização rica de complementos (adicionais, meio-a-meio, observações e modificadores com preços)
  - Botões de Navegação GPS (Google Maps e Waze com 1 toque)
  - Barra de Rodapé Fixa (Thumb Zone 44px): Imprimir 80mm, WhatsApp e Botão Primário Largo de Próximo Status]
```

---

## W-007 · Trocas e Devoluções (Lojista)

**Rota:** `/workspace/pedidos/trocas` (`workspace.pedidos.trocas.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Workspace | **Padrão:** returns | **Ator:** Owner, Manager

### Anatomia

```
[Tabs: Pendentes | Em Análise | Aprovadas | Concluídas | Recusadas]
[DataGrid: ID, Cliente, Pedido, Motivo, Prazo, Status]
[Filtros de prazo, urgência, período]
```

---

## W-008 · Frota e Expedição Rápida

**Rota:** `/workspace/pedidos/frota` (`workspace.pedidos.frota.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Workspace Clean Shell | **Padrão:** delivery_board | **Ator:** Operador, Expedidor, Gerente

### Anatomia

```
[Seção de Expedição Imediata: Cards de pedidos de delivery pendentes (listPendingDeliveryOrders) prontos para despacho com 1 toque]
[Board Kanban da Frota: Para Atribuir | Em Rota | Concluído | Incidente]
[Formulário de Despacho com Seletores Inteligentes: Seleciona pedidos e entregadores reais da loja sem mocks]
[Link Mágico de Entrega com GPS em tempo real, validação por PIN de 4 dígitos e comprovante com foto e assinatura]
```

---

## W-009 · Entregadores & Frota Local

**Rota:** `/workspace/pedidos/entregadores` (`workspace.pedidos.entregadores.index.tsx`, `workspace.pedidos.entregadores.novo.tsx`, `workspace.pedidos.entregadores.$id.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Workspace Clean Shell | **Padrão:** couriers | **Ator:** Owner, Gerente de Logística

### Anatomia

```
[DataGrid: foto, nome, telefone, veículo, placa, modalidade de remuneração (por km / fixa), status ativo/em rota]
[Métricas de Frota: entregas do dia, tempo médio de entrega e faturamento acumulado]
[Página de Cadastro e Edição com upload de foto e regras de tarifas locais]
```

---

## W-010 · Recibo de Pedido (Impressão)

**Rota:** `/workspace_/pedidos/$id/recibo` (`workspace_.pedidos.$id.recibo.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Minimal (print-only) | **Padrão:** document | **Ator:** Owner, Manager

---

## W-011 · Catálogo de Produtos

**Rota:** `/workspace/catalogo/produtos` (`workspace.catalogo.produtos.index.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Workspace | **Padrão:** catalog | **Ator:** Owner, Manager, Content

### Anatomia

```
[Toolbar: busca, filtros (status, categoria, estoque), botão "+ Novo Produto"]
[Tabs: Todos | Ativos | Rascunhos | Arquivados]
[DataGrid/Rows: imagem thumb, nome, SKU, preço, estoque, status, ações inline]
[Expand row: variantes]
[Bulk: ativar, arquivar, exportar]
```

---

## W-012 · Novo Produto Universal

**Rota:** `/workspace/catalogo/produtos/novo` (`workspace.catalogo.produtos.novo.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Workspace Clean Shell | **Padrão:** editor_product | **Ator:** Owner, Manager

### Anatomia Desktop & Mobile

```
[PageHeader: Eyebrow "Catálogo", Título contextualizado por nicho (nicheCtx.entityName), Botões "Importar com IA", "Voltar" e "Publicar"]
[Tabs Principais:
  - 1. Básico & Comercial: Identificação, Título, Categoria, Marca, Slug, Unidade de Venda, Preço, Comparação, Custo, Margem, Estoque, Matriz de Variações 2D Combinatória e Card de Adicionais & Modificadores (ProductModifiersCard com criação inline via QuickOptionGroupDialog)
  - 2. Cardápio & Especificações Gastronômicas (Exclusivo Gastronomia): Porção, rendimento em pessoas, tempo de preparo, tags alimentares (Sem Glúten, Vegano, etc.) e código PDV
  - 3. Fotos & Mídias: Galeria MediaUploader com dropzone real, ordenação e recorte de imagens
]
```

---

## W-013 · Editor Avançado de Produto

**Rota:** `/workspace/catalogo/produtos/$id` (`workspace.catalogo.produtos.$id.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Workspace Clean Shell | **Padrão:** editor_product | **Ator:** Owner, Manager

### Anatomia Desktop & Mobile

```
[Layout com Truthful Preview Lateral: Card de produto em tempo real com imagem de capa, preço, badge de margem estimada e descrição]
[Navegação por Seções:
  - 1. Informações Básicas & Comerciais (GeneralForm)
  - 2. Especificações do Cardápio & Restrições (ProductFoodSpecsCard - Gastronomia)
  - 3. Galeria de Fotos e Mídias (MediaManager)
  - 4. Estoque & Matriz de Variações Granulares (VariantsManager)
  - 5. Adicionais & Modificadores (ProductModifiersCard vinculado atomicamente a product_option_groups)
  - 6. Ficha Técnica & Composição de Insumos (ProductBomCard para cálculo automatizado de CMV)
]
```

---

## W-014 · Categorias

**Rota:** `/workspace/catalogo/categorias` (`workspace.catalogo.categorias.index.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Workspace | **Padrão:** simple_list | **Ator:** Owner, Manager

---

## W-015 · Nova Categoria

**Rota:** `/workspace/catalogo/categorias/novo` | **Status:** `✅ IMPLEMENTADO`

---

## W-016 · Editar Categoria

**Rota:** `/workspace/catalogo/categorias/$id` | **Status:** `✅ IMPLEMENTADO`

---

## W-017 · Coleções

**Rota:** `/workspace/catalogo/colecoes` | **Status:** `✅ IMPLEMENTADO`
**Shell:** Workspace | **Padrão:** collection_admin | **Ator:** Owner, Manager

---

## W-018 · Tipos de Produto / Atributos

**Rota:** `/workspace/catalogo/tipos` (`workspace.catalogo.tipos.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Workspace | **Padrão:** data_grid | **Ator:** Owner

---

## W-019 · Controle de Estoque

**Rota:** `/workspace/estoque` (`workspace.estoque.index.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Workspace | **Padrão:** inventory | **Ator:** Owner, Manager, Stock

### Anatomia

```
[Toolbar: busca, filtro por localização, botão ajuste]
[DataGrid: produto, SKU, disponível, reservado, mínimo, status]
[Expand row: movimentações recentes]
[Bulk: ajuste em lote]
```

### Ações Inline

- Ajuste (+/-): abre dialog pequeno com quantidade e motivo.
- Ver histórico de movimentações.
- Transferência entre locais.

---

## W-020 · Alertas de Estoque

**Rota:** `/workspace/estoque/alertas` (`workspace.estoque.alertas.tsx`) | **Status:** `✅ IMPLEMENTADO`

---

## W-021 · Movimentações de Estoque

**Rota:** `/workspace/estoque/movimentos` (`workspace.estoque.movimentos.tsx`) | **Status:** `✅ IMPLEMENTADO`

---

## W-022 · Calendário / Agenda

**Rota:** `/workspace/agenda` (`workspace.agenda.index.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Workspace | **Padrão:** calendar | **Ator:** Owner, Manager

### Anatomia Desktop

```
[Resource Rail 200px: lista de profissionais/equipamentos com status]
[Toolbar: período, visualização (dia/semana/mês), botão + Novo]
[Timeline: colunas por dia/hora, blocos de compromissos coloridos por recurso]
```

### Anatomia Mobile

- Day timeline view.
- Switcher de recurso (dropdown compacto no topo).
- FAB para novo agendamento → full-screen sheet.

---

## W-023 · Recursos da Agenda

**Rota:** `/workspace/agenda/recursos` (`workspace.agenda.recursos.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Workspace | **Padrão:** simple_list | **Ator:** Owner

### Anatomia

```
[Tabs: Pessoas | Equipamentos | Espaços]
[List rows: foto, nome, tipo, status, disponibilidade padrão]
[Ação: Editar disponibilidade → AvailabilityEditor sheet]
```

---

## W-024 · Catálogo de Serviços

**Rota:** `/workspace/agenda/servicos` (`workspace.agenda.servicos.index.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Workspace | **Padrão:** service_list | **Ator:** Owner, Manager

---

## W-025 · Editor de Serviço

**Rota:** `/workspace/servicos` (`workspace.servicos.index.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Workspace | **Padrão:** editor_service | **Ator:** Owner

### Seções

Ver `BUSINESS_FLOWS.md — Módulo 6 / Editor de Serviço`.

---

## W-026 · Clientes — Diretório

**Rota:** `/workspace/clientes` (`workspace.clientes.index.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Workspace | **Padrão:** customers | **Ator:** Owner, Manager

---

## W-027 · Detalhe do Cliente

**Rota:** `/workspace/clientes/$id` (`workspace.clientes.$id.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Workspace | **Padrão:** customer_detail | **Ator:** Owner, Manager

---

## W-028 · CRM / Pipeline & Leads Kanban

**Rota:** `/workspace/comercial` (`workspace.comercial.tsx`) e `/workspace/crm` | **Status:** `✅ IMPLEMENTADO`
**Shell:** Workspace | **Padrão:** kanban | **Ator:** Owner, Manager

### Anatomia

```
[Tabs: Pipeline (Kanban) | Lista]
[Kanban: colunas por estágio (Lead, Contactado, Proposta, Negociação, Fechado, Perdido)]
[Card: nome, valor estimado, dono, próxima tarefa, last activity]
```

---

## W-029 · Orçamentos — Lista

**Rota:** `/workspace/orcamentos` (`workspace.orcamentos.index.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Workspace | **Padrão:** quotes | **Ator:** Owner, Manager

---

## W-030 · Detalhe do Orçamento

**Rota:** `/workspace/orcamentos/$id` (`workspace.orcamentos.$id.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Workspace | **Padrão:** quote_detail | **Ator:** Owner, Manager


---

## W-030b · Carnês, Contas a Receber & Cobrança Humanizada

**Rota:** `/workspace/financeiro/recebiveis` (`workspace.financeiro.recebiveis.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Workspace Clean Shell | **Padrão:** receivables-ledger | **Ator:** Owner, Finance, Manager

### Anatomia Desktop (1440px)
```
[Main max-w-6xl mx-auto]
- PageHeader: Título "Carnês & Contas a Receber", Subtítulo "Gestão acolhedora de parcelas, caderninho e cobrança empática"
- Ações Primárias: [Novo Carnê / Venda a Prazo] [Lembretes em Massa WhatsApp]
- Grid de 4 Cards de Métricas Reais:
  1. Total em Aberto (R$ valor_cents + número de carnês ativos)
  2. A Vencer nos Próximos 7 Dias (Previsão de entrada de caixa a curto prazo)
  3. Em Atraso Suave (< 15 dias) e Crítico (> 30 dias)
  4. Conciliados / Liquidados no Mês (Taxa de adimplência saudável)
- Barra de Filtros Rápidos: [Todos] [Vencendo Logo] [Em Atraso] [Aguardando Conciliação] [Liquidados] + Busca por Cliente/CPF
- Tabela Master de Carnês & Parcelas:
  - Cliente (Nome, Telefone, Badge de Confiança)
  - Título da Venda / Compra
  - Parcela Vigente (ex: 2/5)
  - Valor Nominal vs Valor com Desconto de Pontualidade
  - Data de Vencimento com Tag de Alerta
  - Status (Pendente, Pago, Atrasado, Renegociado)
  - Ações Rápidas:
    - "Conciliar / Baixar" (Abre modal de recebimento com opção de perdoar juros)
    - "Mensagem Empática" (Abre WhatsApp com template carinhoso sem tom punitivo)
    - "Renegociar Parcela" (Ajuste de data e valor sem burocracia)
- Modal de Emissão Rápida de Carnê:
  - Busca de cliente (com auto-complete ou cadastro em 2 toques)
  - Valor total, número de parcelas (1x a 24x), primeiro vencimento
  - Tag de finalidade da compra
- Modal de Cobrança Humanizada em Massa:
  - Seleção por checkbox múltiplo
  - Escolha de tom: "Lembrete Amigo (Vencendo amanhã)", "Oportunidade com Desconto de Pontualidade", "Conversa Franca (Para quem está apertado)"
  - Preview real da mensagem com tags `{nome}`, `{valor}`, `{data}`
```

### Contratos BFF Associados
- `listStoreCarnes()` (`receivables.functions.ts`)
- `getCarnesReportSummary()` (`receivables.functions.ts`)
- `approveInstallmentPayment()` (`receivables.functions.ts`)
- `adjustInstallmentAmount()` (`receivables.functions.ts`)
- `sendMassBillingReminders()` (`receivables.functions.ts`)
- `createStoreCarne()` (`receivables.functions.ts`)

---

## W-030c · Saúde de Caixa, Cofres Blindados & Giro por Vendas (Waesy Care Finance)

**Rota:** `/workspace/financeiro/recebiveis` (Aba Saúde de Caixa) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Workspace Clean Shell | **Padrão:** cashflow-shield | **Ator:** Owner, Finance

### Anatomia Desktop (1440px)
```
[Main max-w-6xl mx-auto]
- Banner Superior de Tranquilidade:
  - Indicador de Fôlego de Caixa: "Você tem 18 dias de despesas fixas cobertas"
  - Badge de Saúde: "Equilibrado / Zona de Tranquilidade"
- Seção 1: Cofres Inteligentes Blindados (Provisionamento Automático)
  - Card Cofre Aluguel: Barra de progresso (ex: R$ 1.800 de R$ 2.500 retidos suavemente das vendas diárias)
  - Card Cofre Folha Salarial: Barra de progresso (ex: R$ 4.200 de R$ 6.000 retidos até dia 05)
  - Rendimento Acumulado: Rendendo 102% do CDI diariamente em conta custodiada
  - Ação: "Configurar Reserva Diária" ou "Liberar Aporte Extra"
- Seção 2: Antecipação Solidária de Giro por Vendas
  - Limite Disponível Baseado no Histórico de Vendas (ex: R$ 12.000,00 aprovados)
  - Simulador Transparente:
    - Retenção Diária: Slider de 5% a 15% das vendas da maquininha/marketplace
    - Custo Fixo de R$ 0,00 em dias que a loja não vender
    - Taxa pré-fixada justa (1,2% a 1,8% ao mês, contra 8% do cheque especial dos grandes bancos)
  - Botão Primário: "Ativar Giro na Minha Conta Waesy"
- Seção 3: Conciliação de Fornecedores & NF-e de Entrada
  - Lista de Duplicatas Vinculadas com XML/Chave NF-e
  - Alerta de Economia: "Pague seu fornecedor usando saldo interno Waesy com R$ 0,00 de taxas e D+0"
  - Agendador de Liquidação Automática no dia do vencimento da nota
```

---

## W-031 · Caixa

**Rota:** `/workspace/financeiro/caixa` (`workspace.financeiro.caixa.index.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Workspace | **Padrão:** cash | **Ator:** Owner, Finance

### Anatomia

```
[Status do turno atual: Aberto / Fechado]
[Resumo: Abertura, Entradas, Saídas, Saldo esperado, Saldo contado, Diferença]
[Ações próximas: Sangria | Suprimento | Fechar Caixa]
[Histórico de lançamentos do turno]
```

---

## W-032 · Lançamentos do Caixa

**Rota:** `/workspace/financeiro/caixa/lancamentos` | **Status:** `✅ IMPLEMENTADO`

---

## W-033 · Turnos de Caixa

**Rota:** `/workspace/financeiro/caixa/turnos` | **Status:** `✅ IMPLEMENTADO`

---

## W-034 · Pagamentos Recebidos

**Rota:** `/workspace/financeiro/pagamentos` | **Status:** `✅ IMPLEMENTADO`

---

## W-035 · Comprovantes Manuais

**Rota:** `/workspace/financeiro/comprovantes` | **Status:** `✅ IMPLEMENTADO`

---

## W-036 · Comissões da Equipe

**Rota:** `/workspace/financeiro/comissoes` | **Status:** `✅ IMPLEMENTADO`

---

## W-037 · Comissões de Parceiros/Afiliados

**Rota:** `/workspace/financeiro/afiliados` (`workspace.financeiro.afiliados.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Workspace | **Padrão:** ledger | **Ator:** Owner, Finance

### Anatomia

```
[DataGrid: parceiro, conversões no período, valor gerado, comissão, status]
[Filtros: período, status (pendente/hold/liberado/pago)]
[Ação: Gerar fatura para parceiro]
```

---

## W-038 · Financeiro de Funcionários

**Rota:** `/workspace/financeiro/funcionarios` | **Status:** `✅ IMPLEMENTADO`

---

## W-039 · Avaliações (Workspace)

**Rota:** `/workspace/cms/avaliacoes` | **Status:** `✅ IMPLEMENTADO`
**Shell:** Workspace | **Padrão:** reviews | **Ator:** Owner, Manager

---

## W-040 · Stories

**Rota:** `/workspace/cms/stories` | **Status:** `✅ IMPLEMENTADO`

---

## W-041 · Hub de Sites, Vitrines, Biolinks & Hotpages

**Rota:** `/workspace/marketing/vitrine` (`workspace.marketing.vitrine.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Workspace Clean Shell | **Padrão:** resource-grid | **Ator:** Owner, Content, Marketing

### Anatomia Desktop (1440px)
```
[Main max-w-6xl mx-auto]
- PageHeader: Título "Sites, Vitrines & Hotpages", ação primária "Nova Hotpage / Página"
- Tabs de Segmentação: [Todos os Sites] [🔥 Hotpages & Ofertas] [Modelos & Templates]
- Toolbar de Controle: Campo de busca rápida + Alternador de visualização [Grid / List]
- Grid de Documentos:
  1. Card Criar Novo Documento (Dashed)
  2. Card Vitrine Principal da Loja (Status Ao Vivo, Seções Ativas, Botão "Editar no Builder")
  3. Card Link da Bio & Perfil Mobile (Status Ativo, Botão "Editar no Builder")
  4. Cards de Hotpages e Landing Pages Personalizadas (Duplicar, Excluir, Abrir no Builder)
- Galeria de Modelos Profissionais com 8 templates de alta conversão (Turismo, Gastronomia, Varejo, Spas, Imóveis)
```

---

## W-042 · Hotpages & Campanhas Promocionais

**Rota:** `/workspace/marketing/hotpages` (`workspace.marketing.hotpages.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Workspace Clean Shell | **Padrão:** resource-list | **Ator:** Owner, Marketing

---

## W-043 · Construtor Visual Universal (Canvas Editor)

**Rota:** `/workspace/builder/$documentId/editor` (`workspace.builder.$documentId.editor.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Builder Shell | **Padrão:** canvas-wysiwyg | **Ator:** Owner, Content

### Anatomia
```
[TopBar 48px: Voltar | Título do Doc | Status de Salvamento | Responsividade (Desktop/Tablet/Mobile) | Prévia | Publicar]
[Left Panel 60px: Camadas | Adicionar Seção | Temas | Configurações]
[Add Panel 3-Col: Gaveta de 3 colunas por nicho (Turismo, Ofertas, Varejo, Food, Serviços, Geral)]
[Canvas Central: Viewport com snap scroll e renderização dinâmica ExperienceRenderer]
[Right Inspector 300px: Propriedades de nó, tipografia, espaçamentos, bindings de dados e ações de CTA]
```

---

## W-044 · Navegação / Menus

**Rota:** `/workspace/cms/navegacao` | **Status:** `✅ IMPLEMENTADO`

---

## W-045 · Estúdio / Gerador de Post-Flyer

**Rota:** `/workspace/estudio` (`workspace.estudio.index.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Builder Shell | **Padrão:** generator | **Ator:** Owner, Content

---

## W-046 · Turismo / Propostas Comerciais & Cotações

**Rota:** `/workspace/turismo/propostas` (`workspace.turismo.propostas.index.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Workspace Clean Shell | **Padrão:** resource-list | **Ator:** Agente de Viagem, Owner

---

## W-047 · Turismo / Contratos Digitais & Assinatura

**Rota:** `/workspace/turismo/contratos` (`workspace.turismo.contratos.index.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Workspace Clean Shell | **Padrão:** resource-list | **Ator:** Agente de Viagem, Owner

---

## W-048 · Turismo / Grupos de Viagem & Excursões

**Rota:** `/workspace/turismo/grupos` (`workspace.turismo.grupos.index.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Workspace Clean Shell | **Padrão:** resource-list | **Ator:** Agente de Viagem, Guia

---

## W-049 · Carrinhos Abandonados & Recuperação de Vendas


**Rota:** `/workspace/marketing/carrinhos` | **Status:** `✅ IMPLEMENTADO`

---

## W-047 · Gift Cards (Workspace)

**Rota:** `/workspace/marketing/gift-cards` | **Status:** `✅ IMPLEMENTADO`

---

## W-048 · Publicar no Mural

**Rota:** `/workspace/mural/novo` | **Status:** `✅ IMPLEMENTADO`

---

## W-049 · Integrações

**Rota:** `/workspace/configuracoes/integracoes` | **Status:** `✅ IMPLEMENTADO`
**Shell:** Workspace | **Padrão:** integrations | **Ator:** Owner

### Anatomia

```
[Grid de providers: Melhor Envio, MercadoPago, Asaas, Meta Pixel, Google Analytics]
[Card de provider: logo, nome, capability, status, last check, botão Configurar]
[Status: 'active' | 'testing' | 'error' | 'unconfigured' — nunca boolean]
```

### Regra

Provider sem credencial: card mostra "Não configurado" e botão "Configurar". Nunca simula sucesso.

---

## W-050 · Fretes e Cotações

**Rota:** `/workspace/configuracoes/fretes/cotacoes` | **Status:** `✅ IMPLEMENTADO`

---

## W-051 · Configurações da Loja

**Rota:** `/workspace/configuracoes` (`workspace.configuracoes.index.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Workspace | **Padrão:** settings | **Ator:** Owner

### Anatomia

```
[Nav lateral de settings 200px]
[Seções: Perfil | Horários | Políticas | Notificações | Branding | Equipe | Impressoras | Parceiros]
```

---

## W-052 · Equipe e Permissões

**Rota:** `/workspace/configuracoes/equipe` (`workspace.configuracoes.equipe.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Workspace | **Padrão:** team | **Ator:** Owner

### Anatomia

```
[DataGrid: foto, nome, email, cargo, role, status]
[Ações: Convidar, Editar permissões, Desativar]
[Modelo de permissões: capability-based, não apenas dropdown de role]
```

---

## W-053 · Configurações de Nicho/Onboarding

**Rota:** `/workspace/onboarding` (`workspace.onboarding.index.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Workspace | **Padrão:** settings | **Ator:** Owner

### Conceito

Permite ao lojista alterar o nicho da empresa (ex: migrar de "Loja" para "Beleza/Saúde").
Renomeia módulos na sidebar conforme o nicho selecionado.

---

## W-054 · Configuração de Parceiros/Afiliados

**Rota:** `/workspace/configuracoes/parceiros` (`workspace.configuracoes.parceiros.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Workspace | **Padrão:** settings | **Ator:** Owner

---

# Família 4 — Admin Master (admin-master.*)

---

## A-001 · Painel Geral do Admin

**Rota:** `/admin-master` (`admin-master.index.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Admin Master Shell | **Padrão:** admin | **Ator:** Admin Master

---

## A-002 · Gestão de Lojas/Tenants

**Rota:** `/admin-master/lojas` (`admin-master.lojas.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Admin Master Shell | **Padrão:** admin_table | **Ator:** Admin Master

---

## A-003 · Faturas da Plataforma

**Rota:** `/admin-master/faturas` (`admin-master.faturas.tsx`) | **Status:** `✅ IMPLEMENTADO`

---

## A-004 · Usuários e Acessos

**Rota:** `/admin-master/usuarios` (`admin-master.usuarios.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Admin Master Shell | **Padrão:** admin_table | **Ator:** Admin Master

---

## A-005 · Moderação de Conteúdo

**Rota:** `/workspace/moderacao` (`workspace.moderacao.index.tsx`) e `/admin-master/denuncias` | **Status:** `✅ IMPLEMENTADO`
**Shell:** Admin Master Shell | **Padrão:** moderation | **Ator:** Admin Master

### Anatomia

```
[Tabs: Reportados | Em análise | Resolvidos]
[DataGrid: tipo conteúdo, autor, motivo, reports count, data]
[Ação inline: Visualizar | Remover | Advertir | Banir]
[Chat de auditoria: notas dos moderadores por item]
```

---

---

## P-058 · SimLab IA — Enxame de Validação Preditiva

**Rota:** `/workspace/simulacao` (`workspace.simulacao.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Workspace Shell | **Padrão:** simulation_engine | **Ator:** Lojista, Produtor, Staff

### Anatomia Desktop

```
[Header com Badge Beta IA e Ação Primária "Simular Proposta"]
[Grid 5/7:]
- Esquerda: Formulário de Proposta (Nicho, Título, Preço BRL, Pitch) + Lista de Personas Calibradas.
- Direita: Score Cards (Atratividade, Conversão %, Elasticidade Preço) + Objeções + Feedbacks Individuais por Persona.
```

### Estados

- **Inicial:** Card com ícone e instruções convidando a rodar a primeira simulação.
- **Loading:** Animação de processamento estocástico do enxame de personas.

---

## P-059 · Campanhas de Anúncios (Ads Engine)

**Rota:** `/workspace/marketing/anuncios` (`workspace.marketing.anuncios.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Workspace Shell | **Padrão:** ads_dashboard | **Ator:** Lojista, Produtor, Conteúdo

### Anatomia Desktop

```
[Header com Métricas Gerais: Impressões, Cliques, CTR Médio, Investimento]
[Lista de Campanhas com status Veiculando/Pausado, badge de formato e métricas]
[Botão primário "+ Criar Anúncio" e atalho para SimLab IA]
```

---

## P-060 · Criar Anúncio Patrocinado

**Rota:** `/workspace/marketing/anuncios/novo` (`workspace.marketing.anuncios.novo.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Workspace Shell | **Padrão:** form_with_preview | **Ator:** Lojista, Produtor

### Anatomia Desktop

```
[Grid 7/5:]
- Esquerda: Formulário de Anúncio (Título, Formato, Localização/Raio km, Orçamento Diário/Total).
- Direita: Card de Estimativa de Impacto com IA (Alcance Diário Estimado de Pessoas e Cliques Previstos).
```

---

---

## P-061 · Termos Gerais de Uso da Plataforma

**Rota:** `/_store/termos` (`_store.termos.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Public Store Shell | **Padrão:** legal_document_viewer | **Ator:** Todos

### Anatomia Desktop
```
[Header com breadcrumb "Voltar ao Início" e Badge de Versão v2.0 + Atualização]
[Sumário executivo do documento legal]
[Links rápidos de políticas relacionadas]
[Conteúdo canônico em Markdown renderizado com tipografia refinada]
[Selo forense de imutabilidade com hash SHA-256 verificado]
```

---

## P-062 · Política de Privacidade & Proteção de Dados (LGPD)

**Rota:** `/_store/privacidade` (`_store.privacidade.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Public Store Shell | **Padrão:** legal_document_viewer | **Ator:** Todos

### Anatomia Desktop
```
[Documento canônico LGPD em Markdown com direitos do titular Art. 18]
[Detalhamento de finalidades de tratamento, bases legais e cookies]
```

---

## P-063 · Políticas Específicas Dinâmicas (/politicas/:slug)

**Rota:** `/_store/politicas/$slug` (`_store.politicas.$slug.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Public Store Shell | **Padrão:** legal_document_viewer | **Ator:** Todos

### Slugs Ativos:
- `cookies`: Política de Cookies e Gestão de Consentimento Digital.
- `isencao`: Termo de Isenção da Plataforma e Diretrizes P2P / Classificados.
- `lojistas`: Termos de Adesão e Responsabilidades de Lojistas.

---

## P-064 · Trocas, Devoluções e Cancelamentos

**Rota:** `/_store/trocas-e-devolucoes` (`_store.trocas-e-devolucoes.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Public Store Shell | **Padrão:** legal_document_viewer | **Ator:** Todos

---

## P-065 · Admin Master — Termos, LGPD & Trilha Forense de Aceites

**Rota:** `/admin-master/termos` (`admin-master.termos.tsx`) | **Status:** `✅ IMPLEMENTADO`
**Shell:** Admin Master Shell | **Padrão:** compliance_dashboard | **Ator:** Platform Admin (Master)

### Anatomia Desktop
```
[Header com métricas de compliance: Total de Aceites, Cookies, Termos e Usuários Logados]
[Abas:]
- Aba 1: Políticas da Plataforma (cards dos documentos com botão de edição rápida via Sheet lateral).
- Aba 2: Trilha Forense de Aceites (tabela com filtros por tipo, busca por IP/Hash e modal com Dossiê Forense).
```

---

# Resumo de GAPs — Rotas Projetadas & Status Canônico

| #       | Rota                                  | Módulo                 | Status               | Implementação                                          |
| ------- | ------------------------------------- | ---------------------- | -------------------- | ------------------------------------------------------ |
| GAP-001 | `/_store/conta/creditos`              | Carteira / Resgates    | `✅ IMPLEMENTADO`    | `_store.conta.creditos.tsx`                            |
| GAP-002 | `/workspace/orcamentos`               | Orçamentos (lista)     | `✅ IMPLEMENTADO`    | `workspace.orcamentos.index.tsx`                       |
| GAP-003 | `/workspace/orcamentos/$id`           | Orçamentos (detalhe)   | `✅ IMPLEMENTADO`    | `workspace.orcamentos.$id.tsx`                         |
| GAP-004 | `/workspace/pedidos/entregadores`     | Gestão de Entregadores | `✅ IMPLEMENTADO`    | `workspace.pedidos.entregadores.index.tsx`             |
| GAP-005 | `/workspace/pedidos/entregadores/$id` | Detalhe do Entregador  | `✅ IMPLEMENTADO`    | `workspace.pedidos.entregadores.$id.tsx`               |
| GAP-006 | `/workspace/financeiro/afiliados`     | Comissões de Parceiros | `✅ IMPLEMENTADO`    | `workspace.financeiro.afiliados.tsx`                   |
| GAP-007 | `/workspace/configuracoes/parceiros`  | Equipe & Parceiros     | `✅ IMPLEMENTADO`    | `workspace.configuracoes.parceiros.tsx`                |
| GAP-008 | `/workspace/configuracoes/parceiros`  | Config de Afiliados    | `✅ IMPLEMENTADO`    | `workspace.configuracoes.parceiros.tsx`                |
| GAP-009 | `/_store/criar-negocio`               | Onboarding por Nicho   | `✅ IMPLEMENTADO`    | `_store.criar-negocio.tsx` (6 etapas)                  |
| GAP-010 | `/workspace/clientes`                 | CRM Pipeline           | `✅ IMPLEMENTADO`    | `workspace.clientes.index.tsx`                         |
| GAP-011 | `/admin-master/usuarios`              | Admin Usuários         | `✅ IMPLEMENTADO`    | `admin-master.usuarios.tsx`                            |
| GAP-012 | `/admin-master/denuncias` & `kyc`     | Admin Moderação        | `✅ IMPLEMENTADO`    | `admin-master.denuncias.tsx` & `admin-master.kyc.tsx`  |
| GAP-013 | `/_store/conta/negociacoes`           | Propostas & Reservas   | `✅ IMPLEMENTADO`    | `_store.conta.negociacoes.tsx`                         |
| GAP-014 | `/_store/conta/agendamentos`          | Agendamentos (cliente) | `✅ IMPLEMENTADO`    | `_store.conta.agendamentos.tsx`                        |
| GAP-015 | `/workspace/agenda/servicos` (Sheet)  | Editor de Serviço      | `✅ IMPLEMENTADO`    | `workspace.agenda.servicos.index.tsx` (Sheet integrado)|
| GAP-016 | `/workspace/pdv/comandas`             | Salão & Comanda Garçom | `✅ IMPLEMENTADO`    | `workspace.pdv.comandas.tsx` + `QuickWaiterOrderModal` |
| GAP-017 | `/workspace/pdv`                      | PDV com Suporte a Mesa | `✅ IMPLEMENTADO`    | `workspace.pdv.index.tsx` (params `mesa`, `orderId`)   |
| GAP-018 | `/workspace/catalogo/produtos`        | Importador de Cardápio | `✅ IMPLEMENTADO`    | `workspace.catalogo.produtos.index.tsx` + `ImportCatalogModal` |

---

## W-007 · Salão, Mesas, Comandas & Aplicativo Garçom

**Rota:** `/workspace/pdv/comandas` (`workspace.pdv.comandas.tsx`) | **Status:** `✅ IMPLEMENTADO`  
**Shell:** Workspace Shell | **Padrão:** salon_tables_manager | **Ator:** Garçom / Caixa / Gerente

### Anatomia Desktop & Mobile
```
[Header com Métricas em Tempo Real: Total Mesas, Ocupadas, Livres, Conta Solicitada e Faturamento Ativo]
[Grid de Mesas Dinâmico com Badges de Estado: Livre (Verde), Ocupada (Azul), Conta (Amarelo), Atraso (Vermelho)]
- Drawer Lateral da Mesa Selecionada:
  - Lista de itens consumidos com timestamps e valores
  - Botão "Lançar Itens na Mesa (Garçom / Salão)" -> Abre QuickWaiterOrderModal
  - Botão "Solicitar Fechamento / Conta" -> Altera status para awaiting_payment
  - Botão "Fechar Conta / Receber" -> Modal com divisão de conta (1x a 10x) e emissão de comprovante
  - Botão "Lançar Mais Itens no PDV" -> Redireciona para /workspace/pdv?mesa=XX
[Gerador de Displays de Mesa com QR Code para Autoatendimento dos Clientes]
```

---

## W-005 · Frente de Caixa (PDV) Pro com Suporte a Mesas e Salão

**Rota:** `/workspace/pdv` (`workspace.pdv.index.tsx`) | **Status:** `✅ IMPLEMENTADO`  
**Shell:** Fullscreen POS Shell | **Padrão:** pos_terminal | **Ator:** Operador de Caixa / Atendente

### Anatomia Desktop & Mobile
```
[Header com Busca F2, Seletor de Modo (Balcão, Mesa, Delivery) e Input de Identificador]
[Grid de Produtos com Grade de Preço e Seletor de Modificadores (ProductModifiersModal)]
[Carrinho Lateral:]
  - Badge Contextual: "Lançando para Mesa XX" (quando em modo Mesa)
  - Lista de itens com stepper de quantidade e modificadores
  - Botão Primário Contextual:
    - Se Mesa: "Enviar para a Cozinha (Mesa XX)" via addItemsToTableComanda
    - Se Balcão: "Cobrar [F4]" via processPOSSale
  - Suporte a múltiplos pagamentos divididos (SplitPayment: Dinheiro, PIX, Cartão)
  - Emissão de Cupom Não Fiscal 80mm com 1 clique
```

---

## W-011 · Catálogo de Produtos com Importador Inteligente (iFood / IA)

**Rota:** `/workspace/catalogo/produtos` (`workspace.catalogo.produtos.index.tsx`) | **Status:** `✅ IMPLEMENTADO`  
**Shell:** Workspace Shell | **Padrão:** catalog_management | **Ator:** Lojista / Gerente

### Anatomia Desktop & Mobile
```
[PageHeader com Ações: "Importar Cardápio (IA)", "Exportar JSON" e "Novo Produto"]
[Abas de Navegação: "Cardápio & Itens" vs "Grupos de Adicionais / Complementos"]
[Filtro por status (Ativos, Rascunhos, Arquivados) e Busca Instantânea]
[Tabela com Edição Rápida de Estoque Inline (EditableStockCell) e Menu de Ações Comerciais]
[ImportCatalogModal:]
  - Aba 1: Link do Cardápio (iFood, Anota AI, Goomer, site próprio)
  - Aba 2: Colar Texto Bruto ou PDF
  - Análise com IA (Gemini 1.5 Flash / Groq LLaMA 3.1) via importFullCatalogMenu
  - Prévia de categorias e itens detectados com contadores
  - Inserção em lote atômica via batchCreateCatalogMenu com isolamento multi-tenant
```

---

# Família 5 — Governança Master & Conselho Executivo (admin-master.*)

---

## M-001 · Metas Projetadas vs. Dados Reais & Valuation

**Rota:** `/admin-master/crescimento` (`admin-master.crescimento.tsx`) | **Status:** `✅ IMPLEMENTADO`  
**Shell:** Admin Master Shell | **Padrão:** executive-governance-dashboard | **Ator:** Fundador / Conselho / Platform Admin

### Anatomia Desktop & Mobile (1440px / 390px)
```
[Header Executivo: Título + Badges "Governança & M&A" e "Eixo Chapecó ↔ SMO" + Botão "+ Novo Lançamento Financeiro"]
[Tabs de Navegação 4 Abas: Metas vs Realidade | Escalas & M&A (500 a 5k) | Livro-Caixa Corporativo | Ativo Tecnológico]

- Aba 1: Metas vs Realidade
  - Seletor de Fase Alvo (Fase 1: 500 Lojas / 10k Clientes | Fase 2: 1.000 Lojas / 20k Clientes | Fase 3: 5.000 Lojas / 100k Clientes)
  - Grid de 4 Cards de KPI com Barras de Progresso Reais:
    - Lojas / Empresas Parceiras (Real vs Meta com % atingido e gap restante)
    - Clientes / Cidadãos Cadastrados (Real vs Meta com contagem do PostgreSQL)
    - Receita Direta / MRR (Real faturado vs MRR da fase)
    - GMV Acumulado Transacionado (Total do banco de dados e taxa de conversão)
  - Card Destaque de Valuation Dinâmico:
    - Custo do Ativo Tecnológico (R$ 4,12M) + Múltiplos de ARR vigentes
    - Cenário Conservador da Fase
    - M&A Estratégico (Zucchetti / Senior Sistemas)

- Aba 2: Escalas & M&A (500 a 5.000 Empresas)
  - Tabela DRE Comparativa Dinâmica:
    - Receita SaaS B2B (R$ 189/mês médio)
    - Take-rate de Transações (1,5% GMV)
    - Classificados, Destaques & Ads
    - Custos de Nuvem & Gateways
    - Margem Bruta de Software (>85%)
    - EBITDA Anualizado (42% a 50%)
    - Valuation Indicativo de Mercado

- Aba 3: Livro-Caixa Corporativo
  - 3 Cards de Resumo: Total Aportes/Investimentos, Total Gastos Operacionais, Fluxo de Caixa Líquido
  - Tabela Auditável de Lançamentos Financeiros com data, tipo (Aporte/Gasto), categoria, descrição e valor
  - Ação de estorno/exclusão com confirmação e recálculo instantâneo

- Aba 4: Ativo Tecnológico (Codebase Audit)
  - 4 Cards de Estatísticas ao Vivo: Linhas Totais (468.141), Rotas (341), Serviços BFF (217), Componentes (452)
  - Custo de Reposição COCOMO II (R$ 4.120.000,00 equivalente a 11 FTEs sênior por 20 meses)
  - Badges de Conformidade: Zero Erros de Build, RLS Deny-by-Default, Edge Serverless No-Lock-in
```

### Contratos BFF Associados
- `getExecutiveGrowthMetrics()` (`growth-targets.functions.ts`)
- `recordFinancialEntry()` (`growth-targets.functions.ts`)
- `deleteFinancialEntry()` (`growth-targets.functions.ts`)

### Invariantes de Governança
- Exclusivo para usuários autenticados com role `platform_admin` ou e-mails master autorizados.
- Zero dados mockados; se as tabelas auxiliares estiverem em inicialização, valores reais do PostgreSQL (`profiles`, `stores`, `orders`, `platform_invoices`) são computados diretamente.

---

## W-021 · PDV Touch de Balcão, Split Bill & Spooler Térmico ESC/POS

**Rota:** `/workspace/pdv` (`workspace.pdv.index.tsx`) | **Status:** `✅ IMPLEMENTADO`  
**Shell:** Workspace Shell | **Padrão:** touch-pos + split-bill | **Ator:** Operador de Caixa / Garçom / Lojista

### Anatomia Desktop & Touch Tablet
```
[Coluna Esquerda 7-8 cols: Catálogo Visual de Produtos e Categorias com Busca Instantânea]
- Grade de produtos com foto, nome, estoque e preço (touch friendly 44px+)
- Modificadores e adicionais dinâmicos por item

[Coluna Direita 4-5 cols: Comanda / Carrinho Ativo]
- Linhas de itens com incremento/decremento e remoção
- Subtotal, Desconto e Total a Pagar em destaque
- Botão Primário: "Cobrar / Finalizar Venda"

[Modal de Checkout — Divisão de Conta (Split Bill)]
- Barra de Divisão Rápida: [1x (Total)] [2x] [3x] [4x] [5x]
- Cálculo instantâneo da cota por pessoa em centavos (sem arredondamentos perdidos)
- Seleção de Forma de Pagamento por Cota: Dinheiro (com troco), PIX, Cartão de Débito, Cartão de Crédito, Carnê
- Lista discriminada de pagamentos efetuados com badge de pagador ("Pagador 1", "Pagador 2")
- Barra de Progresso do Valor Pago vs Restante

[Modal de Recibo e Spooler Térmico ESC/POS]
- Visualização do Cupom Não Fiscal Monospaçado
- Botões de Ação Direta:
  - "Imprimir Térmica 80mm" (48 colunas canônicas ESC/POS sem cabeçalhos de navegador)
  - "Imprimir Térmica 58mm" (32 colunas compactas)
  - "Enviar por WhatsApp"
```

### Contratos e Utilitários Associados
- `src/lib/thermal-printer.ts`:
  - `generateThermalReceiptText(data, width)`
  - `printThermalReceipt(data, paperWidth)`
  - `buildEscPosReceipt(params)` & `buildZplShippingLabel(params)`
  - `sendBytesToSerialPrinter(bytes)` (Web Serial API)

---

## W-022 · Recebíveis, Condicionais de Moda & Saúde de Caixa (Cofres Blindados & D+0)

**Rota:** `/workspace/financeiro/recebiveis` (`workspace.financeiro.recebiveis.tsx`) | **Status:** `✅ IMPLEMENTADO`  
**Shell:** Workspace Shell | **Padrão:** multi-tab-financial-center | **Ator:** Lojista / Gestor Financeiro

### Anatomia (3 Abas Estratégicas no Paradigma Clean)
```
[Header Dinâmico: Título contextualizado + Botões de Ação por Aba]
[Tabs Switcher 3 Abas: Carnês & Caderninho | Condicionais & Malas (Varejo) | Cofres & Saúde Caixa]

- Aba 1: Carnês & Caderninho
  - 4 Cards de KPI: Total a Receber, Inadimplência Geral, Recebido no Mês, Conciliações Pendentes
  - Filtros: Todos, A Vencer (7d), Em Atraso, Conciliação Pendente, Baixados
  - Cobrança em Lote: Seleção múltipla com envio de lembretes amigáveis via WhatsApp
  - Conciliação Inteligente: Análise de comprovante PIX enviado pelo cliente, isenção de juros e baixa espelhada

- Aba 2: Condicionais & Malas (Prova em Casa para Varejo de Moda e Óticas)
  - 4 Cards de KPI: Peças na Rua / Em Prova, Valor sob Confiança (R$), Taxa de Conversão (68.4%), Malas Vencendo/Atrasadas
  - Filtros: Todas, Em Prova, Vence Hoje, Em Atraso, Finalizadas
  - Lista de Malas Condicionais: Nome da cliente, telefone (link WhatsApp com mensagem de carinho), prazo de devolução
  - Modal de Saída em Condicional: Cadastro rápido com seleção de prazo (24h, 48h, 72h) e peças dinâmicas
  - Modal de Baixa / Retorno: Interface de conferência peça a peça ("🛍️ Comprou" / "↩️ Devolveu") com reintegração automática ao estoque

- Aba 3: Cofres & Saúde de Caixa (Waesy Care Finance)
  - Banner de Fôlego Financeiro (Financial Runway): Dias de tranquilidade operacional calculados com base no saldo blindado e despesas diárias
  - Cofre 1: Folha Salarial & Equipe (Meta mensal, saldo guardado, rendimento diário 102.5% CDI, retenção automática do PDV)
  - Cofre 2: Aluguel & Ponto Comercial (Meta, saldo guardado, rendimento diário 102.5% CDI, retenção automática)
  - Liquidação D+0 de Duplicatas de Fornecedores: Tabela de boletos e notas fiscais com agendamento no dia do vencimento sem taxa bancária (Taxa Zero)
  - Giro Solidário por Vendas (Waesy Capital): Crédito com juros amigos (0.89% a.m.) sem boletos sufocantes, amortizado diariamente pela maquininha/PDV
```

### Contratos BFF Associados
- `src/services/cash-safes.functions.ts`:
  - `getStoreCashSafesSummary()`
  - `depositToCashSafe({ safeType, amountCents, description })`
  - `configureCashSafeRetention({ safeType, retentionPercent })`
  - `listSupplierInvoicesForD0()`
  - `scheduleSupplierInvoiceD0({ invoiceId })`
  - `simulateWorkingCapital({ requestedAmountCents, dailyRetentionPercent })`
- `src/services/receivables.functions.ts`:
  - `listStoreCarnes()`, `getCarnesReportSummary()`, `approveInstallmentPayment()`, `createStoreCarne()`, etc.

---

## W-023 · Hub de Marketplaces, Mapeamento de SKUs, Estoque Ativo & Webhooks Transacionais

**Rota:** `/workspace/integracoes/marketplaces` (`workspace.integracoes.marketplaces.tsx`) | **Status:** `✅ IMPLEMENTADO`  
**Shell:** Workspace Shell | **Padrão:** multi-tab-marketplace-hub | **Ator:** Lojista / Gestor de Operações / E-commerce Manager

### Anatomia (3 Abas Operacionais no Paradigma Clean & Apple HIG)
```
[Header Dinâmico: Título "Hub de Marketplaces & Integrações" + Botões: "Testar Pedido Simulado" + Módulo Fiscal + Expedição WMS]
[Cards de KPI: Canais Ativos/Conectados | Vendas em Marketplaces (R$) | Taxas de Intermediação (R$) | Repasse Líquido D+0 (R$)]

- Aba 1: Canais & Conectores
  - Filtros de Categoria: Todos | Marketplaces E-Commerce | Delivery & Food | Frete & Logística
  - Grid de 12 Provedores Oficiais (Mercado Livre, iFood, Shopee, Amazon, Magalu, Melhor Envio, Correios, Loggi, Jadlog, Rappi, Amo Delivery, Google Business)
  - Card por Canal: Nome, Logo com gradiente, Badge de Status (Conectado / Desconectado), Apelido da Conta, Timestamp de Última Sync
  - Botão Webhook URL: Abre modal com a URL POST canônica exclusiva da loja com botão de copiar em 1 clique
  - Botão Sincronizar: Dispara atualização manual e registra em marketplace_sync_logs
  - Botão Ajustes / Conectar: Modal de credenciais (Token de API, ID da Conta, Auto-Accept para KDS, Sincronização de Estoque)
  - Botão Desconectar: Desconecta o conector com 1 clique (status idle/disconnected)

- Aba 2: Mapeamento de SKUs & Anúncios (Catálogo Integrado)
  - Tabela com todos os produtos da loja: Título, SKU Interno, Preço Base, Estoque Atual (Badge colorido)
  - Canais Mapeados: Tags com identificador do anúncio externo (ex: mercadolivre: #MLB998822, shopee: #492021)
  - Ação "Sync Estoque": Atualiza em lote nos marketplaces conectados com 1 clique
  - Ação "Vincular Canal": Modal para vincular anúncio externo (Listing ID, SKU no canal, Margem de Preço adicional em %)

- Aba 3: Auditoria de Webhooks & Sincronização
  - Tabela 1 (Inbox Transacional de Webhooks): Data/Hora, Plataforma, ID do Evento, Tópico/Recurso, Status (Processado, Falha, Recebido), Botão "Reprocessar"
  - Tabela 2 (Histórico de Despacho e Sincronização): Data/Hora, Plataforma, Tipo de Sync, Direção, Itens Atualizados, Duração (ms), Status
  - Modal "Testar Pedido Simulado": Permite criar uma venda real no banco (Mercado Livre, iFood, Shopee, Amazon) para validação E2E no KDS e na Expedição WMS
```

### Contratos BFF & Server Functions Associados
- `src/services/marketplace-hub.functions.ts`:
  - `listMarketplaceConnectors()`
  - `saveMarketplaceConnector(payload)`
  - `disconnectMarketplaceConnector({ platform })`
  - `triggerSyncConnector({ platform, syncType })`
  - `getMarketplaceFinancialSummary()`
  - `syncProductStockToMarketplaces({ productId, newStockQty })`
  - `mapProductToMarketplace({ productId, platform, externalListingId, externalSku, priceMarginPercent })`
  - `listProductMarketplaceMappings()`
  - `listMarketplaceSyncLogs({ limit })`
  - `syncGoogleBusinessProfile()`
- `src/services/marketplace-webhooks.functions.ts`:
  - `handleInboundWebhook(data)` (Transactional Inbox idempotente)
  - `syncOrderToMaster(input)` (Espelhamento atômico em `orders`, `order_items`, `stock_movements` e `cash_registers`)
  - `listStoreWebhookEvents({ platform, status, limit })`
  - `reprocessWebhookEvent({ eventId })`
  - `simulateMarketplaceOrder({ platform, customerName, productTitle, totalAmountCents })`




