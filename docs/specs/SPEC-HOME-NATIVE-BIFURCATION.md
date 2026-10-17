# SPEC-HOME-NATIVE-BIFURCATION — Bifurcação Arquitetural Nativa Mobile vs. Web Desktop e Saneamento de Vitrines

## 1. Contexto e Objetivo
Resolver definitivamente as quebras de layout, empilhamento redundante de 6 menus de categorias, corte divergente de imagens de banners entre desktop e mobile, larguras fixas conflitantes (`sm:w-24` em grids), flash de sidebar no SSR mobile e barras de busca/cabeçalhos duplicados nas vitrines públicas (`/`, `/marketplace`, `/classificados`, `/diretorio`, `/empregos`, `/noticias`).

## 2. Requisitos Estruturados (Sintaxe EARS)
- **REQ-01 (Ubiquitous - Bifurcação Nativa):** O sistema DEVE renderizar a superfície inicial através de dois módulos arquiteturalmente independentes: `HomeMobileNativeApp` para viewports compactas (`< 768px`, `md:hidden`) e `HomeDesktopWebApp` para viewports expandidas (`>= 768px`, `hidden md:block`), compartilhando o mesmo estado de dados e filtros.
- **REQ-02 (State-Driven - Proporção Idêntica de Banners):** ENQUANTO um banner hero ou carrossel promocional estiver ativo, o sistema DEVE manter exatamente a mesma proporção de aspecto (`aspect-video` `16:9` por padrão, ou a configurada na seção CMS) tanto no Mobile quanto no Desktop, sem alterar o `aspect-ratio` por breakpoint para evitar cortes divergentes da mesma imagem.
- **REQ-03 (Event-Driven - Alinhamento de Categorias e Fim de Duplicação):** QUANDO a página inicial for carregada, o sistema DEVE exibir uma única barra de categorias rápida (dock horizontal nativo `NoorNativeCategoryDock` com sangria `-mx-4 px-4` ou grade compacta `grid-cols-4` no mobile), eliminando a duplicação simultânea de `CategoryBubbleCarousel` + `DiscoveryControlBar` com as mesmas 13 categorias.
- **REQ-04 (Ubiquitous - Botões Quadrados iFood 1:1):** O componente `IFoodSquareCategoryButton` DEVE ocupar `w-full` quando inserido em células de grade (`grid_2d`) e largura intrínseca (`w-20 shrink-0`) apenas quando inserido em trilhos horizontais (`NoorNativeCategoryDock`), sem impor `sm:w-24` fixo que quebre colunas desktop/tablet.
- **REQ-05 (Unwanted Behavior - BentoGrid Container):** SE uma seção `bento_grid` for renderizada, ENTÃO o container `grid` pai NÃO DEVE receber classe `aspect-banner-cinema` (`16:9`) que esmague os itens empilhados no mobile.
- **REQ-06 (Ubiquitous - Sangria de Trilhos Mobile e Remoção de HitsLeadCard Hardcoded):** Os trilhos horizontais (`HorizontalRail`) DEVEM sangrar até as bordas da tela no mobile (`-mx-4 px-4 sm:mx-0 sm:px-0`) e iniciar diretamente com os cards reais, sem blocos `HitsLeadCard` com gradientes decorativos hardcoded (conformidade B.8 e B.20).
- **REQ-07 (Ubiquitous - Sincronia SSR e Fim de Headers/Paddings Duplos nas Vitrines):** O `AppShell`, `ContextSidebar` e `MobileNav` DEVEM utilizar guardas CSS (`hidden md:flex` / `md:hidden`) alinhadas em `768px`, e as rotas `/marketplace`, `/classificados`, `/diretorio`, `/empregos` e `/noticias` NÃO DEVEM duplicar `px-4` interno nem exibir duas barras de busca simultâneas no mobile.

## 3. Entradas, Saídas e Invariantes
- **Entradas:** Payload do loader de `_store.index.tsx` (`homeCmsSections`, `editorialHotpages`, `listings`, `offers`, `classifieds`, `events`, `jobs`, `polls`, `socialPosts`).
- **Saídas:** Interfaces `HomeMobileNativeApp` e `HomeDesktopWebApp` sem CLS, sem overflow horizontal indesejado e com piso tátil `>= 44px` (`h-11`).
- **Invariantes Respeitadas:** B.4 (Gates DL-01 a DL-30), B.8 (Zero `!important`, zero hex literal, zero valores fora da grade de 4px), B.20 (CMS Bilateral), B.28 (Cards padronizados), B.32 (Layouts híbridos e anti-jank).

## 4. Evidências de Verificação Esperadas
- `npm run typecheck` com Exit Code 0.
- `node scripts/design-lint.mjs --ratchet` com Exit Code 0.
- `npx vitest run` nos testes de componentes e BFF da Home com 100% de aprovação.
- `npm run build` com Exit Code 0.
