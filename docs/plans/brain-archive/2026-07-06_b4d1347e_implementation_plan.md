# TravelOS — Refatoração Total do Design System

## Diagnóstico do Problema

O design system está quebrado em **4 camadas** estruturais:

### 1. `SlimSidebar.tsx` — Sidebar errada
- A sidebar desktop atual é um **painel lateral sólido** com `bg-sidebar` (branco/preto), border-r e 56px de largura fixa.
- O que foi pedido: uma **"Dynamic Island" card** flutuante no canto superior esquerdo — glassmorphism, sem borda sólida, fina e minimalista, como uma pílula/card boiando sobre o wallpaper.

### 2. `AppShell.tsx` — Módulos com fundo branco
- O workspace de módulo usa `pl-[72px]` (offset da sidebar) e um `<header>` com `bg-transparent`, mas o `<main>` herda o `bg-background` (branco sólido do tema light).
- **Causa raiz**: O `--background: #F6F5F1` (creme sólido) está sendo aplicado como fundo do corpo das páginas. Os cards/tabelas de dentro dos módulos também têm `bg-card` (branco 85%).

### 3. `styles.css` — Tokens de cor quebrando transparência
- `--background: #F6F5F1` é opaco, não transparente. Em modo OS ambiente, o background deveria ser `transparent` ou `rgba(0,0,0,0)` para deixar o wallpaper aparecer.
- `--card: rgba(255, 255, 255, 0.85)` ainda é muito opaco para o look glassmorphism over wallpaper.

### 4. Header desnecessário nos módulos
- O `<header>` com `h-14` dentro do workspace de módulo renderiza "Painel" em texto sólido, criando uma barra estranha.

---

## Visão Target (o que você quer)

