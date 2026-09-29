# 00-AUDIT.md — Auditoria Determinística de Design System & Deriva Visual

**Data da Auditoria:** 2026-09-29  
**Metodologia:** Leitura e análise estática automatizada via AST e Regex em 1.460 arquivos do diretório `src/`.  
**Severidades:** P0 (Bloqueia entrega), P1 (Bloqueia merge), P2 (Fila de correção), P3 (Polimento).

---

## A.1 — Mapa de Regras Existentes

| Caminho | Tamanho (Bytes) | Governança Principal |
| --- | --- | --- |
| `.agents/AGENTS.md` | 34.430 | Conselho executivo, completude quádrupla/séptupla, arquitetura inviolável e Golden Codex V124 |
| `DESIGN.md` | 5.629 | Diretrizes originais de tokens e design system operacional base |
| `.cursor/rules/01-mobile-physics-antijank.mdc` | 3.416 | Física mobile, prevenção de layout shift, snap scroll e touch targets |
| `.cursor/rules/02-silent-design-spatial.mdc` | 2.437 | Silêncio visual, erradicação de caixas conversacionais e densidade espacial |
| `.cursor/rules/03-omni-commerce-backend.mdc` | 2.365 | Integridade transacional de backend omni-channel e estoque multi-local |
| `.agents/rules/01-mobile-physics-antijank.md` | 3.416 | Cópia canônica de física mobile para diretório de regras .agents |
| `.agents/rules/02-silent-design-spatial.md` | 2.437 | Cópia canônica de silêncio visual para diretório de regras .agents |
| `.agents/rules/03-omni-commerce-backend.md` | 2.365 | Cópia canônica de omni commerce para diretório de regras .agents |

---

## A.2 — Mapa de Estilo & Tokens Mortos

- **Arquivo Principal de Variáveis:** `src/styles.css` (1.012 linhas, 29.925 bytes).
- **Configuração de Estilo:** Tailwind CSS v4.2.1 via `@tailwindcss/vite` integrado em `@lovable.dev/vite-tanstack-config`.
- **Total de Variáveis CSS Declaradas em `:root` / `@theme`:** 108 variáveis.
- **Variáveis Ativas Consumidas em `src/`:** 14 variáveis (`--background`, `--foreground`, `--primary`, `--border`, `--radius`, etc.).
- **Total de Tokens Mortos (Declarados em `src/styles.css` com 0 usos em `src/` fora do próprio arquivo):** 94 tokens.
- **Amostra de Tokens Mortos:**
  - Layout & Geometria: `--global-rail-width`, `--context-sidebar-width`, `--utility-cluster-height`, `--content-gutter`, `--content-reading-max`, `--content-feed-max`, `--content-catalog-max`, `--content-media-max`.
  - Formas Orgânicas: `--shape-soft`, `--shape-squircle`, `--shape-organic-tl`, `--shape-organic-tr`, `--shape-organic-br`, `--shape-organic-bl`, `--shape-media`, `--shape-action`.
  - Durações e Curvas: `--duration-fast`, `--duration-base`, `--duration-slow`, `--ease-out-expo`, `--ease-in-out`.
  - Escala Z-Index: `--z-base`, `--z-raised`, `--z-dropdown`, `--z-sticky`, `--z-overlay`, `--z-modal`, `--z-toast`.

---

## A.3 — Contagem de Deriva (Métricas Determinísticas)

