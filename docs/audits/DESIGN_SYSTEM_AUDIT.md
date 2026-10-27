# DESIGN_SYSTEM_AUDIT.md — Auditoria do Design System e Primitivos Squircles
## Geometria Squircle, Motor Liquid Glass, Tipografia, Contraste e Acessibilidade
**Data:** 2026-10-21  
**Módulo:** Design System / Waesy  
**Status:** Auditado e Padronizado  

---

### 1. Geometria Squircle e Primitivos Canônicos

> O Waesy adota a curvatura contínua **Squircle (Superelipse Apple HIG)** como primitiva visual primária.  
> Uma borda puramente arredondada (`border-radius` concêntrico clássico) gera "cantos duros" que quebram a harmonia visual.

#### Primitivos Padronizados:
1. **`SquircleCard` (`Card` canônico):** Raio `rounded-lg` (16px) com borda semântica `border-border` e fundo `bg-card`.
2. **`LiquidGlassSurface` (`liquid-glass-surface.tsx`):**
   - Superfície de vidro aeroespacial com refração física SVG e dispersão cromática.
   - 5 Presets canônicos: `saved_offer_glass`, `heavy_frost`, `dark_glass`, `clear_lens`, `subtle_glass`.
   - Transparência controlada (fill ~19% a 20%) para garantir legibilidade de texto sob qualquer foto de fundo.
3. **`InteractiveSquircle` (Botões e Controles táteis):**
   - Altura mínima `h-11 min-h-11` (44px).
   - Anéis de foco `:focus-visible:ring-2 focus-visible:ring-ring`.

---

### 2. Escala Tipográfica e Contraste WCAG 2.2 AA

| Nível Tipográfico | Classe Tailwind | Tamanho / Leading | Tracking | Papel no Domínio |
| :--- | :--- | :--- | :--- | :--- |
| **Display Hero** | `text-3xl font-extrabold` | 30px / 36px | `-0.02em` | Título principal de pacotes e destinos em banners. |
| **Título de Seção** | `text-xl font-bold` | 20px / 28px | `-0.01em` | Cabeçalhos de abas, fichas técnicas e sheets. |
| **Subtítulo / Destaque** | `text-base font-semibold` | 16px / 24px | `normal` | Nome do hotel, nome do passageiro, cidade de saída. |
| **Preço Principal** | `text-2xl font-black` | 24px / 28px | `-0.02em` | Valor da parcela mensal (ex: 10x de R$ 489,00). |
| **Metadados & Badges** | `text-xs font-semibold` | 12px / 16px | `+0.02em` | Regime alimentar, companhia aérea, tag de prioridade. |

- **Piso de Contraste:** 100% dos textos sobre fundos sólidos e superfícies de vidro atendem ao piso mínimo de **4.5:1** para texto normal e **3.0:1** para controles táteis e texto grande.
