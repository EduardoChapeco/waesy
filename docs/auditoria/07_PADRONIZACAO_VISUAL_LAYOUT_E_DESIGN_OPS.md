# 🏛️ Auditoria Forense — Dossiê 07: Padronização Visual, Layout & Design Ops
> **Conselho Executivo de BigTech & Equipe de Design Ops (Waesy Platform)**  
> **Escopo:** Padronização Visual Completa, Layouts Responsivos, Ergonomia Apple HIG, Zero Dead-Space Mobile, Paradigma Clean e Eliminação de AI-Smell.  
> **Data:** 16 de Setembro de 2026 | Sistema Operacional: Waesy Platform v4.2

---

## 1. 📋 Diagnóstico dos 5 Pilares de Padronização

| Pilar | Regra Vinculante | Estado Atual Auditado | Gravidade |
| :--- | :--- | :--- | :---: |
| **1. Zero Dead-Space Mobile** | **Regra 15 (AGENTS.md):** Margem milimétrica de 1px (`px-[1px]`) no container raiz do shell móvel. Proibição de `px-4`/`px-6` cumulativos em páginas filhas. | Rotas em `_store.conta.*`, `_store.entregador.*` e `workspace.marketing.*` adicionam `px-4`/`px-6` duplicados, estrangulando telas móveis (360-390px). | **ALTA** |
| **2. Ergonomia dos 3 Toques & Touch Targets** | **Regra 12 & Apple HIG:** Terço inferior (Thumb Zone) e alvos mínimos de 44x44px (`min-h-[44px]` ou `h-11`) para botões de ação e tabs. | Vários botões secundários (`size="sm"`) utilizam `h-9` sem classe responsiva `min-h-[44px] sm:min-h-[36px]`, dificultando o toque móvel. | **MÉDIA** |
| **3. Desacoplamento TopBar Mobile** | **Regra 16:** Inclusão de rotas móveis nativas em `isCleanMobileAppPage` no `app-shell.tsx` para evitar headers globais redundantes. | A lista no `app-shell.tsx` cobre a maior parte das rotas, mas faltam sub-rotas como `/entregador/cadastro` e subpainéis dinâmicos. | **MÉDIA** |
| **4. Paradigma Clean vs. Zine** | **Regra 7 & 13:** Painéis de gestão/Workspace 100% brancos/clean (`surface-paper`, `rounded-xl`, bordas sutis). Proibição de AI-Smell (textos explicativos prolixos). | Ocorrências isoladas de `p-5 rounded-lg` em `workspace.financeiro.afiliados` fora da taxonomia canônica `rounded-2xl border border-border/70`. | **MÉDIA** |
| **5. Transição Suave & Layout Shift** | **Regra 7:** Ausência de FOUC e entrada fluida via `animate-in fade-in duration-200` com containers canônicos `max-w-4xl` a `max-w-7xl`. | Telas legadas sem transição de entrada ao navegar entre abas ou carregar dados do loader. | **BAIXA** |

---

## 2. 🔍 Matriz Forense Pontual: O Quê, Onde e Como

### 📍 Frente 1: Contas, Identidade Pessoal, Credenciamento e Vouchers (`_store.*`)

