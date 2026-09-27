---
description: Regras de Design Silencioso, Spatial UI e Erradicação de AI-Smell
globs: ["src/components/**", "src/routes/**", "src/styles.css"]
---

# 02 — Design Silencioso & Spatial UI (Waesy Standard)

> **Regra de Ouro:** A interface deve ser silenciosa, minimalista e direta. Elimine qualquer elemento visual que pareça gerado artificialmente por IA (AI-Smell).

---

## 1. Spatial UI & Superfícies de Vidro
- **Vidro Fosco:** Utilize superfícies refinadas com `backdrop-blur-xl bg-background/80 border border-border/40` ou o componente canônico `<FrostedCard>`.
- **Elevação em Camadas:**
  * Camada 0: Fundo da aplicação (`bg-background`)
  * Camada 1: Cartões e gôndolas (`bg-card`, borda fina de 1px)
  * Camada 2: Barras flutuantes e toolbars (`backdrop-blur-md bg-background/90`)
  * Camada 3: Sheets, Modais e Drawers de ação
- **Sombras:** Proibição de sombras pretas pesadas (`shadow-2xl`). Use sombras ultra-sutis (`shadow-2xs` ou `shadow-xs`).

## 2. Paradigma Dual Estrito
- **Workspace & Operação (PDV, Pedidos, Catálogo, CRM, Caixa):**
  * Paradigma Clean absoluto: fundo `bg-background` (Paper Branco/Dark suave), bordas super finas de 1px (`border-border/60`), cantos `rounded-xl`.
- **Vitrine Pública (Storefront, Zines, Eventos, Classificados):**
  * Estética editorial com tipografia da rua (Inter, Space Grotesk, JetBrains Mono).

## 3. Erradicação de Cores Berrantes Hardcoded
- É PROIBIDO o uso de cores Tailwind hardcoded puras (ex: `bg-red-500`, `bg-blue-600`, `text-green-500`).
- Use estritamente tokens semânticos:
  * Sucesso: `bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20`
  * Atenção: `bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20`
  * Erro/Perigo: `text-destructive bg-destructive/10 border-destructive/20`
  * Destaque: `text-primary bg-primary/10 border-primary/20`

## 4. Silêncio Visual & Erradicação de AI-Smell
- **Sem Caixas Conversacionais:** Elimine caixas de instrução prolixas ("Bem-vindo ao gestor de...", "Aqui você pode cadastrar e editar...").
- **Ações Diretas:** Substitua botões conversacionais (ícone em caixinha + título + subtítulo) por botões limpos e semânticos: `<Button variant="outline">Entrar no Workspace</Button>`.
- **Botões Secundários:** Devem ser estritamente ícones ou variantes `variant="ghost"` / `variant="outline"`.
