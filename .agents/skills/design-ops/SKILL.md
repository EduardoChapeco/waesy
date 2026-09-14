---
name: design-ops
description: "Use when creating or modifying ANY UI components (React, Tailwind) for the Waesy project. Triggers: layout, typography, UI, Tailwind, components, styling, surface, button, design system, colors, clean, minimal."
---

# Design Ops Protocol (Waesy)

## Core Principles (Design Humano & Editorial)

**1. A 'Cara' do Projeto é ULTRA CLEAN e MINIMALISTA**
A Waesy adota um visual estritamente moderno, focado em silêncio visual, retenção e usabilidade fluida.

> **PROIBIDO:** Estilos "Neo-Brutalist", bordas grossas (border-2 ou border-4), sombras sólidas, backgrounds coloridos desnecessários, cantos quadrados duros (`rounded-none` ou `rounded-sm`).

**2. Proibição Total de Cores e Medidas Genéricas (HARDCODE ZERO)**
Você **NUNCA** deve usar `bg-red-500`, `text-blue-600`, `px-7`, `gap-5` ou afins.
Você deve **SEMPRE** utilizar as variáveis semânticas do Tailwind (ex: `bg-primary`, `text-muted-foreground`, `border-border`, `p-6`, `gap-6`). A fonte da verdade é o `docs/DESIGN.md`.

## Regras de Estilização Canônica

- **Tipografia**: O padrão é `Inter` (sans). Use as classes nativas limpas:
  - Textos de corpo: `text-sm text-foreground` ou `text-sm text-muted-foreground`.
  - Cabeçalhos: `text-lg font-semibold text-foreground` (nunca abuse de tamanhos gigantes).
  - Overlines: `text-xs uppercase tracking-wider font-medium text-muted-foreground`.

- **Superfícies e Formas (Radiuses)**:
  - Formas são arredondadas e amigáveis.
  - Cards padrão: `border border-border rounded-xl bg-background`.
  - Paineis ou Modais: `rounded-2xl`.
  - Inputs e botões pequenos: `rounded-md` ou `rounded-lg`.
  - Chips e status: `rounded-full` (pill).

- **Elevação (Sem Sombras)**:
  - O design é predominantemente "Flat". Separe blocos através de **bordas finas** (`border-border`) e espaços generosos (`gap-6`), não com box-shadow.
  - Sombras (`shadow-sm`) são reservadas _estritamente_ para modais, dropdowns flutuantes ou destaque muito sutil ao passar o mouse (`hover-elevate`).

## Brainstorming & Projection (Seja um UI/UX Designer Minimalista)

Antes de codar uma tela:

1. **Respiro (White Space)**: Você tem padding suficiente? `p-6` ou `p-8` é o ideal para containers.
2. **Contraste de Ação**: O botão principal é escuro/sólido (`bg-foreground text-background`). Todo o resto é outline ou ghost (`variant="ghost"`).
3. **Erradicação do Lixo Visual**: Remova divisórias desnecessárias. Remova textos redundantes. Menos é mais.

## Mobile First & Elastic Responsiveness (Apple HIG, iFood, Threads, Avec, Belasis)

- **Padronização Milimétrica de 1px da Borda no Mobile & Zero Dead Space**:
  - O container raiz `<main>` no shell mobile possui distância canônica de exatamente **1px** da borda da tela (`px-[1px]`).
  - Telas filhas (`_store.*` e `workspace.*`) nunca devem aplicar `px-4`, `px-6` ou `px-0.5` acumulados no mobile. Usem `px-0 sm:px-4 md:px-0`.
  - Proibição absoluta de "Grid dentro de Grid / Card dentro de Grid" com empilhamento de paddings que estrangulem a área útil da tela em smartphones.
  - Proibição de `max-w-xl mx-auto` em empty states móveis ou cartões: use `w-full` com padding interno contido (`p-4 sm:p-8`).
- **Tipografia Fluida**: Utilize `fluid-h1`, `fluid-h2` ou `clamp()` para títulos e blocos que escalam organicamente com a largura da tela sem saltos bruscos.
- **Touch Target Inviolável (44px)**: No mobile, todos os botões, checkboxes, ícones e triggers devem possuir área de clique mínima de 44x44px (`touch-target` ou `h-11`).
- **Safe Area Insets**: Sempre inclua `safe-bottom` em footers fixos, barras de navegação e drawers para não sobrepor o Home Indicator do iOS.
- **Compressão Adaptativa**: Em viewports estreitos (< 380px), utilize `mobile-collapse-label` para recolher textos secundários e manter apenas o ícone do botão com a área de toque preservada.

## O que NÃO Fazer:

- Não crie elementos extravagantes ou cores literais no className.
- Nunca crie páginas que parecem Landing Pages coloridas dentro da área operacional. A operação é focada no trabalho do usuário.
- Nunca crie botões mobile com altura inferior a 44px (`h-8` solto sem touch target compensado).
