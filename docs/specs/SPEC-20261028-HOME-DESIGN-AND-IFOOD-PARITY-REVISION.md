# SPEC-20261028-HOME-DESIGN-AND-IFOOD-PARITY-REVISION.md
## Revisão Integral da Home, Paridade Estrita iFood & Higiene Visual

- **Status:** Aprovado para Implementação
- **Data:** 2026-10-28
- **Contexto:** Solicitação de revisão completa do design da Home Mobile/Desktop baseada nas evidências e capturas do iFood, corrigindo o alinhamento da header ao frame mobile, menu horizontal sticky ao rolar a página, correção de tags/badges nos botões 5x2, botão de créditos/diamante sem fundo, banner de cupom em formato pill sem borda com verificação real de cupons, cards "No Waesy Também Tem" com minifaixa inferior canônica (upload de ícone/mídia) e seções dinâmicas inteligentes com omissão honesta (Regra B.33).

---

### 1. Requisitos em Sintaxe EARS

#### 1.1 Alinhamento da Header ao Frame Mobile (Edge-to-Edge)
- **Quando** o usuário visualiza a vitrine da Home (`/`) em viewport mobile (`<sm`), **o sistema deve** renderizar o container principal sem padding horizontal (`px-0`), garantindo que o cabeçalho `IFoodHeader` encoste nas extremidades da tela (`w-full`), mantendo o padding interno (`px-3 sm:px-4`) apenas no conteúdo rolável.

#### 1.2 Menu Horizontal Sticky ao Rolar a Página
- **Quando** o usuário faz rolagem vertical na Home e a grade 5x2 de categorias ultrapassa o topo visível, **o sistema deve** fixar a régua horizontal de categorias (`MultiVitrineDock`) imediatamente abaixo do cabeçalho canônico (`sticky top-[57px]`), permitindo navegação contínua entre verticais sem exigir retorno ao topo.

#### 1.3 Botões 5x2 com Badges Desobstruídos & Suporte Total a Mídia
- **Enquanto** os botões da grade 5x2 exibirem selos/badges (ex: "NOVO"), **o sistema deve** desacoplar o container de recorte do ícone do contêiner do badge, impedindo que o badge seja truncado ou cortado por classes `overflow-hidden`.
- **Se** o item possuir `imageUrl`, **o sistema deve** renderizar a ilustração gráfica em alta fidelidade com fallback para o ícone semântico.

#### 1.4 Botão de Créditos / Clube Transparente
- **O sistema deve** renderizar o botão de Clube / Créditos no cabeçalho com fundo 100% transparente (`bg-transparent hover:bg-muted/40 text-purple-600`), sem caixas de preenchimento pesadas (`bg-primary/10`), em exata paridade com a TopBar nativa do iFood.

#### 1.5 Banner de Cupom ("Você Ganhou...") em Pílula Sem Borda e Condicional Real
- **O sistema deve** renderizar o banner de cupom como uma pílula compacta (`rounded-full`, `border-0`, fundo lavanda suave `bg-purple-100/60 dark:bg-purple-950/40`), com ícone de megafone/cupom na esquerda, texto em linha única violeta e botão fechar (`X`) na direita.
- **Se** não existirem cupons reais cadastrados na loja/cidade nem campanha customizada ativa, **o sistema deve** omitir completamente o banner de cupom da interface (Regra B.33 / Zero Fake Data).

#### 1.6 Cards "No Waesy Também Tem" com Minifaixa Inferior & Upload de Ícone
- **O sistema deve** renderizar os cards da seção com formato vertical squircle e uma minifaixa translúcida no canto inferior (`bg-black/65 backdrop-blur-md rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 text-white`), contendo:
  1. Ícone ou mídia enviada pelo Admin Master (`icon_name` ou URL de imagem);
  2. Rótulo da ação em negrito (`text-xs font-bold`);
  3. Chevron de avanço `>`.
- **O sistema deve** permitir no Admin Master Home Editor a edição integral do card, incluindo upload de imagem principal, upload de ícone da minifaixa, ocultação de texto sobreposto (`show_text: false`) e ocultação de badges.

#### 1.7 Seções Randômicas e Dinâmicas Inteligentes
- **Se** uma seção for declarada como "Restaurantes com Cupom", **o sistema deve** filtrar estritamente estabelecimentos que possuam cupons ativos (`couponBadge`). Caso a coleção seja vazia, a seção é ocultada.
- **Se** uma seção for declarada para "Mercados & Conveniência" ou "Farmácias", **o sistema deve** isolar com rigor semântico os dados de cada vertical, impedindo contaminação cruzada.

---

### 2. Matriz de Arquivos Afetados

| Arquivo | Papel na Correção |
| :--- | :--- |
| `src/components/shell/app-shell.tsx` | Ajuste de `px-0` mobile para páginas nativas limpas (`isCleanMobileAppPage`), eliminando a margem do cabeçalho. |
| `src/components/commerce/ifood/IFoodHeader.tsx` | Botão diamante/créditos sem fundo (`bg-transparent text-purple-600`). |
| `src/components/home/PromoCouponBanner.tsx` | Redesenho no formato pílula sem borda (`rounded-full border-0`), suporte a ícone personalizado e link direto. |
| `src/components/commerce/ifood/IFoodFeatureMiniBannersRail.tsx` | Redesenho da minifaixa inferior com ícone/mídia, rótulo e chevron `>`; suporte a `showText` e `iconUrl`. |
| `src/components/home/HomeMobileNativeApp.tsx` | Inclusão do dock horizontal sticky no scroll, desobstrução de badges nos botões 5x2, lógica de cupons reais e seções inteligentes. |
| `src/components/home/HomeDesktopWebApp.tsx` | Paridade desktop para o banner de cupom condicional e cards de minifaixa atualizados. |
| `src/routes/admin-master.home-editor.tsx` | Suporte a upload/configuração de ícone da minifaixa, controle de exibição de textos e badges. |
