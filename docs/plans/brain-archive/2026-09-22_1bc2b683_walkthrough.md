# Walkthrough — Auditoria & Refatoração Completa do Design System e Vitrines (Waesy)

Este documento consolida todas as intervenções de engenharia e melhorias de UI/UX realizadas em resposta à auditoria geral, recursiva e minuciosa do Design System, responsividade mobile-first e conformidade com as regras de BigTech da Waesy.

---

## 📱 1. Responsividade e Mobile-First da `/home` (`/` e Landing Page)

### O Problema Identificado
- No componente [`founder-smartphone-mockup.tsx`](file:///c:/Users/Eduardo%20Antônio%20Ramo/Documents/waesy/src/components/landing/founder-smartphone-mockup.tsx), havia uma moldura de iPhone com notch, status bar simulada e bordas pretas de 12px que, em telas móveis (`< 640px`), criava um efeito anti-ergonômico de "um celular dentro da tela do próprio celular do usuário", estrangulando o conteúdo útil e quebrando o layout.
- Em [`launch-home-view.tsx`](file:///c:/Users/Eduardo%20Antônio%20Ramo/Documents/waesy/src/components/landing/launch-home-view.tsx), havia paddings excessivos (`px-4`, `p-8` a `p-12`) e tipografia fixa que provocavam transbordamento e rolagem horizontal indesejada no mobile.

### O Que Foi Implementado
- **Mockup Adaptativo e Fluido:**
  - Em telas móveis (`< sm:`), o mockup agora se comporta como um container de aplicativo nativo e limpo (`rounded-2xl border border-border/50 bg-card`), sem borda externa espessa nem bezel.
  - A barra de status de bateria/Wi-Fi e o notch/câmera só aparecem em desktops/tablets (`hidden sm:flex`), eliminando a simulação redundante em celulares reais.
  - Ajustada a altura para ocupar de forma confortável a tela móvel (`min-h-[500px] h-[580px] sm:h-[640px]`).
- **Hero & Seções do Circuito:**
  - Tipografia de display ajustada para escala fluida `text-2xl sm:text-5xl font-black`.
  - Margens laterais refinadas para `px-3 sm:px-4` e containers do circuito com `p-4 sm:p-10`.

---

## 🏷️ 2. Vitrines: Classificados & Resolução do Bug de Anúncios Invisíveis

### O Problema Identificado
- O usuário relatou que vários anúncios cadastrados não estavam aparecendo na vitrine pública dos Classificados (`/classificados`).
- **Auditoria de Banco & Causa Raiz:** A consulta via Supabase MCP identificou que existem 5 anúncios ativos na tabela `classifieds` (view `classified_ads`), dos quais 3 pertencem à categoria `travel` (pacotes de viagem).
- No componente [`_store.classificados.index.tsx`](file:///c:/Users/Eduardo%20Antônio%20Ramo/Documents/waesy/src/routes/_store.classificados.index.tsx), o modo `feed` filtrava estaticamente apenas 6 categorias (`vehicles`, `properties`, `jobs`, `services`, `electronics`, `fashion`), **omitindo completamente `travel`, `food` e `digital`**. Consequentemente, a maior parte dos anúncios cadastrados ficava invisível para o usuário!

### O Que Foi Implementado
- **Inclusão e Normalização de Categorias:**
  - Adicionadas as seções canônicas de `travel` (Viagens & Turismo), `food` (Gastronomia) e `digital` (Infoprodutos & Serviços Digitais) ao array de carrosséis do modo `feed`.
  - Implementada normalização resiliente de categorias: mapeia apelidos (`viagem`, `tourism`, `turismo` -> `travel`; `gastronomia`, `restaurante` -> `food`).
- **Respeito Estrito aos Modos de Visualização:**
  - **Modo Feed:** Trilhos horizontais com snap scroll lateral por departamento (`HorizontalRail`).
  - **Modo Grade:** Grid denso de cartões 2 colunas no mobile e até 4 colunas no desktop (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4`).
  - **Modo Lista:** Linhas expandidas verticais de largura total (`w-full flex flex-col gap-3`).
- **Botão de Alternância do Feed:** Adicionado o botão do modo `feed` (ícone `Rows` da Phosphor Icons) na barra de visualização da página de classificados, permitindo ao usuário alternar livremente entre Feed, Grade e Lista.

---

## 🛒 3. Vitrines: Mercado & Diferenciação dos Modos de Exibição

### O Problema Identificado
- Em [`_store.mercado.tsx`](file:///c:/Users/Eduardo%20Antônio%20Ramo/Documents/waesy/src/routes/_store.mercado.tsx), o modo `feed` renderizava um grid quase idêntico ao modo `grid`, sem proporcionar a experiência de corredor de supermercado com rolagem horizontal por departamento.

### O Que Foi Implementado
- No modo `feed`, os produtos agora são agrupados dinamicamente por departamento/corredor (`department || category || "Destaques do Mercado"`).
- Cada corredor é renderizado como um carrossel horizontal contínuo (`HorizontalRail`), permitindo navegar rapidamente entre hortifrúti, bebidas, mercearia, carnes e laticínios sem rolar páginas infinitas para baixo.
- Os modos `grid` e `list` mantêm a densidade ideal para quem busca preço ou comparação rápida.

---

## 🥩 4. Universalização dos 3 Modos em Todas as 10 Lojas Verticais de Comércio

### O Problema Identificado
- Em **todas as 10 lojas verticais** de conveniência e varejo ([`farmacia`](file:///c:/Users/Eduardo%20Antônio%20Ramo/Documents/waesy/src/routes/_store.farmacia.tsx), [`acougue`](file:///c:/Users/Eduardo%20Antônio%20Ramo/Documents/waesy/src/routes/_store.acougue.tsx), [`bebidas`](file:///c:/Users/Eduardo%20Antônio%20Ramo/Documents/waesy/src/routes/_store.bebidas.tsx), [`casa`](file:///c:/Users/Eduardo%20Antônio%20Ramo/Documents/waesy/src/routes/_store.casa.tsx), [`construcao`](file:///c:/Users/Eduardo%20Antônio%20Ramo/Documents/waesy/src/routes/_store.construcao.tsx), [`eletronicos`](file:///c:/Users/Eduardo%20Antônio%20Ramo/Documents/waesy/src/routes/_store.eletronicos.tsx), [`limpeza`](file:///c:/Users/Eduardo%20Antônio%20Ramo/Documents/waesy/src/routes/_store.limpeza.tsx), [`pet`](file:///c:/Users/Eduardo%20Antônio%20Ramo/Documents/waesy/src/routes/_store.pet.tsx), [`livros`](file:///c:/Users/Eduardo%20Antônio%20Ramo/Documents/waesy/src/routes/_store.livros.tsx) e [`beleza`](file:///c:/Users/Eduardo%20Antônio%20Ramo/Documents/waesy/src/routes/_store.beleza.tsx)), o modo `feed` exibia um texto estático e morto: `"Nenhuma seção ativa no momento."` quando o CMS modular não possuía seções predefinidas pela moderação, deixando a tela vazia mesmo havendo produtos cadastrados no catálogo.

### O Que Foi Implementado
- **Agrupamento Automático por Departamento/Loja:**
  - Seções modulares do CMS são renderizadas caso existam.
  - Caso contrário (ou em conjunto), os produtos do catálogo são agrupados dinamicamente e renderizados em trilhos horizontais com snap-scroll lateral (`HorizontalRail`).
  - Cada trilho possui cabeçalho limpo com ação direta "Ver grade", integrando com fluidez à navegação.
- **Diferenciação Estrita de Modos:**
  - **Feed:** Carrosséis horizontais com navegação por departamento.
  - **Grid:** Grade responsiva de 2 a 4 colunas.
  - **List:** Linhas horizontais compactas para comparação e escaneamento rápido.

---

## 🍽️ 5. Vitrines: Gastronomia (`_store.gastronomia.tsx`)

### O Que Foi Implementado
- **Modo Feed com Trilhos Horizontais:** Os pratos agora são agrupados dinamicamente por tipo de culinária e especialidade (`Pizzas`, `Burgers`, `Sobremesas`, `Bebidas`, etc.) em carrosséis horizontais contínuos (`HorizontalRail`), em vez de apenas duplicar a grade vertical.
- **Correção Crítica do Cálculo Monetário:** Eliminada a divisão dupla por 100 na sacola (`formatMoney(cartTotalCents)`). R$ 50,00 era exibido como R$ 0,50.

---

## 🛠️ 6. Vitrines: Serviços & Profissionais (`_store.servicos.tsx`)

### O Que Foi Implementado
- Conectado o componente canônico `DiscoveryControlBar` aos 3 modos de visualização (`feed`, `grid`, `list`).
- **Modo Feed:** Agrupa prestadores de serviços por categoria e especialidade com trilhos horizontais (`HorizontalRail`).
- **Modo Lista:** Linhas corporativas completas com logotipo, especialidade, cidade e botão direto "Pedir Orçamento".
- **Modo Grade:** Cards em grade moderna de 4 colunas.
- **Higiene Visual:** Badges de "Verificado" migrados do verde fixo `bg-emerald-500` para tokens semânticos (`bg-primary/10 text-primary border-primary/20`).

---

## ✈️ 7. Vitrines: Turismo & Viagens (`_store.turismo.index.tsx`)

### O Que Foi Implementado
- Unificados os controles de visualização diretamente no `DiscoveryControlBar` (`viewMode`), integrando os modos `feed` (trilhos de pacotes), `grid` (cartões) e `list` (compacto).
- Eliminada a barra de botões duplicada que competia com os filtros da página.
- Mantido o filtro horizontal de aeroportos regionais de saída (`Saída:`) limpo e fluído.

---

## 🏠 8. Vitrines: Imóveis (`_store.imoveis.tsx`)

### O Que Foi Implementado
- **Carregamento Real do Banco de Dados:** O loader agora consulta anúncios reais da categoria `real_estate` via `getPublicClassifieds({ data: { category: "real_estate" } })`.
- **Ativação dos 3 Modos Canônicos:**
  - **Feed:** Trilhos horizontais agrupados por modalidade ("Imóveis para Locação", "Imóveis à Venda", "Temporada").
  - **Grade:** Cards imobiliários com foto de capa, badge da modalidade, preço em BRL (`/mês`, `/diária`, `à vista`) e localização.
  - **Lista:** Linhas compactas com preview horizontal de imagem e dados essenciais.

---

## 🏢 9. Perfis Comerciais de Loja (`canonical-store-profile-view.tsx`)

### Diretriz Estrita Respeitada
- Mantida integralmente a estrutura canônica aprovada: **Foto 1:1 ao lado da capa 21:9 com scroll interno e estatísticas reais abaixo**.

### O Que Foi Limpo e Otimizado
- **Higienização da Bio:** Removido o botão/modal solto "Ver Horários" que quebrava o alinhamento da bio no mobile. Toda a informação de atendimento já possui sua aba exclusiva e rica: **"Sobre & Atendimento"**.
- **Botões de Ação Padronizados:** Botões de WhatsApp, Pedir Orçamento e Compartilhar ajustados para escala compacta `h-8 px-3 rounded-xl text-xs font-semibold` em linha única com proteção anti-quebra.
- **Toolbar do Proprietário (`isOwner`):** Aplicado `overflow-x-auto no-scrollbar flex-nowrap py-0.5` com `shrink-0` nos botões administrativos, evitando quebras de linha desalinhadas no smartphone.

---

## 👤 10. Perfis de Membro (`_store.membro.$id.tsx`)

### O Que Foi Implementado
- **Ações em Linha com Rolagem Horizontal:** Botões de "Seguir", "Mensagem WhatsApp" e "Compartilhar" ajustados para a escala `h-8 px-3 rounded-xl text-xs font-semibold shrink-0`.
- Para o proprietário do perfil, os botões "Painel de Insights", "Disponibilidade" e "Editar Perfil" agora deslizam horizontalmente no mobile (`overflow-x-auto no-scrollbar max-w-full sm:flex-wrap`), garantindo que nenhuma ação quebre linhas.
- Biolinks compactados para `h-8 px-3 rounded-xl text-xs font-semibold shrink-0` com rolagem suave no mobile.

---

## 🏪 11. Desacoplamento da TopBar no Mobile (Regra 16 do AGENTS.md)

### O Que Foi Implementado
- Adicionadas as 6 rotas comerciais (`/mercado`, `/casa`, `/acougue`, `/bebidas`, `/construcao` e `/beleza`) ao `isCleanMobileAppPage` em [`app-shell.tsx`](file:///c:/Users/Eduardo%20Antônio%20Ramo/Documents/waesy/src/components/shell/app-shell.tsx).
- No smartphone, essas páginas agora aproveitam 100% da área útil da tela sem cabeçalhos duplicados, centralizando a navegação no dock inferior (`MobileNav`).

---

## 📐 12. Padrão 1px Mobile & Eliminação de Margens Cumulativas (Regra 15)

### O Que Foi Implementado
- Aplicado o padrão canônico `w-full px-0 sm:px-4 md:px-0` nos containers das seguintes rotas:
  - [`_store.noticias.index.tsx`](file:///c:/Users/Eduardo%20Antônio%20Ramo/Documents/waesy/src/routes/_store.noticias.index.tsx)
  - [`_store.empregos.index.tsx`](file:///c:/Users/Eduardo%20Antônio%20Ramo/Documents/waesy/src/routes/_store.empregos.index.tsx)
  - [`_store.imoveis.tsx`](file:///c:/Users/Eduardo%20Antônio%20Ramo/Documents/waesy/src/routes/_store.imoveis.tsx)
  - [`_store.gastronomia.tsx`](file:///c:/Users/Eduardo%20Antônio%20Ramo/Documents/waesy/src/routes/_store.gastronomia.tsx)
  - [`_store.feed.tsx`](file:///c:/Users/Eduardo%20Antônio%20Ramo/Documents/waesy/src/routes/_store.feed.tsx)
  - [`_store.diretorio.index.tsx`](file:///c:/Users/Eduardo%20Antônio%20Ramo/Documents/waesy/src/routes/_store.diretorio.index.tsx)

---

## 🔗 13. Auditoria Forense de Links & Rotas

- Executado scanner automatizado sobre **124 links internos** mapeados contra as 361 rotas do TanStack Router em `src/routes/`.
- **Resultado:** **0 links quebrados** detectados.

---

## 🚀 14. Compilação de Produção & Cloudflare Pages Worker

- Executado o build de produção via `cmd /c npm run build`:
  - **Exit code 0**
  - Geração completa do bundle cliente (`dist/assets/`), SSR (`_worker.js/_ssr/`) e worker único Cloudflare Pages (`dist/_worker.js`).
  - Geração do manifesto de rotas do Cloudflare (`dist/_routes.json`).
