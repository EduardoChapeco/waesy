---
description: Regras estritas de Física Mobile, Anti-Jank, Viewports e Padrão WhatsApp List para o Waesy
globs: ["src/routes/**", "src/components/**"]
---

# 01 — Física Mobile, Ergonomia Anti-Jank & Padrão WhatsApp List (Waesy Standard)

> **Regra de Ouro:** A experiência móvel deve ter fluidez nativa (iOS/Android), sem pulos de layout (CLS), sem quebra de botões, sem zoom forçado do Safari e com respeito milimétrico à Zona do Polegar (Thumb Zone). Proibido o uso de classes com colchetes arbitrários.

---

## 1. Unidades de Viewport, Teclado Virtual & Safe Areas
- **100dvh Obrigatório:** Use SEMPRE `min-h-screen-dvh` ou `h-screen-dvh` (Dynamic Viewport Height). É TERMINANTEMENTE PROIBIDO usar `100vh` em contêineres de tela cheia, pois a barra de endereço retrátil do iOS Safari e Android Chrome corta botões no rodapé.
- **Prevenção do iOS Safari Auto-Zoom (16px Mandate):**
  * Todo `<input>` e `<textarea>` no mobile DEVE ter `text-base` (16px) como tamanho de fonte base (`text-base sm:text-sm`).
  * Qualquer `font-size < 16px` em inputs faz o iOS Safari dar zoom in forçado na tela, quebrando a viewport e forçando o usuário a fazer "pinch-to-zoom" para restaurar a tela.
- **Safe Area Insets:**
  * Topos fixos: `pt-safe` ou `safe-area-top`
  * Modais e Drawers de ação: `pt-safe-modal` ou `safe-top`
  * Botões de fechar no topo: `top-safe-notch` ou `top-safe`
  * Rodapés e MobileNav: `pb-safe` ou `safe-area-bottom`

## 2. Touch Targets & Ergonomia (Apple HIG)
- **Alvo Mínimo Primário:** 44x44px (`h-11` ou `size-11` ou `touch-target`) para botões de conversão e ações centrais.
- **Alvo Mínimo Secundário:** No mínimo 36x36px (`size-9` ou `h-9`) para botões de ícone secundários, com padding invisível para garantir toque confortável.
- **Botão de Voltar Canônico:** O botão de retorno deve ser APENAS o ícone `<` (componente `<NativeBackButton />`), sem rótulos prolixos como "Voltar" ou "Voltar para trás".

## 3. Padrão "WhatsApp List" (Edge-to-Edge Settings & Feed)
- **Proibição de Cards Espremidos:** Em listagens verticais de itens (Configurações, Conta, Pedidos, Conversas, Notificações), é PROIBIDO usar cartões com margens laterais que estrangulem a tela em smartphones (360px-390px).
- **Especificação Matemática do WhatsApp List:**
  * Contêiner: `w-full bg-card divide-y divide-border/40 border-y border-border/40 sm:rounded-2xl sm:border`
  * Linha de Item: `flex items-center justify-between px-4 py-3.5 min-h-14 hover:bg-muted/30 transition-colors`
  * Ícone Inicial: `size-5 text-muted-foreground shrink-0 mr-3`
  * Indicador de Navegação: `ChevronRight` (`size-4 text-muted-foreground/60 shrink-0 ml-2`)

## 4. Proibição de Flex-Wrap Descontrolado
- **Anti-Stacking:** É PROIBIDO usar `flex-wrap` solto que empurre botões secundários para uma segunda linha quebrada em telas pequenas.
- **Padrões Aprovados:**
  * Duas ações: `grid grid-cols-2 gap-2`
  * Três ou mais filtros: trilho horizontal com rolagem e snap: `flex overflow-x-auto snap-x no-scrollbar gap-2`
  * Ações secundárias: agrupar em Bottom Sheet (`FilterBottomSheet`) acionado por ícone único.

## 5. Margem Canônica de 1px (Zero-Dead-Space)
- O contêiner móvel `<main>` no shell possui distância canônica de exatamente **1px** da borda da tela (`px-mobile-edge`).
- As páginas filhas são PROIBIDAS de empilhar margens duplas (`px-4`, `px-6`). Use `px-0 sm:px-4 md:px-0` para estender os cards de ponta a ponta sem estrangular a largura útil.
