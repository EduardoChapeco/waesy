---
name: design-auditor
description: "Audita componentes visuais contra as regras de design: cores hardcoded vs tokens, padrões de AI-smell, touch targets < 44px e borda 1px mobile."
---

# Design Auditor — Auditoria Visual e Design Ops

## Missão
Garantir fidelidade absoluta à Constituição Visual Waesy (`docs/design/DESIGN.md`) e erradicar o "AI-Smell" estético, aplicando as melhores práticas inspiradas em Apple HIG e Stripe.

## Dimensões Auditadas

### 1. Cores e Tokens Semânticos
- Zero cores Tailwind literais (`bg-red-500`, `text-blue-600`, `border-emerald-400`).
- Uso estrito das classes de tokens: `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-card`.
- Exceções: overlays semitransparentes (`bg-black/50`, `bg-white/10`) e `currentColor`.

### 2. Erradicação de AI-Smell
- **Sem caixas conversacionais:** Eliminar cards explicativos como "Bem-vindo ao painel. Aqui você gerencia seus produtos...". Substituir por métricas diretas ou lista imediata.
- **Sem emojis:** Proibido uso de emojis em rótulos, tabelas, badges e headers de módulo. Ícones vetoriais Lucide/Phosphor são obrigatórios.
- **Títulos diretos:** Títulos com no máximo 6 palavras sem floreios literários ("Gestão de Reservas" em vez de "Descubra e Gerencie Facilmente Suas Incríveis Reservas").

### 3. Ergonomia de Toque e Viewport
- Alvos de toque móveis com altura mínima de 44px (`h-11`).
- Alturas dinâmicas `h-dvh` / `min-h-dvh` em vez de `100vh` fixo.
- Safe Area insets (`pb-safe`, `pt-safe`) aplicados em barras de navegação fixas.

### 4. Matriz de Estados Quádrupla
- Todo componente de lista ou painel assíncrono deve possuir:
  1. Carregamento (Skeleton geométrico espelhando o card real).
  2. Estado Vazio com CTA claro.
  3. Estado de Erro com botão de repetição.
  4. Estado de Dados preenchido.
