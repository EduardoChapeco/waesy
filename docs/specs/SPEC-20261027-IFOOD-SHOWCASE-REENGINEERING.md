# SPEC-20261027-IFOOD-SHOWCASE-REENGINEERING: Reengenharia Canônica e Paridade Estrita de Vitrines Comerciais iFood

## 1. Contexto e Objetivo
Implementar a paridade estrutural, visual e dinâmica completa das 4 referências do aplicativo iFood nas vitrines comerciais do ecossistema Waesy (`_store.index`, `_store.gastronomia`, `_store.mercado`, `_store.farmacia`, `_store.bebidas`, `_store.acougue`, `_store.pet` e `_store.categoria.$slug`), preservando intactos os módulos de empregos, eventos e turismo.
Todos os elementos, seções, carrosséis, botões e galerias devem ser integrados ao Design System, com suporte a upload de mídia responsivo (desktop 16:9 / mobile squircle), controle de visibilidade/posição de texto, segmentação por cidade, gerenciamento via CMS Admin Master e disponibilidade de templates/blocos no Omni Builder.

## 2. Requisitos EARS (Easy Approach to Requirements Syntax)

### UBÍQUOS (Sempre Ativos)
- [EARS-UB-01] O sistema DEVE fornecer componentes no Design System com conformidade WCAG 2.2 AA, piso tátil $\ge 44$px (`h-11 min-h-11`), anéis `:focus-visible:ring-2` e zero classes com colchetes arbitrários.
- [EARS-UB-02] O sistema DEVE suportar imagens diferenciadas por viewport (desktop vs. mobile) com aspect ratio fixo antes da hidratação, garantindo Cumulative Layout Shift nulo (CLS < 0.05).
- [EARS-UB-03] Todo bloco, seção e trilho comercial DEVE ser bilateralmente configurável via Admin Master CMS (`admin-home-cms.functions.ts` / `surface-cms.functions.ts`), com suporte a filtro de cidade (`city_filter`) e fallback global quando a cidade não possuir campanha ativa.

### CONTROLADOS POR EVENTO
- [EARS-EV-01] Quando o usuário tocar no botão hamburguer no topo esquerdo do cabeçalho iFood (`IFoodHeader`), o sistema DEVE abrir o `SuperAppModuleDrawer` sem recarregar a rota.
- [EARS-EV-02] Quando o operador no Admin CMS ou lojista no Omni Builder configurar um botão de categoria (`IFoodCategoryButton`), o sistema DEVE permitir definir a visibilidade do texto (`show_text: boolean`) e sua posição (`text_position: "below" | "right" | "none"`).
- [EARS-EV-03] Quando o usuário adicionar itens à sacola em qualquer vitrine comercial, o sistema DEVE renderizar a barra flutuante inferior fixa (`IFoodFloatingCartBar`) em `z-30`, exibindo avatar da loja, valor total, detalhamento de taxa/economia e botão de ação primário proeminente ("Ver carrinho" / "Ver sacola") com contador de itens.

### BASEADOS EM ESTADO
- [EARS-ST-01] Enquanto a vitrine ativa for uma subcategoria comercial (Gastronomia, Mercado, Farmácia, Bebidas, etc.), o sistema DEVE renderizar o dock horizontal compacto (`MultiVitrineDock`) no topo para permitir navegação lateral imediata entre as outras vitrines comerciais.
- [EARS-ST-02] Enquanto existirem campanhas ativas no CMS com layout `feature_mini_banners`, o sistema DEVE renderizar o carrossel de Mini-Banners verticais coloridos (`IFoodFeatureMiniBannersRail`) com gradiente de fundo, imagem recortada em alta fidelidade e botão de pílula contextual ("Clube >", "Gourmet >", "Cupom >").
- [EARS-ST-03] Enquanto existirem compras ou buscas recentes do usuário, o sistema DEVE renderizar o trilho `IFoodRecentStoresRail` ("Últimas lojas") com cartões squircle contendo logo redondo e badges destacados de benefício ("R$ 5 off", "Grátis").

### OPCIONAIS
- [EARS-OP-01] Onde um lojista ou criador estiver customizando sua vitrine privada (`_store.loja.$slug`) ou construindo um site no Omni Builder, o sistema DEVE permitir a inserção e reordenação dos blocos canônicos iFood (`ifood_feature_cards_rail`, `ifood_recent_stores_shelf`, `ifood_category_grid_custom`).

## 3. Invariantes do Sistema
1. **Preservação de Módulos Verticais:** As rotas `_store.empregos.*`, `_store.eventos.*` e `_store.turismo.*` não devem sofrer alteração estrutural ou de layout.
2. **Preservação de Legado:** Blocos e componentes legados existentes não devem ser deletados do repositório; devem ser preservados como fallbacks ou desativados nas vitrines ativas.
3. **Piso de Acessibilidade & HIG:** Alvos de toque com altura mínima de 44px (`h-11`), safe-area defensiva para iPhone/Android e z-index deconflitado (`z-30` para barra flutuante, `z-50` para sheets/modais).

## 4. Matriz de Arquivos do Escopo
| Arquivo | Ação | Responsabilidade |
| :--- | :--- | :--- |
| `src/components/commerce/ifood/IFoodHeader.tsx` | Criar | Cabeçalho canônico iFood: hambúrguer sem fundo, endereço, clube, sino |
| `src/components/commerce/ifood/MultiVitrineDock.tsx` | Criar | Dock superior compacto de alternância rápida entre nichos comerciais |
| `src/components/commerce/ifood/IFoodFeatureMiniBannersRail.tsx` | Criar | Carrossel de Mini-Banners verticais ("No iFood também tem" / Cupons) |
| `src/components/commerce/ifood/IFoodRecentStoresRail.tsx` | Criar | Trilho "Últimas lojas / Últimas buscas" com badges verdes |
| `src/components/commerce/ifood/IFoodFilterChipsBar.tsx` | Criar | Barra de chips de filtros com scroll horizontal |
| `src/components/commerce/ifood/IFoodStoreFeedCard.tsx` | Criar | Card de restaurante/loja em formato lista e formato spotlight vertical |
| `src/components/commerce/ifood/IFoodFloatingCartBar.tsx` | Criar | Barra flutuante de sacola/carrinho com avatar, cálculo e CTA vermelho |
| `src/components/commerce/ifood/CommercialShowcaseTemplate.tsx` | Criar | Shell unificado parametrizável para todas as vitrines comerciais |
| `src/types/omni-builder.ts` | Modificar | Registro dos novos IDs de blocos iFood no Omni Builder |
| `src/lib/builder/omni-templates.ts` | Modificar | Adição de template pré-configurado de Delivery/Restaurante iFood |
| `src/services/admin-home-cms.functions.ts` | Modificar | Suporte a `text_position` nos itens e novas variantes de layout |
| `src/routes/_store.gastronomia.tsx` | Modificar | Adoção do `CommercialShowcaseTemplate` e subcategorias visuais |
| `src/routes/_store.mercado.tsx` | Modificar | Adoção do `CommercialShowcaseTemplate` e corredores de mercado |
| `src/routes/_store.farmacia.tsx` | Modificar | Adoção do `CommercialShowcaseTemplate` e categorias de farmácia |
| `src/routes/_store.bebidas.tsx` | Modificar | Adoção do `CommercialShowcaseTemplate` e adega/distribuidora |
| `src/routes/_store.acougue.tsx` | Modificar | Adoção do `CommercialShowcaseTemplate` e cortes de carnes |
| `src/routes/_store.pet.tsx` | Modificar | Adoção do `CommercialShowcaseTemplate` e categorias pet |