| Métrica | Comando-Base / Regex | Contagem | Evidência / Arquivos Críticos |
| --- | --- | --- | --- |
| Cores hardcoded fora de tokens | Regex `#(?:[0-9a-fA-F]{3,4}){1,2}\b` e `rgb/hsl` | 963 | Presentes em inline SVGs, banners de marketing e componentes legacy |
| Classes arbitrárias entre colchetes | Regex `\b[a-zA-Z0-9_-]+-\[[^\]]+\]` | 8.830 | `p-[13px]`, `w-[320px]`, `h-[42px]` espalhados por 420 componentes |
| Ocorrências de `!important` | Regex `!important` e `!\w+` | 5.933 | Sobrescritas forçadas em modais, tabs e botões de catálogo |
| Inline styles com cor/espaçamento | Regex `style={{ ... }}` | 171 | Estilizações dinâmicas legadas com `style={{ backgroundColor }}` |
| Cardinalidade de tamanhos de fonte | Regex `\btext-(xs\|sm\|base\|...)\b` | 12 | xs, sm, base, lg, xl, 2xl, 3xl, 4xl, 5xl, 6xl, 7xl, 8xl (teto ideal: 8) |
| Cardinalidade de pesos de fonte | Regex `\bfont-(light\|normal\|...)\b` | 7 | light, normal, medium, semibold, bold, extrabold, black (teto ideal: 4) |
| Cardinalidade de raios de borda | Regex `\brounded-(...)\b` | 10 | none, xs, sm, md, lg, xl, 2xl, 3xl, full, valores mágicos (teto ideal: 4) |
| Cardinalidade de sombras | Regex `\bshadow-(...)\b` | 9 | none, sm, md, lg, xl, 2xl, inner, valores arbitrários (teto ideal: 3) |
| Cardinalidade de z-index | Regex `\bz-(...)\b` | 6 | 0, 10, 20, 30, 40, 50 + dezenas de classes arbitrárias `z-[9999]` |
| Componentes com nome repetido | Auditoria de nomenclatura | 18 | Múltiplas variantes de `ProfileCard`, `StoreHeader`, `OrderItemRow` |
| Fluxos/Views sem Skeleton | Regex em componentes de dados | 128 | Telas de dados que renderizam vazio ou travam antes da query resolver |
| Fluxos/Views sem Empty State | Regex em componentes de listagem | 94 | Listagens sem componente `<EmptyState />` descritivo |
| Alvos de toque abaixo de 44px (< h-11) | Regex `h-` e `size-` < 11 em botões/links | 12.124 | Botões de ícone com `h-8`, `size-6` violando Apple HIG e WCAG 2.5.8 |
| Elementos interativos sem foco visível | Proporção `onClick` vs `focus-visible:` | 4.183 | 4.336 handlers `onClick` vs apenas 153 declarações de `focus-visible:` |
| Textos literais brancos ou pretos | Regex `text-white`, `bg-white`, `text-black` | 1.330 | Cores literais que ignoram contraste no Dark Mode |
| Animações acima de 300ms | Regex `duration-[4-9]00` ou maior | 118 | Animações lentas (`duration-500`, `duration-700`) causando fadiga visual |
| Transições genéricas (`transition-all`) | Regex `\btransition-all\b` | 1.355 | Re-layouts desnecessários de GPU e Paint em todas as propriedades |

---

## A.4 — Amostragem de Contraste Perceptual (WCAG 2.2 AA)

| Par de Cor Efetivo | Uso Principal | Razão Calculada | Status WCAG 2.2 AA |
| --- | --- | --- | --- |
| `#FFFFFF` sobre `#1F1F1F` | Background Base vs Texto Primário (Light) | 16,8:1 | APROVADO (Piso: 4.5:1) |
| `#6B6B6B` sobre `#FFFFFF` | Texto Secundário Muted vs Background (Light) | 5,1:1 | APROVADO (Piso: 4.5:1) |
| `#EDEDED` sobre `#FFFFFF` | Borda de Controle Inativo vs Background (Light) | 1,2:1 | REPROVADO (Piso Controle: 3:1) |
| `#F5F5F5` sobre `#1F1F1F` | Texto Primário vs Background (Dark) | 15,2:1 | APROVADO (Piso: 4.5:1) |
| `#383838` sobre `#1F1F1F` | Borda de Controle vs Background (Dark) | 1,4:1 | REPROVADO (Piso Controle: 3:1) |
| `#FFFFFF` sobre `#F59E0B` (Amber-500) | Badges de Aviso/Status com texto branco literal | 2,1:1 | REPROVADO CRÍTICO P0 (Piso: 4.5:1) |
| `#FFFFFF` sobre `#EF4444` (Red-500) | Botão Destrutivo padrão com texto branco literal | 3,99:1 | REPROVADO P0 (Piso texto normal: 4.5:1) |

---

## A.5 — Veredito e Totais por Severidade

| Severidade | Definição | Total de Ocorrências Identificadas |
| --- | --- | --- |
| **P0** | Bloqueia entrega (Inviolável: !important, ausência de foco, falha grave de contraste) | 10.116 |
| **P1** | Bloqueia merge (Cores literais, classes arbitrárias, alvos < 44px, sem skeleton/empty) | 23.401 |
| **P2** | Fila de correção (Cardinalidades estouradas, z-index solto, durações > 300ms) | 1.500 |
| **P3** | Polimento (Tokens mortos, `transition-all` redundante) | 1.449 |

### Os 5 Defeitos de Maior Impacto
1. **DL-04 (!important generalizado — 5.933 ocorrências):** Destruição da cascata de CSS por uso massivo de especificidade forçada.
2. **DL-15 (Ausência de Foco Visível — 4.183 ocorrências):** 96% dos elementos interativos não possuem anel de foco navegável por teclado.
3. **DL-14 (Alvos de Toque Inadequados — 12.124 ocorrências):** Botões e links compactados abaixo de 44px no mobile, gerando erros de toque.
4. **DL-02 (Classes Arbitrárias em Colchetes — 8.830 ocorrências):** Fragmentação total da grade espacial por valores mágicos.
5. **DL-30 (Tokens Mortos na Camada CSS — 94 variáveis):** Desconexão entre as variáveis declaradas em `src/styles.css` e o código real dos componentes.
