# Plano de Redesign — Viaja Design System

## Análise do Estado Atual

### Arquitetura de Estilos
- `src/styles/design-system.css` — tokens CloudBlock (hsl), componentes base
- `src/index.css` — Tailwind + bridge Shadcn → tokens CB
- `tailwind.config.ts` — mapeia tokens CB como classes Tailwind (`cb-*`)

### Problema: Dois Design Systems em Conflito
- **Sistema Atual (CloudBlock)**: azul profundo, dark mode, tokens `cb-*`, Sora heading
- **Sistema Novo (Viaja PRD)**: neutro bege (#f7f7f5), minimalista, verde semântico, Inter + Instrument Serif

### Estratégia de Migração
> **Sem breaking changes** — separar claramente pages públicas vs. internal app.

**Camada 1 — Design Tokens (PRD tokens como CSS custom props)**
- Adicionar os tokens do PRD (`--bg`, `--white`, `--border`, etc.) sem remover os existentes
- Mapear tokens Viaja → tokens CB onde possível
- Atualizar fonts: adicionar Instrument Serif + limpar Sora

**Camada 2 — Public WebViews (PRIORIDADE MÁXIMA)**
- `PublicQuotation.tsx` — redesign completo (Cover → ShareBar → SummaryStrip → Voos → Itinerário → Hotéis → Preços → Includes)
- `PublicGuide.tsx` — redesign completo (Guide Cover → GNavBar → Seções com ScrollIntersection)
- `PublicTravelerInfo.tsx` — redesign (painel informativo de destino)
- `PublicLayout.tsx` — topbar de 50px com logo e tabs

**Camada 3 — Internal App Shell**
- `AppLayout.tsx` — header refinado, menos pesado
- `AppSidebar.tsx` — atualizar palette para neutro Viaja (branco/bege em vez de azul escuro)
- `design-system.css` — update de tokens para versão neutra

**Camada 4 — Internal Pages (atualização de classes, não reescrita total)**
- Aplicar nova palette nos componentes existentes via tailwind.config

---

## Ordem de Execução

### Fase 1 — Fontes + Tokens Base (index.css + design-system.css)
1. Adicionar `Instrument Serif` no Google Fonts import
2. Adicionar tokens Viaja (--vj-*) no :root do design-system.css
3. Remapear --cb-* para valores neutros (fundo #f7f7f5, branco #fff, verde #1a7a4a)
4. Atualizar sidebar para neutra clara em vez de azul escuro
5. Atualizar tailwind.config com novas cores mapeando para os tokens Viaja

### Fase 2 — PublicLayout (shell das páginas públicas)
Arquivo: `src/components/layout/PublicLayout.tsx`
- Remover a versão atual
- Criar topbar fixa 50px (logo dot + org name + tabs + botões de ação)
- CSS puro inline ou arquivo separado `public-layout.css`

### Fase 3 — PublicQuotation.tsx (redesign completo)
Estrutura conforme PRD §3:
- Cover 420px hero (cover_image_url ou gradiente)
- ShareBar (agente + validade + whatsapp CTA)
- .cq-wrap max-width 1080px centrado
- SummaryStrip 5 métricas
-DestInfo grid 2 colunas
- Voos (flight-card com trechos)
- Itinerário scroll horizontal
- Hotéis scroll horizontal
- Seção de Preços CTA escuro
- Includes grid

### Fase 4 — PublicGuide.tsx (redesign completo)
Estrutura conforme PRD §4:
- Guide Cover hero 380px
- GNavBar sticky (top: 50px)
- Seções com IntersectionObserver (Praias, Roteiro, Gastronomia, Atividades, Galeria, Dicas, Mapa)
- DestPanel 3 colunas (sobre + facts + lateral)
- Place Cards, Feature Cards, Activity Grid, Gallery Grid, Tip Grid, Map Big

### Fase 5 — PublicTravelerInfo.tsx
Estrutura conforme PRD §6 (Painel Informativo):
- Guide cover
- Informações essenciais (g-dest-panel)
- Números úteis
- Saúde & Segurança
- Cultura

### Fase 6 — AppLayout + AppSidebar refinamento
- Sidebar: branco/bege com bordas, sem o azul escuro pesado
- AppLayout header: minimalista, 50px, blur

### Fase 7 — Componentes UI internos
- Atualizar PageHeader, EmptyState, StatusBadge para nova paleta
- Revisar Clients.tsx, Quotations.tsx com nova paleta

---

## Decisões de Arquitetura

### CSS Strategy
Páginas públicas usam CSS puro (não Tailwind) via `<style>` tags ou arquivo separado:
- Razão: PRD usa classes CSS puras, é mais fácil 1:1 com o doc
- Não conflita com o Tailwind das páginas internas
- Permite copiar exatamente as classes do PRD

### Compatibilidade dos Tokens
Os tokens CF atual (`cb-*`) **continuam existindo** para as páginas internas.
Os tokens Viaja (`vj-*` ou as CSS vars do PRD: `--bg`, `--white`, `--border`...) são adicionados ao `:root`.

### Fontes
- Remover `Sora` das páginas públicas (manter no admin para não quebrar)
- Adicionar `Instrument Serif` para títulos hero das páginas públicas

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/index.css` | Adicionar Instrument Serif import |
| `src/styles/design-system.css` | Atualizar tokens para paleta neutra |
| `tailwind.config.ts` | Adicionar cores Viaja mapeadas |
| `src/components/layout/PublicLayout.tsx` | Reescrever topbar Viaja |
| `src/styles/viaja-public.css` | **CRIAR** CSS completo das páginas públicas |
| `src/pages/PublicQuotation.tsx` | Redesign completo |
| `src/pages/PublicGuide.tsx` | Redesign completo |
| `src/pages/PublicTravelerInfo.tsx` | Redesign completo |
| `src/components/AppLayout.tsx` | Refinar header |
| `src/components/AppSidebar.tsx` | Migrar para paleta neutra |

## O que NÃO muda
- Rotas (`App.tsx`) — nenhuma alteração
- Hooks (`useClients`, `useQuotations`, etc.) — nenhuma alteração
- Componentes Shadcn/UI — nenhuma alteração de contrato
- Supabase / RLS / Schema — nenhuma alteração
- `SheetPage.tsx`, `ClientEditSheet.tsx`, `QuotationBuilderSheet.tsx` — nenhuma alteração de funcionalidade