| # | Localização Exata | GAP / Problema Identificado | Ação Técnica de Correção (Como Fazer) |
| :--- | :--- | :--- | :--- |
| **1.1** | [`src/routes/_store.conta.empresa.tsx:290,400`](file:///c:/Users/Excelência%20Tour%20SMO/Documents/waesy/src/routes/_store.conta.empresa.tsx#L290-L400) | `min-h-screen bg-background py-16 px-4` no empty state e `max-w-6xl mx-auto px-4 py-6` no container principal. Gera margem dupla no mobile. | Substituir por `max-w-6xl mx-auto px-0 sm:px-4 md:px-0 py-6 space-y-6 animate-in fade-in duration-200`. Alinhar botões do cabeçalho com `min-h-[44px] sm:min-h-[36px]`. |
| **1.2** | [`src/routes/_store.entregador.cadastro.tsx:150,243`](file:///c:/Users/Excelência%20Tour%20SMO/Documents/waesy/src/routes/_store.entregador.cadastro.tsx#L150-L243) | `mx-auto max-w-2xl px-4 sm:px-6 space-y-6` na tela de status e no formulário de credenciamento MotoLink. | Alterar para `mx-auto max-w-2xl px-0 sm:px-4 md:px-0 space-y-6`. Ajustar inputs e CTAs para `h-11 min-h-[44px] rounded-xl`. |
| **1.3** | [`src/routes/_store.publicacao.$id.tsx:171`](file:///c:/Users/Excelência%20Tour%20SMO/Documents/waesy/src/routes/_store.publicacao.$id.tsx#L171) | `min-h-screen bg-background text-foreground py-6 px-4 max-w-2xl mx-auto space-y-6`. | Padronizar para `max-w-2xl mx-auto px-0 sm:px-4 md:px-0 py-6 space-y-6`. Botão voltar com `min-h-[44px] sm:min-h-[36px]`. |
| **1.4** | [`src/routes/_store.voucher.$token.tsx:100,102`](file:///c:/Users/Excelência%20Tour%20SMO/Documents/waesy/src/routes/_store.voucher.$token.tsx#L100-L102) | `min-h-screen bg-muted/20 py-8 px-4 sm:px-6 space-y-6` com card interno `p-4`. Estrangula o bilhete/voucher em celulares compactos. | Ajustar para `px-0 sm:px-4 md:px-0 py-4 sm:py-8`. Manter o voucher com largura fluida e botões de compartilhamento com 44px de altura. |
| **1.5** | [`src/routes/_store.destaques.$slug.tsx:374,457`](file:///c:/Users/Excelência%20Tour%20SMO/Documents/waesy/src/routes/_store.destaques.$slug.tsx#L374-L457) | Margem negativa residual `-mx-4 sm:-mx-6 lg:-mx-8` somada a `px-4 sm:px-6 lg:px-8`, causando scroll horizontal indesejado no mobile. | Remover o overflow eliminando `-mx-4` no mobile e usando `w-full px-0 sm:px-4 md:px-0`. |

---

### 📍 Frente 2: Painéis Operacionais do Workspace (`workspace.*`)

| # | Localização Exata | GAP / Problema Identificado | Ação Técnica de Correção (Como Fazer) |
| :--- | :--- | :--- | :--- |
| **2.1** | [`src/routes/workspace.marketing.brand-kit.tsx:470`](file:///c:/Users/Excelência%20Tour%20SMO/Documents/waesy/src/routes/workspace.marketing.brand-kit.tsx#L470) | `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6` dentro do `WorkspaceShell` que já possui `px-[1px]`. | Atualizar para `max-w-7xl mx-auto px-0 sm:px-4 md:px-0 py-6 sm:py-8 space-y-6`. Preservar cards `rounded-2xl` e swatchers. |
| **2.2** | [`src/routes/workspace.marketing.briefing.tsx:426`](file:///c:/Users/Excelência%20Tour%20SMO/Documents/waesy/src/routes/workspace.marketing.briefing.tsx#L426) | `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-8`. | Ajustar para `max-w-7xl mx-auto px-0 sm:px-4 md:px-0 py-6 sm:py-8 flex flex-col lg:flex-row gap-6 lg:gap-8`. |
| **2.3** | [`src/routes/workspace.financeiro.afiliados.tsx:86,99`](file:///c:/Users/Excelência%20Tour%20SMO/Documents/waesy/src/routes/workspace.financeiro.afiliados.tsx#L86-L99) | Layout com `px-4 sm:px-6 lg:px-8`, cards com `rounded-lg bg-background` sem borda semântica e sem `PageHeader`. | Integrar o `PageHeader` canônico, substituir os cards por `rounded-2xl border border-border/70 bg-card p-4 sm:p-5` e container para `px-0 sm:px-4 md:px-0`. |
| **2.4** | [`src/routes/workspace.onboarding.revisao.tsx:239,301`](file:///c:/Users/Excelência%20Tour%20SMO/Documents/waesy/src/routes/workspace.onboarding.revisao.tsx#L239-L301) | Tag `<main>` aninhada dentro de `<main>` do Workspace, com `p-4 sm:p-6 md:p-8` forçado no mobile. | Trocar `<main>` por `<div>` semântico com `px-0 sm:px-4 md:px-0 py-4 sm:py-6`. Padronizar as abas superiores com botões táteis de 44px. |

---

### 📍 Frente 3: Shell de Aplicativo & Desacoplamento Mobile

| # | Localização Exata | GAP / Problema Identificado | Ação Técnica de Correção (Como Fazer) |
| :--- | :--- | :--- | :--- |
| **3.1** | [`src/components/shell/app-shell.tsx:77-115`](file:///c:/Users/Excelência%20Tour%20SMO/Documents/waesy/src/components/shell/app-shell.tsx#L77-L115) | Sub-rotas de credenciamento e onboarding móvel (`/entregador/cadastro`, `/criar-negocio`, `/portal-completo`) podem renderizar TopBar global desnecessária. | Incluir `location.pathname.includes("/entregador/cadastro")` e `location.pathname.includes("/criar-negocio")` na lista `isCleanMobileAppPage`. |
| **3.2** | [`src/components/workspace/workspace-shell.tsx:642`](file:///c:/Users/Excelência%20Tour%20SMO/Documents/waesy/src/components/workspace/workspace-shell.tsx#L642) | Container principal do Workspace já fornece o padrão `px-[1px] sm:px-6 lg:px-8`. | Mantido como referência canônica inalterada. Todas as páginas filhas devem obedecer à convenção `px-0 sm:px-4 md:px-0`. |

---

## 3. 📐 Padrões de Código & Como Será Feito

### Padrão 1: Container de Rota Canônico
```tsx
// ❌ Antes (Gera margem dupla e quebra os 360px no mobile):
<div className="min-h-screen bg-background py-8 px-4 sm:px-6 max-w-4xl mx-auto space-y-6">

// ✅ Depois (Zero dead space no mobile, respeita o 1px milimétrico do shell):
<div className="w-full max-w-4xl mx-auto px-0 sm:px-4 md:px-0 py-4 sm:py-8 space-y-6 animate-in fade-in duration-200">
```

### Padrão 2: Touch Targets Ergonômicos (Apple HIG)
```tsx
// ❌ Antes (Touch target menor que 44px no mobile):
<Button variant="ghost" size="sm" className="h-9 px-2 text-xs">

// ✅ Depois (Touch target ergonômico de 44px no mobile, 36px compacto no desktop):
<Button variant="ghost" size="sm" className="min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-3 rounded-xl text-xs">
```

### Padrão 3: Cards Operacionais (Paradigma Clean)
```tsx
// ❌ Antes (Borda solta ou sem elevação semântica):
<div className="p-5 rounded-lg bg-background">

// ✅ Depois (Clean Paradigm: surface-paper, borda sutil, rounded-2xl):
<div className="bg-card border border-border/70 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-2">
```

---

## 4. 🚀 Plano de Ação Sequencial de Execução

1. **Sprint 1 — Higienização de Margens e Mobile HIG nas Rotas de Conta & Credenciamento:**
   - [`src/routes/_store.conta.empresa.tsx`](file:///c:/Users/Excelência%20Tour%20SMO/Documents/waesy/src/routes/_store.conta.empresa.tsx)
   - [`src/routes/_store.entregador.cadastro.tsx`](file:///c:/Users/Excelência%20Tour%20SMO/Documents/waesy/src/routes/_store.entregador.cadastro.tsx)
   - [`src/routes/_store.publicacao.$id.tsx`](file:///c:/Users/Excelência%20Tour%20SMO/Documents/waesy/src/routes/_store.publicacao.$id.tsx)
   - [`src/routes/_store.voucher.$token.tsx`](file:///c:/Users/Excelência%20Tour%20SMO/Documents/waesy/src/routes/_store.voucher.$token.tsx)

2. **Sprint 2 — Padronização Visual e Erradicação de Margens Duplas no Workspace:**
   - [`src/routes/workspace.financeiro.afiliados.tsx`](file:///c:/Users/Excelência%20Tour%20SMO/Documents/waesy/src/routes/workspace.financeiro.afiliados.tsx) (incorporar `PageHeader` e cards `rounded-2xl`)
   - [`src/routes/workspace.marketing.brand-kit.tsx`](file:///c:/Users/Excelência%20Tour%20SMO/Documents/waesy/src/routes/workspace.marketing.brand-kit.tsx)
   - [`src/routes/workspace.marketing.briefing.tsx`](file:///c:/Users/Excelência%20Tour%20SMO/Documents/waesy/src/routes/workspace.marketing.briefing.tsx)
   - [`src/routes/workspace.onboarding.revisao.tsx`](file:///c:/Users/Excelência%20Tour%20SMO/Documents/waesy/src/routes/workspace.onboarding.revisao.tsx)

3. **Sprint 3 — Ajuste Fino de Desacoplamento no Shell Mobile:**
   - [`src/components/shell/app-shell.tsx`](file:///c:/Users/Excelência%20Tour%20SMO/Documents/waesy/src/components/shell/app-shell.tsx)

4. **Sprint 4 — Validação de Compilação & Runtime Proof:**
   - Execução de `npm run build` completo para comprovação de zero quebras e geração dos bundles de produção.