```
┌─────────────────────────────────────────────────────────┐
│  [WALLPAPER DE FUNDO — PARIS, AURORA, ETC]              │
│  ┌──────────────────────┐      [relógio + notif pill]   │
│  │ 🔮 Dynamic Island    │  ← card glassmorphism flutuante│
│  │  ≡ CRM               │     canto superior esquerdo    │
│  │  ≡ Viagens           │     fino, sem fundo sólido     │
│  │  ≡ Financeiro        │                                │
│  └──────────────────────┘                                │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  [CONTEÚDO DO MÓDULO — TRANSPARENTE]                │ │
│  │   cards com glass, sem fundo branco de página       │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## User Review Required

> [!IMPORTANT]
> **Decisão 1 — Layout da Dynamic Island Sidebar**
> A nova sidebar será um **card glassmorphism flutuante** no canto superior esquerdo (posição `fixed`, não parte do flow do layout).
> O conteúdo dos módulos vai usar **w-full** (sem offset de sidebar), com padding-left de ~20px apenas.
> Ícones dos módulos ficam dentro do card, empilhados verticalmente, finos (h-8 w-8 icons).

> [!IMPORTANT]  
> **Decisão 2 — Fundo dos módulos**
> Vou mudar `--background` para `transparent` na "área de trabalho" usando uma classe utilitária `.os-workspace`, mantendo o token original para modais, selects e dropdowns (que precisam de fundo sólido).
> Módulos ficarão sobre o wallpaper com apenas glassmorphism nos cards internos.

> [!WARNING]
> **Impacto alto**: O `padding-left` que compensava a sidebar sólida (atualmente `pl-[72px]`) vai mudar. Qualquer componente que dependa desse offset será afetado.

---

## Proposed Changes

### Fase 1 — `styles.css` (Design Tokens)

#### [MODIFY] styles.css
- Adicionar classe `.os-workspace` com `background: transparent` para uso no container principal dos módulos.
- Ajustar `--card` para glass mais leve: `rgba(255, 255, 255, 0.08)` no modo "ambient" (sobre wallpaper).
- Adicionar utilitário `.glass-card` para cards de módulo: `bg-white/8 backdrop-blur-2xl border border-white/15`.
- Adicionar `.glass-sidebar` para a Dynamic Island: `bg-black/25 backdrop-blur-3xl border border-white/10`.

---

### Fase 2 — `SlimSidebar.tsx` → Novo: `DynamicIslandNav.tsx`

#### [NEW] src/components/shell/DynamicIslandNav.tsx
Componente completamente novo que substitui o `SlimSidebar` para desktop:
- `position: fixed; top: 20px; left: 20px; z-index: 50`
- Container: `glass-sidebar`, `rounded-[28px]`, `w-[56px]` collapsed / `w-[200px]` expanded on hover
- Ícones empilhados verticalmente, sem texto (hover mostra tooltip)
- Ao clicar em um ícone → navega E expande levemente o card mostrando sub-itens
- Mantém o `mobile drawer` existente do `SlimSidebar` para mobile (não muda nada no mobile)
- Logo no topo do card (pequena, 24px)
- Avatar/Logout no fundo do card

---

### Fase 3 — `AppShell.tsx` — Remoção do Header de Módulo

#### [MODIFY] AppShell.tsx
- Remover o `<header>` com `h-14` e `h1` "Painel" do workspace de módulo (linha 170-184).
- Remover `pl-[72px]` do workspace — agora a sidebar é `fixed` e não empurra o conteúdo.
- Mudar `<main>` de `bg-background` implícito para `className="os-workspace ..."`.
- O título do módulo (ex: "CRM", "Viagens") deve aparecer **dentro do próprio conteúdo da rota**, não no AppShell.

---

### Fase 4 — `AppSidebar.tsx` — Adaptar para usar DynamicIslandNav

#### [MODIFY] AppSidebar.tsx
- No desktop (`md:+`): renderizar `<DynamicIslandNav>` no lugar do `<SlimSidebar>`.
- No mobile: manter `<SlimSidebar>` (drawer) — sem alteração.

---

### Fase 5 — Módulos com fundos brancos

Os módulos renderizam `<AppShell title="...">` que por sua vez renderiza `<Outlet />`. O problema é que os **componentes de UI internos** (Cards, Tables, Kanban columns) têm `bg-card` ou `bg-white` explícito.

#### [MODIFY] styles.css  
- Adicionar `.module-page` como wrapper de página que força contexto transparente.
- No modo "os ambient", os cards de dados devem ter `glass` ao invés de `bg-card`.

> [!NOTE]
> Para não quebrar 100+ rotas de uma vez, vamos usar uma **estratégia de override CSS** global que intercepta `bg-card` e `bg-background` dentro do workspace, tornando-os glass. Isso evita editar cada rota individualmente.

**Estratégia CSS Override:**
```css
/* Dentro do contexto .os-workspace, cards e backgrounds ficam glass */
.os-workspace .bg-card,
.os-workspace [class*="bg-card"] {
  background: rgba(255, 255, 255, 0.07) !important;
  backdrop-filter: blur(20px);
  border-color: rgba(255, 255, 255, 0.12) !important;
}
.os-workspace .bg-background,
.os-workspace [class*="bg-background"] {
  background: transparent !important;
}
```

---

## Verification Plan

### Build
```bash
npm run typecheck
npm run build
```

### Visual Check (dev server)
```bash
npm run dev
```
- Navegar para `/agency/{slug}/crm` → verificar que o fundo é o wallpaper com cards glass
- Navegar para `/agency/{slug}/financial` → verificar transparência
- Verificar que a Dynamic Island aparece no canto superior esquerdo, flutuante
- Verificar que não há header sólido "Painel" nas páginas de módulo
- Verificar mobile: sidebar drawer deve continuar funcionando

### Regressão Crítica
- Modais (Dialogs, Popovers, Dropdowns) devem **manter fundo sólido** (não herdam `.os-workspace` pois são portais no `<body>`)
- Builder de propostas/cotações → ainda renderiza sem sidebar (isBuilder check mantido)
- CommandMenu → sem alteração

---

## Open Questions

> [!IMPORTANT]
> **Q1**: Você quer que a Dynamic Island Sidebar mostre **apenas ícones** (minimalista extremo, sem texto), ou deve ter **labels de texto** ao hover/expandir?

> [!IMPORTANT]
> **Q2**: Nos módulos, os cards de dados (tabelas, listas, kanban) devem ficar **glass translúcido** sobre o wallpaper? Ou apenas o fundo da página deve ser transparente (mantendo os cards com algum fundo sólido leve)?

> [!IMPORTANT]
> **Q3**: O header minimalista atual (com relógio + data + notificações no canto direito superior) deve ser **mantido**? Ou removido também?
