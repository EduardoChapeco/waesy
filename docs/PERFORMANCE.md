# Diretrizes de Performance Web & Core Web Vitals (Waesy Platform)

> **Single Source of Truth (SSOT)** para orçamentos de desempenho, Core Web Vitals, otimização de ativos, eficiência em runtime e políticas de cache na plataforma Waesy.
> Referência técnica vinculante: `.agents/skills/web-performance/SKILL.md`.

---

## 1. Orçamento de Desempenho Global (Performance Budget)

| Ativo | Limite Máximo | Ação em Caso de Violação |
| --- | --- | --- |
| **Peso Total da Página** | **< 1,5 MB** | Bloqueio de merge em PR / Análise de compressão |
| **Bundle JavaScript (Gzip/Brotli)** | **< 300 KB** | Divisão de código por rota (Code Splitting) |
| **Folha de Estilos CSS** | **< 100 KB** | Purga de seletores e modularização |
| **Imagem Hero / Banner LCP** | **< 500 KB** | Conversão para AVIF/WebP responsivo com srcset |
| **Fontes Web** | **< 100 KB** | Subset WOFF2 Latin (\`U+0000-00FF\`) |
| **Scripts de Terceiros** | **< 200 KB** | Carregamento sob demanda (IntersectionObserver / Facade) |

---

## 2. Metas de Core Web Vitals (Thresholds BigTech)

- **LCP (Largest Contentful Paint):** $\le 2,5\text{s}$ (Target P95: $1,5\text{s}$).
- **INP (Interaction to Next Paint):** $\le 200\text{ms}$ (Target P95: $100\text{ms}$).
- **CLS (Cumulative Layout Shift):** $\le 0.1$ (Target P95: $0.05$).
- **TTFB (Time to First Byte):** $\le 800\text{ms}$ (Target P95: $300\text{ms}$).
- **FCP (First Contentful Paint):** $\le 1,8\text{s}$.
- **TBT (Total Blocking Time):** $\le 200\text{ms}$.

---

## 3. Diretrizes de Engenharia de Frontend

### Imagens & Mídia
1. Sempre utilizar formatos modernos **AVIF** e **WebP** com a tag `<picture>`.
2. O elemento visual acima da dobra (LCP) deve declarar:
   `fetchpriority="high" loading="eager" decoding="sync"`
3. Todas as imagens abaixo da dobra devem declarar:
   `loading="lazy" decoding="async"`
4. Todo elemento de imagem deve ter dimensões explícitas (`width` e `height` ou `aspect-ratio`) para evitar Cumulative Layout Shift (CLS).

### Estilos & Transições de Tela
1. **View Transitions API:** Declarar `@view-transition { navigation: auto; }` para transições de tela com aceleração por GPU.
2. **Virtualização Nativa:** Aplicar `content-visibility: auto; contain-intrinsic-size: 0 80px;` em listas com mais de 50 nós DOM.

### Estratégia de Cache HTTP
- Ativos imutáveis com hash: `Cache-Control: public, max-age=31536000, immutable`.
- Ativos dinâmicos: `Cache-Control: public, max-age=86400, stale-while-revalidate=604800`.
- HTML e SSR: `Cache-Control: no-cache, must-revalidate`.
