# DESIGN_TOKEN_AUDIT.md — Auditoria de Design Tokens e Grade Espacial
## Grade de 4px, Tokens Semânticos, Cores, Raios e Gates de CI
**Data:** 2026-10-21  
**Módulo:** Design System / Waesy  
**Status:** Auditado pelo Design Lint Ratchet  

---

### 1. Auditoria da Grade Modular de 4px (Invariante B.8 / DL-03)

O sistema opera estritamente na grade geométrica de **múltiplos de 4px**:
- `p-1`: 4px
- `p-2` / `gap-2`: 8px
- `p-3` / `gap-3`: 12px
- `p-4` / `gap-4`: 16px
- `p-5` / `gap-5`: 20px
- `p-6` / `gap-6`: 24px
- `p-8` / `gap-8`: 32px

**Proibições Absolutas de Espaçamento Mágico:**
- Classes fracionárias como `mt-0.5` (2px) ou `space-y-1.5` (6px) são estritamente proibidas e barradas pelo script `scripts/design-lint.mjs`.

---

### 2. Camada Semântica de Cores (Invariante B.8 / DL-01 / DL-18)

É terminantemente proibido declarar cores hexadecimais (`#059669`) ou classes brutas (`text-white`, `bg-black`) diretamente nos componentes. Todo estilo consome tokens CSS variáveis:
- Fundo Principal: `bg-background`
- Cartão / Superfície: `bg-card`
- Texto Principal: `text-foreground`
- Texto Secundário: `text-muted-foreground`
- Cor Primária da Marca: `text-primary` / `bg-primary`
- Texto sobre Primária: `text-primary-foreground`
- Borda Canônica: `border-border`
- Anel de Foco Acessível: `focus-visible:ring-ring`

---

### 3. Raios de Curvatura Padronizados (DL-09)

Os raios canônicos permitidos são restritos a:
- `rounded-none`: 0px
- `rounded-sm`: 4px (badges compactos)
- `rounded-md`: 8px (inputs e selects)
- `rounded-lg`: 16px (cards, sheets, modais e containers principais)
- `rounded-full`: 9999px (pills, avatares e botões de ação circular)

Raios não-canônicos como `rounded-xl` foram eliminados dos novos componentes em prol da consistência de `rounded-lg`.
